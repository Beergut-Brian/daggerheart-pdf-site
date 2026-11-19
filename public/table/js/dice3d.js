// Thrown dice. The result is decided first (dice-logic.js); this only animates a
// hand-tuned throw (arc, bounces, damped spin) that ends with the rolled value up.
import * as THREE from '../vendor/three.bundle.js';
import { makeDie } from './models.js';
import { rng as seededRng, contactShadowTexture } from './textures.js';

export const DIE_STYLE = {
  hope: { color: 0xf0a820, ink: 0x2a1400 },
  fear: { color: 0x5a23c8, ink: 0xf3cf72 },     // gold ink on the violet resin
  bone: { color: 0xe6e0d0, ink: 0x1a1a22 },
};
const RADIUS = { d4: 0.33, d6: 0.25, d8: 0.27, d10: 0.28, d12: 0.27, d20: 0.3 };

// Open table in front of the party, on the battle map (top at y = 0.03), clear of minis and boulders.
const AREA = { x0: -1.25, x1: 2.55, z0: -0.3, z1: 0.72, y: 0.03 };
const AVOID = [[0.9, 0.2, 0.2], [1.9, 0.3, 0.32], [3.3, -0.2, 0.3]];
// contact shadow: a soft dark blob on the table under each die, wider and fainter as it lifts
const SHADOW = { size: 2.7, opacity: 0.62, fadeH: 0.9, spreadK: 0.9 };
// tall phones (height / width above TALL_ASPECT): bigger dice and a wider throw
export const TALL_ASPECT = 1.8, TALL_SCALE = 1.3;
const THROW_MS = 1150, HOLD_MS = 4000, CLEAR_MS = 450, SWAP_MS = 200;

const UP = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);

function lowest(hull, q) {
  let m = Infinity;
  for (const p of hull) { _v.copy(p).applyQuaternion(q); if (_v.y < m) m = _v.y; }
  return m;
}

// vertical offset above resting: a fall, then bounces of falling height
const BOUNCES = [[0, 0.36, -1], [0.36, 0.58, 0.32], [0.58, 0.72, 0.11], [0.72, 0.8, 0.035]];
function hop(t, h0) {
  for (const [a, b, h] of BOUNCES) {
    if (t < a || t >= b) continue;
    const u = (t - a) / (b - a);
    return h < 0 ? h0 * (1 - u * u) : 4 * h * u * (1 - u);
  }
  return 0;
}

// the rolled number lights up once the die is still, so it reads at a glance even when a
// side face is turned more toward the viewer than the top one
const GLOW = { hope: new THREE.Color(1.9, 1.45, 0.75), fear: new THREE.Color(1.5, 1.15, 2.4), bone: new THREE.Color(1.8, 1.35, 0.6) };

function glowMarks(die, value, style, atlas) {
  const out = [];
  for (const mk of die.userData.marks) {
    if (mk.num !== value) continue;
    const g = new THREE.PlaneGeometry(mk.size * 1.04, mk.size * 1.04);
    const num = value - 1, cu = num % 5, cv = Math.floor(num / 5), uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (cu + uv.getX(k)) / 5, 1 - (cv + 1 - uv.getY(k)) / 4);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: atlas, color: GLOW[style] || GLOW.bone, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    m.position.copy(mk.pos).addScaledVector(mk.n, 0.003); m.quaternion.copy(mk.q);
    die.add(m); out.push(m);
  }
  return out;
}

// and a small number floats above each die once it is still, facing the viewer
function badge(value, style, atlas) {
  const t = atlas.clone();
  const num = value - 1;
  t.repeat.set(1 / 5, 1 / 4); t.offset.set((num % 5) / 5, 1 - (Math.floor(num / 5) + 1) / 4);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color: GLOW[style] || GLOW.bone, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  s.renderOrder = 5; s.scale.setScalar(0.3);
  return s;
}

