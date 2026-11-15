# e1-salt-mine-diorama — gate note (Stage 2 r2, Direction E Toy World)

**What it is:** the whole rendered toy diorama (`e1-diorama-wide` / `e1-diorama-tall`) is the hero; Sal stands on the dice tower and live salt falls from his cap onto a giant white Lilita One wordmark and a 3D ink keycap RESOURCES button.
**Axis value:** whole rendered world.
**Signature test:** swap in "Bean There Coffee": a salt-shaker monster salting the name of a coffee shop makes no sense. Fails = pass.
**Exclude check:** the hero is a rendered scene with a character doing the work. There are no frames, rules, rings or glyph circles; delete the typography and the world still makes the point.
**Strongest part:** phone first screen. Sal, the cap stream, the pile on HIGH, side cascades landing on both ends of the full-width keycap, all in one 390×844 view.
**Real risk:** the diorama is busy behind the wordmark (salt mine, carts, blob miners) and needs a heavy ink scrim. At 1440 the bottom-left reads moody-purple rather than bright toy-world.

**Images, honest notes**
- The images differ from spec.json. In the wide image Sal stands upright (not tipping), and there is no flat tablecloth area for the title (the salt mine is there). The tall image has no flat middle band either. I followed the images: wordmark over the lower area with a scrim.
- Measured emitter (cap pour holes): wide 58.2% / 10.4%, tall 50.6% / 12% (the spec hints were 52/26 and 50/20). Live salt falls from the holes over Sal's face and down the dice. Sal is upright, so this reads as an overflowing shaker rather than a tipped pour.
- Sal's look varies between images. Here and in the e2 renders he has a clear glass body with salt inside and the face printed on the glass. In `e-character-sheet` he has a solid **yellow face block** with green ear-rings, and in `e2-sal-wave` there is a yellow core inside the glass. Horns vary: cubes, crystals, and vinyl horns in `e2-sal-wave`. A final mascot needs one locked model sheet.
- Wiggle: Sal can't be separated from the render, so a tap nudges the whole tabletop (rotate −1.4° around Sal, 300 ms) like a bumped table. Reduced motion: no wiggle.
- Sample-shelf covers 3–6 are zoomed crops (miners and salt pile, angry dice face, cat pillow, surprised dice). Two come from `e-character-sheet`, whose white side shows in the crop.
- `e-cover-core` has a cream band at the top. I use it as a title band ("CORE RULEBOOK") on the small alt cover rather than cropping it.
- Viewer no-results state uses `e2-sal-wave` at 112 px (yellow core inside the glass). At that size it reads as a face, which is acceptable; the alternative is `e2-sal-pour`.

**Fonts:** Lilita One (wordmark, titles), Anton (section labels, keycap), Nunito (UI and body). All OFL, Google Fonts.
**Salt settings:** cell 4. maxGrains 6000 phone / 12000 desktop. Emitter `#cap` (positions above), rate 170/s phone and 280/s desktop, 2.6 s, spread 5. Prefill rain 520 phone / 1500 desktop. Tap 520. Solids: `.wordmark` glyphs and `.key .face` rect. Layout trick: the phone wordmark (≤ 88px) is narrower than the full-width keycap, and the desktop keycap sits beside line 1, so the button is not shadowed and catches salt. /resources has a drift-only engine (no emitter, no tap) that settles a light pile on each cover top.
**Detect:** fixed coral gradient ink contrast (4.3 → flat coral, 5.8:1) and title leading (1.05 → 1.15). Kept, with reasons:
- index: "white on #4fb3e8". The tagline sits on an ink scrim the tool can't see, and the wordmark has an ink stroke and extrusion.
- resources: "white on coral". This is the h1 "Resources" with an ink 0.055em stroke and extruded ink side (display size).
- resources: tight-leading 1.15. Two-line display titles.
- viewer: dark-glow. Offset elevation shadows (0 26px 40px) in the ink palette under the page, not zero-offset halos.
- viewer: cramped-padding. Tab underline and phone frame are flush on purpose.
- viewer: "ink on ink-deep 1.2:1". Most likely the off-screen skip link, which has its own white background; I could not find visible ink-on-ink text.
