// Félicitations dans la DA du site : gerbe de pétales sur une bonne réponse, et grande scène
// plein écran (bandes diagonales, rayons, kanji qui claque, pluie de pétales) pour une victoire.
import { reducedMotion, jr } from './util.js?v=20261019155644';
import { play } from './sfx.js?v=20261019155644';

const COLORS = ['#FF94CB', '#FFB5DA', '#46D9FF', '#7FA8FF', '#FFFFFF', '#63F0C3'];

/** Petite gerbe de pétales et d'éclats autour d'un élément (bonne réponse) */
export function burst(target, { count = 18 } = {}) {
  if (reducedMotion() || !target) return;
  const r = target.getBoundingClientRect ? target.getBoundingClientRect() : { left: target.x, top: target.y, width: 0, height: 0 };
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const layer = document.createElement('div');
  layer.className = 'burst';
  layer.style.left = `${cx}px`; layer.style.top = `${cy}px`;
  layer.setAttribute('aria-hidden', 'true');
  let html = '<i class="burst-ring"></i>';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * .4, d = 60 + Math.random() * 90;
    const kind = i % 3 === 0 ? 'shard' : 'petal';
    html += `<i class="burst-${kind}" style="--x:${(Math.cos(a) * d).toFixed(0)}px;--y:${(Math.sin(a) * d - 20).toFixed(0)}px;--r:${(Math.random() * 540 - 270).toFixed(0)}deg;--c:${COLORS[i % COLORS.length]};--s:${(.7 + Math.random() * .7).toFixed(2)};--t:${(520 + Math.random() * 300).toFixed(0)}ms"></i>`;
  }
  layer.innerHTML = html;
  document.body.append(layer);
  setTimeout(() => layer.remove(), 1000);
}

/** Pluie de pétales sur canvas (physique simple : vitesse, gravité, rotation, oscillation) */
function petalStorm(canvas, duration = 2600) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = canvas.width = innerWidth * dpr, H = canvas.height = innerHeight * dpr;
  const P = Array.from({ length: Math.min(160, Math.round(innerWidth / 9)) }, (_, i) => {
    const fromLeft = i % 2 === 0;
    return {
      x: fromLeft ? -20 * dpr : W + 20 * dpr, y: H * (.35 + Math.random() * .4),
      vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 12) * dpr, vy: -(8 + Math.random() * 12) * dpr,
      r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3, s: (5 + Math.random() * 7) * dpr,
      c: COLORS[i % COLORS.length], w: Math.random() * Math.PI * 2, shard: i % 5 === 0,
    };
  });
  const t0 = performance.now();
  return new Promise(done => {
    (function frame(t) {
      const k = (t - t0) / duration;
      ctx.clearRect(0, 0, W, H);
      for (const p of P) {
        p.vy += .32 * dpr; p.vx *= .985; p.vy *= .985;
        p.w += .08; p.x += p.vx + Math.sin(p.w) * .8 * dpr; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, k - .6) / .4);
        ctx.fillStyle = p.c;
        ctx.beginPath();
        if (p.shard) { ctx.moveTo(0, -p.s); ctx.lineTo(p.s * .5, 0); ctx.lineTo(0, p.s); ctx.lineTo(-p.s * .5, 0); }
        else { ctx.moveTo(0, 0); ctx.bezierCurveTo(-p.s, -p.s * .8, -p.s * .7, -p.s * 1.8, 0, -p.s * 1.5); ctx.bezierCurveTo(p.s * .7, -p.s * 1.8, p.s, -p.s * .8, 0, 0); }
        ctx.fill(); ctx.restore();
      }
      if (k < 1) requestAnimationFrame(frame); else done();
    })(t0);
  });
}

/**
 * Grande scène de victoire.
 * title : kanji / kana affiché en grand (見事！, 完璧！, 新記録！…) ; sub : phrase française ; detail : score.
 */
export function celebrate({ title = '見事！', sub = 'Bravo !', detail = '', tone = 'win' } = {}) {
  play('fanfare');
  const el = document.createElement('div');
  el.className = `celebrate tone-${tone}${reducedMotion() ? ' calm' : ''}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <div class="cel-flash"></div>
    <div class="cel-rays"></div>
    <i class="cel-band b1"></i><i class="cel-band b2"></i><i class="cel-band b3"></i>
    <canvas class="cel-canvas" aria-hidden="true"></canvas>
    <div class="cel-copy">
      <p class="cel-title" lang="ja"></p>
      <p class="cel-sub"></p>
      <p class="cel-detail"></p>
      <p class="cel-hint">Touche pour continuer</p>
    </div>`;
  el.querySelector('.cel-title').innerHTML = jr(title);
  el.querySelector('.cel-sub').textContent = sub;
  el.querySelector('.cel-detail').textContent = detail;
  document.body.append(el);
  if (!reducedMotion()) petalStorm(el.querySelector('canvas'));
  return new Promise(resolve => {
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      el.classList.add('leaving');
      document.removeEventListener('keydown', onKey, true);
      setTimeout(() => { el.remove(); resolve(); }, 420);
    };
    const onKey = e => { if (['Escape', 'Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); close(); } };
    el.addEventListener('click', close);
    setTimeout(() => document.addEventListener('keydown', onKey, true), 300);
    setTimeout(close, 3400);
  });
}

/** Titre selon le résultat (0 → 1) */
export function verdict(ratio, { record = false } = {}) {
  if (record) return { title: '新記録！', sub: 'Nouveau record !', tone: 'record' };
  if (ratio >= .999) return { title: '完璧！', sub: 'Sans faute, parfait !', tone: 'perfect' };
  if (ratio >= .8) return { title: '見事！', sub: 'Superbe travail !', tone: 'win' };
  if (ratio >= .5) return { title: 'いいね！', sub: 'Bien joué, continue comme ça !', tone: 'win' };
  return { title: 'お疲れ！', sub: 'Bel effort, ça va rentrer !', tone: 'soft' };
}
