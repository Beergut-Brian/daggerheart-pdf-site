# DESIGN.md — hsg-daggerheart — v0

<!-- v0 = discovery constraints + open questions only. v1 is written after Kaden picks a
     direction (Gate 2). Facts come from ../brief.md only; anything not there is [CONFIRM]. -->

## Status
- Version: v0 (constraints and open questions only)
- Date: 2026-11-15
- Approved by Kaden: no

## Brand constraints (non-negotiable)
- Name / wordmark text: HIGH SODIUM GAMING, set huge, in a free display face with a Daggerheart-like spirit (Kaden: "a big 'HIGH SODIUM GAMING' in a daggerheart like font").
- Never: the Daggerheart logo, its trademarked wordmark lettering, its card frames, or any Darrington Press art. Translate the feel (stylized, gilded, painterly fantasy); copy nothing.
- Logo: none exists; the wordmark is the identity (config `keep_logo: false`).
- Colors: open (`keep_colors: false`). Today's app has only Next's default white/#171717.
- Fonts: open, but free for web use only (SIL OFL or equivalent). Loaded through `next/font` (self-hosted at build), no paid foundry files.
- Imagery: the landing hero is drawn entirely in code (inline SVG, CSS gradients/masks, or a canvas). No raster images, no photos, no AI-generated images (Kaden: "no images").
- Voice: short and playful is fine; the site is mostly a door.

## Platform constraints
- Existing Next.js 16.4.3 App Router app, React 19.3, Tailwind 4, on Vercel. Design hands the builder tokens that map to Tailwind 4 `@theme` variables; no raw colours, sizes or spacing in page code.
- Three routes only:
  1. `/` landing: wordmark, code-drawn hero, one RESOURCES button. Nothing else required.
  2. `/resources`: book picker, data-driven (a config entry + a PDF in R2 adds a book). Must hold 1, 2 and ~6 books.
  3. `/resources/<book>`: our own viewer on Mozilla PDF.js (DH4 a): page-thumbnail preview pane, chapter list from the PDF outline (15 entries in the Core Rulebook), instant search with snippets + page previews, fast first page. Mobile: the pane collapses to a sheet.
- The PDF is ~97 MB, 397 pages, served from Cloudflare R2. The viewer design must show something useful before the whole file arrives (first page, then thumbnails as they render).
- Out of scope: anything on highsodiumgaming.com, accounts, blog, community features.

## Audience & job of the site
- Who: Kaden's players at the table, mostly on phones (design at 390 first), sometimes laptop or tablet.
- Under 60 seconds: open the site, press RESOURCES, pick the book, find the rule (search or chapter jump), read it.
- "Explore" after that: none. Mid-game lookups; the viewer is where they spend time, so it must stay calm and legible even if the landing is loud.

## Mode per surface
- `/` = Persuade (one point: this is High Sodium Gaming's table; go to RESOURCES). Loud allowed.
- `/resources` = Operate, light (choose a book). Branded but quick.
- `/resources/<book>` = Read. The page is the hero; chrome stays out of the way. Thumb-reach controls on phone.

## Kaden's taste (standing, from the brief)
- Rejects "boring" before "wrong". Bold custom display type and grain/noise textures welcome.
- Each section has its own visual device, but each screen makes one point: "too busy" also fails.
- Motion where it tells the story or clearly lifts the design; reduced-motion gives a static end state; each moving element justified in one line.

## Direction rationale (v1+)
- (filled after Gate 2)

## Reference set (v1+)
- `references/references.md` (RobBot is collecting; cited in `concepts.md`).

## Typography / Color roles / Spacing / Shape / Motion / Components
- (v1, after a concept and skeletons are picked)

## Proposed tokens
| name | value | where set |
| --- | --- | --- |
| (v1) | | `app/globals.css` `@theme` |

## Open questions (v0)
1. Second book: "Daggerheart: Hope & Fear", expansion, 204 pages, no text layer yet (RobBot, 2026-11-14).
2. Book covers on the picker: no raster images on the landing is stated; for the picker, do we render the PDF's own first page as the cover (it is Darrington Press art) or draw a code cover per book? Answered: code-drawn cover per book in the site's style.
3. Should the viewer keep the landing's dark/gilded skin, or go to a lighter reading skin with the brand only in the top bar? Answered: dark gilded chrome, kept quiet so the page is the brightest thing on screen.
4. Footer: none. Kaden 2026-11-14 22:40: no "unofficial", fan, trademark or copyright text anywhere; the site is for local use.

## Never
- The Daggerheart logo, wordmark lettering, card frames, or art; raster images or AI art on the hero; paid fonts.
- Generic hero-with-blob, purple-to-pink gradients, centered three-column icon rows, nested cards, bounce easing.
- Motion without a reduced-motion end state; motion that delays reaching RESOURCES or the page.
