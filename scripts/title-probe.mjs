// How much of the GM screen's centre panel is visible from the default camera (nothing in front of it).
//   node scripts/title-probe.mjs [baseUrl]
// For each viewport it casts rays from the camera to points on the centre panel and prints, per column, the lowest
// visible height (fraction of the panel, 0 = bottom). Use the highest of these (over the title's columns, over both
// cameras) as TITLE.visible in public/table/js/surfaces.js.
import { chromium } from "playwright-core";
const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/ms-playwright/chromium-1248/chrome-linux64/chrome",
  args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-blink-features=CanvasDrawElement"],
});
for (const [name, vp] of [["1440", { w: 1440, h: 900, phone: false }], ["390", { w: 390, h: 844, phone: true }]]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1, isMobile: vp.phone, hasTouch: vp.phone });
  const p = await ctx.newPage(); p.setDefaultTimeout(600000);
  await p.goto(`${base}/table#shot`);
  await p.waitForFunction(() => document.body.classList.contains("is-ready") && window.__table, null, { timeout: 120000 });
  await p.waitForTimeout(2500);
  const res = await p.evaluate(async () => {
    const THREE = await import("/table/vendor/three.bundle.js");
    const t = window.__table, cam = t.camera; cam.updateMatrixWorld(true);
    const SH = 2.05, CW = SH * (1280 / 760), z = -5.15 + 0.026, out = {};
    const ray = new THREE.Raycaster(); ray.camera = cam;
    for (const u of [0.15, 0.3, 0.4, 0.5, 0.6, 0.7, 0.85]) {
      // lowest v above which every sample is clear
      let clearFrom = 0;
      for (let v = 0; v <= 1.0001; v += 0.01) {
        const pt = new THREE.Vector3(0.3 + (u - 0.5) * CW, v * SH, z);
        const d = pt.clone().sub(cam.position), L = d.length();
        ray.set(cam.position, d.normalize());
        const hits = ray.intersectObjects(t.world.scene.children, true).filter((h) => h.object.isMesh && h.object.visible);
        if (hits.length && hits[0].distance < L - 0.03) clearFrom = v + 0.01;
      }
      out[u] = +clearFrom.toFixed(2);
    }
    return out;
  });
  console.log(name, JSON.stringify(res));
  await ctx.close();
}
await browser.close();
