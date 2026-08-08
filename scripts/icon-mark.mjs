// Shared SVG source for the Tripod brand mark used by the app icon, favicon,
// and share-card image. A single source keeps all of them visually
// consistent.
//
// A single bold rounded triangle (apex up) on the brand green, with a soft
// drop shadow for lift and a subtle two-tone split down the middle for a
// faceted, dimensional look - a plain flat triangle on a flat color reads
// as a generic play/caution glyph rather than something recognizably
// Tripod, so the shadow + facet are what make it read as a placed badge.

export const ICON_BG = '#4caf50';

const APEX = { x: 512, y: 250 };
const BASE_L = { x: 210, y: 780 };
const BASE_R = { x: 814, y: 780 };
const STROKE_W = 66; // rounds the corners via stroke-linejoin, no bezier math needed

function trianglePath() {
  return `M ${APEX.x} ${APEX.y} L ${BASE_R.x} ${BASE_R.y} L ${BASE_L.x} ${BASE_L.y} Z`;
}

export function buildIconSvg(size) {
  const path = trianglePath();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}">
  <defs>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="16"/>
    </filter>
    <clipPath id="leftHalf"><rect x="0" y="0" width="512" height="1024"/></clipPath>
    <clipPath id="rightHalf"><rect x="512" y="0" width="512" height="1024"/></clipPath>
  </defs>
  <rect width="1024" height="1024" fill="${ICON_BG}"/>
  <path d="${path}" transform="translate(0,24)" fill="#000000" opacity="0.24"
        stroke="#000000" stroke-width="${STROKE_W}" stroke-linejoin="round" filter="url(#shadow)"/>
  <g clip-path="url(#leftHalf)">
    <path d="${path}" fill="#ffffff" stroke="#ffffff" stroke-width="${STROKE_W}" stroke-linejoin="round"/>
  </g>
  <g clip-path="url(#rightHalf)">
    <path d="${path}" fill="#e9ede9" stroke="#e9ede9" stroke-width="${STROKE_W}" stroke-linejoin="round"/>
  </g>
</svg>`;
}
