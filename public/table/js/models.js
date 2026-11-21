// Hand-built models: miniatures, ruins, trees, crystals, dice.
// Everything is assembled from primitives and merged, so a whole warband
// costs a handful of draw calls.
import * as THREE from '../vendor/three.bundle.js';
import { rng, diceInkAtlas } from './textures.js';

const { mergeGeometries } = THREE;

// ---------------------------------------------------------------- builder

const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _c = new THREE.Color();

function compose(o) {
  const p = o.p || [0, 0, 0], r = o.r || [0, 0, 0];
  const s = o.s == null ? [1, 1, 1] : typeof o.s === 'number' ? [o.s, o.s, o.s] : o.s;
  _q.setFromEuler(_e.set(r[0], r[1], r[2]));
  return new THREE.Matrix4().compose(_p.set(p[0], p[1], p[2]), _q, _s.set(s[0], s[1], s[2]));
}

function h3(x, y, z, s) {
  const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 19.19) * 43758.5453;
  return v - Math.floor(v);
}

function jitter(g, amt, seed) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const kx = Math.round(x * 500), ky = Math.round(y * 500), kz = Math.round(z * 500);
    p.setXYZ(i, x + (h3(kx, ky, kz, seed) - 0.5) * 2 * amt, y + (h3(ky, kz, kx, seed + 3) - 0.5) * 2 * amt, z + (h3(kz, kx, ky, seed + 7) - 0.5) * 2 * amt);
  }
}

export class Builder {
  constructor(seed = 1) { this.b = {}; this.m = new THREE.Matrix4(); this.r = rng(seed); this.n = 0; }

  at(t, fn) {
    const keep = this.m.clone();
    this.m.multiply(compose(t));
    fn(this);
    this.m.copy(keep);
    return this;
  }

  // o: { p, r, s, c (hex), m (material bucket), jit (jitter amount), v (tone variance) }
  part(geo, o = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (o.jit) jitter(g, o.jit, ++this.n);
    g.applyMatrix4(this.m.clone().multiply(compose(o)));
    if (o.jit) g.computeVertexNormals();
    g.deleteAttribute('uv');
    _c.set(o.c == null ? 0xffffff : o.c);
    if (o.v) { const k = 1 + (this.r() - 0.5) * 2 * o.v; _c.multiplyScalar(k); }
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    (this.b[o.m || 'paint'] ||= []).push(g);
    geo.dispose();
    return this;
  }

  build(mats, { cast = true, receive = true } = {}) {
    const group = new THREE.Group();
    for (const k in this.b) {
      const merged = mergeGeometries(this.b[k], false);
      this.b[k].forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, mats[k]);
      mesh.castShadow = cast && k !== 'glow'; mesh.receiveShadow = receive && k !== 'glow';
      group.add(mesh);
    }
    return group;
  }
}

export function makeMaterials() {
  return {
    paint: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58, metalness: 0, side: THREE.DoubleSide }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.92 }),
    stone: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0, flatShading: true }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.0, 2.0, 2.0) }),
    crystal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.16, metalness: 0.1, flatShading: true, emissive: 0x1f7fe0, emissiveIntensity: 0.7 }),
    crystal2: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.16, metalness: 0.1, flatShading: true, emissive: 0x6a2de0, emissiveIntensity: 0.6 }),
  };
}

// shorthand geometry
const cyl = (rt, rb, h, seg = 12, open = false, t0 = 0, tl = Math.PI * 2) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, t0, tl);
const sph = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
const box = (w, h, d, s = 1) => new THREE.BoxGeometry(w, h, d, s, s, s);
const cone = (r, h, seg = 10) => new THREE.ConeGeometry(r, h, seg);
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
const oct = (r) => new THREE.OctahedronGeometry(r, 0);
const tor = (r, t, a = Math.PI * 2) => new THREE.TorusGeometry(r, t, 6, 20, a);

// ---------------------------------------------------------------- miniatures

function miniBase(b, r, top) {
  b.part(cyl(r * 0.96, r * 1.05, 0.05, 22), { p: [0, 0.025, 0], c: 0x0b0b0f });
  b.part(cyl(r * 0.9, r * 0.9, 0.014, 22), { p: [0, 0.055, 0], c: top, m: 'stone' });
  for (let i = 0; i < 4; i++) {
    const a = b.r() * 6.28, d = r * (0.45 + b.r() * 0.35);
    b.part(ico(0.016 + b.r() * 0.018), { p: [Math.cos(a) * d, 0.066, Math.sin(a) * d], c: 0x8a8a84, m: 'stone', jit: 0.004, v: 0.2 });
  }
}

