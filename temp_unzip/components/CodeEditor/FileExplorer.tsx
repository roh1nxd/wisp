'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { FileIcon } from './FileIcon'

export interface FileItem {
  id: string
  name: string
  type: 'file' | 'folder'
  children?: FileItem[]
  language?: string
  content?: string
}

interface FileExplorerProps {
  files: FileItem[]
  onSelectFile: (file: FileItem) => void
  selectedFileId?: string
}

export function FileExplorer({
  files,
  onSelectFile,
  selectedFileId,
}: FileExplorerProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const renderItem = (item: FileItem, depth: number = 0) => {
    const isExpanded = expandedIds.has(item.id)
    const isSelected = selectedFileId === item.id
    const isFolder = item.type === 'folder'

    return (
      <div key={item.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1 cursor-pointer transition-colors ${
            isSelected
              ? 'bg-blue-900/30 text-blue-100'
              : 'hover:bg-white/5 text-gray-300'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (isFolder) {
              toggleExpanded(item.id)
            } else {
              onSelectFile(item)
            }
          }}
        >
          {isFolder && (
            <ChevronRight
              className={`h-4 w-4 transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          )}
          {!isFolder && <div className="w-4" />}
          <FileIcon name={item.name} isFolder={isFolder} />
          <span className="text-sm font-medium truncate">{item.name}</span>
        </div>
        {isFolder && isExpanded && item.children && (
          <div>
            {item.children.map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full bg-[#1e1e1e] border-r border-gray-800 overflow-y-auto">
      <div className="p-3 border-b border-gray-800">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Explorer
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {files.map((item) => renderItem(item))}
      </div>
    </div>
  )
}
