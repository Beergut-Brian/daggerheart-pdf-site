import { expect, test, type Page } from "@playwright/test";

/** Collect console errors/warnings and page errors for a test. */
function watch(page: Page) {
  const bad: string[] = [];
  page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !/willReadFrequently/.test(m.text())) bad.push(`${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => bad.push(`pageerror: ${e.message}`));
  return bad;
}
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const bottomGrains = (page: Page) => page.evaluate(() => {
  const c = document.querySelector("canvas.salt") as HTMLCanvasElement;
  const ctx = c.getContext("2d")!;
  const h = Math.round(c.height * 0.08);
  const d = ctx.getImageData(0, c.height - h, c.width, h).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
  return n;
});

test("home: wordmark, button, salt field falls and piles on hover/drag", async ({ page }, info) => {
  const bad = watch(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("High Sodium Gaming");
  const btn = page.getByRole("link", { name: "Daggerheart Resources" });
  await expect(btn).toBeVisible();
  await expect(page.getByText("Touch the salt")).toHaveCount(0);
  await expect(page.getByText(/unofficial|trademark|copyright|fan resource/i)).toHaveCount(0);
  await page.waitForTimeout(1500);
  expect(await noOverflow(page)).toBe(true);
  const before = await bottomGrains(page);
  const { width, height } = page.viewportSize()!;
  for (const y of [0.15, 0.3, 0.55, 0.75, 0.2, 0.45, 0.65, 0.1, 0.85, 0.35]) {
    if (info.project.name.startsWith("phone")) {
      await page.evaluate(async ([w, h, yy]) => {
        const el = document.querySelector("main")!;
        const fire = (type: string, x: number) => el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: h * yy, pointerType: "touch", isPrimary: true, bubbles: true }));
        fire("pointerdown", 0);
        for (let k = 0; k <= 24; k++) { fire("pointermove", (w * k) / 24); await new Promise((r) => setTimeout(r, 12)); }
      }, [width, height, y] as const);
    } else {
      await page.mouse.move(0, height * y);
      await page.mouse.move(width, height * y, { steps: 30 });
    }
  }
  await page.waitForTimeout(3500);
  const after = await bottomGrains(page);
  expect(after).toBeGreaterThan(before + 200);
  await btn.click();
  await expect(page).toHaveURL(/\/resources$/);
  expect(bad).toEqual([]);
});

test("home: reduced motion paints a static field with a settled pile", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.waitForTimeout(800);
  expect(await bottomGrains(page)).toBeGreaterThan(100);
  await ctx.close();
});

test("resources: title, two books, art, no stray copy", async ({ page }) => {
  const bad = watch(page);
  await page.goto("/resources");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Daggerheart Resources");
  await expect(page.getByRole("link", { name: /Open Daggerheart Core Rulebook, 397 pages/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open Daggerheart: Hope & Fear, 204 pages/ })).toBeVisible();
  await expect(page.getByText("397 pages · 5 chapters")).toBeVisible();
  await expect(page.getByText("204 pages · Expansion")).toBeVisible();
  await expect(page.getByText(/Pick a book|Alt covers|unofficial|trademark|copyright|Touch the salt/i)).toHaveCount(0);
  expect(await noOverflow(page)).toBe(true);
  await page.getByRole("link", { name: /Open Daggerheart Core Rulebook/ }).click();
  await expect(page).toHaveURL(/\/resources\/core-rulebook$/);
  expect(bad).toEqual([]);
});

async function openSearch(page: Page, phone: boolean) {
  if (phone) { await page.getByRole("button", { name: "Search" }).click(); }
  const input = page.getByRole("searchbox");
  await input.fill("Hope");
  return input;
}

test("viewer core: first page paints, search Hope jumps and highlights", async ({ page }, info) => {
  const bad = watch(page);
  const phone = info.project.name.startsWith("phone");
  await page.goto("/resources/core-rulebook");
  await page.waitForFunction(() => document.body.dataset.firstPageMs, null, { timeout: 60_000 });
  const ms = Number(await page.evaluate(() => document.body.dataset.firstPageMs));
  info.annotations.push({ type: "first-page-ms", description: String(ms) });
  await expect(page.getByRole("link", { name: "Daggerheart Resources" })).toBeVisible();
  await openSearch(page, phone);
  const rows = page.getByRole("option");
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  expect(await rows.count()).toBeGreaterThan(20);
  await expect(page.getByText(/results for “Hope”|\+ results for “Hope”/)).toBeVisible();
  const t = Date.now();
  await page.getByRole("searchbox").fill("Hope Fear");
  await expect(page.getByText(/results for “Hope Fear”/)).toBeVisible();
  info.annotations.push({ type: "search-roundtrip-ms", description: String(Date.now() - t) });
  await rows.first().click();
  await page.waitForFunction(() => document.body.dataset.pageReady !== "1", null, { timeout: 15_000 });
  await page.waitForFunction(() => document.querySelectorAll(".mk").length > 0, null, { timeout: 15_000 });
  expect(await noOverflow(page)).toBe(true);
  expect(bad).toEqual([]);
});

test("viewer core: keyboard and page box (desktop), chapters", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("phone"), "desktop controls");
  await page.goto("/resources/core-rulebook");
  await page.waitForFunction(() => document.body.dataset.pageReady === "1", null, { timeout: 60_000 });
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => document.body.dataset.pageReady === "2");
  const box = page.getByLabel("Go to page");
  await box.fill("30"); await box.press("Enter");
  await page.waitForFunction(() => document.body.dataset.pageReady === "30");
  await box.fill("999"); await box.press("Enter");
  await expect(page.locator(".perr")).toContainText("No page 999. This book has 397.");
  await page.getByRole("tab", { name: "Chapters" }).click();
  await page.getByRole("button", { name: /Chapter One: Preparing For Adventure/ }).click();
  await page.waitForFunction(() => document.body.dataset.pageReady === "12");
});

test("viewer phone: sheet with Pages / Chapters / Search", async ({ page }, info) => {
  test.skip(!info.project.name.startsWith("phone"), "phone only");
  await page.goto("/resources/core-rulebook");
  await page.waitForFunction(() => document.body.dataset.pageReady === "1", null, { timeout: 60_000 });
  await page.getByRole("button", { name: "Pages", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Chapters" })).toBeVisible();
  await page.getByRole("tab", { name: "Chapters" }).click();
  await page.getByRole("button", { name: /Chapter Two: Playing an Adventure/ }).click();
  await page.waitForFunction(() => document.body.dataset.pageReady === "88");
  await expect(page.getByRole("tab", { name: "Chapters" })).toHaveCount(0);
});

test("viewer hope & fear: opens, searches OCR text, unknown slug 404s", async ({ page }) => {
  const bad = watch(page);
  await page.goto("/resources/hope-and-fear");
  await page.waitForFunction(() => document.body.dataset.firstPageMs, null, { timeout: 90_000 });
  const phone = (page.viewportSize()?.width ?? 1440) < 900;
  if (phone) await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("searchbox").fill("assassin");
  await expect(page.getByRole("option").first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("option").first().click();
  await page.waitForFunction(() => document.querySelectorAll(".mk").length > 0, null, { timeout: 15_000 });
  expect(bad).toEqual([]);
  const res = await page.goto("/resources/nope");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("No book by that name on the shelf.")).toBeVisible();
});
