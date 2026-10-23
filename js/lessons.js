// Leçons guidées : grammaire seule, vocabulaire seul, ou les deux mélangés.
// Une leçon se parcourt carte par carte (voix, accent, exemples), puis se termine par
// un quiz, l'ajout aux révisions et un exercice de thème.
import { h, ruby, kana, toast, store, shuffle, jr } from './util.js?v=20261024004140';
import * as D from './data.js?v=20261024004140';
import * as S from './srs.js?v=20261024004140';
import { runSession, practiceItems, vocabPractice, typedCloze, typedVocab, wordAudio, gramAudio, sentenceHTML, sentenceText, vocabExamplesEl, sentenceLine } from './review.js?v=20261024004140';
import { speakBtn, speak } from './voice.js?v=20261024004140';
import { itemScore, isMastered, LESSON_CREDIT } from './level.js?v=20261024004140';
import { play } from './sfx.js?v=20261024004140';
import { strokeOrder } from './strokes.js?v=20261024004140';
import { celebrate, verdict } from './celebrate.js?v=20261024004140';

const KINDS = {
  g: { label: 'Grammaire', jp: '文法', desc: 'Les points de grammaire d’une leçon, avec leurs exemples.' },
  v: { label: 'Vocabulaire', jp: '単語', desc: 'Une unité de mots, avec voix et accent.' },
  b: { label: 'Les deux', jp: '両方', desc: 'Grammaire et vocabulaire mélangés : en terminant toutes les leçons, tu as vu TOUT le niveau.' },
};
// Ancien mode mixte (1 leçon de grammaire + 1 bloc de 12 mots) : gardé pour lire les leçons déjà validées
const LEGACY_MIX = 'm';
const MIX_WORDS = 15;      // mots visés par leçon « Les deux »
const MODE_KEY = 'sakura.lessonMode.v1';
const DONE_KEY = 'lessonsDone';   // stockés avec la progression du compte (S.getExtra)

const CHUNK = 12;          // mots par leçon de vocabulaire
const COUNT_KEY = 'sakura.lessonCount.v1';
const SEEN_KEY = 'lessonsSeen';
export const COUNTS = [1, 2, 3, 5];

/** Structure d'un niveau : leçons de grammaire, et unités de vocabulaire découpées en blocs de 12 mots */
async function levelPlan(lv) {
  const [grammar, vocab] = await Promise.all([D.grammar(), D.vocab(lv)]);
  const gLessons = new Map();
  grammar.filter(g => g.lv === lv).forEach(g => { if (!gLessons.has(g.le)) gLessons.set(g.le, []); gLessons.get(g.le).push(g); });
  const units = new Map();
  vocab.forEach(v => { if (!units.has(v.unit)) units.set(v.unit, []); units.get(v.unit).push(v); });
  const v = [];
  [...units.entries()].forEach(([unit, words], ui) => {
    const parts = Math.ceil(words.length / CHUNK), size = Math.ceil(words.length / parts);
    for (let p = 0; p < parts; p++) v.push({ n: v.length + 1, unit, unitNth: ui + 1, part: p + 1, parts, items: words.slice(p * size, (p + 1) * size) });
  });
  const g = [...gLessons.entries()].map(([le, items]) => ({ n: le, items }));
  // « Les deux » : TOUT le niveau réparti en leçons régulières (≈ 15 mots + 1 à 3 points de grammaire chacune)
  const gAll = g.flatMap(x => x.items), M = Math.max(g.length, Math.ceil(vocab.length / MIX_WORDS));
  const b = Array.from({ length: M }, (_, k) => {
    const gi = gAll.slice(Math.round(k * gAll.length / M), Math.round((k + 1) * gAll.length / M));
    const vi = vocab.slice(Math.floor(k * vocab.length / M), Math.floor((k + 1) * vocab.length / M));
    return { n: k + 1, g: gi, v: vi };
  });
  let lastLe = g[0]?.n;
  b.forEach(x => { x.gN = x.g[0]?.le ?? lastLe; lastLe = x.g[x.g.length - 1]?.le ?? lastLe; x.unit = x.v[0]?.unit; });
  return { g, v, b, gIndex: new Map(g.map((x, i) => [x.n, i])) };
}

