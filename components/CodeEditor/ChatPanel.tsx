'use client'

import {
  Send,
  Plus,
  Sparkles,
  FileText,
  Pencil,
  Hammer,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  Square,
  X,
  Image as ImageIcon,
  Mic,
  MicOff,
  AtSign,
  ChevronDown,
  ExternalLink,
} from 'lucide-react'
import { useState, useRef, useEffect, useMemo } from 'react'
import { FileItem } from './FileExplorer'
import { isLightweightModel, isDesignRequest } from '@/lib/ai/modelRouting'
import { cn } from '@/lib/utils'

export interface GenerationEvent {
  type: 'thinking' | 'plan_task' | 'file_created' | 'file_modified' | 'build_check' | 'done'
  message?: string
  task?: string
  status?: 'pending' | 'in_progress' | 'completed'
  path?: string
  additions?: number
  deletions?: number
  passed?: boolean
  error?: string
  summaryText?: string
  summary?: {
    filesCreated?: number
    filesModified?: number
    duration?: string
  }
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
  planPath?: string
  planFilename?: string
  planSummary?: string
  isError?: boolean
  retryPrompt?: string
  failedStep?: string
  events?: GenerationEvent[]
  isComplete?: boolean
  mode?: ChatMode
  modelUsed?: string
  promptText?: string
  skillTags?: string[]
}

export type ChatMode = 'Plan' | 'Agent'

const SUGGESTIONS = [
  'Build a Soroban crowdfunding contract',
  'Create a voting dApp with web UI',
  'Build an escrow contract and frontend',
]

const MODEL_OPTIONS = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3.5 Flash', badge: 'Fast / Vision' },
  { value: 'openai/gpt-oss-120b', label: 'Groq GPT-OSS 120B', badge: 'Reasoning' },
  { value: 'qwen/qwen3-32b', label: 'Groq Qwen3 32B', badge: 'Coding' },
  { value: 'openai/gpt-oss-20b', label: 'Groq GPT-OSS 20B', badge: 'Fast' },
  { value: 'groq/compound', label: 'Groq Compound', badge: 'Agentic' },
  { value: 'groq/compound-mini', label: 'Groq Compound Mini', badge: 'Speed' },
  { value: 'moonshotai/kimi-k2-instruct', label: 'Groq Kimi K2 Instruct', badge: 'Instruct' },
  { value: 'qwen/qwen3-coder:free', label: 'OpenRouter Qwen 3 Coder', badge: 'Free' },
  { value: 'cohere/north-mini-code:free', label: 'OpenRouter Cohere North', badge: 'Free' },
  { value: 'poolside/laguna-m.1:free', label: 'OpenRouter Laguna M.1', badge: 'Free' },
  { value: 'openrouter/free', label: 'Auto Fallback (Free Pool)', badge: 'Free' },
]

function isVisionModel(model?: string): boolean {
  if (!model) return true
  const lower = model.toLowerCase()
  return lower.includes('gemini') || lower.includes('vision') || lower.includes('gpt-4o') || lower.includes('claude-3')
}

interface FlatFileRef {
  path: string
  name: string
  type: 'file' | 'folder'
  content?: string
}

function flattenFileItems(items: FileItem[], prefix = ''): FlatFileRef[] {
  const result: FlatFileRef[] = []
  for (const item of items) {
    const currentPath = prefix ? `${prefix}/${item.name}` : item.name
    result.push({ path: currentPath, name: item.name, type: item.type, content: item.content })
    if (item.children) {
      result.push(...flattenFileItems(item.children, currentPath))
    }
  }
  return result
}

interface ChatPanelProps {
  messages?: Message[]
  files?: FileItem[]
  onSendMessage?: (
    message: string,
    model?: string,
    mode?: ChatMode,
    skillInstructions?: string,
    skillTags?: string[]
  ) => void
  onNewProject?: () => void
  isLoading?: boolean
  onStop?: () => void
  projectName?: string
  selectedModel?: string
  onModelChange?: (model: string) => void
  selectedMode?: ChatMode
  onModeChange?: (mode: ChatMode) => void
  onPlanAction?: (planPath: string, action: 'edit' | 'build') => void
  onOpenFile?: (filePath: string) => void
  onOpenPreview?: () => void
}

