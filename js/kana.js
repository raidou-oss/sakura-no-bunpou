// 仮名 : hiragana et katakana pour ceux qui partent de zéro. Tableaux à écouter + entraînement à la lecture.
import { h, shuffle, jr, toast, toHira } from './util.js?v=20261020183709';
import * as S from './srs.js?v=20261020183709';
import { speak, speakBtn } from './voice.js?v=20261020183709';
import { play } from './sfx.js?v=20261020183709';
import { burst, celebrate, verdict } from './celebrate.js?v=20261020183709';

// Gojūon : [romaji des 5 colonnes a i u e o], null = case vide
const BASE = [
  ['a', ['あ', 'い', 'う', 'え', 'お'], ['a', 'i', 'u', 'e', 'o']],
  ['ka', ['か', 'き', 'く', 'け', 'こ'], ['ka', 'ki', 'ku', 'ke', 'ko']],
  ['sa', ['さ', 'し', 'す', 'せ', 'そ'], ['sa', 'shi', 'su', 'se', 'so']],
  ['ta', ['た', 'ち', 'つ', 'て', 'と'], ['ta', 'chi', 'tsu', 'te', 'to']],
  ['na', ['な', 'に', 'ぬ', 'ね', 'の'], ['na', 'ni', 'nu', 'ne', 'no']],
  ['ha', ['は', 'ひ', 'ふ', 'へ', 'ほ'], ['ha', 'hi', 'fu', 'he', 'ho']],
  ['ma', ['ま', 'み', 'む', 'め', 'も'], ['ma', 'mi', 'mu', 'me', 'mo']],
  ['ya', ['や', null, 'ゆ', null, 'よ'], ['ya', null, 'yu', null, 'yo']],
  ['ra', ['ら', 'り', 'る', 'れ', 'ろ'], ['ra', 'ri', 'ru', 're', 'ro']],
  ['wa', ['わ', null, null, null, 'を'], ['wa', null, null, null, 'wo']],
  ['n', ['ん', null, null, null, null], ['n', null, null, null, null]],
];
const DAKU = [
  ['ga', ['が', 'ぎ', 'ぐ', 'げ', 'ご'], ['ga', 'gi', 'gu', 'ge', 'go']],
  ['za', ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'], ['za', 'ji', 'zu', 'ze', 'zo']],
  ['da', ['だ', 'ぢ', 'づ', 'で', 'ど'], ['da', 'ji', 'zu', 'de', 'do']],
  ['ba', ['ば', 'び', 'ぶ', 'べ', 'ぼ'], ['ba', 'bi', 'bu', 'be', 'bo']],
  ['pa', ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'], ['pa', 'pi', 'pu', 'pe', 'po']],
];
const YO_HEADS = [['き', 'k'], ['し', 'sh'], ['ち', 'ch'], ['に', 'n'], ['ひ', 'h'], ['み', 'm'], ['り', 'r'], ['ぎ', 'g'], ['じ', 'j'], ['び', 'b'], ['ぴ', 'p']];
const YOON = YO_HEADS.map(([k, r]) => [`${r}ya`, [`${k}ゃ`, `${k}ゅ`, `${k}ょ`],
  ['sh', 'ch', 'j'].includes(r) ? [`${r}a`, `${r}u`, `${r}o`] : [`${r}ya`, `${r}yu`, `${r}yo`]]);

export const GROUPS = [
  { id: 'base', label: 'Base (清音)', jp: '清音', rows: BASE, cols: 5 },
  { id: 'daku', label: 'Sons voisés (濁音・半濁音)', jp: '濁音', rows: DAKU, cols: 5 },
  { id: 'yoon', label: 'Combinaisons (拗音)', jp: '拗音', rows: YOON, cols: 3 },
];
const toKata = s => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
const SCRIPTS = { hira: { label: 'Hiragana', jp: 'ひらがな' }, kata: { label: 'Katakana', jp: 'カタカナ' } };

/** Toutes les cases : { k: kana, r: romaji, row, group } dans l'écriture voulue */
function cells(script, groupIds = GROUPS.map(g => g.id), rowIds = null) {
  const out = [];
  GROUPS.filter(g => groupIds.includes(g.id)).forEach(g => g.rows.forEach(([rid, ks, rs]) => {
    if (rowIds && g.id === 'base' && !rowIds.includes(rid)) return;
    ks.forEach((k, i) => { if (k) out.push({ k: script === 'kata' ? toKata(k) : k, r: rs[i], row: rid, group: g.id }); });
  }));
  return out;
}

// Romanisations acceptées en plus de Hepburn
const ALT = { shi: ['si'], chi: ['ti'], tsu: ['tu'], fu: ['hu'], ji: ['zi', 'di'], zu: ['du'], wo: ['o'], n: ['nn'],
  sha: ['sya'], shu: ['syu'], sho: ['syo'], cha: ['tya', 'cya'], chu: ['tyu', 'cyu'], cho: ['tyo', 'cyo'],
  ja: ['zya', 'jya'], ju: ['zyu', 'jyu'], jo: ['zyo', 'jyo'] };
const accepts = r => [r, ...(ALT[r] || [])];

/** Maîtrise d'un kana d'après les exercices : null (jamais vu), 'ko' (souvent raté), 'mid' (en cours), 'ok' (maîtrisé) */
function level(k) {
  const g = S.practiceStats()[`k:${k}`];
  if (!g || !(g.ok + g.ko)) return null;
  const acc = g.ok / (g.ok + g.ko);
  if (acc < 0.6) return 'ko';
  return g.ok >= 3 && acc >= 0.8 ? 'ok' : 'mid';
}
const mastery = k => ({ ko: 0.2, mid: 0.5, ok: 1 })[level(k)] ?? null;
/** Avancement continu d'un kana (0 → 1) : chaque bonne réponse du premier coup le fait monter, 3 = maîtrisé */
function progressOf(k) {
  const g = S.practiceStats()[`k:${k}`];
  if (!g) return 0;
  const acc = g.ok / Math.max(1, g.ok + g.ko);
  return Math.min(1, g.ok / 3) * (acc >= 0.6 ? 1 : 0.6);
}
const progressAll = list => list.length ? list.reduce((a, c) => a + progressOf(c.k), 0) / list.length : 0;
function kanaGauge(list, label) {
  const p = progressAll(list);
  return h('div.kana-gauge', { title: `${Math.round(p * 100)} % : chaque bonne réponse du premier coup fait avancer la jauge (3 par kana = maîtrisé)` },
    h('div.kana-gauge-top', h('span', label), h('b', `${Math.round(p * 100)} %`)),
    h('div.gauge', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(p * 100) },
      h('span', { style: { width: `${Math.max(p > 0 ? 2 : 0, Math.round(p * 100))}%` } })));
}
const masteryCls = m => m == null ? '' : m >= 0.8 ? 'm-3' : m >= 0.45 ? 'm-2' : 'm-1';

// --- Page : tableaux ---------------------------------------------------------------------
export function kanaPage(main, script = 'hira') {
  script = SCRIPTS[script] ? script : 'hira';
  const all = cells(script);
  const known = all.filter(c => (mastery(c.k) || 0) >= 0.8).length;
  const tabs = h('div.tabs', { role: 'tablist', 'aria-label': 'Écriture' },
    Object.entries(SCRIPTS).map(([k, v]) => h('a.tab', { href: `#/kana/${k}`, role: 'tab', 'aria-selected': String(k === script), class: k === script ? 'tab active' : 'tab' },
      h('span', { lang: 'ja' }, v.jp), ` ${v.label}`)));
  const tables = GROUPS.map(g => h('section.kana-block',
    h('h2', h('span.jp-head', { lang: 'ja', html: jr(g.jp) }), g.label.replace(/ \(.+\)/, '')),
    h(`div.kana-grid.cols-${g.cols}`, g.rows.flatMap(([rid, ks, rs]) => ks.map((k, i) => {
      if (!k) return h('span.kana-cell.empty', { 'aria-hidden': 'true' });
      const kk = script === 'kata' ? toKata(k) : k;
      return h('button.kana-cell', { type: 'button', class: `kana-cell ${masteryCls(mastery(kk))}`, 'aria-label': `${kk}, ${rs[i]}`,
        onclick: e => { speak(kk); play('cursor'); const b = e.currentTarget; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); } },
        h('span.kana-char', { lang: 'ja' }, kk), h('span.kana-rom', rs[i]));
    })))));
  main.replaceChildren(
    h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('仮名') }), 'Alphabets'),
      h('p.section-note', 'Le japonais s’écrit avec deux syllabaires : les hiragana pour les mots japonais et la grammaire, les katakana pour les mots étrangers. Touche une case pour l’écouter.')),
    tabs,
    h('section.glass.kana-intro',
      h('div', h('strong', `${known} / ${all.length}`), h('span.small', ` ${SCRIPTS[script].label.toLowerCase()} maîtrisés`)),
      kanaGauge(all, `Progression ${SCRIPTS[script].label.toLowerCase()}`),
      h('div.kana-legend.small', h('i.m-1'), 'souvent raté', h('i.m-2'), 'en cours', h('i.m-3'), 'maîtrisé (3 bonnes réponses)'),
      h('a.btn.primary', { href: `#/kana-quiz/${script}` }, 'S’entraîner à lire')),
    ...tables,
    h('section.glass.kana-tips',
      h('h2', 'Les petites règles'),
      h('ul',
        h('li', h('span', { lang: 'ja' }, 'っ / ッ'), ' (petit tsu) double la consonne suivante : ', h('span', { lang: 'ja' }, 'きって'), ' = kitte.'),
        h('li', h('span', { lang: 'ja' }, 'ー'), ' allonge la voyelle en katakana : ', h('span', { lang: 'ja' }, 'コーヒー'), ' = kōhī.'),
        h('li', 'Les deux traits ', h('span', { lang: 'ja' }, '゛'), ' rendent le son voisé (か ka → が ga), le rond ', h('span', { lang: 'ja' }, '゜'), ' donne un p (は ha → ぱ pa).'),
        h('li', h('span', { lang: 'ja' }, 'は・へ・を'), ' se lisent wa, e, o quand ce sont des particules.'))));
}

