# f2-hatchling-pour — gate note (Direction F, Glow: the Salt Wyrm)

**What it is:** an empty salt-star sky. A small Salt Wyrm hatchling hugs a crystal right above HIGH SODIUM GAMING and pours glowing salt that piles on the letters and the RESOURCES pill. Playing with the salt is the hero.

**Axis value:** the monster is a small character the visitor plays with.

**Signature test:** a crystal hatchling salting a coffee shop's name doesn't work. It fails, so the test passes.

**Exclude check:** a character and a live grain toy do the work. The sky is just ground, with no ornament.

**Strongest part:** the phone screen. The hatchling sits on top of "HIGH", the pour comes out of the bottom of its crystal, and the pile builds right under it. A swipe scatters grains across the name. It reads as one clear character moment.

**Real risk:**
- The hatchling is a 250x245 px crop of a 1024 image shown at 320 px on desktop, so it is slightly soft there. A dedicated hatchling render at around 1024 px would fix that.
- The desktop sky (f2-sky-wide) has a big crystal crown in the centre that competes with the hatchling. I quieted it with a night radial scrim, but it is still visible behind "HIGH SODIUM".

**Images:**
- f2-hatchling also contains a big adult wyrm. I crop to the source box x485 to 735, y615 to 860 (hatchling plus crystal only), blend with `mix-blend-mode: screen` (the black ground disappears) and fade the box edges with a soft elliptical mask (55% x 50%, centred on hatchling and crystal). The adult's coil fell in the crop's top-left corner and is faded out. The crop is applied in CSS (`width 409.6%; left -194%; top -251%`).
- For the blend to work, `.stack` has no z-index so it doesn't create its own stacking context.
- f2-sky-tall, the regenerated "heart-crystal", reads as an anatomical heart with a small silhouette on it. That is the weakest image here. On the phone it sits behind "SODIUM" under a night scrim, where it shows only as a faint glow. I would regenerate it as plain stars plus a soft gold glow.
- F cover bands are cropped in the alt-covers strip the same way as F1 (square tiles, `object-position: 50% 100%`).
- Resources: the same hatchling crop sits on the Core Rulebook cover's top edge, once and small.

**Fonts:** Cinzel 700/900 (OFL) and Space Grotesk 400/500/700 (OFL), from Google Fonts.

**Salt:**
- Same unchanged engine and `salt-glow.js` wrapper (colours come from tokens).
- Settings: cell 3, maxGrains 6000 on phone and 14000 on desktop, prefillMode `emitters`, prefill 350 on phone and 450 on desktop, pour 3 s.
- Emitter 1 is the crystal's bottom tip at 20.8% / 86% of the hatchling box. It moves with the hatchling's 6 px bob. Phone rate 170, spread 10; desktop rate 220, spread 14.
- Emitter 2 is a light drift onto the pill (same values as F1).
- Tap anywhere off the button pours again (`tap.grains` 500 on phone, 900 on desktop); the pointer scatters grains.
- The memo's pointer trail is not built (needs an engine change).

**Motion:** the sky "lights on" once (1.6 s) and the hatchling fades in, then bobs 6 px on a 3.4 s cycle. That bob is the only ongoing motion besides the salt, and it stops under reduced motion.

**Detect:** same profile as F1. The radial halo on resources is fixed. Kept, for the same reasons as F1: gradient-text (the wordmark metal), dark-glow (the memo's gold glow, with an offset on the pill and covers), and cramped-padding on the tab underline and screen frame.
