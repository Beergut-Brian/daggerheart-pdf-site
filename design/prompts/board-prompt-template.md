# Board prompt template (v2, Stitch mode) — replaces the v1 per-aesthetic prompt

<!-- Built from the APPROVED memo (direction-memos/_chosen.json, status approved), never from
     DESIGN.md v0. Run memo-gate.py first. Everything above "This variation:" is identical in
     all six prompts; only the variation block differs, and no two boards share the same axis
     combination (record the axes in directions/_manifest.json "variation_axes", plus "memo_id"). -->

```
Design a homepage hero + one content section for <project>: <one-line purpose from memo>.
Direction: <memo "idea in one sentence">. <memo "why this fits", condensed>.
Typography: display <font>, body <font>; <memo scale note>.
Palette: use exactly <hex list from ACSS / the site's tokens>; <memo color treatment>.
Imagery: <memo imagery rule>.
Motion: <memo motion rule>.
Reference cues: <2–3 "borrow" notes from the memo's references, written as instructions>.

This variation: Layout <axis value>. Type scale <axis value>. Density <axis value>.
Content section as <axis value>.

Never: <memo never-list> + nested cards, gradients, rounded-everything, generic icon-in-circle rows, centered three-column feature grid, placeholder blob shapes.
Output: responsive web, 1440 and 390 widths.
```

Variation axes (pick 2–3 per board): layout grid (symmetric / asymmetric split, single / two
column, full-bleed / contained) · type scale aggressiveness · density (sparse / balanced / dense) ·
imagery treatment (photo-led / illustration / typographic only / mixed) · content-section
composition (cards, list, editorial columns, map-led, …) · motion presence (none / subtle /
expressive, within the memo's motion rule).
