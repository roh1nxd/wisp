import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

// Map file extensions to MIME types
function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'html': return 'text/html; charset=utf-8'
    case 'css':  return 'text/css; charset=utf-8'
    case 'js':   return 'application/javascript; charset=utf-8'
    case 'mjs':  return 'application/javascript; charset=utf-8'
    case 'ts':   return 'application/typescript; charset=utf-8'
    case 'json': return 'application/json; charset=utf-8'
    case 'svg':  return 'image/svg+xml; charset=utf-8'
    case 'png':  return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'gif':  return 'image/gif'
    case 'ico':  return 'image/x-icon'
    case 'woff': return 'font/woff'
    case 'woff2': return 'font/woff2'
    default:     return 'text/plain; charset=utf-8'
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: any }
) {
  try {
    // In Next.js 15+, params is a Promise and must be awaited.
    const resolvedParams = await params
    const { projectId, path: pathSegments } = resolvedParams

    console.log('[Preview API] Request received:', { projectId, pathSegments })

    if (!projectId || !pathSegments?.length) {
      return new NextResponse('Not found', { status: 404 })
    }

    // Reconstruct the file path and strip query string params
    const rawRequestedPath = pathSegments.join('/')
    const requestedPath = rawRequestedPath.split('?')[0]

    // Normalize path by removing leading slashes, leading ./, and trailing slashes.
    const cleanRequestedPath = requestedPath
      .replace(/^(\.\/|\/)+/, '')
      .replace(/\/+$/, '')

    console.log('[Preview API] Querying file for:', {
      projectId,
      cleanRequestedPath,
      requestedPath,
    })

    // Try finding the generated file in the database.
    // We check both the clean path, the original joined path, and versions with/without leading slash/dot-slash
    const file = await prisma.generatedFile.findFirst({
      where: {
        projectId,
        filePath: {
          in: [
            cleanRequestedPath,
            `/${cleanRequestedPath}`,
            `./${cleanRequestedPath}`,
            requestedPath,
            `/${requestedPath}`,
            `./${requestedPath}`,
          ],
        },
      },
      orderBy: { version: 'desc' },
    })

    if (!file) {
      console.warn('[Preview API] File not found in DB:', {
        projectId,
        cleanRequestedPath,
      })
      // Helpful info for debugging
      const filesCount = await prisma.generatedFile.count({
        where: { projectId },
      })
      return new NextResponse(
        `File not found: ${cleanRequestedPath} (Project has ${filesCount} files in DB)`,
        { status: 404 }
      )
    }

    const mimeType = getMimeType(cleanRequestedPath)
    let content = file.content

    // If serving HTML, inject Babel Standalone script tag ONLY if JSX/TSX is referenced
    if (cleanRequestedPath.endsWith('.html') && (content.includes('.jsx') || content.includes('.tsx'))) {
      if (!content.includes('babel.min.js')) {
        const babelScript = `<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n`
        content = content.replace(/<head>/i, `<head>\n  ${babelScript}`)
      }
      // Change script type="module" targeting ONLY .jsx/.tsx to type="text/babel"
      content = content.replace(/type="module"\s+src="([^"]+\.[jt]sx)"/gi, 'type="text/babel" data-type="module" src="$1"')
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-store, must-revalidate',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err: any) {
    console.error('[API - Preview] Error serving preview file:', err)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
