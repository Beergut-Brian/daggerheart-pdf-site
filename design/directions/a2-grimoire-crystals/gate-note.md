# a2-grimoire-crystals — gate note

- **What it is:** no frame. An open oxblood/ink-wash field (feTurbulence gold wash, warm candle glow, vignette) where cubic halite clusters grow *through* the gilt wordmark. The H, O, M, A and final G are partly turned to salt: their fill is gilt bleeding into faceted salt, and a crystal cluster bursts from each, with some cubes behind the letter and some in front.
- **Variation axis:** signature placement = **inside the letterforms (crystals)**.
- **Signature test: pass.** The type itself is salted. Swap in a coffee shop's name and the crystallised letters plus the gilt and leather night still say "High Sodium" fantasy. It is less of a world than a1 and more of a logo.
- **Strongest part:** desktop first screen. The wordmark is the whole artwork; the crystals grow out of the G and A down toward the tagline and out of the H and M upward, and the eye stays on the name and the RESOURCES plate. Carried on to resources (crystals grow from the first letter of each cover title) and the viewer (a crystal sits on the current page number).
- **Real risk:** crystals that overlap letters can hurt legibility at 390, and the crystal positions depend on measured glyph boxes (JS after fonts load). In build, precompute the cluster offsets per breakpoint or anchor them to the glyph spans as here. The field is quieter than a1, so it may read as "less" to Kaden, who rejects boring first. There is a lot of empty field below the button at 390.
- **Fonts:** Cinzel Decorative 700/900, IM Fell English (italic) and IM Fell English SC, Alegreya Sans 400/500/700. All SIL OFL 1.1 via Google Fonts.
- **Detect:** fixed the wide tracking on the book meta line. The remaining findings are kept on purpose:
  - `gradient-text` ×12: the gilt and salt metallic fill on the wordmark, the crystallised letters and the cover titles. This is the direction's core device (R21 / Atlas Card); the text is real and `color` falls back to gilt.
  - `cramped-padding` ×2: the cover art layers sit flush on purpose.
  - `flat-type-hierarchy` ×1: the viewer chrome is quiet on purpose (DH9); this is a static-parse artefact.
- **Notes:** this board has no 6-book shelf (board 1 only, per the brief). Same ZWNJ fix for the Cinzel "OO" ligature on the cover.
