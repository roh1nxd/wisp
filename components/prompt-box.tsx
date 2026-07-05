'use client'

import { useState, useRef } from 'react'
import { ArrowUp, Loader2, Globe, Link2 } from 'lucide-react'
import { useAuth, useClerk } from '@clerk/nextjs'
import { generateProject } from '@/lib/api'

const EXAMPLES = [
  'Refundable crowdfund',
  'Membership NFT',
  'Marketplace escrow',
  'Token-gated vault',
]

export function PromptBox({
  autofocus = false,
  redirectAfter = '/dashboard',
}: {
  autofocus?: boolean
  redirectAfter?: string
}) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { isSignedIn } = useAuth()
  const clerk = useClerk()

  async function handleGeneratePrompt() {
    const prompt = value.trim()
    if (!prompt || loading) return

    // Signed-out users are prompted to sign up before generating.
    if (!isSignedIn) {
      clerk.openSignUp({ forceRedirectUrl: redirectAfter })
      return
    }

    setError(null)
    setLoading(true)
    try {
      // TODO: connect to POST /api/projects/generate
      await generateProject(prompt)
      setValue('')
    } catch {
      setError('Generation is not wired up yet. Connect POST /api/projects/generate.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      e.preventDefault()
      handleGeneratePrompt()
    }
  }

  return (
    <div className="w-full">
      <div className="glass-strong relative rounded-3xl p-2.5">
        <label htmlFor="wisp-prompt" className="sr-only">
          Describe the app you want to build on Stellar
        </label>
        <textarea
          id="wisp-prompt"
          ref={textareaRef}
          autoFocus={autofocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder="Describe the app you want to build on Stellar..."
          className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        />

        <div className="flex items-center justify-between px-2 pb-1 pt-1">
          {/* left icon buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Add a reference link"
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <Link2 className="size-[18px]" />
            </button>
            <button
              type="button"
              aria-label="Browse templates"
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <Globe className="size-[18px]" />
            </button>
          </div>

          {/* right action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGeneratePrompt}
              disabled={!value.trim() || loading}
              className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.03] disabled:opacity-40 disabled:hover:scale-100"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Generate
                  <ArrowUp className="size-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setValue(ex)
              textareaRef.current?.focus()
            }}
            className="glass rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {ex}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">{error}</p>
      ) : null}
    </div>
  )
}
