/* The Salt Circle: code-drawn salt rings, glyphs and covers. Seeded, so every render is identical.
   Builder note: all output is static geometry; it can be precomputed at build time into inline SVG. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const gauss = (r) => (r() + r() + r() + r() - 2) / 2; // ~N(0, .29), range -1..1
  const f = (n) => Math.round(n * 10) / 10;

  // Our own glyphs (24-unit box, centre 12,12). Table objects only: no stars, no sigils, no script.
  const GLYPHS = {
    cube: '<path d="M12 3.5 19.5 7.8v8.4L12 20.5 4.5 16.2V7.8Z M12 12v8.5 M12 12l7.5-4.2 M12 12 4.5 7.8"/>',
    shaker: '<path d="M8 10h8v9.5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 19.5Z M8.8 10a3.2 3.2 0 0 1 6.4 0"/><circle cx="10" cy="4.6" r=".9" class="dot"/><circle cx="12" cy="3.4" r=".9" class="dot"/><circle cx="14" cy="4.6" r=".9" class="dot"/>',
    pips: '<rect x="5" y="5" width="14" height="14" rx="3"/><circle cx="9.3" cy="9.3" r="1.3" class="dot"/><circle cx="14.7" cy="14.7" r="1.3" class="dot"/>',
    spiral: '<path d="M12 12a1.4 1.4 0 0 1 2.8 0 2.8 2.8 0 0 1-5.6 0 4.2 4.2 0 0 1 8.4 0 5.6 5.6 0 0 1-11.2 0"/>',
    moon: '<path d="M14.5 4.5a7.5 7.5 0 1 0 0 15 6 6 0 0 1 0-15Z"/><circle cx="17.6" cy="12" r="1.2" class="dot"/>',
    pour: '<path d="M3.5 10.5q2.1-3 4.2 0t4.3 0 4.3 0 4.2 0"/><circle cx="7" cy="16" r=".9" class="dot"/><circle cx="12" cy="18" r=".9" class="dot"/><circle cx="17" cy="16" r=".9" class="dot"/>',
    grain: '<circle cx="12" cy="12" r="7.5"/><rect x="10" y="10" width="4" height="4" transform="rotate(20 12 12)" class="dot"/>',
    glass: '<path d="M7 4h10 M7 20h10 M8 4c0 5 8 5 8 8s-8 3-8 8 M16 4c0 5-8 5-8 8s8 3 8 8"/>'
  };
  const GLYPH_ORDER = ['cube', 'shaker', 'spiral', 'pips', 'moon', 'pour', 'grain', 'glass'];

  function defs() {
    return '<defs>' + Object.entries(GLYPHS).map(([k, v]) => `<symbol id="gl-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('') + '</defs>';
  }

  function quad(r, x, y, size) {
    const a = r() * Math.PI, k = .75 + r() * .5;
    const pts = [0, 1, 2, 3].map((i) => {
      const ang = a + i * Math.PI / 2 + (r() - .5) * .35;
      const rad = size * (i % 2 ? k : 1) * .7;
      return f(x + Math.cos(ang) * rad) + ' ' + f(y + Math.sin(ang) * rad);
    });
    return 'M' + pts.join('L') + 'Z';
  }

  function arc(cx, cy, r, a0, a1) {
    const p = (a) => f(cx + Math.cos(a) * r) + ' ' + f(cy + Math.sin(a) * r);
    const large = (a1 - a0) % (2 * Math.PI) > Math.PI ? 1 : 0;
    return `M${p(a0)}A${r} ${r} 0 ${large} 1 ${p(a1)}`;
  }

  /* Salt ring. opts: size (viewBox), r, band, count, gates [[deg, widthDeg]], glyphs n, glyphR offset, seed,
     grain [min,max], scatter (0..1), hair (bool), id */
  function ring(o) {
    const r = rng(o.seed || 7), S = o.size, cx = S / 2, cy = S / 2;
    const gates = (o.gates || []).map(([d, w]) => [d * Math.PI / 180, w * Math.PI / 180]);
    const gateDist = (a) => { let m = Infinity; for (const [g, w] of gates) { let d = Math.abs(((a - g + 3 * Math.PI) % (2 * Math.PI)) - Math.PI); m = Math.min(m, d - w / 2); } return m; };
    const nG = o.glyphs || 0, glyphPts = [];
    // glyph positions evenly spaced, skipping gates
    if (nG) {
      const cand = [];
      for (let i = 0; i < nG * 3; i++) { const a = (i / (nG * 3)) * 2 * Math.PI + (o.glyphPhase || 0); if (gateDist(a) > .18) cand.push(a); }
      const step = cand.length / nG;
      for (let i = 0; i < nG; i++) glyphPts.push(cand[Math.floor(i * step + step / 2)]);
    }
    const gr = o.glyphR || 0, gs = o.glyphSize || o.band * 2.4;
    const buckets = ['', '', '', ''];
    let made = 0, guard = 0;
    while (made < o.count && guard++ < o.count * 6) {
      const a = r() * 2 * Math.PI;
      const gd = gateDist(a);
      if (gd < 0) continue;
      if (gd < .16 && r() > gd / .16) continue; // taper: the pour runs out at the gate
      const stray = r() < (o.scatter || .08);
      const off = stray ? (r() - .5) * o.band * 5 : gauss(r) * o.band;
      const rad = o.r + off, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      if (gr === 0 && glyphPts.some((g) => { const gx = cx + Math.cos(g) * o.r, gy = cy + Math.sin(g) * o.r; return Math.hypot(gx - x, gy - y) < gs * .75; })) continue;
      const [mn, mx] = o.grain || [2, 5.5];
      const sz = (mn + r() * r() * (mx - mn)) * (stray ? .7 : 1);
      const b = r() < (o.giltShare || .05) ? 3 : (Math.abs(off) < o.band * .45 ? 0 : (r() < .5 ? 1 : 2));
      buckets[b] += quad(r, x, y, sz);
      made++;
    }
    let hair = '';
    if (o.hair) {
      const segs = []; const gs2 = gates.map(([g, w]) => [g - w / 2 - .02, g + w / 2 + .02]).sort((p, q) => p[0] - q[0]);
      if (!gs2.length) segs.push([0, 2 * Math.PI - .0001]);
      for (let i = 0; i < gs2.length; i++) { const a0 = gs2[i][1], a1 = gs2[(i + 1) % gs2.length][0] + (i + 1 === gs2.length ? 2 * Math.PI : 0); segs.push([a0, a1]); }
      for (const k of [-1, 1]) for (const [a0, a1] of segs) hair += `<path class="hair" d="${arc(cx, cy, o.r + k * o.band * 2.1, a0, a1)}"/>`;
    }
    const glyphs = glyphPts.map((a, i) => {
      const rr = o.r + gr, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr, rot = a * 180 / Math.PI + 90;
      const name = GLYPH_ORDER[i % GLYPH_ORDER.length];
      return `<g class="glyph" style="--i:${i}" transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})"><use href="#gl-${name}" x="${f(-gs / 2)}" y="${f(-gs / 2)}" width="${f(gs)}" height="${f(gs)}"/></g>`;
    }).join('');
    const start = gates.length ? (gates[0][0] + gates[0][1] / 2) * 180 / Math.PI : -90;
    const mid = o.id || 'pour';
    return `<mask id="${mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="${S}" height="${S}"><circle class="pour" cx="${cx}" cy="${cy}" r="${o.r}" pathLength="100" transform="rotate(${f(start)} ${cx} ${cy})" stroke="#fff" stroke-width="${o.band * 7}" fill="none"/></mask>
<g class="breath"><g mask="url(#${mid})">${hair}<path class="g0" d="${buckets[0]}"/><path class="g1" d="${buckets[1]}"/><path class="g2" d="${buckets[2]}"/><path class="g3" d="${buckets[3]}"/></g><g class="glyphs">${glyphs}</g></g>`;
  }

  /* Strewn field: sparse grains across a rect, denser toward (fx, fy). */
  function field(o) {
    const r = rng(o.seed || 3); let d = ['', '', ''];
    for (let i = 0; i < o.count; i++) {
      let x, y;
      if (r() < (o.pull || .45)) { const a = r() * 2 * Math.PI, rad = Math.abs(gauss(r)) * o.spread; x = o.fx + Math.cos(a) * rad * 1.5; y = o.fy + Math.sin(a) * rad; }
      else { x = r() * o.w; y = r() * o.h; }
      const sz = 1.6 + r() * r() * 4;
      d[r() < .06 ? 2 : (r() < .5 ? 0 : 1)] += quad(r, x, y, sz);
    }
    return `<path class="f0" d="${d[0]}"/><path class="f1" d="${d[1]}"/><path class="f2" d="${d[2]}"/>`;
  }

  /* Small grain ring for markers/spinner (no glyphs). */
  function miniRing(seed, n, size, band, gap) {
    return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false">` + ring({ size, r: size / 2 - band * 2.2, band, count: n, seed, grain: [band * .8, band * 1.9], scatter: .02, gates: gap ? [[90, gap]] : [], id: 'm' + seed + Math.round(size) }).replace(/<defs>.*?<\/defs>/, '') + '</svg>';
  }

  /* Book cover in the site style. kind: 'ward' | 'split' | 'band' */
  function cover(o) {
    const W = 300, H = 400, id = 'cv' + o.seed;
    const c = o.c || ['var(--c-cover-teal)', 'var(--c-cover-teal-2)'];
    const inner = ring({ size: 300, r: 92, band: 5, count: o.small ? 260 : 520, seed: o.seed, grain: [1.6, 3.6], gates: o.kind === 'split' ? [[90, 16], [270, 16]] : [[90, 22]], glyphs: o.small ? 0 : 6, glyphSize: 15, glyphR: 0, hair: true, id: id + 'p', giltShare: o.kind === 'split' ? 0 : .04 });
    const plain = inner.replace('<g class="breath">', '<g>');
    const split = o.kind === 'split' ? `<clipPath id="${id}L"><rect x="0" y="0" width="150" height="300"/></clipPath><clipPath id="${id}R"><rect x="150" y="0" width="150" height="300"/></clipPath>` : '';
    const ringSvg = o.kind === 'split'
      ? `<svg x="0" y="40" width="300" height="300" viewBox="0 0 300 300" class="cring"><g clip-path="url(#${id}L)">${plain}</g><g clip-path="url(#${id}R)" class="all-gilt">${plain.replace('id="' + id + 'p"', 'id="' + id + 'q"').replace('url(#' + id + 'p)', 'url(#' + id + 'q)')}</g></svg>`
      : `<svg x="0" y="40" width="300" height="300" viewBox="0 0 300 300" class="cring">${plain}</svg>`;
    const title = o.lines.map(([t, y, big]) => `<text x="150" y="${y}" text-anchor="middle" class="ct${big ? ' big' : ''}">${t}</text>`).join('');
    return `<svg class="art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>${split}</defs>
<rect width="${W}" height="${H}" fill="url(#${id}g)"/>
<rect x="8" y="0" width="3" height="${H}" class="spine"/>
<rect x="20" y="16" width="${W - 36}" height="${H - 32}" class="frame"/><rect x="26" y="22" width="${W - 48}" height="${H - 44}" class="frame thin"/>
${ringSvg}${o.kind === 'split' ? `<rect x="149" y="132" width="2" height="116" class="seam"/>` : ''}
${title}</svg>`;
  }

  /* Selected-cover outline: a dotted grain stroke round the cover. */
  function wardOutline() {
    return '<svg class="ward-outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x=".6" y=".6" width="98.8" height="98.8" rx="1.5" fill="none" stroke="var(--c-salt)" stroke-width="2.2" stroke-dasharray=".1 2.6" stroke-linecap="square" vector-effect="non-scaling-stroke" pathLength="100"/></svg>';
  }

  /* Placeholder book page (never real art). */
  function page(n, marks) {
    const L = (cls, st) => `<span class="ln ${cls || ''}"${st ? ` style="${st}"` : ''}></span>`;
    let col = (k, m) => { let s = ''; for (let i = 0; i < 21; i++) { const hit = m && m[i]; s += hit ? L('m', `--a:${hit[0]}%;--b:${hit[1]}%`) : L(i % 5 === 4 ? 's' : ''); if (i === 7 || i === 16) s += '<span class="sh"></span>'; } return `<div>${s}</div>`; };
    return `<div class="page" role="img" aria-label="Page ${n}, two matches for Hope highlighted"><span class="hd"></span>${L()}${L()}${L('s')}<span class="sh"></span><div class="cols">${col(0, marks ? { 2: [8, 30] } : null)}${col(1, marks ? { 17: [40, 62] } : null)}</div><span class="pno">${n}</span></div>`;
  }
  function tinyLines() { return '<i class="h" style="top:10%"></i>' + [20, 27, 34, 41, 52, 59, 66, 73, 80].map((t) => `<i style="top:${t}%"></i>`).join(''); }

  const HITS = [
    ['…HOPE AND FEAR <mark>Hope</mark> and Fear are currencies used by the players and the GM to represent the way fate turns…', 'Ch 1 · Character Creation', 19, 22],
    ['…Before you make an action or reaction roll, you can spend a <mark>Hope</mark> to add the Experience\'s modifier to the roll\'s result…', 'Ch 1 · Character Creation', 21, 48],
    ['…Class <mark>Hope</mark> Feature: Each class has a special move they can make by spending 3 <mark>Hope</mark>…', 'Ch 1 · Class', 28, 34],
    ['…Make a Scene: Spend 3 <mark>Hope</mark> to temporarily Distract a target within Close range…', 'Ch 1 · Class (Bard)', 29, 60],
    ['…Evolution: Spend 3 <mark>Hope</mark> to transform into a Beastform without marking a Stress…', 'Ch 1 · Class (Druid)', 31, 70]
  ];
  function hits() {
    return HITS.map(([s, c, p, mk], i) => `<li><a class="hit${i === 0 ? ' focus' : ''}" href="#p${p}" aria-label="Page ${p}, ${c}: ${s.replace(/<[^>]+>/g, '')}"${i === 0 ? ' aria-current="true"' : ''}><span class="pv" aria-hidden="true">${tinyLines()}<i class="mk" style="top:${mk}%"></i></span><span><span class="mt"><span>${c}</span><b>p. ${p}</b></span><span class="sn">${s}</span></span></a></li>`).join('');
  }
  function thumbs(from, n, cur, blankFrom) {
    let s = '';
    for (let p = from; p < from + n; p++) {
      const blank = p >= blankFrom, isCur = p === cur;
      s += `<a class="th${isCur ? ' cur' : ''}" href="#p${p}" aria-label="Page ${p}"${isCur ? ' aria-current="page"' : ''}><span class="tp${blank ? ' blank' : ''}">${blank ? `<span class="spin">${miniRing(40 + p, 70, 60, 2.2, 0)}</span>` : tinyLines()}</span><span class="num">${isCur ? miniRing(91, 90, 60, 2, 0) : ''}${p}</span></a>`;
    }
    return s;
  }

  window.SALT = { ring, field, miniRing, cover, wardOutline, page, hits, thumbs, defs };
})();
