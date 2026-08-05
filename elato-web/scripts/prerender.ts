/**
 * Post-build step (see package.json "postbuild") that bakes real per-route
 * <head> content into static HTML files inside dist/.
 *
 * Why this exists: this app is a pure client-side SPA (react-helmet-async
 * only writes <title>/meta/JSON-LD into the DOM after JS runs). That's fine
 * for Googlebot, which renders JS — but WhatsApp, Facebook, LinkedIn,
 * Twitter/X, Telegram, and Slack link-preview crawlers all fetch the raw
 * HTML and never execute JavaScript, so every shared link was showing the
 * same generic homepage title/description/image regardless of which page
 * was actually shared. Same problem for any search engine or tool with
 * weaker JS-rendering support.
 *
 * The fix: after `vite build` produces dist/index.html (with its real,
 * hashed asset URLs), clone that file once per route in routeSeoRegistry,
 * swap in that route's real title/description/canonical/OG/Twitter/JSON-LD,
 * and write it to dist/<route>/index.html. Vercel's filesystem routing
 * serves a static file at that path before falling back to the SPA rewrite
 * in vercel.json, so a direct/crawler request to e.g. /elato-stay gets the
 * fully-formed page — and the React app then hydrates over it exactly as
 * before for real visitors. The homepage's own dist/index.html is
 * overwritten in place (same content, no extra copy needed).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { routeSeoRegistry } from '../src/lib/routeSeo'
import { buildPageMeta } from '../src/lib/seoMeta'
import { SITE_NAME } from '../src/lib/seoConfig'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(__dirname, '..', 'dist')

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHead(route: (typeof routeSeoRegistry)[number]): string {
  const { url, fullTitle, description, ogImage, jsonLdList } = buildPageMeta({
    title: route.title,
    description: route.description,
    path: route.path,
    breadcrumb: route.breadcrumb,
    jsonLd: route.jsonLd(),
  })

  const jsonLdScripts = jsonLdList
    .map((entry) => `<script type="application/ld+json">${JSON.stringify(entry)}</script>`)
    .join('\n    ')

  return `<title>${escapeHtml(fullTitle)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${url}" />

    <meta property="og:title" content="${escapeHtml(fullTitle)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:site_name" content="${SITE_NAME}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${ogImage}" />

    ${jsonLdScripts}`
}

async function main() {
  const templatePath = join(DIST_DIR, 'index.html')
  if (!existsSync(templatePath)) {
    throw new Error(`prerender: ${templatePath} not found — run "vite build" first.`)
  }
  const template = await readFile(templatePath, 'utf-8')

  // Strip the build-time placeholder title/description so a route that
  // somehow lacks a registry entry never ships with duplicated <title> tags.
  const baseTemplate = template
    .replace(/<title>.*?<\/title>\s*/s, '')
    .replace(/<meta name="description"[^>]*>\s*/s, '')

  for (const route of routeSeoRegistry) {
    const head = buildHead(route)
    const html = baseTemplate.replace('</head>', `  ${head}\n  </head>`)

    const outPath = route.path === '/' ? join(DIST_DIR, 'index.html') : join(DIST_DIR, route.path.replace(/^\//, ''), 'index.html')

    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, html, 'utf-8')
    console.log(`prerender: wrote ${outPath.replace(DIST_DIR, 'dist')}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
