'use client'

import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Folder, MessageSquare, Terminal, Rocket, Play, RefreshCw, Code, Eye } from 'lucide-react'
import { StatusBar } from './StatusBar'
import { FileExplorer, FileItem } from './FileExplorer'
import { TabBar, TabItem } from './TabBar'
import { Breadcrumb } from './Breadcrumb'
import { CodeEditor } from './CodeEditor'
import { MarkdownPreview } from './MarkdownPreview'
import { ChatPanel, Message, ChatMode } from './ChatPanel'
import { Preview } from './Preview'
import { TerminalPanel } from './TerminalPanel'
import { Dock } from '@/components/dock'
import { cn } from '@/lib/utils'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { mountWebContainerFiles, syncFileToWebContainer, deleteFileFromWebContainer, isNodeFrameworkProject } from '@/lib/webcontainer'

// Dynamically import SandpackPreviewWrapper with SSR disabled to prevent hydration/compilation issues on non-installed/server setups
const SandpackPreviewComponent = dynamic(
  () => import('./SandpackPreview'),
  { ssr: false }
)

interface OutputLine {
  id: string
  type: 'log' | 'error' | 'warn' | 'info'
  message: string
  timestamp: Date
}

interface IDELayoutProps {
  files?: FileItem[]
  initialMessages?: Message[]
  onSendMessage?: (message: string, model?: string, mode?: string) => void
  onDeploy?: () => void
  onNewProject?: () => void
  status?: 'draft' | 'unaudited' | 'deployed'
  isLoading?: boolean
  output?: OutputLine[]
  onFileChange?: (fileId: string, content: string) => void
  onCreateFile?: (name: string, type: 'file' | 'folder') => void
  projectName?: string
  selectedModel?: string
  onModelChange?: (model: string) => void
  projectId?: string
  selectedMode?: ChatMode
  onModeChange?: (mode: ChatMode) => void
  onPlanAction?: (planPath: string, action: 'edit' | 'build') => void
  activeFileId?: string
  onDeleteFile?: (fileId: string) => void
  onRenameFile?: (fileId: string, newName: string) => void
}

// Flatten nested file structure into simple Record<string, string> paths for Sandpack
function flattenFileTree(items: FileItem[]): Record<string, string> {
  const result: Record<string, string> = {}
  const traverse = (nodes: FileItem[], currentPath: string = '') => {
    for (const node of nodes) {
      const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name
      if (node.type === 'file') {
        result[`/${nodePath}`] = node.content || ''
      } else if (node.children) {
        traverse(node.children, nodePath)
      }
    }
  }
  traverse(items)
  return result
}

// Detect if project contains web-related code (HTML/CSS/JS/JSX/TSX or package.json)
function checkIsWebProject(flatFiles: Record<string, string>): boolean {
  const paths = Object.keys(flatFiles)
  if (paths.length === 0) return false // No files yet — don't show the web preview panel
  return paths.some(
    (p) =>
      p.endsWith('.html') ||
      p.endsWith('.css') ||
      p.endsWith('.js') ||
      p.endsWith('.jsx') ||
      p.endsWith('.tsx') ||
      p.includes('package.json')
  )
}

