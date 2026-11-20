import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { lineupX, nearer, placeHover, rowSizes } from "../../public/table/js/pieces-logic.js";
import { PARTY } from "../../public/table/js/party.js";
import { damageText, formatAttack, helpLines, rangeText, rollAttack, traitText } from "../../public/table/js/dice-logic.js";

describe("lineupX", () => {
  it("centres the row on cx with the gap between neighbours", () => {
    const xs = lineupX([1, 2, 1], 0.5, 10);
    expect(xs).toEqual([8, 10, 12]);
    expect(xs[1] - xs[0]).toBeCloseTo(1 / 2 + 0.5 + 2 / 2);
    expect(lineupX([3], 0.5, 4)).toEqual([4]);
    expect(lineupX([], 0.5, 4)).toEqual([]);
  });
});

describe("rowSizes", () => {
  it("splits 8 pieces into one or two rows, back row first", () => {
    expect(rowSizes(8, 1)).toEqual([8]);
    expect(rowSizes(8, 2)).toEqual([4, 4]);
    expect(rowSizes(7, 2)).toEqual([4, 3]);
  });
});

describe("placeHover", () => {
  const view = { w: 400, h: 800 }, size = { w: 260, h: 120 };
  it("sits above the head, centred, when it fits", () => {
    expect(placeHover({ x: 200, top: 300, bottom: 400 }, size, view)).toEqual({ left: 70, top: 168, below: false });
  });
  it("goes below the base when there is no room above", () => {
    const p = placeHover({ x: 200, top: 60, bottom: 160 }, size, view);
    expect(p.below).toBe(true); expect(p.top).toBe(172);
  });
  it("never leaves the viewport, at either side or the bottom", () => {
    for (const x of [-50, 0, 15, 390, 460]) for (const [top, bottom] of [[10, 30], [300, 400], [700, 790], [790, 900]]) {
      const p = placeHover({ x, top, bottom }, size, view);
      expect(p.left).toBeGreaterThanOrEqual(8); expect(p.left + size.w).toBeLessThanOrEqual(view.w - 8);
      expect(p.top).toBeGreaterThanOrEqual(8); expect(p.top + size.h).toBeLessThanOrEqual(view.h - 8);
    }
  });
});

describe("nearer", () => {
  it("the nearer hit wins; a miss on one side leaves the other", () => {
    expect(nearer(3, 5)).toBe("piece"); expect(nearer(5, 3)).toBe("book");
    expect(nearer(null, 3)).toBe("book"); expect(nearer(3, null)).toBe("piece"); expect(nearer(null, null)).toBeNull();
  });
});

// party.js is generated from the approved file; its text must be the approved text, word for word
const approved = JSON.parse(fs.readFileSync(path.resolve("scripts/data/dh-pc-characters.json"), "utf8")).characters;
describe("party.js", () => {
  it("has the eight characters, in the approved order, with the approved text unchanged", () => {
    expect(PARTY.map((c) => c.id)).toEqual(approved.map((c: { id: string }) => c.id));
    expect(PARTY).toHaveLength(8);
    PARTY.forEach((c, i) => {
      const a = approved[i];
      expect([c.node, c.name, c.class, c.intro]).toEqual([a.node, a.name, a.class, a.intro]);
      expect(c.attacks).toHaveLength(a.attacks.length);
      c.attacks.forEach((x, k) => {
        expect([x.name, x.description, x.animation_idea, x.episodes]).toEqual([a.attacks[k].name, a.attacks[k].description, a.attacks[k].animation_idea, a.attacks[k].episodes]);
      });
    });
  });
  it("leaves the numbers the file does not have as null (never invented) and picks one of the three animations", () => {
    for (const c of PARTY) {
      expect(c.proficiency).toBeNull();
      expect(new Set(c.attacks.map((a) => a.id)).size).toBe(c.attacks.length);
      for (const a of c.attacks) {
        expect([a.range, a.trait, a.mod, a.damage, a.type]).toEqual([null, null, null, null, null]);
        expect(["lunge", "bolt", "magic"]).toContain(a.anim);
        if (a.anim !== "lunge") expect(typeof a.bolt).toBe("number");
      }
    }
  });
  it("covers all three animation types", () => {
    expect(new Set(PARTY.flatMap((c) => c.attacks.map((a) => a.anim)))).toEqual(new Set(["lunge", "bolt", "magic"]));
  });
  it("each character has a glb in models/pc whose root node is the character's node", () => {
    for (const c of PARTY) {
      const f = path.resolve("public/table/models/pc", c.id + ".glb"), b = fs.readFileSync(f);
      expect(b.readUInt32LE(0)).toBe(0x46546c67);   // "glTF"
      const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
      expect(json.nodes.map((n: { name: string }) => n.name)).toContain(c.node);
    }
  });
});

describe("a party attack whose numbers are not written yet", () => {
  const atk = PARTY[0].attacks[1];
  it("shows 'to come' in the card's columns and the /help line", () => {
    expect([rangeText(atk), traitText(atk), damageText(atk)]).toEqual(["to come", "to come", "to come"]);
    expect(helpLines({ character: PARTY[0] as never }).join("\n")).toContain("shield charge: to come, to come, to come");
  });
  it("rolls plain Duality, can hit, and rolls no damage", () => {
    const r = rollAttack(atk as never, { difficulty: 5 }, () => 0.9);
    expect(r.duality.mod).toBe(0); expect(r.hit).toBe(true); expect(r.damage).toBeUndefined();
    const lines = formatAttack(r, atk as never);
    expect(lines.roll.text).toContain("Shield Charge"); expect(lines.damage).toBeNull();
  });
});
