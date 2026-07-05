'use client'

import { SignUpButton } from '@clerk/nextjs'
import { Reveal } from '@/components/reveal'

export function CTA() {
  return (
    <section className="px-6 py-24">
      <Reveal className="mx-auto max-w-6xl">
        <div className="glass-strong relative overflow-hidden rounded-[2rem] px-6 py-20 text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-72 w-[640px] max-w-[95%] -translate-x-1/2 rounded-full opacity-70 blur-2xl"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(var(--aurora-blue),0.4) 0%, rgba(var(--aurora-violet),0.18) 45%, rgba(0,0,0,0) 72%)',
            }}
          />
          <div className="relative">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              Start building on Stellar.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-pretty text-muted-foreground">
              Turn your next idea into a deployed Soroban contract. No setup,
              no boilerplate—just describe it.
            </p>
            <div className="mt-8 flex justify-center">
              <SignUpButton mode="modal">
                <button className="gradient-border rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-transform hover:scale-[1.03]">
                  Get started free
                </button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
