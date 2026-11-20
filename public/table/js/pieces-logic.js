// Pure helpers for the player-character pieces (no three.js, no DOM): unit-tested in tests/unit/pieces.test.ts.

/**
 * Centres for a row of pieces `widths` wide with `gap` between neighbours, the whole row centred on `cx`.
 * @param {number[]} widths @param {number} gap @param {number} cx
 */
export function lineupX(widths, gap, cx) {
  const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, widths.length - 1);
  let x = cx - total / 2;
  return widths.map((w) => { const c = x + w / 2; x += w + gap; return c; });
}

/**
 * Splits `n` pieces into `rows` rows, back row first; a row at the back takes any extra one (8 in 2 rows: 4 and 4).
 * @param {number} n @param {number} rows
 */
export function rowSizes(n, rows) {
  const base = Math.floor(n / rows), extra = n % rows;
  return Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0));
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
