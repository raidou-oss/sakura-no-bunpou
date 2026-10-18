// 桜の文法 — routeur et pages principales.
import { h, $, $$, ruby, blossom, toast, reducedMotion, shuffle, store, stack } from './util.js';
import * as D from './data.js';
import * as S from './srs.js';
import { buildSrsQueue, runSession, countDue, sentenceHTML, practiceItems } from './review.js';

const main = $('#main');
const GAMES = {
  cafe: { file: './games/cafe.js', jp: 'コトバ珈琲', name: 'Kotoba Kōhī', desc: 'Un client étranger te dicte sa commande en français : passe-la au barista en japonais.' },
  hanabira: { file: './games/hanabira.js', jp: '花びら', name: 'Hanabira', desc: 'Les pétales tombent : attrape celui qui porte le bon mot avant qu’il touche le sol.' },
  joshi: { file: './games/joshi.js', jp: '助詞ダッシュ', name: 'Joshi Dash', desc: 'Soixante secondes pour placer un maximum de particules.' },
  narabe: { file: './games/narabe.js', jp: '並べ替え', name: 'Narabe', desc: 'Remets les morceaux de la phrase dans le bon ordre.' },
};

const furiFor = lv => {
  const f = S.getSettings().furigana;
  return f === 'always' || (f === 'auto' && (lv === 'N5' || lv === 'N4'));
};

// --- Routeur --------------------------------------------------------------------
const routes = [
  [/^\/?$/, home],
  [/^\/revision$/, revision],
  [/^\/entrainement\/(N[1-5]|kansai|extra)(?:\/(\d+))?$/, practice],
  [/^\/grammaire(?:\/(N[1-5]|kansai|extra))?$/, grammarList],
  [/^\/point\/(\d+)$/, grammarPoint],
  [/^\/vocabulaire(?:\/(N[1-5]))?$/, vocabList],
  [/^\/vocabulaire\/(N[1-5])\/(\d+)$/, vocabUnit],
  [/^\/jeux$/, gamesHub],
  [/^\/jeux\/(\w+)$/, game],
  [/^\/reglages$/, settingsPage],
];

async function route() {
  const path = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
  const [p, query] = path.split('?');
  for (const [re, view] of routes) {
    const m = p.match(re);
    if (m) {
      const section = p.split('/')[1] || 'home';
      $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === ({ point: 'grammaire', entrainement: 'grammaire' }[section] || section)));
      $$('.nav a').forEach(a => a.classList.contains('active') ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
      try {
        main.classList.remove('wide');
        await view(...m.slice(1), new URLSearchParams(query));
      } catch (err) {
        console.error(err);
        main.replaceChildren(h('div.card.error', h('h2', 'Impossible d’afficher cette page'), h('p', err.message),
          h('p.small', 'Si tu as ouvert le fichier directement, lance un petit serveur local (voir le README).')));
      }
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
      refreshBadge();
      return;
    }
  }
  location.hash = '#/';
}
window.addEventListener('hashchange', route);

async function refreshBadge() {
  const n = await countDue();
  const b = $('#due-badge');
  b.hidden = n === 0; b.textContent = n > 99 ? '99+' : n;
}

