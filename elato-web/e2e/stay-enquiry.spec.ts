import { test, expect } from '@playwright/test'
import { mockEnquiriesApi, mockAnalyticsApi } from './fixtures/api-mocks'

/**
 * Stay booking enquiry: fill the form end-to-end and assert on the visible
 * success state.
 *
 * BookingEnquiry.tsx now also persists the enquiry to elato-backend
 * (`persistEnquiry`, fire-and-forget — never awaited before the WhatsApp
 * deep-link opens, so a failing/absent backend can't block the UI). We mock
 * that POST at the network layer so the test doesn't depend on a live
 * backend/DB, and assert purely on frontend behavior: the success message
 * and the generated WhatsApp link.
 */
test.describe('Stay booking enquiry', () => {
  test('submits with valid data and shows the success state', async ({ page, context }) => {
    await mockEnquiriesApi(page)
    await mockAnalyticsApi(page)
    await page.goto('/elato-stay')

    await page.getByLabel('Name').fill('Farida Sheikh')
    // Phone is the bare national-number input — country code is a separate
    // "Country code" select (defaults to India/+91), not part of this field.
    await page.getByLabel('Phone').fill('98765 43210')
    await page.getByLabel('Email').fill('farida@example.com')

    const today = new Date()
    const inTwoDays = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
    const inFourDays = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000)
    const toInputDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    await page.getByLabel('Check-in').fill(toInputDate(inTwoDays))
    await page.getByLabel('Check-out').fill(toInputDate(inFourDays))
    await page.getByLabel('Guests').fill('4')
    await page.getByLabel('Message').fill('Celebrating an anniversary, would love a quiet room.')

    // wa.me is a real, internet-reachable link that redirects to
    // api.whatsapp.com — racing that redirect (waiting for the popup then
    // checking its URL) is flaky, since the redirect can complete before we
    // ever get to look. Intercept the wa.me request itself instead: it never
    // actually navigates, so we capture the exact URL this app generated
    // regardless of network conditions.
    let capturedWaUrl: string | null = null
    await context.route('https://wa.me/**', async (route) => {
      capturedWaUrl = route.request().url()
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>ok</body></html>' })
    })

    await page.getByRole('button', { name: 'Enquire on WhatsApp' }).click()
    await expect.poll(() => capturedWaUrl).not.toBeNull()

    await expect(page.getByRole('status')).toContainText(
      'your enquiry has been sent',
    )

    const waUrl = new URL(capturedWaUrl!)
    expect(waUrl.hostname).toBe('wa.me')
    const text = waUrl.searchParams.get('text') ?? ''
    expect(text).toContain('Farida Sheikh')
    expect(text).toContain('4 guests')
  })

  test('shows validation errors and does not submit with invalid data', async ({ page }) => {
    await page.goto('/elato-stay')

    // Trigger onBlur validation without filling anything.
    await page.getByLabel('Name').click()
    await page.getByLabel('Phone').click()
    await page.getByLabel('Phone').fill('12345')
    await page.getByLabel('Email').click()
    await page.getByLabel('Email').fill('not-an-email')
    await page.getByLabel('Message').click()

    await page.getByRole('button', { name: 'Enquire on WhatsApp' }).click()

    await expect(page.getByText('Enter 2–60 letters, spaces or hyphens only.')).toBeVisible()
    // Default country is India (+91) — validatePhoneForCountry now returns a
    // per-country message with an example number, not the old combined
    // "+91 or +971" string.
    await expect(page.getByText(/Enter a valid \+91 number/)).toBeVisible()
    await expect(page.getByText('Enter a valid email address.')).toBeVisible()
    // Never reaches the success state.
    await expect(page.getByRole('status')).toHaveCount(0)
  })
})
