import { motion, useReducedMotion } from 'framer-motion'
import { HeroVideoBackground } from './HeroVideoBackground'
import { useInView } from '../../lib/useInView'

const EASE_CINEMATIC = [0.16, 1, 0.3, 1] as const

export type HeroProps = {
  id: string
  /** Label on the bottom-center floating glass CTA. */
  ctaLabel: string
  /** Element id the CTA smooth-scrolls to on click. */
  scrollTargetId: string
  /** Small uppercase kicker shown above `heading` (Home hero only). */
  eyebrow?: string
  /** Large editorial heading shown above the CTA (Home hero only). */
  heading?: string
}

/**
 * The single hero shell used by every page (Home/Stay/Celebré/Events) — a
 * full-bleed looping video with a floating glass CTA at the bottom, nothing
 * else. Previously this also carried each page's animated wordmark and a
 * headline/subStatement; client direction shifted to a splash screen
 * (`Splash.tsx`) owning the brand-moment wordmark instead, so the Hero
 * itself is now just the video and a single call to action into the page's
 * first content section.
 */
export function Hero({ id, ctaLabel, scrollTargetId, eyebrow, heading }: HeroProps) {
  const reduceMotion = useReducedMotion()
  // Pauses the background video + light-drift overlay once this hero has
  // scrolled out of view — both otherwise keep running (and costing GPU/
  // battery) for the rest of the page visit, long after the user has
  // scrolled past.
  const { ref: heroSectionRef, inView: heroInView } = useInView<HTMLElement>()

  const handleCtaClick = () => {
    document.getElementById(scrollTargetId)?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    <section id={id} ref={heroSectionRef} className="relative flex h-screen items-center justify-center overflow-hidden">
      <HeroVideoBackground inView={heroInView} />
      <div className="hero-bg-light" aria-hidden="true" style={{ animationPlayState: heroInView ? 'running' : 'paused' }} />

      <motion.div
        className="absolute inset-x-0 bottom-32 flex flex-col items-center px-6 text-center sm:bottom-12"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.6, duration: reduceMotion ? 0.3 : 0.9, ease: EASE_CINEMATIC }}
      >
        {eyebrow && heading ? (
          <div className="mb-16 flex flex-col items-center gap-2 sm:mb-9 sm:gap-2.5">
            <span className="font-sans text-[13px] font-semibold uppercase tracking-[0.32em] text-white sm:text-[13px]">
              {eyebrow}
            </span>
            <h1 className="max-w-[92vw] whitespace-nowrap font-sans text-[clamp(1.9rem,8.5vw,2.75rem)] font-semibold leading-[1.02] tracking-[-0.02em] text-white sm:whitespace-normal sm:text-[41px] md:text-[50px] lg:text-[58px]">
              {heading}
            </h1>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleCtaClick}
          className="rounded-full border border-white/25 bg-white/10 px-8 py-4 font-sans text-[12px] font-semibold uppercase tracking-[0.22em] text-white shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/16 hover:shadow-[0_12px_40px_rgba(0,0,0,0.34)] sm:px-10 sm:py-4 sm:text-[13px]"
        >
          {ctaLabel}
        </button>

        <motion.svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className="mt-4 text-white/70"
          animate={reduceMotion ? {} : { y: [0, 6, 0] }}
          transition={reduceMotion ? undefined : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M4 7L10 13L16 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </motion.div>
    </section>
  )
}