// --- Accueil ----------------------------------------------------------------------
async function levelMastery() {
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

function petalsLayer(n = 14) {
  if (reducedMotion()) return null;
  const layer = h('div.petal-rain', { 'aria-hidden': 'true' });
  for (let i = 0; i < n; i++) {
    layer.append(h('span', { style: {
      left: `${Math.random() * 100}%`, animationDelay: `${-Math.random() * 14}s`,
      animationDuration: `${10 + Math.random() * 8}s`, '--drift': `${Math.random() * 120 - 60}px`,
      '--size': `${8 + Math.random() * 10}px`, '--spin': `${Math.random() * 720 - 360}deg`,
    } }));
  }
  return layer;
}

async function home() {
  const [{ queue, dueCount }, mastery] = await Promise.all([buildSrsQueue(), levelMastery()]);
  const newCount = queue.length - dueCount;
  const streak = S.streak();
  const days = S.lastDays(7);
  const maxRev = Math.max(10, ...days.map(d => d.rev));
  const set = S.getSettings();

  const hero = h('section.hero',
    petalsLayer(),
    h('h1.hero-title.vstack', { lang: 'ja', 'aria-label': '桜の文法', html: stack('桜の文法') }),
    h('div.hero-body',
      h('p.hero-lead', 'La grammaire japonaise du N5 au N1, une phrase à la fois.'),
      h('div.today',
        !queue.length ? h('p.today-count', 'Tout est révisé pour aujourd’hui.')
          : dueCount ? h('p.today-count', h('strong', dueCount), ` carte${dueCount > 1 ? 's' : ''} à réviser`, newCount ? [' et ', h('strong', newCount), ` nouvelle${newCount > 1 ? 's' : ''}`] : '')
          : h('p.today-count', h('strong', newCount), ` nouvelle${newCount > 1 ? 's' : ''} carte${newCount > 1 ? 's' : ''} à découvrir aujourd’hui`),
        queue.length
          ? h('a.btn.primary.big', { href: '#/revision' }, 'Commencer la révision')
          : h('a.btn.primary.big', { href: `#/entrainement/${set.grammarLevels[0] || 'N5'}` }, 'S’entraîner librement'),
        h('div.streak',
          streak ? [h('span.streak-n', streak), h('span', streak > 1 ? ' jours d’affilée' : ' jour d’affilée')] : h('span', 'Ta série commence aujourd’hui'),
          h('ol.week', { 'aria-label': 'Révisions des 7 derniers jours' },
            days.map(d => h('li', { title: `${d.key} : ${d.rev} révision(s)`, style: { '--v': d.rev / maxRev } },
              h('span.sr', `${d.key} : ${d.rev}`))))))));

  const garden = h('section.garden',
    h('h2', 'Ton jardin'),
    h('p.section-note', 'Chaque fleur s’ouvre à mesure que les points de grammaire de son niveau s’installent dans ta mémoire.'),
    h('ul.levels', D.LEVELS.map(lv => {
      const m = mastery[lv];
      return h('li', h('a.level', { href: `#/grammaire/${lv}` },
        h('span.level-flower', { html: blossom(m.open, 72, `${lv} : ${Math.round(m.open * 100)} %`) }),
        h('span.level-name', lv), h('span.level-jp', { lang: 'ja' }, D.LEVEL_JP[lv]),
        h('span.level-stat', `${m.started}/${m.total} vus`), m.bloomed ? h('span.level-stat', `${m.bloomed} en fleur`) : null));
    })));

  const g = GAMES.cafe;
  const games = h('section.games-teaser',
    h('h2', 'Pause jeux'),
    h('a.cafe-tile', { href: '#/jeux/cafe' },
      h('span.cafe-sign.vstack', { lang: 'ja', 'aria-hidden': 'true', html: stack(g.jp) }),
      h('span.cafe-text', h('strong', g.name), h('span', g.desc))),
    h('ul.mini-games', ['hanabira', 'joshi', 'narabe'].map(k => h('li', h('a', { href: `#/jeux/${k}` },
      h('span.mg-jp', { lang: 'ja' }, GAMES[k].jp), h('span.mg-name', GAMES[k].name))))));

  main.replaceChildren(hero, garden, games);
}

// --- Révisions -----------------------------------------------------------------
async function revision() {
  const { queue } = await buildSrsQueue();
  if (!queue.length) {
    const set = S.getSettings();
    main.replaceChildren(h('div.card.empty',
      h('div', { html: blossom(1, 96, '') }),
      h('h2', 'Rien à réviser pour l’instant'),
      h('p', 'Tes cartes reviendront quand ce sera le bon moment. En attendant, tu peux t’entraîner sans toucher à ton planning.'),
      h('div.actions',
        (set.grammarLevels.length ? set.grammarLevels : ['N5']).map(lv => h('a.btn', { href: `#/entrainement/${lv}` }, `Entraînement ${lv}`)),
        h('a.btn', { href: '#/reglages' }, 'Plus de nouvelles cartes par jour'))));
    return;
  }
  runSession(main, { mode: 'srs', queue, onDone: refreshBadge });
}

async function practice(lv, lesson) {
  const [grammar, sents] = await Promise.all([D.grammar(), D.sentences()]);
  const byId = new Map(grammar.map(g => [g.id, g]));
  let pool = sents.filter(s => s.lv === lv && (!lesson || byId.get(s.g).le === Number(lesson)));
  if (!pool.length) {
    main.replaceChildren(h('div.card.empty', h('h2', 'Pas encore de phrases ici'),
      h('p', 'Ce niveau n’a pas encore de phrases à trous. Les points de grammaire restent révisables par leur sens.'),
      h('a.btn', { href: `#/grammaire/${lv}` }, 'Retour à la grammaire')));
    return;
  }
  const items = practiceItems(pool, byId).slice(0, 15);
  runSession(main, { mode: 'practice', items });
}

// --- Grammaire --------------------------------------------------------------------
const statusOf = key => {
  const c = S.getCard(key);
  if (!c) return { cls: 'new', label: 'Pas encore vu' };
  if (c.i >= S.MATURE) return { cls: 'bloom', label: 'En fleur' };
  return { cls: 'learning', label: 'En cours' };
};

let lastGrammarLevel = 'N5';
async function grammarList(lv, params) {
  lv = lv || lastGrammarLevel; lastGrammarLevel = lv;
  const [grammar, sents] = await Promise.all([D.grammar(), D.sentences()]);
  const counts = new Map();
  sents.forEach(s => counts.set(s.g, (counts.get(s.g) || 0) + 1));
  const furi = furiFor(lv);

  const tabs = h('div.tabs', { role: 'tablist', 'aria-label': 'Niveau' },
    [...D.LEVELS, 'kansai', 'extra'].map(l => h('a.tab', { href: `#/grammaire/${l}`, role: 'tab', 'aria-selected': String(l === lv), class: l === lv ? 'tab active' : 'tab' }, D.LEVEL_NAMES[l])));
  const search = h('input.search', { type: 'search', placeholder: 'Chercher un point (ex. ても, devoir, しか)…', 'aria-label': 'Chercher un point de grammaire', value: params?.get('q') || '' });

  const listEl = h('div.lessons');
  const render = () => {
    const q = search.value.trim().toLowerCase();
    const pts = grammar.filter(g => q ? (g.t + g.f + g.s).toLowerCase().includes(q) : g.lv === lv);
    const lessons = new Map();
    pts.forEach(g => { const k = q ? g.lv : g.le; if (!lessons.has(k)) lessons.set(k, []); lessons.get(k).push(g); });
    listEl.replaceChildren(...[...lessons].map(([le, items]) => {
      const withSent = items.some(g => counts.get(g.id));
      const keys = items.map(g => `g:${g.id}`);
      const notAdded = keys.filter(k => !S.getCard(k)).length;
      return h('section.lesson',
        h('header.lesson-head',
          h('h2', q ? D.LEVEL_NAMES[le] : `Leçon ${le}`), h('span.lesson-count', `${items.length} points`),
          !q && h('div.lesson-actions',
            withSent && h('a.btn.small', { href: `#/entrainement/${lv}/${le}` }, 'S’entraîner'),
            notAdded ? h('button.btn.small', { onclick: e => {
              keys.forEach(S.addCard); toast(`${notAdded} point(s) ajouté(s) à tes révisions`); e.target.remove(); refreshBadge(); render();
            } }, 'Ajouter la leçon') : h('span.small', 'Leçon dans tes révisions'))),
        h('ul.points', items.map(g => {
          const st = statusOf(`g:${g.id}`);
          const n = counts.get(g.id) || 0;
          return h('li', h('a.point', { href: `#/point/${g.id}` },
            h('span.dot', { class: `dot ${st.cls}`, title: st.label }, h('span.sr', st.label)),
            h('span.point-title', { lang: 'ja', html: ruby(D.gramLabel(g), furi) }),
            h('span.point-meaning', g.s),
            n ? h('span.point-n', `${n} phrase${n > 1 ? 's' : ''}`) : null));
        })));
    }));
    if (!pts.length) listEl.replaceChildren(h('p.empty-line', 'Aucun point ne correspond. Essaie un autre mot, en français ou en japonais.'));
  };
  search.addEventListener('input', render);
  render();
  main.replaceChildren(
    h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja' }, '文法'), 'Grammaire'),
      h('p.section-note', `${grammar.length} points du N5 au N1. Ajoute une leçon à tes révisions ou ouvre un point pour voir ses exemples.`)),
    tabs, search, listEl);
}

