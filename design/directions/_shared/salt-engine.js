/* salt-engine.js — High Sodium Gaming shared interactive salt.
 *
 * A falling-grain cellular simulation on one <canvas>. Salt pours from emitters,
 * piles on page elements marked as solids (letters of the wordmark, the button),
 * the pointer/finger scatters it, a tap shakes out more.
 *
 * Usage:
 *   const salt = SaltEngine.mount(canvas, {
 *     cell: 3,                          // CSS px per grain
 *     maxGrains: 9000,                  // hard cap (phones: lower)
 *     colors: ['#fbfaf6', '#efe9dd', '#ffffff', '#d9d2c4'],
 *     emitters: [{ anchor: '#shaker', ox: 0.5, oy: 1, rate: 40, spread: 6, seconds: 4 }],
 *     solids: [{ selector: '.wordmark', mode: 'glyphs' }, { selector: '.btn', mode: 'rect' }],
 *     pointer: { radius: 28, force: 3.2 },
 *     tap: { grains: 500 },             // pointerdown anywhere shakes the emitters
 *     prefill: 2500,                    // grains settled before first paint
 *   });
 *   salt.shake(400); salt.pour(true|false); salt.destroy(); salt.stats();
 *
 * Performance: grid at cell px (390x844 @3 = 36k cells), one Uint8Array, ImageData
 * at grid size scaled up with smoothing off. Sleeps when nothing moves, pauses when
 * offscreen or the tab is hidden. prefers-reduced-motion: the pile is settled
 * synchronously, painted once, and nothing animates or reacts.
 */
