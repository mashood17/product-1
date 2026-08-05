/**
 * One-off/rerunnable utility: rasterizes public/favicon.svg into the PNG
 * icon set referenced by index.html (apple-touch-icon) and site.webmanifest
 * (icon-192/512, maskable-512). Not part of the build pipeline — rerun by
 * hand (`node scripts/gen-icons.mjs`) only when favicon.svg's artwork changes.
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = join(__dirname, '..', 'public', 'favicon.svg')
const OUT = join(__dirname, '..', 'public', 'icons')

await mkdir(OUT, { recursive: true })

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of targets) {
  await sharp(SRC, { density: 384 }).resize(size, size).png().toFile(join(OUT, name))
  console.log('wrote', name)
}

// Maskable icon needs ~10% safe-zone padding so OS icon masks (circle,
// squircle, etc.) don't clip the mark — same brand-ink background as the SVG.
const maskSize = 512
const inner = Math.round(maskSize * 0.8)
const pad = Math.round((maskSize - inner) / 2)
await sharp(SRC, { density: 384 })
  .resize(inner, inner)
  .extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#3A2E1E' })
  .png()
  .toFile(join(OUT, 'maskable-icon-512.png'))
console.log('wrote maskable-icon-512.png')
