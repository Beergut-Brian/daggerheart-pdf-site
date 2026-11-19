// Load timing for /table (#perf), no Next needed: serves public/ itself.
//   node scripts/table-perf.mjs <out.json> [hashExtras e.g. "&html=off"] [runs]
// Headless Chromium draws with SwiftShader (software GL): absolute times are worst case; counts and order are what matter.
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const out = path.resolve(process.argv[2] || "../review/table-perf/perf.json");
const extra = process.argv[3] || "";
const [VW, VH] = (process.env.VIEW || "1440x900").split("x").map(Number);
const runs = +(process.argv[4] || 1);
const root = path.resolve("public");
const CHROME = process.env.CHROMIUM_PATH || "/ms-playwright/chromium-1248/chrome-linux64/chrome";
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".json": "application/json" };
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
const results = [];
for (let i = 0; i < runs; i++) {
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: +(process.env.DPR || 1) });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.error("page error:", e.message));
  await p.goto(`${base}/table/#perf${extra}`);
  await p.waitForFunction(() => window.__perf, null, { timeout: 400000, polling: 1000 });
  const res = await p.evaluate(() => window.__perf);
  // then the first Duality roll and the first attack: programs compiled by them, and their longest frame
  res.firstRoll = await p.evaluate(async () => {
    const t = window.__table, n0 = t.renderer.info.programs.length; let last = performance.now(), worst = 0;
    const next = () => new Promise((r) => requestAnimationFrame((x) => { worst = Math.max(worst, x - last); last = x; r(); }));
    t.roll('/roll duality'); for (let i = 0; i < 3; i++) { await next(); t.step(500); }
    t.roll('/attack +2'); for (let i = 0; i < 4; i++) { await next(); t.step(900); }
    return { newPrograms: t.renderer.info.programs.length - n0, longestFrameMs: Math.round(worst) };
  });
  results.push(res);
  await ctx.close();
}
await browser.close(); server.close();
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(runs === 1 ? results[0] : results, null, 1));
console.log(JSON.stringify(results[0]));
