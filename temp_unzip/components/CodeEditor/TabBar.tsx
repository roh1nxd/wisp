'use client'

import { X } from 'lucide-react'
import { FileIcon } from './FileIcon'

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
    <div className="flex items-center gap-0 bg-[#1e1e1e] border-b border-gray-800 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex items-center gap-2 px-3 py-2 border-b-2 cursor-pointer transition-colors group ${
            tab.isActive
              ? 'border-b-blue-500 text-gray-100 bg-[#252526]'
              : 'border-b-transparent text-gray-400 hover:bg-[#252526]/50'
          }`}
          onClick={() => onSelectTab(tab.id)}
        >
          <FileIcon name={tab.name} />
          <span className="text-sm whitespace-nowrap">{tab.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCloseTab(tab.id)
            }}
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-700 rounded"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
