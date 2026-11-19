// Boot, camera, pointer, the opening sequence and the final image pass.
import * as THREE from '../vendor/three.bundle.js';
import { BOOKS, CHARACTERS, ROLL_AREA, hrefFor, HOME_HREF, ON_SITE, SITE, pickTier } from './config.js';
import { createCard } from './card.js';
import { Surfaces, defineSurfaces, defineLogSurface, loadCoverImages, loadScreenArt, NOTE, cardRows, cardIcon } from './surfaces.js';
import { buildWorld } from './world.js';
import { createCommandBar } from './command.js';
import { createPlay } from './play.js';
import { createDice, TALL_ASPECT, TALL_SCALE } from './dice3d.js';
import { areaBounds } from './dice-table.js';
import { createAttack } from './attack.js';
import { loadBaked, upgradeBaked, BAKED, BAKED_SMALL, BAKED_FULL } from './textures.js';
import { createPerf } from './perf.js';
import { startRatio, decide, createRamp } from './quality.js';

const { UnrealBloomPass, FullScreenQuad } = THREE;
const FOCUS_EASE = 6;      // how fast the depth-of-field focus follows (per second)
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
// "Click here for resources" on the loading screen and the plain page: same tab, the site's /resources
for (const a of document.querySelectorAll('.skip a')) a.href = ON_SITE ? '/resources' : SITE + '/resources';
for (const b of BOOKS) {
  const a = document.createElement('a'); a.className = 'card'; a.href = hrefFor(b);
  if (!ON_SITE) { a.target = '_blank'; a.rel = 'noopener'; }
  a.innerHTML = '<strong></strong><span></span>';
  a.firstChild.textContent = b.title; a.lastChild.textContent = b.sub + ' · ' + b.meta;
  $('#plain-list').append(a);
}
function fail(err) { console.error('[table]', err); document.body.classList.add('no-gl'); }

// the two cover images are the first thing the table needs from the network: ask for them at high priority before anything else is set up
if (ON_SITE) for (const b of BOOKS) if (b.cover) { const l = document.createElement('link'); l.rel = 'preload'; l.as = 'image'; l.href = b.cover; l.fetchPriority = 'high'; document.head.append(l); }

boot().catch(fail);

