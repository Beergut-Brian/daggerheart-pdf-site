import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { firstOverlap, nearer, placeHover } from "../../public/table/js/pieces-logic.js";
import { PARTY } from "../../public/table/js/party.js";
// config.js reads `location` (a browser file): take the layout from its source text instead
const cfgSrc = fs.readFileSync(path.resolve("public/table/js/config.js"), "utf8");
const SCALE = +/scale: ([\d.]+),/.exec(cfgSrc.slice(cfgSrc.indexOf("export const PIECES")))![1];
const PLACES: Record<string, { x: number; z: number; yaw: number }> = Object.fromEntries(
  [...cfgSrc.matchAll(/(pc_\w+): \{ x: (-?[\d.]+), z: (-?[\d.]+), yaw: (-?[\d.]+) \}/g)].map((m) => [m[1], { x: +m[2], z: +m[3], yaw: +m[4] }]));
const glbBox = (id: string) => {
  const b = fs.readFileSync(path.resolve("public/table/models/pc", id + ".glb")), j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const m of j.meshes) for (const p of m.primitives) { const a = j.accessors[p.attributes.POSITION]; a.min.forEach((v: number, i: number) => (mn[i] = Math.min(mn[i], v))); a.max.forEach((v: number, i: number) => (mx[i] = Math.max(mx[i], v))); }
  return { mn, mx };
};
import { damageText, formatAttack, helpLines, rangeText, rollAttack, traitText } from "../../public/table/js/dice-logic.js";

describe("firstOverlap", () => {
  it("finds the first pair of circles that touch or come within the gap", () => {
    const a = { id: "a", x: 0, z: 0, r: 0.5 }, b = { id: "b", x: 1, z: 0, r: 0.4 }, c = { id: "c", x: 1.2, z: 0, r: 0.1 };
    expect(firstOverlap([a, b])).toBeNull();
    expect(firstOverlap([a, b], 0.2)).toEqual(["a", "b"]);
    expect(firstOverlap([a, b, c])).toEqual(["b", "c"]);
    expect(firstOverlap([])).toBeNull();
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

describe("the party on the map", () => {
  it("every piece has a place, and no two footprints overlap (circle = half the wider of width and depth at the chosen scale)", () => {
    expect(Object.keys(PLACES).sort()).toEqual(PARTY.map((c) => c.id).sort());
    const items = PARTY.map((c) => { const { mn, mx } = glbBox(c.id), p = PLACES[c.id]; return { id: c.id, x: p.x, z: p.z, r: (Math.max(mx[0] - mn[0], mx[2] - mn[2]) / 2) * SCALE }; });
    expect(firstOverlap(items, 0.05)).toBeNull();
  });
  it("stands on the road area where the old party stood, clear of the skeletons and the golem", () => {
    for (const p of Object.values(PLACES)) { expect(p.x).toBeGreaterThan(-1.6); expect(p.x).toBeLessThan(2); expect(p.z).toBeGreaterThan(-2.3); expect(p.z).toBeLessThan(0); }
  });
  it("true relative heights at one scale: Zeke tallest, Drex or the crouched Kerropi shortest", () => {
    const h = Object.fromEntries(PARTY.map((c) => [c.id, glbBox(c.id).mx[1] * SCALE]));
    expect(Math.max(...Object.values(h))).toBe(h.pc_zeke);
    expect(h.pc_drex).toBeLessThan(h.pc_prim);
    expect(h.pc_kerropi).toBeLessThan(h.pc_prim);
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
