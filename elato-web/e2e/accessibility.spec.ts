import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockAllApi } from './fixtures/api-mocks'

const routes = ['/', '/elato-stay', '/elato-celebre', '/elato-events']

test.describe('Accessibility (axe-core)', () => {
  for (const route of routes) {
    test(`${route} has zero automated a11y violations`, async ({ page }) => {
      // Several sections fetch from elato-backend on mount (reviews,
      // video showcase, menu, events) which has no live Supabase data seeded yet
      // — mock those so every route renders its real "loaded" state instead
      // of a loading skeleton or error fallback, which is what should
      // actually be audited for accessibility.
      await mockAllApi(page)
      await page.goto(route)
      // Let route-level lazy chunks and content finish mounting.
      await page.waitForLoadState('networkidle')

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      if (results.violations.length > 0) {
        console.log(
          `axe violations on ${route}:\n` +
            JSON.stringify(
              results.violations.map((v) => ({
                id: v.id,
                impact: v.impact,
                help: v.help,
                nodes: v.nodes.map((n) => n.target),
              })),
              null,
              2,
            ),
        )
      }

      expect(results.violations).toEqual([])
    })
  }
})
