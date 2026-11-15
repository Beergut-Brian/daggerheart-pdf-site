# Direction B — The Salt Circle   (Recommended: yes, as the boldest single image)

## Idea
The folk ward: a ring of poured salt drawn on the table keeps the game safe. The landing is that ring. You cross its gate (RESOURCES) to get in. It is one image, one point per screen.

## Signature (only HSG could own it)
**Poured salt, not ink.** The ring is made of hundreds of tiny cubic halite grains (salt's real crystal shape). Their radius is jittered, so the edge looks poured by hand, thick in the middle and thinning out at the ends of the gate. Between the grains sit gilt glyphs we drew ourselves, all playful table objects: a halite cube, a salt shaker, a die face, a spiral, a crescent-and-dot, a pour wave, a ringed grain, an hourglass. There are no stars, pentagrams, real sigils or runes, so the glyphs read as "our table" and never as occult. Replace the wordmark with a coffee shop's name and the result would make no sense, because nobody else draws a protective salt circle around their name.

## How the hero art works (code only)
- One inline SVG (`viewBox` 1000 or 400), built at load by `salt.js` from a seeded PRNG, so it renders the same every time. The builder can precompute it at build time instead, since the output is static geometry.
- Grains: each is a 4-point polygon, a slightly skewed square at a random rotation and 2–5.5 units across. Radius = ring r + a near-Gaussian jitter. All grains go into **three `<path>` elements** (bright, mid, dim salt) plus one gilt path, so roughly 1,400 grains cost 4 DOM nodes. Stray grains scatter outside the band.
- The gate is an angular gap. Grain density tapers near the gap edges the way a pour runs out.
- The pour: a `<mask>` holding one wide circle stroke, `pathLength=100`, animates `stroke-dashoffset` 100→0. It starts at one side of the gate and runs all the way round to the other.
- Glyphs are `<symbol>` + `<use>`, 1.6-unit gilt strokes, set on the ring's centre line in windows where grains are cleared. Two gilt hairline arcs (inner and outer, broken at the gate) give a thin double-rule feel.
- Field: SVG `feTurbulence` grain overlay at 7% (inline filter, no bitmap) and a radial "brine" vignette, faint verdigris inside the ring and warm near-black outside.

## Type (all SIL OFL 1.1, Google Fonts)
- **Cinzel Decorative 900**: wordmark (h1) and page titles. It has the Roman-inscription, gilded-fantasy spirit without copying Daggerheart's lettering.
- **Cinzel 500–700**: small-caps labels, the bracketed `{ RESOURCES }` button, chapter names.
- **Alegreya Sans 400/500/700**: UI, intro lines, search snippets. It is warm and humanist and easy to read on a phone at the table.
- **Swap:** I replaced Pirata One with Cinzel. Pirata's blackletter fights Cinzel's Roman caps and reads "pirate", which pulls the ward toward costume. Cinzel keeps one family voice from the wordmark down to the labels.

## Palette (hex · role)
| Token | Hex | Role |
| --- | --- | --- |
| night | #0C0B10 | page ground (warm near-black) |
| night-1 | #15141B | raised chrome: viewer bars, rail, sheet |
| night-2 | #1F1D27 | focused row, hover, field fill |
| brine | #15282A | inner-ring vignette glow (decor only) |
| salt | #F0EBE1 | grains, primary text on night |
| salt-2 | #BDB5A8 | secondary text |
| salt-3 | #958D80 | meta, page counts (≥4.5:1 on night-1) |
| gilt | #D9AF5F | glyphs, rules, active markers, button text |
| gilt-hi | #F4DA97 | focus ring, wordmark highlight band |
| gilt-lo | #8F6C2E | wordmark shadow band, hairlines (decor) |
| hairline | #3A3326 | 1px rules on night (decor) |
| page | #F6F0E3 | book page: the brightest surface |
| page-ink | #2A2520 | text on page / covers' light panels |
| page-line | #CFC6B4 | placeholder text lines (decor) |
| mark | #EFC85A | search-match highlight on page |
| cover-teal | #183A3B / cover-ember #3E1F1C | book cover grounds |

## Motion (each element · reason · reduced-motion end state)
1. **Ring pour** (mask dashoffset, 1.4 s, ease-out). The ward is being made in front of you, which tells the whole story in one move. Reduced motion: the ring is complete.
2. **Glyph fade-in** (opacity + 2px rise, staggered, done by 1.9 s). The ward "activates" after the salt is down. Reduced motion: glyphs shown.
3. **Breath** (scale 1→1.012, 14 s, ease-in-out, starts at 2 s; ring group only). Shows the ward is alive without pulling the eye. Reduced motion: none.
4. **Button hover** (brackets step out 4px, fill to night-2, 180 ms). Signals "cross here". Reduced motion: colour change only.
5. **Viewer loading ring** (a small grain ring rotating while a thumbnail draws). The same ward, used as the spinner. Reduced motion: static ring plus the page number.
6. Board 2 only: **field settle** (strewn grains fade in over 0.6 s before the pour). Reduced motion: shown.
No bounce. Everything finishes within 2 s.

## References (what I borrow)
- R02: the title card. A near-black field, one centred title and one entry, with a deep vignette.
- R01: the centred emblem lockup. The ring is the emblem and the wordmark sits inside it.
- R19: a wordmark spanning the width. Board 2 fits it edge to edge, stacked 3 lines on a phone.
- Franco Maria Ricci style: the bracketed small-caps `{ RESOURCES }` action, gold kept as a lettering accent, 1px shared rules on the shelf.
- R21: the clipped metallic fill on the giant title, re-tinted gold. Kept to three hard bands so it reads as gilt and not as a decorative gradient.
- R08 / R10 / R14 / R16: viewer anatomy (thumbnail rail, slim top bar, result rows with chapter + page + snippet, bottom sheet with tabs).
- R07: covers carry the colour on the dark shelf.
- R05: feel only. Gilded, ornamental, dusk-dark. No lettering, frames or art.

## The two boards: the axis is ring scale and role
- **b1-circle-hero, enclosure.** The ring is the whole hero. A giant ward fills the viewport (wider than the screen on phones, cropped at the sides) and encloses the stacked wordmark. RESOURCES sits in the gate at the bottom of the ring. Resources also shows the 6-book scale state.
- **b2-circle-gate, threshold.** The wordmark is huge and free, spanning the width at the top. The ring is small and tight, drawn around the RESOURCES button, and the button crosses it like a lintel through the gate. The rest of the hero is a quiet salt-strewn field.

## Carry-through (quiet)
- Resources: the selected or hovered cover gets a salt-grain outline (a dotted grain stroke). Each cover has its own ring motif: Core is a full ward, Hope & Fear is a ring split into salt and gilt halves.
- Viewer: the current thumbnail gets a gilt outline and a tiny grain ring around its page number. Thumbnails still drawing show the rotating grain ring. The HSG mark is a mini ward.

## Never
Pentagrams, stars, real sigils or runic alphabets. Frost, snow or winter reads. The Daggerheart logo, lettering, chevron frames, card frames or art. Purple-pink gradients, blobs, bounce easing, nested cards. A footer, or any unofficial/fan/trademark/copyright text. Motion that delays the button. Chrome brighter than the book page.
