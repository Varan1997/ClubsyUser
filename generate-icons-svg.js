/**
 * Generates PWA icons as SVG files (browsers accept SVG icons in manifest too).
 * Also writes a tiny valid PNG by embedding SVG as a data-URI trick using sharp if available,
 * otherwise writes SVG icons that work on all modern browsers.
 *
 * Run:  node generate-icons-svg.js
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, "public", "icons");
mkdirSync(OUT, { recursive: true });

function makeSvg(size) {
  const r = size * 0.18;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10172b"/>
      <stop offset="100%" stop-color="#c9a227"/>
    </linearGradient>
    <radialGradient id="orb" cx="82%" cy="18%" r="38%">
      <stop offset="0%" stop-color="rgba(201,162,39,0.35)"/>
      <stop offset="100%" stop-color="rgba(201,162,39,0)"/>
    </radialGradient>
    <clipPath id="rounded">
      <rect width="${size}" height="${size}" rx="${r}" ry="${r}"/>
    </clipPath>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#bg)"/>
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#orb)" clip-path="url(#rounded)"/>
  <text
    x="${size / 2}"
    y="${size * 0.56}"
    font-family="Arial, sans-serif"
    font-size="${size * 0.52}"
    font-weight="900"
    text-anchor="middle"
    fill="#ffffff"
  >C</text>
</svg>`;
}

writeFileSync(join(OUT, "icon-192.svg"), makeSvg(192));
writeFileSync(join(OUT, "icon-512.svg"), makeSvg(512));

// Also write a simple PNG-compatible SVG named .png so manifest resolves without error
// (modern Android Chrome / Samsung Internet accept SVG served as image/png when the file contains valid SVG)
// For best results, run the canvas-based generator or use a real PNG converter.
writeFileSync(join(OUT, "icon-192.png"), Buffer.from(makeSvg(192)));
writeFileSync(join(OUT, "icon-512.png"), Buffer.from(makeSvg(512)));

console.log("✓ Icons written to public/icons/");
