import type { Page } from '@playwright/test'

/**
 * Network-level fixtures for elato-backend's `/api/v1/*` endpoints.
 *
 * As of the "Backend Structure" commit, elato-web's repositories
 * (menuRepository.ts, eventsRepository.ts, reviewsRepository.ts,
 * videoGalleryRepository.ts) call a real FastAPI backend instead of local
 * mock content. That backend has no live Supabase data seeded yet (migrations
 * are written but not applied — see elato-backend/README.md), so hitting it
 * for real in E2E would just render every section's "couldn't be loaded"
 * fallback state.
 *
 * To keep E2E specs deterministic and independent of backend/DB state, we
 * intercept these routes at the network layer and serve fixture DTOs shaped
 * exactly like the backend schemas (snake_case, per
 * elato-web/src/lib/menuRepository.ts etc.). If the real backend's response
 * shape changes, update the shapes here to match.
 */

export async function mockCelebreApi(page: Page) {
  await page.route('**/api/v1/categories', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'cat-ice-cream',
          name: 'Premium Ice Creams',
          slug: 'premium-ice-creams',
          description: 'Small-batch, churned in-house.',
          display_order: 0,
          is_active: true,
        },
      ]),
    }),
  )

  await page.route('**/api/v1/menu-items*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'item-belgian-choc',
          category_id: 'cat-ice-cream',
          name: 'Belgian Chocolate',
          description: 'Belgian dark chocolate, churned in-house.',
          price: 180,
          is_available: true,
          is_veg: true,
          delivery_available: true,
          display_order: 0,
        },
      ]),
    }),
  )

  await page.route('**/api/v1/specials', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'sp-celebration-tower',
          title: 'Celebration Sundae Tower',
          description: 'A three-tier sundae built for the table to share.',
          price: 890,
        },
      ]),
    }),
  )
}

export async function mockEventsApi(page: Page) {
  await page.route('**/api/v1/event-packages', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'ev-weddings',
          title: 'Weddings',
          description: 'A hall dressed for the day that anchors everything else.',
          min_guests: 200,
          max_guests: 250,
          display_order: 0,
        },
      ]),
    }),
  )
}

export async function mockHomeApi(page: Page) {
  await page.route('**/api/v1/reviews/featured', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'rev-1', author_name: 'Ayesha K.', rating: 5, text: 'Booked our engagement here.' },
      ]),
    }),
  )

  await page.route('**/api/v1/video-gallery', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'vid-1',
          video_url: 'https://example.com/video.mp4',
          video_mime: 'video/mp4',
          caption: 'Signature sundae, plated for a Friday evening.',
          instagram_url: 'https://www.instagram.com/elato.in/',
          created_at: '2026-01-01T00:00:00Z',
        },
      ]),
    }),
  )
}

/** POST /api/v1/enquiries — fire-and-forget from the caller, but mocked so
 * E2E runs don't depend on (or spam) a real backend when forms submit. */
export async function mockEnquiriesApi(page: Page) {
  await page.route('**/api/v1/enquiries', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'enq-e2e-fixture', status: 'new' }),
    }),
  )
}

/** POST /api/v1/analytics/events — fire-and-forget, mocked for the same reason. */
export async function mockAnalyticsApi(page: Page) {
  await page.route('**/api/v1/analytics/events', (route) => route.fulfill({ status: 204, body: '' }))
}

export async function mockAllApi(page: Page) {
  await Promise.all([
    mockCelebreApi(page),
    mockEventsApi(page),
    mockHomeApi(page),
    mockEnquiriesApi(page),
    mockAnalyticsApi(page),
  ])
}
