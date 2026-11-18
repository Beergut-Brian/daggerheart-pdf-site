# Designer task: home-c, SOFT splat hero with mouse parallax (redesign pass 2, 2026-11-18)
J = /srv/ai-hub/jobs/daggerheart-site-2026-10-23. Work only in J/design/redesign/home-c/ (plus renders/home-c-* and tools/home-c-*). No site/app or site/public edits, no commit, push, deploy or messages. No salt. Do not touch home-d/ (a parallel agent builds the pixel-art version there). Do not edit shared/base.css, shared/tokens.css or GATE.md (another agent owns the button CSS; link shared CSS like home-a does).

Kaden (verbatim, 18:20): "I'd also love to explore using a Gaussian splat or pixel splat for the image, and on mouse move the scene would move slightly around." (18:27): "Actually, can we run two? One with your original idea and one with this one you just started?" This board is the ORIGINAL idea: a soft splat.

## Already done (keep)
- `home-c/depth.png` (900x504, greyscale, nearer = brighter) and `home-c/color.jpg` (900x504), from Depth Anything V2 small (onnx-community/depth-anything-v2-small) via @huggingface/transformers, script `tools/home-c-depth.mjs`. SHARED with home-d, which reads them: do not modify, move or re-encode these two files. If you want another resolution, resample into new files (e.g. from ../hero-campfire-original.png for colour; resize depth.png). Do not re-run the model. /tmp/hc-npm was wiped; install what you need (three, esbuild, sharp) into /tmp/hc-npm-c.

## Build `home-c/index.html`
Same layout, copy, nav, tag pill, headline, sub-line and CTA as `home-a/index.html` (copy its markup exactly; read home-a and shared/*.css first). Only the hero changes; headline and nav stay crisp HTML over the canvas, with home-a's left gradient and edge fades as HTML/CSS overlays.
1. Splats: three.js (vendor from npm `three`); points shader (or instanced quads) where each cell is a SOFT ROUND splat with gaussian alpha falloff, size attenuation, blending tuned (premultiplied or weighted) so at rest it is dense and painterly and looks like the photo until it moves. Placed in depth from depth.png (canopy near, clearing/fire deeper). Cap about 300-600k points; use a higher-res colour sample than 900 wide if needed for photo fidelity.
2. Camera orbits a few degrees toward the mouse, eased. Touch / no-hover: slow idle drift. `prefers-reduced-motion`: the flat photo (../img/ hero), no canvas. No WebGL: the flat photo. Pause the loop offscreen / hidden tab.
3. No holes or stretched edges at the image border during orbit (overscan the scene, fade edges, size splats so neighbours overlap at max angle). Embers optional (shared/embers.js may be reused), must feel layered in front of the canopy.
4. Framing: fire placed as in home-a at 1440; visible at 390 (portrait framing via camera/fov or crop).
5. file:// gotcha: Chrome blocks ES module imports and cross-origin texture / getImageData reads over file://. Ship a classic IIFE bundle (esbuild) `home-c/splat.bundle.js` with its source beside it, and pack colours + depth into a JS data file (base64 typed arrays, e.g. `home-c/scene-data.js`). Verify the canvas actually draws in the file:// render.
6. Perf: aim for 60 fps on a laptop. In headless Chromium (SwiftShader, so a lower bound) measure mean frame time over 3 s; report page weight (data + bundle).

## Renders and checks
Renderer pattern: tools/render.js (playwright-core at J/site/node_modules/playwright-core, executablePath /ms-playwright/chromium-1248/chrome-linux64/chrome, args --no-sandbox, plus --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist if WebGL needs it).
- `renders/home-c-1440.png` (first screen 1440x900), `renders/home-c-390.png` (390x844, scale 2), `renders/home-c-parallax.webm` (recordVideo 1440x900, 6-8 s, mouse sweeping slowly across the hero left to right and back).
- Polish: at least two passes comparing home-c-1440 against renders/home-a-1440-first.png (splat softness so no dots at rest, no cracks or border at max orbit, darkening matches home-a); log in `home-c/polish.md`.
- `npx -y impeccable detect --json home-c` saved to home-c/detect.json.
- `GATE-home-c.md` in redesign/ (≤12 lines): plainly how close this is to a true Gaussian splat (a real 3DGS scene needs multiple views or an image-to-3D model; this is a depth-displaced splat from one photo), page weight, frame time, polish passes, honest verdict home-c vs home-a.

## Done test (the Leader checks each)
home-c/index.html runs from file:// with no outside requests and the canvas draws; the 1440 still looks like the photo (no visible dots) with the fire visible at 390; the webm shows parallax layering; reduced-motion and no-WebGL fallbacks show the photo; polish.md has 2 or more passes; detect saved; GATE-home-c.md written; depth.png and color.jpg unchanged.
