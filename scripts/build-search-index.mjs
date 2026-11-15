#!/usr/bin/env node
// Builds the prebuilt search indexes: public/search/<slug>.json (text per page) and
// public/search/<slug>.boxes.json (line boxes per page, for highlighting; loaded lazily).
//   node scripts/build-search-index.mjs [slug ...]
// Core rulebook: text extracted with pdfjs-dist from the PDF (PDF_DIR, default ../pdfs).
// Hope & Fear: converted from the OCR file (OCR_DIR, default ../pdfs/ocr/hope-and-fear.ocr.json).
// Index shape: { book, pages, partial?, t: string[] }   boxes: { book, p: { "<page>": [[text, x0, y0, x1, y1], ...] } }  (fractions of the page, y from the top)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PDF_DIR = process.env.PDF_DIR || path.join(root, "..", "pdfs");
const OCR_FILE = process.env.OCR_FILE || path.join(PDF_DIR, "ocr", "hope-and-fear.ocr.json");
const out = path.join(root, "public", "search");
fs.mkdirSync(out, { recursive: true });
const round = (n) => Math.round(n * 1000) / 1000;
const clean = (s) => s.replace(/\s+/g, " ").trim();

function write(slug, index, boxes) {
  fs.writeFileSync(path.join(out, `${slug}.json`), JSON.stringify(index));
  fs.writeFileSync(path.join(out, `${slug}.boxes.json`), JSON.stringify(boxes));
  const sz = (f) => fs.statSync(path.join(out, f)).size;
  console.log(`${slug}: pages ${index.pages}${index.partial ? " (PARTIAL)" : ""}, text ${(sz(`${slug}.json`) / 1024).toFixed(0)} KB, boxes ${(sz(`${slug}.boxes.json`) / 1024).toFixed(0)} KB`);
}

async function core() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(path.join(PDF_DIR, "Daggerheart-optimized.pdf")));
  const doc = await pdfjs.getDocument({ data, disableFontFace: true, useSystemFonts: false, verbosity: 0 }).promise;
  const t = [], p = {};
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const [x0, y0, x1, y1] = page.view, W = x1 - x0, H = y1 - y0;
    const tc = await page.getTextContent();
    // reading order = the PDF's own item order (keeps columns apart); the line grouping below is only for boxes
    const reading = clean(tc.items.map((i) => i.str + (i.hasEOL ? " " : "")).join(" "));
    const items = tc.items.filter((i) => i.str && i.str.trim()).map((i) => {
      const e = i.transform[4] - x0, f = i.transform[5] - y0, h = Math.abs(i.height) || Math.abs(i.transform[3]) || 8;
      return { s: i.str, x0: e, x1: e + i.width, base: f, h };
    });
    // group items into lines by baseline, then split lines at wide gaps (columns)
    items.sort((a, b) => b.base - a.base || a.x0 - b.x0);
    const lines = [];
    for (const it of items) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.base - it.base) < it.h * 0.5 && it.x0 - last.x1 < it.h * 2.5 && it.x0 >= last.x0) {
        last.s += (it.x0 - last.x1 > it.h * 0.15 && !last.s.endsWith(" ") && !it.s.startsWith(" ") ? " " : "") + it.s;
        last.x1 = Math.max(last.x1, it.x1); last.h = Math.max(last.h, it.h);
      } else lines.push({ s: it.s, x0: it.x0, x1: it.x1, base: it.base, h: it.h });
    }
    t.push(reading);
    p[n] = lines.filter((l) => l.s.trim()).map((l) => [clean(l.s), round(l.x0 / W), round(1 - (l.base + l.h) / H), round(l.x1 / W), round(1 - (l.base - l.h * 0.25) / H)]);
    page.cleanup();
  }
  write("core-rulebook", { book: "core-rulebook", pages: doc.numPages, t }, { book: "core-rulebook", p });
}

function hopeAndFear() {
  if (!fs.existsSync(OCR_FILE)) { console.log(`hope-and-fear: no OCR file at ${OCR_FILE}, skipped`); return; }
  const ocr = JSON.parse(fs.readFileSync(OCR_FILE, "utf8"));
  const t = Array(ocr.pages).fill(""), p = {};
  for (const it of ocr.items) {
    t[it.p - 1] = clean(it.text || "");
    p[it.p] = (it.lines || []).map((l) => [clean(l.t), round(l.b[0]), round(l.b[1]), round(l.b[2]), round(l.b[3])]);
  }
  write("hope-and-fear", { book: "hope-and-fear", pages: ocr.pages, ...(ocr.partial ? { partial: true } : {}), t }, { book: "hope-and-fear", p });
}

const want = process.argv.slice(2);
if (!want.length || want.includes("core-rulebook")) await core();
if (!want.length || want.includes("hope-and-fear")) hopeAndFear();
