// Proof shots, videos, the up-face check and frame timings for /table's dice and attack.
//   node scripts/table-proof.mjs [stills|videos|perf|card|all] [baseUrl] [outDir]
// card: the attack card (pass 2): a row's dice icon rolls, video + stills; not part of "all".
// extras: loading screen with its link (#hold-load), the scene with no corner label, the GM screen
//   (default camera and straight on) into ../review/table-look; not part of "all".
// look: the look pass (resin dice, impact, phone layout) into ../review/table-look; not part of "all".
// fix: loading-screen link, then the rolling area: a Duality roll and /roll 3d6 at 1440 and 390 (dice must
//   rest inside __table.area), and a recording of two rolls; into ../review/table-fix. ONLY=load,still,video
// pickup: the table's own dice get rolled (two Duality rolls, then 3d6 borrowing from the tray), the
//   landed d12s, reduced motion; into ../review/table-look; not part of "all". ONLY=still,reduced,video
// Needs the site running (npm run build && npm start). Headless Chromium draws with SwiftShader
// (software GL), so it is slow: videos are rendered frame by frame on the table's game clock
// (__table.timeScale(0) + __table.step(ms)) and piped to ffmpeg, so they play at real speed.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const mode = process.argv[2] || "all";
const base = (process.argv[3] || "http://localhost:3000").replace(/\/$/, "");
const out = path.resolve(process.argv[4] || (mode === "look" || mode === "extras" || mode === "pickup" ? "../review/table-look" : mode === "fix" ? "../review/table-fix" : "../review/table-1"));
const CHROME = process.env.CHROMIUM_PATH || "/ms-playwright/chromium-1248/chrome-linux64/chrome";
const FFMPEG = process.env.FFMPEG_PATH || "/ms-playwright/ffmpeg-1013/ffmpeg-linux";
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-blink-features=CanvasDrawElement"],
});
const say = (m) => console.log(new Date().toISOString().slice(11, 19), m);
const upface = [];
let failures = 0;

