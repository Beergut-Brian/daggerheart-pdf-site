// Usage: node tools/home-c-build.js   -> home-c/splat.bundle.js (classic IIFE, so it runs over file://)
// three is vendored from npm (installed in /tmp/hc-npm-c) and tree-shaken into the bundle.
const path = require('path');
const R = path.resolve(__dirname, '..');
require('/tmp/hc-npm-c/node_modules/esbuild').build({
  entryPoints: [path.join(R, 'home-c/src/splat.js')],
  outfile: path.join(R, 'home-c/splat.bundle.js'),
  bundle: true, format: 'iife', minify: true, target: ['es2019'], legalComments: 'eof',
  nodePaths: ['/tmp/hc-npm-c/node_modules'],
  banner: { js: '/* home-c splat hero. Source: home-c/src/splat.js. Bundles three.js (MIT). */' },
}).then((r) => console.log('built', r.warnings.length, 'warnings')).catch(() => process.exit(1));
