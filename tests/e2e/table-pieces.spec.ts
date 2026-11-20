import { expect, test, type Page } from "@playwright/test";

// The party's eight pieces on /table: hover shows a card, a click switches the attack card, an attack animates.
// Run on both surface paths (#html=off painted; live HTML-in-Canvas, which needs the feature flag) at 1440 and 390.
const T = "window.__table";
const LIVE_ARGS = ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-blink-features=CanvasDrawElement"];
// the feature flag is on for the whole file; the painted path is picked with #html=off
test.use({ launchOptions: { executablePath: process.env.CHROMIUM_PATH || "/ms-playwright/chromium-1248/chrome-linux64/chrome", args: LIVE_ARGS } });
type Anchor = { x: number; top: number; bottom: number };

async function ready(page: Page, flags: string) {
  await page.goto(`/table#shot&post=off&dof=off&seed=1&${flags}`);
  await page.waitForFunction(() => document.body.classList.contains("is-ready") && "__table" in window, null, { timeout: 120_000 });
  await page.waitForFunction(() => (window as unknown as { __piecesReady?: boolean }).__piecesReady, null, { timeout: 120_000 });
  await page.evaluate(`${T}.timeScale(0)`);
  // the path asked for is the path running (the live one needs the browser feature, which this file turns on)
  expect(await page.evaluate(() => document.documentElement.dataset.surfaces)).toBe(flags.includes("html=off") ? "painted" : "html");
}
const frames = (page: Page, n = 2) => page.evaluate((k) => new Promise<void>((r) => { let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const anchor = (page: Page, id: string) => page.evaluate(`${T}.pieceAt(${JSON.stringify(id)})`) as Promise<Anchor>;
const mid = (a: Anchor) => ({ x: a.x, y: (a.top + a.bottom) / 2 });

for (const [name, flags] of [["painted", "html=off"], ["live HTML", ""]] as const) {
  test.describe(`table pieces, ${name} path`, () => {
    test.setTimeout(300_000);

    test("all eight pieces load and stand on the map; the old stand-in heroes are gone", async ({ page }) => {
      await ready(page, flags);
      const r = (await page.evaluate(`${T}.pieces().pieces.map((p) => ({ id: p.def.id, h: +p.def.height.toFixed(2), z: +p.home.z.toFixed(2), x: +p.home.x.toFixed(2), ph: p.placeholder }))`)) as { id: string; h: number; z: number; x: number; ph: boolean }[];
      expect(r.map((p) => p.id)).toEqual(["pc_zeke", "pc_thessaly", "pc_prim", "pc_naaz", "pc_saveas", "pc_drex", "pc_mellanee", "pc_kerropi"]);
      expect(r.every((p) => !p.ph)).toBe(true);
      // on the battle map where the party stood, clear of the monsters' ruin: not along the far edge
      for (const p of r) { expect(p.z).toBeGreaterThan(-2.3); expect(p.z).toBeLessThan(0); }
      expect(await page.evaluate(`${T}.world.minis.map((m) => m.def.id)`)).toEqual(["skeleton-1", "skeleton-2", "skeleton-3", "golem"]);
      expect(await page.evaluate(`${T}.attackHeroes()`)).toHaveLength(8);
      // true heights, one scale: Zeke the tallest
      const h = Object.fromEntries(r.map((p) => [p.id, p.h]));
      expect(h.pc_zeke).toBeGreaterThan(h.pc_saveas); expect(h.pc_saveas).toBeGreaterThan(h.pc_naaz);
      // Kerropi (crouched, 3.3 ft) and Drex (3.5 ft to the foam finger) are the two small ones
      expect(r.filter((p) => p.h < 0.7).map((p) => p.id).sort()).toEqual(["pc_drex", "pc_kerropi"]);
    });

    test("hover shows the card with name, class and intro, inside the viewport; leaving clears it", async ({ page, isMobile }) => {
      test.skip(!!isMobile, "mouse only; the phone project covers taps");
      await ready(page, flags);
      for (const id of ["pc_zeke", "pc_drex", "pc_kerropi"]) {
        const p = mid(await anchor(page, id));
        await page.mouse.move(p.x, p.y); await frames(page);
        const card = page.locator("#pc-card");
        await expect(card).toHaveClass(/on/);
        const want = (await page.evaluate(`${T}.pieces().byId(${JSON.stringify(id)}).char`)) as { name: string; class: string; intro: string };
        await expect(card.locator("h2")).toHaveText(want.name);
        await expect(card.locator(".cls")).toHaveText(want.class);
        await expect(card.locator(".intro")).toHaveText(want.intro);
        const b = (await card.locator(".box").boundingBox())!, vp = page.viewportSize()!;
        expect(b.x).toBeGreaterThanOrEqual(0); expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width).toBeLessThanOrEqual(vp.width); expect(b.y + b.height).toBeLessThanOrEqual(vp.height);
        await page.mouse.move(20, vp.height / 2); await frames(page);
        await expect(card).not.toHaveClass(/on/);
      }
    });

    test("click switches the attack card to that character; its rows are that character's attacks", async ({ page, isMobile }) => {
      test.skip(!!isMobile, "mouse only; the phone project covers taps");
      await ready(page, flags);
      expect(await page.evaluate(`${T}.card().character.id`)).toBe("pc_zeke");   // the first of the party until a piece is clicked
      for (const id of ["pc_thessaly", "pc_zeke"]) {   // Zeke is the card at the start: switch away, then back
        const p = mid(await anchor(page, id));
        await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.up(); await frames(page, 3);
        expect(await page.evaluate(`${T}.card().character.id`)).toBe(id);
        const want = (await page.evaluate(`${T}.pieces().byId(${JSON.stringify(id)}).char`)) as { name: string; class: string; attacks: { id: string; name: string }[] };
        const el = page.locator("#surf-note");
        await expect(el.locator(".ct-name")).toHaveText(want.name);
        await expect(el.locator(".ct-class")).toHaveText(want.class);
        await expect(el.locator("button[data-attack]")).toHaveCount(want.attacks.length);
        expect(await el.locator("button[data-attack]").evaluateAll((bs) => bs.map((b) => (b as HTMLElement).dataset.attack))).toEqual(want.attacks.map((a) => a.id));
        // numbers that are not written down yet say so
        await expect(el.locator(".ct-t").first()).toHaveText("to come");
        await expect(el.locator(".ct-d").first()).toContainText("to come");
      }
      // and the card's own rows still roll for the new character: "/attack" by name finds Zeke's attack
      await page.evaluate(`${T}.forceRoll(9, 4)`);
      await page.evaluate(`${T}.roll("/attack shield")`);
      await page.evaluate(`${T}.step(2200)`); await frames(page, 2);
      expect(await page.evaluate(`${T}.attackPhase()?.hero`)).toBe("pc_zeke");
    });

    test("an attack from a piece animates it: it leaves its place, and is home again after", async ({ page }) => {
      await ready(page, flags);
      const pos = () => page.evaluate(`(() => { const p = ${T}.pieces().byId("pc_zeke"); return { x: p.pivot.position.x, z: p.pivot.position.z, rx: p.pivot.rotation.x, home: { x: p.home.x, z: p.home.z } }; })()`) as Promise<{ x: number; z: number; rx: number; home: { x: number; z: number } }>;
      await page.evaluate(`${T}.card().setCharacter(${T}.pieces().byId("pc_zeke").char)`);
      await page.evaluate(`${T}.forceRoll(9, 4)`);
      await page.evaluate(`${T}.rollAttack("shield-charge")`);          // dice first, then the charge
      await page.evaluate(`${T}.step(2200)`); await frames(page, 2);
      const a = (await page.evaluate(`${T}.attackPhase()`)) as { hero: string; impactAt: number; t: number } | null;
      expect(a?.hero).toBe("pc_zeke");
      await page.evaluate(`${T}.step(${Math.max(0, Math.round(((a?.impactAt ?? 0.6) - (a?.t ?? 0) - 0.12) * 1000))})`); await frames(page, 2);
      const mid = await pos();
      expect(Math.hypot(mid.x - mid.home.x, mid.z - mid.home.z), "the piece moved toward the golem").toBeGreaterThan(0.5);
      await page.evaluate(`${T}.step(2500)`); await frames(page, 2);
      const end = await pos();
      expect(Math.hypot(end.x - end.home.x, end.z - end.home.z)).toBeLessThan(0.01);
      await expect(page.locator("#log-live")).toContainText("Shield Charge", { timeout: 30_000 });
    });

    test("touch: the first tap shows the card, the second switches the attack card and opens the sheet", async ({ page, isMobile }) => {
      test.skip(!isMobile, "touch only");
      await ready(page, flags + "&tier=lite");
      const p = mid(await anchor(page, "pc_prim"));
      await page.touchscreen.tap(p.x, p.y); await frames(page);
      await expect(page.locator("#pc-card")).toHaveClass(/on/);
      await expect(page.locator("#pc-card h2")).toHaveText("Prim");
      expect(await page.evaluate(`${T}.card().character.id`)).toBe("pc_zeke");
      const b = (await page.locator("#pc-card .box").boundingBox())!, vp = page.viewportSize()!;
      expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(vp.width);
      await page.touchscreen.tap(p.x, p.y); await frames(page);
      expect(await page.evaluate(`${T}.card().character.id`)).toBe("pc_prim");
      await expect(page.locator("#sheet")).toBeVisible();
      await expect(page.locator("#sheet .sh-name")).toHaveText("Prim");
      await expect(page.locator("#sheet .sh-row")).toHaveCount(3);
    });
  });
}
