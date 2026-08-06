import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Navbar } from './components/layout/Navbar'
import { Footer } from './components/layout/Footer'
import { Splash } from './components/splash/Splash'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineBanner } from './components/OfflineBanner'
import { ScrollToTopButton } from './components/ui/ScrollToTopButton'
import { ScratchOfferPopup } from './components/offers/ScratchOfferPopup'
import { FloatingOfferButton } from './components/offers/FloatingOfferButton'
import { PageTransitionProvider } from './lib/pageTransition'
import { MaintenancePage } from './pages/MaintenancePage'
import { apiGet } from './lib/apiClient'

// Route-based code splitting (PRD Ch. 46.2) — each page ships as its own chunk.
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const StayPage = lazy(() => import('./pages/StayPage').then((m) => ({ default: m.StayPage })))
const CelebrePage = lazy(() => import('./pages/CelebrePage').then((m) => ({ default: m.CelebrePage })))
const EventsPage = lazy(() => import('./pages/EventsPage').then((m) => ({ default: m.EventsPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })))
const TermsPage = lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })))
const CookiePolicyPage = lazy(() => import('./pages/CookiePolicyPage').then((m) => ({ default: m.CookiePolicyPage })))
const BlogIndexPage = lazy(() => import('./pages/BlogIndexPage').then((m) => ({ default: m.BlogIndexPage })))
const BlogPostPage = lazy(() => import('./pages/BlogPostPage').then((m) => ({ default: m.BlogPostPage })))

function RouteFallback() {
  return <div className="min-h-screen bg-surface-base" aria-hidden="true" />
}

// Gates the whole public site behind the admin-controlled maintenance flag
// (settings key `feature_flags.maintenance_mode`). Checked once per load —
// defaults to 'off' on any fetch failure so a backend hiccup never takes the
// site down on its own.
function useMaintenanceMode() {
  const [enabled, setEnabled] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiGet<{ enabled: boolean }>('/api/v1/maintenance-status')
      .then((res) => {
        if (!cancelled) setEnabled(res.enabled)
      })
      .catch(() => {
        if (!cancelled) setEnabled(false)
      })
      .finally(() => {
        if (!cancelled) setChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { enabled, checked }
}

// react-router's BrowserRouter never resets scroll on navigation — without
// this, going Home -> Stay/Célébré/Events lands mid-page at the old scroll
// position, so every `whileInView` reveal already in the viewport fires at
// once instead of staggering in as the user scrolls. That pile-up (plus the
// new page's hero mounting off-screen) is what reads as navigation jank.
//
// Only reset on an actual route change, not on the initial mount: firing on
// mount raced the browser's native scroll restoration on refresh (the SPA
// shell starts near-empty, so this scrollTo(0,0) and the browser's saved-Y
// restore fought over a document that was still growing as lazy chunks
// loaded, and the browser's restore — clamped to the still-short page —
// tended to win, landing on the footer instead of the top).
//
// The guard compares against the previous pathname rather than a "have I
// run yet" boolean: React 18 StrictMode double-invokes mount effects in dev,
// and a boolean flips to false after the first invocation, so the second
// invocation of that *same* mount would still fire scrollTo(0, 0). Comparing
// values instead of a one-shot flag makes both invocations agree there was
// no real change.
function ScrollToTop() {
  const { pathname } = useLocation()
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      window.scrollTo(0, 0)
    }
    prevPathname.current = pathname
  }, [pathname])

  return null
}

// Navbar "About"/"Visit" links point at `#about`/`#visit` on the homepage.
// From another page they now navigate via <Link> (client-side) instead of a
// plain <a> (which forced a full reload and tried to jump to the anchor
// before HomePage's lazy chunk had even rendered it, so it silently failed).
// React Router doesn't scroll to hash targets on its own, and the target can
// still be behind that lazy chunk, so watch the DOM until it mounts.
function HashScroll() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    const id = hash.slice(1)
    if (!id) return

    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ block: 'start' })
      return
    }

    const observer = new MutationObserver(() => {
      const target = document.getElementById(id)
      if (target) {
        target.scrollIntoView({ block: 'start' })
        observer.disconnect()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    const timeout = window.setTimeout(() => observer.disconnect(), 5000)

    return () => {
      observer.disconnect()
      window.clearTimeout(timeout)
    }
  }, [pathname, hash])

  return null
}

const SCROLL_STORAGE_KEY = 'elato-scroll-positions'

function readScrollStore(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(SCROLL_STORAGE_KEY) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

function writeScrollStore(store: Record<string, number>) {
  try {
    sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // sessionStorage may be unavailable (private browsing, quota) — best-effort only
  }
}

// Takes over scroll restoration on refresh/back-forward now that the browser's
// own `scrollRestoration` is set to 'manual' (index.html) — see that comment
// for why native restoration can't work reliably against lazily-loaded routes.
//
// Persists the scroll offset to sessionStorage keyed by `location.key`, which
// react-router keeps stable for a given history entry — including the one a
// refresh reloads into — but which is always fresh for a genuine navigation
// (Link click), so this never fights ScrollToTop's reset-to-top there. On
// restore, it waits for the document to actually grow tall enough to reach
// the saved offset before applying it, rather than guessing at a fixed delay.
function ScrollPositionRestoration() {
  const { key, hash } = useLocation()

  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const store = readScrollStore()
        store[key] = window.scrollY
        writeScrollStore(store)
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [key])

  useEffect(() => {
    if (hash) return // hash-anchored landings are owned by HashScroll

    const targetY = readScrollStore()[key]
    if (!targetY) return

    const canReach = () => document.documentElement.scrollHeight - window.innerHeight >= targetY

    if (canReach()) {
      window.scrollTo(0, targetY)
      return
    }

    const observer = new MutationObserver(() => {
      if (canReach()) {
        window.scrollTo(0, targetY)
        observer.disconnect()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    const timeout = window.setTimeout(() => observer.disconnect(), 5000)

    return () => {
      observer.disconnect()
      window.clearTimeout(timeout)
    }
  }, [key, hash])

  return null
}

function App() {
  const { enabled: maintenanceMode, checked: maintenanceChecked } = useMaintenanceMode()

  if (!maintenanceChecked) return <RouteFallback />
  if (maintenanceMode) return <MaintenancePage />

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <PageTransitionProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-secondary-900 focus:px-4 focus:py-2.5 focus:text-white focus:shadow-elato-lg"
          >
            Skip to content
          </a>
          <OfflineBanner />
          <ScrollToTop />
          <ScrollPositionRestoration />
          <HashScroll />
          <Splash />
          <Navbar />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/elato-stay" element={<StayPage />} />
              <Route path="/elato-celebre" element={<CelebrePage />} />
              <Route path="/elato-events" element={<EventsPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms-conditions" element={<TermsPage />} />
              <Route path="/cookie-policy" element={<CookiePolicyPage />} />
              <Route path="/blog" element={<BlogIndexPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <Footer />
          <ScrollToTopButton />
          <FloatingOfferButton />
          <ScratchOfferPopup />
        </PageTransitionProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
