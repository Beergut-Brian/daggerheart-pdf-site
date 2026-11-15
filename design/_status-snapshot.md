# Status: High Sodium Gaming (Daggerheart resources site)

**Now:** Gate 1 ready: 7 skeletons + 6 concepts + content pack, for Kaden

**Blocked:**
- Gate 1 (Kaden): pick one skeleton per pair and up to three concepts for Gate 2 boards. Everything is in `design/`: `directions/*/board-390.png` and `board-1440-first.png`, `concepts.md`, `content-pack.md`, `QUESTIONS.md` (DH6–DH9, each with a default; not blocking).
  - Boards and the choice each pair answers:
    - `landing-a-monument` vs `landing-b-split` — landing composition: centred monument vs asymmetric split.
    - `picker-a-shelf` vs `picker-b-covers` — picker metaphor: book-spine shelf vs large covers grid (each board shows the 1-book and 6-book states).
    - `viewer-phone-a-sheet` vs `viewer-phone-b-filmstrip` — phone navigation: bottom dock + sheet vs persistent filmstrip with split-screen search.
    - `viewer-desktop` — single board (rail left, page centre, search results right); no real structural fork.
  - Recommended skeletons:
    - **landing-a-monument**: one point, one axis; on a phone the wordmark, line and button stack naturally, and it's the only layout that fits the Salt Circle.
    - **picker-b-covers**: one book looks deliberate (a big cover), 6 still scan, and long titles stay readable (vertical spine text doesn't).
    - **viewer-phone-a-sheet**: at the table the page gets the whole screen; a 46px filmstrip is too small to read on a phone. Borrow B's page preview inside search results as a later option.
  - Recommended concepts:
    - **Salt-Cured Grimoire**: the richest take on the gilded painterly feel, with a salt joke only HSG can own.
    - **The Salt Circle**: the boldest single image; the ring carries into the viewer's loading state.
    - **Sodium Lamp**: the techy, grainy option, and its 589 nm double rule holds up in a reading UI.

## Profile and stack
Portfolio/brochure (small resource site). Next.js 16.4.3 App Router, React 19.3, Tailwind 4, Vercel. Design pipeline v3 (hermes boards).

## Phases
| # | Phase | Agent | Status | Done test | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | DESIGN.md v0 | Leader | done | constraints + open questions only | `design/DESIGN.md` |
| 2 | 1c content pack | Leader | done | every word for 3 pages, sample data for 1/2/6 books and "Hope" search | `design/content-pack.md` |
| 3 | 1d grey-box skeletons | Leader | done | 6–8 boards, real copy, 390 full + 1440 first renders, manifest, detect.json each | 7 boards, `design/directions/_manifest.json` |
| 4 | Concept sheet | Leader | done | 6 concepts × 5 lines, 2–3 OFL fonts each, ref ids cited | `design/concepts.md` |
| 5 | Gate 1 | Kaden | waiting | picks skeletons + ≤3 concepts | |
| 6 | Gate 2 boards | designer | not started | boards for chosen concepts on chosen skeletons | |

## Decisions
| Date | Decision | Reason |
| --- | --- | --- |
| 2026-11-15 | Chapter list designed for the PDF's real outline: Contents + Introduction + Chapters 1–5 + Appendix (8 top-level) with 44 sections, not "15 chapters". | Read from the PDF's outline with pdf.js; the brief's "15-entry" count doesn't match the file. Picker meta reads "397 pages · 5 chapters". |
| 2026-11-15 | The second local PDF ("Full Art Cards") is not treated as the second book. | Same 397-page outline as the Core Rulebook. Second book stays "Sample" (DH6). |
| 2026-11-15 | Search sample snippets use real text from pages 19, 21, 28, 29, 31; the result count (148) is a sample. | Realistic snippet length for the layout. |
| 2026-11-15 | `../design/` mirrored into `site/design/` for commits (shots excluded by .gitignore). | The job's design folder isn't in a git repo; the brief asks for commits on `job/design-2026-11-14`. |
| 2026-11-15 | Boards rendered with playwright-core + the container's Chromium (`/ms-playwright/chromium-1248`) instead of design-preview `render.sh`. | The design-preview tooling isn't readable from the container. |
| 2026-11-15 | Leader wrote the grey-box boards directly instead of a designer sub-agent. | Grey-box is structure only and the run is a fast start; designer takes Gate 2 boards. |
| 2026-11-15 | Detect findings left as-is on grey-box boards. | All of them flag scaffolding (uppercase board labels, striped placeholder slots, phone frames), not page design. |
| 2026-11-15 | Footer fan-content line drafted ("Unofficial fan resource… trademark of Darrington Press"). | Not in the brief; proposed as DH9 with a default. |

## Spend
Estimate so far: ~$2 of cap $30 (design-1d run).
