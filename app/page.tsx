import { Suspense } from 'react'
import { SiteNav } from '@/components/site-nav'
import { Hero } from '@/components/sections/hero'
import { Mascot } from '@/components/mascot'
import { TechStrip } from '@/components/sections/tech-strip'
import { HowItWorks } from '@/components/sections/how-it-works'
import { Features } from '@/components/sections/features'
import { Pricing } from '@/components/sections/pricing'
import { CTA } from '@/components/sections/cta'
import { SiteFooter } from '@/components/sections/site-footer'
import { AuthModalWrapper } from '@/components/AuthModalWrapper'

export default function Page() {
  return (
    <main className="bg-[var(--bg-page)] min-h-screen text-[var(--text-primary)] font-sans antialiased">
      <SiteNav />
      <Hero />
      
      {/* Centered Mascot Orb Section */}
      <div className="relative flex flex-col items-center justify-center w-full py-12 select-none bg-[var(--bg-page)] overflow-hidden">
        {/* Horizontal dividing line */}
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--border-strong)]/60 to-transparent" />
        
        {/* Mascot Orb */}
        <div className="relative z-10 bg-[var(--bg-page)] px-6">
          <Mascot className="w-24 h-24" />
        </div>
      </div>

      <TechStrip />
      <HowItWorks />
      <Features />
      <Pricing />
      <CTA />
      <SiteFooter />
      <Suspense fallback={null}>
        <AuthModalWrapper />
      </Suspense>
    </main>
  )
}