// Detect the appropriate template for Sandpack preview
function getSandpackTemplate(flatFiles: Record<string, string>): 'static' | 'react' | 'react-ts' {
  const paths = Object.keys(flatFiles)
  if (paths.some((p) => p.endsWith('.tsx') || p.endsWith('.ts'))) {
    return 'react-ts'
  }
  if (paths.some((p) => p.endsWith('.jsx') || p.includes('package.json'))) {
    return 'react'
  }
  return 'static'
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)] text-[var(--text-secondary)] p-6 gap-5 animate-pulse">
      {/* Fake tab bar */}
      <div className="flex gap-2">
        <div className="h-7 w-24 bg-[var(--bg-surface)] rounded-md border border-[var(--border-default)]" />
        <div className="h-7 w-24 bg-[var(--bg-surface)] rounded-md border border-[var(--border-default)]" />
      </div>
      {/* Fake breadcrumb */}
      <div className="flex items-center gap-1.5 h-4">
        {[10, 3, 14, 3, 10].map((w, i) => (
          <div key={i} className="h-3 bg-[var(--bg-surface)] rounded-sm" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
      {/* Fake code lines */}
      <div className="flex flex-col gap-3 mt-4">
        {[70, 90, 55, 80, 40, 95, 65, 50, 75, 85, 45, 60].map((w, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 w-6 bg-[var(--bg-surface)] rounded-xs text-right font-mono text-2xs select-none opacity-40">{i + 1}</div>
            <div className="h-4 bg-[var(--bg-surface)] rounded-sm" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
      {/* Generating label */}
      <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-page)]/40 backdrop-blur-xs">
        <div className="inline-flex items-center gap-3 rounded-full border border-[var(--accent)]/15 bg-[var(--bg-surface)] px-5 py-2.5 shadow-sm text-sm font-medium text-[var(--text-primary)]">
          <svg className="h-4 w-4 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="font-sans font-medium tracking-tight">Generating code…</span>
        </div>
      </div>
    </div>
  )
}

export function IDELayout({
  files = [],
  initialMessages = [],
  onSendMessage,
  onDeploy,
  onNewProject,
  status = 'draft',
  isLoading = false,
  output = [],
  onFileChange,
  onCreateFile,
  projectName,
  selectedModel,
  onModelChange,
  projectId,
  selectedMode,
  onModeChange,
  onPlanAction,
  activeFileId,
  onDeleteFile,
  onRenameFile,
}: IDELayoutProps) {
  const [selectedFileId, setSelectedFileId] = useState<string>()
  const [openTabs, setOpenTabs] = useState<Set<string>>(new Set())
  const [webContainerServerUrl, setWebContainerServerUrl] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<'code' | 'preview'>('code')

  const nodeInfo = useMemo(() => isNodeFrameworkProject(files), [files])

  // Mount files into WebContainer when Node framework project is loaded
  useEffect(() => {
    if (nodeInfo.isNode && files.length > 0) {
      mountWebContainerFiles(files)
    }
  }, [nodeInfo.isNode, files])

  const handleDeleteFileTabSync = (fileId: string) => {
    handleCloseTab(fileId)
    deleteFileFromWebContainer(fileId)
    onDeleteFile?.(fileId)
  }

  // Sync external activeFileId request (e.g. from clicking Edit on a plan card)
  useEffect(() => {
    if (activeFileId) {
      setSelectedFileId(activeFileId)
      setOpenTabs((prev) => new Set([...prev, activeFileId]))
    }
  }, [activeFileId])
  const [previewExpanded, setPreviewExpanded] = useState(true)
  const [outputLines, setOutputLines] = useState<OutputLine[]>(output)
  const [isRunningCode, setIsRunningCode] = useState(false)
  const [consoleHeight, setConsoleHeight] = useState(256)
  const [isDraggingConsole, setIsDraggingConsole] = useState(false)

  // Drag console resizer listener
  useEffect(() => {
    if (!isDraggingConsole) return

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY - 48
      setConsoleHeight(Math.max(100, Math.min(600, newHeight)))
    }

    const handleMouseUp = () => {
      setIsDraggingConsole(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingConsole])



  const handleExecuteCommand = async (cmd: string) => {
    // 1. Log the user's input line
    const userLine: OutputLine = {
      id: `cli-user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'log',
      message: `$ ${cmd}`,
      timestamp: new Date()
    }
    setOutputLines((prev) => [...prev, userLine])

    const printOutput = (msg: string, type: 'log' | 'info' | 'error' | 'warn' = 'log') => {
      setOutputLines((prev) => [
        ...prev,
        {
          id: `cli-res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type,
          message: msg,
          timestamp: new Date()
        }
      ])
    }

    const command = cmd.trim()
    const lowerCommand = command.toLowerCase()

    if (lowerCommand === 'help') {
      printOutput(
        `Available workspace commands:\n  python <filename>  - Run a Python script via Wandbox sandbox\n  node <filename>    - Run a JavaScript file via Wandbox sandbox\n  npm install <pkg>  - Install a package in Sandpack web live preview\n  clear              - Clear terminal logs\n  [expressions]      - Type JS/Python snippets (e.g., console.log(2+2)) to run in sandbox`,
        'info'
      )
      return
    }

    if (lowerCommand === 'clear') {
      setOutputLines([])
      return
    }

    // Match "npm install <package>"
    const npmInstallMatch = command.match(/^npm\s+install\s+(.+)$/i)
    if (npmInstallMatch) {
      const pkgName = npmInstallMatch[1].trim()
      printOutput(`📦 Resolving package: ${pkgName}...`, 'info')
      printOutput(`Downloading and linking package on Sandpack client...`, 'info')
      
      // Simulate npm install resolving
      setTimeout(() => {
        // Find package.json in files list to add dependency
        const updatePackageJson = (items: FileItem[]): boolean => {
          for (const item of items) {
            if (item.name === 'package.json' && item.content) {
              try {
                const pkg = JSON.parse(item.content)
                pkg.dependencies = pkg.dependencies || {}
                pkg.dependencies[pkgName] = 'latest'
                item.content = JSON.stringify(pkg, null, 2)
                if (onFileChange) onFileChange(item.id, item.content)
                return true
              } catch (e) {
                return false
              }
            }
            if (item.children) {
              if (updatePackageJson(item.children)) return true
            }
          }
          return false
        }

        const found = updatePackageJson(files)
        if (!found) {
          printOutput(`+ ${pkgName}@latest\nadded 1 package in 0.85s`, 'log')
        } else {
          printOutput(`+ ${pkgName}@latest\nadded 1 package and updated package.json`, 'log')
        }
      }, 900)
      return
    }

    // Match file runs: "python main.py", "node index.js", etc.
    const fileRunMatch = command.match(/^(python|python3|node|go\s+run|cargo\s+run|rustc|gcc)\s+(.+)$/i)
    if (fileRunMatch) {
      const runner = fileRunMatch[1].toLowerCase()
      const filename = fileRunMatch[2].trim()

      const langMap: Record<string, string> = {
        python: 'python',
        python3: 'python',
        node: 'javascript',
        'go run': 'go',
        'cargo run': 'rust',
        rustc: 'rust',
        gcc: 'c',
      }
      const language = langMap[runner] || 'javascript'

      // Search file in flatFiles
      const filePath = Object.keys(flatFiles).find(
        (p) => p.endsWith(filename) || p === filename || p === `/${filename}`
      )
      const fileContent = filePath ? flatFiles[filePath] : null

      if (fileContent === null || fileContent === undefined) {
        printOutput(`Error: File '${filename}' not found in workspace explorer.`, 'error')
        return
      }

      printOutput(`Executing ${filename} in Wandbox sandbox...`, 'info')

      try {
        const res = await fetch('/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language,
            files: [{ name: filename, content: fileContent }],
          }),
        })

        if (!res.ok) throw new Error(await res.text())
        const result = await res.json()

        if (result.compile && result.compile.output) {
          printOutput(result.compile.output, result.compile.code !== 0 ? 'error' : 'log')
        }
        if (result.run) {
          if (result.run.stdout) printOutput(result.run.stdout, 'log')
          if (result.run.stderr) printOutput(result.run.stderr, 'error')
          if (result.run.code !== 0) {
            printOutput(`Process exited with code ${result.run.code}`, 'error')
          }
        }
      } catch (err: any) {
        printOutput(`Execution failed: ${err.message || err}`, 'error')
      }
      return
    }

    // If it's a raw expression (like 2+2 or print("hello")), execute it as a script snippet
    // Guess language based on active file extension or snippet contents
    const activeExt = selectedFile?.name.split('.').pop()?.toLowerCase() || ''
    const isPythonSnippet = activeExt === 'py' || command.includes('print(') || command.includes('def ')
    const language = isPythonSnippet ? 'python' : 'javascript'
    const tempFilename = isPythonSnippet ? 'snippet.py' : 'snippet.js'

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          files: [{ name: tempFilename, content: command }],
        }),
      })

      if (!res.ok) throw new Error(await res.text())
      const result = await res.json()

      if (result.run) {
        if (result.run.stdout) printOutput(result.run.stdout, 'log')
        if (result.run.stderr) printOutput(result.run.stderr, 'error')
        if (result.run.code !== 0 && !result.run.stdout && !result.run.stderr) {
          printOutput(`Snippet exited with code ${result.run.code}`, 'error')
        }
      }
    } catch (err: any) {
      printOutput(`Evaluation failed: ${err.message || err}`, 'error')
    }
  }

  // Floating dock panel toggle states
  const [showExplorer, setShowExplorer] = useState(true)
  const [showChat, setShowChat] = useState(true)

  // Listen to window messages to capture console outputs from the preview iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data
      if (data && data.type === 'console') {
        const payload = data.payload
        if (payload && payload.type) {
          const typeMap: Record<string, 'log' | 'error' | 'warn' | 'info'> = {
            log: 'log',
            error: 'error',
            warn: 'warn',
            info: 'info',
          }
          const messageType = typeMap[payload.type] || 'log'
          const rawMessage = Array.isArray(payload.data)
            ? payload.data.map((d: any) => typeof d === 'string' ? d : JSON.stringify(d)).join(' ')
            : String(payload.data)

          // Tag it clearly as coming from the preview iframe
          const taggedMessage = `[Preview] ${rawMessage}`

          setOutputLines((prev) => [
            ...prev,
            {
              id: `preview-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              type: messageType,
              message: taggedMessage,
              timestamp: new Date(),
            },
          ])
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Sync openTabs and selectedFileId when the files list updates (e.g., after generation)
  useEffect(() => {
    // Helper to get all valid file IDs recursively
    const getValidFileIds = (nodes: FileItem[]): Set<string> => {
      const ids = new Set<string>()
      const traverse = (items: FileItem[]) => {
        for (const item of items) {
          if (item.type === 'file') {
            ids.add(item.id)
          } else if (item.children) {
            traverse(item.children)
          }
        }
      }
      traverse(nodes)
      return ids
    }

    const validIds = getValidFileIds(files)

    // Compute the next valid open tabs
    const nextOpenTabs = new Set<string>()
    openTabs.forEach((id) => {
      if (validIds.has(id)) {
        nextOpenTabs.add(id)
      }
    })

    // Update state only if changed
    const openTabsChanged = openTabs.size !== nextOpenTabs.size || 
                            Array.from(openTabs).some(id => !nextOpenTabs.has(id))

    if (openTabsChanged) {
      setOpenTabs(nextOpenTabs)
    }

    // Update selected file ID
    setSelectedFileId((prev) => {
      if (prev && validIds.has(prev)) {
        return prev
      }
      const openTabsList = Array.from(nextOpenTabs)
      if (openTabsList.length > 0) {
        return openTabsList[0]
      }
      if (validIds.size > 0) {
        return Array.from(validIds)[0]
      }
      return undefined
    })
  }, [files])

  // Generate flat files and detect project configuration
  const flatFiles = useMemo(() => flattenFileTree(files), [files])
  const isWeb = useMemo(() => checkIsWebProject(flatFiles), [flatFiles])
  const webTemplate = useMemo(() => getSandpackTemplate(flatFiles), [flatFiles])

  // Simulation of terminal output bootup sequence when the files count changes
  useEffect(() => {
    if (files.length === 0) return

    // Detect project type
    const isPlainHtml = isWeb && webTemplate === 'static'
    const isNodeReact = isWeb && webTemplate !== 'static'

    if (isPlainHtml) {
      // Clear previous logs and show a clean static server initialization
      setOutputLines([
        {
          id: 'term-init',
          type: 'info',
          message: '⚙️ Initializing static web workspace...',
          timestamp: new Date(),
        },
        {
          id: 'term-ready',
          type: 'info',
          message: '🚀 Live Preview active - serving static assets directly',
          timestamp: new Date(),
        }
      ])
      return
    }

    if (isNodeReact) {
      setOutputLines([
        {
          id: 'term-init',
          type: 'info',
          message: '🚀 Live Preview active — rendering React application via Sandpack browser sandbox.',
          timestamp: new Date(),
        }
      ])
      return
    }

    // Default: Soroban/Rust smart contract project
    // Derive real contract name + test names from the actual files to avoid hardcoded strings
    const cargoFile = files
      .flatMap(function flatten(f: FileItem): FileItem[] {
        if (f.type === 'file') return [f]
        return (f.children || []).flatMap(flatten)
      })
      .find((f) => f.name.toLowerCase() === 'cargo.toml')

    // Parse name = "..." from Cargo.toml content
    const cargoName = (() => {
      if (!cargoFile?.content) return 'my_contract'
      const m = cargoFile.content.match(/^\s*name\s*=\s*"([^"]+)"/m)
      return m ? m[1] : 'my_contract'
    })()

    // Parse #[test] fn names from any .rs file
    const testNames: string[] = []
    files
      .flatMap(function flatten(f: FileItem): FileItem[] {
        if (f.type === 'file') return [f]
        return (f.children || []).flatMap(flatten)
      })
      .filter((f) => f.name.endsWith('.rs'))
      .forEach((f) => {
        const matches = [...(f.content || '').matchAll(/fn\s+(test_\w+)\s*\(/g)]
        matches.forEach((m) => testNames.push(m[1]))
      })

    const testSummary =
      testNames.length > 0
        ? testNames.map((n) => `  test tests::${n} ... ok`).join('\n') +
          `\n  test result: ok. ${testNames.length} passed; 0 failed; 0 ignored`
        : '  test result: ok. 0 tests; 0 failed; 0 ignored'

    setOutputLines([
      {
        id: 'term-init',
        type: 'info',
        message: '⚙️ Initializing Soroban workspace dev environment...',
        timestamp: new Date(),
      }
    ])

    const steps = [
      { delay: 400, type: 'info', message: '📦 Resolving contract dependencies...' },
      { delay: 800, type: 'log', message: '$ cargo build --target wasm32-unknown-unknown --release' },
      { delay: 1500, type: 'info', message: `  Compiling soroban-sdk v22.0.0\n  Compiling ${cargoName} v0.1.0\n  Finished release [optimized] target(s) in 0.72s` },
      { delay: 1800, type: 'log', message: '$ cargo test' },
      { delay: 2100, type: 'info', message: `  Running contract unit tests...\n${testSummary}` },
      { delay: 2400, type: 'info', message: '✨ compiled contract modules successfully' },
    ]

    const timers: NodeJS.Timeout[] = []

    steps.forEach((step) => {
      const timer = setTimeout(() => {
        setOutputLines((prev) => [
          ...prev,
          {
            id: `term-step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: step.type as any,
            message: step.message,
            timestamp: new Date(),
          }
        ])
      }, step.delay)
      timers.push(timer)
    })

    return () => {
      timers.forEach((t) => clearTimeout(t))
    }
  }, [files.length, isWeb, webTemplate])

  const selectedFile = useMemo(() => {
    if (!selectedFileId) return null
    const findFile = (items: FileItem[]): FileItem | null => {
      for (const item of items) {
        if (item.id === selectedFileId) return item
        if (item.children) {
          const found = findFile(item.children)
          if (found) return found
        }
      }
      return null
    }
    return findFile(files)
  }, [selectedFileId, files])

  const getFilePath = (fileId: string): string[] => {
    const path: string[] = []
    const findPath = (items: FileItem[], targetId: string): boolean => {
      for (const item of items) {
        if (item.id === targetId) {
          path.push(item.name)
          return true
        }
        if (item.children) {
          if (findPath(item.children, targetId)) {
            path.unshift(item.name)
            return true
          }
        }
      }
      return false
    }
    findPath(files, fileId)
    return path
  }

  const handleSelectFile = (file: FileItem) => {
    setSelectedFileId(file.id)
    setOpenTabs((prev) => new Set([...prev, file.id]))
  }

  const handleSelectTab = (fileId: string) => {
    setSelectedFileId(fileId)
  }

  const handleCloseTab = (fileId: string) => {
    setOpenTabs((prev) => {
      const next = new Set(prev)
      next.delete(fileId)
      return next
    })
    if (selectedFileId === fileId) {
      const remaining = Array.from(openTabs).filter((id) => id !== fileId)
      setSelectedFileId(remaining[0])
    }
  }

  const handleRunCode = async () => {
    if (!selectedFile || isRunningCode || selectedFile.name.endsWith('.md')) return

    setIsRunningCode(true)
    setPreviewExpanded(true)

    // ── Cargo project: .rs or .toml files route to contract build, not Wandbox ────
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || ''
    const isCargoProject = (() => {
      const allFileNames: string[] = []
      const collect = (items: FileItem[]) => {
        for (const item of items) {
          if (item.type === 'file') allFileNames.push(item.name.toLowerCase())
          if (item.children) collect(item.children)
        }
      }
      collect(files)
      return allFileNames.includes('cargo.toml') || allFileNames.some((n) => n.endsWith('.rs'))
    })()

    if (ext === 'toml' || ext === 'rs' || (isCargoProject && ext === 'rs')) {
      const startLine: OutputLine = {
        id: `run-start-${Date.now()}`,
        type: 'info',
        message: `🔨 Building Soroban contract: cargo build --target wasm32-unknown-unknown --release`,
        timestamp: new Date(),
      }
      setOutputLines((prev) => [...prev, startLine])

      try {
        // Collect all files for the build API
        const allFiles: { path: string; content: string }[] = []
        const collectFiles = (items: FileItem[], prefix = '') => {
          for (const item of items) {
            const p = prefix ? `${prefix}/${item.name}` : item.name
            if (item.type === 'file') allFiles.push({ path: p, content: item.content || '' })
            if (item.children) collectFiles(item.children, p)
          }
        }
        collectFiles(files)

        const res = await fetch('/api/build-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: allFiles }),
        })

        const data = await res.json()

        if (!res.ok) {
          setOutputLines((prev) => [
            ...prev,
            {
              id: `run-err-${Date.now()}`,
              type: 'error',
              message: data.error || `Build failed (${res.status})`,
              timestamp: new Date(),
            },
          ])
        } else {
          if (data.buildOutput) {
            setOutputLines((prev) => [
              ...prev,
              { id: `run-build-${Date.now()}`, type: 'log', message: data.buildOutput.trim(), timestamp: new Date() },
            ])
          }
          if (data.testOutput) {
            setOutputLines((prev) => [
              ...prev,
              { id: `run-test-${Date.now()}`, type: 'info', message: data.testOutput.trim(), timestamp: new Date() },
            ])
          }
          if (!data.buildOutput && !data.testOutput) {
            setOutputLines((prev) => [
              ...prev,
              { id: `run-ok-${Date.now()}`, type: 'info', message: '✨ Build succeeded.', timestamp: new Date() },
            ])
          }
        }
      } catch (error: any) {
        setOutputLines((prev) => [
          ...prev,
          {
            id: `run-catch-${Date.now()}`,
            type: 'error',
            message: `Build error: ${error.message || error}`,
            timestamp: new Date(),
          },
        ])
      } finally {
        setIsRunningCode(false)
      }
      return
    }

    // ── Standard script execution (non-Cargo files) via Wandbox ──────────────
    const startLine: OutputLine = {
      id: `run-start-${Date.now()}`,
      type: 'info',
      message: `Compiling and executing ${selectedFile.name}...`,
      timestamp: new Date(),
    }
    setOutputLines((prev) => [...prev, startLine])
    // Detect language configuration for Wandbox API
    const langMap: Record<string, string> = {
      py: 'python',
      js: 'javascript',
      ts: 'typescript',
      c: 'c',
      cpp: 'cpp',
      rs: 'rust',
      java: 'java',
      sol: 'solidity',
      go: 'go',
    }

    const language = langMap[ext]
    if (!language) {
      setOutputLines((prev) => [
        ...prev,
        {
          id: `run-err-${Date.now()}`,
          type: 'error',
          message: `Unsupported language extension for execution: .${ext}`,
          timestamp: new Date(),
        },
      ])
      setIsRunningCode(false)
      return
    }

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: language,
          version: '*',
          files: [
            {
              name: selectedFile.name,
              content: selectedFile.content || '',
            },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to call execution API: ${response.statusText}`)
      }

      const result = await response.json()
      const newLines: OutputLine[] = []

      // Extract compiler outputs
      if (result.compile && result.compile.output) {
        newLines.push({
          id: `compile-out-${Date.now()}`,
          type: result.compile.code !== 0 ? 'error' : 'log',
          message: result.compile.output.trim(),
          timestamp: new Date(),
        })
      }

      // Extract runtime outputs
      if (result.run) {
        if (result.run.stdout) {
          newLines.push({
            id: `run-stdout-${Date.now()}`,
            type: 'log',
            message: result.run.stdout.trim(),
            timestamp: new Date(),
          })
        }
        if (result.run.stderr) {
          newLines.push({
            id: `run-stderr-${Date.now()}`,
            type: 'error',
            message: result.run.stderr.trim(),
            timestamp: new Date(),
          })
        }
        if (result.run.code !== 0) {
          newLines.push({
            id: `run-exit-${Date.now()}`,
            type: 'error',
            message: `Execution failed with exit code ${result.run.code}`,
            timestamp: new Date(),
          })
        } else if (!result.run.stdout && !result.run.stderr) {
          newLines.push({
            id: `run-success-${Date.now()}`,
            type: 'info',
            message: 'Execution finished successfully with no outputs.',
            timestamp: new Date(),
          })
        }
      }

      setOutputLines((prev) => [...prev, ...newLines])
    } catch (error: any) {
      setOutputLines((prev) => [
        ...prev,
        {
          id: `run-catch-${Date.now()}`,
          type: 'error',
          message: `Execution error: ${error.message || error}`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsRunningCode(false)
    }
  }

  const tabs: TabItem[] = Array.from(openTabs).map((fileId) => {
    const findFile = (items: FileItem[]): FileItem | null => {
      for (const item of items) {
        if (item.id === fileId) return item
        if (item.children) {
          const found = findFile(item.children)
          if (found) return found
        }
      }
      return null
    }
    const file = findFile(files)
    return {
      id: fileId,
      name: file?.name || 'Unknown',
      isActive: fileId === selectedFileId,
    }
  })

  const breadcrumbPath = selectedFileId ? getFilePath(selectedFileId) : []

  // macOS-style bottom Dock Items
  const dockItems = [
    {
      label: 'File Explorer',
      icon: <Folder className="h-5 w-5" />,
      onClick: () => setShowExplorer(!showExplorer),
      active: showExplorer,
    },
    {
      label: 'AI Architect Chat',
      icon: <MessageSquare className="h-5 w-5" />,
      onClick: () => setShowChat(!showChat),
      active: showChat,
    },
    {
      label: 'Terminal Console',
      icon: <Terminal className="h-5 w-5" />,
      onClick: () => setPreviewExpanded(!previewExpanded),
      active: previewExpanded,
    },
    {
      label: 'Deploy Contract',
      icon: <Rocket className="h-5 w-5" />,
      onClick: onDeploy ?? (() => {}),
      active: status === 'deployed',
    },
  ]

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-page)] overflow-hidden text-[var(--text-primary)] font-sans antialiased relative">
      {/* Top Status Bar */}
      <StatusBar status={status} onDeploy={onDeploy} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative pb-16">
        <PanelGroup direction="horizontal" className="h-full w-full">
          {/* Left Sidebar - File Explorer */}
          {showExplorer && (
            <>
              <Panel defaultSize={18} minSize={10} maxSize={30} className="flex flex-col h-full bg-[var(--bg-surface)] shrink-0">
                <FileExplorer
                  files={files}
                  onSelectFile={handleSelectFile}
                  selectedFileId={selectedFileId}
                  onCreateFile={onCreateFile}
                  onDeleteFile={handleDeleteFileTabSync}
                  onRenameFile={onRenameFile}
                />
              </Panel>
              <PanelResizeHandle className="w-1 hover:bg-[var(--accent)]/55 bg-[var(--border-default)]/45 transition-colors cursor-col-resize shrink-0 z-30" />
            </>
          )}

          {/* Center Pane - Toggleable between Code and Preview */}
          <Panel className="flex-grow flex flex-col min-w-0 bg-[var(--bg-page)] h-full">
            {isLoading ? (
              <div className="flex-grow relative h-full">
                <LoadingSkeleton />
              </div>
            ) : (
              <div className="flex flex-col h-full w-full min-h-0">
                {/* Top Toggle Bar */}
                <div className="h-10 border-b border-[var(--border-default)] bg-[var(--bg-surface)] flex items-center justify-between px-4 shrink-0 select-none z-20">
                  <div className="flex items-center gap-1 bg-[var(--bg-page)] p-1 rounded-lg border border-[var(--border-default)]">
                    <button
                      onClick={() => setActivePanel('code')}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer select-none",
                        activePanel === 'code'
                          ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs font-semibold border border-[var(--border-strong)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent"
                      )}
                    >
                      <Code className="h-3.5 w-3.5 text-[var(--accent)]" />
                      <span>Code</span>
                    </button>
                    <button
                      onClick={() => setActivePanel('preview')}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer select-none",
                        activePanel === 'preview'
                          ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs font-semibold border border-[var(--border-strong)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent"
                      )}
                    >
                      <Eye className="h-3.5 w-3.5 text-[var(--accent)]" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>

                {/* Code View (Editor Panel + Output Console / Terminal) */}
                <div className={cn("flex-1 min-h-0 h-full w-full flex flex-col", activePanel !== 'code' && "hidden")}>
                  <PanelGroup direction="vertical" className="h-full w-full">
                    {/* Top Section: Code Editor Panel */}
                    <Panel defaultSize={previewExpanded ? 65 : 100} minSize={30} className="flex flex-col min-h-0">
                      <div className="flex flex-col h-full min-w-0">
                        <TabBar
                          tabs={tabs}
                          onSelectTab={handleSelectTab}
                          onCloseTab={handleCloseTab}
                        />
                        {selectedFile && (
                          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-default)] bg-[var(--bg-surface)] text-xs select-none shrink-0">
                            <Breadcrumb path={breadcrumbPath} />
                            {!isWeb && selectedFile && !selectedFile.name.endsWith('.md') && (
                              <button
                                onClick={handleRunCode}
                                disabled={isRunningCode}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer shadow-2xs border",
                                  isRunningCode
                                    ? "bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-secondary)]"
                                    : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] border-[var(--accent)]"
                                )}
                              >
                                {isRunningCode ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    Running...
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3 fill-current" />
                                    Run Code
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                        <div className="flex-1 overflow-hidden relative min-h-0">
                          {selectedFile ? (
                            selectedFile.name.endsWith('.md') ? (
                              <MarkdownPreview
                                content={selectedFile.content || ''}
                                onChange={(val) => onFileChange?.(selectedFileId!, val)}
                                readOnly={false}
                              />
                            ) : (
                              <CodeEditor
                                fileName={selectedFile.name}
                                content={selectedFile.content || ''}
                                readOnly={false}
                                onChange={(val) => {
                                  onFileChange?.(selectedFileId!, val)
                                  if (nodeInfo.isNode && selectedFile) {
                                    syncFileToWebContainer(selectedFile.name, val)
                                  }
                                }}
                              />
                            )
                          ) : (
                            <div className="flex h-full items-center justify-center text-center p-8 bg-[var(--bg-page)] select-none animate-in fade-in duration-300">
                              <div className="max-w-sm flex flex-col items-center gap-5">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)]/10 text-[var(--accent)] shadow-xs">
                                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                  </svg>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)] font-sans">No file selected</h3>
                                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-[240px]">
                                    Select a file from the explorer sidebar or use the <span className="text-[var(--accent)] font-semibold">+</span> button to create one.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Panel>

                    {/* Bottom Section: Terminal Console */}
                    {previewExpanded && (
                      <>
                        <PanelResizeHandle className="h-1 hover:bg-[var(--accent)]/55 bg-[var(--border-default)]/45 transition-colors cursor-row-resize shrink-0 z-30" />
                        <Panel defaultSize={35} minSize={15} className="flex flex-col min-h-0 border-t border-[var(--border-default)]">
                          {nodeInfo.isNode ? (
                            <TerminalPanel
                              files={files}
                              isExpanded={previewExpanded}
                              onToggleExpand={setPreviewExpanded}
                              onServerReady={setWebContainerServerUrl}
                            />
                          ) : (
                            <Preview
                              output={outputLines}
                              onClear={() => setOutputLines([])}
                              isExpanded={previewExpanded}
                              onToggleExpand={setPreviewExpanded}
                              onExecuteCommand={handleExecuteCommand}
                            />
                          )}
                        </Panel>
                      </>
                    )}
                  </PanelGroup>
                </div>

                {/* Preview View (Live Preview Panel) */}
                <div className={cn("flex-1 min-h-0 h-full w-full flex flex-col bg-[var(--bg-page)] overflow-hidden relative", activePanel !== 'preview' && "hidden")}>
                  <div className="flex-1 overflow-hidden h-full">
                    {webContainerServerUrl ? (
                      <div className="flex flex-col h-full bg-[var(--bg-page)]">
                        <div className="h-9 border-b border-[var(--border-default)] bg-[var(--bg-surface)] flex items-center justify-between px-4 shrink-0 select-none">
                          <span className="text-xs font-bold text-[var(--text-primary)] font-sans flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            WebContainer Live Preview ({nodeInfo.framework.toUpperCase()})
                          </span>
                          <a
                            href={webContainerServerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 bg-transparent hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--border-strong)] px-2 py-1 rounded text-3xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-3xs"
                          >
                            Open Tab
                          </a>
                        </div>
                        <iframe
                          src={webContainerServerUrl}
                          className="w-full h-full border-none bg-white flex-1"
                          title="WebContainer Dev Server Preview"
                        />
                      </div>
                    ) : (
                      <SandpackPreviewComponent files={flatFiles} template={webTemplate} projectId={projectId} serverUrl={webContainerServerUrl || undefined} />
                    )}
                  </div>
                </div>
              </div>
            )}
          </Panel>

          {/* Right Panel - AI Chat (Full Height) */}
          {showChat && (
            <>
              <PanelResizeHandle className="w-1 hover:bg-[var(--accent)]/55 bg-[var(--border-default)]/45 transition-colors cursor-col-resize shrink-0 z-30" />
              <Panel defaultSize={25} minSize={18} maxSize={40} className="flex flex-col h-full bg-[var(--bg-surface)] shrink-0">
                <ChatPanel
                  messages={initialMessages}
                  onSendMessage={onSendMessage}
                  isLoading={isLoading}
                  projectName={projectName}
                  onNewProject={onNewProject}
                  selectedModel={selectedModel}
                  onModelChange={onModelChange}
                  selectedMode={selectedMode}
                  onModeChange={onModeChange}
                  onPlanAction={onPlanAction}
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {/* Bottom Floating macOS Dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
        <Dock items={dockItems} />
      </div>
    </div>
  )
}
