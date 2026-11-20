// Pure helpers for the player-character pieces (no three.js, no DOM): unit-tested in tests/unit/pieces.test.ts.

/**
 * Do any two pieces' footprints overlap? Each is a circle (centre and radius, table units); `gap` is the space left between them.
 * Returns the first pair that is too close, or null.
 * @param {{ id: string, x: number, z: number, r: number }[]} items @param {number} [gap]
 * @returns {[string, string] | null}
 */
export function firstOverlap(items, gap = 0) {
  for (let i = 0; i < items.length; i++) for (let k = i + 1; k < items.length; k++) {
    const a = items[i], b = items[k];
    if (Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r + gap) return [a.id, b.id];
  }
  return null;
}

/**
 * Yaw (about the vertical, + turns +z toward +x, as three.js `rotation.y`) that makes something at `from` face `to`.
 * @param {{ x: number, z: number }} from @param {{ x: number, z: number }} to
 */
export const yawToward = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

/**
 * How far to bend a straight path from `from` to `to` sideways so it clears `blockers` (circles: x, z, r). The bend is a
 * half sine (zero at both ends, `offset` at the middle), so the offset needed at a blocker a fraction q along the path is
 * need / sin(pi q). Returns the world offset { x, z } at the middle of the path ({ 0, 0 } when nothing is in the way).
 * @param {{ x: number, z: number }} from @param {{ x: number, z: number }} to
 * @param {{ x: number, z: number, r: number }[]} blockers @param {number} [heroR] radius of the one moving @param {number} [margin] @param {number} [maxOff]
 */
export function swerveAround(from, to, blockers, heroR = 0.2, margin = 0.08, maxOff = 1.2) {
  const dx = to.x - from.x, dz = to.z - from.z, len = Math.hypot(dx, dz);
  if (len < 1e-6) return { x: 0, z: 0 };
  const ux = dx / len, uz = dz / len, nx = -uz, nz = ux;
  let best = 0, sign = 1;
  for (const b of blockers) {
    const rx = b.x - from.x, rz = b.z - from.z, t = rx * ux + rz * uz, s = rx * nx + rz * nz, R = b.r + heroR + margin;
    if (t < 0.05 || t > len - 0.05 || Math.abs(s) >= R) continue;
    const q = t / len, off = Math.min(maxOff, (R - Math.abs(s)) / Math.max(Math.sin(Math.PI * q), 0.35));
    if (off > best) { best = off; sign = s > 0 ? -1 : 1; }
  }
  return { x: nx * sign * best + 0, z: nz * sign * best + 0 };
}

/**
 * Where the hover card goes: centred on the piece (`x`), above its head (`top`) if it fits, else below its
 * base (`bottom`), always inside the viewport. Client pixels.
 * @param {{ x: number, top: number, bottom: number }} a @param {{ w: number, h: number }} size
 * @param {{ w: number, h: number }} view @param {number} [margin] @param {number} [gap]
 */
export function placeHover(a, size, view, margin = 8, gap = 12) {
  const left = Math.min(Math.max(a.x - size.w / 2, margin), Math.max(margin, view.w - size.w - margin));
  let top = a.top - gap - size.h, below = false;
  if (top < margin) { top = a.bottom + gap; below = true; }
  top = Math.min(Math.max(top, margin), Math.max(margin, view.h - size.h - margin));
  return { left, top, below };
}

/**
 * Which ray hit wins, a piece or a book: the nearer one. Either may be missing (null).
 * @param {number | null} piece distance @param {number | null} book distance
 * @returns {'piece' | 'book' | null}
 */
export function nearer(piece, book) {
  if (piece == null) return book == null ? null : 'book';
  if (book == null) return 'piece';
  return piece <= book ? 'piece' : 'book';
}
