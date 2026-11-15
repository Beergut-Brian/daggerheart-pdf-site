import { describe, expect, it } from "vitest";
import { chapterFor, fold, highlightRects, prepare, search, snippet, tokenize } from "../../app/lib/search";

const idx = prepare({
  book: "t", pages: 4,
  t: [
    "Welcome to the table. Nothing about the topic here.",
    "HOPE AND FEAR Hope and Fear are currencies used by the players and the GM. Hope is spent.",
    "Spend a Hope to add the Experience's modifier. Hopeful players may also help.",
    "Café résumé: the naïve Cafe owner",
  ],
});

describe("normalising", () => {
  it("folds case and diacritics without changing length", () => {
    expect(fold("Café RÉSUMÉ naïve")).toBe("cafe resume naive");
    expect(fold("Café").length).toBe("Café".length);
  });
  it("tokenizes on punctuation and keeps apostrophes", () => {
    expect(tokenize("Hope, fear!  Experience's")).toEqual(["hope", "fear", "experience's"]);
  });
});

describe("ranking", () => {
  it("finds a diacritic-insensitive match", () => {
    expect(search(idx, "cafe").hits.map((h) => h.page)).toEqual([4]);
    expect(search(idx, "résumé").hits.map((h) => h.page)).toEqual([4]);
  });
  it("ranks more and whole-word matches first", () => {
    const r = search(idx, "hope");
    expect(r.total).toBe(2);
    expect(r.hits[0].page).toBe(2); // 3 whole-word hits beat 1 whole + 1 prefix
  });
  it("requires every token (AND) and rewards the phrase", () => {
    expect(search(idx, "hope fear").hits.map((h) => h.page)).toEqual([2]);
    expect(search(idx, "hope zzz").total).toBe(0);
  });
  it("ignores one-letter queries and empty input", () => {
    expect(search(idx, "h").total).toBe(0);
    expect(search(idx, "  ").total).toBe(0);
  });
  it("caps the hits list but reports the total", () => {
    const big = prepare({ book: "b", pages: 300, t: Array.from({ length: 300 }, () => "salt") });
    const r = search(big, "salt", 50);
    expect(r.total).toBe(300);
    expect(r.hits).toHaveLength(50);
  });
});

describe("snippets and highlights", () => {
  it("marks the hit and trims with ellipses", () => {
    const r = search(idx, "hope");
    const parts = snippet(idx, r.hits[1], r.tokens);
    expect(parts.some((p) => p.mark && fold(p.text) === "hope")).toBe(true);
    expect(parts.map((p) => p.text).join("")).toContain("Hope");
  });
  it("places highlight rectangles inside the line box", () => {
    const rects = highlightRects([["Spend 3 Hope now", 0.1, 0.2, 0.5, 0.25]], ["hope"]);
    expect(rects).toHaveLength(1);
    expect(rects[0].x).toBeGreaterThan(0.1);
    expect(rects[0].x + rects[0].w).toBeLessThanOrEqual(0.5);
    expect(rects[0].y).toBe(0.2);
  });
});

describe("chapter labels", () => {
  const outline = [
    { title: "Introduction", page: 5, items: [{ title: "Using This Book", page: 8 }] },
    { title: "Chapter One: Preparing For Adventure", page: 12, items: [{ title: "Class", page: 28 }] },
  ];
  it("labels chapter and section", () => {
    expect(chapterFor(outline, 29)).toBe("Ch 1 · Preparing For Adventure · Class");
    expect(chapterFor(outline, 9)).toBe("Introduction · Using This Book");
    expect(chapterFor(outline, 2)).toBe("");
  });
});
