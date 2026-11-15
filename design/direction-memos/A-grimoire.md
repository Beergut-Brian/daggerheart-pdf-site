# Direction A — Salt-Cured Grimoire   (Recommended: yes)

## The idea in one sentence
The site is an old spellbook that has been cured in salt: oxblood leather in the dark, gilt-stamped lettering, and a white crust of **cubic** halite crystals growing over it, lit by warm gold light.

## Signature (the part only High Sodium Gaming could own)
Salt, drawn as what it really is: stepped cubes and hopper crystals (the hollow, stair-stepped cubes halite grows into). They are never snowflakes or frost. Every crystal is lit warm gold from above-left, so the white reads as salt in candlelight, not ice. Put a coffee shop's name on it and the cubes still say "salt", and the leather and gilt still say "grimoire". The name finally gets its picture.

## How the hero art is drawn (no raster, no data-URI bitmaps)
- **Crystals:** `crystals.js` builds inline SVG from a seeded PRNG. Each crystal is an isometric cube made of three polygons (top in salt-white, left in warm mid, right in shadow), a 1px gilt edge, and two inset rhombi on the top face for the hopper step. Cubes cluster, overlap, and turn ±25° like real intergrown halite. Painter's order follows y. The same seed gives the same art every time.
- **Leather:** an SVG filter. `feTurbulence` (fractal noise, high frequency) runs into `feDiffuseLighting` with a warm distant light, then soft-light blends over the oxblood fill to make pebbled, tooled hide. A second low-frequency turbulence with `feColorMatrix` makes the R01 ink-wash bloom on the open field.
- **Gilt:** a metallic gold gradient clipped to the wordmark (`background-clip:text`, R21 / Atlas Card re-tinted gold), a deboss `drop-shadow`, and a glint band that sweeps across it.
- **Grain:** one fixed full-screen `feTurbulence` layer at low opacity.

## Type pairing (all SIL OFL 1.1, Google Fonts, self-hosted later through next/font)
- **Cinzel Decorative 900** (Natanael Gama, OFL): the wordmark. Roman capitals with swash-tipped serifs give a gilded, carved feel without touching Daggerheart's lettering.
- **IM Fell English SC** (Igino Marini, OFL): book titles, the page heading, and small-caps labels. It has the inked, slightly uneven type of a 17th-century grimoire.
- **Alegreya Sans 400/500/700** (Huerta Tipográfica, OFL): all UI and reading text in the viewer. It is a humanist sans with calligraphic roots, so it sits with the serifs and stays legible at 14px on a phone.

No swaps from the concept fonts. They passed in render.

## Palette (hex, role)
| Token | Hex | Role |
| --- | --- | --- |
| `--c-night` | #0d0908 | page base (warm near-black, never blue-black) |
| `--c-night-2` | #17100e | raised chrome: viewer bars, rail, sheet |
| `--c-night-3` | #231816 | hover / focused row |
| `--c-leather` | #4a1517 | oxblood cover leather (Core Rulebook, landing cover) |
| `--c-leather-deep` | #250a0b | leather shadow / tooled panel |
| `--c-leather-2` | #16202a | second book leather (night-blue, Hope & Fear) |
| `--c-gilt` | #d9b46a | gilt lettering, 1px rules; 10.1:1 on night, 9.6:1 on night-2 |
| `--c-gilt-hi` | #f6e3a8 | gilt highlight, glint, focus ring |
| `--c-gilt-lo` | #8c6a2c | gilt shadow (gradient stop, rules only, never text) |
| `--c-salt` | #f5efe3 | crystal top face, display white |
| `--c-salt-mid` | #d6c8ae | crystal lit side |
| `--c-salt-shade` | #8f7d62 | crystal shadow side |
| `--c-text` | #efe6d6 | body text on dark; 16:1 on night, 12:1 on leather |
| `--c-text-2` | #bfae92 | secondary text; 9.1:1 on night, 8.7:1 on night-2, 7.5:1 on night-3 |
| `--c-page` | #f1e7d0 | the book page (brightest thing in the viewer) |
| `--c-page-ink` | #6b6152 | placeholder lines on the page |
| `--c-mark` | #f2c44f | search match highlight (dark text #1a1208 on it: 11.3:1) |

## Motion (CSS/SVG only; everything finishes in under 1.8 s; there is one authored moment)
- **Crust grows in** (each cube scales up from its base, staggered by distance from its seed point, 0.2 to 1.6 s, expo ease-out). It says "salt" before you read a word. Reduced motion: fully grown.
- **Gilt glint** sweeps across the wordmark once at 1.4 s, then every 9 s. It makes the gilt read as metal, not yellow. Reduced motion: no glint, static gradient.
- **Button hover:** the gilt rule brightens and the corner crystals lift 2px. This is feedback. Reduced motion: colour change only.
- The viewer has no decorative motion. A sheet slide is a state change only.

## References borrowed
- **R01:** the ink-wash field done in turbulence, and the emblem-over-wordmark lockup (a single hopper-cube sigil above the name).
- **R21 + Atlas Card:** the monumental wordmark with a clipped metallic fill, re-tinted to gold.
- **R07:** the covers are the only colour on the dark /resources page, with soft cover shadows and two tight lines under each.
- **Franco Maria Ricci:** antique gold kept as a lettering and identity accent, 1px rules, small-caps labels, and flat UI fields.
- **R14 / R16:** the phone sheet with a grabber, a segmented control on top, and chapter and page labels in hit rows.
- **R15:** a tiny page thumbnail beside every snippet.
- **R19:** the wordmark spans the full width and stacks to 3 lines on phone.
- **R05:** feel only (gilded, painterly, thin double gold rules). Its lettering, chevron frames and art are not used.

## The two boards: BIG axis = where the signature lives, a frame around the hero vs inside the letterforms
- **a1-grimoire-cover:** the landing *is* the front cover. The hero is a tooled leather board with a spine and raised bands, gilt double rules, brass corner fittings of our own stepped-cube design, and a salt crust creeping in from the corners and edges. The wordmark is gilt-stamped in the calm middle. The quiet form carries on to resources (leather covers with crust at the corners, plus the 6-book shelf) and the viewer (the current thumbnail wears a crystal at its corner).
- **a2-grimoire-crystals:** there is no frame, only an open dark ink-wash field. The crystals grow *through* the wordmark: clusters burst from the H, O, M, A and final G, and those letters turn partly to salt where the crust takes them. The art is the type. The quiet form carries on to resources (the crystals grow out of the cover titles) and the viewer (a crystal sits on the page counter and the current thumb).

## Never (for this direction)
Snowflakes, frost-blue whites or anything wintry; Daggerheart's logo, lettering, chevron nav frame, card frames or art; purple-pink gradients; blobs; nested cards; bounce easing; stars or pentagrams; gold as a broad fill; crystals over the words at 390 (they stay at the edges or on the target letters only); any footer, or "unofficial", fan or copyright text; any motion in the viewer beyond state changes.
