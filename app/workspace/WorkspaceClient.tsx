'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { IDELayout } from '@/components/CodeEditor/IDELayout'
import { FileItem } from '@/components/CodeEditor/FileExplorer'
import { Message } from '@/components/CodeEditor/ChatPanel'
import { ChatMode } from '@/components/CodeEditor/ChatPanel'

import { Mascot } from '@/components/mascot'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectMeta {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  status: 'draft' | 'unaudited' | 'deployed'
}

const MODEL_NAMES: Record<string, string> = {
  'gemini-3-flash-preview': 'Gemini 3.5 Flash (Primary / Fast)',
  'openai/gpt-oss-120b': 'Groq GPT-OSS 120B (High Reasoning)',
  'qwen/qwen3-32b': 'Groq Qwen3 32B (Coding)',
  'openai/gpt-oss-20b': 'Groq GPT-OSS 20B (Fast)',
  'groq/compound': 'Groq Compound (Agentic / Tools)',
  'groq/compound-mini': 'Groq Compound Mini (Speed)',
  'moonshotai/kimi-k2-instruct': 'Groq Kimi K2 Instruct',
  'qwen/qwen3-coder:free': 'OpenRouter Qwen 3 Coder',
  'cohere/north-mini-code:free': 'OpenRouter Cohere North',
  'poolside/laguna-m.1:free': 'OpenRouter Laguna M.1',
  'openrouter/free': 'Auto Fallback (Free Pool)',
}


// ---------------------------------------------------------------------------
// Storage key helpers — namespaced by userId so each user sees their own data
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'wisp_proj_'
const projectsListKey = (uid: string) => `wisp_projects_${uid}`
const activeProjectKey = (uid: string) => `wisp_active_project_${uid}`

function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function getProjectList(uid: string): ProjectMeta[] {
  try {
    return JSON.parse(localStorage.getItem(projectsListKey(uid)) || '[]')
  } catch {
    return []
  }
}

function upsertProjectMeta(uid: string, meta: ProjectMeta) {
  const list = getProjectList(uid)
  const idx = list.findIndex((p) => p.id === meta.id)
  if (idx >= 0) list[idx] = meta
  else list.unshift(meta)
  localStorage.setItem(projectsListKey(uid), JSON.stringify(list))
}

function saveProjectData(id: string, files: FileItem[], messages: Message[], status: string) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${id}_files`, JSON.stringify(files))
    localStorage.setItem(`${STORAGE_PREFIX}${id}_messages`, JSON.stringify(messages))
    localStorage.setItem(`${STORAGE_PREFIX}${id}_status`, status)
  } catch (e) {
    console.error('Failed to save project data:', e)
  }
}

function loadProjectData(id: string): { files: FileItem[]; messages: Message[]; status: string } {
  try {
    const files: FileItem[] = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${id}_files`) || '[]')
    const messages: Message[] = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${id}_messages`) || '[]')
    const status = localStorage.getItem(`${STORAGE_PREFIX}${id}_status`) || 'draft'
    return { files, messages, status }
  } catch {
    return { files: [], messages: [], status: 'draft' }
  }
}

// ---------------------------------------------------------------------------
// File tree helpers
// ---------------------------------------------------------------------------

function updateFileInTree(nodes: FileItem[], targetId: string, newContent: string): FileItem[] {
  return nodes.map((node) => {
    if (node.id === targetId) return { ...node, content: newContent }
    if (node.children) return { ...node, children: updateFileInTree(node.children, targetId, newContent) }
    return node
  })
}

function buildFileTree(
  flatFiles: Array<{ id: string; path: string; name: string; language: string; content: string }>
): FileItem[] {
  const root: FileItem[] = []
  const dirMap: Record<string, FileItem> = {}

  for (const file of flatFiles) {
    const parts = file.path.split('/')
    if (parts.length === 1) {
      root.push({ id: file.id, name: file.name, type: 'file', language: file.language, content: file.content })
    } else {
      let currentPath = ''
      let currentList = root
      for (let i = 0; i < parts.length - 1; i++) {
        const segment = parts[i]
        currentPath = currentPath ? `${currentPath}/${segment}` : segment
        if (!dirMap[currentPath]) {
          const dir: FileItem = { id: currentPath, name: segment, type: 'folder', children: [] }
          dirMap[currentPath] = dir
          currentList.push(dir)
        }
        currentList = dirMap[currentPath].children!
      }
      currentList.push({
        id: file.id,
        name: parts[parts.length - 1],
        type: 'file',
        language: file.language,
        content: file.content,
      })
    }
  }
  return root
}

function mergeFiles(
  existingFiles: FileItem[],
  newFiles: Array<{ id: string; path: string; name: string; language: string; content: string }>
): FileItem[] {
  const flatExisting: Record<string, { id: string; name: string; language: string; content: string }> = {}

  const traverse = (nodes: FileItem[], currentPath: string = '') => {
    for (const node of nodes) {
      const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name
      if (node.type === 'file') {
        flatExisting[nodePath] = {
          id: node.id,
          name: node.name,
          language: node.language || '',
          content: node.content || '',
        }
      } else if (node.children) {
        traverse(node.children, nodePath)
      }
    }
  }
  traverse(existingFiles)

  for (const file of newFiles) {
    flatExisting[file.path] = {
      id: file.id || `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      language: file.language,
      content: file.content,
    }
  }

  const mergedList = Object.entries(flatExisting).map(([path, details]) => ({
    id: details.id,
    path,
    name: details.name,
    language: details.language,
    content: details.content,
  }))

  return buildFileTree(mergedList)
}

