'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { PromptBox } from '@/components/prompt-box'
import { Mascot } from '@/components/mascot'

export function Hero() {
  // subtle cursor-based parallax tilt for the prompt card
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const rotateX = useSpring(rx, { stiffness: 150, damping: 18 })
  const rotateY = useSpring(ry, { stiffness: 150, damping: 18 })
  const glareX = useTransform(rotateY, [-5, 5], ['0%', '100%'])
  const glare = useTransform(
    glareX,
    (x) => `radial-gradient(600px circle at ${x} 0%, rgba(255,255,255,0.25), transparent 45%)`,
  )

  function handleTilt(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    ry.set(px * 6)
    rx.set(-py * 6)
  }
  function resetTilt() {
    rx.set(0)
    ry.set(0)
  }

  return (
    <section className="relative overflow-hidden px-6 pt-40 pb-0">
      <div className="relative mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="glass mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-foreground/90">
            <span className="pulse-dot size-2 rounded-full bg-emerald-400" />
            Testnet-first. Audited templates.
          </div>
          <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
            Describe your idea. Soroban builds it.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Wisp turns a plain-English prompt into a working Stellar smart
            contract and frontend—generated, tested, and deployed.
          </p>
        </motion.div>

        <motion.div
          className="mx-auto mt-10 max-w-2xl [perspective:1200px]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          onMouseMove={handleTilt}
          onMouseLeave={resetTilt}
        >
          <motion.div
            style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
            className="relative"
          >
            <PromptBox />
            {/* moving glare tied to tilt */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-3xl opacity-40 mix-blend-overlay"
              style={{ background: glare }}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* mascot peeking up from the bottom edge */}
      <div className="relative mt-16 flex translate-y-6 justify-center sm:mt-20 sm:translate-y-8">
        <Mascot />
      </div>
    </section>
  )
}
