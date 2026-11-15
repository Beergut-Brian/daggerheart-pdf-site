# Concepts (Gate 1) — High Sodium Gaming

Six directions for the visual world. Each one works with any of the skeletons; the skeleton picks decide structure, the concept decides look.
Every font listed is free for web use under the SIL Open Font License 1.1 (all on Google Fonts, self-hosted through `next/font`).
Reference ids are from `references/references.md` (11 entries, fetched by RobBot 2026-11-14). R05 is the Daggerheart feel source: we take mood only, never its lettering, frames or art.

---

## 1. Salt-Cured Grimoire  ★ recommended
1. **Idea:** the site is an old spellbook cured in salt: dark oxblood-leather night, gilt lettering, and a white crust of salt crystals growing over the edges.
2. **Signature:** cubic halite crystals (salt's real crystal shape: little stepped cubes, not snowflakes) crusting the corners of the wordmark and the RESOURCES button. Nobody else's fantasy site is made of salt.
3. **Hero art:** one inline SVG. A gold-ink field built from `feTurbulence` + `feColorMatrix` (the R01 painterly wash, done in code), then a `<pattern>` of stepped cube crystals clipped to an edge mask. Motion: the crust grows in from the corners once on load (1.2 s, `clip-path` sweep) to say "salt" before anything else; a slow gold glint travels across the letters every ~8 s. Reduced motion: crust fully grown, no glint.
4. **Daggerheart without copying:** borrows the gilded, painterly, ornamental mood and thin double gold rules (R05 feel) with our own shapes; the frame is a book cover, not a card; no chevron frames, no Daggerheart letterforms.
5. **Risk:** white crystals on dark can read as frost/winter; mitigated by cube geometry and warm gold light, and checked at 390 where the crust must stay at the edges, not over the words.
- **Fonts:** Cinzel Decorative (display, OFL) · IM Fell English SC (alt display, OFL) · Alegreya Sans (UI/body, OFL)
- **References:** R01 (ink-wash field, emblem-over-wordmark), R02 (single title card, vignette), R07 (covers as the only colour on dark), R05 (feel only)

## 2. Sodium Lamp  ★ recommended
1. **Idea:** the table at night under a sodium-vapour lamp: everything is lit in that one monochrome amber (589 nm), with deep indigo shadow; techy-arcane rather than storybook.
2. **Signature:** the sodium D-line doublet (two thin bright lines a hair apart, the element's real spectral fingerprint) used as the gold double rule everywhere: under the wordmark, on book cards, as the active-thumbnail marker. A science joke dressed as an ornament.
3. **Hero art:** CSS only. A radial amber gradient pool from a lamp above the wordmark, a full-screen SVG `feTurbulence` grain overlay (Kaden likes grain), and two layers of blurred fog gradients drifting sideways at different speeds (20 s / 35 s) so the light feels alive. Reduced motion: fog still.
4. **Daggerheart without copying:** keeps the dusk duality (warm glow breaking into deep blue night, the R05 palette move) but as a lamp-lit scene, not a sunset; the hope/fear pair becomes amber light vs indigo dark.
5. **Risk:** amber monochrome can turn muddy and fail contrast; needs a strict two-ramp palette (amber + indigo) and contrast checks on every pair. Most "techy" of the six, the least fairy-tale.
- **Fonts:** Grenze Gotisch (display, OFL) · Marcellus SC (alt display, OFL) · Chakra Petch (UI, OFL)
- **References:** R02 (dark title card), R05 (feel only: dusk split), R08 (dark PDF viewer surround), R10 (search result anatomy)

## 3. Hope & Fear Tide
1. **Idea:** the two dice made into a seascape: a golden Hope dawn on one side, an indigo Fear night on the other, and a brine tide line running between them.
2. **Signature:** a white salt-foam tideline (scalloped SVG path with a crystalline edge) splitting the screen; it is the one line that recurs on every page (picker divider, viewer progress bar).
3. **Hero art:** two SVG wave paths with `animate`d control points swell slowly against each other (12 s loop); the button sits where they meet, so pressing RESOURCES is "stepping onto the tideline". Reduced motion: waves frozen at the meeting point.
4. **Daggerheart without copying:** the duality is the game's core mechanic, spoken in our own image (sea and salt) instead of their iconography.
5. **Risk:** the closest to R05's indigo/orange split; must keep palette and composition far enough away that it doesn't look like a recolour of their site. Waves can feel "beach brand".
- **Fonts:** Cinzel (display, OFL) · Almendra Display (alt display, OFL) · Spectral (body, OFL)
- **References:** R05 (feel only), R02 (centred title, one entry row), R03 (stacked title bands for the picker)

## 4. Halite Monument
1. **Idea:** one enormous faceted salt crystal stands behind the wordmark like a monolith, gilt-edged, catching light.
2. **Signature:** a single cubic halite crystal drawn as stepped faces (hopper crystal: the stair-stepped hollow cube salt really grows into), which shrinks into the favicon and each book's cover corner.
3. **Hero art:** SVG polygons for the faces with three gradient fills (light, mid, shadow); a CSS custom property drives the light angle and the face fills shift slowly as if the light moves around it (16 s). Reduced motion: fixed three-quarter light.
4. **Daggerheart without copying:** gilded, stylized, faceted (their gem-like shapes) translated into a mineral form they don't use.
5. **Risk:** a glowing geometric crystal can read as crypto, tech start-up, or a gem store; needs painterly grain and the old-book type to pull it back to fantasy.
- **Fonts:** Cinzel Decorative (display, OFL) · Metamorphous (alt display, OFL) · Alegreya (body, OFL)
- **References:** R01 (emblem over wordmark), R02 (vignette), R06 (ruled shelf grid)

## 5. Brine Flats
1. **Idea:** a salt flat at the edge of the world: a cracked polygon plain running to a horizon, a gilt sun of Hope low in the sky, a whole adventure's worth of empty map.
2. **Signature:** the hexagonal salt-crust polygons of a real salt flat, drawn as a Voronoi field in perspective; the same polygon cells become the picker grid and the viewer's empty states.
3. **Hero art:** Voronoi cells precomputed at build into one SVG, CSS `perspective` tilts it to the horizon. Motion: the cracks light up gold one ring at a time from the button outward (once, 1.5 s), "the path opens". Reduced motion: lit end state.
4. **Daggerheart without copying:** campaign-map, journey feel (their campaign frames are places); painterly dusk sky in CSS gradients; no borrowed frames.
5. **Risk:** can read as desert/Western or a travel site; least obviously "fantasy" until type and gold do the work. Voronoi detail must stay light on phones.
- **Fonts:** Cormorant SC (display, OFL) · Faculty Glyphic (alt display, OFL) · Alegreya Sans (UI, OFL)
- **References:** R01 (painterly field), R03 (title bands), R11 (preview-pane search)

## 6. The Salt Circle  ★ recommended
1. **Idea:** the folk ward: a ring of poured salt drawn around the wordmark keeps the table safe; crossing the circle's gate (the button) takes you in.
2. **Signature:** a hand-poured salt ring of tiny crystals with gilt runic marks between them (our own glyphs, drawn for the site); the ring returns as the loading spinner in the viewer and the selected-book outline.
3. **Hero art:** SVG circle built from ~400 small crystal `<use>` symbols with jittered radius; on load it pours itself around once with `stroke-dashoffset` on a guide path (1.6 s), then the gold glyphs fade in. After that it only breathes (a 2% scale over 10 s). Reduced motion: completed ring, no breathing.
4. **Daggerheart without copying:** ornamental, gilded, mystical circle language (their seals and domains feel) made from salt; no pentagram, no stars, no borrowed sigils.
5. **Risk:** occult/witchy tone; glyphs must stay abstract and playful. Centred composition only, so it pairs with landing-a, not landing-b.
- **Fonts:** Cinzel Decorative (display, OFL) · Pirata One (alt display, OFL) · Alegreya Sans (UI, OFL)
- **References:** R02 (single title card), R01 (centred emblem lockup), R08 + R10 (viewer chrome and search)

---

## Recommended three for Gate 2 boards
1. **Salt-Cured Grimoire** — the richest version of "gilded painterly fantasy" with a salt joke only HSG can own; works with both landing skeletons.
2. **The Salt Circle** — the boldest single image (one point: the ring and the gate), and its ring carries through to the viewer's loading state.
3. **Sodium Lamp** — the techy, grainy option Kaden's own-brand taste welcomes; the D-line rule is a quiet joke that holds up in a reading UI.
