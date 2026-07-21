'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSandpack } from '@codesandbox/sandpack-react'
import { ExternalLink } from 'lucide-react'

interface SandpackPreviewWrapperProps {
  files: Record<string, string>
  template?: 'static' | 'react' | 'react-ts' | 'vue' | 'angular' | 'solid' | 'svelte' | 'test-ts'
  projectId?: string
  serverUrl?: string
}

function CustomPreviewHeader({
  projectId,
  serverUrl,
}: {
  projectId?: string
  serverUrl?: string
}) {
  const handleOpenInNewTab = () => {
    if (serverUrl) {
      window.open(serverUrl, '_blank')
      return
    }

    if (!projectId) {
      alert('Cannot open preview: project has not been saved yet. Please generate or save the project first.')
      return
    }

    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const url = `${base}/api/preview/${projectId}/index.html`
    window.open(url, '_blank')
  }

  return (
    <div className="h-9 border-b border-[var(--border-default)] bg-[var(--bg-surface)] flex items-center justify-between px-4 shrink-0 select-none">
      <span className="text-xs font-bold text-[var(--text-primary)] font-sans">
        Live Preview
      </span>
      <button
        onClick={handleOpenInNewTab}
        title="Open preview in new tab"
        className="inline-flex items-center gap-1.5 bg-transparent hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--border-strong)] px-2 py-1 rounded text-3xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-3xs"
      >
        <ExternalLink className="h-3 w-3" />
        <span>Open Tab</span>
      </button>
    </div>
  )
}

function SandpackStatusListener({
  useSandpackHook,
  useSandpackConsoleHook,
  onRunning,
}: {
  useSandpackHook: any
  useSandpackConsoleHook: any
  onRunning: () => void
}) {
  const { sandpack } = useSandpackHook()
  const status = sandpack.status

  const { logs } = useSandpackConsoleHook({ resetOnPreviewRestart: true })
  const processedLogsCount = useRef(0)
  const lastLoggedMessageRef = useRef<string | null>(null)

  useEffect(() => {
    if (status === 'running' || status === 'idle' || status === 'done') {
      onRunning()
    }
  }, [status, onRunning])

  useEffect(() => {
    if (!logs) return

    // Reset reference count if preview restarted or cleared
    if (logs.length < processedLogsCount.current) {
      processedLogsCount.current = 0
      lastLoggedMessageRef.current = null
    }

    if (logs.length > processedLogsCount.current) {
      for (let i = processedLogsCount.current; i < logs.length; i++) {
        const log = logs[i]
        const rawMsg = Array.isArray(log.data)
          ? log.data.map((d: any) => typeof d === 'string' ? d : JSON.stringify(d)).join(' ')
          : String(log.data)

        // Ignore browser extension / MetaMask noise that doesn't originate from app code
        if (
          rawMsg.includes('chrome-extension://') ||
          rawMsg.includes('MetaMask') ||
          rawMsg.includes('inpage.js')
        ) {
          continue
        }

        // Deduplicate rapid consecutive identical error messages to prevent log flooding
        if (rawMsg === lastLoggedMessageRef.current) continue
        lastLoggedMessageRef.current = rawMsg

        window.parent.postMessage(
          {
            type: 'console',
            payload: {
              type: log.method || 'log',
              data: log.data || [],
            },
          },
          '*'
        )
      }
      processedLogsCount.current = logs.length
    }
  }, [logs])

  return null
}

