// 説明バブル : au survol (ou au toucher) d'une phrase japonaise, une bulle explique le mot pointé :
// particule, mot de vocabulaire, verbe conjugué, connecteur, forme grammaticale…
// Découpage maison : plus long mot connu d'abord (vocabulaire N5→N1, points de grammaire, particules),
// avec une « déconjugaison » simple des verbes et adjectifs.
import { h, ruby } from './util.js?v=20261019145238';
import * as D from './data.js?v=20261019145238';
import * as S from './srs.js?v=20261019145238';

// --- Petits mots qui reviennent partout ----------------------------------------------------
const PARTICLES = {
  'は': ['Particule', 'Thème de la phrase : « quant à… ». Se lit « wa ».'],
  'が': ['Particule', 'Marque le sujet (souvent une info nouvelle ou mise en avant). Aussi « mais » en fin de proposition.'],
  'を': ['Particule', 'Marque le complément d’objet direct (ce qu’on mange, lit, achète…). Se lit « o ».'],
  'に': ['Particule', 'Point d’arrivée : lieu où l’on va ou se trouve, moment précis, personne à qui l’on donne.'],
  'で': ['Particule', 'Lieu où se passe l’action, ou moyen utilisé (en train, avec des baguettes…).'],
  'へ': ['Particule', 'Direction : « vers ». Se lit « e ».'],
  'と': ['Particule', '« Et » entre des noms, « avec » quelqu’un, ou citation (« que… »).'],
  'も': ['Particule', '« Aussi », « non plus » ; après un nombre : « autant que ».'],
  'の': ['Particule', 'Lien entre deux noms (« de », possession), ou transforme une proposition en nom.'],
  'か': ['Particule', 'Question en fin de phrase, ou « ou » entre deux éléments.'],
  'や': ['Particule', '« Et… entre autres » : liste incomplète.'],
  'ね': ['Particule finale', 'Cherche l’accord : « n’est-ce pas ? », « hein ».'],
  'よ': ['Particule finale', 'Affirme ou apprend quelque chose à l’autre : « tu sais ».'],
  'から': ['Particule', '« Depuis / à partir de » (lieu, temps) ou « parce que » après une proposition.'],
  'まで': ['Particule', '« Jusqu’à » (lieu, temps).'],
  'より': ['Particule', '« Que » dans une comparaison (A より B : B plus que A).'],
  'しか': ['Particule', '« Seulement », toujours suivi d’une forme négative.'],
  'だけ': ['Particule', '« Seulement, uniquement ».'],
  'ほど': ['Particule', '« Au point de », ou « pas autant que » avec un négatif.'],
  'くらい': ['Particule', '« Environ », « au point de ».'],
  'ぐらい': ['Particule', '« Environ », « au point de ».'],
  'ごろ': ['Particule', '« Vers » (une heure, une date).'],
  'など': ['Particule', '« Etc., par exemple ».'],
  'ばかり': ['Particule', '« Rien que », ou « venir juste de » après la forme en た.'],
  'ずつ': ['Particule', '« Chacun, à chaque fois » (un par un…).'],
  'でも': ['Particule', '« Même », « ou quelque chose comme » ; en début de phrase : « mais ».'],
  'って': ['Particule', 'Citation familière (« il paraît que… ») ou thème familier.'],
  'とか': ['Particule', '« Par exemple, des choses comme ».'],
  'けど': ['Connecteur', '« Mais », « bien que » (familier).'],
  'けれど': ['Connecteur', '« Mais », « bien que ».'],
  'けれども': ['Connecteur', '« Mais », « bien que » (plus soutenu).'],
  'ので': ['Connecteur', '« Parce que, comme » (cause objective, poli).'],
  'のに': ['Connecteur', '« Alors que, pourtant » (surprise, regret).'],
  'ながら': ['Connecteur', '« Tout en » (deux actions en même temps).'],
  'し': ['Connecteur', '« Et en plus » (énumère des raisons).'],
  'たら': ['Connecteur', '« Si / quand » (condition, une fois que…).'],
  'なら': ['Connecteur', '« Si c’est le cas, quant à… ».'],
  'ば': ['Connecteur', 'Condition « si » (forme en -ば).'],
  'わ': ['Particule finale', 'Adoucit ou souligne (plutôt féminin, ou Kansai).'],
  'な': ['Particule finale', 'Réflexion pour soi (« hein… »), ou interdiction après un verbe.'],
  'さ': ['Particule finale', 'Insiste, familier.'],
  'ぞ': ['Particule finale', 'Affirmation forte, familière.'],
};
const CONNECTORS = {
  'そして': '« Et, ensuite » : relie deux phrases.', 'それから': '« Et puis, ensuite ».', 'でも': '« Mais » (début de phrase, familier).',
  'しかし': '« Cependant » (écrit, soutenu).', 'だから': '« C’est pourquoi, donc ».', 'ですから': '« C’est pourquoi » (poli).',
  'それで': '« Du coup, alors ».', 'それに': '« De plus, en plus ».', 'また': '« Aussi, de nouveau ».', 'さらに': '« En outre ».',
  'つまり': '« Autrement dit, bref ».', 'ところで': '« Au fait » (change de sujet).', 'すると': '« Alors, sur ce ».',
  'ただし': '« Toutefois » (restriction).', 'なぜなら': '« Parce que » (début de phrase).', 'たとえば': '« Par exemple ».',
  'では': '« Bon, alors ».', 'じゃあ': '« Bon, alors » (familier).', 'けれども': '« Cependant ».', 'それでも': '« Malgré tout ».',
  'ところが': '« Or, pourtant » (contre toute attente).', 'あるいは': '« Ou bien ».', 'または': '« Ou bien ».', 'もし': '« Si (jamais) ».',
};
const AUX = {
  'です': 'Copule polie : « c’est, être ».', 'でした': 'Copule polie au passé : « c’était ».', 'でしょう': '« Sans doute, n’est-ce pas » (poli).',
  'だ': 'Copule neutre : « c’est ».', 'だった': 'Copule neutre au passé : « c’était ».', 'だろう': '« Sans doute » (neutre).',
  'じゃない': 'Négation de « être » (familier).', 'ではない': 'Négation de « être ».', 'ではありません': 'Négation polie de « être ».',
  'じゃありません': 'Négation polie de « être ».', 'ください': '« S’il vous plaît » (après la forme en て).', 'ましょう': '« Faisons… » (invitation polie).',
};

