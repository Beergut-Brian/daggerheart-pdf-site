# Status: High Sodium Gaming (Daggerheart resources site)

**Now:** Steer 1 ready: F1 v2 for Kaden

**Blocked:**
- Steer 1 review (Kaden): F1 v2 in `design/directions/f1-wyrm-eclipse/` (v1 frozen beside it). Start with `gate/steer-1/home-vs-v1.png` and `gate/steer-1/resources-vs-v1.png`, then `salt.webm` and `salt-1/2/3.png` (390) / `salt-*-1440.png`. Details in `gate-note.md`.
  - **Home:** same Cinzel gold wordmark and colours; the wyrm and orb are gone; the whole sky is suspended salt grains (round, soft, faint gold glint, slow drift, a few twinkles). Hover or drag a finger and the grains you touch fall and pile along the bottom and on the pill; a tap knocks loose a burst. Button reads DAGGERHEART RESOURCES (one line at 390). A gold glow stays behind the name. Reduced motion: static field + settled pile. 60 fps median and p95 at 390 and 1440 in headless Chromium.
  - **/resources:** unchanged except the top-right art: a gilded salt cellar of glowing salt with a heart-gold glow behind it, no edge; h1 "Daggerheart Resources". Swap with one word: `?art=hourglass` or `?art=crystal` (renders beside it). Wyrm crops on the sample shelf replaced.
  - **Viewer:** back link "Daggerheart Resources"; nothing else changed.
  - Two small calls for Kaden: keep or drop the "Touch the salt" hint under the button (default: keep); salt cellar vs hourglass vs crystal (default: salt cellar).
  - Real risk: with the creature gone, a still screenshot of home reads close to a plain starfield; the live interaction carries the brand.

## Profile and stack
Portfolio/brochure (small resource site). Next.js 16.4.3 App Router, React 19.3, Tailwind 4, Vercel. Design pipeline v3 (hermes boards).

