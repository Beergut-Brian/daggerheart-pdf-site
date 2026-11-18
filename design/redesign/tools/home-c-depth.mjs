// Usage: node home-c-depth.mjs <src.png> <outDir> <sampleW>
// Runs Depth Anything V2 small (ONNX, via @huggingface/transformers in /tmp/hc-npm) on the hero photo.
// Writes depth.png (greyscale, nearer = brighter) and color.jpg, both sampleW wide, same aspect as the source.
import { createRequire } from 'module';
const require = createRequire('/tmp/hc-npm/');
const sharp = require('sharp');
const { pipeline, RawImage, env } = await import('/tmp/hc-npm/node_modules/@huggingface/transformers/dist/transformers.node.mjs');
const [src, out, sw = '900'] = process.argv.slice(2);
env.cacheDir = '/tmp/hc-npm/hf-cache';
const MODEL = 'onnx-community/depth-anything-v2-small';
const t0 = Date.now();
const depth = await pipeline('depth-estimation', MODEL, { dtype: 'fp32' });
const meta = await sharp(src).metadata();
// feed the model a 1456-wide copy (it resizes to ~518 short side internally anyway)
const inBuf = await sharp(src).resize(1456).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const img = new RawImage(new Uint8ClampedArray(inBuf.data), inBuf.info.width, inBuf.info.height, 3);
const res = await depth(img);
const pd = res.predicted_depth; // relative inverse depth: larger = nearer
console.log('model', MODEL, 'pred dims', pd.dims, 'secs', ((Date.now() - t0) / 1000).toFixed(1));
const [h, w] = pd.dims.slice(-2);
const d = pd.data; let lo = Infinity, hi = -Infinity;
for (const v of d) { if (v < lo) lo = v; if (v > hi) hi = v; }
const g = Buffer.alloc(w * h);
for (let i = 0; i < d.length; i++) g[i] = Math.round(255 * (d[i] - lo) / (hi - lo));
const W = +sw, H = Math.round(W * meta.height / meta.width);
await sharp(g, { raw: { width: w, height: h, channels: 1 } }).resize(W, H, { fit: 'fill' }).png().toFile(out + '/depth.png');
await sharp(src).resize(W, H, { fit: 'fill' }).jpeg({ quality: 88, mozjpeg: true }).toFile(out + '/color.jpg');
console.log('wrote', W + 'x' + H, 'range', lo, hi);
