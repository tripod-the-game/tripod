import { test, expect, Locator, Page, Route } from '@playwright/test';
import {
  DifficultyPuzzleFixture,
  OLD_STATE_DATE,
  OLD_STATE_RAW,
  OLD_STATS_NEW_RESULT_DATE,
  OLD_STATS_RAW,
  OLD_SUBMISSIONS_RAW,
  PUZZLE_4,
  PUZZLE_5,
  RAW_GAME_JSON_4,
  RAW_GAME_JSON_5,
} from '../src/testing/difficulty.fixtures';

type Mode = 'Easy' | 'Medium' | 'Hard';

const GREEN = 'rgb(76, 175, 80)';
const NOW = '2026-03-09T17:00:00Z';
const TODAY = '030926';
const PAST = '030826';
const OLDER = '030726';
const INDEX = [OLDER, PAST, TODAY];

const SIZES = [
  { name: '5-letter', puzzle: PUZZLE_5, raw: RAW_GAME_JSON_5, bottomLeft: 8, web: [528, 668], native: [579, 719] },
  { name: '4-letter', puzzle: PUZZLE_4, raw: RAW_GAME_JSON_4, bottomLeft: 6, web: [503, 643], native: [529, 669] },
];

interface Stub {
  requested: string[];
  games: Record<string, string | number>;
  hold(key: string): () => void;
}

// Every request to the games host is answered here, so the real repository is never hit.
async function stubGames(
  page: Page,
  games: Record<string, string | number>,
  fallback: string,
  index: string[] = INDEX,
): Promise<Stub> {
  const held = new Map<string, Promise<void>>();
  const stub: Stub = {
    requested: [],
    games,
    hold(key) {
      let release!: () => void;
      held.set(key, new Promise<void>((resolve) => (release = resolve)));
      return release;
    },
  };

  await page.route('https://raw.githubusercontent.com/**', async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/index.json')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(index) });
      return;
    }
    const key = url.pathname.match(/(\d{6})\.json$/)?.[1];
    if (!key) {
      await route.fulfill({ status: 404, body: '' });
      return;
    }
    stub.requested.push(url.pathname.split('/main/')[1]);
    await held.get(key);
    const game = stub.games[key] ?? fallback;
    if (typeof game === 'number') {
      await route.fulfill({ status: game, body: '' }).catch(() => undefined);
    } else {
      await route.fulfill({ contentType: 'application/json', body: game }).catch(() => undefined);
    }
  });
  return stub;
}

// addInitScript reruns on reload, so the sessionStorage flag keeps this to one seed.
async function seed(page: Page, entries: Record<string, string>): Promise<void> {
  await page.addInitScript((data) => {
    if (sessionStorage.getItem('e2e_seeded')) return;
    sessionStorage.setItem('e2e_seeded', '1');
    for (const [key, value] of Object.entries(data)) localStorage.setItem(key, value);
  }, entries);
}

async function waitForLoader(page: Page, timeout = 15_000): Promise<void> {
  const loader = page.locator('app-root > .app-loader');
  await expect(loader).toHaveClass(/hidden/, { timeout });
  await expect(loader).toHaveCSS('opacity', '0', { timeout });
}

async function openGame(page: Page): Promise<void> {
  await page.goto('/play');
  await waitForLoader(page);
  await expect(page.locator('.game-card .difficulty-link-row')).toBeVisible();
}

const link = (page: Page): Locator => page.locator('.game-card .difficulty-link');
const linkButton = (page: Page): Locator => page.locator('.game-card button.difficulty-link');
const dialogOption = (page: Page, mode: Mode): Locator =>
  page.locator('.difficulty-confirm').getByRole('button', { name: new RegExp(`^${mode}`) });

async function expectMode(page: Page, mode: Mode): Promise<void> {
  const text = { Hard: /^Need a head start\?$/, Medium: /^Medium (· Make easier|mode)$/, Easy: /^Easy mode$/ }[mode];
  await expect(link(page)).toHaveText(text);
}

async function expectStatusLabel(page: Page, mode: Mode): Promise<void> {
  await expect(link(page)).toHaveText(`${mode} mode`);
  await expect(linkButton(page)).toHaveCount(0);
}

const circle = (page: Page, pos: number): Locator =>
  page.locator(`.game-card .circle-input[data-index="${pos - 1}"]`);
