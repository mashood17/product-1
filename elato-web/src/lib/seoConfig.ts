/**
 * Site-wide SEO config. Nothing else references a hardcoded domain.
 *
 * www, not the bare apex: Vercel's domain config 308-redirects
 * elatogroups.in -> www.elatogroups.in (confirmed live), so www is the
 * actual final URL every request lands on. Canonical/OG/sitemap URLs must
 * point at that final URL directly, not at one that itself redirects —
 * pointing canonical at a redirecting URL is a real (if minor) SEO defect.
 */
export const SITE_URL = 'https://www.elatogroups.in'
export const SITE_NAME = 'ELATŌ'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`
