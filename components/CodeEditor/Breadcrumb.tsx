'use client'

import { ChevronRight } from 'lucide-react'

interface BreadcrumbProps {
  path: string[]
}

export function Breadcrumb({ path }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-3xs tracking-wide text-[var(--text-secondary)] uppercase">
      {path.map((segment, index) => {
        const isLast = index === path.length - 1
        return (
          <div key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
            )}
            <span className={isLast ? "text-[var(--text-primary)] font-bold" : "text-[var(--text-secondary)]/80"}>
              {segment}
            </span>
          </div>
        )
      })}
    </div>
  )
}
