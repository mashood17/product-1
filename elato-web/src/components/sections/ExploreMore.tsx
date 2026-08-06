import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { viewportOnce } from '../../lib/motion'

const EASE_EDITORIAL = [0.16, 1, 0.3, 1] as const

// Short, accurate descriptors for this cross-link block specifically — not
// sourced from siteContent.ts's servicesContent[].descriptor, which still
// says "artisan coffee" (written before the live menu, fetched from the
// admin-managed backend, settled into its current real categories: ice
// cream, shakes, mojitos, and a food menu — no coffee). That field was
// otherwise unused (Home's Services carousel only ever renders `title`), so
// rather than edit shared content other sections may rely on later, this
// component owns its own copy, kept in sync with the real menu.
const EXPLORE_COPY: Record<string, { title: string; descriptor: string }> = {
  celebre: { title: 'Elato Celebré', descriptor: 'Handcrafted ice cream, shakes, mojitos, and a food menu of fries, sandwiches, burgers, and pizzas.' },
  stay: { title: 'Elato Stay', descriptor: 'A spacious 2BHK premium serviced apartment for 6–8 guests.' },
  events: { title: 'Elato Events', descriptor: 'A 200–250 guest hall for weddings, engagements, and celebrations.' },
}

const PATH_BY_ID: Record<string, string> = {
  celebre: '/elato-celebre',
  stay: '/elato-stay',
  events: '/elato-events',
}

export interface ExploreMoreProps {
  /** The page this renders on — excluded from the list of links shown. */
  currentPath: string
}

/**
 * Contextual cross-links between the three service pages — a real
 * internal-linking signal for SEO, and a real next step for a visitor
 * already engaged with one service (e.g. planning a wedding at Elato
 * Events, then needing a place for out-of-town guests to stay).
 */
export function ExploreMore({ currentPath }: ExploreMoreProps) {
  const others = Object.entries(EXPLORE_COPY).filter(([id]) => PATH_BY_ID[id] !== currentPath)

  return (
    <section className="relative bg-surface-elevated py-16 font-sans lg:py-20">
      <div className="container-elato">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7, ease: EASE_EDITORIAL }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-caption text-[#9E7641]">Also at ELATŌ</p>
          <span className="mx-auto mt-2 block h-px w-10 bg-[#E7CAA0]" aria-hidden="true" />
          <h2 className="mt-3 text-[24px] font-bold leading-tight text-[#9E7641] lg:text-[32px]">
            Explore More at ELATŌ
          </h2>
        </motion.div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
          {others.map(([id, service]) => (
            <Link
              key={id}
              to={PATH_BY_ID[id]}
              className="group rounded-2xl border border-[#9e7641]/20 bg-surface-base px-6 py-5 shadow-elato-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-elato-md"
            >
              <p className="text-body-lg font-semibold text-secondary-900 transition-colors duration-300 ease-out group-hover:text-[#9E7641]">
                {service.title}
              </p>
              <p className="text-body mt-1 text-neutral-warm-500">{service.descriptor}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