export function createDice({ scene, atlas, calm, lite = false, clock = () => performance.now(), view = null, scale = () => 1 }) {
  const group = new THREE.Group(); scene.add(group);
  let live = [], state = 'idle', t0 = 0, clearAt = 0, pending = null, seed = 1, spareFrames = 0, onRest = null, restAt = 0;
  const r = seededRng(9001);
  const shadowTex = contactShadowTexture(), shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  let big = 1;

  function place(list) {
    const out = [], n = list.length;
    const cx = n <= 2 ? 0.55 : (AREA.x0 + AREA.x1) / 2, cz = 0.28;
    for (const d of list) {
      const rad = RADIUS[d.type] * (n > 8 ? 0.85 : 1) * big;
      let best = null, bestScore = Infinity;
      for (let i = 0; i < 160; i++) {
        const spread = (n <= 2 ? 0.55 : 1) * big;
        const x = cx + (r() - 0.5) * (AREA.x1 - AREA.x0) * spread, z = cz + (r() - 0.5) * (AREA.z1 - AREA.z0);
        if (x < AREA.x0 || x > AREA.x1 || z < AREA.z0 || z > AREA.z1) continue;
        let clash = 0;
        for (const [ax, az, ar] of AVOID) clash += Math.max(0, ar + rad - Math.hypot(x - ax, z - az));
        for (const o of out) clash += Math.max(0, o.rad + rad + 0.08 - Math.hypot(x - o.x, z - o.z)) * 4;
        const score = clash * 100 + Math.hypot(x - cx, (z - cz) * 1.6) * 0.3;
        if (score < bestScore) { bestScore = score; best = { x, z, rad }; }
      }
      out.push(best);
    }
    // the Hope die on the left, the Fear die on the right, as on the GM screen
    if (n === 2 && list[0].style === 'hope' && out[0].x > out[1].x) out.reverse();
    return out;
  }

  function spawn(list) {
    big = scale();
    const spots = place(list);
    live = list.map((d, i) => {
      const st = DIE_STYLE[d.style || 'bone'], rad = spots[i].rad;
      const die = makeDie(d.type, rad, st.color, st.ink, atlas, { seed: seed++, resin: lite ? 'lite' : 'full' });
      const ud = die.userData, face = ud.faces.find((f) => f.value === d.value);
      // final orientation: rolled value up, its number upright for the viewer (pointing away, -z)
      const tilt = new THREE.Quaternion().setFromUnitVectors(face.n, UP);
      const end = new THREE.Vector3(spots[i].x, AREA.y, spots[i].z);
      let yaw = r() * 6.28;
      if (face.up) {
        // the number upright for the viewer (within 30 degrees), turned so no side face looks at them square on
        _v.copy(face.up).applyQuaternion(tilt);
        const upright = Math.PI - Math.atan2(_v.x, _v.z);
        const eye = view ? view().clone().sub(end).normalize() : new THREE.Vector3(0, 0.7, 0.7).normalize();
        let best = Infinity;
        for (let k = -6; k <= 6; k++) {
          const y = upright + (k / 6) * 0.52;
          _q.setFromAxisAngle(UP, y).multiply(tilt);
          let side = -1;
          for (const f of ud.faces) if (f !== face) side = Math.max(side, _v.copy(f.n).applyQuaternion(_q).dot(eye));
          const cost = side + Math.abs(k) * 0.004;
          if (cost < best) { best = cost; yaw = y; }
        }
      }
      const qf = new THREE.Quaternion().setFromAxisAngle(UP, yaw).multiply(tilt);
      const start = end.clone().add(new THREE.Vector3((r() - 0.5) * 1.0 + (end.x - 0.6) * 0.25, 0, 2.1 + r() * 0.5));
      const axis = new THREE.Vector3(1, (r() - 0.5) * 0.6, (r() - 0.5) * 0.8).normalize();
      const wob = new THREE.Vector3(r() - 0.5, 0, r() - 0.5).normalize();
      group.add(die);
      const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTex, color: 0x000000, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
      shadow.renderOrder = 1; group.add(shadow);
      const tag = badge(d.value, d.style || 'bone', atlas); tag.position.copy(end); group.add(tag);
      return { die, tag, shadow, rad, spec: d, glow: glowMarks(die, d.value, d.style || 'bone', atlas), qf, end, start, axis, wob, spin: Math.PI * 2 * (1.4 + r() * 1.1), h0: 1.25 + r() * 0.5, delay: i * 35 + r() * 60, scale: 1 };
    });
  }

  function pose(L, t) {
    const { die } = L;
    if (t >= 1) { die.quaternion.copy(L.qf); die.position.copy(L.end); die.position.y -= lowest(die.userData.hull, L.qf); return; }
    const s = easeOut3(t);
    die.position.lerpVectors(L.start, L.end, s);
    const ts = Math.min(1, t / 0.8), theta = L.spin * Math.pow(1 - ts, 2.2);
    _q.setFromAxisAngle(L.axis, theta).multiply(L.qf);
    if (t > 0.72) {                                   // settle: rock on an edge and come to rest
      const u = (t - 0.72) / 0.28, a = 0.09 * Math.exp(-5 * u) * Math.sin(u * 19);
      _q.premultiply(_q2.setFromAxisAngle(L.wob, a));
    }
    die.quaternion.copy(_q);
    die.position.y = AREA.y + hop(t, L.h0) - lowest(die.userData.hull, _q);
  }

  function disposeAll() {
    for (const L of live) {
      group.remove(L.die, L.tag, L.shadow); L.tag.material.map.dispose(); L.tag.material.dispose(); L.shadow.material.dispose();
      L.die.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    }
    live = [];
  }

  // list: [{ type: 'd12', value: 7, style: 'hope' | 'fear' | 'bone' }]; done() runs once the dice are still
  function throwDice(list, done) {
    if (onRest) { const f = onRest; onRest = null; f(); }     // a roll still in the air reports now
    onRest = done || null;
    if (live.length && state !== 'idle') { state = 'swap'; t0 = clock(); pending = list; return; }
    start(list);
  }
  function start(list, at = clock()) {
    disposeAll();
    spawn(list);
    state = calm ? 'rest' : 'throw'; t0 = at; clearAt = t0 + (calm ? 0 : THROW_MS) + HOLD_MS;
    if (calm) { live.forEach((L) => pose(L, 1)); shade(); rested(); }
  }
  function rested() { restAt = clock(); spareFrames = 3; if (onRest) { const f = onRest; onRest = null; f(); } }

  // the shadow follows the die across the table, fading as it rises
  function shade() {
    for (const L of live) {
      const h = Math.max(0, L.die.position.y - AREA.y - L.rad * 0.55), k = Math.max(0, 1 - h / SHADOW.fadeH), sc = L.die.scale.x;
      L.shadow.position.set(L.die.position.x, AREA.y + 0.004, L.die.position.z);
      L.shadow.scale.setScalar(L.rad * SHADOW.size * (1 + h * SHADOW.spreadK) * sc);
      L.shadow.material.opacity = SHADOW.opacity * k * k * Math.min(1, sc * 1.5);
    }
  }
  function update(now = clock()) { step(now); shade(); }
  function step(now) {
    if (spareFrames > 0) spareFrames--;     // a few more shadow redraws after anything stops or vanishes
    if (state === 'idle') return;
    if (state === 'swap') {
      const u = Math.min(1, (now - t0) / SWAP_MS);
      live.forEach((L) => { L.die.scale.setScalar(Math.max(0.001, 1 - u)); });
      if (u < 1) return;
      start(pending, t0 + SWAP_MS);           // the throw starts where the swap ended, even across a big step
      if (state !== 'throw') return;
    }
    if (state === 'throw') {
      let all = true;
      for (const L of live) { const t = Math.max(0, (now - t0 - L.delay) / THROW_MS); pose(L, Math.min(1, t)); if (t < 1) all = false; }
      if (all) { state = 'rest'; rested(); }
      return;
    }
    if (state === 'rest') {
      const k = calm ? 1 : Math.min(1, (now - restAt) / 350);
      for (const L of live) {
        for (const m of L.glow) m.material.opacity = k * 0.85;
        L.tag.material.opacity = k; L.tag.position.copy(L.end).setY(L.end.y + L.rad * 2.1 + 0.12 + 0.06 * k);
      }
      if (now >= clearAt) { state = 'clear'; t0 = now; }
    }
    if (state === 'clear') {
      const u = Math.min(1, (now - t0) / CLEAR_MS);
      for (const L of live) { L.tag.material.opacity = 1 - u; L.die.scale.setScalar(Math.max(0.001, 1 - u * u)); L.die.position.y = L.end.y - lowest(L.die.userData.hull, L.qf) * (1 - u) - u * 0.05; }
      if (u >= 1) { disposeAll(); state = 'idle'; spareFrames = 3; }
    }
  }

  // debug: what each die shows, read from its current orientation
  function readUp() {
    return live.map((L) => {
      const ud = L.die.userData; let best = -2, value = null;
      for (const f of ud.faces) { _v.copy(f.n).applyQuaternion(L.die.quaternion); if (_v.y > best) { best = _v.y; value = f.value; } }
      return { type: ud.type, rolled: L.spec.value, up: value, style: L.spec.style || 'bone', tilt: +Math.acos(Math.min(1, best)).toFixed(4) };
    });
  }

  return {
    group, throwDice, update, readUp,
    get busy() { return state === 'throw' || state === 'swap' || state === 'clear' || spareFrames > 0; },
    get state() { return state; },
    get centre() { return new THREE.Vector3(live.length <= 2 ? 0.55 : (AREA.x0 + AREA.x1) / 2, 0.2, 0.28); },
  };
}
