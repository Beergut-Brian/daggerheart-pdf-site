// home-d pixel-art splat hero. Source for splat.bundle.js (esbuild IIFE, so it runs over file://).
// Build: node tools/home-d-build.mjs
// Data: window.HOME_D_SCENE from scene-data.js (palette indices + depth, deflate + base64).
// Look: every cell is one hard-edged square point, drawn into a low-res buffer that the browser upscales
// nearest-neighbour, so one splat = one visible pixel-art pixel. Depth from depth.png gives real layering;
// "skirt" voxels fill depth cliffs so the orbit shows dark sides instead of cracks.
import {
  WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, Points, ShaderMaterial,
  Color, ColorManagement, Quaternion, Euler,
} from 'three';

(function () {
  const S = window.HOME_D_SCENE;
  const hero = document.querySelector('[data-splat]');
  if (!S || !hero || typeof DecompressionStream === 'undefined') return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return; // the posterised still stays
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return; // no WebGL: the still stays

  // ---- tuning ----
  const D = 1400;            // camera distance, world units (photo pixels)
  const ZS = 230;            // depth range: canopy top sits ~ZS*0.8 in front of the fire
  const YAW = 6.5, PITCH = 4.5; // max orbit, degrees
  const MOTES = 80;
  const SPLAT = 1.75;        // point size in buffer pixels at the fire's depth (1 = exact cell, >1 overlaps)

  ColorManagement.enabled = false; // palette bytes pass straight through

  const inflate = async (b64) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const out = new Blob([bin]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Uint8Array(await new Response(out).arrayBuffer());
  };

  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const mobileQ = matchMedia('(max-width: 699px)');
  const hoverQ = matchMedia('(hover: hover) and (pointer: fine)');

  Promise.all([inflate(S.idx), inflate(S.depth)]).then(([idx, dep]) => start(idx, dep)).catch(() => {});

  function start(idx, dep) {
    const canvas = document.createElement('canvas');
    canvas.className = 'hero-splat';
    canvas.setAttribute('aria-hidden', 'true');
    hero.querySelector('.hero-media').after(canvas);

    let renderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    } catch (e) { canvas.remove(); return; }
    renderer.setPixelRatio(1);
    renderer.setClearColor(new Color(cssVar('--color-bg') || '#000'), 1);

    const scene = new Scene();
    const camera = new PerspectiveCamera();
    camera.matrixAutoUpdate = true;

    const pal = S.palette;
    const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    // shade table: each palette entry -> nearest entry to 55% of it (voxel side faces)
    const shade = pal.map((c, i) => {
      if (i === 0) return 0;
      const t = c.map((v) => v * 0.55); let bj = 0, bd = Infinity;
      pal.forEach((q, j) => { const d = (q[0] - t[0]) ** 2 + (q[1] - t[1]) ** 2 + (q[2] - t[2]) ** 2; if (d < bd) { bd = d; bj = j; } });
      return bj;
    });
    const unit = S.srcW / S.w; // photo pixels per cell
    const fireDepth = S.fireDepth;

    const splatMat = new ShaderMaterial({
      uniforms: { uSize: { value: 1 }, uRef: { value: D } },
      vertexShader: `
        uniform float uSize; uniform float uRef;
        attribute vec3 color; varying vec3 vColor;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * uRef / -mv.z;
          vColor = color;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main() { gl_FragColor = vec4(vColor, 1.0); }`,
    });

    let splats = null, built = -1;
    function build(stride) {
      if (built === stride) return;
      built = stride;
      if (splats) { scene.remove(splats); splats.geometry.dispose(); }
      const W = S.w, H = S.h, cell = unit * stride;
      const zAt = (gx, gy) => {
        const z = (dep[gy * W + gx] - fireDepth) / 63 * ZS;
        return Math.round(z / cell) * cell; // voxel terraces
      };
      const pos = [], col = [];
      const push = (x0, y0, z, ci) => {
        const k = (D - z) / D; // rest-frame correction: at rest every point projects where the photo had it
        pos.push(x0 * k, y0 * k, z);
        const c = pal[ci]; col.push(c[0], c[1], c[2]);
      };
      for (let gy = 0; gy < H; gy += stride) for (let gx = 0; gx < W; gx += stride) {
        const ci = idx[gy * W + gx];
        if (ci === 0) continue; // ground colour: leave it to the clear colour
        const x0 = (gx + stride / 2) * unit - S.fire[0] * unit;
        const y0 = -((gy + stride / 2) * unit - S.fire[1] * unit);
        const z = zAt(gx, gy);
        push(x0, y0, z, ci);
        // skirt down to the lowest neighbour so tilting never opens a crack
        let lo = z;
        if (gx >= stride) lo = Math.min(lo, zAt(gx - stride, gy));
        if (gx + stride < W) lo = Math.min(lo, zAt(gx + stride, gy));
        if (gy >= stride) lo = Math.min(lo, zAt(gx, gy - stride));
        if (gy + stride < H) lo = Math.min(lo, zAt(gx, gy + stride));
        const sc = shade[ci];
        if (!sc) continue;
        for (let n = 1, zz = z - cell; zz > lo && n <= 24; n++, zz -= cell) push(x0, y0, zz, n < 3 ? ci : sc);
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
      g.setAttribute('color', new BufferAttribute(new Uint8Array(col), 3, true));
      splats = new Points(g, splatMat);
      splats.frustumCulled = false;
      scene.add(splats);
      stats.points = pos.length / 3;
    }

    // ---- embers: single bright square pixels rising from the fire toward the camera ----
    const hot = pal.slice().sort((a, b) => lum(b) - lum(a)).filter((c) => c[0] > c[2] + 60).slice(0, 4);
    const v3 = (c) => c.map((v) => v / 255);
    const seeds = new Float32Array(MOTES * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const mg = new BufferGeometry();
    mg.setAttribute('position', new BufferAttribute(new Float32Array(MOTES * 3), 3));
    mg.setAttribute('seed', new BufferAttribute(seeds, 4));
    const moteMat = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uPx: { value: 1 },
        uC0: { value: v3(hot[0] || [255, 255, 255]) }, uC1: { value: v3(hot[1] || hot[0]) },
        uC2: { value: v3(hot[2] || hot[0]) }, uC3: { value: v3(hot[3] || hot[0]) },
      },
      vertexShader: `
        uniform float uTime; uniform float uPx;
        attribute vec4 seed; varying float vT; varying float vF;
        void main() {
          float life = 6.0 + seed.x * 6.0;
          float t = fract(uTime / life + seed.y);
          vec3 p = vec3((seed.z - 0.5) * 22.0, (seed.w - 0.5) * 12.0, 4.0);
          float sway = sin(uTime * (0.6 + seed.w) + seed.x * 6.283);
          p.x += t * (20.0 + 40.0 * seed.z) + sway * 7.0 * t;
          p.y += t * (90.0 + 140.0 * seed.w);
          p.z += t * (150.0 + 140.0 * seed.x);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = floor(uPx * (seed.z > 0.95 ? 2.0 : 1.0) + 0.5);
          vT = t;
          vF = fract(sin(floor(uTime * 9.0 + seed.x * 41.0) * 12.9898 + seed.y * 78.233) * 43758.5453);
        }`,
      fragmentShader: `
        uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;
        varying float vT; varying float vF;
        void main() {
          if (vT > 0.92 || vF < 0.12 + vT * 0.25) discard; // hard flicker, burns out near the top
          vec3 c = vT < 0.15 ? uC0 : vT < 0.4 ? uC1 : vT < 0.7 ? uC2 : uC3; // stepped, no gradients
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const motes = new Points(mg, moteMat);
    motes.frustumCulled = false;
    scene.add(motes);

    // ---- framing: same placement as home-a's photo ----
    const stats = window.__homeD = { points: 0, frames: 0, dtSum: 0, drawSum: 0, buffer: '' };
    let k = 1;
    function layout() {
      const W = hero.clientWidth, H = hero.clientHeight;
      const mobile = mobileQ.matches;
      let bx, by, bw, bh, py;
      if (mobile) { bx = 0; by = 0; bw = W; bh = Math.min(0.66 * innerHeight, 600); py = 0.5; }
      else { bx = 0.1 * innerWidth; by = -0.1 * H; bw = W - bx + 0.2 * innerWidth; bh = H * 1.24; py = 0.52; }
      const s = Math.max(bw / S.srcW, bh / S.srcH);       // CSS px per photo pixel (object-fit: cover)
      const ix = bx + (bw - S.srcW * s) * 0.5, iy = by + (bh - S.srcH * s) * py;
      const fireX = ix + S.fire[0] * unit * s, fireY = iy + S.fire[1] * unit * s;
      const stride = mobile || s * unit < 2.6 ? 2 : 1;      // keep the pixel at ~3-6 CSS px
      build(stride);
      const px = s * unit * stride;                         // CSS px per splat
      const cw = Math.max(1, Math.round(W / px)), ch = Math.max(1, Math.round(H / px));
      renderer.setSize(cw, ch, false);
      const kx = cw / W, ky = ch / H;                       // buffer px per CSS px
      const fxl = fireX * kx, fyl = fireY * ky;
      const n = 20, far = 6000;
      const sx = s * kx, sy = s * ky;                       // buffer px per world unit at the fire's depth
      camera.projectionMatrix.makePerspective(-fxl / sx * n / D, (cw - fxl) / sx * n / D, fyl / sy * n / D, -(ch - fyl) / sy * n / D, n, far);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      k = s * unit * stride * kx;                           // buffer px per cell
      splatMat.uniforms.uSize.value = SPLAT * k;
      moteMat.uniforms.uPx.value = Math.max(1, k);
      stats.buffer = cw + 'x' + ch + ' @ ' + px.toFixed(2) + 'css px/splat';
    }

    // ---- camera: eased orbit toward the mouse; idle drift without hover ----
    let tx = 0, ty = 0, cx = 0, cy = 0, moved = false;
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      moved = true;
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
    const q = new Quaternion(), eul = new Euler();
    function place(t) {
      if (!moved || !hoverQ.matches) { tx = Math.sin(t * 0.00021) * 0.55; ty = Math.sin(t * 0.00016 + 1.3) * 0.45; }
      cx += (tx - cx) * 0.045; cy += (ty - cy) * 0.045;
      eul.set(-cy * PITCH * Math.PI / 180, cx * YAW * Math.PI / 180, 0, 'YXZ');
      q.setFromEuler(eul);
      camera.position.set(0, 0, D).applyQuaternion(q); // orbit around the fire
      camera.quaternion.copy(q);
    }

    const syncPerf = location.hash === '#perf', px1 = new Uint8Array(4);
    let raf = 0, last = 0, visible = true, t0 = performance.now();
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (last) { stats.frames++; stats.dtSum += now - last; }
      last = now;
      const a = performance.now();
      place(now);
      moteMat.uniforms.uTime.value = (now - t0) / 1000;
      renderer.render(scene, camera);
      if (syncPerf) renderer.getContext().readPixels(0, 0, 1, 1, 0x1908, 0x1401, px1); // #perf: wait for the GPU so drawSum is real
      stats.drawSum += performance.now() - a;
      if (!canvas.dataset.ready) canvas.dataset.ready = '1';
    }
    const run = () => { if (!raf && visible && !document.hidden && !reduce.matches) { last = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? run() : stop(); }).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : run()));
    reduce.addEventListener('change', () => { if (reduce.matches) { stop(); canvas.remove(); } });
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });
    layout();
    run();
  }
})();