async function grammarPoint(id) {
  const grammar = await D.grammar();
  const g = await D.grammarById(id);
  if (!g) throw new Error('Ce point de grammaire n’existe pas.');
  const sents = await D.sentencesFor(g.id);
  const key = `g:${g.id}`;
  const furi = furiFor(g.lv);
  const sameLv = grammar.filter(x => x.lv === g.lv);
  const pos = sameLv.indexOf(g);
  const prev = sameLv[pos - 1], next = sameLv[pos + 1];

  const actionBox = h('div.point-actions');
  const renderActions = () => {
    const c = S.getCard(key);
    const st = statusOf(key);
    actionBox.replaceChildren(...[
      h('span', { class: `status ${st.cls}` }, st.label),
      c ? h('span.small', c.s ? `Prochaine révision ${S.describeInterval(c)}` : 'Arrive dans ta prochaine séance') : null,
      c ? h('button.btn.small.ghost', { onclick: () => { S.removeCard(key); renderActions(); refreshBadge(); toast('Retiré de tes révisions'); } }, 'Retirer des révisions')
        : h('button.btn.primary', { onclick: () => { S.addCard(key); renderActions(); refreshBadge(); toast('Ajouté à tes révisions'); } }, 'Ajouter à mes révisions')].filter(Boolean));
  };
  renderActions();

  main.replaceChildren(h('article.point-page',
    h('a.back', { href: `#/grammaire/${g.lv}` }, `Grammaire ${D.LEVEL_NAMES[g.lv]} · leçon ${g.le}`),
    h('h1.point-big', { lang: 'ja', html: ruby(D.gramLabel(g), true) }),
    h('p.point-sense', g.s),
    actionBox,
    h('section.examples',
      h('h2', 'Exemples'),
      sents.length
        ? h('ol.example-list', sents.map(s => h('li',
            h('p.jp', { lang: 'ja', html: sentenceHTML(s, { fill: true, furi }) }),
            h('p.fr', s.fr))))
        : h('p.section-note', 'Pas encore de phrase pour ce point : il sera révisé par son sens.')),
    h('nav.point-nav', { 'aria-label': 'Points voisins' },
      prev ? h('a', { href: `#/point/${prev.id}`, rel: 'prev' }, h('small', 'Précédent'), h('span', { lang: 'ja' }, prev.t)) : h('span'),
      next ? h('a', { href: `#/point/${next.id}`, rel: 'next' }, h('small', 'Suivant'), h('span', { lang: 'ja' }, next.t)) : h('span'))));
}