const sword = (len = 0.24, blade = 0xdfe6f2) => (b) => {
  b.part(cyl(0.011, 0.011, 0.07, 6), { p: [0, 0, 0], r: [Math.PI / 2, 0, 0], c: 0x3a2412 });
  b.part(box(0.085, 0.016, 0.016), { p: [0, 0, 0.04], c: 0xc9a45a, m: 'metal' });
  b.part(box(0.03, 0.008, len), { p: [0, 0, 0.045 + len / 2], c: blade, m: 'metal' });
  b.part(cone(0.016, 0.04, 4), { p: [0, 0, 0.045 + len + 0.018], r: [Math.PI / 2, Math.PI / 4, 0], s: [1, 1, 0.3], c: blade, m: 'metal' });
  b.part(sph(0.016, 6, 5), { p: [0, 0, -0.04], c: 0xc9a45a, m: 'metal' });
};
const shield = (c, rim = 0xc9a45a) => (b) => {
  b.part(cyl(0.085, 0.085, 0.016, 14), { p: [0.02, 0, 0.03], r: [0, 0, Math.PI / 2], c });
  b.part(cyl(0.09, 0.09, 0.01, 14), { p: [0.016, 0, 0.03], r: [0, 0, Math.PI / 2], c: rim, m: 'metal' });
  b.part(sph(0.024, 8, 6), { p: [0.032, 0, 0.03], c: rim, m: 'metal' });
};
function skeleton(b, pose = 0) {
  const bone = 0xe6dfc6, dark = 0x28221e;
  for (const sx of [-1, 1]) {
    b.part(cyl(0.014, 0.014, 0.17, 5), { p: [sx * 0.04, 0.15, 0], c: bone });
    b.part(box(0.03, 0.02, 0.06), { p: [sx * 0.04, 0.07, 0.015], c: bone });
  }
  b.part(box(0.1, 0.03, 0.05), { p: [0, 0.24, 0], c: bone });
  b.part(cyl(0.012, 0.012, 0.12, 5), { p: [0, 0.3, 0], c: bone });
  for (let i = 0; i < 3; i++) b.part(tor(0.045 - i * 0.004, 0.007), { p: [0, 0.285 + i * 0.03, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.75, 1], c: bone });
  b.part(box(0.14, 0.02, 0.03), { p: [0, 0.365, 0], c: bone });
  const arms = pose ? [[-1.9, 0, -0.3], [-0.4, 0, 0.5]] : [[-1.1, 0, -0.5], [-0.9, 0, 0.6]];
  [-1, 1].forEach((sx, i) => b.at({ p: [sx * 0.075, 0.365, 0], r: arms[i] }, () => {
    b.part(cyl(0.011, 0.011, 0.15, 5), { p: [0, -0.075, 0], c: bone });
    b.at({ p: [0, -0.155, 0] }, () => (sx < 0 ? sword(0.2, 0x9a8f80)(b) : shield(0x3a3028, 0x7a6a50)(b)));
  }));
  b.part(sph(0.055, 12, 10), { p: [0, 0.435, 0.004], s: [1, 1.05, 1.08], c: bone });
  b.part(box(0.05, 0.035, 0.04), { p: [0, 0.39, 0.024], c: bone });
  for (const sx of [-1, 1]) b.part(sph(0.015, 6, 5), { p: [sx * 0.022, 0.44, 0.052], c: dark });
}

// The figures, for js/minis.js. Each builds at the origin, facing +z, on its base.
export const FIGURES = {
  skeleton: (b) => skeleton(b, 0),
  skeletonRaised: (b) => skeleton(b, 1),
};

// One mini as its own object: base + figure merged per material, so each mini
// is still only a few draw calls. Pass the same Builder for every mini to keep
// the random details (pebbles, rock jitter) identical from build to build.
export function buildMini(b, mats, figure, baseR, top) {
  b.b = {};
  b.at({ p: [0, 0, 0] }, () => { miniBase(b, baseR, top); b.at({ p: [0, 0.012, 0] }, () => figure(b)); });
  return b.build(mats);
}

