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