// --- Déconjugaison : terminaison → (terminaison au dictionnaire, nom de la forme) ---------------
const GODAN = { う: ['わ', 'い', 'う', 'え', 'お', 'っ'], く: ['か', 'き', 'く', 'け', 'こ', 'い'], ぐ: ['が', 'ぎ', 'ぐ', 'げ', 'ご', 'い'],
  す: ['さ', 'し', 'す', 'せ', 'そ', 'し'], つ: ['た', 'ち', 'つ', 'て', 'と', 'っ'], ぬ: ['な', 'に', 'ぬ', 'ね', 'の', 'ん'],
  ぶ: ['ば', 'び', 'ぶ', 'べ', 'ぼ', 'ん'], む: ['ま', 'み', 'む', 'め', 'も', 'ん'], る: ['ら', 'り', 'る', 'れ', 'ろ', 'っ'] };
const MASU = [['ます', 'forme polie'], ['ました', 'forme polie au passé'], ['ません', 'forme polie négative'], ['ませんでした', 'forme polie négative passée'],
  ['ましょう', 'invitation polie (« faisons »)'], ['たい', 'envie (« vouloir »)'], ['たかった', 'envie au passé'], ['たくない', 'envie négative'], ['ながら', '« tout en »'], ['なさい', 'ordre doux']];
const TE = [['て', 'forme en て (liaison)'], ['た', 'passé neutre'], ['ている', 'action en cours / état'], ['ていた', 'action en cours au passé'],
  ['ています', 'action en cours / état (poli)'], ['ていました', 'action en cours au passé (poli)'], ['てください', 'demande polie'], ['ても', '« même si »'],
  ['たら', 'condition « si / quand »'], ['たり', 'énumération d’actions'], ['てしまう', 'action achevée / regret'], ['てしまった', 'action achevée / regret'], ['ちゃった', 'action achevée (familier)'], ['てる', 'action en cours (familier)']];
