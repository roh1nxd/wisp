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
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="label-caps">How it works</p>
          <h2 className="mt-3 max-w-lg text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            From prompt to production in three steps.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08}>
              <div className="glass glass-hover h-full rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
                    <step.icon className="size-5 text-foreground" />
                  </div>
                  <span className="font-mono text-sm text-muted-foreground/60">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-medium tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
