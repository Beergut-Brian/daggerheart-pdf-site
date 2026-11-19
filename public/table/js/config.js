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

// The party's attack cards. The note card to the left of the books shows the
// first character; its rows roll an attack on the monster (see README).
//   id, name, class   shown on the card
//   mini              which miniature attacks (an id from MINIS in minis.js)
//   proficiency       how many damage dice a weapon rolls (d8+2 at Proficiency 2 = 2d8+2)
//   attacks           { id, name, range: 'Melee' | 'Very Close' | 'Close' | 'Far', trait, mod,
//                       damage: 'd8+2', type: 'phy' | 'mag',
//                       style?: 'melee' | 'ranged' | 'magic' (overrides the mini's own attack), bolt?: colour }
// STAND-INS: every name and number below is a placeholder until Kaden's party arrives.
export const CHARACTERS = [
  {
    id: 'guardian', name: 'Brannoc Vale', class: 'Guardian', mini: 'guardian', proficiency: 1,
    attacks: [
      { id: 'longsword', name: 'Longsword', range: 'Melee', trait: 'Agility', mod: 2, damage: 'd8+2', type: 'phy' },
      { id: 'shield-bash', name: 'Shield Bash', range: 'Melee', trait: 'Strength', mod: 1, damage: 'd4+1', type: 'phy' },
      { id: 'javelin', name: 'Javelin', range: 'Far', trait: 'Finesse', mod: 1, damage: 'd6+1', type: 'phy', style: 'ranged', bolt: 0xffc46a },
      { id: 'ember-ward', name: 'Ember Ward', range: 'Close', trait: 'Presence', mod: 0, damage: 'd6+1', type: 'mag', style: 'magic', bolt: 0xff8a4a },
    ],
  },
];
