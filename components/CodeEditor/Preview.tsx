'use client'

import { ChevronDown, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

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
  onExecuteCommand?: (cmd: string) => void
}

export function Preview({
  output = [],
  onClear,
  isExpanded = true,
  onToggleExpand,
  onExecuteCommand,
}: PreviewProps) {
  const [filter, setFilter] = useState<'all' | 'log' | 'error' | 'warn' | 'info'>('all')
  const [commandInput, setCommandInput] = useState('')

  const filteredOutput =
    filter === 'all' ? output : output.filter((line) => line.type === filter)

  const errorCount = output.filter((line) => line.type === 'error').length
  const warnCount = output.filter((line) => line.type === 'warn').length

  const getTypePrefix = (type: string) => {
    switch (type) {
      case 'error': return '❌'
      case 'warn': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '▶'
    }
  }

  const handleCommandSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const cmd = commandInput.trim()
      if (!cmd) return
      setCommandInput('')
      onExecuteCommand?.(cmd)
    }
  }

  const FILTERS = ['all', 'log', 'error', 'warn', 'info'] as const

  return (
    <div className="flex flex-col h-full bg-[#282c34] text-[#abb2bf] font-mono">
      {/* Header */}
      <div className="h-9 border-b border-[#181a1f] bg-[#21252b] flex items-center justify-between px-4 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleExpand?.(!isExpanded)}
            className="p-0.5 rounded-sm hover:bg-[#2c313c] text-[#abb2bf]/80 hover:text-[#abb2bf] transition-all cursor-pointer"
          >
            <ChevronDown size={14} className={cn("transition-transform duration-150", !isExpanded && "transform -rotate-90")} />
          </button>
          <span className="text-xs font-bold text-[#abb2bf] font-sans">
            Output Console
          </span>
          {(errorCount > 0 || warnCount > 0) && (
            <div className="flex items-center gap-1.5 ml-3 select-none">
              {errorCount > 0 && (
                <span className="text-3xs font-mono font-bold bg-[#e06c75]/10 text-[#e06c75] px-1.5 py-0.5 rounded border border-[#e06c75]/15">
                  {errorCount} error{errorCount !== 1 ? 's' : ''}
                </span>
              )}
              {warnCount > 0 && (
                <span className="text-3xs font-mono font-bold bg-[#d19a66]/10 text-[#d19a66] px-1.5 py-0.5 rounded border border-[#d19a66]/15">
                  {warnCount} warning{warnCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onClear}
          title="Clear output"
          className="p-0.5 rounded-sm hover:bg-[#2c313c] text-[#abb2bf]/60 hover:text-[#abb2bf] transition-all cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="h-8 bg-[#21252b] border-b border-[#181a1f] flex items-center px-4 gap-1.5 shrink-0 select-none">
        {FILTERS.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={cn(
              "px-2.5 py-0.5 rounded text-3xs font-mono font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer border",
              filter === type
                ? "bg-[#2c313c] text-[#61afef] border-[#61afef]/30 font-semibold"
                : "text-[#abb2bf]/60 border-transparent hover:bg-[#2c313c] hover:text-[#abb2bf]"
            )}
          >
            {type === 'all' ? 'All' : type}
          </button>
        ))}
      </div>

      {/* Output Area */}
      <div className="flex-grow overflow-y-auto p-4 font-mono text-xs select-text min-h-0 bg-[#282c34] scrollbar-none flex flex-col justify-between">
        <div className="flex-1">
          {filteredOutput.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 my-auto h-full gap-1 select-none">
              <p className="text-xs font-semibold text-[#abb2bf]/50">
                No console logs
              </p>
              <p className="text-4xs font-mono text-[#abb2bf]/40 uppercase tracking-widest">
                Run code or type commands below
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredOutput.map((line) => (
                <div key={line.id} className="flex items-start gap-2.5 py-1.5 border-b border-[#181a1f]/50">
                  <span className="shrink-0 text-3xs">{getTypePrefix(line.type)}</span>
                  <span className={cn(
                    "flex-1 whitespace-pre-wrap leading-relaxed text-xs",
                    line.type === 'error' && "text-[#e06c75] font-medium",
                    line.type === 'warn' && "text-[#d19a66] font-medium",
                    line.type === 'info' && "text-[#61afef] font-medium",
                    line.type === 'log' && "text-[#abb2bf]"
                  )}>
                    {line.message}
                  </span>
                  <span className="text-3xs text-[#5c6370] shrink-0 font-mono self-start mt-0.5 select-none">
                    {line.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Command CLI Input */}
        <div className="flex items-center gap-2 py-2 mt-4 border-t border-[#181a1f] shrink-0">
          <span className="text-[#61afef] font-bold select-none mr-1">$</span>
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleCommandSubmit}
            placeholder="Type cargo build, npm run dev, help..."
            className="flex-1 bg-transparent border-none text-xs font-mono text-[#abb2bf] placeholder-[#5c6370]/50 focus:ring-0 focus:outline-none p-0"
          />
        </div>
      </div>
    </div>
  )
}
