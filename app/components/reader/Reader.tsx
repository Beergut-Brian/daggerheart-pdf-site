"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { pdfUrl, type Book } from "../../books";
import { chapterFor, highlightRects, prepare, search, snippet, type LineBox, type OutlineItem, type Prepared, type SearchResult } from "../../lib/search";
import PageThumb from "./PageThumb";
import { openDocument, readOutline, RenderQueue, renderInto } from "./pdf";

const SUGGEST = ["Hope", "Fear", "Stress", "Evasion"];

function useDesktop(): boolean | null {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia("(min-width: 900px)"); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia("(min-width: 900px)").matches,
    () => null,
  );
}

type Load = { state: "opening" } | { state: "loading"; pct: number } | { state: "ready" } | { state: "failed" };
type Sheet = null | "pages" | "chapters" | "search";

function Icon({ id }: { id: string }) {
  const d: Record<string, React.ReactNode> = {
    back: <path d="M19 12H5M11 6l-6 6 6 6" />, x: <path d="M6 6l12 12M18 6L6 18" />, minus: <path d="M6 12h12" />, plus: <path d="M6 12h12M12 6v12" />,
    fit: <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />, search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
    pages: <><rect x="4" y="4" width="6.5" height="7" rx="1" /><rect x="13.5" y="4" width="6.5" height="7" rx="1" /><rect x="4" y="13" width="6.5" height="7" rx="1" /><rect x="13.5" y="13" width="6.5" height="7" rx="1" /></>,
    up: <path d="M6 15l6-6 6 6" />, down: <path d="M6 9l6 6 6-6" />, prev: <path d="M15 6l-6 6 6 6" />, next: <path d="M9 6l6 6-6 6" />,
  };
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{d[id]}</svg>;
}

