/**
 * Homepage FAQ — every answer restates a fact that already exists elsewhere
 * in the codebase (siteContent.ts address/hours, jsonLd.ts capacity figures)
 * rather than inventing anything new, so this never drifts into a claim the
 * business can't back up. Powers both the visible FaqSection and faqJsonLd.
 */

export interface FaqHeading {
  overline: string
  title: string
  description: string
}

export const faqHeading: FaqHeading = {
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

/**
 * Celebré-page FAQ — same discipline as faqItems above: every answer
 * restates a confirmed fact, never a specific (still-placeholder) dish or
 * price. Note: celebreContent.ts's category list (Artisan Coffee, Waffles,
 * Falooda, etc.) is itself a stale placeholder — the live menu (fetched via
 * menuRepository.ts from the admin-managed backend, confirmed by browsing
 * the actual rendered /elato-celebre page) is organized as Special Ice
 * Creams, Premium Scoops, Shakes, Mojitos, Fries & Snacks, Sandwiches,
 * Burgers, and Pizzas — that's the real, current category set this FAQ
 * (and restaurantJsonLd's servesCuisine) describes. Deliberately phrased
 * loosely rather than as an exhaustive list, since the admin can add/remove
 * categories at any time and this shouldn't need to chase every edit.
 */
export const celebreFaqHeading: FaqHeading = {
  overline: 'Café FAQs',
  title: 'Questions About Elato Celebré',
  description: 'What guests usually ask before visiting the café in Panemangalore, Bantwal.',
}

export const celebreFaqItems: FaqItem[] = [
  {
    question: "What are Elato Celebré's hours?",
    answer: 'Elato Celebré is open daily from 11:00 AM to 11:30 PM in Panemangalore, Bantwal — near Mangalore and BC Road.',
  },
  {
    question: 'What does the Elato Celebré menu include?',
    answer:
      'Handcrafted ice cream (signature and single-scoop styles), milkshakes, and non-alcoholic mojitos, alongside a food menu spanning fries and snacks, sandwiches, burgers, and pizzas.',
  },
  {
    question: 'Can I order from Elato Celebré for delivery?',
    answer: 'Yes — select menu items are available for delivery, ordered directly over WhatsApp.',
  },
  {
    question: 'Where is Elato Celebré located?',
    answer:
      'Near Mandovi Motors, Melkar, Panemangalore, Bantwal, Karnataka 574231 — a short drive from Mangalore, in the Dakshina Kannada district.',
  },
  {
    question: 'Is Elato Celebré good for a birthday or small group celebration?',
    answer:
      'Yes — the café regularly hosts birthdays and small group celebrations. For larger parties, Elato Events next door seats 200–250 guests.',
  },
]

/**
 * Events-page FAQ — capacity and event-type facts pulled straight from
 * eventsContent.ts (client-confirmed); nothing here is invented.
 */
export const eventsFaqHeading: FaqHeading = {
  overline: 'Venue FAQs',
  title: 'Questions About Elato Events',
  description: 'What hosts usually ask before booking the hall in Panemangalore, Bantwal.',
}

export const eventsFaqItems: FaqItem[] = [
  {
    question: 'How many guests can Elato Events accommodate?',
    answer: 'The hall accommodates 200–250 guests, making it suited to both intimate gatherings and larger celebrations.',
  },
  {
    question: 'What kinds of events does Elato Events host?',
    answer:
      'Weddings, engagements, birthday parties, naming ceremonies, corporate events, family gatherings, cultural events, and anniversary celebrations.',
  },
  {
    question: 'How do I book or enquire about Elato Events?',
    answer: 'Reach out on WhatsApp or submit an enquiry directly on the Elato Events page, and the team will follow up with availability.',
  },
  {
    question: 'Where is Elato Events located?',
    answer:
      'Near Mandovi Motors, Melkar, Panemangalore, Bantwal, Karnataka 574231 — near Mangalore and BC Road, in the Dakshina Kannada district.',
  },
  {
    question: 'Is there somewhere nearby for out-of-town guests to stay?',
    answer: 'Yes — Elato Stay is a 2BHK premium serviced apartment for 6–8 guests, right alongside the venue.',
  },
]

/**
 * Stay-page FAQ — capacity, amenities, and distances pulled straight from
 * stayContent.ts (client-confirmed, from the Booking.com listing).
 */
export const stayFaqHeading: FaqHeading = {
  overline: 'Stay FAQs',
  title: 'Questions About Elato Stay',
  description: 'What guests usually ask before booking the apartment in Panemangalore, Bantwal.',
}

export const stayFaqItems: FaqItem[] = [
  {
    question: 'How many guests can Elato Stay accommodate?',
    answer: 'The 2BHK apartment comfortably sleeps 6–8 guests across two family bedrooms and two bathrooms.',
  },
  {
    question: 'What amenities are included at Elato Stay?',
    answer: 'Free Wi-Fi, air-conditioning, a private balcony, a kitchen area, parking, and a spacious, semi-furnished living area.',
  },
  {
    question: 'How far is Elato Stay from Mangalore?',
    answer: 'About 27 km from Mangalore International Airport and Mangalore Central Station — roughly the same distance as the city’s other major landmarks.',
  },
  {
    question: 'Who is Elato Stay best suited for?',
    answer: 'Families, wedding guests, business travelers, and vacationers looking for a comfortable base in Panemangalore, Bantwal, near Mangalore.',
  },
  {
    question: 'Where is Elato Stay located?',
    answer:
      'Near Mandovi Motors, Melkar, Panemangalore, Bantwal, Karnataka 574231 — in the Dakshina Kannada district, close to Elato Celebré and Elato Events.',
  },
]