/** Numéros de leçon disponibles pour un mode (grammaire : numéros de leçon ; vocabulaire et mixte : 1…N) */
const lessonNumbers = (plan, kind) => kind === 'g' ? plan.g.map(x => x.n) : kind === 'v' ? plan.v.map(x => x.n) : kind === 'b' ? plan.b.map(x => x.n) : plan.g.map((_, i) => i + 1);

function lessonContent(plan, kind, n) {
  n = Number(n);
  if (kind === 'g') { const g = plan.g.find(x => x.n === n); return { g: g?.items || [], v: [], gN: g?.n }; }
  if (kind === 'v') { const v = plan.v[n - 1]; return { g: [], v: v?.items || [], vChunk: v }; }
  if (kind === 'b') { const b = plan.b[n - 1]; return { g: b?.g || [], v: b?.v || [], gN: b?.gN }; }
  const g = plan.g[n - 1], v = plan.v[n - 1];
  return { g: g?.items || [], v: v?.items || [], gN: g?.n, vChunk: v };
}

// Titres des leçons de keigo (grammaire)
const KEIGO_LE = { 1: 'Les bases', 2: 'Respect · verbes spéciaux', 3: 'Respect · verbes spéciaux (2)', 4: 'Respect · formes régulières', 5: 'Demander poliment',
  6: 'Humilité · verbes spéciaux', 7: 'Humilité · formes régulières', 8: 'Humilité II (丁重語)', 9: 'Au bureau', 10: 'Les pièges', 11: 'Nuances du guide officiel' };
const KEIGO_UNIT = { 1: 'Verbes de respect', 2: 'Verbes d’humilité', 3: 'Humilité II et sociétés', 4: 'Formules de bureau', 5: 'Mots de politesse' };
function lessonTitle(plan, kind, n) {
  const keigo = plan.g[0]?.items[0]?.lv === 'keigo';
  if (kind === 'v') { const c = plan.v[Number(n) - 1]; return c ? `${keigo ? KEIGO_UNIT[c.unit] || `Unité ${c.unitNth}` : `Unité ${c.unitNth}`}${c.parts > 1 ? ` · ${c.part}/${c.parts}` : ''}` : `Leçon ${n}`; }
  if (keigo && kind === 'g' && KEIGO_LE[n]) return `Leçon ${n} · ${KEIGO_LE[n]}`;
  if (keigo && kind === 'b') { const le = plan.b?.[Number(n) - 1]?.gN; if (KEIGO_LE[le]) return `Leçon ${n} · ${KEIGO_LE[le]}`; }
  return `Leçon ${n}`;
}

let covered = null;   // clés couvertes par des leçons validées (rempli au chargement du hub)
const progressOf = items => {
  if (!items.length) return 0;
  const cards = S.allCards(), now = Date.now();
  const gm = S.practiceStats();
  return items.reduce((a, it) => { const k = it.w !== undefined ? D.vocabKey(it) : `g:${it.id}`; return a + Math.max(itemScore(cards[k], gm[k], now), covered?.has(k) ? LESSON_CREDIT : 0); }, 0) / items.length;
};
/** Éléments (grammaire et vocabulaire) couverts par des leçons validées : Set de clés de cartes */
export async function lessonCoveredKeys() {
  const done = Object.keys(S.getExtra(DONE_KEY, {}) || {});
  const out = new Set();
  const plans = {};
  for (const key of done) {
    const [lv, kind, n] = key.split(':');
    if (!D.LESSON_LEVELS.includes(lv)) continue;
    plans[lv] = plans[lv] || await levelPlan(lv);
    const c = lessonContent(plans[lv], kind, Number(n));
    c.g.forEach(g => out.add(`g:${g.id}`));
    c.v.forEach(v => out.add(D.vocabKey(v)));
  }
  return out;
}
const masteryOfItems = items => {
  if (!items.length) return 0;
  const cards = S.allCards();
  return items.filter(it => isMastered(cards[it.w !== undefined ? D.vocabKey(it) : `g:${it.id}`])).length / items.length;
};
const isDone = (lv, kind, n, c = null) => !!S.getExtra(DONE_KEY, {})[`${lv}:${kind}:${n}`]
  || (!!c && coveredShare(c) >= 1);
