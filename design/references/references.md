# References — hsg-daggerheart

<!-- Stage 1b (design-phase v2). 15–25 references (config.yml reference_count) in four buckets.
     Every reference has a shot in shots/<ref-id>.<ext> (refero.py shot|fetch writes it plus a
     .json with source and fetch time). A reference with no Borrow note is deleted.
     Shots are third-party screenshots for internal design research only: never in git,
     never on a public page (shots/.gitignore). -->

Buckets: competitor | adjacent | aspirational | client
Source: refero:<id> | url | client

Note on the competitor bucket: Refero has no TTRPG publisher sites; the closest are big-studio fantasy/game pages
(Epic, PlayStation). They are used for game-site conventions to beat, not to copy.

## R01 — Infinity Blade home (Epic Games / ChAIR)
- Bucket: competitor
- Source: refero:screen/e5b9ec6f-3799-4f31-a923-eed2e65c75de · https://www.epicgames.com/infinityblade/en-US/home
- Shot: shots/R01.jpg · fetched 2026-11-14
- Job match: "announce a fantasy world in one glance, then route the visitor to one of a few titles"
- Borrow: the painterly ink-wash / parchment-gold field behind the hero (we redo it in code: SVG turbulence +
  gold-to-ink gradient, no raster); the centered emblem-over-wordmark lockup sitting on that field;
  the four boxed title tabs as a pattern for the /resources book switcher.
- Avoid: the knight renders and raster art; the review-quote collage section (busy, no job for us);
  blocky white-on-black Roboto tabs that clash with the ornate lockup.

## R02 — The Last of Us official site (PlayStation)
- Bucket: competitor
- Source: refero:screen/2e732e43-031f-4c9e-b8ff-a28b698e784f · https://www.playstation.com/en-us/the-last-of-us/
- Shot: shots/R02.jpg · fetched 2026-11-14
- Job match: "a dark cinematic title screen that makes the game name the hero"
- Borrow: the first screen as a pure title card: near-black field, one huge centered title, a one-line
  tagline under it, and a single row of entry points directly below; the deep vignette that pulls the eye
  to the center.
- Avoid: the very long scroll of carousels, cast cards, FAQ; our landing stops after the button.

## R03 — Infinity Blade Universe (Epic Games)
- Bucket: competitor
- Source: refero:screen/18328bdc-cc3b-4342-8f36-92db2b64907a · https://www.epicgames.com/infinityblade/en-US/game-info/infinity-blade-universe
- Shot: shots/R03.jpg · fetched 2026-11-14
- Job match: "list the books of a series with a short blurb each"
- Borrow: full-width horizontal "title bands", one per game, as a /resources layout that still looks good
  with 1 item (one grand band) and stretches to 6 (stacked bands); the expandable lore accordion idea for
  an optional "about this book" line.
- Avoid: the white content areas and generic sans body; video gallery.

## R04 — LOTR: Return to Moria announcement (Epic Games Store)
- Bucket: competitor
- Source: refero:screen/dbd81d00-1c91-47f7-931a-0790bd3fa2b5 · https://store.epicgames.com/en-US/news/the-lord-of-the-rings-return-to-moria-s-announcement-reveals-a-multiplayer-survival-game
- Shot: shots/R04.jpg · fetched 2026-11-14
- Job match: "how a mainstream games platform frames a fantasy title" (the baseline to rise above)
- Borrow: only the dark nav framing a calm centered reading column; proof that a fantasy property can sit
  in a plain reading layout without losing mood if the frame carries it.
- Avoid: everything else: store chrome, blue CTA, white article body. This is the "generic game store"
  look we must not resemble.

## R05 — Daggerheart official site (Darrington Press) — the source of the feel, NOT a template
- Bucket: competitor
- Source: url · https://www.daggerheart.com/ (non-Refero browser screenshot; Refero has no TTRPG publisher sites)
- Shot: shots/R05.png · fetched 2026-11-14
- Job match: "the mood Kaden named: stylized, gilded, painterly fantasy"
- Borrow (feel only): the palette move of deep indigo/violet night on one side breaking into a warm
  sunset-orange glow on the other; thin double gold rules with faceted, clipped (chevron) corners as the
  framing language; small gold corner accents. All re-made as our own SVG/CSS shapes.
- Avoid: copying ANY of it literally: the logo/wordmark lettering, the exact chevron nav frame shape,
  card frames, character art (trademarked; brief forbids it). Also the cookie-banner-over-hero clutter.

