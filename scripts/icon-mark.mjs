// Shared SVG source for the Tripod brand mark used by the app icon, favicon,
// and share-card image. A single source keeps all of them visually
// consistent (the previous icon and favicon were two unrelated designs).
//
// Three bold circles in the game's real validation colors (green/purple/
// yellow) arranged in the triangle's three corners. No letterforms, no
// gradient - both hurt legibility once scaled down to a 29-40px home
// screen icon, which is the size that actually determines whether someone
// notices the app.

export const ICON_BG = '#141414';

export function buildIconSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}">
  <rect width="1024" height="1024" fill="${ICON_BG}"/>
  <circle cx="512" cy="322" r="176" fill="#4caf50" stroke="#ffffff" stroke-width="14"/>
  <circle cx="322" cy="706" r="176" fill="#9c27b0" stroke="#ffffff" stroke-width="14"/>
  <circle cx="702" cy="706" r="176" fill="#f9a825" stroke="#ffffff" stroke-width="14"/>
</svg>`;
}
