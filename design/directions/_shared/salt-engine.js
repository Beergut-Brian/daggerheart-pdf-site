/* salt-engine.js v2 — High Sodium Gaming shared interactive salt.
 *
 * Two kinds of salt on one <canvas>:
 *   1. FIELD (v2): a still sky of suspended grains. Hovering (or dragging a finger)
 *      knocks grains loose; they fall and join the pile. A tap knocks loose a burst.
 *   2. PILE: a falling-grain cellular simulation. Loose grains (from the field, from
 *      emitters, or scattered by the pointer) stack on solids and on the floor and
 *      slide down slopes.
 * Grains are drawn as soft, slightly irregular round sprites with a faint gold glint,
 * never square pixels.
 *
 * Usage:
 *   const salt = SaltEngine.mount(canvas, {
 *     cell: 3,                          // CSS px per pile cell
 *     maxGrains: 9000,                  // cap on loose + piled grains
 *     colors: ['#fbfaf6', '#efe9dd', '#ffffff', '#d9d2c4'],
 *     glint: '#ffd77a',                 // faint warm glint on some grains
 *     field: { density: 0.008, max: 3000, rMin: .55, rMax: 1.5, drift: 3, hover: 26, tapRadius: 70,
 *              avoid: ['.wm', '.pill'], avoidPad: 10, avoidAlpha: .12, twinkle: 30, restPile: .12 },
 *     floor: true,                      // grains collect on the bottom edge (else they leave)
 *     emitters: [{ anchor: '#shaker', ox: 0.5, oy: 1, rate: 40, spread: 6, seconds: 4 }],
 *     solids: [{ selector: '.wordmark', mode: 'glyphs' }, { selector: '.btn', mode: 'rect' }],
 *     pointer: { radius: 28, force: 3.2 }, // scatter piled grains (set radius 0 to disable)
 *     tap: { grains: 500 },             // pointerdown shakes the emitters (if any)
 *     prefill: 2500,                    // grains settled before first paint (emitter mode)
 *   });
 *   salt.shake(400); salt.pour(true|false); salt.knock(x, y, r); salt.destroy(); salt.stats();
 *
 * Performance: the field is drawn once to an offscreen layer and only redrawn when
 * grains leave it; the settled pile is cached to a second layer and only redrawn
 * when it changes; each frame composites the two layers plus the few grains in
 * flight. The pile grid is one Uint8Array. The loop pauses when the canvas is
 * offscreen or the tab is hidden, and drops to the drift-only path when nothing falls.
 * prefers-reduced-motion: the field and a settled pile are painted once; nothing
 * animates or reacts.
 */
