'use client'

import { useState, useMemo } from 'react'
import { StatusBar } from './StatusBar'
import { FileExplorer, FileItem } from './FileExplorer'
import { TabBar, TabItem } from './TabBar'
import { Breadcrumb } from './Breadcrumb'
import { CodeEditor } from './CodeEditor'
import { ChatPanel, Message } from './ChatPanel'
import { Preview } from './Preview'

interface OutputLine {
  id: string
  type: 'log' | 'error' | 'warn' | 'info'
  message: string
  timestamp: Date
}

interface IDELayoutProps {
  files?: FileItem[]
  initialMessages?: Message[]
  onSendMessage?: (message: string) => void
  onDeploy?: () => void
  status?: 'draft' | 'unaudited' | 'deployed'
  isLoading?: boolean
  output?: OutputLine[]
}

export function IDELayout({
  files = [],
  initialMessages = [],
  onSendMessage,
  onDeploy,
  status = 'draft',
  isLoading = false,
  output = [],
}: IDELayoutProps) {
  const [selectedFileId, setSelectedFileId] = useState<string>()
  const [openTabs, setOpenTabs] = useState<Set<string>>(new Set())
  const [previewExpanded, setPreviewExpanded] = useState(true)
  const [outputLines, setOutputLines] = useState<OutputLine[]>(output)

  const selectedFile = useMemo(() => {
    if (!selectedFileId) return null
    const findFile = (items: FileItem[]): FileItem | null => {
      for (const item of items) {
        if (item.id === selectedFileId) return item
        if (item.children) {
          const found = findFile(item.children)
          if (found) return found
        }
      }
      return null
    }
    return findFile(files)
  }, [selectedFileId, files])

  const getFilePath = (fileId: string): string[] => {
    const path: string[] = []
    const findPath = (items: FileItem[], targetId: string): boolean => {
      for (const item of items) {
        if (item.id === targetId) {
          path.push(item.name)
          return true
        }
        if (item.children) {
          if (findPath(item.children, targetId)) {
            path.unshift(item.name)
            return true
          }
        }
      }
      return false
    }
    findPath(files, fileId)
    return path
  }

  const handleSelectFile = (file: FileItem) => {
    setSelectedFileId(file.id)
    setOpenTabs((prev) => new Set([...prev, file.id]))
  }

  const handleSelectTab = (fileId: string) => {
    setSelectedFileId(fileId)
  }

  const handleCloseTab = (fileId: string) => {
    setOpenTabs((prev) => {
      const next = new Set(prev)
      next.delete(fileId)
      return next
    })
    if (selectedFileId === fileId) {
      const remaining = Array.from(openTabs).filter((id) => id !== fileId)
      setSelectedFileId(remaining[0])
    }
  }

  const tabs: TabItem[] = Array.from(openTabs).map((fileId) => {
    const findFile = (items: FileItem[]): FileItem | null => {
      for (const item of items) {
        if (item.id === fileId) return item
        if (item.children) {
          const found = findFile(item.children)
          if (found) return found
        }
      }
      return null
    }
    const file = findFile(files)
    return {
      id: fileId,
      name: file?.name || 'Unknown',
      isActive: fileId === selectedFileId,
    }
  })

  const breadcrumbPath = selectedFileId ? getFilePath(selectedFileId) : []

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-gray-100">
      {/* Top Status Bar */}
      <StatusBar status={status} onDeploy={onDeploy} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - File Explorer */}
        <div className="w-64 flex-shrink-0 overflow-hidden">
          <FileExplorer
            files={files}
            onSelectFile={handleSelectFile}
            selectedFileId={selectedFileId}
          />
        </div>

        {/* Center - Code Editor Pane with Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <TabBar
            tabs={tabs}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
          />

          {/* Breadcrumb */}
          {selectedFile && <Breadcrumb path={breadcrumbPath} />}

          {/* Editor and Preview Split */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Editor */}
            <div className={`${previewExpanded ? 'flex-1' : ''} overflow-hidden`}>
              {selectedFile ? (
                <CodeEditor
                  fileName={selectedFile.name}
                  content={selectedFile.content || ''}
                  readOnly={true}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p className="text-sm">Select a file to view its contents</p>
                </div>
              )}
            </div>

            {/* Preview Panel */}
            {previewExpanded && (
              <div className="h-64 overflow-hidden flex-shrink-0">
                <Preview
                  output={outputLines}
                  onClear={() => setOutputLines([])}
                  isExpanded={previewExpanded}
                  onToggleExpand={setPreviewExpanded}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div className="w-80 flex-shrink-0 overflow-hidden border-l border-gray-800">
          <ChatPanel
            messages={initialMessages}
            onSendMessage={onSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}