const NAI = [['ない', 'négatif neutre'], ['なかった', 'négatif passé'], ['なくて', 'négatif en liaison'], ['なければ', '« si on ne… pas »'], ['ないで', '« sans » / « ne… pas, s’il te plaît »']];
const ADJ = [['かった', 'adjectif au passé'], ['くない', 'adjectif négatif'], ['くなかった', 'adjectif négatif passé'], ['くて', 'adjectif en liaison'], ['く', 'forme adverbiale (-ment)'], ['ければ', 'condition « si »'], ['さ', 'nom de qualité (-eur, -esse)'], ['そう', '« avoir l’air »']];

/** Formes possibles au dictionnaire pour un morceau de texte : [{ base, form }] */
function deinflect(s) {
  const out = [];
  const add = (base, form) => out.push({ base, form });
  // Irréguliers
  const IRR = { する: ['し', 'さ', 'す', 'すれ', 'しよ'], 来る: ['来', 'こ'], くる: ['き', 'こ'] };
  for (const [x, f] of [...MASU, ...TE, ...NAI]) {
    if (s.endsWith('し' + x)) add(s.slice(0, -(1 + x.length)) + 'する', f);
    if (s.endsWith('き' + x) || s.endsWith('こ' + x)) add(s.slice(0, -(1 + x.length)) + 'くる', f);
    if (s.endsWith('来' + x)) add(s.slice(0, -(1 + x.length)) + '来る', f);
  }
  // Ichidan (食べる, 見る) : radical + terminaison
  for (const [e, f] of [...MASU, ...TE, ...NAI, ['られる', 'passif / potentiel'], ['させる', 'causatif'], ['よう', 'volitif (« allons »)'], ['れば', 'condition « si »'], ['ろ', 'impératif']])
    if (s.endsWith(e) && s.length > e.length) add(s.slice(0, -e.length) + 'る', f);
  // Godan
  for (const [end, row] of Object.entries(GODAN)) {
    const [a, i, , e, o, onbin] = row;
    for (const [x, f] of MASU) if (s.endsWith(i + x)) add(s.slice(0, -(i + x).length) + end, f);
    for (const [x, f] of NAI) if (s.endsWith(a + x)) add(s.slice(0, -(a + x).length) + end, f);
    if (s.endsWith(e + 'ば')) add(s.slice(0, -2) + end, 'condition « si »');
    if (s.endsWith(e + 'る')) add(s.slice(0, -2) + end, 'potentiel (« pouvoir »)');
    if (s.endsWith(o + 'う')) add(s.slice(0, -2) + end, 'volitif (« allons »)');
    if (s.endsWith(a + 'れる')) add(s.slice(0, -3) + end, 'passif');
    for (const [x, f] of TE) {
      const voiced = ['ぐ', 'ぬ', 'ぶ', 'む'].includes(end);
      const t = voiced ? x.replace(/^て/, 'で').replace(/^た/, 'だ') : x;
      const stem = end === 'す' ? 'し' : end === 'く' && x[0] ? 'い' : onbin;
      if (s.endsWith(stem + t)) add(s.slice(0, -(stem + t).length) + end, f);
    }
  }
  // Adjectifs en い
  for (const [x, f] of ADJ) if (s.endsWith(x) && s.length > x.length) add(s.slice(0, -x.length) + 'い', f);
  // Radical seul (forme en ます sans ます) : 見(に行く), 食べ(すぎる), 書き(ながら)
  if (/[㐀-鿿々][ぁ-ゖ]?$/.test(s)) {
    add(s + 'る', 'radical du verbe (forme en ます sans ます)');
    for (const [end, row] of Object.entries(GODAN)) if (s.endsWith(row[1])) add(s.slice(0, -1) + end, 'radical du verbe (forme en ます sans ます)');
  }
  if (s === 'いって' || s === 'いった') add('いく', s.endsWith('て') ? 'forme en て (liaison)' : 'passé neutre');
  if (/^行っ[てた]/.test(s)) add('行く', s[2] === 'て' ? 'forme en て (liaison)' : 'passé neutre');
  void IRR;
  return out;
}

