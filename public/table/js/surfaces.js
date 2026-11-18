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
import { hrefFor, ON_SITE } from './config.js';

const SERIF = 'Cinzel, "Trajan Pro", Georgia, serif';
const SANS = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';
const HAND = 'Caveat, "Segoe Script", "Bradley Hand", cursive';

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

export function paintScreen(g, W, H, { text = true } = {}) {
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

export function paintNote(g, W, H, { text = true } = {}) {
  const gr = g.createLinearGradient(0, 0, W, H);
  gr.addColorStop(0, '#f1e6c4'); gr.addColorStop(1, '#dccb9c');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  grain(g, W, H, 0.4, 'multiply');
  const eg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.72);
  eg.addColorStop(0, 'rgba(120,80,30,0)'); eg.addColorStop(1, 'rgba(110,70,24,0.4)');
  g.fillStyle = eg; g.fillRect(0, 0, W, H);
  if (!text) return;
  g.fillStyle = '#2a2140'; g.textAlign = 'left';
  g.font = `700 50px ${HAND}`;
  let y = 96;
  for (const l of ['Our table’s Daggerheart', 'books, searchable', 'on your phone.']) { g.fillText(l, 50, y); y += 62; }
  g.font = `600 36px ${HAND}`; g.fillStyle = '#7a3a2a';
  g.fillText('— pick one up & roll', 50, y + 40);
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
  el.append(h('p', 'gm-house', 'High Sodium Gaming'));
  const t = h('h1', 'gm-title');
  t.append(h('span', 'gm-a', 'Daggerheart'), h('span', 'gm-b', 'Resources'));
  el.append(t, h('i', 'gm-rule'), h('p', 'gm-tag', 'Our table’s books. Pick one up.'));
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

export const LOG_SIZE = [600, 240];
const LOG_ROW = 38, LOG_GAP = 2;
const LOG_TONE = { hope: '#e7c77c', fear: '#b99cff', critical: '#fff3d2', plain: '#efe8d6', hint: 'rgba(239,232,214,0.64)' };

export function paintLog(g, W, H, rows) {
  g.textBaseline = 'middle';
  let y = H - LOG_ROW;
  for (let i = rows.length - 1; i >= 0 && y >= 0; i--, y -= LOG_ROW + LOG_GAP) {
    const r = rows[i];
    if (r.alpha <= 0.01) continue;
    g.save(); g.globalAlpha = r.alpha;
    g.font = `700 17px ${SANS}`; const tw = g.measureText(r.text).width;
    g.font = `500 13px ${SANS}`; const dw = r.detail ? g.measureText(r.detail).width + 12 : 0;
    const pad = 16, w = Math.min(W - 4, tw + dw + pad * 2 + (r.tone === 'hint' ? 0 : 16)), x = (W - w) / 2;
    roundRect(g, x, y + 3, w, LOG_ROW - 6, 15);
    g.fillStyle = r.tone === 'critical' ? 'rgba(48,34,8,0.86)' : 'rgba(9,8,28,0.8)'; g.fill();
    g.lineWidth = 1; g.strokeStyle = r.tone === 'critical' ? 'rgba(255,214,130,0.85)' : r.tone === 'fear' ? 'rgba(185,156,255,0.42)' : 'rgba(231,199,124,0.34)'; g.stroke();
    let cx = x + pad;
    if (r.tone !== 'hint') { g.fillStyle = LOG_TONE[r.tone]; g.beginPath(); g.arc(cx + 4, y + LOG_ROW / 2, 4, 0, 7); g.fill(); cx += 16; }
    g.save(); g.beginPath(); g.rect(x, y, w - pad / 2, LOG_ROW); g.clip();
    g.font = `700 17px ${SANS}`; g.fillStyle = LOG_TONE[r.tone];
    if (r.tone === 'critical') { g.shadowColor = 'rgba(255,200,90,0.9)'; g.shadowBlur = 10; }
    g.fillText(r.text, cx, y + LOG_ROW / 2 + 1); g.shadowBlur = 0; cx += tw + 12;
    if (r.detail) { g.font = `500 13px ${SANS}`; g.fillStyle = 'rgba(239,232,214,0.64)'; g.fillText(r.detail, cx, y + LOG_ROW / 2 + 1); }
    g.restore(); g.restore();
  }
}

function buildLogEl(el, rows) {
  const [W, H] = LOG_SIZE;
  el.style.width = W + 'px'; el.style.height = H + 'px';
  for (const r of rows) {
    const row = h('p', 'lg-row lg-' + r.tone);
    row.style.opacity = r.alpha.toFixed(2);
    row.append(h('b', null, r.text));
    if (r.detail) row.append(h('span', null, r.detail));
    el.append(row);
  }
}

export function defineLogSurface(set, log) {
  return set.define({ id: 'log', cls: 'rolllog', size: LOG_SIZE, scale: 2, attrs: { 'aria-hidden': 'true' },
    paint: (g, W, H) => paintLog(g, W, H, log.rows), build: (el) => buildLogEl(el, log.rows) });
}

// ---------------------------------------------------------------- the set

function detect(gl) {
  if (/[#&]html=off/.test(location.hash)) return null;
  const proto = HTMLCanvasElement.prototype;
  const markup = 'content' in proto ? 'drawable' : 'layoutSubtree' in proto ? 'layoutsubtree' : null;
  const call = 'texElementSubImage2D' in gl ? 'sub' : 'texElementImage2D' in gl ? (gl.texElementImage2D.length === 3 ? 'tex3' : 'tex6') : null;
  const paint = 'requestPaint' in proto || 'onpaint' in proto;
  return markup && call && paint ? { markup, call } : null;
}

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
  }

  // def: { id, size:[w,h], paint(g,w,h,opts), build(el), tag, attrs }
  define(def) {
    const s = { ...def, texture: null, el: null, glTex: null, dirty: true, live: false, aw: 0, ah: 0, uploads: 0 };
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
        for (const s of this.list) { s.el.textContent = ''; s.el.style.backgroundImage = ''; if (s.plain) s.plain(s.el); }
      }
    }
    if (this.mode === 'canvas') this._startCanvas();
    document.documentElement.dataset.surfaces = this.mode;
    return this.mode;
  }

  _startCanvas() {
    for (const s of this.list) {
      const [W, H] = s.size, k = s.scale || 1;
      const c = makeCanvas(W * k, H * k), g = c.getContext('2d');
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
      s.glTex = gl.createTexture();
      this._bind(s);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 18, 40, 255]));
      const t = new THREE.ExternalTexture(s.glTex);
      // element snapshots arrive top row first; three expects the opposite
      t.repeat.set(1, -1); t.offset.set(0, 1);
      s.texture = t;
    }
    return new Promise((resolve, reject) => {
      let first = true;
      const timer = setTimeout(() => reject(new Error('no paint event')), 2500);
      this._onPaint = (ev) => {
        const changed = ev && ev.changedElements ? ev.changedElements : null;
        try {
          for (const s of this.list) {
            if (first || s.dirty || s.live || !changed || changed.includes(s.el)) { this._upload(s); s.dirty = false; }
          }
        } catch (e) { if (first) { clearTimeout(timer); reject(e); } return; }
        if (first) {
          first = false; clearTimeout(timer);
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
    if (call === 'sub') {
      // Chrome 155+: storage is allocated by the page, then filled
      let w = 0, hgt = 0;
      try { const im = this.canvas.captureElementImage(s.el); w = Math.ceil(im.width); hgt = Math.ceil(im.height); if (im.close) im.close(); } catch (e) { /* older shape */ }
      if (!w || !hgt) { const d = window.devicePixelRatio || 1; w = Math.ceil(s.el.offsetWidth * d); hgt = Math.ceil(s.el.offsetHeight * d); }
      if (w !== s.aw || hgt !== s.ah) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, w, hgt, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        s.aw = w; s.ah = hgt;
      }
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
    if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, this.maxAniso));
  }

  // Ask for a fresh snapshot (after a class change, or every frame while live).
  touch(id) {
    const s = this.byId[id];
    if (!s || this.mode !== 'html') return;
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
        const d = new DOMMatrix([e[0] * k, e[1] * k, e[2], e[3], e[4] * k, e[5] * k, e[6], e[7], e[8], e[9], e[10], e[11], e[12] * k, e[13] * k, e[14], e[15]]);
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
    const [W, H] = s.size, k = s.scale || 1, g = s.canvas2d.getContext('2d');
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

export function defineSurfaces(set, books, images) {
  for (const b of books) {
    const img = images[b.id] || null;
    const [cw, ch] = coverSize(b);
    const link = (el) => { el.textContent = 'Open ' + b.title + ', ' + b.pages + ' pages'; };
    set.define({
      id: 'cover-' + b.id, tag: 'a', cls: 'cover cover-' + b.id, size: [cw, ch],
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
  set.define({ id: 'note', cls: 'note', size: NOTE, attrs: { 'aria-hidden': 'true' }, paint: paintNote, build: buildNoteEl });
}

// Real cover art is only reachable when this page is served by the site itself.
export function loadCoverImages(books) {
  const out = {};
  if (!ON_SITE) return Promise.resolve(out);
  return Promise.all(books.map((b) => new Promise((res) => {
    if (!b.cover) return res();
    const im = new Image();
    im.onload = () => { out[b.id] = im; res(); };
    im.onerror = () => res();
    im.src = b.cover;
    setTimeout(res, 4000);
  }))).then(() => out);
}
