import { describe, expect, it } from "vitest";
import {
  CAPS, HIT_TARGET, dualityFrom, formatResult, isHit, parseCommand, parseNotation, rollDie, rollDuality, rollNotation, seeded,
} from "../../public/table/js/dice-logic.js";

// rng that returns the faces you ask for: face k on a dN is (k - 0.5) / N
const faces = (...list: [number, number][]) => {
  let i = 0;
  return () => { const [v, n] = list[i++ % list.length]; return (v - 0.5) / n; };
};

describe("parseNotation", () => {
  it("reads single and multi-term notation with modifiers", () => {
    expect(parseNotation("d20")).toMatchObject({ ok: true, terms: [{ count: 1, sides: 20, sign: 1 }], mod: 0, dice: 1 });
    expect(parseNotation("3d6+2")).toMatchObject({ ok: true, terms: [{ count: 3, sides: 6 }], mod: 2, dice: 3, text: "3d6+2" });
    expect(parseNotation("1d8 + 1d6")).toMatchObject({ ok: true, terms: [{ count: 1, sides: 8 }, { count: 1, sides: 6 }], mod: 0, text: "1d8+1d6" });
    expect(parseNotation("2D12-1")).toMatchObject({ ok: true, mod: -1, text: "2d12-1" });
    expect(parseNotation("1d4+1d6+1d8+1d10+1d20")).toMatchObject({ ok: true, dice: 5 });
    expect(parseNotation("d20+3-1")).toMatchObject({ ok: true, mod: 2 });
  });
  it("rejects garbage, missing dice and unknown dice with a hint", () => {
    for (const bad of ["", "fireball", "2d", "d", "3x6", "1d7", "d100", "+5", "0d6", "2d6++1"]) {
      const r = parseNotation(bad);
      expect(r.ok, bad).toBe(false);
      if (!r.ok) expect(r.hint.length).toBeGreaterThan(5);
    }
  });
  it("enforces the caps", () => {
    expect(parseNotation(`${CAPS.perTerm}d6`).ok).toBe(true);
    expect(parseNotation(`${CAPS.perTerm + 1}d6`).ok).toBe(false);
    expect(parseNotation("10d6+10d8").ok).toBe(true);
    expect(parseNotation("10d6+10d8+1d4").ok).toBe(false);
    expect(parseNotation("d20+99").ok).toBe(true);
    expect(parseNotation("d20+100").ok).toBe(false);
  });
});

describe("parseCommand", () => {
  it("treats Duality aliases as Duality", () => {
    for (const c of ["/roll duality", "/r", "/r dual", "/roll", "/roll 2d12", "/ROLL Duality", "duality"]) {
      expect(parseCommand(c), c).toEqual({ kind: "duality", mod: 0, attack: false });
    }
    expect(parseCommand("/roll 2d12+3")).toEqual({ kind: "duality", mod: 3, attack: false });
    expect(parseCommand("/roll duality -1")).toEqual({ kind: "duality", mod: -1, attack: false });
  });
  it("reads attacks", () => {
    expect(parseCommand("/attack")).toEqual({ kind: "attack", mod: 0 });
    expect(parseCommand("/attack +2")).toEqual({ kind: "attack", mod: 2 });
    expect(parseCommand("/attack 3")).toEqual({ kind: "attack", mod: 3 });
    expect(parseCommand("/attack -1")).toEqual({ kind: "attack", mod: -1 });
    expect(parseCommand("/roll 2d12+3 attack")).toEqual({ kind: "attack", mod: 3 });
    expect(parseCommand("/r attack")).toEqual({ kind: "attack", mod: 0 });
    expect(parseCommand("/attack sword").kind).toBe("unknown");
    expect(parseCommand("/roll d20 attack").kind).toBe("unknown");
  });
  it("reads general notation, with or without the slash", () => {
    const r = parseCommand("/roll 3d6+2");
    expect(r.kind).toBe("roll");
    if (r.kind === "roll") expect(r.notation.text).toBe("3d6+2");
    expect(parseCommand("d20").kind).toBe("roll");
    expect(parseCommand("/r 1d8+1d6").kind).toBe("roll");
  });
  it("help, empty and unknown never throw", () => {
    expect(parseCommand("/help")).toEqual({ kind: "help" });
    expect(parseCommand("   ")).toEqual({ kind: "empty" });
    for (const s of ["hello", "/fly", "/roll banana", "/roll 50d6", "/roll d13", "/roll duality +500"]) {
      const r = parseCommand(s);
      expect(r.kind, s).toBe("unknown");
      if (r.kind === "unknown") expect(r.hint).toBeTruthy();
    }
  });
});

