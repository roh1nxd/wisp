'use client'

import { useState, useRef } from 'react'
import { ArrowUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useUser, useClerk } from '@clerk/nextjs'

const EXAMPLES = [
  'Simple token',
  'To-do list dApp',
  'Voting contract',
  'Tip jar',
]

export function PromptBox({ autofocus = false }: { autofocus?: boolean }) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isSignedIn, isLoaded } = useUser()
  const clerk = useClerk()

  function handleGeneratePrompt() {
    const prompt = value.trim()
    if (!prompt) return

    if (!isLoaded) return

    if (!isSignedIn) {
      clerk.openSignIn({
        forceRedirectUrl: `/workspace?prompt=${encodeURIComponent(prompt)}`
      })
      return
    }

    router.push(`/workspace?prompt=${encodeURIComponent(prompt)}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      e.preventDefault()
      handleGeneratePrompt()
    }
  }

  return (
    <div className="flex flex-col w-full text-left bg-transparent">
      <div className="flex flex-col bg-transparent">
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
          className="w-full bg-transparent border-0 text-sm sm:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:ring-0 focus:outline-none resize-none p-4 pb-2 font-mono"
        />

        <div className="flex items-center justify-end px-4 pb-3 pt-2 border-t border-[var(--border-strong)]/20 select-none">
          <motion.button
            type="button"
            onClick={handleGeneratePrompt}
            disabled={!value.trim()}
            whileHover={value.trim() ? { scale: 1.015 } : {}}
            whileTap={value.trim() ? { scale: 0.98 } : {}}
            className="inline-flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-muted)] text-[var(--accent-text-on)] px-5 py-2.2 rounded-full text-xs font-bold shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer select-none active:scale-97 font-sans"
          >
            <span>Generate</span>
            <ArrowUp className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center mt-4 select-none">
        {EXAMPLES.map((ex) => (
          <motion.button
            key={ex}
            type="button"
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setValue(ex)
              textareaRef.current?.focus()
            }}
            className="inline-flex items-center border border-[var(--border-default)]/80 hover:border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3.5 py-1.8 rounded-full text-2xs font-mono font-semibold transition-all cursor-pointer shadow-3xs"
          >
            {ex}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
