# F — Glow: the Salt Wyrm

**Idea.** A night sky full of floating salt crystals; behind a giant luminous HIGH SODIUM GAMING, an enormous crystal serpent glows, its gold heart backlighting the letters. The live salt is the star of the show (ref steer-1/02).

**Signature.** The Salt Wyrm, a legless serpent-dragon made of translucent salt crystal with a gold glowing heart. And luminous salt: grains glow as they fall and drift, and piles of light build up on the wordmark.

**Hero art.** Generated cinematic key art (`imagery/F/spec.json`). F1: `f1-wyrm-wide` / `f1-wyrm-tall`, with the heart-orb sitting exactly behind the wordmark. F2: the empty sky (`f2-sky-*`) plus the hatchling on pure black (`f2-hatchling`), composited with `mix-blend-mode: screen` so its glow floats on the sky with no cut-out edge.

**Interactive salt.** Shared engine with glowing grains (#FFF7DF, #FFE29A, #BDF3EC, #FFFFFF) and a CSS `drop-shadow` bloom on the canvas. Pointer drags leave a short-lived trail of grains, like stirring stars. F2: the hatchling's crystal is the emitter; tap anywhere and it pours again.

**Type.** Wordmark: Cinzel 900 (OFL) set ENORMOUS, filled with a chrome-to-gold gradient (top light, ref 02), with a soft back-glow from the heart-orb. Alternate if Kaden wants techy: Unbounded 900 (OFL). UI/body: Space Grotesk (OFL).

**Palette.**
| Hex | Role |
| --- | --- |
| #07061A | near-black indigo night: page ground, viewer chrome |
| #15123A | raised surfaces |
| #FFC861 | heart gold: glow, RESOURCES pill glow, active states |
| #6FE3D6 | teal rim: focus ring, search match |
| #F5F3FF | starlight: body text |
| #A49FD0 | haze: secondary text (AA on #07061A) |

**Button.** A glowing pill (ref 02): dark glass fill, gold 1px edge, gold outer glow that brightens on hover; salt glow piles on its top.

**Boards (axis: monster as huge backdrop glow vs small character the visitor plays with).**
- **F1 wyrm-eclipse**: the Wyrm is a huge silhouette coiled behind the type; the light comes from behind the wordmark; salt drifts down through the glow.
- **F2 hatchling-pour**: an empty starry salt sky; a tiny hatchling Wyrm hovers above the wordmark hugging a crystal and pours luminous salt that piles on the letters and the button; the interaction is the hero.

**/resources.** Glow covers (`f-cover-core`, `f-cover-hope-fear`) on the night ground, each with a soft halo; the Core cover large.
**Viewer.** Near-black chrome, page brightest; current page thumb has a gold glow; the loading state is a slow drift of glowing grains.

**Motion.** (1) Heart-orb glow breathes once on load (1.5 s): the light "turns on" behind the name. (2) Luminous salt pour + scatter trails: the interactive salt. (3) Floating crystals in the image drift 8 px over 30 s (CSS transform on a duplicate layer): depth. Reduced motion: lit end state, settled salt, no drift.

**References.** steer-1/02 (giant metallic type on dark, light from behind, glowing pill button), steer-1/01 (purple/gold/teal), R19 (wordmark spanning the width), R22 (search that feels part of the world), North Kingdom style (scene carries colour).

**Not in the excluded family** because a character (the Wyrm) and a live simulation carry the page, not static ornament.
**Never.** Sci-fi rockets or planets; Daggerheart art or logo; stock photos; neon-cyberpunk pink.
