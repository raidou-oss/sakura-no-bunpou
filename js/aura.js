// 炎 Séries (jours d'affilée) : flammes bleues et auras autour de l'avatar selon la série.
import { h, dayKey, DAY } from './util.js?v=20261020101742';
import * as S from './srs.js?v=20261020101742';

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

/** Habille un avatar (ou son conteneur) avec l'aura de la série */
export function withAura(el, n) {
  const t = auraTier(n);
  if (!t) return el;
  el.classList.add('aura', `aura-${t}`);
  el.title = `${AURAS[t].jp} ${AURAS[t].name} · ${n} jours d’affilée`;
  el.prepend(h('i.aura-fx', { 'aria-hidden': 'true' }));
  if (t >= 2) el.append(h('i.aura-flames', { 'aria-hidden': 'true' }, ...Array.from({ length: t >= 4 ? 10 : 7 }, (_, k) => h('i', { style: { '--k': k, '--n': t >= 4 ? 10 : 7 } }))));
  return el;
}
