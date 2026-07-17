'use client'

import { ShieldCheck, FlaskConical, LayoutTemplate, Wallet, Gauge } from 'lucide-react'
import { Reveal } from '@/components/reveal'
import { cn } from '@/lib/utils'

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Audited templates',
    desc: 'Every contract is composed from reviewed, battle-tested Soroban primitives.',
    span: 'md:col-span-2',
  },
  {
    icon: FlaskConical,
    title: 'Testnet-first safety',
    desc: 'Nothing hits mainnet until it passes on testnet.',
    span: '',
  },
  {
    icon: LayoutTemplate,
    title: 'Frontend included',
    desc: 'A typed React frontend is generated alongside the contract.',
    span: '',
  },
  {
    icon: Wallet,
    title: 'Wallet-native',
    desc: 'Freighter and Stellar wallets wired in from the first render.',
    span: '',
  },
  {
    icon: Gauge,
    title: 'Priority queue',
    desc: 'Pro and Team plans generate ahead of the line.',
    span: '',
  },
]

export function Features() {
  return (
    <section id="features" className="w-full bg-[var(--bg-page)] py-20 sm:py-28 border-b border-[var(--border-default)]">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <div className="max-w-3xl mb-12 sm:mb-16">
            <p className="text-xs font-mono font-bold tracking-widest text-[var(--accent)] uppercase mb-3">
              Features
            </p>
            <h2 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Everything you need to ship on Stellar.
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.07} className={f.span}>
              <div className="group border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] transition-all duration-300 rounded-2xl p-8 flex flex-col gap-4 shadow-xs hover:shadow-md h-full">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/10 transition-transform duration-300 group-hover:scale-105">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 font-sans">
                    {f.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {f.desc}
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
