// Boot, camera, pointer, the opening sequence and the final image pass.
import * as THREE from '../vendor/three.bundle.js';
import { BOOKS, hrefFor, HOME_HREF, ON_SITE, pickTier } from './config.js';
import { Surfaces, defineSurfaces, loadCoverImages } from './surfaces.js';
import { buildWorld } from './world.js';

const { UnrealBloomPass, FullScreenQuad } = THREE;
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const hashFlag = (re) => re.exec(location.hash);
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- page furniture that works without WebGL

const home = $('#home');
home.href = HOME_HREF;
if (!ON_SITE) { home.target = '_blank'; home.rel = 'noopener'; }
for (const b of BOOKS) {
  const a = document.createElement('a'); a.className = 'card'; a.href = hrefFor(b);
  if (!ON_SITE) { a.target = '_blank'; a.rel = 'noopener'; }
  a.innerHTML = '<strong></strong><span></span>';
  a.firstChild.textContent = b.title; a.lastChild.textContent = b.sub + ' · ' + b.meta;
  $('#plain-list').append(a);
}
function fail(err) { console.error('[table]', err); document.body.classList.add('no-gl'); }

boot().catch(fail);

async function boot() {
  const canvas = $('#gl');
  const tier = pickTier(), lite = tier === 'lite';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  // words need their typefaces before they are painted
  const fonts = ['900 60px Cinzel', '700 40px Cinzel', '500 20px "Space Grotesk"', '700 15px "Space Grotesk"', '700 40px Caveat', '600 30px Caveat'];
  await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f).catch(() => 0))), new Promise((r) => setTimeout(r, 3000))]);
  const images = await loadCoverImages(BOOKS);

  const surfaces = new Surfaces(renderer);
  defineSurfaces(surfaces, BOOKS, images);
  const mode = await surfaces.ready();
  $('#mode').textContent = mode === 'html' ? 'Live HTML in canvas' : '';
  if (matchMedia('(pointer: coarse)').matches) $('#hint').innerHTML = '<b>Tap a book</b> to open it · drag to look around';

  // an upright phone gets a tighter arrangement, so both books fit across the screen
  const tall = innerWidth / innerHeight < 0.8;
  const defs = BOOKS.map((b) => (tall && b.placeTall ? { ...b, place: b.placeTall } : b));
  const world = buildWorld({ renderer, surfaces, tier, books: defs, tall });
  const { scene, books } = world;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 90);

  // ---------------------------------------------------------------- final image: bloom, depth of field, grade
  const gl = renderer.getContext();
  const canFloat = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
  const usePost = canFloat && !hashFlag(/[#&]post=off/);
  const useDof = usePost && !lite && !hashFlag(/[#&]dof=off/);
  let rtScene, rtFlat, bloom, copyQuad, finalQuad;
  const size = new THREE.Vector2();
  if (usePost) {
    const opts = { type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    rtScene = new THREE.WebGLRenderTarget(4, 4, { ...opts, samples: lite ? 0 : 4, depthTexture: new THREE.DepthTexture(4, 4) });
    rtFlat = new THREE.WebGLRenderTarget(4, 4, { ...opts, depthBuffer: false });
    bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.34, 0.6, 1.15);
    copyQuad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null } }, depthTest: false, depthWrite: false, toneMapped: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D tColor; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tColor, vUv); }',
    }));
    finalQuad = new FullScreenQuad(new THREE.ShaderMaterial({
      defines: useDof ? { USE_DOF: 1 } : {},
      uniforms: {
        tColor: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uNear: { value: camera.near }, uFar: { value: camera.far },
        uFocus: { value: 15 }, uAperture: { value: 17 }, uMaxBlur: { value: 10 }, uTime: { value: 0 }, uFade: { value: 0 }, uFlash: { value: 0 },
      },
      depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: /* glsl */`
        #include <packing>
        uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 uRes;
        uniform float uNear, uFar, uFocus, uAperture, uMaxBlur, uTime, uFade, uFlash;
        varying vec2 vUv;
        float viewDist(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar); }
        float coc(float z) { return clamp(abs(1.0 / uFocus - 1.0 / z) * uAperture, 0.0, 1.0) * uMaxBlur; }
        void main() {
          vec3 col = texture2D(tColor, vUv).rgb;
          #ifdef USE_DOF
            float cz = viewDist(vUv), cs = coc(cz), tot = 1.0, radius = 0.9;
            vec2 px = 1.0 / uRes;
            for (float ang = 0.0; radius < uMaxBlur; ang += 2.39996323) {
              vec2 tc = vUv + vec2(cos(ang), sin(ang)) * px * radius;
              vec3 sc = texture2D(tColor, tc).rgb;
              float sz = viewDist(tc), ss = coc(sz);
              if (sz > cz) ss = clamp(ss, 0.0, cs * 2.0);
              float m = smoothstep(radius - 0.5, radius + 0.5, ss);
              col += mix(col / tot, sc, m); tot += 1.0;
              radius += 0.9 / radius;
            }
            col /= tot;
          #endif
          vec2 q = (vUv - 0.5) * vec2(1.0, 0.92);
          col *= mix(0.32, 1.0, smoothstep(0.82, 0.3, length(q)));
          col *= uFade;
          col = mix(col, vec3(2.2, 1.75, 1.1), uFlash);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          float n = fract(sin(dot(gl_FragCoord.xy + mod(uTime, 10.0) * 61.0, vec2(12.9898, 78.233))) * 43758.5453);
          gl_FragColor.rgb += (n - 0.5) * 0.02;
        }`,
    }));
  }

  // ---------------------------------------------------------------- camera rig
  const rig = {
    home: { target: new THREE.Vector3(0.05, 0.35, 0.75), az: 0, el: 0.7, dist: 16 },
    cur: { target: new THREE.Vector3(), az: 0, el: 0.9, dist: 22 },
    user: { az: 0, el: 0, zoom: 1 },
    mouse: { x: 0, y: 0 },
    openDist: 8,
    off: new THREE.Vector3(),
  };

  // steps down by itself on machines that cannot hold the frame rate
  const quality = { level: 0, acc: 0, n: 0 };
  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    const cap = quality.level > 0 ? 1 : lite ? 1.5 : (w * h > 2.6e6 ? 1.25 : 1.75);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    renderer.setSize(w, h, false);
    renderer.getDrawingBufferSize(size);
    const aspect = w / h;
    camera.aspect = aspect;
    camera.fov = lerp(46, 30, clamp((aspect - 0.7) / 0.8, 0, 1));
    camera.updateProjectionMatrix();
    const th = Math.tan((camera.fov * Math.PI) / 360);
    const needW = tall ? 5.9 : lerp(9.4, 14.4, clamp((aspect - 0.6) / 0.75, 0, 1));
    rig.home.dist = Math.max(needW / 2 / (th * aspect), 4.45 / th);
    rig.home.el = tall ? 0.98 : lerp(0.92, 0.7, clamp((aspect - 0.6) / 0.75, 0, 1));
    rig.home.target.z = tall ? 0.1 : lerp(1.5, 0.75, clamp((aspect - 0.6) / 0.75, 0, 1));
    rig.openDist = Math.max(5.7 / 2 / (th * aspect), 3.9 / 2 / th) * 1.04;
    if (usePost) {
      rtScene.setSize(size.x, size.y); rtFlat.setSize(size.x, size.y);
      bloom.setSize(Math.round(size.x / 2), Math.round(size.y / 2));
      finalQuad.material.uniforms.uRes.value.copy(size);
      finalQuad.material.uniforms.uMaxBlur.value = quality.level > 2 ? 0 : 10.5 * (size.y / 900);
    }
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  // ---------------------------------------------------------------- state
  const state = { hot: null, hotBy: null, open: null, t0: 0, phase: 'table', closeFrom: 0 };
  const plate = $('#plate'), enter = $('#enter');
  const coverEl = (id) => surfaces.get('cover-' + id).el;
  const bookById = (id) => books.find((b) => b.id === id);

  function setHot(id, by) {
    if (state.phase !== 'table') id = null;
    if (state.hot === id) return;
    if (state.hot) { coverEl(state.hot).classList.remove('is-hot'); surfaces.setLive('cover-' + state.hot, false); surfaces.touch('cover-' + state.hot); }
    state.hot = id; state.hotBy = by;
    canvas.classList.toggle('is-hot', !!id);
    if (id) {
      const b = bookById(id).def;
      coverEl(id).classList.add('is-hot'); surfaces.setLive('cover-' + id, true);
      plate.querySelector('h2').textContent = b.title; plate.querySelector('.sub').textContent = b.sub; plate.querySelector('.meta').textContent = b.meta;
    }
    plate.classList.toggle('on', !!id);
  }

  function openBook(id) {
    if (state.phase !== 'table') return;
    const book = bookById(id);
    setHot(null);
    state.open = book; state.phase = 'opening'; state.t0 = performance.now();
    document.body.classList.add('is-open', 'has-touched');
    surfaces.get('right-' + id).el.classList.add('is-open');
    surfaces.setLive('right-' + id, true);
    if (calm) { book.open = 1; state.t0 -= 5000; }
  }

  function arrive() {
    const book = state.open;
    state.phase = 'open';
    setTimeout(() => surfaces.setLive('right-' + book.id, false), 2600);
    if (ON_SITE) {
      // same as today: straight into the reader
      state.phase = 'leaving'; state.t0 = performance.now();
      document.body.classList.add('is-leaving');
      setTimeout(() => location.assign(book.def.path), calm ? 0 : 520);
      return;
    }
    const a = enter.querySelector('a');
    a.href = hrefFor(book.def); a.querySelector('span').textContent = book.def.openLabel || 'Open ' + book.def.name;
    enter.classList.add('on');
    a.focus({ preventScroll: true });
  }

  function closeBook() {
    if (state.phase !== 'open') return;
    state.phase = 'closing'; state.t0 = performance.now(); state.closeFrom = state.open.open;
    enter.classList.remove('on'); canvas.classList.remove('is-hot');
  }

  function resetTable() {
    for (const b of books) { b.open = 0; surfaces.get('right-' + b.id).el.classList.remove('is-open'); surfaces.touch('right-' + b.id); }
    state.open = null; state.phase = 'table';
    document.body.classList.remove('is-open', 'is-leaving');
    enter.classList.remove('on');
    if (finalQuad) finalQuad.material.uniforms.uFlash.value = 0;
  }
  enter.querySelector('button').addEventListener('click', closeBook);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBook(); });
  addEventListener('pageshow', (e) => { if (e.persisted) resetTable(); });

  // keyboard and assistive tech reach the books through the real links in the canvas
  for (const b of books) {
    const el = coverEl(b.id);
    el.addEventListener('focus', () => setHot(b.id, 'key'));
    el.addEventListener('blur', () => { if (state.hotBy === 'key') setHot(null); });
    el.addEventListener('click', (e) => { e.preventDefault(); openBook(b.id); });
  }

  // ---------------------------------------------------------------- pointer
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hits = books.map((b) => b.hit);
  function pick(ev, list = hits) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(list, false)[0];
    return h ? h.object.userData.book : null;
  }
  const onOpenBook = (ev) => state.phase === 'open' && !!pick(ev, [state.open.hitOpen]);
  const pointers = new Map();
  let drag = null, pinch = 0;
  canvas.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
    if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, id: e.pointerId };
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); if (drag) drag.moved = true; }
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    rig.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; rig.mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && state.phase === 'table') {
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) rig.user.zoom = clamp(rig.user.zoom * (pinch / d), 0.5, 1.2);
      pinch = d; return;
    }
    if (drag && drag.id === e.pointerId) {
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) { drag.moved = true; canvas.classList.add('is-drag'); document.body.classList.add('has-touched'); setHot(null); }
      if (drag.moved && state.phase === 'table') {
        rig.user.az = clamp(rig.user.az - (e.clientX - drag.x) * 0.0042, -0.85, 0.85);
        rig.user.el = clamp(rig.user.el + (e.clientY - drag.y) * 0.003, -0.42, 0.42);
      }
      drag.x = e.clientX; drag.y = e.clientY;
    } else if (e.pointerType === 'mouse' && state.phase === 'table') {
      setHot(pick(e), 'mouse');
    } else if (e.pointerType === 'mouse' && state.phase === 'open') {
      canvas.classList.toggle('is-hot', onOpenBook(e));
    }
  });
  const release = (e) => {
    pointers.delete(e.pointerId); if (pointers.size < 2) pinch = 0;
    if (drag && drag.id === e.pointerId) {
      const wasClick = !drag.moved; drag = null; canvas.classList.remove('is-drag');
      if (wasClick && e.type === 'pointerup' && state.phase === 'table') { const id = pick(e); if (id) openBook(id); }
      // with a book open: the pages are the way in, anywhere else puts it back down
      else if (wasClick && e.type === 'pointerup' && state.phase === 'open') { if (onOpenBook(e)) enter.querySelector('a').click(); else closeBook(); }
    }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && state.hotBy === 'mouse') setHot(null); });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (state.phase === 'table') rig.user.zoom = clamp(rig.user.zoom * Math.exp(e.deltaY * 0.0011), 0.5, 1.2);
  }, { passive: false });

  // ---------------------------------------------------------------- frame
  const instant = !!hashFlag(/[#&]shot/) || calm;
  const goal = { target: new THREE.Vector3(), az: 0, el: 0, dist: 0 };
  const v = new THREE.Vector3(), clock = { last: performance.now(), t: 0 };
  const viewM = new THREE.Matrix4(), pixM = new THREE.Matrix4(), mvp = new THREE.Matrix4();
  let started = 0, firstFrame = true;
  const OPEN_MS = 2500, CLOSE_MS = 1500;
  const fp = hashFlag(/[#&]p=([\d.]+)/), fixedP = fp ? +fp[1] : null;   // freeze the opening at a point, for screenshots

  function frame(now) {
    const raw = (now - clock.last) / 1000;
    const dt = Math.min(0.05, raw); clock.last = now; clock.t += dt;
    if (!instant && !firstFrame && raw < 0.25 && clock.t > 4.5) {
      quality.acc += raw; quality.n++;
      if (quality.n >= 80) {
        if (quality.acc / quality.n > 0.0235 && quality.level < 3) {
          quality.level++;
          if (quality.level === 2) { world.candleShadows = false; world.candles.forEach((c) => { c.light.castShadow = false; }); }
          resize();
        }
        quality.acc = 0; quality.n = 0;
      }
    }
    const time = clock.t;
    if (!started) started = now;
    const since = (now - started) / 1000;
    world.intro = instant ? 1 : clamp(since / 3.4, 0, 1);

    // book timelines
    if (state.phase === 'opening') {
      const p = fixedP != null ? fixedP : clamp((now - state.t0) / OPEN_MS, 0, 1);
      state.open.open = p;
      if (p >= 1) arrive();
    } else if (state.phase === 'closing') {
      const p = clamp((now - state.t0) / CLOSE_MS, 0, 1);
      state.open.open = state.closeFrom * (1 - p);
      if (p >= 1) resetTable();
    }
    let moving = state.phase !== 'table';
    for (const b of books) { const to = state.hot === b.id ? 1 : 0; if (Math.abs(to - b.hover) > 0.002 || b.hover > 0.5) moving = true; b.hover += (to - b.hover) * (1 - Math.exp(-dt * 9)); }
    world.moving = moving;

    // camera
    const H = rig.home, U = rig.user;
    const opening = state.open ? ease(clamp(state.open.open / 0.42, 0, 1)) : 0;
    const intro = instant ? 1 : easeOut(since / 3.8);
    const par = state.phase === 'table' && !drag ? 1 : 0;
    goal.target.copy(H.target).add(rig.off); goal.az = H.az + U.az + rig.mouse.x * 0.045 * par + Math.sin(time * 0.13) * 0.03;
    goal.el = H.el + U.el - rig.mouse.y * 0.025 * par; goal.dist = H.dist * U.zoom * lerp(1.22, 1, intro);
    goal.el += (1 - intro) * 0.16;
    if (state.open) {
      const b = state.open;
      goal.target.lerp(b.openCenter, opening);
      goal.az = lerp(goal.az, b.def.place.rot, opening); goal.el = lerp(goal.el, 1.02, opening); goal.dist = lerp(goal.dist, rig.openDist, opening);
    }
    const C = rig.cur, k = firstFrame ? 1 : 1 - Math.exp(-dt * (state.open ? 5.5 : 7));
    C.target.lerp(goal.target, k); C.az += (goal.az - C.az) * k; C.el += (goal.el - C.el) * k; C.dist += (goal.dist - C.dist) * k;
    camera.position.set(C.target.x + Math.sin(C.az) * Math.cos(C.el) * C.dist, C.target.y + Math.sin(C.el) * C.dist, C.target.z + Math.cos(C.az) * Math.cos(C.el) * C.dist);
    camera.lookAt(C.target);
    camera.updateMatrixWorld();

    const pxScale = size.y / (2 * Math.tan((camera.fov * Math.PI) / 360));
    world.update(time, dt, camera, pxScale);
    surfaces.tick();

    // name plate follows the book
    if (state.hot) {
      const b = bookById(state.hot);
      // beside the book, on its outer edge, so it never covers the map
      const side = b.def.place.x < 0 ? -1 : 1, cw = canvas.clientWidth, chh = canvas.clientHeight;
      v.set(side * (b.W / 2 + 0.3), b.T + 0.2, -b.D * 0.1).applyMatrix4(b.root.matrixWorld).project(camera);
      let x = (v.x * 0.5 + 0.5) * cw; const y = (-v.y * 0.5 + 0.5) * chh, pw = plate.offsetWidth;
      if (side < 0 ? x - pw < 12 : x + pw > cw - 12) {
        // no room at the side (narrow window): sit above the book instead
        v.set(0, b.T + 0.5, -b.D * 0.5).applyMatrix4(b.root.matrixWorld).project(camera);
        x = clamp((v.x * 0.5 + 0.5) * cw, pw / 2 + 12, cw - pw / 2 - 12);
        plate.style.transform = `translate(${x.toFixed(1)}px, ${Math.max(plate.offsetHeight + 12, (-v.y * 0.5 + 0.5) * chh).toFixed(1)}px) translate(-50%, -100%)`;
      } else {
        plate.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${side < 0 ? '-100%' : '0'}, -50%)`;
      }
    }

    // keep the real links in the canvas lined up with their covers
    if (mode === 'html' && state.phase === 'table') {
      const cw = canvas.clientWidth, chh = canvas.clientHeight;
      viewM.set(cw / 2, 0, 0, cw / 2, 0, -chh / 2, 0, chh / 2, 0, 0, 1, 0, 0, 0, 0, 1);
      for (const b of books) {
        const s = surfaces.get('cover-' + b.id), ew = s.size[0], eh = s.size[1];
        // element pixels -> the cover's top face (x right, z toward the reader)
        pixM.set(b.W / ew, 0, 0, -b.W / 2, 0, 0, 1, b.T, 0, b.D / eh, 0, -b.D / 2, 0, 0, 0, 1);
        mvp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(b.lift.matrixWorld).multiply(pixM).premultiply(viewM);
        surfaces.place('cover-' + b.id, mvp);
      }
    }

    // focus: on the books, or on whichever one has your attention
    const focusOn = state.open ? state.open.openCenter : state.hot ? bookById(state.hot).center : world.focus;
    const fd = camera.position.distanceTo(focusOn);

    if (usePost) {
      const u = finalQuad.material.uniforms;
      u.uFocus.value += (fd - u.uFocus.value) * (firstFrame ? 1 : 1 - Math.exp(-dt * 5));
      u.uAperture.value = lerp(17, 13, opening);
      u.uTime.value = time;
      u.uFade.value = instant ? 1 : ease(since / 1.6);
      u.uFlash.value = state.phase === 'leaving' ? ease((now - state.t0) / 480) : 0;
      renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
      copyQuad.material.uniforms.tColor.value = rtScene.texture;
      renderer.setRenderTarget(rtFlat); copyQuad.render(renderer);
      bloom.render(renderer, null, rtFlat, dt, false);
      u.tColor.value = rtFlat.texture; u.tDepth.value = rtScene.depthTexture;
      renderer.setRenderTarget(null); finalQuad.render(renderer);
    } else {
      renderer.setRenderTarget(null); renderer.render(scene, camera);
    }
    if (firstFrame) { firstFrame = false; document.body.classList.add('is-ready'); }
  }
  renderer.setAnimationLoop(frame);

  // handles for testing from the console:  __table.open('core')
  window.__table = { world, rig, state, surfaces, renderer, camera, open: openBook, close: closeBook, hot: setHot, mode, tier };
  const auto = hashFlag(/[#&]open=(\w+)/);
  if (auto) setTimeout(() => openBook(auto[1]), instant ? 300 : 3600);
  const cam = hashFlag(/[#&]cam=([-\d.,]+)/);
  if (cam) { const c = cam[1].split(',').map(Number); rig.user.az = c[0] || 0; rig.user.el = c[1] || 0; rig.user.zoom = c[2] || 1; rig.off.set(c[3] || 0, 0, c[4] || 0); }
  const hov = hashFlag(/[#&]hot=(\w+)/);
  if (hov) setTimeout(() => setHot(hov[1], 'key'), 200);
}
