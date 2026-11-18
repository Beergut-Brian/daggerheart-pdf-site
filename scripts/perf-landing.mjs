// Landing performance: LCP/FCP, JS bytes, and splat frame time. Usage: node scripts/perf-landing.mjs [baseUrl] (run `next start` first)
// Mobile = 390x844, 4x CPU slowdown, ~1.6 Mbps / 150 ms RTT (Lighthouse-style slow 4G). Headless SwiftShader is CPU GL: frame times are a worst case.
import { chromium } from "playwright-core";

const base = process.argv[2] || "http://localhost:3100";
const exe = process.env.CHROMIUM_PATH || "/ms-playwright/chromium-1248/chrome-linux64/chrome";
const args = ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
const b = await chromium.launch({ executablePath: exe, args });
const out = {};

async function run(name, { w, h, dpr, throttle }) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: w < 700, hasTouch: w < 700 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  if (throttle) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  }
  const reqs = new Map(); const done = [];
  cdp.on("Network.requestWillBeSent", (e) => reqs.set(e.requestId, { url: e.request.url, t: e.timestamp }));
  cdp.on("Network.responseReceived", (e) => { const r = reqs.get(e.requestId); if (r) r.type = e.type; });
  cdp.on("Network.loadingFinished", (e) => { const r = reqs.get(e.requestId); if (r) done.push({ ...r, bytes: e.encodedDataLength, at: e.timestamp }); });
  await page.addInitScript(() => {
    window.__lcp = 0; window.__fcp = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = Math.round(e.startTime); }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") window.__fcp = Math.round(e.startTime); }).observe({ type: "paint", buffered: true });
  });
  await page.goto(`${base}/#perf`, { waitUntil: "load", timeout: 120000 });
  const loadAt = Date.now();
  await page.waitForSelector(".hero[data-splat=live]", { timeout: 60000 }).catch(() => {});
  const splatMs = Date.now() - loadAt;
  const live = await page.evaluate(() => document.querySelector(".hero").dataset.splat);
  const marks = await page.evaluate(() => ({ lcp: window.__lcp, fcp: window.__fcp }));
  await page.mouse.move(w * 0.3, h * 0.4);
  await page.waitForTimeout(3000);
  const st = await page.evaluate(() => window.__splat || null);
  const kb = (n) => Math.round(n / 102.4) / 10;
  const js = done.filter((r) => r.type === "Script"), splatAssets = done.filter((r) => r.url.includes("/splat/"));
  out[name] = {
    lcpMs: marks.lcp, fcpMs: marks.fcp, splatState: live, msFromLoadToLive: splatMs,
    jsKB_total: kb(js.reduce((s, r) => s + r.bytes, 0)), jsFiles: js.length,
    splatAssetsKB: Object.fromEntries(splatAssets.map((r) => [new URL(r.url).pathname, kb(r.bytes)])),
    allKB: kb(done.reduce((s, r) => s + r.bytes, 0)),
    frame: st && st.frames ? { frames: st.frames, meanMsPerFrame: +(st.dtSum / st.frames).toFixed(1), meanDrawMs: +(st.drawSum / st.frames).toFixed(1), points: st.points, buffer: st.buffer } : null,
    jsBySize: js.map((r) => [new URL(r.url).pathname.split("/").pop(), kb(r.bytes)]).sort((a, c) => c[1] - a[1]).slice(0, 8),
  };
  await ctx.close();
}
await run("mobile-390 (throttled)", { w: 390, h: 844, dpr: 2, throttle: true });
await run("mobile-390 (unthrottled)", { w: 390, h: 844, dpr: 2, throttle: false });
await run("desktop-1440", { w: 1440, h: 900, dpr: 1, throttle: false });
console.log(JSON.stringify(out, null, 1));
await b.close();