const input = (page: Page, pos: number): Locator => circle(page, pos).locator('input');
const storedItem = (page: Page, key: string): Promise<string | null> =>
  page.evaluate((k) => localStorage.getItem(k), key);

async function moveTo(page: Page, mode: Mode): Promise<void> {
  await linkButton(page).click();
  const dialog = page.locator('.difficulty-confirm');
  await expect(dialog).toBeVisible();
  await dialogOption(page, mode).click();
  await expect(dialog).toBeHidden();
  await expectMode(page, mode);
}

async function expectLocked(page: Page, pos: number, letter: string): Promise<void> {
  await expect(circle(page, pos)).toHaveClass(/locked/);
  await expect(circle(page, pos)).toHaveClass(/correct/);
  await expect(circle(page, pos)).toHaveCSS('background-color', GREEN);
  await expect(input(page, pos)).toBeDisabled();
  await expect(input(page, pos)).toHaveValue(letter);
  const corner = pos === 1 ? 'top' : 'bottom-left';
  await expect(input(page, pos)).toHaveAttribute(
    'aria-label',
    `Locked ${corner} corner, letter ${letter}`,
  );
}

async function expectNoLocks(page: Page): Promise<void> {
  await expect(page.locator('.game-card .circle-input.locked')).toHaveCount(0);
}

async function pickDate(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: 'Pick a past game' }).click();
  await page.getByRole('button', { name: label, exact: true }).click();
}

async function solve(page: Page, puzzle: DifficultyPuzzleFixture): Promise<void> {
  for (let pos = 1; pos <= puzzle.letters.length; pos++) {
    if (await input(page, pos).isEnabled()) {
      await input(page, pos).fill(puzzle.letters[pos - 1]);
    }
  }
  await page.locator('.submit-btn').click();
  await expect(page.locator('.congrats-content')).toBeVisible();
}

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box, 'element has a layout box').not.toBeNull();
  return box!;
}

// Section 9 adds a 32px link row to the base layout. Web centers the card, so it shifts by half.
const LINK_ROW_SHIFT = { web: 16, native: 32 };

const CATEGORY_LENGTHS = ['NBA Players', 'Proposal/Engagement', 'Best Actress Oscar Winners'];

// Counts the vertical pixels at the link's center that actually hit the button.
const tapHeight = (button: Locator): Promise<number> =>
  button.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    let hits = 0;
    for (let y = Math.floor(rect.top) - 10; y <= Math.ceil(rect.bottom) + 10; y++) {
      if (document.elementFromPoint(x, y)?.closest('button.difficulty-link') === el) hits++;
    }
    return hits;
  });

// Swaps the rendered text in place, measures it, and restores it.
const measureCategory = (page: Page, text: string) =>
  page.evaluate((value) => {
    const banner = document.querySelector('.game-card .category-banner')!;
    const node = banner.querySelector('.banner-text')!.firstChild as Text;
    const original = node.nodeValue;
    node.nodeValue = value;
    const range = document.createRange();
    range.selectNodeContents(node);
    const box = range.getBoundingClientRect();
    const b = banner.getBoundingClientRect();
    const result = {
      left: box.left, right: box.right, top: box.top, bottom: box.bottom,
      lines: new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top))).size,
      bannerLeft: b.left, bannerRight: b.right, bannerTop: b.top, bannerBottom: b.bottom, bannerHeight: b.height,
    };
    node.nodeValue = original;
    return result;
  }, text);

// AC45: rendered size of each dialog diagram and center spacing of its bottom row.
const measureDiagrams = async (page: Page) => {
  // The dialog scales in, so measure after its entrance animation.
  await page.locator('.difficulty-confirm').evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  return page.locator('.difficulty-confirm svg').evaluateAll((svgs) =>
    svgs.map((svg) => {
      const box = svg.getBoundingClientRect();
      const centers = Array.from(svg.querySelectorAll('circle')).map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      const bottomY = Math.max(...centers.map((c) => c.y));
      const bottom = centers.filter((c) => Math.abs(c.y - bottomY) < 0.5).map((c) => c.x).sort((a, b) => a - b);
      return { width: box.width, height: box.height, bottom, gaps: bottom.slice(1).map((x, i) => x - bottom[i]) };
    }),
  );
};

