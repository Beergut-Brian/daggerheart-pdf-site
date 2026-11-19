// Procedural textures: everything on the table is painted here at load time,
// so the page needs no image files.
import * as THREE from '../vendor/three.bundle.js';

export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// --- value noise -----------------------------------------------------------
function hash2(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 1274126177) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function smooth(t) { return t * t * (3 - 2 * t); }
export function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s);
  const c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
export function fbm(x, y, oct = 4, s = 0) {
  let v = 0, amp = 0.5, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) {
    v += vnoise(x * f, y * f, s + i * 17) * amp;
    tot += amp; amp *= 0.5; f *= 2.03;
  }
  return v / tot;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function mixRGB(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function sstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

function tex(canvas, { srgb = true, repeat = null, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// --- oak table top -----------------------------------------------------------
export function woodTextures(size = 1024) {
  const W = size, H = size;
  const col = makeCanvas(W, H), bmp = makeCanvas(W, H);
  const cc = col.getContext('2d'), bc = bmp.getContext('2d');
  const ci = cc.createImageData(W, H), bi = bc.createImageData(W, H);
  const planks = 5, ph = H / planks;
  const dark = [20, 11, 7], mid = [58, 33, 19], light = [98, 61, 36];
  const r = rng(7);
  const plankTone = [], plankOff = [];
  for (let i = 0; i < planks; i++) { plankTone.push(0.74 + r() * 0.42); plankOff.push(r() * 400); }
  for (let y = 0; y < H; y++) {
    const pi = Math.min(planks - 1, Math.floor(y / ph));
    const ly = (y - pi * ph) / ph;
    const gap = Math.min(ly, 1 - ly) * ph;      // px from plank edge
    for (let x = 0; x < W; x++) {
      const u = x + plankOff[pi];
      // long streaky grain
      const warp = fbm(u * 0.0035, y * 0.012 + pi * 9.1, 3, 11) * 2 - 1;
      const rings = Math.sin((y * 0.085 + warp * 9.0 + pi * 2.7) * Math.PI);
      const fine = fbm(u * 0.012, y * 0.55, 3, 23);
      const pores = vnoise(u * 0.09, y * 1.9, 31);
      let g = 0.5 + rings * 0.13 + (fine - 0.5) * 0.62 + warp * 0.12;
      g -= sstep(0.72, 0.95, pores) * 0.22;
      // cathedral knots, rare
      const kx = (u * 0.004) % 1, ky = ly;
      const kn = fbm(Math.floor(u * 0.004) + pi * 3.3, pi * 7.7, 1, 5);
      if (kn > 0.62) {
        const dx = (kx - 0.5) * 2.2, dy = (ky - 0.5 - (kn - 0.8)) * 5;
        const d = Math.sqrt(dx * dx + dy * dy);
        g += Math.sin(d * 16) * 0.16 * sstep(0.9, 0.1, d) - sstep(0.16, 0.0, d) * 0.5;
      }
      g = Math.min(1, Math.max(0, g));
      let c = g < 0.5 ? mixRGB(dark, mid, g * 2) : mixRGB(mid, light, (g - 0.5) * 2);
      const tone = plankTone[pi] * (0.92 + fbm(u * 0.002, y * 0.004, 2, 3) * 0.2);
      const gapShade = sstep(0, 3.5, gap);
      const k = tone * (0.35 + 0.65 * gapShade);
      const i = (y * W + x) * 4;
      ci.data[i] = c[0] * k; ci.data[i + 1] = c[1] * k; ci.data[i + 2] = c[2] * k; ci.data[i + 3] = 255;
      const b = (0.45 + g * 0.5) * (0.15 + 0.85 * gapShade) * 255;
      bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = b; bi.data[i + 3] = 255;
    }
  }
  cc.putImageData(ci, 0, 0); bc.putImageData(bi, 0, 0);
  // wear: a few pale rings and scratches so it reads as a used table
  cc.globalCompositeOperation = 'lighter';
  cc.strokeStyle = 'rgba(255,220,170,0.035)';
  for (let i = 0; i < 3; i++) {
    cc.lineWidth = 3 + r() * 2; cc.beginPath();
    cc.arc(r() * W, r() * H, 26 + r() * 16, 0, Math.PI * 2); cc.stroke();
  }
  cc.lineWidth = 1;
  for (let i = 0; i < 60; i++) {
    const x = r() * W, y = r() * H, l = 20 + r() * 90, a = (r() - 0.5) * 0.5;
    cc.strokeStyle = `rgba(255,225,190,${0.02 + r() * 0.04})`;
    cc.beginPath(); cc.moveTo(x, y); cc.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); cc.stroke();
  }
  cc.globalCompositeOperation = 'source-over';
  return { map: tex(col, { aniso: 16 }), bump: tex(bmp, { srgb: false, aniso: 4 }) };
}

// --- battle map: painted ground with a road and a 1-inch grid -------------------
export function battleMatTexture(W = 1536, H = 896) {
  const c = makeCanvas(W, H), g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const moss = [44, 62, 34], grass = [78, 98, 46], dry = [124, 116, 62];
  const dirt = [112, 84, 54], dirtL = [150, 120, 82], stone = [96, 98, 104], shade = [22, 30, 26];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      const n1 = fbm(u * 6, v * 3.6, 5, 41), n2 = fbm(u * 22, v * 13, 3, 53), n3 = fbm(u * 70, v * 42, 2, 67);
      let col = mixRGB(moss, grass, sstep(0.3, 0.62, n1));
      col = mixRGB(col, dry, sstep(0.55, 0.8, n2) * 0.55);
      // the road: wanders from front-left to the ruin at the back
      const road = 0.62 - 0.22 * Math.sin(u * 3.4 + 0.4) - 0.1 * Math.sin(u * 8.2);
      const rd = Math.abs(v - road) + (n2 - 0.5) * 0.09;
      const rw = sstep(0.11, 0.035, rd);
      col = mixRGB(col, mixRGB(dirt, dirtL, n2), rw * 0.95);
      // flagstone court under the ruin (back left)
      const cx = (u - 0.27) / 0.2, cy = (v - 0.3) / 0.26;
      const court = sstep(1.05, 0.8, Math.sqrt(cx * cx + cy * cy) + (n1 - 0.5) * 0.5);
      col = mixRGB(col, mixRGB(stone, [70, 72, 80], n2), court * 0.85);
      // pool of crystal light staining the ground (back right)
      const px = (u - 0.72) / 0.16, py = (v - 0.36) / 0.24;
      const pool = sstep(1.0, 0.2, Math.sqrt(px * px + py * py));
      col = mixRGB(col, [58, 96, 120], pool * 0.35);
      const k = 0.78 + n3 * 0.42;
      const edge = sstep(0, 0.035, Math.min(u, 1 - u)) * sstep(0, 0.05, Math.min(v, 1 - v));
      col = mixRGB(shade, col, 0.25 + 0.75 * edge);
      const i = (y * W + x) * 4;
      img.data[i] = col[0] * k; img.data[i + 1] = col[1] * k; img.data[i + 2] = col[2] * k; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // grid, one square per inch of play
  const cols = 24, rows = 14, cw = W / cols, rh = H / rows;
  g.strokeStyle = 'rgba(14,18,12,0.34)'; g.lineWidth = 1.6;
  g.beginPath();
  for (let i = 1; i < cols; i++) { g.moveTo(i * cw, 0); g.lineTo(i * cw, H); }
  for (let j = 1; j < rows; j++) { g.moveTo(0, j * rh); g.lineTo(W, j * rh); }
  g.stroke();
  g.strokeStyle = 'rgba(255,255,235,0.05)'; g.lineWidth = 1;
  g.beginPath();
  for (let i = 1; i < cols; i++) { g.moveTo(i * cw + 1.5, 0); g.lineTo(i * cw + 1.5, H); }
  for (let j = 1; j < rows; j++) { g.moveTo(0, j * rh + 1.5); g.lineTo(W, j * rh + 1.5); }
  g.stroke();
  // stitched border
  g.strokeStyle = 'rgba(8,8,10,0.85)'; g.lineWidth = 18; g.strokeRect(9, 9, W - 18, H - 18);
  g.strokeStyle = 'rgba(214,180,110,0.5)'; g.lineWidth = 1.5; g.setLineDash([9, 7]);
  g.strokeRect(13, 13, W - 26, H - 26); g.setLineDash([]);
  return tex(c, { aniso: 16 });
}

// --- page edges of a closed book ----------------------------------------------
export function pageEdgeTexture() {
  const c = makeCanvas(64, 256), g = c.getContext('2d');
  const r = rng(99);
  g.fillStyle = '#e9dfc6'; g.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y++) {
    const a = 0.05 + r() * 0.2;
    g.fillStyle = r() > 0.5 ? `rgba(120,96,60,${a})` : `rgba(255,252,240,${a})`;
    g.fillRect(0, y, 64, 1);
  }
  const t = tex(c, { aniso: 4 });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// --- soft round glow used for halos, bokeh and motes ----------------------------
export function glowTexture(size = 128, hard = 0) {
  const c = makeCanvas(size, size), g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(Math.max(0.01, hard), 'rgba(255,255,255,' + (hard ? 0.9 : 0.55) + ')');
  gr.addColorStop(hard ? Math.min(0.98, hard + 0.12) : 0.5, 'rgba(255,255,255,' + (hard ? 0.0 : 0.12) + ')');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return tex(c, { srgb: false, aniso: 1 });
}

// --- digits for dice faces: a 5 x 4 atlas of 1..20 -----------------------------------
export function diceAtlas(font = '900 86px Cinzel, Georgia, serif') {
  const cell = 128, c = makeCanvas(cell * 5, cell * 4), g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font; g.fillStyle = '#fff';
  for (let n = 1; n <= 20; n++) {
    const x = ((n - 1) % 5) * cell + cell / 2, y = Math.floor((n - 1) / 5) * cell + cell / 2;
    g.fillText(String(n), x, y + 6);
    if (n === 6 || n === 9) g.fillRect(x - 22, y + 46, 44, 6);
  }
  const t = tex(c, { srgb: false, aniso: 4 });
  return t;
}

// --- engraved numbers: the same 5 x 4 layout, as a cut into the resin ---------------------
// map: the ink (white, tinted by the material) with a dark groove wall along the top edge of
// each stroke, so the number reads as sunk into the face; bump: high face, low glyph, soft walls.
export function diceInkAtlas(font = '900 86px Cinzel, Georgia, serif') {
  const cell = 128, W = cell * 5, H = cell * 4;
  const map = makeCanvas(W, H), g = map.getContext('2d');
  const bump = makeCanvas(W, H), b = bump.getContext('2d');
  b.fillStyle = '#fff'; b.fillRect(0, 0, W, H);
  for (const c of [g, b]) { c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font; c.lineJoin = 'round'; }
  const glyph = (c, n, x, y, how) => {
    if (how === 'stroke') c.strokeText(String(n), x, y); else c.fillText(String(n), x, y);
    if (n === 6 || n === 9) { if (how === 'stroke') c.strokeRect(x - 22, y + 40, 44, 6); else c.fillRect(x - 22, y + 40, 44, 6); }
  };
  for (let n = 1; n <= 20; n++) {
    const x = ((n - 1) % 5) * cell + cell / 2, y = Math.floor((n - 1) / 5) * cell + cell / 2 + 6;
    // groove: a dark rim, heavier on the top edge (the wall in shadow)
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 7; glyph(g, n, x, y - 2, 'stroke');
    g.fillStyle = 'rgba(0,0,0,0.7)'; glyph(g, n, x, y - 3, 'fill');
    g.fillStyle = '#fff'; glyph(g, n, x, y + 1, 'fill');
    b.filter = 'blur(2px)'; b.fillStyle = '#000'; b.strokeStyle = '#555'; b.lineWidth = 5; glyph(b, n, x, y, 'stroke'); glyph(b, n, x, y, 'fill'); b.filter = 'none';
  }
  return { map: tex(map, { srgb: false, aniso: 4 }), bump: tex(bump, { srgb: false, aniso: 4 }) };
}

// --- a soft contact shadow under each die -------------------------------------------
export function contactShadowTexture(size = 64) {
  const c = makeCanvas(size, size), g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.75, 'rgba(255,255,255,0.15)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return tex(c, { srgb: false, aniso: 1 });
}

// --- wax: bright near the flame, cool at the foot (fake subsurface) -------------------
export function waxGlowTexture() {
  const c = makeCanvas(8, 128), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#ffd9a0'); gr.addColorStop(0.18, '#c8742c'); gr.addColorStop(0.5, '#3a1608'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 8, 128);
  return tex(c, { aniso: 1 });
}

// --- playing cards ---------------------------------------------------------------
export function cardBackTexture() {
  const W = 256, H = 356, c = makeCanvas(W, H), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, W, H);
  gr.addColorStop(0, '#141a45'); gr.addColorStop(1, '#0a0b24');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#c9a45a'; g.lineWidth = 3; g.strokeRect(12, 12, W - 24, H - 24);
  g.lineWidth = 1; g.strokeRect(18, 18, W - 36, H - 36);
  g.save(); g.beginPath(); g.rect(20, 20, W - 40, H - 40); g.clip();
  g.strokeStyle = 'rgba(201,164,90,0.28)';
  for (let i = -H; i < W + H; i += 22) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H, H); g.stroke();
    g.beginPath(); g.moveTo(i + H, 0); g.lineTo(i, H); g.stroke();
  }
  g.restore();
  g.fillStyle = '#0a0b24'; g.beginPath(); g.arc(W / 2, H / 2, 46, 0, 7); g.fill();
  g.strokeStyle = '#c9a45a'; g.lineWidth = 2; g.beginPath(); g.arc(W / 2, H / 2, 46, 0, 7); g.stroke();
  g.fillStyle = '#e7c77c'; g.beginPath();
  g.moveTo(W / 2, H / 2 - 30); g.lineTo(W / 2 + 18, H / 2); g.lineTo(W / 2, H / 2 + 30); g.lineTo(W / 2 - 18, H / 2); g.closePath(); g.fill();
  return tex(c, { aniso: 8 });
}

