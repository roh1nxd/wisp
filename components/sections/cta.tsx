'use client'

import Link from 'next/link'
import { Reveal } from '@/components/reveal'
import { motion } from 'framer-motion'

export function CTA() {
  return (
    <section className="w-full bg-[var(--bg-page)] py-20 sm:py-28 px-6">
      <Reveal>
        <div className="max-w-5xl mx-auto rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] overflow-hidden relative shadow-sm hover:shadow-md transition-shadow duration-300 p-10 sm:p-16 flex flex-col items-center text-center gap-6">
          {/* Subtle amber glow elements */}
          <div className="absolute -right-32 -bottom-32 w-96 h-96 bg-[var(--accent)]/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute -left-32 -top-32 w-96 h-96 bg-[var(--accent)]/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

          <div className="relative z-10 flex flex-col items-center gap-4">
            <h2 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Start building on Stellar.
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-xl leading-relaxed">
              Turn your next idea into a deployed Soroban contract. No setup,
              no boilerplate—just describe it.
            </p>
            <div className="mt-4">
              <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/workspace"
                  className="inline-flex items-center justify-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] px-6 py-3 rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  Get started free
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
