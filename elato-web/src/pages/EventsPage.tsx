import { Seo } from '../components/Seo'
import { getRouteSeo } from '../lib/routeSeo'
import { EventsHeroReveal } from '../components/events/EventsHeroReveal'
import { EventsGallery } from '../components/events/EventsGallery'
import { EventsEnquiry } from '../components/events/EventsEnquiry'
import { FaqSection } from '../components/sections/FaqSection'
import { ExploreMore } from '../components/sections/ExploreMore'
import { FromTheBlog } from '../components/sections/FromTheBlog'
import { eventsFaqHeading, eventsFaqItems } from '../content/faqContent'

const seo = getRouteSeo('/elato-events')

export function EventsPage() {
  return (
    <>
      <Seo
        title={seo.title}
        description={seo.description}
        path={seo.path}
        breadcrumb={seo.breadcrumb}
        jsonLd={seo.jsonLd()}
      />
      <main id="main-content">
        <EventsHeroReveal />
        <EventsGallery />
        <FaqSection heading={eventsFaqHeading} items={eventsFaqItems} />
        <FromTheBlog servicePath="/elato-events" />
        <ExploreMore currentPath="/elato-events" />
        <EventsEnquiry />
      </main>
    </>
  )
}
