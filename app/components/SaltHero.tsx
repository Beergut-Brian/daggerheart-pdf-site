"use client";
import { useEffect, useRef } from "react";
import { mountSalt } from "../lib/salt-engine";

/** The full-screen salt field. Grain counts scale with the screen; the loop pauses when hidden. */
export default function SaltHero() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const css = getComputedStyle(document.documentElement);
    const tok = (v: string) => css.getPropertyValue(v).trim();
    const phone = window.matchMedia("(max-width: 699px)").matches;
    const hero = canvas.parentElement as HTMLElement;
    const handle = mountSalt(canvas, {
      cell: 2, pileGrain: 1.25, maxGrains: phone ? 5200 : 16000,
      colors: ["--grain-1", "--grain-2", "--grain-3", "--grain-4"].map(tok), glint: tok("--grain-glint"),
      field: {
        density: 0.0085, max: phone ? 2800 : 10000, rMin: 0.5, rMax: phone ? 1.45 : 1.6, drift: 3,
        hover: phone ? 30 : 34, tapRadius: 64,
        avoid: [".wm", ".tag", ".stack .pill"], avoidPad: 8, avoidAlpha: 0.1, twinkle: phone ? 18 : 34, restPile: 0.1,
      },
      floor: true,
      solids: [{ selector: ".stack .pill", mode: "rect", inset: 14 }],
      pointer: { radius: 0 },
      eventTarget: hero,
    });
    return () => handle.destroy();
  }, []);
  return <canvas ref={ref} className="salt" aria-hidden="true" />;
}
