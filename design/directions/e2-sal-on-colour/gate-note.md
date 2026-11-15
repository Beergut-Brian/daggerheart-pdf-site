# e2-sal-on-colour — gate note (Stage 2 r2, Direction E Toy World)

**What it is:** no scene. Sal (`e2-sal-pour`) jumps out of one big sunflower panel, and the live salt continues his painted stream onto the white Lilita One wordmark and the ink keycap. /resources is two bold colour panels (yellow Core, blue Hope & Fear with Sal reading).
**Axis value:** character on bold colour.
**Signature test:** "Bean There Coffee" under a salt-shaker monster pouring salt on it reads wrong. Fails = pass.
**Exclude check:** a character carries every screen. Flat colour panels hold the character (ref 03); none of them is ornament around type.
**Strongest part:** the landing. The painted stream and the live grains meet seamlessly, and Sal jumping and pouring is the one point of the page. Bold, simple, fun.
**Real risk:** without the world it is closer to a generic mascot landing; the brand lives entirely in Sal. Also, the H&F panel's `e2-sal-reading` still carries scene edges (coral hills, dice, carts), so that panel is not pure flat colour.

**Images, honest notes**
- **Panel colour matched to the JPG, not #FFC93C.** `e2-sal-pour`'s background is a diagonal gradient: sampled #D5A22F top-left, #E7BC48 centre, #F9D768 bottom-right. The hero is `linear-gradient(135deg, #D9A633, #E8BC47, #F7D463)` (tokens `--c-sun-deep/mid/light`), and the image edges are feathered (alpha mask, not a subject cut-out) so it melts in. No seam is visible at 390 or 1440. The flat #FFC93C token stays for the Core panel, which holds no image.
- **`e2-sal-reading` blue matched:** the sky samples #6CC3D9 to #7CCEE3 (not #4FB3E8), so the panel is `--c-sky-read-top` #6EC4DA with the image's top feathered into it.
- **The pour comes from the base, not the cap.** In `e2-sal-pour` the salt leaves through the jar's bottom between the legs (Sal is upright-ish, not upside-down as the spec asked). The emitter is anchored where the painted stream is (55.2% / 78%) so the live salt continues it; a cap emitter would look wrong. The painted floor pile is masked off under the wordmark.
- Sal's look varies between images: glass body with printed face (pour, reading) vs a yellow face block in `e-character-sheet` and a yellow core in `e2-sal-wave`. A model sheet is needed before build.
- `e2-sal-wave` (yellow core) is used only at 112 px in the viewer's no-results state, on its own coral tile (#FF796E, sampled). I chose it over `e2-sal-pour` because the wave says "nothing here" and the core reads as a face at that size.
- The wiggle is real here: tapping rotates Sal ±6° around his pour point for 300 ms. Reduced motion: no wiggle, static settled pile.

**Fonts:** Lilita One, Anton, Nunito (OFL, Google Fonts).
**Salt settings:** cell 4. maxGrains 6000 phone / 12000 desktop. Emitter `#cap` at e2-sal-pour 55.2% / 78%, rate 170/s phone and 280/s desktop, 2.6 s, spread 5. Prefill rain 520 / 1500. Tap 520. Solids: `.wordmark` glyphs and `.key .face`. The phone keycap is wider than the wordmark so its ends catch the cascades; the desktop keycap sits right of line 1.
**Detect:** fixed the cream page background (the E2 /resources page is now salt white, which is also ref 03's white page) and title leading. Kept, with reasons:
- viewer: dark-glow. Offset ink elevation shadows, not halos.
- viewer: cramped-padding. Tab underline and phone frame are flush on purpose.
- viewer: "ink on ink-deep". Likely the off-screen skip link with its own white background.
