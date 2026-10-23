// ⚡ Dynamique globale : le même « peps » que l'écran de chargement et les leçons, partout sur le site.
//  · chaque clic sur un élément interactif frappe : onde de choc + étincelles au point touché, petit écrasement ;
//  · à chaque page, le kanji du titre s'imprime (onde + étincelles), les jauges se remplissent, les nombres défilent ;
//  · une bonne réponse dans un jeu déclenche l'impact des leçons.
import { hitFx, reducedMotion, fxAt } from './util.js?v=20261023203850';
import { play } from './sfx.js?v=20261023203850';

const TAP = '.btn, .tab, .segmented button, .lesson-card, .nav-list a, .game-tile, .unit, .member, .option, .chip-btn, .link-card, .level, .point, .oc-row, .online-row, .resume-chip, .tile, .kana-cell, .cf-row, .lc-tarot, button.dash-choice, .choice, .answer-btn';
const lite = () => document.documentElement.classList.contains('lite');

let lastTarget = null;
document.addEventListener('pointerdown', e => {
  lastTarget = e.target.closest?.('button, a, .card, .tile, [role="button"]') || e.target;
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
  // Largeur réservée : le nombre qui défile ne pousse pas ses voisins
  el.style.display = 'inline-block'; el.style.minWidth = `${el.getBoundingClientRect().width}px`; el.style.fontVariantNumeric = 'tabular-nums';
  el.textContent = '0';
  const step = now => {
    if (!el.isConnected) return;
    const q = Math.max(0, Math.min(1, (now - t0) / D)), e = 1 - Math.pow(1 - q, 3);
    el.textContent = String(Math.round(to * e));
    if (q < 1) requestAnimationFrame(step); else { el.textContent = txt; el.classList.add('dyn-counted'); }
  };
  requestAnimationFrame(step);
}
/** Prépare le titre (lettres découpées, kanji penchés, détails) AVANT l'affichage : aucune mise en page ne bouge ensuite */
export function decorateHead(head) {
  if (!head || head.dataset.decorated) return;
  head.dataset.decorated = '1';
    const word = head.querySelector('.ph-word');
    if (word && !word.dataset.split) {
      word.dataset.split = '1';
      const txt = word.textContent;
      word.setAttribute('aria-label', txt);
      const R = [-10, 8, -5, 12, -8, 6, -12, 5], Y = [2, -6, 5, -4, 6, -3, 3, -6], Z = [1.12, .9, 1.05, .94, 1.1, .92, 1.14, .96];
      word.innerHTML = [...txt].map((c, i) => `<span class="ph-l" aria-hidden="true" style="--i:${i};--tr:${R[i % 8]}deg;--ty:${Y[i % 8]}px;--ts:${Z[i % 8]}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    }
    // Kanji du titre : chaque caractère penché à sa façon, comme les chiffres du calendrier
    const jh = head.querySelector('h1 .jp-head');
    if (jh && !jh.dataset.split) {
      jh.dataset.split = '1';
      const KR = [-9, 7, -4, 10], KY = [4, -6, 2, -3];
      let n = 0;
      const walk = node => [...node.childNodes].forEach(ch => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...ch.textContent].forEach(c => { const sp = document.createElement('span'); sp.className = 'tk'; sp.textContent = c; sp.style.cssText = `--kr:${KR[n % 4]}deg;--ky:${KY[n % 4]}px`; n++; frag.append(sp); });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && ch.tagName !== 'RT') walk(ch);
      });
      walk(jh);
    }
    // Petits détails façon menu de Persona : étiquette de dossier, trame de points, étincelles, chevrons qui défilent
    const h1 = head.querySelector('h1');
    if (h1 && !h1.querySelector('.ph-deco')) {
      const links = [...document.querySelectorAll('.nav-list a[data-nav]')];
      const sec = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] || 'home';
      const idx = Math.max(0, links.findIndex(a => a.dataset.nav === sec)) + 1;
      const mk = (cls, html = '') => Object.assign(document.createElement('span'), { className: `ph-deco ${cls}`, innerHTML: html });
      h1.append(
        mk('ph-tag', `<b>No.${String(idx).padStart(2, '0')}</b><i>${(head.querySelector('.ph-word')?.getAttribute('aria-label') || '').toUpperCase()} FILE</i>`),
        mk('ph-dots'),
        mk('ph-spark s1', '✦'), mk('ph-spark s2', '✦'), mk('ph-spark s3', '✧'),
      );
      // Chevrons collés au bandeau (hors du flux : ils ne peuvent pas faire passer le titre à la ligne)
      const w = head.querySelector('.ph-word');
      if (w && !w.parentElement.classList.contains('ph-wordwrap')) {
        const wrap = document.createElement('span'); wrap.className = 'ph-wordwrap';
        w.replaceWith(wrap); wrap.append(w, mk('ph-chev', '<i>▶</i><i>▶</i><i>▶</i>'));
      }
      h1.querySelectorAll('.ph-deco').forEach(d => d.setAttribute('aria-hidden', 'true'));
    }
}

export function pageEnter(root = document.getElementById('main')) {
  if (!root || reducedMotion()) return;
  // Titre façon Persona : bandes qui balaient, mot en bandeau qui se dévoile lettre par lettre, grand mot en fond qui glisse
  const head = root.querySelector('.p3-head');
  if (head && !head.dataset.entered) {
    head.dataset.entered = '1';
    decorateHead(head);
    if (!head.querySelector('.ph-slash')) head.prepend(Object.assign(document.createElement('span'), { className: 'ph-slash', ariaHidden: 'true', innerHTML: '<i></i><i></i><i></i>' }));
    head.classList.remove('p3-in'); void head.offsetWidth; head.classList.add('p3-in');
  }
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
