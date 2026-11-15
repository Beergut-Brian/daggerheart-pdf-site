---
name: design-direction
description: Turn whatever design input exists into a complete, approved visual direction and page designs before build. Three modes: notes and reference links only; a few approved page designs to extend to the rest; or a full Figma system. Use on every new site and redesign, before the builder starts, and whenever new pages need designing. Produces a style guide and coded page mockups for Kaden's approval.
---

# design-direction

The designer's output is not Figma. It is a coded style guide and static page mockups built from the design system, reviewed in a browser. Approval happens in two checkpoints: direction, then pages.

## Step 0: pick the mode

| Input in the brief | Mode |
| --- | --- |
| Notes, adjectives, reference site links, screenshots, brand assets | **A: from references** |
| Some pages designed and approved (Figma frames or exports), the rest not | **B: extend approved pages** |
| A full Figma design system and all page frames | **C: from Figma** (go straight to `design-system`) |

## Mode A: from references

1. **Reference inventory** (`design/references.md`): for each reference Kaden gave, what specifically to take from it (layout density, type pairing, color mood, photography style, motion) and what to ignore. Screenshots saved in `design/refs/`. Quote Kaden's notes verbatim and interpret each one in a line.
2. **Direction proposals**: two or three directions, each as a one-screen "style tile" page: palette with roles, type pairing, button and card styles, a hero sample, photography treatment, and a sentence on the feeling. Built with tokens so the chosen one becomes the system without rework. Avoid resemblance to any single reference or competitor; references inform, they are not copied.
3. **Checkpoint 1**: Blocked entry with the preview URL: "Pick a direction or mix." Wait.
4. **System**: turn the chosen direction into `tokens.json` and components per `design-system`.
5. **Page designs**: continue at "Page mockups" below.

## Mode B: extend approved pages

1. **Extract the system** from the approved pages: measure spacing, type sizes, colors, radii, grid, component variants, section patterns. Write `design/extracted-system.md` with each value and where it was observed. Build `tokens.json` from it. Where the approved pages are inconsistent, pick the dominant value and log it as a Decision.
2. **Pattern library**: list every section pattern the approved pages use (hero with form, three-column services, testimonial band, FAQ accordion, CTA strip) as reusable sections.
3. **Rebuild the approved pages** first from tokens and components, and compare side by side with the originals. Differences are bugs in the system; fix the system until the rebuilds match. This proves the system before new pages exist.
4. **Design the remaining pages** from the page briefs in `strategy.md` (or `design.md`), using existing patterns first. A new pattern is allowed only when no existing one does the section's job; log it.
5. **Checkpoint**: Blocked entry with the preview: "Approved pages rebuilt; new pages designed in the same system. Review." Wait.

## Page mockups (both modes)

For each page in the site map: a static mockup route at `/design/<page>` built from components, with real copy where it exists and clearly marked placeholder copy where it does not, at mobile and desktop. Record each page's section list in `design.md`. Checkpoint 2: Blocked entry: "Pages ready for approval." Builder starts only on approved pages.

## Rules

- Mobile first; one primary action per page; trust elements near every CTA.
- Nothing hard-coded; mockups use the same tokens and components the site will.
- Every color pair checked for contrast and listed.
- Record every design decision Kaden did not specify in status.md Decisions.
- Never reproduce a competitor's or reference's layout, imagery, or copy.

## Done when

Checkpoints passed; `design.md` has every page's sections; tokens and components exist; mockups render at 390px and 1280px.
