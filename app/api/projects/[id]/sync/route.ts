import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/db/prisma'

function sanitizeNullBytes(input?: string | null): string {
  if (!input) return ''
  return input.replace(/\u0000/g, '')
}

export async function POST(
  req: NextRequest,
  { params }: { params: any }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { id: rawProjectId } = resolvedParams
    const projectId = sanitizeNullBytes(rawProjectId)
    const body = await req.json()
    const { files } = body

    if (!projectId || !Array.isArray(files)) {
      return NextResponse.json({ error: 'projectId and files array are required' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const currentPaths = new Set<string>()

    for (const file of files) {
      const cleanPath = sanitizeNullBytes(file.path)
      const cleanContent = sanitizeNullBytes(file.content)

      if (!cleanPath) continue
      currentPaths.add(cleanPath)

      const existing = await prisma.generatedFile.findFirst({
        where: { projectId, filePath: cleanPath },
      })

      if (existing) {
        if (existing.content !== cleanContent) {
          await prisma.generatedFile.update({
            where: { id: existing.id },
            data: {
              content: cleanContent,
              version: existing.version + 1,
            },
          })
        }
      } else {
        await prisma.generatedFile.create({
          data: {
            projectId,
            filePath: cleanPath,
            content: cleanContent,
            version: 1,
          },
        })
      }
    }

    // Clean up deleted files from DB if they were removed from workspace
    const existingDbFiles = await prisma.generatedFile.findMany({
      where: { projectId },
      select: { id: true, filePath: true },
    })

    for (const dbFile of existingDbFiles) {
      if (!currentPaths.has(dbFile.filePath)) {
        await prisma.generatedFile.delete({ where: { id: dbFile.id } })
      }
    }

    return NextResponse.json({ success: true, count: files.length })
  } catch (err: any) {
    console.error('[API - Projects Sync] Error syncing project files:', err)
    return NextResponse.json(
      { error: 'Failed to sync files to database', details: err.message || err },
      { status: 500 }
    )
  }
}