(function (global) {
  'use strict';

  const EMPTY = 0, SOLID = 1; // pile grains are 2..(2+colors-1)

  function mount(canvas, opts) {
    const o = Object.assign({
      cell: 3, maxGrains: 9000, colors: ['#fbfaf6', '#efe9dd', '#ffffff', '#d9d2c4'], glint: '#ffd77a',
      field: null, floor: false,
      emitters: [], solids: [], pointer: { radius: 28, force: 3 }, tap: { grains: 400 },
      prefill: 0, prefillMode: 'rain', stepsPerFrame: 2, glyphTop: 0.22, glyphBridge: 0.1, slip: 0.82,
    }, opts || {});
    const F = o.field ? Object.assign({ density: 0.008, max: 3000, rMin: 0.55, rMax: 1.5, drift: 3, hover: 26, tapRadius: 70,
      avoid: [], avoidPad: 10, avoidAlpha: 0.12, twinkle: 30, restPile: 0.12, driftPeriod: 14 }, o.field) : null;
    const reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    const fieldLayer = document.createElement('canvas'), fctx = fieldLayer.getContext('2d');
    const pileLayer = document.createElement('canvas'), pctx = pileLayer.getContext('2d');
    let W = 0, H = 0, cssW = 0, cssH = 0, dpr = 1, grid, solid, grains = 0;
    let flyers = [];             // loose grains in flight: {x,y,vx,vy,c} in cell units
    let running = false, visible = true, idleFrames = 0, raf = 0, t0 = performance.now();
    let pointer = null;          // {x,y,px,py} in cells
    let fieldDirty = true, pileDirty = true, lastPileDraw = -1e9;
    const emitState = o.emitters.map(e => ({ e, left: (e.seconds || 0) * 60, acc: 0 }));

    // ---- grain sprites: a soft round grain per colour, plus a glint variant ----
    const SPR = 16; // sprite resolution in device px
    function makeSprite(hex, glint) {
      const s = document.createElement('canvas'); s.width = s.height = SPR;
      const g = s.getContext('2d'), m = SPR / 2;
      const grd = g.createRadialGradient(m - 1.5, m - 1.5, 0, m, m, m);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(0.35, hex);
      grd.addColorStop(0.75, hex + 'cc');
      grd.addColorStop(1, hex + '00');
      g.fillStyle = grd; g.beginPath(); g.arc(m, m, m, 0, Math.PI * 2); g.fill();
      if (glint) { g.globalCompositeOperation = 'lighter'; g.fillStyle = glint + '88'; g.beginPath(); g.arc(m + 2, m - 2, m * 0.35, 0, Math.PI * 2); g.fill(); }
      return s;
    }
    const sprites = o.colors.map(c => makeSprite(c, false));
    const glints = o.colors.map(c => makeSprite(c, o.glint));
    // deterministic per-cell jitter so the pile looks grainy but never shimmers
    function hash(i) { i = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b); i ^= i >>> 13; i = Math.imul(i, 0xc2b2ae35); return ((i ^ (i >>> 16)) >>> 0) / 4294967296; }

    // ---- geometry ----
    function cssRectToCells(r, cr) {
      return {
        x0: Math.floor((r.left - cr.left) / o.cell), x1: Math.ceil((r.right - cr.left) / o.cell),
        y0: Math.floor((r.top - cr.top) / o.cell), y1: Math.ceil((r.bottom - cr.top) / o.cell),
      };
    }
    function markRect(c) {
      for (let y = Math.max(0, c.y0); y < Math.min(H, c.y1); y++)
        for (let x = Math.max(0, c.x0); x < Math.min(W, c.x1); x++) solid[y * W + x] = 1;
    }
    function splitGlyphs(el) {
      if (el.dataset.saltSplit) return;
      el.dataset.saltSplit = '1';
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes = []; while (walk.nextNode()) nodes.push(walk.currentNode);
      nodes.forEach(t => {
        const frag = document.createDocumentFragment();
        for (const ch of t.textContent) {
          if (/\s/.test(ch)) { frag.appendChild(document.createTextNode(ch)); continue; }
          const s = document.createElement('span'); s.className = 'salt-glyph'; s.textContent = ch;
          s.setAttribute('aria-hidden', 'true'); frag.appendChild(s);
        }
        t.parentNode.replaceChild(frag, t);
      });
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    }
    function buildSolids() {
      solid.fill(0);
      const cr = canvas.getBoundingClientRect();
      o.solids.forEach(s => {
        document.querySelectorAll(s.selector).forEach(el => {
          if (s.mode === 'glyphs') {
            splitGlyphs(el);
            el.querySelectorAll('.salt-glyph').forEach(g => {
              const r = g.getBoundingClientRect();
              const trim = r.height * (s.top != null ? s.top : o.glyphTop);
              const br = r.height * o.glyphBridge; // close the hairline gaps between letters
              markRect(cssRectToCells({ left: r.left - br, right: r.right + br, top: r.top + trim, bottom: r.bottom - r.height * 0.18 }, cr));
            });
          } else {
            const r = el.getBoundingClientRect(), inset = s.inset || 0; // inset: rest on the curve of a pill, not its box corner
            markRect(cssRectToCells({ left: r.left + inset, right: r.right - inset, top: r.top, bottom: r.bottom }, cr));
          }
        });
      });
      for (let i = 0; i < grid.length; i++) {
        if (solid[i] && grid[i] >= 2) { grid[i] = EMPTY; grains--; }
        if (solid[i]) grid[i] = SOLID;
        else if (grid[i] === SOLID) grid[i] = EMPTY;
      }
      pileDirty = true;
    }

    // ---- the field: suspended grains ----
    let fx, fy, fr, fa, fc, fg, falive, fcount = 0, buckets = null, BK = 32, bw = 0, bh = 0;
    function buildField() {
      if (!F) return;
      const n = Math.min(F.max, Math.round(cssW * cssH * F.density));
      fx = new Float32Array(n); fy = new Float32Array(n); fr = new Float32Array(n); fa = new Float32Array(n);
      fc = new Uint8Array(n); fg = new Uint8Array(n); falive = new Uint8Array(n); fcount = n;
      const cr = canvas.getBoundingClientRect();
      const avoid = [];
      F.avoid.forEach(sel => document.querySelectorAll(sel).forEach(el => { const r = el.getBoundingClientRect(); avoid.push([r.left - cr.left - F.avoidPad, r.top - cr.top - F.avoidPad, r.right - cr.left + F.avoidPad, r.bottom - cr.top + F.avoidPad]); }));
      for (let i = 0; i < n; i++) {
        const x = Math.random() * cssW, y = Math.random() * cssH;
        // more small grains than big ones, like real salt
        const k = Math.pow(Math.random(), 2.2);
        fx[i] = x; fy[i] = y; fr[i] = F.rMin + (F.rMax - F.rMin) * k;
        fa[i] = 0.35 + 0.65 * Math.random();
        for (const a of avoid) if (x > a[0] && x < a[2] && y > a[1] && y < a[3]) { fa[i] *= F.avoidAlpha; break; }
        fc[i] = (Math.random() * sprites.length) | 0; fg[i] = Math.random() < 0.18 ? 1 : 0; falive[i] = 1;
      }
      bw = Math.ceil(cssW / BK); bh = Math.ceil(cssH / BK);
      buckets = Array.from({ length: bw * bh }, () => []);
      for (let i = 0; i < n; i++) buckets[Math.min(bh - 1, (fy[i] / BK) | 0) * bw + Math.min(bw - 1, (fx[i] / BK) | 0)].push(i);
      fieldDirty = true;
    }
    function drawField() {
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.clearRect(0, 0, cssW, cssH);
      for (let i = 0; i < fcount; i++) {
        if (!falive[i]) continue;
        const r = fr[i], sx = r * 2 * (0.85 + 0.3 * hash(i)), sy = r * 2 * (0.85 + 0.3 * hash(i + 7));
        fctx.globalAlpha = fa[i];
        fctx.drawImage(fg[i] ? glints[fc[i]] : sprites[fc[i]], fx[i] - sx / 2, fy[i] - sy / 2, sx, sy);
      }
      fctx.globalAlpha = 1; fieldDirty = false;
    }
    function driftOffset(t) {
      if (!F || reduce) return [0, 0];
      const p = (t / 1000) * (2 * Math.PI) / F.driftPeriod;
      return [Math.sin(p) * F.drift, Math.cos(p * 0.73) * F.drift * 0.6];
    }
    // knock field grains near (x,y) css px loose: they become falling grains
    function knock(x, y, r) {
      if (!F || !buckets) return 0;
      const [dx, dy] = driftOffset(performance.now() - t0);
      x -= dx; y -= dy;
      let n = 0; const r2 = r * r;
      for (let by = Math.max(0, ((y - r) / BK) | 0); by <= Math.min(bh - 1, ((y + r) / BK) | 0); by++)
        for (let bx = Math.max(0, ((x - r) / BK) | 0); bx <= Math.min(bw - 1, ((x + r) / BK) | 0); bx++)
          for (const i of buckets[by * bw + bx]) {
            if (!falive[i]) continue;
            const ddx = fx[i] - x, ddy = fy[i] - y;
            if (ddx * ddx + ddy * ddy > r2) continue;
            if (grains >= o.maxGrains) continue;
            falive[i] = 0; n++; grains++;
            flyers.push({ x: (fx[i] + dx) / o.cell, y: (fy[i] + dy) / o.cell, vx: (Math.random() - 0.5) * 0.35, vy: Math.random() * 0.2, c: 2 + fc[i], g: fg[i], r: fr[i] });
          }
      if (n) { fieldDirty = true; wake(); if (o.onKnock) o.onKnock(n); }
      return n;
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      cssW = r.width; cssH = r.height;
      for (const c of [canvas, fieldLayer, pileLayer]) { c.width = Math.round(cssW * dpr); c.height = Math.round(cssH * dpr); }
      W = Math.max(1, Math.ceil(cssW / o.cell)); H = Math.max(1, Math.ceil(cssH / o.cell));
      grid = new Uint8Array(W * H); solid = new Uint8Array(W * H); grains = 0; flyers = [];
      buildSolids(); buildField();
    }

    function emitterPos(e) {
      if (typeof e.anchor === 'string') {
        const el = document.querySelector(e.anchor); if (!el) return null;
        const a = el.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
        return { x: (a.left - cr.left + a.width * (e.ox ?? 0.5)) / o.cell, y: (a.top - cr.top + a.height * (e.oy ?? 1)) / o.cell };
      }
      const cr = canvas.getBoundingClientRect();
      return { x: (e.anchor.x * cr.width) / o.cell, y: (e.anchor.y * cr.height) / o.cell };
    }
    function put(x, y) {
      x |= 0; y |= 0;
      if (grains >= o.maxGrains || x < 0 || x >= W || y < 0 || y >= H) return false;
      const i = y * W + x; if (grid[i] !== EMPTY) return false;
      grid[i] = 2 + ((Math.random() * sprites.length) | 0); grains++; pileDirty = true; return true;
    }
    function emitOne(s, n) {
      const p = emitterPos(s.e); if (!p) return;
      const sp = s.e.spread || 4;
      for (let k = 0; k < n; k++) put(p.x + (Math.random() - 0.5) * sp, p.y + Math.random() * 2);
    }

    // ---- pile simulation ----
    let flip = false;
    function step() {
      let moved = 0; flip = !flip;
      for (let y = H - 2; y >= 0; y--) {
        const row = y * W, below = row + W;
        for (let k = 0; k < W; k++) {
          const x = flip ? k : W - 1 - k, i = row + x, c = grid[i];
          if (c < 2) continue;
          if (grid[below + x] === EMPTY) { grid[below + x] = c; grid[i] = EMPTY; moved++; continue; }
          if (Math.random() > o.slip) continue; // salt is a little sticky: rough, uneven piles
          const d = Math.random() < 0.5 ? -1 : 1;
          const xa = x + d, xb = x - d;
          if (xa >= 0 && xa < W && grid[below + xa] === EMPTY && grid[row + xa] === EMPTY) { grid[below + xa] = c; grid[i] = EMPTY; moved++; }
          else if (xb >= 0 && xb < W && grid[below + xb] === EMPTY && grid[row + xb] === EMPTY) { grid[below + xb] = c; grid[i] = EMPTY; moved++; }
        }
      }
      if (!o.floor) { // without a floor, grains on the bottom row leave the screen
        const last = (H - 1) * W;
        for (let x = 0; x < W; x++) if (grid[last + x] >= 2 && Math.random() < 0.08) { grid[last + x] = EMPTY; grains--; moved++; }
      }
      if (moved) pileDirty = true;
      return moved;
    }
    function stepFlyers() {
      const keep = [];
      for (const f of flyers) {
        f.vy = Math.min(f.vy + 0.12, 2.2); f.vx *= 0.97; f.x += f.vx; f.y += f.vy;
        const x = f.x | 0, y = f.y | 0;
        if (x < 0 || x >= W || (y >= H && !o.floor)) { grains--; continue; }
        const yy = Math.min(y, H - 1);
        if (yy >= 0 && (yy + 1 >= H || grid[(yy + 1) * W + x] !== EMPTY) && grid[yy * W + x] === EMPTY) { grid[yy * W + x] = f.c; pileDirty = true; continue; }
        if (yy >= 0 && grid[yy * W + x] !== EMPTY && yy + 1 >= H) { // floor cell taken: slide up to the first free cell
          let up = yy; while (up > 0 && grid[up * W + x] !== EMPTY) up--;
          if (grid[up * W + x] === EMPTY) { grid[up * W + x] = f.c; pileDirty = true; } else grains--;
          continue;
        }
        keep.push(f);
      }
      flyers = keep; return keep.length;
    }
    function applyPointer() {
      if (!pointer) return 0;
      const mvx = pointer.x - pointer.px, mvy = pointer.y - pointer.py;
      pointer.px = pointer.x; pointer.py = pointer.y;
      if (Math.abs(mvx) + Math.abs(mvy) < 0.2) return 0;
      let n = 0;
      if (F) n += knock(pointer.x * o.cell, pointer.y * o.cell, F.hover);
      if (!o.pointer || !o.pointer.radius) return n;
      const r = o.pointer.radius / o.cell, r2 = r * r, f = o.pointer.force;
      for (let y = Math.max(0, (pointer.y - r) | 0); y < Math.min(H, pointer.y + r); y++)
        for (let x = Math.max(0, (pointer.x - r) | 0); x < Math.min(W, pointer.x + r); x++) {
          const dx = x - pointer.x, dy = y - pointer.y, d2 = dx * dx + dy * dy;
          if (d2 > r2) continue;
          const i = y * W + x, c = grid[i]; if (c < 2) continue;
          const d = Math.sqrt(d2) || 1;
          grid[i] = EMPTY; pileDirty = true;
          flyers.push({ x, y, c, vx: (dx / d) * f + mvx * 0.35 + (Math.random() - 0.5), vy: (dy / d) * f - f * 0.6 + mvy * 0.2 });
          n++;
        }
      return n;
    }

    // ---- drawing ----
    function drawPile() {
      pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pctx.clearRect(0, 0, cssW, cssH);
      const s = o.cell * 1.55; // sprites overlap a little: a pile, not a grid
      for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
        const c = grid[i]; if (c < 2) continue;
        const h = hash(i), jx = (h - 0.5) * o.cell * 0.6, jy = (hash(i + 3) - 0.5) * o.cell * 0.5;
        pctx.drawImage(h < 0.12 ? glints[c - 2] : sprites[c - 2], x * o.cell + jx - (s - o.cell) / 2, y * o.cell + jy - (s - o.cell) / 2, s * (0.85 + 0.3 * h), s);
      }
      pileDirty = false;
    }
    function draw(t) {
      if (fieldDirty) drawField();
      // the pile is the expensive layer: redraw it at most ~20 times a second while grains settle
      if (pileDirty && (t - lastPileDraw > 48 || !running)) { drawPile(); lastPileDraw = t; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (F) {
        const [dx, dy] = driftOffset(t);
        ctx.drawImage(fieldLayer, dx * dpr, dy * dpr);
        // twinkle: a few grains catch the light at a time
        if (!reduce && F.twinkle && fcount) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          const k = (t / 900) | 0;
          for (let j = 0; j < F.twinkle; j++) {
            const i = (hash(k * 131 + j) * fcount) | 0; if (!falive[i]) continue;
            const ph = ((t / 900) % 1), a = Math.sin(ph * Math.PI) * 0.9, s = fr[i] * 4.2;
            ctx.globalAlpha = a; ctx.drawImage(glints[fc[i]], fx[i] + dx - s / 2, fy[i] + dy - s / 2, s, s);
          }
          ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
      }
      ctx.drawImage(pileLayer, 0, 0);
      if (flyers.length) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // a falling grain keeps the size it had in the field (scattered pile grains use the pile size)
        for (const f of flyers) { const s = f.r ? f.r * 2.2 : o.cell * 1.4; ctx.drawImage(f.g ? glints[f.c - 2] : sprites[f.c - 2], f.x * o.cell - s / 2, f.y * o.cell - s / 2, s, s); }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }

    function frame(now) {
      raf = 0; if (!running) return;
      let activity = applyPointer();
      emitState.forEach(s => {
        if (s.left <= 0) return; s.left--; s.acc += (s.e.rate || 30) / 60;
        const n = s.acc | 0; s.acc -= n; if (n) { emitOne(s, n); activity += n; }
      });
      for (let k = 0; k < o.stepsPerFrame; k++) activity += step();
      activity += stepFlyers();
      draw(now - t0);
      idleFrames = activity ? 0 : idleFrames + 1;
      // a field keeps drifting while visible; a pile-only canvas sleeps when still
      if (visible && (F || idleFrames < 30)) raf = requestAnimationFrame(frame);
      else running = false;
    }
    function wake() { if (reduce || running || !visible) return; running = true; idleFrames = 0; raf = requestAnimationFrame(frame); }

    function solidSpan() {
      let x0 = W, x1 = 0;
      for (let i = 0; i < solid.length; i++) if (solid[i]) { const x = i % W; if (x < x0) x0 = x; if (x > x1) x1 = x; }
      return x1 > x0 ? [x0, x1] : [0, W - 1];
    }
    function prefill(n, wide) {
      // 'rain': grains fall across the width of the solids (or the whole width);
      // 'emitters': grains come from the emitters only. Settled headless before first paint.
      let left = Math.min(n, o.maxGrains - grains), guard = 0;
      const [x0, x1] = wide ? [0, W - 1] : solidSpan();
      while (left > 0 && guard++ < 8000) {
        const batch = Math.min(left, 40);
        if (o.prefillMode === 'emitters' && emitState.length) emitState.forEach(s => emitOne(s, Math.ceil(batch / emitState.length)));
        else for (let k = 0; k < batch; k++) put(x0 + Math.random() * (x1 - x0), Math.random() * 3);
        left -= batch; step(); step(); step();
      }
      for (let k = 0; k < H * 3 && step(); k++);
    }

    // ---- events ----
    function toCell(ev) {
      const r = canvas.getBoundingClientRect();
      return { x: (ev.clientX - r.left) / o.cell, y: (ev.clientY - r.top) / o.cell };
    }
    const target = o.eventTarget || canvas.parentElement || document;
    function onMove(ev) {
      if (ev.pointerType === 'touch' && !ev.buttons && ev.type === 'pointermove' && !ev.isPrimary) return;
      const p = toCell(ev); pointer = pointer ? Object.assign(pointer, p) : { ...p, px: p.x, py: p.y }; wake();
    }
    function onLeave() { pointer = null; }
    function onDown(ev) {
      const p = toCell(ev); pointer = { ...p, px: p.x, py: p.y };
      if (ev.target.closest && ev.target.closest('a,button,input')) return;
      if (F) knock(p.x * o.cell, p.y * o.cell, F.tapRadius);
      if (o.tap && o.tap.grains && emitState.length) shake(o.tap.grains);
      wake();
    }
    function shake(n) {
      if (reduce) return;
      emitState.forEach(s => { s.left = Math.max(s.left, 45); });
      emitState.forEach(s => emitOne(s, Math.ceil((n || 300) / 45))); wake();
    }

    let ro, io;
    function settleRest() {
      // reduced motion (and the first paint of a field): some salt already rests on the floor
      if (F && F.restPile) prefill(Math.round(fcount * F.restPile), true);
    }
    function init() {
      resize();
      if (o.prefill) prefill(o.prefill);
      if (reduce) settleRest();
      draw(0);
      if (reduce) return; // static field + settled pile, no listeners, no loop
      target.addEventListener('pointermove', onMove, { passive: true });
      target.addEventListener('pointerdown', onDown, { passive: true });
      target.addEventListener('pointerleave', onLeave, { passive: true });
      let lastW = cssW;
      ro = new ResizeObserver(() => {
        const r = canvas.getBoundingClientRect();
        if (Math.abs(r.width - lastW) < 1 && Math.abs(r.height - cssH) < 80) { buildSolids(); return; } // mobile URL bar: keep the salt
        lastW = r.width; cancelAnimationFrame(raf); running = false; resize(); if (o.prefill) prefill(o.prefill); draw(0); wake();
      });
      ro.observe(canvas);
      io = new IntersectionObserver(es => { visible = es[0].isIntersecting && !document.hidden; if (visible) wake(); }, { threshold: 0 });
      io.observe(canvas);
      document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) wake(); });
      wake();
    }
    // wait for web fonts so glyph solids and avoid-zones match the final letter positions
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(init);

    return {
      shake, knock, pour(on) { emitState.forEach(s => { s.left = on ? Infinity : 0; }); wake(); },
      rebuild() { buildSolids(); draw(performance.now() - t0); },
      stats() { let alive = 0; if (F) for (let i = 0; i < fcount; i++) alive += falive[i]; return { grains, field: alive, flyers: flyers.length, cells: W * H, running, reduce }; },
      destroy() {
        running = false; cancelAnimationFrame(raf); ro && ro.disconnect(); io && io.disconnect();
        target.removeEventListener('pointermove', onMove); target.removeEventListener('pointerdown', onDown); target.removeEventListener('pointerleave', onLeave);
      },
    };
  }

  global.SaltEngine = { mount, version: 2 };
})(window);
