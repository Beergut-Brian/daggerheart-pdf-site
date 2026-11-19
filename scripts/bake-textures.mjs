// Bakes the table's procedural textures (wood, battle mat) into public/table/tex/*.webp with the same painters
// and seeds that js/textures.js uses at run time, which stay the source and the fallback.
//   node scripts/bake-textures.mjs            (re-run after changing a painter in js/textures.js)
// #bake=off in the page URL skips the baked files and paints them, to compare.
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("public"), outDir = path.join(root, "table", "tex");
const QUALITY = 0.95;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };
const server = http.createServer((q, s) => {
  let u = decodeURIComponent(q.url.split("?")[0]);
  if (u.endsWith("/")) u += "index.html";
  const f = path.join(root, u);
  if (!f.startsWith(root) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(s);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/ms-playwright/chromium-1248/chrome-linux64/chrome", args: ["--no-sandbox"] });
const p = await browser.newPage();
p.setDefaultTimeout(300000);
await p.goto(`http://localhost:${server.address().port}/table/index.html#bake=off&nogl`);
const files = await p.evaluate(async (q) => {
  const TX = await import("/table/js/textures.js");
  const blob = (c) => new Promise((r) => c.toBlob(r, "image/webp", q));
  const b64 = async (c) => { const b = new Uint8Array(await (await blob(c)).arrayBuffer()); let s = ""; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192)); return btoa(s); };
  const out = {};
  for (const size of [1024, 768]) { const w = TX.woodTextures(size); out[`wood-${size}`] = await b64(w.map.image); out[`wood-${size}-bump`] = await b64(w.bump.image); }
  for (const [W, H] of [[1536, 896], [1024, 598]]) out[`mat-${W}x${H}`] = await b64(TX.battleMatTexture(W, H).image);
  return out;
}, QUALITY);
fs.mkdirSync(outDir, { recursive: true });
let total = 0;
for (const [name, data] of Object.entries(files)) { const b = Buffer.from(data, "base64"); fs.writeFileSync(path.join(outDir, name + ".webp"), b); total += b.length; console.log(name, (b.length / 1024).toFixed(0) + " KB"); }
console.log("total", (total / 1024).toFixed(0) + " KB");
await browser.close(); server.close();
