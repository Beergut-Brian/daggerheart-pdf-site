// Proof run for the sharpen pass (software GL, so slow; counts and sizes matter, not wall times).
//   node scripts/table-sharpen-proof.mjs <outDir> stills|timeline
// stills: 1440x900 DPR 2, start of the table state and after settle (ratio at the cap), crops of the books and card at 1x.
// timeline: 2560x1440 DPR 2 (a 5K iMac's window): fast-GPU and slow-GPU frame times stubbed into the real ramp; ratio steps, surface uploads.
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const out = path.resolve(process.argv[2]), mode = process.argv[3] || "stills";
fs.mkdirSync(out, { recursive: true });
const root = path.resolve("public");
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
const [W, H] = mode === "stills" ? [1440, 900] : [2560, 1440];
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const p = await ctx.newPage(); p.setDefaultTimeout(500000);
const logs = []; p.on("console", (m) => { if (m.text().startsWith("[table]")) logs.push(m.text()); });
p.on("pageerror", (e) => console.error("page error:", e.message));
await p.goto(`${base}/table/#shot&t=7`);
await p.waitForFunction(() => document.body.classList.contains("is-ready") && window.__table, null, { timeout: 500000 });
const fr = (n) => p.evaluate((k) => new Promise((r) => { let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const info = () => p.evaluate(() => { const t = __table; return { ratio: +t.renderer.getPixelRatio().toFixed(3), surfaces: Object.fromEntries(t.surfaces.list.filter((s) => /cover|note|screen|left-core/.test(s.id)).map((s) => [s.id, { uploads: s.uploads, texels: [s.aw, s.ah], zoom: s.zoom }])) }; });
const log = { mode, view: `${W}x${H} @2x`, start: null, steps: [], end: null };
await fr(6);
log.start = await info();
if (mode === "stills") {
  await p.screenshot({ path: `${out}/start-1440-dpr2.png` });
  // settle: the ramp on a fast GPU (stubbed 8 ms frames) up to the cap, then the one retake
  await p.evaluate(() => { for (let i = 0; i < 200; i++) __table.ramp.feed(8, i * 0.008); });
  await new Promise((r) => setTimeout(r, 2600)); await fr(8);
  log.end = await info();
  await p.screenshot({ path: `${out}/settled-1440-dpr2.png` });
} else {
  for (const [name, gpuAt1] of [["fast", 5], ["slow", 17], ["middling", 11]]) {
    await p.evaluate(() => __table.setRatio(1.0));
    const r = await p.evaluate((g) => {
      const t = __table, q = t.quality; q.ceiling = Infinity; t.ramp.reset();
      const steps = []; let ms = 0, tt = 0;
      const base = steps.length; const saved = console.info; console.info = (s) => { if (String(s).startsWith("[table] ratio")) steps.push([+tt.toFixed(2), String(s).replace("[table] ", "")]); };
      for (let i = 0; i < 3000; i++) { ms = Math.max(16.7, g * Math.pow(t.renderer.getPixelRatio(), 2.4)); tt += ms / 1000; t.ramp.feed(ms, tt); }
      console.info = saved;
      return { steps, finalRatio: +t.renderer.getPixelRatio().toFixed(3), ceiling: q.ceiling, simulatedSeconds: +tt.toFixed(1) };
    }, gpuAt1);
    log.steps.push({ gpu: `${name} (${gpuAt1} ms/frame at ratio 1, cost ~ratio^2.4, display 60 Hz)`, ...r });
  }
  await p.evaluate(() => __table.setRatio(1.25)); await new Promise((r) => setTimeout(r, 2600)); await fr(8);
  log.end = await info();
}
log.console = logs;
fs.writeFileSync(`${out}/${mode}.json`, JSON.stringify(log, null, 1));
console.log(JSON.stringify(log, null, 1));
await browser.close(); server.close();
