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
