'use client'

import { useState } from 'react'
import { Check, Crown } from 'lucide-react'
import { useAuth, useClerk } from '@clerk/nextjs'
import { Reveal } from '@/components/reveal'
import { checkout, type PlanId } from '@/lib/api'
import { cn } from '@/lib/utils'

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
  const { isSignedIn } = useAuth()
  const clerk = useClerk()
  const [yearly, setYearly] = useState(false)

  async function handleSelectPlan(plan: PlanId) {
    if (!isSignedIn) {
      clerk.openSignUp({ forceRedirectUrl: `/dashboard?plan=${plan}` })
      return
    }
    try {
      // TODO: connect to POST /api/billing/checkout
      const { url } = await checkout(plan)
      if (url) window.location.href = url
    } catch {
      // Endpoint not wired yet; send the user to the dashboard.
      window.location.href = `/dashboard?plan=${plan}`
    }
  }

  function displayPrice(price: string) {
    const monthly = Number(price.replace(/[^0-9.]/g, '')) || 0
    return yearly ? `$${monthly * 12}` : price
  }

  return (
    <section id="pricing" className="scroll-mt-20 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <p className="label-caps">Pricing</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple pricing that scales with you.
          </h2>

          {/* Month / Year billing toggle */}
          <div className="glass mx-auto mt-8 inline-flex items-center gap-1 rounded-full p-1">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                !yearly ? 'bg-white text-black' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                yearly ? 'bg-white text-black' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Yearly
            </button>
          </div>
        </Reveal>

        <div className="mt-14 grid items-center gap-5 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 0.08}>
              <div
                className={cn(
                  'relative flex h-full flex-col rounded-3xl p-6',
                  plan.popular
                    ? 'glass-strong border-white/20 md:scale-[1.05] md:py-8'
                    : 'glass glass-hover',
                )}
              >
                {/* blue radial glow behind featured tier */}
                {plan.popular ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-px -z-10 rounded-3xl opacity-80 blur-xl"
                    style={{
                      background:
                        'radial-gradient(120% 80% at 50% 0%, rgba(var(--aurora-blue),0.35) 0%, rgba(var(--aurora-violet),0.15) 40%, rgba(0,0,0,0) 70%)',
                    }}
                  />
                ) : null}

                {plan.popular ? (
                  <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-black">
                    <Crown className="size-3.5" />
                    Most popular
                  </span>
                ) : null}

                <h3 className="text-sm font-medium tracking-tight text-muted-foreground">
                  {plan.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-mono text-4xl font-semibold tracking-tight text-foreground">
                    {displayPrice(plan.price)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {yearly ? '/yr' : '/mo'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.blurb}</p>

                <button
                  type="button"
                  data-plan={plan.id}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={cn(
                    'mt-6 w-full rounded-full px-4 py-2.5 text-sm font-medium transition-transform hover:scale-[1.02]',
                    plan.popular
                      ? 'gradient-border bg-white text-black'
                      : 'border border-white/15 bg-white/[0.06] text-foreground hover:bg-white/[0.12]',
                  )}
                >
                  Get started
                </button>

                <ul className="mt-6 space-y-3 border-t border-white/[0.08] pt-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-white/10">
                        <Check className="size-3 text-foreground" />
                      </span>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
