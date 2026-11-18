// Usage: node button-capture.js  -> renders/button-hover.webm and renders/button-hover.png
const { chromium } = require('/srv/ai-hub/jobs/daggerheart-site-2026-10-23/site/node_modules/playwright-core');
const path = require('path'); const fs = require('fs');
const R = path.resolve(__dirname, '..'); const OUT = path.join(R, 'renders');
const URL = 'file://' + path.join(R, 'home-a/index.html');
(async () => {
  const b = await chromium.launch({ executablePath: '/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--no-sandbox'] });
  // 1. video
  const tmp = fs.mkdtempSync('/tmp/btnvid-');
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: tmp, size: { width: 1440, height: 900 } } });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
  await p.mouse.move(1300, 850); await p.waitForTimeout(1000);
  const box = await p.locator('.hero-copy .cta').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 }); await p.waitForTimeout(1000);
  await p.mouse.move(1300, 850, { steps: 12 }); await p.waitForTimeout(800);
  // Tab from the top of the page until the hero CTA has focus (no DOM changes).
  await p.evaluate(() => { document.activeElement && document.activeElement.blur(); window.focus(); });
  for (let i = 0; i < 30; i++) {
    await p.keyboard.press('Tab'); await p.waitForTimeout(120);
    if (await p.evaluate(() => document.activeElement === document.querySelector('.hero-copy .cta'))) break;
  }
  await p.waitForTimeout(1500);
  const v = p.video(); await ctx.close(); fs.copyFileSync(await v.path(), path.join(OUT, 'button-hover.webm'));
  // 2. frames: real transition paused at 0, 150 ms, end
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await pg.goto(URL, { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready);
  const cta = pg.locator('.hero-copy .cta'); const shots = [];
  for (const t of [null, 150, 'end']) {
    await pg.mouse.move(1300, 850); await pg.waitForTimeout(500);
    if (t !== null) {
      await cta.hover(); await pg.waitForTimeout(t === 'end' ? 600 : 20);
      if (t !== 'end') await pg.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), t);
    }
    const bb = await cta.boundingBox();
    shots.push((await pg.screenshot({ clip: { x: bb.x - 12, y: bb.y - 12, width: bb.width + 24, height: bb.height + 24 } })).toString('base64'));
  }
  const labels = ['Rest', 'Mid (150 ms of 300)', 'Full (hover / focus)'];
  const html = `<body style="margin:0;background:#0d0d0d;display:flex;gap:32px;padding:32px;font:500 14px system-ui;color:#9a9a9a">${shots.map((s, i) => `<figure style="margin:0"><img src="data:image/png;base64,${s}" style="width:${'auto'};height:110px;display:block"><figcaption style="margin-top:10px">${labels[i]}</figcaption></figure>`).join('')}</body>`;
  const c = await b.newPage({ viewport: { width: 1400, height: 220 } }); await c.setContent(html); await c.waitForTimeout(300);
  await c.screenshot({ path: path.join(OUT, 'button-hover.png'), fullPage: true });
  await b.close(); console.log('done');
})().catch((e) => { console.error(e); process.exit(1); });
