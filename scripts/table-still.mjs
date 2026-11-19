// Stills of /table for before/after proofs, served straight from a public/ folder.
//   node scripts/table-still.mjs <publicDir> <outPrefix> [W H dpr]   writes <outPrefix>-html.png and <outPrefix>-painted.png
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2]);
const prefix = path.resolve(process.argv[3]);
const [W, H, DPR] = [process.argv[4] || 1440, process.argv[5] || 900, process.argv[6] || 1].map(Number);
const CHROME = process.env.CHROMIUM_PATH || "/ms-playwright/chromium-1248/chrome-linux64/chrome";
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png" };
const server = http.createServer((q, s) => {
  let u = decodeURIComponent(q.url.split("?")[0]);
  if (u === "/table") { s.writeHead(301, { location: "/table/" }); return s.end(); }
  if (u.endsWith("/")) u += "index.html";
  const f = path.join(root, u);
  if (!f.startsWith(root) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(s);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;
const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-blink-features=CanvasDrawElement"] });
fs.mkdirSync(path.dirname(prefix), { recursive: true });
for (const [name, hash] of process.env.LIVE ? [["live", "#t=7"]] : [["html", "#shot&t=7"], ["painted", "#shot&t=7&html=off"]]) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
  const p = await ctx.newPage(); p.setDefaultTimeout(300000);
  p.on("pageerror", (e) => console.error("page error:", e.message));
  await p.goto(`${base}/table/${hash}`);
  await p.waitForFunction(() => document.body.classList.contains("is-ready") && window.__table, null, { timeout: 300000 });
  const fr = (n) => p.evaluate((k) => new Promise((r) => { let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  await fr(16);
  console.log(name, await p.evaluate(() => document.documentElement.dataset.surfaces));
  await p.screenshot({ path: `${prefix}-${name}.png` });
  await ctx.close();
}
await browser.close(); server.close();