## R06 — Literal: shelf page
- Bucket: adjacent
- Source: refero:screen/f61e4b8c-5658-4dcb-b919-9862415b99df · https://literal.club/liamb/shelf/must-read-2og2mum
- Shot: shots/R06.jpg · fetched 2026-11-14
- Job match: "pick one book from a small shelf"
- Borrow: the centered shelf title + count ("7 Books") over a ruled grid of equal cells, each with an upright
  cover, title and author; hairline cell rules (do them in thin gold) so 1, 2 or 6 books all look intentional;
  empty cells stay as quiet ruled boxes ("more coming" slot).
- Avoid: white minimal social-app chrome, follow/edit actions, the big footer.

## R07 — ElevenReader explore (dark mode)
- Bucket: adjacent
- Source: refero:screen/ab821766-e48b-4d83-9859-503409dea042 · https://elevenreader.io/reader/explore
- Shot: shots/R07.jpg · fetched 2026-11-14
- Job match: "browse books on a dark surface where covers carry the color"
- Borrow: black canvas with covers as the only color, soft cover shadows, title/author in two tight lines
  under each cover; this is how our code-drawn book covers should sit on the dark /resources page.
- Avoid: carousels, language/search bars, blue accent; we have at most ~6 books.

## R08 — Missive: in-app PDF viewer (dark)
- Bucket: adjacent
- Source: refero:screen/b14045d0-6f3d-4e2e-8a9d-ca581cf66a61 · https://mail.missiveapp.com/
- Shot: shots/R08.jpg · fetched 2026-11-14
- Job match: "read a multi-page PDF with a page-thumbnail rail"
- Borrow: the canonical PDF.js layout: left rail of numbered page thumbnails with the current page outlined,
  slim top toolbar (outline toggle, title, "1 / 4" page box, zoom -/+, rotate, download), page on a dark
  surround; the bottom keyboard-hint strip ("↑↓ to navigate · Enter to open").
- Avoid: stock PDF.js grey icons and the modal-in-app framing; restyle the chrome in our palette.

## R09 — Dock: PDF viewer in a client portal
- Bucket: adjacent
- Source: refero:screen/5079f9c2-11e0-4094-9d22-9e969d81d40f · https://refero.dock.us/
- Shot: shots/R09.jpg · fetched 2026-11-14
- Job match: "open a document with the least chrome possible"
- Borrow: the three-part header: file title left, centered "‹ 1 of 6 ›" pager, one Download action and close
  on the right; the page filling almost the whole viewport. Good model for the viewer's mobile/compact mode.
- Avoid: no thumbnails, outline or search at all; too bare for a 397-page rulebook.

## R10 — Cursor docs search
- Bucket: adjacent
- Source: refero:screen/f42ec510-63bf-48c8-b294-e3d5b5ebec4e · https://cursor.com/docs
- Shot: shots/R10.jpg · fetched 2026-11-14
- Job match: "type a word, see where it lives and a snippet, jump there"
- Borrow: each result = breadcrumb (Docs › Account › Billing) + bold title + 2-line snippet with the match
  underlined; first result pre-highlighted; footer row for a secondary action. Map breadcrumb to
  "Chapter › Section · p. 112" for the rulebook.
- Avoid: the dimmed-page modal on mobile (use a sheet); "Ask AI".

## R11 — Anthropic docs search (Inkeep) with preview pane
- Bucket: adjacent
- Source: refero:screen/c1a6de64-b891-4180-8f78-1a69227e4865 · https://docs.anthropic.com/en/docs/welcome
- Shot: shots/R11.jpg · fetched 2026-11-14
- Job match: "search results with a live preview of the highlighted hit"
- Borrow: two-pane search: results list left (title + breadcrumb), right pane previews the focused hit with
  the snippet in serif with the query word bolded, and an "On this page" list of jump links. For us the right
  pane = a small render of the PDF page with the hit marked.
- Avoid: "Ask AI" and vendor branding; the light grey; the result count tab row ("All (10)") is enough, no more tabs.

## R12 — Memotron global search (snippets with type tags)
- Bucket: adjacent
- Source: refero:screen/64bb5d51-95c7-4847-bac8-9a1c3ac85b5a · https://web.memotron.app/
- Shot: shots/R12.jpg · fetched 2026-11-14
- Job match: "dense list of hits where each row shows context before and after the match"
- Borrow: the row anatomy: small grey location line on top, title, one-line "…context **match** context…"
  snippet with leading ellipsis, a right-aligned tag (for us: "p. 214"); "Press Esc to close" hint in the footer.
- Avoid: this shot shows raw `<b>an</b>` tags leaking into snippets: render highlights as real <mark>
  elements and escape PDF text. Also avoid one-letter queries matching everything: start search at 2 chars.

