// Algorithme de progression de 桜の文法.
//
// 1. Chaque carte révisée reçoit un score de maîtrise entre 0 et 1 :
//    - croissance logarithmique avec l'intervalle de révision (1 j → 6 j → 21 j…),
//      une carte revue à 21 jours ou plus est considérée « en fleur » ;
//    - pénalité pour les oublis répétés (la carte est fragile) ;
//    - érosion si la révision est en retard (on oublie ce qu'on ne revoit pas).
// 1 bis. Les jeux et exercices comptent aussi : chaque élément réussi à Hanabira, Joshi Dash,
//    Narabe, au Thème, en entraînement ou dans les exercices de leçon ajoute une maîtrise « pratique »
//    (précision × volume, qui s'estompe sans pratique) : jusqu'à 40 % de ce qui manque à la carte.
// 2. Par niveau JLPT, la progression grammaire et la progression vocabulaire sont la moyenne
//    des scores sur TOUS les éléments du niveau (un élément jamais vu compte 0).
// 3. Rang : on valide un niveau quand grammaire ≥ 55 % ET vocabulaire ≥ 45 %.
//    La jauge du rang mélange les deux (60 % grammaire, 40 % vocabulaire), chacune plafonnée
//    à son seuil : impossible de passer N4 en ne faisant que du vocabulaire.
import * as D from './data.js?v=20261019143028';
import * as S from './srs.js?v=20261019143028';

export const MATURE = S.MATURE;                     // 21 jours
export const THRESHOLD = { grammar: 0.55, vocab: 0.45 };
export const WEIGHT = { grammar: 0.6, vocab: 0.4 };
export const RANK_NAMES = ['N5', 'N4', 'N3', 'N2', 'N1'];
export const RANK_TITLES = ['蕾 Bourgeon', '綻 Éclosion', '咲 Floraison', '満開 Pleine floraison', '花吹雪 Tempête de pétales', '桜 Maître'];
const DAY = 86400000;

/** Score de maîtrise d'une carte (0 → 1) */
export function cardScore(c, now = Date.now()) {
  if (!c || !c.s) return 0;
  // 0,15 dès la première bonne découverte, puis courbe log jusqu'à 1 à 21 jours d'intervalle
  let score = 0.15 + 0.85 * Math.min(1, Math.log1p(c.i) / Math.log1p(MATURE));
  // Fragilité : chaque oubli retire 8 %, sans descendre sous 60 %
  score *= Math.max(0.6, 1 - 0.08 * (c.l || 0));
  // Érosion : en retard de d jours sur une carte d'intervalle i, rétention ≈ e^(−d / 2(i+1)), plancher 50 %
  const late = (now - c.d) / DAY;
  if (late > 1) score *= Math.max(0.5, Math.exp(-late / (2 * (c.i + 1))));
  return score;
}

/** Maîtrise pratique (0 → 1) tirée des jeux / exercices : précision lissée × volume × fraîcheur */
export function practiceFactor(g, now = Date.now()) {
  if (!g || !g.ok) return 0;
  const acc = (g.ok + 0.5) / (g.ok + g.ko + 1);
  const volume = Math.min(1, g.ok / 6);
  const fresh = Math.exp(-Math.max(0, (now - g.t) / DAY) / 45);
  return acc * volume * fresh;
}
export const PRACTICE_SHARE = 0.4;
/** Score total d'un élément : révisions espacées + jeux / exercices */
export function itemScore(c, g, now = Date.now()) {
  const s = cardScore(c, now);
  return s + (1 - s) * PRACTICE_SHARE * practiceFactor(g, now);
}

/** Progression de tous les niveaux : { N5: { grammar, vocab, combined, gSeen, vSeen, gBloom, vBloom, gTotal, vTotal } } */
export async function progressByLevel() {
  const [meta, grammar] = await Promise.all([D.meta(), D.grammar()]);
  const lvOf = new Map(grammar.map(g => [g.id, g.lv]));
  const acc = {};
  for (const lv of RANK_NAMES) acc[lv] = { g: 0, v: 0, gSeen: 0, vSeen: 0, gBloom: 0, vBloom: 0 };
  const now = Date.now();
  const cards = S.allCards(), gm = S.practiceStats();
  for (const key of new Set([...Object.keys(cards), ...Object.keys(gm)])) {
    let lv, kind;
    if (key.startsWith('g:')) { lv = lvOf.get(Number(key.slice(2))); kind = 'g'; }
    else if (key.startsWith('v:')) { lv = key.split(':')[1]; kind = 'v'; }
    const a = acc[lv];
    if (!a) continue;
    const c = cards[key];
    const sc = itemScore(c, gm[key], now);
    if (!sc) continue;
    a[kind] += sc;
    a[`${kind}Seen`]++;
    if (c && c.i >= MATURE) a[`${kind}Bloom`]++;
  }
  const out = {};
  for (const lv of RANK_NAMES) {
    const a = acc[lv], gT = meta.grammar[lv] || 1, vT = meta.vocab[lv] || 1;
    const grammarP = a.g / gT, vocabP = a.v / vT;
    out[lv] = {
      grammar: grammarP, vocab: vocabP,
      combined: WEIGHT.grammar * grammarP + WEIGHT.vocab * vocabP,
      gauge: WEIGHT.grammar * Math.min(1, grammarP / THRESHOLD.grammar) + WEIGHT.vocab * Math.min(1, vocabP / THRESHOLD.vocab),
      passed: grammarP >= THRESHOLD.grammar && vocabP >= THRESHOLD.vocab,
      gSeen: a.gSeen, vSeen: a.vSeen, gBloom: a.gBloom, vBloom: a.vBloom, gTotal: gT, vTotal: vT,
    };
  }
  return out;
}

