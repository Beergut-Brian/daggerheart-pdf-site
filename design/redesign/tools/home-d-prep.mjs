// Usage: node tools/home-d-prep.mjs   (deps in /tmp/hc-npm-d: sharp)
// Builds the pixel-art splat data for home-d from the SHARED inputs in ../home-c (read only):
//   color.jpg (900x504) + depth.png (900x504, nearer = brighter).
// Steps: downsample to a GW-wide grid, relight (fire glow + falloff into black + edge fade),
// k-means palette (fire colours and cool colours clustered separately, plus the page ground colour),
// 4x4 Bayer ordered dither, then pack palette indices + quantised depth as deflate+base64 in
// home-d/scene-data.js (a classic script, so it loads over file://) and write home-d/still.png.
import { createRequire } from 'module';
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire('/tmp/hc-npm-d/');
const sharp = require('sharp');

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(R, 'home-d');
const GW = +(process.env.GW || 450);          // grid width (cells); 900 px photo -> 2 px per cell
const K_COOL = +(process.env.K_COOL || 14);   // canopy / smoke / clearing shades
const K_FIRE = +(process.env.K_FIRE || 5);    // fire / ember shades (the glowing accent)
const DITHER = +(process.env.DITHER || 6);
const CLEAN = +(process.env.CLEAN ?? 2);       // isolated-pixel cleanup passes (flatter pixel-art fields)   // Bayer amplitude, 0-255 scale
const AMB = +(process.env.AMB || 0.8);        // ambient light away from the fire
const SAT = +(process.env.SAT || 1.35);       // saturation boost
const GAM = +(process.env.GAM || 0.85);       // gamma lift (<1 brightens shadows)
const DEPTHL = +(process.env.DEPTHL ?? 0.45);  // light by depth: nearer canopy brighter (voxel tops)
const WARM = +(process.env.WARM ?? 0.7), WARMR = +(process.env.WARMR || 0.05); // warm spill strength / radius
const FADE0 = +(process.env.FADE0 || 0.78), FADE1 = +(process.env.FADE1 || 1.1); // edge fade band

// page ground colour from the shared tokens, so dropped cells and the canvas clear match the page
const tokens = fs.readFileSync(path.join(R, 'shared/tokens.css'), 'utf8');
const bgHex = tokens.match(/--color-bg:\s*#([0-9a-f]{6})/i)[1];
const BG = [0, 2, 4].map((i) => parseInt(bgHex.slice(i, i + 2), 16));

const src = path.join(R, 'home-c');
const meta = await sharp(path.join(src, 'color.jpg')).metadata();
const GH = Math.round(GW * meta.height / meta.width);
const col = await sharp(path.join(src, 'color.jpg')).resize(GW, GH, { kernel: 'lanczos3' }).removeAlpha().raw().toBuffer();
const dep = await sharp(path.join(src, 'depth.png')).greyscale().resize(GW, GH, { kernel: 'cubic' }).raw().toBuffer();
const N = GW * GH;

// fire centre: centroid of the warmest-brightest cells
const score = [];
for (let i = 0; i < N; i++) score.push([col[i * 3] + col[i * 3 + 1] - 2 * col[i * 3 + 2], i]);
score.sort((a, b) => b[0] - a[0]);
let fx = 0, fy = 0; const top = score.slice(0, 40);
for (const [, i] of top) { fx += i % GW; fy += (i / GW) | 0; }
fx /= top.length; fy /= top.length;
console.log('grid', GW + 'x' + GH, 'fire cell', fx.toFixed(1), fy.toFixed(1));

// relight: photo * (ambient + fire glow), warm tint near the fire, fade to black toward the edges
const lin = new Float32Array(N * 3);
const isFire = new Uint8Array(N);
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
  const i = y * GW + x;
  let r = col[i * 3], g = col[i * 3 + 1], b = col[i * 3 + 2];
  const dx = (x - fx) / GW, dy = (y - fy) / GW;
  const rr = Math.sqrt(dx * dx + dy * dy);
  const glow = Math.exp(-((rr / 0.16) ** 2));             // pool of light around the fire
  const dn = dep[i] / 255;                                // 0 far .. 1 near
  // crown tops lit, floor darker; only on green canopy (not the blue smoke) and not in the fire's pool
  const green = Math.min(1, Math.max(0, (g - b) / 24 + 0.5)) * (1 - glow);
  const top = 1 + green * DEPTHL * (2 * Math.pow(dn, 1.1) - 0.6);
  const light = (AMB + 0.8 * glow) * top;
  // saturation + gamma lift so the canopy reads as teal-green pixel art, not murk
  const m = (r + g + b) / 3; r = m + (r - m) * SAT; g = m + (g - m) * SAT; b = m + (b - m) * SAT;
  r = 255 * Math.pow(Math.max(0, r) / 255, GAM); g = 255 * Math.pow(Math.max(0, g) / 255, GAM); b = 255 * Math.pow(Math.max(0, b) / 255, GAM);
  const warm = WARM * Math.exp(-((rr / WARMR) ** 2));              // warm spill on the clearing
  r = r * light * (1 + 0.45 * warm); g = g * light * (1 + 0.12 * warm); b = b * light * (1 - 0.25 * warm);
  // edge fade (ellipse around a point between fire and image centre), so orbit never shows the border
  const ex = (x / GW - 0.5) / 0.5, ey = (y / GH - 0.53) / 0.5;
  const e = Math.sqrt(ex * ex * 0.85 + ey * ey);
  const fade = 1 - sm(FADE0, FADE1, e);
  r *= fade; g *= fade; b *= fade;
  lin[i * 3] = Math.min(255, r); lin[i * 3 + 1] = Math.min(255, g); lin[i * 3 + 2] = Math.min(255, b);
  isFire[i] = (r > 110 && r > g * 1.15 && g > b * 1.25 && rr < 0.06) ? 1 : 0;
}

