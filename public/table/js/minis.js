// The miniatures on the battle map: one entry per mini.
//   id, name      used by the attack and in the log
//   loader        (ctx) => THREE.Object3D, built at the origin facing +z, base on y = 0.
//                 Today these are the procedural figures in models.js; for a scanned or
//                 sculpted mini, return a loaded glTF scene here (see README).
//   position      [x, z] on the table (the map's surface is at y = 0.03)
//   rotation      turn about the vertical, radians (+ is counter-clockwise from above)
//   scale         1 = the figures as drawn (heroes stand about 0.55 tall)
//   base          { r: radius, top: colour of the flocking }
//   role          'monster' here; the party's pieces (js/pieces.js, js/party.js) are the heroes. The one with target: true is what they attack
//   height, reach  the target's height and the half-width of its footprint (claws included), table units: size the attack's effects
//   difficulty    the target's Difficulty: an attack roll at or above it hits
import * as THREE from '../vendor/three.bundle.js';
import { FIGURES, buildMini } from './models.js';

const grass = 0x4c6a2e, flag = 0x6a6c74;
const fig = (name, r = 0.165, top = grass) => (ctx) => buildMini(ctx.builder, ctx.mats, FIGURES[name], r, top);

export const MINIS = [
  // the dead in the ruin
  { id: 'skeleton-1', name: 'a skeleton', loader: fig('skeleton', 0.165, flag), position: [-1.55, -2.45], rotation: 2.1, scale: 1, base: { r: 0.165, top: flag }, attack: 'melee', role: 'monster' },
  { id: 'skeleton-2', name: 'a skeleton', loader: fig('skeletonRaised', 0.165, flag), position: [-2.35, -2.05], rotation: 1.7, scale: 1, base: { r: 0.165, top: flag }, attack: 'melee', role: 'monster' },
  { id: 'skeleton-3', name: 'a skeleton', loader: fig('skeletonRaised', 0.165, flag), position: [-1.05, -3.15], rotation: 2.4, scale: 1, base: { r: 0.165, top: flag }, attack: 'melee', role: 'monster' },
  // the big one: Coach's Skeletal Harvester (models/adv/skeletal_harvester.glb, loaded after the opening by loadAdversary in pieces.js).
  // Until then, and if the file fails, the target is an empty group (hidden) or a plain disc; `height`, `base.r` and `difficulty`
  // are the config values for that moment and are replaced by the file's measured box and glTF extras when it loads.
  // 3 ft round base = 0.457 m radius, 2.74 m tall; at 0.4 table units a metre (PIECES.scale) that is 0.183 and 1.10.
  { id: 'harvester', name: 'the Skeletal Harvester', loader: () => { const g = new THREE.Group(); g.visible = false; return g; }, position: [3.4, 0.2], rotation: -1.92, scale: 1,
    base: { r: 0.183, top: 0 }, attack: 'melee', role: 'monster', target: true, height: 1.1, reach: 0.33, dim: 1,
    difficulty: 18 },   // Difficulty 18 (the glb's extras say the same): what an attack roll must meet or beat
];
