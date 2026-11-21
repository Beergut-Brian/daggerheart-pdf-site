import { describe, expect, it } from "vitest";
import {
  HIT_TARGET, findAttack, formatAttack, formatResult, dualityFrom, helpLines, parseCommand, parseDamage, rollAttack,
} from "../../public/table/js/dice-logic.js";

// rng that returns the faces you ask for: face k on a dN is (k - 0.5) / N
const faces = (...list: [number, number][]) => {
  let i = 0;
  return () => { const [v, n] = list[i++ % list.length]; return (v - 0.5) / n; };
};

const longsword = { id: "longsword", name: "Longsword", range: "Melee" as const, trait: "Agility", mod: 2, damage: "d8+2", type: "phy" as const };
const shieldBash = { id: "shield-bash", name: "Shield Bash", range: "Melee" as const, trait: "Strength", mod: 1, damage: "d4+1", type: "phy" as const };
const javelin = { id: "javelin", name: "Javelin", range: "Far" as const, trait: "Finesse", mod: 1, damage: "d6+1", type: "phy" as const };
const emberWard = { id: "ember-ward", name: "Ember Ward", range: "Close" as const, trait: "Presence", mod: 0, damage: "d6+1", type: "mag" as const };
const attacks = [longsword, shieldBash, javelin, emberWard];

describe("rollAttack", () => {
  it("adds the trait modifier and hits at or above the Difficulty", () => {
    // Hope 6, Fear 4, +2 = 12 vs 12: hit; damage d8 rolls 5
    const hit = rollAttack(longsword, { difficulty: 12 }, faces([6, 12], [4, 12], [5, 8]));
    expect(hit).toMatchObject({ hit: true, crit: false, duality: { hope: 6, fear: 4, mod: 2, total: 12, outcome: "hope" } });
    expect(hit.damage).toMatchObject({ rolls: [5], bonusMax: 0, mod: 2, total: 7, type: "phy" });
    // the same dice miss a Difficulty 13 and roll no damage
    const miss = rollAttack(longsword, { difficulty: 13 }, faces([6, 12], [4, 12]));
    expect(miss).toMatchObject({ hit: false, crit: false, difficulty: 13 });
    expect(miss.damage).toBeUndefined();
  });

  it("names the roll by the higher die", () => {
    expect(rollAttack(longsword, { faces: [9, 4] }).duality.outcome).toBe("hope");
    expect(rollAttack(longsword, { faces: [4, 9] }).duality.outcome).toBe("fear");
    expect(formatAttack(rollAttack(longsword, { difficulty: 12, faces: [9, 4] }, faces([7, 8])), longsword).roll.text).toBe("Longsword: 15 with Hope, hit");
    expect(formatAttack(rollAttack(longsword, { difficulty: 12, faces: [3, 5] }), longsword).roll.text).toBe("Longsword: 10 with Fear, miss");
    expect(formatAttack(rollAttack(longsword, { difficulty: 12, faces: [3, 5] }), longsword).roll).toMatchObject({ tone: "fear", hit: false });
  });

  it("a Critical Success always hits and adds the damage dice's maximum", () => {
    // 1 + 1 + 2 = 4, far under Difficulty 20, still a hit
    const r = rollAttack(longsword, { difficulty: 20, faces: [1, 1] }, faces([3, 8]));
    expect(r).toMatchObject({ hit: true, crit: true });
    expect(r.damage).toMatchObject({ rolls: [3], bonusMax: 8, mod: 2, total: 13 });   // d8 + 8 + 2
    const lines = formatAttack(r, longsword);
    expect(lines.roll.text).toBe("Longsword: Critical Success, hit");
    expect(lines.damage).toMatchObject({ text: "Longsword damage: 13 phy", tone: "critical" });
    expect(lines.damage!.detail).toContain("+ 8 (critical, max dice)");
  });

  it("rolls as many damage dice as the Proficiency", () => {
    const r = rollAttack(longsword, { difficulty: 1, proficiency: 3 }, faces([9, 12], [4, 12], [1, 8], [2, 8], [3, 8]));
    expect(r.damage).toMatchObject({ rolls: [1, 2, 3], count: 3, total: 1 + 2 + 3 + 2, text: "3d8+2" });
    const crit = rollAttack(longsword, { difficulty: 1, proficiency: 2, faces: [5, 5] }, faces([1, 8], [1, 8]));
    expect(crit.damage).toMatchObject({ rolls: [1, 1], bonusMax: 16, total: 1 + 1 + 16 + 2 });   // 2d8 + 16 + 2
  });

  it("logs damage with its type", () => {
    const r = rollAttack(emberWard, { difficulty: 12, faces: [10, 3] }, faces([4, 6]));
    expect(formatAttack(r, emberWard).damage).toMatchObject({ text: "Ember Ward damage: 5 mag", tone: "plain" });
  });

  it("reads weapon damage", () => {
    expect(parseDamage("d8+2")).toEqual({ ok: true, count: 1, sides: 8, mod: 2 });
    expect(parseDamage("2d6")).toEqual({ ok: true, count: 2, sides: 6, mod: 0 });
    expect(parseDamage("d8+d6").ok).toBe(false);
  });
});

