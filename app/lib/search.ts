/** Instant search over a prebuilt index. Never touches the PDF. */

export interface SearchIndex { book: string; pages: number; partial?: boolean; t: string[] }
export interface Prepared { pages: number; text: string[]; norm: string[] }
export interface Hit { page: number; score: number; count: number; pos: number }
export interface SearchResult { total: number; hits: Hit[]; tokens: string[] }
export type LineBox = [text: string, x0: number, y0: number, x1: number, y1: number];

/** Fold one character: lowercase, accents removed, always exactly one character out so offsets map 1:1. */
export function foldChar(ch: string): string {
  const d = ch.normalize("NFD")[0] ?? ch;
  const l = d.toLowerCase();
  return l.length === 1 ? l : d;
}
/** Fold a whole string without changing its length. */
export function fold(s: string): string {
  let out = "";
  for (const ch of s) out += foldChar(ch);
  return out;
}
export function tokenize(q: string): string[] {
  return fold(q).split(/[^\p{L}\p{N}']+/u).filter(Boolean);
}
export function prepare(index: SearchIndex): Prepared {
  return { pages: index.pages, text: index.t, norm: index.t.map(fold) };
}

const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);

/** Count occurrences of `tok` in `hay`; word-start matches weigh more, whole words most. */
function scoreToken(hay: string, tok: string): { score: number; count: number; first: number } {
  let i = hay.indexOf(tok), score = 0, count = 0, first = -1;
  while (i !== -1) {
    count++;
    if (first === -1) first = i;
    const startsWord = !isWordChar(hay[i - 1]);
    const endsWord = !isWordChar(hay[i + tok.length]);
    score += startsWord && endsWord ? 3 : startsWord ? 1.5 : 0.5;
    i = hay.indexOf(tok, i + tok.length);
  }
  return { score, count, first };
}

/** All tokens must appear on the page (AND). Rank: score, whole-phrase bonus, then page order. Needs 2+ characters. */
export function search(p: Prepared, query: string, limit = 200): SearchResult {
  const tokens = tokenize(query);
  if (!tokens.length || tokens.every((t) => t.length < 2)) return { total: 0, hits: [], tokens };
  const phrase = tokens.length > 1 ? tokens.join(" ") : "";
  const all: Hit[] = [];
  for (let n = 0; n < p.norm.length; n++) {
    const hay = p.norm[n];
    if (!hay) continue;
    let score = 0, count = 0, pos = Infinity, ok = true;
    for (const t of tokens) {
      const r = scoreToken(hay, t);
      if (!r.count) { ok = false; break; }
      score += r.score; count += r.count; pos = Math.min(pos, r.first);
    }
    if (!ok) continue;
    if (phrase) { const i = hay.indexOf(phrase); if (i !== -1) { score += 10; pos = i; } }
    all.push({ page: n + 1, score, count, pos });
  }
  all.sort((a, b) => b.score - a.score || a.page - b.page);
  return { total: all.length, hits: all.slice(0, limit), tokens };
}

export interface SnippetPart { text: string; mark: boolean }
/** A ~150 character snippet around the first hit, split into plain/marked parts (render as text nodes, never as HTML). */
export function snippet(p: Prepared, hit: Hit, tokens: string[], radius = 70): SnippetPart[] {
  const text = p.text[hit.page - 1], norm = p.norm[hit.page - 1];
  const start = Math.max(0, hit.pos - radius), end = Math.min(text.length, hit.pos + radius * 1.4);
  const flags = new Uint8Array(end - start);
  for (const t of tokens) {
    let i = norm.indexOf(t, start);
    while (i !== -1 && i < end) { for (let k = i; k < Math.min(end, i + t.length); k++) flags[k - start] = 1; i = norm.indexOf(t, i + t.length); }
  }
  const parts: SnippetPart[] = [];
  let cur = "", mark = false;
  for (let k = 0; k < flags.length; k++) {
    const m = flags[k] === 1;
    if (k && m !== mark) { parts.push({ text: cur, mark }); cur = ""; }
    mark = m; cur += text[start + k];
  }
  if (cur) parts.push({ text: cur, mark });
  if (start > 0 && parts.length) parts[0].text = "…" + parts[0].text.replace(/^\S*\s/, "");
  if (end < text.length && parts.length) parts[parts.length - 1].text += "…";
  return parts;
}

export interface Rect { x: number; y: number; w: number; h: number }
/** Highlight rectangles (page fractions) for the query on one page, from its line boxes. Sub-spans are placed by character proportion. */
export function highlightRects(lines: LineBox[], tokens: string[]): Rect[] {
  const rects: Rect[] = [];
  for (const [text, x0, y0, x1, y1] of lines) {
    const norm = fold(text), len = Math.max(1, text.length);
    for (const t of tokens) {
      let i = norm.indexOf(t);
      while (i !== -1) {
        const a = x0 + ((x1 - x0) * i) / len, b = x0 + ((x1 - x0) * (i + t.length)) / len;
        rects.push({ x: a, y: y0, w: Math.max(b - a, 0.004), h: y1 - y0 });
        i = norm.indexOf(t, i + t.length);
      }
    }
  }
  return rects.sort((a, b) => a.y - b.y || a.x - b.x);
}

export interface OutlineItem { title: string; page: number; items?: OutlineItem[] }
/** The chapter label for a page: "Chapter title · section" from a (two-level) outline. */
export function chapterFor(outline: OutlineItem[], page: number): string {
  let ch: OutlineItem | undefined, sec: OutlineItem | undefined;
  for (const c of outline) if (c.page <= page) ch = c;
  if (!ch) return "";
  for (const s of ch.items ?? []) if (s.page <= page) sec = s;
  const short = ch.title.replace(/^Chapter (\w+): /, (_, w) => `Ch ${w === "One" ? 1 : w === "Two" ? 2 : w === "Three" ? 3 : w === "Four" ? 4 : w === "Five" ? 5 : w} · `);
  return sec && sec.title !== ch.title ? `${short} · ${sec.title}` : short;
}
