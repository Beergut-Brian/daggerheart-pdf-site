import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { bookBySlug, bookMeta, books, pdfUrl } from "../../app/books";

const root = path.resolve(__dirname, "../..");

describe("books data", () => {
  it("has unique slugs and the two real books", () => {
    expect(new Set(books.map((b) => b.slug)).size).toBe(books.length);
    expect(bookBySlug("core-rulebook")?.pages).toBe(397);
    expect(bookBySlug("hope-and-fear")?.pages).toBe(204);
    expect(bookBySlug("nope")).toBeUndefined();
  });
  it("formats the meta line", () => {
    expect(bookMeta(books[0])).toBe("397 pages · 5 chapters");
    expect(bookMeta(books[1])).toBe("204 pages · Expansion");
  });
  it("builds PDF urls from the base, trimming a trailing slash", () => {
    expect(pdfUrl(books[0], "https://pdfs.example.com/")).toBe("https://pdfs.example.com/Daggerheart-optimized.pdf");
    expect(pdfUrl(books[1], "/pdfs")).toBe("/pdfs/Daggerheart-Hope-and-Fear.pdf");
  });
  it("has the covers, search index and outline files every entry points to", () => {
    for (const b of books) {
      expect(fs.existsSync(path.join(root, "public/covers", `${b.cover}.webp`))).toBe(true);
      expect(fs.existsSync(path.join(root, "public/covers", `${b.cover}.avif`))).toBe(true);
      expect(fs.existsSync(path.join(root, "public/search", b.searchIndex))).toBe(true);
      if (b.outline) expect(fs.existsSync(path.join(root, "app/outlines", b.outline))).toBe(true);
    }
  });
  it("keeps outline pages inside each book", () => {
    for (const b of books.filter((x) => x.outline)) {
      const o = JSON.parse(fs.readFileSync(path.join(root, "app/outlines", b.outline!), "utf8")) as { page: number; items?: { page: number }[] }[];
      for (const c of o) { expect(c.page).toBeGreaterThanOrEqual(1); expect(c.page).toBeLessThanOrEqual(b.pages); for (const s of c.items ?? []) expect(s.page).toBeLessThanOrEqual(b.pages); }
    }
  });
});
