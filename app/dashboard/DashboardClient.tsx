'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { AppNav } from '@/components/app-nav'
import { PromptBox } from '@/components/prompt-box'
import RecentProjects from '@/components/RecentProjects'
import { KineticGrid } from '@/components/kinetic-grid'

export default function DashboardClient() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] text-[var(--text-secondary)]">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="h-8 w-8 animate-spin text-[var(--accent)]"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-xs font-mono tracking-widest uppercase">Loading builder…</p>
        </div>
      </div>
    )
  }

  const name =
    user?.firstName ||
    user?.emailAddresses?.[0]?.emailAddress?.split('@')?.[0] ||
    'builder'

  return (
    <main className="relative overflow-hidden min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col font-sans antialiased">
      {/* Interactive Dot Grid Background matching the homepage */}
      <div className="fixed inset-0 z-0 select-none pointer-events-none">
        <KineticGrid 
          dotColor="rgba(200, 92, 57, 0.18)" 
          lineColor="rgba(200, 92, 57, 0.09)" 
          trailColor="rgba(200, 92, 57, 0.45)"
          dotRadius={1.5}
        />
      </div>

      {/* Shared App Pill Navigation */}
      <AppNav />

      {/* Main Container */}
      <div className="relative z-10 flex-grow mx-auto w-full max-w-5xl px-6 py-12 flex flex-col gap-12">
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-mono font-semibold tracking-widest text-[var(--accent)] uppercase">
              Welcome back, {name}
            </p>
            <h1 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
              What are we building today?
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl">
              Describe your project in plain English — Wisp generates and refines it with you in real time.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/workspace?new=true"
              className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm cursor-pointer"
            >
              <span>+ Start Empty Workspace</span>
            </Link>
          </div>

          <div className="w-full border border-[var(--border-strong)]/70 bg-[var(--bg-surface)]/70 backdrop-blur-md p-1.5 rounded-2xl shadow-[0_8px_35px_rgba(28,27,23,0.03)] focus-within:shadow-[0_12px_50px_rgba(200,92,57,0.09)] focus-within:border-[var(--accent)] transition-all duration-300 mt-2 overflow-hidden">
            <PromptBox autofocus />
          </div>
        </section>

        {/* Database project history panel */}
        <div className="w-full border-t border-[var(--border-default)] pt-10">
          <RecentProjects userId={user?.id || ''} />
        </div>
      </div>
    </main>
  )
}
