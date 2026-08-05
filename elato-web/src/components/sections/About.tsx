import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion'
import { Award, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import sectionBackground from '../../assets/newbg/bg.webp'
import sectionBackgroundMobile from '../../assets/newbg/bg-mb.webp'
import { SectionBackground } from '../ui/SectionBackground'
import { SiteImage } from '../ui/SiteImage'
import { aboutContent, businessInfo } from '../../content/siteContent'
import { PARALLAX_MAX_PX } from '../../lib/motion'
import { useAggregateRating } from '../../lib/useAggregateRating'
import { useSiteImage } from '../../lib/useSiteImage'
import { useSectionExitFade } from '../../lib/useSectionExitFade'

const EASE_EDITORIAL = [0.16, 1, 0.3, 1] as const
// Trigger the entrance once ~25-30% of the section is visible, and never replay it on subsequent scrolls.
const aboutViewport = { once: true, amount: 0.28 }

// Brand/founder mentions get a subtle emphasis treatment inside the body
// copy rather than staying flat gray — same brand color as the rest of the
// section, no new color introduced. "Abdul Hakeem" only appears once so
// every mention gets it; "ELATŌ" repeats across paragraphs, so `elatoState`
// tracks whether the (one) highlight has already been used — only the
// first occurrence across the whole paragraph list should stand out, not
// every repeat of the name.
const HIGHLIGHT_PATTERN = /(ELATŌ|Abdul Hakeem)/g

function highlightBrandMentions(text: string, elatoState: { highlighted: boolean }) {
  return text.split(HIGHLIGHT_PATTERN).map((part, i) => {
    if (part === 'Abdul Hakeem' || (part === 'ELATŌ' && !elatoState.highlighted)) {
      if (part === 'ELATŌ') elatoState.highlighted = true
      return (
        <strong key={i} className="font-semibold text-[#9E7641]">
          {part}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function About() {
  const reduceMotion = useReducedMotion()
  const aggregateRating = useAggregateRating()
  const aboutImageSrc = useSiteImage('home_about_image', '')
  const imageRef = useRef<HTMLDivElement>(null)
  const [canHover, setCanHover] = useState(false)
  // Same fade-only exit every other Home section uses, for a consistent
  // handoff feel scrolling through the whole page — no scale, no blur.
  const exitFade = useSectionExitFade<HTMLElement>()

  useEffect(() => {
    setCanHover(window.matchMedia('(pointer: fine)').matches)
  }, [])

  const { scrollYProgress } = useScroll({ target: imageRef, offset: ['start end', 'end start'] })
  const parallaxY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [0, 0] : [-PARALLAX_MAX_PX / 3, PARALLAX_MAX_PX / 3],
  )

  // Tiny cursor-responsive parallax on the image frame — desktop (fine
  // pointer) only, and skipped entirely under prefers-reduced-motion.
  const hoverX = useMotionValue(0)
  const hoverY = useMotionValue(0)
  const hoverXSpring = useSpring(hoverX, { stiffness: 150, damping: 20 })
  const hoverYSpring = useSpring(hoverY, { stiffness: 150, damping: 20 })

  const onImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion || !canHover) return
    const bounds = e.currentTarget.getBoundingClientRect()
    const relX = (e.clientX - bounds.left) / bounds.width - 0.5
    const relY = (e.clientY - bounds.top) / bounds.height - 0.5
    hoverX.set(relX * 6)
    hoverY.set(relY * 6)
  }

  const onImageMouseLeave = () => {
    hoverX.set(0)
    hoverY.set(0)
  }

  // Single top-level orchestrator — every reveal below is driven by this one
  // whileInView trigger via variant propagation. Two independent whileInView
  // observers (one per column) previously raced on fast/instant scrolls and
  // could leave the text column stuck at opacity:0 permanently.
  const sectionContainer: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.15,
      },
    },
  }

  const textContainer: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.12,
        delayChildren: reduceMotion ? 0 : 0.1,
      },
    },
  }

  const textReveal: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 22 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: EASE_EDITORIAL },
    },
  }

  const imageReveal: Variants = {
    hidden: {
      opacity: 0,
      x: reduceMotion ? 0 : -80,
      scale: reduceMotion ? 1 : 0.96,
      filter: reduceMotion ? 'blur(0px)' : 'blur(4px)',
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        duration: 0.9,
        bounce: 0,
        delayChildren: reduceMotion ? 0 : 0.55,
        staggerChildren: reduceMotion ? 0 : 0.12,
      },
    },
  }

  const badgeReveal: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 16, scale: reduceMotion ? 1 : 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', duration: 0.6, bounce: 0 },
    },
  }

  // Fresh per render — shared across the paragraphs.map below so only the
  // first ELATŌ mention across all of them gets highlighted, not every one.
  const elatoState = { highlighted: false }

  return (
    <motion.section
      id="about"
      ref={exitFade.ref}
      style={{ opacity: exitFade.style.opacity }}
      className="relative z-0 pb-20 pt-14 font-sans lg:py-32"
    >
      <SectionBackground image={sectionBackground} mobileImage={sectionBackgroundMobile} />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={aboutViewport}
        variants={sectionContainer}
        className="container-elato relative grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center lg:gap-20"
      >
        {/* Image column — single premium editorial card, last on mobile */}
        <motion.div variants={imageReveal} className="relative order-2 mx-2 lg:order-1 lg:mx-0">
          {/* Dot-grid accent, echoing the reference composition */}
          <div
            aria-hidden="true"
            className="absolute -top-6 -right-6 z-0 grid grid-cols-6 gap-1.5 lg:-top-8 lg:-right-8"
          >
            {Array.from({ length: 24 }).map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-[#9E7641]/35" />
            ))}
          </div>

          {/* Offset frame — premium depth behind the photo */}
          <div
            aria-hidden="true"
            className="absolute -right-4 -top-4 z-0 h-[88%] w-[88%] rounded-2xl border border-[#9E7641]/30 lg:-right-6 lg:-top-6"
          />

          <motion.div
            ref={imageRef}
            onMouseMove={onImageMouseMove}
            onMouseLeave={onImageMouseLeave}
            whileHover={reduceMotion || !canHover ? undefined : { scale: 1.025, boxShadow: '0 34px 60px -20px rgba(158,118,65,0.45)' }}
            transition={{ duration: 0.3, ease: EASE_EDITORIAL }}
            style={{ x: hoverXSpring, y: hoverYSpring }}
            className="relative z-10 overflow-hidden rounded-2xl shadow-elato-xl"
          >
            {aboutImageSrc ? (
              <motion.img
                style={{ y: parallaxY, scale: 1.12 }}
                src={aboutImageSrc}
                alt="ELATŌ's handcrafted desserts and premium hospitality experience"
                className="aspect-[4/5] w-full object-cover lg:aspect-[9/8]"
                loading="lazy"
              />
            ) : (
              <SiteImage
                alt="ELATŌ's handcrafted desserts and premium hospitality experience"
                className="aspect-[4/5] w-full lg:aspect-[9/8]"
              />
            )}
          </motion.div>

          {/* Floating stat badge — founder heritage */}
          <motion.div
            variants={badgeReveal}
            className="absolute -right-4 top-[8%] z-20 rounded-xl bg-surface-elevated px-3 py-2.5 shadow-elato-lg lg:-right-8 lg:px-5 lg:py-4"
          >
            <p className="text-[9px] font-medium uppercase tracking-wide text-[#9E7641] lg:text-caption">
              Founder&apos;s Experience
            </p>
            <p className="mt-0.5 text-lg font-bold leading-none text-[#9E7641] lg:mt-1 lg:text-3xl">30+ Years</p>
            <p className="mt-0.5 text-[9px] font-medium text-neutral-warm-500 lg:mt-1 lg:text-[11px]">
              in the ice cream industry
            </p>
          </motion.div>

          {/* Floating trust badge — guest rating, links out to the same
              official Google Reviews page as the Reviews section CTA */}
          <motion.a
            href={businessInfo.googleReviewsUrl}
            target="_blank"
            rel="noreferrer"
            variants={badgeReveal}
            whileHover={{ y: -2 }}
            className="absolute -bottom-6 -left-3 z-20 flex items-center gap-3 rounded-xl bg-surface-elevated px-5 py-4 shadow-elato-lg transition-shadow duration-300 ease-out hover:shadow-elato-xl lg:-left-8"
          >
            <Star className="h-6 w-6 shrink-0 fill-[#9E7641] text-[#9E7641]" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold leading-none text-[#9E7641]">{aggregateRating.rating} Rating</p>
              <p className="mt-1 text-[11px] font-medium text-neutral-warm-500">
                {aggregateRating.count.toLocaleString('en-IN')}+ happy guests
              </p>
            </div>
          </motion.a>
        </motion.div>

        {/* Text column — mobile order: heading, then body + CTA */}
        <motion.div variants={textContainer} className="order-1 lg:order-2">
          <motion.p variants={textReveal} className="text-caption text-[#9E7641]">
            {aboutContent.overline}
          </motion.p>
          <motion.span
            variants={textReveal}
            className="mt-2 block h-px w-10 bg-[#E7CAA0]"
            aria-hidden="true"
          />
          <motion.h2
            variants={textReveal}
            className="text-h2 font-sans text-[32px] font-bold mt-4 text-[#9E7641] lg:text-[48px]"
          >
            {aboutContent.title}
          </motion.h2>
          {aboutContent.paragraphs.map((paragraph) => (
            <motion.p
              key={paragraph}
              variants={textReveal}
              className="text-body mt-4 max-w-[52ch] text-neutral-warm-500"
            >
              {highlightBrandMentions(paragraph, elatoState)}
            </motion.p>
          ))}
          <motion.div
            variants={textReveal}
            className="mt-6 flex items-center gap-4 rounded-2xl border border-[#9E7641]/25 bg-surface-elevated px-5 py-4 shadow-elato-lg"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#9E7641]/10">
              <Award className="h-5 w-5 text-[#9E7641]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9E7641]">
                {aboutContent.achievement.eyebrow}
              </p>
              <p className="mt-0.5 text-sm font-bold text-[#9E7641]">
                {aboutContent.achievement.title}
              </p>
            </div>
          </motion.div>
          <motion.a
            variants={textReveal}
            href="#visit"
            whileHover={
              reduceMotion
                ? undefined
                : {
                    y: -3,
                    scale: 1.02,
                    backgroundColor: '#A8814A',
                    boxShadow: '0 14px 28px -10px rgba(158,118,65,0.55)',
                  }
            }
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.28, ease: EASE_EDITORIAL }}
            className="group mt-8 inline-flex w-fit items-center gap-2 bg-[#9E7641] py-4 pl-8 pr-6 text-caption font-semibold text-[#E7CAA0] [clip-path:polygon(0_0,100%_0,100%_72%,86%_100%,0_100%)]"
          >
            {aboutContent.ctaLabel}
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-300 ease-out group-hover:translate-x-1.5"
            >
              →
            </span>
          </motion.a>
        </motion.div>
      </motion.div>
    </motion.section>
  )
}
