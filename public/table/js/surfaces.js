// Surfaces: the flat things on the table that carry words (book covers, the
// open pages, the GM screen, the note).
//
// Each surface has two renderers:
//   html   - a real DOM element that lives inside the <canvas> and is drawn
//            into a texture with HTML-in-Canvas. Text is real text, CSS
//            animations keep running, links stay in the accessibility tree.
//   canvas - a 2D painting of the same design, for browsers without
//            HTML-in-Canvas (phones, Safari, Firefox).
import * as THREE from '../vendor/three.bundle.js';
import { makeCanvas, rng } from './textures.js';
import { hrefFor, ON_SITE, GM_SCREEN } from './config.js';
import { panelSlices, panelOffset } from './screen-art.js';

const SERIF = 'Cinzel, "Trajan Pro", Georgia, serif';
const SANS = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';
const HAND = 'Caveat, "Segoe Script", "Bradley Hand", cursive';
const BLOCK = '"HSG Title", "Cinzel Decorative", Cinzel, Georgia, serif';

// ---------------------------------------------------------------- helpers

function goldGradient(g, y0, y1) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, '#fff6cf'); gr.addColorStop(0.28, '#f0cc74'); gr.addColorStop(0.55, '#b98532');
  gr.addColorStop(0.72, '#f7dc92'); gr.addColorStop(1, '#a8742a');
  return gr;
}

function spaced(g, str, cx, y, spacing) {
  // centred text with letter spacing, without relying on ctx.letterSpacing
  const widths = [...str].map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (str.length - 1);
  let x = cx - total / 2;
  const align = g.textAlign; g.textAlign = 'left';
  [...str].forEach((ch, i) => { g.fillText(ch, x, y); x += widths[i] + spacing; });
  g.textAlign = align;
  return total;
}

function fitFont(g, str, weight, family, size, maxW, spacing = 0) {
  let s = size;
  for (;;) {
    g.font = `${weight} ${s}px ${family}`;
    const w = g.measureText(str).width + spacing * (str.length - 1);
    if (w <= maxW || s < 12) return s;
    s -= 2;
  }
}

function wrap(g, str, maxW) {
  const words = str.split(' '), lines = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

let grainCanvas = null;
function grain(g, W, H, alpha = 0.5, mode = 'overlay') {
  if (!grainCanvas) {
    grainCanvas = makeCanvas(192, 192);
    const c = grainCanvas.getContext('2d'), id = c.createImageData(192, 192), r = rng(5);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = 90 + r() * 110; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
    }
    c.putImageData(id, 0, 0);
  }
  g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = mode;
  g.fillStyle = g.createPattern(grainCanvas, 'repeat'); g.fillRect(0, 0, W, H); g.restore();
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function frame(g, W, H, inset, color = '#d9b565') {
  g.save(); g.strokeStyle = color; g.lineWidth = 4; roundRect(g, inset, inset, W - inset * 2, H - inset * 2, 10); g.stroke();
  g.lineWidth = 1.5; roundRect(g, inset + 12, inset + 12, W - inset * 2 - 24, H - inset * 2 - 24, 4); g.stroke();
  // corner studs
  g.fillStyle = color;
  for (const [x, y] of [[inset + 12, inset + 12], [W - inset - 12, inset + 12], [inset + 12, H - inset - 12], [W - inset - 12, H - inset - 12]]) {
    g.beginPath(); g.moveTo(x, y - 13); g.lineTo(x + 13, y); g.lineTo(x, y + 13); g.lineTo(x - 13, y); g.closePath(); g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- emblems (original art)

function emblemDaggerHeart(g, cx, cy, s) {
  g.save();
  // rays
  g.strokeStyle = 'rgba(243,207,122,0.22)'; g.lineWidth = 2;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2, r0 = s * 1.95, r1 = s * (i % 2 ? 2.35 : 2.75);
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
  }
  g.strokeStyle = '#d9b565'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, s * 1.9, 0, 7); g.stroke();
  g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, s * 1.78, 0, 7); g.stroke();
  // heart
  const hy = cy + s * 0.08;
  g.beginPath();
  g.moveTo(cx, hy + s * 0.98);
  g.bezierCurveTo(cx - s * 1.45, hy + s * 0.05, cx - s * 0.98, hy - s * 1.02, cx, hy - s * 0.36);
  g.bezierCurveTo(cx + s * 0.98, hy - s * 1.02, cx + s * 1.45, hy + s * 0.05, cx, hy + s * 0.98);
  g.closePath();
  const hg = g.createRadialGradient(cx - s * 0.3, hy - s * 0.3, s * 0.1, cx, hy, s * 1.3);
  hg.addColorStop(0, '#e2506a'); hg.addColorStop(0.55, '#9c1f3d'); hg.addColorStop(1, '#4a0b22');
  g.fillStyle = hg; g.fill();
  g.strokeStyle = goldGradient(g, hy - s, hy + s); g.lineWidth = 5; g.stroke();
  // dagger, point down
  const top = cy - s * 1.62, tip = cy + s * 1.62, guard = cy - s * 0.98;
  const bg = g.createLinearGradient(cx - s * 0.14, 0, cx + s * 0.14, 0);
  bg.addColorStop(0, '#8c95b4'); bg.addColorStop(0.48, '#f8faff'); bg.addColorStop(0.52, '#aeb6d0'); bg.addColorStop(1, '#e6eaf7');
  g.fillStyle = bg; g.beginPath();
  g.moveTo(cx - s * 0.13, guard); g.lineTo(cx + s * 0.13, guard); g.lineTo(cx + s * 0.1, tip - s * 0.5); g.lineTo(cx, tip); g.lineTo(cx - s * 0.1, tip - s * 0.5); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(20,24,50,0.55)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = goldGradient(g, top, guard + s * 0.1);
  roundRect(g, cx - s * 0.52, guard - s * 0.09, s * 1.04, s * 0.16, s * 0.07); g.fill();
  g.fillRect(cx - s * 0.065, top + s * 0.16, s * 0.13, guard - top - s * 0.2);
  g.beginPath(); g.arc(cx, top + s * 0.1, s * 0.13, 0, 7); g.fill();
  g.restore();
}

