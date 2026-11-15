"use client";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderInto, type RenderQueue } from "./pdf";

/** A page thumbnail that draws itself only once it scrolls into view (a blank parchment slot until then). */
export default function PageThumb({ doc, queue, page, width }: { doc: PDFDocumentProxy | null; queue: RenderQueue; page: number; width: number }) {
  const wrap = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [seen, setSeen] = useState(false);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!seen || !doc || drawn) return;
    let dead = false;
    queue.add(async () => {
      if (dead) return;
      const p = await doc.getPage(page);
      if (dead || !canvas.current) return;
      const { task } = renderInto(p, canvas.current, width, 2);
      await task.promise;
      p.cleanup();
      if (!dead) setDrawn(true);
    });
    return () => { dead = true; };
  }, [seen, doc, drawn, page, width, queue]);

  return (
    <span ref={wrap} className={`tp${drawn ? " drawn" : ""}`} aria-hidden="true">
      <canvas ref={canvas} />
    </span>
  );
}
