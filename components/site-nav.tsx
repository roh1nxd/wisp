'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs'
import { WispMark } from '@/components/wisp-mark'
import { cn } from '@/lib/utils'

const LINKS = [
  { label: 'Product', href: '#features', id: 'features' },
  { label: 'Pricing', href: '#pricing', id: 'pricing' },
]

const SOCIALS = [
  {
    label: 'X',
    href: 'https://x.com/_TryWisp',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
        <path d="M18.9 2H22l-7.4 8.5L23 22h-6.8l-5.3-6.9L4.8 22H1.7l7.9-9L1 2h7l4.8 6.3L18.9 2Zm-1.2 18h1.9L7.1 4h-2l12.6 16Z" />
      </svg>
    ),
  },
]

export function SiteNav() {
  const { isSignedIn, isLoaded } = useAuth()
  const [active, setActive] = useState('features')

  useEffect(() => {
    const ids = LINKS.map((l) => l.id).filter(Boolean)
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el))

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <div className="glass-dark mx-auto flex h-14 max-w-4xl items-center justify-between rounded-full pl-5 pr-2">
        <Link href="/" className="flex items-center gap-2">
          <WispMark className="size-6 text-foreground" />
          <span className="text-[15px] font-semibold tracking-tight">Wisp</span>
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm transition-colors',
                link.id && active === link.id
                  ? 'bg-white text-black'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex min-h-8 items-center gap-2">
          <div className="group/social hidden items-center sm:flex">
            <span className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover/social:text-foreground">
              <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm3 12h-6v-1.2c.6-.3 1.2-.5 1.5-.6V11H9V9.8h3.5v5.4c.4.1 1 .3 1.5.6V17Z" />
              </svg>
              <span className="sr-only">Follow Wisp on social media</span>
            </span>
            <div className="grid grid-cols-[0fr] overflow-hidden opacity-0 transition-all duration-300 group-hover/social:grid-cols-[1fr] group-hover/social:opacity-100 group-focus-within/social:grid-cols-[1fr] group-focus-within/social:opacity-100">
              <div className="flex min-w-0 items-center gap-1">
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Wisp on ${s.label}`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
          {isLoaded && isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                className="hidden rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
              >
                Dashboard
              </Link>
              <UserButton appearance={{ elements: { avatarBox: 'size-8' } }} />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="gradient-border rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.03]">
                  Get started
                </button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
