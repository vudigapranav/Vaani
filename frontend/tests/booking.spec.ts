import { expect, test } from '@playwright/test'

test('a replay updates the dining portal in another tab and saves a call log', async ({ page, context }) => {
  await page.goto('/partner/login')
  await page.getByLabel('Business').selectOption('r-00')
  await page.getByLabel('Passcode').fill('000000')
  await page.getByRole('button', { name: 'Open portal' }).click()
  await expect(page.getByRole('heading', { name: 'Tamarind Lantern' })).toBeVisible()
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  await page.getByLabel('Date').fill(tomorrow)
  await expect(page.getByText('No bookings for this date.')).toBeVisible()

  const studio = await context.newPage()
  await studio.goto('/studio')
  await studio.getByRole('button', { name: 'Replay restaurant call' }).click()
  await expect(studio.getByRole('link', { name: /^VN-/ })).toBeVisible()
  await expect(page.getByText(/New booking · Sample guest/)).toBeVisible()
  await expect(studio.getByRole('button', { name: 'Call 1 · Ended' })).toBeVisible()
  await studio.getByRole('link', { name: 'Call logs' }).click()
  await expect(studio.getByRole('link', { name: /^Booking VN-/ })).toBeVisible()
})

test('a hospital replay creates a payable appointment and updates booking status', async ({ page }) => {
  await page.goto('/studio')
  await page.getByRole('button', { name: 'Replay hospital call' }).click()
  await page.getByRole('link', { name: /^VN-/ }).click()
  await expect(page.getByText('Payment due')).toBeVisible()
  await page.getByRole('link', { name: 'Pay now' }).click()
  await page.getByRole('button', { name: 'Pay (test)' }).click()
  await expect(page.getByText('Paid', { exact: true })).toBeVisible()
})
