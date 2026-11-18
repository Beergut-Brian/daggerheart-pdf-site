// The miniatures on the battle map: one entry per mini.
//   id, name      used by the attack and in the log
//   loader        (ctx) => THREE.Object3D, built at the origin facing +z, base on y = 0.
//                 Today these are the procedural figures in models.js; for a scanned or
//                 sculpted mini, return a loaded glTF scene here (see README).
//   position      [x, z] on the table (the map's surface is at y = 0.03)
//   rotation      turn about the vertical, radians (+ is counter-clockwise from above)
//   scale         1 = the figures as drawn (heroes stand about 0.55 tall)
//   base          { r: radius, top: colour of the flocking }
//   attack        'melee' | 'ranged' | 'magic' (how a hero attacks; ignored for monsters)
//   bolt          colour of a ranged/magic hero's bolt
//   role          'hero' | 'monster'; the one with target: true is what heroes attack
import { FIGURES, buildMini } from './models.js';

const grass = 0x4c6a2e, flag = 0x6a6c74;
const fig = (name, r = 0.165, top = grass) => (ctx) => buildMini(ctx.builder, ctx.mats, FIGURES[name], r, top);

export const MINIS = [
  // the party, on the road
  { id: 'guardian', name: 'the guardian', loader: fig('guardian'), position: [0.55, -1.35], rotation: 0.9, scale: 1, base: { r: 0.165, top: grass }, attack: 'melee', role: 'hero' },
  { id: 'wizard', name: 'the wizard', loader: fig('wizard'), position: [-0.15, -0.95], rotation: 0.7, scale: 1, base: { r: 0.165, top: grass }, attack: 'magic', bolt: 0x7fe3ff, role: 'hero' },
  { id: 'ranger', name: 'the ranger', loader: fig('ranger'), position: [-0.75, -1.5], rotation: 0.5, scale: 1, base: { r: 0.165, top: grass }, attack: 'ranged', bolt: 0xffc46a, role: 'hero' },
  { id: 'rogue', name: 'the rogue', loader: fig('rogue'), position: [0.95, -0.75], rotation: 1.2, scale: 1, base: { r: 0.165, top: grass }, attack: 'melee', role: 'hero' },
  { id: 'seraph', name: 'the seraph', loader: fig('seraph'), position: [0.1, -1.9], rotation: 0.75, scale: 1, base: { r: 0.165, top: grass }, attack: 'magic', bolt: 0xffe9a8, role: 'hero' },
  // the dead in the ruin
  { id: 'skeleton-1', name: 'a skeleton', loader: fig('skeleton', 0.165, flag), position: [-1.55, -2.45], rotation: 2.1, scale: 1, base: { r: 0.165, top: flag }, attack: 'melee', role: 'monster' },
  { id: 'skeleton-2', name: 'a skeleton', loader: fig('skeletonRaised', 0.165, flag), position: [-2.35, -2.05], rotation: 1.7, scale: 1, base: { r: 0.165, top: flag }, attack: 'melee', role: 'monster' },
  { id: 'skeleton-3', name: 'a skeleton', loader: fig('skeletonRaised', 0.165, flag), position: [-1.05, -3.15], rotation: 2.4, scale: 1, base: { r: 0.165, top: flag }, attack: 'melee', role: 'monster' },
  // the big one
  { id: 'golem', name: 'the crystal golem', loader: fig('golem', 0.42, 0x3f5f66), position: [2.55, -2.35], rotation: -1.1, scale: 1, base: { r: 0.42, top: 0x3f5f66 }, attack: 'melee', role: 'monster', target: true, height: 1.0 },
];