function ActivityFeedCard({
  events = [],
  isComplete = false,
  mode,
  summaryText,
  modelUsed,
  promptText,
  onOpenFile,
  onOpenPreview,
}: {
  events: GenerationEvent[]
  isComplete?: boolean
  mode?: ChatMode
  summaryText?: string
  modelUsed?: string
  promptText?: string
  onOpenFile?: (path: string) => void
  onOpenPreview?: () => void
}) {
  const [userToggledExpanded, setUserToggledExpanded] = useState<boolean | null>(null)
  const handleOpenFile = onOpenFile

  const doneEvent = (events || []).find((e) => e.type === 'done')
  const isFinished = isComplete || !!doneEvent
  const isExpanded = !isFinished || (userToggledExpanded ?? false)

  const thinkingEvents = (events || []).filter((e) => e.type === 'thinking')
  const fileEvents = (events || []).filter((e) => e.type === 'file_created' || e.type === 'file_modified')
  const buildEvents = (events || []).filter((e) => e.type === 'build_check')

  const effectiveModel = doneEvent?.summaryText || modelUsed
  const isLightweight = isLightweightModel(effectiveModel)
  const isDesign = isDesignRequest(promptText)
  const showModelTip = isLightweight && isDesign

  const duration = doneEvent?.summary?.duration || 'a few seconds'
  const isPlan = mode === 'Plan'

  if (isComplete && !isExpanded) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--border-default)]/60 bg-[var(--bg-elevated)]/60 p-3 text-xs shadow-xs font-sans">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)]/40 pb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[10px] font-bold">
              ✨
            </span>
            <span className="text-[11px] font-semibold text-[var(--text-primary)] font-mono truncate">
              {isPlan ? 'Plan Ready' : `Worked for ${duration}`}
            </span>
          </div>
          <button
            onClick={() => setUserToggledExpanded(true)}
            className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--accent)] underline cursor-pointer shrink-0"
          >
            Show details
          </button>
        </div>

        {fileEvents.length > 0 && !isPlan && (
          <div className="flex flex-col gap-1 py-0.5">
            {fileEvents.map((fe, idx) => {
              const isCreated = fe.type === 'file_created'
              return (
                <div
                  key={`fe-${idx}-${fe.path}`}
                  onClick={() => fe.path && onOpenFile?.(fe.path)}
                  className="flex items-center justify-between gap-2 text-[11px] font-mono text-[var(--text-primary)] hover:text-[var(--accent)] cursor-pointer py-1 px-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)]/50 transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <FileText className="h-3 w-3 shrink-0 text-[var(--accent)]" />
                    <span className="truncate">{fe.path}</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] shrink-0">
                    {isCreated ? 'new' : 'updated'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
          {doneEvent?.summaryText || summaryText || 'Generation complete'}
        </div>

        {showModelTip && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] leading-snug">
            💡 Generated with a lighter model. Switch models from the top selector for deeper reasoning.
          </div>
        )}

        <div className="flex items-center gap-2 pt-0.5">
          {onOpenPreview && (
            <button
              onClick={onOpenPreview}
              className="px-2.5 py-1 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] text-[11px] font-semibold transition-colors cursor-pointer shadow-3xs"
            >
              Open Preview
            </button>
          )}
          {fileEvents.length > 0 && (onOpenFile || handleOpenFile) && (
            <button
              onClick={() => (handleOpenFile || onOpenFile)?.(fileEvents[0].path || '')}
              className="px-2.5 py-1 rounded-md border border-[var(--border-default)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] text-[11px] font-semibold transition-colors cursor-pointer"
            >
              View Files
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--border-default)]/60 bg-[var(--bg-surface)] p-3 text-xs shadow-xs font-sans">
      <div className="flex items-center justify-between border-b border-[var(--border-default)]/40 pb-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent)] animate-pulse" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            {isComplete ? 'Activity Summary' : 'Live Progress'}
          </span>
        </div>
        {isComplete && (
          <button
            onClick={() => setUserToggledExpanded(false)}
            className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--accent)] underline cursor-pointer"
          >
            Collapse
          </button>
        )}
      </div>

      {thinkingEvents.length > 0 && (
        <div className="flex flex-col gap-1 pl-1">
          {thinkingEvents.map((t, idx) => (
            <span key={`th-${idx}`} className="text-[11px] text-[var(--text-muted)] font-mono leading-relaxed opacity-80">
              • {t.message}
            </span>
          ))}
        </div>
      )}

      {fileEvents.length > 0 && (
        <div className="flex flex-col gap-1 pt-1">
          {fileEvents.map((fe, idx) => (
            <div key={`fe-act-${idx}`} className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-primary)]">
              <FileText className="h-3 w-3 text-[var(--accent)] shrink-0" />
              <span className="truncate">{fe.path}</span>
            </div>
          ))}
        </div>
      )}

      {buildEvents.length > 0 && (
        <div className="flex flex-col gap-1 pt-1">
          {buildEvents.map((be, idx) => (
            <div key={idx} className="text-[11px] font-mono text-[var(--text-muted)]">
              {be.passed ? '✓ Build clean' : `⚠️ ${be.message || 'Build issue'}`}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ChatPanel({
  messages = [],
  files = [],
  onSendMessage,
  onNewProject,
  isLoading = false,
  onStop,
  projectName,
  selectedModel = 'gemini-3-flash-preview',
  onModelChange,
  selectedMode = 'Plan',
  onModeChange,
  onPlanAction,
  onOpenFile,
  onOpenPreview,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [attachedSkills, setAttachedSkills] = useState<
    Array<{ name: string; slug: string; body: string; conflicts?: string[] }>
  >([])
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{ path: string; content?: string }>
  >([])
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const modelMenuRef = useRef<HTMLDivElement>(null)

  const flatProjectFiles = useMemo(() => flattenFileItems(files), [files])

  // Speech recognition browser capability check
  const isSpeechSupported = useMemo(() => {
    if (typeof window === 'undefined') return false
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [input])

  // Close model popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [availableSkills, setAvailableSkills] = useState<
    Array<{ name: string; slug: string; description: string; triggers: string[]; body: string; conflicts?: string[] }>
  >([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteFilter, setAutocompleteFilter] = useState('')
  const [showFileAutocomplete, setShowFileAutocomplete] = useState(false)
  const [fileFilter, setFileFilter] = useState('')

  useEffect(() => {
    fetch('/api/skills')
      .then((res) => res.json())
      .then((data) => {
        if (data.skills) setAvailableSkills(data.skills)
      })
      .catch(() => {})
  }, [])

  const attachSkillChip = (skill: { name: string; slug: string; body: string; conflicts?: string[] }) => {
    setAttachedSkills((prev) => {
      if (prev.some((s) => s.slug === skill.slug)) return prev
      return [...prev, skill]
    })
  }

  const attachFileChip = (file: { path: string; content?: string }) => {
    setAttachedFiles((prev) => {
      if (prev.some((f) => f.path === file.path)) return prev
      return [...prev, file]
    })
  }

  // Handle "/" skills autocomplete & "@" files autocomplete
  useEffect(() => {
    // 1. Slash autocomplete
    if (input.startsWith('/')) {
      setShowFileAutocomplete(false)
      const fullMatch = input.match(/^\/([a-zA-Z0-9_-]+)(\s+(.*))?$/)
      const partialMatch = input.match(/^\/([a-zA-Z0-9_-]*)$/)

      if (fullMatch) {
        const typedSlug = fullMatch[1].toLowerCase()
        const trailingText = fullMatch[3] ?? ''
        const exactSkill = availableSkills.find((s) => s.slug.toLowerCase() === typedSlug)
        if (exactSkill) {
          attachSkillChip({ name: exactSkill.name, slug: exactSkill.slug, body: exactSkill.body, conflicts: exactSkill.conflicts })
          setInput(trailingText)
          setShowAutocomplete(false)
          return
        }
      }

      if (partialMatch) {
        const filterStr = partialMatch[1].toLowerCase()
        setAutocompleteFilter(filterStr)
        const isExactMatch = availableSkills.some((s) => s.slug.toLowerCase() === filterStr)
        setShowAutocomplete(!isExactMatch)
      } else {
        setShowAutocomplete(false)
      }
      return
    } else {
      setShowAutocomplete(false)
    }

    // 2. "@" File context reference autocomplete
    const atMatch = input.match(/@([a-zA-Z0-9_\-\./]*)$/)
    if (atMatch) {
      setFileFilter(atMatch[1].toLowerCase())
      setShowFileAutocomplete(true)
    } else {
      setShowFileAutocomplete(false)
    }
  }, [input, availableSkills])

  // Capped skills matching list for "/" (PART 5):
  const matchingSkills = availableSkills.filter(
    (s) => s.slug.toLowerCase().includes(autocompleteFilter) || s.name.toLowerCase().includes(autocompleteFilter)
  )

  const displayedSkills = autocompleteFilter.trim() === ''
    ? matchingSkills.slice(0, 5)
    : matchingSkills

  const matchingFiles = flatProjectFiles.filter(
    (f) => f.path.toLowerCase().includes(fileFilter) || f.name.toLowerCase().includes(fileFilter)
  ).slice(0, 8)

  const handleSelectAutocompleteSkill = (slug: string) => {
    const skill = availableSkills.find((s) => s.slug === slug)
    if (skill) {
      attachSkillChip({ name: skill.name, slug: skill.slug, body: skill.body, conflicts: skill.conflicts })
    }
    setInput('')
    setShowAutocomplete(false)
    textareaRef.current?.focus()
  }

  const handleSelectFileAutocomplete = (fileRef: FlatFileRef) => {
    attachFileChip({ path: fileRef.path, content: fileRef.content })
    setInput((prev) => prev.replace(/@([a-zA-Z0-9_\-\./]*)$/, '').trim())
    setShowFileAutocomplete(false)
    textareaRef.current?.focus()
  }

  // Speech Recognition dictation toggle (PART 3)
  const toggleVoiceInput = () => {
    if (!isSpeechSupported) return
    if (isListening) {
      try { recognitionRef.current?.stop() } catch {}
      setIsListening(false)
      return
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
        }
      }

      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => setIsListening(false)

      recognitionRef.current = recognition
      recognition.start()
      setIsListening(true)
    } catch {
      setIsListening(false)
    }
  }

  // Image Upload handler (PART 3)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      setAttachedImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    const trimmed = input.trim()
    if ((!trimmed && attachedSkills.length === 0 && attachedFiles.length === 0 && !attachedImage) || !onSendMessage || isLoading) return

    let promptToSend = trimmed
    let skillInstructions = ''
    const skillTags: string[] = []

    // 1. Attached file context instructions
    if (attachedFiles.length > 0) {
      attachedFiles.forEach((file) => {
        skillInstructions += `Context file [${file.path}]:\n\`\`\`\n${file.content || ''}\n\`\`\`\n\n`
        skillTags.push(`Context: @${file.path.split('/').pop()}`)
      })
    }

    // 2. Attached skills
    if (attachedSkills.length > 0) {
      attachedSkills.forEach((skill) => {
        skillInstructions += skill.body + '\n\n'
        skillTags.push(`Using skill: ${skill.name}`)
      })
    }

    // 3. Keyword auto-matching
    const lowerPrompt = promptToSend.toLowerCase()
    availableSkills.forEach((skill) => {
      const alreadyApplied = skillTags.some((t) => t.includes(skill.name))
      if (!alreadyApplied && skill.triggers.some((tr) => tr.length > 0 && lowerPrompt.includes(tr))) {
        skillInstructions += skill.body + '\n\n'
        skillTags.push(`Applied: ${skill.name}`)
      }
    })

    onSendMessage(promptToSend, selectedModel, selectedMode, skillInstructions.trim(), skillTags)
    setInput('')
    setAttachedSkills([])
    setAttachedFiles([])
    setAttachedImage(null)
    setShowAutocomplete(false)
    setShowFileAutocomplete(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setShowAutocomplete(false)
      setShowFileAutocomplete(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    let skillInstructions = ''
    const skillTags: string[] = []
    const lowerPrompt = suggestion.toLowerCase()

    availableSkills.forEach((skill) => {
      if (skill.triggers.some((tr) => tr.length > 0 && lowerPrompt.includes(tr))) {
        skillInstructions += skill.body + '\n\n'
        skillTags.push(`Applied: ${skill.name}`)
      }
    })

    onSendMessage?.(suggestion, selectedModel, selectedMode, skillInstructions.trim(), skillTags)
  }

  const handleCopyText = (id: string, text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const currentModelMeta = MODEL_OPTIONS.find((m) => m.value === selectedModel) || MODEL_OPTIONS[0]
  const isVisionAllowed = isVisionModel(selectedModel)

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] overflow-hidden font-sans border-l border-[var(--border-default)]/60">
      {/* Sleek Minimal Header */}
      <div className="px-3.5 py-2.5 border-b border-[var(--border-default)]/60 flex items-center justify-between shrink-0 bg-[var(--bg-page)]/80 backdrop-blur-md select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/15 shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold font-sans text-[var(--text-primary)] leading-none truncate">
              {projectName || 'Workspace'}
            </h2>
          </div>
        </div>

        {/* Minimalist Controls: Model Pill, Mode Toggle, New Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* PART 4 / ISSUE D: Minimalist Model Selector Pill with Fixed Z-Index Overlay */}
          <div className="relative" ref={modelMenuRef}>
            <button
              onClick={() => {
                if (modelMenuRef.current) {
                  const rect = modelMenuRef.current.getBoundingClientRect()
                  setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                }
                setShowModelMenu((prev) => !prev)
              }}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] text-2xs font-mono font-bold transition-colors cursor-pointer"
              title="Select AI Model"
            >
              <span className="truncate max-w-[90px]">{currentModelMeta.label.split(' ')[0]}</span>
              <ChevronDown className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
            </button>

            {showModelMenu && (
              <div
                style={{ top: `${menuPos.top}px`, right: `${menuPos.right}px` }}
                className="fixed z-[99999] w-56 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-2xl p-1 font-mono text-2xs space-y-0.5 animate-in fade-in duration-100"
              >
                <div className="px-2 py-1 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                  Select AI Model
                </div>
                {MODEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onModelChange?.(opt.value)
                      setShowModelMenu(false)
                    }}
                    className={cn(
                      "flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-left cursor-pointer transition-colors",
                      selectedModel === opt.value
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] font-bold"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-default)] shrink-0">
                      {opt.badge}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mode Pill Toggle (Plan vs Agent) */}
          <div className="flex items-center bg-[var(--bg-page)] border border-[var(--border-default)] p-0.5 rounded-lg text-2xs font-mono font-bold select-none">
            <button
              onClick={() => onModeChange?.('Plan')}
              className={cn(
                "px-2 py-0.5 rounded-md transition-colors cursor-pointer",
                selectedMode === 'Plan'
                  ? "bg-[var(--accent)] text-[var(--accent-text-on)] font-bold shadow-3xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              Plan
            </button>
            <button
              onClick={() => onModeChange?.('Agent')}
              className={cn(
                "px-2 py-0.5 rounded-md transition-colors cursor-pointer",
                selectedMode === 'Agent'
                  ? "bg-[var(--accent)] text-[var(--accent-text-on)] font-bold shadow-3xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              Agent
            </button>
          </div>

          {/* New Project Button */}
          <button
            onClick={onNewProject}
            className="h-6 px-2 rounded-lg border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xs font-mono font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
            title="Start new project"
          >
            <Plus className="h-3 w-3" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-grow overflow-y-auto p-3.5 space-y-3 min-h-0 custom-scrollbar select-text">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] mb-3 border border-[var(--accent)]/15">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold text-[var(--text-primary)] mb-1">What would you like to build?</h3>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed max-w-xs mb-5 font-sans">
              Describe a contract, dApp frontend, or full-stack application.
            </p>
            <div className="w-full space-y-1.5 max-w-xs">
              {SUGGESTIONS.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isLoading}
                  className="w-full text-left p-2 text-2xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-page)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--accent)]/40 rounded-lg transition-colors cursor-pointer truncate"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="w-full">
                {msg.role === 'assistant' ? (
                  msg.planPath ? (
                    <div className="flex gap-2 items-start justify-start w-full group">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/15 mt-0.5">
                        <FileText className="h-3 w-3" />
                      </div>
                      <div className="flex-1 max-w-[92%] bg-[var(--bg-elevated)]/80 border border-[var(--accent)]/20 rounded-xl p-3 shadow-xs text-xs space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--accent)] font-semibold border-b border-[var(--border-default)]/40 pb-1.5">
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5" />
                            Plan Ready · plan.md
                          </span>
                        </div>
                        {msg.planSummary && (
                          <div className="text-[var(--text-primary)] text-xs leading-relaxed font-sans bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-default)]/60">
                            {msg.planSummary}
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => onPlanAction?.(msg.planPath!, 'edit')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[var(--border-default)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => onPlanAction?.(msg.planPath!, 'build')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] text-[11px] font-semibold transition-colors cursor-pointer shadow-3xs"
                          >
                            <Hammer className="h-3 w-3" />
                            Build
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-start justify-start w-full group">
                      <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border mt-0.5", msg.isError ? "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20" : "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/15")}>
                        {msg.isError ? <AlertCircle className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                      </div>
                      <div className={cn("flex-1 max-w-[92%] rounded-xl p-3 text-xs leading-relaxed select-text space-y-2 font-sans relative", msg.isError ? "bg-[var(--danger)]/5 border border-[var(--danger)]/20 text-[var(--danger)]" : "bg-[var(--bg-elevated)]/50 border border-[var(--border-default)]/50 text-[var(--text-secondary)]")}>
                        {msg.events && msg.events.length > 0 ? (
                          <ActivityFeedCard
                            events={msg.events}
                            isComplete={msg.isComplete}
                            mode={msg.mode || selectedMode}
                            summaryText={msg.content}
                            modelUsed={msg.modelUsed}
                            promptText={msg.promptText}
                            onOpenFile={onOpenFile}
                            onOpenPreview={onOpenPreview}
                          />
                        ) : (
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                        )}

                        {msg.isError && msg.retryPrompt && (
                          <div className="pt-1.5 border-t border-[var(--danger)]/15 flex items-center justify-between gap-2 mt-1.5">
                            <span className="text-[10px] font-mono text-[var(--danger)]">
                              Failed: {msg.failedStep || 'Generation'}
                            </span>
                            <button
                              onClick={() => onSendMessage?.(msg.retryPrompt!, selectedModel, selectedMode)}
                              className="px-2 py-0.5 rounded bg-[var(--accent)] text-[var(--accent-text-on)] text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Retry
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => handleCopyText(msg.id, msg.content)}
                          className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          {copiedId === msg.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-end gap-1 w-full group">
                    <div className="max-w-[88%] bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/15 rounded-xl px-3 py-2 text-xs font-semibold leading-relaxed whitespace-pre-wrap font-sans relative">
                      {msg.content}
                    </div>
                    {msg.skillTags && msg.skillTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pr-1">
                        {msg.skillTags.map((tag, idx) => (
                          <span key={idx} className="px-1.5 py-0.2 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] text-[9px] font-mono">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 items-center text-[11px] font-mono text-[var(--text-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-ping" />
                <span>AI is thinking & generating…</span>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-[var(--border-default)]/60 flex flex-col gap-2 shrink-0 bg-[var(--bg-page)]/40">
        {/* PART 3: Vision Warning Banner if image attached with non-vision model */}
        {attachedImage && !isVisionAllowed && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[10px] font-mono">
            <span>⚠️ Current model doesn't support image input. Switch to Gemini to analyze images.</span>
            <button onClick={() => setAttachedImage(null)} className="hover:text-amber-300">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* PART 5: Slash Skill Autocomplete Menu (Capped at 5 + See All Skills link) */}
        {showAutocomplete && matchingSkills.length > 0 && (
          <div className="flex flex-col gap-0.5 rounded-xl border border-[var(--accent)]/30 bg-[var(--bg-elevated)] shadow-lg p-1 max-h-48 overflow-y-auto">
            <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--accent)] opacity-80 px-2 pt-1 pb-0.5 select-none">
              ⚡ Skill commands
            </p>
            {displayedSkills.map((skill) => (
              <button
                key={skill.slug}
                onMouseDown={(e) => { e.preventDefault(); handleSelectAutocompleteSkill(skill.slug) }}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--accent)]/10 text-left cursor-pointer transition-colors w-full group/item"
              >
                <span className="font-mono text-[11px] font-bold text-[var(--accent)] shrink-0">/{skill.slug}</span>
                <span className="text-[11px] text-[var(--text-secondary)] truncate group-hover/item:text-[var(--text-primary)]">{skill.description}</span>
              </button>
            ))}
            {matchingSkills.length > 5 && autocompleteFilter.trim() === '' && (
              <button
                onMouseDown={(e) => { e.preventDefault(); window.open('/skills', '_blank') }}
                className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-[var(--accent)]/10 text-left text-[10px] font-mono font-bold text-[var(--accent)] cursor-pointer transition-colors w-full border-t border-[var(--border-default)]/60 mt-1 pt-1.5"
              >
                <span>See all skills ({availableSkills.length})</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* PART 3: "@" File/Folder Context Reference Autocomplete Menu */}
        {showFileAutocomplete && matchingFiles.length > 0 && (
          <div className="flex flex-col gap-0.5 rounded-xl border border-[var(--accent)]/30 bg-[var(--bg-elevated)] shadow-lg p-1 max-h-44 overflow-y-auto font-mono text-2xs">
            <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--accent)] opacity-80 px-2 pt-1 pb-0.5 select-none">
              📁 Reference File / Folder
            </p>
            {matchingFiles.map((fileRef) => (
              <button
                key={fileRef.path}
                onMouseDown={(e) => { e.preventDefault(); handleSelectFileAutocomplete(fileRef) }}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--accent)]/10 text-left cursor-pointer transition-colors w-full truncate"
              >
                <FileText className="h-3 w-3 text-[var(--accent)] shrink-0" />
                <span className="text-[11px] text-[var(--text-primary)] truncate">{fileRef.path}</span>
              </button>
            ))}
          </div>
        )}

        {/* Attached Skill / File / Image Chips Row */}
        {(attachedSkills.length > 0 || attachedFiles.length > 0 || attachedImage) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {attachedImage && (
              <div className="relative inline-flex items-center group">
                <img src={attachedImage} alt="Attachment" className="h-9 w-9 object-cover rounded-lg border border-[var(--accent)]/40" />
                <button
                  onClick={() => setAttachedImage(null)}
                  className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 cursor-pointer shadow-xs"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            )}

            {attachedFiles.map((file) => (
              <span
                key={file.path}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-[10px] font-mono font-bold"
              >
                <AtSign className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate max-w-[120px]">{file.path.split('/').pop()}</span>
                <button onClick={() => setAttachedFiles((prev) => prev.filter((f) => f.path !== file.path))}>
                  <X className="h-2.5 w-2.5 hover:opacity-70" />
                </button>
              </span>
            ))}

            {attachedSkills.map((skill) => (
              <span
                key={skill.slug}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-[10px] font-mono font-bold"
              >
                <Sparkles className="h-2.5 w-2.5 shrink-0" />
                <span>{skill.name}</span>
                <button onClick={() => setAttachedSkills((prev) => prev.filter((s) => s.slug !== skill.slug))}>
                  <X className="h-2.5 w-2.5 hover:opacity-70" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input Box with Attach, Mic, Send */}
        <div className="relative flex items-center gap-1.5 border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-page)] rounded-xl p-1.5 focus-within:border-[var(--accent)] focus-within:ring-[1px] focus-within:ring-[var(--accent)]/30 transition-colors">
          {/* PART 3: Image Attach Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer shrink-0"
            title="Attach Image"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </button>

          {/* PART 3: Speech-to-Text Mic Button (Gracefully hidden if unsupported) */}
          {isSpeechSupported && (
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={cn(
                "p-1 rounded-lg transition-colors cursor-pointer shrink-0",
                isListening
                  ? "text-red-500 bg-red-500/10 animate-pulse"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
              )}
              title={isListening ? "Stop Voice Input" : "Voice Input (Dictation)"}
            >
              {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isLoading
                ? 'Generating…'
                : 'Ask AI… (/ for skills, @ for files)'
            }
            rows={1}
            disabled={isLoading}
            className="flex-grow bg-transparent border-0 p-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-0 focus:outline-none resize-none max-h-36 min-h-[20px] font-sans leading-snug"
          />

          {isLoading ? (
            <button
              onClick={onStop}
              className="h-7 px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-mono text-2xs font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Square className="h-3 w-3 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim() && attachedSkills.length === 0 && attachedFiles.length === 0 && !attachedImage}
              className="h-7 w-7 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-30 disabled:hover:bg-[var(--accent)] text-[var(--accent-text-on)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
