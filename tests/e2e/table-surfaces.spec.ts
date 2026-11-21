import { expect, test, type Page } from "@playwright/test";

// The HTML-in-Canvas surfaces (books, attack card, GM screen, roll log): every texture must be the
// element's own snapshot, at the canvas's pixel ratio, filled to its bottom-right corner, in both
// upload calls (texElementImage2D, and texElementSubImage2D via #html=sub). Needs the live path,
// so this file turns the feature on; the other e2e files run the painted path.
test.use({
  launchOptions: {
    executablePath: process.env.CHROMIUM_PATH || "/ms-playwright/chromium-1248/chrome-linux64/chrome",
    args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-blink-features=CanvasDrawElement"],
  },
});
type Row = { id: string; mode: string; tw: number; th: number; bw: number; bh: number; corner: number[] | null };

// Focus surfaces (the covers and the attack card) are made at the screen's pixel density, not the canvas's ratio: their element is
// CSS-zoomed by density / ratio (sharpen pass, `Surfaces._zoom`), so the expected box is the element's box x ratio x zoom. On a phone
// (density 2, ratio 1.5) this is what the texture is; the old ratio-only box was only equal where density == ratio.
async function ready(page: Page, flags: string) {
  await page.goto(`/table#shot&post=off&dof=off&${flags}`);
  await page.waitForFunction(() => document.body.classList.contains("is-ready") && "__table" in window, null, { timeout: 120_000 });
}
const T = "window.__table";
const rows = (page: Page) =>
  page.evaluate(`(() => {
    const S = ${T}.surfaces, c = S.canvas, k = c.width / c.clientWidth;
    return S.list.map((s) => {
      const px = S.readTexels(s, s.aw - 3, s.ah - 3, 1, 1);
      return { id: s.id, mode: S.mode, tw: s.aw, th: s.ah, bw: s.el.offsetWidth * k * (s.focus ? s.zoom : 1), bh: s.el.offsetHeight * k * (s.focus ? s.zoom : 1), corner: px ? Array.from(px) : null };
    });
  })()`) as Promise<Row[]>;

test.describe("table surfaces", () => {
  test.setTimeout(240_000);
  for (const flags of ["seed=1", "html=sub&seed=1"]) {
    test(`each texture matches its element (${flags})`, async ({ page }) => {
      await ready(page, flags);
      // a hovered cover is re-uploaded every frame: it must keep matching
      await page.evaluate(`${T}.hot("core")`);
      await page.evaluate(() => new Promise((r) => setTimeout(r, 1500)));
      for (const r of await rows(page)) {
        expect(r.mode).toBe("html");
        expect(Math.abs(r.tw - r.bw), `${r.id} width ${r.tw} vs box ${r.bw}`).toBeLessThanOrEqual(2);
        expect(Math.abs(r.th - r.bh), `${r.id} height ${r.th} vs box ${r.bh}`).toBeLessThanOrEqual(2);
        // the log is see-through; every other surface is opaque right to its corner
        if (r.id !== "log") expect(r.corner?.[3], `${r.id} corner alpha`).toBeGreaterThan(200);
      }
      // the start-up marker is gone before anything shows
      expect(await page.locator(".surf-probe").count()).toBe(0);
    });
  }

  test("#debug=surfaces lists every surface, none off", async ({ page }) => {
    await ready(page, "debug=surfaces");
    await page.waitForSelector("#surf-debug figure canvas");
    const n = (await page.evaluate(`${T}.surfaces.list.length`)) as number;
    await expect(page.locator("#surf-debug figure")).toHaveCount(n);
    await expect(page.locator("#surf-debug figcaption.is-off")).toHaveCount(0);
  });
});