function emblemHopeFear(g, cx, cy, s) {
  g.save();
  const R = s * 1.5;
  // sun rays, left
  g.fillStyle = '#f0c35e';
  for (let i = 0; i < 9; i++) {
    const a = Math.PI / 2 + (i + 0.5) * (Math.PI / 9);
    const x0 = cx + Math.cos(a) * R * 1.12, y0 = cy + Math.sin(a) * R * 1.12;
    const x1 = cx + Math.cos(a) * R * (i % 2 ? 1.42 : 1.62), y1 = cy + Math.sin(a) * R * (i % 2 ? 1.42 : 1.62);
    const nx = -Math.sin(a) * R * 0.07, ny = Math.cos(a) * R * 0.07;
    g.beginPath(); g.moveTo(x0 + nx, y0 + ny); g.lineTo(x1, y1); g.lineTo(x0 - nx, y0 - ny); g.closePath(); g.fill();
  }
  // stars, right
  const r = rng(12); g.fillStyle = '#d9c8ff';
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI / 2 + r() * Math.PI, d = R * (1.15 + r() * 0.55), q = 1.5 + r() * 3.5;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    g.beginPath(); g.moveTo(x, y - q * 2); g.lineTo(x + q * 0.6, y); g.lineTo(x, y + q * 2); g.lineTo(x - q * 0.6, y); g.closePath(); g.fill();
  }
  // hope half
  g.beginPath(); g.arc(cx, cy, R, Math.PI / 2, Math.PI * 1.5); g.closePath();
  const sg = g.createRadialGradient(cx - R * 0.3, cy, R * 0.05, cx, cy, R);
  sg.addColorStop(0, '#fff3c0'); sg.addColorStop(0.5, '#f2b23c'); sg.addColorStop(1, '#b8651c');
  g.fillStyle = sg; g.fill();
  // fear half
  g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2); g.closePath();
  const mg = g.createRadialGradient(cx + R * 0.3, cy, R * 0.05, cx, cy, R);
  mg.addColorStop(0, '#8d5cf0'); mg.addColorStop(0.6, '#3d1c85'); mg.addColorStop(1, '#170838');
  g.fillStyle = mg; g.fill();
  // crescent on the fear side
  g.save(); g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2); g.closePath(); g.clip();
  g.fillStyle = '#e9dcff'; g.beginPath(); g.arc(cx + R * 0.42, cy, R * 0.36, 0, 7); g.fill();
  g.fillStyle = '#3d1c85'; g.beginPath(); g.arc(cx + R * 0.56, cy - R * 0.08, R * 0.32, 0, 7); g.fill();
  g.restore();
  g.strokeStyle = goldGradient(g, cy - R, cy + R); g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy - R * 1.28); g.lineTo(cx, cy + R * 1.28); g.stroke();
  g.fillStyle = '#f3d98e'; g.beginPath(); g.moveTo(cx, cy - R * 0.2); g.lineTo(cx + R * 0.1, cy); g.lineTo(cx, cy + R * 0.2); g.lineTo(cx - R * 0.1, cy); g.closePath(); g.fill();
  g.restore();
}

// ---------------------------------------------------------------- painters

export function coverSize(book) { const W = 768; return [W, Math.round(W / book.aspect)]; }

export function paintCover(g, W, H, book, { text = true, image = null } = {}) {
  if (image) {
    // real cover art: fill the board
    const s = Math.max(W / image.width, H / image.height);
    const w = image.width * s, h = image.height * s;
    g.drawImage(image, (W - w) / 2, (H - h) / 2, w, h);
    return;
  }
  const p = book.palette;
  const bg = g.createRadialGradient(W / 2, H * 0.44, W * 0.05, W / 2, H * 0.5, H * 0.75);
  bg.addColorStop(0, p.glow); bg.addColorStop(0.35, p.mid); bg.addColorStop(1, p.deep);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  grain(g, W, H, 0.55);
  // edge burn
  const eg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.78);
  eg.addColorStop(0, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = eg; g.fillRect(0, 0, W, H);
  frame(g, W, H, 30, p.foil);
  if (book.id === 'core') emblemDaggerHeart(g, W / 2, H * 0.505, W * 0.132);
  else emblemHopeFear(g, W / 2, H * 0.505, W * 0.128);
  if (!text) return;
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
  const k = book.kicker.toUpperCase();
  let s = fitFont(g, k, 900, SERIF, 92, W - 150, 4);
  g.fillStyle = goldGradient(g, H * 0.185 - s, H * 0.185);
  spaced(g, k, W / 2, H * 0.185, 4);
  const n = book.name.toUpperCase();
  s = fitFont(g, n, 700, SERIF, 54, W - 170, 6);
  g.fillStyle = goldGradient(g, H * 0.845 - s, H * 0.845);
  spaced(g, n, W / 2, H * 0.845, 6);
  g.shadowColor = 'transparent';
  g.font = `500 17px ${SANS}`; g.fillStyle = 'rgba(243,222,170,0.75)';
  spaced(g, 'HIGH SODIUM GAMING', W / 2, H * 0.905, 5);
}

export function paintSpine(g, W, H, book) {
  // drawn sideways: W is the long side
  const p = book.palette;
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, p.mid); gr.addColorStop(0.5, p.deep); gr.addColorStop(1, p.mid);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  grain(g, W, H, 0.5);
  g.fillStyle = p.foil; g.fillRect(24, 0, 4, H); g.fillRect(W - 28, 0, 4, H);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const str = (book.kicker + '  ·  ' + book.name).toUpperCase();
  const s = fitFont(g, str, 700, SERIF, Math.floor(H * 0.52), W - 110, 3);
  g.fillStyle = goldGradient(g, H / 2 - s / 2, H / 2 + s / 2);
  spaced(g, str, W / 2, H / 2 + 2, 3);
}

function paper(g, W, H, gutter) {
  const gr = g.createLinearGradient(0, 0, W, 0);
  if (gutter === 'left') { gr.addColorStop(0, '#a89468'); gr.addColorStop(0.07, '#e6d9b6'); gr.addColorStop(0.3, '#f3ead0'); gr.addColorStop(1, '#efe4c6'); }
  else { gr.addColorStop(0, '#efe4c6'); gr.addColorStop(0.7, '#f3ead0'); gr.addColorStop(0.93, '#e6d9b6'); gr.addColorStop(1, '#a89468'); }
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  grain(g, W, H, 0.35, 'multiply');
  const eg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
  eg.addColorStop(0, 'rgba(120,80,30,0)'); eg.addColorStop(1, 'rgba(120,80,30,0.22)');
  g.fillStyle = eg; g.fillRect(0, 0, W, H);
}

function flourish(g, cx, y, w, color) {
  g.save(); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 2;
  g.beginPath(); g.moveTo(cx - w / 2, y); g.lineTo(cx - 16, y); g.moveTo(cx + 16, y); g.lineTo(cx + w / 2, y); g.stroke();
  g.beginPath(); g.moveTo(cx, y - 9); g.lineTo(cx + 9, y); g.lineTo(cx, y + 9); g.lineTo(cx - 9, y); g.closePath(); g.fill();
  g.restore();
}

export const SPREAD = [640, 829];

// inside of the front cover: endpaper with a bookplate
export function paintSpreadLeft(g, W, H, book, { text = true } = {}) {
  const p = book.palette;
  g.fillStyle = p.deep; g.fillRect(0, 0, W, H);
  // endpaper lattice
  g.save(); g.strokeStyle = p.mid; g.lineWidth = 2;
  for (let i = -H; i < W + H; i += 44) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H, H); g.stroke();
    g.beginPath(); g.moveTo(i + H, 0); g.lineTo(i, H); g.stroke();
  }
  g.fillStyle = p.foil; g.globalAlpha = 0.5;
  for (let y = 22; y < H; y += 44) for (let x = (Math.round(y / 22) % 2 ? 0 : 22); x < W + 22; x += 44) {
    g.beginPath(); g.arc(x - (H % 44) / 2, y, 2.2, 0, 7); g.fill();
  }
  g.restore();
  grain(g, W, H, 0.45);
  const sh = g.createLinearGradient(0, 0, W, 0);
  sh.addColorStop(0, 'rgba(0,0,0,0.1)'); sh.addColorStop(0.8, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.6)');
  g.fillStyle = sh; g.fillRect(0, 0, W, H);
  // bookplate
  const bw = W * 0.6, bh = H * 0.32, bx = (W - bw) / 2, by = H * 0.32;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
  g.fillStyle = '#efe4c6'; roundRect(g, bx, by, bw, bh, 6); g.fill(); g.restore();
  g.strokeStyle = '#8a6a2e'; g.lineWidth = 2; roundRect(g, bx + 12, by + 12, bw - 24, bh - 24, 3); g.stroke();
  if (!text) return;
  g.textAlign = 'center'; g.fillStyle = '#5b4520';
  g.font = `italic 500 20px Georgia, serif`; g.fillText('from the table of', W / 2, by + bh * 0.3);
  g.fillStyle = '#2b2010'; g.font = `700 30px ${SERIF}`; spaced(g, 'HIGH SODIUM', W / 2, by + bh * 0.52, 3);
  spaced(g, 'GAMING', W / 2, by + bh * 0.52 + 38, 3);
  flourish(g, W / 2, by + bh * 0.82, bw * 0.5, '#8a6a2e');
}

