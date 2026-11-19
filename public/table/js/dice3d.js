// The dice on the table, and their rolls. The result is decided first (dice-logic.js); this only
// animates it: the dice already lying out are picked up (a short rise and a shake in the air),
// thrown (arc, bounces, damped spin) and land with the rolled value up, then stay where they land.
// The Duality d12s never leave the table; other dice come out of the tray (its own dice first,
// then extra teal dice) and go back into it once the result has shown. Which die a roll uses and
// where it may land: dice-table.js (pure, unit-tested).
import * as THREE from '../vendor/three.bundle.js';
import { makeDie } from './models.js';
import { rng as seededRng, contactShadowTexture } from './textures.js';
import { assignDice, clampSpot, clash, bounceInto } from './dice-table.js';

// ---- tunables (times are on the game clock, ms)
const LIFT_MS = 420;          // pick-up: rise from where the die lies to the throwing hand
const LIFT = { back: 0.45, backRand: 0.25, toward: 0.2, shake: 0.045, shakeTurn: 0.22, shakeHz: 11, riseUntil: 0.45 };   // back: hand this far toward the viewer from the landing spot (kept inside the rolling area)
const THROW_MS = 1150;        // the throw: tumble, bounces, settle
const STAGGER_MS = 35, JITTER_MS = 60;    // per-die start offsets so they do not move as one
const HOLD_MS = 2600;         // result showing (tags lit) before the tray's dice go back and the tags fade
const RETURN_MS = 700, RETURN_ARC = 0.7;  // borrowed dice hop back into the tray (extras fade there)
const TAG_IN_MS = 350, TAG_OUT_MS = 400;
const CROWD = 8, CROWD_SCALE = 0.85;      // more dice than this in one roll: each a bit smaller

export const DIE_STYLE = {
  hope: { color: 0xf4b62a, ink: 0x2a1400, depth: 3.2, glow: 0.12 },   // depth: a longer light path keeps it gold, not amber
  fear: { color: 0x5a23c8, ink: 0xf3cf72 },     // gold ink on the violet resin
  bone: { color: 0x1d8f8a, ink: 0xf3cf72, depth: 1.4 },      // plain dice: smoky teal resin, gold ink
};
const RADIUS = { d4: 0.33, d6: 0.25, d8: 0.27, d10: 0.28, d12: 0.27, d20: 0.3 };

// The rolling area (config.js ROLL_AREA, as bounds): open wood in front of the books. It is only a bound,
// nothing is drawn. Throws aim into it, dice rebound off its edges and rest inside it.
const WALL_BOUNCE = 0.55;     // share of throws that hit an edge on the way (when one is close enough)
const WALL_NEAR = 1.0;        // ... and the landing spot is at most this far from that edge
// contact shadow: a soft dark blob on the table under each die, wider and fainter as it lifts
const SHADOW = { size: 3.6, opacity: 0.95, fadeH: 0.9, spreadK: 0.9, toCamera: 0.45, lift: 0.008 };   // toCamera: offset (x radius) so it shows past the die
// tall phones (height / width above TALL_ASPECT): bigger dice and a wider throw
export const TALL_ASPECT = 1.8, TALL_SCALE = 1.3;
// depth of field: focus follows the dice from the throw until this long after they settle
const FOCUS_HOLD_MS = 1600;

const _s = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);

function lowest(hull, q, s = 1) {
  let m = Infinity;
  for (const p of hull) { _v.copy(p).applyQuaternion(q); if (_v.y < m) m = _v.y; }
  return m * s;
}
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

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

