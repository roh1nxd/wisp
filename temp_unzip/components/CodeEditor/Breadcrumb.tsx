'use client'

import { ChevronRight } from 'lucide-react'

interface BreadcrumbProps {
  path: string[]
}

export function Breadcrumb({ path }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 text-xs text-gray-400 bg-[#252526] border-b border-gray-800">
      {path.map((segment, index) => (
        <div key={index} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3 w-3 text-gray-600" />}
          <span className={index === path.length - 1 ? 'text-gray-300' : ''}>
            {segment}
          </span>
        </div>
      ))}
    </div>
  )
}
