// ✦ Particules plein écran légères (RANK UP, LEVEL UP…) : sprites lumineux pré-dessinés,
// aucun flou calculé à chaque image (shadowBlur), nombre de particules plafonné.
const SPR = new Map();
function glow(col) {
  if (SPR.has(col)) return SPR.get(col);
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const g = c.getContext('2d'), r = g.createRadialGradient(48, 48, 0, 48, 48, 48);
  r.addColorStop(0, '#ffffff'); r.addColorStop(.12, '#ffffff'); r.addColorStop(.22, col); r.addColorStop(.5, col + '40'); r.addColorStop(1, col + '00');
  g.fillStyle = r; g.fillRect(0, 0, 96, 96);
  SPR.set(col, c); return c;
}
export const FX_COLORS = ['#46D9FF', '#FF94CB', '#FFFFFF', '#B8F3FF', '#FF4FA3'];
const MAX = 260;

/** Calque canvas plein écran ; renvoie { burst, trail, embers, stop } */
export function fxLayer(parent, { cls = 'fx-canvas' } = {}) {
  const cv = document.createElement('canvas');
  cv.className = cls; cv.setAttribute('aria-hidden', 'true');
  parent.append(cv);
  const g = cv.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);   // net sur écrans haute densité
  let W = 0, H = 0;
  const size = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener('resize', size);
  const P = [];
  let alive = true, ember = 0, emberCols = FX_COLORS.slice(0, 2), last = 0, running = false;
  const add = p => { if (P.length < MAX) P.push(p); };
  const kick = () => { if (!running && alive) { running = true; last = 0; requestAnimationFrame(tick); } };
  function tick(now) {
    if (!alive) return;
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    if (ember) { ember.acc += dt * ember.rate; while (ember.acc > 1) { ember.acc--; add({ x: Math.random() * W, y: H + 8, vx: (Math.random() - .5) * 30, vy: -(60 + Math.random() * 110), life: 0, max: 3 + Math.random() * 2.5, s: 5 + Math.random() * 6, c: emberCols[(Math.random() * emberCols.length) | 0], g: 0, dot: true }); } }
    g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life += dt;
      if (p.life >= p.max) { P.splice(i, 1); continue; }
      const q = p.life / p.max;
      p.vx *= 1 - (p.drag ?? 2) * dt; p.vy = p.vy * (1 - (p.drag ?? 2) * dt) + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      g.globalAlpha = 1 - q;
      if (p.dot) { const s = p.s * (1 - q * .5); g.drawImage(glow(p.c), p.x - s, p.y - s, s * 2, s * 2); continue; }
      p.rot += p.vr * dt;
      const s = p.s * (1 - q * .4);
      g.drawImage(glow(p.c), p.x - s * 1.6, p.y - s * 1.6, s * 3.2, s * 3.2);   // halo (sprite, pas de flou calculé)
      // Éclat : facette colorée + arête blanche (aspect cristal, net)
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, Math.cos(p.rot * 1.7) * .6 + .4);
      g.fillStyle = p.c;
      g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .45, s * .6); g.lineTo(-s * .5, s * .3); g.closePath(); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.globalAlpha *= .85; g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .45, s * .6); g.stroke();
      g.restore();
    }
    g.globalAlpha = 1;
    if (P.length || ember) requestAnimationFrame(tick); else { running = false; g.clearRect(0, 0, W, H); }
  }
  return {
    el: cv,
    burst(x, y, n = 60, power = 1, cols = FX_COLORS) {
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2, v = (220 + Math.random() * 560) * power;
        add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100 * power, life: 0, max: .7 + Math.random() * .8,
          s: (4 + Math.random() * 9) * power, rot: Math.random() * 6, vr: (Math.random() - .5) * 16, c: cols[(Math.random() * cols.length) | 0], g: 420, dot: Math.random() < .35 });
      }
      kick();
    },
    /** Étincelles qui s'échappent d'un point (tête d'une jauge qui se remplit…) */
    trail(x, y, n = 3, cols = FX_COLORS) {
      for (let k = 0; k < n; k++) add({ x, y, vx: (Math.random() - .5) * 120, vy: -(40 + Math.random() * 160), life: 0, max: .4 + Math.random() * .4, s: 3 + Math.random() * 4, c: cols[(Math.random() * cols.length) | 0], g: 300, dot: true });
      kick();
    },
    embers(rate = 22, cols) { ember = rate ? { rate, acc: 0 } : 0; if (cols) emberCols = cols; kick(); },
    stop() { alive = false; removeEventListener('resize', size); cv.remove(); },
  };
}
