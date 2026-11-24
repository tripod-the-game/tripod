import { test, expect, Page } from '@playwright/test';

// Issues #62 and #71. NG0100 is a development-only check, so these tests guard
// against it only on a development server, which is what CI runs.
const NOW = '2026-03-09T17:00:00Z';
const TODAY = '030926';
const RAW_GAME = JSON.stringify({ category: 'Test', wordOne: 'GRAPE', wordTwo: 'EARTH', wordThree: 'GRAPH' });
// Positions 1-12 for GRAPE / EARTH / GRAPH.
const SOLUTION = 'EPAARRTGRAPH';

// Angular's ErrorHandler reports through console.error, not as a page error.
function collectNg0100(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && /NG0100/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

async function openGame(page: Page): Promise<string[]> {
  const errors = collectNg0100(page);
  await page.clock.setFixedTime(new Date(NOW));
  await page.route('https://raw.githubusercontent.com/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: route.request().url().endsWith('/index.json') ? JSON.stringify(['030726', '030826', TODAY]) : RAW_GAME,
    }),
  );
  await page.addInitScript(() => localStorage.setItem('tripod_seen_tutorial', '1'));
  await page.goto('/play');
  await expect(page.locator('.game-card .circle-input input')).toHaveCount(SOLUTION.length, { timeout: 10_000 });
  return errors;
}

test('solving a puzzle logs no NG0100 (#71)', async ({ page }) => {
  const errors = await openGame(page);
  const inputs = page.locator('.game-card .circle-input input');
  for (let i = 0; i < SOLUTION.length; i++) await inputs.nth(i).fill(SOLUTION[i]);
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Congratulations!')).toBeVisible();
  // Let any trailing change detection run.
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('an all-wrong guess logs no NG0100 (#71)', async ({ page }) => {
  const errors = await openGame(page);
  const inputs = page.locator('.game-card .circle-input input');
  // None of these letters appear in GRAPE / EARTH / GRAPH.
  for (let i = 0; i < SOLUTION.length; i++) await inputs.nth(i).fill('Z');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('.triangle-container.all-wrong')).toHaveCount(1);
  await page.waitForTimeout(800);
  expect(errors).toEqual([]);
});

test('leaving the game for the landing page logs no NG0100 (#62)', async ({ page }) => {
  const errors = await openGame(page);
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});
