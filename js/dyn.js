// ⚡ Dynamique globale : le même « peps » que l'écran de chargement et les leçons, partout sur le site.
//  · chaque clic sur un élément interactif frappe : onde de choc + étincelles au point touché, petit écrasement ;
//  · à chaque page, le kanji du titre s'imprime (onde + étincelles), les jauges se remplissent, les nombres défilent ;
//  · une bonne réponse dans un jeu déclenche l'impact des leçons.
import { hitFx, reducedMotion, fxAt } from './util.js?v=20261020231702';
import { play } from './sfx.js?v=20261020231702';

const TAP = '.btn, .tab, .segmented button, .lesson-card, .nav-list a, .game-tile, .unit, .member, .option, .chip-btn, .link-card, .level, .point, .oc-row, .online-row, .resume-chip, .tile, .kana-cell, .cf-row, .lc-tarot, button.dash-choice, .choice, .answer-btn';
const lite = () => document.documentElement.classList.contains('lite');

function tap(x, y, el) {
  if (reducedMotion()) return;
  // Impact au point touché : éclair, croix et étincelles (sans les cercles, plus sobre)
  fxAt(x, y, { rings: false });
  // On sent le clic : écrasement puis rebond, éclair blanc, petit son et vibration (mobile)
  if (el) {
    el.classList.remove('dyn-press'); void el.offsetWidth; el.classList.add('dyn-press');
    clearTimeout(el._dynT); el._dynT = setTimeout(() => el.classList.remove('dyn-press'), 420);
  }
  play('cursor', { gap: 60 });
  try { navigator.vibrate?.(12); } catch {}
}

let lastTarget = null;
document.addEventListener('pointerdown', e => {
  if (e.button > 0) return;
  const el = e.target.closest?.(TAP);
  lastTarget = e.target.closest?.('button, a, .card, .tile, [role="button"]') || e.target;
  if (!el || el.disabled || el.closest('.ru')) return;
  tap(e.clientX, e.clientY, el);
}, { passive: true });
document.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') lastTarget = document.activeElement; }, true);

// Bonne réponse (son « correct ») sans effet déjà posé : impact sur l'élément joué
addEventListener('sakura:sfx', e => {
  if (e.detail !== 'correct' || reducedMotion()) return;
  if (performance.now() - (window.__lastHit || 0) < 250) return;
  const t = lastTarget?.isConnected ? lastTarget : null;
  if (t && t !== document.body && !t.closest('.ru')) hitFx(t, { pop: false });
});

// --- À l'arrivée sur une page --------------------------------------------------------------------
const COUNT = '.stat-chip strong, .sc-num, .lv-big b, .score-chip strong, .stat-n, .big-num';
const GAUGE = '.gauge > span, .mini-gauge > span, .lc-gauge > span, .level-gauge > span';
function countUp(el, delay) {
  const txt = el.textContent.trim();
  if (!/^\d{1,7}$/.test(txt)) return;
  const to = Number(txt);
  if (to < 2) return;
  const t0 = performance.now() + delay, D = 800;
  el.textContent = '0';
  const step = now => {
    if (!el.isConnected) return;
    const q = Math.max(0, Math.min(1, (now - t0) / D)), e = 1 - Math.pow(1 - q, 3);
    el.textContent = String(Math.round(to * e));
    if (q < 1) requestAnimationFrame(step); else { el.textContent = txt; el.classList.add('dyn-counted'); }
  };
  requestAnimationFrame(step);
}
export function pageEnter(root = document.getElementById('main')) {
  if (!root || reducedMotion()) return;
  // Kanji du titre : il s'imprime avec une onde de choc
  const k = root.querySelector('.p3-head .jp-head, .page-head .jp-head');
  if (k && !k.dataset.landed) {
    k.dataset.landed = '1';
    k.classList.add('dyn-land');
    // On attend la fin du balayage de page pour que l'onde soit bien visible, en entier, autour du kanji
    const fire = (n = 0) => {
      if (document.querySelector('.page-sweep.in, .page-sweep.out') && n < 30) return setTimeout(() => fire(n + 1), 60);
      const r = k.getBoundingClientRect();
      fxAt(r.left + r.width / 2, r.top + r.height / 2, { skew: -8 });   // petit, en diagonale comme le titre
    };
    setTimeout(fire, 200);
  }
  // Jauges : remplissage depuis zéro, en cascade
  let i = 0;
  root.querySelectorAll(GAUGE).forEach(g => {
    if (g.dataset.grown || i > 40) return;
    g.dataset.grown = '1';
    g.style.transformOrigin = 'left center';
    g.animate([{ transform: 'scaleX(0)', filter: 'brightness(2.2)' }, { transform: 'scaleX(1)', filter: 'brightness(1)' }],
      { duration: 900, delay: 220 + i++ * 45, easing: 'cubic-bezier(.2, .9, .25, 1)', fill: 'backwards' });
  });
  // Nombres : ils défilent jusqu'à leur valeur
  let j = 0;
  root.querySelectorAll(COUNT).forEach(n => { if (!n.dataset.counted) { n.dataset.counted = '1'; countUp(n, 200 + j++ * 90); } });
}
addEventListener('sakura:enter', () => pageEnter());
