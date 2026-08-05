import { Seo } from '../components/Seo'
import { getRouteSeo } from '../lib/routeSeo'
import { EventsHeroReveal } from '../components/events/EventsHeroReveal'
import { EventsGallery } from '../components/events/EventsGallery'
import { EventsEnquiry } from '../components/events/EventsEnquiry'

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
        <EventsEnquiry />
      </main>
    </>
  )
}
