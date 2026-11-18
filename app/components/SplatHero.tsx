"use client";

import { useEffect, useRef } from "react";
import type { SceneMeta } from "../lib/splat/scene";

const inflate = async (url: string): Promise<Uint8Array> => {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(url);
  return new Uint8Array(await new Response(res.body.pipeThrough(new DecompressionStream("deflate"))).arrayBuffer());
};

/**
 * The pixel-art splat over the server-rendered still. Mounts a canvas only when motion is welcome and WebGL exists, and only after
 * the page has loaded and gone idle, so the still stays the LCP and the splat code (a separate chunk) never blocks first paint.
 * The hero's `data-splat` attribute reads "still" (default), "loading" or "live".
 */
export default function SplatHero() {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = mount.current;
    const hero = box?.parentElement;
    if (!box || !hero) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let stop = () => {};
    let canvas: HTMLCanvasElement | null = null;
    let cancelled = false;

    const still = () => { stop(); stop = () => {}; canvas?.remove(); canvas = null; hero.dataset.splat = "still"; };

    const start = async () => {
      if (cancelled || reduce.matches || typeof DecompressionStream === "undefined") return;
      const probe = document.createElement("canvas");
      if (!probe.getContext("webgl")) return;
      hero.dataset.splat = "loading";
      try {
        const [{ startSplat }, meta, idx, depth] = await Promise.all([
          import("../lib/splat/renderer"),
          fetch("/splat/scene.json").then((r) => r.json() as Promise<SceneMeta>),
          inflate("/splat/idx.bin"),
          inflate("/splat/depth.bin"),
        ]);
        if (cancelled || reduce.matches) { if (!cancelled) still(); return; }
        canvas = document.createElement("canvas");
        canvas.className = "hero-splat";
        canvas.setAttribute("aria-hidden", "true");
        box.append(canvas);
        const stats = { points: 0, frames: 0, dtSum: 0, drawSum: 0, buffer: "" };
        const perf = location.hash === "#perf";
        if (perf) (window as unknown as { __splat: typeof stats }).__splat = stats;
        stop = startSplat({ hero, canvas, scene: meta, idx, depth, reduce, stats, syncPerf: perf });
        hero.dataset.splat = "live";
      } catch {
        still();
      }
    };

    let idle = 0;
    const schedule = () => {
      const go = () => { idle = window.setTimeout(start, 0); };
      const ric = (window as { requestIdleCallback?: (cb: () => void, o: { timeout: number }) => number }).requestIdleCallback;
      idle = ric ? ric(go, { timeout: 2500 }) : window.setTimeout(go, 400);
    };
    if (document.readyState === "complete") schedule();
    else addEventListener("load", schedule, { once: true });

    const onReduce = () => { if (reduce.matches) still(); else start(); };
    reduce.addEventListener("change", onReduce);
    return () => {
      cancelled = true;
      clearTimeout(idle);
      removeEventListener("load", schedule);
      reduce.removeEventListener("change", onReduce);
      still();
    };
  }, []);

  return <div ref={mount} className="hero-splat-mount" aria-hidden="true" />;
}
