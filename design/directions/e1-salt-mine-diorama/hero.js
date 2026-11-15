// E landing: mounts the shared salt engine and makes Sal wiggle when a tap shakes more salt.
(function () {
  const css = getComputedStyle(document.documentElement);
  const tok = n => css.getPropertyValue(n).trim();
  const hero = document.getElementById('main');
  const sal = document.querySelector('[data-wiggle]') || document.getElementById('world');
  const phone = matchMedia('(max-width: 699px)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cfg = window.SALT_CFG || {};
  window.salt = SaltEngine.mount(document.getElementById('salt'), {
    cell: 4,
    maxGrains: phone ? 6000 : 12000,
    colors: [tok('--c-salt'), tok('--c-salt-2'), tok('--c-salt-3')],
    emitters: [{ anchor: '#cap', ox: 0.5, oy: 0.5, rate: phone ? (cfg.ratePhone || 170) : (cfg.rateDesk || 280), spread: 5, seconds: 2.6 }],
    solids: [{ selector: '.wordmark', mode: 'glyphs' }, { selector: '.key .face', mode: 'rect' }],
    prefill: phone ? (cfg.prePhone || 520) : (cfg.preDesk || 1500),
    pointer: { radius: 30, force: 3.2 },
    tap: { grains: 520 },
    eventTarget: hero,
  });
  if (reduce || !sal) return;
  hero.addEventListener('pointerdown', e => {
    if (e.target.closest('a,button,input')) return;
    sal.classList.remove('wiggle'); void sal.offsetWidth; sal.classList.add('wiggle');
  });
  sal.addEventListener('animationend', () => sal.classList.remove('wiggle'));
})();