// first page: the title page
export function paintSpreadRight(g, W, H, book, { text = true } = {}) {
  paper(g, W, H, 'left');
  g.strokeStyle = 'rgba(120,84,36,0.55)'; g.lineWidth = 2; g.strokeRect(46, 46, W - 92, H - 92);
  g.lineWidth = 1; g.strokeRect(54, 54, W - 108, H - 108);
  if (!text) return;
  g.textAlign = 'center';
  g.fillStyle = '#7a5a26'; g.font = `700 26px ${SERIF}`; spaced(g, book.kicker.toUpperCase(), W / 2, H * 0.2, 9);
  flourish(g, W / 2, H * 0.245, W * 0.42, '#9a7634');
  g.fillStyle = '#23180c';
  const words = book.name.toUpperCase().split(' ');
  const lines = words.length > 2 ? [words.slice(0, -1).join(' '), words[words.length - 1]] : words;
  let y = H * 0.37;
  for (const l of lines) { const s = fitFont(g, l, 900, SERIF, 84, W - 150, 2); spaced(g, l, W / 2, y, 2); y += s * 1.12; }
  g.font = `500 21px ${SANS}`; g.fillStyle = '#4a3a22';
  y = Math.max(y + 18, H * 0.6);
  for (const l of wrap(g, book.sub, W - 190)) { g.fillText(l, W / 2, y); y += 30; }
  g.font = `700 15px ${SANS}`; g.fillStyle = '#8a6a2e'; spaced(g, book.meta.toUpperCase(), W / 2, y + 26, 3);
  flourish(g, W / 2, H * 0.83, W * 0.3, '#9a7634');
  g.font = `italic 500 19px Georgia, serif`; g.fillStyle = '#6b5326';
  g.fillText(ON_SITE ? 'Opening the book…' : 'Turn the page to begin', W / 2, H * 0.885);
}

export const SCREEN = [1280, 760];

// ---- GM screen art (GM_SCREEN in config.js): one picture split across the three panels
let screenArt = null;
export function loadScreenArt() {
  if (!GM_SCREEN || !GM_SCREEN.image) return Promise.resolve(null);
  return new Promise((res) => {
    // a picture that arrives after the timeout is ignored, so all three panels always agree
    let late = false;
    const im = new Image();
    im.onload = () => { if (!late) { screenArt = im; res(im); } };
    im.onerror = () => res(null);
    im.src = GM_SCREEN.image;
    setTimeout(() => { late = true; res(screenArt); }, 4000);
  });
}
// panel 0 = left wing, 1 = centre, 2 = right wing. The picture, its darkening and the gold frame are
// laid out once over the unfolded screen and each panel shows its own slice, so all three meet at the folds.
function paintArt(g, W, H, panel) {
  const s = panelSlices(screenArt.naturalWidth, screenArt.naturalHeight, GM_SCREEN.focusX ?? 0.5, GM_SCREEN.focusY ?? 0.5)[panel];
  g.drawImage(screenArt, s.x, s.y, s.w, s.h, 0, 0, W, H);
  const { x: ox, total, k } = panelOffset(panel, H);
  g.save(); g.translate(-ox, 0);
  // a soft darkening toward the outer edges so the gold frame reads
  const v = g.createRadialGradient(total / 2, H / 2, H * 0.45, total / 2, H / 2, total * 0.55);
  v.addColorStop(0, 'rgba(5,4,18,0)'); v.addColorStop(1, 'rgba(5,4,18,0.45)');
  g.fillStyle = v; g.fillRect(ox, 0, W, H);
  frame(g, total, H, 34 * k, '#d9b565');
  g.restore();
}
// the title on the centre panel: one word per line, centred; fill is how much of the panel's width the longest line takes, lead is the line height in font sizes,
// margin is the clear space kept above the block beyond the gold frame and below it above the floor (px, at the panel's
// own size); floor is the part of the panel's height, from the bottom, that the battle map and its terrain hide at the
// default cameras (measured with scripts/title-probe.mjs: 0.21 at 1440, 0.08 on a tall phone, on the left columns);
// shared by the CSS (buildScreenEl sets --title-px, --title-top, --title-lead) and the painted twin
const TITLE = { lines: ['High', 'Sodium', 'Gaming'], fill: 0.84, lead: 0.9, margin: 30, floor: 0.22 };
const FRAME_W = 34;
const titleFont = (px) => `400 ${px}px ${BLOCK}`;
// size and placement of the block on a W x H panel: the smaller of the width fit (widest line = TITLE.fill of W) and
// the height fit (inked block between the frame plus margin and the floor plus margin), centred in that visible band by its
// inked top and bottom.
// px = font size; base = baseline of the first line; top = top of the CSS box whose line boxes land on the same baselines
function titleLayout(W, H) {
  const g = makeCanvas(8, 8).getContext('2d');
  g.font = titleFont(100);
  const m = TITLE.lines.map((l) => g.measureText(l.toUpperCase()));
  const widest = Math.max(...m.map((t) => t.width));
  const asc = Math.max(...m.map((t) => t.actualBoundingBoxAscent)) / 100;
  const desc = Math.max(...m.map((t) => t.actualBoundingBoxDescent)) / 100;
  const fa = m[0].fontBoundingBoxAscent / 100, fd = m[0].fontBoundingBoxDescent / 100;
  const n = TITLE.lines.length, gaps = (n - 1) * TITLE.lead;
  const byWidth = (W * TITLE.fill) / (widest / 100);
  const topEdge = FRAME_W + TITLE.margin, botEdge = H * (1 - TITLE.floor) - TITLE.margin;
  const byHeight = (botEdge - topEdge) / (gaps + asc + desc);
  const px = Math.floor(Math.min(byWidth, byHeight));
  const lead = px * TITLE.lead;
  const base = (topEdge + botEdge) / 2 - (((n - 1) * lead - asc * px + desc * px) / 2);
  const top = base - ((lead - (fa + fd) * px) / 2 + fa * px);
  return { px, lead, base, top, mid: (topEdge + botEdge) / 2, inkH: (gaps + asc + desc) * px };
}

