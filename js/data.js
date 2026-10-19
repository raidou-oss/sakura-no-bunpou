// Chargement des données (JSON générés par tools/build_data.py), mis en cache.

const cache = {};
async function load(name) {
  if (!cache[name]) {
    cache[name] = fetch(`data/${name}.json?v=20261019033652`).then(r => {
      if (!r.ok) throw new Error(`Impossible de charger ${name}.json`);
      return r.json();
    });
  }
  return cache[name];
}

/** Libellé japonais d'un point : avec lecture si la colonne furigana en contient une */
export const gramLabel = g => (g.f && g.f.includes('（') ? g.f : g.t);

export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
export const LEVEL_NAMES = { N5: 'N5', N4: 'N4', N3: 'N3', N2: 'N2', N1: 'N1', kansai: '関西弁', extra: 'Hors JLPT' };
export const LEVEL_JP = { N5: '蕾', N4: '綻', N3: '咲', N2: '満開', N1: '花吹雪' };

let grammarIdx, sentByG;

/** Totaux par niveau : { vocab: {N5: 1100…}, grammar: {N5: 132…} } */
export const meta = () => load('meta');

export async function grammar() {
  const list = await load('grammar');
  if (!grammarIdx) grammarIdx = new Map(list.map(g => [g.id, g]));
  return list;
}
export async function grammarById(id) { await grammar(); return grammarIdx.get(Number(id)); }

export async function sentences() {
  const list = await load('sentences');
  if (!sentByG) {
    sentByG = new Map();
    for (const s of list) { if (!sentByG.has(s.g)) sentByG.set(s.g, []); sentByG.get(s.g).push(s); }
  }
  return list;
}
export async function sentencesFor(gid) { await sentences(); return sentByG.get(Number(gid)) || []; }

/** Vocabulaire d'un niveau : [{unit, order, w, f, m, lv, p}] (p = accent tonal, null si inconnu) */
const vocabObj = {};
export async function vocab(lv) {
  if (!vocabObj[lv]) {
    const rows = await load(`vocab_${lv.toLowerCase()}`);
    vocabObj[lv] = rows.map(([unit, order, w, f, m, p]) => ({ unit, order, w, f, m, lv, p }));
  }
  return vocabObj[lv];
}
export const vocabKey = v => `v:${v.lv}:${v.w}`;

/** Sens court pour les QCM : premier ou deux premiers sens */
export function shortMeaning(m) {
  const parts = m.split(/,\s*(?![^()]*\))/);
  let out = parts[0];
  if (parts[1] && (out + parts[1]).length < 28) out += ', ' + parts[1];
  return out;
}
