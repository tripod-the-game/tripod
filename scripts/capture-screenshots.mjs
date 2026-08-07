// Generates App Store screenshots from the *real* running app (not mockups).
//
// Boots `ng serve`, drives the actual UI with Playwright to reach a handful
// of "conversion beats" (first impression, the color-feedback payoff, the
// win moment, the streak/habit hook), then composes each raw capture into a
// store-ready image with a bold headline band matching the app's own
// black/white + Baloo 2 brand style.
//
// Usage: node scripts/capture-screenshots.mjs
// Output: store/screenshots/en-US/*.png (1290x2796 — iPhone 6.7" spec)

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'store/screenshots/en-US');
const PORT = 4300;
const BASE_URL = `http://localhost:${PORT}`;
const EXECUTABLE_PATH = '/opt/pw-browsers/chromium';

// A self-consistent puzzle (same corner-sharing rules as any real puzzle):
// wordOne[4]===wordTwo[0]==='A' (apex), wordOne[0]===wordThree[0]==='G' (bottom-left),
// wordTwo[4]===wordThree[4]==='E' (bottom-right). This is the same GUAVA/APPLE/GRAPE
// puzzle already used as the built-in practice round in how-to-play.component.
const MOCK_GAME = { category: 'Fruits', wordOne: 'GUAVA', wordTwo: 'APPLE', wordThree: 'GRAPE' };
// 1-indexed circle -> correct letter, matching GameService's position mapping for this puzzle.
const ANSWER = { 1: 'A', 2: 'V', 3: 'P', 4: 'A', 5: 'P', 6: 'U', 7: 'L', 8: 'G', 9: 'R', 10: 'A', 11: 'P', 12: 'E' };
// A deliberately partial, colorful guess: mixes correct (green), a swapped-word
// purple block (GRAPE's letters typed into wordOne's slots), and present-letter yellows.
const MID_GAME_GUESS = { 1: 'E', 2: 'P', 3: 'A', 4: 'A', 5: 'B', 6: 'R', 7: 'U', 8: 'G', 9: 'R', 10: 'A', 11: 'P', 12: 'L' };

function mockStats() {
  const results = [];
  const day = 86_400_000;
  const fmt = (d) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}${dd}${yy}`;
  };
  // Two earlier, non-consecutive results (one loss) ...
  results.push({ date: fmt(new Date(Date.now() - 13 * day)), solved: true, attempts: 3, hintsUsed: 0, revealed: false });
  results.push({ date: fmt(new Date(Date.now() - 12 * day)), solved: false, attempts: 6, hintsUsed: 2, revealed: true });
  // ...then an 8-day current streak ending yesterday.
  for (let i = 8; i >= 1; i--) {
    results.push({
      date: fmt(new Date(Date.now() - i * day)),
      solved: true,
      attempts: [1, 2, 2, 3, 1, 4, 2, 3][8 - i],
      hintsUsed: 0,
      revealed: false,
    });
  }
  return results;
}

async function waitForServer() {
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(BASE_URL);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('ng serve did not become ready in time');
}

async function seedAndBlockNetwork(page, { stats = true } = {}) {
  await page.route('**raw.githubusercontent.com/tripod-the-game/tripod-games/main/**', (route) => {
    const url = route.request().url();
    if (url.endsWith('index.json')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_GAME) });
  });

  await page.addInitScript(
    ({ statsData, seedStats }) => {
      localStorage.setItem('tripod_seen_tutorial', '1');
      if (seedStats) {
        localStorage.setItem('tripod_stats', JSON.stringify(statsData));
      }
    },
    { statsData: mockStats(), seedStats: stats }
  );
}

// Typing triggers an async round-trip (child emits valuesChanged -> parent
// re-renders with a new initialValues snapshot -> child's applyInitialValues
// re-syncs from that snapshot). Typing faster than that round-trip settles
// causes the last keystroke(s) to get clobbered by a stale re-sync, so each
// fill needs to wait the loop out before the next one starts.
async function typeGuess(page, values) {
  for (let circle = 1; circle <= 12; circle++) {
    const letter = values[circle];
    if (!letter) continue;
    const input = page.locator(`.circle-input[data-index="${circle - 1}"] input`);
    await input.fill(letter);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(500);
}

async function captureRaw(browser, { name, path: route, act }) {
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  const page = await context.newPage();
  await seedAndBlockNetwork(page);
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  if (act) await act(page);
  const buffer = await page.screenshot({ animations: 'disabled' });
  await context.close();
  console.log(`captured raw: ${name}`);
  return buffer;
}

function composeHtml(base64Png, headline, accent) {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&display=block" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1290px; height: 2796px; background: #141414; position: relative; overflow: hidden; font-family: 'Baloo 2', sans-serif; }
  .band { position: absolute; top: 0; left: 0; right: 0; height: 500px; display: flex; align-items: center; justify-content: center; padding: 0 90px; }
  .dot { position: absolute; border-radius: 50%; opacity: 0.9; }
  h1 { color: #ffffff; font-size: 84px; font-weight: 800; text-align: center; line-height: 1.08; text-shadow: 0 4px 0 rgba(0,0,0,0.25); }
  .frame { position: absolute; top: 540px; left: 60px; right: 60px; bottom: 60px; background: #ffffff; border-radius: 48px; box-shadow: 0 30px 80px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .frame img { max-width: 100%; max-height: 100%; display: block; }
</style>
</head>
<body>
  <div class="dot" style="width:120px;height:120px;background:${accent};top:60px;left:70px;"></div>
  <div class="dot" style="width:70px;height:70px;background:${accent};bottom:2216px;right:100px;top:120px;"></div>
  <div class="band"><h1>${headline}</h1></div>
  <div class="frame"><img src="data:image/png;base64,${base64Png}"/></div>
</body></html>`;
}

