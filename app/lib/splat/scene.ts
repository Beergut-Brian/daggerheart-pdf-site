/** Pure maths and geometry for the landing's pixel-art splat. No DOM, no GL: unit-tested. */

export interface SceneMeta {
  w: number; h: number; srcW: number; srcH: number;
  fire: [number, number]; fireDepth: number;
  palette: number[][];
}

export const CAMERA_DISTANCE = 1400;   // world units (photo pixels)
export const DEPTH_RANGE = 230;        // canopy top sits ~0.8 of this in front of the fire
export const MAX_YAW = 6.5;            // degrees
export const MAX_PITCH = 4.5;
export const MOTES = 80;
export const SPLAT_OVERLAP = 1.75;     // point size in buffer pixels at the fire's depth

export interface Points { pos: Float32Array; col: Uint8Array; count: number }

/** One hard-edged point per palette cell, placed by depth, plus dark "skirt" points down depth cliffs so tilting never shows cracks. */
export function buildPoints(s: SceneMeta, idx: Uint8Array, dep: Uint8Array, stride: number): Points {
  const { w: W, h: H, palette: pal } = s;
  const unit = s.srcW / W;
  const cell = unit * stride;
  const shade = pal.map((c, i) => {
    if (i === 0) return 0;
    const t = c.map((v) => v * 0.55);
    let bj = 0, bd = Infinity;
    pal.forEach((q, j) => { const d = (q[0] - t[0]) ** 2 + (q[1] - t[1]) ** 2 + (q[2] - t[2]) ** 2; if (d < bd) { bd = d; bj = j; } });
    return bj;
  });
  const zAt = (gx: number, gy: number) => Math.round(((dep[gy * W + gx] - s.fireDepth) / 63 * DEPTH_RANGE) / cell) * cell;
  const pos: number[] = [], col: number[] = [];
  const push = (x0: number, y0: number, z: number, ci: number) => {
    const k = (CAMERA_DISTANCE - z) / CAMERA_DISTANCE; // at rest every point projects where the photo had it
    pos.push(x0 * k, y0 * k, z);
    const c = pal[ci]; col.push(c[0], c[1], c[2], 255);
  };
  for (let gy = 0; gy < H; gy += stride) for (let gx = 0; gx < W; gx += stride) {
    const ci = idx[gy * W + gx];
    if (ci === 0) continue; // ground colour: left to the clear colour
    const x0 = (gx + stride / 2) * unit - s.fire[0] * unit;
    const y0 = -((gy + stride / 2) * unit - s.fire[1] * unit);
    const z = zAt(gx, gy);
    push(x0, y0, z, ci);
    let lo = z;
    if (gx >= stride) lo = Math.min(lo, zAt(gx - stride, gy));
    if (gx + stride < W) lo = Math.min(lo, zAt(gx + stride, gy));
    if (gy >= stride) lo = Math.min(lo, zAt(gx, gy - stride));
    if (gy + stride < H) lo = Math.min(lo, zAt(gx, gy + stride));
    const sc = shade[ci];
    if (!sc) continue;
    for (let n = 1, zz = z - cell; zz > lo && n <= 24; n++, zz -= cell) push(x0, y0, zz, n < 3 ? ci : sc);
  }
  return { pos: new Float32Array(pos), col: new Uint8Array(col), count: pos.length / 3 };
}

/** Row-major R = Ry(yaw) * Rx(pitch), degrees in. Uploaded as-is it is the column-major transpose R^T (world to view rotation). */
export function orbitRotation(yawDeg: number, pitchDeg: number): Float32Array {
  const a = yawDeg * Math.PI / 180, b = pitchDeg * Math.PI / 180;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  return new Float32Array([ca, sa * sb, sa * cb, 0, cb, -sb, -sa, ca * sb, ca * cb]);
}

/** Column-major asymmetric frustum (glFrustum). */
export function frustum(l: number, r: number, t: number, b: number, n: number, f: number): Float32Array {
  return new Float32Array([
    2 * n / (r - l), 0, 0, 0,
    0, 2 * n / (t - b), 0, 0,
    (r + l) / (r - l), (t + b) / (t - b), -(f + n) / (f - n), -1,
    0, 0, -2 * f * n / (f - n), 0,
  ]);
}

export interface Framing { stride: number; pxPerSplat: number; cw: number; ch: number; bufPerCell: number; proj: Float32Array }

/** Where the photo sits in the hero (same placement as the CSS still) and the buffer that makes one splat one pixel. */
export function frame(s: SceneMeta, heroW: number, heroH: number, vw: number, vh: number, mobile: boolean): Framing {
  const unit = s.srcW / s.w;
  let bx: number, by: number, bw: number, bh: number, py: number;
  if (mobile) { bx = 0; by = 0; bw = heroW; bh = Math.min(Math.max(vh - 392, 256), 600); py = 0.5; }
  else { bx = 0.1 * vw; by = -0.1 * heroH; bw = heroW - bx + 0.2 * vw; bh = heroH * 1.24; py = 0.52; }
  const sc = Math.max(bw / s.srcW, bh / s.srcH);
  const ix = bx + (bw - s.srcW * sc) * 0.5, iy = by + (bh - s.srcH * sc) * py;
  const fireX = ix + s.fire[0] * unit * sc, fireY = iy + s.fire[1] * unit * sc;
  const stride = mobile || sc * unit < 2.6 ? 2 : 1;
  const pxPerSplat = sc * unit * stride;
  const cw = Math.max(1, Math.round(heroW / pxPerSplat)), ch = Math.max(1, Math.round(heroH / pxPerSplat));
  const kx = cw / heroW, ky = ch / heroH;
  const n = 20, far = 6000, D = CAMERA_DISTANCE;
  const sx = sc * kx, sy = sc * ky, fxl = fireX * kx, fyl = fireY * ky;
  const proj = frustum(-fxl / sx * n / D, (cw - fxl) / sx * n / D, fyl / sy * n / D, -(ch - fyl) / sy * n / D, n, far);
  return { stride, pxPerSplat, cw, ch, bufPerCell: sc * unit * stride * kx, proj };
}
