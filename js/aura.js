// 炎 Séries (jours d'affilée) : flammes bleues et auras autour de l'avatar selon la série.
import { h, dayKey, DAY, reducedMotion } from './util.js?v=20261020224905';
import * as S from './srs.js?v=20261020224905';

/** Paliers d'aura : plus la série est longue, plus l'aura est intense */
export const AURAS = [
  { min: 0, name: '', jp: '' },
  { min: 3, name: 'Étincelle', jp: '火花' },
  { min: 7, name: 'Flamme bleue', jp: '蒼炎' },
  { min: 14, name: 'Double flamme', jp: '双炎' },
  { min: 30, name: 'Brasier céleste', jp: '天炎' },
  { min: 100, name: 'Légende', jp: '伝説' },
];
export const auraTier = n => { let t = 0; AURAS.forEach((a, i) => { if ((n || 0) >= a.min) t = i; }); return t; };
export const nextAura = n => AURAS.find(a => a.min > (n || 0)) || null;

/** Série d'un élève : la mienne en direct ; celle des autres seulement si elle est encore vivante (hier ou aujourd'hui) */
export function streakFor(p, meId) {
  if (p?.id && p.id === meId) return S.streak();
  const n = Number(p?.streak) || 0;
  const day = p?.scores?.streakDay;
  if (n && day && day < dayKey(Date.now() - DAY)) return 0;
  return n;
}

let fid = 0;
/** Flamme bleue (SVG) — animée, avec un cœur clair */
export function flame({ size = 18, cls = '' } = {}) {
  const id = `fl${++fid}`;
  const span = h(`span.flame${cls ? `.${cls}` : ''}`, { 'aria-hidden': 'true', style: { '--fs': `${size}px` } });
  span.innerHTML = `<svg viewBox="0 0 24 32" width="${size}" height="${Math.round(size * 32 / 24)}">
    <defs>
      <linearGradient id="${id}a" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#2F6BFF"/><stop offset=".55" stop-color="#46D9FF"/><stop offset="1" stop-color="#B8F3FF"/></linearGradient>
      <linearGradient id="${id}b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#E6FBFF"/><stop offset="1" stop-color="#FF94CB"/></linearGradient>
    </defs>
    <path class="fl-out" fill="url(#${id}a)" d="M12 1c1.2 5.2 6.8 8.4 8.6 14.2 2 6.4-2.6 15.8-8.6 15.8S1.4 25.4 3.2 19.6c.9-2.9 2.8-4.5 3.6-7.4.5 2.4 1.6 3.9 3 4.6C9 11.6 10.4 6 12 1z"/>
    <path class="fl-in" fill="url(#${id}b)" d="M12.4 13.5c.6 3 3.9 4.9 4.1 8.6.2 3.9-2 6.9-4.6 6.9s-4.9-2.4-4.4-5.6c.3-2.1 1.7-3.1 2.1-5 .5 1.5 1.3 2.4 2.1 2.7-.4-2.7.2-5.4.7-7.6z"/>
  </svg>`;
  return span;
}

/** Pastille « 🔥 12 jours » en flammes bleues */
export function streakBadge(n, { big = false } = {}) {
  const t = auraTier(n);
  return h(`span.streak-badge.tier-${t}${big ? '.big' : ''}`, { title: n ? `${n} jour${n > 1 ? 's' : ''} d’affilée${t ? ` · aura ${AURAS[t].name}` : ''}` : 'Pas de série en cours' },
    flame({ size: big ? 26 : 16, cls: n ? '' : 'off' }), h('b', String(n || 0)));
}

/** Habille un avatar (ou son conteneur) avec l'aura de la série.
 *  Grandes tailles (l, xl) : vraie aura en plusieurs couches —
 *  halo, rayons (Légende), feu animé qui enveloppe la photo (filtre SVG de turbulence),
 *  braises / pétales qui montent, anneau runique en orbite et arcs électriques (paliers hauts). */