## R13 — Apple Books: chapter index (iOS)
- Bucket: adjacent
- Source: refero:screen/f1a74777-2732-4337-97b1-64cd765e39dc · Apple Books (iOS)
- Shot: shots/R13.jpg · fetched 2026-11-14
- Job match: "jump to a chapter from a phone at the table"
- Borrow: big tappable uppercase chapter rows with right-aligned page numbers, hairline separators, the
  current chapter as a rounded highlight pill; the 3-icon segmented switch at the top (pages grid / contents
  list / bookmarks) = our Pages | Chapters | Search tabs in the mobile sheet.
- Avoid: white system styling; dimmed grey rows for unread sections (all 15 outline entries are equal).

## R14 — Apple Books: search in book (dark bottom sheet, iOS)
- Bucket: adjacent
- Source: refero:screen/56d6dd9d-7fdb-4699-967e-419605876546 · Apple Books (iOS)
- Shot: shots/R14.jpg · fetched 2026-11-14
- Job match: "search a book on a phone and see every hit in context"
- Borrow: the best snippet model for the brief: each hit = chapter name bold left + page number right, then
  2-3 lines of serif body text with the matched part in bold, ellipsis on overflow; search field pinned at
  the BOTTOM (thumb reach) with clear and close buttons; near-black sheet with rounded top.
- Avoid: no result count and no way to step next/prev from the page; add "12 hits" and ‹ › on the page.

## R15 — Dropbox: PDF text search with page thumbnails (iOS)
- Bucket: adjacent
- Source: refero:screen/349e002e-b764-4cb1-9798-9852a84384a7 · Dropbox (iOS)
- Shot: shots/R15.jpg · fetched 2026-11-14
- Job match: "find a rule and recognise the page by its look"
- Borrow: a tiny page thumbnail beside every snippet (players remember "the page with the table"), the
  "Page 1" label right-aligned above, highlighter-yellow match mark (ours in gold), "4 matches found" status line.
- Avoid: blue system buttons and the stock-iOS look; the long unclipped snippets (cap at 3 lines).

## R16 — Fable: contents sheet (iOS)
- Bucket: adjacent
- Source: refero:screen/d42d6e64-82cf-4d66-9321-7409d5ed9919 · Fable (iOS)
- Shot: shots/R16.jpg · fetched 2026-11-14
- Job match: "on mobile, collapse the side pane into a sheet"
- Borrow: the grabber-handle bottom sheet with a segmented control on top (Contents / Highlights / Notes / Tabs
  -> our Chapters / Pages / Search), current section shaded, one big "Done" pill at the bottom; this is the
  mobile pattern the brief asks for ("pane collapses to a sheet").
- Avoid: four tabs (three max); white sheet; greyed-out rows.

## R17 — Dropbox: mobile PDF page grid (iOS)
- Bucket: adjacent
- Source: refero:screen/e9543623-201c-4b9e-b2d2-c7d8ffedea92 · Dropbox (iOS)
- Shot: shots/R17.jpg · fetched 2026-11-14
- Job match: "see many pages at once on a phone and tap one"
- Borrow: the page-grid mode with the page number as a dark chip centred on each thumbnail; header with
  file title + "Page 1" subtitle; the small floating grid/search toggle pair bottom-left.
- Avoid: two-across tiny thumbnails at random sizes (use a fixed 3-across grid with lazy-loaded renders),
  the blue Share button and star/annotate features we do not need.

## R18 — ROX homepage (dark, gold-accent serif)
- Bucket: aspirational
- Source: refero:screen/31fd7d97-406b-497e-9f25-bb9a595cc0e2 · https://www.rox.com/
- Shot: shots/R18.jpg · fetched 2026-11-14
- Job match: "make a dark page feel expensive with gold used sparingly"
- Borrow: warm near-black (not blue-black) base, gold reserved for a single word in the headline and for
  thin outlined buttons; faint gold line-art drawings (isometric stack, grid lines) as illustration done in
  vector strokes, proof a code-drawn hero can look premium.
- Avoid: SaaS sections (logo wall, testimonials, feature grid); the small type scale of the hero.

## R19 — GlossGenius careers: full-bleed wordmark band
- Bucket: aspirational
- Source: refero:screen/e41f6373-1f09-4874-a28f-2fd6c687cd5c · https://glossgenius.com/careers
- Shot: shots/R19.jpg · fetched 2026-11-14
- Job match: "a wordmark big enough to be the whole design"
- Borrow: the edge-to-edge letter-spaced wordmark that fills the full viewport width on black: our
  "HIGH SODIUM GAMING" should be set to span the width (fluid clamp / fit-text), stacked on 2-3 lines on phones;
  the single thin outlined CTA under centered copy ("VIEW CURRENT OPENINGS" -> "RESOURCES").
