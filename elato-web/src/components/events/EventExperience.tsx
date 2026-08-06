import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { EVENTS_HALL_CAPACITY_MIN, EVENTS_HALL_CAPACITY_MAX } from '../../content/eventsContent'
import { sectionReveal, viewportOnce } from '../../lib/motion'
import { useSectionExitFade } from '../../lib/useSectionExitFade'
import { useSiteImage } from '../../lib/useSiteImage'
import { SiteImage } from '../ui/SiteImage'
import bgDesktop from '../../assets/newbg/bg2.webp'
import bgMobile from '../../assets/newbg/bg-mb2.webp'

// Same cinematic left-entrance treatment as Home's About section image card.
const imageViewport = { once: true, amount: 0.28 }

const experience = {
  overline: 'The Experience',
  title: 'Where Every Celebration Becomes a Lasting Memory',
  paragraphs: [
    "Every celebration at ELATŌ is thoughtfully prepared to create a seamless and memorable experience. Whether it's a wedding, reception, engagement, birthday, corporate gathering, or family celebration, our venue provides a beautiful setting designed for every occasion.",
    'From a professionally decorated stage and comfortable guest seating to elegant lighting and a spacious banquet hall, every detail is thoughtfully arranged to create a seamless celebration.',
  ],
  highlights: [
    'Professionally decorated stage',
    'Comfortable guest seating',
    'Elegant event lighting',
    'Spacious banquet hall',
    'Professional venue setup',
    'Customizable event layouts',
    'Family & corporate events',
    'Memorable ambience',
  ],
}

export function EventExperience() {
  const imageSrc = useSiteImage('events_experience_image', '')
  const exitFade = useSectionExitFade<HTMLElement>()
  const reduceMotion = useReducedMotion()

  const imageReveal: Variants = {
    hidden: {
      opacity: 0,
      x: reduceMotion ? 0 : -80,
      scale: reduceMotion ? 1 : 0.96,
      filter: reduceMotion ? 'blur(0px)' : 'blur(8px)',
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: { type: 'spring', duration: 0.9, bounce: 0 },
    },
  }

  return (
    <motion.section id="event-experience" ref={exitFade.ref} style={exitFade.style} className="relative overflow-hidden pb-16 pt-16 lg:pb-20 lg:pt-32">
      <div className="absolute inset-0 -z-10 bg-cover bg-center sm:hidden" style={{ backgroundImage: `url(${bgMobile})` }} aria-hidden="true" />
      <div className="absolute inset-0 -z-10 hidden bg-cover bg-center sm:block" style={{ backgroundImage: `url(${bgDesktop})` }} aria-hidden="true" />
      <div className="container-elato grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:items-start">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={imageViewport}
          variants={imageReveal}
          className="order-2 mx-auto mt-6 w-full max-w-sm lg:order-1 lg:mt-0 lg:max-w-none"
        >
          <div className="relative mx-auto aspect-4/5 w-full max-w-sm lg:max-w-none">
            <div
              className="absolute -inset-3 rounded-[44px] rounded-bl-[130px] bg-primary-50/80"
              aria-hidden="true"
            />
            <div className="relative h-full w-full overflow-hidden rounded-[36px] rounded-bl-[110px] border-[10px] border-secondary-900 ring-4 ring-surface-elevated shadow-elato-lg lg:rounded-[48px] lg:rounded-bl-[150px] lg:border-[14px]">
              <SiteImage
                src={imageSrc}
                alt="The ELATŌ Events hall, set up for a celebration"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={sectionReveal}
          className="order-1 lg:order-2"
        >
          <p className="text-caption text-secondary-500">{experience.overline}</p>
          <h2 className="text-h2 mt-3 font-sans font-bold text-[#9e7641] lg:text-[44px] lg:leading-[1.1]">{experience.title}</h2>
          {experience.paragraphs.map((p) => (
            <p key={p} className="text-body mt-4 text-neutral-warm-500">
              {p}
            </p>
          ))}

          <ul className="mt-8 grid grid-cols-2 gap-3">
            {experience.highlights.map((h) => (
              <li key={h} className="text-body flex items-center gap-2 text-secondary-900">
                <span className="h-1.5 w-1.5 flex-none rounded-full bg-secondary-500" aria-hidden="true" />
                {h}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-center gap-3 border-t border-primary-100 pt-8">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="shrink-0 text-secondary-500" aria-hidden="true">
              <path strokeWidth="1.5" d="M17 20c0-2.76-2.24-5-5-5s-5 2.24-5 5M12 12a4 4 0 100-8 4 4 0 000 8zM21 20c0-2-1.5-4-3.5-4.5M19 12a3 3 0 100-6M3 20c0-2 1.5-4 3.5-4.5M5 12a3 3 0 110-6" />
            </svg>
            <div>
              <p className="text-h3 text-secondary-900">
                Up to {EVENTS_HALL_CAPACITY_MIN}–{EVENTS_HALL_CAPACITY_MAX} Guests
              </p>
              <p className="text-body text-neutral-warm-500">
                One spacious banquet hall, ideal for weddings, receptions, birthdays, corporate events, engagements,
                and family celebrations.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}