function flattenFilesForAPI(
  nodes: FileItem[],
  currentPath = ''
): Array<{ path: string; content: string; language: string }> {
  const result: Array<{ path: string; content: string; language: string }> = []
  for (const node of nodes) {
    const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name
    if (node.type === 'file') {
      result.push({ path: nodePath, content: node.content || '', language: node.language || '' })
    } else if (node.children) {
      result.push(...flattenFilesForAPI(node.children, nodePath))
    }
  }
  return result
}

/**
 * Robust JSON extractor — handles leading/trailing prose
 */
function extractJSON(text: string): unknown {
  try { return JSON.parse(text) } catch {}
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch {}
  }
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)) } catch {}
  }
  throw new Error('Failed to parse generation content as JSON.')
}

function extractPlanMarkdown(raw: string): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed) {
        if (Array.isArray(parsed.files) && parsed.files.length > 0) {
          const planFile = parsed.files.find(
            (f: any) => f.path && (f.path.toLowerCase() === 'plan.md' || f.path.toLowerCase().endsWith('/plan.md'))
          ) || parsed.files[0]
          if (planFile && typeof planFile.content === 'string') {
            return extractPlanMarkdown(planFile.content)
          }
        }
        const candidate = parsed.planContent || parsed.content || parsed.plan || parsed.markdown || parsed.summary
        if (typeof candidate === 'string') {
          return extractPlanMarkdown(candidate)
        }
      }
    } catch {}
  }
  const fenceMatch = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i)
  if (fenceMatch) return fenceMatch[1].trim()
  return trimmed
}


