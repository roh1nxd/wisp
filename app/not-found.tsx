'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mascot } from '@/components/mascot'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[var(--bg-page)] flex flex-col items-center justify-center text-center p-6 gap-6 font-sans antialiased select-none">
      {/* Mascot */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-2"
      >
        <Mascot className="w-20 h-20 mx-auto" />
      </motion.div>

      {/* 404 badge */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/15 bg-[var(--accent-soft)] px-3 py-1 text-xs font-mono font-medium text-[var(--accent)] shadow-sm">
          Error 404
        </span>
      </motion.div>

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
        className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] font-sans max-w-md leading-tight"
      >
        Looks like this page drifted off
      </motion.h1>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.20, ease: [0.22, 1, 0.36, 1] }}
        className="text-sm text-[var(--text-secondary)] max-w-xs leading-relaxed"
      >
        The page you are looking for does not exist or has been moved.
      </motion.p>

      {/* Back home button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="mt-2"
      >
        <Link href="/" className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 shadow-sm cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to home</span>
        </Link>
      </motion.div>

      {/* Subtle help links */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.34 }}
        className="flex items-center gap-4 text-xs font-semibold text-[var(--text-secondary)] mt-8 select-none"
      >
        <Link
          href="/dashboard"
          className="transition-colors hover:text-[var(--text-primary)]"
        >
          Dashboard
        </Link>
        <span className="text-[var(--text-muted)] select-none">·</span>
        <Link
          href="/workspace"
          className="transition-colors hover:text-[var(--text-primary)]"
        >
          Workspace
        </Link>
      </motion.div>
    </main>
  )
}
