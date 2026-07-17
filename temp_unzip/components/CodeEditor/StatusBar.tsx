'use client'

import { Button } from '@/components/ui/button'

interface StatusBarProps {
  status?: 'draft' | 'unaudited' | 'deployed'
  onDeploy?: () => void
}

export function StatusBar({ status = 'draft', onDeploy }: StatusBarProps) {
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-700 text-gray-100',
    unaudited: 'bg-amber-900/30 text-amber-200 border border-amber-700',
    deployed: 'bg-green-900/30 text-green-200 border border-green-700',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    unaudited: 'Unaudited',
    deployed: 'Deployed',
  }

  return (
    <div className="flex items-center justify-between h-12 px-4 bg-[#1e1e1e] border-b border-gray-800">
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-semibold px-2 py-1 rounded ${
            statusColors[status]
          }`}
        >
          {statusLabels[status]}
        </span>
        {status === 'unaudited' && (
          <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-700 text-gray-100">
            Admin
          </span>
        )}
      </div>
      <Button
        onClick={onDeploy}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
      >
        Deploy
      </Button>
    </div>
  )
}
