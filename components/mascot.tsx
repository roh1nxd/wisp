'use client'

import { useEffect, useRef } from 'react'

function Eye({ irisRef }: { irisRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className="relative flex h-14 w-9 items-center justify-center overflow-hidden rounded-full bg-white shadow-[inset_0_-4px_8px_rgba(0,0,0,0.15)] sm:h-16 sm:w-10">
      <div
        ref={irisRef}
        className="size-3.5 rounded-full bg-[#0b1020] sm:size-4"
        style={{ willChange: 'transform' }}
      />
    </div>
  )
}

export function Mascot() {
  const rootRef = useRef<HTMLDivElement>(null)
  const leftIris = useRef<HTMLDivElement>(null)
  const rightIris = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Respect reduced motion + skip tracking on touch/coarse pointers (mobile)
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (coarse || reduced) return

    let frame = 0
    let pointer: { x: number; y: number } | null = null

    const MAX = 6 // px the iris can travel from center
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
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none relative mx-auto h-28 w-40 select-none sm:h-32 sm:w-48"
    >
      {/* glow puddle under the mascot */}
      <div
        className="absolute -bottom-2 left-1/2 h-10 w-40 -translate-x-1/2 rounded-full opacity-70 blur-2xl"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(var(--aurora-violet),0.6) 0%, rgba(0,0,0,0) 70%)',
        }}
      />

      {/* glossy body, cropped at the bottom so it peeks up */}
      <div
        className="absolute inset-x-0 top-0 h-40 rounded-[42%_42%_38%_38%/48%_48%_40%_40%] border border-white/20"
        style={{
          background:
            'linear-gradient(160deg, #b9a7ff 0%, #7c68ff 38%, #5b46e0 70%, #3b2fd9 100%)',
          boxShadow:
            'inset 0 8px 18px rgba(255,255,255,0.45), inset 0 -14px 26px rgba(20,10,60,0.55), 0 20px 45px -12px rgba(59,47,217,0.65)',
        }}
      >
        {/* top gloss highlight */}
        <div
          className="absolute left-1/2 top-3 h-8 w-24 -translate-x-1/2 rounded-full opacity-70 blur-md"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 100%)',
          }}
        />

        {/* eyes */}
        <div className="absolute left-1/2 top-8 flex -translate-x-1/2 gap-3 sm:top-9 sm:gap-3.5">
          <Eye irisRef={leftIris} />
          <Eye irisRef={rightIris} />
        </div>
      </div>
    </div>
  )
}
