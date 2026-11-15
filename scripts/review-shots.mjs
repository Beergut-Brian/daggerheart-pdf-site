// Screenshots for review: node scripts/review-shots.mjs <outDir>   (needs `next start -p 3100`)
import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2] || "../review/build-1";
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/ms-playwright/chromium-1248/chrome-linux64/chrome", args: ["--no-sandbox"] });
const base = "http://localhost:3100";
const sweep = async (p, w, h, ys) => { for (const y of ys) { await p.mouse.move(0, h * y); await p.mouse.move(w, h * y, { steps: 30 }); } };
for (const [w, h, dpr, tag] of [[1440, 900, 1, "1440"], [390, 844, 2, "390"]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: w < 800 });
  const p = await ctx.newPage();
  await p.goto(base + "/", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/home-${tag}-rest.png` });
  await sweep(p, w, h, [0.2, 0.4, 0.6, 0.8, 0.3, 0.5, 0.7, 0.9, 0.1, 0.45]);
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `${out}/home-${tag}-after-sweep.png` });
  await p.goto(base + "/resources", { waitUntil: "networkidle" }); await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/resources-${tag}.png` });
  await p.goto(base + "/resources/core-rulebook?p=19", { waitUntil: "networkidle" });
  await p.waitForFunction(() => document.body.dataset.pageReady === "19", null, { timeout: 60000 }); await p.waitForTimeout(1500);
  if (w >= 900) {
    await p.getByRole("searchbox").fill("Hope"); await p.waitForSelector('[role="option"]'); await p.waitForTimeout(2500);
    await p.screenshot({ path: `${out}/viewer-${tag}-search.png` });
    await p.getByRole("option").nth(2).click(); await p.waitForFunction(() => document.querySelectorAll(".mk").length > 0); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${out}/viewer-${tag}-hit.png` });
    await p.getByRole("tab", { name: "Chapters" }).click(); await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/viewer-${tag}-chapters.png` });
  } else {
    await p.screenshot({ path: `${out}/viewer-${tag}-reading.png` });
    await p.getByRole("button", { name: "Pages", exact: true }).click(); await p.waitForTimeout(2500);
    await p.screenshot({ path: `${out}/viewer-${tag}-sheet-pages.png` });
    await p.getByRole("tab", { name: "Chapters" }).click(); await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}/viewer-${tag}-sheet-chapters.png` });
    await p.getByRole("tab", { name: "Search" }).click(); await p.getByRole("searchbox").fill("Hope"); await p.waitForSelector('[role="option"]'); await p.waitForTimeout(2500);
    await p.screenshot({ path: `${out}/viewer-${tag}-sheet-search.png` });
    await p.getByRole("option").nth(2).click(); await p.waitForFunction(() => document.querySelectorAll(".mk").length > 0); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${out}/viewer-${tag}-hit.png` });
  }
  await ctx.close();
}
await b.close();
