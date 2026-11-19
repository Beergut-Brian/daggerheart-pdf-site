# Daggerheart Resources: the table

A candlelit game table drawn with three.js. The two books on it are links to the
readers at `/resources/core-rulebook` and `/resources/hope-and-fear`.

## Putting it on daggerheart.highsodiumgaming.com

Serve this folder as static files (for a Next.js app, drop it in `public/table/`
and it is live at `/table/`). Nothing is fetched from other hosts: three.js and
the typefaces ship in `vendor/` and `fonts/`.

When the page runs on `*.highsodiumgaming.com` it changes three things by itself:

- the books use your real cover art from `/covers/core-rulebook.webp` and
  `/covers/hope-and-fear.webp`;
- a click plays the opening and then goes to the reader in the same tab;
- "High Sodium Gaming" goes to `/`.

Anywhere else (a local preview, a claude.ai artifact) it paints its own covers
and ends the opening with an "Open …" button that opens the live site in a new tab.

## What to edit

- `js/config.js`: the book list: titles, blurbs, page counts, links, cover
  paths, where each book lies on the table.
- `js/surfaces.js`: everything with words on it (covers, opened pages, GM
  screen, the note). Each one has an HTML builder and a 2D-canvas painter.
- `index.html`: the CSS for those HTML surfaces (the `.surf` rules) and the page chrome.
- `js/world.js`, `js/models.js`, `js/textures.js`: the table, lights, candles,
  miniatures, terrain, dice and procedural textures.
- `js/main.js`: camera, pointer, the opening sequence, bloom / depth of field.

## Dice commands

The bar at the bottom takes chat-style commands (press `/` anywhere to jump to it):

- `/roll duality`, `/r`, `/r dual`, `/roll 2d12`, `/roll 2d12+3`: the Duality Dice, one Hope d12
  (gold) and one Fear d12 (violet). The higher die names the roll; doubles are a critical success.
- `/roll d20`, `/roll 3d6+2`, `/roll 1d8+1d6`: any d4, d6, d8, d10, d12 or d20 with modifiers
  (at most 10 of one kind and 20 dice in all). Plain `d20` without the slash rolls too.
- `/attack +2` or `/roll 2d12+2 attack`: a Duality roll; then one of the party attacks the golem.
  A total at or above the golem's Difficulty hits (`difficulty` on its entry in `js/minis.js`,
  stand-in 12; `HIT_TARGET` in `js/dice-logic.js` is only the fallback); matching dice always hit.
- `/attack longsword` (any case, any prefix such as `/attack long` or `/attack bash`): the character's
  attack, the same as clicking its row on the card. `/help` lists the attacks.
- `/help` lists them. Up and Down walk back through what you typed; Escape leaves the bar.

The d10 is numbered 1 to 10 (not 0 to 9), so its face is what you add. The d4 is read at its top point.

Files: `js/dice-logic.js` (the rules: parser, rolls, log lines; no three.js or DOM, unit-tested
in `tests/unit/dice.test.ts`), `js/command.js` (bar and roll log), `js/play.js` (what a command
does), `js/dice3d.js` (thrown dice), `js/attack.js` (the attack), `js/minis.js` (the minis).

## The attack card (the note left of the books)

