import { expect, test, type Page } from "@playwright/test";

// The table's command bar: thrown dice must land with the rolled value facing up.
// SwiftShader is slow, so post-processing is off and the game clock is stepped by hand.
type Die = { type: string; rolled: number; up: number; style: string; tilt: number };
const T = "window.__table";

async function ready(page: Page, flags: string) {
  await page.goto(`/table#shot&post=off&dof=off&${flags}`);
  await page.waitForFunction(() => document.body.classList.contains("is-ready") && "__table" in window, null, { timeout: 120_000 });
  await page.evaluate(`${T}.timeScale(0)`);
}
async function command(page: Page, text: string) {
  const bar = page.getByLabel(/Dice command/);
  await bar.click();
  await bar.fill(text);
  await bar.press("Enter");
  await page.evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`);
}
async function settle(page: Page) {
  for (const ms of [1700, 400]) {
    await page.evaluate(`${T}.step(${ms})`);
    await page.evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  }
}

test.describe("table dice", () => {
  test.setTimeout(300_000);

  test("every die type lands with the rolled value up, and the log says the total", async ({ page }) => {
    await ready(page, "html=off&seed=4");
    await command(page, "/roll 1d4+1d6+1d8+1d10+1d12+1d20");
    await settle(page);
    const dice = (await page.evaluate(`${T}.dice()`)) as Die[];
    expect(dice.map((d) => d.type)).toEqual(["d4", "d6", "d8", "d10", "d12", "d20"]);
    for (const d of dice) {
      expect(d.up, `${d.type} shows ${d.up}, rolled ${d.rolled}`).toBe(d.rolled);
      expect(d.tilt).toBeLessThan(0.02);
    }
    const total = dice.reduce((s, d) => s + d.rolled, 0);
    await expect(page.locator("#log-live")).toContainText(`${total} on 1d4+1d6+1d8+1d10+1d12+1d20`, { timeout: 30_000 });
  });

  test("Duality dice are gold and violet d12s; an attack logs a hit or a miss", async ({ page }) => {
    await ready(page, "html=off");
    await page.evaluate(`${T}.forceRoll(9, 4)`);
    await command(page, "/attack +2");
    await settle(page);
    const dice = (await page.evaluate(`${T}.dice()`)) as Die[];
    expect(dice).toMatchObject([{ type: "d12", style: "hope", rolled: 9, up: 9 }, { type: "d12", style: "fear", rolled: 4, up: 4 }]);
    await page.evaluate(`${T}.step(2000)`);
    await expect(page.locator("#log-live")).toContainText("15 with Hope: hit!", { timeout: 30_000 });

    await page.evaluate(`${T}.forceRoll(2, 4)`);
    await command(page, "/attack");
    await settle(page);
    await page.evaluate(`${T}.step(2500)`);
    await expect(page.locator("#log-live")).toContainText("6 with Fear: miss", { timeout: 30_000 });
  });

  test("bad input gets a hint, Up recalls the last command", async ({ page }) => {
    await ready(page, "html=off");
    await command(page, "/roll banana");
    await expect(page.locator("#log-live")).toContainText("isn't dice notation", { timeout: 30_000 });
    const bar = page.getByLabel(/Dice command/);
    await bar.press("ArrowUp");
    await expect(bar).toHaveValue("/roll banana");
  });
});
