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

The dice on the table are the ones that get rolled; no new dice appear for a Duality roll:

- The gold Hope and violet Fear d12s lie in the rolling area (below). A Duality roll (and an attack)
  picks them up from wherever they lie (a short rise and a shake in the air), throws them into the
  area, and they land with the rolled number up and stay there. The next roll picks them up from
  there. They never go into the tray, and plain `d12` rolls leave them alone.
- Other dice (`3d6`, `d20`, damage dice) use the dice already lying out of that type first, then
  the tray's own dice of that type (one d20, two d8s, two d6s); only the missing ones are new teal
  dice, and they rise out of the tray. About 2.6 s after the result shows (on the game clock) the
  tray's dice hop back into the tray, rolled face still up, and the new ones drop in and fade, so
  the table never fills up. A new roll before then picks them up from where they lie.
- Landing spots stay inside the rolling area (`ROLL_AREA` in `js/config.js`), clear of the dice already
  lying there. The area is an invisible bound on the open wood in front of the books: centre x / z,
  width and depth, one entry for the wide layout and one for `tall` (phones held upright). Nothing is
  drawn for it. Throws aim into it, some rebound off its edges (`WALL_BOUNCE` in `js/dice3d.js`,
  `bounceInto` in `js/dice-table.js`), and every die rests inside it. To move it, edit `ROLL_AREA`
  and check `FRAME` at the top of the camera rig in `js/main.js` (the default view zooms out a little
  and aims toward the viewer so the area is on screen above the command bar). `__table.area` shows the bounds. Which die a roll uses and the clamping are in `js/dice-table.js`
  (pure, unit-tested in `tests/unit/dice-table.test.ts`); where the Duality dice start (inside the area) is `tableDice` in `js/world.js`.
- Reduced motion: the dice turn to their result where they lie (extras appear in the tray), no
  lift or throw.
- Tunables at the top of `js/dice3d.js`: `LIFT_MS` and `LIFT` (pick-up), `THROW_MS`,
  `STAGGER_MS`/`JITTER_MS`, `HOLD_MS` (result showing before the tray's dice go back),
  `RETURN_MS`/`RETURN_ARC`, `TAG_IN_MS`/`TAG_OUT_MS`.
- Proofs: `__table.dice()` (last roll: rolled value vs up face), `__table.diceAt()` (every die:
  kind, out or in the tray, phase, position); `node scripts/table-proof.mjs pickup <url>`.

Files: `js/dice-logic.js` (the rules: parser, rolls, log lines; no three.js or DOM, unit-tested
in `tests/unit/dice.test.ts`), `js/command.js` (bar and roll log), `js/play.js` (what a command
does), `js/dice3d.js` (the table's dice and their rolls), `js/dice-table.js` (which dice a roll picks up), `js/attack.js` (the attack), `js/minis.js` (the minis).

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
the scene is otherwise identical. Nothing on the page says which path runs;
the `<html>` element carries `data-surfaces="html"` or `data-surfaces="painted"`
and the console logs one `[table] surfaces: ...` line.

How a surface stays the right size (js/surfaces.js, `Surfaces`):
- Each element has a fixed CSS size in px (the numbers in `surfaces.js`); its
  snapshot is drawn at the canvas's pixel ratio, so the texture is that size
  times the ratio. The canvas gets its real size before the first snapshot.
- `texElementImage2D` is used where it exists: the texture takes the
  snapshot's own size, so the two cannot disagree. `texElementSubImage2D` is
  the fallback: the texture is re-made at the snapshot's size on every upload,
  so an older snapshot of another size can never show through it.
- At start-up every surface is drawn once with a magenta marker on its
  right and bottom edges, and the marker is looked for at the texture's
  bottom-right corner. If any surface misses it (drawn smaller or larger than
  its texture), the whole table uses the painted path instead.
- When the canvas's pixel ratio changes (window resize, or the frame-rate
  guard stepping quality down) every surface is retaken.
- `#debug=surfaces` shows a panel with every surface's actual texture:
  solid green outline = the texture, dashed magenta = the element's box at the
  canvas's pixel ratio. They should match and the picture should fill both;
  a mismatch is marked with a cross.

## Changing the GM screen image

One picture runs across all three panels of the GM screen (left wing, centre,
right wing), split at the folds so it reads as one scene. It is on the front of
the screen, the side facing the camera (the players' side); the back stays the
plain dark board it has always been. "HIGH SODIUM GAMING" in block capitals
(Cinzel Decorative 900, subset to `fonts/hsg-title.woff2`) fills the centre panel as three centred lines, one word each, as real text, so it
stays when you swap the picture. The picture's darkening and the gold frame
are laid out once across the unfolded screen, so nothing breaks at the folds.

1. Pick a wide landscape image, ideally at least 2560 px wide. The screen is
   very wide (about 3.4 : 1), so only a horizontal band of the picture shows.
2. From the `site` folder run
   `node scripts/gm-screen.mjs path/to/picture.jpg 0.5 0.33`
   The two numbers are the focus point, across and down (0 to 1): the band is
   cut around it. The centre panel shows the middle half of the band, so put
   the subject there; keep the top fifth of the centre calm, the title sits
   there. The script writes `public/table/art/gm-screen.jpg` (under 250 KB).
3. Reload `/table` (add `#shot` to skip the intro). Not right? Run step 2 again
   with a different focus point.
4. Commit `public/table/art/gm-screen.jpg`.

The file name and focus point live in `GM_SCREEN` in `js/config.js`. The focus
there only matters for a picture copied in by hand without the script; set
`image: null` to go back to the plain painted screen. The current picture
came from `design/table/gm-screen/source-2026-11-18.jpg` with focus `0.5 0.33`.
Where HTML-in-Canvas runs the title is real text (the screen also carries an
invisible "Daggerheart Resources" heading for screen readers); elsewhere the
same title is painted in the same face.

## The loading screen

While the scene loads, one quiet line sits under "Setting the table": "Tired of waiting? Click
here for resources". The link part goes to the site's `/resources` page in the same tab. It is plain
HTML (small, muted, underlined link; no button), so it works before any script runs and with scripts
off; if the browser has no WebGL, the plain list page shows the same line. Once the table is ready it
fades with the loading screen (the books are the way in from then on).

## Address flags for testing

Add after `#`, joined with `&`:

- `html=off` use the painted fallback even where HTML-in-Canvas exists
- `html=sub` use the `texElementSubImage2D` upload even where `texElementImage2D` exists
- `debug=surfaces` the surface debug panel (see HTML-in-Canvas)
- `tier=lite` / `tier=full` force the phone or desktop quality tier
- `shot` skip the intro
- `open=core` or `open=hf` open a book on load; `p=0.6` freezes the opening there
- `dof=off`, `post=off` switch off depth of field / all post-processing
- `hold-load` keeps the loading screen (and its "Click here for resources" line) up after the scene is ready
- `cam=az,el,zoom,x,z` sets the camera (orbit angle, height, zoom, pan); see `gm-screen-front` in `scripts/table-proof.mjs` for the straight-on GM screen view

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
- Proofs for the rolling-area pass: `node scripts/table-proof.mjs fix http://localhost:3123` writes to `../review/table-fix/`.
- Proofs for the look pass: `node scripts/table-proof.mjs look http://localhost:3123` writes to `../review/table-look/`.
