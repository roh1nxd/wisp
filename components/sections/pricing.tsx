'use client'

import { useState } from 'react'
import { Check, Crown } from 'lucide-react'
import { Reveal } from '@/components/reveal'
import { checkout, type PlanId } from '@/lib/api'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { PixelCard } from '@/components/pixel-card'

const PLANS: {
  id: PlanId
  name: string
  price: string
  blurb: string
  features: string[]
  popular?: boolean
}[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    blurb: 'For trying it out.',
    features: [
      '3 projects / month',
      'Testnet deploys only',
      'Community templates',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$20',
    blurb: 'For indie builders.',
    popular: true,
    features: [
      'Unlimited projects',
      'Mainnet deploys',
      'Full audited template library',
      'Priority generation queue',
      'Email support',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: '$99',
    blurb: 'For teams shipping together.',
    features: [
      'Everything in Pro',
      'Multi-seat workspace',
      'Shared project history',
      'Custom templates',
      'Priority support + onboarding',
    ],
  },
]

export function Pricing() {
  const [yearly, setYearly] = useState(false)

  async function handleSelectPlan(plan: PlanId) {
    try {
      const { url } = await checkout(plan)
      if (url) window.location.href = url
    } catch {
      window.location.href = `/dashboard?plan=${plan}`
    }
  }

  function displayPrice(price: string) {
    const monthly = Number(price.replace(/[^0-9.]/g, '')) || 0
    return yearly ? `$${monthly * 12}` : price
  }

  return (
    <section id="pricing" className="w-full bg-[var(--bg-page)] py-20 sm:py-28 border-b border-[var(--border-default)]">
      <div className="mx-auto max-w-7xl px-6 flex flex-col items-center">
        <Reveal>
          <div className="max-w-3xl text-center flex flex-col items-center gap-4 mb-12">
            <p className="text-xs font-mono font-bold tracking-widest text-[var(--accent)] uppercase">
              Pricing
            </p>
            <h2 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Simple pricing that scales with you.
            </h2>

            {/* Month / Year billing toggle */}
            <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-1 mt-4 shadow-xs select-none">
              <button
                type="button"
                onClick={() => setYearly(false)}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer",
                  !yearly
                    ? "bg-[var(--accent)] text-[var(--accent-text-on)] shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setYearly(true)}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer",
                  yearly
                    ? "bg-[var(--accent)] text-[var(--accent-text-on)] shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                Yearly
              </button>
            </div>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mt-6">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 0.08}>
              <PixelCard
                className={cn(
                  "flex flex-col h-full relative group transition-all duration-300",
                  plan.popular && "border-[var(--accent)]/40 shadow-md ring-1 ring-[var(--accent)]/15"
                )}
              >
                {/* Content inner padding wrapper */}
                <div className="p-8 flex flex-col gap-6 h-full relative z-20">
                  {/* Subtle glow behind featured tier */}
                  {plan.popular ? (
                    <div className="absolute inset-0 bg-radial from-[var(--accent)]/5 to-transparent pointer-events-none rounded-2xl z-0" aria-hidden="true" />
                  ) : null}

                  <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-[var(--text-primary)] font-sans">
                        {plan.name}
                      </h3>
                      {plan.popular ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-semibold text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent)]/20 uppercase tracking-wider font-mono">
                          <Crown className="h-3 w-3" />
                          Popular
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-baseline gap-1 text-[var(--text-primary)]">
                      <span className="text-4xl font-extrabold tracking-tight">
                        {displayPrice(plan.price)}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] font-medium">
                        {yearly ? '/yr' : '/mo'}
                      </span>
                    </div>

                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed min-h-[40px]">
                      {plan.blurb}
                    </p>
                  </div>

                  <div className="relative z-10">
                    <motion.button
                      type="button"
                      data-plan={plan.id}
                      onClick={() => handleSelectPlan(plan.id)}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-150 flex items-center justify-center cursor-pointer shadow-xs",
                        plan.popular
                          ? "bg-[var(--accent)] text-[var(--accent-text-on)] hover:bg-[var(--accent-hover)] font-semibold"
                          : "border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] bg-transparent"
                      )}
                    >
                      Get started
                    </motion.button>
                  </div>

                  <div className="h-px bg-[var(--border-default)] w-full relative z-10" />

                  <ul className="space-y-3.5 mt-2 relative z-10">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <span className="flex items-center justify-center h-4 w-4 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/5">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                        <span className="text-xs text-[var(--text-secondary)] font-medium leading-none">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </PixelCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
