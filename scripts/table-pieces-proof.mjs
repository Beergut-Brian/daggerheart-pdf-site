// Proof set for the party pieces (software GL, so slow; the stills and clips matter, not wall times).
//   node scripts/table-pieces-proof.mjs <outDir> stills|videos [clip ...]
// stills: lineup 1440 + 390 (live HTML path, and the painted path), a hover card, the attack card after a click (1440 + phone sheet).
// videos: one attack per animation type (lunge, bolt, magic) on the game clock, frame by frame, as .webm.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const out = path.resolve(process.argv[2]), mode = process.argv[3] || "stills", only = process.argv.slice(4);
fs.mkdirSync(out, { recursive: true });
const root = path.resolve("public");
const CHROME = process.env.CHROMIUM_PATH || "/ms-playwright/chromium-1248/chrome-linux64/chrome";
const FFMPEG = process.env.FFMPEG || fs.readdirSync("/ms-playwright").filter((d) => d.startsWith("ffmpeg")).map((d) => `/ms-playwright/${d}/ffmpeg-linux`)[0];
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".glb": "model/gltf-binary" };
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
const say = (m) => console.log(new Date().toISOString().slice(11, 19), m);
const want = (n) => !only.length || only.includes(n);

async function open(hash, { w = 1440, h = 900, phone = false, dpr = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 2 : dpr, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  const p = await ctx.newPage(); p.setDefaultTimeout(500000);
  p.on("pageerror", (e) => console.error("page error:", e.message));
  p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning" || /\[table\] pieces/.test(m.text())) console.log("console:", m.text().slice(0, 160)); });
  await p.goto(`${base}/table/#${hash}`);
  await p.waitForFunction(() => document.body.classList.contains("is-ready") && window.__table && window.__piecesReady, null, { timeout: 500000 });
  await p.evaluate(() => window.__table.timeScale(0));
  await frames(p, 6);
  return { p, ctx };
}
const frames = (p, n = 2) => p.evaluate((k) => new Promise((r) => { let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const shot = async (p, name) => { await p.screenshot({ path: path.join(out, name) }); say("wrote " + name); };
const mid = async (p, id) => { const a = await p.evaluate((i) => window.__table.pieceAt(i), id); return { x: a.x, y: (a.top + a.bottom) / 2 }; };

if (mode === "stills") {
  if (want("lineup")) {
    let s = await open("shot&seed=1", { dpr: 2 }); await shot(s.p, "lineup-1440.png"); await s.ctx.close();
    s = await open("shot&seed=1&html=off", { dpr: 2 }); await shot(s.p, "lineup-painted-1440.png"); await s.ctx.close();
    s = await open("shot&seed=1&tier=lite", { w: 390, h: 844, phone: true }); await shot(s.p, "lineup-390.png"); await s.ctx.close();
    s = await open("shot&seed=1&tier=lite&html=off", { w: 390, h: 844, phone: true }); await shot(s.p, "lineup-painted-390.png"); await s.ctx.close();
  }
  if (want("hover")) {
    for (const [id, tag] of [["pc_thessaly", "thessaly"], ["pc_drex", "drex"]]) {
      const s = await open("shot&seed=1", { dpr: 2 });
      const m = await mid(s.p, id); await s.p.mouse.move(m.x, m.y); await frames(s.p, 4);
      await shot(s.p, `hover-${tag}-1440.png`); await s.ctx.close();
    }
    let s = await open("shot&seed=1&html=off", { dpr: 2 });
    const m = await mid(s.p, "pc_zeke"); await s.p.mouse.move(m.x, m.y); await frames(s.p, 4);
    await shot(s.p, "hover-zeke-painted-1440.png"); await s.ctx.close();
    s = await open("shot&seed=1&tier=lite", { w: 390, h: 844, phone: true });
    const t = await mid(s.p, "pc_prim"); await s.p.touchscreen.tap(t.x, t.y); await frames(s.p, 4);
    await shot(s.p, "hover-prim-390.png"); await s.ctx.close();
  }
  if (want("card") || want("card-live") || want("card-painted") || want("card-sheet")) {
    for (const [hash, tag] of [["shot&seed=1", "live"], ["shot&seed=1&html=off", "painted"]]) {
      if (only.length && !only.includes("card-" + tag) && !only.includes("card")) continue;
      const s = await open(hash, { dpr: 2 });
      const m = await mid(s.p, "pc_naaz"); await s.p.mouse.move(m.x, m.y); await s.p.mouse.down(); await s.p.mouse.up(); await frames(s.p, 4);
      await s.p.mouse.move(20, 450); await frames(s.p, 4);
      await s.p.evaluate(() => window.__table.cardState); await shot(s.p, `card-naaz-${tag}-1440.png`);
      await s.ctx.close();
    }
    if (only.length && !only.includes("card-sheet") && !only.includes("card")) { await browser.close(); server.close(); process.exit(0); }
    const s = await open("shot&seed=1&tier=lite", { w: 390, h: 844, phone: true });
    const t = await mid(s.p, "pc_zeke"); await s.p.touchscreen.tap(t.x, t.y); await frames(s.p, 3); await s.p.touchscreen.tap(t.x, t.y); await frames(s.p, 4);
    await shot(s.p, "card-zeke-sheet-390.png"); await s.ctx.close();
  }
} else {
  // one attack per animation type: [file, piece, attack id, camera]
  const clips = [
    ["attack-lunge-zeke-shield-charge", "pc_zeke", "shield-charge"],
    ["attack-bolt-thessaly-feather-blades", "pc_thessaly", "feather-blades"],
    ["attack-magic-naaz-ice-spike", "pc_naaz", "ice-spike"],
  ];
  for (const [name, id, atk] of clips) {
    if (!want(name) && !want(atk)) continue;
    const { p, ctx } = await open("shot&seed=3&dof=off&cam=0,0.06,0.62,0.4,-3.2");
    await p.evaluate(([i]) => { const t = window.__table; t.card().setCharacter(t.pieces().byId(i).char); t.forceRoll(9, 4); }, [id]);
    const fps = 12, seconds = 3.1;
    const ff = spawn(FFMPEG, ["-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "pipe:0", "-y", "-an", "-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p", "-crf", "30", "-b:v", "0", "-deadline", "good", "-cpu-used", "4", "-row-mt", "1", path.join(out, name + ".webm")], { stdio: ["pipe", "inherit", "inherit"] });
    let broken = null; ff.on("error", (e) => { broken = e; }); ff.stdin.on("error", (e) => { broken = e; });
    const n = Math.round(seconds * fps);
    // the Duality dice go first (about 2.1 s on the game clock): step through them unrecorded, film the attack
    await p.evaluate((a) => window.__table.rollAttack(a), atk);
    await p.evaluate(() => window.__table.step(2050)); await frames(p, 2);
    for (let i = 0; i < n; i++) {
      if (broken) throw new Error("ffmpeg: " + broken.message);
      ff.stdin.write(await p.screenshot({ type: "jpeg", quality: 88 }));
      await p.evaluate((m) => window.__table.step(m), 1000 / fps); await frames(p, 1);
      if (i % 12 === 0) say(`${name}: frame ${i}/${n}`);
    }
    ff.stdin.end(); await new Promise((r) => ff.on("close", r));
    say("wrote " + name + ".webm"); await ctx.close();
  }
}
await browser.close(); server.close();