- Avoid: the thin geometric sans (we need a fantasy display face); the photo band.

## R20 — Esquire Classic: magazine archive
- Bucket: adjacent
- Source: refero:screen/6f5b1b13-e4ab-4dc5-954f-484f38ddb001 · https://classic.esquire.com/
- Shot: shots/R20.jpg · fetched 2026-11-14
- Job match: "a library of printed issues you open and read page by page"
- Borrow: "Latest issue" block = one large cover beside a short list of what is inside (for the book picker:
  cover + 3-4 chapter teasers); section titles centred between long horizontal rules (an engraved-book
  device we can gild); the "Search… every article. every page." band as the promise our search makes.
- Avoid: dense multi-section magazine layout, red accent, many thumbnails.

## R21 — Resend Handbook: metallic serif index
- Bucket: aspirational
- Source: refero:screen/16916621-f079-4381-a4a4-0671947e77f9 · https://resend.com/handbook
- Shot: shots/R21.jpg · fetched 2026-11-14
- Job match: "a handbook index that feels like a crafted book, not a doc site"
- Borrow: the giant serif title with a metallic gradient fill (background-clip:text) — swap silver for gold:
  exactly the gilded wordmark technique; per-chapter rows each led by a tall generative black-and-white
  pattern "cover" made in code — a model for code-drawn book covers on /resources and chapter markers.
- Avoid: monochrome silver only; the long uniform list (our picker is 1-6 items); tiny link text.

## R22 — Avnier: full-screen search overlay
- Bucket: aspirational
- Source: refero:screen/2c11fa97-c37c-406f-a9b1-8889b9ab3fc9 · https://avnier.com/
- Shot: shots/R22.jpg · fetched 2026-11-14
- Job match: "search that feels like part of the world, not a utility popup"
- Borrow: black full-screen takeover with a single large underlined input and nothing else until you type;
  the dimmed content still visible below; numbered 01-04 progress ticks (could mark search-hit position).
- Avoid: French-fashion monospace and low-contrast tiny caps text; hiding results behind a big empty field.

## Refero styles
<!-- 2–4 styles that fit the v0 brand constraints (refero_get_style); keep their do/don't rules. -->
### Franco Maria Ricci — refero:style/2c3b31a4-6e28-47a0-afbd-cb22e22e34fb
Bibliophile's art-book style: ink black, pale paper and restrained antique gold around high-contrast serif type;
rich illustration carries the drama while the UI stays sparse and rectilinear. Closest match to "gilded rulebook".
- Do: keep gold a lettering and identity accent; use 1px shared rules around contiguous cells (book shelf grid);
  let the artwork carry texture while UI fields stay flat; braced/bracketed small-caps action labels
  (e.g. "{ RESOURCES }") are a usable button idea.
- Don't: turn antique gold into broad section fills; round the collection cells or add elevated card shadows;
  replace the serif body with a general sans throughout.

### Atlas Card — refero:style/6a12210f-e910-4d33-9788-ed039660beb0
Cinematic, invitation-led luxury: deep black space, monumental titles with a clipped metallic (silver) fill,
tiny uppercase labels like destination markings; color lives in the scene, not the UI.
- Do: monumental dark-page title at ~97px/1.03 weight 400 with metallic clipped fill (re-tint gold); a compact
  reading island (~744px) with full-width scenes around it; finish with one monumental invitation device.
- Don't: turn every feature into a raised card; use flat 1px structure instead.

### North Kingdom — refero:style/a9df281f-d000-436b-9148-90af45f5070d
Cinematic creative-technology style: near-black stages, saturated game worlds, enormous light lettering and a
monumental typographic sign-off; interface stays monochrome so the world supplies the color.
- Do: let the code-drawn hero scene carry the color; keep the UI chrome neutral; sparse copy.
- Don't: introduce a persistent accent hue into nav, buttons and surfaces beyond the one gilded accent; add drop
  shadows or bordered panels around the hero scene; center every paragraph.

## Differentiate from
<!-- Competitors we must not resemble (feeds DESIGN.md v1 "Reference set"). -->
- Daggerheart / Darrington Press (R05): same feel, never its logo, lettering, nav-frame shape, card frames or art.
- Big-platform game pages (R02, R04 Epic/PlayStation store chrome): blue CTAs, carousels, long marketing scroll.
- Stock PDF.js / generic doc-viewer chrome (R08, R09): grey icon toolbars and white system sheets; our viewer must
  look like part of the same gilded world as the landing.
- Generic SaaS dark-luxury (R18): logo walls, feature grids, testimonial bands.
