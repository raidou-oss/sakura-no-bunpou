// 昇 LEVEL UP façon Persona : quand le niveau du joueur (Lv) monte, grande animation plein écran.
import { h, reducedMotion } from './util.js?v=20261021001343';
import * as S from './srs.js?v=20261021001343';
import { computeRank, playerLevel } from './level.js?v=20261021001343';
import { play } from './sfx.js?v=20261021001343';
import { fxLayer } from './fx.js?v=20261021001343';

const STATS = [['知識', 'Savoir'], ['根気', 'Persévérance'], ['勇気', 'Courage'], ['魅力', 'Charme'], ['器用さ', 'Habileté']];

export function levelUpBanner({ from, to, xp }) {
  document.querySelector('.ru')?.remove();
  const reduced = reducedMotion();
  const L = playerLevel(xp);
  const stat = STATS[to % STATS.length];
  const statLv = 1 + (to % 5);                                  // 1 à 5 pips allumés
  // Rouleau du compteur : de l'ancien niveau au nouveau
  const nums = []; for (let n = from; n <= to; n++) nums.push(n);
  if (nums.length > 12) nums.splice(1, nums.length - 12);
  const reel = h('span.lu2-reel', ...nums.map(n => h('b', String(n))));
  const fill = h('i.lu2-fill'), head = h('i.lu2-head');
  const pips = h('span.lu2-pips', ...Array.from({ length: 5 }, (_, k) => h('i', { class: k < statLv - 1 ? 'on' : k === statLv - 1 ? 'next' : null })));
  const orb = h('i.lu2-orb', { 'aria-hidden': 'true' });
  const stamp = h('div.lu2-stamp', { lang: 'ja', 'aria-hidden': 'true' }, '昇');
  const petals = h('div.ru-petals', { 'aria-hidden': 'true' });
  if (!reduced) for (let k = 0; k < 22; k++) petals.append(h('i', { style: {
    '--x': `${Math.random() * 100}vw`, '--d': `${1.6 + Math.random() * 1.6}s`, '--w': `${.9 + Math.random() * 1.6}s`,
    '--r': `${Math.random() * 720 - 360}deg`, '--s': `${7 + Math.random() * 10}px`, '--dx': `${Math.random() * 160 - 80}px` } }));
  const el = h('div.ru.lu.lu2', { role: 'dialog', 'aria-label': `Niveau ${to} atteint`, tabindex: '-1' },
    h('div.ru-freeze'),
    h('div.ru-scan', { 'aria-hidden': 'true' }),
    h('div.lu2-bg'),
    h('div.ru-flash'),
    h('div.ru-bars', h('i.b1'), h('i.b2'), h('i.b3'), h('i.b4')),
    h('div.ru-rays', { 'aria-hidden': 'true' }),
    h('div.ru-ring', { 'aria-hidden': 'true' }, h('span', 'LEVEL UP · 成長 · LEVEL UP · 成長 · LEVEL UP · 成長 · ')),
    h('div.lu2-hex', { 'aria-hidden': 'true', html: [1, 2, 3].map(k => `<svg class="hx hx${k}" viewBox="-100 -100 200 200"><polygon points="0,-92 80,-46 80,46 0,92 -80,46 -80,-46"/><polygon class="in" points="0,-80 69,-40 69,40 0,80 -69,40 -69,-40"/></svg>`).join('') }),
    petals,
    stamp,
    h('div.lu-stage.lu2-stage',
      h('p.ru-kicker', h('span', { lang: 'ja' }, '成長'), ' · TU AS PROGRESSÉ'),
      h('p.ru-rankup.lu-word', h('span', 'LEVEL'), h('span', 'UP!')),
      h('div.lu2-lv',
        h('span.lu-lvlabel', 'Lv'),
        h('span.lu2-window', reel)),
      h('div.lu2-bar', fill, head),
      h('p.lu-next', to >= 99 ? 'Niveau maximum atteint !' : `${L.toNext} XP avant le niveau ${to + 1}`),
      h('p.lu2-stat', h('span.lu2-sk', { lang: 'ja' }, stat[0]), h('span.lu2-sn', stat[1]), pips, h('b', '▲ UP')),
      h('p.ru-sub', 'Continue comme ça : chaque révision, leçon et partie te fait grandir.')),
    orb,
    h('div.ru-letterbox', { 'aria-hidden': 'true' }, h('i.top'), h('i.bot')),
    h('p.ru-skip', 'Touche pour continuer'));
  let alive = true;
  const fx = reduced ? null : fxLayer(el, { cls: 'ru-fx' });
  const close = () => { if (el.classList.contains('out')) return; el.classList.add('out'); setTimeout(() => { alive = false; fx?.stop(); el.remove(); }, 600); };
  el.addEventListener('click', close);
  el.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } });
  document.body.append(el);
  el.focus({ preventScroll: true });
  const at = (s, fn) => setTimeout(() => alive && fn(), s * 1000);
  const center = x => { const r = x.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  // 1 · Une particule de lumière cherche sa place puis se plante au centre (comme l'écran de chargement)
  if (!reduced) {
    play('whoosh');
    const W = innerWidth, H = innerHeight, cx = W / 2, cy = H * .42;
    const P0 = [W * .08, H * .95], P1 = [W * .15, H * .05], P2 = [W * .95, H * .3], P3 = [cx, cy];
    const pt = t => { const u = 1 - t; return [0, 1].map(i => u * u * u * P0[i] + 3 * u * u * t * P1[i] + 3 * u * t * t * P2[i] + t * t * t * P3[i]); };
    const frames = Array.from({ length: 24 }, (_, k) => { const [x, y] = pt(k / 23); return { transform: `translate(${x}px, ${y}px) scale(${.6 + .6 * Math.sin(k / 23 * Math.PI)})` }; });
    const anim = orb.animate(frames, { duration: 700, delay: 120, easing: 'cubic-bezier(.5, 0, .3, 1)', fill: 'both' });
    const trail = () => { if (!alive || anim.playState === 'finished') return; const [x, y] = center(orb); fx.trail(x, y, 2); requestAnimationFrame(trail); };
    at(.12, trail);
  }
  // 2 · Impact : onde de choc, éclats, le kanji 昇 s'imprime
  at(reduced ? 0 : .82, () => {
    el.classList.add('impact', 'lit');
    play('slash');
    if (fx) {
      const [x, y] = center(stamp); fx.burst(x, y, 80, 1); fx.embers(16);
      const big = Math.hypot(innerWidth, innerHeight) * .75;
      fx.ring(x, y, { r1: big, w: 7, dur: 1.1, c: '#FFFFFF' });
      fx.ring(x, y, { r1: big * .85, w: 6, dur: 1.15, delay: .12, c: '#FF94CB' });
      fx.ring(x, y, { r1: big * .7, w: 5, dur: 1.2, delay: .24, c: '#46D9FF' });
    }
    el.querySelector('.ru-freeze')?.remove();
  });
  // 3 · Le compteur défile jusqu'au nouveau niveau
  at(reduced ? .05 : 1.5, () => {
    play('card');
    reel.style.transform = `translateY(${-((nums.length - 1) / nums.length) * 100}%)`;
  });
  at(reduced ? .1 : 2.35, () => {
    play('fanfare'); el.classList.add('shake', 'counted');
    if (fx) { const [x, y] = center(reel.parentElement); fx.burst(x, y, 50, .7); fx.ring(x, y, { r0: 30, r1: 260, w: 5, dur: .7, c: '#FF94CB' }); }
  });
  // 4 · La barre d'XP se remplit, des étincelles s'échappent de sa tête
  at(reduced ? .1 : 2.7, () => {
    const target = Math.round(L.pct * 100), t0 = performance.now(), D = reduced ? 1 : 1100;
    const step = now => {
      if (!alive) return;
      const q = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - q, 3);
      fill.style.width = `${target * e}%`; head.style.left = `${target * e}%`;
      if (fx && q < 1) { const [x, y] = center(head); fx.trail(x, y, 2); }
      if (q < 1) requestAnimationFrame(step); else el.classList.add('filled');
    };
    requestAnimationFrame(step);
  });
  // 5 · La stat monte : un pip s'allume
  at(reduced ? .15 : 3.5, () => {
    const pip = pips.children[statLv - 1];
    pip?.classList.add('lit'); play('ping');
    if (fx && pip) { const [x, y] = center(pip); fx.burst(x, y, 30, .45); fx.ring(x, y, { r0: 6, r1: 80, w: 3, dur: .6, c: '#FF94CB' }); }
  });
  at(9, close);
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
