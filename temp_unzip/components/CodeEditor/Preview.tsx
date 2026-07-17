'use client'

import { ChevronDown, X } from 'lucide-react'
import { useState } from 'react'

interface OutputLine {
  id: string
  type: 'log' | 'error' | 'warn' | 'info'
  message: string
  timestamp: Date
}

interface PreviewProps {
  output?: OutputLine[]
  onClear?: () => void
  isExpanded?: boolean
  onToggleExpand?: (expanded: boolean) => void
}

export function Preview({
  output = [],
  onClear,
  isExpanded = true,
  onToggleExpand,
}: PreviewProps) {
  const [filter, setFilter] = useState<'all' | 'log' | 'error' | 'warn' | 'info'>('all')

  const filteredOutput =
    filter === 'all' ? output : output.filter((line) => line.type === filter)

  const errorCount = output.filter((line) => line.type === 'error').length
  const warnCount = output.filter((line) => line.type === 'warn').length

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-400'
      case 'warn':
        return 'text-yellow-400'
      case 'info':
        return 'text-blue-400'
      default:
        return 'text-gray-300'
    }
  }

  const getTypePrefix = (type: string) => {
    switch (type) {
      case 'error':
        return '❌'
      case 'warn':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return '▶'
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#252526] border-t border-gray-800">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#2d2d30] border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggleExpand?.(!isExpanded)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <ChevronDown
              size={16}
              className={`transition-transform ${!isExpanded ? '-rotate-90' : ''}`}
            />
          </button>
          <span className="text-sm font-medium text-gray-300">Output</span>
          {(errorCount > 0 || warnCount > 0) && (
            <div className="flex items-center gap-2 ml-2">
              {errorCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-900/30 rounded text-xs text-red-400">
                  {errorCount} error{errorCount !== 1 ? 's' : ''}
                </span>
              )}
              {warnCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-900/30 rounded text-xs text-yellow-400">
                  {warnCount} warning{warnCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onClear}
          className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-gray-200"
          title="Clear output"
        >
          <X size={16} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 bg-[#1e1e1e] border-b border-gray-800 overflow-x-auto">
        {(['all', 'log', 'error', 'warn', 'info'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              filter === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Output Area */}
      <div className="flex-1 overflow-auto font-mono text-xs p-4 space-y-1">
        {filteredOutput.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            <p className="text-sm">No output yet</p>
            <p className="text-xs mt-1 opacity-50">Run code to see output here</p>
          </div>
        ) : (
          filteredOutput.map((line) => (
            <div
              key={line.id}
              className={`flex gap-2 ${getTypeColor(line.type)} whitespace-pre-wrap break-words`}
            >
              <span className="flex-shrink-0">{getTypePrefix(line.type)}</span>
              <span className="flex-1">{line.message}</span>
              <span className="text-gray-600 text-xs flex-shrink-0">
                {line.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