let aid = 0;
const rnd = (a, b) => a + Math.random() * (b - a);
export function withAura(el, n) {
  const t = auraTier(n);
  if (!t) return el;
  el.classList.add('aura', `aura-${t}`);
  el.title = `${AURAS[t].jp} ${AURAS[t].name} · ${n} jours d’affilée`;
  el.prepend(h('i.aura-fx', { 'aria-hidden': 'true' }));
  const big = /\b(l|xl)\b/.test(el.className);
  if (!big) {
    if (t >= 2 && el.classList.contains('m')) el.append(embers(t, 5));
    return el;
  }
  el.classList.add('aura-big');
  const back = h('i.aura-back', { 'aria-hidden': 'true' });
  back.append(h('i.aura-glow'));
  if (t >= 5) back.append(h('i.aura-rays'));
  const cv = reducedMotion() ? null : flameCanvas(el, t);
  if (cv) el.prepend(cv); else if (t >= 2) back.append(fire(t));
  if (t >= 4) back.append(h('i.orbit-holder', orbitBack()));
  el.prepend(back);
  const front = h('i.aura-front', { 'aria-hidden': 'true' });
  if (!cv) { front.append(embers(t, [0, 6, 10, 14, 18, 24][t])); if (t >= 4) front.append(sparks(t)); }
  front.append(h('i.aura-rim'));
  el.append(front);
  if (t >= 4) el.append(orbit(t));
  return el;
}

/** Feu : deux couches (contour sombre + cœur vif) déformées par un bruit animé */
function fire(t) {
  const id = `au${++aid}`;
  const seed = Math.floor(rnd(1, 90));
  const layer = (k, scale, fx, fy, dur, cls) => `
    <filter id="${id}f${k}" x="-40%" y="-40%" width="180%" height="180%">
      <feTurbulence type="fractalNoise" baseFrequency="${fx} ${fy}" numOctaves="2" seed="${seed + k}" result="n">
        <animate attributeName="baseFrequency" dur="${dur}s" values="${fx} ${fy};${(fx * 1.35).toFixed(3)} ${(fy * 1.3).toFixed(3)};${fx} ${fy}" repeatCount="indefinite"/>
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>
      <feGaussianBlur stdDeviation="${k ? 0.8 : 1.6}"/>
    </filter>
    <path class="${cls}" filter="url(#${id}f${k})" fill="url(#${id}g${k})" d="M0,-98 C20,-74 64,-44 62,2 C60,44 34,64 0,64 C-34,64 -60,44 -62,2 C-64,-44 -20,-74 0,-98 Z"/>`;
  const grad = (k, a, b, c) => `<radialGradient id="${id}g${k}" cx="0" cy="8" r="${k ? 86 : 100}" gradientUnits="userSpaceOnUse">
      <stop offset="${k ? .52 : .45}" stop-color="${c}" stop-opacity="1"/><stop offset="${k ? .7 : .68}" stop-color="${b}" stop-opacity=".95"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>`;
  const pal = t >= 5 ? [['#FF4FA3', '#FF94CB', '#FFD86B'], ['#FF9F43', '#FFD86B', '#FFF1C4']]
    : t >= 3 ? [['#FF4FA3', '#FF94CB', '#FFD6E8'], ['#2F6BFF', '#46D9FF', '#E6FBFF']]
    : [['#1B3FD0', '#2F6BFF', '#46D9FF'], ['#46D9FF', '#B8F3FF', '#FFFFFF']];
  const svg = h('i.aura-fire');
  svg.innerHTML = `<svg viewBox="-100 -100 200 200" preserveAspectRatio="xMidYMid meet"><defs>${grad(0, ...pal[0])}${grad(1, ...pal[1])}</defs>
    ${layer(0, t >= 4 ? 40 : 32, 0.075, 0.022, 2.6, 'fo')}${layer(1, t >= 4 ? 26 : 20, 0.1, 0.03, 1.7, 'fi')}</svg>`;
  return svg;
}

