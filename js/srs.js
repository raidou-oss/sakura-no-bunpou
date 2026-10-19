// Répétition espacée (variante de SM-2, l'algorithme d'Anki).
// Une carte ratée revient dans la même séance puis le lendemain ; une carte réussie
// revient de plus en plus tard (1 j, 6 j, puis intervalle × facilité).

import { store, today, dayKey, DAY } from './util.js?v=20261019140954';

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
export function setExtra(k, v) { extra[k] = v; store.set(K_EXTRA, extra); touch(); }

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

export function removeCard(key) { delete cards[key]; save(); }

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
export const todayStats = () => dayStats();
export const newLeftToday = type => Math.max(0, type === 'g'
  ? settings.newGrammar - dayStats().newG
  : settings.newVocab - dayStats().newV);

/** Série de jours consécutifs avec au moins une révision ou un jeu */
export function streak() {
  let n = 0, t = today();
  const has = k => stats.days[k] && (stats.days[k].rev > 0 || stats.days[k].games > 0);
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
  cards = {}; stats = { days: {} }; extra = { games: {}, lessonsDone: {}, lessonsSeen: {}, last: null, lessonState: {}, gm: {} }; store.set(K_EXTRA, extra); save(); saveStats();
}
