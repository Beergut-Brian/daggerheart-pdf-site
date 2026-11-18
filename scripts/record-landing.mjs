// 7 s parallax recording of `/` with the mouse moving: node scripts/record-landing.mjs <outDir>  (needs `next start -p 3100`)
import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2] || "../review/redesign-build";
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/ms-playwright/chromium-1248/chrome-linux64/chrome", args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: out, size: { width: 1280, height: 720 } } });
const p = await ctx.newPage();
await p.goto("http://localhost:3100/", { waitUntil: "load" });
await p.waitForSelector(".hero[data-splat=live] canvas[data-ready]", { timeout: 30000 });
await p.mouse.move(640, 360);
const t0 = Date.now();
while (Date.now() - t0 < 7000) {
  const t = (Date.now() - t0) / 7000;
  await p.mouse.move(640 + Math.sin(t * Math.PI * 2) * 560, 360 + Math.sin(t * Math.PI * 4) * 300);
  await p.waitForTimeout(33);
}
const v = p.video();
await ctx.close();
fs.renameSync(await v.path(), `${out}/home-parallax.webm`);
await b.close();
