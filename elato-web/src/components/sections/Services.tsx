import { useEffect, useRef, useState, type RefObject } from 'react'
import { motion } from 'framer-motion'
import { ServiceCard } from '../ui/ServiceCard'
import { servicesContent, servicesHeading } from '../../content/siteContent'
import { serviceImages, serviceImageKeys } from '../../content/serviceImages'
import { useSiteImages } from '../../lib/useSiteImage'
import { useSectionExitFade } from '../../lib/useSectionExitFade'
import { useHeroBackgrounds } from '../../lib/useHeroBackgrounds'
import { registerServicesScene, useServicesSceneActive } from '../../lib/useServicesSceneActive'

const routes: Record<string, string> = {
  stay: '/elato-stay',
  celebre: '/elato-celebre',
  events: '/elato-events',
}

// Fraction of the carousel row that must be vertically visible before the
// cards' entrance stagger fires.
const ENTRANCE_RATIO = 0.3

/**
 * "Scene entered" signal for the cards' entrance animation. Latches `true`
 * once ENTRANCE_RATIO of the observed element is visible and *stays* true
 * for as long as any part of it remains on screen — so the reset back to
 * `false` (which re-arms the entrance for the next visit) only ever happens
 * fully off-screen, never as a visible reverse animation while scrolling
 * away. Horizontal swiping inside the row never changes its vertical
 * visibility, so it can never replay the entrance.
 */
function useSceneEntrance<T extends Element>(): { ref: RefObject<T | null>; entered: boolean } {
  const ref = useRef<T>(null)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= ENTRANCE_RATIO) {
          setEntered(true)
        } else if (!entry.isIntersecting) {
          setEntered(false)
        }
      },
      { threshold: [0, ENTRANCE_RATIO] },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, entered }
}

const VIDEO_BREAKPOINT_QUERY = '(min-width: 768px)'

/**
 * Cinematic backdrop for the Services scene — the same admin-managed Hero
 * footage (same `useHeroBackgrounds` source, same breakpoint slot, so the
 * atmosphere reads as one continuous world from Hero into Services), graded
 * much darker here: a charcoal scrim plus an edge vignette keep the moving
 * image clearly alive behind the cards without ever competing with them.
 * The flat espresso base tone renders instantly underneath, so before the
 * video loads (or when no slot is uploaded) this degrades to exactly the
 * old solid backdrop. `playing` is section-level visibility (any part of
 * Services in the viewport), not the cards' own entrance signal — the
 * footage is already moving throughout the Hero → Services glide, so
 * nothing "starts" once the scene lands; it was already alive underneath.
 * Playback pauses whenever the section is fully off-screen — same "don't
 * pay for off-screen motion" pattern as the hero.
 */
