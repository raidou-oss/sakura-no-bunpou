import { reducedMotion } from './util.js?v=20261026210603';
// Survol « vivant » : la tuile grossit un peu, pivote vers la souris, un reflet suit le pointeur et l'ombre part à l'opposé.
const SELECTOR = [
  '.kana-cell:not(.empty)', '.lesson-card', '.unit', '.game-tile', '.member', '.level', '.score-card', '.link-card',
  '.stat-chip', '.tarot', '.word-tile',
].join(',');
const MAX = 9;            // degrés d'inclinaison au bord
let cur = null, raf = 0, last = null, home = null;   // home : position de la tuile AVANT inclinaison

function reset(el) {
  el.classList.remove('tilting');
  el.style.removeProperty('transform');
  el.style.removeProperty('filter');
  el.style.removeProperty('--gx'); el.style.removeProperty('--gy');
}

function apply() {
  raf = 0;
  if (!cur || !last) return;
  const r = home || cur.getBoundingClientRect();
  const px = Math.min(1, Math.max(0, (last.clientX - r.left) / r.width));
  const py = Math.min(1, Math.max(0, (last.clientY - r.top) / r.height));
  const dx = px - 0.5, dy = py - 0.5;
  // Les petites cases pivotent plus que les grands panneaux
  const k = Math.max(0.35, Math.min(1, 220 / Math.max(r.width, r.height)));
  const ry = dx * MAX * 2 * k, rx = -dy * MAX * 2 * k;
  const zoom = 1 + 0.07 * k + 0.02;
  cur.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${zoom.toFixed(3)})`;
  // Ombre à l'opposé de la lumière
  // Ombre portée sombre à l'opposé de la souris ; l'ombre rose, elle, reste l'ombre vivante animée en CSS
  cur.style.filter = `drop-shadow(${(-dx * 26).toFixed(1)}px ${(-dy * 26 + 14).toFixed(1)}px 20px rgba(0, 0, 0, .55))`;
  cur.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
  cur.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
}

export function initTilt() {
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    if (reducedMotion()) { if (cur) { reset(cur); cur = null; } return; }
    // Hystérésis : tant que le pointeur reste dans la zone d'origine de la tuile, on la garde.
    // (Sinon l'inclinaison écarte le bord de la tuile du pointeur → elle se remet droite → sous le pointeur → elle sautille.)
    const inside = home && e.clientX >= home.left - 2 && e.clientX <= home.right + 2 && e.clientY >= home.top - 2 && e.clientY <= home.bottom + 2;
    const el = inside && cur?.isConnected ? cur : e.target.closest?.(SELECTOR);
    if (el !== cur) {
      if (cur) reset(cur);
      cur = el;
      home = cur ? cur.getBoundingClientRect() : null;
      if (cur) {
        cur.classList.add('tilting');
        if (!cur.querySelector(':scope > .tilt-glare')) cur.append(Object.assign(document.createElement('span'), { className: 'tilt-glare', ariaHidden: 'true' }));
      }
    }
    last = e;
    if (cur && !raf) raf = requestAnimationFrame(apply);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { if (cur) reset(cur); cur = null; home = null; });
  addEventListener('scroll', () => { if (cur) { reset(cur); cur = null; home = null; } }, { passive: true });
}