## Phases
| # | Phase | Agent | Status | Done test | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | DESIGN.md v0 | Leader | done | constraints + open questions only | `design/DESIGN.md` |
| 2 | 1c content pack | Leader | done | every word for 3 pages, sample data for 1/2/6 books and "Hope" search | `design/content-pack.md` |
| 3 | 1d grey-box skeletons | Leader | done | 6–8 boards, real copy, 390 full + 1440 first renders, manifest, detect.json each | 7 boards, `design/directions/_manifest.json` |
| 4 | Concept sheet | Leader | done | 6 concepts × 5 lines, 2–3 OFL fonts each, ref ids cited | `design/concepts.md` |
| 5 | Gate 1 | Kaden | done | picks skeletons + ≤3 concepts | DH6–DH10 a |
| 6 | Stage 2 memos + boards | designer ×3 (A, B, C) | done | 3 memos; 6 boards × 3 pages; 7 renders, detect.json, gate-note each | 6 boards, manifest stage 2 |
| 7 | Gate 2 | Kaden | rejected | one board (or mix) picked | all six rejected 23:05 ("way off"); family excluded in design/exclude.md |
| 8 | Stage 2 redo, phase 1 | Leader | done | exclude.md, 3 memos (D/E/F), salt engine + test renders, image specs | this run |
| 9 | Image generation | RobBot | done | 24 images per spec in design/imagery/ | LICENSES.md |
| 10 | Stage 2 redo, phase 2 | designer ×3 (D, E, F) | done | 6 boards with images + salt engine, renders + salt stills, detect, gate notes | 6 boards |
| 11 | Gate 2 round 2 | Kaden | done | one board (or mix) picked | DH13: F1 with changes |
| 12 | Steer 1 (F1 v2) | Leader | done | DH13 changes; renders, salt proof (390+1440, video), side-by-sides, detect, gate note | f1-wyrm-eclipse v2 |
| 13 | Steer 1 review | Kaden | waiting | approve v2 or more steer | |

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
| 2026-11-15 | Project-manager agent not run this run. | Fast-start instruction to reach Gate 1 ASAP; PM health check should run at Gate 2 start. |
| 2026-11-15 | Handoff packet id written as `robbot/daggerheart-site-2026-10-23 v1`. | The run prompt gave no packet id; the owner should correct it on ingest if it differs. |
| 2026-11-14 | Gate 1 answers recorded: DH6 a, DH7 a, DH8 a, DH9 a, DH10 a (see brief Log). | Kaden via RobBot. |
| 2026-11-14 | Footer and all unofficial/fan/trademark/copyright copy removed from content pack, DESIGN.md and boards. | Kaden 22:40, overrides the footer part of DH10. |
| 2026-11-14 | Second book is "Daggerheart: Hope & Fear" (204 pp); 6-book scale state renamed to plausible titles, captioned "Sample shelf". | RobBot, Stage 2 prompt. |
| 2026-11-14 | Stage 2 boards by three designer sub-agents in parallel, one per direction, from a shared brief (`design/tools/stage2-common-brief.md`). | Speed; each owns only its own folders. |
| 2026-11-14 | B swapped Pirata One for Cinzel. | Pirata's blackletter read as "pirate" and fought the wordmark (memo B). |
| 2026-11-14 | a2's tagline overlap at 390 left unfixed; recorded as a risk. | It's not the recommended board; a fix costs another round. Fix it in build if a2 is picked. |
| 2026-11-14 | Detect findings kept: gradient-text on the gilded wordmarks (the R21/Atlas Card device), flush cover-art layers, quiet-chrome hierarchy, false positives on responsive type size. | Explained per board in gate-note.md. |
| 2026-11-14 | Cinzel Decorative "OO" ligature broken with a zero-width non-joiner on A's cover titles. | CSS can't turn it off; the build must repeat this or pick another face. |
| 2026-11-14 | Round-1 boards moved to `design/directions/_rejected-round-1/` and dropped from the manifest; family recorded in `design/exclude.md`. | Kaden rejected all six (23:05). |
| 2026-11-14 | brief.md and DESIGN.md: "no images / code-drawn only" replaced by Kaden's 23:05 rule (illustrated and generated art welcome, no stock photos). | Kaden 23:05. |
| 2026-11-14 | Each direction has its own original monster (Colossus, Sal, Wyrm) so the Gate 2 pick also picks the mascot. | Kaden named the monster idea but not its form. |
| 2026-11-14 | Salt engine: cellular grain grid (3–4 px cells) on one canvas, glyph-level solids for the wordmark, pointer scatter as flying grains, tap to shake, sleeps when idle, pauses offscreen, reduced motion = one static settled paint. | One engine for all boards, as asked; cheap enough for phones. |
| 2026-11-14 | Cut-out characters use flat key colours (#FF00FF for D, exact panel colours for E, black + screen blend for F). | Generators rarely give clean transparency. |
| 2026-11-14 | /resources on every board uses the REAL covers (steer-1/05, 06) with our generated pair as a small "Alt covers (ours)" strip. | RobBot default pending DH12; works for either answer. |
| 2026-11-14 | Boards reference images in place (`../../imagery/…`, `../../references/steer-1/…`); nothing copied. | One source of truth for the images. |
| 2026-11-14 | Shared salt engine left unchanged; F adds a small board-local wrapper (`salt-glow.js`) for glow colours and the button drift. | Keep one engine; differences live in board settings. |
| 2026-11-14 | Known image defects carried to the gate notes, not hidden: D golem blocky; d2 cut-out haze; E Sal inconsistent across images; f2-sky-tall reads as a heart. | LICENSES.md and Kaden's "honest note" rule. |
| 2026-11-14 | Steer 1 edits made by the Leader directly (no sub-agent). | Small, surgical edit set plus an engine change that every later board depends on. |
| 2026-11-14 | Shared salt engine v2: field mode (suspended grains, hover/tap knock loose), floor, round sprite grains with gold glint, cached field and pile layers, pile redraw ≤ 20/s. v1 API kept. | Kaden's "screen full of salt particles that when hovered fall … and collect"; RobBot: never square pixels, smooth on a phone. |
| 2026-11-14 | Home: `touch-action: none` on the one-screen hero so a finger drag knocks salt loose instead of scrolling. | The landing fits one screen; the drag is the interaction. |
| 2026-11-14 | Added a 3-word hint "Touch the salt" under the button that leaves on first touch. | Phone users can't hover; without a cue the field reads as a still starfield. Easy to drop. |
| 2026-11-14 | /resources h1 capped at 58% width on desktop so "Daggerheart Resources" wraps beside the art. | The longer title ran under the art in the first v2 render. |
| 2026-11-14 | Removed v1's CSS drop-shadow filter on the salt canvas. | It repainted the full screen every frame; the sprites carry their own glow. |

## Spend
Design-1d run: ~$2.20. Stage 2 run: ~$10.5 of the $30 run cap. Stage 2 redo phase 1: ~$2. Phase 2: ~$10.2 of $30. Steer 1: ~$5.5 of $30.
