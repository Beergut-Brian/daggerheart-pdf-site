// ---------------------------------------------------------------------------
// The two things you are most likely to edit live here.
// ---------------------------------------------------------------------------

// Where the readers live. On this host the books open in the same tab with a
// relative link, exactly like the current /resources page. Anywhere else (a
// preview, a claude.ai artifact) they open the live site in a new tab.
export const SITE = 'https://daggerheart.highsodiumgaming.com';

export const ON_SITE = /(^|\.)highsodiumgaming\.com$/i.test(location.hostname);

export const BOOKS = [
  {
    id: 'core',
    title: 'Daggerheart Core Rulebook',
    kicker: 'Daggerheart',
    name: 'Core Rulebook',
    openLabel: 'Open the Core Rulebook',
    sub: 'Everything: characters, play, GM tools, adversaries, campaign frames',
    meta: '397 pages · 5 chapters',
    pages: 397,
    path: '/resources/core-rulebook',
    // Real cover art. Only loads when this page is served from SITE (same
    // origin); otherwise the painted cover below is used.
    cover: '/covers/core-rulebook.webp',
    aspect: 760 / 984,
    thickness: 0.36,
    // table placement: x, z, rotation (radians, + is counter-clockwise from above)
    place: { x: -2.15, z: 2.55, rot: 0.14 },
    placeTall: { x: -1.3, z: 2.55, rot: 0.07 },      // phones held upright: the books sit closer together
    palette: { deep: '#0d1638', mid: '#1c2f6e', glow: '#3f6fd8', foil: '#f3cf7a', light: 0xffc56b },
  },
  {
    id: 'hf',
    title: 'Daggerheart: Hope & Fear',
    kicker: 'Daggerheart',
    name: 'Hope & Fear',
    openLabel: 'Open Hope & Fear',
    sub: 'The expansion',
    meta: '204 pages · Expansion',
    pages: 204,
    path: '/resources/hope-and-fear',
    cover: '/covers/hope-and-fear.webp',
    aspect: 760 / 1001,
    thickness: 0.21,
    place: { x: 1.75, z: 2.75, rot: -0.1 },
    placeTall: { x: 1.3, z: 2.7, rot: -0.05 },
    palette: { deep: '#170b2e', mid: '#3a1a63', glow: '#8d4bff', foil: '#f0cf86', light: 0xb98bff },
  },
];

export function hrefFor(book) {
  return ON_SITE ? book.path : SITE + book.path;
}

// The GM screen picture: one image across the three panels, on the players' side.
// Make the file with `node scripts/gm-screen.mjs <image> [focusX focusY]` (see README,
// "Changing the GM screen image"). focusX/focusY (0..1) only matter for a file that
// was not made by that script: the page crops it to the screen's shape around that point.
// Set image to null to go back to the plain painted screen.
export const GM_SCREEN = { image: 'art/gm-screen.jpg', focusX: 0.5, focusY: 0.5 };

// Where thrown dice land: an invisible bound on the open wood in front of the books (nothing is drawn).
// Centre x / z, width (x) and depth (z), in table units. Every throw aims inside it, dice bounce off
// its edges and come to rest in it, clear of the books, tokens, battle map and GM screen. The Duality
// d12s lie here between rolls. `tall` is the layout for phones held upright (books closer together).
// The camera's default view (main.js, FRAME) is set so this stays on screen above the command bar.
export const ROLL_AREA = {
  wide: { x: 0, z: 5.2, w: 6.4, d: 1.3 },
  tall: { x: 0.35, z: 6.15, w: 3.6, d: 1.2 },
};

export const HOME_HREF = ON_SITE ? '/' : SITE + '/';

// Quality tier. "lite" is for phones and small tablets.
export function pickTier() {
  const forced = /[#&]tier=(lite|full)/.exec(location.hash);
  if (forced) return forced[1];
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(screen.width, screen.height) < 820;
  return coarse && small ? 'lite' : 'full';
}


// The eight player-character pieces (models/pc/*.glb, one per entry in party.js). They stand on the battle map as a party
// advancing on the golem, which is at the bottom right of the map (`MINIS`, js/minis.js) and turned to face them. Every piece faces
// the golem (`turn`: a few degrees of its own, radians). Front = nearest the golem, by class:
//   front   Zeke (Guardian) at the point, Saveas (Warrior) and Mellanee (Brawler) either side
//   middle  Drex (Rogue) out on the near flank, Kerropi (Druid)
//   back    Naaz (Wizard), Thessaly (Sorcerer), Prim (Bard), each behind a gap in the line ahead
// `places` are footprint centres, x and z in table units. They come from a frame anchored at (0.3, -1.5) with its front pointing at the
// golem: (u ahead, v across) = Zeke (1, 0), Saveas (.55, -.95), Mellanee (.55, .95), Kerropi (-.2, .5), Drex (-.1, 1.95),
// Naaz (-.9, -.45), Thessaly (-.9, -1.35), Prim (-.95, .65); spacing about 0.9, unit-tested for overlap and for the order.
// The files are in metres, true heights (Zeke 2.16, Drex 0.95 with the foam finger). `scale` is table units per metre, the same
// for all eight so the heights stay true to each other. The old stand-in heroes stood 0.55 tall for a person of about 1.8 m
// (0.31 a metre); 0.4 makes the pieces 1.2 to 1.6x that (Zeke 0.86, Naaz and Mellanee 0.74, Drex 0.44; the golem is 1.0).
export const PIECES = {
  dir: 'models/pc/',
  scale: 0.4,
  places: {
    pc_zeke: { x: 1.25, z: -1.18, turn: 0.0 },
    pc_saveas: { x: 1.12, z: -2.23, turn: 0.06 },
    pc_mellanee: { x: 0.52, z: -0.42, turn: -0.05 },
    pc_kerropi: { x: -0.05, z: -1.09, turn: 0.05 },
    pc_drex: { x: -0.41, z: 0.32, turn: -0.06 },
    pc_naaz: { x: -0.41, z: -2.21, turn: -0.04 },
    pc_thessaly: { x: -0.13, z: -3.07, turn: 0.07 },
    pc_prim: { x: -0.81, z: -1.18, turn: 0.03 },
  },
};
