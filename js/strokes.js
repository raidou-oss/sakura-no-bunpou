// 書き順 Sens d'écriture des kanji (ordre et direction des traits), d'après KanjiVG
// (CC BY-SA 3.0, Ulrich Apel — https://kanjivg.tagaini.net).
// Bulle repliable : chaque kanji du mot se trace trait par trait, numéros à l'appui,
// avec « Rejouer » et un mode « trait par trait » pour s'entraîner à l'écrire.
import { h, reducedMotion } from './util.js?v=20261021004441';
import * as S from './srs.js?v=20261021004441';
import { play } from './sfx.js?v=20261021004441';

const cache = new Map();
const isKanji = c => (c >= '一' && c <= '鿿') || c === '々';
function load(c) {
  if (!cache.has(c)) cache.set(c, fetch(`data/kanji/${c.codePointAt(0).toString(16).padStart(5, '0')}.json`).then(r => r.ok ? r.json() : null).catch(() => null));
  return cache.get(c);
}
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
const wait = ms => new Promise(r => setTimeout(r, ms));

/** Bulle « 書き順 » pour un mot ; null s'il n'a pas de kanji */
export function strokeOrder(word) {
  const chars = [...new Set([...String(word || '')].filter(isKanji))];
  if (!chars.length) return null;
  const open = () => !!S.getSettings().strokesOpen;
  const box = h('div.strokes', { class: open() ? 'strokes open' : 'strokes' });
  const grid = h('div.strokes-grid');
  let run = 0, built = false, tiles = [];
  const head = h('button.strokes-toggle', { type: 'button', 'aria-expanded': String(open()), onclick: () => {
    const o = !box.classList.contains('open');
    box.classList.toggle('open', o); head.setAttribute('aria-expanded', String(o));
    S.setSettings({ strokesOpen: o });
    if (o) { play('card'); start(); } else run++;
  } }, h('span.st-jp', { lang: 'ja' }, '書き順'), h('span', 'Sens d’écriture'), h('i.st-chev', { 'aria-hidden': 'true' }));
  const replay = h('button.btn.small', { type: 'button', onclick: () => animate() }, '↻ Rejouer');
  const stepBtn = h('button.btn.small', { type: 'button', onclick: () => step() }, 'Trait suivant');
  const body = h('div.strokes-body', grid, h('div.strokes-actions', replay, stepBtn,
    h('span.small.strokes-src', 'Traits : ', h('a', { href: 'https://kanjivg.tagaini.net', target: '_blank', rel: 'noopener' }, 'KanjiVG'))));
  box.append(head, body);

  async function build() {
    if (built) return; built = true;
    const datas = await Promise.all(chars.map(load));
    tiles = chars.map((c, i) => {
      const d = datas[i];
      if (!d) return null;
      const svg = svgEl('svg', { viewBox: '0 0 109 109', class: 'st-svg', role: 'img', 'aria-label': `Ordre des traits de ${c}` });
      svg.append(svgEl('path', { class: 'st-guide', d: 'M54.5 4v101M4 54.5h101' }));
      const ghost = svgEl('g', { class: 'st-ghost' }), ink = svgEl('g', { class: 'st-ink' }), nums = svgEl('g', { class: 'st-nums' });
      const paths = d.s.map((p, k) => {
        ghost.append(svgEl('path', { d: p }));
        const el = svgEl('path', { d: p });
        ink.append(el);
        const [x, y] = d.n[k] || [0, 0];
        const t = svgEl('text', { x, y }); t.textContent = String(k + 1);
        nums.append(t);
        return { el, num: t };
      });
      svg.append(ghost, ink, nums);
      grid.append(h('figure.st-tile', svg, h('figcaption', h('b', { lang: 'ja' }, c), h('span.small', `${d.s.length} trait${d.s.length > 1 ? 's' : ''}`))));
      return { paths, shown: 0 };
    }).filter(Boolean);
    if (!tiles.length) box.remove();
  }
  const prep = (p, visible) => {
    const L = p.el.getTotalLength();
    p.L = L;
    p.el.style.transition = 'none';
    p.el.style.strokeDasharray = `${L} ${L}`;
    p.el.style.strokeDashoffset = visible ? '0' : String(L);
    p.el.classList.remove('cur'); p.num.classList.toggle('on', visible);
  };
  const draw = async (p, my) => {
    p.el.getBoundingClientRect();
    const ms = Math.max(220, p.L * 6);
    p.el.classList.add('cur'); p.num.classList.add('on');
    p.el.style.transition = `stroke-dashoffset ${ms}ms cubic-bezier(.45, .05, .4, 1)`;
    p.el.style.strokeDashoffset = '0';
    await wait(ms + 90);
    if (my === run) p.el.classList.remove('cur');
  };
  async function animate() {
    await build();
    const my = ++run; si = -1;
    tiles.forEach(t => { t.paths.forEach(p => prep(p, false)); t.shown = 0; });
    if (reducedMotion()) { tiles.forEach(t => { t.paths.forEach(p => prep(p, true)); t.shown = t.paths.length; }); return; }
    for (const t of tiles) {
      for (const p of t.paths) { if (my !== run || !box.isConnected) return; await draw(p, my); t.shown++; }
      await wait(250);
    }
  }
  // Trait par trait : chaque appui ajoute le trait suivant (puis on recommence)
  let si = -1;
  async function step() {
    await build();
    const my = ++run;
    const all = tiles.flatMap(t => t.paths);
    if (!all.length) return;
    if (si < 0 || si >= all.length - 1) { all.forEach(p => prep(p, false)); si = -1; }
    all.forEach(p => p.el.classList.remove('cur'));
    si++;
    await draw(all[si], my);
    if (my === run) all[si].el.classList.add('cur');
  }
  function start() {
    const go = () => box.isConnected ? animate() : setTimeout(go, 120);
    setTimeout(go, 60);
  }
  if (open()) start();
  return box;
}

