'use client'

import Link from 'next/link'
import { WispMark } from '@/components/wisp-mark'

const COLUMNS = [
  {
    heading: 'Product',
    links: ['Features', 'Pricing', 'Changelog'],
  },
  {
    heading: 'Company',
    links: ['About', 'Blog', 'Careers', 'Contact'],
  },
  {
    heading: 'Legal',
    links: ['Privacy', 'Terms', 'Security'],
  },
]

export function SiteFooter() {
  return (
    <footer className="w-full bg-[var(--bg-page)] border-t border-[var(--border-default)] pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-5 gap-12 pb-12 border-b border-[var(--border-default)]">
        <div className="md:col-span-2 flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2.5 text-[var(--text-primary)] hover:opacity-90 transition-opacity">
            <WispMark className="h-6 w-6 text-[var(--accent)]" />
            <span className="font-sans text-lg font-bold tracking-tight">
              Wisp
            </span>
          </Link>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs">
            Describe your idea. Soroban builds it. Smart contracts and
            frontends, generated and deployed.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <a
              href="https://x.com/_TryWisp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Wisp on X"
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-150"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.9 2H22l-7.4 8.5L23 22h-6.8l-5.3-6.9L4.8 22H1.7l7.9-9L1 2h7l4.8 6.3L18.9 2Zm-1.2 18h1.9L7.1 4h-2l12.6 16Z" />
              </svg>
            </a>
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.heading} className="flex flex-col gap-4">
            <p className="text-xs font-mono font-bold tracking-widest text-[var(--text-primary)] uppercase">{col.heading}</p>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-8 flex items-center justify-between text-2xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
        <p>
          © {new Date().getFullYear()} Wisp. Built for builders.
        </p>
      </div>
    </footer>
  )
}
