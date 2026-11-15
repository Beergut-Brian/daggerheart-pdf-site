// ~7 s recording of the home salt field: node scripts/record-salt.mjs <out.webm>  (needs `next start -p 3100`)
import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2] || "../review/build-1/salt-home.webm";
const tmp = "/tmp/salt-vid";
fs.rmSync(tmp, { recursive: true, force: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/ms-playwright/chromium-1248/chrome-linux64/chrome", args: ["--no-sandbox"] });
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: tmp, size: { width: 960, height: 600 } } });
const p = await c.newPage();
await p.goto("http://localhost:3100/", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
for (const y of [0.25, 0.5, 0.75, 0.35, 0.85]) { await p.mouse.move(0, 900 * y); await p.mouse.move(1440, 900 * y, { steps: 40 }); }
await p.waitForTimeout(2500);
await c.close(); await b.close();
fs.copyFileSync(`${tmp}/${fs.readdirSync(tmp)[0]}`, out);
