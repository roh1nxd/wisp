'use client'

import { File, Folder, FileJson, FileCode } from 'lucide-react'

interface FileIconProps {
  name: string
  isFolder?: boolean
}

export function FileIcon({ name, isFolder }: FileIconProps) {
  if (isFolder) {
    return <Folder className="h-4 w-4 text-amber-500" />
  }

  const ext = name.split('.').pop()?.toLowerCase()

  const iconMap: Record<string, React.ReactNode> = {
    rs: <FileCode className="h-4 w-4 text-orange-500" />,
    ts: <FileCode className="h-4 w-4 text-blue-500" />,
    tsx: <FileCode className="h-4 w-4 text-blue-500" />,
    js: <FileCode className="h-4 w-4 text-yellow-600" />,
    jsx: <FileCode className="h-4 w-4 text-yellow-600" />,
    json: <FileJson className="h-4 w-4 text-yellow-500" />,
    toml: <FileCode className="h-4 w-4 text-orange-600" />,
    md: <FileCode className="h-4 w-4 text-blue-400" />,
    txt: <File className="h-4 w-4 text-gray-400" />,
  }

  return iconMap[ext || ''] || <File className="h-4 w-4 text-gray-400" />
}
