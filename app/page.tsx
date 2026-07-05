import { SiteNav } from '@/components/site-nav'
import { Hero } from '@/components/sections/hero'
import { TechStrip } from '@/components/sections/tech-strip'
import { HowItWorks } from '@/components/sections/how-it-works'
import { Features } from '@/components/sections/features'
import { Pricing } from '@/components/sections/pricing'
import { CTA } from '@/components/sections/cta'
import { SiteFooter } from '@/components/sections/site-footer'

export default function Page() {
  return (
    <main className="relative z-10 min-h-screen text-foreground">
      <SiteNav />
      <Hero />
      <TechStrip />
      <HowItWorks />
      <Features />
      <Pricing />
      <CTA />
      <SiteFooter />
    </main>
  )
}
