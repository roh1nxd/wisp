'use client'

import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'
import { PromptBox } from '@/components/prompt-box'
import { KineticGrid } from '@/components/kinetic-grid'

export function Hero() {
  const shouldReduceMotion = useReducedMotion()

  // subtle cursor-based parallax tilt for the prompt card
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const rotateX = useSpring(rx, { stiffness: 150, damping: 18 })
  const rotateY = useSpring(ry, { stiffness: 150, damping: 18 })
  const glareX = useTransform(rotateY, [-5, 5], ['0%', '100%'])
  const glare = useTransform(
    glareX,
    (x) => `radial-gradient(600px circle at ${x} 0%, rgba(200, 92, 57, 0.06), transparent 45%)`,
  )

  function handleTilt(e: React.MouseEvent<HTMLDivElement>) {
    if (shouldReduceMotion) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    ry.set(px * 8)
    rx.set(-py * 8)
  }
  function resetTilt() {
    rx.set(0)
    ry.set(0)
  }

  const fadeUp = (delay = 0) =>
    shouldReduceMotion
      ? { initial: {}, animate: {}, transition: {} }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
        }

  return (
    <section className="relative overflow-hidden bg-[var(--bg-page)] py-20 sm:py-28 md:py-36 min-h-[85vh] flex flex-col items-center justify-center">
      {/* Interactive Dot Grid Background */}
      <div className="absolute inset-0 z-0 select-none">
        <KineticGrid 
          dotColor="rgba(200, 92, 57, 0.18)" 
          lineColor="rgba(200, 92, 57, 0.09)" 
          trailColor="rgba(200, 92, 57, 0.45)"
          dotRadius={1.5}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 flex flex-col items-center text-center gap-6">
        {/* Badge */}
        <motion.div {...fadeUp(0)} className="z-10 select-none">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/15 bg-[var(--accent-soft)] px-3 py-1 text-xs font-mono font-medium text-[var(--accent)] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            Testnet-first. Audited templates.
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div {...fadeUp(0.08)} className="z-10">
          <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.1] max-w-3xl">
            Describe your idea.<br />
            <span className="text-[var(--accent)]">Soroban builds it.</span>
          </h1>
        </motion.div>

        {/* Subtext */}
        <motion.div {...fadeUp(0.18)} className="z-10">
          <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl leading-relaxed">
            Wisp turns a plain-English prompt into a working Stellar smart
            contract and frontend—generated, tested, and deployed.
          </p>
        </motion.div>

        {/* Prompt box with tilt */}
        <motion.div
          onMouseMove={handleTilt}
          onMouseLeave={resetTilt}
          className="w-full max-w-2xl mt-4 z-10"
        >
          <motion.div
            style={{
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d',
            }}
            className="relative rounded-2xl border border-[var(--border-strong)]/70 bg-[var(--bg-surface)]/70 backdrop-blur-md p-1.5 shadow-[0_8px_35px_rgba(28,27,23,0.03)] focus-within:shadow-[0_12px_50px_rgba(200,92,57,0.09)] focus-within:border-[var(--accent)] transition-all duration-300 overflow-hidden"
          >
            <PromptBox />
            <motion.div
              style={{ background: glare }}
              className="pointer-events-none absolute inset-0 mix-blend-overlay"
              aria-hidden="true"
            />
          </motion.div>
        </motion.div>

        {/* Meet Wisp Badge */}
        <motion.div
          {...fadeUp(0.35)}
          className="z-10 mt-6"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)] font-mono shadow-xs select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            <span>Meet Wisp</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
