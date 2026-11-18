// Dice rules for the table's command bar. Pure: no three.js, no DOM, so the
// same rules can run in tests, a server or a later app. Every roller takes an
// injectable rng (a function returning [0, 1)) so results can be forced.

/** A total at or above this hits the monster. A critical always hits. */
export const HIT_TARGET = 12;

export const DIE_SIDES = [4, 6, 8, 10, 12, 20];
export const CAPS = { perTerm: 10, total: 20, terms: 10, mod: 99 };

const HINT = 'Try /roll duality, /roll 2d6+1, /attack +2 or /help';

export const HELP_LINES = [
  '/roll duality (or /r, /roll 2d12): Hope and Fear d12s',
  '/roll 2d12+3: Duality with a modifier',
  '/roll d20, /roll 3d6+2, /roll 1d8+1d6: any d4 to d20',
  `/attack +2: a Duality attack on the golem (${HIT_TARGET}+ hits)`,
];

/**
 * @typedef {{ count: number, sides: number, sign: 1 | -1 }} DiceTerm
 * @typedef {{ ok: true, terms: DiceTerm[], mod: number, dice: number, text: string }} Notation
 * @typedef {{ ok: false, hint: string }} NotationError
 */

/**
 * Parses dice notation such as "d20", "3d6+2", "1d8+1d6" or "2d12-1".
 * @param {string} input
 * @returns {Notation | NotationError}
 */
export function parseNotation(input) {
  const src = String(input ?? '').toLowerCase().replace(/\s+/g, '');
  if (!src) return { ok: false, hint: 'Nothing to roll. ' + HINT };
  if (!/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/.test(src)) return { ok: false, hint: `"${String(input).trim()}" isn't dice notation. ${HINT}` };
  /** @type {DiceTerm[]} */
  const terms = [];
  let mod = 0, dice = 0;
  for (const m of src.matchAll(/([+-]?)(?:(\d*)d(\d+)|(\d+))/g)) {
    const sign = m[1] === '-' ? -1 : 1;
    if (m[3] != null) {
      const count = m[2] === '' ? 1 : Number(m[2]), sides = Number(m[3]);
      if (!DIE_SIDES.includes(sides)) return { ok: false, hint: `There's no d${sides} on this table: use d4, d6, d8, d10, d12 or d20.` };
      if (count < 1) return { ok: false, hint: 'Roll at least one die.' };
      if (count > CAPS.perTerm) return { ok: false, hint: `At most ${CAPS.perTerm} dice of one kind at a time.` };
      terms.push({ count, sides, sign });
      dice += count;
    } else {
      mod += sign * Number(m[4]);
    }
  }
  if (!terms.length) return { ok: false, hint: 'Add some dice, for example d20+' + Math.abs(mod) + '.' };
  if (terms.length > CAPS.terms) return { ok: false, hint: `At most ${CAPS.terms} kinds of dice at a time.` };
  if (dice > CAPS.total) return { ok: false, hint: `At most ${CAPS.total} dice at a time.` };
  if (Math.abs(mod) > CAPS.mod) return { ok: false, hint: `Keep the modifier between -${CAPS.mod} and +${CAPS.mod}.` };
  return { ok: true, terms, mod, dice, text: notationText(terms, mod) };
}

/** @param {DiceTerm[]} terms @param {number} mod */
function notationText(terms, mod) {
  let s = '';
  terms.forEach((t, i) => { s += (t.sign < 0 ? '-' : i ? '+' : '') + t.count + 'd' + t.sides; });
  return s + modText(mod);
}

/** @param {number} mod */
export const modText = (mod) => (mod > 0 ? '+' + mod : mod < 0 ? String(mod) : '');

/** Two d12s and nothing else is a Duality roll (the Daggerheart convention). @param {Notation} n */
const isDuality = (n) => n.terms.length === 1 && n.terms[0].count === 2 && n.terms[0].sides === 12 && n.terms[0].sign === 1;

/** @param {string} s @returns {number | null} */
function parseMod(s) {
  const t = s.replace(/\s+/g, '');
  if (!t) return 0;
  if (!/^[+-]?\d+$/.test(t)) return null;
  const v = Number(t);
  return Math.abs(v) > CAPS.mod ? null : v;
}

/**
 * @typedef {{ kind: 'empty' } | { kind: 'help' } | { kind: 'unknown', hint: string, input: string }
 *   | { kind: 'duality', mod: number, attack: false } | { kind: 'attack', mod: number }
 *   | { kind: 'roll', notation: Notation }} Command
 */

/**
 * Reads one line from the command bar.
 * @param {string} text
 * @returns {Command}
 */
