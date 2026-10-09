/**
 * Pure Node.js PNG icon generator — zero dependencies.
 * Writes valid 192×192 and 512×512 PNG files for the PWA manifest.
 *
 * Run:  node generate-icons-png.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, "public", "icons");
mkdirSync(OUT, { recursive: true });

// ── minimal PNG encoder ──────────────────────────────────────────────────────
function crc32(buf) {
  let c = 0xffffffff;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let k = n;
    for (let j = 0; j < 8; j++) k = k & 1 ? 0xedb88320 ^ (k >>> 1) : k >>> 1;
    t[n] = k;
  }
  for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type);
  const body = Buffer.concat([typeB, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(pixels, w, h) {
  // pixels: Uint8Array of RGBA, row-major
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(w * 4 + 1);
    row[0] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      row[1 + x * 4 + 0] = pixels[i];
      row[1 + x * 4 + 1] = pixels[i + 1];
      row[1 + x * 4 + 2] = pixels[i + 2];
      row[1 + x * 4 + 3] = pixels[i + 3];
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── draw the icon ────────────────────────────────────────────────────────────
function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4);

  // Parse hex colour
  const hexRgb = (h) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];

  const [r1, g1, b1] = hexRgb("#10172b"); // dark navy
  const [r2, g2, b2] = hexRgb("#c9a227"); // gold
  const cornerR = Math.round(size * 0.18);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Rounded-corner mask
      const dx = Math.max(0, Math.max(cornerR - x, x - (size - 1 - cornerR)));
      const dy = Math.max(0, Math.max(cornerR - y, y - (size - 1 - cornerR)));
      if (dx * dx + dy * dy > cornerR * cornerR) {
        pixels[i + 3] = 0; // transparent
        continue;
      }

      // Linear gradient: top-left → bottom-right
      const t = (x + y) / (2 * (size - 1));
      let r = Math.round(r1 + (r2 - r1) * t);
      let g = Math.round(g1 + (g2 - g1) * t);
      let b = Math.round(b1 + (b2 - b1) * t);

      // Radial orb glow at top-right ~(82%, 18%)
      const ox = size * 0.82, oy = size * 0.18, orbR = size * 0.38;
      const dist = Math.sqrt((x - ox) ** 2 + (y - oy) ** 2);
      const orbA = Math.max(0, 1 - dist / orbR) * 0.35;
      r = Math.min(255, Math.round(r + (201 - r) * orbA));
      g = Math.min(255, Math.round(g + (162 - g) * orbA));
      b = Math.min(255, Math.round(b + (39  - b) * orbA));

      pixels[i]     = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = 255;
    }
  }

  // Draw "C" letter using a rasterised glyph approach:
  // We'll approximate the letter with filled rectangles (bitmap font style)
  const s = size;
  const cx = Math.round(s * 0.5);  // centre x
  const cy = Math.round(s * 0.5);  // centre y
  const lh = Math.round(s * 0.46); // letter height
  const lw = Math.round(s * 0.34); // letter width
  const sw = Math.round(s * 0.10); // stroke width

  // C shape: three bars (top, left, bottom) with a gap on the right
  const bars = [
    // top bar
    { x: cx - lw / 2, y: cy - lh / 2, w: lw * 0.85, h: sw },
    // left bar
    { x: cx - lw / 2, y: cy - lh / 2, w: sw, h: lh },
    // bottom bar
    { x: cx - lw / 2, y: cy + lh / 2 - sw, w: lw * 0.85, h: sw },
  ];

  for (const bar of bars) {
    for (let y = Math.round(bar.y); y < Math.round(bar.y + bar.h); y++) {
      for (let x = Math.round(bar.x); x < Math.round(bar.x + bar.w); x++) {
        if (x < 0 || x >= s || y < 0 || y >= s) continue;
        const i = (y * s + x) * 4;
        if (pixels[i + 3] === 0) continue; // outside rounded corners
        pixels[i]     = 255;
        pixels[i + 1] = 255;
        pixels[i + 2] = 255;
        pixels[i + 3] = 255;
      }
    }
  }

  return encodePng(pixels, size, size);
}

writeFileSync(join(OUT, "icon-192.png"), drawIcon(192));
writeFileSync(join(OUT, "icon-512.png"), drawIcon(512));
console.log("✓ Icons written to public/icons/icon-192.png and icon-512.png");
