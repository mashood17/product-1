import { defineConfig, devices } from '@playwright/test'

// Deliberately NOT 5173 (the app's default dev port): this repo has multiple
// git worktrees/checkouts on the same machine, and a stray dev server on the
// default port from a sibling checkout would get silently reused instead of
// this worktree's own code (reuseExistingServer would treat "port responds"
// as "correct server"). A dedicated port + reuseExistingServer:false below
// guarantees Playwright always talks to *this* worktree's build.
const PORT = 5193
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // elato-backend is NOT started here as a second webServer. As of the
  // "Backend Structure" commit, elato-web's repositories/forms DO call a
  // real FastAPI backend (src/lib/apiClient.ts + menuRepository.ts,
  // eventsRepository.ts, reviewsRepository.ts, videoGalleryRepository.ts,
  // enquiryRepository.ts) — but that backend has no live Supabase data
  // seeded yet (migrations written, not applied; see
  // elato-backend/README.md). Rather than depend on backend/DB state that
  // may not exist in CI, specs that need those endpoints mock them at the
  // network layer via Playwright's `page.route()` — see
  // e2e/fixtures/api-mocks.ts — which keeps this suite deterministic and
  // backend-independent while still exercising real frontend behavior.
  // Swap to a real `elato-backend` webServer entry once seeded Supabase
  // data exists in CI and you want true end-to-end (not just frontend)
  // coverage.
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    // Always spawn fresh — see the PORT comment above for why reusing an
    // existing server on this port would be unsafe in this multi-worktree
    // environment.
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