class GenerationError extends Error {
  details: any[]
  constructor(message: string, details?: any[]) {
    super(message)
    this.name = 'GenerationError'
    this.details = details || []
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function WorkspaceClient() {
  const searchParams = useSearchParams()
  const urlPrompt = searchParams.get('prompt') ?? ''
  const urlProjectId = searchParams.get('project') ?? ''

  // Clerk auth user hooks
  const { user, isLoaded } = useUser()
  const [projectNotFound, setProjectNotFound] = useState(false)

  const effectiveUserId = user?.id || ''

  const [projectId, setProjectId] = useState<string>('')
  const [projectName, setProjectName] = useState<string>('Untitled Project')
  const [files, setFiles] = useState<FileItem[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'draft' | 'unaudited' | 'deployed'>('draft')
  const [isInitialized, setIsInitialized] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-flash-preview')
  const [selectedMode, setSelectedMode] = useState<ChatMode>('Plan')
  const [activeFileId, setActiveFileId] = useState<string>()
  const [isSavedInDb, setIsSavedInDb] = useState(false)

  const didAutoGenerate = useRef(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const loadingProjectIdRef = useRef<string | null>(null)
  const generatingProjectIdRef = useRef<string | null>(null)
  const retryCountRef = useRef<number>(0)

  const isNewParam = searchParams.get('new') === 'true'

  // Tracks which userId we have already fully initialized for.
  // Using a ref instead of state prevents re-renders from re-triggering the guard.
  const initializedForRef = useRef<string>('')

  // ── Init: wait for auth to resolve, then initialise project state ──────────
  useEffect(() => {
    if (!isLoaded) return
    if (!effectiveUserId) return

    const loadProjectFromDb = async (id: string) => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/projects/${id}`)
        if (!res.ok) {
          if (res.status === 404) {
            setProjectNotFound(true)
            setIsLoading(false)
            setIsInitialized(true)
            return
          }
          throw new Error('Project not found')
        }
        const data = await res.json()
        const dbProject = data.project

        setProjectId(dbProject.id)
        setProjectName(dbProject.name)
        setStatus(dbProject.status as 'draft' | 'unaudited' | 'deployed')
        setIsSavedInDb(true)

        // Re-hydrate messages
        const msgs = dbProject.chatMessages.map((m: any) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
        setMessages(msgs)

        // Re-hydrate flat generated_files into hierarchical tree
        const flatFiles = dbProject.generatedFiles.map((f: any) => {
          const parts = f.filePath.split('/')
          const name = parts[parts.length - 1]
          const dotIndex = name.lastIndexOf('.')
          const ext = dotIndex !== -1 ? name.slice(dotIndex + 1) : 'txt'
          return {
            id: f.id,
            path: f.filePath,
            name: name,
            language: ext,
            content: f.content
          }
        })
        setFiles(buildFileTree(flatFiles))
      } catch (err) {
        console.error('Failed to load project from database, starting fresh:', err)

        // Clean up invalid project ID from URL search params
        const params = new URLSearchParams(window.location.search)
        if (params.has('project')) {
          params.delete('project')
          const newSearch = params.toString()
          const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}`
          window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl)
        }

        // Clean up invalid project ID from localStorage active state
        localStorage.removeItem(activeProjectKey(effectiveUserId))

        // Fallback to fresh project
        const newId = generateProjectId()
        setProjectId(newId)
        setProjectName('Untitled Project')
        setFiles([])
        setMessages([])
        setStatus('draft')
        setIsSavedInDb(false)
      } finally {
        setIsLoading(false)
        setIsInitialized(true)
      }
    }

    // Key fix: only run init ONCE per stable user identity.
    // initializedForRef prevents re-running when unrelated state (isInitialized,
    // projectId) changes, which was the root cause of blank-project regressions.
    if (initializedForRef.current === effectiveUserId) return
    initializedForRef.current = effectiveUserId

    const isNew = isNewParam || !!urlPrompt
    const targetId = urlProjectId || localStorage.getItem(activeProjectKey(effectiveUserId)) || ''

    if (targetId && !isNew) {
      if (loadingProjectIdRef.current === targetId) return
      loadingProjectIdRef.current = targetId
      loadProjectFromDb(targetId)
    } else {
      // Starting fresh/new
      const newId = generateProjectId()
      setProjectId(newId)
      setProjectName('Untitled Project')
      setFiles([])
      setMessages([])
      setStatus('draft')
      setIsSavedInDb(false)
      setIsInitialized(true)
    }
  }, [isLoaded, effectiveUserId, urlProjectId, urlPrompt, isNewParam])

