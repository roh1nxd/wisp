'use client'

import { useState } from 'react'
import { Key, ExternalLink } from 'lucide-react'

interface ApiKeyModalProps {
  isOpen?: boolean
  onSave: (key: string) => void
}

export function ApiKeyModal({ isOpen = false, onSave }: ApiKeyModalProps) {
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)

  const handleSave = () => {
    const trimmed = key.trim()
    if (!trimmed) return
    localStorage.setItem('gemini_api_key', trimmed)
    onSave(trimmed)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Modal Card */}
      <div className="max-w-sm w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] p-8 rounded-3xl flex flex-col gap-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center gap-3 select-none">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/10 shadow-3xs">
            <Key className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] font-sans">Gemini API Key</h2>
        </div>

        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          Enter your Gemini API key to start generating. Your key is stored locally
          in your browser and never sent to our servers.
        </p>

        <div className="relative flex items-center border border-[var(--border-strong)] bg-[var(--bg-page)] rounded-xl px-3 py-1 focus-within:ring-1 focus-within:ring-[var(--accent)]/45 focus-within:border-[var(--accent)] transition-all">
          <input
            type={show ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="AIza..."
            autoFocus
            className="flex-1 bg-transparent border-0 text-sm py-1.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-0 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="text-2xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors pr-1 cursor-pointer select-none"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={!key.trim()}
          className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-muted)] text-[var(--accent-text-on)] py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center justify-center cursor-pointer active:scale-98 duration-150"
        >
          Save & Continue
        </button>

        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150 text-center font-medium mt-1 select-none"
        >
          <span>Get a key at aistudio.google.com</span>
          <ExternalLink className="h-3.5 w-3.5 text-[var(--text-muted)]" />
        </a>
      </div>
    </div>
  )
}
