# Content pack (1c) — High Sodium Gaming, Daggerheart resources

Every word on the three pages. Voice: short, a little salty, never cute at the cost of speed. Players are mid-game; every label says what it does.
Anything marked **Sample** is placeholder data for design only and never ships as-is. Facts come from `../brief.md` and the Core Rulebook PDF's own outline (read 2026-11-15).

---

## Global

| Slot | Copy |
| --- | --- |
| Site title (`<title>`, `/`) | High Sodium Gaming — Daggerheart table resources |
| Meta description | The High Sodium Gaming table's Daggerheart books, searchable on your phone. |
| Wordmark | HIGH SODIUM GAMING |
| Wordmark short (viewer top bar, ≤ 390) | HSG |
| Fan-content line (footer, all pages) | Unofficial fan resource for our table. Daggerheart is a trademark of Darrington Press. |
| Skip link | Skip to content |

---

## 1. `/` Landing

| Slot | Copy |
| --- | --- |
| Wordmark (h1) | HIGH SODIUM GAMING |
| Line under wordmark (optional, one line) | Rules, close at hand. Salt to taste. |
| Alt line (if Kaden wants the duality spoken) | Roll with Hope. Read when you Fear. |
| Primary button | RESOURCES |
| Button accessible name | Resources — open the book shelf |
| Hero art (aria-hidden, decorative) | (none spoken; `role="presentation"`) |
| Reduced-motion note | (none: static end state is the same composition) |
| Footer | Unofficial fan resource for our table. Daggerheart is a trademark of Darrington Press. |

Recommendation: ship the first line ("Rules, close at hand. Salt to taste."). One line, one joke, gets out of the way of the button.

---

## 2. `/resources` Picker

| Slot | Copy |
| --- | --- |
| Back link | ← High Sodium Gaming |
| Page heading (h1) | Resources |
| Intro line | Pick a book. Search starts the moment it opens. |
| Card action (visible) | Open |
| Card accessible name | Open {title}, {pages} pages |
| Card meta pattern | {pages} pages · {chapters} chapters |
| "New" badge (optional, a recently added book) | New |
| Loading (cards skeleton) | Fetching the shelf… |
| Empty state (0 books, config error) | The shelf is empty. Tell the GM. |
| Error state | Couldn't reach the shelf. Check your signal and try again. · button: Try again |

### Book card data

**State A — 1 book (real)**

| Title | Subtitle | Pages | Chapters | Slug |
| --- | --- | --- | --- | --- |
| Daggerheart Core Rulebook | Everything: characters, play, GM tools, adversaries, campaign frames | 397 | 5 chapters + intro & appendix | `core-rulebook` |

Card meta as shown: **397 pages · 5 chapters**

**State B — 2 books (1 real + Sample)**

| Title | Subtitle | Pages | Meta |
| --- | --- | --- | --- |
| Daggerheart Core Rulebook | Everything: characters, play, GM tools, adversaries, campaign frames | 397 | 397 pages · 5 chapters |
| **Sample:** The Second Book | Title coming from Kaden (DH6) | 120 | 120 pages · 6 chapters |

**State C — 6 books (Sample shelf; tests the layout, not real titles)**

| # | Title | Subtitle | Pages | Meta |
| --- | --- | --- | --- | --- |
| 1 | Daggerheart Core Rulebook | Everything: characters, play, GM tools, adversaries, campaign frames | 397 | 397 pages · 5 chapters |
| 2 | Sample: Campaign Book | A second rulebook-sized volume | 240 | 240 pages · 8 chapters |
| 3 | Sample: Table Quick Reference | Moves, ranges, conditions on one page | 12 | 12 pages · 3 sections |
| 4 | Sample: House Rules | How our table bends the rules | 8 | 8 pages · 1 chapter |
| 5 | Sample: Session Zero Pack | Safety tools and table expectations | 16 | 16 pages · 4 sections |
| 6 | Sample: Adversary Cards, Long Title That Wraps Onto Two Lines | Stress-test for title wrapping | 64 | 64 pages · 2 chapters |

---

## 3. `/resources/<book>` Viewer

### Top bar
| Slot | Copy |
| --- | --- |
| Back | ← Resources |
| Book title (truncate at 1 line) | Daggerheart Core Rulebook |
| Page indicator | Page {n} of 397 · input label: Go to page |
| Go-to-page error | No page {n}. This book has 397. |
| Search button (icon, a11y) | Search the book |
| Pane toggle (desktop, a11y) | Show pages / Hide pages |
| Zoom (a11y) | Zoom in · Zoom out · Fit width |

### Pane tabs (desktop rail / phone sheet)
| Slot | Copy |
| --- | --- |
| Tab 1 | Pages |
| Tab 2 | Chapters |
| Sheet handle (phone, a11y) | Pages and chapters |
| Sheet close | Close |
| Thumbnail label | {n} |
| Thumbnail a11y | Page {n} |
| Thumbnail not yet drawn | (page number only, on a blank slot) |

