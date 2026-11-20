// A hero attacks the monster: wind-up, then a melee lunge or a ranged/magic bolt.
// Hit: the attack freezes for a beat (hit-stop), a small hot starburst and sparks at the point of
// contact, and the monster is knocked back, squashes and springs back.
// Miss: the lunge or bolt goes wide. Critical: a bigger burst, gold sparks, bigger knock-back.
// Everything runs on the game clock (`clock`, `update(now)`), so proofs can step it frame by frame.
import * as THREE from '../vendor/three.bundle.js';
import { rng, starburstTexture } from './textures.js';
import { swerveAround } from './pieces-logic.js';

// timings, seconds of game clock
const WIND = 0.25, LUNGE = 0.34, HOLD = 0.08, BACK = 0.5, BOLT_SPEED = 6.5;
const HITSTOP = 0.075;                                  // a hit freezes the attack (not the page) this long
const LEAN = { back: 0.3, forward: 0.5, hop: 0.1 };     // the hero's wind-up and lunge lean (radians), hop (units)
const KNOCK = { push: 0.17, tilt: 0.24, squash: 0.15, spring: 21, decay: 5.5, crit: 1.6 };
const FLASH = { tint: 0.18, emissive: 0.25, light: 1.8, decay: 16 };   // a short warm tint, not a glow over the whole monster
const BURST = { size: 0.62, grow: 0.5, life: 0.2, color: new THREE.Color(4.5, 3.7, 2.5), critColor: new THREE.Color(4.8, 3.8, 1.5) };
const SPARK = { full: 12, lite: 9, speed: 2.5, life: 0.42, gravity: 5.5, len: 0.09, width: 0.014,
  color: new THREE.Color(3.0, 2.0, 1.0), critColor: new THREE.Color(3.4, 2.6, 0.8) };
