import { describe, expect, it } from "vitest";
import { decide, startRatio, RATIO_MIN } from "../../public/table/js/quality.js";

const base = { ratio: 1, ceiling: Infinity, level: 0, avg: 0.0167, gpu: 0, cap: 1.25, stable: true };

describe("startRatio", () => {
  it("starts a 5K-class window at 1.0, below its 1.25 cap", () => {
    const r = startRatio(2560, 1440, 1.25);
    expect(r).toBeGreaterThan(0.99);
    expect(r).toBeLessThan(1.02);
  });
  it("leaves a small canvas at the tier cap", () => {
    expect(startRatio(1000, 600, 1.75)).toBe(1.75);
    expect(startRatio(390, 844, 1.5)).toBe(1.5);
  });
  it("never goes under the floor", () => {
    expect(startRatio(8000, 6000, 1.25)).toBe(RATIO_MIN);
  });
});

describe("decide", () => {
  it("does nothing at a steady 60 fps with no timer", () => {
    expect(decide(base)).toEqual({ action: "none" });
  });
  it("steps down at once on 15 fps, by the overrun, and remembers the ceiling", () => {
    const d = decide({ ...base, ratio: 1.25, avg: 0.065 });
    expect(d.action).toBe("down");
    expect(d.ratio).toBeLessThan(1.25 * 0.93);
    expect(d.ratio).toBeGreaterThanOrEqual(1.25 * 0.7);
    expect(d.ceiling).toBe(1.25);
  });
  it("steps down on GPU time even when the frame rate is held by vsync", () => {
    expect(decide({ ...base, gpu: 15 }).action).toBe("down");
  });
  it("lowers detail only once the ratio is at the floor", () => {
    expect(decide({ ...base, ratio: RATIO_MIN, avg: 0.05 })).toEqual({ action: "level", level: 1 });
    expect(decide({ ...base, ratio: RATIO_MIN, level: 2, avg: 0.05 })).toEqual({ action: "none" });
  });
  it("steps up one small step when the GPU timer shows room", () => {
    const d = decide({ ...base, gpu: 4 });
    expect(d.action).toBe("up");
    expect(d.ratio).toBeCloseTo(1.15, 5);
  });
  it("does not step up without a timer, when the next step is too dear, when unsettled, or past the ceiling", () => {
    expect(decide({ ...base, gpu: 0 }).action).toBe("none");
    expect(decide({ ...base, gpu: 9 }).action).toBe("none");
    expect(decide({ ...base, gpu: 4, stable: false }).action).toBe("none");
    expect(decide({ ...base, gpu: 4, ceiling: 1.01 }).action).toBe("none");
  });
  it("never steps above the tier's cap", () => {
    expect(decide({ ...base, ratio: 1.25, gpu: 2 }).action).toBe("none");
  });
});

import { rampDecide, createRamp, median, RAMP_FRAMES } from "../../public/table/js/quality.js";

const fr = (ms: number, n = RAMP_FRAMES) => Array(n).fill(ms);
const rs = { ratio: 1, cap: 1.25, ceiling: Infinity, probe: null as number | null, frames: fr(16.7), refresh: 16.7, since: 2, gpu: 0 };

