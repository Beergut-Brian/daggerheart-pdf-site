# High Sodium Gaming — Daggerheart resources

Next.js 16 (App Router) · React 19 · Tailwind 4 · pdf.js (`pdfjs-dist`).

- `/` landing (see `app/page.tsx`).
- `/resources` the shelf, driven by `app/books.ts`.
- `/resources/[slug]` the reader: range-request PDF, thumbnails, chapters, instant search from a prebuilt index.

## Add a book
1. Upload the PDF to the R2 bucket (`NEXT_PUBLIC_PDF_BASE`), range requests + CORS (`Content-Range`, `Accept-Ranges`, `Content-Length`) on.
2. Add an entry to `app/books.ts` and a cover in `public/covers/<name>.{avif,webp}`.
3. Search index: `npm run build:search` (text via pdf.js for PDFs with a text layer; OCR JSON for image-only books, see `scripts/build-search-index.mjs`). Commit `public/search/*`.
4. No outline in the PDF? Add `app/outlines/<slug>.json` and point `outline` at it.
5. PDFs made of page images: see `scripts/optimise-pdfs.md`.

## Develop
```bash
cp .env.example .env.local   # or symlink PDFs into public/pdfs (git-ignored) for offline work
npm ci && npm run dev
npm run lint && npm test && npm run build
npm run test:e2e             # Playwright; builds nothing, runs `next start -p 3100` (build first)
```
