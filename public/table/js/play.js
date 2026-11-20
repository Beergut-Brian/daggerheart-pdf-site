// What a command does at the table: roll (rules from dice-logic.js), write the
// log line, throw the dice and, for attacks, play the miniature's attack.
import { parseCommand, rollDuality, rollNotation, rollAttack, dualityFrom, formatResult, formatAttack, isHit, seeded, helpLines, HIT_TARGET } from './dice-logic.js';

// character: the card's current character, or a function returning it (the card can switch characters)
// a party attack names its animation (party.js `anim`); attack.js calls the same three things 'melee', 'ranged' and 'magic'
const ANIM_STYLE = { lunge: 'melee', bolt: 'ranged', magic: 'magic' };

export function createPlay({ bar, canAct, dice = null, attack = null, character: given = null }) {
  const character = () => (typeof given === 'function' ? given() : given);
  const seed = /[#&]seed=(\d+)/.exec(location.hash);
  const rng = seed ? seeded(+seed[1]) : Math.random;
  let forced = null;   // proofs: __table.forceRoll(hope, fear)
  const difficulty = () => attack?.target?.def.difficulty ?? HIT_TARGET;
  const takeForced = () => { const f = forced; forced = null; return f; };

  function duality(mod) {
    const f = takeForced();
    return f ? dualityFrom(f[0], f[1], mod) : rollDuality(mod, rng);
  }
  const dualityDice = (d) => [{ type: 'd12', value: d.hope, style: 'hope' }, { type: 'd12', value: d.fear, style: 'fear' }];
  const hint = (text) => bar.add({ text, detail: '', tone: 'hint' });

  // A character's attack: Duality + trait vs Difficulty; on a hit the mini strikes and the damage dice follow.
  function attackWith(atk) {
    if (!canAct()) { hint('Put the book down first, then roll.'); return null; }
    const r = rollAttack(atk, { difficulty: difficulty(), proficiency: character()?.proficiency ?? 1, faces: takeForced() }, rng);
    const lines = formatAttack(r, atk);
    const damage = () => {
      if (!lines.damage) return;
      const g = r.damage, done = () => bar.add(lines.damage);
      if (dice) dice.throwDice(g.rolls.map((value) => ({ type: 'd' + g.sides, value, style: 'bone' })), done); else done();
    };
    const settled = () => {
      bar.add(lines.roll);
      if (attack) attack.play({ hit: r.hit, critical: r.crit, hero: character()?.mini, style: atk.style ?? ANIM_STYLE[atk.anim] ?? null, bolt: atk.bolt, onImpact: damage });
      else damage();
    };
    if (dice) dice.throwDice(dualityDice(r.duality), settled); else settled();
    return { kind: 'named-attack', attack: atk, result: r, lines };
  }

  function run(text) {
    const c = parseCommand(text, { attacks: character()?.attacks ?? [] });
    if (c.kind === 'empty') return null;
    if (c.kind === 'help') { helpLines({ character: character(), difficulty: difficulty() }).forEach(hint); return c; }
    if (c.kind === 'unknown') { hint(c.hint); return c; }
    if (c.kind === 'named-attack') return attackWith(c.attack);
    if (!canAct()) { hint('Put the book down first, then roll.'); return c; }
    if (c.kind === 'duality' || c.kind === 'attack') {
      const atk = c.kind === 'attack', r = duality(c.mod), line = formatResult(r, { attack: atk, difficulty: difficulty() });
      const done = () => bar.add(line);
      const after = atk && attack ? () => attack.play({ hit: isHit(r, difficulty()), critical: r.outcome === 'critical', onImpact: done }) : done;
      if (dice) dice.throwDice(dualityDice(r), after); else after();
      return { ...c, result: r, line };
    }
    const r = rollNotation(c.notation, rng), line = formatResult(r);
    const done = () => bar.add(line);
    if (dice) dice.throwDice(r.dice.map((d) => ({ type: 'd' + d.sides, value: d.value, style: 'bone' })), done); else done();
    return { ...c, result: r, line };
  }

  // the card's rows call this by attack id
  const rollById = (id) => { const atk = character()?.attacks.find((a) => a.id === id); return atk ? attackWith(atk) : null; };

  return { run, rollById, forceRoll: (hope, fear) => { forced = [hope, fear]; } };
}
