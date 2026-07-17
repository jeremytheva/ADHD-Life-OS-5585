import { test, expect } from '@playwright/test'

test('anonymous visitors are directed to sign in', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { name: /welcome back|sign in/i })).toBeVisible()
})

test('login and registration routes are available', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('link', { name: /create account|sign up/i })).toBeVisible()
  await page.getByRole('link', { name: /create account|sign up/i }).click()
  await expect(page).toHaveURL(/\/register/)
})
