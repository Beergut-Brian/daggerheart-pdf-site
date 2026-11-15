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
  // salt interaction proof at 390: pouring, piled, after a swipe
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: false });
  await p.goto('file://' + path.join(dir, 'index.html'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(dir, 'salt-1.png') }); console.log('rendered salt-1.png (pouring)');
  await p.waitForTimeout(3800);
  await p.screenshot({ path: path.join(dir, 'salt-2.png') }); console.log('rendered salt-2.png (piled)');
  const box = await p.locator('h1').first().boundingBox();
  if (box) { await p.mouse.move(box.x - 5, box.y + 4); for (let k = 0; k <= 24; k++) await p.mouse.move(box.x + box.width * k / 24, box.y + box.height * 0.15 + Math.sin(k / 2.5) * 24, { steps: 2 }); }
  await p.waitForTimeout(160);
  await p.screenshot({ path: path.join(dir, 'salt-3.png') }); console.log('rendered salt-3.png (after swipe)');
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
