import { test, expect, Page } from '@playwright/test';

// The bug depends on the player's real time zone, and the unit runs inherit the host's.
// Each case sets the browser's zone explicitly, so the result is the same on any machine.
const NOW = '2026-11-02T17:00:00Z';
const RAW_GAME = JSON.stringify({ category: 'Test', wordOne: 'GRAPE', wordTwo: 'EARTH', wordThree: 'GRAPH' });

const RUNS = [
  { name: 'spring clock change', dates: ['032826', '032926', '033026', '033126'] },
  { name: 'autumn clock change', dates: ['102426', '102526', '102626', '102726'] },
];
const ZONES = ['Europe/London', 'Europe/Lisbon', 'America/New_York', 'Asia/Tokyo'];

const storedStats = (dates: string[]): string =>
  JSON.stringify(dates.map((date) => ({ date, solved: true, attempts: 2, hintsUsed: 0, revealed: false })));

async function openStats(page: Page, stats: string): Promise<void> {
  await page.clock.setFixedTime(new Date(NOW));
  await page.route('https://raw.githubusercontent.com/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: route.request().url().endsWith('/index.json') ? '[]' : RAW_GAME,
    }),
  );
  await page.addInitScript((value) => {
    localStorage.setItem('tripod_seen_tutorial', '1');
    localStorage.setItem('tripod_stats', value);
  }, stats);
  await page.goto('/play');
  await page.getByRole('button', { name: 'View statistics' }).click();
}

const statValue = (page: Page, label: string) =>
  page.locator('.stat-cell', { hasText: label }).locator('.stat-value');

test.describe('streaks in Europe/London with results stored out of order', () => {
  test.use({ timezoneId: 'Europe/London' });

  test('treats the later date as latest across the spring clock change', async ({ page }) => {
    const stats = JSON.stringify([
      { date: '033026', solved: true, attempts: 2, hintsUsed: 0, revealed: false },
      { date: '032926', solved: false, attempts: 2, hintsUsed: 0, revealed: false },
    ]);
    await openStats(page, stats);

    await expect(statValue(page, 'Current Streak')).toHaveText('1');
    await expect(statValue(page, 'Max Streak')).toHaveText('1');
    expect(await page.evaluate(() => localStorage.getItem('tripod_stats'))).toBe(stats);
  });
});

for (const timezoneId of ZONES) {
  test.describe(`streaks in ${timezoneId}`, () => {
    test.use({ timezoneId });

    for (const run of RUNS) {
      test(`counts consecutive days across the ${run.name}`, async ({ page }) => {
        const stats = storedStats(run.dates);
        await openStats(page, stats);

        const zone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
        expect(zone).toBe(timezoneId);
        await expect(statValue(page, 'Current Streak')).toHaveText(String(run.dates.length));
        await expect(statValue(page, 'Max Streak')).toHaveText(String(run.dates.length));
        // Stored results are read as they are, with no migration.
        expect(await page.evaluate(() => localStorage.getItem('tripod_stats'))).toBe(stats);
      });
    }
  });
}
