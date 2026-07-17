'use client'

import { Send, Plus, Sparkles } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

interface ChatPanelProps {
  messages?: Message[]
  onSendMessage?: (message: string, model?: string) => void
  onNewProject?: () => void
  isLoading?: boolean
  projectName?: string
  selectedModel?: string
  onModelChange?: (model: string) => void
}

export function ChatPanel({
  messages = [],
  onSendMessage,
  onNewProject,
  isLoading = false,
  projectName,
  selectedModel = 'google/gemini-2.0-flash-exp:free',
  onModelChange,
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
      onSendMessage(trimmed, selectedModel)
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
          className="inline-flex items-center gap-1 bg-transparent hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--border-strong)] px-2 py-1 rounded-md text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-2xs"
        >
          <Plus className="h-3 w-3" />
          <span>New</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-grow flex-col items-center justify-center text-center p-4 gap-4 my-auto h-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/10">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1.5 max-w-xs">
              <p className="text-sm font-semibold text-[var(--text-primary)] font-sans">
                Start coding
              </p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Describe what you want to build. I'll generate the code and refine it with you.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[210px] mt-2">
              {[
                'Build a calculator in HTML',
                'Create a Python web scraper',
                'Make a React todo app',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => onSendMessage?.(example, selectedModel)}
                  className="w-full text-left text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] px-3 py-2 rounded-lg transition-all cursor-pointer font-medium shadow-2xs"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {messages.map((msg) => (
              <div key={msg.id} className="w-full">
                {msg.role === 'assistant' ? (
                  <div className="flex gap-2.5 items-start justify-start w-full">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/10 shadow-3xs mt-0.5">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 max-w-[85%] bg-[var(--bg-elevated)]/65 border border-[var(--border-default)] rounded-2xl rounded-tl-2xs p-3 shadow-3xs text-xs text-[var(--text-secondary)] leading-relaxed select-text space-y-2 whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1 w-full">
                    <span className="text-[var(--text-muted)] text-[9px] font-mono font-bold uppercase tracking-wider select-none pr-1.5">You</span>
                    <div className="max-w-[85%] bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/15 rounded-2xl rounded-tr-2xs px-3.5 py-2.5 shadow-3xs text-xs font-semibold leading-relaxed select-text whitespace-pre-wrap font-sans">
                      {msg.content}
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
        <div className="flex items-center justify-between text-2xs font-mono font-bold text-[var(--text-secondary)] gap-2">
          <label className="text-[var(--text-muted)] uppercase tracking-widest select-none">
            Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => onModelChange?.(e.target.value)}
            disabled={isLoading}
            className="bg-[var(--bg-page)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--border-strong)] rounded-lg px-2.5 py-1 text-2xs font-mono font-bold text-[var(--text-primary)] transition-all focus:outline-none focus:border-[var(--accent)] cursor-pointer max-w-[170px] truncate shadow-3xs"
          >
            <option value="gemini-3-flash-preview">Gemini 3 Flash (Primary / Free)</option>
            <option value="qwen/qwen3-coder:free">Qwen 3 Coder (Fast / Free)</option>
            <option value="poolside/laguna-m.1:free">Poolside Laguna M.1 (Free)</option>
            <option value="cohere/north-mini-code:free">Cohere North Mini Code (Free)</option>
            <option value="poolside/laguna-xs-2.1:free">Poolside Laguna XS 2.1 (Free)</option>
            <option value="nvidia/nemotron-3-ultra-550b-a55b:free">Nemotron 3 Ultra (Free)</option>
            <option value="zai/glm-4.7-flash">Z.ai GLM-4.7 Flash (Free/Light)</option>
            <option value="zai/glm-4.7">Z.ai GLM-4.7 (Mid)</option>
            <option value="zai/glm-5.2">Z.ai GLM-5.2 (Flagship)</option>
            <option value="openrouter/free">Auto (Always Available)</option>
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
