import { Helmet } from 'react-helmet-async'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '../lib/seoConfig'

type Props = {
  title: string
  description: string
  path: string // e.g. "/elato-stay"
  jsonLd?: object | object[]
  ogImage?: string
}

/** Per-route metadata (PRD Ch. 45) — one call per page, real values, no shared static tag. */
export function Seo({ title, description, path, jsonLd, ogImage = DEFAULT_OG_IMAGE }: Props) {
  const url = `${SITE_URL}${path}`
  const fullTitle = `${title} | ${SITE_NAME}`
  const jsonLdList = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []

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
