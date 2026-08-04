import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Volume2, VolumeX } from 'lucide-react'
import { useInView } from '../../lib/useInView'
import { InstagramVerifiedBadge } from './InstagramVerifiedBadge'
import elatoWordmark from '../../assets/logos/elato-wordmark.webp'
import type { VideoGalleryItem } from '../../lib/videoGalleryRepository'

// Falls back here whenever a video has no Instagram link, or the link isn't
// a real instagram.com URL — the backend already normalizes anything else
// to null (see video_gallery_service._normalize_instagram_url), so this
// component only ever needs to handle "missing".
const INSTAGRAM_FALLBACK_URL = 'https://www.instagram.com/elato.in/'

const EASE_EDITORIAL = [0.16, 1, 0.3, 1] as const

// Coverflow depth ladder, indexed by |distance from active|. Index 0 is the
// active card itself; everything past index 4 reuses the last (near-vanishing)
// step, which only matters when the gallery is at its 5-video cap and the
// active card sits at either end.
const DEPTH_STEPS = [
  { scale: 1.14, opacity: 1, blur: 0, brightness: 1, y: -10, z: 30 },
  { scale: 0.86, opacity: 0.55, blur: 1.5, brightness: 0.55, y: 0, z: 20 },
  { scale: 0.76, opacity: 0.32, blur: 2.5, brightness: 0.4, y: 0, z: 15 },
  { scale: 0.68, opacity: 0.16, blur: 3.5, brightness: 0.3, y: 0, z: 10 },
  { scale: 0.62, opacity: 0.08, blur: 4, brightness: 0.25, y: 0, z: 5 },
] as const

/**
 * One card in the homepage Instagram coverflow. `distance` (index − active
 * index) decides its depth treatment via DEPTH_STEPS — only `isActive` ever
 * plays, autoplays muted, and shows the handle/caption/mute overlay;
 * supporting cards are pure recede-into-the-background video tiles a click
 * brings back to center (see VideoShowcaseCarousel's `goTo`). `hasLoaded`
 * still gates mounting the `<video>` at all via `useInView`: nothing
 * downloads until a card has scrolled near the viewport once, and — once
 * true — stays mounted rather than tearing down, so re-entering view (or
 * becoming active again) resumes instantly instead of re-fetching.
 */
export function VideoShowcaseCard({
  video,
  isActive,
  distance,
  onSelect,
}: {
  video: VideoGalleryItem
  isActive: boolean
  distance: number
  onSelect: () => void
}) {
  const reduceMotion = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const { ref: inViewRef, inView } = useInView<HTMLDivElement>('300px 0px')
  const [muted, setMuted] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (inView) setHasLoaded(true)
  }, [inView])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (isActive) {
      el.play().catch(() => {
        // Autoplay can be rejected before the element is fully ready — the
        // dark placeholder stays visible and playback resumes next tick.
      })
    } else {
      el.pause()
      el.currentTime = 0
      setMuted(true)
    }
  }, [isActive, hasLoaded])

  // Belt-and-suspenders for the `loop` attribute: some mobile browsers can
  // fail to auto-restart on end (freezing on the last frame) when playback
  // was started via a JS `.play()` call rather than the `autoplay`
  // attribute, which is exactly how this video is started above.
  const handleEnded = () => {
    const el = videoRef.current
    if (!el) return
    el.currentTime = 0
    el.play().catch(() => {})
  }

  const instagramHref = video.instagramUrl || INSTAGRAM_FALLBACK_URL
  const depth = DEPTH_STEPS[Math.min(Math.abs(distance), DEPTH_STEPS.length - 1)]

  return (
    <div
      ref={inViewRef}
      className="w-[68vw] max-w-[240px] flex-none snap-center sm:w-[220px] lg:w-[212px]"
      style={{ zIndex: depth.z }}
    >
      <motion.div
        onClick={isActive ? undefined : onSelect}
        role={isActive ? undefined : 'button'}
        tabIndex={isActive ? undefined : 0}
        aria-label={isActive ? undefined : 'View this moment'}
        onKeyDown={
          isActive
            ? undefined
            : (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect()
                }
              }
        }
        animate={{
          scale: depth.scale,
          opacity: depth.opacity,
          y: depth.y,
          filter: `blur(${depth.blur}px) brightness(${depth.brightness})`,
        }}
        transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE_EDITORIAL }}
        className={`relative aspect-[9/16] w-full overflow-hidden rounded-[28px] border bg-[#140E09] ${
          isActive
            ? 'cursor-default border-[#E7CAA0]/30 shadow-[0_32px_70px_-20px_rgba(0,0,0,0.6)]'
            : 'cursor-pointer border-[#E7CAA0]/10 shadow-[0_10px_30px_-16px_rgba(0,0,0,0.5)]'
        }`}
      >
        {hasLoaded && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            muted={muted}
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            onEnded={handleEnded}
          >
            <source src={video.videoUrl} type={video.videoMime} />
          </video>
        )}

        {isActive && (
          <>
            {/* Top glass overlay — reads as an Instagram Reel's account row. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/55 via-black/10 to-transparent" />
            <div className="absolute left-3 top-3 flex items-center gap-1.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FBF3E4] p-1 ring-1 ring-white/40">
                <img src={elatoWordmark} alt="" aria-hidden="true" className="h-full w-full object-contain" />
              </span>
              <span className="flex items-center gap-1">
                <span className="text-xs font-semibold tracking-wide text-white drop-shadow-sm">elato.in</span>
                <InstagramVerifiedBadge className="h-3 w-3 shrink-0" />
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setMuted((m) => !m)
              }}
              aria-label={muted ? 'Unmute video' : 'Mute video'}
              aria-pressed={!muted}
              className="absolute right-3 top-3 z-[2] flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md transition-colors duration-300 hover:bg-black/55"
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" aria-hidden="true" /> : <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>

            {/* Bottom glass overlay — caption + Instagram CTA. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 p-4">
              {video.caption && <p className="line-clamp-2 text-sm text-white/90">{video.caption}</p>}
              <a
                href={instagramHref}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors duration-300 hover:bg-white/20"
              >
                View on Instagram
                <ArrowUpRight className="h-3 w-3 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
