import { Seo } from '../components/Seo'
import { localBusinessJsonLd, organizationJsonLd } from '../lib/jsonLd'
import { HeroServicesReveal } from '../components/sections/HeroServicesReveal'
import { About } from '../components/sections/About'
import { VideoShowcaseSection } from '../components/sections/VideoShowcaseSection'
import { ReviewsSection } from '../components/sections/ReviewsSection'
import { VisitSection } from '../components/sections/VisitSection'
import { DeferredMount } from '../lib/DeferredMount'

export function HomePage() {
  return (
    <>
      <Seo
        title="Where Every Celebration Begins"
        description="ELATŌ — a premium lifestyle destination in Panemangalore combining handcrafted desserts, artisan coffee, an event hall, and a boutique stay."
        path="/"
        jsonLd={[localBusinessJsonLd(), organizationJsonLd()]}
      />
      <main>
        <HeroServicesReveal />
        <About />
        {/* Video Showcase/Reviews fetch data and set up their own Framer
            Motion + IntersectionObserver machinery on mount — deferred so
            that work doesn't compete with the hero's critical-path
            animation during initial hydration. Neither is a nav-anchor
            target (unlike About/Visit), so deferring their mount doesn't
            affect #hash navigation. */}
        <DeferredMount>
          <VideoShowcaseSection />
        </DeferredMount>
        <DeferredMount>
          <ReviewsSection />
        </DeferredMount>
        <VisitSection />
      </main>
    </>
  )
}
