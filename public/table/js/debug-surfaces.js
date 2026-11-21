// #debug=surfaces: one panel that shows, for every drawn surface, what is actually in its texture.
// Solid outline = the texture's rectangle. Dashed outline = where the element's CSS box lands at the
// canvas's pixel ratio. On a healthy surface the two match and the picture fills both.
// Live path: the texture is read back from the GPU. Painted path: the 2D canvas it was made from.

const TILE = 220;   // tile width in CSS px

export function startSurfaceDebug(surfaces) {
  const css = getComputedStyle(document.documentElement);
  const color = (name) => css.getPropertyValue(name).trim();
  const panel = document.createElement('div');
  panel.id = 'surf-debug';
  panel.setAttribute('aria-hidden', 'true');
  const head = document.createElement('p');
  panel.append(head);
  const tiles = surfaces.list.map((s) => {
    const fig = document.createElement('figure'), c = document.createElement('canvas'), cap = document.createElement('figcaption');
    fig.append(c, cap); panel.append(fig);
    return { s, c, cap };
  });
  document.body.append(panel);

  function texture(s) {
    if (surfaces.mode !== 'html') return s.canvas2d ? { src: s.canvas2d, w: s.canvas2d.width, h: s.canvas2d.height } : null;
    const w = s.aw, h = s.ah;
    if (!w || !h) return null;
    const px = surfaces.readTexels(s, 0, 0, w, h);
    if (!px) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(px.buffer), w, h), 0, 0);
    return { src: c, w, h };
  }

  function draw() {
    const canvas = surfaces.canvas, k = canvas.width / Math.max(1, canvas.clientWidth);
    head.textContent = `surfaces: ${surfaces.mode === 'html' ? 'live HTML (' + surfaces.api.call + ')' : 'painted'} · canvas pixel ratio ${k.toFixed(2)} · devicePixelRatio ${devicePixelRatio}`;
    for (const { s, c, cap } of tiles) {
      const t = texture(s);
      // focus surfaces are made at the screen's density, not the canvas's ratio: their element is CSS-zoomed by density / ratio (sharpen pass)
      const z = s.focus ? s.zoom || 1 : 1, [cw, ch] = s.size, boxW = (s.el.offsetWidth || cw) * (surfaces.mode === 'html' ? k * z : s.scale || 1), boxH = (s.el.offsetHeight || ch) * (surfaces.mode === 'html' ? k * z : s.scale || 1);
      const tw = t ? t.w : boxW, th = t ? t.h : boxH;
      // the tile shows the larger of the two rectangles, so either can stick out
      const f = TILE / Math.max(tw, boxW), H = Math.ceil(Math.max(th, boxH) * f);
      c.width = TILE * devicePixelRatio; c.height = H * devicePixelRatio; c.style.width = TILE + 'px'; c.style.height = H + 'px';
      const g = c.getContext('2d');
      g.scale(devicePixelRatio, devicePixelRatio);
      if (t) g.drawImage(t.src, 0, 0, tw * f, th * f);
      g.lineWidth = 2;
      g.strokeStyle = color('--debug-tex'); g.setLineDash([]); g.strokeRect(1, 1, tw * f - 2, th * f - 2);
      g.strokeStyle = color('--debug-box'); g.setLineDash([6, 4]); g.strokeRect(1, 1, boxW * f - 2, boxH * f - 2);
      const ok = Math.abs(tw - boxW) <= 2 && Math.abs(th - boxH) <= 2;
      cap.textContent = `${s.id}${ok ? '' : ' ✗'} · CSS ${cw}×${ch} · box ${Math.round(boxW)}×${Math.round(boxH)} · texture ${tw}×${th}`;
      cap.className = ok ? '' : 'is-off';
    }
  }
  draw();
  setInterval(draw, 1500);
}