async function composeFinal(browser, { rawBuffer, headline, accent, outFile }) {
  const context = await browser.newContext({ viewport: { width: 1290, height: 2796 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.setContent(composeHtml(rawBuffer.toString('base64'), headline, accent), { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: outFile });
  await context.close();
  console.log(`wrote ${outFile}`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  console.log('starting ng serve...');
  const server = spawn('npx', ['ng', 'serve', '--port', String(PORT)], {
    cwd: ROOT,
    stdio: 'ignore',
    detached: true,
  });

  try {
    await waitForServer();
    console.log('ng serve ready');

    const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });

    const shots = [
      {
        name: '1-landing',
        path: '/',
        headline: 'A New Puzzle\nEvery Day',
        accent: '#4caf50',
      },
      {
        name: '2-color-feedback',
        path: '/play',
        headline: 'Instant Color\nFeedback',
        accent: '#9c27b0',
        act: async (page) => {
          await typeGuess(page, MID_GAME_GUESS);
          await page.locator('.submit-btn').click();
          await page.waitForTimeout(500);
        },
      },
      {
        name: '3-solved',
        path: '/play',
        headline: 'Solve the\nDaily Triangle',
        accent: '#f9a825',
        act: async (page) => {
          await typeGuess(page, ANSWER);
          await page.locator('.submit-btn').click();
          await page.waitForTimeout(700);
        },
      },
      {
        name: '4-streak',
        path: '/play',
        headline: 'Build Your\nStreak',
        accent: '#4caf50',
        act: async (page) => {
          await page.locator('button.icon-btn[aria-label="View statistics"]').click();
          await page.waitForTimeout(400);
        },
      },
    ];

    for (const shot of shots) {
      const raw = await captureRaw(browser, shot);
      const headlineHtml = shot.headline.split('\n').join('<br/>');
      await composeFinal(browser, {
        rawBuffer: raw,
        headline: headlineHtml,
        accent: shot.accent,
        outFile: path.join(OUT_DIR, `${shot.name}.png`),
      });
    }

    await browser.close();
  } finally {
    if (server.pid) {
      try {
        process.kill(-server.pid, 'SIGTERM');
      } catch {
        // already gone
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
