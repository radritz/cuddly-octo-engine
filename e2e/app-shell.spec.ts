import { expect, test } from '@playwright/test'

test('shows a private Supabase configuration gate without env vars', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Configure Supabase' })).toBeVisible()
  await expect(page.getByText('VITE_SUPABASE_URL')).toBeVisible()
})

test('login screen keeps app private', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'HomeOS' })).toBeVisible()
  await expect(page.getByText('allowlisted roommate account')).toBeVisible()
})
