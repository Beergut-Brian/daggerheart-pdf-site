// The eight player-character pieces: load the glb files, stand them on the map, find which one a ray hits.
// Each piece is a `mini` in attack.js's sense ({ def, obj, pivot, home, yaw }), so the party's attacks reuse it.
// A file that does not load, or has no node of the expected name, becomes a plain disc and one console line.
import * as THREE from '../vendor/three.bundle.js';
import { yawToward } from './pieces-logic.js';

const FALLBACK_R = 0.2;   // placeholder disc radius, table units

function placeholderDisc() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(FALLBACK_R, FALLBACK_R, 0.05, 24).translate(0, 0.025, 0), new THREE.MeshStandardMaterial({ color: 0x6b5a46, roughness: 0.8 }));
  m.castShadow = m.receiveShadow = true; g.add(m); g.userData.placeholder = true;
  return g;
}

// The adversary on the map (the Skeletal Harvester): load its glb into the target mini made by world.js and measure it.
// `mini` is { def, obj, pivot, home }; the file is in metres, base centre at the origin, facing +z, so one scale (`scale`, table units
// per metre, the same as the party) gives its true size. Its Difficulty comes from the node's glTF extras when there is one;
// otherwise `def.difficulty` (the config's value) stays. A file that does not load becomes a plain disc and one log line.
// Returns { ok } and fills in def.height, def.reach, def.base.r so the attack's effects fit what actually stands there.
export async function loadAdversary({ mini, url, node, scale, lite = false, loader = null, compile = null, log = console.warn }) {
  const loadGltf = loader || ((u) => new (THREE.GLTFLoader)().loadAsync(u));
  let obj = null, extras = null;
  try {
    const gltf = await loadGltf(url);
    obj = gltf.scene.getObjectByName(node);
    if (!obj) log(`[table] ${mini.def.id}: no node "${node}" in the file, using a placeholder disc`);
    else extras = obj.userData || null;
  } catch (e) {
    log(`[table] ${mini.def.id}: could not load (${e && e.message ? e.message : e}), using a placeholder disc`);
  }
  const ok = !!obj;
  if (!obj) obj = placeholderDisc();
  obj.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) for (const k of ['map', 'emissiveMap']) if (m[k]) m[k].anisotropy = lite ? 2 : 4;
  });
  mini.pivot.remove(mini.obj); mini.obj = obj; mini.pivot.add(obj);
  mini.pivot.scale.setScalar(ok ? scale : 1);
  mini.pivot.visible = true;
  // measure unturned, so the half-width is the model's own and not the turn's
  const yaw = mini.pivot.rotation.y; mini.pivot.rotation.y = 0; mini.pivot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mini.pivot);
  mini.pivot.rotation.y = yaw; mini.pivot.updateMatrixWorld(true);
  const def = mini.def;
  def.height = box.max.y - mini.pivot.position.y;
  def.reach = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
  if (ok) {
    // the 3 ft round base (0.457 m radius, from the spec) sets the radius the blows land on; the claws only widen `reach`
    def.base = { ...def.base, r: Math.min(def.reach, 0.457 * scale) };
    if (extras && Number.isFinite(+extras.difficulty)) def.difficulty = +extras.difficulty;
    def.stats = extras ? { tier: extras.tier, type: extras.type, hp: extras.hp, stress: extras.stress, attack: extras.attack } : null;
  } else def.base = { ...def.base, r: FALLBACK_R };
  if (compile) { try { await compile(mini.pivot); } catch (e) { /* the first draw compiles it instead */ } }
  return { ok };
}

export function createPieces({ parent, party, cfg, scale, face, lite = false, y = 0.03, loader = null, compile = null, log = console.warn }) {
  const pieces = [];
  const ray = new THREE.Raycaster();
  const loadGltf = loader || ((url) => new (THREE.GLTFLoader)().loadAsync(url));

  const disc = () => placeholderDisc();

  async function one(def) {
    let obj = null;
    try {
      const gltf = await loadGltf(cfg.dir + def.id + '.glb');
      obj = gltf.scene.getObjectByName(def.node);
      if (!obj) log(`[table] piece ${def.id}: no node "${def.node}" in the file, using a placeholder disc`);
    } catch (e) {
      log(`[table] piece ${def.id}: could not load (${e && e.message ? e.message : e}), using a placeholder disc`);
    }
    if (!obj) obj = disc(def);
    obj.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) for (const k of ['map', 'emissiveMap']) if (m[k]) m[k].anisotropy = lite ? 2 : 4;
    });
    const pivot = new THREE.Group();
    pivot.add(obj);
    // the glb is in metres, base centre at the origin, facing +z; one scale for all eight keeps the true heights
    pivot.scale.setScalar(obj.userData.placeholder ? 1 : scale);
    pivot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(pivot);
    return {
      def: { id: def.id, name: def.name, role: 'hero', attack: 'melee', pc: true, height: box.max.y, base: { r: Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2 }, muzzle: box.max.y * 0.62 },
      char: def, obj, pivot, home: new THREE.Vector3(), yaw: 0, box, placeholder: !!obj.userData.placeholder,
    };
  }

  // Loads all eight (in parallel), compiles their shaders off the main thread, then adds the lineup to the scene.
  async function load() {
    const got = await Promise.all(party.map(one));
    for (const p of got) {
      // stand the footprint's centre on its place (the origin is the base centre, which is not always the middle of the piece:
      // Zeke's base carries Brutus), turned to face the Harvester (`face`: its x, z) with a few degrees of its own
      const at = cfg.places[p.def.id] || { x: 0, z: 0, turn: 0 }, yaw = yawToward(at, face) + (at.turn || 0);
      p.yaw = yaw; p.pivot.rotation.y = yaw;
      p.pivot.updateMatrixWorld(true);
      const turned = new THREE.Box3().setFromObject(p.pivot).getCenter(new THREE.Vector3());
      p.pivot.position.set(at.x - turned.x, y, at.z - turned.z);
      p.home.copy(p.pivot.position);
    }
    if (compile) { try { for (const p of got) await compile(p.pivot); } catch (e) { /* the first draw compiles it instead */ } }
    for (const p of got) { parent.add(p.pivot); pieces.push(p); }
    return { loaded: got.filter((p) => !p.placeholder).length, failed: got.filter((p) => p.placeholder).length };
  }

  // Nearest piece under an NDC point: { piece, distance } or null. Sphere and box tests first (three does that per mesh), then triangles.
  function pick(ndc, camera) {
    if (!pieces.length) return null;
    ray.setFromCamera(ndc, camera);
    let best = null;
    for (const p of pieces) {
      const h = ray.intersectObject(p.pivot, true)[0];
      if (h && (!best || h.distance < best.distance)) best = { piece: p, distance: h.distance };
    }
    return best;
  }

  // The piece's head and base on screen (client pixels), for the hover card; measured now, so it follows a piece that is moving.
  const _v = new THREE.Vector3(), _b = new THREE.Box3();
  function anchor(p, camera, rect) {
    const b = _b.setFromObject(p.pivot), cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
    const at = (yy) => { _v.set(cx, yy, cz).project(camera); return [rect.left + (_v.x * 0.5 + 0.5) * rect.width, rect.top + (-_v.y * 0.5 + 0.5) * rect.height]; };
    const [x, top] = at(b.max.y), [, bottom] = at(b.min.y);
    return { x, top, bottom };
  }

  return { pieces, load, pick, anchor, get ready() { return pieces.length > 0; }, byId: (id) => pieces.find((p) => p.def.id === id) || null };
}