// --- Entraînement : lire un kana et taper sa lecture en romaji ---------------------------------
const QUIZ_KEY = 'sakura.kanaQuiz.v1';
export function kanaQuiz(main, script = 'hira') {
  script = ['hira', 'kata', 'both'].includes(script) ? script : 'hira';
  let saved = S.getSettings().kanaQuiz || {}; if (!S.getSettings().kanaQuiz) try { saved = JSON.parse(localStorage.getItem(QUIZ_KEY)) || {}; } catch {}
  let groups = saved.groups || ['base'];
  let rows = saved.rows || BASE.map(r => r[0]);
  let mode = saved.mode || 'read';
  let count = saved.count || 20;
  const save = () => { try { localStorage.setItem(QUIZ_KEY, JSON.stringify({ groups, rows, mode, count })); } catch {} S.setSettings({ kanaQuiz: { groups, rows, mode, count } }); };

  const pool = () => script === 'both'
    ? [...cells('hira', groups, rows), ...cells('kata', groups, rows)]
    : cells(script, groups, rows);

  function setup() {
    const toggle = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
    const info = h('p.small');
    const refresh = () => { info.textContent = `${pool().length} kana sélectionnés.`; };
    const rowBox = h('div.choice-row.kana-rows', BASE.map(([rid, ks]) => h('button.btn.small', { lang: 'ja', 'aria-pressed': String(rows.includes(rid)),
      onclick: e => { rows = toggle(rows, rid); if (!rows.length) rows = [rid]; e.currentTarget.setAttribute('aria-pressed', String(rows.includes(rid))); refresh(); } },
      script === 'kata' ? toKata(ks[0]) : ks[0])));
    const seg = (list, cur, set) => h('div.choice-row', list.map(([v, l]) => h('button.btn.small', { 'aria-pressed': String(v === cur),
      onclick: e => { set(v); e.currentTarget.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); refresh(); } }, l)));
    main.replaceChildren(
      h('a.back', { href: `#/kana/${script === 'both' ? 'hira' : script}` }, 'Alphabets'),
      h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('練習') }), 'Lire les kana'),
        h('p.section-note', 'Un kana s’affiche (ou se fait entendre) : tape sa lecture en romaji. L’indice donne la première lettre ; voir la réponse marque le kana « à revoir ».')),
      h('section.card.game-intro',
        h('p', h('strong', 'Écriture')),
        seg([['hira', 'Hiragana'], ['kata', 'Katakana'], ['both', 'Les deux']], script, v => { location.hash = `#/kana-quiz/${v}`; }),
        h('p', h('strong', 'Lignes de base')), rowBox,
        h('p', h('strong', 'Ajouter')),
        h('div.choice-row', [['daku', 'Sons voisés (が, ぱ…)'], ['yoon', 'Combinaisons (きゃ…)']].map(([g, l]) => h('button.btn.small', { 'aria-pressed': String(groups.includes(g)),
          onclick: e => { groups = toggle(groups, g); if (!groups.includes('base')) groups.push('base'); e.currentTarget.setAttribute('aria-pressed', String(groups.includes(g))); refresh(); } }, l))),
        h('p', h('strong', 'Mode')),
        seg([['read', 'Lire (on voit le kana)'], ['listen', 'Écouter (on l’entend)']], mode, v => { mode = v; }),
        h('p', h('strong', 'Nombre de questions')),
        seg([[10, '10'], [20, '20'], [40, '40']], count, v => { count = v; }),
        info,
        h('div.actions.left', h('button.btn.primary.big', { onclick: () => { save(); run(); } }, 'Commencer'))));
    refresh();
  }

  function run() {
    // Les kana les moins maîtrisés passent en premier
    const p = shuffle(pool()).sort((a, b) => (mastery(a.k) ?? -1) - (mastery(b.k) ?? -1));
    const queue = shuffle(p.slice(0, Math.min(count, p.length)));
    const total = queue.length;
    let done = 0, first = 0;
    const missed = new Set();
    const bar = h('div.progress', h('span'));
    const counter = h('span.session-count');
    const stage = h('div.stage');
    const selection = pool();
    const live = h('div.kana-live');
    const paintLive = () => live.replaceChildren(kanaGauge(selection, 'Maîtrise de ta sélection'));
    main.replaceChildren(h('div.session', h('header.session-head', h('a.session-quit', { href: '#/kana', 'aria-label': 'Quitter' }, '×'), bar, counter), live, stage));

    function next() {
      bar.firstChild.style.width = `${(done / total) * 100}%`;
      setTimeout(paintLive, 450);   // après l'enregistrement de la réponse
      counter.textContent = `${total - done} restant${total - done > 1 ? 's' : ''}`;
      if (!queue.length) return end();
      ask(queue.shift());
    }
    function ask(c) {
      let tries = 0, hint = false;
      const input = h('input.type-answer.romaji', { type: 'text', lang: 'en', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', placeholder: 'romaji (ex. ka)…', 'aria-label': 'Lecture en romaji', inputmode: 'latin' });
      const fb = h('p.type-feedback', { 'aria-live': 'polite' });
      const hintBox = h('div.type-hints');
      const send = h('button.btn.primary', { type: 'button', onclick: () => check() }, 'Valider');
      const hintBtn = h('button.btn', { type: 'button', onclick: () => { hint = true; hintBtn.disabled = true; hintBox.append(h('p', h('strong', 'Commence par : '), c.r[0].toUpperCase())); input.focus(); } }, 'Indice');
      const giveUp = h('button.btn.ghost', { type: 'button', onclick: () => close(false, true) }, 'Voir la réponse');
      const tools = h('div.actions.left.type-tools', hintBtn, giveUp);
      const show = mode === 'listen'
        ? h('div.kana-listen', speakBtn(c.k, { label: 'Réécouter' }), h('span.small', 'Écoute et écris ce que tu entends'))
        : h('p.kana-big', { lang: 'ja' }, c.k);
      const card = h('div.card.question.typed.kana-q', h('p.kicker', mode === 'listen' ? 'Qu’entends-tu ?' : 'Comment se lit ce kana ?'), show,
        h('div.type-row', input, send), fb, hintBox, tools);
      stage.replaceChildren(card);
      play('card');
      if (mode === 'listen') setTimeout(() => speak(c.k), 250);
      setTimeout(() => input.focus(), 60);
      function check() {
        // Clavier japonais activé, lettres pleine chasse, majuscules : tout est ramené à la même forme
        const v = input.value.normalize('NFKC').trim().toLowerCase().replace(/[\s'’.。-]+/g, '');
        if (!v) return input.focus();
        if (accepts(c.r).includes(v) || toHira(v) === toHira(c.k)) return close(true);
        tries++;
        play('wrong');
        input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
        fb.textContent = tries === 1 ? 'Pas tout à fait, réessaie.' : 'Toujours pas : prends l’indice ou regarde la réponse.';
        input.select();
      }
      function close(right, gaveUp = false) {
        input.readOnly = true; send.remove(); tools.remove(); fb.remove();
        const clean = right && !tries && !hint;
        S.recordPractice(`k:${c.k}`, clean);
        play(right ? 'correct' : 'back');
        if (right) burst(input, { count: 12 });
        input.classList.add(right ? 'ok' : 'ko');
        if (gaveUp) { input.value = ''; input.placeholder = ''; }
        if (clean && !missed.has(c.k)) first++;
        if (!clean) missed.add(c.k);
        // Raté ou aidé : le kana revient plus loin dans la séance
        if (!right || !clean) queue.splice(Math.min(queue.length, 3 + Math.floor(Math.random() * 3)), 0, c); else done++;
        // Un seul passage à la question suivante, même si Entrée et le clic arrivent ensemble
        let moved = false;
        const go = () => { if (moved) return; moved = true; document.removeEventListener('keydown', k); next(); };
        const k = e => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
        const cont = h('button.btn.primary', { type: 'button', onclick: go }, 'Continuer');
        card.append(h('div.reveal',
          h('p.type-solution', right ? 'Exact : ' : 'La réponse : ', h('strong', { lang: 'ja' }, c.k), ` = ${c.r}`, ALT[c.r] ? h('span.small', ` (aussi : ${ALT[c.r].join(', ')})`) : null),
          mode === 'listen' ? null : h('div.word-audio', speakBtn(c.k, { label: 'Écouter' }), h('span.small', 'Écouter')),
          !clean ? h('p.again-note', gaveUp ? 'Réponse consultée : ce kana est marqué « à revoir » et revient tout de suite.' : 'Avec de l’aide : il reviendra une fois de plus.') : null),
          h('div.actions', cont));
        card.classList.add(right ? 'is-right' : 'is-wrong');
        setTimeout(() => { if (!moved) document.addEventListener('keydown', k); }, 50);
        window.addEventListener('hashchange', () => document.removeEventListener('keydown', k), { once: true });
        cont.focus({ preventScroll: true });
      }
      input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing && !input.readOnly) { e.preventDefault(); e.stopPropagation(); check(); } });
    }
    function end() {
      bar.firstChild.style.width = '100%';
      S.recordGame?.();
      stage.replaceChildren(h('div.card.finish',
        h('h2', 'Séance terminée'),
        h('p', `${first} / ${total} du premier coup.`),
        missed.size ? h('p.small', h('span', 'À retravailler : '), h('span', { lang: 'ja' }, [...missed].join('　'))) : h('p.small', 'Aucune erreur, bravo.'),
        h('div.actions', h('button.btn.primary', { onclick: run }, 'Recommencer'), h('button.btn', { onclick: setup }, 'Changer la sélection'), h('a.btn.ghost', { href: `#/kana/${script === 'both' ? 'hira' : script}` }, 'Tableaux'))));
      celebrate({ ...verdict(first / Math.max(1, total)), title: '完了！', sub: 'Kana', detail: `${first} / ${total} du premier coup` });
    }
    next();
  }
  setup();
}