const MAGIC = { ring: 0.9, grow: 0.95, fade: 0.55, orb: 1.6 };   // magic: a ring spreads from the caster's feet, and the bolt is a bigger orb
const CRYSTAL_DIM = 0.55;                               // the monster's crystal glow, so its silhouette reads

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const angleTo = (a, b) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function createAttack({ scene, minis, calm, lite, clock = () => performance.now() }) {
  // `minis` can grow after start-up (the party's pieces load later), so the list is read each time; a plain /attack
  // takes the party in turn, a card row's attack comes from its own piece
  const heroList = () => minis.filter((m) => m.def.role === 'hero');
  const roundRobin = heroList;
  const target = minis.find((m) => m.def.target) || minis.find((m) => m.def.role === 'monster');
  if (!target) return null;
  let turn = 0, cur = null, tail = 0;
  const r = rng(77);

  // the monster gets its own materials, so its flash does not light the terrain; its crystals glow lower
  const flashMats = [];
  target.obj.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    if (o.material.emissive) {
      const lit = o.material.emissive.getHex() !== 0 && o.material.emissiveIntensity > 0;
      o.material.userData.base = { c: o.material.emissive.clone(), i: o.material.emissiveIntensity * (lit ? CRYSTAL_DIM : 1) };
      o.material.emissiveIntensity = o.material.userData.base.i;
      flashMats.push(o.material);
    }
  });
  const warm = new THREE.Color(0xff9a48);
  const tH = target.def.height ?? 0.6, tR = target.def.base?.r ?? 0.4;
  const tCentre = target.home.clone().setY(0.03 + tH * 0.55);
  const tScale = target.pivot.scale.clone();

  // one light for bolt and flash, always in the scene (adding lights later recompiles shaders)
  const light = new THREE.PointLight(0xffb060, 0, 3.2, 2);
  scene.add(light);
  const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
  const trail = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6).scale(1, 1, 3.4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false }));
  scene.add(bolt, trail);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  ring.renderOrder = 5; scene.add(ring);
  const burst = new THREE.Sprite(new THREE.SpriteMaterial({ map: starburstTexture(), color: BURST.color, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }));
  burst.renderOrder = 6; scene.add(burst);
  const sparkMat = new THREE.MeshBasicMaterial({ color: SPARK.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const sparkGeo = new THREE.BoxGeometry(1, 1, 1);
  const sparks = Array.from({ length: lite ? SPARK.lite : SPARK.full }, () => { const m = new THREE.Mesh(sparkGeo, sparkMat); m.renderOrder = 6; scene.add(m); return { m, v: new THREE.Vector3() }; });
  // the effects stay in the scene, shrunk to nothing inside the monster, so their shaders compile with
  // the first frame instead of stalling the first attack
  const park = () => {
    for (const o of [bolt, trail, ring, burst, ...sparks.map((s) => s.m)]) { o.position.copy(tCentre); o.scale.setScalar(1e-4); }
  };
  park();

  const v = new THREE.Vector3(), side = new THREE.Vector3(), _p = new THREE.Vector3(), _a = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);

  // hero: a mini id (a character's attack); otherwise round-robin through the party.
  // style / bolt: a per-attack override of the mini's own attack ('melee' | 'ranged' | 'magic').
  function play({ hit, critical, onImpact, hero: heroId = null, style = null, bolt: boltColor = null }) {
    if (cur) finish();
    const all = heroList(), rr = roundRobin(), chosen = heroId ? all.findIndex((m) => m.def.id === heroId) : -1;
    const hero = chosen >= 0 ? all[chosen] : rr.length ? rr[turn++ % rr.length] : null;
    // no piece yet (they load after the opening): the blow still counts, there is just nothing to animate
    if (!hero) { if (onImpact) onImpact(); return 0; }
    const to = v.subVectors(target.home, hero.home).setY(0), dist = to.length(), dir = to.clone().normalize();
    side.set(-dir.z, 0, dir.x).multiplyScalar(turn % 2 ? 1 : -1);
    const yaw0 = hero.pivot.rotation.y, face = angleTo(yaw0, Math.atan2(dir.x, dir.z));
    const ranged = (style || hero.def.attack) !== 'melee';
    // where the blow lands: the monster's near side, facing the hero
    const contact = tCentre.clone().addScaledVector(dir, -tR * 0.75);
    // where the swing or bolt ends: up to the monster, or wide of it
    const reach = Math.max(0.3, dist - tR - 0.2);
    const lungeTo = hero.home.clone().addScaledVector(dir, hit ? reach : reach * 0.8).addScaledVector(side, hit ? 0 : 0.5);
    const muzzle = hero.home.clone().setY(0.03 + (hero.def.muzzle ?? 0.42)).addScaledVector(dir, 0.14);
    const boltTo = hit ? contact.clone() : tCentre.clone().addScaledVector(side, 0.75).addScaledVector(dir, 0.6).setY(tCentre.y + 0.15);
    // a party piece's path bends around the others standing between it and the golem (a half sine, nothing at either end)
    const hr = (hero.def.base?.r ?? 0.2) * 0.8;
    const sw = hero.def.pc ? swerveAround(hero.home, ranged ? boltTo : lungeTo, all.filter((o) => o !== hero).map((o) => ({ x: o.home.x, z: o.home.z, r: (o.def.base?.r ?? 0.2) * 0.8 })), hr) : { x: 0, z: 0 };
    const swerve = new THREE.Vector3(sw.x, 0, sw.z);
    const flight = muzzle.distanceTo(boltTo) / BOLT_SPEED;
    // a party piece may start far from the golem: a long charge takes a little longer than the stand-ins' short one
    const lunge = hero.def.pc ? LUNGE + Math.max(0, reach - 1.5) * 0.1 : LUNGE;
    const impactAt = calm ? 0 : WIND + (ranged ? 0.05 + flight : lunge);
    const stop = hit && !calm ? HITSTOP : 0;
    // sparks fly back toward the hero and up, from the point of contact
    for (const s of sparks) {
      s.v.set(r() - 0.5, 0, r() - 0.5).multiplyScalar(1.4).addScaledVector(dir, -1).add(_a.set(0, 0.5 + r() * 0.9, 0)).normalize()
        .multiplyScalar(SPARK.speed * (0.55 + r() * 0.8) * (critical ? 1.35 : 1));
    }
    cur = {
      hero, hit, critical, onImpact, swerve, ranged, magic: (style || hero.def.attack) === 'magic', lunge, yaw0, face, dir, lungeTo, muzzle, boltTo, contact, impactAt, stop, t0: clock(), impacted: false, spin: r() * 6.28,
      color: new THREE.Color(boltColor ?? hero.def.bolt ?? 0xffc46a), end: impactAt + (calm ? 0.7 : Math.max(ranged ? 0.9 : HOLD + BACK + 0.3, 1.0)),
    };
    if (calm) impact();
    return (cur.end + stop) * 1000;
  }

  function impact() {
    const c = cur; c.impacted = true;
    if (c.onImpact) c.onImpact();
  }

  function finish() {
    const c = cur; cur = null; tail = 3;      // a few more shadow redraws with everyone home
    c.hero.pivot.position.copy(c.hero.home); c.hero.pivot.rotation.set(0, c.yaw0, 0);
    target.pivot.position.copy(target.home); target.pivot.rotation.set(0, target.yaw, 0, 'YXZ'); target.pivot.scale.copy(tScale);
    flashMats.forEach((m) => { m.emissive.copy(m.userData.base.c); m.emissiveIntensity = m.userData.base.i; });
    light.intensity = 0; ring.material.opacity = 0; park();
    if (!c.impacted && c.onImpact) c.onImpact();
  }

  function update(now) {
    if (tail > 0 && !cur) tail--;
    if (!cur) return;
    const c = cur, raw = (now - c.t0) / 1000, h = c.hero;
    // hit-stop: the attack's own clock holds at the impact for c.stop seconds
    const t = raw < c.impactAt ? raw : raw < c.impactAt + c.stop ? c.impactAt : raw - c.stop;
    if (!c.impacted && raw >= c.impactAt) impact();
    if (t >= c.end) { finish(); return; }

    // the hero: turn to face, lean back, then lunge (melee) or recoil (ranged), hold, and back home
    if (!calm) {
      const turnIn = smooth(t / 0.18), turnOut = smooth((t - (c.end - 0.35)) / 0.35);
      h.pivot.rotation.y = c.yaw0 + (c.face - c.yaw0) * turnIn * (1 - turnOut);
      let lean = -LEAN.back * Math.sin(Math.PI * clamp01(t / WIND));
      if (!c.ranged) {
        const out = smooth((t - WIND) / c.lunge), back = smooth((t - WIND - c.lunge - HOLD) / BACK), k = out * (1 - back);
        h.pivot.position.lerpVectors(h.home, c.lungeTo, k).addScaledVector(c.swerve, Math.sin(Math.PI * k));
        h.pivot.position.y = h.home.y + Math.sin(Math.PI * clamp01((t - WIND) / c.lunge)) * LEAN.hop;
        lean += LEAN.forward * k;
      } else {
        lean += -0.12 * Math.exp(-14 * Math.max(0, t - WIND)) * (t > WIND ? 1 : 0);
      }
      h.pivot.rotation.x = lean;
    }

    // magic: a ring spreads out from the caster's feet while it winds up
    if (c.magic && !calm) {
      const k = clamp01(t / (WIND + 0.3)), rr = (h.def.base?.r ?? 0.2) * MAGIC.ring;
      ring.position.set(h.pivot.position.x, h.pivot.position.y + 0.012, h.pivot.position.z);
      ring.scale.setScalar(k > 0 && k < 1 ? rr * (0.3 + MAGIC.grow * k) : 1e-4);
      ring.material.color.copy(c.color).multiplyScalar(2.2); ring.material.opacity = MAGIC.fade * (1 - k);
    }

    // the bolt
    let li = 0;
    if (c.ranged && !calm) {
      const u = (t - WIND - 0.05) / (c.impactAt - WIND - 0.05);
      const flying = u >= 0 && (c.hit ? u < 1 || raw < c.impactAt + c.stop : u <= 1.25);
      const orb = c.magic ? MAGIC.orb : 1;
      bolt.scale.setScalar(flying ? orb : 1e-4); trail.scale.setScalar(flying ? orb : 1e-4);
      if (flying) {
        const uu = Math.min(u, c.hit ? 1 : 1.25);
        bolt.position.lerpVectors(c.muzzle, c.boltTo, uu).addScaledVector(c.swerve, Math.sin(Math.PI * clamp01(uu))); bolt.position.y += Math.sin(Math.PI * clamp01(uu)) * 0.18;
        trail.position.lerpVectors(c.muzzle, c.boltTo, Math.max(0, uu - 0.07)).addScaledVector(c.swerve, Math.sin(Math.PI * clamp01(uu - 0.07))); trail.position.y += Math.sin(Math.PI * clamp01(uu - 0.07)) * 0.18;
        trail.lookAt(bolt.position);
        bolt.material.color.copy(c.color).multiplyScalar(2.6); trail.material.color.copy(c.color).multiplyScalar(1.6);
        const fade = c.hit ? 1 : clamp01((1.25 - uu) / 0.25);
        bolt.material.opacity = fade; trail.material.opacity = 0.45 * fade;
        light.color.copy(c.color); light.position.copy(bolt.position); li = 2.2 * fade;
      }
    }

    // a hit: burst and sparks at the contact point, flash, knock-back with squash and spring
    if (c.hit && c.impacted && !calm) {
      const big = c.critical ? KNOCK.crit : 1;
      const since = raw - c.impactAt;             // real attack time since the blow (runs through the hit-stop)
      const s = t - c.impactAt;                   // after the hit-stop
      // starburst: full during the hit-stop, then it grows a little and fades
      const bk = since < c.stop ? 1 : 1 - clamp01((since - c.stop) / BURST.life);
      burst.position.copy(c.contact);
      burst.scale.setScalar(bk > 0 ? BURST.size * big * (1 + BURST.grow * (1 - bk)) : 1e-4);
      burst.material.rotation = c.spin; burst.material.opacity = bk;
      burst.material.color.copy(c.critical ? BURST.critColor : BURST.color);
      // sparks: ballistic from the contact point, streaks along their velocity
      const sl = clamp01(1 - s / SPARK.life);
      sparkMat.color.copy(c.critical ? SPARK.critColor : SPARK.color); sparkMat.opacity = sl;
      for (const p of sparks) {
        if (since < c.stop || sl <= 0) { p.m.scale.setScalar(1e-4); continue; }
        p.m.position.copy(c.contact).addScaledVector(p.v, s); p.m.position.y -= 0.5 * SPARK.gravity * s * s;
        _p.copy(p.v); _p.y -= SPARK.gravity * s;
        p.m.lookAt(_a.copy(p.m.position).add(_p));
        p.m.scale.set(SPARK.width, SPARK.width, SPARK.len * (0.4 + 0.6 * sl) * big);
      }
      const flash = Math.exp(-Math.max(0, since) * FLASH.decay) * big;
      flashMats.forEach((m) => { m.emissive.copy(m.userData.base.c).lerp(warm, Math.min(1, flash * FLASH.tint)); m.emissiveIntensity = m.userData.base.i + flash * FLASH.emissive; });
      const env = Math.exp(-s * KNOCK.decay), wob = env * Math.cos(s * KNOCK.spring);
      target.pivot.position.copy(target.home).addScaledVector(c.dir, KNOCK.push * big * env);
      // tilt away from the hero: rotate about the horizontal axis across the blow
      const ax = _a.set(c.dir.z, 0, -c.dir.x).applyAxisAngle(Y, -target.yaw).normalize();
      target.pivot.rotation.set(0, target.yaw, 0, 'YXZ');
      target.pivot.rotateOnAxis(ax, KNOCK.tilt * big * wob);
      const sq = KNOCK.squash * big * env * Math.cos(s * KNOCK.spring * 1.1);
      target.pivot.scale.set(tScale.x * (1 + sq * 0.5), tScale.y * (1 - sq), tScale.z * (1 + sq * 0.5));
      light.color.setHex(c.critical ? 0xffd27a : 0xffa050); light.position.copy(c.contact).addScaledVector(c.dir, -0.2);
      li = Math.max(li, flash * FLASH.light);
    }
    light.intensity = li;
  }

  const phase = () => (cur ? { hero: cur.hero.def.id, t: (clock() - cur.t0) / 1000, impactAt: cur.impactAt, hitStop: cur.stop, end: cur.end + cur.stop, hit: cur.hit } : null);
  const pick = (id) => { const i = roundRobin().findIndex((h) => h.def.id === id); if (i >= 0) turn = i; };
  return { play, update, phase, pick, get busy() { return !!cur || tail > 0; }, get target() { return target; }, get heroes() { return heroList(); } };
}
