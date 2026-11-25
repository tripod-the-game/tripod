import { test, expect, Page } from '@playwright/test';
import {
  NON_ARRAY_STATS_RAW,
  NON_ARRAY_SUBMISSIONS_RAW,
  TRUNCATED_STATS_RAW,
  TRUNCATED_SUBMISSIONS_RAW,
} from '../src/testing/corrupt-storage.fixtures';

// Issue #57. Fixed clock and stubbed games, so the run never depends on today's puzzle.
const NOW = '2026-03-09T17:00:00Z';
const TODAY = '030926';
const RAW_GAME = JSON.stringify({ category: 'Test', wordOne: 'GRAPE', wordTwo: 'EARTH', wordThree: 'GRAPH' });
// Positions 1-12 for GRAPE / EARTH / GRAPH.
const SOLUTION = 'EPAARRTGRAPH';

// Angular's ErrorHandler reports through console.error, not as a page error.
function collectAppErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    const text = m.text();
    if (m.type() === 'error' && /TypeError|^ERROR/.test(text)) errors.push(text);
  });
  return errors;
}

async function openGame(page: Page, storage: Record<string, string>): Promise<string[]> {
  const errors = collectAppErrors(page);
  await page.clock.setFixedTime(new Date(NOW));
  await page.route('https://raw.githubusercontent.com/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: route.request().url().endsWith('/index.json') ? JSON.stringify(['030726', '030826', TODAY]) : RAW_GAME,
    }),
  );
  await page.addInitScript((data) => {
    if (sessionStorage.getItem('e2e_seeded')) return;
    sessionStorage.setItem('e2e_seeded', '1');
    localStorage.setItem('tripod_seen_tutorial', '1');
    for (const [key, value] of Object.entries(data)) localStorage.setItem(key, value);
  }, storage);
  await page.goto('/play');
  return errors;
}

async function solve(page: Page): Promise<void> {
  const inputs = page.locator('.game-card .circle-input input');
  await expect(inputs).toHaveCount(SOLUTION.length, { timeout: 10_000 });
  for (let i = 0; i < SOLUTION.length; i++) await inputs.nth(i).fill(SOLUTION[i]);
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Congratulations!')).toBeVisible();
}

const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);

// The raw value must survive under some tripod_* key other than the one rewritten.
const preservedElsewhere = (page: Page, raw: string, rewrittenKey: string) =>
  page.evaluate(
    ([value, key]) =>
      Object.keys(localStorage).some((k) => k !== key && k.startsWith('tripod_') && localStorage.getItem(k) === value),
    [raw, rewrittenKey],
  );

function expectWinRecorded(raw: string | null): void {
  const results = JSON.parse(raw ?? 'null');
  expect(Array.isArray(results), `tripod_stats is an array: ${raw}`).toBe(true);
  expect(results).toContainEqual(expect.objectContaining({ date: TODAY, solved: true, attempts: 1 }));
}

test.describe('corrupted tripod_stats', () => {
  test('{} opens Stats without errors and still records a win', async ({ page }) => {
    const errors = await openGame(page, { tripod_stats: '{}' });

    await page.getByRole('button', { name: 'View statistics' }).click();
    await expect(page.locator('.stat-cell', { hasText: 'Played' }).locator('.stat-value')).toHaveText('0');
    await page.getByRole('button', { name: 'Done' }).click();
    await solve(page);

    expectWinRecorded(await stored(page, 'tripod_stats'));
    expect(errors).toEqual([]);
  });

  for (const [name, raw] of [['non-array JSON', NON_ARRAY_STATS_RAW], ['truncated JSON', TRUNCATED_STATS_RAW]]) {
    test(`${name} is preserved when a win is recorded`, async ({ page }) => {
      const errors = await openGame(page, { tripod_stats: raw });

      await solve(page);

      expectWinRecorded(await stored(page, 'tripod_stats'));
      expect(await preservedElsewhere(page, raw, 'tripod_stats')).toBe(true);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('corrupted tripod_submissions', () => {
  for (const [name, raw] of [['non-array JSON', NON_ARRAY_SUBMISSIONS_RAW], ['truncated JSON', TRUNCATED_SUBMISSIONS_RAW]]) {
    test(`${name} still renders a playable game and is preserved on the next save`, async ({ page }) => {
      const errors = await openGame(page, { tripod_submissions: raw });

      await solve(page);

      expectWinRecorded(await stored(page, 'tripod_stats'));
      expect(await preservedElsewhere(page, raw, 'tripod_submissions')).toBe(true);
      expect(errors).toEqual([]);
    });
  }
});
