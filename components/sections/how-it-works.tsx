'use client'

import { MessageSquare, Cpu, Rocket } from 'lucide-react'
import { Reveal } from '@/components/reveal'

const STEPS = [
  {
    icon: MessageSquare,
    title: 'Describe',
    desc: 'Write your idea in plain English. No Rust, no boilerplate.',
  },
  {
    icon: Cpu,
    title: 'Generate & test',
    desc: 'Wisp writes the Soroban contract and runs it against testnet.',
  },
  {
    icon: Rocket,
    title: 'Deploy',
    desc: 'Ship the contract and its generated frontend in one click.',
  },
]

export function HowItWorks() {
  return (
    <section className="w-full bg-[var(--bg-page)] py-20 sm:py-28 border-b border-[var(--border-default)]">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <div className="max-w-3xl mb-12 sm:mb-16">
            <p className="text-xs font-mono font-bold tracking-widest text-[var(--accent)] uppercase mb-3">
              Workflow
            </p>
            <h2 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
              From prompt to production in three steps.
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.09}>
              <div className="group border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] transition-all duration-300 rounded-2xl p-8 flex flex-col gap-5 shadow-xs hover:shadow-md h-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/10 transition-transform duration-300 group-hover:scale-105">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-sm font-semibold text-[var(--text-muted)] select-none">
                    0{i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 font-sans">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
