/**
 * Read-access for admin-managed hero background videos (backed by
 * `GET /api/v1/hero-backgrounds`) — replaces the old fixed `public/videos/`
 * asset convention entirely. One entry per slot ('desktop' | 'mobile'), each
 * carrying its video URL/mime, optional poster URL, and probed metadata.
 *
 * Deduped as a single shared in-flight promise — every hero on the page
 * that mounts during the same fetch resolves from one request rather than
 * firing one each. Deliberately NOT cached beyond that: the promise is
 * cleared as soon as it settles, so the next mount (a client-side
 * navigation back to the page, a remount, etc.) always fetches the latest
 * metadata instead of reusing a stale result for the rest of the tab's
 * session. A failed request (or a slot with nothing uploaded yet) settles
 * to a missing entry: the hero then renders with no video, just the
 * overlay's base color, rather than a broken asset.
 */
import { apiGet } from './apiClient'

export type HeroSlot = 'desktop' | 'mobile'

export interface HeroBackgroundDto {
  slot: HeroSlot
  video_url: string
  video_mime: string
  poster_url: string | null
  width: number | null
  height: number | null
  duration_seconds: number | null
  file_size_bytes: number
  updated_at: string
}

let inFlight: Promise<Partial<Record<HeroSlot, HeroBackgroundDto>>> | null = null

export function getHeroBackgrounds(): Promise<Partial<Record<HeroSlot, HeroBackgroundDto>>> {
  if (!inFlight) {
    inFlight = apiGet<HeroBackgroundDto[]>('/api/v1/hero-backgrounds')
      .then((rows) => {
        const map: Partial<Record<HeroSlot, HeroBackgroundDto>> = {}
        for (const row of rows) map[row.slot] = row
        return map
      })
      .catch(() => ({}))
      .finally(() => {
        inFlight = null
      })
  }
  return inFlight
}