// ---------------------------------------------------------------- terrain

export function buildTerrain(mats) {
  const b = new Builder(5);
  const STONE = [0x6c6f76, 0x5a5e66, 0x7a776d, 0x4f535b, 0x66705e];
  const blk = (w, h, d, p, r = [0, 0, 0], c = null) =>
    b.part(box(w, h, d, 2), { p, r, c: c ?? STONE[Math.floor(b.r() * STONE.length)], m: 'stone', jit: Math.min(w, h, d) * 0.1, v: 0.1 });

  // a run of courses between two points; profile(t) gives the height in courses
  const wall = (x0, z0, x1, z1, profile) => {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(-(z1 - z0), x1 - x0);
    const bw = 0.34, bh = 0.2, n = Math.max(1, Math.round(len / bw));
    for (let row = 0; row < 7; row++) {
      for (let i = 0; i < n + (row % 2); i++) {
        const t = (i + (row % 2 ? 0 : 0.5)) / (n + 0.5);
        if (row >= profile(t)) continue;
        const w = bw * (0.86 + b.r() * 0.22);
        const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
        blk(w, bh * (0.9 + b.r() * 0.16), 0.3, [x, 0.03 + bh * (row + 0.5), z], [(b.r() - 0.5) * 0.05, ang + (b.r() - 0.5) * 0.08, (b.r() - 0.5) * 0.05]);
      }
    }
  };
  const pillar = (x, z, hgt, fallen = 0) => b.at({ p: [x, 0.03, z], r: fallen ? [Math.PI / 2 - 0.06, 0, fallen] : [0, b.r(), 0] }, () => {
    if (!fallen) blk(0.4, 0.12, 0.4, [0, 0.06, 0]);
    const drums = Math.round(hgt / 0.28);
    for (let i = 0; i < drums; i++) {
      b.part(cyl(0.135, 0.145, 0.27, 8), { p: [(b.r() - 0.5) * 0.02, (fallen ? 0.14 : 0.12) + 0.14 + i * 0.28, (b.r() - 0.5) * 0.02], r: [0, b.r() * 3, 0], c: STONE[i % 5], m: 'stone', jit: 0.012, v: 0.1 });
    }
    if (!fallen && hgt > 1) blk(0.38, 0.11, 0.38, [0, 0.12 + drums * 0.28 + 0.055, 0]);
  });

  // back wall with a window gap, and the west wall falling away toward the front
  wall(-3.95, -4.2, -0.5, -4.2, (t) => (t > 0.42 && t < 0.58 ? 2 : 5.2 - Math.abs(t - 0.35) * 3 + Math.sin(t * 19) * 0.9));
  wall(-3.98, -4.0, -3.98, -1.5, (t) => 5 - t * 4.6 + Math.sin(t * 13) * 0.7);
  // archway on the road side
  pillar(-0.5, -3.3, 0.86); pillar(-0.5, -2.2, 0.86);
  b.at({ p: [-0.5, 1.02, -2.75] }, () => {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (i / 8);
      blk(0.3, 0.19, 0.2, [0, Math.sin(a) * 0.56, Math.cos(a) * 0.56], [-(a - Math.PI / 2), 0, 0], i === 4 ? 0xa9a59a : null);
    }
  });
  pillar(-2.9, -3.1, 1.14); pillar(-2.0, -3.75, 0.58);
  pillar(-2.4, -1.25, 0.84, 0.5);
  // steps down to the road
  for (let i = 0; i < 3; i++) blk(0.9, 0.09, 0.26, [-1.75, 0.03 + 0.045 + i * 0.0, -1.62 + i * 0.27 - 0.27], [0, 0.12, 0]);
  for (let i = 0; i < 2; i++) blk(0.9 - i * 0.05, 0.09, 0.26, [-1.78, 0.03 + 0.135 + i * 0.09, -2.1 - i * 0.26], [0, 0.12, 0]);
  // rubble
  for (let i = 0; i < 26; i++) {
    const x = -3.9 + b.r() * 3.6, z = -4.0 + b.r() * 2.9, s = 0.05 + b.r() * 0.1;
    b.part(ico(s, 0), { p: [x, 0.03 + s * 0.5, z], r: [b.r() * 3, b.r() * 3, 0], s: [1, 0.7, 1.2], c: STONE[i % 4], m: 'stone', jit: s * 0.2, v: 0.14 });
  }
  // boulders elsewhere on the map
  for (const [x, z, s] of [[3.9, -0.3, 0.26], [4.25, -0.05, 0.15], [1.7, -3.9, 0.2], [-4.2, 0.1, 0.2], [0.9, 0.2, 0.11], [3.2, -3.6, 0.3], [-0.2, -4.1, 0.14]]) {
    b.part(ico(s, 1), { p: [x, 0.03 + s * 0.55, z], r: [b.r(), b.r() * 3, b.r()], s: [1.2, 0.8, 1], c: 0x70757c, m: 'stone', jit: s * 0.16, v: 0.12 });
  }

  // pines
  const pine = (x, z, hgt) => b.at({ p: [x, 0.03, z], r: [0, b.r() * 6, 0] }, () => {
    b.part(cyl(0.05, 0.085, hgt * 0.36, 7), { p: [0, hgt * 0.18, 0], c: 0x4a3220, m: 'stone', jit: 0.01 });
    const tiers = 5;
    for (let i = 0; i < tiers; i++) {
      const t = i / (tiers - 1), r = hgt * (0.3 - t * 0.2), h = hgt * 0.3;
      b.part(cone(r, h, 9), { p: [(b.r() - 0.5) * 0.03, hgt * (0.3 + t * 0.56), (b.r() - 0.5) * 0.03], r: [0, b.r() * 3, 0], c: [0x1f4a2c, 0x275a33, 0x2f6b3a, 0x1a3f28][i % 4], m: 'stone', jit: r * 0.13, v: 0.12 });
    }
  });
  pine(4.35, -4.0, 1.75); pine(4.85, -3.1, 1.35); pine(3.6, -4.35, 1.2); pine(5.0, -3.9, 1.0);
  pine(-4.35, -0.15, 1.3); pine(-4.75, 0.3, 0.95); pine(4.7, 0.25, 1.15);
  // undergrowth
  for (const [x, z] of [[4.15, -2.5], [3.3, -0.2], [-3.6, 0.2], [-4.6, -0.9], [1.9, 0.3], [4.9, -1.6], [0.6, -4.2]]) {
    for (let i = 0; i < 4; i++) {
      const s = 0.09 + b.r() * 0.09;
      b.part(ico(s, 1), { p: [x + (b.r() - 0.5) * 0.3, 0.03 + s * 0.6, z + (b.r() - 0.5) * 0.3], s: [1, 0.75, 1], c: [0x35692f, 0x3f7a35, 0x2c5a2c][i % 3], m: 'stone', jit: s * 0.2, v: 0.12 });
    }
  }

  // the crystal outcrop: the heart of the map (and of the site's artwork)
  const shard = (p, r, hgt, rot, m) => b.at({ p, r: rot }, () => {
    b.part(cyl(r * 0.82, r, hgt, 6), { p: [0, hgt / 2, 0], c: m === 'crystal' ? 0xa6e6ff : 0xcdb0ff, m, v: 0.06 });
    b.part(cone(r * 0.82, r * 1.7, 6), { p: [0, hgt + r * 0.85, 0], c: m === 'crystal' ? 0xdcf6ff : 0xe6d6ff, m });
  });
  const cx = 3.35, cz = -2.75;
  shard([cx, 0.03, cz], 0.17, 0.95, [0, 0.4, 0.05], 'crystal');
  shard([cx + 0.22, 0.03, cz + 0.12], 0.12, 0.6, [0.25, 0, -0.38], 'crystal2');
  shard([cx - 0.2, 0.03, cz + 0.1], 0.11, 0.52, [0.2, 0, 0.42], 'crystal');
  shard([cx + 0.05, 0.03, cz - 0.22], 0.13, 0.7, [-0.36, 0, -0.1], 'crystal');
  shard([cx - 0.14, 0.03, cz - 0.16], 0.08, 0.4, [-0.4, 0, 0.5], 'crystal2');
  shard([cx + 0.3, 0.03, cz - 0.1], 0.07, 0.3, [-0.1, 0, -0.8], 'crystal');
  shard([cx - 0.02, 0.03, cz + 0.28], 0.07, 0.26, [0.7, 0, 0.1], 'crystal2');
  for (let i = 0; i < 9; i++) {
    const a = b.r() * 6.28, d = 0.35 + b.r() * 0.25, s = 0.06 + b.r() * 0.07;
    b.part(ico(s, 0), { p: [cx + Math.cos(a) * d, 0.03 + s * 0.5, cz + Math.sin(a) * d], r: [b.r(), b.r(), 0], c: 0x565c68, m: 'stone', jit: s * 0.2, v: 0.12 });
  }

  // a chest in the ruin, lid ajar
  b.at({ p: [-3.2, 0.03, -3.55], r: [0, 0.5, 0] }, () => {
    b.part(box(0.4, 0.2, 0.26), { p: [0, 0.1, 0], c: 0x5a3a1c });
    b.at({ p: [0, 0.2, -0.13], r: [-0.75, 0, 0] }, () => {
      b.part(cyl(0.13, 0.13, 0.4, 10, false, 0, Math.PI), { p: [0, 0, 0.13], r: [0, 0, Math.PI / 2], c: 0x6a4420 });
    });
    for (const x of [-0.14, 0.14]) b.part(box(0.035, 0.21, 0.27), { p: [x, 0.1, 0], c: 0xd0a850, m: 'metal' });
    b.part(box(0.36, 0.05, 0.22), { p: [0, 0.19, 0], c: 0xffc94d, m: 'metal' });
    for (let i = 0; i < 12; i++) b.part(cyl(0.028, 0.028, 0.008, 8), { p: [(b.r() - 0.5) * 0.3, 0.22 + b.r() * 0.02, (b.r() - 0.5) * 0.16], r: [b.r() * 0.6, 0, b.r() * 0.6], c: 0xffc94d, m: 'metal' });
    for (let i = 0; i < 7; i++) b.part(cyl(0.028, 0.028, 0.008, 8), { p: [0.1 + b.r() * 0.3, 0.006, 0.2 + b.r() * 0.2], r: [0, 0, 0], c: 0xffc94d, m: 'metal' });
  });
  return b.build(mats);
}