export function parseCommand(text) {
  const src = String(text ?? '').trim();
  if (!src) return { kind: 'empty' };
  const slash = src.startsWith('/');
  const [head, ...restParts] = (slash ? src.slice(1) : src).split(/\s+/);
  const cmd = head.toLowerCase();
  const unknown = (hint = HINT) => ({ kind: /** @type {const} */ ('unknown'), hint, input: src });

  if (slash && (cmd === 'help' || cmd === '?' || cmd === 'h')) return { kind: 'help' };

  if (slash && (cmd === 'attack' || cmd === 'atk' || cmd === 'a')) {
    const rest = restParts.join('');
    const mod = parseMod(rest.replace(/^2d12/i, ''));
    if (mod == null) return unknown('Attacks take a modifier only, for example /attack +2.');
    return { kind: 'attack', mod };
  }

  /** @param {string} body */
  const rollBody = (body) => {
    let s = body.trim().toLowerCase(), attack = false;
    const tail = /\s*\b(attack|atk)$/.exec(s);
    if (tail) { attack = true; s = s.slice(0, tail.index).trim(); }
    const dual = /^(duality|dual|dd|hope|fear)?\s*([+-]\s*\d+)?$/.exec(s);
    if (dual && (dual[1] || !s || attack)) {
      if (!dual[1] && s && !attack) return unknown();
      const mod = parseMod(dual[2] || '');
      if (mod == null) return unknown(`Keep the modifier between -${CAPS.mod} and +${CAPS.mod}.`);
      return attack ? { kind: /** @type {const} */ ('attack'), mod } : { kind: /** @type {const} */ ('duality'), mod, attack: /** @type {const} */ (false) };
    }
    const n = parseNotation(s);
    if (!n.ok) return unknown(n.hint);
    if (isDuality(n)) return attack ? { kind: /** @type {const} */ ('attack'), mod: n.mod } : { kind: /** @type {const} */ ('duality'), mod: n.mod, attack: /** @type {const} */ (false) };
    if (attack) return unknown('Attacks use the Duality Dice: try /attack +2.');
    return { kind: /** @type {const} */ ('roll'), notation: n };
  };

  if (slash && (cmd === 'roll' || cmd === 'r')) return rollBody(restParts.join(' '));
  if (slash) return unknown(`"/${cmd}" isn't a command here. ${HINT}`);
  // no slash: plain notation such as "d20" or "2d6+1" still rolls
  if (/^[\d+\-\sd]+$/i.test(src) && /d/i.test(src)) return rollBody(src);
  if (/^(duality|dual)\b/i.test(src)) return rollBody(src);
  return unknown();
}

/** @param {number} sides @param {() => number} rng */
export const rollDie = (sides, rng = Math.random) => 1 + Math.min(sides - 1, Math.floor(rng() * sides));

/**
 * @typedef {{ kind: 'duality', hope: number, fear: number, mod: number, total: number, outcome: 'hope' | 'fear' | 'critical' }} DualityResult
 */

/**
 * One Hope d12 and one Fear d12. The higher die names the roll; doubles are a critical success.
 * @param {number} [mod]
 * @param {() => number} [rng]
 * @returns {DualityResult}
 */
export function rollDuality(mod = 0, rng = Math.random) {
  return dualityFrom(rollDie(12, rng), rollDie(12, rng), mod);
}

/** Builds a Duality result from known faces (for forced proof rolls). @param {number} hope @param {number} fear @param {number} [mod] @returns {DualityResult} */
export function dualityFrom(hope, fear, mod = 0) {
  const outcome = hope === fear ? 'critical' : hope > fear ? 'hope' : 'fear';
  return { kind: 'duality', hope, fear, mod, total: hope + fear + mod, outcome };
}

/**
 * @typedef {{ sides: number, value: number, sign: 1 | -1 }} RolledDie
 * @typedef {{ kind: 'roll', dice: RolledDie[], mod: number, total: number, text: string }} NotationResult
 */

/**
 * @param {Notation} parsed
 * @param {() => number} [rng]
 * @returns {NotationResult}
 */
export function rollNotation(parsed, rng = Math.random) {
  /** @type {RolledDie[]} */
  const dice = [];
  for (const t of parsed.terms) for (let i = 0; i < t.count; i++) dice.push({ sides: t.sides, value: rollDie(t.sides, rng), sign: t.sign });
  const total = dice.reduce((s, d) => s + d.sign * d.value, 0) + parsed.mod;
  return { kind: 'roll', dice, mod: parsed.mod, total, text: parsed.text };
}

/** @param {DualityResult} r */
export const isHit = (r) => r.outcome === 'critical' || r.total >= HIT_TARGET;

/**
 * The log line for a result.
 * @param {DualityResult | NotationResult} r
 * @param {{ attack?: boolean }} [opts]
 * @returns {{ text: string, detail: string, tone: 'hope' | 'fear' | 'critical' | 'plain', hit: boolean | null }}
 */
export function formatResult(r, { attack = false } = {}) {
  if (r.kind === 'duality') {
    const text = r.outcome === 'critical' ? 'Critical success' : `${r.total} with ${r.outcome === 'hope' ? 'Hope' : 'Fear'}`;
    let detail = `Hope ${r.hope} · Fear ${r.fear}${r.mod ? ' ' + signed(r.mod) : ''}`;
    if (r.outcome === 'critical') detail += ` = ${r.total}`;
    if (!attack) return { text, detail, tone: r.outcome, hit: null };
    const hit = isHit(r);
    if (r.outcome === 'critical') return { text: 'Critical hit!', detail: 'Critical success · ' + detail, tone: r.outcome, hit };
    return { text: text + (hit ? ': hit!' : ': miss'), detail: (hit ? 'Hit' : 'Miss') + ` (${HIT_TARGET}+) · ` + detail, tone: r.outcome, hit };
  }
  const parts = r.dice.map((d, i) => (d.sign < 0 ? '- ' : i ? '+ ' : '') + d.value).join(' ');
  return { text: `${r.total} on ${r.text}`, detail: parts + (r.mod ? ' ' + signed(r.mod) : ''), tone: 'plain', hit: null };
}

/** @param {number} m */
const signed = (m) => (m < 0 ? '- ' + Math.abs(m) : '+ ' + m);

/** A small seeded rng (mulberry32) for repeatable rolls. @param {number} seed */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
