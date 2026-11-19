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

// ---- the step-up ramp: raises the ratio from measured frame times alone (no GPU timer needed; Chrome on macOS has none)
// After the opening, about once a second, one ~15% step toward the tier's cap. A step is judged on the median of the next
// 30 frames: over OVER_MS (or the display's refresh interval plus 12%, whichever is larger: a 60 Hz screen never shows
// under 16.7 ms, so "room" there means holding the refresh) and it is undone and the ratio before it becomes the ceiling.
export const ROOM_MS = 14, OVER_MS = 18, RAMP_FRAMES = 30, RAMP_GAP_S = 1, RAMP_SKIP = 3;
export const median = (a) => { const b = [...a].sort((x, y) => x - y), n = b.length; return n ? (n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2) : 0; };

// s: { ratio, cap, ceiling, probe (ratio before the last step, or null), frames (ms since that change), refresh (ms, display interval), since (s since the last change), gpu (ms, 0 = unknown) }
export function rampDecide(s) {
  if (s.frames.length < RAMP_FRAMES) return { action: 'none' };
  const m = median(s.frames.slice(-RAMP_FRAMES)), over = Math.max(OVER_MS, s.refresh * 1.12), room = Math.max(ROOM_MS, s.refresh * 1.05);
  if (s.probe != null) {
    if (m > over) return { action: 'undo', ratio: s.probe, ceiling: s.probe + 0.001 };   // a ceiling is the lowest ratio not to be used again (as in decide)
    return { action: 'keep' };
  }
  const top = Math.min(s.cap, s.ceiling - 0.001);
  if (m <= room && s.since >= RAMP_GAP_S && s.ratio < top - 0.01) {
    const next = Math.min(top, s.ratio * UP_STEP);
    if (s.gpu && s.gpu * Math.pow(next / s.ratio, COST_EXP) > SLOW_GPU_MS) return { action: 'none' };   // the timer, where there is one, says no
    return { action: 'up', ratio: next };
  }
  return { action: 'none' };
}

// The ramp's memory: feed it every frame's interval (ms) once the opening is over; it answers with what to do.
// reset() after any ratio change, whoever made it. `apply(ratio)` is the caller's; log gets [t s, ratio, why].
export function createRamp({ cap, getRatio, getCeiling, setCeiling, apply, gpu = () => 0, log = () => {} }) {
  let frames = [], hist = [], probe = null, sinceMs = 0, skip = RAMP_SKIP;
  const refresh = () => Math.max(6, Math.min(17.5, hist.length >= 20 ? [...hist].sort((a, b) => a - b)[Math.floor(hist.length * 0.1)] : 16.7));
  const reset = () => { frames = []; skip = RAMP_SKIP; sinceMs = 0; };
  return {
    reset,
    feed(ms, t = 0) {
      hist.push(ms); if (hist.length > 120) hist.shift();
      sinceMs += ms;
      if (skip > 0) { skip--; return; }
      frames.push(ms); if (frames.length > 90) frames.shift();
      const d = rampDecide({ ratio: getRatio(), cap: cap(), ceiling: getCeiling(), probe, frames, refresh: refresh(), since: sinceMs / 1000, gpu: gpu() });
      if (d.action === 'up') { probe = getRatio(); apply(d.ratio); log(t, d.ratio, 'up'); reset(); }
      else if (d.action === 'undo') { setCeiling(d.ceiling); probe = null; apply(d.ratio); log(t, d.ratio, 'undo: over, ceiling ' + d.ceiling.toFixed(3)); reset(); }
      else if (d.action === 'keep') { probe = null; }
    },
  };
}
