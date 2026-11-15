# Direction C — Sodium Lamp   (Recommended: no; the techy option beside A and B)

## The idea in one sentence
The table at night under one sodium-vapour lamp: everything lit in that single 589 nm amber, everything else falls into deep indigo, and the wordmark is set in a gilded blackletter as if it hangs in the light.

## Signature (only HSG could own it: salt)
Sodium is half of salt (NaCl). The lamp's light IS salt's fingerprint: the sodium D-line doublet, two bright lines a hair apart at 589.0 / 589.6 nm. The doublet is the house ornament everywhere: the double rule under the wordmark, the frame on every book cover, the active-thumbnail ring, the search-match underline. On board 1 the lamp itself holds a glowing cubic halite crystal (salt's real crystal shape) instead of a bulb. A coffee shop could have a lamp; nobody else has a salt crystal in the lamp and their own element's spectrum as the rule.

## How the hero art works (code only, no raster)
- Lamp pool (c1): inline SVG lantern (bracket, chain, cage, a two-face isometric halite cube as the "bulb") centred above the wordmark. A CSS `radial-gradient` pool and an SVG light cone (linear gradient, blurred with `filter: blur`) fall onto the type. The wordmark h1 is solid deep amber (amber-600, 7.1:1); two aria-hidden copies on top in amber-200 and amber-50 are masked with radial `mask-image` to the pool, so the centre letters are lit and the outer ones fall out of the light. No gradient text. Two fog layers (wide blurred radial ellipses) drift sideways at 22 s and 37 s. Grain: one fixed full-screen inline SVG `feTurbulence` + `feColorMatrix` overlay at low opacity.
- D-line bands (c2): the screen is a spectroscope view. Two tall vertical luminous bands (CSS: a 1-colour core plus two box-shadow blooms each, 589.0 and 589.6) run the full height on the centre axis, blended with `mix-blend-mode: screen` over the stacked wordmark so the letters are lit where the lines cut them. A gilt wavelength scale (SVG ticks 585–594 nm, labels in Chakra Petch tabular numerals, "Na I D₂ D₁") frames the top and bottom like an instrument reticle. Same grain overlay.

## Type (all SIL OFL 1.1, Google Fonts, `display=swap`)
- Display / wordmark: **Grenze Gotisch** (Renata Polastri / Omnibus-Type, OFL): a sharp, modern blackletter with readable capitals; reads fantasy and gilded, not storybook, and is nothing like Daggerheart's own lettering.
- Headings, book titles, button labels: **Marcellus SC** (Astigmatic, OFL): flared engraved small caps, the "gilt on a spine" voice.
- UI and body: **Chakra Petch** (Cadson Demak, OFL): squared technical sans with tabular numerals for page numbers, counts and the spectral scale (measurement, not costume).

## Palette (strict two ramps: amber light + indigo dark; plus one parchment for the book page)
| Token | Hex | Role |
| --- | --- | --- |
| --ink-950 | #0a0918 | night: page background everywhere |
| --ink-900 | #12102a | viewer panels, sheet, top bar |
| --ink-800 | #1c1940 | raised: hover rows, fields, focused result |
| --ink-700 | #2b275a | hairlines, dividers, thumb slots (non-text) |
| --ink-300 | #a7a2d6 | secondary text (meta, chapter, hints) |
| --ink-200 | #c9c5ec | tertiary headings on panels |
| --amber-50 | #fff6e3 | primary text, lamp core |
| --amber-200 | #ffd98a | lit wordmark, titles |
| --amber-400 | #ffb52e | sodium: the doublet, accents, button fill, focus ring |
| --amber-600 | #d98a0f | pressed/hover-shade, scale ticks |
| --amber-800 | #6e430a | deep glow edge (decorative) |
| --amber-950 | #2a1806 | text on amber fills |
| --paper | #efe5cf | the book page (brightest thing in the viewer) |
| --paper-head / --paper-line | #5a5446 / #8f8879 | placeholder heading bar / text lines (non-text) |
| --mark | #ffc24d | match highlight on the page and in snippets |

Contrast (WCAG, computed): amber-50 on ink-950 18.4 · on ink-900 17.3 · on ink-800 15.5; ink-300 on ink-950 8.2 · on ink-900 7.8 · on ink-800 7.0; ink-200 on ink-900 11.2; amber-400 on ink-950 11.2 · on ink-900 10.5 · on ink-800 9.4; amber-200 on ink-900 13.7; ink-950 on amber-400 11.2 (button label); amber-950 on amber-400 9.7; ink-950 on mark 12.3; amber-950 on paper 13.6; paper-head on paper 6.0. Every text pair passes AA body (4.5:1). The wordmark's unlit outer letters are amber-600 on ink-950 (7.1:1).

## Motion (each one justified; all CSS/SVG; load-in done by 1.6 s)
- Lamp strike (c1, once, 1.4 s): real low-pressure sodium lamps start a dull red and warm to amber; the lamp glow and pool fade from amber-800 to full amber. It tells the "lamp turning on at the table" story before anything else. Reduced motion: lit.
- Fog drift (c1, 22 s / 37 s loops, sideways): makes the light feel alive and cold-night; very low contrast. Reduced motion: fog still, same position.
- Spectral read (c2, once, 1.2 s): a thin cursor sweeps the scale left to right and the two lines ignite as it passes 589; the instrument "takes a reading". Reduced motion: lines lit, cursor parked at 589.3.
- Line shimmer (c2, 7 s, opacity 0.88–1): emission lines flicker faintly like a discharge tube. Reduced motion: steady.
- Button (both): light rises inside the RESOURCES button on hover/focus (background-position, 200 ms ease-out). Reduced motion: instant colour change.
- Viewer, picker: no ambient motion. Hover states only.

## References
- R02 — the dark title card: one huge title, one line, one entry on a vignetted near-black field.
- R18 — warm near-black, gold used sparingly, vector line-art illustration (the lamp and scale are stroke drawings).
- R19 — wordmark spanning the width, one thin-outlined CTA under it.
- North Kingdom (Refero style) — the scene carries the colour; UI chrome stays neutral indigo.
- R05 (feel only) — warm glow breaking into deep blue night, double gold rules; here as lamp light, not a sunset.
- R08 / R10 / R12 / R14 / R15 — viewer rail + slim top bar, result anatomy (chapter left, page right, snippet with marked match, tiny page thumb), keyboard hint.
- R22 — search that belongs to the world: big underlined field, results under it on night.
- R21 — code-drawn generative covers per book.

## The two boards (BIG axis: light as a scene vs light as a diagram)
- **c1-lamp-pool**: light as a SCENE. One drawn lantern with a salt-crystal core casts a single pool onto a one-line (desktop) / three-line (phone) wordmark; fog drifts through. Covers are little lamp-lit scenes. Viewer: the page sits in a faint lamp pool. Includes the 6-book scale shelf.
- **c2-lamp-dline**: light as a DIAGRAM. A spectroscope view: the doublet as two huge vertical luminous bands cutting a stacked wordmark, gilt wavelength scales top and bottom. Covers are spectra (emission for the Core Rulebook, absorption for Hope & Fear). Viewer: page position shown on a spectral tick scale.

## Never (this direction)
Streetlight photo realism; cyberpunk neon; any third hue (no teal, no purple-pink gradient); gradient text; amber body text on amber; fog or grain over the book page; ambient motion in the viewer; monospace; Daggerheart logo, lettering, chevron frames, cards or art; stars, pentagrams, circles-as-wards (that is Direction B's world); footer or any unofficial/fan/copyright text.
