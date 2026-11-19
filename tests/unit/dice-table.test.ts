import { describe, expect, it } from "vitest";
import { assignDice, clampSpot, clash } from "../../public/table/js/dice-table.js";

const pool = [
  { id: 1, type: "d12", kind: "duality", role: "hope", out: true },
  { id: 2, type: "d12", kind: "duality", role: "fear", out: true },
  { id: 3, type: "d20", kind: "tray", role: null, out: false },
  { id: 4, type: "d8", kind: "tray", role: null, out: false },
  { id: 5, type: "d6", kind: "tray", role: null, out: false },
  { id: 6, type: "d6", kind: "tray", role: null, out: false },
  { id: 7, type: "d8", kind: "tray", role: null, out: false },
];

describe("assignDice", () => {
  it("a Duality roll picks up the Hope and Fear d12s, never new ones", () => {
    expect(assignDice([{ type: "d12", style: "hope" }, { type: "d12", style: "fear" }], pool)).toEqual([1, 2]);
  });
  it("plain dice use the tray's dice of that type, then new ones", () => {
    expect(assignDice([{ type: "d6", style: "bone" }, { type: "d6", style: "bone" }, { type: "d6", style: "bone" }], pool)).toEqual([5, 6, null]);
    expect(assignDice([{ type: "d4", style: "bone" }], pool)).toEqual([null]);
  });
  it("plain d12s leave the Duality dice alone", () => {
    expect(assignDice([{ type: "d12", style: "bone" }], pool)).toEqual([null]);
  });
  it("dice already lying out come first", () => {
    const withOut = [...pool, { id: 9, type: "d8", kind: "extra", role: null, out: true }];
    expect(assignDice([{ type: "d8", style: "bone" }, { type: "d8", style: "bone" }], withOut)).toEqual([9, 4]);
  });
});

describe("clampSpot", () => {
  const area = { x0: -1, x1: 2, z0: 0, z1: 1 };
  it("pulls a spot inside the area by the die's radius", () => {
    expect(clampSpot({ x: 5, z: -3 }, 0.25, area)).toEqual({ x: 1.75, z: 0.25 });
    expect(clampSpot({ x: 0.5, z: 0.5 }, 0.25, area)).toEqual({ x: 0.5, z: 0.5 });
  });
  it("refuses a spot on top of something to avoid", () => {
    expect(clampSpot({ x: 0.5, z: 0.5 }, 0.25, area, [[0.6, 0.5, 0.2]])).toBeNull();
    expect(clampSpot({ x: 0.5, z: 0.5 }, 0.25, area, [[1.5, 0.5, 0.2]])).toEqual({ x: 0.5, z: 0.5 });
  });
  it("clash measures overlap", () => {
    expect(clash(0, 0, 0.2, [[1, 0, 0.2]])).toBe(0);
    expect(clash(0, 0, 0.2, [[0.3, 0, 0.2]])).toBeCloseTo(0.1);
  });
});

describe("rolling area", () => {
  it("turns centre, width and depth into bounds", async () => {
    const { areaBounds } = await import("../../public/table/js/dice-table.js");
    expect(areaBounds({ x: 1, z: 5, w: 4, d: 1 })).toEqual({ x0: -1, x1: 3, z0: 4.5, z1: 5.5 });
  });
  it("folds a path point back inside, like a bounce off the edge", async () => {
    const { bounceInto } = await import("../../public/table/js/dice-table.js");
    const area = { x0: -3, x1: 3, z0: 4, z1: 6 };
    expect(bounceInto({ x: 0, z: 5 }, 0.5, area)).toEqual({ x: 0, z: 5 });
    expect(bounceInto({ x: 3.5, z: 5 }, 0.5, area)).toEqual({ x: 1.5, z: 5 });   // wall at 2.5, 1.0 past it
    for (const x of [-9, -3, 0, 2.6, 7.3]) for (const z of [3, 4.2, 6.9, 12]) {
      const p = bounceInto({ x, z }, 0.3, area);
      expect(p.x).toBeGreaterThanOrEqual(-2.7); expect(p.x).toBeLessThanOrEqual(2.7);
      expect(p.z).toBeGreaterThanOrEqual(4.3); expect(p.z).toBeLessThanOrEqual(5.7);
    }
  });
});
