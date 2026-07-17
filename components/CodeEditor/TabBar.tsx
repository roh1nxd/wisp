'use client'

import { X } from 'lucide-react'
import { FileIcon } from './FileIcon'
import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  name: string
  isActive: boolean
}

interface TabBarProps {
  tabs: TabItem[]
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
}

export function TabBar({ tabs, onSelectTab, onCloseTab }: TabBarProps) {
  if (tabs.length === 0) {
    return null
  }

  return (
    <div className="flex items-center w-full h-9 bg-[var(--bg-surface)] border-b border-[var(--border-default)] overflow-x-auto select-none shrink-0 scrollbar-none">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onSelectTab(tab.id)}
          className={cn(
            "group flex items-center gap-2 h-full px-4 border-r border-[var(--border-default)] cursor-pointer transition-all duration-150 text-xs font-medium",
            tab.isActive
              ? "bg-[var(--bg-page)] text-[var(--text-primary)] border-t border-t-[var(--accent)] font-semibold"
              : "text-[var(--text-secondary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          )}
        >
          <FileIcon name={tab.name} className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate max-w-[120px]">{tab.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCloseTab(tab.id)
            }}
            className="ml-1 p-0.5 rounded-sm hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
