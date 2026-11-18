// Brand mark -> icons. Source: design/brand/shaker-original.png (Kaden's salt shaker, untouched).
// Writes app/icon.png (512, transparent), app/apple-icon.png (180, white), app/favicon.ico (16/32/48), public/brand/shaker.png (nav, 3x).
// Run: node scripts/build-icons.mjs
import sharp from "sharp";
import fs from "node:fs";
const src = "design/brand/shaker-original.png";
const none = { r: 0, g: 0, b: 0, alpha: 0 };

// fit the whole mark inside a square with padding, on a ground
const square = async (size, pad, ground, input = src) => {
  const inner = Math.round(size * (1 - 2 * pad));
  const img = await sharp(input).resize(inner, inner, { fit: "inside", kernel: "lanczos3" }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: ground } }).composite([{ input: img, gravity: "centre" }]).png().toBuffer();
};

fs.writeFileSync("app/icon.png", await square(512, 0.06, none));
fs.writeFileSync("app/apple-icon.png", await sharp(await square(180, 0.1, { r: 255, g: 255, b: 255, alpha: 1 })).flatten({ background: "#ffffff" }).png().toBuffer());

// shaker only (no salt pile) for the smallest sizes: the pile is the bottom-right of the art
const crop = await sharp(src).extract({ left: 0, top: 0, width: 335, height: 245 }).trim().toBuffer();
fs.writeFileSync("design/brand/shaker-only.png", crop);
const sizes = [16, 32, 48];
const pngs = [];
for (const s of sizes) pngs.push(await square(s, s <= 32 ? 0.02 : 0.05, none, s <= 32 ? crop : src));
// ICO with PNG payloads
const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
let off = 6 + 16 * pngs.length;
const dir = pngs.map((p, i) => { const e = Buffer.alloc(16); e[0] = sizes[i]; e[1] = sizes[i]; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(p.length, 8); e.writeUInt32LE(off, 12); off += p.length; return e; });
fs.writeFileSync("app/favicon.ico", Buffer.concat([head, ...dir, ...pngs]));
sizes.forEach((s, i) => fs.writeFileSync(`design/brand/favicon-${s}.png`, pngs[i]));

// nav mark: the mark itself, 3x of a 28 px display height
await sharp(src).resize({ height: 84, kernel: "lanczos3" }).png({ compressionLevel: 9 }).toFile("public/brand/shaker.png");
for (const f of ["app/icon.png", "app/apple-icon.png", "app/favicon.ico", "public/brand/shaker.png"]) console.log(f, fs.statSync(f).size);
