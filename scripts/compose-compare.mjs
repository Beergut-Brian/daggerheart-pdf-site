// Side-by-side build vs board: node scripts/compose-compare.mjs [dir]  (dir = review/redesign-build, boards in dir/boards)
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
const O = path.resolve(process.argv[2] || "../review/redesign-build");
const pairs = [["home-1440", "boards/home-d-1440", "compare-home-1440", 1440], ["home-390", "boards/home-d-390", "compare-home-390", 390], ["resources-1440", "boards/resources-1440", "compare-resources-1440", 1440], ["resources-390", "boards/resources-390", "compare-resources-390", 390], ["viewer-1440-search", "boards/viewer-1440", "compare-viewer-1440", 1440], ["viewer-390-sheet-search", "boards/viewer-phone-390", "compare-viewer-phone-390", 390]];
const b = await chromium.launch({ executablePath: "/ms-playwright/chromium-1248/chrome-linux64/chrome", args: ["--no-sandbox"] });
for (const [a, bd, out, w] of pairs) {
  const p = await b.newPage({ viewport: { width: w * 2 + 30, height: 900 } });
  fs.writeFileSync(`${O}/_c.html`, `<body style="margin:0;background:#444;display:flex;gap:30px;align-items:flex-start;font:14px sans-serif;color:#fff"><div style="width:${w}px"><div>BUILD</div><img src="${a}.png" style="width:${w}px"></div><div style="width:${w}px"><div>BOARD</div><img src="${bd}.png" style="width:${w}px"></div></body>`);
  await p.goto(`file://${O}/_c.html`); await p.waitForTimeout(400);
  await p.screenshot({ path: `${O}/${out}.png`, fullPage: true }); await p.close();
}
fs.rmSync(`${O}/_c.html`); await b.close();
