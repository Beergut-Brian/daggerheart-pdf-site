import { describe, expect, it } from "vitest";
import { coverCrop, panelSlices, SCREEN_ASPECT, SCREEN_PANELS } from "../../public/table/js/screen-art.js";

describe("GM screen art crop", () => {
  it("covers the unfolded screen without stretching", () => {
    expect(SCREEN_ASPECT).toBeCloseTo(2560 / 760);
    const c = coverCrop(1280, 717);
    expect(c.w).toBe(1280);
    expect(c.w / c.h).toBeCloseTo(SCREEN_ASPECT);
    expect(c.y).toBeCloseTo((717 - c.h) / 2);
  });

  it("follows the focus point and stays inside the image", () => {
    expect(coverCrop(1280, 717, SCREEN_ASPECT, 0.5, 0).y).toBe(0);
    const bottom = coverCrop(1280, 717, SCREEN_ASPECT, 0.5, 1);
    expect(bottom.y + bottom.h).toBeCloseTo(717);
    const tall = coverCrop(4000, 760, SCREEN_ASPECT, 0, 0.5);
    expect(tall).toMatchObject({ x: 0, y: 0, h: 760 });
    const right = coverCrop(4000, 760, SCREEN_ASPECT, 1, 0.5);
    expect(right.x + right.w).toBeCloseTo(4000);
  });

  it("splits at the folds in panel proportion, edge to edge", () => {
    const s = panelSlices(1280, 717, 0.5, 0.33);
    expect(s).toHaveLength(SCREEN_PANELS.length);
    expect(s[0].x).toBe(0);
    expect(s[0].x + s[0].w).toBeCloseTo(s[1].x);
    expect(s[1].x + s[1].w).toBeCloseTo(s[2].x);
    expect(s[2].x + s[2].w).toBeCloseTo(1280);
    expect(s[1].w / s[0].w).toBeCloseTo(2);
    for (const p of s) expect(p.y).toBe(s[0].y);
  });
});
