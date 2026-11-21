// The attack card on the note: hover and focus state, the raycast hit-test for
// pointer clicks, and on phones a flat sheet with the same rows.
//   Live HTML: the rows are real <button>s inside the canvas. Keyboard focus and
//   Enter/Space reach them directly; a class change asks for a fresh snapshot.
//   Painted: the same buttons sit in the canvas as fallback content (keyboard and
//   assistive tech); the painter draws the hover/focus row from `state.hot`.
//   Pointer (both): main.js raycasts the note mesh and hands us the UV.
import { NOTE, cardRowAt, attackRowParts } from './surfaces.js';

// `holder.character` is the character on the card (defineSurfaces reads it too); setCharacter() swaps it.
export function createCard({ surfaces, holder, state, onRoll, touchy = false }) {
  const s = surfaces.get('note'), el = s.el;
  let character = holder.character, n = character.attacks.length;
  const rows = () => [...el.querySelectorAll('button[data-attack]')];
  let by = null;

  function refresh() { if (surfaces.mode === 'html') surfaces.touch('note'); else surfaces.repaint('note'); }

  function setHot(i, how) {
    if (i === state.hot) { if (i >= 0) by = how; return; }
    state.hot = i; by = i >= 0 ? how : null;
    rows().forEach((b, k) => b.classList.toggle('is-hot', k === i));
    refresh();
  }

  // UV on the note mesh -> card pixel -> row (same layout the painter and the HTML use)
  const rowAt = (uv) => (uv ? cardRowAt(n, uv.x * NOTE[0], (1 - uv.y) * NOTE[1]) : -1);

  function wire(root) {
    root.querySelectorAll('button[data-attack]').forEach((b) => {
      const i = +b.dataset.row;
      b.addEventListener('focus', () => setHot(i, 'key'));
      b.addEventListener('blur', () => { if (by === 'key') setHot(-1); });
      b.addEventListener('click', (e) => { e.preventDefault(); onRoll(b.dataset.attack); });
    });
  }
  wire(el);

  // ---- the phone sheet: plain DOM over the scene
  const sheet = document.querySelector('#sheet'), chip = document.querySelector('#attacks-chip');
  let opener = null;
  function fillSheet() {
    if (!sheet) return;
    sheet.querySelector('.sh-name').textContent = character.name;
    sheet.querySelector('.sh-class').textContent = character.class;
    const list = sheet.querySelector('.sh-rows');
    list.textContent = '';
    for (const a of character.attacks) {
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.className = 'sh-row'; b.dataset.attack = a.id;
      b.setAttribute('aria-label', `Roll ${a.name} attack`);
      b.append(...attackRowParts(a));
      b.addEventListener('click', () => { closeSheet(false); onRoll(a.id); });
      li.append(b); list.append(li);
    }
  }
  fillSheet();
  if (sheet) {
    sheet.querySelector('.sh-close').addEventListener('click', () => closeSheet());
    sheet.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeSheet(); return; }
      if (e.key !== 'Tab') return;
      const f = [...sheet.querySelectorAll('button')], first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  if (chip) {
    chip.hidden = !touchy;
    chip.addEventListener('click', () => openSheet());
  }
  function openSheet() {
    if (!sheet || !sheet.hidden || document.body.classList.contains('is-open')) return;
    opener = document.activeElement;
    sheet.hidden = false; document.body.classList.add('has-sheet', 'has-touched');
    if (chip) chip.setAttribute('aria-expanded', 'true');
    sheet.querySelector('.sh-row')?.focus({ preventScroll: true });
  }
  function closeSheet(restore = true) {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true; document.body.classList.remove('has-sheet');
    if (chip) chip.setAttribute('aria-expanded', 'false');
    if (restore && opener && opener.focus) opener.focus({ preventScroll: true });
    opener = null;
  }

  // The card becomes another character's: rows, name, class, the phone sheet. Same character = nothing to do.
  function setCharacter(next) {
    if (!next || next === character) return false;
    character = holder.character = next; n = next.attacks.length;
    state.hot = -1; by = null;
    el.setAttribute('aria-label', `${next.name}'s attacks`);
    if (surfaces.mode === 'html') surfaces.repaint('note');       // rebuilds the element and asks for a new snapshot
    else { el.textContent = ''; surfaces.get('note').plain(el); surfaces.repaint('note'); }
    wire(el);
    fillSheet();
    return true;
  }

  return {
    rowAt, setCharacter, get character() { return character; },
    // pointer over the canvas: uv on the note (or null). Returns true when a row is under it.
    hover(uv) { const i = rowAt(uv); if (i >= 0 || by === 'mouse') setHot(i, 'mouse'); return i >= 0; },
    leave() { if (by === 'mouse') setHot(-1); },
    // a click or tap on the note. Touch (or the lite tier) opens the sheet; a mouse rolls the row under it.
    click(uv, pointerType) {
      if (!uv) return false;
      if (touchy || pointerType !== 'mouse') { openSheet(); return true; }
      const i = rowAt(uv);
      if (i < 0) return false;
      onRoll(character.attacks[i].id);
      return true;
    },
    setHot, openSheet, closeSheet,
    get sheetOpen() { return !!sheet && !sheet.hidden; },
  };
}
