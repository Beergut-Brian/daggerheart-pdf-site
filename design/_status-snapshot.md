# Status: High Sodium Gaming (Daggerheart resources site)

**Now:** Phase 1 done: memos, salt engine, image specs ready for RobBot to generate

**Blocked:**
- Waiting on RobBot to generate 24 images from `design/imagery/{D,E,F}/spec.json` (8 per direction; notes in `design/imagery/README.md`). Phase 2 (six boards with images placed and the salt engine running) starts when they are in `design/imagery/<D|E|F>/`.
  - D Painted Epic (`direction-memos/D-painted-epic.md`): the Brine Colossus, a towering salt-cube golem in a painted dusk vista. D1 = it is the whole backdrop, pouring salt from its raised hand; D2 = a smaller cut-out sitting on the wordmark tipping a salt crystal.
  - E Toy World (`E-toy-world.md`): Sal, a vinyl-toy salt-shaker monster. E1 = full 3D tabletop diorama with a salt mine; E2 = Sal jumping out of bold yellow/blue/coral panels; keycap RESOURCES button.
  - F Glow (`F-glow.md`): the Salt Wyrm, a crystal serpent whose gold heart backlights a giant luminous wordmark. F1 = huge silhouette behind the type; F2 = a tiny hatchling pouring glowing salt, the interaction is the hero.
  - Shared salt engine: `design/directions/_shared/salt-engine.js` + `salt-test/` (renders at 390 and 1440, pointer-scatter test, reduced-motion static pile; 60 fps median and p95 at 390 and 1440 in headless Chromium).

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
| 9 | Image generation | RobBot | waiting | 24 images per spec in design/imagery/ | |
| 10 | Stage 2 redo, phase 2 | Leader + designers | not started | 6 boards with images + salt engine, renders, detect, gate notes | |

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

## Spend
Design-1d run: ~$2.20. Stage 2 run: ~$10.5 of the $30 run cap. Stage 2 redo phase 1: ~$2.
