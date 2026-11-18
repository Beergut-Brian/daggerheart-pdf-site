const fs = require('fs'), path = require('path');
const T = __dirname, R = path.resolve(T, '..');
const page = fs.readFileSync(path.join(T, 'page-135.html'), 'utf8');
const hits = fs.readFileSync(path.join(T, 'hits.html'), 'utf8');
for (const [tpl, out] of [['viewer-desktop.tpl.html', 'viewer/index.html'], ['viewer-phone.tpl.html', 'viewer/phone.html']])
  fs.writeFileSync(path.join(R, out), fs.readFileSync(path.join(T, tpl), 'utf8').replace('{{PAGE}}', page).replace('{{HITS}}', hits));
console.log('built viewer');
