// Turns the home-d board data (design/redesign/home-d) into static assets for the landing hero:
//   public/splat/scene.json   palette + grid metadata
//   public/splat/idx.bin      palette index per cell (zlib-deflated bytes)
//   public/splat/depth.bin    depth 0-63 per cell (zlib-deflated bytes)
//   public/splat/still.webp   the posterised pixel-art still (LCP image and reduced-motion/no-WebGL fallback)
// Run: node scripts/build-splat-assets.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import sharp from "sharp";

const src = "design/redesign/home-d";
const out = "public/splat";
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(src, "scene-data.js"), "utf8"), ctx);
const { idx, depth, ...meta } = ctx.window.HOME_D_SCENE;
fs.writeFileSync(path.join(out, "scene.json"), JSON.stringify(meta));
fs.writeFileSync(path.join(out, "idx.bin"), Buffer.from(idx, "base64"));
fs.writeFileSync(path.join(out, "depth.bin"), Buffer.from(depth, "base64"));
await sharp(path.join(src, "still.png")).webp({ lossless: true, effort: 6 }).toFile(path.join(out, "still.webp"));
for (const f of fs.readdirSync(out)) console.log(f, fs.statSync(path.join(out, f)).size);
