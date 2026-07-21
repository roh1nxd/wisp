'use client'

import { Send, Plus, Sparkles, FileText, Pencil, Hammer, Copy, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { renderMarkdown } from './MarkdownPreview'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
  /** Present only for Plan-mode AI responses */
  planPath?: string
  planFilename?: string
  planSummary?: string
}

export type ChatMode = 'Plan' | 'Agent'

const SUGGESTIONS = [
  'Build a Soroban crowdfunding contract',
  'Create a voting dApp with web UI',
  'Build an escrow contract and frontend',
]

interface ChatPanelProps {
  messages?: Message[]
  onSendMessage?: (message: string, model?: string, mode?: ChatMode) => void
  onNewProject?: () => void
  isLoading?: boolean
  projectName?: string
  selectedModel?: string
  onModelChange?: (model: string) => void
  selectedMode?: ChatMode
  onModeChange?: (mode: ChatMode) => void
  onPlanAction?: (planPath: string, action: 'edit' | 'build') => void
}

export function ChatPanel({
  messages = [],
  onSendMessage,
  onNewProject,
  isLoading = false,
  projectName,
  selectedModel = 'google/gemini-2.0-flash-exp:free',
  onModelChange,
  selectedMode = 'Plan',
  onModeChange,
  onPlanAction,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [input])

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (trimmed && onSendMessage && !isLoading) {
      onSendMessage(trimmed, selectedModel, selectedMode)
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    onSendMessage?.(suggestion, selectedModel, selectedMode)
  }

  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyText = (id: string, text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] border-l border-[var(--border-default)]">
      {/* Header */}
      <div className="h-14 border-b border-[var(--border-default)] flex items-center justify-between px-4 shrink-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-[var(--accent)]">
            <Sparkles className="h-4 w-4" />
            <h2 className="text-sm font-bold text-[var(--text-primary)] font-sans">
              AI Assistant
            </h2>
          </div>
          {projectName && (
            <p className="text-2xs text-[var(--text-muted)] truncate font-mono mt-0.5 max-w-[120px]" title={projectName}>
              {projectName}
            </p>
          )}
        </div>
        <button
          onClick={onNewProject}
          title="Start a new project"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-strong)]/40 hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition-all cursor-pointer shadow-3xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center h-full">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)]/10 text-[var(--accent)] mb-4 shadow-xs">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] font-sans mb-1.5">
              Describe your idea
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-[200px] mb-6">
              I'll build the Soroban smart contract and web frontend for you.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-[220px]">
              {SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-left text-xs p-2.5 rounded-xl bg-[var(--bg-elevated)]/60 hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-150 cursor-pointer shadow-3xs group"
                >
                  <span className="line-clamp-2">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {messages.map((msg) => (
              <div key={msg.id} className="w-full">
                {msg.role === 'assistant' ? (
                  msg.planPath ? (
                    /* ── Plan card ─────────────────────────────────────────── */
                    <div className="flex gap-2.5 items-start justify-start w-full">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/10 shadow-3xs mt-0.5">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 max-w-[85%] bg-[var(--bg-elevated)]/65 border border-[var(--border-default)] rounded-2xl rounded-tl-2xs p-3 shadow-3xs space-y-3">
                        {/* Filename row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                            <span className="text-xs font-semibold text-[var(--text-primary)] font-mono truncate">
                              {msg.planFilename ?? 'plan.md'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopyText(`plan-card-${msg.id}`, msg.planSummary || msg.content)}
                            title="Copy plan text"
                            className="p-1 rounded hover:bg-[var(--bg-page)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                          >
                            {copiedId === `plan-card-${msg.id}` ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        {/* Summary */}
                        {msg.planSummary && (
                          <div
                            className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-4 markdown-body"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.planSummary) }}
                          />
                        )}
                        {/* Action buttons */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => onPlanAction?.(msg.planPath!, 'edit')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-page)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => onPlanAction?.(msg.planPath!, 'build')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <Hammer className="h-3 w-3" />
                            OK, build this
                          </button>
                          <button
                            onClick={() => handleCopyText(`plan-btn-${msg.id}`, msg.planSummary || msg.content)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-page)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                            title="Copy Plan"
                          >
                            {copiedId === `plan-btn-${msg.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── Normal assistant bubble ────────────────────────────── */
                    <div className="flex gap-2.5 items-start justify-start w-full group">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/10 shadow-3xs mt-0.5">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 max-w-[85%] bg-[var(--bg-elevated)]/65 border border-[var(--border-default)] rounded-2xl rounded-tl-2xs p-3 shadow-3xs text-xs text-[var(--text-secondary)] leading-relaxed select-text space-y-2 whitespace-pre-wrap font-sans relative">
                        {msg.content}
                        <button
                          onClick={() => handleCopyText(msg.id, msg.content)}
                          title="Copy message"
                          className="absolute top-2 right-2 p-1 rounded hover:bg-[var(--bg-page)] text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          {copiedId === msg.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-end gap-1 w-full group">
                    <span className="text-[var(--text-muted)] text-[9px] font-mono font-bold uppercase tracking-wider select-none pr-1.5">You</span>
                    <div className="max-w-[85%] bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/15 rounded-2xl rounded-tr-2xs px-3.5 py-2.5 shadow-3xs text-xs font-semibold leading-relaxed select-text whitespace-pre-wrap font-sans relative">
                      {msg.content}
                      <button
                        onClick={() => handleCopyText(msg.id, msg.content)}
                        title="Copy message"
                        className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-[var(--accent)]/20 text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        {copiedId === msg.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex gap-2.5 items-start justify-start w-full">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/10 shadow-3xs">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center h-6 pl-1.5">
                  <div className="flex gap-1 items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)] animate-[bounce_1.4s_infinite_0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)] animate-[bounce_1.4s_infinite_200ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)] animate-[bounce_1.4s_infinite_400ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[var(--border-default)] flex flex-col gap-3.5 shrink-0">
        {/* Model + Mode row */}
        <div className="flex items-center justify-between text-2xs font-mono font-bold text-[var(--text-secondary)] gap-2">
          <label className="text-[var(--text-muted)] uppercase tracking-widest select-none shrink-0">
            Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => onModelChange?.(e.target.value)}
            disabled={isLoading}
            className="bg-[var(--bg-page)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--border-strong)] rounded-lg px-2.5 py-1 text-2xs font-mono font-bold text-[var(--text-primary)] transition-all focus:outline-none focus:border-[var(--accent)] cursor-pointer flex-1 min-w-0 truncate shadow-3xs"
          >
            <option value="gemini-3-flash-preview">Gemini 3.5 Flash (Primary / Fast)</option>
            <option value="openai/gpt-oss-120b">Groq GPT-OSS 120B (High Reasoning)</option>
            <option value="qwen/qwen3-32b">Groq Qwen3 32B (Coding)</option>
            <option value="openai/gpt-oss-20b">Groq GPT-OSS 20B (Fast)</option>
            <option value="groq/compound">Groq Compound (Agentic / Tools)</option>
            <option value="groq/compound-mini">Groq Compound Mini (Speed)</option>
            <option value="moonshotai/kimi-k2-instruct">Groq Kimi K2 Instruct</option>
            <option value="qwen/qwen3-coder:free">OpenRouter Qwen 3 Coder</option>
            <option value="cohere/north-mini-code:free">OpenRouter Cohere North</option>
            <option value="poolside/laguna-m.1:free">OpenRouter Laguna M.1</option>
            <option value="openrouter/free">Auto Fallback (Free Pool)</option>
          </select>
        </div>
        {/* Mode row */}
        <div className="flex items-center justify-between text-2xs font-mono font-bold text-[var(--text-secondary)] gap-2">
          <label className="text-[var(--text-muted)] uppercase tracking-widest select-none shrink-0">
            Mode
          </label>
          <select
            value={selectedMode}
            onChange={(e) => onModeChange?.(e.target.value as ChatMode)}
            disabled={isLoading}
            className="bg-[var(--bg-page)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--border-strong)] rounded-lg px-2.5 py-1 text-2xs font-mono font-bold text-[var(--text-primary)] transition-all focus:outline-none focus:border-[var(--accent)] cursor-pointer flex-1 min-w-0 shadow-3xs"
          >
            <option value="Plan">Plan — PRD + roadmap</option>
            <option value="Agent">Agent — write code</option>
          </select>
        </div>
        <div className="relative flex items-end gap-2 border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-page)] rounded-2xl p-2 focus-within:border-[var(--accent)] focus-within:ring-[1px] focus-within:ring-[var(--accent)]/40 shadow-3xs transition-all duration-200">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? 'Generating…' : 'Ask AI to build or refine…'}
            rows={1}
            disabled={isLoading}
            className="flex-grow bg-transparent border-0 p-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-0 focus:outline-none resize-none max-h-40 min-h-[24px] font-sans leading-relaxed"
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            className="h-7.5 w-7.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-muted)] disabled:opacity-40 text-[var(--accent-text-on)] flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs hover:shadow-sm active:scale-95"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest text-center select-none">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
