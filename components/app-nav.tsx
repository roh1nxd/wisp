'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { SignInButton, UserButton, useUser } from '@clerk/nextjs'
import { WispMark } from '@/components/wisp-mark'
import { cn } from '@/lib/utils'

const SOCIALS = [
  {
    label: 'X',
    href: 'https://x.com/_TryWisp',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.9 2H22l-7.4 8.5L23 22h-6.8l-5.3-6.9L4.8 22H1.7l7.9-9L1 2h7l4.8 6.3L18.9 2Zm-1.2 18h1.9L7.1 4h-2l12.6 16Z" />
      </svg>
    ),
  },
]

export function AppNav() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const { isSignedIn, isLoaded } = useUser()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isLanding = pathname === '/'

  return (
    <header className="sticky top-0 z-50 w-full bg-transparent px-4 sm:px-6 pt-3 select-none">
      <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-between px-6 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)]/80 backdrop-blur-md shadow-[0_8px_30px_rgba(28,27,23,0.03)] transition-all duration-300">
        <div className="flex items-center gap-6">
          {/* Logo link to root */}
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <WispMark className="h-5.5 w-5.5 text-[var(--accent)]" />
            <span className="font-sans text-base font-bold tracking-tight text-[var(--text-primary)]">
              Wisp
            </span>
          </Link>
        </div>

        {/* Dynamic Navigation Links - Centered horizontally */}
        <nav className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-6 z-10">
          {!isLanding && (
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Home
            </Link>
          )}

          {isLanding ? (
            <>
              <a
                href="#features"
                className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Product
              </a>
              <a
                href="#pricing"
                className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Pricing
              </a>
              {isSignedIn && (
                <Link
                  href="/dashboard"
                  className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Dashboard
                </Link>
              )}
            </>
          ) : (
            // Non-landing pages (e.g. /dashboard)
            <>
              {pathname === '/dashboard' && (
                <Link
                  href="/workspace"
                  className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Workspace
                </Link>
              )}
              {pathname !== '/dashboard' && isSignedIn && (
                <Link
                  href="/dashboard"
                  className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Dashboard
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {/* Social links */}
          <div className="flex items-center gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Wisp on ${s.label}`}
                className="rounded-lg p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              >
                <div className="h-4 w-4">
                  {s.icon}
                </div>
              </a>
            ))}
          </div>

          <div className="h-4 w-px bg-[var(--border-default)]" />

          {/* Auth controls */}
          <div className="flex items-center gap-3">
            {!mounted || !isLoaded ? (
              <div className="h-7 w-14 animate-pulse rounded-full bg-[var(--bg-elevated)]" />
            ) : isSignedIn ? (
              <>
                <UserButton appearance={{ elements: { avatarBox: 'h-7 w-7 rounded-full border border-[var(--border-strong)] shadow-3xs' } }} />
              </>
            ) : (
              <>
                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <button
                    id="nav-sign-in"
                    className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] px-2 py-1 cursor-pointer"
                  >
                    Sign in
                  </button>
                </SignInButton>
                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <button
                    id="nav-get-started"
                    className="rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-5 py-2.5 text-xs font-semibold text-[var(--accent-text-on)] shadow-2xs transition-all duration-150 active:scale-97 cursor-pointer"
                  >
                    Get started
                  </button>
                </SignInButton>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
