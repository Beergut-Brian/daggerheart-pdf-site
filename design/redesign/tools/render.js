// Usage: node render.js [board ...]   (boards: home-a home-b resources viewer compare; default all)
// Renders the boards in ../renders. Logs any request that leaves the redesign folder.
const { chromium } = require('/srv/ai-hub/jobs/daggerheart-site-2026-10-23/site/node_modules/playwright-core');
const path = require('path');
const R = path.resolve(__dirname, '..');
const OUT = path.join(R, 'renders');
const JOBS = {
  'home-a': [['home-a/index.html', 'home-a-1440.png', 1440, true], ['home-a/index.html', 'home-a-1440-first.png', 1440, false], ['home-a/index.html', 'home-a-390.png', 390, true]],
  'home-b': [['home-b/index.html', 'home-b-1440.png', 1440, true], ['home-b/index.html', 'home-b-390.png', 390, true]],
  resources: [['resources/index.html', 'resources-1440.png', 1440, true], ['resources/index.html', 'resources-390.png', 390, true]],
  viewer: [['viewer/index.html', 'viewer-1440.png', 1440, true], ['viewer/phone.html', 'viewer-phone-390.png', 390, true]],
  compare: [['tools/ref-vs-home-a.html', 'ref-vs-home-a.png', 2752, false, 900]],
};
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(JOBS);
(async () => {
  const b = await chromium.launch({ executablePath: '/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--no-sandbox'] });
  for (const k of want) for (const [file, out, w, full, h] of JOBS[k]) {
    const small = w < 800;
    const p = await b.newPage({ viewport: { width: w, height: h || (small ? 844 : 900) }, deviceScaleFactor: small ? 2 : 1 });
    p.on('request', (r) => { const u = r.url(); if (!u.startsWith('file://' + R) && !u.startsWith('data:')) console.log('  OUTSIDE REQUEST', u); });
    p.on('pageerror', (e) => console.log('  PAGE ERROR', e.message));
    await p.goto('file://' + path.join(R, file), { waitUntil: 'load', timeout: 60000 });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(2500);
    await p.screenshot({ path: path.join(OUT, out), fullPage: full });
    await p.close();
    console.log('rendered', out);
  }
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
