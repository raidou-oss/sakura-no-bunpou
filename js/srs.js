// Répétition espacée (variante de SM-2, l'algorithme d'Anki).
// Une carte ratée revient dans la même séance puis le lendemain ; une carte réussie
// revient de plus en plus tard (1 j, 6 j, puis intervalle × facilité).

import { store, today, dayKey, DAY } from './util.js?v=20261021002331';

const K_CARDS = 'sakura.cards.v1';
const K_SETTINGS = 'sakura.settings.v1';
const K_STATS = 'sakura.stats.v1';

export const GRADES = { AGAIN: 0, HARD: 3, GOOD: 4, EASY: 5 };
export const MATURE = 21; // jours : au-delà, la carte est « en fleur »

const DEFAULT_SETTINGS = {
  grammarLevels: ['N5'], vocabLevels: ['N5'],
  newGrammar: 5, newVocab: 10,
  furigana: 'always', // always (par défaut) ; auto = N5/N4 seulement ; never
  sound: true,
  voiceRate: 0.9,    // vitesse de la voix japonaise
  voicePitch: 1.06,  // timbre (un peu plus haut = plus doux)
  voiceName: '',     // voix choisie (vide = la plus naturelle disponible)
  autoSpeak: true,   // lit la réponse à voix haute en révision
  pitch: true,       // schéma d'accent tonal
  register: 'orig',  // style des phrases : orig (tel quel) | polite | plain
};

let cards = store.get(K_CARDS, {});
let settings = { ...DEFAULT_SETTINGS, ...store.get(K_SETTINGS, {}) };
// Furigana partout par défaut : on bascule une fois les anciens réglages « N5 et N4 seulement »
if (!settings.furiV2) { if (settings.furigana === 'auto') settings.furigana = 'always'; settings.furiV2 = true; store.set(K_SETTINGS, settings); }
let stats = store.get(K_STATS, { days: {} });

// Données annexes liées au compte : records des jeux, leçons validées / en cours, maîtrise gagnée en jeu…
const K_EXTRA = 'sakura.extra.v1';
let extra = store.get(K_EXTRA, null);
if (!extra) {
  extra = { games: store.get('sakura.games.v1', {}), lessonsDone: store.get('sakura.lessonsDone.v1', {}),
    lessonsSeen: store.get('sakura.lessonsSeen.v1', {}), last: store.get('sakura.last.v1', null), lessonState: {}, gm: {} };
  store.set(K_EXTRA, extra);
}

const K_UPDATED = 'sakura.updated.v1';
const listeners = new Set();
/** Prévient les abonnés (synchro en ligne) qu'une donnée a changé */
export const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
let silent = false;
const touch = () => { if (silent) return; store.set(K_UPDATED, Date.now()); listeners.forEach(fn => fn()); };
export const lastUpdated = () => store.get(K_UPDATED, 0);
export const getExtra = (k, d) => extra[k] ?? d;
export function setExtra(k, v, { quiet = false } = {}) { extra[k] = v; store.set(K_EXTRA, extra); if (!quiet) touch(); }

/**
 * Résultat d'un élément travaillé hors révisions (jeux, entraînement, exercices de leçon).
 * Sert à l'algorithme de progression : un mot bien réussi à Hanabira compte pour sa maîtrise.
 */
let gmTimer = null;
export function recordPractice(key, right) {
  if (!key) return;
  const gm = extra.gm || (extra.gm = {});
  const g = gm[key] || { ok: 0, ko: 0, t: 0 };
  if (right) g.ok++; else g.ko++;
  g.t = Date.now();
  gm[key] = g;
  clearTimeout(gmTimer);
  gmTimer = setTimeout(() => { store.set(K_EXTRA, extra); touch(); }, 400);
}
export const practiceStats = () => extra.gm || {};
const save = () => { store.set(K_CARDS, cards); touch(); };
const saveStats = () => { store.set(K_STATS, stats); touch(); };

export const getSettings = () => settings;
export function setSettings(patch) { settings = { ...settings, ...patch }; store.set(K_SETTINGS, settings); touch(); }

