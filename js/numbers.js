// 数 Les nombres japonais : conversion (jusqu'à 無量大数), leçon guidée « compter jusqu'à l'infini ».
import { h, ruby, jr, normJa, kanaKeyboardToggle, smoothType, hitFx, HIT_WORDS, toast } from './util.js?v=20261024114041';
import * as S from './srs.js?v=20261024114041';
import { play } from './sfx.js?v=20261024114041';

// --- Conversion -------------------------------------------------------------------------------
const DK = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const DR = ['', ['いち'], ['に'], ['さん'], ['よん', 'し'], ['ご'], ['ろく'], ['なな', 'しち'], ['はち'], ['きゅう', 'く']];
const UNITS = [['', ''], ['万', 'まん'], ['億', 'おく'], ['兆', 'ちょう'], ['京', 'けい']];
const cart = (a, b) => a.flatMap(x => b.map(y => x + y));

/** Lectures possibles d'un groupe de 4 chiffres (1 à 9999) */
function groupReadings(n) {
  const th = Math.floor(n / 1000), hu = Math.floor(n / 100) % 10, te = Math.floor(n / 10) % 10, un = n % 10;
  const r = [];
  r.push(th ? ({ 1: ['せん'], 3: ['さんぜん'], 8: ['はっせん'] }[th] || DR[th].map(x => x + 'せん')) : ['']);
  r.push(hu ? ({ 1: ['ひゃく'], 3: ['さんびゃく'], 6: ['ろっぴゃく'], 8: ['はっぴゃく'] }[hu] || DR[hu].map(x => x + 'ひゃく')) : ['']);
  r.push(te ? (te > 1 ? DR[te].map(x => x + 'じゅう') : ['じゅう']) : ['']);
  r.push(un ? DR[un] : ['']);
  return r.reduce(cart, ['']);
}
/** Lecture d'un groupe suivi d'une unité (les sons changent devant 兆 et 京) */
function groupWithUnit(n, u) {
  let base = groupReadings(n);
  if (u === 'ちょう' || u === 'けい') {
    const last = n % 10, tens = Math.floor(n / 10) % 10;
    base = base.map(b => {
      if (last === 1 && b.endsWith('いち')) return b.slice(0, -2) + 'いっ';
      if (last === 8 && b.endsWith('はち')) return b.slice(0, -2) + 'はっ';
      if (u === 'けい' && last === 6 && b.endsWith('ろく')) return b.slice(0, -2) + 'ろっ';
      if (!last && tens && b.endsWith('じゅう')) return b.slice(0, -3) + 'じゅっ';
      return b;
    });
  }
  return base.map(b => b + u);
}
function groupKanji(n, withOneSen) {
  const th = Math.floor(n / 1000), hu = Math.floor(n / 100) % 10, te = Math.floor(n / 10) % 10, un = n % 10;
  return (th ? (th > 1 || withOneSen ? DK[th] : '') + '千' : '') + (hu ? (hu > 1 ? DK[hu] : '') + '百' : '') + (te ? (te > 1 ? DK[te] : '') + '十' : '') + DK[un];
}
/** Nombre (BigInt ou Number) → { kanji, reading, answers: Set de formes acceptées } */
export function toJapanese(value) {
  let n = BigInt(value);
  if (n === 0n) return { kanji: '零', reading: 'ゼロ', answers: new Set(['零', 'ゼロ', 'れい', '〇']) };
  const groups = [];
  while (n > 0n) { groups.push(Number(n % 10000n)); n /= 10000n; }
  if (groups.length > UNITS.length) throw new Error('trop grand');
  let kanjiForms = [''], readings = [''];
  for (let gi = groups.length - 1; gi >= 0; gi--) {
    const g = groups[gi];
    if (!g) continue;
    const [uk, ur] = UNITS[gi];
    const ks = gi > 0 && g >= 1000 && g < 2000 ? [groupKanji(g, false) + uk, groupKanji(g, true) + uk] : [groupKanji(g, false) + uk];
    const rs = groupWithUnit(g, ur);
    if (gi > 0 && g >= 1000 && g < 2000) rs.push(...groupWithUnit(g, ur).map(x => x.replace(/^せん/, 'いっせん')));
    kanjiForms = cart(kanjiForms, ks);
    readings = cart(readings, rs);
  }
  const kanji = kanjiForms[0], reading = readings[0];
  return { kanji, reading, answers: new Set([...kanjiForms, ...readings]) };
}
/** La réponse tapée est-elle juste ? (kanji ou kana, espaces/virgules ignorés) */
export function checkNumber(value, typed) {
  const t = normJa(typed).replace(/[,，、]/g, '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  return toJapanese(value).answers.has(t);
}
/** 1234567 → « 123,4567 » : groupes de 4 chiffres à la japonaise */
export const by4 = v => String(v).replace(/\B(?=(\d{4})+(?!\d))/g, ',');
export const by3 = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// --- Leçon guidée -------------------------------------------------------------------------------
const BIG = [['一（いち）', '1'], ['十（じゅう）', '10'], ['百（ひゃく）', '100'], ['千（せん）', '1 000'], ['万（まん）', '10⁴'], ['億（おく）', '10⁸'], ['兆（ちょう）', '10¹²'],
  ['京（けい）', '10¹⁶'], ['垓（がい）', '10²⁰'], ['𥝱（じょ）', '10²⁴'], ['穣（じょう）', '10²⁸'], ['溝（こう）', '10³²'], ['澗（かん）', '10³⁶'], ['正（せい）', '10⁴⁰'],
  ['載（さい）', '10⁴⁴'], ['極（ごく）', '10⁴⁸'], ['恒河沙（ごうがしゃ）', '10⁵²'], ['阿僧祇（あそうぎ）', '10⁵⁶'], ['那由他（なゆた）', '10⁶⁰'], ['不可思議（ふかしぎ）', '10⁶⁴'], ['無量大数（むりょうたいすう）', '10⁶⁸']];
const tip = (t, ...x) => h('p.nb-tip', h('b', '💡 '), h('strong', t), ' ', ...x);
const row = (n, note) => { const j = toJapanese(n); return h('li', h('span.nb-n', by3(n)), h('span.nb-k', { lang: 'ja', html: `<ruby>${j.kanji}<rt>${j.reading}</rt></ruby>` }), note ? h('small', note) : null); };
const STEPS = [
  { k: '一', t: 'De 1 à 10', body: () => [
    h('p', 'Dix mots à connaître, et c’est tout : le reste se construit comme des Lego.'),
    h('ol.nb-list', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => row(n))),
    tip('4, 7 et 9 ont deux lectures.', 'Pour compter, dis よん, なな et きゅう (し, しち, く existent mais on les évite : し sonne comme « mort »).')] },
  { k: '十', t: 'De 11 à 99', body: () => [
    h('p', 'On lit le nombre comme une petite addition / multiplication :'),
    h('ul.nb-rules', h('li', h('b', '11'), ' = 十 + 一 → ', h('span', { lang: 'ja', html: ruby('十一（じゅういち）', true) }), ' (« dix-un »)'),
      h('li', h('b', '20'), ' = 二 × 十 → ', h('span', { lang: 'ja', html: ruby('二十（にじゅう）', true) }), ' (« deux-dix »)'),
      h('li', h('b', '35'), ' = 三 × 十 + 五 → ', h('span', { lang: 'ja', html: ruby('三十五（さんじゅうご）', true) }))),
    h('ol.nb-list', [11, 19, 20, 42, 77, 99].map(n => row(n))),
    tip('Pas de « soixante-dix » ni de « quatre-vingt » !', 'En japonais, 70 c’est juste « sept-dix » : 七十.')] },
  { k: '百', t: 'Les centaines', body: () => [
    h('p', '百 (ひゃく) = 100. Même logique : 三百 = « trois-cent ».'),
    h('ol.nb-list', [100, 200, 300, 600, 800, 999].map(n => row(n, { 300: 'ひゃく → びゃく', 600: 'ろく + ひゃく → ろっぴゃく', 800: 'はち + ひゃく → はっぴゃく' }[n]))),
    tip('Trois sons changent, c’est tout :', '3 → さんびゃく, 6 → ろっぴゃく, 8 → はっぴゃく. Astuce : « 3-6-8 » sont les chiffres qui « cognent ».'),
    tip('On ne dit jamais 一百.', 'Un seul cent = 百 tout court.')] },
  { k: '千', t: 'Les milliers', body: () => [
    h('p', '千 (せん) = 1 000. Encore la même mécanique.'),
    h('ol.nb-list', [1000, 3000, 8000, 2024, 4567].map(n => row(n, { 3000: 'せん → ぜん', 8000: 'はち + せん → はっせん' }[n]))),
    tip('Seulement deux changements :', '3 → さんぜん et 8 → はっせん. Pas de 一千 non plus quand il est seul.')] },
  { k: '万', t: 'LE secret : 万, on compte par 4 chiffres', body: () => [
    h('p', 'Ici, tout change. En français on groupe par 3 chiffres (mille, million, milliard). ', h('strong', 'En japonais, on groupe par 4 chiffres'), '. 1 0000 = 一万 (いちまん), « dix-mille ».'),
    h('div.nb-split', h('span', '12 345 678'), h('b', '→'), h('span.nb-4', '1234 | 5678'), h('b', '→'), h('span', { lang: 'ja', html: ruby('千二百三十四万（せんにひゃくさんじゅうよんまん）五千六百七十八（ごせんろっぴゃくななじゅうはち）', true) })),
    h('ol.nb-list', [10000, 50000, 100000, 1000000, 10000000].map(n => row(n, { 100000: '« dix dix-mille »', 1000000: '1 million = 100万 !', 10000000: '« mille dix-mille »' }[n]))),
    tip('Le réflexe :', 'efface les espaces du nombre, puis remets une virgule tous les 4 chiffres en partant de la droite. Chaque virgule = une unité : 万, puis 億, puis 兆.'),
    tip('Attention :', '10 000 se dit 一万 avec le 一 (et pas 万 tout seul).')] },
  { k: '億', t: '億, 兆, 京 : les géants', body: () => [
    h('p', 'Après 万, chaque nouvelle unité vaut 10 000 fois la précédente :'),
    h('ul.nb-rules', h('li', h('b', '1 0000'), ' = 一万 (10⁴)'), h('li', h('b', '1 0000 0000'), ' = 一億 いちおく (10⁸ = cent millions)'),
      h('li', h('b', '1 0000 0000 0000'), ' = 一兆 いっちょう (10¹² = mille milliards)'), h('li', h('b', '1 0000 0000 0000 0000'), ' = 一京 いっけい (10¹⁶)')),
    h('ol.nb-list', [100000000n, 1000000000n, 125000000n, 1000000000000n, 8000000000000n].map(n => row(n, { 1000000000n: '1 milliard = 10億', 125000000n: 'population du Japon ≈ 1億2500万', 1000000000000n: 'いち + ちょう → いっちょう', 8000000000000n: 'はっちょう' }[n]))),
    tip('Conversions express :', '1 million = 100万 · 1 milliard = 10億 · 1 000 milliards = 1兆.'),
    tip('Devant 兆 et 京,', '1 → いっ, 8 → はっ, 10 → じゅっ (いっちょう, はっちょう, じゅっちょう).')] },
  { k: '∞', t: 'Jusqu’à l’infini : 無量大数', body: () => [
    h('p', 'Les Japonais ont des noms pour des nombres absurdement grands, tous espacés de ×10 000 (4 zéros de plus à chaque fois). Le dernier, 無量大数, veut dire « nombre immense impossible à mesurer » : c’est l’« infini » de la culture populaire.'),
    h('ol.nb-big', BIG.map(([k, p], i) => h('li', { style: { '--i': i } }, h('span', { lang: 'ja', html: ruby(k, true) }), h('small', p)))),
    tip('Retenir le début suffit :', 'au quotidien tu n’utiliseras que 万, 億 et 兆 (budgets, PIB, populations). Les autres, c’est pour briller en soirée.'),
    tip('Zéro', 'se dit ゼロ ou れい (零).')] },
];