// table: world.tableDice ({ duality: [{ role, x, z, up, spin, seed }], floor, tray: { x, z, y, r, dice: [...] } })
export function createDice({ scene, atlas, table = null, area: AREA = { x0: -3.2, x1: 3.2, z0: 4.55, z1: 5.85 }, calm, lite = false, clock = () => performance.now(), view = null, scale = () => 1 }) {
  const group = new THREE.Group(); scene.add(group);
  const r = seededRng(9001);
  const shadowTex = contactShadowTexture(), shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const TRAY = table?.tray || { x: 5.75, z: 1.25, y: 0.04, r: 1.0, dice: [] };
  const FLOOR = table?.floor ?? 0;
  let all = [], roll = null, seed = 1, nextId = 1, spareFrames = 0, onRest = null;

  // the table top under a point: the tray's floor or the bare table
  const floorAt = (x, z) => (Math.hypot(x - TRAY.x, z - TRAY.z) < TRAY.r * 1.1 ? TRAY.y
    : FLOOR);
  const restY = (D, x, z, q, s) => floorAt(x, z) - lowest(D.die.userData.hull, q, s);

  function addDie({ type, r: baseR = RADIUS[type], color, ink, style = 'bone', kind, role = null, x, z, up = null, spin = 0, s = 1, resin }) {
    const st = DIE_STYLE[style] || DIE_STYLE.bone;
    const die = makeDie(type, baseR, color ?? st.color, ink ?? st.ink, atlas, { up, spin, seed: seed++, resin: resin || (lite ? 'lite' : 'full'), depth: st.depth, glow: st.glow });
    die.scale.setScalar(s);
    die.position.set(x, 0, z); die.position.y = restY({ die }, x, z, die.quaternion, s);
    const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTex, color: 0x000000, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
    shadow.renderOrder = 1; group.add(die, shadow);
    const D = { id: nextId++, die, shadow, type, kind, role, style, baseR, phase: 'rest', home: kind === 'tray' ? { x, z } : null, out: kind !== 'tray', tag: null, glow: [], spec: null };
    all.push(D); return D;
  }
  // the Duality d12s where world.js puts them, the tray's own dice (they keep the 'lite' resin)
  const big0 = scale();
  for (const d of table?.duality || []) addDie({ type: 'd12', style: d.role, kind: 'duality', role: d.role, x: d.x, z: d.z, up: d.up, spin: d.spin, s: big0 });
  for (const d of TRAY.dice) addDie({ ...d, kind: 'tray', resin: 'lite' });

  function dropMarks(D) {
    if (D.tag) { group.remove(D.tag); D.tag.material.map.dispose(); D.tag.material.dispose(); D.tag = null; }
    for (const m of D.glow) { D.die.remove(m); m.geometry.dispose(); m.material.dispose(); }
    D.glow = [];
  }
  function dispose(D) {
    dropMarks(D); group.remove(D.die, D.shadow); D.shadow.material.dispose();
    D.die.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    D.phase = 'gone'; all = all.filter((o) => o !== D);
  }

  // where each die of a roll lands: inside the rolling area, clear of the dice already lying there
  // and of each other
  function place(list, others) {
    const out = [], n = list.length;
    const cx = (AREA.x0 + AREA.x1) / 2, cz = (AREA.z0 + AREA.z1) / 2;
    for (const D of list) {
      const rad = D.rad;
      let best = null, bestScore = Infinity;
      for (let i = 0; i < 160; i++) {
        const spread = n <= 2 ? 0.45 : 1;
        const c = clampSpot({ x: cx + (r() - 0.5) * (AREA.x1 - AREA.x0) * spread, z: cz + (r() - 0.5) * (AREA.z1 - AREA.z0) }, rad, AREA);
        const sc = clash(c.x, c.z, rad + 0.04, others)
          + clash(c.x, c.z, rad + 0.08, out.map((o) => [o.x, o.z, o.rad])) * 4;
        const score = sc * 100 + Math.hypot(c.x - cx, (c.z - cz) * 1.6) * 0.3;
        if (score < bestScore) { bestScore = score; best = { x: c.x, z: c.z, rad }; }
      }
      out.push(best);
    }
    // the Hope die on the left, the Fear die on the right, as on the GM screen
    if (n === 2 && list[0].role === 'hope' && out[0].x > out[1].x) out.reverse();
    return out;
  }
  // a free spot in the tray (for dice that appear there)
  function traySpot(rad, taken) {
    let best = { x: TRAY.x, z: TRAY.z }, bestScore = Infinity;
    for (let i = 0; i < 60; i++) {
      const a = r() * 6.283, d = Math.sqrt(r()) * (TRAY.r * 0.8 - rad);
      const x = TRAY.x + Math.cos(a) * d, z = TRAY.z + Math.sin(a) * d, sc = clash(x, z, rad + 0.03, taken);
      if (sc < bestScore) { bestScore = sc; best = { x, z }; }
      if (sc === 0) break;
    }
    taken.push([best.x, best.z, rad]);
    return best;
  }

  // the orientation that shows `value` up, its number upright for the viewer
  function facing(D, value, at) {
    const ud = D.die.userData, face = ud.faces.find((f) => f.value === value);
    const tilt = new THREE.Quaternion().setFromUnitVectors(face.n, UP);
    let yaw = r() * 6.28;
    if (face.up) {
      // the number upright for the viewer (within 30 degrees), turned so no side face looks at them square on
      _v.copy(face.up).applyQuaternion(tilt);
      const upright = Math.PI - Math.atan2(_v.x, _v.z);
      const eye = view ? view().clone().sub(at).normalize() : new THREE.Vector3(0, 0.7, 0.7).normalize();
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
    return new THREE.Quaternion().setFromAxisAngle(UP, yaw).multiply(tilt);
  }

  // list: [{ type: 'd12', value: 7, style: 'hope' | 'fear' | 'bone' }]; done() runs once the dice are still
  function throwDice(list, done) {
    if (onRest) { const f = onRest; onRest = null; f(); }     // a roll still in the air reports now
    onRest = done || null;
    const now = clock(), big = scale();
    if (roll) for (const D of roll.dice) dropMarks(D);
    // which dice lying out (or in the tray) answer this roll; null: a new one from the tray
    const pool = all.filter((D) => D.phase !== 'gone').map((D) => ({ id: D.id, type: D.type, kind: D.kind, role: D.role, out: D.out }));
    const ids = assignDice(list.map((d) => ({ type: d.type, style: d.style || 'bone' })), pool);
    const taken = all.filter((D) => D.kind !== 'duality' && !D.out).map((D) => [D.die.position.x, D.die.position.z, D.baseR * D.die.scale.x]);
    const dice = list.map((d, i) => {
      let D = ids[i] && all.find((o) => o.id === ids[i]);
      if (!D) {
        const s = traySpot(RADIUS[d.type], taken);
        D = addDie({ type: d.type, kind: 'extra', x: s.x, z: s.z, s: calm ? big : 0.001 });
        D.out = false;
      }
      D.spec = d; return D;
    });
    // the borrowed dice of the last roll that this one does not use go back now
    if (roll) for (const D of roll.dice) if (!dice.includes(D) && D.kind !== 'duality' && D.phase !== 'gone') goHome(D, now);
    roll = { dice, t0: now, restAt: null, held: false, over: false };
    for (const D of dice) { D.big = big; D.sc = (RADIUS[D.type] / D.baseR) * big * (dice.length > CROWD ? CROWD_SCALE : 1); D.rad = D.baseR * D.sc; }

    if (calm) {
      // reduced motion: each die turns to its result where it lies
      for (const D of dice) {
        const p = D.die.position, s = D.kind === 'extra' ? D.sc : D.die.scale.x;
        D.qf = facing(D, D.spec.value, p);
        D.die.quaternion.copy(D.qf); D.die.scale.setScalar(s); D.die.position.y = restY(D, p.x, p.z, D.qf, s);
        D.end = D.die.position.clone(); D.phase = 'rest';
      }
      marks(); shade(); rested(now); return;
    }
    const others = all.filter((D) => !dice.includes(D) && D.out).map((D) => { const e = D.phase === 'throw' || D.phase === 'lift' ? D.end : D.die.position; return [e.x, e.z, D.baseR * (D.sc || D.die.scale.x)]; });
    const spots = place(dice, others);
    dice.forEach((D, i) => {
      const end = new THREE.Vector3(spots[i].x, 0, spots[i].z);
      D.qf = facing(D, D.spec.value, end.clone().setY(FLOOR));
      end.y = FLOOR;
      const p0 = D.die.position;
      D.p0 = p0.clone(); D.q0 = D.die.quaternion.clone(); D.s0 = D.die.scale.x;
      D.end = end; D.h0 = 1.25 + r() * 0.5;
      // the hand is inside the area too (a die lying elsewhere rises toward it)
      const hand = clampSpot({ x: p0.x + (end.x - p0.x) * LIFT.toward + (r() - 0.5) * 0.3, z: end.z + LIFT.back + r() * LIFT.backRand }, D.rad, AREA);
      D.start = new THREE.Vector3(hand.x, 0, hand.z);
      // some throws carry on past the landing spot into the nearest edge and rebound off it (pose() folds the path back in)
      D.via = end.clone();
      const lx = AREA.x0 + D.rad, hx = AREA.x1 - D.rad, lz = AREA.z0 + D.rad, hz = AREA.z1 - D.rad;
      if (r() < WALL_BOUNCE) {
        const wx = end.x >= D.start.x ? hx : lx;
        if (Math.abs(end.x - wx) < WALL_NEAR) D.via.x = 2 * wx - end.x;
      }
      if (r() < WALL_BOUNCE * 0.6) {
        const wz = end.z >= D.start.z ? hz : lz;
        if (Math.abs(end.z - wz) < WALL_NEAR * 0.5) D.via.z = 2 * wz - end.z;
      }
      D.axis = new THREE.Vector3(1, (r() - 0.5) * 0.6, (r() - 0.5) * 0.8).normalize();
      D.wob = new THREE.Vector3(r() - 0.5, 0, r() - 0.5).normalize();
      D.spin = Math.PI * 2 * (1.4 + r() * 1.1);
      D.qs = new THREE.Quaternion().setFromAxisAngle(D.axis, D.spin).multiply(D.qf);      // the throw's first pose
      D.t0 = now; D.delay = i * STAGGER_MS + r() * JITTER_MS; D.phase = 'lift'; D.out = true;
    });
  }
  function rested(now) { roll.restAt = now; spareFrames = 3; if (onRest) { const f = onRest; onRest = null; f(); } }

  // the lit number and the floating tag for each die of the roll
  function marks() {
    for (const D of roll.dice) {
      const st = D.spec.style || 'bone';
      D.glow = glowMarks(D.die, D.spec.value, st, atlas);
      D.tag = badge(D.spec.value, st, atlas); group.add(D.tag);
    }
  }

  function goHome(D, now) {
    dropMarks(D);
    D.p0 = D.die.position.clone(); D.q0 = D.die.quaternion.clone(); D.s0 = D.die.scale.x; D.rt0 = now;
    const taken = all.filter((o) => o !== D && o.kind !== 'duality' && !o.out).map((o) => [o.die.position.x, o.die.position.z, o.baseR * o.die.scale.x]);
    D.to = D.home ? { ...D.home } : traySpot(D.baseR * D.s0, taken);
    if (calm) { if (D.kind === 'extra') dispose(D); return; }
    D.phase = 'return';
  }

  // pick-up: rise toward the throwing hand, then a shake before the throw
  function lift(D, t) {
    const { die } = D, e = easeInOut(t), s = D.s0 + (D.sc - D.s0) * Math.min(1, t / LIFT.riseUntil);
    die.scale.setScalar(Math.max(0.001, s));
    die.quaternion.slerpQuaternions(D.q0, D.qs, e);
    const shake = Math.sin(Math.PI * smooth(LIFT.riseUntil, 1, t)) * (t > LIFT.riseUntil ? 1 : 0), w = Math.sin(t * LIFT_MS / 1000 * LIFT.shakeHz * 6.283);
    if (shake) die.quaternion.premultiply(_q2.setFromAxisAngle(D.wob, w * LIFT.shakeTurn * shake));
    const topY = FLOOR + D.h0 - lowest(die.userData.hull, D.qs, D.sc);
    die.position.set(D.p0.x + (D.start.x - D.p0.x) * e + w * LIFT.shake * shake, D.p0.y + (topY - D.p0.y) * easeOut3(Math.min(1, t / LIFT.riseUntil)), D.p0.z + (D.start.z - D.p0.z) * e);
  }
  function pose(D, t) {
    const { die } = D;
    die.scale.setScalar(D.sc);
    if (t >= 1) { die.quaternion.copy(D.qf); die.position.copy(D.end); die.position.y = restY(D, D.end.x, D.end.z, D.qf, D.sc); return; }
    const s = easeOut3(t);
    die.position.lerpVectors(D.start, D.via, s);
    const f = bounceInto(die.position, D.rad, AREA); die.position.x = f.x; die.position.z = f.z;
    const ts = Math.min(1, t / 0.8), theta = D.spin * Math.pow(1 - ts, 2.2);
    _q.setFromAxisAngle(D.axis, theta).multiply(D.qf);
    if (t > 0.72) {                                   // settle: rock on an edge and come to rest
      const u = (t - 0.72) / 0.28, a = 0.09 * Math.exp(-5 * u) * Math.sin(u * 19);
      _q.premultiply(_q2.setFromAxisAngle(D.wob, a));
    }
    die.quaternion.copy(_q);
    die.position.y = FLOOR + hop(t, D.h0) - lowest(die.userData.hull, _q, D.sc);
  }
  // back into the tray: a hop, rolled face still up; extras fade as they drop in
  function back(D, u) {
    const { die } = D, e = easeInOut(u);
    const s = D.kind === 'extra' ? D.s0 * (1 - smooth(0.45, 1, u)) : D.s0 + (1 - D.s0) * e;
    die.scale.setScalar(Math.max(0.001, s));
    const y1 = restY(D, D.to.x, D.to.z, D.q0, s);
    die.position.set(D.p0.x + (D.to.x - D.p0.x) * e, D.p0.y + (y1 - D.p0.y) * e + RETURN_ARC * Math.sin(Math.PI * u), D.p0.z + (D.to.z - D.p0.z) * e);
  }

  // the shadow follows the die across the table, fading as it rises
  function shade() {
    for (const D of all) {
      const sc = D.die.scale.x, rad = D.baseR * sc, fy = floorAt(D.die.position.x, D.die.position.z);
      const h = Math.max(0, D.die.position.y - fy - rad * 0.55), k = Math.max(0, 1 - h / SHADOW.fadeH);
      D.shadow.position.set(D.die.position.x, fy + SHADOW.lift, D.die.position.z);
      if (view) { _s.copy(view()).sub(D.shadow.position).setY(0); if (_s.lengthSq() > 1e-6) D.shadow.position.addScaledVector(_s.normalize(), rad * SHADOW.toCamera); }
      D.shadow.scale.setScalar(Math.max(0.001, rad * SHADOW.size * (1 + h * SHADOW.spreadK)));
      D.shadow.material.opacity = SHADOW.opacity * k * k * Math.min(1, sc / (D.sc || sc) * 1.5);
    }
  }
  function update(now = clock()) { step(now); shade(); }
  function step(now) {
    if (spareFrames > 0) spareFrames--;     // a few more shadow redraws after anything stops or vanishes
    for (const D of [...all]) {
      if (D.phase === 'lift' || D.phase === 'throw') {
        const e = now - D.t0 - D.delay;
        if (e < LIFT_MS) { D.phase = 'lift'; lift(D, Math.max(0, e) / LIFT_MS); }
        else if (e < LIFT_MS + THROW_MS) { D.phase = 'throw'; pose(D, (e - LIFT_MS) / THROW_MS); }
        else { pose(D, 1); D.phase = 'rest'; spareFrames = 3; }
      } else if (D.phase === 'return') {
        const u = Math.min(1, (now - D.rt0) / RETURN_MS);
        back(D, u);
        if (u >= 1) { if (D.kind === 'extra') dispose(D); else { D.phase = 'rest'; D.out = false; } spareFrames = 3; }
      }
    }
    if (!roll || roll.over) return;
    if (roll.restAt == null) {
      if (roll.dice.every((D) => D.phase === 'rest')) { marks(); rested(now); } else return;
    }
    const since = now - roll.restAt;
    const k = calm ? (since < HOLD_MS ? 1 : 0) : Math.min(1, since / TAG_IN_MS) * (1 - Math.min(1, Math.max(0, since - HOLD_MS) / TAG_OUT_MS));
    for (const D of roll.dice) {
      if (!D.tag) continue;
      for (const m of D.glow) m.material.opacity = k * 0.85;
      const rad = D.baseR * D.die.scale.x;
      D.tag.material.opacity = k; D.tag.position.copy(D.die.position).setY(D.end.y + rad * 2.1 + 0.12 + 0.06 * Math.min(1, since / TAG_IN_MS));
    }
    if (!roll.held && since >= HOLD_MS) {
      roll.held = true;
      for (const D of roll.dice) if (D.kind !== 'duality' && D.phase === 'rest') goHome(D, now);
    }
    if (since >= HOLD_MS + (calm ? 0 : TAG_OUT_MS)) { for (const D of roll.dice) dropMarks(D); roll.over = true; spareFrames = 3; }
  }

  // debug: what each die of the last roll shows, read from its current orientation
  function readUp() {
    if (!roll) return [];
    return roll.dice.filter((D) => D.phase !== 'gone').map((D) => {
      const ud = D.die.userData; let best = -2, value = null;
      for (const f of ud.faces) { _v.copy(f.n).applyQuaternion(D.die.quaternion); if (_v.y > best) { best = _v.y; value = f.value; } }
      return { type: ud.type, rolled: D.spec.value, up: value, style: D.spec.style || 'bone', tilt: +Math.acos(Math.min(1, best)).toFixed(4) };
    });
  }
  // every die on the table or in the tray (proofs)
  const where = () => all.map((D) => ({ type: D.type, kind: D.kind, role: D.role, out: D.out, phase: D.phase, x: +D.die.position.x.toFixed(3), y: +D.die.position.y.toFixed(3), z: +D.die.position.z.toFixed(3) }));

  // where the dice are, while they are worth looking at (for the depth-of-field focus); null otherwise
  const _f = new THREE.Vector3();
  function focus(now = clock()) {
    if (!roll || roll.over || (roll.restAt != null && now - roll.restAt > FOCUS_HOLD_MS)) return null;
    const live = roll.dice.filter((D) => D.phase !== 'gone');
    if (!live.length) return null;
    _f.set(0, 0, 0); for (const D of live) _f.add(D.die.position);
    return _f.multiplyScalar(1 / live.length);
  }

  const moving = () => all.some((D) => D.phase === 'lift' || D.phase === 'throw' || D.phase === 'return');
  return {
    group, throwDice, update, readUp, focus, where,
    get busy() { return moving() || (!!roll && !roll.over && roll.restAt != null && now() - roll.restAt < HOLD_MS + TAG_OUT_MS + TAG_IN_MS) || spareFrames > 0; },
    get state() {
      if (all.some((D) => D.phase === 'lift' || D.phase === 'throw')) return 'throw';
      if (all.some((D) => D.phase === 'return')) return 'return';
      return roll && !roll.over ? 'rest' : 'idle';
    },
    get centre() { return new THREE.Vector3((AREA.x0 + AREA.x1) / 2, 0.2, (AREA.z0 + AREA.z1) / 2); },
  };
  function now() { return clock(); }
}