/** Part des éléments d'une leçon déjà validés ailleurs (ex. : une leçon « Les deux » couvre une partie d'une leçon de grammaire) */
const keyOf = it => it.w !== undefined ? D.vocabKey(it) : `g:${it.id}`;
const coveredShare = c => {
  const items = [...c.g, ...c.v];
  if (!items.length || !covered) return 0;
  return items.filter(it => covered.has(keyOf(it))).length / items.length;
};
const isSeen = (lv, kind, n) => !!S.getExtra(SEEN_KEY, {})[`${lv}:${kind}:${n}`];
const mark = (key, lv, kind, ns) => { const m = { ...S.getExtra(key, {}) }; ns.forEach(n => { m[`${lv}:${kind}:${n}`] = Date.now(); }); S.setExtra(key, m); };

// ふ Bouton furigana des leçons : affiche / masque les lectures au-dessus des kanji (réglage lié au compte)
function furiToggle(root) {
  const btn = h('button.furi-toggle', { type: 'button' });
  const paint = () => {
    const off = !!S.getSettings().lessonFuriOff;
    btn.setAttribute('aria-pressed', String(!off));
    btn.classList.toggle('on', !off);
    btn.title = off ? 'Afficher les furigana (lectures en kana au-dessus des kanji)' : 'Masquer les furigana pour t’entraîner à lire les kanji';
    btn.innerHTML = `<ruby lang="ja">振<rt>ふ</rt></ruby><span>Furigana</span><b>${off ? 'OFF' : 'ON'}</b>`;
    root.el?.classList.toggle('furi-off', off);
  };
  btn.addEventListener('click', () => { S.setSettings({ lessonFuriOff: !S.getSettings().lessonFuriOff }); paint(); });
  paint();
  return btn;
}

// --- Hub -------------------------------------------------------------------------------
const tabsFor = lv => h('div.tabs', { role: 'tablist', 'aria-label': 'Niveau' },
  ...D.LESSON_LEVELS.map(l => h('a', { href: `#/lecons/${l}`, role: 'tab', 'aria-selected': String(l === lv), class: l === lv ? 'tab active' : 'tab' + (l === 'keigo' ? ' tab-keigo' : '') }, l === 'keigo' ? h('span', { lang: 'ja', html: jr('敬語') }) : l)),
  h('a', { href: '#/lecons/nombres', role: 'tab', 'aria-selected': String(lv === 'nombres'), class: lv === 'nombres' ? 'tab active' : 'tab tab-keigo' }, h('span', { lang: 'ja', html: jr('数') }), ' Nombres'));
const lessonsHead = () => h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('授業') }), 'Leçons'),
  h('p.section-note', 'Apprends pas à pas : grammaire, vocabulaire, ou les deux en même temps. Chaque leçon se termine par des exercices sur tout ce que tu as vu.'));

