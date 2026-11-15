# f1-wyrm-eclipse — gate note (Direction F, Glow: the Salt Wyrm)

**What it is:** the huge crystal Salt Wyrm fills the night sky, its gold heart-orb rises behind HIGH SODIUM GAMING, and live glowing salt pours from its mouth onto the letters and the RESOURCES pill.

**Axis value:** the monster is a huge backdrop glow (it is the whole sky, not a character you play with).

**Signature test:** with a coffee shop's name, a salt-crystal dragon spitting salt onto the sign makes no sense. It fails, so the test passes.

**Exclude check:** a painted character and a live simulation carry the page. There are no frames, rules, rings or crusts, and deleting every CSS flourish leaves the same point.

**Strongest part:** desktop first screen. The wyrm's ring frames the name, the head sits right above "SODIUM" and the pile grows straight under its mouth. On the phone, the pour falls through the glowing orb onto HIGH.

**Real risk:**
- On desktop the head sits at the orb's height (image: mouth 70% x / 52% y, orb 50% / 47.5%), so the wordmark sits *below* the orb rather than exactly over it. The orb crowns the name like a rising sun instead of backlighting the letters. Covering the orb with the type would have hidden the head.
- The pile at the mouth reads as "spitting". That is fun, but Kaden may see it as gross.
- Cinzel 900 at 132 px is large; on short laptop screens (≤700 px tall) the button gets close to the bottom edge.

**Images:**
- f1-wyrm-tall is the cropped 768x1075 version. It is height-fitted on phones (sides cropped, wyrm centred), so the crop does not show.
- The wide image is strong.
- Resources peek: the adult wyrm's head and neck are cropped from f2-hatchling, screen-blended, with the edges faded out.
- F covers have dark top bands. In the alt-covers strip they are square tiles with `object-position: 50% 100%`, which removes the top 25%. That is enough for both bands (20.5% and 17.6%).
- Sample-shelf covers 3 to 6 are crops of f-character-sheet and f1-wyrm-wide with the title set over a night gradient.

**Fonts:** Cinzel 700/900 (OFL) for the wordmark and headings; Space Grotesk 400/500/700 (OFL) for UI and body. Both load from Google Fonts.

**Salt:**
- The shared engine is unchanged. `salt-glow.js` is a thin wrapper that reads the grain colours from the CSS tokens (`--salt-1..4`) and adds a second emitter.
- Settings: cell 3, maxGrains 6000 on phone and 14000 on desktop. prefillMode `emitters`, prefill 450 on both (a light dusting at the pour points). Pour lasts 2.8 s.
- Emitter 1 is the mouth, anchored in % on the art: phone 49.9% / 33%, rate 150, spread 12; desktop 70.2% / 52.4%, rate 170, spread 18.
- Emitter 2 is a light drift, 0.85 to 1.1 button heights above the pill (rate 45 to 60, spread 56 to 62 cells). I added it because grains from the mouth cannot reach the centred button.
- Glow comes from CSS `drop-shadow` on the canvas. Tap shakes; pointer scatters; reduced motion shows the engine's static pile.
- Not built: the memo's "pointer leaves a short-lived trail of grains". The engine has no API for it, and I did not edit the engine.

**Motion:** "lights on" once (the art goes from brightness 0.45 to 1 and the orb glow scales in, 1.6 s, expo-out). After that, only the salt moves. Reduced motion shows the lit end state.

**Detect:**
- Fixed: the radial halo behind the resources page.
- Kept:
  - gradient-text on the wordmark (the memo's chrome-to-gold metal, ref 02). Resources and viewer are only flagged because they share the stylesheet.
  - dark-glow on the pill, the covers and the current thumbnail. These are the memo's gold glow, and the cover and pill shadows have a y-offset.
  - cramped-padding on the tab underline row and the phone-screen frame. Both are intentional edges.
  - flat-type-hierarchy on resources, which looks like a false reading: the h1 is 44 to 96 px.
