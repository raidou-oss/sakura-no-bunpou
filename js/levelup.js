// 昇 LEVEL UP façon Persona : quand le niveau du joueur (Lv) monte, grande animation plein écran.
import { h, reducedMotion } from './util.js?v=20261020161030';
import * as S from './srs.js?v=20261020161030';
import { computeRank, playerLevel } from './level.js?v=20261020161030';
import { play } from './sfx.js?v=20261020161030';

const STATS = [['知識', 'Savoir'], ['根気', 'Persévérance'], ['勇気', 'Courage'], ['魅力', 'Charme'], ['器用さ', 'Habileté']];

export function levelUpBanner({ from, to, xp }) {
  document.querySelector('.ru')?.remove();
  const reduced = reducedMotion();
  const L = playerLevel(xp);
  const num = h('span.lu-num', String(from));
  const fill = h('i.lu-fill');
  const petals = h('div.ru-petals', { 'aria-hidden': 'true' });
  if (!reduced) for (let k = 0; k < 40; k++) petals.append(h('i', { style: {
    '--x': `${Math.random() * 100}vw`, '--d': `${1.4 + Math.random() * 1.6}s`, '--w': `${Math.random() * 1.4}s`,
    '--r': `${Math.random() * 720 - 360}deg`, '--s': `${7 + Math.random() * 10}px`, '--dx': `${Math.random() * 160 - 80}px` } }));
  // Une « stat » qui progresse, comme dans Persona (purement décorative, tirée du niveau)
  const stat = STATS[to % STATS.length];
  const el = h('div.ru.lu', { role: 'dialog', 'aria-label': `Niveau ${to} atteint`, tabindex: '-1' },
    h('div.ru-flash'),
    h('div.ru-bars', h('i.b1'), h('i.b2'), h('i.b3'), h('i.b4')),
    h('div.ru-bigkanji', { lang: 'ja', 'aria-hidden': 'true' }, '昇'),
    h('div.ru-rays', { 'aria-hidden': 'true' }),
    h('div.ru-ring', { 'aria-hidden': 'true' }, h('span', 'LEVEL UP · 成長 · LEVEL UP · 成長 · LEVEL UP · 成長 · ')),
    h('div.ru-streaks', { 'aria-hidden': 'true' }, ...Array.from({ length: 7 }, (_, k) => h('i', { style: { '--k': k } }))),
    petals,
    h('div.lu-stage',
      h('p.ru-kicker', h('span', { lang: 'ja' }, '成長'), ' · TU AS PROGRESSÉ'),
      h('p.ru-rankup.lu-word', h('span', 'LEVEL'), h('span', 'UP!')),
      h('div.lu-lv',
        h('span.lu-lvlabel', 'Lv'),
        h('span.lu-old', String(from)),
        h('span.lu-arrow', { 'aria-hidden': 'true' }, '▶'),
        num),
      h('div.lu-bar', fill),
      h('p.lu-next', to >= 99 ? 'Niveau maximum atteint !' : `${L.toNext} XP avant le niveau ${to + 1}`),
      h('p.lu-stat', h('span', { lang: 'ja' }, stat[0]), ` ${stat[1]} `, h('b', '▲ UP')),
      h('p.ru-sub', 'Continue comme ça : chaque révision, leçon et partie te fait grandir.')),
    h('p.ru-skip', 'Touche pour continuer'));
  const close = () => { if (el.classList.contains('out')) return; el.classList.add('out'); setTimeout(() => el.remove(), 600); };
  el.addEventListener('click', close);
  el.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } });
  document.body.append(el);
  el.focus({ preventScroll: true });
  play('whoosh');
  setTimeout(() => play('slash'), 420);
  setTimeout(() => { play('fanfare'); num.textContent = String(to); num.classList.add('bump'); el.classList.add('shake'); fill.style.width = `${Math.round(L.pct * 100)}%`; }, reduced ? 100 : 1500);
  setTimeout(() => play('ping'), 2300);
  setTimeout(close, 7000);
}

// --- Détection : le niveau affiché (lvShown) est lié au compte, donc pas d'animation en double sur un autre appareil
let timer = null, busy = false;
async function check({ fromSync = false } = {}) {
  if (busy) return;
  busy = true;
  try {
    const r = await computeRank();
    const lv = playerLevel(r.xp).lv;
    const shown = S.getExtra('lvShown', null);
    if (shown == null) { S.setExtra('lvShown', lv, { quiet: true }); return; }
    if (lv <= shown) return;
    // Niveau arrivé d'un autre appareil par la synchro : on l'a déjà fêté là-bas
    if (fromSync) { S.setExtra('lvShown', lv, { quiet: true }); return; }
    S.setExtra('lvShown', lv);
    // Pas au milieu d'une réponse tapée : on attend que le champ soit libéré
    const show = () => {
      if (document.querySelector('.ru')) { setTimeout(show, 1500); return; }
      if (document.activeElement?.matches?.('input, textarea')) { setTimeout(show, 1500); return; }
      levelUpBanner({ from: shown, to: lv, xp: r.xp });
      window.dispatchEvent(new CustomEvent('sakura:level', { detail: { lv, xp: r.xp } }));
    };
    show();
  } finally { busy = false; }
}
export function initLevelUp() {
  S.onChange(() => { clearTimeout(timer); timer = setTimeout(() => check().catch(() => {}), 1200); });
  window.addEventListener('sakura:synced', () => { clearTimeout(timer); check({ fromSync: true }).catch(() => {}); });
  setTimeout(() => check().catch(() => {}), 2500);
}