// --- Dictionnaire ----------------------------------------------------------------------
let dictP = null;
function buildDict() {
  dictP = dictP || (async () => {
    const [grammar, ...levels] = await Promise.all([D.grammar(), ...D.LEVELS.map(l => D.vocab(l).catch(() => []))]);
    const vocab = new Map();
    const put = (k, v) => { if (k && !vocab.has(k)) vocab.set(k, v); };
    // Du plus facile au plus difficile : le sens le plus courant d'abord
    levels.flat().forEach(v => {
      const w = v.w.replace(/[〜～]/g, '');
      put(w, v);
      const r = v.f ? v.f.replace(/[^（]*（([^）]*)）/g, '$1') : null;   // lecture complète en kana
      if (r && /^[ぁ-ゖー]+$/.test(r) && r.length >= 2) put(`kana:${r}`, v);
      if (/^[ぁ-ゖー]+$/.test(w)) put(`kana:${w}`, v);
    });
    // Lectures ambiguës en kana : le sens le plus courant
    for (const [k, w] of [['いる', '居る'], ['ある', '有る'], ['いく', '行く'], ['くる', '来る'], ['みる', '見る'], ['いう', '言う']]) {
      const v = levels.flat().find(x => x.w === w);
      if (v) vocab.set(`kana:${k}`, v);
    }
    const gram = new Map();
    grammar.forEach(g => {
      // « Verbe + たことがある », « Adjectifs en -い + くない » : on garde les morceaux en japonais
      String(g.t).replace(/[①-⑳]/g, '').split(/[・／/]|[^ぁ-ゖァ-ヺー㐀-鿿々〜～]+/).forEach(f => {
        const k = f.replace(/[〜～\s]/g, '');
        if (k.length >= 2 && /^[ぁ-ゖァ-ヺー㐀-鿿々]+$/.test(k) && !gram.has(k)) gram.set(k, g);
      });
    });
    return { vocab, gram };
  })();
  return dictP;
}

const hasKanji = s => /[㐀-鿿々]/.test(s);
const MAXLEN = 10;
const lookup = (dict, w) => dict.vocab.get(w) || (!hasKanji(w) && dict.vocab.get(`kana:${w}`)) || null;
const isVerbBase = w => /[うくぐすつぬぶむる]$/.test(w);

/** Toutes les lectures possibles d'un morceau : [{ score, info }] */
function candidates(s, dict, atStart) {
  const out = [];
  const len = s.length;
  const v = lookup(dict, s);
  if (v && (hasKanji(s) || len >= 2 || ['木', '目'].includes(s))) out.push({ score: len * len + (hasKanji(s) ? 0.6 : 0.3), info: { kind: isVerbBase(v.w) && hasKanji(v.w) && v.w === s ? 'verb' : 'vocab', v } });
  if (len >= 1) {
    // Une ou deux étapes de déconjugaison (褒められました → 褒められる → 褒める)
    const seen = new Set();
    for (const d of deinflect(s)) {
      for (const step of [d, ...deinflect(d.base).map(e => ({ base: e.base, form: `${e.form}, ${d.form}` }))]) {
        if (seen.has(step.base)) continue;
        seen.add(step.base);
        const base = lookup(dict, step.base);
        if (base) out.push({ score: len * len + (hasKanji(s) ? 0.5 : -0.4) - (/radical/.test(step.form) ? 2 : 0), info: { kind: /い$/.test(step.base) && !/[うくぐすつぬぶむる]$/.test(step.base) ? 'adj' : 'verb', v: base, form: step.form } });
      }
    }
  }
  if (CONNECTORS[s] && atStart) out.push({ score: len * len + 0.8, info: { kind: 'conn', text: CONNECTORS[s] } });
  if (AUX[s]) out.push({ score: len * len + 0.4, info: { kind: 'aux', text: AUX[s] } });
  if (PARTICLES[s]) out.push({ score: len * len + 0.5, info: { kind: 'part', label: PARTICLES[s][0], text: PARTICLES[s][1] } });
  const g = len >= 2 && dict.gram.get(s);
  if (g) out.push({ score: len * len * 0.6 + 0.2, info: { kind: 'gram', g } });
  if (/^[ァ-ヺー]{2,}$/.test(s)) out.push({ score: len * len - 0.5, info: { kind: 'kata' } });
  return out;
}

