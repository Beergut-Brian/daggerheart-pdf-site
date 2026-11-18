// A hero attacks the monster: wind-up, then a melee lunge or a ranged/magic bolt.
// Hit: warm flash on the monster and a knock-back that springs back.
// Miss: the lunge or bolt goes wide. Critical: a bigger flash, gold sparks, bigger knock-back.
import * as THREE from '../vendor/three.bundle.js';

const WIND = 0.25, LUNGE = 0.3, HOLD = 0.08, BACK = 0.55, BOLT_SPEED = 6.5;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const angleTo = (a, b) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function createAttack({ scene, minis, calm, lite, clock = () => performance.now() }) {
  const heroes = minis.filter((m) => m.def.role === 'hero');
  const target = minis.find((m) => m.def.target) || minis.find((m) => m.def.role === 'monster');
  if (!target || !heroes.length) return null;
  let turn = 0, cur = null, tail = 0;

  // the monster gets its own materials, so its flash does not light the terrain
  const flashMats = [];
  target.obj.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    if (o.material.emissive) { o.material.userData.base = { c: o.material.emissive.clone(), i: o.material.emissiveIntensity }; flashMats.push(o.material); }
  });
  const warm = new THREE.Color(0xff9a48);
  const tH = target.def.height ?? 0.6;
  const tCentre = target.home.clone().setY(0.03 + tH * 0.55);

  // one light for bolt and flash, always in the scene (adding lights later recompiles shaders)
  const light = new THREE.PointLight(0xffb060, 0, 3.2, 2);
  scene.add(light);
  const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
  const trail = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6).scale(1, 1, 3.4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false }));
  scene.add(bolt, trail);
  const SPARKS = lite ? 8 : 14;
  const sparkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.3, 0.9), transparent: true });
  const sparkGeo = new THREE.OctahedronGeometry(0.035, 0);
  const sparks = Array.from({ length: SPARKS }, () => { const m = new THREE.Mesh(sparkGeo, sparkMat); scene.add(m); return { m, v: new THREE.Vector3() }; });
  // the effects stay in the scene, shrunk to nothing inside the monster, so their shaders compile with
  // the first frame instead of stalling the first attack
  const park = () => {
    for (const o of [bolt, trail, ...sparks.map((s) => s.m)]) { o.position.copy(tCentre); o.scale.setScalar(1e-4); }
  };
  park();

  const v = new THREE.Vector3(), side = new THREE.Vector3();

  function play({ hit, critical, onImpact }) {
    if (cur) finish();
    const hero = heroes[turn++ % heroes.length];   // round-robin through the party
    const to = v.subVectors(target.home, hero.home).setY(0), dist = to.length(), dir = to.clone().normalize();
    side.set(-dir.z, 0, dir.x).multiplyScalar(turn % 2 ? 1 : -1);
    const yaw0 = hero.pivot.rotation.y, face = angleTo(yaw0, Math.atan2(dir.x, dir.z));
    const ranged = hero.def.attack !== 'melee';
    // where the swing or bolt ends: on the monster, or wide of it
    const reach = Math.max(0.3, dist - (target.def.base?.r ?? 0.4) - 0.2);
    const lungeTo = hero.home.clone().addScaledVector(dir, hit ? reach : reach * 0.8).addScaledVector(side, hit ? 0 : 0.5);
    const muzzle = hero.home.clone().setY(0.03 + 0.42).addScaledVector(dir, 0.14);
    const boltTo = hit ? tCentre.clone() : tCentre.clone().addScaledVector(side, 0.75).addScaledVector(dir, 0.6).setY(tCentre.y + 0.15);
    const flight = muzzle.distanceTo(boltTo) / BOLT_SPEED;
    const impactAt = calm ? 0 : WIND + (ranged ? 0.05 + flight : LUNGE);
    cur = {
      hero, hit, critical, onImpact, ranged, yaw0, face, dir, lungeTo, muzzle, boltTo, impactAt, t0: clock(), impacted: false,
      color: new THREE.Color(hero.def.bolt ?? 0xffc46a), end: impactAt + (calm ? 0.7 : Math.max(ranged ? 0.9 : HOLD + BACK + 0.25, 1.0)),
    };
    if (calm) impact();
    return cur.end * 1000;
  }

  function impact() {
    const c = cur; c.impacted = true;
    if (c.hit && c.critical) {
      sparks.forEach((s) => {
        s.m.scale.setScalar(1); s.m.position.copy(tCentre);
        s.v.set(Math.random() - 0.5, 0.6 + Math.random() * 0.9, Math.random() - 0.5).multiplyScalar(2.2).addScaledVector(c.dir, -0.8);
      });
    }
    if (c.onImpact) c.onImpact();
  }

  function finish() {
    const c = cur; cur = null; tail = 3;      // a few more shadow redraws with everyone home
    c.hero.pivot.position.copy(c.hero.home); c.hero.pivot.rotation.set(0, c.yaw0, 0);
    target.pivot.position.copy(target.home); target.pivot.rotation.set(0, target.yaw, 0, 'YXZ');
    flashMats.forEach((m) => { m.emissive.copy(m.userData.base.c); m.emissiveIntensity = m.userData.base.i; });
    light.intensity = 0; park();
    if (!c.impacted && c.onImpact) c.onImpact();
  }

  function update(now, dt) {
    if (tail > 0 && !cur) tail--;
    if (!cur) return;
    const c = cur, t = (now - c.t0) / 1000, h = c.hero;
    if (!c.impacted && t >= c.impactAt) impact();
    if (t >= c.end) { finish(); return; }

    // the hero: turn to face, lean back, then lunge (melee) or recoil (ranged), and back home
    if (!calm) {
      const turnIn = smooth(t / 0.18), turnOut = smooth((t - (c.end - 0.35)) / 0.35);
      h.pivot.rotation.y = c.yaw0 + (c.face - c.yaw0) * turnIn * (1 - turnOut);
      let lean = -0.28 * Math.sin(Math.PI * clamp01(t / WIND));
      if (!c.ranged) {
        const out = smooth((t - WIND) / LUNGE), back = smooth((t - WIND - LUNGE - HOLD) / BACK), k = out * (1 - back);
        h.pivot.position.lerpVectors(h.home, c.lungeTo, k);
        h.pivot.position.y = h.home.y + Math.sin(Math.PI * clamp01((t - WIND) / LUNGE)) * 0.12;
        lean += 0.32 * Math.sin(Math.PI * clamp01((t - WIND) / (LUNGE + HOLD)));
      } else {
        lean += -0.12 * Math.exp(-14 * Math.max(0, t - WIND)) * (t > WIND ? 1 : 0);
      }
      h.pivot.rotation.x = lean;
    }

    // the bolt
    let li = 0;
    if (c.ranged && !calm) {
      const u = (t - WIND - 0.05) / (c.impactAt - WIND - 0.05);
      const flying = u >= 0 && u <= (c.hit ? 1 : 1.25);
      bolt.scale.setScalar(flying ? 1 : 1e-4); trail.scale.setScalar(flying ? 1 : 1e-4);
      if (flying) {
        bolt.position.lerpVectors(c.muzzle, c.boltTo, u); bolt.position.y += Math.sin(Math.PI * clamp01(u)) * 0.18;
        trail.position.lerpVectors(c.muzzle, c.boltTo, Math.max(0, u - 0.07)); trail.position.y += Math.sin(Math.PI * clamp01(u - 0.07)) * 0.18;
        trail.lookAt(bolt.position);
        bolt.material.color.copy(c.color).multiplyScalar(2.6); trail.material.color.copy(c.color).multiplyScalar(1.6);
        const fade = c.hit ? 1 : clamp01((1.25 - u) / 0.25);
        bolt.material.opacity = fade; trail.material.opacity = 0.45 * fade;
        light.color.copy(c.color); light.position.copy(bolt.position); li = 2.2 * fade;
      }
    }

    // the monster: flash and knock-back on a hit
    if (c.hit && c.impacted) {
      const s = t - c.impactAt, big = c.critical ? 1.9 : 1;
      const flash = Math.exp(-s * 7) * big;
      flashMats.forEach((m) => { m.emissive.copy(m.userData.base.c).lerp(warm, Math.min(1, flash)); m.emissiveIntensity = m.userData.base.i + flash * 0.9; });
      const kick = (c.critical ? 0.26 : 0.13) * Math.exp(-s * 5) * Math.cos(s * 17);
      target.pivot.position.copy(target.home).addScaledVector(c.dir, Math.max(0, kick) * 0.35);
      // tilt away from the hero: rotate about the horizontal axis across the blow
      const ax = new THREE.Vector3(c.dir.z, 0, -c.dir.x).applyAxisAngle(new THREE.Vector3(0, 1, 0), -target.yaw);
      target.pivot.rotation.set(0, target.yaw, 0, 'YXZ');
      target.pivot.rotateOnAxis(ax.normalize(), kick);
      light.color.setHex(c.critical ? 0xffd27a : 0xffa050); light.position.copy(tCentre).addScaledVector(c.dir, -0.35).setY(tCentre.y + 0.2);
      li = Math.max(li, flash * 5);
    }
    light.intensity = li;

    // sparks
    if (c.impacted && c.hit && c.critical) {
      const s = t - c.impactAt;
      sparkMat.opacity = clamp01(1 - s / 0.8);
      sparks.forEach((p) => {
        p.v.y -= 6 * dt; p.m.position.addScaledVector(p.v, dt);
        if (p.m.position.y < 0.05) { p.m.position.y = 0.05; p.v.y *= -0.3; p.v.x *= 0.6; p.v.z *= 0.6; }
        p.m.rotation.x += dt * 9; p.m.rotation.y += dt * 7;
      });
    }
  }

  const phase = () => (cur ? { hero: cur.hero.def.id, t: (clock() - cur.t0) / 1000, impactAt: cur.impactAt, end: cur.end, hit: cur.hit } : null);
  const pick = (id) => { const i = heroes.findIndex((h) => h.def.id === id); if (i >= 0) turn = i; };
  return { play, update, phase, pick, get busy() { return !!cur || tail > 0; }, get target() { return target; }, get heroes() { return heroes; } };
}
