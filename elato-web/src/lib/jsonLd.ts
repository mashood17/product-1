import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from './seoConfig'
import { businessInfo, aggregateRating } from '../content/siteContent'
import { reviewsFallback } from '../content/reviewsContent'

const address = {
  '@type': 'PostalAddress',
  streetAddress: 'Near Mandovi Motors, Melkar',
  addressLocality: 'Panemangalore, Bantwal',
  addressRegion: 'Karnataka',
  postalCode: '574231',
  addressCountry: 'IN',
}

// Confirmed real coordinates for the Panemangalore/Bantwal location — do not
// change without confirming the actual location first (Google penalizes
// inaccurate GeoCoordinates in structured data).
const geo = {
  '@type': 'GeoCoordinates',
  latitude: 12.870503221851456,
  longitude: 75.04899592097874,
}

// Confirmed real hours (matches what Footer.tsx already displays to
// visitors) — only applied to the walk-in café/venue schemas below
// (LocalBusiness, Restaurant). Deliberately NOT applied to EventVenue/
// LodgingBusiness: the event hall and the stay apartment operate on
// booking/check-in models, not walk-in hours, so reusing the café's hours
// there would be inaccurate.
const openingHoursSpecification = {
  '@type': 'OpeningHoursSpecification',
  dayOfWeek: [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  ],
  opens: '11:00',
  closes: '23:30',
}

// Real, on-page rating (see About.tsx's trust badge and useAggregateRating,
// which this exact value backs as the fallback) — sourced from ELATŌ
// CELEBRÉ's Google Business listing, not fabricated for markup purposes.
const ratingSchema = {
  '@type': 'AggregateRating',
  ratingValue: aggregateRating.rating,
  reviewCount: aggregateRating.count,
  bestRating: 5,
}

// Canonical social/business-profile links — reused across every schema below
// so Google can confidently tie the site, the Organization entity, and the
// Google Business Profile listing together (the strongest local-SEO signal
// this markup can send). Kept as one array, not duplicated per function.
const sameAs = [businessInfo.instagramUrl, businessInfo.googleBusinessProfileUrl]

// Only the five real, verbatim Google reviews that ReviewsSection actually
// displays on the homepage (see reviewsContent.ts) — Review markup must
// match what a visitor sees on the page, so this intentionally does not
// invent or duplicate reviews beyond that fallback set.
const reviewSchema = reviewsFallback
  .filter((r) => r.rating != null)
  .map((r) => ({
    '@type': 'Review',
    author: { '@type': 'Person', name: r.author },
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
    reviewBody: r.text,
    datePublished: r.reviewDate,
  }))

const logoImage = {
  '@type': 'ImageObject',
  url: `${SITE_URL}/icons/icon-512.png`,
  width: 512,
  height: 512,
}

const defaultOgImageObject = {
  '@type': 'ImageObject',
  url: DEFAULT_OG_IMAGE,
  width: 1200,
  height: 630,
}

export function localBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#business`,
    name: 'ELATŌ',
    description:
      'A premium lifestyle destination in Panemangalore, Bantwal — minutes from Mangalore, Dakshina Kannada — combining handcrafted desserts, artisan beverages, elegant celebrations, and comfortable stays.',
    url: SITE_URL,
    telephone: businessInfo.phone,
    email: businessInfo.email,
    image: defaultOgImageObject,
    address,
    geo,
    hasMap: businessInfo.googleBusinessProfileUrl,
    openingHoursSpecification,
    aggregateRating: ratingSchema,
    review: reviewSchema,
    sameAs,
    areaServed: [
      { '@type': 'City', name: 'Mangalore' },
      { '@type': 'Place', name: 'Panemangalore' },
      { '@type': 'Place', name: 'Bantwal' },
      { '@type': 'Place', name: 'Narikombu' },
      { '@type': 'Place', name: 'BC Road' },
      { '@type': 'AdministrativeArea', name: 'Dakshina Kannada' },
    ],
  }
}