  // ── Debounced auto-save ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isInitialized || !projectId || !effectiveUserId) return

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveProjectData(projectId, files, messages, status)
    }, 500)

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [files, messages, status, projectId, isInitialized, effectiveUserId])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFileChange = useCallback((fileId: string, newContent: string) => {
    setFiles((prev) => updateFileInTree(prev, fileId, newContent))
  }, [])

  const handleNewProject = useCallback(() => {
    const newId = generateProjectId()
    setProjectId(newId)
    setProjectName('Untitled Project')
    setFiles([])
    setMessages([])
    setStatus('draft')
    setIsSavedInDb(false)
    if (effectiveUserId) localStorage.removeItem(activeProjectKey(effectiveUserId))
    const newUrl = `${window.location.pathname}?new=true`
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl)
  }, [effectiveUserId])

  const handleCreateFile = useCallback((name: string, type: 'file' | 'folder') => {
    const ext = name.includes('.') ? name.split('.').pop() || '' : ''
    const newItem: FileItem = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      type,
      language: ext,
      content: type === 'file' ? '' : undefined,
      children: type === 'folder' ? [] : undefined,
    }
    setFiles((prev) => [...prev, newItem])
  }, [])

  const generateCode = useCallback(async (prompt: string, modelOverride?: string, modeOverride?: ChatMode) => {
    const trimmed = prompt.trim()
    if (!trimmed) return

    // Abort previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    const priorMessages = [...messages]
    const currentFlatFiles = flattenFilesForAPI(files)

    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: trimmed }
    const workingMsgId = `ai-working-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: workingMsgId, role: 'assistant', content: '⚙️ Working on it...' }
    ])
    setIsLoading(true)

    const modelToUse = modelOverride || selectedModel
    const modeToUse = modeOverride || selectedMode
    let activeProjectId = projectId
    let currentIsSaved = isSavedInDb
    const modelToUseEscaped = modelToUse // keep original

    try {
      // 1. If project is not yet saved in DB, create it first
      if (!currentIsSaved && effectiveUserId) {
        try {
          const createRes = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: effectiveUserId,
              name: projectName === 'Untitled Project' ? trimmed.slice(0, 60) : projectName,
              status: 'draft'
            })
          })
          if (createRes.ok) {
            const createData = await createRes.json()
            activeProjectId = createData.project.id
            generatingProjectIdRef.current = activeProjectId
            setProjectId(activeProjectId)
            setIsSavedInDb(true)
            currentIsSaved = true
            localStorage.setItem(activeProjectKey(effectiveUserId), activeProjectId)
            // Update browser URL query param
            const newUrl = `${window.location.pathname}?project=${activeProjectId}`
            window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl)
          }
        } catch (createErr) {
          console.error('Failed to pre-create project row in DB:', createErr)
        }
      }

      // 2. Call generate API passing database projectId and userId
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          messages: priorMessages,
          currentFiles: currentFlatFiles,
          model: modelToUseEscaped,
          projectId: activeProjectId,
          userId: effectiveUserId,
          mode: modeToUse,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        let errMsg = 'Generation failed — please try again.'
        let details: any[] = []
        try {
          const data = await res.json()
          errMsg = data.error || data.message || errMsg
          details = data.details || []
        } catch {}
        throw new GenerationError(errMsg, details)
      }

      const data = await res.json()

      // ── Plan mode: handle planContent response ───────────────────────────
      if (modeToUse === 'Plan' && data.planContent) {
        const planContent: string = extractPlanMarkdown(data.planContent)

        // Inject plan.md as a real FileItem — same mechanism as any generated file
        const PLAN_FILE_ID = 'plan-md'
        const planFileItem: FileItem = {
          id: PLAN_FILE_ID,
          name: 'plan.md',
          type: 'file',
          language: 'md',
          content: planContent,
        }
        setFiles((prev) => {
          const exists = prev.some((f) => f.id === PLAN_FILE_ID || f.name === 'plan.md')
          if (exists) return prev.map((f) => (f.id === PLAN_FILE_ID || f.name === 'plan.md') ? planFileItem : f)
          return [planFileItem, ...prev]
        })

        // Extract 2-3 line summary from ## Overview section
        const overviewMatch = planContent.match(/##\s*Overview[\s\S]*?\n([^\n#][^\n]*(?:\n[^\n#][^\n]*){0,2})/)
        const planSummary = overviewMatch ? overviewMatch[1].trim() : planContent.slice(0, 200)

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === workingMsgId
              ? {
                  ...msg,
                  content: '[Plan ready]',
                  planPath: PLAN_FILE_ID, // reuse planPath field as the file id
                  planFilename: 'plan.md',
                  planSummary,
                }
              : msg
          )
        )
        return
      }

      // ── Normal (Agent) mode ────────────────────────────────────────────────
      const isRestart =
        trimmed.toLowerCase() === 'start over' ||
        trimmed.toLowerCase() === 'start fresh' ||
        trimmed.toLowerCase() === 'new project' ||
        trimmed.toLowerCase() === 'scrap this'

      // Guarantee plan.md is never overwritten by generated code files
      const generatedFiles = (data.files ?? []).filter(
        (f: any) => f.path !== 'plan.md' && f.path !== '/plan.md' && !f.path.endsWith('/plan.md')
      )

      if (files.length === 0 || isRestart) {
        const tree = buildFileTree(generatedFiles)
        const existingPlan = files.find((f) => f.id === 'plan-md' || f.name === 'plan.md')
        setFiles(existingPlan ? [existingPlan, ...tree] : tree)
      } else {
        const mergedTree = mergeFiles(files, generatedFiles)
        setFiles(mergedTree)
      }
      setStatus('unaudited')

      const summary = data.summary ?? `Generated ${data.files?.length ?? 0} file(s).`
      let doneContent = `Done! Here's your ${summary}`

      // ── Phase 4 Validation Gate: check smart contract compilation ────────
      const currentFlat = flattenFilesForAPI(
        files.length === 0 || isRestart
          ? buildFileTree(generatedFiles)
          : mergeFiles(files, generatedFiles)
      )
      const hasCargo = currentFlat.some(
        (f) => f.path.toLowerCase() === 'cargo.toml' || f.path.endsWith('.rs')
      )

      if (hasCargo) {
        try {
          const checkRes = await fetch('/api/build-contract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              files: currentFlat.map((f) => ({ path: f.path, content: f.content })),
            }),
          })

          const checkData = await checkRes.json()

          if (checkRes.status === 503) {
            // Cargo toolchain is not installed on this server environment
            doneContent = `Done! Generated ${generatedFiles.length} file(s).\n\n⚠️ **Note on Contract Verification**: Rust toolchain (\`cargo\`) is not installed on this host server. Contract compilation requires a local Rust toolchain. Code generated successfully — install Rust locally or deploy via Stellar CLI to compile.`
          } else if (!checkRes.ok && checkData.error) {
            const autoRetryCount = (retryCountRef.current || 0) + 1
            retryCountRef.current = autoRetryCount

            if (autoRetryCount <= 2) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === workingMsgId
                    ? {
                        ...msg,
                        content: `⚙️ **Validation Gate**: Contract build failed. Auto-retrying fix (${autoRetryCount}/2)...\n\n\`\`\`\n${checkData.error.slice(0, 300)}\n\`\`\``,
                      }
                    : msg
                )
              )
              await generateCode(
                `The contract build failed with errors:\n\n${checkData.error}\n\nPlease fix all compilation errors in Cargo.toml and src/lib.rs.`,
                selectedModel,
                'Agent'
              )
              return
            } else {
              retryCountRef.current = 0
              doneContent = `⚠️ **Contract Validation Warnings**: Generated code contains unresolved compilation issues:\n\n\`\`\`\n${checkData.error.slice(0, 400)}\n\`\`\`\n\nYou can ask me to fix specific errors or edit the files directly.`
            }
          } else {
            retryCountRef.current = 0
            doneContent = `Done! Here's your ${summary}\n\n✅ **Contract Validation Passed**: \`cargo build --target wasm32-unknown-unknown --release\` compiled cleanly.`
          }
        } catch (checkErr) {
          console.warn('[Validation Gate] Contract check skipped:', checkErr)
        }
      }

      if (data.modelUsed && data.modelUsed !== modelToUseEscaped) {
        const actualName = MODEL_NAMES[data.modelUsed] || data.modelUsed
        const requestedName = MODEL_NAMES[modelToUseEscaped] || modelToUseEscaped
        console.warn(`[AI Fallback] Switched to ${actualName} — ${requestedName} was rate-limited.`)
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === workingMsgId
            ? { ...msg, content: doneContent }
            : msg
        )
      )

      // Persist project metadata
      if (effectiveUserId && activeProjectId) {
        const now = new Date().toISOString()
        const name = projectName === 'Untitled Project' ? trimmed.slice(0, 60) : projectName
        
        // If it was untitled, trigger database patch to update name
        if (projectName === 'Untitled Project') {
          setProjectName(name)
          try {
            await fetch(`/api/projects/${activeProjectId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name })
            })
          } catch (patchErr) {
            console.error('Failed to update project name in DB:', patchErr)
          }
        }

        upsertProjectMeta(effectiveUserId, {
          id: activeProjectId,
          name,
          createdAt: getProjectList(effectiveUserId).find((p) => p.id === activeProjectId)?.createdAt ?? now,
          updatedAt: now,
          status: 'unaudited',
        })
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Stale generation request aborted successfully.')
        return
      }
      
      let genericMsg = err instanceof Error ? err.message : 'Network error — check your connection.'
      let userFriendlyContent = `❌ ${genericMsg}`

      if (err instanceof GenerationError && err.details && err.details.length > 0) {
        const details = err.details
        let explanation = 'A network issue or unexpected error occurred while communicating with the AI services.'
        let suggestions: string[] = ['Check your internet connection and try again.']

        const hasTimeout = details.some((d: any) => d.type === 'timeout' || d.status === 408)
        const hasAuthError = details.some((d: any) => d.status === 401 || d.status === 403 || (d.error && d.error.toLowerCase().includes('auth')))
        const hasRateLimit = details.some((d: any) => d.status === 429 || d.status === 402 || (d.error && (d.error.toLowerCase().includes('rate limit') || d.error.toLowerCase().includes('credits') || d.error.toLowerCase().includes('quota') || d.error.toLowerCase().includes('capacity'))))
        const hasInvalidJson = details.some((d: any) => d.type === 'invalid_json')
        const hasEmptyResponse = details.some((d: any) => d.type === 'empty_response')

        if (hasAuthError) {
          explanation = 'There is an authorization issue with the configured AI provider credentials.'
          suggestions = [
            'Ensure the API keys are correctly defined in your server configuration (.env.local).',
            'Verify your provider accounts have active credits and valid keys.'
          ]
        } else if (hasRateLimit) {
          explanation = 'The AI services are currently overloaded, rate-limited, or out of capacity.'
          suggestions = [
            'Wait a few moments before trying again.',
            'Switch the selected model in the dropdown above to use a different provider.'
          ]
        } else if (hasTimeout) {
          explanation = 'The fallback AI models took too long to respond to your request.'
          suggestions = [
            'Try breaking your instructions into smaller, simpler steps.',
            'Wait a few moments and try your request again.'
          ]
        } else if (hasInvalidJson) {
          explanation = 'The AI model returned formatting that could not be parsed as files.'
          suggestions = [
            'Try rephrasing your prompt to be more direct.',
            'Avoid overly complex or ambiguous commands.'
          ]
        } else if (hasEmptyResponse) {
          explanation = 'The AI models returned an empty response.'
          suggestions = [
            'Provide more context in your instructions.',
            'Try requesting single changes rather than a complete build.'
          ]
        }

        userFriendlyContent = `❌ **${genericMsg}**\n\n**What likely went wrong:**\n${explanation}\n\n**Suggested actions:**\n${suggestions.map(s => `- ${s}`).join('\n')}`
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === workingMsgId
            ? { ...m, content: userFriendlyContent }
            : m
        )
      )
    } finally {
      // Only clear loading state if this is the active request
      if (abortControllerRef.current === controller) {
        setIsLoading(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, messages, files, effectiveUserId, projectId, projectName, selectedModel, selectedMode])

  const handleDeploy = useCallback(async () => {
    const workingMsgId = `deploy-working-${Date.now()}`
    
    // Check if the project contains any smart contracts (Rust / Cargo.toml)
    const hasContract = (items: FileItem[]): boolean => {
      const traverse = (nodes: FileItem[]): boolean => {
        for (const node of nodes) {
          if (node.type === 'file' && (node.name.endsWith('.rs') || node.name.toLowerCase() === 'cargo.toml')) {
            return true
          }
          if (node.children && traverse(node.children)) {
            return true
          }
        }
        return false
      }
      return traverse(items)
    }

    const hasSmartContract = hasContract(files)

    if (!hasSmartContract) {
      setMessages((prev) => [
        ...prev,
        {
          id: workingMsgId,
          role: 'assistant',
          content: `🎉 **Static Web App Active!**\n\nYour plain HTML/CSS/JS app is successfully served in the Live Preview panel. Since it does not contain a Soroban smart contract (Rust), blockchain deployment was not required.`
        }
      ])
      setStatus('deployed')
      return
    }

    setMessages((prev) => [
      ...prev,
      { id: workingMsgId, role: 'assistant', content: '🚀 Running tests and deploying contract to Stellar Testnet...' }
    ])
    setIsLoading(true)

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Deployment failed')
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === workingMsgId
            ? {
                ...msg,
                content: `🎉 **Deployment Successful!**\n\nContract ID: \`${data.contractId}\`\n\nVerified on Stellar Testnet Explorer. You can now interact with this contract using your connected wallet!`,
              }
            : msg
        )
      )
      setStatus('deployed')
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === workingMsgId
            ? { ...msg, content: `❌ **Deployment Failed**\n\nReason: ${err.message}` }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }, [projectId, files])

  // ── onPlanAction: Edit or 'OK, build this' ────────────────────────────────
  const handlePlanAction = useCallback(async (_planFileId: string, action: 'edit' | 'build') => {
    const PLAN_FILE_ID = 'plan-md'

    if (action === 'edit') {
      // The plan is a real FileItem in the files state (id: plan-md).
      // Open it in the editor tab via activeFileId.
      setActiveFileId(PLAN_FILE_ID)
      // Reset activeFileId after a frame so subsequent clicks re-trigger if needed
      setTimeout(() => setActiveFileId(undefined), 100)
    } else {
      // 'build': read the live plan content from files state
      const planFile = files.find((f) => f.id === PLAN_FILE_ID)
      const planContent = planFile?.content ?? ''

      // Switch to Agent mode
      setSelectedMode('Agent')

      // Inject plan as context message then trigger code generation
      const planContextMsg: Message = {
        id: `plan-ctx-${Date.now()}`,
        role: 'assistant',
        content: `Approved plan:\n\n${planContent}`,
      }
      const confirmMsg: Message = {
        id: `plan-confirm-${Date.now()}`,
        role: 'assistant',
        content: 'Plan approved. Switching to Agent mode to build this.',
      }
      setMessages((prev) => [...prev, planContextMsg, confirmMsg])

      await generateCode(
        `OK, let's build this. Use the approved plan above as your guide.`,
        selectedModel,
        'Agent'
      )
    }
  }, [files, selectedModel, generateCode])

  const handleDeleteFile = useCallback((fileId: string) => {
    const removeFromTree = (items: FileItem[]): FileItem[] => {
      return items
        .filter((item) => item.id !== fileId)
        .map((item) => ({
          ...item,
          children: item.children ? removeFromTree(item.children) : undefined,
        }))
    }
    setFiles((prev) => removeFromTree(prev))
  }, [])

  const handleRenameFile = useCallback((fileId: string, newName: string) => {
    const ext = newName.includes('.') ? newName.split('.').pop() || '' : ''
    const renameInTree = (items: FileItem[]): FileItem[] => {
      return items.map((item) => {
        if (item.id === fileId) {
          return {
            ...item,
            name: newName,
            language: item.type === 'file' ? ext : item.language,
          }
        }
        if (item.children) {
          return {
            ...item,
            children: renameInTree(item.children),
          }
        }
        return item
      })
    }
    setFiles((prev) => renameInTree(prev))
  }, [])



  // ── Auto-generate on URL prompt ───────────────────────────────────────────
  useEffect(() => {
    if (urlPrompt && isInitialized && !didAutoGenerate.current) {
      didAutoGenerate.current = true
      generateCode(urlPrompt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPrompt, isInitialized])

  // ── Project Not Found screen ──────────────────────────────────────────────
  if (projectNotFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] text-[var(--text-secondary)] px-6">
        <div className="flex flex-col items-center max-w-md w-full text-center bg-[var(--bg-surface)] border border-[var(--border-strong)]/40 p-8 rounded-3xl shadow-[0_8px_32px_rgba(28,27,23,0.03)] backdrop-blur-md">
          {/* Animated Mascot Orb sitting in the center */}
          <div className="w-20 h-20 mb-6 relative flex items-center justify-center">
            <Mascot className="w-full h-full" />
          </div>
          
          <h1 className="text-xl font-sans font-extrabold text-[var(--text-primary)] mb-2">
            Project Not Found
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8">
            The project you are trying to access doesn't exist, has been deleted, or belongs to another account.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <button
              onClick={() => {
                setProjectNotFound(false)
                handleNewProject()
              }}
              className="inline-flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] px-5 py-2.5 rounded-full text-xs font-bold shadow-sm transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.98]"
            >
              Start New Project
            </button>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-[0.98]"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading splash ────────────────────────────────────────────────────────
  if (!isLoaded || !isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] text-[var(--text-secondary)]">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="h-8 w-8 animate-spin text-[var(--accent)]"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="text-xs font-mono tracking-widest uppercase">Loading workspace…</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <IDELayout
      files={files}
      status={status}
      isLoading={isLoading}
      initialMessages={messages}
      projectName={projectName}
      onSendMessage={generateCode}
      onDeploy={handleDeploy}
      onFileChange={handleFileChange}
      onCreateFile={handleCreateFile}
      onDeleteFile={handleDeleteFile}
      onRenameFile={handleRenameFile}
      onNewProject={handleNewProject}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      projectId={isSavedInDb ? projectId : undefined}
      selectedMode={selectedMode}
      onModeChange={setSelectedMode}
      onPlanAction={handlePlanAction}
      activeFileId={activeFileId}
    />
  )
}