export async function lessonsHub(main, lv = 'N5') {
  if (lv === 'nombres') {
    const { numbersHub } = await import('./numbers.js?v=20261024004140');
    main.replaceChildren(lessonsHead(), tabsFor('nombres'), numbersHub());
    return;
  }
  lv = D.LESSON_LEVELS.includes(lv) ? lv : 'N5';
  let mode = S.getSettings().lessonMode || store.get(MODE_KEY, 'b');
  if (!KINDS[mode]) mode = 'b';
  let count = S.getSettings().lessonCount ?? store.get(COUNT_KEY, 1); if (!COUNTS.includes(count)) count = 1;
  const plan = await levelPlan(lv);
  covered = await lessonCoveredKeys().catch(() => new Set());
  const grid = h('ul.lesson-grid');
  const seg = h('div.segmented', { role: 'tablist', 'aria-label': 'Type de leçon' });
  const countSeg = h('div.segmented.small', { role: 'radiogroup', 'aria-label': 'Nombre de leçons par session' });
  const desc = h('p.section-note.seg-desc');

  const render = (animate = false) => {
    seg.replaceChildren(...Object.entries(KINDS).map(([k, m]) => h('button', {
      type: 'button', role: 'tab', 'aria-selected': String(k === mode), class: k === mode ? 'active' : null,
      onclick: () => { if (k === mode) return; mode = k; store.set(MODE_KEY, k); S.setSettings({ lessonMode: k }); render(true); },
    }, h('span.seg-jp', { lang: 'ja', html: jr(m.jp) }), m.label)));
    countSeg.replaceChildren(h('span.seg-label', 'Par session'), ...COUNTS.map(c => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(c === count), class: c === count ? 'active' : null,
      onclick: () => { if (c === count) return; count = c; store.set(COUNT_KEY, c); S.setSettings({ lessonCount: c }); render(true); },
    }, c === 1 ? '1 leçon' : `${c} leçons`)));
    desc.textContent = `${KINDS[mode].desc}${mode === 'b' ? ` ${plan.b.length} leçons pour ${plan.b.reduce((a, x) => a + x.g.length, 0)} points de grammaire et ${plan.b.reduce((a, x) => a + x.v.length, 0)} mots.` : ''}${count > 1 ? ` Tu enchaînes ${count} leçons d'affilée, avec un seul quiz à la fin.` : ''} Une leçon est validée quand tu as réussi tous ses exercices.`;
    const nums = lessonNumbers(plan, mode);
    grid.replaceChildren(...nums.map((n, i) => {
      const c = lessonContent(plan, mode, n);
      const p = progressOf([...c.g, ...c.v]);
      const mq = masteryOfItems([...c.g, ...c.v]);
      const done = isDone(lv, mode, n, c), seen = !done && isSeen(lv, mode, n);
      const st = (S.getExtra('lessonState', {}) || {})[`${lv}:${mode}:${n}:${count}`];
      const inProgress = st && !st.cleared ? (st.phase === 'quiz' ? `En cours · exercices ${st.ok?.length || 0}/${st.plan?.length || 0}` : `En cours · étape ${(st.i || 0) + 1}/${st.n || '?'}`) : null;
      // Jauge = avancement DANS la leçon : validée → pleine ; en cours → étapes vues (60 %) puis exercices réussis (40 %)
      const lp = done ? 1 : st && !st.cleared
        ? (st.phase === 'quiz' ? 0.6 + 0.4 * ((st.ok?.length || 0) / Math.max(1, st.plan?.length || 1)) : 0.6 * (((st.i || 0) + 1) / Math.max(1, st.n || 1)))
        : seen ? 0.6 : 0;
      const share = done ? 1 : coveredShare(c);
      const lp2 = Math.max(lp, share);
      void p;
      const sub = [c.g.length ? `${c.g.length} point${c.g.length > 1 ? 's' : ''}` : null, c.v.length ? `${c.v.length} mots` : null].filter(Boolean).join(' · ');
      const preview = [...c.g.slice(0, 3).map(g => ruby(D.gramLabel(g), true)), ...c.v.slice(0, mode === 'b' ? 2 : 4).map(v => ruby(v.f || v.w, true))].join(' ・ ');
      const last = nums[Math.min(nums.length - 1, i + count - 1)];
      return h('li', { style: { '--i': i } }, h('a.lesson-card', { href: `#/lecon/${lv}/${mode}/${n}${count > 1 ? `?x=${count}` : ''}`, class: `lesson-card${done ? ' done' : ''}${seen ? ' seen' : ''}${inProgress ? ' ongoing' : ''}` },
        h('span.lc-num', String(i + 1).padStart(2, '0')),
        h('span.lc-body', h('strong', lessonTitle(plan, mode, n)), h('span.lc-sub', sub), h('span.lc-preview', { lang: 'ja', html: preview }),
          inProgress ? h('span.lc-ongoing', inProgress) : null,
          count > 1 && last !== n ? h('span.lc-chain', `→ jusqu'à : ${lessonTitle(plan, mode, last)}`) : null),
        h('span.lc-foot',
        h('span.lc-gauge', { class: `lc-gauge${done ? ' full' : ''}`, title: `${Math.round(lp2 * 100)} % de la leçon${done ? ' (validée)' : share > lp ? ' (déjà vu dans d’autres leçons)' : ''} · ${Math.round(mq * 100)} % de maîtrise` },
          h('span', { style: { width: `${Math.round(lp2 * 100)}%` } }), mq > 0 ? h('i.gauge-glow', { style: { width: `${Math.max(2, Math.round(mq * 100))}%` } }) : null),
          h('span.lc-pct', done ? '100 %' : `${Math.round(lp2 * 100)} %`)),
        done ? h('span.lc-done', { 'aria-label': 'Leçon validée', html: jr('済') }) : seen ? h('span.lc-todo', 'Quiz à faire') : null));
    }));
    if (animate) { grid.classList.remove('regrid'); void grid.offsetWidth; grid.classList.add('regrid'); }
  };
  render();
  const banner = lv === 'keigo' ? (await import('./keigo.js?v=20261024004140')).keigoBanner() : null;
  main.replaceChildren(lessonsHead(), tabsFor(lv), ...(banner ? [banner] : []),
    h('div.lesson-controls', seg, countSeg), desc, grid);
}

