"use client"

import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { WispMark } from '@/components/wisp-mark'
import { cn } from '@/lib/utils'

interface StatusBarProps {
  status?: 'draft' | 'unaudited' | 'deployed'
  onDeploy?: () => void
}

export function StatusBar({ status = 'draft', onDeploy }: StatusBarProps) {
  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    unaudited: 'Unaudited',
    deployed: 'Deployed',
  }

  return (
    <div className="h-14 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-6 flex items-center justify-between shrink-0 select-none relative z-40">
      <div className="flex items-center gap-5 relative z-50 pointer-events-auto">
        {/* Clickable Logo leading back to home */}
        <Link 
          href="/"
          className="flex items-center gap-2 text-[var(--accent)] hover:opacity-85 transition-opacity relative z-50 pointer-events-auto cursor-pointer"
        >
          <WispMark className="h-5 w-5" />
          <span className="font-sans font-black text-sm tracking-tight text-[var(--text-primary)]">
            Wisp
          </span>
        </Link>
        
        <div className="h-4 w-px bg-[var(--border-default)]" />

        {/* Project Status */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-page)] px-3 py-1 text-2xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-3xs">
            <span className={cn(
              "h-1.5 w-1.5 rounded-full animate-pulse",
              status === 'deployed' && "bg-[var(--success)]",
              status === 'unaudited' && "bg-[var(--warning)]",
              status === 'draft' && "bg-[var(--text-muted)]"
            )} />
            <span>{statusLabels[status]}</span>
          </div>
          {status === 'unaudited' && (
            <span className="text-3xs font-mono uppercase bg-[var(--bg-elevated)] border border-[var(--border-strong)] px-1.5 py-0.5 rounded text-[var(--text-secondary)] select-none">
              Testnet Available
            </span>
          )}
        </div>
      </div>

      {/* Home & Dashboard Navigation Links - Repositioned to be centered horizontally */}
      <nav className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-6 z-50 pointer-events-auto">
        <Link
          href="/"
          className="text-2xs font-bold uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] relative z-50 pointer-events-auto cursor-pointer"
        >
          Home
        </Link>
        <Link
          href="/dashboard"
          className="text-2xs font-bold uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] relative z-50 pointer-events-auto cursor-pointer"
        >
          Dashboard
        </Link>
      </nav>
      
      <div className="flex items-center gap-4 relative z-50 pointer-events-auto">
        <button
          onClick={onDeploy}
          className="inline-flex items-center justify-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] px-4 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer duration-150 relative z-50 pointer-events-auto"
        >
          Deploy to Testnet
        </button>
        <UserButton appearance={{ elements: { avatarBox: 'h-7 w-7 rounded-full border border-[var(--border-strong)] shadow-3xs relative z-50 pointer-events-auto' } }} />
      </div>
    </div>
  )
}