// Carte : { r: répétitions réussies d'affilée, i: intervalle (jours), e: facilité, d: échéance (ms), l: oublis, s: vue le }
export const getCard = key => cards[key];
export const allStats = () => stats;
export const allCards = () => cards;
export const isDue = (c, now = Date.now()) => c && c.d <= now;

/** Ajoute une carte à réviser tout de suite (bouton « Ajouter à mes révisions ») */
export function addCard(key) {
  if (cards[key]) return false;
  cards[key] = { r: 0, i: 0, e: 2.5, d: Date.now(), l: 0, s: 0 };
  save();
  return true;
}

export function removeCard(key) {
  delete cards[key];
  // Pierre tombale : la synchro ne doit pas faire revenir une carte retirée depuis un autre appareil
  extra.removed = { ...(extra.removed || {}), [key]: Date.now() }; store.set(K_EXTRA, extra);
  save();
}

/** Applique une note et renvoie la carte mise à jour */
export function grade(key, q) {
  const now = Date.now();
  const c = cards[key] ? { ...cards[key] } : { r: 0, i: 0, e: 2.5, d: now, l: 0, s: 0 };
  const wasNew = !cards[key] || c.s === 0;
  if (q < 3) {
    c.l += 1; c.r = 0; c.i = 0;
    c.e = Math.max(1.3, c.e - 0.2);
    c.d = now + 10 * 60 * 1000; // revient dans 10 min (et plus tôt dans la séance)
  } else {
    c.r += 1;
    if (c.r === 1) c.i = q === 5 ? 3 : 1;
    else if (c.r === 2) c.i = q === 3 ? 3 : q === 5 ? 8 : 6;
    else c.i = Math.round(c.i * c.e * (q === 3 ? 0.8 : q === 5 ? 1.3 : 1));
    c.e = Math.max(1.3, c.e + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    const fuzz = c.i > 4 ? Math.round(c.i * (Math.random() * 0.1 - 0.05)) : 0;
    c.i = Math.max(1, c.i + fuzz);
    c.d = today() + c.i * DAY + 3 * 3600 * 1000; // dispo à 3 h du matin le jour J
  }
  c.s = now;
  cards[key] = c;
  save();
  record(q >= 3, wasNew, key[0]);
  return c;
}

/** Prochaine échéance lisible pour l'affichage après une réponse */
export function describeInterval(c) {
  if (c.i === 0) return 'dans quelques minutes';
  if (c.i === 1) return 'demain';
  if (c.i < 30) return `dans ${c.i} jours`;
  if (c.i < 365) return `dans ${Math.round(c.i / 30)} mois`;
  return `dans ${(c.i / 365).toFixed(1)} an(s)`;
}

/** Aperçu des intervalles pour chaque bouton, sans modifier la carte */
export function previewIntervals(key) {
  const c = cards[key] || { r: 0, i: 0, e: 2.5 };
  const next = q => {
    if (q < 3) return 0;
    const r = c.r + 1;
    if (r === 1) return q === 5 ? 3 : 1;
    if (r === 2) return q === 3 ? 3 : q === 5 ? 8 : 6;
    return Math.max(1, Math.round(c.i * c.e * (q === 3 ? 0.8 : q === 5 ? 1.3 : 1)));
  };
  return { 3: next(3), 4: next(4), 5: next(5) };
}

// --- Statistiques -----------------------------------------------------------
function dayStats(k = dayKey()) {
  if (!stats.days[k]) stats.days[k] = { rev: 0, ok: 0, newG: 0, newV: 0, games: 0 };
  return stats.days[k];
}
function record(ok, wasNew, type) {
  const d = dayStats();
  d.rev++; if (ok) d.ok++;
  if (wasNew) type === 'g' ? d.newG++ : d.newV++;
  saveStats();
}
export function recordGame() { dayStats().games++; saveStats(); }
/** Une leçon terminée compte pour la série du jour (comme une révision) */
export function recordLesson() { const d = dayStats(); d.les = (d.les || 0) + 1; saveStats(); }
export const todayStats = () => dayStats();
export const newLeftToday = type => Math.max(0, type === 'g'
  ? settings.newGrammar - dayStats().newG
  : settings.newVocab - dayStats().newV);

const STREAK_RULE_FROM = '2026-10-20';
/** Dernier jour qui a compté pour la série (pour savoir si celle d'un autre élève est encore vivante) */
export function streakDay() {
  const keys = Object.keys(stats.days).filter(k => { const d = stats.days[k]; return d.rev > 0 || d.les > 0 || (k < STREAK_RULE_FROM && d.games > 0); }).sort();
  return keys[keys.length - 1] || null;
}
/** Série de jours consécutifs avec au moins une révision ou un jeu */
export function streak() {
  let n = 0, t = today();
  // La série avance avec une révision ou une leçon terminée (avant le 20/10/2026, les jeux comptaient aussi)
  const has = k => { const d = stats.days[k]; return !!d && (d.rev > 0 || d.les > 0 || (k < STREAK_RULE_FROM && d.games > 0)); };
  if (!has(dayKey(t))) t -= DAY; // pas encore joué aujourd'hui : la série d'hier compte
  while (has(dayKey(t))) { n++; t -= DAY; }
  return n;
}

/** Les 7 derniers jours pour le petit historique de l'accueil */
export function lastDays(n = 7) {
  const out = [];
  for (let k = n - 1; k >= 0; k--) {
    const key = dayKey(today() - k * DAY);
    out.push({ key, ...(stats.days[key] || { rev: 0, ok: 0 }) });
  }
  return out;
}

// --- Sauvegarde / import -----------------------------------------------------
export function exportAll() {
  return JSON.stringify({ app: 'sakura-no-bunpou', v: 1, cards, settings, stats, extra }, null, 1);
}
export function importAll(text) {
  const data = JSON.parse(text);
  if (data.app !== 'sakura-no-bunpou') throw new Error('Ce fichier ne vient pas de 桜の文法.');
  cards = data.cards || {}; settings = { ...DEFAULT_SETTINGS, ...data.settings }; stats = data.stats || { days: {} };
  if (data.extra) { extra = { lessonState: {}, gm: {}, ...data.extra }; store.set(K_EXTRA, extra); }
  save(); store.set(K_SETTINGS, settings); saveStats();
}
/** Instantané complet pour la synchro en ligne */
export const snapshot = () => ({ cards, settings, stats, extra, updated: lastUpdated() });
/** Remplace la progression locale par celle du compte (sans redéclencher de synchro) */
export function replaceAll(data) {
  silent = true;
  cards = data.cards || {}; settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) }; stats = data.stats || { days: {} };
  extra = { lessonState: {}, gm: {}, ...(data.extra || {}) };
  store.set(K_CARDS, cards); store.set(K_SETTINGS, settings); store.set(K_STATS, stats); store.set(K_EXTRA, extra);
  store.set(K_UPDATED, data.updated || Date.now());
  silent = false;
}

