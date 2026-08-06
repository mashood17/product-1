import { Seo } from '../components/Seo'
import { getRouteSeo } from '../lib/routeSeo'
import { BasketProvider } from '../lib/basketContext'
import { CelebreHeroReveal } from '../components/celebre/CelebreHeroReveal'
import { PartyFacilities } from '../components/celebre/PartyFacilities'
import { MenuSection } from '../components/celebre/MenuSection'
import { DeliveryBasket } from '../components/celebre/DeliveryBasket'
import { FaqSection } from '../components/sections/FaqSection'
import { ExploreMore } from '../components/sections/ExploreMore'
import { FromTheBlog } from '../components/sections/FromTheBlog'
import { celebreFaqHeading, celebreFaqItems } from '../content/faqContent'

const seo = getRouteSeo('/elato-celebre')

export function CelebrePage() {
  return (
    <BasketProvider>
      <Seo
        title={seo.title}
        description={seo.description}
        path={seo.path}
        breadcrumb={seo.breadcrumb}
        jsonLd={seo.jsonLd()}
      />
      <main id="main-content">
        <CelebreHeroReveal />
        <PartyFacilities />
        <MenuSection />
        <FaqSection heading={celebreFaqHeading} items={celebreFaqItems} />
        <FromTheBlog servicePath="/elato-celebre" />
        <ExploreMore currentPath="/elato-celebre" />
        <DeliveryBasket />
      </main>
    </BasketProvider>
  )
}