async function boot() {
  const canvas = $('#gl');
  const tier = pickTier(), lite = tier === 'lite';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' });
  const perf = hashFlag(/[#&]perf\b/) ? createPerf(renderer) : null;   // test flag: timing readout and a JSON summary
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.transmissionResolutionScale = 0.5;   // the resin dice refract a blurred copy of the table: a half-size copy does it for a quarter of the pixels
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // the canvas gets its real size before the HTML surfaces take their first snapshots (they are drawn at its pixel ratio)
  const ratioCap = (w, h) => (lite ? 1.5 : w * h > 2.6e6 ? 1.25 : 1.75);
  const pixelK = () => canvas.width / Math.max(1, canvas.clientWidth);
  // The render starts at the pixel ratio a big canvas can hold (about 3.8 M pixels: a 2560x1440 window starts
  // at 1.0, not the 1.25 cap, which took ~65 ms a frame on a 5K iMac) and the frame-rate guard moves it from there
  // (down at once if frames are slow, up one small step when the GPU timer shows room). The ceiling is the tier's cap.
  const fitRatio = (w, h) => startRatio(w, h, ratioCap(w, h));
  const quality = { level: 0, ratio: fitRatio(canvas.clientWidth, canvas.clientHeight), ceiling: Infinity, acc: 0, n: 0, skip: 3, lastChange: 0, snapRatio: 0, gpuMs: 0, start: 0, timer: false };
  quality.start = quality.ratio;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.ratio));
  renderer.setSize(Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight), false);

  // Load order: the focus assets first (the two cover images at high priority, the typefaces the covers and the card use),
  // then the GM-screen art and the small baked wood and mat; the full-size wood and mat come once the table is idle (see `settled` below).
  const bakeOn = !hashFlag(/[#&]bake=off/);
  const coversP = loadCoverImages(BOOKS);
  // words need their typefaces before they are painted
  const fonts = ['900 60px Cinzel', '700 40px Cinzel', '500 20px "Space Grotesk"', '700 15px "Space Grotesk"', '700 40px Caveat', '600 30px Caveat', '400 80px "HSG Title"'];
  await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f).catch(() => 0))), new Promise((r) => setTimeout(r, 3000))]);
  const images = await coversP;
  const bakedP = bakeOn ? loadBaked(BAKED_SMALL) : Promise.resolve();   // starts now, is awaited only when the world is built
  await loadScreenArt();

  if (perf) perf.mark('assets');
  const surfaces = new Surfaces(renderer);
  const character = CHARACTERS[0] || null, cardState = { hot: -1 };
  defineSurfaces(surfaces, BOOKS, images, { character, cardState });
  const log = { rows: [] };
  defineLogSurface(surfaces, log);
  const mode = await surfaces.ready();
  // which path draws the surfaces: no visible label, a data attribute and one console line for testing
  document.documentElement.dataset.surfaces = mode === 'html' ? 'html' : 'painted';
  console.info('[table] surfaces: ' + (mode === 'html' ? 'live HTML in canvas' : 'painted 2D canvas'));
  // #debug=surfaces: every surface's texture against its element's box (js/debug-surfaces.js)
  if (hashFlag(/[#&]debug=surfaces/)) import('./debug-surfaces.js').then((m) => m.startSurfaceDebug(surfaces));
  if (matchMedia('(pointer: coarse)').matches) $('#hint').innerHTML = '<b>Tap a book</b> to open it · drag to look around';

  // an upright phone gets a tighter arrangement, so both books fit across the screen
  const tall = innerWidth / innerHeight < 0.8;
  const defs = BOOKS.map((b) => (tall && b.placeTall ? { ...b, place: b.placeTall } : b));
  await bakedP;
  const progressive = bakeOn && !lite && BAKED_SMALL.every((n) => BAKED[n]);   // the table starts on the small bakes and swaps to full ones when idle
  const world = buildWorld({ renderer, surfaces, tier, books: defs, tall, progressive });
  const { scene, books } = world;
  if (perf) perf.mark('world');
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
  // the default view is a little wider and further toward the viewer than the table alone needs, so the
  // rolling area (config.js ROLL_AREA) is on screen above the command bar: zoom out by `zoom`, aim `dz` further front
  const FRAME = { wide: { zoom: 1.12, dz: 0.9 }, tall: { zoom: 1.1, dz: 1.5 } };
  const rig = {
    home: { target: new THREE.Vector3(0.05, 0.35, 0.75), az: 0, el: 0.7, dist: 16 },
    cur: { target: new THREE.Vector3(), az: 0, el: 0.9, dist: 22 },
    user: { az: 0, el: 0, zoom: 1 },
    mouse: { x: 0, y: 0 },
    openDist: 8,
    off: new THREE.Vector3(),
  };

  // steps down by itself on machines that cannot hold the frame rate
  function resize(fromGuard = false) {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    if (!fromGuard) quality.ratio = Math.min(quality.ratio, fitRatio(w, h));   // a bigger window may need a lower ratio
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.ratio));
    renderer.setSize(w, h, false);
    // the HTML surfaces' snapshots follow the canvas's pixel ratio. Retaking them is a stall, so guard steps
    // leave them be and one retake follows once the ratio has settled (frame loop); a window resize retakes at once.
    if (!fromGuard && Math.abs(pixelK() - quality.snapRatio) > 0.01) { surfaces.refresh(); quality.snapRatio = pixelK(); }   // a window resize retakes every surface, focus ones included (their zoom is re-fitted)
    renderer.getDrawingBufferSize(size);
    const aspect = w / h;
    camera.aspect = aspect;
    camera.fov = lerp(46, 30, clamp((aspect - 0.7) / 0.8, 0, 1));
    camera.updateProjectionMatrix();
    const th = Math.tan((camera.fov * Math.PI) / 360);
    const needW = tall ? 5.9 : lerp(9.4, 14.4, clamp((aspect - 0.6) / 0.75, 0, 1));
    const fr = FRAME[tall ? 'tall' : 'wide'];
    rig.home.dist = Math.max(needW / 2 / (th * aspect), 4.45 / th) * fr.zoom;
    rig.home.el = tall ? 0.98 : lerp(0.92, 0.7, clamp((aspect - 0.6) / 0.75, 0, 1));
    rig.home.target.z = (tall ? 0.1 : lerp(1.5, 0.75, clamp((aspect - 0.6) / 0.75, 0, 1))) + fr.dz;
    rig.openDist = Math.max(5.7 / 2 / (th * aspect), 3.9 / 2 / th) * 1.04;
    if (usePost) {
      rtScene.setSize(size.x, size.y); rtFlat.setSize(size.x, size.y);
      bloom.setSize(Math.round(size.x / 2), Math.round(size.y / 2));
      finalQuad.material.uniforms.uRes.value.copy(size);
      finalQuad.material.uniforms.uMaxBlur.value = (quality.level > 1 ? 0 : quality.level ? 5.25 : 10.5) * (size.y / 900);
    }
  }
  resize();
  quality.snapRatio = pixelK();
  new ResizeObserver(() => resize()).observe(canvas);

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
    if (card) { card.leave(); card.closeSheet(false); canvas.classList.remove('is-card'); }
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

  let card = null;     // the attack card (set up with the dice, below)

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
  // the attack card: where on the note the pointer is (uv), or null
  function noteUv(ev) {
    if (!card || !world.note) return null;
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObject(world.note, false)[0];
    return h ? h.uv : null;
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
      const id = pick(e);
      setHot(id, 'mouse');
      if (card) canvas.classList.toggle('is-card', card.hover(id ? null : noteUv(e)));
    } else if (e.pointerType === 'mouse' && state.phase === 'open') {
      canvas.classList.toggle('is-hot', onOpenBook(e));
    }
  });
  const release = (e) => {
    pointers.delete(e.pointerId); if (pointers.size < 2) pinch = 0;
    if (drag && drag.id === e.pointerId) {
      const wasClick = !drag.moved; drag = null; canvas.classList.remove('is-drag');
      if (wasClick && e.type === 'pointerup' && state.phase === 'table') { const id = pick(e); if (id) openBook(id); else if (card) card.click(noteUv(e), e.pointerType); }
      // with a book open: the pages are the way in, anywhere else puts it back down
      else if (wasClick && e.type === 'pointerup' && state.phase === 'open') { if (onOpenBook(e)) enter.querySelector('a').click(); else closeBook(); }
    }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && state.hotBy === 'mouse') setHot(null); if (card) { card.leave(); canvas.classList.remove('is-card'); } });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (state.phase === 'table') rig.user.zoom = clamp(rig.user.zoom * Math.exp(e.deltaY * 0.0011), 0.5, 1.2);
  }, { passive: false });

  // ---------------------------------------------------------------- dice commands
  let play = null;
  // dice and attacks run on their own clock, so proofs can slow or freeze them: __table.timeScale(0)
  const game = { t: performance.now(), prev: performance.now(), scale: 1 };
  const gameClock = () => game.t;
  const bar = createCommandBar({ surfaces, log, canvas, renderer, clock: gameClock, onCommand: (text) => play.run(text) });
  // tall phones get bigger dice and a wider throw
  const dice = createDice({ scene, atlas: world.atlas, table: world.tableDice, area: areaBounds(ROLL_AREA[tall ? 'tall' : 'wide']), calm, lite, clock: gameClock, view: () => camera.position,
    scale: () => (canvas.clientHeight / Math.max(1, canvas.clientWidth) > TALL_ASPECT ? TALL_SCALE : 1) });
  const attack = createAttack({ scene, minis: world.minis, calm, lite, clock: gameClock });
  play = createPlay({ bar, dice, attack, character, canAct: () => state.phase === 'table' });
  const touchy = lite || matchMedia('(pointer: coarse)').matches;
  card = character ? createCard({ surfaces, character, state: cardState, touchy, onRoll: (id) => play.rollById(id) }) : null;

  // ---------------------------------------------------------------- frame
  const instant = !!hashFlag(/[#&]shot/) || calm;
  const holdLoad = !!hashFlag(/[#&]hold-load/);   // keep the loading screen up, for screenshots
  const goal = { target: new THREE.Vector3(), az: 0, el: 0, dist: 0 };
  const v = new THREE.Vector3(), clock = { last: performance.now(), t: 0 };
  const viewM = new THREE.Matrix4(), pixM = new THREE.Matrix4(), mvp = new THREE.Matrix4();
  let started = 0, firstFrame = true, settled = false, swapFull = false;
  const idleThen = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500));
  const OPEN_MS = 2500, CLOSE_MS = 1500;
  const fp = hashFlag(/[#&]p=([\d.]+)/), fixedP = fp ? +fp[1] : null;   // freeze the opening at a point, for screenshots

  // Frame-rate guard: during the opening it looks at ten frames (about a second when they are slow) and lowers the
  // pixel ratio at once; afterwards at 45. Slow means over 24 ms between frames, or over 13 ms of GPU time.
  // Up, one 15% step, only when the GPU timer is there and says the next step would cost under 10 ms.
  const tq = gl.getExtension('EXT_disjoint_timer_query_webgl2'), qs = [];
  quality.timer = !!tq;
  const gpuTime = {
    begin() { if (!tq) return; const q = gl.createQuery(); gl.beginQuery(tq.TIME_ELAPSED_EXT, q); qs.push(q); },
    end() { if (tq) gl.endQuery(tq.TIME_ELAPSED_EXT); },
    poll() {
      while (tq && qs.length > 1 && gl.getQueryParameter(qs[0], gl.QUERY_RESULT_AVAILABLE)) {
        const q = qs.shift();
        if (!gl.getParameter(tq.GPU_DISJOINT_EXT)) { const ms = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6; quality.gpuMs = quality.gpuMs ? quality.gpuMs * 0.85 + ms * 0.15 : ms; }
        gl.deleteQuery(q);
      }
    },
  };
  // The step-up ramp (quality.js): after the opening, frame times from requestAnimationFrame alone lift the ratio toward the
  // tier's cap, about one 15% step a second; a step that pushes the median over ~18 ms is undone and becomes the ceiling.
  // The GPU timer, where there is one, can still veto a step. #ramp=off turns it off; window.__frameMs (a test hook) replaces the measured interval.
  const ramp = createRamp({
    cap: () => ratioCap(canvas.clientWidth, canvas.clientHeight), getRatio: () => quality.ratio, getCeiling: () => quality.ceiling, setCeiling: (c) => { quality.ceiling = c; },
    apply: (r) => setRatio(r, performance.now()), gpu: () => (tq && quality.gpuMs ? quality.gpuMs : 0),
    log: (t, r, why) => console.info(`[table] ratio ${r.toFixed(3)} (${why})`),
  });
  const rampOn = !hashFlag(/[#&]ramp=off/);
  function setRatio(r, now) {
    (quality.history ||= []).push([Math.round(performance.now()), +r.toFixed(3), quality.gpuMs ? +quality.gpuMs.toFixed(1) : null]);
    quality.ratio = r; quality.lastChange = now; quality.acc = 0; quality.n = 0; quality.skip = 3; quality.gpuMs = 0;
    ramp.reset();
    resize(true);
  }
  function guard(raw, now) {
    gpuTime.poll();
    if (quality.skip > 0) { quality.skip--; return; }
    quality.acc += raw; quality.n++;
    const opening = clock.t < 6, need = opening ? 10 : 45;
    if (quality.n < need) return;
    const d = decide({ ratio: quality.ratio, ceiling: quality.ceiling, level: quality.level, avg: quality.acc / quality.n, gpu: tq && quality.gpuMs ? quality.gpuMs : 0,
      cap: ratioCap(canvas.clientWidth, canvas.clientHeight), stable: need >= 45 && clock.t > 5 });
    if (d.action === 'down') { quality.ceiling = d.ceiling; setRatio(d.ratio, now); return; }
    if (d.action === 'up') { setRatio(d.ratio, now); return; }
    if (d.action === 'level') { quality.level = d.level; resize(true); }
    quality.acc = 0; quality.n = 0;
  }

  // the scene through the whole final-image pipeline (the frame, and the warm-up below)
  function drawScene(dt) {
    if (usePost) {
      const u = finalQuad.material.uniforms;
      renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
      copyQuad.material.uniforms.tColor.value = rtScene.texture;
      renderer.setRenderTarget(rtFlat); copyQuad.render(renderer);
      bloom.render(renderer, null, rtFlat, dt, false);
      u.tColor.value = rtFlat.texture; u.tDepth.value = rtScene.depthTexture;
      renderer.setRenderTarget(null); finalQuad.render(renderer);
    } else {
      renderer.setRenderTarget(null); renderer.render(scene, camera);
    }
  }

  // Warm-up, behind the loading screen: every program the table will use is compiled before the opening
  // starts (in parallel where KHR_parallel_shader_compile exists), the full resin's too, then the whole image
  // pipeline draws once into a tiny buffer, so nothing compiles during the opening or the first roll.
  async function warmUp() {
    camera.position.set(0, 12, 16); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    dice.setResin('full');
    const hidden = []; scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    // the scene is drawn into rtScene (linear, no tone mapping), and a program is keyed on that: compile for it
    renderer.setRenderTarget(usePost ? rtScene : null);
    try { await renderer.compileAsync(scene, camera); } catch (e) { console.warn('[table] compileAsync', e); }
    renderer.setRenderTarget(null);
    for (const o of hidden) o.visible = false;
    const pr = renderer.getPixelRatio(), cw = canvas.clientWidth, chh = canvas.clientHeight;
    renderer.setPixelRatio(1); renderer.setSize(128, 72, false); renderer.getDrawingBufferSize(size);
    if (usePost) { rtScene.setSize(size.x, size.y); rtFlat.setSize(size.x, size.y); bloom.setSize(64, 36); finalQuad.material.uniforms.uRes.value.copy(size); }
    camera.aspect = 128 / 72; camera.updateProjectionMatrix();
    drawScene(0.016);
    if (!instant) dice.setResin('lite');
    renderer.setPixelRatio(pr); renderer.setSize(cw, chh, false);
    resize(true);
    if (perf) perf.mark('warm');
  }

  function frame(now) {
    const raw = (now - clock.last) / 1000;
    const dt = Math.min(0.05, raw); clock.last = now; clock.t += dt;
    if (!instant && !firstFrame && raw < 1) {   // a long pause (hidden tab) is not a slow frame
      guard(Math.min(raw, 0.25), now);
      if (settled && rampOn && state.phase === 'table') ramp.feed(window.__frameMs ? window.__frameMs() : raw * 1000);
    }
    if (perf && firstFrame) perf.mark('frame0start');
    const ft = hashFlag(/[#&]t=([\d.]+)/), time = ft ? +ft[1] : clock.t;   // #t=N: freeze the animation clock, for before/after stills
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
    game.t += Math.min(raw, 0.25) * 1000 * game.scale;
    const gdt = Math.min(0.25, (game.t - game.prev) / 1000); game.prev = game.t;
    dice.update(game.t);
    if (attack) attack.update(game.t, gdt);
    world.moving = moving; world.stirring = dice.busy || !!(attack && attack.busy);

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
    // one retake of the surfaces once the guard has stopped moving the ratio
    if (quality.lastChange && now - quality.lastChange > 2000 && Math.abs(pixelK() - quality.snapRatio) > 0.01) { surfaces.refresh({ focus: false }); quality.snapRatio = pixelK(); quality.lastChange = 0; }

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
      if (card) {
        // the card's element pixels -> the note's top face (the plane is 2.05 wide, y up, top edge at -z)
        const nw = 2.05, nd = 2.05 * (NOTE[1] / NOTE[0]);
        pixM.set(nw / NOTE[0], 0, 0, -nw / 2, 0, 0, 1, 0.02, 0, nd / NOTE[1], 0, -nd / 2, 0, 0, 0, 1);
        mvp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(world.note.matrixWorld).multiply(pixM).premultiply(viewM);
        surfaces.place('note', mvp);
      }
    }

    // focus: on the books, or on whichever one has your attention
    // (and on the dice while they fly and settle)
    const diceAt = state.phase === 'table' ? dice.focus(game.t) : null;
    const focusOn = state.open ? state.open.openCenter : state.hot ? bookById(state.hot).center : diceAt ? diceAt : cardState.hot >= 0 && world.note ? world.note.position : world.focus;
    const fd = camera.position.distanceTo(focusOn);

    gpuTime.begin();
    if (usePost) {
      const u = finalQuad.material.uniforms;
      // eased on whichever clock moved more, so stepped proofs (game clock only) catch up too
      u.uFocus.value += (fd - u.uFocus.value) * (firstFrame ? 1 : 1 - Math.exp(-Math.max(dt, gdt) * FOCUS_EASE));
      u.uAperture.value = lerp(17, 13, opening);
      u.uTime.value = time;
      u.uFade.value = instant ? 1 : ease(since / 1.6);
      u.uFlash.value = state.phase === 'leaving' ? ease((now - state.t0) / 480) : 0;
    }
    drawScene(dt);
    gpuTime.end();
    bar.update(gameClock()); bar.render(renderer);
    if (!settled && (since >= 3.8 || instant)) { settled = true; dice.setResin('full'); if (progressive) idleThen(() => loadBaked(BAKED_FULL).then(() => { swapFull = true; })); }
    // the full-size wood and mat go in at a moment nothing moves: same picture, more texels, so there is nothing to see but sharpness
    if (swapFull && !world.moving && !world.stirring && state.phase === 'table') { swapFull = false; const n = upgradeBaked(); console.info('[table] full-size wood and mat in: ' + n + ' textures'); if (perf) perf.mark('full-tex'); }
    if (perf) perf.frame(now, scene, settled);
    if (firstFrame) { firstFrame = false; if (!holdLoad) document.body.classList.add('is-ready'); }
  }
  await warmUp();
  renderer.setAnimationLoop(frame);

  // handles for testing from the console:  __table.open('core')
  window.__table = { ramp, setRatio: (r) => setRatio(r, performance.now()), area: areaBounds(ROLL_AREA[tall ? 'tall' : 'wide']), world, rig, state, surfaces, renderer, camera, open: openBook, close: closeBook, hot: setHot, mode, tier, quality, perf,
    roll: (text) => play.run(text), dice: () => dice.readUp(), diceAt: () => dice.where(), diceState: () => dice.state, attackBusy: () => !!(attack && attack.busy), attackPhase: () => attack && attack.phase(), nextAttacker: (id) => attack && attack.pick(id),
    timeScale: (k) => { game.scale = k; }, card: () => card, rollAttack: (id) => play.rollById(id),
    // proofs: where row i (or its dice icon) of the card is on screen, in client pixels
    cardPoint: (i, part = 'icon') => {
      const r = cardRows(character.attacks.length)[i], q = part === 'icon' ? cardIcon(r) : r;
      const nw = 2.05, nd = 2.05 * (NOTE[1] / NOTE[0]), cr = canvas.getBoundingClientRect();
      const p = new THREE.Vector3(((q.x + q.w / 2) / NOTE[0] - 0.5) * nw, 0.02, ((q.y + q.h / 2) / NOTE[1] - 0.5) * nd).applyMatrix4(world.note.matrixWorld).project(camera);
      return { x: cr.left + (p.x * 0.5 + 0.5) * cr.width, y: cr.top + (-p.y * 0.5 + 0.5) * cr.height };
    }, step: (ms) => { game.t += ms; }, game, forceRoll: (hope, fear) => play.forceRoll(hope, fear), log };
  const auto = hashFlag(/[#&]open=(\w+)/);
  if (auto) setTimeout(() => openBook(auto[1]), instant ? 300 : 3600);
  const cam = hashFlag(/[#&]cam=([-\d.,]+)/);
  if (cam) { const c = cam[1].split(',').map(Number); rig.user.az = c[0] || 0; rig.user.el = c[1] || 0; rig.user.zoom = c[2] || 1; rig.off.set(c[3] || 0, 0, c[4] || 0); }
  const hov = hashFlag(/[#&]hot=(\w+)/);
  if (hov) setTimeout(() => setHot(hov[1], 'key'), 200);
}
