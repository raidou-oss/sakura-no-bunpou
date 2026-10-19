// Leçons guidées : grammaire seule, vocabulaire seul, ou les deux mélangés.
// Une leçon se parcourt carte par carte (voix, accent, exemples), puis se termine par
// un quiz, l'ajout aux révisions et un exercice de thème.
import { h, ruby, kana, toast, store, shuffle } from './util.js?v=20261019023757';
import * as D from './data.js?v=20261019023757';
import * as S from './srs.js?v=20261019023757';
import { runSession, practiceItems, vocabPractice, wordAudio, gramAudio, sentenceHTML, sentenceText } from './review.js?v=20261019023757';
import { speakBtn, speak } from './voice.js?v=20261019023757';
import { cardScore } from './level.js?v=20261019023757';
import { play } from './sfx.js?v=20261019023757';
import { celebrate } from './celebrate.js?v=20261019023757';

const KINDS = {
  g: { label: 'Grammaire', jp: '文法', desc: 'Les points de grammaire d’une leçon, avec leurs exemples.' },
  v: { label: 'Vocabulaire', jp: '単語', desc: 'Une unité de mots, avec voix et accent.' },
  m: { label: 'Les deux', jp: '両方', desc: 'Une leçon de grammaire et une unité de mots, mélangées.' },
};
const MODE_KEY = 'sakura.lessonMode.v1';
const DONE_KEY = 'sakura.lessonsDone.v1';

/** Structure d'un niveau : leçons de grammaire et unités de vocabulaire, appariées par rang */
async function levelPlan(lv) {
  const [grammar, vocab] = await Promise.all([D.grammar(), D.vocab(lv)]);
  const gLessons = new Map();
  grammar.filter(g => g.lv === lv).forEach(g => { if (!gLessons.has(g.le)) gLessons.set(g.le, []); gLessons.get(g.le).push(g); });
  const vUnits = new Map();
  vocab.forEach(v => { if (!vUnits.has(v.unit)) vUnits.set(v.unit, []); vUnits.get(v.unit).push(v); });
  return { g: [...gLessons.entries()].map(([le, items]) => ({ n: le, items })), v: [...vUnits.values()].map((items, i) => ({ n: i + 1, items })) };
}

function lessonContent(plan, kind, n) {
  n = Number(n);
  const g = kind !== 'v' ? (kind === 'm' ? plan.g[n - 1] : plan.g.find(x => x.n === n)) : null;
  const v = kind !== 'g' ? plan.v[n - 1] : null;
  return { g: g?.items || [], v: v?.items || [], gN: g?.n, vN: v?.n };
}

const progressOf = items => {
  if (!items.length) return 0;
  const cards = S.allCards(), now = Date.now();
  return items.reduce((a, it) => a + cardScore(cards[it.lv && it.w !== undefined ? D.vocabKey(it) : `g:${it.id}`], now), 0) / items.length;
};
const isDone = (lv, kind, n) => !!store.get(DONE_KEY, {})[`${lv}:${kind}:${n}`];