const gamePath = (key: string): string =>
  `20${key.slice(4)}/${key.slice(0, 2)}/${key}.json`;

test.describe('difficulty', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(NOW));
    await page.addInitScript(() => localStorage.setItem('tripod_seen_tutorial', '1'));
  });

  test.describe('journeys', () => {
    for (const { name, puzzle, raw, bottomLeft } of SIZES) {
      test(`${name}: pick a mode and win`, async ({ page }) => {
        const stub = await stubGames(page, {}, raw);
        await openGame(page);

        // A published game file opens on Hard and writes nothing.
        expect(stub.requested).toContain(gamePath(TODAY));
        await expect(page.locator('.game-card .circle-input')).toHaveCount(puzzle.letters.length);
        await expect(page.locator('.banner-text')).toHaveText(puzzle.category);
        await expectMode(page, 'Hard');
        await expectNoLocks(page);
        expect(await storedItem(page, `tripod_state_${TODAY}`)).toBeNull();

        await moveTo(page, 'Medium');
        await expectLocked(page, bottomLeft, puzzle.letters[bottomLeft - 1]);
        await moveTo(page, 'Easy');
        await expectLocked(page, bottomLeft, puzzle.letters[bottomLeft - 1]);
        await expectLocked(page, 1, puzzle.letters[0]);

        await input(page, 2).focus();
        for (let i = 0; i < puzzle.letters.length - 3; i++) {
          await page.keyboard.press('Tab');
          const onLocked = await page.evaluate(
            () => !!document.activeElement?.closest('.circle-input.locked'),
          );
          expect(onLocked).toBe(false);
        }

        await solve(page, puzzle);

        expect(JSON.parse((await storedItem(page, 'tripod_stats')) ?? '[]')).toEqual([
          { date: TODAY, solved: true, attempts: 1, hintsUsed: 0, revealed: false, difficulty: 'easy' },
        ]);
        const [submission] = JSON.parse((await storedItem(page, 'tripod_submissions')) ?? '[]');
        for (const pos of [bottomLeft, 1]) {
          expect(submission.values[pos]).toBe(puzzle.letters[pos - 1]);
          expect(submission.validation[pos]).toBe('correct');
        }
      });
    }

    test('link locks after a submission, through Reset and reload', async ({ page }) => {
      await stubGames(page, {}, RAW_GAME_JSON_4);
      await openGame(page);
      await moveTo(page, 'Medium');

      const expectPickerLocked = async () => {
        await expectStatusLabel(page, 'Medium');
        await expectLocked(page, 6, PUZZLE_4.letters[5]);
      };

      await input(page, 2).fill('Z');
      await page.locator('.submit-btn').click();
      await expectPickerLocked();

      await page.locator('.reset-btn').click();
      await expectPickerLocked();

      await page.reload();
      await waitForLoader(page);
      await expectPickerLocked();

      await solve(page, PUZZLE_4);
      expect(JSON.parse((await storedItem(page, 'tripod_stats')) ?? '[]')).toEqual([
        { date: TODAY, solved: true, attempts: 2, hintsUsed: 0, revealed: false, difficulty: 'medium' },
      ]);
      const submissions = JSON.parse((await storedItem(page, 'tripod_submissions')) ?? '[]');
      expect(submissions).toHaveLength(2);
      for (const submission of submissions) {
        expect(submission.values[6]).toBe(PUZZLE_4.letters[5]);
        expect(submission.validation[6]).toBe('correct');
      }
    });

    test('mode persists through date changes, reload, and Reset', async ({ page }) => {
      await stubGames(page, {}, RAW_GAME_JSON_5);
      await openGame(page);

      // A past date follows the same rules and does not affect today.
      await pickDate(page, 'March 8, 2026');
      await waitForLoader(page);
      await expectMode(page, 'Hard');
      await moveTo(page, 'Medium');
      await expectLocked(page, 8, 'G');

      await pickDate(page, 'March 9, 2026');
      await waitForLoader(page);
      await expectMode(page, 'Hard');
      await expectNoLocks(page);
      expect(await storedItem(page, `tripod_state_${TODAY}`)).toBeNull();

      await pickDate(page, 'March 8, 2026');
      await waitForLoader(page);
      await expectMode(page, 'Medium');
      await expectLocked(page, 8, 'G');
      await input(page, 2).fill('Z');
      await page.locator('.submit-btn').click();
      await expectStatusLabel(page, 'Medium');

      await pickDate(page, 'March 9, 2026');
      await waitForLoader(page);
      await moveTo(page, 'Medium');
      await page.reload();
      await waitForLoader(page);
      await expectMode(page, 'Medium');
      await expectLocked(page, 8, 'G');

      // Reset with no submission keeps the corner and leaves the link usable.
      await input(page, 2).fill('Z');
      await page.locator('.reset-btn').click();
      await expect(input(page, 2)).toHaveValue('');
      await expectLocked(page, 8, 'G');
      await expect(linkButton(page)).toBeEnabled();
    });

    test('share output carries the mode label', async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
        Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async (text: string) => {
              (window as unknown as { copiedText: string }).copiedText = text;
            },
          },
        });
      });
      await stubGames(page, {}, RAW_GAME_JSON_5);
      await openGame(page);
      await moveTo(page, 'Medium');
      await solve(page, PUZZLE_5);

      await page.locator('.share-btn').click();
      await expect
        .poll(() => page.evaluate(() => (window as unknown as { copiedText?: string }).copiedText))
        .toBe('Tripod 03/09/2026 (Medium)\nSolved in 1 attempt! ⭐⭐⭐');
    });

    test('dialog manages focus without entering the triangle', async ({ page }) => {
      await stubGames(page, {}, RAW_GAME_JSON_5);
      await openGame(page);
      const dialog = page.locator('.difficulty-confirm');
      const cancel = dialog.getByRole('button', { name: 'Cancel' });
      const open = async () => {
        await linkButton(page).focus();
        await page.keyboard.press('Enter');
        await expect(cancel).toBeFocused();
      };
      const expectOutsideTriangle = async () =>
        expect(await page.evaluate(() => !!document.activeElement?.closest('app-triangle .triangle-container'))).toBe(false);

      // Three buttons from Hard.
      await open();
      await page.keyboard.press('Tab');
      await expect(dialogOption(page, 'Medium')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(dialogOption(page, 'Easy')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(cancel).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(dialogOption(page, 'Easy')).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(linkButton(page)).toBeFocused();

      await open();
      await page.keyboard.press('Enter');
      await expect(dialog).toBeHidden();
      await expect(linkButton(page)).toBeFocused();
      expect(await storedItem(page, `tripod_state_${TODAY}`)).toBeNull();

      // Hard to Medium keeps a move available, so focus returns to the button.
      await open();
      await dialogOption(page, 'Medium').focus();
      await page.keyboard.press('Enter');
      await expectMode(page, 'Medium');
      await expect(linkButton(page)).toBeFocused();
      await expectOutsideTriangle();

      // Two buttons from Medium.
      await open();
      await page.keyboard.press('Tab');
      await expect(dialogOption(page, 'Easy')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(cancel).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(dialogOption(page, 'Easy')).toBeFocused();

      // Easy has no further move, so focus lands on the plain label.
      await page.keyboard.press('Enter');
      await expectStatusLabel(page, 'Easy');
      await expect(link(page)).toBeFocused();
      await expect(link(page)).toHaveAttribute('tabindex', '-1');
      await expectOutsideTriangle();
    });

    for (const { name, puzzle, raw, web, native } of SIZES) {
      test(`${name}: layout fits desktop and phone screens`, async ({ page }) => {
        await stubGames(page, {}, raw);
        await openGame(page);

        for (const viewport of [
          { width: 1280, height: 800 },
          { width: 390, height: 844 },
          { width: 375, height: 667 },
          { width: 375, height: 660 },
          { width: 320, height: 568 },
        ]) {
          await test.step(`${viewport.width}x${viewport.height}`, async () => {
            await page.setViewportSize(viewport);
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.evaluate(() => new Promise(requestAnimationFrame));

            await expect(linkButton(page)).toBeVisible();
            await expect(page.locator('.category-banner button')).toHaveCount(0);
            const linkBox = await boxOf(linkButton(page));
            const lastCircle = await boxOf(page.locator('.game-card .circle-input').last());
            expect(linkBox.y).toBeGreaterThanOrEqual(lastCircle.y + lastCircle.height);

            expect(await horizontalOverflow(page)).toBe(0);
            expect(linkBox.x).toBeGreaterThanOrEqual(0);
            expect(linkBox.x + linkBox.width).toBeLessThanOrEqual(viewport.width);
            expect(await tapHeight(linkButton(page))).toBeGreaterThanOrEqual(44);

            if (viewport.width === 320 || viewport.width === 390) {
              await linkButton(page).click();
              const [medium, easy] = await measureDiagrams(page);
              expect(easy.width).toBe(medium.width);
              expect(easy.height).toBe(medium.height);
              expect(medium.width).toBe(56);
              expect(medium.height).toBe(50);
              for (const { bottom, gaps } of [medium, easy]) {
                expect(bottom).toHaveLength(puzzle.size);
                expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(0.5);
              }
              await page.keyboard.press('Escape');
              await expect(page.locator('.difficulty-confirm')).toBeHidden();
            }

            if (viewport.height !== 660) {
              for (const text of CATEGORY_LENGTHS) {
                const fit = await measureCategory(page, text);
                expect(fit.left, text).toBeGreaterThanOrEqual(fit.bannerLeft);
                expect(fit.right, text).toBeLessThanOrEqual(fit.bannerRight);
                expect(fit.top, text).toBeGreaterThanOrEqual(fit.bannerTop);
                expect(fit.bottom, text).toBeLessThanOrEqual(fit.bannerBottom);
                expect(fit.lines, text).toBeLessThanOrEqual(2);
                expect(fit.bannerHeight, text).toBe(48);
              }
            }

            if (viewport.width === 390) {
              const submitTop = (await boxOf(page.locator('.submit-btn'))).y;
              const reset = await boxOf(page.locator('.reset-btn'));
              expect(Math.round(submitTop)).toBeLessThanOrEqual(web[0] + LINK_ROW_SHIFT.web);
              expect(Math.round(reset.y + reset.height)).toBeLessThanOrEqual(web[1] + LINK_ROW_SHIFT.web);
            }

            // Measured at scroll 0: no viewport here may need scrolling to reach the actions.
            for (const selector of ['.submit-btn', '.reset-btn']) {
              const button = page.locator(selector);
              const box = await boxOf(button);
              expect(box.x).toBeGreaterThanOrEqual(0);
              expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
              expect(box.y).toBeGreaterThanOrEqual(0);
              expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
            }
          });
        }

        for (const viewport of [
          { width: 390, height: 844 },
          { width: 375, height: 667 },
          { width: 320, height: 568 },
        ]) {
          await test.step(`native ${viewport.width}x${viewport.height}`, async () => {
            await page.setViewportSize(viewport);
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.evaluate(() => document.documentElement.classList.add('ios-native'));
            await expect(page.locator('html')).toHaveClass(/ios-native/);
            await page.evaluate(() => new Promise(requestAnimationFrame));

            const submit = await boxOf(page.locator('.submit-btn'));
            const reset = await boxOf(page.locator('.reset-btn'));
            for (const box of [submit, reset]) {
              expect(box.y).toBeGreaterThanOrEqual(0);
              expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
              expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
            }
            if (viewport.width === 390) {
              expect(Math.round(submit.y)).toBeLessThanOrEqual(native[0] + LINK_ROW_SHIFT.native);
              expect(Math.round(reset.y + reset.height)).toBeLessThanOrEqual(native[1] + LINK_ROW_SHIFT.native);
            }
            if (viewport.height <= 800) {
              // Proves the short-screen native rules are the layout being measured.
              expect(submit.y).toBe(reset.y);
            }
            await page.evaluate(() => document.documentElement.classList.remove('ios-native'));
          });
        }

        // How to Play opens by itself only for a player who has not seen it.
        await page.addInitScript(() => localStorage.removeItem('tripod_seen_tutorial'));
        await page.reload();
        await waitForLoader(page);
        const modal = page.getByRole('dialog', { name: 'How to play' });
        await expect(modal).toBeVisible();

        for (const viewport of [{ width: 375, height: 667 }, { width: 320, height: 568 }]) {
          await test.step(`How to Play ${viewport.width}px`, async () => {
            await page.setViewportSize(viewport);
            await page.evaluate(() => new Promise(requestAnimationFrame));

            const panel = await boxOf(modal);
            expect(panel.x).toBeGreaterThanOrEqual(0);
            expect(panel.x + panel.width).toBeLessThanOrEqual(viewport.width);

            const body = modal.locator('.modal-body');
            const bodyOverflow = await body.evaluate((el) => el.scrollWidth - el.clientWidth);
            expect(bodyOverflow).toBeLessThanOrEqual(0);

            const heading = modal.getByRole('heading', { name: 'Difficulty' });
            await heading.scrollIntoViewIfNeeded();
            await expect(heading).toBeInViewport();
            const section = modal.locator('.section', {
              has: page.getByRole('heading', { name: 'Difficulty' }),
            });
            const box = await boxOf(section);
            expect(box.x).toBeGreaterThanOrEqual(panel.x);
            expect(box.x + box.width).toBeLessThanOrEqual(panel.x + panel.width);
            for (const mode of ['Hard', 'Medium', 'Easy']) {
              await expect(section.getByText(mode, { exact: true })).toBeVisible();
            }
          });
        }
      });
    }
  });

  test.describe('game loading', () => {
    test('is hidden when the puzzle is unavailable and returns on retry', async ({ page }) => {
      const stub = await stubGames(page, { [TODAY]: 404 }, RAW_GAME_JSON_5);
      await page.goto('/play');
      await waitForLoader(page);

      await expect(page.getByRole('heading', { name: "Couldn't load this puzzle" })).toBeVisible();
      await expect(page.locator('.difficulty-link-row')).toHaveCount(0);

      stub.games[TODAY] = RAW_GAME_JSON_5;
      await page.getByRole('button', { name: 'Retry' }).click();
      await waitForLoader(page);
      await expect(link(page)).toBeVisible();
    });

    test('a delayed response for an earlier date does not replace the current puzzle', async ({ page }) => {
      test.setTimeout(60_000);
      await seed(page, {
        [`tripod_state_${OLDER}`]:
          '{"hintsUsed":0,"hintedPositions":[],"revealed":false,"difficulty":"medium"}',
      });
      const stub = await stubGames(
        page,
        { [PAST]: RAW_GAME_JSON_5, [OLDER]: RAW_GAME_JSON_4 },
        RAW_GAME_JSON_5,
      );
      await openGame(page);

      // Lets the test pick a second date while the first load is still pending.
      await page.addStyleTag({ content: '.app-loader { pointer-events: none !important; }' });

      const releasePast = stub.hold(PAST);
      await pickDate(page, 'March 8, 2026');
      const heldAt = Date.now();
      await expect.poll(() => stub.requested.some((path) => path.endsWith(`${PAST}.json`))).toBe(true);
      await pickDate(page, 'March 7, 2026');
      await expect(page.locator('.banner-text')).toHaveText(PUZZLE_4.category);
      await expectLocked(page, 6, PUZZLE_4.letters[5]);

      // The earlier request must still be live, inside GameService's 10 second timeout.
      expect(Date.now() - heldAt).toBeLessThan(9_000);
      const lateResponse = page.waitForResponse((r) => r.url().endsWith(`${PAST}.json`));
      releasePast();
      await lateResponse;
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 150)));

      await expect(page.locator('.banner-text')).toHaveText(PUZZLE_4.category);
      await expect(page.locator('.game-card .circle-input')).toHaveCount(PUZZLE_4.letters.length);
      await expectLocked(page, 6, PUZZLE_4.letters[5]);
    });
  });

  test.describe('old-format data', () => {
    test('loads as Hard and a new result leaves old entries unchanged', async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-11-02T17:00:00Z'));
      await seed(page, {
        tripod_stats: OLD_STATS_RAW,
        [`tripod_state_${OLD_STATE_DATE}`]: OLD_STATE_RAW,
        tripod_submissions: OLD_SUBMISSIONS_RAW,
      });
      await stubGames(page, {}, RAW_GAME_JSON_5, [OLD_STATE_DATE, OLD_STATS_NEW_RESULT_DATE]);
      await openGame(page);

      await expectMode(page, 'Hard');
      await expectNoLocks(page);

      await solve(page, PUZZLE_5);

      const stats = (await storedItem(page, 'tripod_stats')) ?? '';
      expect(stats.startsWith(`${OLD_STATS_RAW.slice(0, -1)},`)).toBe(true);
      const added = JSON.parse(stats).at(-1);
      expect(added).toMatchObject({ date: OLD_STATS_NEW_RESULT_DATE, solved: true, difficulty: 'hard' });

      expect(await storedItem(page, `tripod_state_${OLD_STATE_DATE}`)).toBe(OLD_STATE_RAW);
      const submissions = (await storedItem(page, 'tripod_submissions')) ?? '';
      expect(submissions.startsWith(`${OLD_SUBMISSIONS_RAW.slice(0, -1)},`)).toBe(true);
    });
  });

  test.describe('midnight Eastern rollover', () => {
    const MATRIX = [
      { name: 'winter EST', before: '2026-01-15T04:59:59Z', beforeKey: '011426', after: '2026-01-15T05:00:00Z', afterKey: '011526' },
      { name: 'summer EDT', before: '2026-07-15T03:59:59Z', beforeKey: '071426', after: '2026-07-15T04:00:00Z', afterKey: '071526' },
      { name: 'DST start day', before: '2026-03-08T04:59:59Z', beforeKey: '030726', after: '2026-03-08T05:00:00Z', afterKey: '030826' },
      { name: 'day after DST start', before: '2026-03-09T03:59:59Z', beforeKey: '030826', after: '2026-03-09T04:00:00Z', afterKey: '030926' },
      { name: 'DST end day', before: '2026-11-01T03:59:59Z', beforeKey: '103126', after: '2026-11-01T04:00:00Z', afterKey: '110126' },
      { name: 'day after DST end', before: '2026-11-02T04:59:59Z', beforeKey: '110126', after: '2026-11-02T05:00:00Z', afterKey: '110226' },
    ];

    for (const timezoneId of ['America/New_York', 'Pacific/Kiritimati', 'Pacific/Pago_Pago']) {
      test.describe(timezoneId, () => {
        test.use({ timezoneId });

        for (const { name, before, beforeKey, after, afterKey } of MATRIX) {
          test(`${name}: ${beforeKey} to ${afterKey}`, async ({ page }) => {
            await page.clock.setFixedTime(new Date(before));
            const stub = await stubGames(page, {}, RAW_GAME_JSON_5, [beforeKey, afterKey]);
            await openGame(page);
            expect(stub.requested).toContain(gamePath(beforeKey));

            await moveTo(page, 'Medium');
            await expectLocked(page, 8, 'G');
            const savedBefore = await storedItem(page, `tripod_state_${beforeKey}`);
            expect(JSON.parse(savedBefore ?? '{}').difficulty).toBe('medium');

            await page.clock.setFixedTime(new Date(after));
            stub.requested.length = 0;
            await page.reload();
            await waitForLoader(page);

            expect(stub.requested).toContain(gamePath(afterKey));
            expect(stub.requested).not.toContain(gamePath(beforeKey));
            await expectMode(page, 'Hard');
            await expectNoLocks(page);
            expect(await storedItem(page, `tripod_state_${afterKey}`)).toBeNull();
            expect(await storedItem(page, `tripod_state_${beforeKey}`)).toBe(savedBefore);
          });
        }
      });
    }

    const STREAKS = [
      { name: 'DST start', now: '2026-03-09T17:00:00Z', keys: ['030726', '030826', '030926'] },
      { name: 'DST end', now: '2026-11-02T17:00:00Z', keys: ['103126', '110126', '110226'] },
    ];

    for (const { name, now, keys } of STREAKS) {
      test(`Easy and Medium wins keep a streak of 3 across ${name}`, async ({ page }) => {
        await page.clock.setFixedTime(new Date(now));
        await seed(page, {
          tripod_stats: JSON.stringify([
            { date: keys[0], solved: true, attempts: 1, hintsUsed: 0, revealed: false, difficulty: 'easy' },
            { date: keys[1], solved: true, attempts: 2, hintsUsed: 0, revealed: false, difficulty: 'medium' },
          ]),
        });
        await stubGames(page, {}, RAW_GAME_JSON_5, keys);
        await openGame(page);
        await moveTo(page, 'Medium');
        await solve(page, PUZZLE_5);

        await page.locator('.congrats-content').getByRole('button', { name: 'Close' }).click();
        await page.getByRole('button', { name: 'View statistics' }).click();
        const stat = (label: string) =>
          page.locator('.stat-cell', { hasText: label }).locator('.stat-value');
        await expect(stat('Current Streak')).toHaveText('3');
        await expect(stat('Max Streak')).toHaveText('3');
      });
    }
  });
});
