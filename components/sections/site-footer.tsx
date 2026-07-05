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
    <footer className="border-t border-white/[0.06] px-6 py-16">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <WispMark className="size-6 text-foreground" />
            <span className="text-[15px] font-semibold tracking-tight">Wisp</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Describe your idea. Soroban builds it. Smart contracts and
            frontends, generated and deployed.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <a
              href="https://x.com/_TryWisp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Wisp on X"
              className="glass flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                <path d="M18.9 2H22l-7.4 8.5L23 22h-6.8l-5.3-6.9L4.8 22H1.7l7.9-9L1 2h7l4.8 6.3L18.9 2Zm-1.2 18h1.9L7.1 4h-2l12.6 16Z" />
              </svg>
            </a>
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <p className="label-caps">{col.heading}</p>
            <ul className="mt-4 space-y-3">
              {col.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-6xl border-t border-white/[0.06] pt-6">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Wisp. Built for builders.
        </p>
      </div>
    </footer>
  )
}
