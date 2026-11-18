# home-d polish log (pixel-art splat)

Compared against `renders/home-d-vs-inspo.png` (JungleSilicon 03-frame-10s.png beside a 1280x720 crop of home-d-1440 at the same scale), plus max-orbit corner shots (mouse held at each corner, 2.5 s ease) for cracks.

Setup that held through every pass: 450x252 cell grid from the 900x504 shared photo (2 photo px per cell), drawn as hard-edged square GL points into a low-res buffer (one buffer pixel = one cell, 325x203 at 1440) that CSS upscales with `image-rendering: pixelated`. Result: **4.43 CSS px per splat at 1440, 4.42 at 390** (stride 2 on phone). The palette is 21 colours: the page ground (#0d0d0d, from tokens.css), 14 cool (canopy teal-greens and smoke blues), and 6 fire (5 k-means plus a near-white core). Depth comes from home-c/depth.png, quantised to 64 levels and terraced to cell multiples. Orbit is ±6.5° yaw and ±4.5° pitch around the fire.

## Pass 1: first render
- Pixel size: about 4.4 px, close to the inspiration frame's 4-5 px. Kept.
- Palette and glow: reads as pixel art straight away, but the canopy is a flat teal mush with no form. The warm spill around the fire is big enough that the fire reads as a blob rather than a light source. 14-level Bayer dither shows as a visible checker mesh; the inspiration has flat colour fields.
- Motes: the 2-px motes (18% of them) are 9 CSS px squares, chunkier than the inspiration's single-pixel motes.
- Edge fade: the elliptical fade drops edge cells to the ground colour (and they are not drawn), so the border never shows at max orbit. Kept.
- Holes: at max orbit, no cracks at depth cliffs (the skirt voxels work). There are a few rare one-pixel-wide dark vertical streaks.

## Pass 2: form and light
- Canopy is lit by depth (nearer = brighter), but only on green cells and outside the fire's pool. Crown tops now read like the lit voxel tops in the inspiration. A first try lit everything and killed the blue smoke, so I restricted it to green.
- Warm spill: radius 0.07 → 0.05 and strength ×0.7. The fire is now a compact bright source with a small warm pool.
- Dither amplitude 14 → 9. Motes are now 1 px except 5%.
- Splat overlap 1.6 → 1.75 buffer px. Re-shot both max-orbit corners: no streaks or cracks.

## Pass 3: flatter, hand-pixelled fields
- Side by side with the squid frame, home-d was still noisier: photo texture instead of the inspiration's flat shapes. Added an isolated-pixel cleanup (a cell unlike all 4 neighbours takes their majority; fire highlights exempt; 2 passes, 20.5k + 2.4k cells changed). Dither 9 → 6.
- Result: flat colour fields with stepped edges, closer to hand-placed pixels. scene-data.js dropped to 48 KB and still.png to 12.5 KB.
- Holes: re-checked the tl and br corners at max orbit; no black cracks.
- Left as is: the scene stays teal-dominant (it is the photo's own colour). The fire spill keeps a little ochre so the clearing reads as lit.