(function (global) {
  'use strict';

  const EMPTY = 0, SOLID = 1; // grains are 2..(2+colors-1)

  function mount(canvas, opts) {
    const o = Object.assign({
      cell: 3, maxGrains: 9000, colors: ['#fbfaf6', '#efe9dd', '#ffffff', '#d9d2c4'],
      emitters: [], solids: [], pointer: { radius: 28, force: 3 }, tap: { grains: 400 },
      prefill: 0, prefillMode: 'rain', stepsPerFrame: 2, glyphTop: 0.22, glyphBridge: 0.1, slip: 0.82, showSolids: false,
    }, opts || {});
    const reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    const img = document.createElement('canvas');
    const ictx = img.getContext('2d');
    let W = 0, H = 0, grid, solid, imageData, px32, palette32, grains = 0;
    let flyers = [];             // scattered grains in flight: {x,y,vx,vy,c}
    let running = false, visible = true, idleFrames = 0, raf = 0;
    let pointer = null;          // {x,y,px,py} in cells
    const emitState = o.emitters.map(e => ({ e, left: (e.seconds || 0) * 60, acc: 0 }));

    // ---- colours ----
    function hexTo32(hex) {
      const n = parseInt(hex.replace('#', ''), 16);
      const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      return (255 << 24) | (b << 16) | (g << 8) | r; // little-endian RGBA
    }
    palette32 = o.colors.map(hexTo32);
    const SOLID32 = hexTo32('#ff00ff') & 0x55ffffff;

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
              // glyph boxes include line-height padding; trim the top to the cap line
              const trim = r.height * (s.top != null ? s.top : o.glyphTop);
              const br = r.height * o.glyphBridge; // close the hairline gaps between letters
              markRect(cssRectToCells({ left: r.left - br, right: r.right + br, top: r.top + trim, bottom: r.bottom - r.height * 0.18 }, cr));
            });
          } else {
            markRect(cssRectToCells(el.getBoundingClientRect(), cr));
          }
        });
      });
      for (let i = 0; i < grid.length; i++) {
        if (solid[i] && grid[i] >= 2) { grid[i] = EMPTY; grains--; }
        if (solid[i]) grid[i] = SOLID;
        else if (grid[i] === SOLID) grid[i] = EMPTY;
      }
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      W = Math.max(1, Math.ceil(r.width / o.cell)); H = Math.max(1, Math.ceil(r.height / o.cell));
      img.width = W * 2; img.height = H * 2;
      grid = new Uint8Array(W * H); solid = new Uint8Array(W * H); grains = 0; flyers = [];
      imageData = ictx.createImageData(W * 2, H * 2); px32 = new Uint32Array(imageData.data.buffer);
      buildSolids();
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
      grid[i] = 2 + ((Math.random() * palette32.length) | 0); grains++; return true;
    }
    function emit(n, onlyActive) {
      emitState.forEach(s => {
        if (onlyActive && s.left <= 0) return;
        const p = emitterPos(s.e); if (!p) return;
        const sp = s.e.spread || 4;
        for (let k = 0; k < n; k++) put(p.x + (Math.random() - 0.5) * sp, p.y + Math.random() * 2);
      });
    }

    // ---- simulation ----
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
      // grains that reach the bottom edge leave the screen (keeps the floor from filling)
      const last = (H - 1) * W;
      for (let x = 0; x < W; x++) if (grid[last + x] >= 2 && Math.random() < 0.08) { grid[last + x] = EMPTY; grains--; moved++; }
      return moved;
    }
    function stepFlyers() {
      const keep = [];
      for (const f of flyers) {
        f.vy += 0.35; f.vx *= 0.96; f.x += f.vx; f.y += f.vy;
        const x = f.x | 0, y = f.y | 0;
        if (x < 0 || x >= W || y >= H) { grains--; continue; }
        if (y >= 0 && (y + 1 >= H || grid[(y + 1) * W + x] !== EMPTY) && grid[y * W + x] === EMPTY) { grid[y * W + x] = f.c; continue; }
        keep.push(f);
      }
      flyers = keep; return keep.length;
    }
    function applyPointer() {
      if (!pointer) return 0;
      const r = o.pointer.radius / o.cell, r2 = r * r, f = o.pointer.force;
      const mvx = pointer.x - pointer.px, mvy = pointer.y - pointer.py;
      pointer.px = pointer.x; pointer.py = pointer.y;
      if (Math.abs(mvx) + Math.abs(mvy) < 0.2) return 0;
      let n = 0;
      for (let y = Math.max(0, (pointer.y - r) | 0); y < Math.min(H, pointer.y + r); y++)
        for (let x = Math.max(0, (pointer.x - r) | 0); x < Math.min(W, pointer.x + r); x++) {
          const dx = x - pointer.x, dy = y - pointer.y, d2 = dx * dx + dy * dy;
          if (d2 > r2) continue;
          const i = y * W + x, c = grid[i]; if (c < 2) continue;
          const d = Math.sqrt(d2) || 1;
          grid[i] = EMPTY;
          flyers.push({ x, y, c, vx: (dx / d) * f + mvx * 0.35 + (Math.random() - 0.5), vy: (dy / d) * f - f * 0.6 + mvy * 0.2 });
          n++;
        }
      return n;
    }

    // each grain is drawn as 2x2 image pixels: a bright facet, two body pixels, a shaded corner
    function shade(c32, k) {
      const r = c32 & 255, g = (c32 >> 8) & 255, b = (c32 >> 16) & 255;
      const f = v => Math.max(0, Math.min(255, Math.round(v * k)));
      return (255 << 24) | (f(b) << 16) | (f(g) << 8) | f(r);
    }
    const lit = palette32.map(c => shade(c, 1.12)), dark = palette32.map(c => shade(c, 0.78));
    function plot(x, y, c) {
      const W2 = W * 2, i = y * 2 * W2 + x * 2, k = c - 2;
      px32[i] = lit[k]; px32[i + 1] = palette32[k]; px32[i + W2] = palette32[k]; px32[i + W2 + 1] = dark[k];
    }
    function draw() {
      px32.fill(0);
      for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
        const c = grid[i];
        if (c >= 2) plot(x, y, c);
        else if (c === SOLID && o.showSolids) { const W2 = W * 2, j = y * 2 * W2 + x * 2; px32[j] = SOLID32; }
      }
      for (const f of flyers) { const x = f.x | 0, y = f.y | 0; if (x >= 0 && x < W && y >= 0 && y < H) plot(x, y, f.c); }
      ictx.putImageData(imageData, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sx = canvas.width / canvas.getBoundingClientRect().width;
      ctx.drawImage(img, 0, 0, W * o.cell * sx, H * o.cell * sx);
    }

    function frame() {
      raf = 0; if (!running) return;
      let activity = applyPointer();
      emitState.forEach(s => {
        if (s.left <= 0) return; s.left--; s.acc += (s.e.rate || 30) / 60;
        const n = s.acc | 0; s.acc -= n; if (n) { emitOne(s, n); activity += n; }
      });
      for (let k = 0; k < o.stepsPerFrame; k++) activity += step();
      activity += stepFlyers();
      draw();
      idleFrames = activity ? 0 : idleFrames + 1;
      if (idleFrames < 30 && visible) raf = requestAnimationFrame(frame);
      else running = false;
    }
    function emitOne(s, n) {
      const p = emitterPos(s.e); if (!p) return;
      const sp = s.e.spread || 4;
      for (let k = 0; k < n; k++) put(p.x + (Math.random() - 0.5) * sp, p.y + Math.random() * 2);
    }
    function wake() { if (reduce || running || !visible) return; running = true; idleFrames = 0; raf = requestAnimationFrame(frame); }

    function solidSpan() {
      let x0 = W, x1 = 0;
      for (let i = 0; i < solid.length; i++) if (solid[i]) { const x = i % W; if (x < x0) x0 = x; if (x > x1) x1 = x; }
      return x1 > x0 ? [x0, x1] : [0, W - 1];
    }
    function prefill(n) {
      // 'rain': grains fall across the width of the solids, so salt rests along the whole wordmark;
      // 'emitters': grains come from the emitters only. Settled headless before first paint.
      let left = Math.min(n, o.maxGrains), guard = 0;
      const [x0, x1] = solidSpan();
      while (left > 0 && guard++ < 6000) {
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
    function onMove(ev) { const p = toCell(ev); pointer = pointer ? Object.assign(pointer, p) : { ...p, px: p.x, py: p.y }; wake(); }
    function onLeave() { pointer = null; }
    function onDown(ev) { onMove(ev); if (o.tap && o.tap.grains && !ev.target.closest('a,button,input')) { shake(o.tap.grains); } }
    function shake(n) {
      if (reduce) return;
      emitState.forEach(s => { s.left = Math.max(s.left, 45); });
      emit(Math.ceil((n || 300) / 45), false); wake();
    }

    let ro, io;
    function init() {
      resize();
      if (o.prefill) prefill(o.prefill);
      draw();
      if (reduce) return; // static settled pile, no listeners, no loop
      target.addEventListener('pointermove', onMove, { passive: true });
      target.addEventListener('pointerdown', onDown, { passive: true });
      target.addEventListener('pointerleave', onLeave, { passive: true });
      ro = new ResizeObserver(() => { cancelAnimationFrame(raf); running = false; resize(); if (o.prefill) prefill(o.prefill); draw(); wake(); });
      ro.observe(canvas);
      io = new IntersectionObserver(es => { visible = es[0].isIntersecting && !document.hidden; if (visible) wake(); }, { threshold: 0 });
      io.observe(canvas);
      document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) wake(); });
      wake();
    }
    // wait for web fonts so glyph solids match the final letter positions
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(init);

    return {
      shake, pour(on) { emitState.forEach(s => { s.left = on ? Infinity : 0; }); wake(); },
      rebuild() { buildSolids(); draw(); },
      stats() { return { grains, flyers: flyers.length, cells: W * H, running, reduce }; },
      destroy() {
        running = false; cancelAnimationFrame(raf); ro && ro.disconnect(); io && io.disconnect();
        target.removeEventListener('pointermove', onMove); target.removeEventListener('pointerdown', onDown); target.removeEventListener('pointerleave', onLeave);
      },
    };
  }

  global.SaltEngine = { mount };
})(window);
