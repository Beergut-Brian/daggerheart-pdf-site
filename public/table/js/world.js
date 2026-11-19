// The table and everything on it.
import * as THREE from '../vendor/three.bundle.js';
import * as TX from './textures.js';
import { Builder, makeMaterials, buildTerrain } from './models.js';
import { makeCanvas, rng } from './textures.js';
import { paintSpine, paintWing } from './surfaces.js';
import { MINIS } from './minis.js';
import { ROLL_AREA } from './config.js';

const { RoundedBoxGeometry, RoomEnvironment } = THREE;
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const clamp01 = (t) => Math.min(1, Math.max(0, t));
// the crystals' glow and lights, kept low enough that the golem's silhouette reads against them
const CRYSTAL = { light: 3.2, light2: 1.8, glow: 0.3, glow2: 0.28, pulse: 0.16 };
const PICKUP = 1.05;      // how far a book rises when it is picked up

// ---------------------------------------------------------------- candle

const FLAME_VS = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FLAME_FS = /* glsl */`
uniform float uTime, uSeed, uLit;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float y = vUv.y;
  float t = uTime * 7.0 + uSeed * 31.0;
  p.x += (sin(t + y * 4.0) * 0.07 + sin(t * 2.3 + 1.7) * 0.035) * y * y;
  float stretch = 0.92 + 0.08 * sin(t * 1.3);
  float yy = y / stretch;
  float w = 0.62 * pow(max(0.0, 1.0 - yy), 0.72) * smoothstep(0.0, 0.16, yy) + 0.02;
  float d = abs(p.x) / w;
  float body = smoothstep(1.0, 0.25, d) * smoothstep(1.0, 0.8, yy);
  vec3 col = mix(vec3(1.0, 0.36, 0.05), vec3(1.0, 0.78, 0.36), smoothstep(1.0, 0.2, d) * smoothstep(1.0, 0.3, yy));
  col = mix(col, vec3(1.0, 0.96, 0.86), smoothstep(0.6, 0.0, d) * smoothstep(0.78, 0.2, yy) * smoothstep(0.03, 0.2, yy));
  col = mix(vec3(0.12, 0.26, 1.0), col, smoothstep(0.02, 0.2, yy));
  gl_FragColor = vec4(col * 2.1 * uLit, body);
}`;

function makeCandle(o, shared) {
  const { x, z, h, r = 0.2, seed = 1, dish = true } = o;
  const g = new THREE.Group(); g.position.set(x, 0, z);
  if (dish) {
    const pts = [[0, 0], [r * 2.0, 0], [r * 2.15, 0.035], [r * 2.05, 0.075], [r * 1.5, 0.05], [r * 1.12, 0.04], [0, 0.04]].map((p) => new THREE.Vector2(p[0], p[1]));
    const d = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), shared.brass);
    d.castShadow = d.receiveShadow = true; g.add(d);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.5, 0.022, 6, 14), shared.brass);
    ring.position.set(r * 2.4, 0.06, 0); ring.rotation.y = Math.PI / 2; ring.castShadow = true; g.add(ring);
  }
  const y0 = dish ? 0.04 : 0;
  const prof = [[0, 0], [r, 0], [r * 1.01, h * 0.5], [r, h], [r * 0.94, h + 0.014], [r * 0.74, h - 0.012], [0, h - 0.03]].map((p) => new THREE.Vector2(p[0], p[1]));
  const wax = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), shared.wax);
  wax.position.y = y0; wax.castShadow = true; wax.receiveShadow = true; g.add(wax);
  // drips
  const rr = rng(seed * 13);
  for (let i = 0; i < 5; i++) {
    const a = rr() * 6.28, len = 0.06 + rr() * h * 0.35;
    const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.018 + rr() * 0.012, len, 3, 6), shared.wax);
    d.position.set(Math.cos(a) * (r + 0.004), y0 + h - len / 2 - 0.01, Math.sin(a) * (r + 0.004));
    g.add(d);
  }
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 5), shared.black);
  wick.position.y = y0 + h + 0.005; g.add(wick);
  const flame = new THREE.Mesh(shared.flameGeo, new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uLit: { value: 0 } },
    vertexShader: FLAME_VS, fragmentShader: FLAME_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  flame.position.y = y0 + h + 0.015; flame.renderOrder = 5; g.add(flame);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: shared.glow, color: 0xff9a3c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.y = y0 + h + 0.2; halo.scale.setScalar(1.5); g.add(halo);
  const light = new THREE.PointLight(0xff9440, 0, 15, 2);
  light.position.set(0, y0 + h + 0.26, 0);
  if (o.shadow) {
    light.castShadow = true; light.shadow.mapSize.set(o.shadow, o.shadow);
    light.shadow.camera.near = 0.12; light.shadow.camera.far = 14; light.shadow.bias = -0.004; light.shadow.normalBias = 0.03; light.shadow.radius = 5;
    light.shadow.autoUpdate = false; light.shadow.needsUpdate = true;
  }
  g.add(light);
  return { group: g, flame, halo, light, seed, power: o.power ?? 10, lit: 0, base: light.position.clone() };
}

