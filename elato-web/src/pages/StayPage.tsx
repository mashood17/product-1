import { Seo } from '../components/Seo'
import { getRouteSeo } from '../lib/routeSeo'
import { StayHeroReveal } from '../components/stay/StayHeroReveal'
import { Amenities } from '../components/stay/Amenities'
import { StayGallery } from '../components/stay/StayGallery'
import { BookingEnquiry } from '../components/stay/BookingEnquiry'
import { StickyWhatsAppBar } from '../components/stay/StickyWhatsAppBar'

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
        <BookingEnquiry />
        <StickyWhatsAppBar />
      </main>
    </>
  )
}
