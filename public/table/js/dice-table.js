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
