import { Seo } from '../components/Seo'
import { getRouteSeo } from '../lib/routeSeo'
import { HeroServicesReveal } from '../components/sections/HeroServicesReveal'
import { About } from '../components/sections/About'
import { VideoShowcaseSection } from '../components/sections/VideoShowcaseSection'
import { ReviewsSection } from '../components/sections/ReviewsSection'
import { FaqSection } from '../components/sections/FaqSection'
import { VisitSection } from '../components/sections/VisitSection'
import { DeferredMount } from '../lib/DeferredMount'

const seo = getRouteSeo('/')

export function HomePage() {
  return (
    <>
      <Seo title={seo.title} description={seo.description} path={seo.path} jsonLd={seo.jsonLd()} />
      <main id="main-content">
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
        <FaqSection />
        <VisitSection />
      </main>
    </>
  )
}
