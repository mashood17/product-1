import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../../ui/Button'
import { getMenuItemById } from '../../../lib/menuRepository'
import { categories } from '../../../content/celebreContent'
import type { MenuItem } from '../../../content/celebreContent'
import { useBasket } from '../../../lib/basketContext'

export function ItemDetailModal({ itemId, onClose }: { itemId: string | null; onClose: () => void }) {
  const [item, setItem] = useState<MenuItem | null>(null)
  const [added, setAdded] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)
  const { addItem } = useBasket()

  useEffect(() => {
    if (!itemId) return
    triggerRef.current = document.activeElement
    setItem(null)
    setAdded(false)
    getMenuItemById(itemId).then((result) => setItem(result ?? null))
  }, [itemId])

  useEffect(() => {
    if (!itemId) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    dialogRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus()
    }
  }, [itemId, onClose])

  const categoryName = item ? categories.find((c) => c.id === item.categoryId)?.name : undefined

  return (
    <>
      {itemId && (
        // No AnimatePresence here on purpose: an exit animation gates React's
        // unmount on the transition completing, which — if a browser ever
        // stalls animation frames for this tab — would leave the modal stuck
        // open. The entrance still animates; closing is instant and reliable.
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={item?.name ?? 'Menu item details'}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-surface-elevated shadow-elato-xl"
          >
            {!item ? (
              <p className="text-body p-10 text-center text-neutral-warm-500">Loading…</p>
            ) : (
              <>
                <div
                  className="aspect-4/3 w-full overflow-hidden rounded-t-lg bg-gradient-to-br from-primary-300 via-primary-100 to-secondary-500"
                  aria-hidden="true"
                >
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-6 lg:p-8">
                  <p className="text-caption text-secondary-500">{categoryName}</p>
                  <h2 className="text-h2 mt-2 font-sans text-secondary-900">{item.name}</h2>
                  <p className="text-body mt-3 text-neutral-warm-500">{item.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-h3 text-secondary-900">₹{item.price}</p>
                    <p className="text-caption text-neutral-warm-500">
                      {item.deliveryAvailable ? 'Available for delivery' : 'Dine-in only'}
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    className="mt-6 w-full"
                    disabled={!item.deliveryAvailable || added}
                    onClick={() => {
                      addItem({ id: item.id, name: item.name, price: item.price })
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
          </motion.div>
        </motion.div>
      )}
    </>
  )
}
