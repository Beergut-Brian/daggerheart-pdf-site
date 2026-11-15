import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import type { OutlineItem } from "../../lib/search";

let lib: Promise<typeof import("pdfjs-dist")> | null = null;
export function loadPdfjs() {
  lib ??= import("pdfjs-dist").then((m) => {
    m.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    return m;
  });
  return lib;
}

/** Open a PDF with range requests: the first page paints without downloading the whole file. */
export async function openDocument(url: string, onProgress?: (pct: number) => void) {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({
    url,
    disableAutoFetch: true,
    disableStream: false,
    rangeChunkSize: 256 * 1024,
    wasmUrl: "/pdfjs/wasm/",
    cMapUrl: "/pdfjs/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "/pdfjs/standard_fonts/",
  });
  if (onProgress) task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => { if (total) onProgress(Math.min(100, Math.round((loaded / total) * 100))); };
  return task;
}

/** Resolve the PDF's own outline to page numbers (two levels). */
export async function readOutline(doc: PDFDocumentProxy): Promise<OutlineItem[]> {
  const raw = await doc.getOutline();
  if (!raw) return [];
  const pageOf = async (dest: unknown): Promise<number | null> => {
    try {
      const d = typeof dest === "string" ? await doc.getDestination(dest) : (dest as unknown[] | null);
      if (!d) return null;
      return (await doc.getPageIndex(d[0] as never)) + 1;
    } catch { return null; }
  };
  const out: OutlineItem[] = [];
  for (const o of raw) {
    const page = await pageOf(o.dest);
    if (!page) continue;
    const items: OutlineItem[] = [];
    for (const c of o.items ?? []) { const p = await pageOf(c.dest); if (p) items.push({ title: c.title, page: p }); }
    out.push({ title: o.title, page, ...(items.length ? { items } : {}) });
  }
  return out;
}

/** Render `page` into `canvas` so it is `cssWidth` CSS px wide. */
export function renderInto(page: PDFPageProxy, canvas: HTMLCanvasElement, cssWidth: number, maxDpr = 2.5): { task: RenderTask; cssHeight: number } {
  const base = page.getViewport({ scale: 1 });
  const cssScale = cssWidth / base.width;
  let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const px = base.width * base.height * (cssScale * dpr) ** 2;
  if (px > 16e6) dpr *= Math.sqrt(16e6 / px);
  const vp = page.getViewport({ scale: cssScale * dpr });
  canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
  canvas.style.width = `${cssWidth}px`; canvas.style.height = `${(cssWidth * base.height) / base.width}px`;
  const ctx = canvas.getContext("2d")!;
  return { task: page.render({ canvas, canvasContext: ctx, viewport: vp }), cssHeight: (cssWidth * base.height) / base.width };
}

/** A tiny queue so thumbnails never starve the main page. */
export class RenderQueue {
  private q: (() => Promise<void>)[] = [];
  private running = 0;
  constructor(private limit = 2) {}
  add(job: () => Promise<void>) { this.q.push(job); this.pump(); }
  clear() { this.q = []; }
  private pump() {
    while (this.running < this.limit && this.q.length) {
      const job = this.q.shift()!;
      this.running++;
      job().catch(() => {}).finally(() => { this.running--; this.pump(); });
    }
  }
}
