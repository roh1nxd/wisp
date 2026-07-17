'use client'

import { ChevronRight, FilePlus, FolderPlus, Check, X, Plus } from 'lucide-react'
import { FileIcon } from './FileIcon'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

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
  onCreateFile?: (name: string, type: 'file' | 'folder') => void
}

type CreationMode = 'file' | 'folder' | null

export function FileExplorer({
  files,
  onSelectFile,
  selectedFileId,
  onCreateFile,
}: FileExplorerProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [creationMode, setCreationMode] = useState<CreationMode>(null)
  const [newItemName, setNewItemName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (creationMode && inputRef.current) {
      inputRef.current.focus()
    }
  }, [creationMode])

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

  const handleStartCreation = (mode: CreationMode) => {
    setCreationMode(mode)
    setNewItemName('')
  }

  const handleConfirmCreate = () => {
    const trimmed = newItemName.trim()
    if (!trimmed || !creationMode) {
      setCreationMode(null)
      setNewItemName('')
      return
    }
    onCreateFile?.(trimmed, creationMode)
    setCreationMode(null)
    setNewItemName('')
  }

  const handleCancelCreate = () => {
    setCreationMode(null)
    setNewItemName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleConfirmCreate()
    if (e.key === 'Escape') handleCancelCreate()
  }

  const renderItem = (item: FileItem, depth: number = 0) => {
    const isExpanded = expandedIds.has(item.id)
    const isSelected = selectedFileId === item.id
    const isFolder = item.type === 'folder'

    return (
      <div key={item.id} className="flex flex-col">
        <div
          onClick={() => {
            if (isFolder) {
              toggleExpanded(item.id)
            } else {
              onSelectFile(item)
            }
          }}
          className={cn(
            'flex items-center gap-2 py-1.5 px-3 mx-2 rounded-lg cursor-pointer text-xs transition-colors duration-150 select-none group',
            isSelected
              ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium border-l border-[var(--accent)] rounded-l-none'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
          )}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
          {isFolder ? (
            <ChevronRight className={cn('h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-150', isExpanded && 'transform rotate-90')} />
          ) : (
            <div className="w-3.5 h-3.5 shrink-0" />
          )}
          <FileIcon name={item.name} isFolder={isFolder} className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{item.name}</span>
        </div>
        {isFolder && isExpanded && item.children && (
          <div className="flex flex-col">
            {item.children.map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] text-[var(--text-secondary)] select-none">
      {/* Header */}
      <div className="h-14 border-b border-[var(--border-default)] flex items-center justify-between px-4 shrink-0">
        <h2 className="text-xs font-mono font-bold tracking-widest text-[var(--text-primary)] uppercase select-none">
          Explorer
        </h2>
        {/* New file / folder buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleStartCreation('file')}
            title="New File"
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleStartCreation('folder')}
            title="New Folder"
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* File tree */}
      <div className="flex-grow overflow-y-auto py-3 min-h-0">
        {files.map((item) => renderItem(item))}

        {/* Inline new item input row */}
        {creationMode && (
          <div className="mx-2 mt-1 flex items-center gap-1.5 bg-[var(--bg-elevated)] rounded-lg px-3 py-1.5 border border-[var(--accent)]/40">
            <FileIcon
              name={creationMode === 'file' ? newItemName || 'file' : 'folder'}
              isFolder={creationMode === 'folder'}
              className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]"
            />
            <input
              ref={inputRef}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={creationMode === 'file' ? 'filename.py' : 'folder-name'}
              className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none font-mono min-w-0"
            />
            <button
              onClick={handleConfirmCreate}
              className="text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer shrink-0"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleCancelCreate}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {files.length === 0 && !creationMode && (
          <div className="flex flex-col items-center justify-center py-12 px-5 text-center select-none animate-in fade-in duration-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)]/10 text-[var(--accent)] mb-4 shadow-xs">
              <FilePlus className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">
              No files in workspace
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-4 max-w-[160px]">
              Create a file to start writing your contract.
            </p>
            <button
              onClick={() => handleStartCreation('file')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] transition-colors shadow-2xs cursor-pointer active:scale-98"
            >
              <Plus className="h-3 w-3" />
              <span>New File</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