// --- Hub -------------------------------------------------------------------------------
export async function lessonsHub(main, lv = 'N5') {
  lv = D.LEVELS.includes(lv) ? lv : 'N5';
  let mode = store.get(MODE_KEY, 'm');
  const plan = await levelPlan(lv);
  const grid = h('ul.lesson-grid');
  const seg = h('div.segmented', { role: 'tablist', 'aria-label': 'Type de leçon' });

  const render = (animate = false) => {
    seg.replaceChildren(...Object.entries(KINDS).map(([k, m]) => h('button', {
      type: 'button', role: 'tab', 'aria-selected': String(k === mode), class: k === mode ? 'active' : null,
      onclick: () => { if (k === mode) return; mode = k; store.set(MODE_KEY, k); play('cursor'); render(true); },
    }, h('span.seg-jp', { lang: 'ja' }, m.jp), m.label)));
    const count = mode === 'g' ? plan.g.length : mode === 'v' ? plan.v.length : Math.max(plan.g.length, plan.v.length);
    const list = mode === 'g' ? plan.g.map(x => x.n) : Array.from({ length: count }, (_, i) => i + 1);
    grid.replaceChildren(...list.map((n, i) => {
      const c = lessonContent(plan, mode, n);
      const p = progressOf([...c.g, ...c.v]);
      const done = isDone(lv, mode, n);
      const title = mode === 'g' ? `Leçon ${n}` : mode === 'v' ? `Unité ${n}` : `Leçon ${n}`;
      const sub = [c.g.length ? `${c.g.length} point${c.g.length > 1 ? 's' : ''}` : null, c.v.length ? `${c.v.length} mots` : null].filter(Boolean).join(' · ');
      const preview = [...c.g.slice(0, 3).map(g => g.t), ...c.v.slice(0, mode === 'm' ? 2 : 4).map(v => v.w)].join(' ・ ');
      return h('li', { style: { '--i': i } }, h('a.lesson-card', { href: `#/lecon/${lv}/${mode}/${n}`, class: done ? 'lesson-card done' : 'lesson-card' },
        h('span.lc-num', String(n).padStart(2, '0')),
        h('span.lc-body', h('strong', title), h('span.lc-sub', sub), h('span.lc-preview', { lang: 'ja' }, preview)),
        h('span.lc-gauge', { title: `${Math.round(p * 100)} % maîtrisé` }, h('span', { style: { width: `${Math.round(p * 100)}%` } })),
        done ? h('span.lc-done', { 'aria-label': 'Leçon terminée' }, '済') : null));
    }));
    if (animate) { grid.classList.remove('regrid'); void grid.offsetWidth; grid.classList.add('regrid'); }
  };
  render();
  const tabs = h('div.tabs', { role: 'tablist', 'aria-label': 'Niveau' },
    D.LEVELS.map(l => h('a', { href: `#/lecons/${l}`, role: 'tab', 'aria-selected': String(l === lv), class: l === lv ? 'tab active' : 'tab' }, l)));
  main.replaceChildren(
    h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja' }, '授業'), 'Leçons'),
      h('p.section-note', 'Apprends pas à pas : grammaire, vocabulaire, ou les deux en même temps. Chaque leçon se termine par un quiz et un exercice de thème.')),
    tabs, seg, h('p.section-note.seg-desc', KINDS[mode].desc), grid);
  seg.addEventListener('click', () => { main.querySelector('.seg-desc').textContent = KINDS[mode].desc; });
}

