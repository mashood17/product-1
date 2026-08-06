import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { DetailModalShell } from './menu/DetailModalShell'
import { useBasket } from '../../lib/basketContext'
import type { Special } from '../../content/celebreContent'

/**
 * Detail popup for a Featured Special — built on the same DetailModalShell
 * as the menu's ItemDetailModal, so the two can never end up different
 * sizes. Rendered straight from the Special already held in memory (no
 * fetch, since specials aren't menu items).
 */
export function SpecialDetailModal({ special, onClose }: { special: Special | null; onClose: () => void }) {
  const [added, setAdded] = useState(false)
  const { addItem } = useBasket()

  useEffect(() => {
    if (!special) return
    setAdded(false)
  }, [special])

  return (
    <DetailModalShell open={!!special} ariaLabel={special?.name ?? 'Special details'} onClose={onClose}>
      {special && (
        <>
          <div
            className="aspect-video w-full overflow-hidden rounded-t-lg bg-gradient-to-br from-primary-300 via-primary-100 to-secondary-500"
            aria-hidden="true"
          >
            {special.imageUrl && (
              <img src={special.imageUrl} alt={special.name} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="p-6 lg:p-8">
            <p className="text-caption text-secondary-500">Featured Special</p>
            <h2 className="text-h2 mt-2 text-secondary-900">{special.name}</h2>
            <p className="text-body mt-3 text-neutral-warm-500">{special.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-h3 text-secondary-900">₹{special.price}</p>
            </div>

            <Button
              variant="primary"
              className="mt-6 w-full"
              disabled={added}
              onClick={() => {
                addItem({ id: special.id, name: special.name, price: special.price })
                setAdded(true)
              }}
            >
              {added ? 'Added to Order' : 'Add to Delivery Order'}
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="text-body mt-4 w-full text-center text-neutral-warm-500 hover:text-secondary-500"
            >
              Close
            </button>
          </div>
        </>
      )}
    </DetailModalShell>
  )
}
