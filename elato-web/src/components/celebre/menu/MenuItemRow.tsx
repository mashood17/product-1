import { memo } from 'react'
import type { MenuItem } from '../../../content/celebreContent'

export const MenuItemRow = memo(function MenuItemRow({
  item,
  onOpen,
}: {
  item: MenuItem
  onOpen: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className="group flex w-full items-center justify-between gap-4 border-b border-primary-100/60 py-5 text-left transition-colors duration-300 last:border-b-0 lg:hover:bg-[#9E7641]/5"
    >
      <span className="flex items-center gap-4 transition-transform duration-300 lg:group-hover:translate-x-1">
        <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#9E7641]" aria-hidden="true" />
        <span className="text-body font-medium text-secondary-900 underline decoration-transparent decoration-1 underline-offset-4 transition-colors group-hover:decoration-secondary-500">
          {item.name}
        </span>
      </span>
      <span className="flex items-center gap-4">
        <span className="text-sm tabular-nums text-neutral-warm-500 transition-colors duration-300 lg:group-hover:text-[#9E7641]">
          ₹{item.price}
        </span>
        <span
          className="flex h-6 w-6 items-center justify-center text-lg text-secondary-500 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
          aria-hidden="true"
        >
          ›
        </span>
      </span>
    </button>
  )
})
