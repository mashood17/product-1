import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Gift } from 'lucide-react'
import { getActiveOffer } from '../../lib/offerRepository'
import { openOfferPopup } from '../../lib/offerPopupEvents'
import { useScrollPast } from '../../lib/useScrollPast'
import { useServicesSceneActive } from '../../lib/useServicesSceneActive'

const SHOW_AFTER_PX = 480
const getShowThreshold = () => SHOW_AFTER_PX

// Home and Celebré only — Stay and Events must not render this at all.
const ALLOWED_PATHS = new Set(['/', '/elato-celebre'])

/**
 * Persistent floating trigger for the scratch-card offer, stacked directly
 * above ScrollToTopButton (same fixed-corner convention, one size class
 * smaller vertical gap so both read as a single button stack rather than
 * two unrelated floating controls). Only renders once an active offer
 * actually exists — nothing to open otherwise. Shares ScrollToTopButton's
 * exact scroll-visibility threshold/hook so the two always appear and
 * disappear together.
 */
export function FloatingOfferButton() {
  const { pathname } = useLocation()
  const [hasOffer, setHasOffer] = useState(false)
  const scrolledPast = useScrollPast(getShowThreshold)
  // Hidden while Services is the active full-screen scene (same shared
  // signal Navbar and ScrollToTopButton use) — AnimatePresence's existing
  // exit transition handles the fade both ways.
  const servicesActive = useServicesSceneActive()

  useEffect(() => {
    let cancelled = false
    getActiveOffer().then((offer) => {
      if (!cancelled) setHasOffer(!!offer)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!ALLOWED_PATHS.has(pathname)) return null

  return (
    <AnimatePresence>
      {hasOffer && scrolledPast && !servicesActive && (
        <motion.button
          type="button"
          onClick={openOfferPopup}
          aria-label="View our exclusive offer"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.94 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="group fixed bottom-[4.75rem] right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-[#e7caa0]/50 bg-gradient-to-b from-[#3a2c17] to-[#1c150c] text-[#e7caa0] shadow-elato-lg backdrop-blur-sm transition-colors duration-300 ease-out hover:border-[#9e7641] hover:from-[#4a3a22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9e7641]/50 sm:bottom-[6.5rem] sm:right-8 sm:h-14 sm:w-14"
        >
          <span
            className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-[#9e7641]/30 transition-transform duration-300 ease-out group-hover:scale-110"
            aria-hidden="true"
          />
          <Gift className="h-5 w-5 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 sm:h-6 sm:w-6" aria-hidden="true" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
