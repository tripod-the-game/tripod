// Generates "creative" App Store screenshots — marketing graphics that sell
// the promise/feeling rather than literal captures of the app UI. These
// complement the authentic-UI screenshots from capture-screenshots.mjs.
// Pure HTML/SVG compositions, no live app needed.
//
// Usage: node scripts/generate-creative-screenshots.mjs
// Output: store/screenshots/en-US/5-hero-typography.png, 6-how-it-works.png, 7-celebrate.png

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'store/screenshots/en-US');
const EXECUTABLE_PATH = '/opt/pw-browsers/chromium';

const BG = '#141414';
const GREEN = '#4caf50';
const PURPLE = '#9c27b0';
const YELLOW = '#f9a825';
const CONFETTI_COLORS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#6c5ce7', '#fd79a8'];

const FONTS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&display=block" rel="stylesheet">`;

const RESET = `
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1290px; height: 2796px; background: ${BG}; position: relative; overflow: hidden; font-family: 'Baloo 2', sans-serif; }
</style>`;

function circle(cx, cy, r, fill, stroke = '#ffffff', strokeWidth = 8) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

function confettiPieces(count, seed = 1) {
  // Simple deterministic PRNG (mulberry32) so re-runs produce the same art.
  let s = seed;
  const rand = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let pieces = '';
  for (let i = 0; i < count; i++) {
    const x = rand() * 1290;
    const y = rand() * 2796;
    const w = 14 + rand() * 18;
    const h = w * (0.5 + rand() * 0.5);
    const rot = rand() * 360;
    const color = CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)];
    const shape = rand() > 0.5
      ? `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="3" fill="${color}"/>`
      : `<circle r="${w / 2.4}" fill="${color}"/>`;
    pieces += `<g transform="translate(${x},${y}) rotate(${rot})" opacity="${0.55 + rand() * 0.35}">${shape}</g>`;
  }
  return pieces;
}

// --- Slide 5: typographic hero, no device frame -----------------------------
function heroTypographyHtml() {
  const cx = 645;
  const markY = 1520;
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}${RESET}
  <style>
    h1 { position: absolute; top: 260px; left: 0; right: 0; text-align: center; color: #fff; font-size: 118px; font-weight: 800; line-height: 1.08; text-shadow: 0 6px 0 rgba(0,0,0,0.3); }
    h2 { position: absolute; top: 2150px; left: 0; right: 0; text-align: center; color: rgba(255,255,255,0.75); font-size: 52px; font-weight: 700; letter-spacing: 0.02em; }
  </style>
  </head><body>
    <h1>3 WORDS.<br/>ONE TRIANGLE.</h1>
    <svg width="1290" height="2796" style="position:absolute;top:0;left:0;">
      ${circle(cx, markY - 260, 190, GREEN)}
      ${circle(cx - 210, markY + 220, 190, PURPLE)}
      ${circle(cx + 210, markY + 220, 190, YELLOW)}
    </svg>
    <h2>A new puzzle every day</h2>
  </body></html>`;
}

// --- Slide 6: mechanic-as-infographic ---------------------------------------
function howItWorksHtml() {
  const panelX = 100;
  const panelW = 1090;
  const panelH = 785;
  const panelGap = 40;
  const topMargin = 300;

  function panel(index, y, circles, caption, stepColor) {
    const circleY = y + 260;
    const spacing = 190;
    const startX = panelX + panelW / 2 - (spacing * (circles.length - 1)) / 2;
    const circlesSvg = circles
      .map((fill, i) => circle(startX + i * spacing, circleY, 78, fill, '#ffffff', 6))
      .join('');
    return `
      <div style="position:absolute;top:${y}px;left:${panelX}px;width:${panelW}px;height:${panelH}px;background:#1c1c1c;border:2px solid rgba(255,255,255,0.08);border-radius:40px;">
        <div style="position:absolute;top:36px;left:36px;width:76px;height:76px;border-radius:50%;background:${stepColor};display:flex;align-items:center;justify-content:center;color:#fff;font-size:38px;font-weight:800;">${index}</div>
      </div>
      <svg width="1290" height="2796" style="position:absolute;top:0;left:0;">${circlesSvg}</svg>
      <div style="position:absolute;top:${y + 460}px;left:${panelX}px;width:${panelW}px;text-align:center;color:#fff;font-size:56px;font-weight:800;">${caption}</div>
    `;
  }

  const neutral = '#3a3a3a';
  const p1y = topMargin;
  const p2y = topMargin + panelH + panelGap;
  const p3y = topMargin + (panelH + panelGap) * 2;

  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}${RESET}
  <style>
    h1 { position: absolute; top: 110px; left: 0; right: 0; text-align: center; color: #fff; font-size: 84px; font-weight: 800; }
  </style>
  </head><body>
    <h1>HOW IT WORKS</h1>
    ${panel(1, p1y, [neutral, neutral, neutral, neutral], 'Type your guess', '#555555')}
    ${panel(2, p2y, [GREEN, PURPLE, YELLOW, neutral], 'Get instant color feedback', PURPLE)}
    ${panel(3, p3y, [GREEN, GREEN, GREEN, GREEN], 'Solve the triangle \u{1F3C6}', GREEN)}
  </body></html>`;
}

// --- Slide 7: abstract triangle + celebration --------------------------------
function celebrateHtml() {
  const cx = 645;
  const r = 95;
  const rowY = [650, 970, 1290, 1610, 1930];
  const rowOffsets = [[0], [-160, 160], [-320, 320], [-480, 480], [-480, -240, 0, 240, 480]];
  const cornerPositions = new Set(['0-0', '4-0', '4-4']); // apex, bottom-left, bottom-right
  const cornerColor = { '0-0': GREEN, '4-0': PURPLE, '4-4': YELLOW };

  let dots = '';
  rowOffsets.forEach((offsets, row) => {
    offsets.forEach((dx, i) => {
      const key = `${row}-${i}`;
      const fill = cornerPositions.has(key) ? cornerColor[key] : '#1c1c1c';
      dots += circle(cx + dx, rowY[row], r, fill, '#ffffff', 7);
    });
  });

  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}${RESET}
  <style>
    h1 { position: absolute; top: 130px; left: 0; right: 0; text-align: center; color: #fff; font-size: 96px; font-weight: 800; line-height: 1.12; text-shadow: 0 6px 0 rgba(0,0,0,0.3); }
  </style>
  </head><body>
    <svg width="1290" height="2796" style="position:absolute;top:0;left:0;">${confettiPieces(70, 7)}</svg>
    <h1>SOLVE IT. SHARE IT.<br/>KEEP YOUR STREAK.</h1>
    <svg width="1290" height="2796" style="position:absolute;top:0;left:0;">${dots}</svg>
  </body></html>`;
}

async function renderSlide(browser, html, outFile) {
  const context = await browser.newContext({ viewport: { width: 1290, height: 2796 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: outFile, animations: 'disabled' });
  await context.close();
  console.log(`wrote ${outFile}`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });

  await renderSlide(browser, heroTypographyHtml(), path.join(OUT_DIR, '5-hero-typography.png'));
  await renderSlide(browser, howItWorksHtml(), path.join(OUT_DIR, '6-how-it-works.png'));
  await renderSlide(browser, celebrateHtml(), path.join(OUT_DIR, '7-celebrate.png'));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