// ---------------------------------------------------------------- dice

const PHI = (1 + Math.sqrt(5)) / 2;
function signs(list) {
  const out = [];
  for (const v of list) {
    const idx = [0, 1, 2].filter((i) => v[i] !== 0);
    for (let m = 0; m < 1 << idx.length; m++) {
      const w = v.slice(); idx.forEach((i, k) => { if (m & (1 << k)) w[i] = -w[i]; }); out.push(w);
    }
  }
  return out.map((v) => new THREE.Vector3(...v).normalize());
}
// d4: a tetrahedron; it rests on a face and the value is read at the top vertex,
// so its "faces" here are the vertex directions, and each face carries three numbers.
const D4_V = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]].map((v) => new THREE.Vector3(...v).normalize());
function d4Decals(r, order) {
  const out = [];
  D4_V.forEach((vk, k) => {
    const n = vk.clone().negate(), c = n.clone().multiplyScalar(r / 3);
    D4_V.forEach((vj, j) => {
      if (j === k) return;
      const to = vj.clone().multiplyScalar(r).sub(c);
      out.push({ n, pos: c.clone().addScaledVector(to, 0.47), up: to.normalize(), num: order[j], size: r * 0.5 });
    });
  });
  return out;
}

// d10: a pentagonal trapezohedron (ten kites). Apexes at +-1, two rings of five at
// +-z, the lower ring turned 36 degrees; h = z (1 + cos36) / (1 - cos36) keeps each kite flat.
const D10 = (() => {
  const c36 = Math.cos(Math.PI / 5), h = 1, z = h * (1 - c36) / (1 + c36);
  const U = (k) => new THREE.Vector3(Math.cos(k * 2 * Math.PI / 5), z, Math.sin(k * 2 * Math.PI / 5));
  const L = (k) => new THREE.Vector3(Math.cos((k + 0.5) * 2 * Math.PI / 5), -z, Math.sin((k + 0.5) * 2 * Math.PI / 5));
  const T = new THREE.Vector3(0, h, 0), B = new THREE.Vector3(0, -h, 0);
  const kites = [];
  for (let k = 0; k < 5; k++) kites.push([T, U(k), L(k), U(k + 1)]);       // apex, side, far tip, side
  for (let k = 0; k < 5; k++) kites.push([B, L(k), U(k + 1), L(k + 1)]);
  const n = kites.map(([a, b, , d]) => {
    const v = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
    return v.dot(a.clone().add(b).add(d)) < 0 ? v.negate() : v;
  });
  return { kites, n };
})();
function d10Geo(r) {
  const pos = [];
  D10.kites.forEach(([a, b, c, d], i) => {
    const tri = (p, q, w) => {
      const nn = new THREE.Vector3().subVectors(q, p).cross(new THREE.Vector3().subVectors(w, p));
      const list = nn.dot(D10.n[i]) < 0 ? [p, w, q] : [p, q, w];
      list.forEach((v) => pos.push(v.x * r, v.y * r, v.z * r));
    };
    tri(a, b, c); tri(a, c, d);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
function d10Decals(r, order) {
  return D10.kites.map(([a, , c], i) => {
    const pos = a.clone().lerp(c, 0.6).multiplyScalar(r);
    const n = D10.n[i];
    const up = a.clone().sub(c); up.addScaledVector(n, -up.dot(n)).normalize();
    return { n, pos, up, num: order[i], size: r * 0.5 };
  });
}

const FACES = {
  d4: { n: D4_V, inr: 1 / 3, decal: 0.5, geo: (r) => new THREE.TetrahedronGeometry(r, 0), decals: d4Decals },
  d10: { n: D10.n, inr: 0, decal: 0.5, geo: d10Geo, decals: d10Decals },
  d12: { n: signs([[1, 0, PHI], [PHI, 1, 0], [0, PHI, 1]]), inr: 0.7947, decal: 0.62, geo: (r) => new THREE.DodecahedronGeometry(r, 0) },
  d20: { n: signs([[1, 1, 1], [0, PHI, 1 / PHI], [1 / PHI, 0, PHI], [PHI, 1 / PHI, 0]]), inr: 0.7947, decal: 0.4, geo: (r) => new THREE.IcosahedronGeometry(r, 0) },
  d8: { n: signs([[1, 1, 1]]), inr: 0.5774, decal: 0.52, geo: (r) => new THREE.OctahedronGeometry(r, 0) },
  d6: { n: signs([[1, 0, 0], [0, 1, 0], [0, 0, 1]]), inr: 0.5774, decal: 0.62, geo: (r) => new THREE.BoxGeometry(r * 1.1547, r * 1.1547, r * 1.1547) },
};
export const DIE_TYPES = Object.keys(FACES);

// Resin dice. Full tier: real transmission with a tinted attenuation (light passes through and
// picks up the colour); lite tier: no transmission, a clearcoat over a sheen and an inner glow.
export const RESIN = {
  full: { transmission: 0.9, thicknessK: 1.6, attenuationK: 0.9, ior: 1.5, roughness: 0.08, emissive: 0.04, env: 1.0 },
  lite: { sheen: 0.7, sheenRoughness: 0.35, roughness: 0.18, emissive: 0.16 },
  clearcoat: 1, clearcoatRoughness: 0.05,
};
export const GLYPH_SCALE = 1.2;          // numbers on the faces, against the old printed size
let INK = null;                           // the engraved number atlas, shared by every die

export function resinMaterial(color, r, tier, depth = 1, glow = null) {
  const c = new THREE.Color(color), base = { color: c, metalness: 0, clearcoat: RESIN.clearcoat, clearcoatRoughness: RESIN.clearcoatRoughness, flatShading: true, envMapIntensity: 2.2, emissive: c };
  if (tier === 'full') {
    const F = RESIN.full;
    return new THREE.MeshPhysicalMaterial({ ...base, roughness: F.roughness, transmission: F.transmission, thickness: r * F.thicknessK, ior: F.ior,
      attenuationColor: c, attenuationDistance: r * F.attenuationK * depth, emissiveIntensity: glow ?? F.emissive, envMapIntensity: F.env });
  }
  const L = RESIN.lite;
  return new THREE.MeshPhysicalMaterial({ ...base, roughness: L.roughness, sheen: L.sheen, sheenRoughness: L.sheenRoughness,
    sheenColor: c.clone().lerp(new THREE.Color(1, 1, 1), 0.55), emissiveIntensity: L.emissive });
}

// Swaps a die's resin material ('full' | 'lite'): the opening runs on lite, the transmission pass starts once settled.
export function swapResin(group, tier) {
  const body = group.children.find((c) => c.userData.resin);
  if (!body || body.userData.tier === tier) return;
  const a = body.userData.resin; body.material.dispose();
  body.material = resinMaterial(a.color, a.r, tier, a.depth, a.glow); body.userData.tier = tier;
}

// One die, already "rolled": it sits on a face with `up` showing.
// resin: 'full' | 'lite' (see RESIN); the tray dice stay on 'lite'.
export function makeDie(type, r, color, ink, atlas, { up = null, spin = 0, seed = 1, resin = 'lite', depth = 1, glow = null } = {}) {
  const F = FACES[type], rand = rng(seed);
  const group = new THREE.Group();
  const body = new THREE.Mesh(F.geo(r), resinMaterial(color, r, resin, depth, glow)); body.userData.tier = resin;
  body.castShadow = true; body.receiveShadow = true;
  body.userData.resin = { color, r, depth, glow };   // so the material can be swapped (swapResin)
  group.add(body);
  // numbers
  const order = F.n.map((_, i) => i + 1);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  let topIdx = 0, best = -2;
  const sitOn = F.n[Math.floor(rand() * F.n.length)];
  F.n.forEach((n, i) => { const d = -n.dot(sitOn); if (d > best) { best = d; topIdx = i; } });
  if (up != null) { const k = order.indexOf(up); [order[k], order[topIdx]] = [order[topIdx], order[k]]; }
  const geos = [], q = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1), yAxis = new THREE.Vector3(0, 1, 0), m = new THREE.Matrix4();
  const ups = [], marks = [];
  const decalAt = (n, pos, num0, size, up) => {
    size *= GLYPH_SCALE;
    const g = new THREE.PlaneGeometry(size, size);
    const num = num0 - 1, cu = num % 5, cv = Math.floor(num / 5), uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (cu + uv.getX(k)) / 5, 1 - (cv + 1 - uv.getY(k)) / 4);
    if (up) q.setFromRotationMatrix(m.makeBasis(new THREE.Vector3().crossVectors(up, n), up, n));
    else q.setFromUnitVectors(zAxis, n);
    g.applyMatrix4(m.compose(pos.clone().addScaledVector(n, 0.0015), q, new THREE.Vector3(1, 1, 1)));
    geos.push(g);
    marks.push({ num: num0, n, pos: pos.clone(), q: q.clone(), size });
    return yAxis.clone().applyQuaternion(q);
  };
  if (F.decals) F.decals(r, order).forEach((d, i) => { const u = decalAt(d.n, d.pos, d.num, d.size, d.up); if (type === 'd10') ups[i] = u; });
  else F.n.forEach((n, i) => { ups[i] = decalAt(n, n.clone().multiplyScalar(r * F.inr), order[i], r * F.decal, null); });
  // engraved: lit ink with a groove and a bump, so the face catches the candlelight around each number
  if (!INK) INK = diceInkAtlas();
  const inkC = new THREE.Color(ink), light = inkC.getHSL({}).l > 0.5;
  const decals = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ map: INK.map, bumpMap: INK.bump, bumpScale: -2.2, color: inkC,
    emissive: inkC, emissiveMap: INK.map, emissiveIntensity: light ? 0.45 : 0, roughness: 0.55, metalness: light ? 0.35 : 0,
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  group.add(decals);
  const tilt = new THREE.Quaternion().setFromUnitVectors(sitOn, new THREE.Vector3(0, -1, 0));
  const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin);
  group.quaternion.copy(yaw.multiply(tilt));
  group.userData.rest = r * F.inr;
  // for rolling: which direction points up when each value shows, and the hull to keep it on the table
  group.userData.type = type;
  group.userData.faces = F.n.map((n, i) => ({ n, value: order[i], up: ups[i] || null }));
  group.userData.marks = marks;      // every printed number: where it sits and which way it faces
  const pa = body.geometry.attributes.position, seen = new Set(), hull = [];
  for (let i = 0; i < pa.count; i++) {
    const key = pa.getX(i).toFixed(4) + ',' + pa.getY(i).toFixed(4) + ',' + pa.getZ(i).toFixed(4);
    if (!seen.has(key)) { seen.add(key); hull.push(new THREE.Vector3(pa.getX(i), pa.getY(i), pa.getZ(i))); }
  }
  group.userData.hull = hull;
  group.position.y = r * F.inr;
  return group;
}
