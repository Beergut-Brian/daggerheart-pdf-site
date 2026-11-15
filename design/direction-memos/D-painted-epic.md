# D — Painted Epic: the Brine Colossus

**Idea.** A painted fantasy vista at dusk where a towering salt-crystal golem rises out of a brine lake and sprinkles salt over the title. Daggerheart's painterly-epic energy (ref steer-1/01), but our own world and our own monster.

**Signature.** The Brine Colossus: a giant made of white rock-salt cubes with teal brine veins and a gold heart. Its raised hand is where the live salt pours from, so the painting and the page are one scene: the art pours, the site catches. No one but High Sodium Gaming has a salt giant salting its own name.

**Hero art.** Generated painterly illustration (`imagery/D/spec.json`), full-bleed behind the type: `d1-hero-wide` 1536×864 for desktop, `d1-hero-tall` 768×1344 composed for 390. Art-directed `<picture>` crop, `object-fit: cover`, a soft indigo gradient scrim only where the type sits.

**Interactive salt.** `_shared/salt-engine.js` canvas over the hero. Emitter anchored at the painted hand (spec `emitter_hint`, measured after generation). Salt pours 2.5 s on load, settles on the wordmark letters and on the top edge of the RESOURCES button; pointer drags scatter it, a tap anywhere shakes more from the hand. Grain colours: #FBF8F1, #F1E7D3, #FFFFFF, #E6D3A8 (gold-lit).

**Type.** Wordmark: Cinzel Decorative 900 (OFL), huge, warm ivory with a gold top-light, stacked 3 lines on phone. Headings: DM Serif Display (OFL), the second line of a heading in teal like ref 01. UI/body: Alegreya Sans (OFL).

**Palette (each tied to the painting).**
| Hex | Role |
| --- | --- |
| #1E1442 | night indigo: page ground, viewer chrome |
| #2C1E5C | violet: raised surfaces, rail |
| #F4B942 | sunset gold: RESOURCES button fill, active states |
| #5FD3C6 | brine teal: second heading line, focus ring, search match |
| #FFF6E6 | salt ivory: wordmark, body text on dark |
| #B9AEE0 | mist lavender: secondary text (AA on #1E1442) |

**Button.** A chunky gold plaque with our own notched ends (not Daggerheart's chevron frame): gold #F4B942 face, darker gold underside, ivory-on-indigo label "RESOURCES"; salt collects on its top edge.

**Boards (axis: monster as huge backdrop vs monster as a small character on the type).**
- **D1 colossus-vista**: the Colossus is the whole painted scene behind the type; its hand pours over the wordmark.
- **D2 colossus-perched**: a quiet painted salt-flat vista; a smaller cut-out Colossus sits ON the wordmark, legs dangling over "SODIUM", tipping a salt crystal so the salt pours down the letters onto the button.

**/resources.** Two painted covers (`d-cover-core`, `d-cover-hope-fear`), titles set in HTML over the calm top band; the Core cover large, Hope & Fear beside it (picker-b-covers). Small salt piles rest on each cover's top edge (static grains, same engine, no emitter).
**Viewer.** Indigo chrome, page brightest; active thumbnail ringed in gold; the empty search state shows a small Colossus head peeking over the panel edge.

**Motion.** (1) Salt pour from the hand, 2.5 s on load: shows the joke in the name. (2) Pointer/finger scatter and tap-to-shake: the "interactive salt" Kaden asked for. (3) Slow 20 s parallax drift of the mist layer: depth in the painting. Reduced motion: settled salt pile painted once, no drift, no interaction.

**References.** steer-1/01 (painterly full-bleed cast, purple/gold/teal, framed nav energy), steer-1/02 (light behind the title), R02 (title card), R05 feel only, R14/R16 (phone sheet), R15 (thumb beside snippet).

**Not in the excluded family** because the page is carried by a painted scene and a character, not ornament.
**Never.** Daggerheart's characters, logo, chevron nav frame, card frames; human faces; stock photos.