function ServicesVideoBackdrop({ playing }: { playing: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(VIDEO_BREAKPOINT_QUERY).matches,
  )
  const { desktop, mobile } = useHeroBackgrounds()
  const active = isDesktop ? desktop : mobile

  useEffect(() => {
    const mql = window.matchMedia(VIDEO_BREAKPOINT_QUERY)
    const update = () => setIsDesktop(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (playing) {
      video.play().catch(() => {
        // Autoplay can be rejected before the element is fully ready —
        // harmless, playback resumes on the next visibility tick.
      })
    } else {
      video.pause()
    }
  }, [playing, active?.video_url])

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Instant base tone — nothing to flash while the video loads. */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(130% 100% at 50% 0%, #241C15 0%, #191410 55%, #120D0A 100%)' }}
      />
      {active && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          key={active.video_url}
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover object-center"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={active.poster_url ?? undefined}
          disablePictureInPicture
        >
          <source src={active.video_url} type={active.video_mime} />
        </video>
      )}
      {/* Charcoal grade + vignette: a warm dark scrim heavy enough that the
          cards own the frame, light enough that the footage's movement
          stays clearly visible; the radial layer pulls the edges darker so
          the centre — where the cards sit — carries the residual light. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 105% at 50% 45%, rgba(18,13,10,0) 30%, rgba(14,10,7,0.75) 100%),' +
            'linear-gradient(180deg, rgba(18,13,10,0.92) 0%, rgba(18,13,10,0.86) 45%, rgba(14,10,7,0.93) 100%)',
        }}
      />
    </div>
  )
}

/**
 * Immersive editorial carousel (Rolex-style interaction philosophy, ELATŌ's
 * own visuals/copy) — image + title only, no heading block, no card body
 * copy, no CTA. Desktop shows the three cards as a single centered row of
 * identical cards; mobile switches to a native horizontal snap-scroll strip
 * (momentum + snapping come free from the browser, no drag/JS carousel
 * logic needed for exactly three items) with one card centered and its
 * neighbours peeking at the edges via the container's own side padding.
 *
 * The deep charcoal/espresso backdrop (replacing the previous light bg2.webp
 * photo background) is the other half of the "Rolex" feel — it's what lets
 * HeroServicesReveal crossfade the warm hero into this section without an
 * abrupt color cut, since the two now bridge through the same dark tone.
 *
 * The section is a full-viewport scene on both breakpoints — edge-to-edge,
 * no rounding/shadow/margin — since after the Hero transition lands here it
 * must read as "the whole screen changed atmosphere", with neither Hero nor
 * About visible. The cards' entrance stagger is driven by useSceneEntrance
 * above (section visibility, not per-card visibility, so all three enter
 * together without needing a swipe). The section itself has no
 * rise/positioning logic — that's driven from outside by HeroServicesReveal
 * — and the shared useSectionExitFade hook (same one every Home section
 * uses) handles the handoff into About.
 */
export function Services() {
  const exitFade = useSectionExitFade<HTMLElement>()
  const entrance = useSceneEntrance<HTMLDivElement>()
  // Section-level (not card-level) visibility — the same shared signal the
  // floating chrome hides on — so the backdrop video is already rolling the
  // instant Services starts entering during the Hero glide, rather than
  // waiting on the cards' own later entrance threshold.
  const sceneVisible = useServicesSceneActive()
  const images = useSiteImages({
    [serviceImageKeys.celebre]: serviceImages.celebre,
    [serviceImageKeys.stay]: serviceImages.stay,
    [serviceImageKeys.events]: serviceImages.events,
  })

  // Register this section as the scene the floating chrome (Navbar, Back to
  // Top, Gift button) must vanish for. Registration lives here — driven by
  // the section's own lifecycle — so the shared visibility state exists
  // exactly as long as the section does, with no dependence on lazy-chunk
  // mount order (see useServicesSceneActive for why that matters).
  useEffect(() => {
    const el = exitFade.ref.current
    if (el) return registerServicesScene(el)
  }, [exitFade.ref])

  return (
    <motion.section
      id="services"
      ref={exitFade.ref}
      style={{ opacity: exitFade.style.opacity }}
      // Full-bleed scene on every breakpoint: the transition glide lands
      // with this section's top at the viewport top, so `min-h-[100dvh]`
      // (dvh tracks the *visible* viewport as mobile browser chrome
      // collapses/expands) guarantees it covers the whole screen — no Hero
      // above it, no About peeking below, no cream strip, no rounded-sheet
      // notches. Content is vertically centered inside that full viewport.
      className="relative z-0 flex min-h-[100dvh] flex-col justify-center overflow-hidden py-10 font-sans lg:py-12"
    >
      {/* Continuation of the Hero footage, graded deep charcoal — the same
          living atmosphere instead of a flat dark fill. */}
      <ServicesVideoBackdrop playing={sceneVisible} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#2C2318]/60 to-transparent"
      />

      {/* Visually hidden — the carousel is deliberately heading-free (see
          file header comment), but the section still needs a real h2 so the
          page's heading order doesn't jump from the h1 straight to each
          card's h3. */}
      <h2 className="sr-only">{servicesHeading.title}</h2>

      <div
        ref={entrance.ref}
        className={
          // Mobile: card width 78vw + 11vw side padding is the deliberate
          // pair here — padding = (100vw - cardWidth) / 2 so the active card
          // sits exactly centered at rest (scrollLeft 0 already satisfies
          // snap-center for card 1, no browser-side correction needed), and
          // that same 11vw is what's left over at each viewport edge for the
          // neighbouring card to peek into — roughly 7% of viewport width
          // once the fixed `gap-4` (1rem) between cards is subtracted.
          // `scroll-pl/pr` mirror the padding explicitly as scroll-padding
          // (a separate scroll-snap concept from the container's own CSS
          // padding) so the centered-snap math holds even on engines that
          // don't fall back to the padding box for it.
          // Desktop: no max-width clamp — the row is sized by the three
          // identical viewport-derived cards themselves and centered, so
          // the negative space around the triptych stays balanced at any
          // window size.
          'scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto px-[11vw] scroll-pl-[11vw] scroll-pr-[11vw] ' +
          'lg:snap-none lg:justify-center lg:gap-6 lg:overflow-visible lg:px-8 lg:scroll-pl-0 lg:scroll-pr-0'
        }
      >
        {servicesContent.map((service, index) => (
          <ServiceCard
            key={service.id}
            title={service.title}
            imageSrc={images[serviceImageKeys[service.id]]}
            href={routes[service.id]}
            index={index}
            entered={entrance.entered}
          />
        ))}
      </div>
    </motion.section>
  )
}
