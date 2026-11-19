// The render's pixel ratio: where it starts and how the frame-rate guard moves it. Pure, unit-tested
// (tests/unit/table-quality.test.ts); main.js feeds it the frame times and applies what it says.
export const START_PX = 3.8e6;      // pixels a canvas starts with (a 2560x1440 window starts at 1.0, not the 1.25 cap)
export const RATIO_MIN = 0.6;
export const SLOW_FRAME_S = 0.024, SLOW_GPU_MS = 13, UP_GPU_MS = 10, UP_STEP = 1.15, COST_EXP = 2.4;

// the ratio a w x h (CSS px) canvas starts at: the tier's cap, lowered so the buffer holds about START_PX pixels
export function startRatio(w, h, cap, startPx = START_PX, min = RATIO_MIN) {
  return Math.max(min, Math.min(cap, Math.sqrt(startPx / Math.max(1, w * h))));
}

// One decision from a window of frames. s: { ratio, ceiling, level, avg (s per frame), gpu (ms, 0 = unknown), cap, stable (up allowed) }
// Slow: lower the ratio by the overrun (8% to 30%) and remember the ratio above as the ceiling; at the floor, soften
// then drop the depth of field (level 1, 2). Room: one 15% step up when the GPU timer says the next step costs under UP_GPU_MS.
export function decide(s) {
  if (s.avg > SLOW_FRAME_S || s.gpu > SLOW_GPU_MS) {
    const over = Math.max(s.avg / 0.0167, s.gpu / 8);
    if (s.ratio > RATIO_MIN + 0.01) return { action: 'down', ratio: Math.max(RATIO_MIN, s.ratio * Math.max(0.7, Math.min(0.92, 1 / Math.sqrt(over)))), ceiling: Math.min(s.ceiling, s.ratio) };
    if (s.level < 2) return { action: 'level', level: s.level + 1 };
    return { action: 'none' };
  }
  if (s.gpu && s.level === 0 && s.stable) {
    const next = Math.min(s.cap, s.ratio * UP_STEP, s.ceiling - 0.001);
    if (next > s.ratio + 0.02 && s.gpu * Math.pow(next / s.ratio, COST_EXP) < UP_GPU_MS) return { action: 'up', ratio: next };
  }
  return { action: 'none' };
}
