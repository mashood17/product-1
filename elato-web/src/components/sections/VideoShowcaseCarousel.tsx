import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { VideoShowcaseCard } from '../ui/VideoShowcaseCard'
import type { VideoGalleryItem } from '../../lib/videoGalleryRepository'

const ARROW_CLASSES =
  'absolute top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#E7CAA0]/50 bg-white/30 text-[#7c5d31] shadow-[0_12px_30px_-10px_rgba(148,113,43,0.55)] backdrop-blur-xl transition-colors duration-300 ease-out hover:border-[#E7CAA0] hover:bg-white/55 disabled:pointer-events-none disabled:opacity-30'

/**
 * Coverflow strip for the homepage Instagram section — background cards on
 * either side of a dominant, centered active card (see VideoShowcaseCard's
 * DEPTH_STEPS). Whichever card sits nearest the track's horizontal center
 * becomes active on scroll/swipe; the arrows and clicking a background card
 * both go through `goTo`, which wraps at either end (infinite navigation)
 * and smooth-scrolls the target card to dead center.
 *
 * `applyEdgePadding` is the fix for true center-alignment: without it, once
 * the five cards fit inside the track's own width (routinely true on
 * desktop), the track has nothing to scroll and the first/last cards can
 * physically never reach the viewport's center — there's no scroll range
 * left to get them there. Padding each end by half the leftover space (track
 * width minus one card width) guarantees genuine scrollable overflow no
 * matter the breakpoint, so scrollLeft 0 centers the first card and the
 * natural max scrollLeft centers the last one.
 */
export function VideoShowcaseCarousel({ videos }: { videos: VideoGalleryItem[] }) {
  const reduceMotion = useReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const activeIndexRef = useRef(0)

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  const applyEdgePadding = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const firstCard = track.children[0] as HTMLElement | undefined
    if (!firstCard) return
    const pad = Math.max(0, (track.clientWidth - firstCard.getBoundingClientRect().width) / 2)
    track.style.paddingLeft = `${pad}px`
    track.style.paddingRight = `${pad}px`
  }, [])

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const trackRect = track.getBoundingClientRect()
    const center = trackRect.left + trackRect.width / 2
    let closestIndex = 0
    let closestDistance = Infinity
    Array.from(track.children).forEach((child, i) => {
      const rect = (child as HTMLElement).getBoundingClientRect()
      const distance = Math.abs(rect.left + rect.width / 2 - center)
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = i
      }
    })
    setActiveIndex(closestIndex)
  }, [])

  const centerOn = useCallback((index: number, behavior: ScrollBehavior) => {
    const track = trackRef.current
    if (!track) return
    const target = track.children[index] as HTMLElement | undefined
    if (!target) return
    const trackRect = track.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const delta = targetRect.left + targetRect.width / 2 - (trackRect.left + trackRect.width / 2)
    track.scrollTo({ left: track.scrollLeft + delta, behavior })
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    applyEdgePadding()
    measure()

    const onScroll = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(measure)
    }
    track.addEventListener('scroll', onScroll, { passive: true })

    const resizeObserver = new ResizeObserver(() => {
      applyEdgePadding()
      measure()
      // Re-center instantly (not "smooth") so a viewport/breakpoint change
      // doesn't trigger a visible animated scroll on its own.
      centerOn(activeIndexRef.current, 'auto')
    })
    resizeObserver.observe(track)

    return () => {
      track.removeEventListener('scroll', onScroll)
      resizeObserver.disconnect()
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [applyEdgePadding, measure, centerOn, videos.length])

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current
      if (!track) return
      const length = track.children.length
      if (length === 0) return
      // Infinite navigation: wrap past either end instead of stopping.
      const wrapped = ((index % length) + length) % length
      setActiveIndex(wrapped)
      centerOn(wrapped, reduceMotion ? 'auto' : 'smooth')
    },
    [centerOn, reduceMotion],
  )

  return (
    <div className="relative">
      {videos.length > 1 && (
        <motion.button
          type="button"
          onClick={() => goTo(activeIndex - 1)}
          aria-label="Previous moment"
          whileHover={{ scale: 1.08, y: -1 }}
          whileTap={{ scale: 0.94 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`${ARROW_CLASSES} left-0 -translate-x-4 lg:-translate-x-6`}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </motion.button>
      )}

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto py-10 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {videos.map((video, i) => (
          <VideoShowcaseCard
            key={video.id}
            video={video}
            isActive={i === activeIndex}
            distance={i - activeIndex}
            onSelect={() => goTo(i)}
          />
        ))}
      </div>

      {videos.length > 1 && (
        <motion.button
          type="button"
          onClick={() => goTo(activeIndex + 1)}
          aria-label="Next moment"
          whileHover={{ scale: 1.08, y: -1 }}
          whileTap={{ scale: 0.94 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`${ARROW_CLASSES} right-0 translate-x-4 lg:translate-x-6`}
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </motion.button>
      )}
    </div>
  )
}
