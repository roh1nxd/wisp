'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { AppNav } from '@/components/app-nav'
import {
  Sparkles, Copy, Check, ExternalLink, Terminal, Share2, Zap, ChevronRight, Search, Heart, Tag
} from 'lucide-react'

interface SkillItem {
  name: string
  slug: string
  description: string
  triggers: string[]
  body: string
  rawMarkdown: string
  conflicts?: string[]
  category?: string
}

type CopiedKey = `${string}-md` | `${string}-wisp`

const CATEGORIES = [
  'All',
  'Code Quality',
  'Design/Frontend',
  'Planning/PRD',
  'Smart Contracts',
  'Communication',
  'Testing/QA',
]

export default function SkillsPage() {
  const { isSignedIn } = useUser()
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<CopiedKey | null>(null)

  // Search & Category state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Likes state
  const [likesMap, setLikesMap] = useState<Record<string, number>>({})
  const [userLikes, setUserLikes] = useState<string[]>([])
  const [signInNotice, setSignInNotice] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/skills')
      .then((res) => res.json())
      .then((data) => {
        if (data.skills) setSkills(data.skills)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Fetch likes data
    fetch('/api/skills/likes')
      .then((res) => res.json())
      .then((data) => {
        if (data.likes) setLikesMap(data.likes)
        if (data.userLikes) setUserLikes(data.userLikes)
      })
      .catch(() => {})
  }, [])

  const handleCopy = (key: CopiedKey, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleToggleLike = async (slug: string) => {
    if (!isSignedIn) {
      setSignInNotice(slug)
      setTimeout(() => setSignInNotice(null), 2500)
      return
    }

    const isCurrentlyLiked = userLikes.includes(slug)
    const currentCount = likesMap[slug] || 0

    // Optimistic UI update
    setUserLikes((prev) =>
      isCurrentlyLiked ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
    setLikesMap((prev) => ({
      ...prev,
      [slug]: isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
    }))

    try {
      const res = await fetch('/api/skills/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      if (!res.ok) throw new Error('Failed to toggle like')
      const data = await res.json()
      // Re-sync exact count from server
      setLikesMap((prev) => ({ ...prev, [slug]: data.count }))
    } catch {
      // Revert optimistic update on failure
      setUserLikes((prev) =>
        isCurrentlyLiked ? [...prev, slug] : prev.filter((s) => s !== slug)
      )
      setLikesMap((prev) => ({ ...prev, [slug]: currentCount }))
    }
  }

  // Combined search + category filter (AND logic)
  const filteredSkills = skills.filter((skill) => {
    const categoryMatch =
      selectedCategory === 'All' ||
      (skill.category || 'Code Quality').toLowerCase() === selectedCategory.toLowerCase()

    if (!categoryMatch) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const nameMatch = skill.name.toLowerCase().includes(q)
      const descMatch = skill.description.toLowerCase().includes(q)
      const slugMatch = skill.slug.toLowerCase().includes(q)
      const triggerMatch = skill.triggers.some((t) => t.toLowerCase().includes(q))
      return nameMatch || descMatch || slugMatch || triggerMatch
    }

    return true
  })

  // Sort: most liked skills first, ties broken by original array order
  const sortedSkills = [...filteredSkills].sort((a, b) => {
    const countA = likesMap[a.slug] || 0
    const countB = likesMap[b.slug] || 0
    return countB - countA
  })

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] font-sans flex flex-col">
      <AppNav />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[var(--accent)] mb-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Skills</span>
            </div>
            <h1 className="text-xl font-bold font-sans text-[var(--text-primary)]">Custom Instruction Skills</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 max-w-lg leading-relaxed">
              Behaviour bundles that extend AI generation. Invoke via slash command or auto-applied by keyword.
            </p>
          </div>
          <Link
            href="/workspace"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
          >
            <span>Open Workspace</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Search Bar + Category Pills */}
        <div className="flex flex-col gap-4 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-4 shadow-3xs">
          {/* Search Input */}
          <div className="relative flex items-center w-full">
            <Search className="absolute left-3.5 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills by name, description, or trigger keyword…"
              className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] focus:border-[var(--accent)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors font-sans shadow-3xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] font-mono px-1.5 py-0.5 rounded hover:bg-[var(--bg-elevated)]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar select-none">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent)] text-[var(--accent-text-on)] shadow-3xs scale-[1.02]'
                      : 'bg-[var(--bg-page)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {/* How to use — visually secondary */}
        <details className="group rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]/60 text-[var(--text-secondary)]">
          <summary className="flex items-center gap-2 cursor-pointer px-4 py-3 text-xs font-semibold text-[var(--text-muted)] select-none list-none hover:text-[var(--text-secondary)] transition-colors">
            <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
            How to use skills
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 pb-4 pt-1">
            <div className="rounded-lg border border-[var(--border-default)]/70 bg-[var(--bg-page)]/60 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-secondary)]">
                <Terminal className="h-3.5 w-3.5 text-[var(--accent)]" />
                In-App — Slash Commands &amp; Auto-Apply
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Type{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--accent)] font-mono font-bold text-[10px]">/slug</code>{' '}
                in chat to explicitly load a skill. Or just type trigger keywords — Wisp auto-applies matching skills. Use{' '}
                <strong className="text-[var(--text-primary)]">Copy for Wisp</strong> on any card to grab the slash command.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border-default)]/70 bg-[var(--bg-page)]/60 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-secondary)]">
                <Share2 className="h-3.5 w-3.5 text-[var(--accent)]" />
                External — Copy for Any AI Tool
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Each <code className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] font-mono text-[10px]">SKILL.md</code> body is plain markdown. Use{' '}
                <strong className="text-[var(--text-primary)]">Copy SKILL.md</strong> and paste into system prompts in Claude Code, Cursor, ChatGPT custom instructions, etc.
              </p>
            </div>
          </div>
        </details>

        {/* Skills grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">
                {selectedCategory === 'All' ? 'Available Skills' : `${selectedCategory} Skills`}
              </h2>
              <span className="text-[10px] font-mono text-[var(--text-muted)] opacity-60">({sortedSkills.length})</span>
            </div>

            {(searchQuery || selectedCategory !== 'All') && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('All') }}
                className="text-[11px] font-mono text-[var(--accent)] hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] animate-pulse" />
              ))}
            </div>
          ) : sortedSkills.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center p-12 text-center bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-page)] text-[var(--text-muted)] border border-[var(--border-default)]">
                <Search className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)] font-sans">No skills match</p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm">
                No skills found matching &quot;{searchQuery}&quot;{selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}. Try clearing your search or switching category filters.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('All') }}
                className="px-3.5 py-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-bold transition-all cursor-pointer hover:bg-[var(--accent)]/15 mt-1"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedSkills.map((skill) => {
                const mdKey: CopiedKey = `${skill.slug}-md`
                const wispKey: CopiedKey = `${skill.slug}-wisp`
                const mdCopied = copied === mdKey
                const wispCopied = copied === wispKey
                const isLiked = userLikes.includes(skill.slug)
                const count = likesMap[skill.slug] || 0
                const showNotice = signInNotice === skill.slug

                return (
                  <div
                    key={skill.slug}
                    className="flex flex-col rounded-2xl border border-[var(--border-default)] hover:border-[var(--accent)]/40 bg-[var(--bg-surface)] shadow-xs transition-all duration-150 overflow-hidden relative"
                  >
                    {/* Card body */}
                    <div className="flex-1 p-4 space-y-2.5">
                      {/* Name + Category + slug tag */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase text-[var(--text-muted)]">
                            <Tag className="h-2.5 w-2.5 text-[var(--accent)]" />
                            {skill.category || 'Code Quality'}
                          </span>
                          <h3 className="text-sm font-bold text-[var(--text-primary)] font-sans leading-tight">
                            {skill.name}
                          </h3>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] font-mono text-[9px] font-bold shrink-0 mt-0.5">
                          /{skill.slug}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                        {skill.description}
                      </p>

                      {/* Trigger pills */}
                      {skill.triggers.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          <span className="text-[9px] font-mono uppercase text-[var(--text-muted)] self-center mr-0.5">Triggers:</span>
                          {skill.triggers.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-[var(--bg-page)] border border-[var(--border-default)] text-[9px] font-mono text-[var(--text-primary)] font-semibold"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card footer */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-[var(--border-default)]/70 bg-[var(--bg-page)]/40">
                      {/* View detail + Like button */}
                      <div className="flex items-center gap-2.5 relative">
                        <Link
                          href={`/skills/${skill.slug}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>View</span>
                        </Link>

                        {/* Heart Like button */}
                        <div className="relative flex items-center">
                          <button
                            onClick={() => handleToggleLike(skill.slug)}
                            title={isLiked ? 'Unlike skill' : 'Like skill'}
                            className="inline-flex items-center gap-1 text-[11px] font-mono font-bold transition-colors cursor-pointer group"
                          >
                            <Heart
                              className={`h-3.5 w-3.5 transition-transform group-active:scale-125 ${
                                isLiked
                                  ? 'text-rose-500 fill-rose-500'
                                  : 'text-[var(--text-muted)] group-hover:text-rose-500'
                              }`}
                            />
                            <span className={isLiked ? 'text-rose-500 font-bold' : 'text-[var(--text-muted)]'}>
                              {count}
                            </span>
                          </button>

                          {/* Signed-out tooltip message */}
                          {showNotice && (
                            <div className="absolute bottom-full left-0 mb-1 z-30 whitespace-nowrap bg-slate-900 text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg animate-fade-in border border-slate-700">
                              Sign in to like skills
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Two copy buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopy(wispKey, `/${skill.slug}`)}
                          title="Copy slash command to paste into Wisp chat"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--accent)]/40 hover:border-[var(--accent)] bg-[var(--accent-soft)] hover:bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] font-bold transition-all cursor-pointer shadow-3xs active:scale-95"
                        >
                          {wispCopied ? (
                            <><Check className="h-3 w-3" /><span>Copied!</span></>
                          ) : (
                            <><Zap className="h-3 w-3" /><span>Copy for Wisp</span></>
                          )}
                        </button>
                        <button
                          onClick={() => handleCopy(mdKey, skill.rawMarkdown)}
                          title="Copy full SKILL.md for external AI tools"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-elevated)]/70 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-semibold transition-all cursor-pointer shadow-3xs active:scale-95"
                        >
                          {mdCopied ? (
                            <><Check className="h-3 w-3 text-emerald-500" /><span className="text-emerald-500">Copied!</span></>
                          ) : (
                            <><Copy className="h-3 w-3" /><span>Copy SKILL.md</span></>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
