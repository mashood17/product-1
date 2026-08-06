import { Seo } from '../components/Seo'
import { getRouteSeo } from '../lib/routeSeo'
import { StayHeroReveal } from '../components/stay/StayHeroReveal'
import { Amenities } from '../components/stay/Amenities'
import { StayGallery } from '../components/stay/StayGallery'
import { BookingEnquiry } from '../components/stay/BookingEnquiry'
import { StickyWhatsAppBar } from '../components/stay/StickyWhatsAppBar'
import { FaqSection } from '../components/sections/FaqSection'
import { ExploreMore } from '../components/sections/ExploreMore'
import { FromTheBlog } from '../components/sections/FromTheBlog'
import { stayFaqHeading, stayFaqItems } from '../content/faqContent'

const seo = getRouteSeo('/elato-stay')

export function StayPage() {
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
        <StayHeroReveal />
        <Amenities />
        <StayGallery />
        <FaqSection heading={stayFaqHeading} items={stayFaqItems} />
        <FromTheBlog servicePath="/elato-stay" />
        <ExploreMore currentPath="/elato-stay" />
        <BookingEnquiry />
        <StickyWhatsAppBar />
      </main>
    </>
  )
}
