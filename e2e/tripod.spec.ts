import { test, expect } from '@playwright/test';

test.describe('Tripod Game', () => {

  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Tripod' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start playing' })).toBeVisible();
  });

  test('can navigate to game', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start playing' }).click();
    await expect(page).toHaveURL('/play');
  });

  test('game page has triangle', async ({ page }) => {
    await page.goto('/play');
    // Wait for the triangle component to load
    await expect(page.locator('app-triangle')).toBeVisible();
  });

  test('can type letters into circles', async ({ page }) => {
    await page.goto('/play');
    // Click first input circle and type
    const circles = page.locator('app-triangle input');
    await circles.first().click();
    await page.keyboard.type('A');
    await expect(circles.first()).toHaveValue('A');
  });

  test('can open reveal modal', async ({ page }) => {
    await page.goto('/play');
    await page.getByRole('button', { name: 'Reveal answer' }).click();
    await expect(page.getByText('Need Help?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('support page loads', async ({ page }) => {
    await page.goto('/support');
    await expect(page.getByRole('heading', { name: 'Tripod Support' })).toBeVisible();
  });

  test('can navigate back from support', async ({ page }) => {
    await page.goto('/support');
    await page.getByRole('link', { name: 'Back to Game' }).click();
    await expect(page).toHaveURL('/');
  });

});
