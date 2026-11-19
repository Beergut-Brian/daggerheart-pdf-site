// Which of the dice already on the table a roll picks up, and where a die may land.
// Pure (no three.js, no DOM), unit-tested in tests/unit/dice-table.test.ts.

// requests: [{ type: 'd8', style: 'hope' | 'fear' | 'bone' }] in roll order
// pool: [{ id, type, kind: 'duality' | 'tray' | 'extra', role: 'hope' | 'fear' | null, out: boolean }]
//   out: lying on the table (not in the tray)
// returns one pool id per request, or null where a new die has to come out of the tray.
// The Duality d12s only answer Duality rolls (hope / fear); plain dice take what is already lying
// out first, then the tray's dice of that type.
export function assignDice(requests, pool) {
  const used = new Set();
  const take = (ok) => {
    const d = pool.find((p) => !used.has(p.id) && ok(p));
    if (!d) return null;
    used.add(d.id); return d.id;
  };
  return requests.map((r) => {
    if (r.style === 'hope' || r.style === 'fear') return take((p) => p.kind === 'duality' && p.role === r.style);
    return take((p) => p.kind !== 'duality' && p.type === r.type && p.out)
      ?? take((p) => p.kind !== 'duality' && p.type === r.type);
  });
}

// area: { x0, x1, z0, z1 }; avoid: [[x, z, radius]]; a spot for a die of radius rad.
// Pulls the spot inside the area (by the die's radius); null if it then overlaps anything to avoid.
export function clampSpot(spot, rad, area, avoid = []) {
  const x = Math.min(area.x1 - rad, Math.max(area.x0 + rad, spot.x));
  const z = Math.min(area.z1 - rad, Math.max(area.z0 + rad, spot.z));
  for (const [ax, az, ar] of avoid) if (Math.hypot(x - ax, z - az) < ar + rad) return null;
  return { x, z };
}

// how far a spot overlaps the things to avoid (0 = clear); used to score candidate landing spots
export function clash(x, z, rad, avoid) {
  let c = 0;
  for (const [ax, az, ar] of avoid) c += Math.max(0, ar + rad - Math.hypot(x - ax, z - az));
  return c;
}

// { x, z, w, d } (centre, width, depth) -> { x0, x1, z0, z1 }
export function areaBounds(a) {
  return { x0: a.x - a.w / 2, x1: a.x + a.w / 2, z0: a.z - a.d / 2, z1: a.z + a.d / 2 };
}

// Fold a point back into the area (inset by the die's radius) the way a ball bounces off walls:
// past an edge by d means d back inside. Used for the throw's path so dice rebound off the edges.
export function bounceInto(p, rad, area) {
  const fold = (v, lo, hi) => {
    lo += rad; hi -= rad;
    const span = hi - lo;
    if (span <= 0) return (lo + hi) / 2;
    let u = (v - lo) % (2 * span);
    if (u < 0) u += 2 * span;
    return lo + (u > span ? 2 * span - u : u);
  };
  return { x: fold(p.x, area.x0, area.x1), z: fold(p.z, area.z0, area.z1) };
}
