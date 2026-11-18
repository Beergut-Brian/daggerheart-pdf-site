// Usage: node tools/home-d-render.js [stills|perf|video|fallbacks|orbit|inspo ...]  (default: all)
// Renders home-d into ../renders (home-d-*). Logs any request that leaves the redesign folder.
const { chromium } = require('/srv/ai-hub/jobs/daggerheart-site-2026-10-23/site/node_modules/playwright-core');
const path = require('path');
const fs = require('fs');
const R = path.resolve(__dirname, '..');
const OUT = path.join(R, 'renders');
const URL = 'file://' + path.join(R, 'home-d/index.html');
const ARGS = ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const want = process.argv.slice(2).length ? process.argv.slice(2) : ['stills', 'perf', 'video', 'fallbacks', 'orbit', 'inspo'];

async function open(b, opts, extra = {}) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: opts.w, height: opts.h }, deviceScaleFactor: opts.dpr || 1 }, extra));
  const p = await ctx.newPage();
  p.on('request', (r) => { const u = r.url(); if (!u.startsWith('file://' + R) && !u.startsWith('data:') && !u.startsWith('blob:')) console.log('  OUTSIDE REQUEST', u); });
  p.on('pageerror', (e) => console.log('  PAGE ERROR', e.message));
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('  console', m.type(), m.text().slice(0, 200)); });
  if (opts.init) await p.addInitScript(opts.init);
  await p.goto(opts.url || URL, { waitUntil: 'load', timeout: 60000 });
  await p.evaluate(() => document.fonts.ready);
  return { ctx, p };
}
const drawn = (p) => p.evaluate(() => { const c = document.querySelector('.hero-splat'); return { canvas: !!c, ready: !!(c && c.dataset.ready), stats: window.__homeD || null }; });

(async () => {
  const b = await chromium.launch({ executablePath: '/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ARGS });
  if (want.includes('stills')) {
    for (const [w, h, dpr, out] of [[1440, 900, 1, 'home-d-1440.png'], [390, 844, 2, 'home-d-390.png']]) {
      const { ctx, p } = await open(b, { w, h, dpr });
      await p.waitForTimeout(2500);
      console.log(out, JSON.stringify(await drawn(p)));
      await p.screenshot({ path: path.join(OUT, out) });
      await ctx.close();
    }
  }
  if (want.includes('perf')) {
    for (const [w, h, dpr] of [[1440, 900, 1], [390, 844, 2]]) {
      const { ctx, p } = await open(b, { w, h, dpr, url: URL + '#perf' });
      await p.waitForTimeout(1500);
      await p.mouse.move(w * 0.3, h * 0.4);
      const r = await p.evaluate(() => new Promise((res) => {
        const s = window.__homeD; const f0 = s.frames, d0 = s.dtSum, r0 = s.drawSum;
        setTimeout(() => { const n = s.frames - f0; res({ frames: n, meanFrameMs: +((s.dtSum - d0) / n).toFixed(2), meanRenderGpuSyncedMs: +((s.drawSum - r0) / n).toFixed(2), points: s.points, buffer: s.buffer }); }, 3000);
      }));
      console.log('perf', w + 'x' + h, JSON.stringify(r));
      await ctx.close();
    }
  }
  if (want.includes('orbit')) {
    // hole check: hold the mouse at the corners (max orbit) and screenshot
    const { ctx, p } = await open(b, { w: 1440, h: 900 });
    await p.waitForTimeout(800);
    for (const [x, y, n] of [[0, 0, 'tl'], [1439, 899, 'br'], [1439, 0, 'tr'], [0, 899, 'bl']]) {
      await p.mouse.move(x, y, { steps: 4 });
      await p.waitForTimeout(2500);
      await p.screenshot({ path: `/tmp/home-d-orbit-${n}.png` });
    }
    console.log('orbit shots in /tmp/home-d-orbit-*.png');
    await ctx.close();
  }
  if (want.includes('video')) {
    const dir = '/tmp/home-d-video'; fs.rmSync(dir, { recursive: true, force: true });
    const { ctx, p } = await open(b, { w: 1440, h: 900 }, { recordVideo: { dir, size: { width: 1440, height: 900 } } });
    await p.mouse.move(150, 450);
    await p.waitForTimeout(400);
    // slow sweep left -> right -> left across the hero, paced by wall clock (SwiftShader frames are slow)
    const t0 = Date.now(), leg = 2350;
    for (;;) {
      const t = Date.now() - t0; if (t > 2 * leg) break;
      const u = t < leg ? t / leg : 2 - t / leg;
      const e = 0.5 - 0.5 * Math.cos(Math.PI * u);
      await p.mouse.move(150 + 1140 * e, 450 + (t < leg ? -1 : 1) * 120 * Math.sin(Math.PI * u));
      await p.waitForTimeout(40);
    }
    await p.waitForTimeout(500);
    const v = p.video(); await ctx.close();
    fs.copyFileSync(await v.path(), path.join(OUT, 'home-d-parallax.webm'));
    console.log('home-d-parallax.webm', fs.statSync(path.join(OUT, 'home-d-parallax.webm')).size);
  }
  if (want.includes('fallbacks')) {
    {
      const { ctx, p } = await open(b, { w: 1440, h: 900 }, { reducedMotion: 'reduce' });
      await p.waitForTimeout(1500);
      console.log('reduced-motion', JSON.stringify(await drawn(p)));
      await p.screenshot({ path: '/tmp/home-d-reduced.png' }); await ctx.close();
    }
    {
      const init = () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/i.test(t) ? null : g.call(this, t, ...a); }; };
      const { ctx, p } = await open(b, { w: 390, h: 844, dpr: 2, init });
      await p.waitForTimeout(1500);
      console.log('no-webgl', JSON.stringify(await drawn(p)));
      await p.screenshot({ path: '/tmp/home-d-nowebgl-390.png' }); await ctx.close();
    }
  }
  if (want.includes('inspo')) {
    const { ctx, p } = await open(b, { w: 2580, h: 720, url: 'file://' + path.join(R, 'tools/home-d-vs-inspo.html') });
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(OUT, 'home-d-vs-inspo.png') });
    await ctx.close();
    console.log('home-d-vs-inspo.png');
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