// --- Vocabulaire ----------------------------------------------------------------
async function vocabList(lv = 'N5') {
  const list = await D.vocab(lv);
  const units = new Map();
  list.forEach(v => { if (!units.has(v.unit)) units.set(v.unit, []); units.get(v.unit).push(v); });
  const cards = S.allCards();
  const tabs = h('div.tabs', { role: 'tablist', 'aria-label': 'Niveau' },
    D.LEVELS.map(l => h('a', { href: `#/vocabulaire/${l}`, role: 'tab', 'aria-selected': String(l === lv), class: l === lv ? 'tab active' : 'tab' }, l)));
  main.replaceChildren(
    h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja' }, '単語'), 'Vocabulaire'),
      h('p.section-note', `${list.length} mots en ${lv}, rangés par unité.`, (lv === 'N2' || lv === 'N1') ? ' Les sens de ce niveau sont en anglais pour le moment.' : '')),
    tabs,
    h('ul.units', [...units].map(([u, words], i) => {
      const seen = words.filter(w => cards[D.vocabKey(w)]).length;
      return h('li', h('a.unit', { href: `#/vocabulaire/${lv}/${u}` },
        h('span.unit-n', `Unité ${i + 1}`),
        h('span.unit-sample', { lang: 'ja' }, words.slice(0, 4).map(w => w.w).join('・')),
        h('span.unit-bar', { style: { '--v': seen / words.length } }),
        h('span.small', `${seen}/${words.length}`)));
    })));
}

async function vocabUnit(lv, unit) {
  const list = (await D.vocab(lv)).filter(v => v.unit === Number(unit));
  const all = await D.vocab(lv);
  const unitIds = [...new Set(all.map(v => v.unit))];
  const nth = unitIds.indexOf(Number(unit)) + 1;
  const keys = list.map(D.vocabKey);
  const btn = h('button.btn.primary', { onclick: () => {
    let n = 0; keys.forEach(k => { if (S.addCard(k)) n++; });
    toast(n ? `${n} mot(s) ajouté(s) à tes révisions` : 'Toute l’unité est déjà dans tes révisions');
    refreshBadge(); vocabUnit(lv, unit);
  } }, 'Ajouter l’unité à mes révisions');
  main.replaceChildren(
    h('a.back', { href: `#/vocabulaire/${lv}` }, `Vocabulaire ${lv}`),
    h('header.page-head', h('h1', `Unité ${nth}`), h('p.section-note', `${list.length} mots`)),
    h('div.actions.left', btn, h('a.btn', { href: `#/jeux/hanabira?lv=${lv}&unit=${unit}` }, 'Jouer à Hanabira avec ces mots')),
    h('table.vocab-table',
      h('thead', h('tr', h('th', { scope: 'col' }, 'Mot'), h('th', { scope: 'col' }, 'Sens'), h('th', { scope: 'col' }, h('span.sr', 'Statut')))),
      h('tbody', list.map(v => {
        const st = statusOf(D.vocabKey(v));
        return h('tr', h('td.vw', { lang: 'ja', html: ruby(v.f || v.w, true) }), h('td', v.m),
          h('td', h('span', { class: `dot ${st.cls}`, title: st.label }, h('span.sr', st.label))));
      }))));
}

