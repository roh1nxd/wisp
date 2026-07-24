'use client'

import { useMemo } from 'react'
import { ExternalLink } from 'lucide-react'

interface DirectStaticPreviewProps {
  files: Record<string, string>
  projectId?: string
  serverUrl?: string
}

function resolveStaticHtml(files: Record<string, string>): string {
  // Normalize file paths in dictionary
  const normMap: Record<string, string> = {}
  for (const [key, val] of Object.entries(files)) {
    const normKey = key.replace(/^(\.\/|\/)+/, '').toLowerCase()
    normMap[normKey] = val || ''
  }

  const findFileContent = (targetPath: string): string | undefined => {
    const cleanPath = targetPath.replace(/^(\.\/|\/)+/, '').toLowerCase()
    const fileName = cleanPath.split('/').pop() || cleanPath

    // 1. Direct match
    if (normMap[cleanPath] !== undefined) return normMap[cleanPath]

    // 2. Basename match (e.g. logic.js matching src/logic.js or logic.js)
    const matchedKey = Object.keys(normMap).find(
      (k) => k === cleanPath || k.endsWith('/' + cleanPath) || k === fileName || k.endsWith('/' + fileName)
    )
    if (matchedKey !== undefined && normMap[matchedKey] !== undefined) {
      return normMap[matchedKey]
    }

    return undefined
  }

  // Find index.html or any .html file
  const htmlKey =
    Object.keys(normMap).find((k) => k === 'index.html') ||
    Object.keys(normMap).find((k) => k.endsWith('.html'))

  if (!htmlKey) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Preview</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; background: #0f172a; color: #94a3b8; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #1e293b; border: 1px solid #334155; padding: 1.5rem 2rem; border-radius: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h3 style="color:#f8fafc;margin-top:0;">Static Preview Ready</h3>
    <p>Create an <code>index.html</code> file in the Explorer to see live preview.</p>
  </div>
</body>
</html>`
  }

  let rawHtml = normMap[htmlKey]

  // 1. Inline CSS files referenced via <link rel="stylesheet" href="...">
  rawHtml = rawHtml.replace(/<link(?:\s+[^>]*?)?\s+href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
    if (match.toLowerCase().includes('stylesheet') || href.toLowerCase().endsWith('.css')) {
      const cssContent = findFileContent(href)
      if (cssContent !== undefined) {
        return `<style>\n/* Inlined stylesheet: ${href} */\n${cssContent}\n</style>`
      }
    }
    return match
  })

  // 2. Inline JS files referenced via <script src="...">
  rawHtml = rawHtml.replace(/<script(?:\s+[^>]*?)?\s+src=["']([^"']+)["'][^>]*>(?:[\s\S]*?<\/script>)?/gi, (match, src) => {
    const jsContent = findFileContent(src)
    if (jsContent !== undefined) {
      const isModule = jsContent.includes('import ') || jsContent.includes('export ') || match.toLowerCase().includes('type="module"')
      const typeAttr = isModule ? ' type="module"' : ''
      return `<script${typeAttr}>\n/* Inlined script: ${src} */\n${jsContent}\n</script>`
    }
    return match
  })

  return rawHtml
}

export function DirectStaticPreview({ files, projectId, serverUrl }: DirectStaticPreviewProps) {
  const htmlDocument = useMemo(() => resolveStaticHtml(files), [files])

  const handleOpenNewTab = () => {
    if (serverUrl) {
      window.open(serverUrl, '_blank')
      return
    }

    if (projectId) {
      const base = typeof window !== 'undefined' ? window.location.origin : ''
      window.open(`${base}/api/preview/${projectId}/index.html`, '_blank')
      return
    }

    // Fallback: local blob URL
    const blob = new Blob([htmlDocument], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)] overflow-hidden min-h-0 select-none">
      {/* Header */}
      <div className="h-9 border-b border-[var(--border-default)] bg-[var(--bg-surface)] flex items-center justify-between px-3.5 shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] font-sans">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Preview (Direct HTML Engine)</span>
        </div>
        <button
          onClick={handleOpenNewTab}
          className="inline-flex items-center gap-1 bg-transparent hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--border-strong)] px-2 py-1 rounded text-3xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-3xs"
          title="Open preview in new tab"
        >
          <ExternalLink className="h-3 w-3" />
          <span>Open Tab</span>
        </button>
      </div>

      {/* Frame Container */}
      <div className="flex-1 relative min-h-0 w-full h-full bg-white">
        <iframe
          srcDoc={htmlDocument}
          title="Direct Local HTML Preview"
          className="w-full h-full border-none bg-white"
          sandbox="allow-scripts allow-modals allow-forms"
        />
      </div>
    </div>
  )
}

export default DirectStaticPreview
