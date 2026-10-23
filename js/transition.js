// Transitions façon menu Persona : bandes diagonales qui balaient l'écran entre deux pages,
// éléments qui entrent en glissant (légèrement penchés, en cascade) et sélecteur de menu qui
// saute d'un onglet à l'autre avec un petit rebond.
import { reducedMotion } from './util.js?v=20261023202148';
import { play } from './sfx.js?v=20261023202148';

const STAGGER = 'main > *, .levels > li, .game-grid > li, .units > li, .points > li, .members > li, .react-list > li, .example-list > li, .portal-points > li, tbody > tr';
const MAX_STAGGER = 18;
let overlay = null, first = true, lastSection = null;

function bands() {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'page-sweep';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '<i class="b1"></i><i class="b2"></i><i class="b3"></i><span class="sweep-kanji"></span>';
  document.body.append(overlay);
  return overlay;
}

const wait = ms => new Promise(r => setTimeout(r, ms));

/**
 * Change de page : couvre l'écran, exécute `render`, puis révèle la nouvelle page.
 * `label` : kanji affiché furtivement pendant le balayage (nom de la section).
 */
export async function sweep(render, { label = '', section = '', soft = false } = {}) {
  if (soft && !first && !reducedMotion()) { lastSection = section; return swap(render); }
  const skip = first || reducedMotion() || section === lastSection && section !== '';
  first = false; lastSection = section;
  if (skip) { await render(); enter(); return; }
  const o = bands();
  o.querySelector('.sweep-kanji').textContent = label;
  o.classList.remove('out'); void o.offsetWidth;
  o.classList.add('in');
  play('whoosh');
  await wait(300);
  await render();
  enter();
  o.classList.replace('in', 'out');
  play('slash');
  await wait(560);
  o.classList.remove('out');
}

/** Sortie de l'écran de chargement : même balayage que les changements de page (au-dessus du chargement) */
export async function bootSweep(removeBoot, label = '桜') {
  if (reducedMotion()) { removeBoot(); enter(); return; }
  const o = bands();
  o.classList.add('boot-sweep');
  o.querySelector('.sweep-kanji').textContent = label;
  o.classList.remove('out'); void o.offsetWidth;
  o.classList.add('in');
  play('whoosh');
  await wait(320);
  removeBoot();
  enter();
  o.classList.replace('in', 'out');
  play('slash');
  await wait(560);
  o.classList.remove('out', 'boot-sweep');
}

/** Changement de niveau : le contenu glisse en fondu, la pastille d'onglet saute vers le nouveau niveau */
async function swap(render) {
  const main = document.getElementById('main');
  const oldTab = main.querySelector('.tabs .tab.active')?.getBoundingClientRect();
  const y = window.scrollY;
  main.classList.add('swap-out');
  await wait(140);
  await render();
  window.scrollTo(0, y);
  main.classList.remove('swap-out');
  main.classList.add('swap-in');
  setTimeout(() => main.classList.remove('swap-in'), 500);
  const tab = main.querySelector('.tabs .tab.active');
  if (oldTab && tab) {
    const r = tab.getBoundingClientRect();
    const pill = document.createElement('span');
    pill.className = 'tab-flip';
    Object.assign(pill.style, { left: `${oldTab.left}px`, top: `${oldTab.top}px`, width: `${oldTab.width}px`, height: `${oldTab.height}px` });
    document.body.append(pill);
    tab.classList.add('flip-target');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      Object.assign(pill.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    }));
    setTimeout(() => { pill.remove(); tab.classList.remove('flip-target'); }, 460);
  }
}

/** Cascade d'entrée des éléments de la page */
export function enter(root = document.getElementById('main')) {
  if (root && !reducedMotion()) setTimeout(() => dispatchEvent(new CustomEvent('sakura:enter')), 30);   // titres, jauges… (même sur les pages « larges »)
  if (!root || reducedMotion() || root.classList.contains('wide')) return;   // les jeux gèrent leurs propres animations
  root.classList.remove('entering'); void root.offsetWidth;
  const seen = new Map();
  root.querySelectorAll(STAGGER).forEach(el => {
    const parent = el.parentElement;
    const n = seen.get(parent) || 0;
    seen.set(parent, n + 1);
    if (n >= MAX_STAGGER) { el.style.removeProperty('--i'); el.classList.remove('stagger'); return; }
    el.style.setProperty('--i', parent === root ? n : n + 2);
    el.classList.add('stagger');
  });
  root.classList.add('entering');
  clearTimeout(root._enterT);
  root._enterT = setTimeout(() => root.classList.remove('entering'), 1600);
}

/** Sélecteur du menu : une pastille qui glisse vers l'onglet actif */
export function moveIndicator() {
  const list = document.querySelector('.nav-list');
  if (!list) return;
  let ind = list.querySelector('.nav-indicator');
  if (!ind) {
    ind = document.createElement('li');
    ind.className = 'nav-indicator';
    ind.setAttribute('aria-hidden', 'true');
    list.prepend(ind);
  }
  const a = list.querySelector('a.active');
  if (!a || !a.offsetParent) { ind.style.opacity = 0; return; }
  const lr = list.getBoundingClientRect(), r = a.getBoundingClientRect();
  const wasHidden = ind.style.opacity === '0' || !ind.style.width;
  ind.classList.toggle('instant', wasHidden);
  ind.style.width = `${r.width}px`; ind.style.height = `${r.height}px`;
  ind.style.transform = `translate(${r.left - lr.left}px, ${r.top - lr.top}px)`;
  ind.style.opacity = 1;
  ind.classList.remove('pop'); void ind.offsetWidth; ind.classList.add('pop');
}
window.addEventListener('resize', () => requestAnimationFrame(moveIndicator));
