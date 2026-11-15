/* Direction A — cubic halite crystals and leather, drawn in SVG from a seeded PRNG.
   Same seed -> same art. No raster anywhere. Colours come from CSS classes (tokens in base.css). */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const f = (n) => n.toFixed(1);
  const pts = (arr) => arr.map((p) => f(p[0]) + ',' + f(p[1])).join(' ');

  // One isometric cube, bottom vertex at (x,y), edge s, turned rot degrees, grow delay d.
  function cube(c) {
    const { x, y, s, rot, d } = c; const a = s * 0.866, b = s * 0.5;
    const B = [x, y], LB = [x - a, y - b], RB = [x + a, y - b], F = [x, y - s], LT = [x - a, y - b - s], RT = [x + a, y - b - s], BK = [x, y - 2 * b - s];
    const cx = x, cy = y - s - b;
    const sc = (p, k) => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k];
    const top = [F, LT, BK, RT];
    let hop = '';
    if (s > 9) {
      // hopper step: the stair-stepped hollow top real salt grows
      const k1 = top.map((p) => sc(p, 0.64)), k2 = top.map((p) => sc(p, 0.3));
      hop = `<polygon class="cx-h1" points="${pts(top.map((p) => sc(p, 0.64)))}"/><polygon class="cx-h2" points="${pts(top.map((p) => sc(p, 0.34)))}"/>`;
    }
    return `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})"><g class="cx" style="--d:${d.toFixed(2)}s">` +
      `<polygon class="cx-l" points="${pts([B, LB, LT, F])}"/>` +
      `<polygon class="cx-r" points="${pts([B, RB, RT, F])}"/>` +
      `<polygon class="cx-t" points="${pts(top)}"/>` + hop +
      `<polygon class="cx-e" points="${pts([B, LB, LT, BK, RT, RB])}"/><polyline class="cx-e" points="${pts([LT, F, RT])}"/><line class="cx-e" x1="${f(B[0])}" y1="${f(B[1])}" x2="${f(F[0])}" y2="${f(F[1])}"/>` +
      `</g></g>`;
  }

  // A cluster of intergrown cubes around (cx,cy). spread = [a0,a1] radians (direction it bursts).
  function cluster(o) {
    const r = rng(o.seed), out = [];
    const n = o.n, R = o.R, smax = o.smax, smin = o.smin || smax * 0.22;
    for (let i = 0; i < n; i++) {
      const t = Math.pow(r(), o.pow || 0.85);
      const ang = o.spread ? o.spread[0] + (o.spread[1] - o.spread[0]) * r() : r() * Math.PI * 2;
      const dist = t * R;
      const x = o.cx + Math.cos(ang) * dist, y = o.cy + Math.sin(ang) * dist * (o.squash || 1);
      const s = Math.max(smin, smax * (1 - 0.72 * t) * (0.62 + 0.38 * r()));
      out.push({ x, y, s, rot: (r() - 0.5) * 50, d: (o.d0 || 0.2) + t * (o.dt || 0.85) + r() * 0.12 });
    }
    return out;
  }
  function hits(c, box, pad) {
    if (!box) return false; const w = c.s * 0.9 + pad;
    return c.x + w > box.x && c.x - w < box.x + box.w && c.y + pad > box.y && c.y - c.s * 2 - pad < box.y + box.h;
  }
  function glow(cx, cy, r) { return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(r)}" ry="${f(r * .7)}" fill="url(#g-glow)"/>`; }
  function draw(cubes) { return cubes.sort((p, q) => p.y - q.y).map(cube).join(''); }

  // Shared defs: leather, wash, grain, gilt gradient, warm glow.
  const DEFS = `<svg class="defs" aria-hidden="true" focusable="false"><defs>
    <filter id="f-leather" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" seed="7" result="pebble"/>
      <feTurbulence type="fractalNoise" baseFrequency=".012 .02" numOctaves="2" seed="3" result="mottle"/>
      <feComposite in="pebble" in2="mottle" operator="arithmetic" k1="0" k2=".55" k3=".7" k4="-.12" result="hide"/>
      <feDiffuseLighting in="hide" surfaceScale="2.2" diffuseConstant="1.05" result="lit"><feDistantLight azimuth="225" elevation="48"/></feDiffuseLighting>
      <feComposite in="lit" in2="SourceAlpha" operator="in"/>
    </filter>
    <filter id="f-wash" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency=".0028 .0042" numOctaves="5" seed="11" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.4 0 0 0 -1.05" result="a"/>
      <feFlood result="gold"/>
      <feComposite in="gold" in2="a" operator="in"/>
    </filter>
    <filter id="f-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <linearGradient id="g-gilt" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" class="g-a"/><stop offset=".45" class="g-b"/><stop offset=".6" class="g-c"/><stop offset="1" class="g-b"/></linearGradient>
    <radialGradient id="g-glow"><stop offset="0" class="cx-glow-a"/><stop offset="1" class="cx-glow-b"/></radialGradient>
    <symbol id="sigil" viewBox="0 0 64 64"><polygon class="sig-shade" points="32,58 6,43 6,21 32,36"/><polygon class="sig-fill" points="32,58 58,43 58,21 32,36" opacity=".75"/><polygon class="sig-salt" points="32,36 6,21 32,6 58,21"/><polygon class="sig-line" points="32,31 15,21 32,11 49,21"/><polygon class="sig-line" points="32,26 24,21 32,16 40,21"/><polygon class="sig-line" points="32,58 6,43 6,21 32,6 58,21 58,43"/><line class="sig-line" x1="32" y1="36" x2="32" y2="58"/></symbol>
  </defs></svg>`;

  function svgEl(w, h, cls) { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', `0 0 ${f(w)} ${f(h)}`); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); if (cls) s.setAttribute('class', cls); return s; }
  function relBox(el, root) { const a = el.getBoundingClientRect(), b = root.getBoundingClientRect(); return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height }; }

  // Small crust on two corners of a button/plate.
  function plateCrust(el, seed) {
    const host = el.querySelector('.plate-crust'); if (!host) return; host.innerHTML = '';
    const w = el.offsetWidth, h = el.offsetHeight;
    [[0, 0, -2.4, -0.5, 1], [w, h, -0.9, 0.9, 2]].forEach(([x, y, a0, a1, k]) => {
      const s = svgEl(60, 60); s.style.left = (x - 30) + 'px'; s.style.top = (y - 30) + 'px'; s.style.width = '60px'; s.style.height = '60px';
      s.innerHTML = draw(cluster({ seed: seed + k, cx: 30, cy: 34, R: 16, n: 7, smax: 11, smin: 3.5, spread: [a0, a1], d0: 1.1, dt: .4 }));
      host.appendChild(s);
    });
  }

  // Crust on the four corners of a cover (board 1 quiet form).
  function coverCorners(el, seed) {
    const host = el.querySelector('.cv-crust'); if (!host) return;
    const w = el.offsetWidth, h = el.offsetHeight, m = Math.min(w, h);
    host.setAttribute('viewBox', `0 0 ${f(w)} ${f(h)}`);
    const R = m * 0.22, smax = m * 0.075;
    let g = glow(0, h, R * 1.6) + glow(w, 0, R * 1.2);
    g += draw(cluster({ seed, cx: m * .02, cy: h - m * .02, R, n: 16, smax, spread: [-1.7, 0.1] }));
    g += draw(cluster({ seed: seed + 9, cx: w - m * .02, cy: m * .1, R: R * .7, n: 10, smax: smax * .8, spread: [1.4, 3.3] }));
    g += draw(cluster({ seed: seed + 17, cx: w, cy: h, R: R * .45, n: 6, smax: smax * .6, spread: [2.9, 4.6] }));
    host.innerHTML = g;
  }

  // Crystals growing out of a letter (board 2): bursts from the letter edge, mostly in front.
  function letterBurst(letter, root, layer, o) {
    const b = relBox(letter, root);
    const cx = b.x + b.w * o.at[0], cy = b.y + b.h * o.at[1], H = b.h;
    let s = glow(cx, cy, H * o.R * 1.5);
    s += draw(cluster({ seed: o.seed, cx, cy, R: H * o.R, n: o.n, smax: H * o.smax, smin: H * .025, spread: o.spread, d0: o.d0 || .25, dt: .9, squash: o.squash || 1, pow: o.pow }));
    layer.insertAdjacentHTML('beforeend', s);
  }


  // Fit the wordmark to the width: desktop = rows sized to span; phone (<600) = 3 lines, one size, tracked to span.
  function fit(h1) {
    const W = h1.clientWidth, phone = W < 600;
    const all = h1.querySelectorAll('.row, .ln');
    all.forEach((u) => { u.style.removeProperty('--fit'); u.style.removeProperty('--track'); });
    const units = [...h1.querySelectorAll(phone ? '.ln' : '.row')];
    units.forEach((u) => u.style.setProperty('--fit', '100px'));
    const ws = units.map((u) => u.getBoundingClientRect().width);
    const cap = parseFloat(getComputedStyle(h1).getPropertyValue('--wm-cap')) || 999;
    if (!phone) units.forEach((u, i) => u.style.setProperty('--fit', Math.min(cap, 100 * W / ws[i]).toFixed(1) + 'px'));
    else {
      const fs = Math.min(...ws.map((w) => 100 * W / w));
      units.forEach((u, i) => { const n = u.textContent.trim().length; const tr = (W - ws[i] * fs / 100) / n; u.style.setProperty('--fit', fs.toFixed(1) + 'px'); u.style.setProperty('--track', Math.max(0, tr).toFixed(1) + 'px'); });
    }
    h1.classList.add('is-fit');
  }

  function ready(fn) {
    Promise.all(['900 100px "Cinzel Decorative"', '700 18px "Cinzel Decorative"', 'italic 20px "IM Fell English"', '20px "IM Fell English SC"', '16px "Alegreya Sans"']
      .map((q) => document.fonts.load(q).catch(() => 0))).then(() => document.fonts.ready).then(fn);
  }
  window.HSGX = { ready, fit, rng, cube, cluster, draw, glow, hits, svgEl, relBox, plateCrust, coverCorners, letterBurst, DEFS,
    mountDefs() { document.body.insertAdjacentHTML('afterbegin', DEFS); } };
})();