/** Découpe un texte en morceaux { start, end, info } : le découpage qui couvre le mieux la phrase gagne */
function segment(text, dict) {
  const n = text.length;
  const best = new Array(n + 1).fill(null);
  best[n] = { score: 0 };
  for (let i = n - 1; i >= 0; i--) {
    const atStart = i === 0 || /[。、！？\s」「]/.test(text[i - 1]);
    let b = { score: best[i + 1].score - 3, len: 1, info: null };         // caractère inconnu
    if (!/[ぁ-ゖァ-ヺー㐀-鿿々〇]/.test(text[i])) b.score = best[i + 1].score;   // ponctuation : neutre
    for (let len = 1; len <= Math.min(MAXLEN, n - i); len++) {
      const s = text.slice(i, i + len);
      if (!/^[ぁ-ゖァ-ヺー㐀-鿿々〇]+$/.test(s)) break;
      for (const c of candidates(s, dict, atStart)) {
        const total = c.score + best[i + len].score;
        if (total > b.score) b = { score: total, len, info: c.info };
      }
    }
    best[i] = b;
  }
  const out = [];
  for (let i = 0; i < n;) {
    const b = best[i];
    let info = b.info;
    // ことがある juste après une forme en た : c'est le point « たことがある » (avoir déjà fait)
    if (info?.kind === 'gram' && i > 0) {
      const wider = dict.gram.get(text[i - 1] + text.slice(i, i + b.len));
      if (wider && D.LEVELS.indexOf(wider.lv) <= D.LEVELS.indexOf(info.g.lv)) info = { kind: 'gram', g: wider };
    }
    out.push({ start: i, end: i + b.len, info });
    i += b.len;
  }
  return out;
}

// --- Texte visible d'un élément, sans les furigana, avec la position de chaque caractère ---------
function textMap(el) {
  const nodes = [];
  let text = '';
  const walk = n => {
    for (const c of n.childNodes) {
      if (c.nodeType === 3) { nodes.push({ node: c, start: text.length }); text += c.data; }
      else if (c.nodeType === 1 && !['RT', 'RP', 'BUTTON', 'SVG', 'svg'].includes(c.tagName) && !c.classList.contains('reg-tag')) walk(c);
    }
  };
  walk(el);
  return { text, nodes };
}
function rangeFor(map, start, end) {
  const pos = off => {
    for (let k = map.nodes.length - 1; k >= 0; k--) if (map.nodes[k].start <= off) return [map.nodes[k].node, Math.min(off - map.nodes[k].start, map.nodes[k].node.data.length)];
    return null;
  };
  const a = pos(start), b = pos(end);
  if (!a || !b) return null;
  // la fin d'un morceau peut tomber au tout début du nœud suivant : on la recule dans le nœud précédent
  const r = document.createRange();
  r.setStart(...a);
  const endNode = map.nodes.findLast(n => n.start < end) || map.nodes[0];
  r.setEnd(endNode.node, Math.min(end - endNode.start, endNode.node.data.length));
  return r;
}

// --- Bulle ---------------------------------------------------------------------------------
const KIND = { kata: 'Katakana', part: 'Particule', vocab: 'Vocabulaire', verb: 'Verbe', adj: 'Adjectif', conn: 'Connecteur', aux: 'Auxiliaire', gram: 'Forme grammaticale' };
function bubbleBody(seg, text) {
  const info = seg.info, surface = text.slice(seg.start, seg.end);
  if (info.kind === 'part' || info.kind === 'conn' || info.kind === 'aux') {
    return [h('div.gl-head', h('span.gl-jp', { lang: 'ja' }, surface), h('span.gl-tag', info.label || KIND[info.kind])), h('p.gl-text', info.text)];
  }
  if (info.kind === 'kata') {
    return [h('div.gl-head', h('span.gl-jp', { lang: 'ja' }, surface), h('span.gl-tag', 'Katakana')), h('p.gl-text', 'Mot d’origine étrangère (ou nom propre) : il se lit tel qu’il s’écrit en katakana.')];
  }
  if (info.kind === 'gram') {
    return [h('div.gl-head', h('span.gl-jp', { lang: 'ja', html: ruby(D.gramLabel(info.g), true) }), h('span.gl-tag', `${KIND.gram} · ${D.LEVEL_NAMES[info.g.lv]}`)), h('p.gl-text', info.g.s)];
  }
  const v = info.v;
  return [
    h('div.gl-head', h('span.gl-jp', { lang: 'ja' }, surface), h('span.gl-tag', `${KIND[info.kind]} · ${v.lv}`)),
    info.form ? h('p.gl-base', h('span', 'Forme du dictionnaire : '), h('b', { lang: 'ja', html: ruby(v.f || v.w, true) }), h('em', ` — ${info.form}`))
      : h('p.gl-base', h('b', { lang: 'ja', html: ruby(v.f || v.w, true) })),
    h('p.gl-text', D.shortMeaning(v.m))];
}

