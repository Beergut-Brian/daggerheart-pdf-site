/* home-c: soft splat hero. Source for splat.bundle.js (build: node tools/home-c-build.js).
   One photo + one monocular depth map -> ~590k round gaussian splats placed along their camera rays,
   so at rest they reproject exactly onto the photo; the camera then orbits a few degrees around the fire.
   Fallbacks (the <picture> underneath stays): reduced motion, no WebGL, any error -> canvas never shown.
   Colours come from tokens (--color-bg, --color-ember); nothing hard-coded. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute, Points, ShaderMaterial,
  Color, Vector3, Quaternion, Euler, NormalBlending, AdditiveBlending, Texture, LinearFilter, ClampToEdgeWrapping, Vector2, Mesh, PlaneGeometry,
} from 'three';

const TUNE = {
  fov: 38,            // vertical fov over the image height (deg)
  near: 0.62,         // camera distance of the brightest depth (canopy)
  far: 1.35,          // camera distance of the darkest depth (clearing floor)
  gamma: 1.25,        // depth curve: >1 pushes mid-depths back, keeps canopy as the near layer
  yaw: 3.2,           // max orbit, degrees, toward the mouse
  pitch: 2.0,
  ease: 2.6,          // 1/s, exponential ease toward the mouse target
  splat: 2.1,         // splat diameter in grid cells (overlap so neighbours still meet at max orbit)
  grow: 0.06,         // splat widening per 8-bit depth step to a neighbour 2 cells away
  growMax: 1.4,
  falloff: 3.2,       // gaussian: alpha = exp(-falloff * r^2), r = 1 at the splat rim
  overscan: 1.05,     // scale the photo about the fire so no border shows at max orbit
  edge: 0.025,        // alpha fade at the photo border (fraction of the image)
  bright: 1.09,       // home-a's img is brightness(1.12) saturate(1.05); 1.09 matches its measured darkening (polish pass 2)
  sat: 1.05,
  fire: [0.505, 0.585],
  plume: [0.53, 0.16],
  embers: 70,
};

const css = (name, fallbackEl) => getComputedStyle(fallbackEl || document.documentElement).getPropertyValue(name).trim();

function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
function pixels(img, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, w, h);
  return x.getImageData(0, 0, w, h).data; // data: URI images do not taint, so this works over file://
}

const SPLAT_VS = /* glsl */`
  attribute float edge;
  attribute float grow;    // >1 where depth changes fast: neighbours part during orbit, so those splats widen
  uniform float uSize;     // device px per splat at rest distance 1
  uniform vec2 uHalf;      // image plane half extents (hw, hh) at z = -1
  varying vec2 vUV; varying float vAlpha, vGrow;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float restD = -position.z;                   // camera started at the origin looking down -z
    vec2 dir = position.xy / restD / uHalf;      // -1..1 across the photo
    vUV = vec2(dir.x * 0.5 + 0.5, 0.5 - dir.y * 0.5);
    gl_PointSize = uSize * grow * restD / -mv.z;       // size attenuation: constant at rest, grows as layers near
    vAlpha = edge; vGrow = grow;
  }`;
// Each splat is a soft round gaussian that carries its own patch of the photo (a textured splat):
// at rest every overlapping splat agrees on the colour under a pixel, so the still is the photo, with no dot grid;
// in motion each patch travels with its depth layer.
const SPLAT_FS = /* glsl */`
  uniform sampler2D uTex;
  uniform vec2 uPatch;     // splat radius in uv
  uniform float uFalloff, uBright, uSat;
  varying vec2 vUV; varying float vAlpha, vGrow;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;          // y runs down, like the image's v
    float r2 = dot(p, p);
    if (r2 > 1.0) discard;
    vec3 c = texture2D(uTex, vUV + p * uPatch * vGrow).rgb * uBright;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, uSat);
    c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;  // break 8-bit banding in the dark canopy
    float a = exp(-uFalloff * r2) * vAlpha;
    gl_FragColor = vec4(c * a, a);               // premultiplied
  }`;