/** Braises (et pétales à partir de Double flamme) qui montent autour du cadre */
function embers(t, count) {
  const wrap = h('i.aura-embers');
  for (let k = 0; k < count; k++) {
    const petal = t >= 3 && k % 3 === 0;
    const side = Math.random() < .5 ? rnd(4, 30) : rnd(70, 96);
    wrap.append(h(`i${petal ? '.petal' : ''}`, { style: {
      '--x': `${side.toFixed(1)}%`, '--y': `${rnd(45, 95).toFixed(1)}%`, '--dx': `${rnd(-18, 18).toFixed(1)}px`,
      '--d': `${rnd(1.8, 3.4).toFixed(2)}s`, '--w': `${rnd(-3.4, 0).toFixed(2)}s`, '--s': rnd(.6, 1.25).toFixed(2), '--r': `${Math.round(rnd(-60, 60))}deg` } }));
  }
  return wrap;
}

/** Anneau incliné + kanji en orbite : ils passent derrière puis devant la photo */
function orbitBack() { return h('i.orbit-ring'); }
function orbit(t) {
  const glyphs = t >= 5 ? '伝説桜炎' : '天炎蒼火';
  return h('i.aura-orbit', { 'aria-hidden': 'true' }, h('i.orbit-ring.front'),
    ...[...glyphs].map((g, k) => h('i.og', { style: { '--k': k } }, h('b', g))));
}

/** Arcs électriques qui claquent par instants */
function sparks(t) {
  const el = h('i.aura-sparks');
  const paths = Array.from({ length: t >= 5 ? 4 : 3 }, (_, k) => {
    const a = rnd(0, Math.PI * 2), r0 = 58, pts = [];
    for (let j = 0; j < 6; j++) {
      const r = r0 + j * 8, aa = a + rnd(-.18, .18);
      pts.push(`${(Math.cos(aa) * r).toFixed(1)},${(Math.sin(aa) * r).toFixed(1)}`);
    }
    return `<polyline points="${pts.join(' ')}" style="--k:${k}"/>`;
  }).join('');
  el.innerHTML = `<svg viewBox="-100 -100 200 200">${paths}</svg>`;
  return el;
}

// --- Semaine façon Duolingo : 月火水木金土日 avec la flamme bleue sur les jours validés ------------
const WEEK = [['月', 'げつ', 'lundi'], ['火', 'か', 'mardi'], ['水', 'すい', 'mercredi'], ['木', 'もく', 'jeudi'], ['金', 'きん', 'vendredi'], ['土', 'ど', 'samedi'], ['日', 'にち', 'dimanche']];
const RULE_FROM = '2026-10-20';
const dayDone = d => !!d && (d.rev > 0 || d.les > 0);
export function weekStrip({ big = false } = {}) {
  const days = S.allStats().days || {};
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7), 12);   // midi : évite les décalages UTC
  const todayIdx = (now.getDay() + 6) % 7;
  return h(`ol.week-strip${big ? '.big' : ''}`, { 'aria-label': 'Ta semaine' }, ...WEEK.map(([k, r, fr], i) => {
    const t = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12);
    const key = dayKey(t.getTime());
    const d = days[key];
    const done = dayDone(d) || (key < RULE_FROM && d?.games > 0);
    const state = i === todayIdx ? (done ? 'today done' : 'today') : i > todayIdx ? 'future' : done ? 'done' : 'missed';
    return h('li', { class: `wd ${state}`, title: `${fr[0].toUpperCase() + fr.slice(1)} : ${done ? 'série validée' : i > todayIdx ? 'à venir' : i === todayIdx ? 'pas encore validée' : 'pas de révision ni de leçon'}` },
      h('span.wd-flame', done ? flame({ size: big ? 30 : 22 }) : h('i.wd-empty')),
      h('ruby.wd-kanji', { lang: 'ja' }, k, h('rt', r)));
  }));
}

