'use client'

import { ChevronRight, FilePlus, FolderPlus, Check, X, Plus, Pencil, Trash2 } from 'lucide-react'
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
  onDeleteFile?: (fileId: string) => void
  onRenameFile?: (fileId: string, newName: string) => void
}

type CreationMode = 'file' | 'folder' | null

export function FileExplorer({
  files,
  onSelectFile,
  selectedFileId,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
}: FileExplorerProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [creationMode, setCreationMode] = useState<CreationMode>(null)
  const [isCreatingAtRoot, setIsCreatingAtRoot] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<FileItem | null>(null)
  const [explorerError, setExplorerError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (creationMode && inputRef.current) {
      inputRef.current.focus()
    }
  }, [creationMode])

  useEffect(() => {
    if (editingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [editingId])

  const showDuplicateError = (name: string, targetDir: string) => {
    const loc = targetDir ? `in folder '${targetDir.split('/').pop()}'` : 'at root'
    setExplorerError(`A file or folder named '${name}' already exists ${loc}.`)
    setTimeout(() => setExplorerError(null), 4000)
  }

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

  const handleStartCreation = (mode: CreationMode, atRoot: boolean = false) => {
    setIsCreatingAtRoot(atRoot)
    setCreationMode(mode)
    setNewItemName('')
  }

  const checkDuplicateName = (targetFolder: string, newName: string): boolean => {
    const normNewName = newName.toLowerCase().trim()
    const getSiblings = (nodes: FileItem[], folderPath: string): FileItem[] => {
      if (!folderPath) return nodes
      for (const node of nodes) {
        if (node.type === 'folder' && node.id === folderPath) {
          return node.children || []
        }
        if (node.children) {
          const found = getSiblings(node.children, folderPath)
          if (found.length > 0) return found
        }
      }
      return []
    }

    const siblings = getSiblings(files, targetFolder)
    return siblings.some((item) => item.name.toLowerCase() === normNewName)
  }

  const handleDropRoot = (e: React.DragEvent) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/plain')
    if (!draggedId) return
    const fileName = draggedId.split('/').pop() || draggedId
    if (draggedId !== fileName) {
      if (checkDuplicateName('', fileName)) {
        showDuplicateError(fileName, '')
        return
      }
      onRenameFile?.(draggedId, fileName)
    }
  }

function getTargetFolder(files: FileItem[], selectedId?: string): string {
  if (!selectedId) return ''
  const findNode = (nodes: FileItem[]): FileItem | undefined => {
    for (const n of nodes) {
      if (n.id === selectedId) return n
      if (n.children) {
        const found = findNode(n.children)
        if (found) return found
      }
    }
    return undefined
  }
  const item = findNode(files)
  if (!item) return ''
  if (item.type === 'folder') return item.id
  if (item.id.includes('/')) return item.id.slice(0, item.id.lastIndexOf('/'))
  return ''
}

  const handleConfirmCreate = () => {
    const trimmed = newItemName.trim()
    if (!trimmed || !creationMode) {
      setCreationMode(null)
      setIsCreatingAtRoot(false)
      setNewItemName('')
      return
    }
    const targetFolder = isCreatingAtRoot ? '' : getTargetFolder(files, selectedFileId)
    if (checkDuplicateName(targetFolder, trimmed)) {
      showDuplicateError(trimmed, targetFolder)
      setCreationMode(null)
      setIsCreatingAtRoot(false)
      setNewItemName('')
      return
    }

    const fullPath = targetFolder ? `${targetFolder}/${trimmed}` : trimmed
    if (targetFolder) {
      setExpandedIds((prev) => new Set(prev).add(targetFolder))
    }
    onCreateFile?.(fullPath, creationMode)
    setCreationMode(null)
    setIsCreatingAtRoot(false)
    setNewItemName('')
  }

  const handleCancelCreate = () => {
    setCreationMode(null)
    setIsCreatingAtRoot(false)
    setNewItemName('')
  }

  const handleStartRename = (item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(item.id)
    setRenameValue(item.name)
  }

  const handleConfirmRename = (item: FileItem) => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== item.name) {
      const parentFolder = getTargetFolder(files, item.id)
      if (checkDuplicateName(parentFolder, trimmed)) {
        showDuplicateError(trimmed, parentFolder)
        setEditingId(null)
        setRenameValue('')
        return
      }
      onRenameFile?.(item.id, trimmed)
    }
    setEditingId(null)
    setRenameValue('')
  }

  const handleStartDelete = (item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDeleteTarget(item)
  }

  const handleConfirmDelete = () => {
    if (confirmDeleteTarget) {
      onDeleteFile?.(confirmDeleteTarget.id)
      setConfirmDeleteTarget(null)
    }
  }

  const handleKeyDownCreate = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleConfirmCreate()
    if (e.key === 'Escape') handleCancelCreate()
  }

  const handleKeyDownRename = (e: React.KeyboardEvent<HTMLInputElement>, item: FileItem) => {
    if (e.key === 'Enter') handleConfirmRename(item)
    if (e.key === 'Escape') setEditingId(null)
  }

  const handleDragStart = (e: React.DragEvent, item: FileItem) => {
    e.dataTransfer.setData('text/plain', item.id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetItem: FileItem) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/plain')
    if (!draggedId || draggedId === targetItem.id) return

    const targetFolder = targetItem.type === 'folder' ? targetItem.id : ''
    const fileName = draggedId.split('/').pop() || draggedId
    const newPath = targetFolder ? `${targetFolder}/${fileName}` : fileName

    if (draggedId !== newPath) {
      if (checkDuplicateName(targetFolder, fileName)) {
        showDuplicateError(fileName, targetFolder)
        return
      }
      onRenameFile?.(draggedId, newPath)
    }
  }

  const renderItem = (item: FileItem, depth: number = 0) => {
    const isExpanded = expandedIds.has(item.id)
    const isSelected = selectedFileId === item.id
    const isFolder = item.type === 'folder'
    const isEditing = editingId === item.id

    return (
      <div key={item.id} className="flex flex-col">
        <div
          draggable={!isEditing}
          onDragStart={(e) => handleDragStart(e, item)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, item)}
          onClick={() => {
            if (isEditing) return
            if (isFolder) {
              toggleExpanded(item.id)
            } else {
              onSelectFile(item)
            }
          }}
          className={cn(
            'flex items-center gap-2 py-1.5 px-2.5 mx-1.5 rounded-lg cursor-pointer text-xs transition-colors duration-150 select-none group relative min-h-[34px]',
            isSelected
              ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold border-l-2 border-[var(--accent)] shadow-3xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
          )}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
        >
          {isFolder ? (
            <ChevronRight className={cn('h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-150 shrink-0', isExpanded && 'transform rotate-90')} />
          ) : (
            <div className="w-3.5 h-3.5 shrink-0" />
          )}
          <FileIcon name={item.name} isFolder={isFolder} isOpen={isExpanded} className="h-4 w-4 shrink-0" />

          {isEditing ? (
            <div className="flex-1 flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => handleKeyDownRename(e, item)}
                onBlur={() => handleConfirmRename(item)}
                className="flex-1 bg-[var(--bg-elevated)] border border-[var(--accent)] text-xs text-[var(--text-primary)] px-1 py-0.5 rounded outline-none font-mono min-w-0"
              />
            </div>
          ) : (
            <>
              <span className="truncate flex-1">{item.name}</span>

              {/* Hover Actions: Rename & Delete */}
              <div className="hidden group-hover:flex items-center gap-1 opacity-80 hover:opacity-100 shrink-0">
                <button
                  onClick={(e) => handleStartRename(item, e)}
                  title="Rename file"
                  className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => handleStartDelete(item, e)}
                  title="Delete file"
                  className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </>
          )}
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
    <div className="flex flex-col h-full bg-[var(--bg-surface)] text-[var(--text-secondary)] select-none relative">
      {/* Header */}
      <div className="h-14 border-b border-[var(--border-default)] flex items-center justify-between px-4 shrink-0">
        <h2 className="text-xs font-mono font-bold tracking-widest text-[var(--text-primary)] uppercase select-none">
          Explorer
        </h2>
        {/* New file / folder buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleStartCreation('file', true)}
            title="New File at Root"
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleStartCreation('folder', true)}
            title="New Folder at Root"
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Explorer Error Banner */}
      {explorerError && (
        <div className="mx-2 my-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-2xs font-sans flex items-center justify-between animate-in fade-in shrink-0">
          <span className="truncate pr-1">{explorerError}</span>
          <button onClick={() => setExplorerError(null)} className="hover:text-white shrink-0">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* File tree */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDropRoot}
        className="flex-grow overflow-y-auto py-3 min-h-0"
      >
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
              onKeyDown={handleKeyDownCreate}
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

      {/* Delete Confirmation Modal */}
      {confirmDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-5 max-w-xs w-full shadow-xl space-y-4">
            <div className="space-y-1 text-center">
              <h3 className="text-sm font-bold text-[var(--text-primary)] font-sans">
                Delete {confirmDeleteTarget.name}?
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                This cannot be undone. Are you sure you want to delete this {confirmDeleteTarget.type}?
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setConfirmDeleteTarget(null)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