/** Version compacte pour les bulles de survol : tous les kanji du mot se tracent en boucle */
export function miniStrokes(word) {
  const chars = [...String(word || '')].filter(isKanji);
  if (!chars.length) return null;
  const row = h('div.mini-strokes', { 'aria-label': 'Sens d’écriture' });
  const slots = chars.map(c => { const s = h('span.ms-tile', { 'data-k': c }); row.append(s); return s; });
  row.prepend(h('span.ms-label', { lang: 'ja' }, '書き順'));
  (async () => {
    const datas = await Promise.all(chars.map(load));
    const all = [];
    datas.forEach((d, i) => {
      if (!d) { slots[i].textContent = chars[i]; slots[i].classList.add('none'); return; }
      const svg = svgEl('svg', { viewBox: '0 0 109 109', class: 'st-svg mini' });
      const ghost = svgEl('g', { class: 'st-ghost' }), ink = svgEl('g', { class: 'st-ink' });
      d.s.forEach(p => { ghost.append(svgEl('path', { d: p })); const el = svgEl('path', { d: p }); ink.append(el); all.push({ el }); });
      svg.append(ghost, ink);
      slots[i].append(svg);
    });
    if (!all.length || reducedMotion()) return;
    while (row.isConnected) {
      all.forEach(p => { const L = p.el.getTotalLength(); p.L = L; p.el.style.transition = 'none'; p.el.style.strokeDasharray = `${L} ${L}`; p.el.style.strokeDashoffset = String(L); p.el.classList.remove('cur'); });
      for (const p of all) {
        if (!row.isConnected) return;
        p.el.getBoundingClientRect();
        const ms = Math.max(160, p.L * 4.2);
        p.el.classList.add('cur');
        p.el.style.transition = `stroke-dashoffset ${ms}ms cubic-bezier(.45, .05, .4, 1)`;
        p.el.style.strokeDashoffset = '0';
        await wait(ms + 60);
        p.el.classList.remove('cur');
      }
      await wait(1400);
    }
  })();
  return row;
}