export function paintScreen(g, W, H, { text = true } = {}) {
  if (screenArt) {
    paintArt(g, W, H, 1);
    // soft dark glow behind the title (not a box)
    const L = titleLayout(W, H);
    g.save(); g.translate(W / 2, L.mid); g.scale(1, Math.min(1, (L.inkH * 0.8) / (W * 0.5)));
    const gl = g.createRadialGradient(0, 0, 0, 0, 0, W * 0.5);
    gl.addColorStop(0, 'rgba(6,4,20,0.66)'); gl.addColorStop(0.6, 'rgba(6,4,20,0.42)'); gl.addColorStop(1, 'rgba(6,4,20,0)');
    g.fillStyle = gl; g.fillRect(-W / 2, -W * 0.5, W, W); g.restore();
    if (!text) return;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = titleFont(L.px); g.textBaseline = 'alphabetic';
    const line = (i) => L.base + i * L.lead;
    g.shadowColor = 'rgba(0,0,0,0.85)'; g.shadowBlur = 26; g.fillStyle = '#f3dc9a';
    TITLE.lines.forEach((l, i) => g.fillText(l.toUpperCase(), W / 2, line(i)));
    g.shadowBlur = 6; g.shadowOffsetY = 3;
    TITLE.lines.forEach((l, i) => g.fillText(l.toUpperCase(), W / 2, line(i)));
    g.shadowColor = 'transparent'; g.shadowOffsetY = 0;
    return;
  }
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#12123a'); bg.addColorStop(0.55, '#0b0a26'); bg.addColorStop(1, '#07061a');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const r = rng(77);
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(220,215,255,${0.08 + r() * 0.4})`;
    const s = r() * 1.8 + 0.4; g.fillRect(r() * W, r() * H * 0.9, s, s);
  }
  grain(g, W, H, 0.4);
  frame(g, W, H, 34, '#d9b565');
  if (!text) return;
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `500 24px ${SANS}`; g.fillStyle = 'rgba(232,214,170,0.8)';
  spaced(g, 'HIGH SODIUM GAMING', W / 2, H * 0.23, 10);
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
  let s = fitFont(g, 'DAGGERHEART', 900, SERIF, 170, W - 170, 4);
  g.fillStyle = goldGradient(g, H * 0.49 - s, H * 0.49);
  spaced(g, 'DAGGERHEART', W / 2, H * 0.49, 4);
  s = fitFont(g, 'RESOURCES', 700, SERIF, 96, W - 360, 26);
  g.fillStyle = goldGradient(g, H * 0.66 - s, H * 0.66);
  spaced(g, 'RESOURCES', W / 2, H * 0.66, 26);
  g.shadowColor = 'transparent';
  flourish(g, W / 2, H * 0.745, W * 0.34, '#d9b565');
  g.font = `italic 500 26px Georgia, serif`; g.fillStyle = 'rgba(232,214,170,0.78)';
  g.fillText('Our table’s books. Pick one up.', W / 2, H * 0.835);
}

export function paintWing(g, W, H, which) {
  if (screenArt) { paintArt(g, W, H, which === 'hope' ? 0 : 2); return; }
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#12123a'); bg.addColorStop(1, '#07061a');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  grain(g, W, H, 0.4);
  frame(g, W, H, 34, '#d9b565');
  const cx = W / 2, cy = H * 0.44, R = W * 0.2;
  g.save();
  if (which === 'hope') {
    g.fillStyle = '#f0c35e';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, r1 = R * (i % 2 ? 1.45 : 1.75);
      g.beginPath(); g.moveTo(cx + Math.cos(a - 0.07) * R * 1.12, cy + Math.sin(a - 0.07) * R * 1.12);
      g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a + 0.07) * R * 1.12, cy + Math.sin(a + 0.07) * R * 1.12); g.closePath(); g.fill();
    }
    const sg = g.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.05, cx, cy, R);
    sg.addColorStop(0, '#fff3c0'); sg.addColorStop(0.5, '#f2b23c'); sg.addColorStop(1, '#b8651c');
    g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  } else {
    const mg = g.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.05, cx, cy, R);
    mg.addColorStop(0, '#f1e8ff'); mg.addColorStop(0.6, '#a98cf0'); mg.addColorStop(1, '#4a2a9a');
    g.fillStyle = mg; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
    g.fillStyle = '#0d0c2c'; g.beginPath(); g.arc(cx + R * 0.42, cy - R * 0.16, R * 0.9, 0, 7); g.fill();
    const r = rng(8); g.fillStyle = '#d9c8ff';
    for (let i = 0; i < 12; i++) {
      const x = cx + (r() - 0.3) * R * 3, y = cy + (r() - 0.5) * R * 3, q = 2 + r() * 4;
      g.beginPath(); g.moveTo(x, y - q * 2); g.lineTo(x + q * 0.6, y); g.lineTo(x, y + q * 2); g.lineTo(x - q * 0.6, y); g.closePath(); g.fill();
    }
  }
  g.restore();
  g.textAlign = 'center';
  const word = which.toUpperCase();
  g.font = `900 78px ${SERIF}`; g.fillStyle = goldGradient(g, H * 0.82 - 70, H * 0.82);
  spaced(g, word, W / 2, H * 0.82, 22);
}

export const NOTE = [560, 400];

function paperBg(g, W, H) {
  const gr = g.createLinearGradient(0, 0, W, H);
  gr.addColorStop(0, '#f1e6c4'); gr.addColorStop(1, '#dccb9c');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  grain(g, W, H, 0.4, 'multiply');
  const eg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.72);
  eg.addColorStop(0, 'rgba(120,80,30,0)'); eg.addColorStop(1, 'rgba(110,70,24,0.4)');
  g.fillStyle = eg; g.fillRect(0, 0, W, H);
}

// The note with no character in config.js: the old hand-written line.
export function paintNote(g, W, H, { text = true } = {}) {
  paperBg(g, W, H);
  if (!text) return;
  g.fillStyle = '#2a2140'; g.textAlign = 'left';
  g.font = `700 50px ${HAND}`;
  let y = 96;
  for (const l of ['Our table’s Daggerheart', 'books, searchable', 'on your phone.']) { g.fillText(l, 50, y); y += 62; }
  g.font = `600 36px ${HAND}`; g.fillStyle = '#7a3a2a';
  g.fillText('— pick one up & roll', 50, y + 40);
}

// ---------------------------------------------------------------- the attack card
// The note becomes a character's attack card. One layout feeds the painter, the
// live-HTML rows and the raycast hit-test, so the three always agree.
// Ink colours match the --paper-* properties in index.html.
const PAPER = { ink: '#2a2140', dim: 'rgba(42,33,64,0.62)', red: '#7a3a2a', hot: 'rgba(122,58,42,0.13)', hotLine: 'rgba(122,58,42,0.5)', rule: 'rgba(42,33,64,0.28)' };
export const CARD = { x: 22, w: 516, top: 108, rowH: 68, gap: 6, bottom: 12, icon: 46, cols: { name: 18, trait: 222, damage: 342, icon: 456 } };

/** Row rectangles in card pixels. @param {number} n */
export function cardRows(n) {
  const step = Math.min(CARD.rowH, (NOTE[1] - CARD.top - CARD.bottom) / Math.max(1, n));
  return Array.from({ length: n }, (_, i) => ({ x: CARD.x, y: CARD.top + i * step, w: CARD.w, h: step - CARD.gap }));
}
/** Which row a card pixel is on, or -1. */
export function cardRowAt(n, px, py) {
  return cardRows(n).findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
}
export const cardIcon = (r) => ({ x: r.x + CARD.cols.icon, y: r.y + (r.h - CARD.icon) / 2, w: CARD.icon, h: CARD.icon });

// our own dice glyph: a d20 outline in a 24-unit box (SVG path, also drawn with Path2D)
export const D20_HEX = 'M12 1.5L21.5 7L21.5 17L12 22.5L2.5 17L2.5 7Z';
export const D20_PATH = D20_HEX + ' M12 7L17.6 16L6.4 16Z'
  + ' M12 7L12 1.5 M12 7L2.5 7 M12 7L21.5 7 M6.4 16L2.5 7 M6.4 16L2.5 17 M6.4 16L12 22.5 M17.6 16L21.5 7 M17.6 16L21.5 17 M17.6 16L12 22.5';

const signedMod = (m) => (m < 0 ? String(m) : '+' + m);

export function paintCard(g, W, H, ch, st, { text = true } = {}) {
  paperBg(g, W, H);
  if (!text) return;
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = PAPER.ink; fitFont(g, ch.name, 700, HAND, 46, 330);
  g.fillText(ch.name, 36, 64);
  g.fillStyle = PAPER.red; g.font = `700 14px ${SANS}`;
  const cls = ch.class.toUpperCase(), cw = g.measureText(cls).width + 2.2 * (cls.length - 1);
  spaced(g, cls, W - 36 - cw / 2, 62, 2.2);
  g.strokeStyle = PAPER.rule; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(30, 88); g.bezierCurveTo(W * 0.35, 84, W * 0.65, 92, W - 30, 87); g.stroke();
  const rows = cardRows(ch.attacks.length), glyph = new Path2D(D20_PATH);
  ch.attacks.forEach((a, i) => {
    const r = rows[i], hot = st && st.hot === i, mid = r.y + r.h / 2;
    if (hot) { roundRect(g, r.x, r.y, r.w, r.h, 12); g.fillStyle = PAPER.hot; g.fill(); g.strokeStyle = PAPER.hotLine; g.lineWidth = 1.5; g.stroke(); }
    else if (i < rows.length - 1) {
      g.save(); g.setLineDash([3, 5]); g.strokeStyle = PAPER.rule; g.lineWidth = 1;
      g.beginPath(); g.moveTo(r.x + 12, r.y + r.h + CARD.gap / 2); g.lineTo(r.x + r.w - 12, r.y + r.h + CARD.gap / 2); g.stroke(); g.restore();
    }
    g.fillStyle = PAPER.ink; fitFont(g, a.name, 700, SANS, 21, 196);
    g.fillText(a.name, r.x + CARD.cols.name, mid - 4);
    g.fillStyle = PAPER.dim; g.font = `500 13px ${SANS}`;
    g.fillText(a.range.toUpperCase(), r.x + CARD.cols.name, mid + 17);
    g.fillStyle = PAPER.ink; g.font = `600 16px ${SANS}`;
    g.fillText(`${a.trait} ${signedMod(a.mod)}`, r.x + CARD.cols.trait, mid + 6);
    g.font = `700 16px ${SANS}`; const dw = g.measureText(a.damage).width;
    g.fillText(a.damage, r.x + CARD.cols.damage, mid + 6);
    g.fillStyle = PAPER.red; g.font = `500 14px ${SANS}`;
    g.fillText(a.type, r.x + CARD.cols.damage + dw + 6, mid + 6);
    const ic = cardIcon(r), k = (ic.w - 10) / 24;
    g.save(); g.translate(ic.x + 5, ic.y + 5); g.scale(k, k);
    if (hot) { g.fillStyle = PAPER.hot; g.fill(new Path2D(D20_HEX)); }
    g.strokeStyle = hot ? PAPER.red : PAPER.ink; g.lineJoin = 'round'; g.lineCap = 'round';
    g.lineWidth = hot ? 1.5 : 1.15; g.stroke(glyph); g.restore();
  });
}

// ---------------------------------------------------------------- HTML builders

function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function bgFrom(painter, W, H) {
  const c = makeCanvas(W, H);
  painter(c.getContext('2d'), W, H);
  return `url(${c.toDataURL('image/jpeg', 0.9)})`;
}

function buildCoverEl(el, book, image) {
  const [W, H] = coverSize(book);
  el.style.width = W + 'px'; el.style.height = H + 'px';
  el.style.backgroundImage = bgFrom((g) => paintCover(g, W, H, book, { text: false, image }), W, H);
  el.classList.toggle('has-art', !!image);
  if (!image) {
    el.append(h('span', 'cv-kicker', book.kicker), h('span', 'cv-name', book.name), h('span', 'cv-house', 'High Sodium Gaming'));
  } else {
    el.append(h('span', 'sr', book.title));
  }
  el.append(h('i', 'cv-sheen'));
}

function buildLeftEl(el, book) {
  const [W, H] = SPREAD;
  el.style.width = W + 'px'; el.style.height = H + 'px';
  el.style.backgroundImage = bgFrom((g) => paintSpreadLeft(g, W, H, book, { text: false }), W, H);
  const plate = h('div', 'sp-plate');
  plate.append(h('em', null, 'from the table of'), h('strong', null, 'High Sodium Gaming'), h('i', 'sp-rule'));
  el.append(plate);
}

function buildRightEl(el, book) {
  const [W, H] = SPREAD;
  el.style.width = W + 'px'; el.style.height = H + 'px';
  el.style.backgroundImage = bgFrom((g) => paintSpreadRight(g, W, H, book, { text: false }), W, H);
  const wrapEl = h('div', 'sp-title');
  wrapEl.append(h('span', 'sp-kicker', book.kicker), h('i', 'sp-rule'));
  const name = h('h2', 'sp-name');
  let i = 0;
  book.name.split(' ').forEach((word) => {
    const w = h('span', 'w');
    [...word].forEach((ch) => { const s = h('span', null, ch); s.style.setProperty('--i', i++); w.append(s); });
    name.append(w, ' ');
  });
  wrapEl.append(name, h('p', 'sp-sub', book.sub), h('p', 'sp-meta', book.meta), h('i', 'sp-rule'),
    h('p', 'sp-go', ON_SITE ? 'Opening the book…' : 'Turn the page to begin'));
  el.append(wrapEl);
}

function buildScreenEl(el) {
  const [W, H] = SCREEN;
  el.style.width = W + 'px'; el.style.height = H + 'px';
  el.style.backgroundImage = bgFrom((g) => paintScreen(g, W, H, { text: false }), W, H);
  if (screenArt) {
    // the picture carries the screen: the house name in block capitals; the page's heading stays for assistive tech
    el.classList.add('has-art');
    const L = titleLayout(W, H);
    el.style.setProperty('--title-top', L.top + 'px');
    el.style.setProperty('--title-px', L.px + 'px');
    el.style.setProperty('--title-lead', TITLE.lead);
    const name = h('p', 'gm-name');
    name.append(...TITLE.lines.map((l) => h('span', null, l)));
    el.append(name, h('h1', 'sr', 'Daggerheart Resources'));
    return;
  }
  el.append(h('p', 'gm-house', 'High Sodium Gaming'));
  const t = h('h1', 'gm-title');
  t.append(h('span', 'gm-a', 'Daggerheart'), h('span', 'gm-b', 'Resources'));
  el.append(t, h('i', 'gm-rule'), h('p', 'gm-tag', 'Our table’s books. Pick one up.'));
}

const SVGNS = 'http://www.w3.org/2000/svg';
export function d20Svg() {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  const hex = document.createElementNS(SVGNS, 'path'); hex.setAttribute('class', 'd20-fill'); hex.setAttribute('d', D20_HEX);
  const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', D20_PATH);
  svg.append(hex, p);
  return svg;
}

/** One attack row's contents (card and phone sheet). */
export function attackRowParts(a, place = false) {
  const part = (cls, text, col) => { const e = h('span', cls, text); if (place) e.style.left = col + 'px'; return e; };
  const dmg = part('ct-d', a.damage + ' ', CARD.cols.damage); dmg.append(h('small', null, a.type));
  const icon = part('ct-i', null, CARD.cols.icon); icon.append(d20Svg());
  return [part('ct-n', a.name, CARD.cols.name), part('ct-r', a.range, CARD.cols.name), part('ct-t', `${a.trait} ${signedMod(a.mod)}`, CARD.cols.trait), dmg, icon];
}

function buildCardEl(el, ch, { bg = true } = {}) {
  const [W, H] = NOTE;
  el.style.width = W + 'px'; el.style.height = H + 'px';
  if (bg) el.style.backgroundImage = bgFrom((g) => paintCard(g, W, H, ch, null, { text: false }), W, H);
  el.append(h('h2', 'ct-name', ch.name), h('p', 'ct-class', ch.class), h('i', 'ct-rule'));
  cardRows(ch.attacks.length).forEach((r, i) => {
    const a = ch.attacks[i], b = h('button', 'ct-row');
    b.type = 'button'; b.dataset.attack = a.id; b.dataset.row = String(i);
    b.setAttribute('aria-label', `Roll ${a.name} attack`);
    Object.assign(b.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    b.append(...attackRowParts(a, true));
    el.append(b);
  });
}

function buildNoteEl(el) {
  const [W, H] = NOTE;
  el.style.width = W + 'px'; el.style.height = H + 'px';
  el.style.backgroundImage = bgFrom((g) => paintNote(g, W, H, { text: false }), W, H);
  el.append(h('p', 'nt-a', 'Our table’s Daggerheart books, searchable on your phone.'), h('p', 'nt-b', '— pick one up & roll'));
}

// ---------------------------------------------------------------- the roll log
// Screen-space, under the command bar's control. `log.rows` holds up to six
// { text, detail, tone: 'hope'|'fear'|'critical'|'plain'|'hint', alpha }, oldest first.
// Colours match the .rolllog rules in index.html.

export const LOG_SIZE = [460, 240];
const LOG_ROW = 38, LOG_GAP = 2;
const LOG_TONE = { hope: '#e7c77c', fear: '#b99cff', critical: '#fff3d2', plain: '#efe8d6', hint: 'rgba(239,232,214,0.64)' };

// layout: { anchor: 'top' | 'bottom', align: 'left' | 'center' } (set by js/command.js)
export function paintLog(g, W, H, rows, layout = {}) {
  g.textBaseline = 'middle';
  const top = layout.anchor === 'top', left = layout.align === 'left';
  let y = top ? 0 : H - LOG_ROW;
  for (let j = 0; j < rows.length && y >= 0 && y <= H - LOG_ROW; j++, y += top ? LOG_ROW + LOG_GAP : -(LOG_ROW + LOG_GAP)) {
    const r = rows[top ? j : rows.length - 1 - j];
    if (r.alpha <= 0.01) continue;
    g.save(); g.globalAlpha = r.alpha;
    g.font = `700 17px ${SANS}`; const tw = g.measureText(r.text).width;
    // the detail gives way first: it shrinks to 11px, then ends in an ellipsis, so the total always shows
    const pad = 16, room = W - 4 - tw - pad * 2 - (r.tone === 'hint' ? 0 : 16) - 12;
    let detail = r.detail || '', dsize = 13;
    g.font = `500 ${dsize}px ${SANS}`;
    if (detail && g.measureText(detail).width > room) { dsize = 11; g.font = `500 ${dsize}px ${SANS}`; }
    while (detail.length > 1 && g.measureText(detail).width > room) detail = detail.slice(0, -2) + '…';
    const dw = detail ? g.measureText(detail).width + 12 : 0;
    const w = Math.min(W - 4, tw + dw + pad * 2 + (r.tone === 'hint' ? 0 : 16)), x = left ? 2 : (W - w) / 2;
    roundRect(g, x, y + 3, w, LOG_ROW - 6, 15);
    g.fillStyle = r.tone === 'critical' ? 'rgba(48,34,8,0.86)' : 'rgba(9,8,28,0.8)'; g.fill();
    g.lineWidth = 1; g.strokeStyle = r.tone === 'critical' ? 'rgba(255,214,130,0.85)' : r.tone === 'fear' ? 'rgba(185,156,255,0.42)' : 'rgba(231,199,124,0.34)'; g.stroke();
    let cx = x + pad;
    if (r.tone !== 'hint') { g.fillStyle = LOG_TONE[r.tone]; g.beginPath(); g.arc(cx + 4, y + LOG_ROW / 2, 4, 0, 7); g.fill(); cx += 16; }
    g.save(); g.beginPath(); g.rect(x, y, w - pad / 2, LOG_ROW); g.clip();
    g.font = `700 17px ${SANS}`; g.fillStyle = LOG_TONE[r.tone];
    if (r.tone === 'critical') { g.shadowColor = 'rgba(255,200,90,0.9)'; g.shadowBlur = 10; }
    g.fillText(r.text, cx, y + LOG_ROW / 2 + 1); g.shadowBlur = 0; cx += tw + 12;
    if (detail) { g.font = `500 ${dsize}px ${SANS}`; g.fillStyle = 'rgba(239,232,214,0.64)'; g.fillText(detail, cx, y + LOG_ROW / 2 + 1); }
    g.restore(); g.restore();
  }
}

function buildLogEl(el, rows, layout = {}) {
  const [W, H] = LOG_SIZE;
  el.style.width = W + 'px'; el.style.height = H + 'px';
  el.classList.toggle('is-top', layout.anchor === 'top'); el.classList.toggle('is-left', layout.align === 'left');
  for (const r of rows) {
    const row = h('p', 'lg-row lg-' + r.tone);
    row.style.opacity = r.alpha.toFixed(2);
    row.append(h('b', null, r.text));
    if (r.detail) { row.append(h('span', null, r.detail)); if ((r.text + r.detail).length > 40) row.classList.add('is-long'); }
    el.append(row);
  }
}

export function defineLogSurface(set, log) {
  return set.define({ id: 'log', cls: 'rolllog', size: LOG_SIZE, scale: 2, attrs: { 'aria-hidden': 'true' },
    paint: (g, W, H) => paintLog(g, W, H, log.rows, log.layout), build: (el) => buildLogEl(el, log.rows, log.layout) });
}

// ---------------------------------------------------------------- the set

function detect(gl) {
  if (/[#&]html=off/.test(location.hash)) return null;
  const proto = HTMLCanvasElement.prototype;
  const markup = 'content' in proto ? 'drawable' : 'layoutSubtree' in proto ? 'layoutsubtree' : null;
  // texElementImage2D sizes the texture from the element's own snapshot, so storage and drawing
  // can never disagree; texElementSubImage2D (Chrome 155+) draws into storage the page allocates,
  // so it is only the fallback, and every upload re-allocates (see _upload) and is checked (see _probe)
  // (#html=sub forces the fallback, for testing it in a browser that has both)
  const sub = 'texElementSubImage2D' in gl, forceSub = sub && /[#&]html=sub/.test(location.hash);
  const call = !forceSub && 'texElementImage2D' in gl ? (gl.texElementImage2D.length === 3 ? 'tex3' : 'tex6') : sub ? 'sub' : null;
  const paint = 'requestPaint' in proto || 'onpaint' in proto;
  return markup && call && paint ? { markup, call } : null;
}

// Focus surfaces (the covers and the attack card) are made at a texel density of their own, not the canvas's:
// the screen's device pixel ratio, held so the long side stays within FOCUS_MAX texels. Everything else follows the canvas.
export const FOCUS_MAX = 2048;
export const focusDensity = (size, dpr = window.devicePixelRatio || 1) => Math.max(1, Math.min(dpr, FOCUS_MAX / Math.max(size[0], size[1])));

export class Surfaces {
  constructor(renderer) {
    this.renderer = renderer;
    this.gl = renderer.getContext();
    this.canvas = renderer.domElement;
    this.api = detect(this.gl);
    this.mode = this.api ? 'html' : 'canvas';
    this.list = [];
    this.byId = {};
    this.maxAniso = renderer.capabilities.getMaxAnisotropy();
    this.noFocus = /[#&]focus=off/.test(location.hash);   // test switch: focus surfaces follow the canvas's ratio as before
  }

  // def: { id, size:[w,h], paint(g,w,h,opts), build(el), tag, attrs }
  define(def) {
    const s = { ...def, zoom: 1, texture: null, el: null, glTex: null, dirty: true, live: false, aw: 0, ah: 0, uploads: 0 };
    const el = document.createElement(def.tag || 'div');
    el.id = 'surf-' + def.id;
    el.className = 'surf ' + (def.cls || '');
    el.setAttribute('drawable', '');
    for (const k in def.attrs || {}) el.setAttribute(k, def.attrs[k]);
    s.el = el;
    this.list.push(s); this.byId[def.id] = s;
    return s;
  }

  get(id) { return this.byId[id]; }

  // Builds every surface, tries the live-HTML path and quietly falls back.
  async ready() {
    for (const s of this.list) {
      if (this.mode === 'html') s.build(s.el);
      else if (s.plain) s.plain(s.el);       // keep links and headings for assistive tech
      this.canvas.appendChild(s.el);
    }
    if (this.mode === 'html') {
      try { await this._startHtml(); } catch (e) {
        console.warn('[table] HTML-in-Canvas path failed, using painted textures:', e);
        this.mode = 'canvas';
        if (this._onPaint) this.canvas.removeEventListener('paint', this._onPaint);
        for (const s of this.list) { s.el.textContent = ''; s.el.style.backgroundImage = ''; s.el.classList.remove('surf-probe'); if (s.plain) s.plain(s.el); }
      }
    }
    if (this.mode === 'canvas') this._startCanvas();
    document.documentElement.dataset.surfaces = this.mode;
    return this.mode;
  }

  _startCanvas() {
    for (const s of this.list) {
      const [W, H] = s.size, k = s.k = s.focus ? focusDensity(s.size) : s.scale || 1;
      const c = makeCanvas(Math.round(W * k), Math.round(H * k)), g = c.getContext('2d');
      g.scale(k, k);
      s.paint(g, W, H, { text: true });
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.maxAniso;
      s.texture = t; s.canvas2d = c;
    }
  }

  _startHtml() {
    const gl = this.gl, canvas = this.canvas;
    for (const s of this.list) {
      this._zoom(s);
      s.glTex = gl.createTexture();
      this._bind(s);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 18, 40, 255]));
      const t = new THREE.ExternalTexture(s.glTex);
      // element snapshots arrive top row first; three expects the opposite
      t.repeat.set(1, -1); t.offset.set(0, 1);
      s.texture = t;
    }
    // start-up runs in two paints: the first with a marker on every surface's bottom-right edge
    // (.surf-probe), checked in the texture (_probe), the second without it, which is what shows
    for (const s of this.list) s.el.classList.add('surf-probe');
    return new Promise((resolve, reject) => {
      let step = 0;
      const timer = setTimeout(() => reject(new Error('no paint event')), 4000);
      this._onPaint = (ev) => {
        const changed = ev && ev.changedElements ? ev.changedElements : null;
        try {
          for (const s of this.list) {
            if (step < 2 || s.dirty || s.live || (!changed && !s.focus) || (changed && changed.includes(s.el))) {   // a focus surface is never retaken just because the canvas repainted this._upload(s); s.dirty = false; }
          }
          if (step === 0) {
            const bad = this.list.filter((s) => !this._probe(s));
            if (bad.length) throw new Error('texture does not match its element: ' + bad.map((s) => s.id).join(', '));
            for (const s of this.list) s.el.classList.remove('surf-probe');
            step = 1;
            if (canvas.requestPaint) canvas.requestPaint();
            return;
          }
        } catch (e) { if (step < 2) { clearTimeout(timer); reject(e); } return; }
        if (step === 1) {
          step = 2; clearTimeout(timer);
          const err = gl.getError();
          if (err) reject(new Error('GL error ' + err)); else resolve();
        }
      };
      canvas.addEventListener('paint', this._onPaint);
      if (canvas.requestPaint) canvas.requestPaint();
    });
  }

  _bind(s) {
    const gl = this.gl, st = this.renderer.state;
    st.activeTexture(gl.TEXTURE0);
    st.bindTexture(gl.TEXTURE_2D, s.glTex, gl.TEXTURE0);
  }

  _upload(s) {
    const gl = this.gl, st = this.renderer.state, call = this.api.call;
    this._bind(s);
    st.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    st.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    // one size for storage and drawing: the element's snapshot, measured now (it follows the
    // canvas's pixel ratio, which changes on resize and when the frame rate steps quality down)
    const [w, hgt] = this.snapSize(s);
    s.aw = w; s.ah = hgt;
    if (call === 'sub') {
      // fresh storage on every upload: nothing from an earlier snapshot (another size) can show through
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, w, hgt, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, s.el);
    } else if (call === 'tex3') {
      gl.texElementImage2D(gl.TEXTURE_2D, gl.SRGB8_ALPHA8, s.el);
    } else {
      gl.texElementImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, s.el);
    }
    s.uploads++;
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const ext = this.renderer.extensions.get('EXT_texture_filter_anisotropic');
    if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, s.focus ? this.maxAniso : Math.min(8, this.maxAniso));
  }

  // A focus surface's snapshot is its CSS box times the canvas's pixel ratio, so its element is zoomed by
  // (wanted density / ratio): the texture comes out at the wanted density whatever the canvas's ratio is now.
  // Set at start, on a window resize and when the surface changes anyway (touch); a ratio step alone never
  // changes it, so it never retakes a focus surface.
  _zoom(s) {
    if (!s.focus || this.noFocus) return;
    const k = this.canvas.width / Math.max(1, this.canvas.clientWidth);
    const z = +(focusDensity(s.size) / k).toFixed(3);
    if (Math.abs(z - s.zoom) > 0.005) { s.zoom = z; s.el.style.zoom = z === 1 ? '' : String(z); }
  }

  // The element's snapshot size in texels: what the browser reports, else its CSS box at the canvas's pixel ratio.
  snapSize(s) {
    let w = 0, hgt = 0;
    if (this.canvas.captureElementImage) {
      try { const im = this.canvas.captureElementImage(s.el); w = Math.ceil(im.width); hgt = Math.ceil(im.height); if (im.close) im.close(); } catch (e) { /* older shape */ }
    }
    if (!w || !hgt) { const k = this.canvas.width / Math.max(1, this.canvas.clientWidth); w = Math.ceil(s.size[0] * s.zoom * k); hgt = Math.ceil(s.size[1] * s.zoom * k); }
    return [w, hgt];
  }

  // Reads texels back from a surface's texture (rows top first), or null. For the start-up check and #debug=surfaces.
  readTexels(s, x, y, w, hgt) {
    const gl = this.gl;
    if (!s.glTex) return null;
    const fb = gl.createFramebuffer(), px = new Uint8Array(w * hgt * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, s.glTex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    if (ok) gl.readPixels(x, y, w, hgt, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb);
    this.renderer.resetState();
    return ok ? px : null;
  }

  // The marker (.surf-probe) sits on the element's right and bottom edges. It has to be at the
  // texture's bottom-right corner: drawn smaller leaves the corner empty, drawn larger clips it off.
  _probe(s) {
    const px = this.readTexels(s, Math.max(0, s.aw - 2), Math.max(0, s.ah - 2), 1, 1);
    return !!px && px[0] > 180 && px[1] < 90 && px[2] > 180;
  }

  // After the canvas's pixel ratio changes, every snapshot is retaken at the new size.
  // focus: false leaves the focus surfaces alone (their size does not depend on the ratio)
  refresh({ focus = true } = {}) {
    if (this.mode !== 'html') return;
    for (const s of this.list) { if (focus || !s.focus) { if (focus) this._zoom(s); s.dirty = true; } }
    if (this.canvas.requestPaint) this.canvas.requestPaint();
  }

  // Ask for a fresh snapshot (after a class change, or every frame while live).
  touch(id) {
    const s = this.byId[id];
    if (!s || this.mode !== 'html') return;
    this._zoom(s);
    s.dirty = true;
    if (this.canvas.requestPaint) this.canvas.requestPaint();
  }

  setLive(id, on) {
    const s = this.byId[id];
    if (!s || this.mode !== 'html') return;
    s.live = on; if (on) this.touch(id);
  }

  // Best effort: tell the browser where a drawn element sits on screen, so focus
  // rings, find-in-page and assistive tech line up with the 3D object. `m` maps
  // the element's own pixels to canvas CSS pixels (a THREE.Matrix4).
  place(id, m) {
    const s = this.byId[id];
    if (!s || this.mode !== 'html') return;
    try {
      const e = m.elements;
      const key = Array.from(e, (v) => v.toFixed(3)).join();
      if (key === s.placed) return;
      s.placed = key;
      if (this.canvas.updateElementGeometry) {
        const k = this.canvas.width / Math.max(1, this.canvas.clientWidth);
        const z = 1 / s.zoom, d = new DOMMatrix([e[0] * k * z, e[1] * k * z, e[2], e[3], e[4] * k * z, e[5] * k * z, e[6], e[7], e[8], e[9], e[10], e[11], e[12] * k, e[13] * k, e[14], e[15]]);
        this.canvas.updateElementGeometry(s.el, { canvasTransform: d });
      } else {
        // older builds: a CSS transform does the same job, but it also counts as a
        // repaint, so only pay for it while the keyboard is on the element
        if (document.activeElement !== s.el) return;
        s.el.style.transformOrigin = '0 0';
        s.el.style.transform = 'matrix3d(' + Array.from(e).map((v) => +v.toFixed(6)).join(',') + ')';
      }
    } catch (err) { this.place = () => {}; }
  }

  // Redraw a surface whose content changed (the roll log): rebuild its element on
  // the live path, or repaint its 2D canvas on the painted one.
  repaint(id) {
    const s = this.byId[id];
    if (!s) return;
    if (this.mode === 'html') { s.el.textContent = ''; s.build(s.el); this.touch(id); return; }
    if (!s.canvas2d) return;
    const [W, H] = s.size, k = s.k || s.scale || 1, g = s.canvas2d.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, W, H);
    s.paint(g, W, H, { text: true });
    s.texture.needsUpdate = true;
  }

  // Called once per frame: keeps animated surfaces flowing.
  tick() {
    if (this.mode !== 'html') return;
    for (const s of this.list) if (s.live) { if (this.canvas.requestPaint) this.canvas.requestPaint(); break; }
  }
}

// ---------------------------------------------------------------- definitions

export function defineSurfaces(set, books, images, { character = null, cardState = null } = {}) {
  for (const b of books) {
    const img = images[b.id] || null;
    const [cw, ch] = coverSize(b);
    const link = (el) => { el.textContent = 'Open ' + b.title + ', ' + b.pages + ' pages'; };
    set.define({
      id: 'cover-' + b.id, focus: true, tag: 'a', cls: 'cover cover-' + b.id, size: [cw, ch],
      attrs: { href: hrefFor(b), 'aria-label': 'Open ' + b.title + ', ' + b.pages + ' pages', 'data-book': b.id, ...(ON_SITE ? {} : { target: '_blank', rel: 'noopener' }) },
      paint: (g, W, H, o) => paintCover(g, W, H, b, { ...o, image: img }),
      build: (el) => buildCoverEl(el, b, img),
      plain: link,
    });
    set.define({ id: 'left-' + b.id, cls: 'spread spread-left book-' + b.id, size: SPREAD, attrs: { 'aria-hidden': 'true' },
      paint: (g, W, H, o) => paintSpreadLeft(g, W, H, b, o), build: (el) => buildLeftEl(el, b) });
    set.define({ id: 'right-' + b.id, cls: 'spread spread-right book-' + b.id, size: SPREAD, attrs: { 'aria-hidden': 'true' },
      paint: (g, W, H, o) => paintSpreadRight(g, W, H, b, o), build: (el) => buildRightEl(el, b) });
  }
  set.define({ id: 'screen', cls: 'gm', size: SCREEN, paint: paintScreen, build: buildScreenEl,
    plain: (el) => { el.append(h('h1', null, 'Daggerheart Resources')); } });
  if (character) {
    // the attack card: real buttons in the canvas (keyboard, assistive tech, HTML-in-Canvas)
    set.define({ id: 'note', focus: true, cls: 'note card', size: NOTE, attrs: { role: 'group', 'aria-label': `${character.name}'s attacks` },
      paint: (g, W, H, o) => paintCard(g, W, H, character, cardState, o),
      build: (el) => buildCardEl(el, character), plain: (el) => buildCardEl(el, character, { bg: false }) });
  } else {
    set.define({ id: 'note', cls: 'note', size: NOTE, attrs: { 'aria-hidden': 'true' }, paint: paintNote, build: buildNoteEl });
  }
}

// Real cover art is only reachable when this page is served by the site itself.
export function loadCoverImages(books) {
  const out = {};
  if (!ON_SITE) return Promise.resolve(out);
  return Promise.all(books.map((b) => new Promise((res) => {
    if (!b.cover) return res();
    const im = new Image(); im.fetchPriority = 'high'; im.decoding = 'async';
    im.onload = () => { out[b.id] = im; res(); };
    im.onerror = () => res();
    im.src = b.cover;
    setTimeout(res, 4000);
  }))).then(() => out);
}
