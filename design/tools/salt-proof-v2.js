// Usage: node salt-proof-v2.js <board-dir>   (salt field proof: rest, sweep, pile, reduced, video, timing)
const { chromium } = require('/tmp/pw/node_modules/playwright-core');
const path = require('path'), fs = require('fs');
const dir = path.resolve(process.argv[2]); const url = 'file://' + path.join(dir, 'index.html');
const exe = '/ms-playwright/chromium-1248/chrome-linux64/chrome';
async function sweep(p, w, h, y, steps) { await p.mouse.move(-5, y); for (let k = 0; k <= steps; k++) await p.mouse.move(w * k / steps, y + Math.sin(k / 3) * h * 0.04, { steps: 1 }); }
(async () => {
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const log = [];
  for (const [w, h, dpr, tag] of [[390, 844, 2, '390'], [1440, 900, 1, '1440']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr,  });
    const p = await ctx.newPage(); p.on('pageerror', e => log.push(tag + ' PAGEERROR ' + e.message));
    await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(2600);
    const sfx = tag === '1440' ? '-1440' : '';
    await p.screenshot({ path: path.join(dir, `salt-1${sfx}.png`) });
    log.push(`${tag} rest: ${JSON.stringify(await p.evaluate(() => salt.stats()))}`);
    await sweep(p, w, h, h * 0.30, 30); await p.waitForTimeout(260);
    await p.screenshot({ path: path.join(dir, `salt-2${sfx}.png`) });
    log.push(`${tag} after 1 sweep: ${JSON.stringify(await p.evaluate(() => salt.stats()))}`);
    for (const y of [0.2, 0.42, 0.72, 0.12, 0.85, 0.6]) await sweep(p, w, h, h * y, 26);
    const t = await p.evaluate(() => new Promise(res => { const ts = []; let last = performance.now(), n = 0;
      (function f(now) { ts.push(now - last); last = now; if (++n < 90) requestAnimationFrame(f); else { ts.sort((a, b) => a - b); res({ median: ts[45].toFixed(1), p95: ts[85].toFixed(1) }); } })(performance.now()); }));
    log.push(`${tag} frame ms while falling: median ${t.median}, p95 ${t.p95}`);
    await p.waitForTimeout(3000);
    await p.screenshot({ path: path.join(dir, `salt-3${sfx}.png`) });
    log.push(`${tag} after 7 sweeps + settle: ${JSON.stringify(await p.evaluate(() => salt.stats()))}`);
    const idle = await p.evaluate(() => new Promise(res => { const ts = []; let last = performance.now(), n = 0;
      (function f(now) { ts.push(now - last); last = now; if (++n < 90) requestAnimationFrame(f); else { ts.sort((a, b) => a - b); res({ median: ts[45].toFixed(1), p95: ts[85].toFixed(1) }); } })(performance.now()); }));
    log.push(`${tag} frame ms idle drift: median ${idle.median}, p95 ${idle.p95}`);
    // touch: tap knocks loose a burst
    await ctx.close();
  }
  // ~6 s video at 1440 (own context, so recording does not skew the timings above)
  fs.rmSync('/tmp/pw/vid', { recursive: true, force: true });
  const vctx = await b.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: '/tmp/pw/vid', size: { width: 960, height: 600 } } });
  const vp = await vctx.newPage(); await vp.goto(url, { waitUntil: 'networkidle' }); await vp.waitForTimeout(1200);
  for (const y of [0.3, 0.55, 0.2, 0.8]) await sweep(vp, 1440, 900, 900 * y, 40);
  await vp.waitForTimeout(2200); await vctx.close();
  const v = fs.readdirSync('/tmp/pw/vid').map(f => path.join('/tmp/pw/vid', f))[0]; fs.copyFileSync(v, path.join(dir, 'salt.webm')); log.push('video: salt.webm');
  // phone touch: drag + tap
  const tctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const tp = await tctx.newPage(); await tp.goto(url, { waitUntil: 'networkidle' }); await tp.waitForTimeout(2000);
  const before = await tp.evaluate(() => salt.stats().field);
  await tp.touchscreen.tap(80, 220); await tp.waitForTimeout(200);
  const after = await tp.evaluate(() => salt.stats().field);
  log.push(`touch tap knocked loose ${before - after} grains`);
  await tctx.close();
  const r = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  await r.goto(url, { waitUntil: 'networkidle' }); await r.waitForTimeout(1500);
  await r.screenshot({ path: path.join(dir, 'salt-reduced-390.png') });
  log.push('reduced: ' + JSON.stringify(await r.evaluate(() => salt.stats())));
  await b.close();
  fs.writeFileSync(path.join(dir, 'salt-proof.txt'), log.join('\n') + '\n'); console.log(log.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
