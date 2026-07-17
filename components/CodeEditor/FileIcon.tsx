'use client'

import { File, Folder, FileJson, FileCode } from 'lucide-react'

interface FileIconProps {
  name: string
  isFolder?: boolean
  className?: string
}

export function FileIcon({ name, isFolder, className = "h-3.5 w-3.5 shrink-0" }: FileIconProps) {
  if (isFolder) {
    return <Folder className={className} />
  }

  const ext = name.split('.').pop()?.toLowerCase()

  const iconMap: Record<string, React.ReactNode> = {
    rs: <FileCode className={className} />,
    ts: <FileCode className={className} />,
    tsx: <FileCode className={className} />,
    js: <FileCode className={className} />,
    jsx: <FileCode className={className} />,
    json: <FileJson className={className} />,
    toml: <FileCode className={className} />,
    md: <FileCode className={className} />,
    txt: <File className={className} />,
  }

  return iconMap[ext || ''] || <File className={className} />
}