describe("rollDuality", () => {
  it("the higher die names the roll", () => {
    expect(rollDuality(0, faces([9, 12], [4, 12]))).toEqual({ kind: "duality", hope: 9, fear: 4, mod: 0, total: 13, outcome: "hope" });
    expect(rollDuality(0, faces([2, 12], [11, 12]))).toMatchObject({ hope: 2, fear: 11, total: 13, outcome: "fear" });
  });
  it("doubles are a critical success", () => {
    expect(rollDuality(0, faces([5, 12], [5, 12]))).toMatchObject({ outcome: "critical", total: 10 });
    expect(rollDuality(0, faces([1, 12], [1, 12]))).toMatchObject({ outcome: "critical", total: 2 });
  });
  it("adds the modifier to the total but not to the outcome", () => {
    expect(rollDuality(3, faces([6, 12], [7, 12]))).toMatchObject({ total: 16, outcome: "fear", mod: 3 });
    expect(rollDuality(-2, faces([8, 12], [3, 12]))).toMatchObject({ total: 9, outcome: "hope" });
  });
  it("stays on 1..12 for any rng value, and seeded rolls repeat", () => {
    expect(rollDie(12, () => 0)).toBe(1);
    expect(rollDie(12, () => 0.999999)).toBe(12);
    const a = rollDuality(0, seeded(7)), b = rollDuality(0, seeded(7));
    expect(a).toEqual(b);
    const r = seeded(1);
    for (let i = 0; i < 500; i++) { const v = rollDie(12, r); expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(12); }
  });
});

describe("hits", () => {
  it(`a total of ${HIT_TARGET} or more hits`, () => {
    expect(HIT_TARGET).toBe(12);
    expect(isHit(dualityFrom(7, 5, 0))).toBe(true);
    expect(isHit(dualityFrom(6, 5, 0))).toBe(false);
    expect(isHit(dualityFrom(6, 5, 1))).toBe(true);
    expect(isHit(dualityFrom(10, 4, -3))).toBe(false);
  });
  it("a critical always hits, even below the target", () => {
    expect(isHit(dualityFrom(1, 1, 0))).toBe(true);
    expect(isHit(dualityFrom(2, 2, -3))).toBe(true);
  });
});

describe("rollNotation and formatResult", () => {
  it("totals each die with signs and the modifier", () => {
    const n = parseNotation("1d8-1d6+2");
    if (!n.ok) throw new Error("parse");
    const r = rollNotation(n, faces([5, 8], [3, 6]));
    expect(r.dice).toEqual([{ sides: 8, value: 5, sign: 1 }, { sides: 6, value: 3, sign: -1 }]);
    expect(r.total).toBe(4);
    expect(formatResult(r)).toMatchObject({ text: "4 on 1d8-1d6+2", detail: "5 - 3 + 2", tone: "plain" });
  });
  it("writes the Duality log lines", () => {
    expect(formatResult(dualityFrom(9, 4, 2))).toMatchObject({ text: "15 with Hope", tone: "hope", detail: "Hope 9 · Fear 4 + 2" });
    expect(formatResult(dualityFrom(3, 8, 0))).toMatchObject({ text: "11 with Fear", tone: "fear" });
    expect(formatResult(dualityFrom(6, 6, 0))).toMatchObject({ text: "Critical success", tone: "critical" });
    expect(formatResult(dualityFrom(9, 4, 2), { attack: true })).toMatchObject({ text: "15 with Hope: hit!", hit: true });
    expect(formatResult(dualityFrom(3, 4, 0), { attack: true })).toMatchObject({ text: "7 with Fear: miss", hit: false });
    expect(formatResult(dualityFrom(2, 2, 0), { attack: true })).toMatchObject({ text: "Critical hit!", hit: true, tone: "critical" });
  });
});
