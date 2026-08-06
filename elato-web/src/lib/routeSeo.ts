/**
 * Single source of truth for every route's title/description/breadcrumb/
 * JSON-LD. Each Page component pulls its own entry instead of hardcoding
 * these inline, and `scripts/prerender.ts` walks this same array to bake
 * per-route <head> content into static HTML at build time (see that script
 * for why: react-helmet-async only sets these client-side, which is
 * invisible to WhatsApp/Facebook/LinkedIn/X/Telegram link-preview crawlers
 * and any bot that doesn't execute JS). One array, both consumers — a title
 * changed here can never drift between what a page renders and what a
 * social crawler sees.
 */
import {
  localBusinessJsonLd,
  organizationJsonLd,
  websiteJsonLd,
  faqJsonLd,
  restaurantJsonLd,
  lodgingJsonLd,
  eventVenueJsonLd,
  blogPostingJsonLd,
  blogJsonLd,
  type BreadcrumbItem,
} from './jsonLd'
import { faqItems, celebreFaqItems, eventsFaqItems, stayFaqItems } from '../content/faqContent'
import { blogPosts, blogHeading } from '../content/blogContent'

export interface RouteSeoEntry {
  path: string
  title: string
  description: string
  breadcrumb?: BreadcrumbItem[]
  jsonLd: () => object | object[]
}

// Generated from blogContent.ts — blogPosts is the single source of truth,
// so a new post only ever needs adding there, never duplicated here.
const blogIndexEntry: RouteSeoEntry = {
  path: '/blog',
  title: blogHeading.title,
  description: blogHeading.description,
  breadcrumb: [{ name: 'Blog', path: '/blog' }],
  jsonLd: () =>
    blogJsonLd({
      posts: blogPosts.map((post) => ({
        title: post.title,
        path: `/blog/${post.slug}`,
        publishedDate: post.publishedDate,
      })),
    }),
}

const blogPostEntries: RouteSeoEntry[] = blogPosts.map((post) => ({
  path: `/blog/${post.slug}`,
  title: post.title,
  description: post.metaDescription,
  breadcrumb: [
    { name: 'Blog', path: '/blog' },
    { name: post.title, path: `/blog/${post.slug}` },
  ],
  jsonLd: () =>
    blogPostingJsonLd({
      title: post.title,
      description: post.metaDescription,
      path: `/blog/${post.slug}`,
      publishedDate: post.publishedDate,
    }),
}))

export const routeSeoRegistry: RouteSeoEntry[] = [
  {
    path: '/',
    title: 'Premium Café, Ice Cream, Events & Stay in Panemangalore, Mangalore',
    description:
      'ELATŌ — a premium lifestyle destination in Panemangalore, Bantwal, near Mangalore, Dakshina Kannada. Handcrafted ice cream and desserts, an event hall for weddings and birthdays, and a luxury stay.',
    jsonLd: () => [
      localBusinessJsonLd(),
      organizationJsonLd(),
      websiteJsonLd(),
      faqJsonLd(faqItems.map((f) => ({ question: f.question, answer: f.answer }))),
    ],
  },
  {
    path: '/elato-stay',
    title: 'Elato Stay — Luxury 2BHK Apartment in Bantwal, Mangalore',
    description:
      'A spacious 2BHK premium serviced apartment for 6–8 guests in Panemangalore, Bantwal — near Mangalore, Dakshina Kannada. Ideal for family trips, wedding guests, business travelers, and vacation stays.',
    breadcrumb: [{ name: 'Elato Stay', path: '/elato-stay' }],
    jsonLd: () => [lodgingJsonLd(), faqJsonLd(stayFaqItems)],
  },
  {
    path: '/elato-celebre',
    title: 'Elato Celebré — Premium Café, Ice Cream & Desserts in Bantwal, Mangalore',
    description:
      'Handcrafted ice cream, milkshakes, and mojitos, plus fries, sandwiches, burgers, and pizzas, at ELATŌ Celebré in Panemangalore, Bantwal — near Mangalore and BC Road. Order on WhatsApp.',
    breadcrumb: [{ name: 'Elato Celebré', path: '/elato-celebre' }],
    jsonLd: () => [restaurantJsonLd(), faqJsonLd(celebreFaqItems)],
  },
  {
    path: '/elato-events',
    title: 'Elato Events — Wedding & Birthday Venue in Bantwal, Mangalore',
    description:
      'A 200–250 guest hall in Panemangalore, Bantwal — near Mangalore, Dakshina Kannada — for weddings, engagements, birthdays, naming ceremonies, corporate events, and family gatherings.',
    breadcrumb: [{ name: 'Elato Events', path: '/elato-events' }],
    jsonLd: () => [eventVenueJsonLd(), faqJsonLd(eventsFaqItems)],
  },
  blogIndexEntry,
  ...blogPostEntries,
  {
    path: '/privacy-policy',
    title: 'Privacy Policy',
    description: 'How ELATŌ collects, uses, and protects the information you share with us.',
    breadcrumb: [{ name: 'Privacy Policy', path: '/privacy-policy' }],
    jsonLd: () => [],
  },
  {
    path: '/terms-conditions',
    title: 'Terms & Conditions',
    description: 'The terms that govern your use of the ELATŌ website and our promotional offers.',
    breadcrumb: [{ name: 'Terms & Conditions', path: '/terms-conditions' }],
    jsonLd: () => [],
  },
  {
    path: '/cookie-policy',
    title: 'Cookie Policy',
    description: 'How ELATŌ uses cookies and browser storage to run and improve elato.in.',
    breadcrumb: [{ name: 'Cookie Policy', path: '/cookie-policy' }],
    jsonLd: () => [],
  },
]

export function getRouteSeo(path: string): RouteSeoEntry {
  const entry = routeSeoRegistry.find((r) => r.path === path)
  if (!entry) throw new Error(`No routeSeoRegistry entry for path "${path}" — add one in src/lib/routeSeo.ts.`)
  return entry
}
