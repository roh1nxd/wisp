'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { Clock, Code2, ArrowRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectMeta {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  status: 'draft' | 'unaudited' | 'deployed'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function StatusBadge({ status }: { status: string }) {
  const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className={cn(
      "text-3xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border select-none",
      status === 'deployed' && "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/15",
      status === 'unaudited' && "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/15",
      status === 'draft' && "bg-[var(--text-secondary)]/15 text-[var(--text-secondary)] border-[var(--border-default)]"
    )}>
      {formattedStatus}
    </span>
  )
}

export default function RecentProjects({ userId }: { userId: string }) {
  const { isLoaded } = useAuth()
  const [projects, setProjects] = useState<ProjectMeta[]>([])
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !isLoaded) {
      return
    }
    let active = true

    const loadDbProjects = async () => {
      try {
        const res = await fetch('/api/projects', {
          credentials: 'same-origin',
        })
        if (!res.ok) throw new Error('Failed to load projects')
        const data = await res.json()
        if (active) {
          setProjects(data.projects || [])
        }
      } catch (err) {
        console.error('Error fetching database projects:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDbProjects()
    return () => { active = false }
  }, [mounted, isLoaded])

  const handleContinue = (id: string) => {
    if (userId) localStorage.setItem(`wisp_active_project_${userId}`, id)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const previousProjects = [...projects]
    setProjects((prev) => prev.filter((p) => p.id !== id))

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error('Failed to delete project')

      const keys = ['_files', '_messages', '_status']
      keys.forEach((k) => localStorage.removeItem(`wisp_proj_${id}${k}`))
      if (userId && localStorage.getItem(`wisp_active_project_${userId}`) === id) {
        localStorage.removeItem(`wisp_active_project_${userId}`)
      }
    } catch (err) {
      console.error('Database deletion failed:', err)
      setProjects(previousProjects)
    }
  }

  if (!mounted || loading) {
    return (
      <div className="flex justify-center items-center py-12 select-none">
        <svg className="h-6 w-6 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl gap-3 shadow-3xs max-w-sm mx-auto select-none">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/10">
          <Code2 className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          No projects yet
        </p>
        <p className="text-xs text-[var(--text-secondary)] max-w-[240px] leading-relaxed">
          Describe what you want to build in the prompt box above to get started!
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full">
      <h2 className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-[var(--text-primary)] uppercase select-none mb-5">
        <Clock className="h-4 w-4 text-[var(--accent)]" />
        Recent Projects
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/workspace?project=${project.id}`}
            onClick={() => handleContinue(project.id)}
            className="group flex flex-col justify-between p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] transition-all duration-300 shadow-3xs hover:shadow-2xs cursor-pointer select-none"
          >
            <div className="flex items-start gap-3 w-full mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-page)] text-[var(--text-secondary)] group-hover:text-[var(--accent)] group-hover:bg-[var(--accent-soft)] border border-[var(--border-default)] transition-colors">
                <Code2 className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)] truncate font-sans">
                  {project.name}
                </p>
                <p className="text-2xs text-[var(--text-muted)] mt-0.5">
                  Updated {timeAgo(project.updatedAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between w-full border-t border-[var(--border-default)]/30 pt-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={project.status} />
                <button
                  onClick={(e) => handleDelete(project.id, e)}
                  title="Delete project"
                  className="p-1 rounded-md text-[var(--text-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-all transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
