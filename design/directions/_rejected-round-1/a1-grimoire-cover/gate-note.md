# a1-grimoire-cover — gate note

- **What it is:** the landing is the front cover of a salt-cured grimoire. It has oxblood tooled leather (SVG turbulence and diffuse lighting), a spine with raised bands, gilt double rules, stepped brass corner fittings, a gilt-stamped HIGH SODIUM GAMING, and a crust of cubic hopper-halite crystals creeping in from the corners and edges.
- **Variation axis:** signature placement = **frame around the hero (cover)**.
- **Signature test: pass.** Put a coffee shop's name on it and it still reads as a salt-encrusted spellbook. The leather, gilt and cubic salt only make sense for "High Sodium" plus fantasy.
- **Strongest part:** the 390 first screen. A tall book cover fills the phone, the wordmark is stacked and tracked to an inscription, and the crust stays at the corners and edges and never touches the words (the lockup is masked out). The 6-book sample shelf shows the system scales: one cover component in four leathers, all with corner crust.
- **Real risk:** the crystals can read as sugar cubes or dice rather than salt when they are big and isolated. The hopper steps and gold edge light help; in build, keep crystals smaller and denser (more "crust", fewer "cubes"). The leather texture filter costs paint time on the landing, so it should be rasterised once or kept to one element in build.
- **Fonts:** Cinzel Decorative 700/900, IM Fell English (italic) and IM Fell English SC, Alegreya Sans 400/500/700. All SIL OFL 1.1 via Google Fonts.
- **Detect:** fixed the wide tracking on the book meta line (0.08em changed to 0.02em). The remaining findings are kept on purpose:
  - `gradient-text` ×5: the gilt metallic fill on the wordmark and cover titles. This is the brief's own device (R21 / Atlas Card metallic clipped wordmark, re-tinted gold). The text is real and `color` falls back to gilt.
  - `cramped-padding` ×3: the leather, spine and crust layers on the tome and covers are absolutely positioned art layers that sit flush on purpose. Real content has padding.
  - `flat-type-hierarchy` ×2: a static-parse artefact (it reads clamp()/var() sizes as 16px). Rendered sizes are h1 Resources 104px, title 36px, body 16px. The viewer chrome is deliberately quiet (DH9).
- **Notes:** the cover lettering breaks a Cinzel Decorative "OO" ligature with a ZWNJ (`Rulebo&zwnj;ok`), because the ligature is in the face and can't be turned off by CSS. Build should do the same or set cover titles in Cinzel.
