/* hero.js — places the invisible pour anchor over the painted pour point (tracks the
   object-fit:cover crop and the art zoom), centres the type column under the pour,
   then mounts the shared salt engine. Board config: window.HERO = { wide:{…}, tall:{…}, engine:{…} }.
   Each crop: img natural w/h, object-position px/py (0..1), zoom z about origin ox/oy (0..1 of hero),
   pour point fx/fy (0..1 of the image), stackFollow (centre the type under the pour, clamped). */
(function () {
  const C = window.HERO;
  const hero = document.getElementById('hero');
  const pour = document.getElementById('pour');
  const stack = document.querySelector('.stack');
  const mq = matchMedia('(min-width: 700px)');

  function place() {
    const k = mq.matches ? C.wide : C.tall;
    const W = hero.clientWidth, H = hero.clientHeight;
    const s = Math.max(W / k.w, H / k.h), dw = k.w * s, dh = k.h * s;
    let x = (W - dw) * k.px + k.fx * dw, y = (H - dh) * k.py + k.fy * dh;
    const z = k.z || 1, ox = (k.ox ?? .5) * W, oy = (k.oy ?? .5) * H;
    x = ox + z * (x - ox); y = oy + z * (y - oy);
    pour.style.left = x + 'px'; pour.style.top = y + 'px';
    hero.style.setProperty('--pour-x', x + 'px');
    hero.style.setProperty('--pour-y', y + 'px');
    if (stack && k.stackFollow) {
      const half = stack.offsetWidth / 2, g = Math.min(88, W * .05);
      hero.style.setProperty('--stack-x', Math.max(half + g, Math.min(W - half - g, x)) + 'px');
    } else hero.style.setProperty('--stack-x', '50%');
  }
  place();
  addEventListener('resize', place);
  mq.addEventListener('change', place);

  const phone = !matchMedia('(min-width: 600px)').matches;
  const E = C.engine;
  const cv = document.getElementById('salt');
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    place();
    window.salt = SaltEngine.mount(cv, Object.assign({
      cell: phone ? E.cellPhone : E.cellDesk,
      maxGrains: phone ? E.maxPhone : E.maxDesk,
      colors: E.colors,
      emitters: [{ anchor: '#pour', ox: .5, oy: .5, rate: phone ? E.ratePhone : E.rateDesk, spread: phone ? E.spreadPhone : E.spreadDesk, seconds: E.seconds }],
      solids: [{ selector: '.wm', mode: 'glyphs' }, { selector: '.plaque', mode: 'rect' }],
      prefill: phone ? E.prefillPhone : E.prefillDesk,
      pointer: { radius: 30, force: 3.2 }, tap: { grains: phone ? 500 : 900 },
      eventTarget: hero,
    }, E.extra || {}));
  });
})();
