'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X, Terminal as TerminalIcon, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getWebContainer, createFolderInWebContainer, normalizeWorkspacePath, checkWebContainerPathExists } from '@/lib/webcontainer'
import { FileItem } from './FileExplorer'
import type { WebContainerProcess } from '@webcontainer/api'

interface OutputLine {
  id: string
  type: 'log' | 'error' | 'warn' | 'info'
  message: string
  timestamp: Date
}

interface TerminalTab {
  id: string
  name: string
  lines: OutputLine[]
  process: WebContainerProcess | null
  isRunning: boolean
  cwd: string
}

interface TerminalPanelProps {
  files?: FileItem[]
  webContainerBooted?: boolean
  onFsChange?: () => void
  projectName?: string
  isExpanded?: boolean
  onToggleExpand?: (expanded: boolean) => void
  onServerReady?: (url: string) => void
}

function cleanAnsiText(text: string): string {
  if (!text) return ''
  return text
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
    .replace(/\x1B\].*?\x07/g, '')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '')
    .replace(/\r/g, '')
}

export function TerminalPanel({
  files = [],
  projectName,
  isExpanded = true,
  onToggleExpand,
  onServerReady,
  onFsChange,
}: TerminalPanelProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: 'term-1', name: 'Terminal 1', lines: [], process: null, isRunning: false, cwd: '~' },
  ])
  const [activeTabId, setActiveTabId] = useState<string>('term-1')
  const [inputVal, setInputVal] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState<number>(-1)
  const [webContainerBooted, setWebContainerBooted] = useState(false)

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0]
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalEndRef = useRef<HTMLDivElement>(null)
  const hasAutoRunRef = useRef(false)

  const promptDir = (projectName && projectName.trim())
    ? projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '')
    : 'wisp'

  const activeCwd = activeTab?.cwd || '~'
  const promptString = activeCwd === '~' ? promptDir : `${promptDir}/${activeCwd}`

  const appendLine = useCallback((tabId: string, message: string, type: 'log' | 'error' | 'warn' | 'info' = 'log') => {
    const cleanedMessage = cleanAnsiText(message)
    if (!cleanedMessage && message) return
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId) return t
        const newLine: OutputLine = {
          id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type,
          message: cleanedMessage,
          timestamp: new Date(),
        }
        return {
          ...t,
          lines: [...t.lines, newLine],
        }
      })
    )
  }, [])

  // ── WebContainer server-ready listener ────────────────────────────────────
  useEffect(() => {
    let unbindServerReady: (() => void) | null = null

    getWebContainer().then((wc) => {
      if (!wc) return
      setWebContainerBooted(true)

      const unsubscribe = wc.on('server-ready', (port, url) => {
        console.log('[WebContainer Server Ready]', { port, url })
        onServerReady?.(url)
        appendLine('term-1', `🚀 Dev server listening on port ${port}: ${url}`, 'info')
      })

      unbindServerReady = () => unsubscribe()
    })

    return () => {
      if (unbindServerReady) unbindServerReady()
    }
  }, [onServerReady, appendLine])

  // ── Auto scroll terminal ──────────────────────────────────────────────────
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeTab?.lines])

  // ── Spawn command inside WebContainer for a specific tab ──────────────────
  const runCommandInTab = useCallback(async (tabId: string, cmdStr: string) => {
    const trimmed = cmdStr.trim()
    if (!trimmed) return

    const lowerCmd = trimmed.toLowerCase()

    const currentTab = tabs.find((t) => t.id === tabId)
    const tabCwd = currentTab?.cwd || '~'

    // 1. Handle clear / cls
    if (lowerCmd === 'clear' || lowerCmd === 'cls') {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, lines: [] } : t)))
      return
    }

    // 2. Handle pwd
    if (lowerCmd === 'pwd') {
      appendLine(tabId, `wisp:${tabCwd}$ ${trimmed}`, 'log')
      const displayPath = tabCwd === '~' ? '/' : (tabCwd.startsWith('/') ? tabCwd : `/${tabCwd}`)
      appendLine(tabId, displayPath, 'log')
      return
    }

    // 3. Handle cd
    if (lowerCmd === 'cd' || lowerCmd === 'cd..' || lowerCmd.startsWith('cd ') || lowerCmd.startsWith('cd/')) {
      appendLine(tabId, `wisp:${tabCwd}$ ${trimmed}`, 'log')

      let target = ''
      if (lowerCmd === 'cd..') {
        target = '..'
      } else {
        target = trimmed.slice(2).trim()
      }

      if (!target || target === '~' || target === '/') {
        setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, cwd: '~' } : t)))
        return
      }

      const { cwd: nextCwd, canonicalPath } = normalizeWorkspacePath(tabCwd, target)

      // If nextCwd resolved back to root ('~' or empty canonicalPath), navigate immediately
      if (nextCwd === '~' || !canonicalPath) {
        setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, cwd: '~' } : t)))
        return
      }

      const targetParts = canonicalPath.split('/')
      const targetName = targetParts.pop() || ''
      const parentCwd = targetParts.length === 0 ? '~' : targetParts.join('/')

      const { exists, isDirectory } = await checkWebContainerPathExists(parentCwd, targetName)

      if (!exists) {
        // Sync folder into WebContainer virtual FS if created in Explorer UI
        const created = await createFolderInWebContainer(nextCwd)
        if (created) {
          const checkAgain = await checkWebContainerPathExists(parentCwd, targetName)
          if (!checkAgain.exists) {
            appendLine(tabId, `cd: no such file or directory: ${target}`, 'error')
            return
          }
          if (!checkAgain.isDirectory) {
            appendLine(tabId, `cd: not a directory: ${target}`, 'error')
            return
          }
        } else {
          appendLine(tabId, `cd: no such file or directory: ${target}`, 'error')
          return
        }
      } else if (!isDirectory) {
        appendLine(tabId, `cd: not a directory: ${target}`, 'error')
        return
      }

      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, cwd: nextCwd } : t)))
      return
    }

    appendLine(tabId, `wisp:${tabCwd}$ ${trimmed}`, 'log')

    const wc = await getWebContainer()
    if (!wc) {
      if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
        appendLine(tabId, '❌ WebContainer failed to boot: Cross-Origin Isolation (COOP/COEP) is missing. Reloading page to activate isolation...', 'error')
        const reloadedKey = 'wisp_coop_reloaded'
        if (!sessionStorage.getItem(reloadedKey)) {
          sessionStorage.setItem(reloadedKey, 'true')
          window.location.reload()
        }
      } else {
        appendLine(tabId, '❌ WebContainer instance unavailable in this environment — shell commands cannot be executed.', 'error')
      }
      return
    }

    // Parse command + arguments
    const parts = trimmed.split(/\s+/)
    const command = parts[0]
    const args = parts.slice(1)

    try {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, isRunning: true } : t)))

      const { canonicalPath: spawnCwd } = normalizeWorkspacePath(tabCwd, '')
      const proc = await wc.spawn(command, args, { cwd: spawnCwd || '.' })
      
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, process: proc } : t)))

      // Stream stdout/stderr
      proc.output.pipeTo(
        new WritableStream({
          write(data) {
            appendLine(tabId, data, 'log')
          },
        })
      ).catch(() => {})

      const exitCode = await proc.exit
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, process: null, isRunning: false } : t))
      )

      // Notify parent to re-sync filesystem tree when CLI commands touch/mkdir files
      onFsChange?.()

      if (exitCode !== 0) {
        appendLine(tabId, `Process exited with code ${exitCode}`, 'warn')
      }
    } catch (err: any) {
      appendLine(tabId, `Failed to execute: ${err.message || err}`, 'error')
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, process: null, isRunning: false } : t)))
    }
  }, [appendLine, tabs, onFsChange])

  // ── Auto-run npm install && npm run dev on project load/generation ────────
  useEffect(() => {
    if (!webContainerBooted || hasAutoRunRef.current || files.length === 0) return

    const hasPackageJson = files.some(
      (f) => f.name === 'package.json' || (f.children && f.children.some((c) => c.name === 'package.json'))
    )

    if (hasPackageJson) {
      hasAutoRunRef.current = true

      ;(async () => {
        appendLine('term-1', '📦 Auto-installing project dependencies (npm install)...', 'info')
        await runCommandInTab('term-1', 'npm install --prefer-offline')
        appendLine('term-1', '🚀 Starting local dev server (npm run dev)...', 'info')
        await runCommandInTab('term-1', 'npm run dev')
      })()
    }
  }, [webContainerBooted, files, runCommandInTab, appendLine])

  // ── Kill running process (Ctrl+C) ──────────────────────────────────────────
  const handleInterruptProcess = useCallback(() => {
    if (!activeTab || !activeTab.process) return
    try {
      activeTab.process.kill()
      appendLine(activeTab.id, '^C (Process interrupted)', 'warn')
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTab.id ? { ...t, process: null, isRunning: false } : t))
      )
    } catch (err) {
      console.warn('[Terminal] Kill failed:', err)
    }
  }, [activeTab, appendLine])

  const containerRef = useRef<HTMLDivElement>(null)

  // ── PTY Terminal Resize Observer ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        const cols = Math.max(80, Math.floor(width / 8.5))
        const rows = Math.max(24, Math.floor(height / 18))
        if (activeTab?.process) {
          try {
            activeTab.process.resize({ cols, rows })
          } catch {
            // ignore if process exited
          }
        }
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [activeTab?.process])

  // ── Handle Input Submission & Raw VT100 Keystrokes ───────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isRunning = activeTab && activeTab.isRunning && activeTab.process

    if (isRunning) {
      const proc = activeTab.process!
      const sendRawToStdin = (rawSeq: string) => {
        try {
          const writer = proc.input.getWriter()
          writer.write(rawSeq)
          writer.releaseLock()
        } catch (err) {
          console.warn('[Terminal] Stdin write error:', err)
        }
      }

      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault()
        sendRawToStdin('\x03')
        handleInterruptProcess()
        return
      }

      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault()
        sendRawToStdin('\x04')
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        sendRawToStdin('\x1b[A')
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        sendRawToStdin('\x1b[B')
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        sendRawToStdin('\x1b[C')
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        sendRawToStdin('\x1b[D')
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        sendRawToStdin('\t')
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        sendRawToStdin('\x1b')
        return
      }
      if (e.key === 'Backspace' && !inputVal) {
        e.preventDefault()
        sendRawToStdin('\x7f')
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const textToSubmit = inputVal
        setInputVal('')
        appendLine(activeTabId, textToSubmit, 'log')
        sendRawToStdin(textToSubmit + '\r')
        return
      }
    } else {
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault()
        handleInterruptProcess()
        return
      }

      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault()
        setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, lines: [] } : t)))
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (history.length === 0) return
        const nextIdx = historyIdx < history.length - 1 ? historyIdx + 1 : historyIdx
        setHistoryIdx(nextIdx)
        setInputVal(history[history.length - 1 - nextIdx] || '')
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (historyIdx <= 0) {
          setHistoryIdx(-1)
          setInputVal('')
          return
        }
        const nextIdx = historyIdx - 1
        setHistoryIdx(nextIdx)
        setInputVal(history[history.length - 1 - nextIdx] || '')
        return
      }

      if (e.key === 'Enter') {
        const cmd = inputVal.trim()
        setInputVal('')
        if (!cmd) return
        setHistory((prev) => [...prev, cmd])
        setHistoryIdx(-1)
        runCommandInTab(activeTabId, cmd)
      }
    }
  }

  // ── Multi-terminal tab management (Add / Remove) ─────────────────────────
  const handleAddTerminalTab = () => {
    if (tabs.length >= 5) return
    const nextNum = tabs.length + 1
    const newId = `term-${Date.now()}`
    const newTab: TerminalTab = {
      id: newId,
      name: `Terminal ${nextNum}`,
      lines: [{ id: 'init', type: 'info', message: `Shell tab #${nextNum} ready`, timestamp: new Date() }],
      process: null,
      isRunning: false,
      cwd: '~',
    }
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newId)
  }

  const handleCloseTerminalTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (tabs.length <= 1) return
    const target = tabs.find((t) => t.id === tabId)
    if (target?.process) {
      try { target.process.kill() } catch {}
    }
    const filtered = tabs.filter((t) => t.id !== tabId)
    setTabs(filtered)
    if (activeTabId === tabId) {
      setActiveTabId(filtered[filtered.length - 1].id)
    }
  }

  const filteredLines = activeTab?.lines || []

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-[#282c34] text-[#abb2bf] font-mono select-none">
      {/* Header Bar */}
      <div className="h-9 border-b border-[#181a1f] bg-[#21252b] flex items-center justify-between px-3 shrink-0 select-none">
        {/* Terminal Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1 rounded-t-md text-xs cursor-pointer transition-all duration-150 border-t-2',
                activeTabId === tab.id
                  ? 'bg-[#282c34] text-[#61afef] border-[#61afef] font-semibold'
                  : 'text-[#abb2bf]/60 border-transparent hover:bg-[#2c313c] hover:text-[#abb2bf]'
              )}
            >
              <TerminalIcon className="h-3 w-3" />
              <span>{tab.name}</span>
              {tab.isRunning && <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => handleCloseTerminalTab(tab.id, e)}
                  className="hover:text-red-400 rounded p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}

          {tabs.length < 5 && (
            <button
              onClick={handleAddTerminalTab}
              title="Open new terminal tab"
              className="p-1 rounded hover:bg-[#2c313c] text-[#abb2bf]/60 hover:text-[#abb2bf] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Quick Process Action Controls */}
        <div className="flex items-center gap-2">
          {activeTab?.isRunning && (
            <button
              onClick={handleInterruptProcess}
              title="Interrupt running process (Ctrl+C)"
              className="inline-flex items-center gap-1 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 text-3xs px-2 py-0.5 rounded font-mono cursor-pointer"
            >
              <ShieldAlert className="h-3 w-3" />
              <span>Ctrl+C</span>
            </button>
          )}
        </div>
      </div>

      {/* Output Console Lines */}
      <div className="flex-1 overflow-y-auto p-4 text-xs font-mono select-text bg-[#282c34] scrollbar-none flex flex-col justify-between">
        <div className="flex flex-col gap-1">
          {filteredLines.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 my-auto text-[#abb2bf]/40">
              <p className="text-xs">Terminal output ready</p>
              <p className="text-3xs uppercase tracking-widest mt-1">Type commands below</p>
            </div>
          ) : (
            filteredLines.map((line) => (
              <div key={line.id} className="flex items-start gap-2 leading-relaxed whitespace-pre-wrap">
                <span className={cn(
                  'flex-1',
                  line.type === 'error' && 'text-[#e06c75]',
                  line.type === 'warn' && 'text-[#d19a66]',
                  line.type === 'info' && 'text-[#61afef]',
                  line.type === 'log' && 'text-[#abb2bf]'
                )}>
                  {line.message}
                </span>
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Input prompt line */}
        <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[#181a1f] shrink-0">
          <span className="text-[#61afef] font-bold select-none">wisp:{promptString}$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type npm run dev, npm install, ls, pwd, clear..."
            className="flex-1 bg-transparent border-none text-xs font-mono text-[#abb2bf] placeholder-[#5c6370]/50 focus:ring-0 focus:outline-none p-0"
          />
        </div>
      </div>
    </div>
  )
}