// Backdrop: the photo itself as one quad at the far depth, drawn first. It tops up splat coverage to exactly 1
// (no faint grid where gaussians thin out) and fills disocclusions behind canopy edges with photo, not black.
const BACK_VS = /* glsl */`
  varying vec2 vUV;
  uniform float uSpan;
  void main() { vUV = (vec2(uv.x, 1.0 - uv.y) - 0.5) * uSpan + 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BACK_FS = /* glsl */`
  uniform sampler2D uTex;
  uniform float uBright, uSat;
  varying vec2 vUV;
  void main() {
    vec3 c = texture2D(uTex, vUV).rgb * uBright;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, uSat);
    c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;  // break 8-bit banding in the dark canopy
    gl_FragColor = vec4(c, 1.0);                 // beyond the photo: its border pixels smeared outward (clamp), no dark seam
  }`;
const EMBER_VS = /* glsl */`
  attribute vec4 seed;
  uniform float uTime, uSize, uHH, uHW, uDFire, uDTop;
  uniform vec2 uFire, uPlume;
  varying float vLife;
  void main() {
    float t = fract(seed.x + uTime * (0.035 + 0.05 * seed.y));
    float spread = seed.z * 2.0 - 1.0;
    vec2 uv = mix(uFire, uPlume, t);
    uv.x += (0.006 + 0.06 * t) * spread + sin(seed.w * 6.283 + t * 7.0) * 0.004 * t;
    float d = mix(uDFire, uDTop, sqrt(t));       // embers rise toward the camera, through the canopy layer
    vec3 dir = vec3((uv.x * 2.0 - 1.0) * uHW, (1.0 - uv.y * 2.0) * uHH, -1.0);
    vec4 mv = modelViewMatrix * vec4(dir * d, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.6 + 1.3 * seed.w) / -mv.z;
    vLife = sin(3.14159 * min(1.0, t * 1.05)) * (0.5 + 0.5 * seed.y);
  }`;
const EMBER_FS = /* glsl */`
  uniform vec3 uColor;
  varying float vLife;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(p, p);
    if (r2 > 1.0) discard;
    float a = (exp(-9.0 * r2) + 0.35 * exp(-2.5 * r2)) * vLife;
    gl_FragColor = vec4(uColor * a, a);
  }`;

async function boot() {
  const hero = document.querySelector('.hero');
  const media = hero && hero.querySelector('.hero-media');
  const img = media && media.querySelector('img');
  const data = window.HC_SCENE;
  if (!hero || !media || !data) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;     // the flat photo stays

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-splat';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try {
    if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) return;
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { return; }                                                // no WebGL: the flat photo stays

  const [cImg, dImg] = await Promise.all([loadImage(data.color), loadImage(data.depth)]);
  // phones: half-resolution splat grid (~147k splats, each twice as wide); textured splats keep the detail.
  // Desktop starts at the full grid and steps down to the half grid if the first ~1.5 s run slower than ~45 fps.
  let stride = matchMedia('(max-width: 699px)').matches ? 2 : 1;
  const A = data.w / data.h;
  let W, H, N, dep;

  // camera space at rest: origin, looking down -z; the image plane at z = -1 spans [-hw, hw] x [-hh, hh]
  const hh = Math.tan((TUNE.fov * Math.PI / 180) / 2), hw = hh * A;
  const dist = (g) => TUNE.far + (TUNE.near - TUNE.far) * Math.pow(g / 255, TUNE.gamma);
  const ss = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

  function buildGeo() {
    W = Math.round(data.w / stride); H = Math.round(data.h / stride); N = W * H;
    dep = pixels(dImg, W, H);
    // painter's order: far -> near (counting sort on the 8-bit depth). The orbit is a few degrees, so the
    // order stays valid and normal blending gives occlusion without per-frame sorting.
    const count = new Uint32Array(257);
    for (let i = 0; i < N; i++) count[dep[i * 4] + 1]++;
    for (let b = 1; b < 257; b++) count[b] += count[b - 1];
    const pos = new Float32Array(N * 3), edge = new Float32Array(N), grow = new Float32Array(N);
    const e = TUNE.edge;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const s = j * W + i, g = dep[s * 4];
      const k = count[g]++;
      const u = (i + 0.5) / W, v = (j + 0.5) / H, d = dist(g);
      pos[k * 3] = (u * 2 - 1) * hw * d; pos[k * 3 + 1] = (1 - v * 2) * hh * d; pos[k * 3 + 2] = -d;
      let dmax = 0;                                     // largest depth step to a 2-cell neighbour
      for (let dj = -2; dj <= 2; dj += 2) for (let di = -2; di <= 2; di += 2) {
        const ii = Math.min(W - 1, Math.max(0, i + di)), jj = Math.min(H - 1, Math.max(0, j + dj));
        const dd = Math.abs(dep[(jj * W + ii) * 4] - g); if (dd > dmax) dmax = dd;
      }
      grow[k] = 1 + Math.min(TUNE.growMax, dmax * TUNE.grow);
      edge[k] = ss(u / e) * ss((1 - u) / e) * ss(v / e) * ss((1 - v) / e);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('edge', new BufferAttribute(edge, 1));
    geo.setAttribute('grow', new BufferAttribute(grow, 1));
    return geo;
  }
  const geo = buildGeo();
  const tex = new Texture(cImg);                          // data: URI image, so the upload is not cross-origin
  tex.minFilter = LinearFilter; tex.magFilter = LinearFilter; tex.generateMipmaps = false;
  tex.wrapS = tex.wrapT = ClampToEdgeWrapping; tex.flipY = false; tex.needsUpdate = true;
  const splatMat = new ShaderMaterial({
    vertexShader: SPLAT_VS, fragmentShader: SPLAT_FS,
    uniforms: {
      uTex: { value: tex }, uSize: { value: 4 }, uHalf: { value: new Vector2(hw, hh) },
      uPatch: { value: new Vector2() },
      uFalloff: { value: TUNE.falloff }, uBright: { value: TUNE.bright }, uSat: { value: TUNE.sat },
    },
    transparent: true, depthTest: false, depthWrite: false, blending: NormalBlending, premultipliedAlpha: true,
  });
  const splats = new Points(geo, splatMat);
  splats.frustumCulled = false;
  const setPatch = () => splatMat.uniforms.uPatch.value.set(TUNE.splat / 2 / W, TUNE.splat / 2 / H);
  setPatch();

  // embers: in-scene, so they parallax with the layers (start at the fire's depth, rise through the canopy)
  const fireIdx = Math.round(TUNE.fire[1] * H) * W + Math.round(TUNE.fire[0] * W);
  const dFire = dist(dep[fireIdx * 4]);
  const eSeed = new Float32Array(TUNE.embers * 4);
  for (let i = 0; i < eSeed.length; i++) eSeed[i] = Math.random();
  const eGeo = new BufferGeometry();
  eGeo.setAttribute('position', new BufferAttribute(new Float32Array(TUNE.embers * 3), 3));
  eGeo.setAttribute('seed', new BufferAttribute(eSeed, 4));
  const emberMat = new ShaderMaterial({
    vertexShader: EMBER_VS, fragmentShader: EMBER_FS,
    uniforms: {
      uTime: { value: 0 }, uSize: { value: 3 }, uHH: { value: hh }, uHW: { value: hw },
      uDFire: { value: dFire * 0.985 }, uDTop: { value: TUNE.near * 0.92 },
      uFire: { value: TUNE.fire }, uPlume: { value: TUNE.plume },
      uColor: { value: new Color(css('--color-ember') || 'orange') },
    },
    transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending, premultipliedAlpha: true,
  });
  const embers = new Points(eGeo, emberMat);
  embers.frustumCulled = false;
  embers.renderOrder = 1;

  const bg = new Color(css('--color-bg') || 'black');
  const dBack = TUNE.far;
  const span = 1.4;                                       // pass 2: backdrop overscanned 40%, so max orbit never shows its edge
  const back = new Mesh(new PlaneGeometry(2 * hw * dBack * span, 2 * hh * dBack * span), new ShaderMaterial({
    vertexShader: BACK_VS, fragmentShader: BACK_FS, depthTest: false, depthWrite: false,
    uniforms: { uTex: { value: tex }, uBright: { value: TUNE.bright }, uSat: { value: TUNE.sat }, uSpan: { value: span } },
  }));
  back.position.z = -dBack;
  back.renderOrder = -1;
  back.frustumCulled = false;
  const scene = new Scene();
  scene.background = bg;
  scene.add(back, splats, embers);
  const camera = new PerspectiveCamera(TUNE.fov, A, 0.05, 10);
  const pivot = new Vector3(
    (TUNE.fire[0] * 2 - 1) * hw * dFire, (1 - TUNE.fire[1] * 2) * hh * dFire, -dFire);

  // framing: reproduce home-a's object-fit: cover of the photo inside .hero-media (same CSS box and
  // object-position, so the fire lands where it does in home-a at every width), overscanned about the fire.
  function frame() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const hr = canvas.getBoundingClientRect(), mr = media.getBoundingClientRect();
    const op = (img ? getComputedStyle(img).objectPosition : '50% 50%').split(' ').map(parseFloat);
    const s = Math.max(mr.width / W, mr.height / H) * TUNE.overscan;
    const iw = W * s, ih = H * s;
    const base = Math.max(mr.width / W, mr.height / H);
    const bx = mr.left - hr.left + (mr.width - W * base) * (op[0] / 100);
    const by = mr.top - hr.top + (mr.height - H * base) * ((op[1] ?? 50) / 100);
    // grow about the fire point
    const fx = bx + TUNE.fire[0] * W * base, fy = by + TUNE.fire[1] * H * base;
    const x0 = fx - TUNE.fire[0] * iw, y0 = fy - TUNE.fire[1] * ih;
    renderer.setPixelRatio(dpr);
    renderer.setSize(hr.width, hr.height, false);
    camera.aspect = A;
    camera.setViewOffset(iw, ih, -x0, -y0, hr.width, hr.height);
    camera.updateProjectionMatrix();
    splatMat.uniforms.uSize.value = (iw / W) * dpr * TUNE.splat;
    emberMat.uniforms.uSize.value = Math.max(2.2, (iw / 1600) * 3.4) * dpr;
  }

  // motion: orbit the camera rigidly about the fire
  const hover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let tx = 0, ty = 0, cx = 0, cy = 0, t0 = performance.now(), last = t0, running = false, raf = 0;
  addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    tx = (ev.clientX / innerWidth) * 2 - 1; ty = (ev.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  const q = new Quaternion(), eul = new Euler(0, 0, 0, 'YXZ'), off = new Vector3();
  function place() {
    eul.set(cy * TUNE.pitch * Math.PI / 180, cx * TUNE.yaw * Math.PI / 180, 0); // camera swings toward the mouse
    q.setFromEuler(eul);
    off.set(0, 0, 0).sub(pivot).applyQuaternion(q);
    camera.position.copy(pivot).add(off);
    camera.quaternion.copy(q);
  }
  const adapt = { dts: [], since: 0, on: stride === 1 && !/[#&]full\b/.test(location.hash) };
  function stepDown(dtRaw, now) {                          // full grid too slow on this device: rebuild at half
    if (!adapt.since) adapt.since = now;
    adapt.dts.push(dtRaw);
    if (now - adapt.since < 1500 || adapt.dts.length < 4) return;
    adapt.on = false;
    const d = adapt.dts.slice(1).sort((a, b) => a - b), m = d[d.length >> 1];  // first dt spans the start-up
    if (m < 22) return;
    stride = 2;
    const old = splats.geometry;
    splats.geometry = buildGeo(); old.dispose();
    setPatch(); frame();
    proof.splats = N; proof.grid = W + 'x' + H; proof.steppedDown = Math.round(m) + ' ms median';
    console.info('home-c splat: stepped down to the half grid', JSON.stringify(proof));
  }
  function tick(now) {
    const dtRaw = now - last;
    const dt = Math.min(0.05, dtRaw / 1000); last = now;
    if (adapt.on) stepDown(dtRaw, now);
    update(dt, (now - t0) / 1000);
    if (running) raf = requestAnimationFrame(tick);
  }
  function update(dt, time) {
    if (!hover) { tx = Math.sin(time * 0.23) * 0.7; ty = Math.sin(time * 0.31 + 1.3) * 0.45; }
    const k = 1 - Math.exp(-TUNE.ease * dt);
    cx += (tx - cx) * k; cy += (ty - cy) * k;
    place();
    emberMat.uniforms.uTime.value = time;
    renderer.render(scene, camera);
  }
  let paused = false, simT = 0;
  function start() { if (running || paused) return; running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  media.after(canvas);                                    // above the photo, under the scrims and copy
  frame();
  place();
  renderer.render(scene, camera);
  // proof of draw: read back a few pixels of the frame just rendered (same task, so the buffer is still valid)
  const gl = renderer.getContext(), px = new Uint8Array(4);
  let lit = 0;
  for (let k = 1; k <= 9; k++) {
    gl.readPixels(Math.floor(gl.drawingBufferWidth * k / 10), Math.floor(gl.drawingBufferHeight * 0.5), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    lit += px[0] + px[1] + px[2] > 24 ? 1 : 0;
  }
  if (!lit) return;                                       // drew nothing visible: keep the photo
  hero.classList.add('is-splat');                         // reveals the canvas only once it has drawn
  const proof = { splats: N, grid: W + 'x' + H, litSamples: lit, webgl: renderer.capabilities.isWebGL2 ? 2 : 1 };
  console.info('home-c splat: canvas drew', JSON.stringify(proof));
  window.HC_SPLAT = { proof, renderer, camera, scene, splatMat, draw: () => renderer.render(scene, camera),
    // offline capture (render script): stop the loop, then advance the page's own easing by fixed steps
    stop: () => { paused = true; stop(); }, advance: (ms) => { simT += ms / 1000; update(ms / 1000, simT); }, set: (x, y) => { tx = x; ty = y; cx = x; cy = y; place(); renderer.render(scene, camera); } };
  addEventListener('resize', frame);
  new IntersectionObserver(([en]) => (en.isIntersecting && !document.hidden ? start() : stop())).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
}

boot().catch((e) => { console.warn('home-c splat: falling back to the photo', e); });