// --- Aura en particules (canvas) : un vrai feu d'énergie qui jaillit autour de la photo ----------
// Les particules naissent sur le bord du cadre, montent en ondulant et se resserrent au-dessus
// de la tête (silhouette en goutte, façon aura d'éveil). Mélange additif : le cœur devient blanc.
const PAL = {
  1: [['#E6FBFF', '#46D9FF', '#2F6BFF']],
  2: [['#E6FBFF', '#46D9FF', '#1B3FD0']],
  3: [['#E6FBFF', '#46D9FF', '#2F6BFF'], ['#FFF0F7', '#FF94CB', '#FF2F8A']],
  4: [['#FFFFFF', '#7FE6FF', '#2F6BFF'], ['#FFF0F7', '#FF94CB', '#FF2F8A'], ['#FFFFFF', '#B8F3FF', '#46D9FF']],
  5: [['#FFFFFF', '#FFE08A', '#FF9F43'], ['#FFF0F7', '#FF94CB', '#FF2F8A'], ['#FFFFFF', '#FFF1C4', '#FFD86B']],
};
const SIZE = { xl: 124, l: 64 };
const sprites = new Map();
function sprite(core, mid, outer) {
  const k = core + mid + outer;
  if (sprites.has(k)) return sprites.get(k);
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, core); gr.addColorStop(.25, mid); gr.addColorStop(.6, outer + '66'); gr.addColorStop(1, outer + '00');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  sprites.set(k, c);
  return c;
}
const live = new Set();
let raf = 0, last = 0;
function loop(now) {
  const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
  for (const a of live) {
    if (!a.host.isConnected) { if (a.seen) { live.delete(a); a.io?.disconnect(); } continue; }
    a.seen = true;
    if (a.visible && !document.hidden) a.step(dt, now / 1000);
  }
  raf = live.size ? requestAnimationFrame(loop) : 0;
  if (!raf) last = 0;
}

