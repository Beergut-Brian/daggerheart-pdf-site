# c2-lamp-dline — gate note (Direction C, Sodium Lamp)
- What it is: a spectroscope view. Sodium's D-line doublet (589.0 / 589.6 nm) runs as two huge glowing vertical bands that cut a stacked blackletter wordmark, with gilt wavelength scales along the top and bottom.
- Variation axis value: light as a DIAGRAM (spectral D-line bands).
- Signature test: PASS. The art is the real spectral fingerprint of sodium, which is half of salt. With a coffee shop's name on it, the scale labelled 585–594 nm and "D₂ D₁" would make no sense.
- Strongest part: the cut. The bands are screen-blended over the letters, so the wordmark looks sliced by light. The doublet then carries quietly through the rest of the site: the cover frames, the active thumbnail ring, the HSG mark in the viewer, and the viewer's page-position scale (chapter starts as gold ticks, the current page as a doublet marker).
- Real risk: this is the most "techy" board and could tip toward sci-fi; the blackletter and the gold are doing the fantasy work. Phone also has a lot of empty band height under the button (it is intentional, but it is the quietest part of the screen).
- Fonts: Grenze Gotisch 800, Marcellus SC, Chakra Petch (tabular numerals on the scales). All SIL OFL 1.1.
- Covers: Core Rulebook is an emission spectrum (bright lines on night). Hope & Fear is an absorption spectrum (dark Fraunhofer D lines on an amber continuum), the Hope/Fear inversion. No sample shelf on this board, as briefed.
- Detect, fixed: wide tracking (token went to 0.05em; the phone tagline uses 0.01em), and the button gradient was replaced with a ::before fill.
- Detect, kept: undersized "SODIUM" at 9.92px is a false positive. The detector does not resolve the clamp()/vw wordmark size (rendered "SODIUM" is about 53px on phone and 95px on desktop). Hover 1.0:1 is a false positive for the same pseudo-element reason as c1.
