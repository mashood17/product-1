/**
 * Homepage FAQ — every answer restates a fact that already exists elsewhere
 * in the codebase (siteContent.ts address/hours, jsonLd.ts capacity figures)
 * rather than inventing anything new, so this never drifts into a claim the
 * business can't back up. Powers both the visible FaqSection and faqJsonLd.
 */

export const faqHeading = {
  overline: 'Good to Know',
  title: 'Frequently Asked Questions',
  description: 'Everything guests usually ask before visiting, booking, or celebrating with ELATŌ.',
}

export interface FaqItem {
  question: string
  answer: string
}

export const faqItems: FaqItem[] = [
  {
    question: 'Where is ELATŌ located?',
    answer:
      'ELATŌ is located near Mandovi Motors, Melkar, Panemangalore, Bantwal, Karnataka 574231 — a short drive from Mangalore, in the Dakshina Kannada district.',
  },
  {
    question: 'What does ELATŌ offer?',
    answer:
      'ELATŌ brings three experiences together in one destination: Elato Celebré, a premium café serving handcrafted ice cream, artisan coffee, and desserts; Elato Events, a 200–250 guest hall for weddings, birthdays, and celebrations; and Elato Stay, a 2BHK premium serviced apartment for 6–8 guests.',
  },
  {
    question: "What are Elato Celebré's café hours?",
    answer: 'Elato Celebré is open daily from 11:00 AM to 11:30 PM.',
  },
  {
    question: 'Can I book Elato Events for a wedding, birthday, or corporate event?',
    answer:
      'Yes — the event hall accommodates 200–250 guests and hosts weddings, engagements, birthdays, corporate events, and private celebrations. Enquire on WhatsApp or through the Elato Events page.',
  },
  {
    question: 'How do I contact ELATŌ or place an order?',
    answer:
      'You can reach ELATŌ by phone or WhatsApp, browse the full menu on the Elato Celebré page, and order select items for delivery via WhatsApp.',
  },
  {
    question: 'Is ELATŌ suitable for family celebrations near Mangalore?',
    answer:
      'Yes — ELATŌ is built as a family-friendly celebration destination in Panemangalore, near Mangalore and BC Road, combining desserts, an event hall, and a stay under one roof.',
  },
]
