import { useEffect, useState } from 'react'

export function MenuSearchBar({ onQueryChange }: { onQueryChange: (query: string) => void }) {
  const [value, setValue] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => onQueryChange(value), 300)
    return () => clearTimeout(timer)
  }, [value, onQueryChange])

  return (
    <div className="bg-transparent py-4 backdrop-blur-md">
      <div className="container-elato">
        <div className="relative mx-auto max-w-xl">
          <input
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search the menu — desserts, shakes, mains…"
            aria-label="Search the menu"
            className="h-12 w-full rounded-full border border-primary-100 bg-surface-elevated px-5 text-body shadow-elato-sm focus-visible:border-secondary-500"
          />
        </div>
      </div>
    </div>
  )
}