export default function Reader({ book, staticOutline }: { book: Book; staticOutline: OutlineItem[] | null }) {
  const desktop = useDesktop();
  const [load, setLoad] = useState<Load>({ state: "opening" });
  const [slow, setSlow] = useState(false);
  const [retry, setRetry] = useState(0);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>(staticOutline ?? []);
  const urlParam = (k: string) => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(k));
  const [page, setPageRaw] = useState(() => { const p = parseInt(urlParam("p") ?? "", 10); return p >= 1 && p <= book.pages ? p : 1; });
  const [zoom, setZoom] = useState(1);
  const [draft, setDraft] = useState<string | null>(null);
  const [pageErr, setPageErr] = useState<{ page: number; msg: string } | null>(null);
  const [query, setQuery] = useState(() => urlParam("q") ?? "");
  const [closedFor, setClosedFor] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [railTab, setRailTab] = useState<"pages" | "chapters">("pages");
  const [focusAt, setFocusAt] = useState<{ q: string; i: number }>({ q: "", i: 0 });
  const [index, setIndex] = useState<Prepared | null>(null);
  const [indexState, setIndexState] = useState<"idle" | "loading" | "failed">("idle");
  const [lines, setLines] = useState<Record<string, LineBox[]> | null>(null);
  const [matchIdx, setMatchIdx] = useState(0);
  const [canvasBox, setCanvasBox] = useState({ w: 0, h: 0 });

  const queue = useMemo(() => new RenderQueue(2), []);
  const stage = useRef<HTMLElement | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const t0 = useRef(0);
  const fetching = useRef(false);
  const firstPaint = useRef(false);
  const [avail, setAvail] = useState(360);
  const total = book.pages;

  const setPage = useCallback((n: number) => { setPageRaw(Math.min(Math.max(1, Math.round(n)), total)); setMatchIdx(0); }, [total]);
  const pageText = draft ?? String(page);
  const pageError = pageErr && pageErr.page === page ? pageErr.msg : "";

  // ---- open the PDF ----
  useEffect(() => {
    let dead = false;
    t0.current = performance.now();
    firstPaint.current = false;
    const slowTimer = setTimeout(() => setSlow(true), 8000);
    let task: Awaited<ReturnType<typeof openDocument>> | null = null;
    (async () => {
      try {
        task = await openDocument(pdfUrl(book), (pct) => { if (!dead) setLoad((l) => (l.state === "ready" ? l : { state: "loading", pct })); });
        const d = await task.promise;
        if (dead) return;
        setDoc(d); setLoad({ state: "ready" });
        if (!staticOutline) readOutline(d).then((o) => { if (!dead) setOutline(o); });
      } catch { if (!dead) setLoad({ state: "failed" }); }
    })();
    return () => { dead = true; clearTimeout(slowTimer); queue.clear(); queue.pause(); task?.destroy(); };
  }, [book, staticOutline, retry, queue]);

  // ---- state to the URL (?p=19&q=hope); read back by the initialisers above ----
  useEffect(() => {
    const sp = new URLSearchParams();
    if (page > 1) sp.set("p", String(page));
    if (query.trim()) sp.set("q", query.trim());
    const s = sp.toString();
    window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
  }, [page, query]);

  // ---- measure the stage ----
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      setAvail(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [desktop, load.state]);

  // ---- render the current page ----
  const fitWidth = Math.max(160, Math.min(avail, desktop ? 900 : 760));
  const pageWidth = Math.round(fitWidth * zoom);
  useEffect(() => {
    if (!doc || !canvas.current) return;
    let dead = false, task: RenderTask | null = null;
    (async () => {
      const p = await doc.getPage(page);
      if (dead || !canvas.current) return;
      const r = renderInto(p, canvas.current, pageWidth);
      task = r.task;
      setCanvasBox({ w: pageWidth, h: r.cssHeight });
      try { await task.promise; } catch { return; }
      if (!firstPaint.current && !dead) {
        firstPaint.current = true;
        const ms = Math.round(performance.now() - t0.current);
        (window as unknown as { __firstPageMs?: number }).__firstPageMs = ms;
        document.body.dataset.firstPageMs = String(ms);
        queue.resume();
      }
      if (!dead) document.body.dataset.pageReady = String(page);
    })().catch(() => {});
    return () => { dead = true; task?.cancel(); };
  }, [doc, page, pageWidth, desktop, queue]);

  // ---- search: lazy index, instant ranking ----
  const wantIndex = query.trim().length >= 2;
  useEffect(() => {
    if (!wantIndex || index || indexState !== "idle" || fetching.current) return;
    fetching.current = true;
    fetch(`/search/${book.searchIndex}`).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((j) => setIndex(prepare(j)))
      .catch(() => setIndexState("failed"))
      .finally(() => { fetching.current = false; });
  }, [wantIndex, index, indexState, book.searchIndex]);
  const [debounced, setDebounced] = useState(query);
  useEffect(() => { const t = setTimeout(() => setDebounced(query), 60); return () => clearTimeout(t); }, [query]);
  const result: SearchResult | null = useMemo(() => {
    if (!index) return null;
    return search(index, debounced);
  }, [index, debounced]);
  const focus = focusAt.q === debounced ? focusAt.i : 0;
  const [moreAt, setMoreAt] = useState<{ q: string; n: number }>({ q: "", n: 0 });
  const shown = 40 + (moreAt.q === debounced ? moreAt.n : 0); // render 40 rows, then 40 more on demand (keeps typing snappy)
  const setFocus = (f: number | ((n: number) => number)) => setFocusAt((cur) => ({ q: debounced, i: typeof f === "function" ? f(cur.q === debounced ? cur.i : 0) : f }));

  // ---- highlight boxes for the current page ----
  const wantBoxes = !!result && result.total > 0 && !lines;
  useEffect(() => {
    if (!wantBoxes) return;
    let dead = false;
    fetch(`/search/${book.searchIndex.replace(/\.json$/, "")}.boxes.json`).then((r) => r.json()).then((j) => { if (!dead) setLines(j.p); }).catch(() => {});
    return () => { dead = true; };
  }, [wantBoxes, book.searchIndex]);
  const rects = useMemo(() => (result && lines && lines[String(page)] ? highlightRects(lines[String(page)], result.tokens) : []), [result, lines, page]);
  const onPageHit = result?.hits.some((h) => h.page === page) ?? false;
  useEffect(() => {
    if (!rects.length) return;
    document.querySelector('[data-active="true"]')?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  }, [rects, matchIdx, page]);

  const jump = (n: number) => { setPage(n); setSheet(null); };
  const openHit = (i: number) => { const h = result?.hits[i]; if (h) { setFocus(i); jump(h.page); } };
  const clearSearch = () => { setQuery(""); searchInput.current?.focus(); };
  const commitPage = () => {
    const n = parseInt(pageText, 10);
    setDraft(null);
    if (!n || n < 1 || n > total) { setPageErr({ page, msg: `No page ${pageText || "—"}. This book has ${total}.` }); return; }
    setPage(n);
  };

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA";
      if (el === searchInput.current) {
        if (e.key === "ArrowDown" && result?.hits.length) { e.preventDefault(); setFocus((f) => Math.min(f + 1, Math.min(shown, result.hits.length) - 1)); }
        else if (e.key === "ArrowUp" && result?.hits.length) { e.preventDefault(); setFocus((f) => Math.max(f - 1, 0)); }
        else if (e.key === "Enter" && result?.hits.length) { e.preventDefault(); openHit(focus); }
        else if (e.key === "Escape") { clearSearch(); }
        return;
      }
      if (typing) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); setPage(page + 1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); setPage(page - 1); }
      else if (e.key === "Home") setPage(1);
      else if (e.key === "End") setPage(total);
      else if (e.key === "/") { e.preventDefault(); if (desktop) searchInput.current?.focus(); else setSheet("search"); }
      else if (e.key === "Escape") setSheet(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- phone gestures: swipe to turn, double-tap to zoom ----
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTap = useRef(0);
  const onTouchStart = (e: React.PointerEvent) => { touch.current = { x: e.clientX, y: e.clientY, t: Date.now() }; };
  const onTouchEnd = (e: React.PointerEvent) => {
    const s = touch.current; touch.current = null;
    if (!s || desktop) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (zoom === 1 && Math.abs(dx) > 60 && Math.abs(dy) < 45) { setPage(page + (dx < 0 ? 1 : -1)); return; }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) { const now = Date.now(); if (now - lastTap.current < 300) setZoom((z) => (z === 1 ? 2.2 : 1)); lastTap.current = now; }
  };

  const noun = book.title.includes("Rulebook") ? "the rulebook" : "this book";
  const placeholder = `Search ${noun} — try "Hope"`;
  const showResults = wantIndex && closedFor !== query;
  const chapterOf = (p: number) => chapterFor(outline, p);

  // ---------- pieces ----------
  const searchField = (
    <div className="field">
      <Icon id="search" />
      <input ref={searchInput} type="search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label={`Search ${book.title}`} placeholder={placeholder} autoComplete="off" spellCheck={false} />
      {query && <button className="ib sm" aria-label="Clear search" onClick={clearSearch}><Icon id="x" /></button>}
    </div>
  );

  const resultsBody = (
    <>
      {!wantIndex ? (
        <p className="count">Type two letters or more to search.</p>
      ) : indexState === "failed" ? (
        <p className="count">Search hit a snag. <button className="linkbtn" onClick={() => { setIndexState("idle"); }}>Try again</button></p>
      ) : !index ? (
        <p className="count" role="status">Reading the book…</p>
      ) : result && result.total === 0 ? (
        <div className="empty" role="status">
          <p>Nothing for “{debounced}”. Check the spelling, or try a shorter word.</p>
          <p className="muted">Try: {SUGGEST.map((s) => <button key={s} className="chip" onClick={() => setQuery(s)}>{s}</button>)}</p>
        </div>
      ) : result ? (
        <>
          <p className="count" role="status">
            {result.total > result.hits.length ? `${result.total}+ results for “${debounced}”. Add a word to narrow it.` : `${result.total} result${result.total === 1 ? "" : "s"} for “${debounced}”`}
          </p>
          <div className="hits" role="listbox" aria-label="Search results">
            {result.hits.slice(0, shown).map((h, i) => (
              <button key={h.page} role="option" aria-selected={i === focus} className={`hit${i === focus ? " focus" : ""}`} onClick={() => openHit(i)} aria-label={`Page ${h.page}, ${chapterOf(h.page)}`}>
                <PageThumb doc={doc} queue={queue} page={h.page} width={44} />
                <span>
                  <span className="sn">{snippet(index, h, result.tokens).map((s, k) => (s.mark ? <mark key={k}>{s.text}</mark> : <span key={k}>{s.text}</span>))}</span>
                  <span className="mt">{chapterOf(h.page) || "—"} · <b>p. {h.page}</b></span>
                </span>
              </button>
            ))}
            {result.hits.length > shown && <button className="more" onClick={() => setMoreAt({ q: debounced, n: (moreAt.q === debounced ? moreAt.n : 0) + 40 })}>Show more results</button>}
          </div>
        </>
      ) : null}
    </>
  );
  // keep the focused result in view when moving with the arrow keys
  useEffect(() => { document.querySelector(".hit.focus")?.scrollIntoView({ block: "nearest" }); }, [focus, result]);

  const thumbGrid = (w: number) => (
    <div className={`thumbs${desktop ? "" : " three"}`}>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <button key={n} className={`th${n === page ? " cur" : ""}`} onClick={() => jump(n)} aria-label={`Page ${n}`} aria-current={n === page ? "page" : undefined}>
          <PageThumb doc={doc} queue={queue} page={n} width={w} /><span className="tn">{n}</span>
        </button>
      ))}
    </div>
  );
  useEffect(() => { document.querySelector(".th.cur")?.scrollIntoView({ block: "nearest" }); }, [page, railTab, sheet, desktop]);

  const curCh = outline.reduce((acc, c, i) => (c.page <= page ? i : acc), -1);
  const chapterList = (
    <div className="chapters">
      {outline.length === 0 && <p className="count">No chapter list for this book.</p>}
      {outline.map((c, ci) => {
        const active = ci === curCh;
        const curSec = active ? (c.items ?? []).reduce((acc, s, i) => (s.page <= page ? i : acc), -1) : -1;
        return (
          <div key={c.title + c.page} className="chgroup">
            <button className={`ch top${active ? " cur" : ""}`} onClick={() => jump(c.page)} aria-current={active ? "location" : undefined}><span>{c.title}</span><span className="muted">{c.page}</span></button>
            {c.items?.map((s, si) => (
              <button key={s.title + s.page} className={`ch sub${si === curSec ? " cur" : ""}`} onClick={() => jump(s.page)}><span>{s.title}</span><span className="muted">{s.page}</span></button>
            ))}
          </div>
        );
      })}
    </div>
  );

  const pageView = (
    <div className="pagewrap" style={{ width: canvasBox.w || pageWidth, height: canvasBox.h || undefined }}>
      <canvas ref={canvas} aria-label={`Page ${page} of ${total}`} role="img" />
      <div className="marks" aria-hidden="true">
        {rects.map((r, i) => <span key={i} className={`mk${i === matchIdx ? " active" : ""}`} data-active={i === matchIdx ? "true" : undefined}
          style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }} />)}
      </div>
    </div>
  );
  const matchNav = onPageHit && rects.length > 0 && (
    <div className="onpage">
      <button className="ib" aria-label="Previous match" onClick={() => setMatchIdx((i) => (i - 1 + rects.length) % rects.length)}><Icon id="up" /></button>
      <span>{matchIdx + 1} of {rects.length} on this page</span>
      <button className="ib" aria-label="Next match" onClick={() => setMatchIdx((i) => (i + 1) % rects.length)}><Icon id="down" /></button>
    </div>
  );

  // ---------- states ----------
  if (desktop === null) return <div className="vstate" role="status">Opening the book…</div>;
  if (load.state === "failed") return (
    <div className="vstate"><p>The book didn’t open. Check your signal.</p><button className="pill small" onClick={() => { setLoad({ state: "opening" }); setSlow(false); setRetry((n) => n + 1); }}>Try again</button><Link className="back" href="/resources">Daggerheart Resources</Link></div>
  );
  const status = load.state === "ready" ? null : (
    <div className="vstate overlay" role="status">
      <p>{load.state === "loading" ? `Loading pages · ${load.pct}%` : "Opening the book…"}</p>
      {slow && <p className="muted">Big book, slow signal. Page 1 is on its way.</p>}
    </div>
  );

  if (desktop) {
    return (
      <div className="vdesk viewer">
        <header className="vbar">
          <Link className="hsg" href="/" aria-label="High Sodium Gaming home">HSG</Link>
          <Link className="vback" href="/resources"><Icon id="back" />Daggerheart Resources</Link>
          <span className="vtitle">{book.title}</span>
          <span className="grow" />
          <label className="pgnum">Page <input value={pageText} inputMode="numeric" aria-label="Go to page" size={3} aria-invalid={!!pageError}
            onChange={(e) => setDraft(e.target.value)} onBlur={commitPage} onKeyDown={(e) => { if (e.key === "Enter") { commitPage(); (e.target as HTMLInputElement).blur(); } }} /> of {total}</label>
          <div className="zoom" role="group" aria-label="Zoom">
            <button className="ib" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, +(z / 1.25).toFixed(3)))}><Icon id="minus" /></button>
            <button className="ib" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(3, +(z * 1.25).toFixed(3)))}><Icon id="plus" /></button>
            <button className="ib" aria-label="Fit width" onClick={() => setZoom(1)}><Icon id="fit" /></button>
          </div>
          {searchField}
        </header>
        <div className={`vbody${showResults ? "" : " noresults"}`}>
          <aside className="rail" aria-label="Pages and chapters">
            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={railTab === "pages"} className={railTab === "pages" ? "on" : ""} onClick={() => setRailTab("pages")}>Pages</button>
              <button role="tab" aria-selected={railTab === "chapters"} className={railTab === "chapters" ? "on" : ""} onClick={() => setRailTab("chapters")}>Chapters</button>
            </div>
            <div className="railbody">{railTab === "pages" ? thumbGrid(110) : chapterList}</div>
          </aside>
          <main className="stage" id="main" ref={stage} tabIndex={-1}>
            {pageError && <p className="perr" role="alert">{pageError}</p>}
            {pageView}{matchNav}
            {status}
          </main>
          {showResults && (
            <aside className="results" aria-label="Search results">
              <div className="rhead"><b>{result && result.total ? "Results" : "Search"}</b><button className="ib sm" aria-label="Close results" onClick={() => setClosedFor(query)}><Icon id="x" /></button></div>
              {resultsBody}
              <div className="kbd">↑ ↓ to move · Enter to open</div>
            </aside>
          )}
        </div>
      </div>
    );
  }

  // phone
  return (
    <div className="vphone viewer">
      <div className="pbar"><Link className="ib" href="/resources" aria-label="Daggerheart Resources"><Icon id="back" /></Link><span className="vtitle">{book.title}</span><Link className="hsg" href="/" aria-label="High Sodium Gaming home">HSG</Link></div>
      <main className="stage pstage" id="main" ref={stage} onPointerDown={onTouchStart} onPointerUp={onTouchEnd}>
        {pageError && <p className="perr" role="alert">{pageError}</p>}
        {pageView}{matchNav}
        {status}
      </main>
      <nav className="dock" aria-label="Reader">
        <button className="dpill" onClick={() => setSheet("pages")}><Icon id="pages" />Pages</button>
        <span className="dpager">
          <button className="ib" aria-label="Previous page" onClick={() => setPage(page - 1)}><Icon id="prev" /></button>
          <button className="dnum" onClick={() => setSheet("pages")} aria-label={`Page ${page} of ${total}. Open pages`}>{page} / {total}</button>
          <button className="ib" aria-label="Next page" onClick={() => setPage(page + 1)}><Icon id="next" /></button>
        </span>
        <button className="dpill" onClick={() => { setSheet("search"); setTimeout(() => searchInput.current?.focus(), 50); }}><Icon id="search" />Search</button>
      </nav>
      {sheet && (
        <div className={`sheet${sheet === "search" ? " tall" : ""}`} role="dialog" aria-label="Pages, chapters and search">
          <div className="grab" aria-hidden="true" />
          <div className="sheethead">
            <div className="tabs" role="tablist">
              {(["pages", "chapters", "search"] as const).map((t) => <button key={t} role="tab" aria-selected={sheet === t} className={sheet === t ? "on" : ""} onClick={() => setSheet(t)}>{t === "pages" ? "Pages" : t === "chapters" ? "Chapters" : "Search"}</button>)}
            </div>
            <button className="close" onClick={() => setSheet(null)}>Close</button>
          </div>
          {sheet === "search" && <div className="sfield">{searchField}</div>}
          <div className="sheetbody">{sheet === "pages" ? thumbGrid(110) : sheet === "chapters" ? chapterList : resultsBody}</div>
        </div>
      )}
    </div>
  );
}