/** Onglet Leçons › 数 : les étapes de la leçon des nombres en cartes */
export function numbersHub() {
  const seen = S.getExtra('numbersSeen', {}) || {};
  const done = !!S.getExtra('numbersDone', null);
  const cards = [...STEPS.map((st, k) => ({ k: st.k, t: st.t, href: `#/nombres?s=${k + 1}`, ok: done || seen[k + 1] })),
    { k: '試', t: 'Exercice final : 10 nombres à écrire', href: '#/nombres?s=quiz', ok: done }];
  return h('div.nb-hub',
    h('p.section-note.seg-desc', 'Compter jusqu’à l’infini : de 一 à 無量大数, en 7 étapes avec des astuces simples, puis un exercice. Ensuite, entraîne-toi en vitesse avec ', h('a', { href: '#/jeux/pib' }, 'PIB RUSH'), '.'),
    h('ul.lesson-grid', cards.map((c, i) => h('li', { style: { '--i': i } }, h('a.lesson-card', { href: c.href, class: `lesson-card${c.ok ? ' done' : ''}` },
      h('span.lc-num', String(i + 1).padStart(2, '0')),
      h('span.lc-body', h('strong', c.t), h('span.lc-preview', { lang: 'ja' }, c.k)),
      h('span.lc-foot', h('span.lc-gauge', { class: `lc-gauge${c.ok ? ' full' : ''}` }, h('span', { style: { width: c.ok ? '100%' : '0%' } })), h('span.lc-pct', c.ok ? '100 %' : '0 %')),
      c.ok ? h('span.lc-done', { 'aria-label': 'Vu', html: jr('済') }) : null)))),
    h('div.actions', h('a.btn.primary', { href: '#/nombres' }, 'Commencer la leçon'), h('a.btn', { href: '#/jeux/pib' }, 'Jouer à PIB RUSH')));
}

