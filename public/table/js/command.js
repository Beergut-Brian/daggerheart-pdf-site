// The command bar and the roll log.
// The bar is a plain form in the page chrome. The log is one of the table's
// surfaces (live HTML-in-Canvas where the browser has it, painted otherwise),
// shown in screen space just above the bar by a tiny overlay pass.
import * as THREE from '../vendor/three.bundle.js';
import { LOG_SIZE } from './surfaces.js';

const SHOW_MS = 8000, FADE_MS = 700, KEEP = 6, HISTORY = 30;

export function createCommandBar({ surfaces, log, canvas, onCommand, renderer = null, clock = () => performance.now() }) {
  const form = document.querySelector('#cmd'), input = document.querySelector('#cmd-in'), live = document.querySelector('#log-live');
  const root = document.documentElement;
  const entries = [];                 // { text, detail, tone, t }
  const history = []; let hIdx = -1, draft = '';

  // ---- phones: keep the bar above the on-screen keyboard
  const vv = window.visualViewport;
  const lift = () => {
    if (!vv) return;
    const kb = Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop));
    root.style.setProperty('--kb', kb + 'px');
  };
  if (vv) { vv.addEventListener('resize', lift); vv.addEventListener('scroll', lift); }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    if (history[history.length - 1] !== text) { history.push(text); if (history.length > HISTORY) history.shift(); }
    hIdx = -1; draft = '';
    input.value = '';
    onCommand(text);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.blur(); return; }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    if (!history.length) return;
    e.preventDefault();
    if (hIdx < 0) { draft = input.value; hIdx = history.length; }
    hIdx = Math.max(0, Math.min(history.length, hIdx + (e.key === 'ArrowUp' ? -1 : 1)));
    input.value = hIdx === history.length ? draft : history[hIdx];
    if (hIdx === history.length) hIdx = -1;
    const n = input.value.length; input.setSelectionRange(n, n);
  });
  input.addEventListener('focus', () => { document.body.classList.add('has-touched'); dirty = true; });
  input.addEventListener('blur', () => { dirty = true; });
  // "/" anywhere on the page jumps to the bar, as in chat apps
  addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
    if (document.body.classList.contains('is-open')) return;
    e.preventDefault(); input.focus(); input.value = '/';
  });
  // a tap on the table puts a phone keyboard away; mouse users keep their focus
  canvas.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && document.activeElement === input) input.blur(); });

  // ---- the log
  let dirty = true, sig = '';
  function add(line) {
    entries.push({ ...line, t: clock() });   // game clock, so the log fades in step with the dice (and in paused proofs)
    while (entries.length > KEEP) entries.shift();
    const p = document.createElement('p');
    p.textContent = line.detail ? `${line.text}. ${line.detail}` : line.text;
    live.append(p);
    while (live.childElementCount > KEEP) live.firstElementChild.remove();
    dirty = true;
  }

  // overlay: one quad in CSS-pixel space
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(0, 1, 0, -1, -1, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0),
    new THREE.MeshBasicMaterial({ map: surfaces.get('log').texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  quad.frustumCulled = false; scene.add(quad);
  if (renderer) renderer.compile(scene, cam);     // no shader stall on the first log line
  quad.visible = false;

  function update(now) {
    const focused = document.activeElement === input;
    log.rows = entries.map((e) => ({ text: e.text, detail: e.detail, tone: e.tone,
      alpha: focused ? 1 : Math.round(Math.max(0, Math.min(1, 1 - (now - e.t - SHOW_MS) / FADE_MS)) * 10) / 10 }));
    const s = log.rows.map((r) => r.alpha).join() + '|' + entries.map((e) => e.t).join();
    if (dirty || s !== sig) { sig = s; dirty = false; surfaces.repaint('log'); }
    quad.visible = log.rows.some((r) => r.alpha > 0) && !document.body.classList.contains('is-open');
    document.body.classList.toggle('has-log', quad.visible);   // the intro hint makes way for the log
    if (!quad.visible) return;
    // sit just above the bar, scaled down on narrow screens
    const cw = canvas.clientWidth, ch = canvas.clientHeight, br = form.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
    const k = Math.min(1, (cw - 16) / LOG_SIZE[0]), w = LOG_SIZE[0] * k, h = LOG_SIZE[1] * k;
    const bottom = br.top - cr.top - 6;
    cam.left = 0; cam.right = cw; cam.top = 0; cam.bottom = -ch; cam.updateProjectionMatrix();
    quad.scale.set(w, h, 1);
    quad.position.set((cw - w) / 2, -bottom, 0);
  }

  function render(renderer) {
    if (!quad.visible) return;
    const ac = renderer.autoClear; renderer.autoClear = false;
    renderer.setRenderTarget(null); renderer.render(scene, cam);
    renderer.autoClear = ac;
  }

  return { add, update, render, input, entries };
}
