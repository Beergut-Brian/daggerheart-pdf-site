// #perf: a small timing readout and one JSON line in the console (and window.__perf). Test flag only.
// Times are ms since page start. Frame stats run from the first frame to 5 s after the table is ready.
const WINDOW_MS = 5000, LONG_MS = 50, MIN_FRAMES = 12;   // software GL draws a frame in seconds: also wait for a few frames

export function createPerf(renderer) {
  const t = () => performance.now();
  const r = { marks: {}, programs: [], frames: { n: 0, longest: 0, over50: 0, worst: [] }, done: false };
  let last = 0, readyAt = 0, afterReady = 0, lastPrograms = 0, textureBytes = 0;
  const el = document.createElement('pre');
  el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;margin:0;padding:6px 8px;font:11px/1.35 monospace;color:#9f9;background:rgba(0,0,0,.7);pointer-events:none;white-space:pre';
  document.body.append(el);
  r.longTasks = { n: 0, longest: 0, total: 0 };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { r.longTasks.n++; r.longTasks.total += e.duration; r.longTasks.longest = Math.max(r.longTasks.longest, e.duration); } }).observe({ type: 'longtask', buffered: true }); } catch (e) { /* not supported */ }
  const programCount = () => (renderer.info.programs ? renderer.info.programs.length : 0);
  const show = () => {
    el.textContent = `first frame ${fmt(r.marks.firstFrame)}\nready ${fmt(r.marks.ready)}\nlongest ${r.frames.longest.toFixed(0)} ms · >50 ms ${r.frames.over50}\nprograms ${programCount()} · tex ${(textureBytes / 1048576).toFixed(1)} MB${r.done ? '\ndone' : ''}`;
  };
  const casters = (scene) => { let n = 0; scene.traverse((o) => { if (o.isLight && o.castShadow) n++; }); return n; };
  const fmt = (v) => (v == null ? '…' : v.toFixed(0) + ' ms');
  const notePrograms = (phase) => {
    const n = programCount();
    if (n !== lastPrograms) { r.programs.push({ t: Math.round(t()), phase, count: n }); lastPrograms = n; }
  };
  // bytes of every distinct texture the scene's materials hold (mip chain counted as +1/3)
  const bytes = (scene) => {
    const seen = new Set(); let total = 0;
    const add = (tx) => {
      if (!tx || !tx.isTexture || seen.has(tx.uuid)) return; seen.add(tx.uuid);
      const im = tx.image; if (!im) return;
      const w = im.width || im.videoWidth || 0, h = im.height || im.videoHeight || 0;
      total += w * h * 4 * (tx.generateMipmaps ? 4 / 3 : 1);
    };
    scene.traverse((o) => {
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) for (const k in m) if (m[k] && m[k].isTexture) add(m[k]);
    });
    add(scene.environment);
    return Math.round(total);
  };
  return {
    mark(name) { r.marks[name] = t(); notePrograms(name); show(); },
    // call once per rendered frame with the scene and whether the intro is over
    frame(now, scene, isReady) {
      notePrograms(r.marks.ready == null ? (r.marks.firstFrame == null ? 'load' : 'intro') : 'after-ready');
      if (r.marks.firstFrame == null) { r.marks.firstFrame = t(); last = now; return; }
      if (isReady && r.marks.ready == null) { r.marks.ready = t(); readyAt = now; textureBytes = bytes(scene); }
      const d = now - last; last = now;
      if (!r.done) {
        const f = r.frames; f.n++; f.longest = Math.max(f.longest, d); if (d > LONG_MS) f.over50++;
        f.worst.push(Math.round(d)); f.worst.sort((a, b) => b - a); f.worst.length = Math.min(f.worst.length, 10);
        if (readyAt) afterReady++;
        if (readyAt && now - readyAt >= WINDOW_MS && afterReady >= MIN_FRAMES) {
          r.done = true;
          const out = {
            timeToFirstFrameMs: Math.round(r.marks.firstFrame), timeToReadyMs: Math.round(r.marks.ready),
            longestFrameMs: Math.round(f.longest), framesOver50ms: f.over50, frames: f.n, worstFramesMs: f.worst,
            longTasks: { n: r.longTasks.n, longestMs: Math.round(r.longTasks.longest), totalMs: Math.round(r.longTasks.total) }, firstFrameStallMs: r.marks.frame0start != null ? Math.round(r.marks.firstFrame - r.marks.frame0start) : null, shaderPrograms: programCount(), shadowCasters: casters(scene), textureCount: renderer.info.memory.textures, programTimeline: r.programs, textureBytes, marks: Object.fromEntries(Object.entries(r.marks).map(([k, v]) => [k, Math.round(v)])),
            tier: window.__table && window.__table.tier, surfaces: document.documentElement.dataset.surfaces,
            qualityLevel: window.__table && window.__table.quality ? window.__table.quality.level : null,
          };
          window.__perf = out; console.log('[perf] ' + JSON.stringify(out));
        }
      }
      show();
    },
  };
}
