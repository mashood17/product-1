import { useEffect, useState } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { InstagramGlyph } from '../ui/InstagramGlyph'
import { SkeletonCard } from '../ui/SkeletonCard'
import { SectionBackground } from '../ui/SectionBackground'
import { VideoShowcaseCarousel } from './VideoShowcaseCarousel'
import { getVideoGallery, type VideoGalleryItem } from '../../lib/videoGalleryRepository'
import { viewportOnce } from '../../lib/motion'
import { useSectionExitFade } from '../../lib/useSectionExitFade'
import sectionBackground from '../../assets/newbg/bg2.webp'
import sectionBackgroundMobile from '../../assets/newbg/bg-mb2.webp'

const EASE_EDITORIAL = [0.16, 1, 0.3, 1] as const
const INSTAGRAM_URL = 'https://www.instagram.com/elato.in/'

type LoadState = 'loading' | 'ready' | 'empty'

function FollowButton({ label, className = '' }: { label: string; className?: string }) {
  return (
    <motion.a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noreferrer noopener"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={`group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-full border border-ochre/40 bg-gradient-to-b from-ochre to-secondary-700 px-7 text-body font-sans font-semibold tracking-wide text-white shadow-[0_10px_28px_-8px_rgba(148,113,43,0.5)] transition-shadow duration-300 ease-out hover:shadow-[0_16px_36px_-6px_rgba(148,113,43,0.6)] ${className}`}
    >
      <InstagramGlyph className="h-4 w-4" />
      <span className="relative z-10">{label}</span>
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
    </motion.a>
  )
}

/**
 * Homepage Instagram section — the videos are curated through the admin
 * Video Showcase page (see elato-web/src/lib/videoGalleryRepository.ts), but
 * the section is branded and presented as ELATŌ's Instagram feed, not a
 * generic video gallery. Always renders the heading, copy and Follow CTA,
 * even with zero videos, so the section never collapses and never reads as
 * empty — a premium in-section placeholder takes over instead.
 */
export function VideoShowcaseSection() {
  const reduceMotion = useReducedMotion()
  const exitFade = useSectionExitFade<HTMLElement>()
  const [state, setState] = useState<LoadState>('loading')
  const [videos, setVideos] = useState<VideoGalleryItem[]>([])

  useEffect(() => {
    let cancelled = false
    getVideoGallery().then((items) => {
      if (cancelled) return
      setVideos(items)
      setState(items.length > 0 ? 'ready' : 'empty')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const headingReveal: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_EDITORIAL } },
  }

  return (
    <motion.section
      id="showcase"
      ref={exitFade.ref}
      style={{ opacity: exitFade.style.opacity }}
      className="relative py-20 font-sans lg:py-32"
    >
      <SectionBackground image={sectionBackground} mobileImage={sectionBackgroundMobile} />
      <div className="container-elato">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={headingReveal}
          className="mx-auto flex max-w-2xl flex-col items-center text-center"
        >
          <p className="text-caption tracking-[0.2em] text-[#9E7641]">Follow Our Journey</p>
          <span className="mx-auto mt-3 block h-px w-12 bg-[#E7CAA0]" aria-hidden="true" />
          <h2 className="mt-4 text-[32px] font-bold leading-[1.1] text-[#9E7641] lg:text-[48px]">Moments from ELATŌ</h2>
          <p className="text-body mx-auto mt-4 max-w-md text-neutral-warm-500">
            A glimpse into our café, celebrations, hospitality and everyday moments.
          </p>
          {/* Empty state renders its own Follow button alongside the
              placeholder illustration/copy — skip it here so there is never
              more than one on screen at once. */}
          {state !== 'empty' && <FollowButton label="Follow @elato.in" className="mt-6" />}
        </motion.div>
      </div>

      {state === 'loading' ? (
        <div className="container-elato mt-12 flex justify-center gap-3 overflow-hidden lg:mt-16">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard
              key={i}
              className={`aspect-[9/16] flex-none rounded-[28px] ${
                i === 2
                  ? 'w-[68vw] max-w-[240px] sm:w-[220px] lg:w-[212px]'
                  : i === 1 || i === 3
                    ? 'w-[110px] opacity-40 sm:w-[220px] sm:opacity-50 lg:w-[212px]'
                    : 'hidden w-[220px] opacity-25 sm:block lg:w-[212px]'
              }`}
            />
          ))}
        </div>
      ) : state === 'empty' ? (
        <div className="container-elato mt-12 flex flex-col items-center py-16 text-center lg:mt-16">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#E7CAA0]/30 to-[#9E7641]/20 text-[#9E7641]">
            <InstagramGlyph className="h-7 w-7" />
          </span>
          <h3 className="mt-5 text-h3 text-[#9E7641]">Instagram Moments</h3>
          <p className="text-body mx-auto mt-3 max-w-md text-neutral-warm-500">
            Fresh moments from ELATŌ will be shared here soon.
          </p>
          <FollowButton label="Follow @elato.in" className="mt-6" />
        </div>
      ) : (
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={headingReveal}
          className="container-elato mt-10 lg:mt-14"
        >
          <VideoShowcaseCarousel videos={videos} />
        </motion.div>
      )}
    </motion.section>
  )
}
