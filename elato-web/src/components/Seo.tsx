import { Helmet } from 'react-helmet-async'
import { SITE_NAME } from '../lib/seoConfig'
import { buildPageMeta, type PageMetaInput } from '../lib/seoMeta'

type Props = PageMetaInput

/**
 * Per-route metadata (PRD Ch. 45) — one call per page, real values, no shared
 * static tag. Every call also emits a WebPage entry (and a BreadcrumbList
 * when `breadcrumb` is given) automatically via buildPageMeta, so individual
 * pages never have to remember to wire that up themselves. That same
 * function backs scripts/prerender.ts, so the static HTML a crawler sees
 * pre-hydration matches exactly what this renders post-hydration.
 */
export function Seo(props: Props) {
  const { url, fullTitle, description, ogImage, jsonLdList } = buildPageMeta(props)

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLdList.map((entry, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(entry)}
        </script>
      ))}
    </Helmet>
  )
}