const SELECTOR = 'p.jp, .type-sentence, .theme-answer .jp, .vx .jp, .dash-last, .narabe-answer, .gloss';
let bubble = null, current = null, hl = null;
const cache = new WeakMap();
const enabled = () => S.getSettings().gloss !== false;

function hide() {
  bubble?.classList.remove('on');
  current = null;
  if (hl && window.CSS?.highlights) CSS.highlights.delete('gloss');
  hl = null;
}

async function showAt(el, x, y) {
  const dict = await buildDict();
  const map = textMap(el);
  let entry = cache.get(el);
  if (!entry || entry.text !== map.text) { entry = { text: map.text, segs: segment(map.text, dict) }; cache.set(el, entry); }
  // Caractère sous le pointeur
  const cp = document.caretPositionFromPoint?.(x, y);
  const cr = cp ? { node: cp.offsetNode, off: cp.offset } : (() => { const r = document.caretRangeFromPoint?.(x, y); return r ? { node: r.startContainer, off: r.startOffset } : null; })();
  if (!cr || cr.node.nodeType !== 3) return hide();
  const n = map.nodes.find(m => m.node === cr.node);
  if (!n) return hide();
  // On vérifie que le pointeur est bien sur le caractère (pas dans la marge)
  let off = n.start + cr.off;
  const test = document.createRange();
  for (const o of [cr.off, cr.off - 1]) {
    if (o < 0 || o >= cr.node.data.length) continue;
    test.setStart(cr.node, o); test.setEnd(cr.node, o + 1);
    const b = test.getBoundingClientRect();
    if (x >= b.left - 1 && x <= b.right + 1 && y >= b.top - 2 && y <= b.bottom + 2) { off = n.start + o; break; }
    if (o === cr.off - 1) return hide();
  }
  const seg = entry.segs.find(s => off >= s.start && off < s.end);
  if (!seg?.info) return hide();
  const key = `${seg.start}:${seg.end}`;
  if (current?.el === el && current.key === key) return;
  current = { el, key };
  if (!bubble) { bubble = h('div.gloss-bubble', { role: 'tooltip' }); document.body.append(bubble); }
  bubble.replaceChildren(...bubbleBody(seg, entry.text));
  const range = rangeFor(map, seg.start, seg.end);
  if (range && window.CSS?.highlights && window.Highlight) { hl = new Highlight(range); CSS.highlights.set('gloss', hl); }
  const rect = (range || el).getBoundingClientRect();
  bubble.classList.add('on');
  const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
  let left = Math.min(Math.max(8, rect.left + rect.width / 2 - bw / 2), innerWidth - bw - 8);
  let top = rect.top - bh - 12;
  bubble.classList.toggle('below', top < 8);
  if (top < 8) top = rect.bottom + 12;
  bubble.style.left = `${left + scrollX}px`;
  bubble.style.top = `${top + scrollY}px`;
  bubble.style.setProperty('--arrow', `${Math.min(bw - 16, Math.max(16, rect.left + rect.width / 2 - left))}px`);
}

let raf = 0, last = null;
export function initGloss() {
  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    last = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!enabled()) return hide();
      const el = last.target.closest?.(SELECTOR);
      if (!el || el.closest('.answer-bar, textarea, input, button:not(.gloss)')) return hide();
      showAt(el, last.clientX, last.clientY).catch(hide);
    });
  }, { passive: true });
  // Sur écran tactile : on touche un mot pour voir sa bulle, on touche ailleurs pour la fermer
  document.addEventListener('click', e => {
    if (!enabled() || matchMedia('(hover: hover)').matches) return;
    const el = e.target.closest?.(SELECTOR);
    if (!el || e.target.closest('button, a, input')) return hide();
    showAt(el, e.clientX, e.clientY).catch(hide);
  });
  addEventListener('scroll', hide, { passive: true });
  addEventListener('hashchange', hide);
  document.addEventListener('pointerleave', hide);
}

/** Pour les tests et le débogage : découpage d'un texte */
export async function explain(text) {
  const dict = await buildDict();
  return segment(text, dict).map(s => ({ t: text.slice(s.start, s.end), k: s.info?.kind || null, base: s.info?.v?.w || s.info?.g?.t || null, form: s.info?.form || null }));
}