export function cardFaceTexture(i) {
  const hues = [['#7a1f2b', '#f0b35a'], ['#1d4c7a', '#9fd8ff'], ['#2f6b3c', '#d6f0a0'], ['#4a2a7a', '#d8b8ff'], ['#7a5a1d', '#ffe9a8']];
  const [dark, lite] = hues[i % hues.length];
  const W = 256, H = 356, c = makeCanvas(W, H), g = c.getContext('2d');
  const r = rng(300 + i);
  g.fillStyle = '#efe6cf'; g.fillRect(0, 0, W, H);
  // art window
  const gr = g.createLinearGradient(0, 20, 0, 190);
  gr.addColorStop(0, dark); gr.addColorStop(1, '#0c0c18');
  g.fillStyle = gr; g.fillRect(14, 14, W - 28, 176);
  g.globalAlpha = 0.9;
  for (let k = 0; k < 26; k++) {
    g.fillStyle = k % 3 ? lite : '#ffffff'; g.globalAlpha = 0.08 + r() * 0.22;
    const x = 30 + r() * (W - 60), y = 30 + r() * 140, s = 4 + r() * 34;
    g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.4, y); g.lineTo(x, y + s); g.lineTo(x - s * 0.4, y); g.closePath(); g.fill();
  }
  g.globalAlpha = 1;
  g.fillStyle = dark; g.fillRect(14, 196, W - 28, 30);
  g.fillStyle = '#f6edd8'; g.fillRect(40, 207, 120 + r() * 50, 8);
  g.fillStyle = 'rgba(40,30,20,0.55)';
  for (let k = 0; k < 6; k++) g.fillRect(24, 242 + k * 15, (W - 48) * (0.6 + r() * 0.4), 5);
  g.fillStyle = dark; g.beginPath(); g.arc(34, 34, 16, 0, 7); g.fill();
  g.strokeStyle = '#2a2318'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, W - 3, H - 3);
  return tex(c, { aniso: 8 });
}

// --- a faint line of "print" for the pages that riffle past ---------------------------
export function printedPageTexture(seed = 1) {
  const W = 256, H = 332, c = makeCanvas(W, H), g = c.getContext('2d');
  const r = rng(seed);
  const gr = g.createLinearGradient(0, 0, W, 0);
  gr.addColorStop(0, '#d9cba6'); gr.addColorStop(0.12, '#efe5c8'); gr.addColorStop(1, '#f3ead2');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(92,36,24,0.75)'; g.fillRect(26, 26, 90 + r() * 60, 9);
  g.fillStyle = 'rgba(40,32,24,0.42)';
  for (let col = 0; col < 2; col++) {
    for (let k = 0; k < 30; k++) {
      if (r() < 0.08) continue;
      g.fillRect(26 + col * 106, 50 + k * 9, 92 * (r() < 0.15 ? 0.5 + r() * 0.4 : 1), 3);
    }
  }
  return tex(c, { aniso: 4 });
}

// --- a wide, coreless glow for light spilling out of an open book ---------------------
export function softGlowTexture(size = 128) {
  const c = makeCanvas(size, size), g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.3)');
  gr.addColorStop(0.7, 'rgba(255,255,255,0.08)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return tex(c, { srgb: false, aniso: 1 });
}
