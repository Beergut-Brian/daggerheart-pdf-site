// Thrown dice. The result is decided first (dice-logic.js); this only animates a
// hand-tuned throw (arc, bounces, damped spin) that ends with the rolled value up.
import * as THREE from '../vendor/three.bundle.js';
import { makeDie } from './models.js';
import { rng as seededRng } from './textures.js';

export const DIE_STYLE = {
  hope: { color: 0xf0a820, ink: 0x2a1400 },
  fear: { color: 0x5a23c8, ink: 0xf1e4ff },
  bone: { color: 0xe6e0d0, ink: 0x1a1a22 },
};
const RADIUS = { d4: 0.33, d6: 0.25, d8: 0.27, d10: 0.28, d12: 0.27, d20: 0.3 };

// Open table in front of the party, on the battle map (top at y = 0.03), clear of minis and boulders.
const AREA = { x0: -1.25, x1: 2.55, z0: -0.3, z1: 0.72, y: 0.03 };
const AVOID = [[0.9, 0.2, 0.2], [1.9, 0.3, 0.32], [3.3, -0.2, 0.3]];
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

export function createDice({ scene, atlas, calm, clock = () => performance.now() }) {
  const group = new THREE.Group(); scene.add(group);
  let live = [], state = 'idle', t0 = 0, clearAt = 0, pending = null, seed = 1, spareFrames = 0, onRest = null;
  const r = seededRng(9001);

  function place(list) {
    const out = [], n = list.length;
    const cx = n <= 2 ? 0.55 : (AREA.x0 + AREA.x1) / 2, cz = 0.28;
    for (const d of list) {
      const rad = RADIUS[d.type] * (n > 8 ? 0.85 : 1);
      let best = null, bestScore = Infinity;
      for (let i = 0; i < 160; i++) {
        const spread = n <= 2 ? 0.55 : 1;
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
    const spots = place(list);
    live = list.map((d, i) => {
      const st = DIE_STYLE[d.style || 'bone'], rad = spots[i].rad;
      const die = makeDie(d.type, rad, st.color, st.ink, atlas, { seed: seed++ });
      const ud = die.userData, face = ud.faces.find((f) => f.value === d.value);
      // final orientation: rolled value up, its number upright for the viewer (pointing away, -z)
      const tilt = new THREE.Quaternion().setFromUnitVectors(face.n, UP);
      let yaw = (r() - 0.5) * 0.5;
      if (face.up) { _v.copy(face.up).applyQuaternion(tilt); yaw += Math.PI - Math.atan2(_v.x, _v.z); } else yaw += r() * 6.28;
      const qf = new THREE.Quaternion().setFromAxisAngle(UP, yaw).multiply(tilt);
      const end = new THREE.Vector3(spots[i].x, AREA.y, spots[i].z);
      const start = end.clone().add(new THREE.Vector3((r() - 0.5) * 1.0 + (end.x - 0.6) * 0.25, 0, 2.1 + r() * 0.5));
      const axis = new THREE.Vector3(1, (r() - 0.5) * 0.6, (r() - 0.5) * 0.8).normalize();
      const wob = new THREE.Vector3(r() - 0.5, 0, r() - 0.5).normalize();
      group.add(die);
      return { die, spec: d, qf, end, start, axis, wob, spin: Math.PI * 2 * (1.4 + r() * 1.1), h0: 1.25 + r() * 0.5, delay: i * 35 + r() * 60, scale: 1 };
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
      group.remove(L.die);
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
  function start(list) {
    disposeAll();
    spawn(list);
    state = calm ? 'rest' : 'throw'; t0 = clock(); clearAt = t0 + (calm ? 0 : THROW_MS) + HOLD_MS;
    if (calm) { live.forEach((L) => pose(L, 1)); rested(); }
  }
  function rested() { if (onRest) { const f = onRest; onRest = null; f(); } }

  function update(now = clock()) {
    if (state === 'idle') { if (spareFrames > 0) spareFrames--; return; }
    if (state === 'swap') {
      const u = Math.min(1, (now - t0) / SWAP_MS);
      live.forEach((L) => { L.die.scale.setScalar(Math.max(0.001, 1 - u)); });
      if (u >= 1) start(pending);
      return;
    }
    if (state === 'throw') {
      let all = true;
      for (const L of live) { const t = Math.max(0, (now - t0 - L.delay) / THROW_MS); pose(L, Math.min(1, t)); if (t < 1) all = false; }
      if (all) { state = 'rest'; rested(); }
      return;
    }
    if (state === 'rest' && now >= clearAt) { state = 'clear'; t0 = now; }
    if (state === 'clear') {
      const u = Math.min(1, (now - t0) / CLEAR_MS);
      for (const L of live) { L.die.scale.setScalar(Math.max(0.001, 1 - u * u)); L.die.position.y = L.end.y - lowest(L.die.userData.hull, L.qf) * (1 - u) - u * 0.05; }
      if (u >= 1) { disposeAll(); state = 'idle'; spareFrames = 2; }
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