async function open(hash, { w = 1440, h = 900, phone = false, reduced = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 3 : 1, isMobile: phone, hasTouch: phone, reducedMotion: reduced ? "reduce" : "no-preference" });
  const p = await ctx.newPage();
  p.setDefaultTimeout(600000);
  p.on("pageerror", (e) => { console.error("page error:", e.message); failures++; });
  await p.goto(`${base}/table${hash}`);
  await p.waitForFunction(() => document.body.classList.contains("is-ready") && window.__table, null, { timeout: 120000 });
  await frames(p, 3);
  return { p, ctx };
}
// wait for real frames (each can take seconds under SwiftShader)
const frames = (p, n = 2) => p.evaluate((k) => new Promise((r) => { let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
async function type(p, text, phone = false) {
  if (phone) await p.tap("#cmd-in"); else await p.click("#cmd-in");
  await p.keyboard.type(text); await p.keyboard.press("Enter");
  await frames(p, 1);
}
const step = async (p, ms) => { await p.evaluate((m) => window.__table.step(m), ms); await frames(p, 2); };
// a throw takes up to ~1.45 s (clearing the last one, stagger, tumble); then the result tags fade in
const settle = async (p) => { await step(p, 1700); await step(p, 400); };
const camera = (p, zoom, x, z) => p.evaluate(([zz, xx, z2]) => { const t = window.__table; t.rig.user.zoom = zz; t.rig.off.set(xx, 0, z2); }, [zoom, x, z]);
async function checkUp(p, label) {
  const dice = await p.evaluate(() => window.__table.dice());
  const ok = dice.length > 0 && dice.every((d) => d.up === d.rolled && d.tilt < 0.02);
  if (!ok) failures++;
  upface.push({ label, ok, dice });
  const file = path.join(out, "upface-check.json");
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).filter((r) => r.label !== label) : [];
  fs.writeFileSync(file, JSON.stringify([...prev, { label, ok, at: new Date().toISOString(), dice }], null, 2) + "\n");
  say(`${label}: ${ok ? "up faces match" : "MISMATCH"} ${dice.map((d) => `${d.type}=${d.up}/${d.rolled}`).join(" ")}`);
}
async function shot(p, name) { await frames(p, 2); await p.screenshot({ path: path.join(out, name) }); say("wrote " + name); }

const only = (process.env.ONLY || "").split(",").filter(Boolean);
const want = (k) => !only.length || only.includes(k);

async function stills() {
  let p, ctx;
  if (want("a")) {
  // settled duality, close enough to read the faces
  ({ p, ctx } = await open("#shot&seed=2"));
  await p.evaluate(() => window.__table.timeScale(0));
  await camera(p, 0.36, 0.6, 0.15); await frames(p, 4);
  await type(p, "/roll duality"); await settle(p);
  await checkUp(p, "duality 1440"); await shot(p, "dice-settled-1440.png");
  // the log, with Hope, Fear, a plain roll, a hint and a critical
  await camera(p, 1, 0, 0);
  await p.evaluate(() => window.__table.forceRoll(3, 9)); await type(p, "/roll duality +1"); await settle(p);
  await type(p, "/roll 3d6+2"); await settle(p);
  await type(p, "fireball");
  await p.evaluate(() => window.__table.forceRoll(8, 8)); await type(p, "/r"); await settle(p);
  await p.click("#cmd-in"); await frames(p, 4);
  await shot(p, "roll-log-1440.png");
  await ctx.close();
  }
  if (want("b")) {
  // every die but the d12, then the attack
  ({ p, ctx } = await open("#shot&seed=11"));
  await p.evaluate(() => window.__table.timeScale(0));
  await camera(p, 0.5, 0.65, 0.1); await frames(p, 4);
  await type(p, "/roll 1d4+1d6+1d8+1d10+1d20"); await settle(p);
  await checkUp(p, "general 1440"); await shot(p, "general-dice-1440.png");
  await camera(p, 1, 0, 0); await frames(p, 4);
  await p.evaluate(() => { window.__table.forceRoll(9, 4); window.__table.nextAttacker("guardian"); });
  await type(p, "/attack +2"); await step(p, 2100);
  const a = await p.evaluate(() => window.__table.attackPhase());
  await step(p, Math.round((a.impactAt + 0.04 - a.t) * 1000));
  await shot(p, "attack-hit-1440.png");
  await ctx.close();
  }
  if (want("c")) {
  // painted fallback
  ({ p, ctx } = await open("#shot&html=off&seed=5"));
  await p.evaluate(() => window.__table.timeScale(0));
  await camera(p, 0.6, 0.55, 0.2); await frames(p, 4);
  await type(p, "/roll duality"); await settle(p);
  await type(p, "/roll d20+3"); await settle(p);
  await checkUp(p, "painted 1440"); await shot(p, "painted-dice-1440.png");
  await ctx.close();

  // phone, lite tier
  ({ p, ctx } = await open("#shot&tier=lite&seed=3", { w: 390, h: 844, phone: true }));
  await p.evaluate(() => window.__table.timeScale(0));
  await type(p, "/roll duality", true); await settle(p);
  await checkUp(p, "phone 390"); await shot(p, "phone-dice-390.png");
  await p.tap("#cmd-in"); await p.keyboard.type("/attack +1"); await frames(p, 2);
  await shot(p, "phone-bar-390.png");
  await ctx.close();
  }
}

// frame-by-frame video on the game clock
async function record(name, hash, script, { seconds, fps = 12, lean = false }) {
  const { p, ctx } = await open(hash);
  await p.evaluate(() => window.__table.timeScale(0));
  const ff = spawn(FFMPEG, ["-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "pipe:0", "-y", "-an",
    "-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p", "-crf", "28", "-b:v", "0", "-deadline", "good", "-cpu-used", "4", "-row-mt", "1", path.join(out, name)], { stdio: ["pipe", "inherit", "inherit"] });
  let broken = null;
  ff.on("error", (e) => { broken = e; }); ff.stdin.on("error", (e) => { broken = e; });
  const n = Math.round(seconds * fps);
  for (let i = 0; i < n; i++) {
    await script(p, i / fps);
    if (broken) throw new Error("ffmpeg: " + broken.message);
    ff.stdin.write(await p.screenshot({ type: "jpeg", quality: 88 }));
    // lean: the next screenshot renders the stepped frame itself, so skip the extra rAF (halves the cost)
    await p.evaluate((m) => window.__table.step(m), 1000 / fps); if (!lean) await frames(p, 1);
    if (i % 15 === 0) say(`${name}: frame ${i}/${n}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  await ctx.close();
  say("wrote " + name);
}

async function videos() {
  let sent = false;
  if (want("roll")) await record("roll-duality.webm", "#shot&seed=7", async (p, t) => {
    if (!sent && t >= 0.4) { sent = true; await type(p, "/roll duality"); }
  }, { seconds: 2.8 });
  // a hit, then a miss
  const plan = [[0.4, 9, 4, "guardian", "/attack +2"], [3.6, 2, 4, "ranger", "/attack +0"]];
  if (want("attack")) await record("attack.webm", "#shot&seed=9", async (p, t) => {
    while (plan.length && t >= plan[0][0]) {
      const [, hope, fear, hero, cmd] = plan.shift();
      await p.evaluate(([h, f, who]) => { window.__table.forceRoll(h, f); window.__table.nextAttacker(who); }, [hope, fear, hero]);
      await type(p, cmd);
    }
  }, { seconds: 7.2 });
}

// frame cost: idle (real frames), and while dice or a mini move (stepped 1/30 s per frame)
async function perf() {
  const rows = [];
  for (const [label, hash, opt] of [["1440x900 full", "#shot", {}], ["390x844 lite", "#shot&tier=lite", { w: 390, h: 844, phone: true }]]) {
    const { p, ctx } = await open(hash, opt);
    const measure = (n, stepMs) => p.evaluate(([k, s]) => new Promise((r) => {
      const ts = []; let last = performance.now();
      const f = (now) => { ts.push(now - last); last = now; if (s) window.__table.step(s); if (ts.length < k) requestAnimationFrame(f); else r(ts); };
      requestAnimationFrame(f);
    }), [n, stepMs]);
    const stat = (ts) => { const s = [...ts].sort((a, b) => a - b); return { frames: s.length, median: +s[Math.floor(s.length / 2)].toFixed(1), p95: +s[Math.min(s.length - 1, Math.floor(s.length * 0.95))].toFixed(1), max: +s[s.length - 1].toFixed(1) }; };
    await frames(p, 3);
    const idle = stat(await measure(8, 0));
    await p.evaluate(() => { window.__table.timeScale(0); window.__table.roll("/roll duality"); });
    await frames(p, 1);
    const roll = stat(await measure(10, 1000 / 30));
    await p.evaluate(() => window.__table.step(5000)); await frames(p, 3);
    await p.evaluate(() => { window.__table.forceRoll(9, 4); window.__table.nextAttacker("ranger"); window.__table.roll("/attack +2"); window.__table.step(1700); });
    await frames(p, 2);
    const atk = stat(await measure(10, 1000 / 30));
    const info = await p.evaluate(() => ({ mode: window.__table.mode, tier: window.__table.tier, px: window.__table.renderer.getPixelRatio() }));
    rows.push({ label, ...info, idle, roll, attack: atk });
    say(`${label}: idle ${idle.median} ms, roll ${roll.median} ms, attack ${atk.median} ms`);
    await ctx.close();
  }
  fs.writeFileSync(path.join(out, "perf.json"), JSON.stringify(rows, null, 2) + "\n");
}

// the attack card: click a row's dice icon -> Duality -> log -> the guardian attacks -> damage dice -> log
// close on the card, and jump the camera there instead of easing (each frame is seconds under SwiftShader)
const toCard = (p) => p.evaluate(() => {
  const R = window.__table.rig; R.user.zoom = 0.22; R.off.set(-5.6, 0, 2.9);
  R.cur.target.copy(R.home.target).add(R.off); R.cur.dist = R.home.dist * 0.22; R.cur.el = R.home.el; R.cur.az = R.home.az;
});
const cardPoint = (p, i, part = "icon") => p.evaluate(([k, pt]) => window.__table.cardPoint(k, pt), [i, part]);
async function card() {
  let p, ctx;
  if (want("video")) {
    let clicked = false;
    await record("attack-card.webm", "#shot&dof=off&seed=21", async (pg, t) => {
      if (!clicked && t >= 0.3) {
        clicked = true;
        await pg.evaluate(() => window.__table.forceRoll(9, 4));      // a hit: 9 + 4 + Agility 2 = 15 vs 12
        const pt = await cardPoint(pg, 0);
        await pg.mouse.move(pt.x, pt.y); await frames(pg, 1); await pg.mouse.click(pt.x, pt.y); await frames(pg, 1);
      }
    }, { seconds: 5.0, fps: 8, lean: true });   // 8 fps: SwiftShader takes seconds a frame
  }
  if (want("html")) {
    ({ p, ctx } = await open("#shot&dof=off&seed=21"));
    await p.evaluate(() => window.__table.timeScale(0));
    await toCard(p); await frames(p, 3);
    await p.focus('#surf-note button[data-row="0"]'); await frames(p, 3);
    say("mode " + (await p.evaluate(() => window.__table.mode)));
    await shot(p, "attack-card-1440.png");
    await ctx.close();
  }
  if (want("painted")) {
    ({ p, ctx } = await open("#shot&html=off&dof=off&seed=21"));
    await p.evaluate(() => window.__table.timeScale(0));
    await toCard(p); await frames(p, 3);
    const pt = await cardPoint(p, 1, "row");
    await p.mouse.move(pt.x, pt.y); await frames(p, 3);
    const hot = await p.evaluate(() => window.__table.card() && document.querySelector("#gl").classList.contains("is-card"));
    if (!hot) failures++;
    say("painted hover via raycast: " + hot);
    await shot(p, "attack-card-painted-1440.png");
    await ctx.close();
  }
  if (want("log")) {
    // the log after a card roll: both lines (roll, then damage) on the game clock
    ({ p, ctx } = await open("#shot&dof=off&seed=21"));
    await p.evaluate(() => { window.__table.timeScale(0); window.__table.forceRoll(9, 4); window.__table.rollAttack("longsword"); });
    for (let i = 0; i < 14; i++) { await p.evaluate(() => window.__table.step(350)); await frames(p, 1); }
    say("log rows: " + JSON.stringify(await p.evaluate(() => window.__table.log.rows.map((r) => r.text + " " + r.alpha))));
    await shot(p, "attack-card-log-1440.png");
    await ctx.close();
  }
  if (want("phone")) {
    ({ p, ctx } = await open("#shot&tier=lite&seed=21", { w: 390, h: 844, phone: true }));
    await p.evaluate(() => window.__table.timeScale(0));
    await p.tap("#attacks-chip"); await frames(p, 2);
    await shot(p, "phone-card-sheet-390.png");
    await ctx.close();
  }
}

// the look pass: every die type in resin, the impact, the phone layout, reduced motion
const ALL_DICE = "/roll 1d4+1d6+1d8+1d10+1d12+1d20";
async function extras() {
  // the loading screen, held up by #hold-load (the scene renders behind it but the loader never fades)
  for (const [name, w, h, phone] of [["load-1440.png", 1440, 900, false], ["load-390.png", 390, 844, true]]) {
    if (!want("load")) break;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 3 : 1, isMobile: phone, hasTouch: phone });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => { console.error("page error:", e.message); failures++; });
    await p.goto(`${base}/table#shot&hold-load`);
    await p.waitForFunction(() => window.__table, null, { timeout: 120000 });
    await p.keyboard.press("Tab");          // the link is the first stop: show its focus ring
    const info = await p.evaluate(() => ({ ready: document.body.classList.contains("is-ready"), focus: document.activeElement && document.activeElement.textContent, href: document.activeElement && document.activeElement.getAttribute("href"), surfaces: document.documentElement.dataset.surfaces, label: !!document.querySelector("#mode") }));
    say(`${name}: ${JSON.stringify(info)}`);
    if (info.ready || info.focus !== "Click here for resources" || info.label) failures++;
    await p.waitForTimeout(2000); await frames(p, 2);   // let the focus fill finish sliding
    await p.screenshot({ path: path.join(out, name) }); say("wrote " + name);
    await ctx.close();
  }
  let p, ctx;
  if (want("scene")) {
    ({ p, ctx } = await open("#shot"));
    await p.waitForTimeout(1500);
    await shot(p, "scene-nolabel-1440.png");
    if (want("screen")) await shot(p, "gm-screen-1440.png");
    await ctx.close();
  }
  if (want("front")) {
    // straight on to the GM screen (depth of field off, it focuses on the books): aim at its centre, low
    ({ p, ctx } = await open("#shot&dof=off"));
    await p.evaluate(() => { const t = window.__table; t.rig.user.az = 0; t.rig.user.el = 0.12 - t.rig.home.el; t.rig.user.zoom = 0.62; t.rig.off.set(0.25, 0.68, -5.9); });
    await p.waitForTimeout(4000); await frames(p, 6);
    await shot(p, "gm-screen-front-1440.png");
    await ctx.close();
  }
}

async function look() {
  let p, ctx;
  for (const [name, hash] of [["dice-1440.png", "#shot&seed=11"], ["dice-painted-1440.png", "#shot&html=off&seed=11"]]) {
    if (!want(name.includes("painted") ? "painted" : "dice")) continue;
    ({ p, ctx } = await open(hash));
    await p.evaluate(() => window.__table.timeScale(0));
    await camera(p, 0.55, 0.65, 0.15); await frames(p, 3);
    await type(p, ALL_DICE); await settle(p);
    await checkUp(p, name); await shot(p, name);
    await ctx.close();
  }
  if (want("impact")) {
    ({ p, ctx } = await open("#shot&seed=9"));
    await p.evaluate(() => { window.__table.timeScale(0); window.__table.forceRoll(9, 4); window.__table.nextAttacker("guardian"); });
    await type(p, "/attack +2"); await step(p, 2100);
    const a = await p.evaluate(() => window.__table.attackPhase());
    await step(p, Math.round((a.impactAt + 0.03 - a.t) * 1000));       // inside the hit-stop: burst at full
    await shot(p, "attack-impact-1440.png");
    await ctx.close();
  }
  if (want("video")) {
    const plan = [[0.3, 9, 4, "guardian", "/attack +2"], [3.7, 2, 4, "rogue", "/attack +0"]];
    await record("attack.webm", "#shot&seed=9", async (pg, t) => {
      while (plan.length && t >= plan[0][0]) {
        const [, hope, fear, hero, cmd] = plan.shift();
        await pg.evaluate(([h, f, who]) => { window.__table.forceRoll(h, f); window.__table.nextAttacker(who); }, [hope, fear, hero]);
        await type(pg, cmd);
      }
    }, { seconds: 7.2, fps: 12, lean: true });
  }
  if (want("phone")) {
    ({ p, ctx } = await open("#shot&tier=lite&seed=3", { w: 390, h: 844, phone: true }));
    await p.evaluate(() => window.__table.timeScale(0));
    await type(p, "/roll duality", true); await settle(p);
    await checkUp(p, "phone 390"); await shot(p, "phone-dice-390.png");
    await p.tap("#attacks-chip"); await frames(p, 2);
    await shot(p, "phone-card-390.png");
    await ctx.close();
  }
  if (want("reduced")) {
    ({ p, ctx } = await open("#seed=5", { reduced: true }));
    await type(p, "/roll duality"); await frames(p, 3);
    await p.evaluate(() => { window.__table.forceRoll(9, 4); window.__table.nextAttacker("guardian"); });
    await type(p, "/attack +2"); await frames(p, 4);
    say("reduced motion: " + JSON.stringify(await p.evaluate(() => ({ dice: window.__table.diceState(), attack: window.__table.attackPhase() }))));
    await shot(p, "reduced-motion.png");
    await ctx.close();
  }
}

async function pickup() {
  let p, ctx;
  const d12s = (at) => at.filter((d) => d.type === "d12");
  if (want("still")) {
    ({ p, ctx } = await open("#shot&seed=7"));
    await p.evaluate(() => { window.__table.timeScale(0); window.__table.forceRoll(9, 4); });
    await type(p, "/roll duality"); await settle(p);
    await checkUp(p, "pickup: first Duality roll");
    const at = await p.evaluate(() => window.__table.diceAt());
    const ok = d12s(at).length === 2 && d12s(at).every((d) => d.kind === "duality" && d.out && d.phase === "rest");
    if (!ok) failures++;
    say(`landed d12s (${ok ? "only the table's two" : "WRONG"}): ${JSON.stringify(d12s(at))}`);
    await shot(p, "pickup-landed-1440.png");
    await ctx.close();
  }
  if (want("reduced")) {
    ({ p, ctx } = await open("#seed=5", { reduced: true }));
    await p.evaluate(() => { window.__table.timeScale(0); window.__table.forceRoll(9, 4); });
    const before = await p.evaluate(() => window.__table.diceAt());
    await type(p, "/roll duality"); await frames(p, 3);
    await checkUp(p, "pickup: reduced motion, turned in place");
    const after = await p.evaluate(() => window.__table.diceAt());
    const still = d12s(after).every((d, i) => Math.abs(d.x - d12s(before)[i].x) < 1e-3 && Math.abs(d.z - d12s(before)[i].z) < 1e-3);
    if (!still) failures++;
    say(`reduced motion: d12s ${still ? "stayed where they lay" : "MOVED"}, state ${await p.evaluate(() => window.__table.diceState())}`);
    await shot(p, "reduced-motion-roll.png");
    await ctx.close();
  }
  if (want("video")) {
    // two Duality rolls in a row (the second picks the d12s up where the first left them), then 3d6
    const plan = [[0.3, "/roll duality", [9, 4]], [3.6, "/roll duality", [6, 11]], [6.9, "/roll 3d6", null]];
    const notes = [[3.5, "after roll 1"], [6.8, "after roll 2"], [8.9, "3d6 landed"], [12.3, "3d6 back in the tray"]];
    await record("pickup.webm", "#shot&seed=7", async (pg, t) => {
      while (plan.length && t >= plan[0][0]) {
        const [, cmd, f] = plan.shift();
        if (f) await pg.evaluate(([h, fe]) => window.__table.forceRoll(h, fe), f);
        await type(pg, cmd);
      }
      while (notes.length && t >= notes[0][0]) {
        const [, label] = notes.shift();
        const at = await pg.evaluate(() => window.__table.diceAt());
        say(`${label}: ${at.map((d) => `${d.kind}:${d.type}${d.out ? "@" + d.x + "," + d.z : " in tray"} ${d.phase}`).join(" | ")}`);
        if (label.endsWith("landed")) await checkUp(pg, "pickup: 3d6 (tray d6s + one extra)");
        if (label.startsWith("after")) await checkUp(pg, "pickup: Duality " + label);
      }
    }, { seconds: 12.6, fps: 12, lean: true });
  }
}


// the dice of the last roll rest inside the rolling area and do not overlap each other
async function checkArea(p, label) {
  const { area, at } = await p.evaluate(() => ({ area: window.__table.area, at: window.__table.diceAt() }));
  const out = at.filter((d) => d.out && d.phase === "rest");
  const inside = out.every((d) => d.x >= area.x0 && d.x <= area.x1 && d.z >= area.z0 && d.z <= area.z1);
  let apart = true;
  for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) if (Math.hypot(out[i].x - out[j].x, out[i].z - out[j].z) < 0.35) apart = false;
  if (!inside || !apart) failures++;
  say(`${label}: ${out.length} dice out, ${inside ? "inside the rolling area" : "OUTSIDE"}, ${apart ? "apart" : "OVERLAP"} ${out.map((d) => `${d.type}@${d.x},${d.z}`).join(" ")}`);
}

async function fix() {
  let p, ctx;
  if (want("load")) await extras();
  for (const [tag, w, h, phone] of [["1440", 1440, 900, false], ["390", 390, 844, true]]) {
    if (!want("still")) break;
    ({ p, ctx } = await open("#shot&seed=7", { w, h, phone }));
    await p.evaluate(() => { window.__table.timeScale(0); window.__table.forceRoll(9, 4); });
    await shot(p, `table-default-${tag}.png`);
    await type(p, "/roll duality", phone); await settle(p);
    await checkUp(p, `fix: duality ${tag}`); await checkArea(p, `duality ${tag}`);
    await shot(p, `roll-duality-${tag}.png`);
    await type(p, "/roll 3d6", phone); await settle(p);
    await checkUp(p, `fix: 3d6 ${tag}`); await checkArea(p, `3d6 ${tag}`);
    await shot(p, `roll-3d6-${tag}.png`);
    await ctx.close();
  }
  if (want("video")) {
    const plan = [[0.3, "/roll duality", [9, 4]], [3.6, "/roll duality", [6, 11]]];
    await record("rolls.webm", "#shot&seed=7", async (pg, t) => {
      while (plan.length && t >= plan[0][0]) {
        const [, cmd, f] = plan.shift();
        await pg.evaluate(([h, fe]) => window.__table.forceRoll(h, fe), f);
        await type(pg, cmd);
      }
    }, { seconds: 7, fps: 12, lean: true });
  }
}

if (mode === "fix") await fix();
if (mode === "pickup") await pickup();
if (mode === "extras") await extras();
if (mode === "look") await look();
if (mode === "card") await card();
if (mode === "stills" || mode === "all") await stills();
if (mode === "perf" || mode === "all") await perf();
if (mode === "videos" || mode === "all") await videos();
await browser.close();
if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
