'use client'

import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { rust } from '@codemirror/lang-rust'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'

interface CodeEditorProps {
  fileName: string
  content: string
  onChange?: (value: string) => void
  readOnly?: boolean
}

export function CodeEditor({
  fileName,
  content,
  onChange,
  readOnly = true,
}: CodeEditorProps) {
  const extension = useMemo(() => {
    const ext = fileName.split('.').pop()?.toLowerCase()

    const extensionMap: Record<string, any> = {
      rs: rust(),
      ts: javascript({ typescript: true }),
      tsx: javascript({ typescript: true, jsx: true }),
      js: javascript(),
      jsx: javascript({ jsx: true }),
      json: json(),
      md: markdown(),
      html: html(),
      css: css(),
    }

    return extensionMap[ext || ''] || javascript()
  }, [fileName])

  return (
    <div className="h-full w-full overflow-auto text-xs bg-[#282c34]">
      <CodeMirror
        className="h-full w-full"
        value={content}
        onChange={onChange}
        theme={oneDark}
        height="100%"
        extensions={[extension]}
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
  )
}
