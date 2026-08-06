import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { faqHeading, faqItems, type FaqHeading, type FaqItem } from '../../content/faqContent'
import { viewportOnce } from '../../lib/motion'

const EASE_EDITORIAL = [0.16, 1, 0.3, 1] as const

export interface FaqSectionProps {
  /** Defaults to the homepage heading/items — pass page-specific content
   * (see faqContent.ts) to reuse this section on Celebré/Events/Stay. */
  heading?: FaqHeading
  items?: FaqItem[]
}

/**
 * Native <details>/<summary> — expand/collapse works with zero JS and is
 * screen-reader/keyboard accessible for free, unlike a hand-rolled
 * accordion. Also backs faqJsonLd (see routeSeo.ts): this is the visible
 * content Google's FAQPage rich-result guidelines require the markup to match.
 */
export function FaqSection({ heading = faqHeading, items = faqItems }: FaqSectionProps) {
  return (
    <section id="faq" className="relative bg-surface-base py-16 font-sans lg:py-24">
      <div className="container-elato">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7, ease: EASE_EDITORIAL }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-caption text-[#9E7641]">{heading.overline}</p>
          <span className="mx-auto mt-2 block h-px w-10 bg-[#E7CAA0]" aria-hidden="true" />
          <h2 className="mt-3 text-[28px] font-bold leading-tight text-[#9E7641] lg:text-[42px]">
            {heading.title}
          </h2>
          <p className="text-body mt-3 text-neutral-warm-500">{heading.description}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7, ease: EASE_EDITORIAL, delay: 0.1 }}
          className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 lg:mt-14"
        >
          {items.map((item) => (
            <details
              key={item.question}
              className="group rounded-2xl border border-[#9e7641]/20 bg-surface-elevated/80 px-5 py-4 shadow-elato-sm backdrop-blur-sm open:shadow-elato-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body-lg font-semibold text-secondary-900 marker:content-none">
                {item.question}
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-[#9E7641] transition-transform duration-300 ease-out group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 text-body text-neutral-warm-500">{item.answer}</p>
            </details>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