describe("rampDecide", () => {
  it("waits for 30 frames", () => {
    expect(rampDecide({ ...rs, frames: fr(16.7, 29) })).toEqual({ action: "none" });
  });
  it("steps up 15% when a 60 Hz screen holds its refresh", () => {
    const d = rampDecide(rs);
    expect(d.action).toBe("up");
    expect(d.ratio).toBeCloseTo(1.15, 5);
  });
  it("never steps past the cap or the ceiling", () => {
    expect(rampDecide({ ...rs, ratio: 1.2 }).ratio).toBe(1.25);
    expect(rampDecide({ ...rs, ratio: 1.25 })).toEqual({ action: "none" });
    expect(rampDecide({ ...rs, ceiling: 1.1 }).ratio).toBeCloseTo(1.099, 3);
  });
  it("steps once a second, not faster", () => {
    expect(rampDecide({ ...rs, since: 0.5 })).toEqual({ action: "none" });
  });
  it("does not step when the frames already run slow", () => {
    expect(rampDecide({ ...rs, frames: fr(22) })).toEqual({ action: "none" });
  });
  it("uses the median: a few long frames do not stop a step", () => {
    const frames = [...fr(16.7, 26), 80, 80, 80, 80];
    expect(median(frames)).toBeCloseTo(16.7);
    expect(rampDecide({ ...rs, frames }).action).toBe("up");
  });
  it("on a 144 Hz screen needs the median under 14 ms", () => {
    expect(rampDecide({ ...rs, refresh: 6.9, frames: fr(6.9) }).action).toBe("up");
    expect(rampDecide({ ...rs, refresh: 6.9, frames: fr(15) }).action).toBe("none");
  });
  it("undoes a step that pushes the median over 18 ms and makes the old ratio the ceiling", () => {
    const d = rampDecide({ ...rs, ratio: 1.15, probe: 1, frames: fr(21) });
    expect(d.action).toBe("undo");
    expect(d.ratio).toBe(1);
    expect(rampDecide({ ...rs, ratio: 1, probe: null, ceiling: d.ceiling })).toEqual({ action: "none" });
  });
  it("keeps a step whose frames stay on the refresh", () => {
    expect(rampDecide({ ...rs, ratio: 1.15, probe: 1 })).toEqual({ action: "keep" });
  });
  it("lets the GPU timer veto a step", () => {
    expect(rampDecide({ ...rs, gpu: 12 })).toEqual({ action: "none" });
    expect(rampDecide({ ...rs, gpu: 5 }).action).toBe("up");
  });
});

// A whole climb against a model GPU: frame time = max(refresh, gpu ms at ratio 1 * ratio^2.4)
function climb(gpuAt1: number, { cap = 1.25, start = 1, seconds = 20, refresh = 16.7 } = {}) {
  let ratio = start, ceiling = Infinity;
  const steps: [number, number, string][] = [];
  const ramp = createRamp({ cap: () => cap, getRatio: () => ratio, getCeiling: () => ceiling, setCeiling: (c: number) => { ceiling = c; }, apply: (r: number) => { ratio = r; }, log: (t: number, r: number, why: string) => steps.push([+t.toFixed(1), +r.toFixed(3), why]) });
  let t = 0;
  while (t < seconds * 1000) { const ms = Math.max(refresh, gpuAt1 * Math.pow(ratio, 2.4)); t += ms; ramp.feed(ms, t / 1000); }
  return { ratio, ceiling, steps };
}

describe("createRamp: a climb against a model GPU", () => {
  it("fast GPU: eased steps to the cap, about one a second, no undo", () => {
    const c = climb(5);
    expect(c.ratio).toBe(1.25);
    expect(c.steps.map((s) => s[2])).toEqual(["up", "up"]);
    expect(c.steps[1][0] - c.steps[0][0]).toBeGreaterThanOrEqual(0.9);
  });
  it("slow GPU: tries one step, undoes it, stays put", () => {
    const c = climb(17);   // 17 ms at ratio 1: any step is over
    expect(c.ratio).toBe(1);
    expect(c.steps.map((s) => s[2].split(":")[0])).toEqual(["up", "undo"]);
    expect(c.ceiling).toBeCloseTo(1.001, 3);
  });
  it("middling GPU: climbs until a step costs too much, then keeps the last good ratio as the ceiling", () => {
    const c = climb(11, { cap: 1.75, seconds: 40 });
    expect(c.ratio).toBeGreaterThan(1.1);
    expect(c.ratio).toBeLessThan(1.5);
    expect(c.steps.some((s) => s[2].startsWith("undo"))).toBe(true);
    expect(Math.max(11 * Math.pow(c.ratio, 2.4), 16.7)).toBeLessThanOrEqual(18);
  });
});
