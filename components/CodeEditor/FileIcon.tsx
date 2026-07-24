'use client'

import {
  File,
  Folder,
  FolderOpen,
  FileJson,
  FileCode,
  FileText,
  FileType,
  FileSpreadsheet,
} from 'lucide-react'

interface FileIconProps {
  name: string
  isFolder?: boolean
  isOpen?: boolean
  className?: string
}

export function FileIcon({
  name,
  isFolder,
  isOpen = false,
  className = "h-4 w-4 shrink-0",
}: FileIconProps) {
  if (isFolder) {
    return isOpen ? (
      <FolderOpen className={`${className} text-amber-400 dark:text-amber-400`} />
    ) : (
      <Folder className={`${className} text-amber-400/90 dark:text-amber-400/90`} />
    )
  }

  const ext = name.split('.').pop()?.toLowerCase() ?? ''

  switch (ext) {
    case 'html':
    case 'htm':
      return <FileCode className={`${className} text-orange-500`} />

    case 'css':
    case 'scss':
    case 'less':
      return <FileCode className={`${className} text-sky-400`} />

    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return <FileCode className={`${className} text-yellow-400`} />

    case 'ts':
    case 'tsx':
      return <FileCode className={`${className} text-blue-400`} />

    case 'rs':
    case 'toml':
      return <FileCode className={`${className} text-amber-500`} />

    case 'json':
    case 'jsonc':
      return <FileJson className={`${className} text-emerald-400`} />

    case 'md':
    case 'markdown':
      return <FileText className={`${className} text-purple-400`} />

    case 'txt':
    case 'log':
      return <FileType className={`${className} text-[var(--text-muted)]`} />

    case 'csv':
      return <FileSpreadsheet className={`${className} text-green-400`} />

    default:
      return <File className={`${className} text-[var(--text-muted)]`} />
  }
}