/** Progression grammaire par leçon d'un niveau : Map(leçon → 0..1) */
export async function lessonProgress(lv) {
  const grammar = (await D.grammar()).filter(g => g.lv === lv);
  const cards = S.allCards(), gm = S.practiceStats(), now = Date.now();
  const sums = new Map(), counts = new Map();
  for (const g of grammar) {
    sums.set(g.le, (sums.get(g.le) || 0) + itemScore(cards[`g:${g.id}`], gm[`g:${g.id}`], now));
    counts.set(g.le, (counts.get(g.le) || 0) + 1);
  }
  return new Map([...sums].map(([le, s]) => [le, s / counts.get(le)]));
}

/** Compatibilité : fleurs du jardin (ouverture = progression combinée du niveau) */
export async function levelMastery() {
  const p = await progressByLevel();
  const out = {};
  for (const lv of RANK_NAMES) out[lv] = { ...p[lv], open: p[lv].combined, total: p[lv].gTotal, started: p[lv].gSeen, bloomed: p[lv].gBloom };
  return out;
}

/** Rang de l'élève + jauges + stats pour le profil */
export async function computeRank(progress) {
  progress = progress || await progressByLevel();
  let rank = RANK_NAMES.length;
  for (let i = 0; i < RANK_NAMES.length; i++) if (!progress[RANK_NAMES[i]].passed) { rank = i; break; }
  const lv = RANK_NAMES[Math.min(rank, RANK_NAMES.length - 1)];
  const cur = progress[lv];
  const cards = Object.values(S.allCards()), now = Date.now();
  const learned = cards.filter(c => c.s).length;
  const answers = Object.values(S.allStats().days || {}).reduce((a, d) => a + (d.ok || 0), 0);
  // XP : maîtrise réelle (grammaire comptée triple) + bonnes réponses
  let xp = answers;
  const gm = S.practiceStats();
  for (const [k, c] of Object.entries(S.allCards())) xp += Math.round(cardScore(c, now) * (k.startsWith('g:') ? 30 : 10));
  // XP de pratique : chaque élément réussi en jeu ou en exercice
  for (const [k, g] of Object.entries(gm)) xp += k.startsWith('k:') ? Math.min(6, g.ok) : Math.min(20, g.ok * 2);
  return {
    rank, label: rankLabel(rank), level: lv,
    gauge: rank >= RANK_NAMES.length ? 1 : Math.min(1, cur.gauge),
    grammar: cur.grammar, vocab: cur.vocab,
    xp, learned, streak: S.streak(), progress,
  };
}

export const rankLabel = r => r >= RANK_NAMES.length ? 'N1 validé' : RANK_NAMES[r];
export const rankTitle = r => RANK_TITLES[Math.min(r, RANK_TITLES.length - 1)];
export const pct = x => Math.round(Math.max(0, Math.min(1, x || 0)) * 100);

// --- Niveau du joueur (Lv) : vient de l'XP, comme dans un RPG -----------------------------
// Lv n demande 12·(n−1)² XP : rapide au début, puis de plus en plus long. Plafond : 99.
export function playerLevel(xp = 0) {
  xp = Math.max(0, Number(xp) || 0);
  const lv = Math.min(99, Math.floor(Math.sqrt(xp / 12)) + 1);
  const a = 12 * (lv - 1) ** 2, b = 12 * lv ** 2;
  return { lv, pct: lv >= 99 ? 1 : (xp - a) / (b - a), toNext: lv >= 99 ? 0 : b - xp };
}

/** Scores publics du joueur (affichés sur son profil) */
export function publicScores() {
  const gm = S.practiceStats();
  let ok = 0, ko = 0;
  Object.values(gm).forEach(g => { ok += g.ok || 0; ko += g.ko || 0; });
  const kana = Object.entries(gm).filter(([k, g]) => k.startsWith('k:') && g.ok >= 3 && g.ok / Math.max(1, g.ok + g.ko) >= 0.8).length;
  return {
    games: S.getExtra('games', {}),
    detail: S.getExtra('gameDetail', {}),
    lessons: Object.keys(S.getExtra('lessonsDone', {})).length,
    kana, ok, ko,
  };
}
