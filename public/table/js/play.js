// What a command does at the table: roll (rules from dice-logic.js), write the
// log line, throw the dice and, for attacks, play the miniature's attack.
import { parseCommand, rollDuality, rollNotation, dualityFrom, formatResult, isHit, seeded, HELP_LINES } from './dice-logic.js';

export function createPlay({ bar, canAct, dice = null, attack = null }) {
  const seed = /[#&]seed=(\d+)/.exec(location.hash);
  const rng = seed ? seeded(+seed[1]) : Math.random;
  let forced = null;   // proofs: __table.forceRoll(hope, fear)

  function duality(mod) {
    if (forced) { const f = forced; forced = null; return dualityFrom(f[0], f[1], mod); }
    return rollDuality(mod, rng);
  }

  function run(text) {
    const c = parseCommand(text);
    if (c.kind === 'empty') return null;
    if (c.kind === 'help') { HELP_LINES.forEach((l) => bar.add({ text: l, detail: '', tone: 'hint' })); return c; }
    if (c.kind === 'unknown') { bar.add({ text: c.hint, detail: '', tone: 'hint' }); return c; }
    if (!canAct()) { bar.add({ text: 'Put the book down first, then roll.', detail: '', tone: 'hint' }); return c; }
    if (c.kind === 'duality' || c.kind === 'attack') {
      const r = duality(c.mod), atk = c.kind === 'attack', line = formatResult(r, { attack: atk });
      const done = () => bar.add(line);
      const thrown = dice ? dice.throwDice([{ type: 'd12', value: r.hope, style: 'hope' }, { type: 'd12', value: r.fear, style: 'fear' }]) : 0;
      if (atk && attack) setTimeout(() => attack.play({ hit: isHit(r), critical: r.outcome === 'critical', onImpact: done }), thrown);
      else setTimeout(done, thrown);
      return { ...c, result: r, line };
    }
    const r = rollNotation(c.notation, rng), line = formatResult(r);
    const thrown = dice ? dice.throwDice(r.dice.map((d) => ({ type: 'd' + d.sides, value: d.value, style: 'bone' }))) : 0;
    setTimeout(() => bar.add(line), thrown);
    return { ...c, result: r, line };
  }

  return { run, forceRoll: (hope, fear) => { forced = [hope, fear]; } };
}
