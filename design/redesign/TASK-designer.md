# Designer task: redesign boards (2026-11-17)

Job root: `/srv/ai-hub/jobs/daggerheart-site-2026-10-23` (call it J). Work ONLY in `J/design/redesign/`.
Do not touch `J/site/app`, `J/site/public` or any older design folder. No build, push or deploy. Do not message anyone.

## Kaden's words (verbatim)
"New daggerheart site direction. Use this reference as the design direction and go ahead with a redesign. No more salt stuff. Use the other image either as the hero, or as a reference for a hero"

## Inputs: open both images and look before writing anything
1. `J/design/references/redesign-2026-11-17/01-direction-reference.png`: THE direction. Cinematic near-black page; one full-bleed dark moody photo is the hero, edges fading to near-black (#0d0d0d-ish), left side heavily darkened for copy; floating LIGHT pill nav at top (white pill, ~52px tall, radius full, logo left, plain grey text links ~15px, divider) with small round controls right OUTSIDE the pill; hero copy left-aligned around 15% from the left and 33–66% down: a small monospace uppercase tag pill (dark fill, 1px grey border, small dot, wide tracking, ~11px), a large tight grotesque headline (~64–72px at 1440, weight ~500, letter-spacing ~-0.03em, line-height ~1.05) whose first line is dim grey (~#9a9a9a) and the rest bright white; one short muted sub-line (~17px, grey ~#b5b5b5); an outlined CTA (1px light border, radius ~10px, dark fill) with its icon in its own white square (~64px, radius ~6px) inside the left of the button, label to the right. Restraint: almost no chrome, image carries the mood, subtle sparkle.
2. `J/design/redesign/hero-campfire-original.png` (2912x1632, Kaden's hero; keep it untouched). Top-down aerial campfire in a forest clearing at night, embers rising, blue smoke, teal-green canopy. The fire is at about x 50%, y 60% of the image; the smoke/ember plume rises above it to ~x 52%, y 20%; the left third is dark canopy. Make web-sized versions (e.g. 2400w and 1200w AVIF/WebP/JPEG via sharp: `require('/srv/ai-hub/jobs/daggerheart-site-2026-10-23/site/node_modules/sharp')`) in `redesign/img/`. On 390 the fire MUST stay visible (use object-position / a separate portrait crop so the fire sits in the lower-middle with copy beneath or above it, not on top of it).
3. What the site does: read `J/brief.md`, `J/design/DESIGN.md` (v0; its salt/gilded/monster parts are now void) and look at the live screens in `J/review/build-1/` (home, resources, viewer desktop search/hit/chapters, phone reading/sheets/search). Live code for behaviour reference: `J/site/app/` (read only). Real covers: `J/site/public/covers/core-rulebook.webp`, `hope-and-fear.webp` (copy into redesign/img/). Book data: `J/site/app/books.ts`.

## Fixed (carries over)
- Pages: `/` landing, `/resources` picker ("Daggerheart Resources"), `/resources/<slug>` viewer (search with hits and snippets, chapters from the outline, page thumbnails, phone reading view with bottom sheets). Visual redesign only.
- Name "High Sodium Gaming" (it is the logo in the nav pill: a wordmark, no Daggerheart art/logo/frames). CTA / section label "Daggerheart Resources".
- No footer; no "unofficial", fan, trademark or copyright text anywhere.
- Viewer: the PDF page is the brightest thing on screen; chrome quiet.
- Use only existing copy from the live site / brief plus the tagline below. Nav links: keep it honest; the site only has Home and Daggerheart Resources (and the books). Do not invent features, pages or marketing copy. Small right-side controls only if they map to something real (e.g. search on viewer); otherwise leave them out and note it.

## Goes ("No more salt stuff")
No salt engine, particles, piles, crystals, salt monster, salt imagery, or the word "salt" in copy. The old tagline "Rules, close at hand. Salt to taste." keeps "Rules, close at hand." (or a variant) and loses its salt half. Propose 2–3 replacement lines in the reference's tone (short, calm, two-tone headline-friendly; campfire/table feel is fair game), your pick first. The old F1 look (wyrm, eclipse, glowing yellow, gilded) is not a constraint and should not leak in.

## Deliver in `J/design/redesign/`
Self-contained HTML boards (relative paths only, shared `redesign/shared/` css/fonts ok):
1. `home-a/index.html`: landing, Kaden's image as full-bleed hero in the reference's structure: pill nav, tag pill (e.g. "• DAGGERHEART RESOURCES" or the book count; your call, real facts only), two-tone headline (dim first line, bright rest), one sub-line, outlined CTA with icon-in-white-square → "Daggerheart Resources". Edge fade + left darkening like the reference.
2. `home-b/index.html`: same direction, ONE big difference worth comparing. Recommended axis: headline centred over/above the fire with the plume as the vertical axis vs home-a's bottom-left. Name the axis.
3. `resources/index.html`: picker in the same language: dark, pill nav, the two real covers as the visual objects (big, with quiet title/meta), restraint. Show it holds 1, 2, and ~6 books (a small state strip or a second section labelled as a state, using placeholders for the extra 4 that are clearly sample states; fine to do 2 books in the main render and note the 6 state).
4. `viewer/index.html` (desktop: search open with hits + snippets, chapter list, page as brightest element) and `viewer/phone.html` (390 phone reading view, with one sheet visible, e.g. search or chapters). Use a real-looking page: a light page image rendered in HTML/CSS with real text from the brief context or a lorem-free plausible rules excerpt is fine; do NOT use Daggerheart page art.
Fonts: free OFL grotesque close to the reference headline face (a neo-grotesk like Inter Tight, Geist, Schibsted Grotesk or similar, your call, say why) and a mono for the tag (Geist Mono / JetBrains Mono / IBM Plex Mono). Self-host woff2 in `redesign/shared/fonts/` (get them from npm `@fontsource/*` packages installed into `/tmp/fonts-npm`, not from a CDN at runtime).
Tokens: put colours/sizes/spacing in CSS custom properties in one shared `tokens.css`; page CSS uses the variables (it is what the builder will port).
Motion: only if it lifts the design. Obvious candidate: a slow ember drift up the plume (sparse, small, warm, like the reference's sparkle) on home. If used: canvas or CSS, cheap, pauses offscreen; `prefers-reduced-motion` gets the still frame. One line of justification in GATE.md.

## Renders (`J/design/redesign/renders/`)
Renderer: playwright-core from `J/site/node_modules/playwright-core` with executablePath `/ms-playwright/chromium-1248/chrome-linux64/chrome`, args `--no-sandbox`. (See `J/design/tools/render-board.js` for the pattern.) Wait for fonts + 2.5 s.
For each board: `<board>-1440.png` (full page, viewport 1440x900, scale 1) and `<board>-390.png` (full page, viewport 390x844, scale 2). Viewer: desktop file at 1440, phone file at 390 (also render phone.html at 390 only, and index.html at 1440 only). Also `home-a-1440-first.png` (viewport only).
Plus `renders/ref-vs-home-a.png`: an HTML page placing the reference (scaled to the same height) next to home-a's 1440 first screen, rendered with playwright (ffmpeg can't decode PNG here).
Polish loop: view your renders (Read the PNGs) and compare with the reference at 1x; fix gaps in type scale, weight contrast, spacing, the tag pill, the CTA's icon square, the nav pill, image darkening and edge fade. At least two passes, each recorded as a line in `redesign/polish-log.md`. Finish what exists; do not add more pieces.
Run `npx -y impeccable detect --json <board folder>` on each board, save as `<board>/detect.json`; fix real findings, explain kept ones in GATE.md in one line each.

## GATE.md (one screen)
What each board is; home-a vs home-b axis and your recommendation; tagline options (pick first); any copy you could not settle; what you could not match in the reference and why; fonts chosen; motion line; detect summary.

## Done test (the Leader will check every item)
- All 5 HTML files open from file:// with no network requests outside the folder (fonts and images local).
- renders/: home-a-1440, home-a-1440-first, home-a-390, home-b-1440, home-b-390, resources-1440, resources-390, viewer-1440, viewer-phone-390, ref-vs-home-a.png.
- Fire visible in home-a-390 and home-b-390 renders.
- No "salt", no footer, no unofficial/fan/copyright text (grep).
- tokens.css used; no raw hex in board page CSS except tokens.css.
- detect.json per board, polish-log.md with ≥2 passes, GATE.md.
- Original hero kept; img/ has web-sized versions.
Report back: list of files, the tagline options, and anything you could not do.
