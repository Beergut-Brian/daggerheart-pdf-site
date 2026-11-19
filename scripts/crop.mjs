// node scripts/crop.mjs <in.png> <out.png> x y w h   (pixels of the input, no scaling)
import sharp from "sharp";
const [i, o, x, y, w, h] = process.argv.slice(2);
await sharp(i).extract({ left: +x, top: +y, width: +w, height: +h }).toFile(o);