function flameCanvas(host, t) {
  const sz = Object.keys(SIZE).find(k => host.classList.contains(k));
  if (!sz) return null;
  const S = SIZE[sz], k = S / 124;                        // échelle (xl = 1)
  const W = S * (t >= 4 ? 3.1 : 2.7), H = S * (t >= 4 ? 3.6 : 3.1);
  const cx = W / 2, cy = H * .6, R = S / 2;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cv = document.createElement('canvas');
  cv.className = 'aura-canvas';
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  cv.style.width = `${W}px`; cv.style.height = `${H}px`;
  cv.style.top = `${S / 2 - cy}px`; cv.style.left = `${S / 2 - cx}px`;
  cv.setAttribute('aria-hidden', 'true');
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  const pals = PAL[t].map(p => sprite(...p));
  const rate = [0, 160, 300, 380, 460, 560][t] * (sz === 'xl' ? 1 : .55);
  const height = [0, .7, 1, 1.15, 1.35, 1.55][t];
  const parts = [], bolts = [], waves = [];
  const dim = Math.min(1, Math.sqrt(300 / rate));
  let acc = 0, nextBolt = 1, nextWave = .4;
  const spawn = () => {
    const th = Math.random() * Math.PI * 2;
    const r = R * (0.96 + Math.random() * .1);
    const x = cx + Math.cos(th) * r, y = cy + Math.sin(th) * r;
    const out = (34 + Math.random() * 34) * k;
    const ember = Math.random() < .05;
    parts.push({ x, y, vx: Math.cos(th) * out, vy: Math.sin(th) * out * .5 - (50 + Math.random() * 50) * k * height,
      life: 0, max: ember ? 1.4 + Math.random() * .6 : (.5 + Math.random() * .5) * (0.75 + height * .3),
      r0: R * (ember ? .06 : .24 + Math.random() * .2), sp: pals[(Math.random() * pals.length) | 0], ph: Math.random() * 6.28, ember });
  };
  const bolt = () => {
    const th = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.6;
    const pts = []; let r = R * 1.02, a = th;
    for (let i = 0; i < 7; i++) { pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); r += R * (.1 + Math.random() * .12); a += (Math.random() - .5) * .5; }
    bolts.push({ pts, life: 0, max: .16 + Math.random() * .1 });
  };
  const glowCol = PAL[t][0][1];
  const a = {
    host, visible: true, seen: false,
    step(dt, time) {
      acc += rate * dt;
      while (acc >= 1) { spawn(); acc--; }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) { parts.splice(i, 1); continue; }
        p.vy -= (p.ember ? 40 : 130) * k * height * dt;                    // ça monte
        if (p.y < cy - R * .55) p.vx += (cx - p.x) * (2.6 / height) * dt;           // se resserre au-dessus de la tête
        p.vx += Math.sin(time * 7 + p.ph) * 60 * k * dt;                   // ondule
        p.vx *= 1 - 1.6 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      if (t >= 4 && (nextBolt -= dt) <= 0) { bolt(); if (Math.random() < .4) bolt(); nextBolt = .35 + Math.random() * 1.1; }
      if (t >= 3 && (nextWave -= dt) <= 0) { waves.push({ life: 0 }); nextWave = 2.4; }
      g.clearRect(0, 0, W, H);
      // Lueur de fond qui pulse
      const pulse = .75 + .25 * Math.sin(time * 3.2);
      const halo = g.createRadialGradient(cx, cy, R * .8, cx, cy - R * .2, R * (1.9 + .2 * height));
      halo.addColorStop(0, glowCol + Math.round(110 * pulse).toString(16).padStart(2, '0')); halo.addColorStop(1, glowCol + '00');
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = halo; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      // Ondes de choc
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i]; w.life += dt;
        const q = w.life / 1.1; if (q >= 1) { waves.splice(i, 1); continue; }
        g.beginPath(); g.arc(cx, cy, R * (1.02 + q * .9), 0, Math.PI * 2);
        g.strokeStyle = PAL[t][PAL[t].length > 1 ? 1 : 0][1]; g.globalAlpha = (1 - q) * .7; g.lineWidth = (1 - q) * 5 * k + 1; g.stroke();
      }
      // Flammes
      for (const p of parts) {
        const q = p.life / p.max;
        const sz2 = p.r0 * (p.ember ? 1 : (1 - q * .6)) * 2;
        g.globalAlpha = (p.ember ? 1 : .42 * dim) * (1 - q) * (q < .1 ? q / .1 : 1);
        g.drawImage(p.sp, p.x - sz2 / 2, p.y - sz2 / 2 - sz2 * .15, sz2, sz2 * 1.3);
      }
      // Éclairs
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i]; b.life += dt;
        if (b.life >= b.max) { bolts.splice(i, 1); continue; }
        g.globalAlpha = Math.random() < .3 ? .3 : 1;
        g.beginPath(); b.pts.forEach(([x, y], j) => j ? g.lineTo(x, y) : g.moveTo(x, y));
        g.lineJoin = 'round';
        g.strokeStyle = PAL[t][0][1]; g.lineWidth = 5 * k + 1.5; g.shadowBlur = 0; g.globalAlpha *= .5; g.stroke();
        g.strokeStyle = '#FFFFFF'; g.lineWidth = 1.6 * k + .8; g.globalAlpha = 1; g.stroke();
      }
      g.globalAlpha = 1;
    },
  };
  if ('IntersectionObserver' in window) {
    a.io = new IntersectionObserver(es => { a.visible = es.some(e => e.isIntersecting); });
    a.io.observe(cv);
  }
  // pré-chauffe : le feu est déjà là à l'affichage
  for (let i = 0; i < 40; i++) a.step(1 / 30, i / 30);
  live.add(a);
  if (!raf) raf = requestAnimationFrame(loop);
  return cv;
}
