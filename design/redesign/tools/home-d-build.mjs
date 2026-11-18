// Usage: node tools/home-d-build.mjs   (deps in /tmp/hc-npm-d: three, esbuild)
// Bundles home-d/splat.src.js + three into a classic IIFE (home-d/splat.bundle.js) so it runs over file://.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire('/tmp/hc-npm-d/');
const esbuild = require('esbuild');
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = await esbuild.build({
  entryPoints: [path.join(R, 'home-d/splat.src.js')], outfile: path.join(R, 'home-d/splat.bundle.js'),
  bundle: true, format: 'iife', minify: true, target: 'es2020', nodePaths: ['/tmp/hc-npm-d/node_modules'],
  legalComments: 'none', metafile: true, banner: { js: '/* home-d splat bundle (three.js, MIT). Source: splat.src.js. Build: tools/home-d-build.mjs */' },
});
const o = Object.values(r.metafile.outputs)[0];
console.log('splat.bundle.js', o.bytes, 'B');
