"use client"

import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

function Eye({ irisRef }: { irisRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className="relative w-7.5 h-7.5 bg-white/95 rounded-full border border-[var(--border-strong)]/30 shadow-xs flex items-center justify-center overflow-hidden select-none">
      <div
        ref={irisRef}
        className="w-3.5 h-3.5 bg-[var(--text-primary)] rounded-full transition-transform duration-75"
      />
    </div>
  )
}

export function Mascot({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const leftIris = useRef<HTMLDivElement>(null)
  const rightIris = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    // Respect reduced motion + skip tracking on touch/coarse pointers (mobile)
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (coarse || reduced) return

    let frame = 0
    let pointer: { x: number; y: number } | null = null

    const MAX = 5 // px the iris can travel from center
    const EASE = 0.15 // lower = smoother/slower trailing

    // current (eased) offset per iris, kept between frames
    const state = new Map<HTMLDivElement, { x: number; y: number }>()

    function targetFor(iris: HTMLDivElement) {
      if (!pointer) return { x: 0, y: 0 }
      const eye = iris.parentElement
      if (!eye) return { x: 0, y: 0 }
      const r = eye.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = pointer.x - cx
      const dy = pointer.y - cy
      const dist = Math.hypot(dx, dy) || 1
      const travel = Math.min(MAX, dist / 25)
      return { x: (dx / dist) * travel, y: (dy / dist) * travel }
    }

    // continuous loop eases each iris toward its target for fluid motion
    function tick() {
      let moving = false
      for (const iris of [leftIris.current, rightIris.current]) {
        if (!iris) continue
        const cur = state.get(iris) ?? { x: 0, y: 0 }
        const tgt = targetFor(iris)
        cur.x += (tgt.x - cur.x) * EASE
        cur.y += (tgt.y - cur.y) * EASE
        state.set(iris, cur)
        iris.style.transform = `translate(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px)`
        if (Math.abs(tgt.x - cur.x) > 0.05 || Math.abs(tgt.y - cur.y) > 0.05) {
          moving = true
        }
      }
      // keep animating while still easing; otherwise idle until next move
      frame = moving ? requestAnimationFrame(tick) : 0
    }

    function onMove(e: MouseEvent) {
      pointer = { x: e.clientX, y: e.clientY }
      if (!frame) frame = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <motion.div
      ref={rootRef}
      aria-hidden="true"
      initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
      whileInView={shouldReduceMotion ? {} : { opacity: 0.8, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn("relative flex flex-col items-center justify-center select-none overflow-visible opacity-80 hover:opacity-95 transition-all duration-300", className)}
    >
      {/* glow puddle under the mascot */}
      <div className="absolute -bottom-2 w-[85%] h-3 bg-[var(--accent)]/10 rounded-full blur-md" />

      {/* glossy body, fully rounded out */}
      <div className="relative w-full h-full bg-gradient-to-b from-[var(--bg-surface)]/75 to-[var(--bg-elevated)]/75 rounded-full border border-[var(--border-strong)]/45 shadow-[0_8px_32px_rgba(28,27,23,0.03)] backdrop-blur-3xs flex items-center justify-center overflow-hidden">
        {/* top gloss highlight */}
        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

        {/* eyes */}
        <div className="flex gap-3.5 items-center justify-center z-10">
          <Eye irisRef={leftIris} />
          <Eye irisRef={rightIris} />
        </div>
      </div>
    </motion.div>
  )
}
