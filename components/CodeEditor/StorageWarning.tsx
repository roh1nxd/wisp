'use client'

import { ShieldAlert, RefreshCw, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface StorageWarningProps {
  onRetry?: () => void
  onSwitchToDirectPreview?: () => void
}

export function StorageWarning({ onRetry, onSwitchToDirectPreview }: StorageWarningProps) {
  const [copiedFlag, setCopiedFlag] = useState(false)

  const flagUrl = 'chrome://flags/#third-party-storage-partitioning'

  const handleCopyFlag = () => {
    navigator.clipboard.writeText(flagUrl)
    setCopiedFlag(true)
    setTimeout(() => setCopiedFlag(false), 2500)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-[var(--bg-page)] text-[var(--text-secondary)] font-sans select-none animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-[var(--bg-surface)] border border-amber-500/30 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
        {/* Header Icon & Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] font-sans">
              Browser Storage Partitioning Required
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Chrome Privacy Setting Notice
            </p>
          </div>
        </div>

        {/* Informational Message */}
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Your browser is currently blocking Service Worker storage required for in-browser Node.js WebContainer dev servers. <span className="font-semibold text-[var(--text-primary)]">This is a Chrome browser privacy setting, not an app bug.</span>
        </p>

        {/* Step-by-Step Instructions Card */}
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-3.5 space-y-2.5 text-xs">
          <div className="font-mono font-bold text-2xs uppercase tracking-wider text-[var(--text-muted)]">
            How to enable in 30 seconds:
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-[var(--text-secondary)]">
            <li>
              Copy & paste this flag into your address bar:
              <div className="mt-1 flex items-center justify-between bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-2 py-1 font-mono text-2xs text-[var(--accent)]">
                <span className="truncate">{flagUrl}</span>
                <button
                  onClick={handleCopyFlag}
                  className="ml-2 inline-flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer shrink-0"
                  title="Copy flag link"
                >
                  {copiedFlag ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedFlag ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </li>
            <li>Set <strong className="text-[var(--text-primary)]">Third-party Storage Partitioning</strong> to <strong className="text-emerald-400">Enabled</strong>.</li>
            <li>Relaunch Chrome and click <strong className="text-[var(--text-primary)]">Retry Preview</strong> below.</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onRetry || (() => window.location.reload())}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Preview</span>
          </button>

          {onSwitchToDirectPreview && (
            <button
              onClick={onSwitchToDirectPreview}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] transition-all cursor-pointer"
            >
              <span>Use Direct HTML Engine</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default StorageWarning
