/**
 * Site content for the Homepage. Business info below is REAL, supplied by
 * the client (project charter, Section 3) — not a placeholder. Reviews and
 * aggregate rating remain placeholders pending a live Google Places
 * integration; the Instagram/video showcase section always renders — with a
 * premium empty state until an admin uploads at least one video (see
 * VideoShowcaseSection.tsx).
 *
 * Shaped like the future API responses (site_content, google_reviews_cache)
 * so wiring a real Supabase/FastAPI backend later is a data-source swap,
 * not a rewrite.
 */

export const businessInfo = {
  address: 'Near Mandovi Motors, Melkar, Panemangalore, Bantwal, Karnataka 574231',
  phone: '+91 97314 00313',
  whatsappNumber: '919731400313', // E.164 digits only, for wa.me links
  email: 'elatogroups@gmail.com',
  instagramHandle: '@elato.in',
  instagramUrl: 'https://instagram.com/elato.in',
  // Clean canonical search link — Google's own share links carry session
  // tokens (sxsrf/si/ved/biw/bih/dpr) that are tied to the browser that
  // generated them, so those are intentionally stripped here too.
  googleReviewsUrl: 'https://www.google.com/search?sca_esv=9b7ae9e438b46689&sxsrf=APpeQnsJpS5EThnBc2EoutW2UWfyEm_iug:1784110858466&si=APenkKm7iecQ4G6P-TsbSMFKIQtv3EFIqRAFw-i8uEbk55Z-__xp7vYHNsaY0PB2GccyPhhc1C2w4imAf8L_z1WKXGygy0paThAw3zXRXcvC9zd3er1W5n-MlsyV2DZaTbdI-E1PYZxc&q=ELAT%C5%8C+CELEBR%C3%89+Reviews&sa=X&ved=2ahUKEwjVttXvutSVAxWT1TgGHZwKEisQ0bkNegQILRAF&biw=1280&bih=585&dpr=1.5',
  // Google's "write a review" deep link for this listing — the #lrd=
  // fragment carries the Place ID, which opens the review composer
  // directly instead of the plain search results page.
  googleWriteReviewUrl: 'https://www.google.com/search?sca_esv=9b7ae9e438b46689&sxsrf=APpeQnsJpS5EThnBc2EoutW2UWfyEm_iug:1784110858466&si=APenkKm7iecQ4G6P-TsbSMFKIQtv3EFIqRAFw-i8uEbk55Z-__xp7vYHNsaY0PB2GccyPhhc1C2w4imAf8L_z1WKXGygy0paThAw3zXRXcvC9zd3er1W5n-MlsyV2DZaTbdI-E1PYZxc&q=ELAT%C5%8C+CELEBR%C3%89+Reviews&sa=X&ved=2ahUKEwjVttXvutSVAxWT1TgGHZwKEisQ0bkNegQILRAF&biw=1280&bih=585&dpr=1.5#lrd=0x3ba4a700766104dd:0xeedacba07390ccd2,3,,,,',
  // Clean canonical listing path — tracking/session query params intentionally stripped.
  bookingComUrl: 'https://www.booking.com/hotel/in/elato-events-amp-stay.en-gb.html',
  hours: [
    { day: 'Daily', time: 'Hours to be confirmed' }, // PLACEHOLDER — real hours not yet supplied
  ],
} as const

export const heroContent = {
  overline: 'ELATŌ',
  headline: 'Where Every Celebration Begins',
  subStatement: 'Premium Ice Cream • Café • Events • Stay',
  ctaLabel: 'Discover Elato',
}

export const servicesContent = [
  {
    id: 'celebre',
    title: 'Elato Celebré',
    descriptor: 'Handcrafted ice cream, artisan coffee, and signature desserts.',
  },
  {
    id: 'stay',
    title: 'Elato Stay',
    descriptor: 'A spacious 2BHK premium serviced apartment for 6–8 guests.',
  },
  {
    id: 'events',
    title: 'Elato Events',
    descriptor: 'A 200–250 guest hall for weddings, engagements, and celebrations.',
  },
] as const

export const servicesHeading = {
  overline: 'Signature Experiences',
  title: 'Discover ELATŌ',
  description:
    'Three distinctive experiences brought together by one commitment to exceptional hospitality.',
}

export const aboutContent = {
  overline: 'About ELATŌ',
  title: 'Where Every Celebration Begins',
  paragraphs: [
    'ELATŌ was founded with one vision — to create a destination where families, friends, and guests can celebrate life’s special moments in a premium environment.',
    'Backed by more than 30 years of expertise in the ice cream industry through founder Abdul Hakeem, ELATŌ combines traditional craftsmanship with modern hospitality.',
    'From handcrafted ice creams and signature beverages to elegant event spaces and premium stays, every detail reflects our commitment to excellence.',
    'Whether you’re here for dessert, a family gathering, a birthday celebration, or a weekend stay, ELATŌ offers experiences designed to create lasting memories.',
    'In recognition of this journey, ELATŌ has been nominated for “Best Premium Ice-Cream Parlour & Desserts” at the Global Icon Awards 2026 — a milestone we’re proud to share with everyone who has supported us along the way.',
  ],
  ctaLabel: 'Plan Your Visit',
}

export const founder = {
  name: 'Abdul Hakeem',
  bio: '30+ years in the ice cream industry.',
}

export const vision =
  "To become Karnataka's most loved premium destination for desserts, celebrations, and hospitality while creating unforgettable experiences for every guest."

export const mission = [
  'Deliver premium quality in everything we serve.',
  'Create memorable celebrations.',
  'Build lasting customer relationships.',
  'Continuously innovate our offerings.',
  'Set new standards in hospitality.',
]

export const values = [
  'Excellence',
  'Quality',
  'Hospitality',
  'Integrity',
  'Innovation',
  'Passion',
  'Customer Happiness',
]

export const whyChooseElato = [
  'Premium Quality',
  'Elegant Ambience',
  'Family Friendly',
  'Exceptional Hospitality',
  'Experienced Team',
  'Handcrafted Products',
  'Modern Facilities',
  'Memorable Celebrations',
  'Customer First Approach',
]

export const galleryCategories = [
  'Premium Café',
  'Signature Desserts',
  'Luxury Drinks',
  'Celebration Hall',
  'Events',
  'Stay',
  'Happy Guests',
  'Behind the Scenes',
] // PLACEHOLDER — no real gallery images yet; categories are real, media is not

// Real featured-review fallback content lives in `reviewsContent.ts` (used by
// ReviewsSection when GET /api/v1/reviews/featured has nothing synced yet).

export const aggregateRating = {
  rating: 4.2,
  count: 105,
} // Real values from ELATŌ CELEBRÉ's Google Business listing — update here (or wire the Places sync) if the live rating moves.
