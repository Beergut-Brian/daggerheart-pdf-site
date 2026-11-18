const sharp = require('/srv/ai-hub/jobs/daggerheart-site-2026-10-23/site/node_modules/sharp');
const path = require('path');
const R = path.resolve(__dirname, '..');
const src = path.join(R, 'hero-campfire-original.png');
(async () => {
  for (const w of [2400, 1200]) {
    const base = sharp(src).resize({ width: w });
    await base.clone().avif({ quality: 52 }).toFile(path.join(R, `img/hero-campfire-${w}.avif`));
    await base.clone().webp({ quality: 74 }).toFile(path.join(R, `img/hero-campfire-${w}.webp`));
    await base.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(R, `img/hero-campfire-${w}.jpg`));
  }
  // portrait crop for phones: centred on fire (x 50%) with plume above; 2912x1632 -> 1100 wide x 1632 tall from x 920
  const crop = { left: 905, top: 0, width: 1100, height: 1632 };
  const p = sharp(src).extract(crop).resize({ width: 900 });
  await p.clone().avif({ quality: 52 }).toFile(path.join(R, 'img/hero-campfire-portrait-900.avif'));
  await p.clone().webp({ quality: 74 }).toFile(path.join(R, 'img/hero-campfire-portrait-900.webp'));
  await p.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(R, 'img/hero-campfire-portrait-900.jpg'));
  console.log('ok');
})();
