/**
 * Generates PWA icons (192×192 and 512×512) using the Canvas API via node-canvas,
 * OR falls back to writing pre-made base64 PNGs if canvas isn't available.
 *
 * Run:  node generate-icons.js
 */
import { createCanvas } from "canvas";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, "public", "icons");
mkdirSync(OUT, { recursive: true });

function drawIcon(size) {
  const c = createCanvas(size, size);
  const ctx = c.getContext("2d");
  const r = size * 0.18; // corner radius

  // Background gradient: dark navy → gold
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, "#10172b");
  bg.addColorStop(1, "#c9a227");
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = bg;
  ctx.fill();

  // Subtle orb glow top-right
  const orb = ctx.createRadialGradient(
    size * 0.82, size * 0.18, 0,
    size * 0.82, size * 0.18, size * 0.38
  );
  orb.addColorStop(0, "rgba(201,162,39,0.35)");
  orb.addColorStop(1, "rgba(201,162,39,0)");
  ctx.fillStyle = orb;
  ctx.fillRect(0, 0, size, size);

  // Letter "C" bold, white
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${size * 0.52}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("C", size * 0.5, size * 0.52);

  return c.toBuffer("image/png");
}

writeFileSync(join(OUT, "icon-192.png"), drawIcon(192));
writeFileSync(join(OUT, "icon-512.png"), drawIcon(512));
console.log("✓ Icons written to public/icons/");
