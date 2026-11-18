// Usage: node tools/home-c-render.js [still|orbit|perf|video|fallback ...]  (default: still orbit perf fallback)
// Renders home-c over file:// in headless Chromium (SwiftShader WebGL, so timings are a lower bound).
// Logs any request leaving the redesign folder and any page error.
const { chromium } = require('/srv/ai-hub/jobs/daggerheart-site-2026-10-23/site/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');
const R = path.resolve(__dirname, '..');
const OUT = path.join(R, 'renders');
const URL = 'file://' + path.join(R, 'home-c/index.html');
const GL = ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const want = process.argv.slice(2).length ? process.argv.slice(2) : ['still', 'orbit', 'perf', 'fallback'];

async function open(b, w, opts = {}) {
  const small = w < 800;
  const ctx = await b.newContext({ viewport: { width: w, height: small ? 844 : 900 }, deviceScaleFactor: small ? 2 : 1, ...opts });
  const p = await ctx.newPage();
  p.on('request', (r) => { const u = r.url(); if (!u.startsWith('file://' + R) && !u.startsWith('data:')) console.log('  OUTSIDE REQUEST', u); });
  p.on('pageerror', (e) => console.log('  PAGE ERROR', e.message));
  p.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log('  console', m.type(), m.text().slice(0, 200)); });
  await p.goto(URL, { waitUntil: 'load', timeout: 60000 });
  await p.evaluate(() => document.fonts.ready);
  return { ctx, p };
}
const drawn = (p) => p.waitForFunction(() => document.querySelector('.hero.is-splat'), null, { timeout: 30000 }).then(() => true, () => false);

(async () => {
  const b = await chromium.launch({ executablePath: '/ms-playwright/chromium-1248/chrome-linux64/chrome', args: GL });
  if (want.includes('still')) for (const [w, out] of [[1440, 'home-c-1440.png'], [390, 'home-c-390.png']]) {
    const { ctx, p } = await open(b, w);
    console.log(out, 'canvas drawn:', await drawn(p));
    // freeze at rest for the still (the page idles on touch widths)
    await p.evaluate(() => window.HC_SPLAT && window.HC_SPLAT.set(0, 0));
    await p.waitForTimeout(800);
    await p.evaluate(() => window.HC_SPLAT && window.HC_SPLAT.set(0, 0));
    await p.screenshot({ path: path.join(OUT, out) });
    await ctx.close();
  }
  if (want.includes('orbit')) {
    const { ctx, p } = await open(b, 1440);
    await drawn(p);
    for (const [x, y, n] of [[-1, -1, 'tl'], [1, 1, 'br'], [1, -1, 'tr'], [-1, 1, 'bl']]) {
      await p.mouse.move(-10, -10);
      await p.evaluate(([x, y]) => window.HC_SPLAT.set(x, y), [x, y]);
      await p.screenshot({ path: '/tmp/home-c-orbit-' + n + '.png' });
    }
    console.log('orbit stills in /tmp/home-c-orbit-*.png');
    await ctx.close();
  }
  if (want.includes('perf')) for (const w of [1440, 390]) {
    const { ctx, p } = await open(b, w);
    await drawn(p);
    await p.mouse.move(w * 0.3, 400);
    const r = await p.evaluate(() => new Promise((res) => {
      const ts = []; const t0 = performance.now();
      (function f(t) { ts.push(t); if (t - t0 < 3000) requestAnimationFrame(f); else {
        const d = ts.slice(1).map((v, i) => v - ts[i]); d.sort((a, b) => a - b);
        res({ frames: d.length, mean: d.reduce((a, b) => a + b, 0) / d.length, p95: d[Math.floor(d.length * 0.95)] });
      } })(t0); requestAnimationFrame(f => 0);
    }));
    console.log('perf', w, 'frames', r.frames, 'mean ms', r.mean.toFixed(1), 'p95 ms', r.p95.toFixed(1));
    await ctx.close();
  }
  if (want.includes('fallback')) {
    const { ctx, p } = await open(b, 1440, { reducedMotion: 'reduce' });
    await p.waitForTimeout(1500);
    console.log('reduced motion: canvas present', await p.evaluate(() => !!document.querySelector('.hero-splat')));
    await p.screenshot({ path: '/tmp/home-c-reduced.png' });
    await ctx.close();
    const b2 = await chromium.launch({ executablePath: '/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--no-sandbox', '--disable-webgl', '--disable-3d-apis'] });
    const o = await open(b2, 1440);
    await o.p.waitForTimeout(1500);
    console.log('no webgl: canvas present', await o.p.evaluate(() => !!document.querySelector('.hero-splat')),
      'img visible', await o.p.evaluate(() => document.getElementById('hero-img').getBoundingClientRect().width > 0 && document.getElementById('hero-img').complete));
    await o.p.screenshot({ path: '/tmp/home-c-nowebgl.png' });
    await b2.close();
  }
  if (want.includes('video')) {
    // SwiftShader draws ~2 frames/s, so a realtime recordVideo would be a slideshow. Instead the page's clock is
    // faked (Playwright clock: rAF + performance.now), the real mouse is moved, and every 1/30 s step is captured
    // and encoded at 30 fps with Playwright's bundled ffmpeg. Motion and easing are the page's own.
    const { spawn } = require('child_process');
    const FPS = 30;
    const { ctx, p } = await open(b, 1440);
    await drawn(p);
    await p.mouse.move(720, 450);
    await p.clock.install();
    const ff = spawn('/ms-playwright/ffmpeg-1013/ffmpeg-linux', ['-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', 'pipe:0',
      '-y', '-an', '-c:v', 'vp8', '-b:v', '6M', '-crf', '6', '-qmin', '0', '-qmax', '24', '-deadline', 'good', '-threads', '4', path.join(OUT, 'home-c-parallax.webm')], { stdio: ['pipe', 'inherit', 'inherit'] });
    const path_ = [];
    const seg = (a, c, sec) => { const n = Math.round(sec * FPS); for (let i = 1; i <= n; i++) { const t = i / n, e = t * t * (3 - 2 * t); path_.push([a + (c - a) * e, 440 + 50 * Math.sin(t * Math.PI)]); } };
    seg(720, 720, 0.5); seg(720, 60, 1.3); seg(60, 1380, 3.2); seg(1380, 720, 1.6); seg(720, 720, 0.6);
    for (const [x, y] of path_) {
      await p.mouse.move(x, y);
      await p.clock.runFor(1000 / FPS);
      ff.stdin.write(await p.screenshot({ type: 'jpeg', quality: 92 }));
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    console.log('video written', path_.length, 'frames at', FPS, 'fps');
    await ctx.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