The note shows the first character in `CHARACTERS` (`js/config.js`). Each row is one attack;
click its dice icon (or Tab to it and press Enter/Space) to roll: 2d12 Duality + the trait
modifier against the monster's Difficulty, the character's mini attacks the golem, and on a hit
the damage dice follow (dice = Proficiency; a Critical Success adds the dice's maximum). On
phones, tap the card or the **Attacks** chip above the command bar for a flat sheet.
All names and numbers in `CHARACTERS` and the golem's `difficulty` are STAND-INS.

To add a character, add an entry to `CHARACTERS`: `{ id, name, class, mini, proficiency, attacks }`,
where `mini` is an id from `MINIS` (the figure that attacks). To add an attack, add
`{ id, name, range: 'Melee' | 'Very Close' | 'Close' | 'Far', trait: 'Agility', mod: 2, damage: 'd8+2', type: 'phy' | 'mag' }`
to its `attacks`; add `style: 'ranged' | 'magic'` (and a `bolt` colour) when the attack is not
how the mini normally fights. The card fits four or five rows. The rules are pure functions in
`js/dice-logic.js` (`rollAttack`, `formatAttack`, `findAttack`), tested in `tests/unit/attack.test.ts`;
the card's layout (`CARD`, `cardRows`) in `js/surfaces.js` feeds the painter, the live-HTML
buttons and the raycast hit-test; `js/card.js` handles hover, focus and the phone sheet.

## Putting your own minis on the table

Every mini is one entry in `MINIS` in `js/minis.js`: where it stands, which way it faces, its
scale and base, `role: 'hero'` or `'monster'`, and for heroes `attack: 'melee' | 'ranged' | 'magic'`
(ranged and magic heroes throw a glowing bolt in their `bolt` colour). The monster with
`target: true` is the one the party attacks; heroes take turns.

`loader` returns the figure as a three.js object, built at the origin, facing +z, standing on
y = 0. To use a scanned or sculpted mini, export it as `.glb` into `models/`, then load it before
the table is built and return it from `loader`, for example
`loader: (ctx) => ctx.gltf['models/paladin.glb'].scene.clone()`. `vendor/three.bundle.js` does
not include `GLTFLoader` today, so that bundle needs rebuilding with
`three/examples/jsm/loaders/GLTFLoader.js` added to its exports first (not done in this change).
Keep a model light (a few thousand triangles, one or two materials) so phones keep up.

## HTML-in-Canvas

Where the browser has HTML-in-Canvas (desktop Chrome and Edge, the Claude
desktop app) the covers, opened pages, GM screen and note are real DOM
elements inside the `<canvas>`, drawn into textures whenever they repaint, so
CSS animation, real text and the links' accessibility all carry into the 3D
scene. Everywhere else the same designs are painted with the 2D canvas API and
the scene is otherwise identical. The corner of the page says "Live HTML in
canvas" when the first path is running.

## Address flags for testing

Add after `#`, joined with `&`:

- `html=off` use the painted fallback even where HTML-in-Canvas exists
- `tier=lite` / `tier=full` force the phone or desktop quality tier
- `shot` skip the intro
- `open=core` or `open=hf` open a book on load; `p=0.6` freezes the opening there
- `dof=off`, `post=off` switch off depth of field / all post-processing

- `seed=42` makes every roll repeatable

From the console: `__table.open('core')`, `__table.close()`, `__table.roll('/attack +2')`,
`__table.forceRoll(6, 6)` (the next Duality roll shows Hope 6, Fear 6), `__table.nextAttacker('ranger')`,
`__table.dice()` (each thrown die's rolled value and the number actually facing up),
`__table.timeScale(0)` and `__table.step(50)` (freeze, then step, dice and attacks in ms; for stills),
`__table.rollAttack('longsword')`, `__table.card().openSheet()`, `__table.cardPoint(0)` (a row's icon on screen).
`__table.attackPhase()` also reports `hitStop` (seconds the attack holds at a hit's impact; `end` includes it).

## Look tunables (named constants at the top of each file)

- `js/models.js` `RESIN`, `GLYPH_SCALE`: resin dice (transmission + tinted attenuation on the full tier;
  clearcoat, sheen and an inner glow on lite) and the engraved numbers' size. The number atlas with its
  groove and bump is `diceInkAtlas()` in `js/textures.js`.
- `js/dice3d.js` `DIE_STYLE` (die and ink colours), `SHADOW` (contact shadow), `TALL_ASPECT` / `TALL_SCALE`
  (phones taller than 1.8 x their width get 1.3x dice and throw), `FOCUS_HOLD_MS` (depth of field follows the dice).
- `js/attack.js` `WIND`, `LUNGE`, `HOLD`, `HITSTOP`, `LEAN`, `KNOCK`, `FLASH`, `BURST`, `SPARK`, `CRYSTAL_DIM`.
- `js/command.js` `PHONE_W`, `LOG_ROWS`: the roll log sits under the home link (centred on phones, left on wider screens).
- Proofs for this pass: `node scripts/table-proof.mjs look http://localhost:3123` writes to `../review/table-look/`.
