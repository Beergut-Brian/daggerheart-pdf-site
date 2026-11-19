// GM screen art: one picture across the three panels (left wing, centre, right wing).
// Pure maths, no DOM, so the host script (scripts/gm-screen.mjs) and the tests use it too.

// Panel widths in surface pixels, left to right, and their shared height. The
// centre is the 'screen' surface (SCREEN in surfaces.js); the wings are 640 x 760.
export const SCREEN_PANELS = [640, 1280, 640];
export const SCREEN_H = 760;
export const SCREEN_ASPECT = SCREEN_PANELS.reduce((a, b) => a + b, 0) / SCREEN_H;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// The largest rectangle of the source with the given aspect (cover, no stretch),
// centred on the focus point (0..1 across and down) and kept inside the image.
export function coverCrop(iw, ih, aspect = SCREEN_ASPECT, fx = 0.5, fy = 0.5) {
  let w = iw, h = iw / aspect;
  if (h > ih) { h = ih; w = ih * aspect; }
  const x = clamp(fx * iw - w / 2, 0, iw - w), y = clamp(fy * ih - h / 2, 0, ih - h);
  return { x, y, w, h };
}

// The three panels' slices of the source, split at the folds so they read as one picture.
export function panelSlices(iw, ih, fx = 0.5, fy = 0.5) {
  const c = coverCrop(iw, ih, SCREEN_ASPECT, fx, fy), total = SCREEN_PANELS.reduce((a, b) => a + b, 0);
  let x = c.x;
  return SCREEN_PANELS.map((pw) => {
    const w = c.w * (pw / total), s = { x, y: c.y, w, h: c.h }; x += w; return s;
  });
}

// Where a panel starts on the unfolded screen, in that panel's own pixels (panel height H): the
// picture's darkening and the gold frame are laid out once across all three and shifted by this.
export function panelOffset(panel, H = SCREEN_H) {
  const k = H / SCREEN_H;
  return { x: SCREEN_PANELS.slice(0, panel).reduce((a, b) => a + b, 0) * k, total: SCREEN_PANELS.reduce((a, b) => a + b, 0) * k, k };
}
