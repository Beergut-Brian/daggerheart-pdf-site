# References — hsg-daggerheart

<!-- Stage 1b (design-phase v2). 15–25 references (config.yml reference_count) in four buckets.
     Every reference has a shot in shots/<ref-id>.<ext> (refero.py shot|fetch writes it plus a
     .json with source and fetch time). A reference with no Borrow note is deleted.
     Shots are third-party screenshots for internal design research only: never in git,
     never on a public page (shots/.gitignore). -->

Buckets: competitor | adjacent | aspirational | client
Source: refero:<id> | url | client

## R01 — <Product / page name>
- Bucket: adjacent
- Source: refero:screen/<uuid> · https://example.org/visit
- Shot: shots/R01.png · fetched YYYY-MM-DD
- Job match: "<the user job this reference solves, e.g. orient a first-time visitor in under a minute, then invite exploring>"
- Borrow: <named, specific: the 3-level hero type scale (display / lede / meta); section rhythm with
  alternating surface colors; a persistent "what are you looking for?" entry point>
- Avoid: <the mega-menu; hero carousel>
- Style tags (from Refero, if any): <editorial, warm neutrals, high type contrast>

## R02 — ...

## Refero styles
<!-- 2–4 styles that fit the v0 brand constraints (refero_get_style); keep their do/don't rules. -->
### <style name> — refero:style/<uuid>
- Do: ...
- Don't: ...

## Differentiate from
<!-- Competitors we must not resemble (feeds DESIGN.md v1 "Reference set"). -->
-