// --- Leçon ------------------------------------------------------------------------------
export async function lessonPage(main, lv, kind, n, { refreshBadge } = {}) {
  if (!KINDS[kind]) { location.hash = '#/lecons'; return; }
  const plan = await levelPlan(lv);
  const c = lessonContent(plan, kind, n);
  if (!c.g.length && !c.v.length) { location.hash = `#/lecons/${lv}`; return; }
  const furi = S.getSettings().furigana === 'always' || (S.getSettings().furigana === 'auto' && (lv === 'N5' || lv === 'N4'));
  const sentsByG = new Map(await Promise.all(c.g.map(async g => [g.id, await D.sentencesFor(g.id)])));

  // Étapes : en mode mixte, un point de grammaire puis quelques mots, en alternance
  const steps = [];
  if (kind === 'm') {
    const per = Math.max(1, Math.ceil(c.v.length / Math.max(1, c.g.length)));
    let vi = 0;
    c.g.forEach(g => { steps.push({ g }); c.v.slice(vi, vi + per).forEach(v => steps.push({ v })); vi += per; });
    c.v.slice(vi).forEach(v => steps.push({ v }));
  } else {
    c.g.forEach(g => steps.push({ g }));
    c.v.forEach(v => steps.push({ v }));
  }
  const title = kind === 'v' ? `Unité ${n}` : `Leçon ${n}`;
  let i = 0, dir = 1, keyHandler = null;
  const bar = h('div.progress', h('span'));
  const counter = h('span.session-count');
  const stage = h('div.stage.lesson-stage');
  const dots = h('div.lesson-dots', { 'aria-hidden': 'true' });

  function stepCard(st) {
    if (st.g) {
      const g = st.g, ex = (sentsByG.get(g.id) || []).slice(0, 3);
      return h('article.card.lesson-step.is-g',
        h('p.kicker', `Grammaire · ${D.LEVEL_NAMES[g.lv]}`),
        h('h2.point-big', { lang: 'ja', html: ruby(D.gramLabel(g), true) }),
        gramAudio(g),
        h('p.point-sense', g.s),
        ex.length ? h('ol.example-list', ex.map(s => h('li',
          h('div.jp-line', h('p.jp', { lang: 'ja', html: sentenceHTML(s, { fill: true, furi }) }), speakBtn(sentenceText(s), { label: 'Écouter la phrase', small: true })),
          h('p.fr', s.fr)))) : h('p.section-note', 'Pas encore d’exemple pour ce point.'),
        h('a.small.lesson-more', { href: `#/point/${g.id}` }, 'Ouvrir la fiche du point'));
    }
    const v = st.v;
    return h('article.card.lesson-step.is-v',
      h('p.kicker', `Vocabulaire · ${v.lv}`),
      h('p.word.lesson-word', { lang: 'ja', html: ruby(v.f || v.w, true) }),
      wordAudio(v),
      h('p.point-sense', v.m));
  }

  function show() {
    const st = steps[i];
    bar.firstChild.style.width = `${((i + 1) / steps.length) * 100}%`;
    counter.textContent = `${i + 1} / ${steps.length}`;
    dots.replaceChildren(...steps.map((s, k) => h('i', { class: `${s.g ? 'g' : 'v'}${k === i ? ' on' : k < i ? ' seen' : ''}` })));
    const card = stepCard(st);
    card.classList.add(dir > 0 ? 'from-right' : 'from-left');
    const prev = h('button.btn', { disabled: i === 0, onclick: () => go(-1) }, 'Précédent');
    const next = h('button.btn.primary', { onclick: () => go(1) }, i === steps.length - 1 ? 'Terminer la leçon' : 'Suivant');
    stage.replaceChildren(card, h('div.actions.lesson-nav', prev, next));
    play('card');
    if (S.getSettings().autoSpeak) setTimeout(() => speak(st.v ? kana(st.v.f || st.v.w) : (st.g.r || st.g.t)), 260);
  }
  function go(d) {
    if (i + d < 0) return;
    if (i + d >= steps.length) return finish();
    dir = d; i += d; show();
  }
  function setKeys(fn) {
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = fn; if (fn) document.addEventListener('keydown', fn);
  }
  window.addEventListener('hashchange', () => setKeys(null), { once: true });
  setKeys(e => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });

  async function finish() {
    setKeys(null);
    const done = store.get(DONE_KEY, {}); done[`${lv}:${kind}:${n}`] = Date.now(); store.set(DONE_KEY, done);
    const keys = [...c.g.map(g => `g:${g.id}`), ...c.v.map(D.vocabKey)];
    const missing = keys.filter(k => !S.getCard(k));
    const nextN = kind === 'g' ? plan.g[plan.g.findIndex(x => x.n === Number(n)) + 1]?.n : Number(n) + 1;
    const hasNext = kind === 'g' ? nextN != null : kind === 'v' ? Number(n) < plan.v.length : Number(n) < Math.max(plan.g.length, plan.v.length);
    const quizItems = async () => {
      const byId = new Map((await D.grammar()).map(g => [g.id, g]));
      const sents = c.g.flatMap(g => sentsByG.get(g.id) || []);
      const vocabAll = await D.vocab(lv);
      return shuffle([...practiceItems(sents, byId).slice(0, 8), ...shuffle(c.v).slice(0, 8).map(v => vocabPractice(v, vocabAll))]);
    };
    const add = h('button.btn', { disabled: !missing.length, onclick: () => {
      missing.forEach(S.addCard); add.disabled = true; add.textContent = 'Dans tes révisions ✓';
      toast(`${missing.length} élément(s) ajouté(s) à tes révisions`); refreshBadge?.();
    } }, missing.length ? `Ajouter à mes révisions (${missing.length})` : 'Déjà dans tes révisions ✓');
    stage.replaceChildren(h('div.card.finish.lesson-finish',
      h('p.kicker', `${title} · ${lv}`),
      h('h2', 'Leçon terminée'),
      h('p', `${c.g.length ? `${c.g.length} point${c.g.length > 1 ? 's' : ''} de grammaire` : ''}${c.g.length && c.v.length ? ' et ' : ''}${c.v.length ? `${c.v.length} mots` : ''} parcourus.`),
      h('div.actions',
        h('button.btn.primary', { onclick: async () => {
          const items = await quizItems();
          runSession(stage, { mode: 'practice', items, extraActions: [
            h('a.btn.primary', { href: hasNext ? `#/lecon/${lv}/${kind}/${nextN}` : `#/lecons/${lv}` }, hasNext ? 'Leçon suivante' : 'Toutes les leçons'),
            h('a.btn', { href: `#/lecons/${lv}` }, 'Retour aux leçons')] });
        } }, 'Quiz de la leçon'),
        add,
        c.g.length ? h('a.btn', { href: `#/jeux/theme?lv=${lv}&le=${c.gN}` }, 'Thème : écris les phrases') : null,
        hasNext ? h('a.btn.ghost', { href: `#/lecon/${lv}/${kind}/${nextN}` }, 'Leçon suivante') : null)));
    celebrate({ title: '修了！', sub: `${title} terminée`, detail: `${steps.length} cartes parcourues`, tone: 'win' });
  }

  main.replaceChildren(
    h('a.back', { href: `#/lecons/${lv}` }, `Leçons ${lv} · ${KINDS[kind].label}`),
    h('div.session',
      h('header.session-head', h('a.session-quit', { href: `#/lecons/${lv}`, 'aria-label': 'Quitter la leçon' }, '×'), bar, counter),
      h('header.lesson-title', h('h1', title), h('span.lesson-kind', { lang: 'ja' }, KINDS[kind].jp), dots),
      stage));
  show();
}
