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
