# f1-wyrm-eclipse — gate note, v2 (steer 1, DH13)

v1 is frozen at `../f1-wyrm-eclipse-v1-frozen/`. Side by side: `gate/steer-1/home-vs-v1.png`, `gate/steer-1/resources-vs-v1.png` (1440 and 390).

**What it is now:** a dark indigo sky full of suspended salt grains with HIGH SODIUM GAMING glowing gold in the middle. Hover (or drag a finger) and the grains you touch fall and pile up along the bottom of the screen and on top of the DAGGERHEART RESOURCES pill. /resources is the v1 page with an ornate gilded salt cellar glowing top right where the wyrm head was.

## Changes from v1 (Kaden, DH13)
1. **Wyrm out everywhere.** Home: wyrm image, heart-orb and pour point removed. /resources: the wyrm/hatchling peek removed; sample-shelf covers that were wyrm crops (4 of 6) now use `g-art-hourglass`, `g-art-crystal-cluster`, `f-cover-core`, `f-cover-hope-fear`. Viewer: had no wyrm. `grep -i "wyrm|hatchling|f-character-sheet"` across the three pages and both stylesheets: 0 hits. (The folder id keeps its name so links and the manifest still work.)
2. **/resources:** unchanged layout, covers, type and colours. Top right: `../../imagery/G/g-art-salt-cellar.jpg`, screen-blended so its black disappears, a radial mask so it has no edge, and a glow of the heart gold `--gold` (#FFC861, F1's own token) behind it. The h1 is now "Daggerheart Resources"; at ≥ 900 px it is capped at 58% width so it wraps beside the art and never runs under it; on phone the art is smaller and sits above the heading. One-word swap: `resources.html?art=hourglass` or `?art=crystal` (renders: `resources-alt-hourglass-1440-first.png`, `resources-alt-crystal-1440-first.png`). The "Alt covers (ours)" strip stays: it sits below the books and does not fight the art.
3. **Home:** same font (Cinzel 900 chrome-to-gold wordmark) and colours. New hero: the salt field (below). A gentle gold glow stays behind the wordmark (where the orb was): a radial gradient, no object.
4. **Button:** "DAGGERHEART RESOURCES" (measured: one line at 390, 342×56 px; two balanced lines at 360 and 320, 68 px tall; no horizontal overflow at any of them). /resources h1 "Daggerheart Resources"; viewer back link "Daggerheart Resources" (desktop label and phone aria-label).
5. **Viewer:** only the back-link text changed.
6. New micro-copy: a small "Touch the salt" hint under the button; it fades in at 2.4 s and fades out the first time any grain is knocked loose. Hidden with reduced motion. (Not in the content pack; recorded as a Decision; delete it if Kaden wants zero extra words.)

## Salt (shared engine v2, `../_shared/salt-engine.js`)
- **Field:** grains suspended across the whole hero. Phone: density 0.0085/px², cap 2,800 (2,798 at 390×844). Desktop: cap 10,000. Sizes 0.5–1.6 px radius, mostly small (power curve), alpha 0.35–1; grains behind the wordmark, tagline, pill and hint are dimmed to 10% so the text stays clean.
- **Look:** every grain is a soft round sprite (bright core, off-white body, transparent edge), slightly squashed per grain, ~18% carry a faint gold glint (`--grain-glint` = the heart gold). No square pixels anywhere (v1 drew 2×2 pixel blocks).
- **Hover → fall:** pointer within 34 px (phone 30 px) knocks grains loose; they fall with gravity at their own size and join the pile grid (cell 3 px): they stack on the floor and on the pill's top edge (inset 14 px so it rests on the flat, not the rounded ends), and slide down slopes. Piled grains are not kicked back up by hover.
- **Touch:** a finger drag does what hover does (`touch-action: none` on the one-screen hero); a tap (not on the button) knocks loose a 64 px burst (108–119 grains in tests).
- **Performance** (headless Chromium, `design/tools/salt-proof-v2.js`, output `salt-proof.txt`): 390 and 1440, frame time median 16.7 ms and p95 16.7–16.8 ms both at rest and while ~700 grains fall. The field and the pile are cached layers; the pile redraws at most ~20×/s; the canvas CSS filter from v1 is gone. The loop pauses when the tab is hidden or the hero is offscreen.
- **Reduced motion:** static field plus a settled pile of 10% of the grains along the bottom (`salt-reduced-390.png`); no drift, no twinkle, no interaction, no hint.
- **Proof:** `salt-1.png` / `salt-1-1440.png` (field at rest), `salt-2*.png` (one sweep across the middle: a trail of falling grains), `salt-3*.png` (seven sweeps + settle: a pile along the bottom and on the pill), `salt.webm` (~7 s at 1440, four sweeps).

## Every moving element, one line each
- **Field drift** (3 px sway over 14 s): makes the salt feel suspended in air rather than printed on the page.
- **Twinkle** (18 on phone / 34 on desktop at a time, 0.9 s): the sparkle of salt crystals catching the light; it is what makes them read as salt, not dust.
- **Falling grains + pile:** the interaction Kaden asked for; the pile is the visible memory of what you touched.
- **Gold glow fade-in** (1.6 s once): the light comes up behind the name on load (carried over from v1).
- **Hint fade** in at 2.4 s, out on first touch: tells phone users the sky is touchable, then gets out of the way.
- **Pill hover lift** (1 px, 0.4 s): unchanged from v1.

## Gate checks
- **Signature test:** the page is now type + salt only, so this is the one to watch. With a coffee shop's name, a sky of falling salt that piles up under your finger still points at salt, not coffee, so it fails for the coffee shop and passes for High Sodium Gaming. It is weaker than v1, though: the salt carries the whole brand now that the creature is gone.
- **One point / busy check:** at rest the home screen is a calm starry sky with one glowing name and one button. Nothing moves except a slow drift and a few twinkles until touched.
- **Exclude check:** no frames, rules, rings or crusts. The page is a live salt simulation, not ornament. That is the interaction Kaden asked for (23:05 "Interactive salt on the screen?", 23:58 "a screen full of salt particles").
- **Strongest part:** the moment of touch. Grains drop out of the sky under the pointer and you watch the pile grow at the bottom; at rest it is quiet and premium.
- **Real risk:** without the wyrm, the home page leans on the salt alone. On a screenshot (not live) it can read as a generic starfield until someone touches it. The hint and the twinkles help, and the live page is the point.
- **Images:** salt cellar is the strongest of the three G pieces (ornate, warm, clearly salt). Hourglass is elegant but says "time" more than "salt". The crystal cluster is the weakest (a crystal flower with a gold band; reads as jewellery).

## Fonts
Cinzel 700/900, Space Grotesk 400/500/700 (both OFL, Google Fonts). Unchanged.

## Detect (`detect.json`, exit 2)
The same 21 findings as v1, no new ones; all kept, reasons below:
- `gradient-text` ×4: the chrome-to-gold wordmark Kaden approved ("love the font and colors"); flagged on resources and viewer because they share the stylesheet.
- `dark-glow` ×14: the heart-gold glow on the pill, covers and current thumbnail (F1's look; Kaden asked for "a glow of that yellow").
- `cramped-padding` ×2: the tab underline row and phone-screen frame (intentional edges).
- `flat-type-hierarchy` ×1: a false reading on resources; the h1 is 44–96 px.
- Fixed in this round: a faint radial ground gradient added on the home background in the first v2 pass (`radial-halo`), removed.
