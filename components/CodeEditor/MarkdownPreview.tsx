'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Eye, Code2, Pencil, Copy, Check } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { markdown } from '@codemirror/lang-markdown'

// ---------------------------------------------------------------------------
// Tiny pure-JS markdown → HTML renderer (no external dependency)
// Handles: ## headings, **bold**, *italic*, - lists, ``` code blocks,
// `inline code`, horizontal rules, and paragraph breaks.
// ---------------------------------------------------------------------------
export function renderMarkdown(md: string): string {
  let html = md

  // Fenced code blocks ``` ... ```
  html = html.replace(/```[\w]*\n([\s\S]*?)```/g, (_, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return `<pre class="md-pre"><code>${escaped}</code></pre>`
  })

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, '<h6 class="md-h6">$1</h6>')
  html = html.replace(/^#####\s+(.+)$/gm, '<h5 class="md-h5">$1</h5>')
  html = html.replace(/^####\s+(.+)$/gm, '<h4 class="md-h4">$1</h4>')
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="md-h3">$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="md-h2">$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="md-h1">$1</h1>')

  // Horizontal rule
  html = html.replace(/^[-*_]{3,}\s*$/gm, '<hr class="md-hr"/>')

  // Unordered list items
  html = html.replace(/^[-*+]\s+(.+)$/gm, '<li class="md-li">$1</li>')
  // Ordered list items
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="md-oli">$1</li>')

  // Inline styling
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="md-bold">$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em class="md-em">$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')

  // Wrap list items
  html = html.replace(/(<li class="md-li">[\s\S]*?<\/li>)(\n(?!<li))/g, '$1$2')
  html = html.replace(/((?:<li class="md-li">.*<\/li>\n?)+)/g, '<ul class="md-ul">$1</ul>')
  html = html.replace(/((?:<li class="md-oli">.*<\/li>\n?)+)/g, '<ol class="md-ol">$1</ol>')

  // Paragraphs
  html = html
    .split(/\n\n+/)
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      if (/^<(h[1-6]|ul|ol|pre|hr|li)/.test(trimmed)) return trimmed
      return `<p class="md-p">${trimmed.replace(/\n/g, '<br/>')}</p>`
    })
    .join('\n')

  return html
}

// ---------------------------------------------------------------------------
// Pure DOM → Markdown converter for rich preview editing
// ---------------------------------------------------------------------------
function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue || ''
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const el = node as HTMLElement
  const tagName = el.tagName.toLowerCase()

  const getChildrenMarkdown = () => {
    let result = ''
    node.childNodes.forEach((child) => {
      result += nodeToMarkdown(child)
    })
    return result
  }

  switch (tagName) {
    case 'h1': return `# ${getChildrenMarkdown().trim()}\n\n`
    case 'h2': return `## ${getChildrenMarkdown().trim()}\n\n`
    case 'h3': return `### ${getChildrenMarkdown().trim()}\n\n`
    case 'h4': return `#### ${getChildrenMarkdown().trim()}\n\n`
    case 'h5': return `##### ${getChildrenMarkdown().trim()}\n\n`
    case 'h6': return `###### ${getChildrenMarkdown().trim()}\n\n`
    case 'p': return `${getChildrenMarkdown().trim()}\n\n`
    case 'strong':
    case 'b': return `**${getChildrenMarkdown()}**`
    case 'em':
    case 'i': return `*${getChildrenMarkdown()}*`
    case 'code':
      if (el.parentElement?.tagName.toLowerCase() === 'pre') return getChildrenMarkdown()
      return `\`${getChildrenMarkdown()}\``
    case 'pre': return `\`\`\`\n${getChildrenMarkdown().trim()}\n\`\`\`\n\n`
    case 'ul': {
      let listMd = ''
      el.querySelectorAll(':scope > li').forEach((li) => {
        const liText = Array.from(li.childNodes).map(nodeToMarkdown).join('').trim()
        if (liText) listMd += `- ${liText}\n`
      })
      return `${listMd}\n`
    }
    case 'ol': {
      let listMd = ''
      let idx = 1
      el.querySelectorAll(':scope > li').forEach((li) => {
        const liText = Array.from(li.childNodes).map(nodeToMarkdown).join('').trim()
        if (liText) listMd += `${idx++}. ${liText}\n`
      })
      return `${listMd}\n`
    }
    case 'hr': return `---\n\n`
    case 'br': return `\n`
    case 'div': return `${getChildrenMarkdown()}\n`
    default: return getChildrenMarkdown()
  }
}

export function elementToMarkdown(container: HTMLElement): string {
  let md = ''
  container.childNodes.forEach((child) => {
    md += nodeToMarkdown(child)
  })
  return md.replace(/\n{3,}/g, '\n\n').trim()
}

interface MarkdownPreviewProps {
  content: string
  onChange?: (value: string) => void
  readOnly?: boolean
}

export function MarkdownPreview({ content, onChange, readOnly = false }: MarkdownPreviewProps) {
  const [view, setView] = useState<'preview' | 'raw'>('preview')
  const [copied, setCopied] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const isSelfUpdatingRef = useRef(false)

  const handleCopy = () => {
    if (!content) return
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Sync content into editable div when content changes externally
  useEffect(() => {
    if (view === 'preview' && previewRef.current && !isSelfUpdatingRef.current) {
      previewRef.current.innerHTML = renderMarkdown(content)
    }
    isSelfUpdatingRef.current = false
  }, [content, view])

  const handleInput = useCallback(() => {
    if (!previewRef.current || readOnly || !onChange) return
    isSelfUpdatingRef.current = true
    const newMarkdown = elementToMarkdown(previewRef.current)
    onChange(newMarkdown)
  }, [onChange, readOnly])

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toggle bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border-default)] bg-[var(--bg-surface)] shrink-0 select-none">
        <button
          onClick={() => setView('preview')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            view === 'preview'
              ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <Eye className="h-3 w-3" />
          Preview
        </button>
        <button
          onClick={() => setView('raw')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            view === 'raw'
              ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
          }`}
        >
          <Code2 className="h-3 w-3" />
          Raw
        </button>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all cursor-pointer ml-1"
          title="Copy markdown content"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        {!readOnly && (
          <span className="ml-auto text-[10px] text-[var(--accent)] font-mono font-medium flex items-center gap-1 opacity-80">
            <Pencil className="h-2.5 w-2.5" />
            {view === 'preview' ? 'Rich Editable View' : 'Raw Markdown Editing'}
          </span>
        )}
      </div>

      {view === 'preview' ? (
        /* ── Rendered editable preview ─────────────────────────── */
        <div
          ref={previewRef}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={handleInput}
          className="flex-1 overflow-auto p-5 bg-[var(--bg-page)] markdown-body outline-none focus:outline-none"
        />
      ) : (
        /* ── Raw CodeMirror editor ─────────────────────────────── */
        <div className="flex-1 overflow-hidden min-h-0 h-full w-full bg-[#282c34]">
          <CodeMirror
            className="h-full w-full"
            value={content}
            onChange={onChange}
            theme={oneDark}
            height="100%"
            extensions={[markdown()]}
            readOnly={readOnly}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              foldGutter: true,
              dropCursor: true,
              allowMultipleSelections: true,
              indentOnInput: true,
              bracketMatching: true,
              closeBrackets: false,
              autocompletion: false,
              rectangularSelection: true,
              highlightSelectionMatches: true,
              searchKeymap: true,
            }}
          />
        </div>
      )}
    </div>
  )
}
