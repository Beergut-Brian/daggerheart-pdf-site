/** The shelf. Adding a book = one entry here + its PDF in R2 + `npm run build:search` (+ an outline file if the PDF has none). */
export interface Book {
  slug: string;
  title: string;
  subtitle: string;
  pages: number;
  /** shown after the page count, e.g. "5 chapters" or "Expansion" */
  chapters: string;
  /** cover base path under /public/covers (served as .avif with a .webp fallback) */
  cover: string;
  /** PDF file name under NEXT_PUBLIC_PDF_BASE */
  pdf: string;
  /** file name under /public/search (text index; `<name>.boxes.json` holds the highlight boxes) */
  searchIndex: string;
  /** null = use the PDF's own outline; otherwise a file under app/outlines */
  outline: string | null;
}

export const books: Book[] = [
  {
    slug: "core-rulebook",
    title: "Daggerheart Core Rulebook",
    subtitle: "Everything: characters, play, GM tools, adversaries, campaign frames",
    pages: 397,
    chapters: "5 chapters",
    cover: "core-rulebook",
    pdf: "Daggerheart-optimized.pdf",
    searchIndex: "core-rulebook.json",
    outline: null,
  },
  {
    slug: "hope-and-fear",
    title: "Daggerheart: Hope & Fear",
    subtitle: "The expansion",
    pages: 204,
    chapters: "Expansion",
    cover: "hope-and-fear",
    pdf: "Daggerheart-Hope-and-Fear.pdf",
    searchIndex: "hope-and-fear.json",
    outline: "hope-and-fear.json",
  },
];

export const bookBySlug = (slug: string): Book | undefined => books.find((b) => b.slug === slug);

export const bookMeta = (b: Book): string => `${b.pages} pages · ${b.chapters}`;

/** Where the PDFs live. Local dev falls back to /pdfs (git-ignored). */
export const pdfUrl = (b: Book, base = process.env.NEXT_PUBLIC_PDF_BASE || "/pdfs"): string =>
  `${base.replace(/\/$/, "")}/${b.pdf}`;
