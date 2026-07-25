/** Data-access layer for the admin-curated video showcase, backed by
 * `/api/v1/video-gallery` — replaces the removed Instagram Reels sync
 * entirely. This is the only place the frontend touches showcase video
 * data.
 *
 * Deliberately NOT cached across calls (unlike heroBackgroundRepository.ts):
 * an admin deleting/replacing a video must disappear from the public site
 * immediately, not stay visible until a full page reload clears a stale
 * in-memory promise. Every call hits the network fresh; the backend route
 * itself also sends no cache header, for the same reason. */
import { apiGet } from './apiClient'

export type VideoGalleryDto = {
  id: string
  video_url: string
  video_mime: string
  caption: string | null
  instagram_url: string | null
}

export type VideoGalleryItem = {
  id: string
  videoUrl: string
  videoMime: string
  caption: string | null
  instagramUrl: string | null
}

export function getVideoGallery(): Promise<VideoGalleryItem[]> {
  return apiGet<VideoGalleryDto[]>('/api/v1/video-gallery')
    .then((rows) =>
      rows.map((r) => ({
        id: r.id,
        videoUrl: r.video_url,
        videoMime: r.video_mime,
        caption: r.caption,
        instagramUrl: r.instagram_url,
      })),
    )
    .catch(() => [])
}
