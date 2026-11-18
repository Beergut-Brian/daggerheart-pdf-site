# home-c polish log (soft splat hero, 2026-11-18)

Compared each time against `renders/home-a-1440-first.png`, at 1x and as 2-4x gain crops (canopy right of the fire at 1100,420; the left photo edge at 100,150). Luma means are from `sharp` on six regions (left copy area, fire, right canopy, top band, bottom, plume). Orbit checks use the four corner extremes (yaw ±3.2°, pitch ±2°) via `HC_SPLAT.set(±1, ±1)`.

## Pass 0: first build (earlier run)
- 1024x574 grid (587,776 splats; 146,944 on phones at stride 2). Each splat is a round gaussian (alpha = exp(-3.2 r²)) that carries its own patch of a 2048-wide colour texture, painted far to near over a backdrop quad of the photo at the far depth. At rest every overlapping splat agrees on the colour under a pixel, so the still is the photo, with no dot grid.
- Framing copies home-a's `object-fit: cover` box and object-position, overscanned 1.05 about the fire, so the fire lands where it does in home-a at 1440 and centred at 390.

## Pass 1: proof the canvas draws, softness, orbit edges
- Proof: the bundle now reads back 9 pixels across the middle of the first frame and only reveals the canvas if some are lit. It sets `window.HC_SPLAT.proof` and logs `home-c splat: canvas drew {"splats":587776,"grid":"1024x574","litSamples":9,"webgl":2}` (390: 146,944 splats, 512x287). The render script also hides the fallback `<picture>` and shoots again (`/tmp/home-c-proof-1440.png`, `-390.png`). Both frames are the full scene, so the pixels come from the canvas, not the photo.
- Softness: no dots at rest at 1x. At 2-3x gain, the dark canopy showed faint 8x8 blocks and horizontal banding. Hiding the splats (backdrop only) showed the same blocks, so they came from the JPEG q80 texture plus the 1.12 gain, not from the splats.
- Darkening vs home-a: home-c ran slightly bright (fire 77.8 vs 74.7, top band 51.3 vs 47.2, left 23.5 vs 23.3, bottom 13.9 vs 13.8).
- Orbit extremes: no holes or cracks; the canopy layer slides over the clearing and the trees at the right edge visibly shift. A faint seam showed at the photo's left border (x≈165) at 4x gain: the edge fade went to the page colour.

## Pass 2: fixes
- Colour texture: JPEG q80 → WebP q88 (209 KB → 235 KB). Depth: PNG → lossless WebP (190 KB → 90 KB). scene-data.js shrank from 531 KB to 435 KB, and the blocks are gone.
- A ±0.5/255 dither in both fragment shaders removes the banding in the dark gradients.
- Brightness 1.12 → 1.09. Result: fire 76.2 (home-a 74.7), right canopy 25.3 (25.1), left 23.5 (23.3), bottom 13.8 (13.8), plume 65.5 (67.1). The leftover gap in the fire and plume comes from the in-scene embers and the 1.05 overscan, not the gain.
- Backdrop: the quad is 40% larger with clamp-to-edge UVs (border pixels smeared outward) instead of fading to the page colour, so max orbit cannot show its edge. A 0.4-level step (12.5 vs 12.9) remains at x≈165 under the solid scrim. It is below one 8-bit level and only visible at 4x gain.
- Orbit extremes after pass 2: region means stay within ±1 luma of rest at all four corners (no dark gaps). The parallax shows in the canopy against the clearing, not in brightness.

## Left as is
- Font preload console error over file:// (crossorigin preload of a file:// font). This comes from home-a's markup, which was copied exactly. The @font-face in base.css still loads Inter Tight.
- The fallback `<picture>` still downloads (home-a's 108 KB AVIF) under the canvas. It paints before the splat scene is ready and is the reduced-motion and no-WebGL view.

## Pass 3: frame time, step-down, final renders
- SwiftShader timing at 1440 for the full grid (587,776 splats) was 450-660 ms per frame across runs. Halving the grid gave only about 2x (298 ms), not 4x, so the CPU rasteriser is limited by fill rate, not splat count: about 4 layers of overlapping splats plus the backdrop over 1440x900.
- Added an adaptive step-down. The desktop starts on the full grid, and if the median frame over the first ~1.5 s is above 22 ms (slower than about 45 fps), it rebuilds once on the 512x287 grid (146,944 splats). It logs `home-c splat: stepped down to the half grid` and records it in `HC_SPLAT.proof.steppedDown`. Adding `#full` to the URL pins the full grid; the renders use it so nothing changes mid-capture.
- Half grid at 1440 vs full: identical region means at rest (fire 76.2, canopy 25.3, plume 65.5), and the 2x canopy crop shows no dots. The textured splats keep the photo detail. Orbit at the corners is also clean.
- Final renders were redone from the final bundle: home-c-1440.png, home-c-390.png and home-c-parallax.webm (7.2 s, 216 frames at 30 fps, VP9, the real mouse swept centre → left → right → centre). Frames at 1.7 s and 5.0 s show the right-hand canopy sliding over the clearing while the fire, the pivot, stays put. The embers rise in front of the canopy.
- Fallbacks were re-checked: with reduced motion and with WebGL disabled there is no canvas, and the photo shows, framed like home-a.