// --- Leçon ------------------------------------------------------------------------------
export async function lessonPage(main, lv, kind, n, { refreshBadge, params } = {}) {
  if (kind === LEGACY_MIX) { location.hash = `#/lecons/${lv}`; return; }
  if (!KINDS[kind]) { location.hash = '#/lecons'; return; }
  const plan = await levelPlan(lv);
  // Lien depuis une unité de vocabulaire : on démarre à son premier bloc
  if (kind === 'v' && params?.get('unit')) n = plan.v.find(x => x.unit === Number(params.get('unit')))?.n || n;
  const nums = lessonNumbers(plan, kind);
  const start = nums.indexOf(Number(n));
  if (start < 0) { location.hash = `#/lecons/${lv}`; return; }
  const count = Math.max(1, Math.min(5, Number(params?.get('x')) || 1));
  const covered = nums.slice(start, start + count);
  const parts = covered.map(x => lessonContent(plan, kind, x));
  const c = { g: parts.flatMap(p => p.g), v: parts.flatMap(p => p.v), gN: parts.find(p => p.gN)?.gN };
  if (!c.g.length && !c.v.length) { location.hash = `#/lecons/${lv}`; return; }
  const furi = S.getSettings().furigana === 'always' || (S.getSettings().furigana === 'auto' && (lv === 'N5' || lv === 'N4' || lv === 'keigo'));
  // Phrases rangées de la plus abordable à la plus difficile pour le niveau de la leçon
  const sentsByG = new Map(await Promise.all(c.g.map(async g => [g.id, await D.easiest(await D.sentencesFor(g.id), lv)])));

  // Étapes : en mode mixte, un point de grammaire puis quelques mots, en alternance
  const steps = [];
  if (kind === 'b') {
    const per = Math.max(1, Math.ceil(c.v.length / Math.max(1, c.g.length)));
    let vi = 0;
    c.g.forEach(g => { steps.push({ g }); c.v.slice(vi, vi + per).forEach(v => steps.push({ v })); vi += per; });
    c.v.slice(vi).forEach(v => steps.push({ v }));
  } else {
    c.g.forEach(g => steps.push({ g }));
    c.v.forEach(v => steps.push({ v }));
  }
  const title = covered.length > 1 ? `${lessonTitle(plan, kind, covered[0])} → ${lessonTitle(plan, kind, covered[covered.length - 1])}` : lessonTitle(plan, kind, covered[0]);
  const nextN = nums[start + covered.length];
  const nextHref = nextN != null ? `#/lecon/${lv}/${kind}/${nextN}${count > 1 ? `?x=${count}` : ''}` : null;
  // État sauvegardé (lié au compte) : on reprend là où on s'était arrêté
  const STATE_KEY = `${lv}:${kind}:${covered[0]}:${count}`;
  let saved = (S.getExtra('lessonState', {}) || {})[STATE_KEY] || null;
  if (saved?.cleared) saved = null;   // leçon terminée (marque gardée pour la synchro entre appareils)
  const saveState = st => {
    const all = { ...(S.getExtra('lessonState', {}) || {}) };
    all[STATE_KEY] = st ? { ...st, n: steps.length, t: Date.now() } : { cleared: true, t: Date.now() };
    S.setExtra('lessonState', all);
  };
  let i = saved?.phase === 'browse' ? Math.min(saved.i || 0, steps.length - 1) : 0, dir = 1, keyHandler = null;
  const bar = h('div.progress', h('span'));
  const counter = h('span.session-count');
  const stage = h('div.stage.lesson-stage');
  const dots = h('div.lesson-dots', { 'aria-hidden': 'true' });
  const phase = h('span.lesson-phase', 'Découverte');

  function stepCard(st) {
    if (st.g) {
      const g = st.g, ex = (sentsByG.get(g.id) || []).slice(0, 3);
      return h('article.card.lesson-step.is-g',
        h('p.kicker', `Grammaire · ${D.LEVEL_NAMES[g.lv]}`),
        h('h2.point-big', { lang: 'ja', html: ruby(D.gramLabel(g), true) }),
        gramAudio(g),
        h('p.point-sense', g.s),
        g.x ? h('p.point-x', { html: jr(g.x) }) : null,
        ex.length ? h('ol.example-list', ex.map(s => h('li',
          sentenceLine(s, { furi }),
          h('p.fr', s.fr)))) : h('p.section-note', 'Pas encore d’exemple pour ce point.'),
        h('a.small.lesson-more', { href: `#/point/${g.id}` }, 'Ouvrir la fiche du point'));
    }
    const v = st.v;
    return h('article.card.lesson-step.is-v',
      h('p.kicker', `Vocabulaire · ${v.lv}`),
      h('p.word.lesson-word', { lang: 'ja', html: ruby(v.f || v.w, true) }),
      wordAudio(v),
      h('p.point-sense', v.m),
      strokeOrder(v.w),
      vocabExamplesEl(v, { max: 2 }));
  }

  function show() {
    const st = steps[i];
    bar.firstChild.style.width = `${((i + 1) / steps.length) * 100}%`;
    counter.textContent = `${i + 1} / ${steps.length}`;
    dots.replaceChildren(...steps.map((s, k) => h('i', { class: `${s.g ? 'g' : 'v'}${k === i ? ' on' : k < i ? ' seen' : ''}` })));
    const card = stepCard(st);
    card.classList.add(dir > 0 ? 'from-right' : 'from-left');
    const prev = h('button.btn', { disabled: i === 0, onclick: () => go(-1) }, 'Précédent');
    const next = h('button.btn.primary', { onclick: () => go(1) }, i === steps.length - 1 ? 'Passer aux exercices' : 'Suivant', h('kbd.key-hint', { 'aria-hidden': 'true' }, 'Espace'));
    stage.replaceChildren(card, h('div.actions.lesson-nav', prev, next));
    play('card');
    if (i > 0 || saved) saveState({ phase: 'browse', i });
    if (S.getSettings().autoSpeak) setTimeout(() => speak(st.v ? kana(st.v.f || st.v.w) : (st.g.r || st.g.t)), 260);
  }
  function go(d) {
    if (i + d < 0) return;
    if (i + d >= steps.length) return quiz();
    dir = d; i += d; show();
  }
  function setKeys(fn) {
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = fn; if (fn) document.addEventListener('keydown', fn);
  }
  window.addEventListener('hashchange', () => setKeys(null), { once: true });
  setKeys(e => {
    if (e.target.closest('input, textarea')) return;
    if (e.repeat && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); return; }
    // Espace (ou Entrée, ou →) : carte suivante ; ← : carte précédente
    if (e.key === 'ArrowRight' || e.key === ' ' || e.code === 'Space' || (e.key === 'Enter' && !e.target.closest('a, button'))) { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });

  // Exercices : une question par point de grammaire et par mot, à réussir jusqu'au bout
  // Exercices : QCM et réponses à écrire, mélangés. Les questions réussies sont mémorisées.
  async function quiz(resume = null) {
    setKeys(null);
    mark(SEEN_KEY, lv, kind, covered);
    const grammarAll = await D.grammar();
    const byId = new Map(grammarAll.map(g => [g.id, g]));
    const vocabAll = await D.vocab(lv);
    // Plan des questions : gardé tel quel à la reprise
    let plan = resume?.plan;
    if (!plan) {
      plan = [];
      c.g.forEach(g => {
        const sents = sentsByG.get(g.id) || [];
        const sid = sents.length ? sents[Math.floor(Math.random() * Math.min(2, sents.length))].id : null;
        plan.push({ lid: `g:${g.id}`, sid });
      });
      c.v.forEach((v, k) => plan.push({ lid: `v${k}:${v.w}` }));
      plan = shuffle(plan);
    }
    const okSet = new Set(resume?.ok || []);
    const total = plan.length;
    const state = () => ({ phase: 'quiz', i: steps.length - 1, plan, ok: [...okSet] });
    saveState(state());
    const items = [];
    for (const p of plan) {
      if (okSet.has(p.lid)) continue;
      let it;
      if (p.lid.startsWith('g:')) {
        const g = byId.get(Number(p.lid.slice(2))) || c.g.find(x => `g:${x.id}` === p.lid);
        const sent = (sentsByG.get(g.id) || []).find(x => x.id === p.sid);
        if (sent) it = typedCloze(sent, g);
        else {
          const others = grammarAll.filter(x => x.lv === g.lv && x.s !== g.s);
          it = { key: null, kind: 'meaning', g, lv: g.lv, answer: g.s, options: shuffle([g.s, ...shuffle(others).slice(0, 3).map(x => x.s)]) };
        }
      } else {
        const v = c.v.find((x, k) => `v${k}:${x.w}` === p.lid);
        if (!v) continue;
        it = await typedVocab(v);
      }
      it.lid = p.lid;
      items.push(it);
    }
    phase.textContent = 'Exercices';
    phase.classList.add('quiz');
    dots.replaceChildren(h('span.small.lesson-rule', okSet.size
      ? `Reprise : ${okSet.size} exercice${okSet.size > 1 ? 's' : ''} sur ${total} déjà réussi${okSet.size > 1 ? 's' : ''}, il en reste ${items.length}.`
      : `${total} exercices à écrire, orthographe exacte. Une réponse consultée part dans tes révisions et la question revient jusqu'à ce qu'elle soit réussie.`));
    if (!items.length) return finish(0, total);
    const ordered = resume ? items : shuffle(items);
    runSession(stage, { mode: 'practice', items: ordered, untilCorrect: true, celebrateEnd: false,
      onAnswer: (item, right) => { if (right && item.lid) { okSet.add(item.lid); saveState(state()); } },
      onDone: ({ missed }) => { wrap.classList.remove('quizzing'); finish(missed, total); } });
    wrap.classList.add('quizzing');
  }

  function finish(missedCount, total) {
    saveState(null);
    mark(DONE_KEY, lv, kind, covered);
    S.recordLesson();
    const keys = [...c.g.map(g => `g:${g.id}`), ...c.v.map(D.vocabKey)];
    const missing = keys.filter(k => !S.getCard(k));
    const first = Math.max(0, total - missedCount);   // réussis du premier coup
    const add = h('button.btn', { disabled: !missing.length, onclick: () => {
      missing.forEach(S.addCard); add.disabled = true; add.textContent = 'Dans tes révisions ✓';
      play('correct'); toast(`${missing.length} élément(s) ajouté(s) à tes révisions`); refreshBadge?.();
    } }, missing.length ? `Ajouter à mes révisions (${missing.length})` : 'Déjà dans tes révisions ✓');
    phase.textContent = 'Validée';
    phase.classList.remove('quiz');
    dots.replaceChildren();
    stage.replaceChildren(h('div.card.finish.lesson-finish',
      h('p.kicker', `${title} · ${lv}`),
      h('h2', covered.length > 1 ? `${covered.length} leçons validées` : 'Leçon validée'),
      h('p', `${total} exercice${total > 1 ? 's' : ''} réussi${total > 1 ? 's' : ''}, dont ${first} du premier coup.`),
      h('div.actions',
        nextHref ? h('a.btn.primary', { href: nextHref }, covered.length > 1 ? 'Leçons suivantes' : 'Leçon suivante') : h('a.btn.primary', { href: `#/lecons/${lv}` }, 'Toutes les leçons'),
        add,
        c.g.length && c.gN ? h('a.btn', { href: `#/jeux/theme?lv=${lv}&le=${c.gN}` }, 'Thème : écris les phrases') : null,
        h('a.btn.ghost', { href: `#/lecons/${lv}` }, 'Retour aux leçons'))));
    celebrate({ ...verdict(first / Math.max(1, total)), title: '修了！', sub: covered.length > 1 ? `${covered.length} leçons validées` : `${title} validée`, detail: `${first} / ${total} du premier coup` });
  }

  const wrapRoot = { el: null };
  const wrap = h('div.session.lesson-wrap',
    h('header.session-head.lesson-head-bar', h('a.session-quit', { href: `#/lecons/${lv}`, 'aria-label': 'Quitter la leçon' }, '×'), bar, counter),
    h('header.lesson-title', h('h1', title), h('span.lesson-kind', { lang: 'ja', html: jr(KINDS[kind].jp) }), phase, dots, furiToggle(wrapRoot)),
    stage);
  wrapRoot.el = wrap;
  wrap.classList.toggle('furi-off', !!S.getSettings().lessonFuriOff);
  main.replaceChildren(
    h('a.back', { href: `#/lecons/${lv}` }, `Leçons ${lv} · ${KINDS[kind].label}`),
    wrap);
  if (saved?.phase === 'quiz' && saved.plan) quiz(saved);
  else show();
}
