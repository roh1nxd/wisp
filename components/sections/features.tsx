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
    <section id="features" className="scroll-mt-20 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="label-caps">Features</p>
          <h2 className="mt-3 max-w-lg text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you need to ship on Stellar.
          </h2>
        </Reveal>

        <div className="mt-12 grid auto-rows-fr gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.06} className={cn(f.span)}>
              <div className="glass glass-hover group h-full rounded-2xl p-6">
                <div className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
                  <f.icon className="size-5 text-foreground" />
                </div>
                <h3 className="mt-5 text-lg font-medium tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
