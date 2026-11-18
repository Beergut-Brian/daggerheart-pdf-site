/* Sparse ember drift up the smoke plume. One canvas over the hero; anchored to the fire in the photo
   (object-fit: cover maths), so it tracks every crop. Pauses offscreen / hidden tab. Reduced motion: one still frame. */
(function () {
  const canvas = document.querySelector('canvas[data-embers]');
  const img = document.querySelector(canvas && canvas.dataset.embers);
  if (!canvas || !img) return;
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ember = getComputedStyle(document.documentElement).getPropertyValue('--color-ember').trim() || 'orange';
  // fire and plume top as fractions of the image (landscape original vs portrait crop)
  const ANCHORS = {
    landscape: { fx: 0.505, fy: 0.585, tx: 0.53, ty: 0.16 },
    portrait: { fx: 0.505, fy: 0.585, tx: 0.56, ty: 0.16 },
  };
  let W = 0, H = 0, dpr = 1, g = null, parts = [], running = false, raf = 0, last = 0;

  function geom() {
    const host = canvas.getBoundingClientRect();
    const r = img.getBoundingClientRect();
    const nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw) return null;
    const s = Math.max(r.width / nw, r.height / nh);
    const w = nw * s, h = nh * s;
    const pos = getComputedStyle(img).objectPosition.split(' ').map(parseFloat);
    const ox = (r.width - w) * (pos[0] / 100), oy = (r.height - h) * ((pos[1] ?? 50) / 100);
    const a = nw / nh > 1 ? ANCHORS.landscape : ANCHORS.portrait;
    const x0 = r.left - host.left + ox, y0 = r.top - host.top + oy;
    return { fx: x0 + a.fx * w, fy: y0 + a.fy * h, tx: x0 + a.tx * w, ty: y0 + a.ty * h, scale: w / 1600 };
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    g = geom();
  }
  function spawn(p, fresh) {
    const k = g.scale;
    p.t = fresh ? Math.random() : 0;               // 0 at the fire, 1 at the plume top
    p.speed = (0.035 + Math.random() * 0.05);      // fraction of path per second
    p.spread = (Math.random() - 0.5) * 2;
    p.wob = Math.random() * Math.PI * 2;
    p.size = (0.6 + Math.random() * 1.3) * Math.max(0.7, k);
    p.bright = 0.5 + Math.random() * 0.5;
    return p;
  }
  function init() {
    const n = W < 700 ? 34 : 56;
    parts = Array.from({ length: n }, () => spawn({}, true));
  }
  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    if (!g) return;
    const k = g.scale;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      p.t += p.speed * dt;
      if (p.t >= 1) spawn(p, false);
      const t = p.t;
      // path: fire → plume top, fanning out as it rises, with a slow sideways wobble
      const fan = (12 + 120 * t) * k * p.spread;
      const x = g.fx + (g.tx - g.fx) * t + fan + Math.sin(p.wob + t * 7) * 8 * k * t;
      const y = g.fy + (g.ty - g.fy) * t;
      const life = Math.sin(Math.PI * Math.min(1, t * 1.05)) * p.bright;
      ctx.globalAlpha = Math.max(0, life);
      ctx.fillStyle = ember;
      ctx.shadowColor = ember; ctx.shadowBlur = 6 * p.size;
      ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    draw(dt);
    if (running) raf = requestAnimationFrame(frame);
  }
  function start() { if (running || reduce) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  function boot() {
    resize(); init();
    if (reduce) { draw(0); return; }
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }
  addEventListener('resize', () => { resize(); if (reduce) draw(0); });
  if (img.complete && img.naturalWidth) boot(); else img.addEventListener('load', boot, { once: true });
})();
