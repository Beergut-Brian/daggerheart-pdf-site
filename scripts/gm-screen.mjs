// Prepare the GM screen picture for /table.
//   node scripts/gm-screen.mjs <source image> [focusX focusY]
// Crops the source to the screen's unfolded shape (left wing + centre + right wing,
// cover, no stretch) around the focus point (0..1 across and down; default 0.5 0.5),
// scales it down to at most 2560 px wide (never up) and writes
// public/table/art/gm-screen.jpg under 250 KB. The page splits it at the folds.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { coverCrop, SCREEN_ASPECT } from "../public/table/js/screen-art.js";

const [src, fxArg, fyArg] = process.argv.slice(2);
if (!src) { console.error("usage: node scripts/gm-screen.mjs <source image> [focusX focusY]"); process.exit(2); }
const fx = fxArg == null ? 0.5 : Number(fxArg), fy = fyArg == null ? 0.5 : Number(fyArg);
if (![fx, fy].every((v) => v >= 0 && v <= 1)) { console.error("focusX and focusY are numbers from 0 to 1"); process.exit(2); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "public/table/art/gm-screen.jpg");
const MAX_W = 2560, MAX_BYTES = 250 * 1024;

const meta = await sharp(src).rotate().metadata();
const c = coverCrop(meta.width, meta.height, SCREEN_ASPECT, fx, fy);
const box = { left: Math.round(c.x), top: Math.round(c.y), width: Math.round(c.w), height: Math.round(c.h) };
const width = Math.min(MAX_W, box.width);
let buf, q = 90;
for (; q >= 50; q -= 6) {
  buf = await sharp(src).rotate().extract(box).resize({ width, withoutEnlargement: true }).jpeg({ quality: q, mozjpeg: true }).toBuffer();
  if (buf.length <= MAX_BYTES) break;
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buf);
const m = await sharp(buf).metadata();
console.log(`source ${meta.width}x${meta.height}, crop ${box.width}x${box.height} at ${box.left},${box.top} (focus ${fx}, ${fy})`);
console.log(`wrote ${path.relative(root, out)} ${m.width}x${m.height}, ${Math.round(buf.length / 1024)} KB, jpeg q${q}`);
if (box.width < MAX_W) console.log(`note: the crop is ${box.width} px wide; a source at least ${Math.ceil(MAX_W)} px wide after cropping will look sharper on the screen.`);
