import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from './seoConfig'
import { webPageJsonLd, breadcrumbJsonLd, type BreadcrumbItem } from './jsonLd'

export interface PageMetaInput {
  title: string
  description: string
  path: string
  jsonLd?: object | object[]
  ogImage?: string
  breadcrumb?: BreadcrumbItem[]
}

export interface PageMeta {
  url: string
  fullTitle: string
  description: string
  ogImage: string
  jsonLdList: object[]
}

/**
 * Shared by Seo.tsx (client-side <head> via react-helmet-async) and
 * scripts/prerender.ts (static per-route HTML baked at build time) so the
 * two can never compute different WebPage/Breadcrumb markup for the same
 * route — one function, two callers.
 */
export function buildPageMeta(input: PageMetaInput): PageMeta {
  const url = `${SITE_URL}${input.path}`
  const fullTitle = `${input.title} | ${SITE_NAME}`
  const ogImage = input.ogImage ?? DEFAULT_OG_IMAGE
  const autoJsonLd = [
    webPageJsonLd({ title: fullTitle, description: input.description, url }),
    ...(input.breadcrumb ? [breadcrumbJsonLd(input.breadcrumb)] : []),
  ]
  const jsonLdList = [
    ...autoJsonLd,
    ...(input.jsonLd ? (Array.isArray(input.jsonLd) ? input.jsonLd : [input.jsonLd]) : []),
  ]
  return { url, fullTitle, description: input.description, ogImage, jsonLdList }
}
