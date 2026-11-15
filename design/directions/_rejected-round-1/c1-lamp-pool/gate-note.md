# c1-lamp-pool — gate note (Direction C, Sodium Lamp)
- What it is: one drawn lantern with a glowing salt-crystal core hangs over a full-width blackletter wordmark and casts a single amber pool on it; fog drifts and grain covers everything.
- Variation axis value: light as a SCENE (lamp pool).
- Signature test: PASS. A coffee shop could hang a lamp, but not one with a halite cube (NaCl) for a bulb, lighting its own sodium D-line double rule, in a gilded blackletter. The resources covers are small lamp-lit scenes and the viewer page sits in the same pool.
- Strongest part: the landing at 1440. The wordmark spans the width, and only the middle letters ("SODIUM") are fully lit; the outer letters fall back to deep amber (a masked lit copy over an unlit copy, no gradient text).
- Real risk: blackletter capitals are slower to read than a roman face ("HIGH" and "GAMING" take a beat). The fallback is Grenze, the roman/blackletter hybrid from the same family. The cone also reads a little "streetlight"; the lantern line-art and the gold keep it on the fantasy side.
- Fonts: Grenze Gotisch 800 (wordmark, HSG mark), Marcellus SC (headings, titles, button), Chakra Petch (UI). All SIL OFL 1.1, Google Fonts with display=swap.
- 6-book scale state: below the two real books on resources.html, captioned "Sample shelf: future titles". It is 6 across on desktop and 2 across on phone, and the long title wraps cleanly.
- Detect, fixed: wide tracking on body text (the shared tracking token went from 0.12em to 0.05em). Button contrast flag (the rising fill is now a ::before scale and no longer a background gradient).
- Detect, kept: radial-halo on index.html. The lamp pool is the concept itself: the light source is drawn, and the pool falls from it. Low-contrast ":hover 1.0:1" on index.html is a false positive: on hover the amber ::before fill rises behind the ink-950 label (11.2:1), and the detector cannot see pseudo-element fills.
