import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MenuSearchBar } from './menu/MenuSearchBar'
import { CategoryFilterBar } from './menu/CategoryFilterBar'
import { CategoryRow } from './menu/CategoryRow'
import { SearchResultsGrid } from './menu/SearchResultsGrid'
import { ItemDetailModal } from './menu/ItemDetailModal'
import { getCategories, getMenuItems, searchMenuItems } from '../../lib/menuRepository'
import type { Category, MenuItem } from '../../content/celebreContent'
import { sectionReveal, viewportOnce } from '../../lib/motion'
import bgDesktop from '../../assets/newbg/bg2.webp'
import bgMobile from '../../assets/newbg/bg-mb2.webp'

// Navbar (80px) + sticky category pill bar (~68px) — kept in sync with
// CategoryFilterBar's own STICKY_OFFSET so scrolled-to sections and the
// scroll-spy activation line land just below both sticky layers.
const SCROLL_OFFSET = 150

export function MenuSection() {
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[] | null>(null)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MenuItem[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const requestId = useRef(0)
  const categoriesContainerRef = useRef<HTMLDivElement>(null)

  const loadMenu = () => {
    const id = ++requestId.current
    setLoadError(false)
    setCategories(null)
    setMenuItems(null)
    Promise.all([getCategories(), getMenuItems()])
      .then(([cats, items]) => {
        if (requestId.current !== id) return
        setCategories(cats)
        setMenuItems(items)
      })
      .catch(() => {
        // Same stale-request guard as FeaturedSpecials — without it, an
        // older in-flight request (StrictMode's double effect invoke, or an
        // overlapping "Try again" click) can reject after a newer one has
        // already succeeded and permanently flip the section to the error
        // state despite the menu having loaded correctly.
        if (requestId.current === id) setLoadError(true)
      })
  }

  useEffect(() => {
    loadMenu()
  }, [])

  useEffect(() => {
    if (!query) {
      setSearchResults([])
      return
    }
    setSearching(true)
    searchMenuItems(query).then((results) => {
      setSearchResults(results)
      setSearching(false)
    })
  }, [query])

  const itemsByCategory = useMemo(() => {
    if (!menuItems) return new Map<string, MenuItem[]>()
    const map = new Map<string, MenuItem[]>()
    for (const item of menuItems) {
      const list = map.get(item.categoryId) ?? []
      list.push(item)
      map.set(item.categoryId, list)
    }
    return map
  }, [menuItems])

  // Scroll-spy: keep the active pill in sync with whichever category
  // section is currently under the sticky nav + pill bar as the user
  // scrolls manually.
  useEffect(() => {
    if (query || !categories || !menuItems) return
    const container = categoriesContainerRef.current
    if (!container) return
    const sections = Array.from(container.querySelectorAll<HTMLElement>('[data-category-id]'))
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length === 0) return
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
        setSelectedCategoryId(topMost.target.getAttribute('data-category-id'))
      },
      { rootMargin: `-${SCROLL_OFFSET}px 0px -70% 0px`, threshold: 0 },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [categories, menuItems, query])

  const handleCategorySelect = (id: string | null) => {
    setSelectedCategoryId(id)
    const target = id ? document.getElementById(`menu-category-${id}`) : document.getElementById('menu')
    if (!target) return
    const top = target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <motion.section id="menu" className="relative">
      {/* No overflow-hidden here (removed) — these bg layers are exact
          inset-0 with no transform, so nothing bleeds without clipping,
          and an ancestor with overflow != visible would otherwise break
          position:sticky for the search bar / category filter bar below. */}
      <div className="absolute inset-0 -z-10 bg-cover bg-center sm:hidden" style={{ backgroundImage: `url(${bgMobile})` }} aria-hidden="true" />
      <div className="absolute inset-0 -z-10 hidden bg-cover bg-center sm:block" style={{ backgroundImage: `url(${bgDesktop})` }} aria-hidden="true" />

      <div className="container-elato pb-4 pt-16 text-center lg:pb-6 lg:pt-32">
        <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={sectionReveal}>
          <p className="text-caption text-secondary-500">Curated Menu</p>
          <h2 className="text-h2 mt-3 font-sans font-bold text-[#9e7641] lg:text-[44px] lg:leading-[1.1]">
            Explore the Complete ELATŌ Collection
          </h2>
        </motion.div>
      </div>

      <MenuSearchBar onQueryChange={setQuery} />

      {categories && categories.length > 0 && (
        <CategoryFilterBar
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={handleCategorySelect}
        />
      )}

      <div className="container-elato">
        {query ? (
          <SearchResultsGrid
            items={searchResults}
            loading={searching}
            query={query}
            onOpenItem={setOpenItemId}
          />
        ) : loadError ? (
          <div className="py-16 text-center">
            <p className="text-body text-neutral-warm-500">The menu couldn&rsquo;t be loaded right now.</p>
            <button
              type="button"
              onClick={loadMenu}
              className="text-body mt-3 font-semibold text-secondary-500 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : !categories || !menuItems ? (
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={sectionReveal}
            className="text-body py-16 text-center text-neutral-warm-500"
          >
            Loading the menu…
          </motion.p>
        ) : (
          <div ref={categoriesContainerRef} className="divide-y divide-primary-100">
            {categories.map((category, i) => (
              <CategoryRow
                key={category.id}
                category={category}
                items={itemsByCategory.get(category.id) ?? []}
                index={i}
                onOpenItem={setOpenItemId}
              />
            ))}
          </div>
        )}
      </div>

      <ItemDetailModal itemId={openItemId} onClose={() => setOpenItemId(null)} />
    </motion.section>
  )
}
