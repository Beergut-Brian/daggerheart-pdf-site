// Compare two stills: mean difference, share of pixels off by more than 8/255, and an amplified diff image.
//   node scripts/table-diff.mjs before.png after.png diff.png
import { chromium } from "playwright-core";
import fs from "node:fs";
const [a, b, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/ms-playwright/chromium-1248/chrome-linux64/chrome", args: ["--no-sandbox"] });
const p = await browser.newPage();
const url = (f) => "data:image/png;base64," + fs.readFileSync(f).toString("base64");
const r = await p.evaluate(async ([ua, ub]) => {
  const load = (u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = u; });
  const [A, B] = await Promise.all([load(ua), load(ub)]);
  const c = (i) => { const k = document.createElement("canvas"); k.width = i.width; k.height = i.height; const g = k.getContext("2d"); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height); };
  const x = c(A), y = c(B), o = new ImageData(A.width, A.height); let sum = 0, off = 0;
  for (let i = 0; i < x.data.length; i += 4) {
    let m = 0; for (let k = 0; k < 3; k++) { const d = Math.abs(x.data[i + k] - y.data[i + k]); m = Math.max(m, d); sum += d; o.data[i + k] = Math.min(255, d * 6); }
    if (m > 8) off++; o.data[i + 3] = 255;
  }
  const k = document.createElement("canvas"); k.width = A.width; k.height = A.height; k.getContext("2d").putImageData(o, 0, 0);
  return { mean: sum / (x.data.length / 4 * 3), offPct: (100 * off) / (x.data.length / 4), png: k.toDataURL("image/png"), w: A.width, h: A.height };
}, [url(a), url(b)]);
fs.writeFileSync(out, Buffer.from(r.png.split(",")[1], "base64"));
console.log(JSON.stringify({ a, b, size: `${r.w}x${r.h}`, meanAbsDiff: +r.mean.toFixed(3), pctPixelsOver8: +r.offPct.toFixed(3) }));
await browser.close();
