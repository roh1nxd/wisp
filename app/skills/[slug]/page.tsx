'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { AppNav } from '@/components/app-nav'
import { renderMarkdown } from '@/components/CodeEditor/MarkdownPreview'
import { Sparkles, Copy, Check, Zap, ArrowLeft, Tag, Heart } from 'lucide-react'

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

type CopiedKey = 'md' | 'wisp'

export default function SkillDetailPage() {
  const { isSignedIn } = useUser()
  const params = useParams()
  const slug = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : ''

  const [skill, setSkill] = useState<SkillItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState<CopiedKey | null>(null)

  // Likes state
  const [likeCount, setLikeCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [signInNotice, setSignInNotice] = useState(false)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/skills?slug=${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) { setNotFound(true); setLoading(false); return null }
        return res.json()
      })
      .then((data) => {
        if (!data) return
        if (data.skill) setSkill(data.skill)
        else setNotFound(true)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })

    // Fetch likes data
    fetch('/api/skills/likes')
      .then((res) => res.json())
      .then((data) => {
        if (data.likes && data.likes[slug] !== undefined) {
          setLikeCount(data.likes[slug])
        }
        if (data.userLikes && data.userLikes.includes(slug)) {
          setIsLiked(true)
        }
      })
      .catch(() => {})
  }, [slug])

  const handleCopy = (key: CopiedKey, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleToggleLike = async () => {
    if (!isSignedIn) {
      setSignInNotice(true)
      setTimeout(() => setSignInNotice(false), 2500)
      return
    }

    const prevLiked = isLiked
    const prevCount = likeCount

    setIsLiked(!prevLiked)
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1)

    try {
      const res = await fetch('/api/skills/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      if (!res.ok) throw new Error('Failed to toggle like')
      const data = await res.json()
      setLikeCount(data.count)
    } catch {
      setIsLiked(prevLiked)
      setLikeCount(prevCount)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] font-sans flex flex-col">
      <AppNav />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        {/* Back */}
        <Link
          href="/skills"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>All Skills</span>
        </Link>

        {loading && (
          <div className="space-y-4">
            <div className="h-8 w-48 rounded-xl bg-[var(--bg-surface)] animate-pulse" />
            <div className="h-4 w-72 rounded-lg bg-[var(--bg-surface)] animate-pulse" />
            <div className="h-64 rounded-2xl bg-[var(--bg-surface)] animate-pulse mt-6" />
          </div>
        )}

        {!loading && notFound && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <Sparkles className="h-8 w-8 text-[var(--text-muted)] opacity-40" />
            <p className="text-sm font-semibold text-[var(--text-secondary)]">Skill not found</p>
            <p className="text-xs text-[var(--text-muted)]">No skill with slug <code className="font-mono">{slug}</code> exists.</p>
            <Link href="/skills" className="mt-2 text-xs font-bold text-[var(--accent)] hover:underline cursor-pointer">
              ← Back to Skills
            </Link>
          </div>
        )}

        {!loading && skill && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--accent)]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Skill Detail
                    </span>
                    <span className="text-[var(--text-muted)]">•</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">
                      <Tag className="h-2.5 w-2.5 text-[var(--accent)]" />
                      {skill.category || 'Code Quality'}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold text-[var(--text-primary)] font-sans">{skill.name}</h1>
                </div>
                <span className="px-2 py-1 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] font-mono text-xs font-bold self-start mt-1">
                  /{skill.slug}
                </span>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-lg">{skill.description}</p>

              {/* Trigger pills */}
              {skill.triggers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] mr-0.5">Triggers:</span>
                  {skill.triggers.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[10px] font-mono font-semibold text-[var(--text-primary)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Copy actions + Like button */}
              <div className="flex items-center gap-3 flex-wrap pt-1">
                <button
                  onClick={() => handleCopy('wisp', `/${skill.slug}`)}
                  title="Copy slash command to paste into Wisp chat"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--accent)]/40 hover:border-[var(--accent)] bg-[var(--accent-soft)] hover:bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-bold transition-all cursor-pointer shadow-3xs active:scale-95"
                >
                  {copied === 'wisp' ? (
                    <><Check className="h-3.5 w-3.5" /><span>Copied!</span></>
                  ) : (
                    <><Zap className="h-3.5 w-3.5" /><span>Copy for Wisp</span></>
                  )}
                </button>
                <button
                  onClick={() => handleCopy('md', skill.rawMarkdown)}
                  title="Copy full SKILL.md for external AI tools"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-elevated)]/70 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition-all cursor-pointer shadow-3xs active:scale-95"
                >
                  {copied === 'md' ? (
                    <><Check className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-500">Copied!</span></>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /><span>Copy SKILL.md</span></>
                  )}
                </button>

                {/* Heart Like button */}
                <div className="relative flex items-center">
                  <button
                    onClick={handleToggleLike}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] text-xs font-mono font-bold transition-all cursor-pointer group shadow-3xs"
                  >
                    <Heart
                      className={`h-3.5 w-3.5 transition-transform group-active:scale-125 ${
                        isLiked ? 'text-rose-500 fill-rose-500' : 'text-[var(--text-muted)] group-hover:text-rose-500'
                      }`}
                    />
                    <span className={isLiked ? 'text-rose-500 font-bold' : 'text-[var(--text-primary)]'}>
                      {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
                    </span>
                  </button>

                  {/* Signed out notice */}
                  {signInNotice && (
                    <div className="absolute left-full ml-2 whitespace-nowrap bg-slate-900 text-white text-[10px] font-mono px-2.5 py-1 rounded shadow-lg border border-slate-700">
                      Sign in to like skills
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Instruction body */}
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border-default)]/70 bg-[var(--bg-page)]/40">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  Instruction Body (SKILL.md)
                </span>
              </div>
              <div className="p-5">
                <div
                  className="text-xs text-[var(--text-primary)] leading-relaxed font-sans markdown-body select-text"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(skill.rawMarkdown) }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
