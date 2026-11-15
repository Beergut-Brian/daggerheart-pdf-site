---
name: page-build
description: How to build each page from the design system: structure, data loading, images, states, and the per-page checklist. Use when building or changing any page or route on any site type.
---

# page-build

Pages are assembled from components. A page file contains layout, data loading, and composition; it does not contain styles or business logic.

> **WordPress + Bricks jobs:** pages are built through Bricks abilities, not code. Follow `wordpress-bricks` (and `bricks-html-css-to-bricks`, `bricks-templates-conditions`, `bricks-query-loops` as needed). The per-page checklist below still applies; "route" means a WordPress page or template.

## Per page

1. Open the page's entry in `design.md` (sections in order, primary action) and its Figma frame if there is one.
2. Compose from existing components. If a new component is needed, add it to the design system first, with states, then use it.
3. Data: fetch through the shared API client in `packages/`, never directly from a vendor. Handle loading, empty, and error states visibly.
4. Images: responsive sizes, explicit width and height, lazy loading below the fold, alt text that describes content (empty alt for decorative). Serve modern formats.
5. Metadata: title, description, canonical, Open Graph, and structured data come from the `seo` agent's `seo/metadata.json`; the page reads them, it does not hard-code them.
6. Forms: use the `forms-and-leads` skill. Client validation mirrors server validation.
7. Check `references/page-checklist.md` and fix before marking done.

## Rules

- One H1 per page, matching the page's purpose.
- Primary action visible without scrolling on a 390px-wide screen.
- No layout shift from images, fonts, or late-loading content.
- Internal links use the shared route helpers so URLs can change in one place.
- Business logic (pricing, eligibility, availability) lives in the backend or `packages/`, never in the page.

## Done when

Every page passes the checklist at 390px, 768px, and 1280px widths with no console errors.