export function restaurantJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${SITE_URL}/elato-celebre/#restaurant`,
    name: 'ELATŌ Celebré',
    description:
      'Handcrafted ice cream, artisan coffee, signature mocktails, and premium desserts in Panemangalore, Bantwal — near Mangalore, Dakshina Kannada.',
    servesCuisine: ['Ice Cream', 'Desserts', 'Coffee', 'Beverages'],
    telephone: businessInfo.phone,
    image: defaultOgImageObject,
    address,
    geo,
    hasMap: businessInfo.googleBusinessProfileUrl,
    openingHoursSpecification,
    aggregateRating: ratingSchema,
    sameAs,
    hasMenu: `${SITE_URL}/elato-celebre#menu`,
    acceptsReservations: 'True',
    url: `${SITE_URL}/elato-celebre`,
  }
}

export function eventVenueJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EventVenue',
    '@id': `${SITE_URL}/elato-events/#venue`,
    name: 'ELATŌ Celebré — Event Hall',
    description:
      'A 200–250 guest capacity hall in Panemangalore, Bantwal — near Mangalore, Dakshina Kannada — for weddings, birthdays, corporate events, and private celebrations.',
    image: defaultOgImageObject,
    address,
    geo,
    hasMap: businessInfo.googleBusinessProfileUrl,
    telephone: businessInfo.phone,
    maximumAttendeeCapacity: 250,
    sameAs,
    url: `${SITE_URL}/elato-events`,
  }
}

export function lodgingJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    '@id': `${SITE_URL}/elato-stay/#lodging`,
    name: 'ELATŌ Stay',
    description:
      'A spacious 2BHK premium serviced apartment for 6–8 guests in Panemangalore, Bantwal — near Mangalore, Dakshina Kannada.',
    image: defaultOgImageObject,
    address,
    geo,
    hasMap: businessInfo.googleBusinessProfileUrl,
    telephone: businessInfo.phone,
    sameAs,
    url: `${SITE_URL}/elato-stay`,
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'ELATŌ',
    legalName: 'ELATŌ',
    url: SITE_URL,
    logo: logoImage,
    image: defaultOgImageObject,
    foundingLocation: { '@type': 'Place', name: 'Panemangalore, Bantwal, Dakshina Kannada, Karnataka' },
    sameAs,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: businessInfo.phone,
      email: businessInfo.email,
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['en'],
    },
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-IN',
  }
}

export interface BreadcrumbItem {
  name: string
  path: string
}

/** Home is always item 1 — callers only supply the trailing segment(s). */
export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  const withHome: BreadcrumbItem[] = [{ name: 'Home', path: '/' }, ...items]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: withHome.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}

export interface FaqItem {
  question: string
  answer: string
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

export interface MenuJsonLdCategory {
  id: string
  name: string
  description?: string | null
}

export interface MenuJsonLdItem {
  categoryId: string
  name: string
  description?: string | null
  price: number
  isVeg: boolean
}

/** Built from the live categories/menu-items already fetched by MenuSection — never hardcoded, so it can't drift from what's actually on the page. */
export function menuJsonLd(categories: MenuJsonLdCategory[], items: MenuJsonLdItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: 'ELATŌ Celebré Menu',
    url: `${SITE_URL}/elato-celebre#menu`,
    inLanguage: 'en-IN',
    hasMenuSection: categories.map((cat) => ({
      '@type': 'MenuSection',
      name: cat.name,
      ...(cat.description ? { description: cat.description } : {}),
      hasMenuItem: items
        .filter((item) => item.categoryId === cat.id)
        .map((item) => ({
          '@type': 'MenuItem',
          name: item.name,
          ...(item.description ? { description: item.description } : {}),
          suitableForDiet: item.isVeg ? 'https://schema.org/VegetarianDiet' : undefined,
          offers: {
            '@type': 'Offer',
            price: item.price,
            priceCurrency: 'INR',
            availability: 'https://schema.org/InStock',
          },
        })),
    })),
  }
}

/** Generic per-page WebPage entry — see Seo.tsx, which emits this automatically for every route. */
export function webPageJsonLd(opts: { title: string; description: string; url: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: opts.title,
    description: opts.description,
    url: opts.url,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-IN',
  }
}
