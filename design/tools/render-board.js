// Usage: node render-board.js <board-folder-abs-path>
// Renders index.html (landing), resources.html, viewer.html into the PNGs Stage 2 asks for.
const { chromium } = require('/tmp/pw/node_modules/playwright-core');
const path = require('path');
const dir = path.resolve(process.argv[2]);
const jobs = [
  ['index.html', 'board-1440.png', 1440, true],
  ['index.html', 'board-1440-first.png', 1440, false],
  ['index.html', 'board-390.png', 390, true],
  ['index.html', 'board-390-first.png', 390, false],
  ['resources.html', 'resources-1440-first.png', 1440, false],
  ['viewer.html', 'viewer-1440-first.png', 1440, false],
  ['viewer.html', 'viewer-390.png', 390, true],
];
(async () => {
  const b = await chromium.launch({ executablePath: '/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--no-sandbox'] });
  for (const [file, out, w, full] of jobs) {
    const p = await b.newPage({ viewport: { width: w, height: w < 800 ? 844 : 900 }, deviceScaleFactor: w < 800 ? 2 : 1 });
    await p.goto('file://' + path.join(dir, file), { waitUntil: 'networkidle', timeout: 60000 });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(2500); // let load-in motion reach its end state
    await p.screenshot({ path: path.join(dir, out), fullPage: full });
    await p.close();
    console.log('rendered', out);
  }
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