export function resetAll() {
  // resetAt : la synchro ignore tout ce qui a été fait avant l'effacement, sur tous les appareils
  cards = {}; stats = { days: {} }; extra = { games: {}, lessonsDone: {}, lessonsSeen: {}, last: null, lessonState: {}, gm: {}, resetAt: Date.now() }; store.set(K_EXTRA, extra); save(); saveStats();
}

// --- Fusion de deux progressions (cet appareil + le compte en ligne) ---------------------------
// On ne remplace plus tout par « le plus récent » : chaque élément garde le meilleur des deux côtés,
// pour ne jamais perdre une révision, un record, une leçon ou de l'XP faite sur un autre appareil.
const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
const maxMerge = (a = {}, b = {}) => {          // nombres : le plus grand ; objets : récursif ; sinon a
  const out = { ...b, ...a };
  for (const k of Object.keys(out)) {
    const x = a[k], y = b[k];
    if (typeof x === 'number' && typeof y === 'number') out[k] = Math.max(x, y);
    else if (isObj(x) && isObj(y)) out[k] = maxMerge(x, y);
    else if (x === undefined) out[k] = y;
  }
  return out;
};
const newer = (x, y, t = o => o?.t || 0) => (t(y) > t(x) ? y : x);
const cardTime = c => Math.max(c?.s || 0, 0);
export function mergeData(A, B) {
  A = A || {}; B = B || {};
  const xa = A.extra || {}, xb = B.extra || {};
  // Un effacement complet sur un appareil l'emporte sur tout ce qui l'a précédé
  const resetAt = Math.max(xa.resetAt || 0, xb.resetAt || 0);
  if ((xa.resetAt || 0) < resetAt && (A.updated || 0) < resetAt) return mergeData(B, B);
  if ((xb.resetAt || 0) < resetAt && (B.updated || 0) < resetAt) return mergeData(A, A);
  const removed = maxMerge(xa.removed, xb.removed);
  const cards = {};
  for (const k of new Set([...Object.keys(A.cards || {}), ...Object.keys(B.cards || {})])) {
    const a = A.cards?.[k], b = B.cards?.[k];
    let c = !a ? b : !b ? a : cardTime(b) > cardTime(a) ? b : cardTime(a) > cardTime(b) ? a : ((b.r || 0) > (a.r || 0) ? b : a);
    if (removed[k] && removed[k] > cardTime(c) && !(c.s === 0 && removed[k] < (c.d || 0))) continue;
    cards[k] = c;
  }
  const days = {};
  for (const d of new Set([...Object.keys(A.stats?.days || {}), ...Object.keys(B.stats?.days || {})])) days[d] = maxMerge(A.stats?.days?.[d], B.stats?.days?.[d]);
  const lessonState = {};
  for (const k of new Set([...Object.keys(xa.lessonState || {}), ...Object.keys(xb.lessonState || {})])) {
    const st = newer(xa.lessonState?.[k], xb.lessonState?.[k]);
    if (st) lessonState[k] = st;
  }
  const gm = {};
  for (const k of new Set([...Object.keys(xa.gm || {}), ...Object.keys(xb.gm || {})])) gm[k] = maxMerge(xa.gm?.[k], xb.gm?.[k]);
  const aNewer = (A.updated || 0) >= (B.updated || 0);
  const extra = {
    ...(aNewer ? { ...xb, ...xa } : { ...xa, ...xb }),
    games: maxMerge(xa.games, xb.games),
    gameDetail: maxMerge(xa.gameDetail, xb.gameDetail),
    lessonsDone: maxMerge(xa.lessonsDone, xb.lessonsDone),
    lessonsSeen: maxMerge(xa.lessonsSeen, xb.lessonsSeen),
    links: maxMerge(aNewer ? xa.links : xb.links, aNewer ? xb.links : xa.links),
    peak: maxMerge(xa.peak, xb.peak),
    last: newer(xa.last, xb.last) || null,
    lessonState, gm, removed, resetAt,
  };
  const settings = aNewer ? { ...(B.settings || {}), ...(A.settings || {}) } : { ...(A.settings || {}), ...(B.settings || {}) };
  return { cards, settings, stats: { ...(B.stats || {}), ...(A.stats || {}), days }, extra, updated: Math.max(A.updated || 0, B.updated || 0) };
}
/** Fusionne la progression du compte dans celle de cet appareil ; renvoie ce qui a changé de chaque côté */
export function mergeIn(remote) {
  const local = snapshot();
  const merged = mergeData(local, remote);
  // Comparaison indépendante de l'ordre des clés (Supabase range les clés jsonb à sa façon)
  const j = x => JSON.stringify(x, (k, v) => (isObj(v) ? Object.fromEntries(Object.keys(v).sort().map(key => [key, v[key]])) : v));
  const localChanged = j(merged.cards) !== j(local.cards) || j(merged.stats) !== j(local.stats) || j(merged.extra) !== j(local.extra) || j(merged.settings) !== j(local.settings);
  const remoteChanged = !remote || j(merged.cards) !== j(remote.cards) || j(merged.stats) !== j(remote.stats) || j(merged.extra) !== j(remote.extra || {}) || j(merged.settings) !== j(remote.settings);
  if (localChanged) replaceAll(merged);
  return { merged: snapshot(), localChanged, remoteChanged };
}