// k-means++ in a perceptual-ish space (sqrt gamma), deterministic seed
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const P = (v) => Math.sqrt(v / 255) * 255;
function kmeans(pts, k, iters = 24) {
  if (!pts.length) return [];
  const c = [pts[(rnd() * pts.length) | 0].slice()];
  while (c.length < k) {
    const d = pts.map((p) => Math.min(...c.map((q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2)));
    const tot = d.reduce((a, b) => a + b, 0); let t = rnd() * tot, j = 0;
    while (j < d.length - 1 && (t -= d[j]) > 0) j++;
    c.push(pts[j].slice());
  }
  for (let it = 0; it < iters; it++) {
    const s = c.map(() => [0, 0, 0, 0]);
    for (const p of pts) {
      let bj = 0, bd = Infinity;
      for (let j = 0; j < k; j++) { const d = (p[0] - c[j][0]) ** 2 + (p[1] - c[j][1]) ** 2 + (p[2] - c[j][2]) ** 2; if (d < bd) { bd = d; bj = j; } }
      s[bj][0] += p[0]; s[bj][1] += p[1]; s[bj][2] += p[2]; s[bj][3]++;
    }
    s.forEach((v, j) => { if (v[3]) c[j] = [v[0] / v[3], v[1] / v[3], v[2] / v[3]]; });
  }
  return c;
}
const coolPts = [], firePts = [];
for (let i = 0; i < N; i++) {
  const p = [P(lin[i * 3]), P(lin[i * 3 + 1]), P(lin[i * 3 + 2])];
  if (isFire[i]) firePts.push(p);
  else if (p[0] + p[1] + p[2] > 3 * P(BG[0]) + 18 && i % 3 === 0) coolPts.push(p); // skip near-black: the ground colour covers it
}
const unP = (v) => Math.round((v / 255) ** 2 * 255);
let palette = [BG.slice()];
for (const c of kmeans(coolPts, K_COOL)) palette.push(c.map(unP));
const fireC = kmeans(firePts, K_FIRE).map((c) => c.map(unP));
fireC.push([255, 236, 170]); // hottest core: one near-white yellow so the fire reads as the light source
for (const c of fireC) palette.push(c);
// sort: ground first, then by luminance (dark to bright) so indices read as a ramp
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
palette = [palette[0], ...palette.slice(1).sort((a, b) => lum(a) - lum(b))];
console.log('palette', palette.length, 'colours (cool', K_COOL, '+ fire', fireC.length, '+ ground)');

// ordered dither + nearest palette colour (in the same sqrt space)
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const PP = palette.map((c) => c.map(P));
const idx = new Uint8Array(N);
for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
  const i = y * GW + x;
  const t = (B4[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * DITHER;
  const p = [P(Math.max(0, Math.min(255, lin[i * 3] + t))), P(Math.max(0, Math.min(255, lin[i * 3 + 1] + t))), P(Math.max(0, Math.min(255, lin[i * 3 + 2] + t)))];
  let bj = 0, bd = Infinity;
  for (let j = 0; j < PP.length; j++) {
    const d = (p[0] - PP[j][0]) ** 2 + (p[1] - PP[j][1]) ** 2 + (p[2] - PP[j][2]) ** 2;
    if (d < bd) { bd = d; bj = j; }
  }
  idx[i] = bj;
}
// cleanup: a cell unlike all 4 neighbours takes the most common neighbour (hand-pixelled look, fewer specks)
for (let pass = 0; pass < CLEAN; pass++) {
  const src2 = idx.slice(); let fixed = 0;
  for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) {
    const i = y * GW + x, v = src2[i];
    const nb = [src2[i - 1], src2[i + 1], src2[i - GW], src2[i + GW]];
    if (nb.includes(v) || palette[v][0] > 200) continue; // keep fire highlights
    const cnt = {}; let best = nb[0];
    for (const n of nb) { cnt[n] = (cnt[n] || 0) + 1; if (cnt[n] > cnt[best]) best = n; }
    idx[i] = best; fixed++;
  }
  console.log('cleanup pass', pass + 1, 'fixed', fixed);
}
const hist = new Array(palette.length).fill(0); for (const v of idx) hist[v]++;
console.log('histogram', hist.join(' '));

// depth: 0-255, quantised to 64 levels (voxel terraces, and it packs smaller)
const dq = new Uint8Array(N);
for (let i = 0; i < N; i++) dq[i] = dep[i] >> 2;

const b64 = (u8) => zlib.deflateSync(Buffer.from(u8), { level: 9 }).toString('base64');
const data = {
  w: GW, h: GH, srcW: meta.width, srcH: meta.height,
  fire: [+fx.toFixed(2), +fy.toFixed(2)], fireDepth: dq[Math.round(fy) * GW + Math.round(fx)],
  palette: palette.map((c) => c.map((v) => Math.round(v))),
  idx: b64(idx), depth: b64(dq),
};
const js = '/* home-d scene data: generated by tools/home-d-prep.mjs from home-c/color.jpg + depth.png. ' +
  'idx = palette index per cell, depth = 0-63 (nearer = larger), both deflate + base64. */\n' +
  'window.HOME_D_SCENE=' + JSON.stringify(data) + ';\n';
fs.writeFileSync(path.join(OUT, 'scene-data.js'), js);

// still: the posterised grid at 1 px per cell (the page upscales it nearest-neighbour)
const rgb = Buffer.alloc(N * 3);
for (let i = 0; i < N; i++) { const c = palette[idx[i]]; rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2]; }
await sharp(rgb, { raw: { width: GW, height: GH, channels: 3 } }).png({ palette: true, colours: palette.length, dither: 0, compressionLevel: 9, effort: 10 }).toFile(path.join(OUT, 'still.png'));
// a 4x nearest preview for the polish log (not shipped)
await sharp(rgb, { raw: { width: GW, height: GH, channels: 3 } }).resize(GW * 4, GH * 4, { kernel: 'nearest' }).png().toFile('/tmp/home-d-still-4x.png');
console.log('scene-data.js', fs.statSync(path.join(OUT, 'scene-data.js')).size, 'B; still.png', fs.statSync(path.join(OUT, 'still.png')).size, 'B');
console.log('palette hex', palette.map((c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')).join(' '));