// --- Jeux ---------------------------------------------------------------------
function gamesHub() {
  const best = store.get('sakura.games.v1', {});
  main.replaceChildren(
    h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja' }, '遊び'), 'Jeux'),
      h('p.section-note', 'Pour apprendre sans en avoir l’air. Les jeux ne touchent pas à ton planning de révision.')),
    h('ul.game-list', Object.entries(GAMES).map(([k, g]) => h('li', h('a', { href: `#/jeux/${k}`, class: `game-card game-${k}` },
      h('span.game-jp', { lang: 'ja' }, g.jp), h('strong', g.name), h('span', g.desc),
      best[k] ? h('span.small', `Record : ${best[k]}`) : null)))));
}

async function game(name, params) {
  const g = GAMES[name];
  if (!g) { location.hash = '#/jeux'; return; }
  main.classList.add('wide');
  const mod = await import(g.file);
  await mod.default(main, { params, settings: S.getSettings(), saveBest: score => {
    const best = store.get('sakura.games.v1', {});
    const isRecord = !best[name] || score > best[name];
    if (isRecord) { best[name] = score; store.set('sakura.games.v1', best); }
    S.recordGame();
    return isRecord;
  } });
}

// --- Réglages --------------------------------------------------------------------
function settingsPage() {
  const s = S.getSettings();
  const levelBoxes = (field, label) => h('fieldset',
    h('legend', label),
    h('div.checks', D.LEVELS.map(lv => h('label.check',
      h('input', { type: 'checkbox', checked: s[field].includes(lv), onchange: e => {
        const cur = new Set(S.getSettings()[field]);
        e.target.checked ? cur.add(lv) : cur.delete(lv);
        S.setSettings({ [field]: D.LEVELS.filter(l => cur.has(l)) }); toast('Réglage enregistré');
      } }), h('span', lv)))));
  const num = (field, label, max) => h('label.field', h('span', label),
    h('input', { type: 'number', min: 0, max, value: s[field], onchange: e => {
      S.setSettings({ [field]: Math.max(0, Math.min(max, Number(e.target.value) || 0)) }); toast('Réglage enregistré');
    } }));
  const furi = h('fieldset', h('legend', 'Furigana'),
    h('div.checks', [['auto', 'N5 et N4 seulement'], ['always', 'Toujours'], ['never', 'Jamais']].map(([v, l]) =>
      h('label.check', h('input', { type: 'radio', name: 'furi', checked: s.furigana === v, onchange: () => { S.setSettings({ furigana: v }); toast('Réglage enregistré'); } }), h('span', l)))));
  const fileIn = h('input', { type: 'file', accept: 'application/json', hidden: true, onchange: async e => {
    try { S.importAll(await e.target.files[0].text()); toast('Progression importée'); settingsPage(); }
    catch (err) { toast(err.message); }
  } });
  main.replaceChildren(
    h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja' }, '設定'), 'Réglages')),
    h('div.card.settings',
      h('h2', 'Nouvelles cartes'),
      levelBoxes('grammarLevels', 'Niveaux de grammaire à découvrir'),
      levelBoxes('vocabLevels', 'Niveaux de vocabulaire à découvrir'),
      h('div.fields', num('newGrammar', 'Nouveaux points de grammaire par jour', 50), num('newVocab', 'Nouveaux mots par jour', 100)),
      h('h2', 'Affichage'), furi,
      h('h2', 'Ta progression'),
      h('p.section-note', 'Elle est enregistrée dans ce navigateur. Exporte-la pour la garder ou la passer sur un autre appareil.'),
      h('div.actions.left',
        h('button.btn', { onclick: () => {
          const a = h('a', { href: URL.createObjectURL(new Blob([S.exportAll()], { type: 'application/json' })), download: `sakura-no-bunpou-${new Date().toISOString().slice(0, 10)}.json` });
          a.click(); URL.revokeObjectURL(a.href);
        } }, 'Exporter'),
        h('button.btn', { onclick: () => fileIn.click() }, 'Importer'), fileIn,
        h('button.btn.ghost.danger', { onclick: e => {
          const btn = e.currentTarget;
          if (btn.dataset.armed) { S.resetAll(); toast('Progression effacée'); refreshBadge(); btn.textContent = 'Tout effacer'; delete btn.dataset.armed; return; }
          btn.dataset.armed = '1'; btn.textContent = 'Confirmer : tout effacer définitivement';
          setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = 'Tout effacer'; } }, 5000);
        } }, 'Tout effacer'))));
}

route();
