/* salt-glow.js — thin wrapper over the shared engine (unchanged): reads the luminous
   salt colours from the CSS tokens and mounts with this board's emitter + solids. */
window.SaltGlow = function (cfg) {
  const css = getComputedStyle(document.documentElement);
  const colors = ['--salt-1', '--salt-2', '--salt-3', '--salt-4'].map(v => css.getPropertyValue(v).trim());
  const phone = matchMedia('(max-width: 699px)').matches;
  const c = phone ? cfg.phone : cfg.wide;
  window.salt = SaltEngine.mount(document.getElementById('salt'), {
    cell: 3, maxGrains: phone ? 6000 : 14000, colors,
    // 1: the monster's pour point (measured on the art); 2: a light drift that settles on the button
    emitters: [{ anchor: '#pour', ox: 0.5, oy: 0.5, rate: c.rate, spread: c.spread, seconds: c.seconds },
      { anchor: '.stack .pill', ox: 0.5, oy: c.driftOy || -1, rate: c.drift || 22, spread: c.driftSpread || 150, seconds: c.seconds }],
    solids: [{ selector: '.wm', mode: 'glyphs' }, { selector: '.stack .pill', mode: 'rect' }],
    prefill: c.prefill, prefillMode: 'emitters', pointer: { radius: 30, force: 3.2 }, tap: { grains: phone ? 500 : 900 },
    eventTarget: document.getElementById('main'),
  });
};
