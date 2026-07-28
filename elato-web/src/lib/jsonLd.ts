import { SITE_URL } from './seoConfig'
import { businessInfo, aggregateRating } from '../content/siteContent'

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
}

export function localBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'ELATŌ',
    description:
      'A premium lifestyle destination in Panemangalore combining handcrafted desserts, artisan beverages, elegant celebrations, and comfortable stays.',
    url: SITE_URL,
    telephone: businessInfo.phone,
    email: businessInfo.email,
    address,
    geo,
    openingHoursSpecification,
    aggregateRating: ratingSchema,
    sameAs: [businessInfo.instagramUrl],
  }
}

export function restaurantJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: 'ELATŌ Celebré',
    servesCuisine: ['Ice Cream', 'Desserts', 'Coffee', 'Beverages'],
    telephone: businessInfo.phone,
    address,
    geo,
    openingHoursSpecification,
    aggregateRating: ratingSchema,
    url: `${SITE_URL}/elato-celebre`,
  }
}

export function eventVenueJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EventVenue',
    name: 'ELATŌ Celebré — Event Hall',
    description: 'A 200–250 guest capacity hall for weddings, engagements, and celebrations.',
    address,
    geo,
    maximumAttendeeCapacity: 250,
    url: `${SITE_URL}/elato-events`,
  }
}

export function lodgingJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: 'ELATŌ Stay',
    description: 'A spacious 2BHK premium serviced apartment for 6–8 guests.',
    address,
    geo,
    telephone: businessInfo.phone,
    url: `${SITE_URL}/elato-stay`,
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ELATŌ',
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    sameAs: [businessInfo.instagramUrl],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: businessInfo.phone,
      email: businessInfo.email,
      contactType: 'customer service',
    },
  }
}