### Chapter list (real outline, Core Rulebook)
Top-level rows are groups; tapping one expands its sections. Page number right-aligned.

| Group | Starts | Sections (page) |
| --- | --- | --- |
| Introduction | 5 | Welcome to Daggerheart 5 · Using This Book 8 · What Do You Need to Play? 9 · Player Principles 10 · A Table for All 10 |
| Chapter One: Preparing for Adventure | 12 | World Overview 12 · Character Creation 14 · Example Character 23 · Domains 25 · Class 28 · Ancestry 53 · Community 73 · Additional Player Guidance 83 |
| Chapter Two: Playing an Adventure | 88 | Flow of the Game 88 · Core Mechanics 90 · Player Best Practices 109 · Leveling Up 110 · Equipment 113 · Loot 130 · Full Example of Play 135 |
| Chapter Three: Running an Adventure | 141 | Introduction 141 · Core Guidance 141 · Core GM Mechanics 149 · Session Zero & Safety Tools 170 · Running a Session 174 · Running a One-Shot 185 · Running a Campaign 186 |
| Chapter Four: Adversaries and Environments | 194 | Using Adversaries 194 · Choosing Adversaries 198 · Adversary Stat Blocks 210 · Using Environments 241 · Environment Stat Blocks 243 |
| Chapter Five: Campaign Frames | 254 | Campaign Frame Breakdown 254 · The Witherwild 255 · Five Banners Burning 263 · Beast Feast 271 · The Age of Umbra 281 · Motherboard 291 · Colossus of the Drylands 309 |
| Appendix | 329 | Domain Card Reference 329 · Character Sheet 344 · Additional Sheets 348 · Campaign Frame Maps 358 · Index 364 |

(The PDF also has a "Table of Contents" bookmark at page 4; the list shows it as the first row, "Contents · 4".)
Short labels for the phone sheet (≤ 22 chars): Intro · Ch 1 Preparing · Ch 2 Playing · Ch 3 Running · Ch 4 Adversaries · Ch 5 Campaign Frames · Appendix.
Current-chapter marker (a11y): You are here.

### Search
| Slot | Copy |
| --- | --- |
| Search placeholder | Search the rulebook — try "Hope" |
| Search a11y label | Search Daggerheart Core Rulebook |
| Clear button (a11y) | Clear search |
| Indexing (text layer still loading) | Reading the book… {n} of 397 pages |
| Searching | Searching… |
| Result count | {n} results for "{q}" |
| Result count (capped) | 200+ results for "{q}". Add a word to narrow it. |
| Result row a11y | Page {n}, {chapter}: {snippet} |
| No results | Nothing for "{q}". Check the spelling, or try a shorter word. |
| No results, suggestion | Try: Hope · Fear · Stress · Evasion |
| Search error | Search hit a snag. Try again. |
| Jump hint (desktop) | ↑ ↓ to move · Enter to open |
| Previous / next hit on page | Previous match · Next match · "{i} of {n} on this page" |

### Sample search: "Hope" (5 rows; snippets are real text from the book)

Header: **148 results for "Hope"** (Sample count)

| # | Snippet (match in bold) | Chapter | Page | Preview slot |
| --- | --- | --- | --- | --- |
| 1 | …HOPE AND FEAR **Hope** and Fear are currencies used by the players and the GM to represent the way fate turns… | Ch 1 · Character Creation | 19 | page 19 thumb |
| 2 | …Before you make an action or reaction roll, you can spend a **Hope** to add the Experience's modifier to the roll's result… | Ch 1 · Character Creation | 21 | page 21 thumb |
| 3 | …Class **Hope** Feature: Each class has a special move they can make by spending 3 **Hope**… | Ch 1 · Class | 28 | page 28 thumb |
| 4 | …Make a Scene: Spend 3 **Hope** to temporarily Distract a target within Close range… | Ch 1 · Class (Bard) | 29 | page 29 thumb |
| 5 | …Evolution: Spend 3 **Hope** to transform into a Beastform without marking a Stress… | Ch 1 · Class (Druid) | 31 | page 31 thumb |

### Loading and errors (viewer)
| Slot | Copy |
| --- | --- |
| First paint (before page 1) | Opening the book… |
| Progress (large file) | Loading pages · {pct}% |
| Thumbnails still drawing | (blank slots with page numbers; no text) |
| Slow network (after 8 s) | Big book, slow signal. Page 1 is on its way. |
| Load failed | The book didn't open. Check your signal. · button: Try again |
| Book not found (bad slug) | No book by that name on the shelf. · link: Back to Resources |
| Offline | You're offline. Pages you've opened are still here. (only if caching ships; otherwise use "Load failed") |