// ---------------------------------------------------------------- book

function makeBook(def, surfaces, shared) {
  const W = 2.32, D = W / def.aspect, T = def.thickness, ct = 0.036;
  const pal = def.palette;
  const root = new THREE.Group(); root.position.set(def.place.x, 0, def.place.z); root.rotation.y = def.place.rot;
  const lift = new THREE.Group(); root.add(lift);
  const board = new THREE.MeshStandardMaterial({ color: pal.deep, roughness: 0.5 });
  const cast = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  const back = cast(new THREE.Mesh(new RoundedBoxGeometry(W, ct, D, 2, 0.012), board)); back.position.y = ct / 2; lift.add(back);

  const pw = W - 0.1, pd = D - 0.12, ph = T - ct * 2, px = -0.02;
  const edgeX = shared.pageEdge.clone(); edgeX.repeat.set(1, ph * 5); edgeX.needsUpdate = true;
  const edgeMat = new THREE.MeshStandardMaterial({ map: edgeX, roughness: 0.85 });
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xe9dfc6, roughness: 0.9 });
  const block = cast(new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), [edgeMat, paperMat, paperMat, paperMat, edgeMat, edgeMat]));
  block.position.set(px, ct + ph / 2, 0); lift.add(block);

  // spine
  const sc = makeCanvas(768, 96); paintSpine(sc.getContext('2d'), 768, 96, def);
  const spineTex = new THREE.CanvasTexture(sc); spineTex.colorSpace = THREE.SRGBColorSpace; spineTex.anisotropy = 8;
  const spineMat = new THREE.MeshStandardMaterial({ map: spineTex, roughness: 0.5 });
  const spine = cast(new THREE.Mesh(new RoundedBoxGeometry(0.09, T, D, 3, 0.04), [board, spineMat, board, board, board, board]));
  spine.position.set(-W / 2 + 0.03, T / 2, 0); lift.add(spine);

  // first page (shows when the cover lifts)
  const pageMat = new THREE.MeshStandardMaterial({ map: surfaces.get('right-' + def.id).texture, roughness: 0.92, emissive: 0xffffff, emissiveMap: surfaces.get('right-' + def.id).texture, emissiveIntensity: 0 });
  const page = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd).rotateX(-Math.PI / 2), pageMat);
  page.position.set(px, ct + ph + 0.0015, 0); page.receiveShadow = true; lift.add(page);

  // front cover on a hinge
  const hinge = new THREE.Group(); hinge.position.set(-W / 2 + 0.02, T - ct, 0); lift.add(hinge);
  const cover = cast(new THREE.Mesh(new RoundedBoxGeometry(W, ct, D, 2, 0.012), board));
  cover.position.set(W / 2 - 0.02, ct / 2, 0); hinge.add(cover);
  const artMat = new THREE.MeshPhysicalMaterial({ map: surfaces.get('cover-' + def.id).texture, roughness: 0.42, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.28,
    emissive: 0xffffff, emissiveMap: surfaces.get('cover-' + def.id).texture, emissiveIntensity: 0.04 });
  const art = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.012, D - 0.012).rotateX(-Math.PI / 2), artMat);
  art.position.set(W / 2 - 0.02, ct + 0.0012, 0); art.receiveShadow = true; hinge.add(art);
  const insideMat = new THREE.MeshStandardMaterial({ map: surfaces.get('left-' + def.id).texture, roughness: 0.9 });
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.06, D - 0.06).rotateZ(Math.PI).rotateX(Math.PI / 2), insideMat);
  inside.position.set(W / 2 - 0.02, -0.0012, 0); inside.receiveShadow = true; hinge.add(inside);

  // loose pages that riffle over
  const flips = [];
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.PlaneGeometry(pw, pd, 14, 1).rotateX(-Math.PI / 2).translate(pw / 2, 0, 0);
    const baseX = Float32Array.from(geo.attributes.position.array.filter((_, k) => k % 3 === 0));
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: shared.print[i], roughness: 0.9, side: THREE.DoubleSide }));
    m.position.set(px - pw / 2, ct + ph + 0.004 + i * 0.002, 0); m.visible = false; m.castShadow = true;
    lift.add(m); flips.push({ mesh: m, baseX, pw });
  }

  // light coming up out of the pages
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.6, D * 2.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shared.soft, color: 0xffd28a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(-W / 2 + 0.02, T + 0.06, 0); glow.renderOrder = 6; lift.add(glow);
  const light = new THREE.PointLight(pal.light, 0, 12, 2); light.position.set(0, 1.3, 0); lift.add(light);

  // gold halo on the table when hovered
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.9, D * 1.75).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shared.soft, color: 0xffc56b, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.y = 0.012; halo.renderOrder = 1; root.add(halo);

  // motes rising out of the open book
  const N = 90, pos = new Float32Array(N * 3), seed = new Float32Array(N * 3), r = rng(def.pages);
  for (let i = 0; i < N; i++) { pos[i * 3] = (r() - 0.5) * W * 1.7 - W * 0.3; pos[i * 3 + 1] = T; pos[i * 3 + 2] = (r() - 0.5) * D * 0.9; seed[i * 3] = r(); seed[i * 3 + 1] = r(); seed[i * 3 + 2] = r(); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
  const sparks = new THREE.Points(sg, new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAmt: { value: 0 }, uColor: { value: new THREE.Color(pal.light) }, uPx: { value: 1 } },
    vertexShader: /* glsl */`attribute vec3 aSeed; uniform float uTime, uPx; varying float vA;
      void main() { float life = fract(aSeed.x + uTime * (0.25 + aSeed.y * 0.3));
        vec3 p = position + vec3(sin(uTime * 1.3 + aSeed.z * 20.0) * 0.18 * life, life * (1.4 + aSeed.y * 1.6), cos(uTime * 1.1 + aSeed.x * 20.0) * 0.18 * life);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = uPx * (0.03 + aSeed.z * 0.05) / -mv.z; vA = sin(life * 3.14159); }`,
    fragmentShader: /* glsl */`uniform vec3 uColor; uniform float uAmt; varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uColor * 3.0, a * a * vA * uAmt); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sparks.frustumCulled = false; sparks.visible = false; lift.add(sparks);

  // what the pointer actually hits
  const hit = new THREE.Mesh(new THREE.BoxGeometry(W + 0.16, T + 0.24, D + 0.16), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = T / 2 + 0.05; hit.userData.book = def.id; root.add(hit);

  // ...and what it hits once the book is open in the air
  const hitOpen = new THREE.Mesh(new THREE.BoxGeometry(W * 2, 0.3, D), new THREE.MeshBasicMaterial({ visible: false }));
  hitOpen.position.set(-W / 2 + 0.02, T, 0); hitOpen.userData.book = def.id; lift.add(hitOpen);

  const book = {
    id: def.id, def, root, lift, hinge, flips, glow, light, halo, sparks, hit, hitOpen, artMat, pageMat, W, D, T,
    hover: 0, open: 0, invite: 0,
    center: new THREE.Vector3(def.place.x, T, def.place.z),
    openCenter: new THREE.Vector3(-W / 2 + 0.02, T + PICKUP, 0),
  };
  root.updateMatrixWorld(true);
  book.openCenter.applyMatrix4(root.matrixWorld);
  return book;
}

function bendPage(f, p) {
  const { mesh, baseX, pw } = f, a = mesh.geometry.attributes.position;
  const theta = ease(p) * Math.PI, k = Math.sin(clamp01(p) * Math.PI) * 1.05;
  const n = 14, xs = new Float32Array(n + 1), ys = new Float32Array(n + 1);
  for (let i = 1; i <= n; i++) {
    const s = (i - 0.5) / n, ang = theta - k * Math.pow(s, 1.4);
    xs[i] = xs[i - 1] + Math.cos(ang) * (pw / n); ys[i] = ys[i - 1] + Math.max(-0.002, Math.sin(ang)) * (pw / n);
  }
  for (let v = 0; v < a.count; v++) {
    const i = Math.round((baseX[v] / pw) * n);
    a.setX(v, xs[i]); a.setY(v, Math.max(0, ys[i]));
  }
  a.needsUpdate = true; mesh.geometry.computeVertexNormals();
}

function poseBook(b, time) {
  const p = b.open, h = b.hover;
  // picked up off the table and tipped toward you, then the cover swings over
  const up = ease(p / 0.36);
  b.lift.position.y = h * 0.1 + up * PICKUP + (h > 0.01 && p === 0 ? Math.sin(time * 2.2) * 0.012 * h : 0) + (p >= 1 ? Math.sin(time * 1.1) * 0.02 : 0);
  b.lift.rotation.x = h * 0.03 * (1 - up) + up * 0.3;
  b.lift.rotation.z = h * 0.02 * (1 - up);
  const c = ease((p - 0.12) / 0.5);
  b.hinge.rotation.z = c * (Math.PI + 0.07);
  b.flips.forEach((f, i) => {
    const q = (p - (0.5 + i * 0.11)) / 0.34;
    f.mesh.visible = q > 0;
    if (q > 0 && q < 1.05) { bendPage(f, Math.min(1, q)); f.done = q >= 1; } else if (q >= 1.05 && !f.done) { bendPage(f, 1); f.done = true; }
    if (q <= 0) f.done = false;
  });
  const g = ease((p - 0.3) / 0.7);
  const flare = Math.sin(clamp01((p - 0.3) / 0.7) * Math.PI);          // swells as it opens, settles so the page stays readable
  b.glow.material.opacity = g * 0.05 + flare * 0.34;
  b.light.intensity = g * 3.5 + flare * 14 + h * 1.6 * (1 - g);
  b.pageMat.emissiveIntensity = g * 0.03 + flare * 0.14;
  b.artMat.emissiveIntensity = 0.04 + h * 0.2;
  // a slow gold breath under each book says "this one can be picked up"
  const breath = (0.16 + 0.09 * Math.sin(time * 1.5 + b.W * b.def.pages)) * (1 - h) * (1 - up) * b.invite;
  b.halo.material.opacity = breath + h * 0.9 * (1 - up) + g * 0.3;
  b.sparks.visible = g > 0.01;
  b.sparks.material.uniforms.uAmt.value = g; b.sparks.material.uniforms.uTime.value = time;
}

// ---------------------------------------------------------------- world

export function buildWorld({ renderer, surfaces, tier, books: bookDefs, tall = false }) {
  const lite = tier === 'lite';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04040c);

  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.12;
  pm.dispose();

  const mats = makeMaterials();
  const glow = TX.glowTexture(128);
  const shared = {
    glow, soft: TX.softGlowTexture(),
    brass: new THREE.MeshStandardMaterial({ color: 0xc79a3e, metalness: 1, roughness: 0.32, envMapIntensity: 3 }),
    wax: new THREE.MeshStandardMaterial({ color: 0xcdbd98, roughness: 0.5, emissive: 0xff8a3a, emissiveMap: TX.waxGlowTexture(), emissiveIntensity: 0 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 1 }),
    flameGeo: new THREE.PlaneGeometry(0.15, 0.38).translate(0, 0.19, 0),
    pageEdge: TX.pageEdgeTexture(),
    print: [TX.printedPageTexture(3), TX.printedPageTexture(8), TX.printedPageTexture(15)],
  };

  // ---- table
  const wood = TX.woodTextures(lite ? 768 : 1024);
  const tableMat = new THREE.MeshPhysicalMaterial({ map: wood.map, bumpMap: wood.bump, bumpScale: 1.4, roughness: 0.46, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.35, envMapIntensity: 1.6 });
  const table = new THREE.Mesh(new RoundedBoxGeometry(18, 0.7, 12, 3, 0.09), tableMat);
  table.position.y = -0.35; table.receiveShadow = true; scene.add(table);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0c0907, roughness: 1 }));
  floor.position.y = -7.4; scene.add(floor);

  // ---- battle map
  const matTex = TX.battleMatTexture(lite ? 1024 : 1536, lite ? 598 : 896);
  const cloth = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 1 });
  const mat = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.03, 5.6), [cloth, cloth, new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.94 }), cloth, cloth, cloth]);
  const MAT = new THREE.Vector3(0.3, 0, -1.9);
  mat.position.set(MAT.x, 0.015, MAT.z); mat.receiveShadow = true; mat.castShadow = true; scene.add(mat);

  const land = new THREE.Group(); scene.add(land);
  land.add(buildTerrain(mats));
  // each mini is its own object (js/minis.js), so it can move
  const miniCtx = { builder: new Builder(21), mats };
  const minis = MINIS.map((def) => {
    const obj = def.loader(miniCtx);
    const pivot = new THREE.Group();
    pivot.position.set(def.position[0], 0.03, def.position[1]); pivot.rotation.set(0, def.rotation, 0, 'YXZ'); pivot.scale.setScalar(def.scale ?? 1);
    pivot.add(obj); land.add(pivot);
    return { def, obj, pivot, home: pivot.position.clone(), yaw: def.rotation };
  });

  // ---- GM screen
  const screen = new THREE.Group(); screen.position.set(0.3, 0, -5.15); scene.add(screen);
  const backMat = new THREE.MeshStandardMaterial({ color: 0x0a0a22, roughness: 0.7 });
  const panel = (w, hgt, tex) => {
    const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.05 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, 0.05), [backMat, backMat, backMat, backMat, face, backMat]);
    m.castShadow = true; m.receiveShadow = true; return m;
  };
  const SH = 2.05, CW = SH * (1280 / 760);
  const centre = panel(CW, SH, surfaces.get('screen').texture); centre.position.y = SH / 2; screen.add(centre);
  for (const side of [-1, 1]) {
    const c = makeCanvas(640, 760); paintWing(c.getContext('2d'), 640, 760, side < 0 ? 'hope' : 'fear');
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const ww = SH * (640 / 760), wing = panel(ww, SH, t);
    const pivot = new THREE.Group(); pivot.position.set(side * CW / 2, SH / 2, 0); pivot.rotation.y = -side * 0.62;
    wing.position.x = side * ww / 2; pivot.add(wing); screen.add(pivot);
  }

  // ---- books
  const books = bookDefs.map((d) => { const b = makeBook(d, surfaces, shared); scene.add(b.root); return b; });

  // ---- the duality dice and their tokens, between the books
  // The dice themselves are made and moved by dice3d.js (they are the ones that get rolled);
  // this only says where they start: the Duality d12s in the rolling area, the rest in the tray (below).
  const atlas = TX.diceAtlas();
  const ra = ROLL_AREA[tall ? 'tall' : 'wide'];       // they lie in the rolling area between rolls
  const tableDice = {
    duality: [
      { role: 'hope', x: ra.x - 0.6, z: ra.z - 0.1, up: 11, spin: 0.5, seed: 3 },
      { role: 'fear', x: ra.x + 0.55, z: ra.z + 0.12, up: 7, spin: 2.2, seed: 9 },
    ],
    floor: 0,
  };

  const props = new Builder(77);
  // hope tokens (gold) and fear tokens (dark glass)
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, d = 0.1 + (i % 4) * 0.085;
    props.part(new THREE.CylinderGeometry(0.105, 0.105, 0.022, 20), { p: [-0.5 + Math.cos(a) * d - (tall ? 1.0 : 0), 0.011 + (i > 5 ? 0.022 : 0), 3.85 + Math.sin(a) * d * 0.9 + (tall ? 1.05 : 0)], r: [0, i, i > 5 ? 0.12 : 0], c: 0xffc542, m: 'metal' });
  }
  // pencil
  props.at({ p: [-5.25, 0.04, 4.55], r: [0, 0.35, 0] }, (b) => {
    b.part(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), { r: [0, 0, Math.PI / 2], c: 0xe0a422 });
    b.part(new THREE.ConeGeometry(0.04, 0.14, 6), { p: [0.82, 0, 0], r: [0, 0, -Math.PI / 2], c: 0xd9b88a });
    b.part(new THREE.ConeGeometry(0.014, 0.05, 6), { p: [0.865, 0, 0], r: [0, 0, -Math.PI / 2], c: 0x222222 });
    b.part(new THREE.CylinderGeometry(0.042, 0.042, 0.09, 8), { p: [-0.78, 0, 0], r: [0, 0, Math.PI / 2], c: 0xc0c4cc, m: 'metal' });
    b.part(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8), { p: [-0.86, 0, 0], r: [0, 0, Math.PI / 2], c: 0xd9707a });
  });
  // dice tray: a low hexagonal leather tray
  props.at({ p: [5.75, 0, 1.25], r: [0, 0.26, 0] }, (b) => {
    b.part(new THREE.CylinderGeometry(1.22, 1.22, 0.04, 6), { p: [0, 0.02, 0], c: 0x15331f });
    for (let i = 0; i < 6; i++) {
      const a = (i + 0.5) * Math.PI / 3 + Math.PI / 6, rr = 1.22 * Math.cos(Math.PI / 6);
      b.part(new THREE.BoxGeometry(1.28, 0.24, 0.07), { p: [Math.sin(a) * rr, 0.12, Math.cos(a) * rr], r: [0, a, 0], c: 0x3d2413 });
      b.part(new THREE.SphereGeometry(0.03, 8, 6), { p: [Math.sin(a - Math.PI / 6) * 1.23, 0.2, Math.cos(a - Math.PI / 6) * 1.23], c: 0xd0a850, m: 'metal' });
    }
  });
  // tankard
  props.at({ p: [-7.4, 0, 2.0] }, (b) => {
    const pts = [[0, 0], [0.34, 0], [0.36, 0.05], [0.31, 0.1], [0.3, 0.74], [0.335, 0.8], [0.3, 0.8], [0.27, 0.74], [0.27, 0.12], [0, 0.1]].map((p) => new THREE.Vector2(p[0], p[1]));
    b.part(new THREE.LatheGeometry(pts, 24), { c: 0xb8b4aa, m: 'metal' });
    b.part(new THREE.TorusGeometry(0.2, 0.035, 8, 16, Math.PI), { p: [0.3, 0.44, 0], r: [0, 0, -Math.PI / 2], c: 0xb8b4aa, m: 'metal' });
    b.part(new THREE.CylinderGeometry(0.268, 0.268, 0.01, 20), { p: [0, 0.66, 0], c: 0x3a1c0a });
  });
  scene.add(props.build(mats));

  // fear tokens: glass beads
  const beadMat = new THREE.MeshPhysicalMaterial({ color: 0x2a0f66, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04, emissive: 0x3a12a0, emissiveIntensity: 0.25, envMapIntensity: 3 });
  const beadGeo = new THREE.SphereGeometry(0.1, 16, 10).scale(1, 0.48, 1);
  [[0.72, 3.9], [0.95, 3.72], [0.5, 3.62], [0.78, 3.55], [1.05, 3.98], [0.6, 4.1], [0.86, 3.84]].forEach(([x, z], i) => {
    const m = new THREE.Mesh(beadGeo, beadMat); m.position.set(x - 0.55 + (tall ? 1.1 : 0), i === 6 ? 0.13 : 0.048, z + 0.25 + (tall ? 0.85 : 0)); m.castShadow = true; scene.add(m);
  });

  // dice in the tray (its floor is at y = 0.04)
  tableDice.tray = { x: 5.75, z: 1.25, y: 0.04, r: 1.0, dice: [
    { type: 'd20', r: 0.25, color: 0x1f7a6a, ink: 0xfdf3d0, x: 5.45, z: 1.05, up: 20, spin: 0.8, seed: 21 },
    { type: 'd8', r: 0.21, color: 0xb0302c, ink: 0xfdf3d0, x: 6.2, z: 0.85, up: 5, spin: 2.0, seed: 31 },
    { type: 'd6', r: 0.2, color: 0x2a4fb8, ink: 0xfdf3d0, x: 5.9, z: 1.75, up: 6, spin: 0.4, seed: 41 },
    { type: 'd6', r: 0.2, color: 0xe6e0d0, ink: 0x1a1a22, x: 5.2, z: 1.7, up: 3, spin: 1.3, seed: 51 },
    { type: 'd8', r: 0.21, color: 0x6a2a9a, ink: 0xfdf3d0, x: 6.35, z: 1.5, up: 2, spin: 4.0, seed: 61 },
  ] };

  // cards: a deck and a fanned hand
  const backTex = TX.cardBackTexture();
  const white = new THREE.MeshStandardMaterial({ color: 0xf3ead2, roughness: 0.7 });
  const backMatCard = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.5 });
  const CWd = 0.66, CH = 0.92;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(CWd, 0.2, CH), [white, white, backMatCard, white, white, white]);
  deck.position.set(4.35, 0.1, 3.75); deck.rotation.y = 0.3; deck.castShadow = deck.receiveShadow = true; scene.add(deck);
  for (let i = 0; i < 4; i++) {
    const face = new THREE.MeshStandardMaterial({ map: TX.cardFaceTexture(i), roughness: 0.48 });
    const c = new THREE.Mesh(new THREE.BoxGeometry(CWd, 0.006, CH), [white, white, face, backMatCard, white, white]);
    const a = -0.42 + i * 0.26;
    c.position.set(5.95 + Math.sin(a) * 0.95, 0.006 + i * 0.007, 4.55 - Math.cos(a) * 0.95); c.rotation.y = -a;
    c.castShadow = c.receiveShadow = true; scene.add(c);
  }

  // the note (the character's attack card), a little curled
  let note;
  {
    const g = new THREE.PlaneGeometry(2.05, 2.05 * (400 / 560), 12, 8).rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, 0.012 + Math.pow(Math.abs(x) / 1.02, 3) * 0.07 + Math.pow(Math.max(0, z) / 0.73, 3) * 0.035); }
    g.computeVertexNormals();
    note = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: surfaces.get('note').texture, roughness: 0.88, side: THREE.DoubleSide }));
    note.position.set(-5.55, 0, 3.55); note.rotation.y = 0.2; note.castShadow = true; note.receiveShadow = true; scene.add(note);
  }

  // ---- candles
  const candleDefs = [
    { x: -6.55, z: -1.15, h: 1.55, r: 0.21, seed: 1, power: 6 },
    { x: -5.9, z: -0.6, h: 0.95, r: 0.24, seed: 2, power: 4.5 },
    { x: -6.75, z: -0.25, h: 0.58, r: 0.19, seed: 3, power: 3 },
    { x: -4.55, z: 1.95, h: 0.42, r: 0.26, seed: 4, power: 4.5 },
    { x: 7.0, z: -1.9, h: 1.25, r: 0.22, seed: 5, power: 6 },
    { x: 6.45, z: -2.55, h: 0.7, r: 0.2, seed: 6, power: 3.5 },
    { x: 3.45, z: 4.95, h: 0.36, r: 0.25, seed: 7, power: 3.2 },
  ];
  const candles = candleDefs.map((d) => { const c = makeCandle(d, shared); scene.add(c.group); return c; });

  // ---- light
  scene.add(new THREE.HemisphereLight(0x39407e, 0x1c120a, 0.7));
  const lamp = new THREE.SpotLight(0xffd6a0, 0, 40, 0.66, 0.85, 2);
  lamp.position.set(0.6, 12.5, 2.6); lamp.target.position.set(0.2, 0, 0.6);
  lamp.castShadow = true; lamp.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  lamp.shadow.camera.near = 5; lamp.shadow.camera.far = 20; lamp.shadow.bias = -0.0004; lamp.shadow.normalBias = 0.018; lamp.shadow.radius = 4;
  lamp.shadow.autoUpdate = false; lamp.shadow.needsUpdate = true;
  scene.add(lamp, lamp.target);
  const rim = new THREE.DirectionalLight(0x5468ff, 0.55); rim.position.set(-7, 6, -9); scene.add(rim);
  const crystalLight = new THREE.PointLight(0x55c8ff, 0, 7, 2); crystalLight.position.set(land.position.x + 3.35, 0.95, land.position.z - 2.6); scene.add(crystalLight);
  const crystalLight2 = new THREE.PointLight(0x9a5cff, 0, 5, 2); crystalLight2.position.set(land.position.x + 2.7, 0.7, land.position.z - 2.1); scene.add(crystalLight2);

  // ---- air: dust in the lamplight, and far-off lights out of focus
  const N = lite ? 120 : 320, dp = new Float32Array(N * 3), ds = new Float32Array(N * 3), r = rng(404);
  for (let i = 0; i < N; i++) { dp[i * 3] = (r() - 0.5) * 17; dp[i * 3 + 1] = 0.3 + r() * 5.5; dp[i * 3 + 2] = (r() - 0.5) * 11 + 0.5; ds[i * 3] = r(); ds[i * 3 + 1] = r(); ds[i * 3 + 2] = r(); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('aSeed', new THREE.BufferAttribute(ds, 3));
  const dust = new THREE.Points(dg, new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uAmt: { value: 0 } },
    vertexShader: /* glsl */`attribute vec3 aSeed; uniform float uTime, uPx; varying float vA;
      void main() { vec3 p = position;
        p.x += sin(uTime * (0.07 + aSeed.x * 0.08) + aSeed.y * 40.0) * 0.6; p.y += sin(uTime * (0.05 + aSeed.y * 0.07) + aSeed.z * 40.0) * 0.4; p.z += cos(uTime * (0.06 + aSeed.z * 0.06) + aSeed.x * 40.0) * 0.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = uPx * (0.012 + aSeed.z * 0.026) / -mv.z;
        float inLamp = smoothstep(7.5, 2.0, length(p.xz - vec2(0.3, 1.0)));
        vA = (0.25 + 0.75 * inLamp) * (0.5 + 0.5 * sin(uTime * (0.6 + aSeed.x) + aSeed.y * 30.0)); }`,
    fragmentShader: /* glsl */`uniform float uAmt; varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d); gl_FragColor = vec4(vec3(1.0, 0.82, 0.58) * 1.3, a * vA * 0.38 * uAmt); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  dust.frustumCulled = false; scene.add(dust);

  const disc = TX.glowTexture(128, 0.72);
  const far = new THREE.Group(); scene.add(far);
  const br = rng(31);
  const tones = [0xffb062, 0xffd08a, 0xff8a4a, 0x8f7bff, 0xffc070, 0x5fb8ff];
  for (let i = 0; i < (lite ? 14 : 26); i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, color: new THREE.Color(tones[i % tones.length]).multiplyScalar(0.5 + br() * 0.9), transparent: true, opacity: 0.08 + br() * 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
    const sd = i % 2 ? 1 : -1; s.position.set(sd * (13 + br() * 14), -3.5 + br() * 6.5, -24 + br() * 15); s.scale.setScalar(0.7 + br() * 1.5);
    s.userData.o = s.material.opacity; s.userData.ph = br() * 10; far.add(s);
  }

  // ---- per-frame
  const tmp = new THREE.Vector3();
  const world = {
    scene, books, candles, lamp, MAT, atlas, tableDice, minis, mats, note, intro: 0, lampPower: 330, moving: true, stirring: false, frame: 0, candleShadows: true,
    focus: new THREE.Vector3(-0.2, 0.25, 2.2),
    update(time, dt, camera, pxScale) {
      const k = world.intro;                               // 0..1, lights coming up
      const n = world.frame++;
      // shadow maps are the expensive part: redraw the lamp's only while something moves,
      // and take turns on the candles (their flicker hides the lower rate)
      if (world.moving || world.stirring || n < 4) lamp.shadow.needsUpdate = true;   // stirring: dice or a mini moving; candles keep their slow turns
      lamp.intensity = world.lampPower * ease(k * 1.2);
      dust.material.uniforms.uTime.value = time; dust.material.uniforms.uPx.value = pxScale; dust.material.uniforms.uAmt.value = ease(k);
      let waxGlow = 0;
      candles.forEach((c, i) => {
        const lit = ease((k * (candles.length + 3) - i) / 3);
        c.lit = lit;
        const s = c.seed * 7.13;
        const f = 0.84 + 0.1 * Math.sin(time * 9.1 + s) + 0.06 * Math.sin(time * 23.7 + s * 2.0) + 0.05 * Math.sin(time * 4.3 + s * 3.0);
        c.light.intensity = c.power * f * lit;
        if (c.light.castShadow) { c.light.shadow.needsUpdate = world.candleShadows && (world.moving || (n + i) % 3 === 0 || n < 4); }
        c.light.position.set(c.base.x + Math.sin(time * 6.0 + s) * 0.012, c.base.y + Math.sin(time * 11.0 + s) * 0.01, c.base.z + Math.cos(time * 7.0 + s) * 0.012);
        c.flame.material.uniforms.uTime.value = time; c.flame.material.uniforms.uLit.value = lit;
        c.flame.scale.setScalar(0.2 + 0.8 * lit);
        c.group.getWorldPosition(tmp);
        c.flame.rotation.y = Math.atan2(camera.position.x - tmp.x, camera.position.z - tmp.z);
        c.halo.material.opacity = 0.085 * f * lit;
        waxGlow = Math.max(waxGlow, lit);
      });
      shared.wax.emissiveIntensity = 0.11 * waxGlow;
      const pulse = 0.85 + 0.15 * Math.sin(time * 1.3);
      crystalLight.intensity = CRYSTAL.light * pulse * ease(k); crystalLight2.intensity = CRYSTAL.light2 * (1.7 - pulse) * ease(k);
      mats.crystal.emissiveIntensity = CRYSTAL.glow + CRYSTAL.pulse * pulse; mats.crystal2.emissiveIntensity = CRYSTAL.glow2 + CRYSTAL.pulse * (1.7 - pulse);
      far.children.forEach((s) => { s.material.opacity = s.userData.o * (0.75 + 0.25 * Math.sin(time * 0.7 + s.userData.ph)) * ease(k); });
      books.forEach((b) => { b.invite = ease(k * 2 - 1); b.sparks.material.uniforms.uPx.value = pxScale; poseBook(b, time); });
    },
  };
  return world;
}
