// Rang de l'élève : N5 → N1, avec une jauge d'avancement dans le rang en cours.
// Un niveau est validé quand 60 % de sa grammaire est bien installée (fleur ouverte à 60 %).
import * as D from './data.js?v=20261018232551';
import * as S from './srs.js?v=20261018232551';

export const RANK_THRESHOLD = 0.6;
export const RANK_NAMES = ['N5', 'N4', 'N3', 'N2', 'N1'];
export const RANK_TITLES = ['蕾 Bourgeon', '綻 Éclosion', '咲 Floraison', '満開 Pleine floraison', '花吹雪 Tempête de pétales', '桜 Maître'];

/** Maîtrise par niveau : 0 → 1 (moyenne pondérée de l'installation des points) */
export async function levelMastery() {
  const grammar = await D.grammar();
  const cards = S.allCards();
  const out = {};
  for (const lv of D.LEVELS) {
    const pts = grammar.filter(g => g.lv === lv);
    let sum = 0, started = 0, bloomed = 0;
    for (const g of pts) {
      const c = cards[`g:${g.id}`];
      if (!c) continue;
      started++; if (c.i >= S.MATURE) bloomed++;
      sum += Math.min(1, c.i / S.MATURE) * 0.9 + (c.s ? 0.1 : 0);
    }
    out[lv] = { total: pts.length, started, bloomed, open: pts.length ? sum / pts.length : 0 };
  }
  return out;
}

/** Rang courant + jauge + petites stats pour le profil */
export async function computeRank(mastery) {
  mastery = mastery || await levelMastery();
  let rank = RANK_NAMES.length, gauge = 1;
  for (let i = 0; i < RANK_NAMES.length; i++) {
    const m = mastery[RANK_NAMES[i]].open;
    if (m < RANK_THRESHOLD) { rank = i; gauge = m / RANK_THRESHOLD; break; }
  }
  const cards = Object.values(S.allCards());
  const learned = cards.filter(c => c.s).length;
  const mature = cards.filter(c => c.i >= S.MATURE).length;
  const xp = learned * 10 + mature * 25 + Object.values(S.allStats().days || {}).reduce((a, d) => a + (d.ok || 0), 0);
  return { rank, gauge: Math.min(1, gauge), xp, learned, streak: S.streak(), label: rankLabel(rank) };
}

export const rankLabel = r => r >= RANK_NAMES.length ? 'N1 validé' : RANK_NAMES[r];
export const rankTitle = r => RANK_TITLES[Math.min(r, RANK_TITLES.length - 1)];
