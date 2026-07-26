import { useEffect, useRef, useState } from 'react'
import type { Category } from '../../../content/celebreContent'

// Navbar height (h-20 = 80px) — on mobile (the only breakpoint this bar is
// sticky at) it rests flush beneath the navbar once scrolled, so its sticky
// offset and the IntersectionObserver rootMargin below share this constant.
const STICKY_OFFSET = 80

export function CategoryFilterBar({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const [isStuck, setIsStuck] = useState(false)

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    // Ratio drops below 1 the instant the sticky element starts getting
    // clipped by the offset root edge — i.e. exactly when it "becomes"
    // sticky, without a second sentinel node or a scroll listener.
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(entry.intersectionRatio < 1),
      { threshold: [1], rootMargin: `-${STICKY_OFFSET + 1}px 0px 0px 0px` },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={barRef} className="sticky top-20 z-20 lg:relative lg:top-auto">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 transition-all duration-500 ease-out ${
          isStuck
            ? 'translate-y-0 bg-surface-base/85 opacity-100 shadow-elato-sm backdrop-blur-md backdrop-saturate-150'
            : '-translate-y-1 opacity-0'
        }`}
      />
      <div className="container-elato relative">
        <div className="scrollbar-hide flex gap-2.5 overflow-x-auto py-3 [-webkit-overflow-scrolling:touch] lg:flex-wrap lg:overflow-visible">
          <CategoryChip label="All" selected={selectedId === null} onClick={() => onSelect(null)} />
          {categories.map((category) => (
            <CategoryChip
              key={category.id}
              label={category.name}
              selected={selectedId === category.id}
              onClick={() => onSelect(category.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function CategoryChip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`shrink-0 whitespace-nowrap rounded-full border px-5 text-body font-medium tracking-wide transition-all duration-300 ease-out active:scale-95 ${
        selected
          ? 'h-11 border-secondary-500 bg-secondary-500 text-white shadow-elato-sm'
          : 'h-11 border-primary-100 bg-surface-elevated/70 text-neutral-warm-500 hover:border-secondary-500/40 hover:bg-sand-light hover:text-secondary-900'
      }`}
    >
      {label}
    </button>
  )
}
