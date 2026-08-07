// One-off asset generator: rasterizes the Tripod brand mark (scripts/icon-mark.mjs)
// at every size the iOS asset catalog needs, plus the web favicon/share-card.
// Run manually with `node scripts/generate-icon.mjs` whenever the mark changes.
//
// Each size is rendered directly from the SVG at its exact target pixel
// dimensions (not downscaled from a single raster), so every icon stays crisp.

import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIconSvg } from './icon-mark.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Every unique pixel size referenced by ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json
const ICON_SIZES = [20, 29, 40, 50, 57, 58, 60, 72, 76, 80, 87, 100, 114, 120, 144, 152, 167, 180, 1024];
const APPICON_DIR = path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');

async function renderAt(page, size, outPath) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;padding:0;">${buildIconSvg(size)}</body></html>`);
  await page.screenshot({ path: outPath });
}

async function main() {
  mkdirSync(APPICON_DIR, { recursive: true });

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();

  for (const size of ICON_SIZES) {
    const outPath = path.join(APPICON_DIR, `${size}.png`);
    await renderAt(page, size, outPath);
    console.log(`wrote ${outPath}`);
  }

  // Web favicon + native-share card art: same mark, full 1024px master.
  await renderAt(page, 1024, path.join(ROOT, 'public/favicon.png'));
  await renderAt(page, 1024, path.join(ROOT, 'public/share-icon.png'));
  console.log('wrote public/favicon.png, public/share-icon.png');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
