// Where the party, the golem and the books land on a phone's default view (client px, margins to the viewport edges).
//   node scripts/table-phone-probe.mjs [W,H ...]    (default 390,844 360,780 430,932)
import { chromium } from "playwright-core";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const root = path.resolve("public"), sizes = (process.argv.slice(2).length ? process.argv.slice(2) : ["390,844", "360,780", "430,932"]).map((s) => s.split(",").map(Number));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".glb": "model/gltf-binary" };
const server = http.createServer((q, s) => { let u = decodeURIComponent(q.url.split("?")[0]); if (u === "/table") { s.writeHead(301, { location: "/table/" }); return s.end(); } if (u.endsWith("/")) u += "index.html"; const f = path.join(root, u); if (!fs.existsSync(f)) { s.writeHead(404); return s.end(); } s.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(s); });
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({ executablePath: "/ms-playwright/chromium-1248/chrome-linux64/chrome", args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); p.setDefaultTimeout(300000);
  await p.goto(`http://localhost:${server.address().port}/table/#shot&seed=1&tier=lite&post=off&dof=off&html=off`);
  await p.waitForFunction(() => document.body.classList.contains("is-ready") && window.__piecesReady, null, { timeout: 300000 });
  await p.evaluate(() => window.__table.timeScale(0));
  await p.evaluate(() => new Promise((r) => { let i = 0; const f = () => (++i >= 40 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  const r = await p.evaluate(() => {
    const t = window.__table, W = innerWidth, H = innerHeight, B = t.pieces().pieces[0].box.constructor;
    const pts = [];
    const add = (name, o) => { const b = new B().setFromObject(o); for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) for (const y of [b.min.y, b.max.y]) pts.push([name, x, y, z]); };
    for (const p of t.pieces().pieces) add(p.def.id, p.pivot);
    add("golem", t.world.minis.find((m) => m.def.id === "golem").pivot);
    for (const b of t.world.books) add("book-" + b.id, b.root);
    const V = t.camera.position.constructor, out = {};
    for (const [n, x, y, z] of pts) { const q = new V(x, y, z).project(t.camera), sx = (q.x * 0.5 + 0.5) * W, sy = (-q.y * 0.5 + 0.5) * H; const o = (out[n] ||= { l: 1e9, r: -1e9, t: 1e9, b: -1e9 }); o.l = Math.min(o.l, sx); o.r = Math.max(o.r, sx); o.t = Math.min(o.t, sy); o.b = Math.max(o.b, sy); }
    let minL = 1e9, minR = 1e9; for (const [n, o] of Object.entries(out)) { if (n.startsWith("book")) { minL = Math.min(minL, o.l); minR = Math.min(minR, W - o.r); } }
    const party = Object.entries(out).filter(([n]) => n.startsWith("pc_") || n === "golem");
    return { W, H, partyLeft: Math.round(Math.min(...party.map(([, o]) => o.l))), partyRightMargin: Math.round(W - Math.max(...party.map(([, o]) => o.r))), golem: out.golem && Object.fromEntries(Object.entries(out.golem).map(([k, v]) => [k, Math.round(v)])), booksLeft: Math.round(minL), booksRightMargin: Math.round(minR) };
  });
  console.log(JSON.stringify(r));
  await ctx.close();
}
await browser.close(); server.close();
