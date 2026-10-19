// Chargement des données (JSON générés par tools/build_data.py), mis en cache.

const cache = {};
async function load(name) {
  if (!cache[name]) {
    cache[name] = fetch(`data/${name}.json?v=20261019154437`).then(r => {
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

/** Phrases d'exemple d'un mot : [[phrase annotée, traduction], …] */
export async function vocabExamples(v) {
  if (!v?.lv) return [];
  try { return (await load(`vocab_ex_${v.lv.toLowerCase()}`))[v.w] || []; } catch { return []; }
}

/** Sens court pour les QCM : premier ou deux premiers sens */
export function shortMeaning(m) {
  const parts = m.split(/,\s*(?![^()]*\))/);
  let out = parts[0];
  if (parts[1] && (out + parts[1]).length < 28) out += ', ' + parts[1];
  return out;
}

// --- Difficulté d'une phrase pour un niveau : kanji qu'on ne connaît pas encore à ce niveau ------------
let kanjiLvP = null;
/** kanji → indice du premier niveau (0 = N5) où il apparaît dans le vocabulaire */
export function kanjiLevels() {
  kanjiLvP = kanjiLvP || Promise.all(LEVELS.map(l => vocab(l).catch(() => []))).then(lists => {
    const m = new Map();
    lists.forEach((list, i) => list.forEach(v => { for (const ch of v.w) if (/[㐀-鿿々]/.test(ch) && !m.has(ch)) m.set(ch, i); }));
    return m;
  });
  return kanjiLvP;
}
/** Nombre de kanji « au-dessus » du niveau dans la phrase (0 = abordable) */
export async function hardness(text, lv) {
  const m = await kanjiLevels();
  const li = Math.max(0, LEVELS.indexOf(lv));
  let n = 0;
  for (const ch of String(text).replace(/（[^）]*）/g, '')) if (/[㐀-鿿]/.test(ch) && (m.get(ch) ?? 9) > li) n++;
  return n;
}
/** Les phrases les plus abordables pour ce niveau (les plus faciles d'abord) */
export async function easiest(sents, lv, getText = s => s.jp) {
  const scored = await Promise.all(sents.map(async s => ({ s, h: await hardness(getText(s), lv) })));
  return scored.sort((a, b) => a.h - b.h).map(x => x.s);
}
