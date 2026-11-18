// Logo renders: node scripts/logo-shots.mjs <outDir> (needs `next start -p 3100`)
import { chromium } from "playwright-core";
import fs from "node:fs";
const O = process.argv[2] || "../review/redesign-build";
fs.mkdirSync(O, { recursive: true });
const b = await chromium.launch({ executablePath: "/ms-playwright/chromium-1248/chrome-linux64/chrome", args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const [w, h, dpr, t] of [[1440, 900, 1, "1440"], [390, 844, 2, "390"]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: w < 500, hasTouch: w < 500 });
  const p = await c.newPage();
  await p.goto("http://localhost:3100/", { waitUntil: "load" }); await p.waitForTimeout(3500);
  await p.screenshot({ path: `${O}/home-${t}.png` });
  await p.locator(".site-nav").screenshot({ path: `${O}/logo-nav-${t}.png` });
  await p.goto("http://localhost:3100/resources", { waitUntil: "load" });
  await p.locator(".site-nav").screenshot({ path: `${O}/logo-nav-resources-${t}.png` });
  await p.goto("http://localhost:3100/resources/core-rulebook", { waitUntil: "load" }); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${O}/logo-viewer-${t}.png`, clip: { x: 0, y: 0, width: w, height: w < 500 ? 120 : 80 } });
  await c.close();
}
// favicons on light and dark tabs
const icons = [["favicon-16", 16], ["favicon-32", 32], ["favicon-48", 48], ["../../../site/app/apple-icon", 180], ["../../../site/app/icon", 512]];
const root = "/srv/ai-hub/jobs/daggerheart-site-2026-10-23/site";
const src = { 16: `${root}/design/brand/favicon-16.png`, 32: `${root}/design/brand/favicon-32.png`, 48: `${root}/design/brand/favicon-48.png`, 180: `${root}/app/apple-icon.png`, 512: `${root}/app/icon.png` };
const row = (bg, fg) => `<div style="background:${bg};color:${fg};padding:16px;display:flex;gap:24px;align-items:flex-end;flex-wrap:wrap">${Object.entries(src).map(([s, f]) => `<figure style="margin:0;text-align:center"><img src="file://${f}" width="${s}" height="${s}" style="${s < 100 ? "image-rendering:pixelated;" : ""}display:block"><figcaption style="font:12px sans-serif;margin-top:6px">${s}px</figcaption></figure>`).join("")}</div>`;
const p = await b.newPage({ viewport: { width: 1100, height: 400 } });
fs.writeFileSync(`${root}/design/brand/_f.html`, `<body style="margin:0">${row("#f1f1ef", "#111")}${row("#202124", "#eee")}<div style="background:#f1f1ef;padding:16px;display:flex;gap:24px;align-items:flex-end"><span style="font:12px sans-serif">1:1 as a tab (16/32 actual size):</span><img src="file://${src[16]}"><img src="file://${src[32]}"></div></body>`);
await p.goto(`file://${root}/design/brand/_f.html`); await p.waitForTimeout(400);
await p.screenshot({ path: `${O}/favicons.png`, fullPage: true });
fs.rmSync(`${root}/design/brand/_f.html`);
await b.close();
