import { expect, test } from "@playwright/test";

const hero = (page: import("@playwright/test").Page) => page.locator(".hero");

test.describe("landing /", () => {
  test("renders the headline, the tag from book data and a CTA to /resources", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Every rule your party needs.Just keep it out of the fire.");
    await expect(page.locator(".hero .tag")).toHaveText("2 books · 601 pages");
    const cta = page.getByRole("link", { name: "Daggerheart Resources" }).and(page.locator(".cta"));
    await expect(cta).toHaveAttribute("href", "/resources");
    await cta.click();
    await expect(page).toHaveURL(/\/resources$/);
  });

  test("has no footer, no unofficial text and no salt", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer")).toHaveCount(0);
    const text = (await page.locator("body").innerText()).toLowerCase();
    for (const w of ["unofficial", "fan", "trademark", "salt"]) expect(text).not.toContain(w);
  });

  test("reduced motion: the still, no canvas, no scene data fetched", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    const fetched: string[] = [];
    page.on("request", (r) => fetched.push(new URL(r.url()).pathname));
    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(3500);
    await expect(hero(page)).toHaveAttribute("data-splat", "still");
    await expect(page.locator("canvas")).toHaveCount(0);
    const img = page.locator(".hero-media img");
    await expect(img).toBeVisible();
    expect(await img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBe(450);
    expect(fetched.filter((p) => p.startsWith("/splat/") && p !== "/splat/still.webp")).toEqual([]);
    await ctx.close();
  });

  test("motion allowed: the still is the first paint; the splat loads after, from static assets, and animates when WebGL exists", async ({ page }) => {
    const js: string[] = [];
    page.on("response", async (r) => { if (r.url().endsWith(".js")) js.push(await r.text().catch(() => "")); });
    await page.goto("/#perf", { waitUntil: "load" });
    await expect(page.locator(".hero-media img")).toBeVisible();
    await expect.poll(() => hero(page).getAttribute("data-splat"), { timeout: 20_000 }).toMatch(/^(live|still)$/);
    if ((await hero(page).getAttribute("data-splat")) === "still") test.skip(true, "no WebGL in this browser: the still stays (also covered by the reduced-motion test)");
    await expect(page.locator("canvas.hero-splat[data-ready]")).toHaveCount(1);
    const frames = () => page.evaluate(() => (window as unknown as { __splat: { frames: number } }).__splat.frames);
    const a = await frames();
    await page.waitForTimeout(1500);
    expect(await frames()).toBeGreaterThan(a);
    // the scene (palette indices) is a static asset, not in any JS chunk
    expect(js.some((s) => s.includes('"palette"') && s.includes("fireDepth"))).toBe(false);
  });
});