export default function SandpackPreviewWrapper({
  files,
  template = 'static',
  projectId,
  serverUrl,
}: SandpackPreviewWrapperProps) {
  const [sandpackModules, setSandpackModules] = useState<any>(null)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [previewStatus, setPreviewStatus] = useState<'loading' | 'running' | 'timeout'>('loading')
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleRunning = useCallback(() => {
    if (mountedRef.current) {
      setPreviewStatus('running')
    }
  }, [])

  // Load Sandpack dynamically to prevent compile failures if the package isn't installed
  useEffect(() => {
    import('@codesandbox/sandpack-react')
      .then((mod) => {
        if (mountedRef.current) {
          setSandpackModules(mod)
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setLoadError(true)
        }
      })
  }, [])

  // Auto-retry connection if it hangs in initial/loading state with a higher timeout threshold and double-mount guards
  useEffect(() => {
    if (previewStatus !== 'loading' || !sandpackModules) return

    let isCancelled = false

    const timer = setTimeout(() => {
      if (isCancelled || !mountedRef.current) return

      if (retryKey < 2) {
        console.warn(`Sandpack load timed out. Retrying... (Attempt ${retryKey + 1})`)
        setRetryKey((prev) => prev + 1)
      } else {
        setPreviewStatus('timeout')
      }
    }, 15000)

    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [retryKey, previewStatus, sandpackModules])

  const handleManualRetry = () => {
    setRetryKey(0)
    setPreviewStatus('loading')
  }

  // Ensure that all file contents are non-undefined
  const sanitizedFiles: Record<string, string> = {}
  for (const [path, content] of Object.entries(files)) {
    sanitizedFiles[path] = content || ''
  }

  // Helper: check if file path exists with or without leading slash
  const hasFile = (p: string) => !!sanitizedFiles[p] || !!sanitizedFiles[`/${p}`] || !!sanitizedFiles[p.replace(/^\//, '')]

  // If React template, ensure Sandpack's required root entry file (/index.js) delegates to actual generated entry point
  if (template === 'react' || template === 'react-ts') {
    const hasRootIndex = hasFile('index.js') || hasFile('index.jsx') || hasFile('index.tsx') || hasFile('index.ts')
    if (!hasRootIndex) {
      // Find relative path to main component or entry
      const mainPath = Object.keys(sanitizedFiles).find((p) =>
        /src\/main\.(jsx|tsx|js|ts)$/i.test(p) || /main\.(jsx|tsx|js|ts)$/i.test(p)
      )
      const appPath = Object.keys(sanitizedFiles).find((p) =>
        /src\/App\.(jsx|tsx|js|ts)$/i.test(p) || /App\.(jsx|tsx|js|ts)$/i.test(p)
      )

      if (mainPath) {
        const relPath = mainPath.replace(/^\//, '').replace(/\.(jsx|tsx|js|ts)$/, '')
        sanitizedFiles['/index.js'] = `import "./${relPath}";`
      } else if (appPath) {
        const relPath = appPath.replace(/^\//, '').replace(/\.(jsx|tsx|js|ts)$/, '')
        sanitizedFiles['/index.js'] = `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./${relPath}";

const rootEl = document.getElementById("root") || document.getElementById("app") || document.body;
if (rootEl) {
  let container = document.getElementById("root");
  if (!container) {
    container = document.createElement("div");
    container.id = "root";
    document.body.appendChild(container);
  }
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
}`
      }
    }
  }

  // If static template, ensure we have at least an index.html at root
  if (template === 'static' && !hasFile('index.html')) {
    sanitizedFiles['/index.html'] = `<!DOCTYPE html>
<html>
<head>
  <title>Preview</title>
</head>
<body>
  <div id="app">No index.html file generated yet.</div>
</body>
</html>`
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[var(--bg-surface)] text-center border border-[var(--border-default)] rounded-xl gap-4 mx-4 my-8 shadow-xs">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/15">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)] font-sans">Preview Package Required</p>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm">
          Please run this command in your project terminal to activate the live browser preview:
        </p>
        <div className="bg-[var(--bg-page)] border border-[var(--border-strong)] p-2.5 rounded font-mono text-2xs text-[var(--text-primary)] select-all w-full max-w-md">
          <code>
            npm install @codesandbox/sandpack-react --legacy-peer-deps
          </code>
        </div>
      </div>
    )
  }

  if (!sandpackModules) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--bg-page)] text-[var(--text-secondary)] gap-3 font-mono text-xs uppercase tracking-wider select-none animate-pulse">
        <svg className="h-5 w-5 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Initializing sandbox...
      </div>
    )
  }

  const { SandpackProvider, SandpackLayout, SandpackPreview, useSandpack, useSandpackConsole } = sandpackModules

  if (previewStatus === 'timeout') {
    return (
      <div className="flex flex-col h-full bg-[var(--bg-page)]">
        <CustomPreviewHeader projectId={projectId} />
        <div className="flex-grow flex flex-col items-center justify-center text-center p-8 gap-4 select-none">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/15">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex flex-col gap-1.5 max-w-sm">
            <p className="text-sm font-semibold text-[var(--text-primary)] font-sans">Preview unavailable — retry</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              The live preview server is taking too long to connect. You can retry the connection or open the preview in a standalone tab.
            </p>
          </div>
          <button
            onClick={handleManualRetry}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] px-4 py-2 rounded-lg text-xs font-semibold shadow transition-colors cursor-pointer duration-150 mt-2"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)] overflow-hidden min-h-0">
      <style>{`
        .sp-wrapper, .sp-layout, .sp-preview, .sp-preview-container, .sp-preview-iframe {
          height: 100% !important;
          min-height: 100% !important;
          max-height: 100% !important;
          border: none !important;
        }
      `}</style>
      <SandpackProvider
        key={retryKey}
        files={sanitizedFiles}
        template={template}
        theme="dark"
        options={{
          recompileMode: 'immediate',
          recompileDelay: 300,
        }}
      >
        <SandpackStatusListener
          useSandpackHook={useSandpack}
          useSandpackConsoleHook={useSandpackConsole}
          onRunning={handleRunning}
        />
        <CustomPreviewHeader projectId={projectId} serverUrl={serverUrl} />
        <div className="flex-1 relative min-h-0 flex flex-col bg-[var(--bg-page)]">
          <SandpackLayout
            style={{ height: '100%', flex: 1, minHeight: 0, border: 0, borderRadius: 0 }}
          >
            <SandpackPreview
              style={{ height: '100%', flex: 1, minHeight: 0 }}
              showNavigator={true}
              showOpenInCodeSandbox={false}
              showRefreshButton={true}
            />
          </SandpackLayout>

          {previewStatus === 'loading' && (
            <div className="absolute inset-0 bg-[var(--bg-page)]/80 backdrop-blur-xs flex items-center justify-center gap-3 text-xs font-mono tracking-wide text-[var(--text-secondary)] select-none">
              <svg className="h-4.5 w-4.5 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span>
                Initializing live preview (Attempt {retryKey + 1} of 3)...
              </span>
            </div>
          )}
        </div>
      </SandpackProvider>
    </div>
  )
}