describe("Difficulty", () => {
  it("is the target's, with HIT_TARGET only as the fallback", () => {
    expect(HIT_TARGET).toBe(18);
    expect(formatResult(dualityFrom(7, 6, 0), { attack: true, difficulty: 14 })).toMatchObject({ hit: false });
    expect(formatResult(dualityFrom(8, 6, 0), { attack: true, difficulty: 14 })).toMatchObject({ hit: true });
    expect(formatResult(dualityFrom(7, 6, 0), { attack: true }).detail).toContain("(18+)");
  });
});

describe("/attack <name>", () => {
  it("matches names case-insensitively, by prefix and by any word", () => {
    expect(parseCommand("/attack longsword", { attacks })).toEqual({ kind: "named-attack", attack: longsword });
    expect(parseCommand("/attack LONGSWORD", { attacks })).toEqual({ kind: "named-attack", attack: longsword });
    expect(parseCommand("/attack long", { attacks })).toEqual({ kind: "named-attack", attack: longsword });
    expect(parseCommand("/atk shield bash", { attacks })).toEqual({ kind: "named-attack", attack: shieldBash });
    expect(parseCommand("/attack bash", { attacks })).toEqual({ kind: "named-attack", attack: shieldBash });
    expect(parseCommand("/a jav", { attacks })).toEqual({ kind: "named-attack", attack: javelin });
  });

  it("keeps modifier attacks working", () => {
    expect(parseCommand("/attack +2", { attacks })).toEqual({ kind: "attack", mod: 2 });
    expect(parseCommand("/attack", { attacks })).toEqual({ kind: "attack", mod: 0 });
  });

  it("hints on unknown or ambiguous names", () => {
    const unknown = parseCommand("/attack fireball", { attacks });
    expect(unknown.kind).toBe("unknown");
    expect(unknown).toMatchObject({ hint: expect.stringContaining("Longsword, Shield Bash, Javelin, Ember Ward") });
    const two = [longsword, { ...shieldBash, name: "Long Bow", id: "bow" }];
    expect(findAttack(two, "long")).toEqual({ ok: false, hint: '"long" could be Longsword or Long Bow.' });
    expect(findAttack(two, "longsword")).toEqual({ ok: true, attack: longsword });
    expect(parseCommand("/attack sword").kind).toBe("unknown");   // no character: modifiers only
  });

  it("/help lists the character's attacks", () => {
    const lines = helpLines({ character: { id: "g", name: "Brannoc Vale", class: "Guardian", mini: "guardian", attacks }, difficulty: 18 });
    expect(lines).toContain("/attack longsword: Melee, Agility +2, d8+2 phy");
    expect(lines).toContain("/attack ember ward: Close, Presence +0, d6+1 mag");
    expect(lines.some((l) => l.includes("Difficulty 18"))).toBe(true);
  });
});