export async function numbersLesson(main, params) {
  const sp = params?.get?.('s');
  let i = sp && /^\d+$/.test(sp) ? Math.min(STEPS.length - 1, Math.max(0, Number(sp) - 1)) : 0;
  const bar = h('div.progress', h('span'));
  const counter = h('span.session-count');
  const stage = h('div.stage.lesson-stage');
  const show = (dir = 1) => {
    const st = STEPS[i];
    bar.firstChild.style.width = `${((i + 1) / (STEPS.length + 1)) * 100}%`;
    counter.textContent = `${i + 1} / ${STEPS.length + 1}`;
    const card = h('article.card.lesson-step.nb-step', { class: `card lesson-step nb-step ${dir > 0 ? 'from-right' : 'from-left'}` },
      h('span.nb-wm', { lang: 'ja', 'aria-hidden': 'true' }, st.k), h('p.kicker', `Étape ${i + 1}`), h('h2', st.t), ...st.body());
    { const m = { ...(S.getExtra('numbersSeen', {}) || {}) }; if (!m[i + 1]) { m[i + 1] = Date.now(); S.setExtra('numbersSeen', m); } }
    stage.replaceChildren(card, h('div.actions.lesson-nav',
      h('button.btn', { disabled: i === 0, onclick: () => go(-1) }, 'Précédent'),
      h('button.btn.primary', { onclick: () => go(1) }, i === STEPS.length - 1 ? 'Passer à l’exercice' : 'Suivant', h('kbd.key-hint', { 'aria-hidden': 'true' }, 'Espace'))));
    play('card');
  };
  const go = d => { if (i + d < 0) return; if (i + d >= STEPS.length) return quiz(); i += d; show(d); };
  const onKey = e => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  };
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', () => document.removeEventListener('keydown', onKey), { once: true });

  function quiz() {
    document.removeEventListener('keydown', onKey);
    const Q = [7, 14, 60, 300, 800, 2024, 36000, 1000000, 120000000, 3000000000000n].map(BigInt);
    let q = 0, ok = 0;
    const next = () => {
      if (q >= Q.length) return finish();
      bar.firstChild.style.width = '100%';
      counter.textContent = `Exercice ${q + 1} / ${Q.length}`;
      const n = Q[q], j = toJapanese(n);
      const input = h('input.type-answer', { type: 'text', lang: 'ja', autocomplete: 'off', spellcheck: 'false', placeholder: '漢字 ou かな', 'aria-label': 'Le nombre en japonais' });
      const kb = kanaKeyboardToggle(input, {
        get: () => { try { return S.getSettings().romaji ?? localStorage.getItem('sakura.theme.romaji') === '1'; } catch { return false; } },
        set: on => { try { localStorage.setItem('sakura.theme.romaji', on ? '1' : '0'); } catch {} S.setSettings({ romaji: on }); } });
      smoothType(input);
      const fb = h('div.sm-feedback');
      let tries = 0, done = false;
      const nxt = h('button.btn.primary', { onclick: () => { q++; next(); } }, 'Suite ▶');
      const check = () => {
        if (done) return nxt.click();
        if (checkNumber(n, input.value)) { done = true; ok += tries ? 0 : 1; play('correct'); hitFx(input, { card, stamp: HIT_WORDS[q % HIT_WORDS.length] });
          fb.replaceChildren(h('p.sm-verdict.ok', '正解！'), h('p', { lang: 'ja', html: `<ruby>${j.kanji}<rt>${j.reading}</rt></ruby>` }), nxt); input.readOnly = true; return; }
        tries++; play('wrong');
        if (tries >= 2) { done = true; input.readOnly = true; fb.replaceChildren(h('p.sm-verdict.ko', 'La réponse :'), h('p', { lang: 'ja', html: `<ruby>${j.kanji}<rt>${j.reading}</rt></ruby>` }), h('p.small', `Groupes de 4 : ${by4(n)}`), nxt); }
        else fb.replaceChildren(h('p', `Pas tout à fait. Indice : en groupes de 4 chiffres, ça donne ${by4(n)}.`));
      };
      input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); check(); } });
      const card = h('article.card.question.nb-q',
        h('p.kicker', 'Écris ce nombre en japonais'), h('p.nb-big-n', by3(n)),
        h('div.answer-bar.sm-bar-in', input, h('button.btn.primary', { onclick: check }, 'OK')), h('div.type-tools', kb), fb);
      stage.replaceChildren(card); setTimeout(() => input.focus(), 50);
    };
    const finish = () => {
      S.recordLesson();
      S.setExtra('numbersDone', Date.now());
      stage.replaceChildren(h('div.card.finish', h('p.kicker', '修了！'), h('h2', 'Tu sais compter jusqu’à l’infini'),
        h('p', `${ok} / ${Q.length} du premier coup.`),
        h('div.actions', h('a.btn.primary', { href: '#/jeux/pib' }, 'Jouer à PIB RUSH'), h('button.btn', { onclick: () => { i = 0; show(); } }, 'Revoir la leçon'), h('a.btn.ghost', { href: '#/lecons/nombres' }, 'Retour aux leçons'))));
      toast('Leçon des nombres validée');
    };
    next();
  }

  main.replaceChildren(h('a.back', { href: '#/lecons/nombres' }, 'Leçons › Nombres'),
    h('div.session.lesson-wrap',
      h('header.session-head.lesson-head-bar', h('a.session-quit', { href: '#/lecons/nombres', 'aria-label': 'Quitter la leçon' }, '×'), bar, counter),
      h('header.lesson-title', h('h1', 'Compter jusqu’à l’infini'), h('span.lesson-kind', { lang: 'ja', html: jr('数') })),
      stage));
  if (sp === 'quiz') quiz(); else show();
}
