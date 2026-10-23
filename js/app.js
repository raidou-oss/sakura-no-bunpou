// 桜の文法 — routeur et pages principales.
import { h, $, $$, ruby, blossom, toast, reducedMotion, shuffle, store, stack, jr } from './util.js?v=20261023200145';
import * as D from './data.js?v=20261023200145';
import * as S from './srs.js?v=20261023200145';
import { buildSrsQueue, runSession, countDue, sentenceHTML, practiceItems, wordAudio, gramAudio, sentenceText, vocabExamplesEl, sentenceLine, regSwitch } from './review.js?v=20261023200145';
import { speakBtn, supported as voiceOK, japaneseVoices, refreshVoice, speak } from './voice.js?v=20261023200145';
import { levelMastery, computeRank, rankLabel, rankTitle, RANK_NAMES, lessonProgress, lessonMastery, progressByLevel, isMastered, pct as toPct } from './level.js?v=20261023200145';
import * as C from './cloud.js?v=20261023200145';
import { wallpaperSVG, sectionWallpaperSVG, mountWallpaper } from './wallpaper.js?v=20261023200145';
import './dyn.js?v=20261023200145';
import { keigoGuide, keigoBanner } from './keigo.js?v=20261023200145';
import { sweep, enter, moveIndicator, bootSweep } from './transition.js?v=20261023200145';
import { play, setVolume } from './sfx.js?v=20261023200145';
import { mountDaily, dailyPanel, mountSideExtras } from './daily.js?v=20261023200145';
import { celebrate, verdict } from './celebrate.js?v=20261023200145';
import { lessonsHub, lessonPage } from './lessons.js?v=20261023200145';
import { kanaPage, kanaQuiz } from './kana.js?v=20261023200145';
import { initGloss } from './gloss.js?v=20261023200145';
import { initLinks } from './links.js?v=20261023200145';
import { streakBadge, weekStrip } from './aura.js?v=20261023200145';
import { initLevelUp } from './levelup.js?v=20261023200145';
import { confidentsPage } from './confidents.js?v=20261023200145';
import { initTilt } from './tilt.js?v=20261023200145';
import { profilePage, communityPage, accountPage, portalPage, rankBlock, navAccount, gauge, mountOnline } from './social.js?v=20261023200145';

const main = $('#main');
import { GAMES } from './gamelist.js?v=20261023200145';

const furiFor = lv => {
  const f = S.getSettings().furigana;
  return f === 'always' || (f === 'auto' && (lv === 'N5' || lv === 'N4' || lv === 'keigo'));
};

// --- Routeur --------------------------------------------------------------------
const routes = [
  [/^\/?$/, home],
  [/^\/revision$/, revision],
  [/^\/entrainement\/(N[1-5]|keigo|kansai|extra)(?:\/(\d+))?$/, practice],
  [/^\/grammaire(?:\/(N[1-5]|keigo|kansai|extra))?$/, grammarList],
  [/^\/keigo$/, () => keigoGuide(main)],
  [/^\/point\/(\d+)$/, grammarPoint],
  [/^\/vocabulaire(?:\/(N[1-5]))?$/, vocabList],
  [/^\/vocabulaire\/(N[1-5])\/(\d+)$/, vocabUnit],
  [/^\/jeux$/, gamesHub],
  [/^\/jeux\/(\w+)$/, game],
  [/^\/reglages$/, settingsPage],
  [/^\/profil(?:\/([0-9a-f-]{36}))?$/, id => profilePage(main, id)],
  [/^\/communaute$/, () => communityPage(main)],
  [/^\/confidents$/, () => confidentsPage(main)],
  [/^\/compte$/, () => accountPage(main)],
  [/^\/lecons(?:\/(N[1-5]|keigo))?$/, lv => lessonsHub(main, lv)],
  [/^\/kana(?:\/(hira|kata))?$/, s => kanaPage(main, s)],
  [/^\/kana-quiz(?:\/(hira|kata|both))?$/, s => kanaQuiz(main, s)],
  [/^\/lecon\/(N[1-5]|keigo)\/([gvmb])\/(\d+)$/, (lv, kind, n, params) => lessonPage(main, lv, kind, n, { refreshBadge, params })],
];

let prevPath = '';
async function route() {
  // Retour d'un lien e-mail (confirmation, mot de passe) : Supabase lit le jeton avant le routage
  if (/access_token|error_description|type=recovery/.test(location.hash)) return;
  // Portail : tant qu'on n'est pas connecté, on ne voit que l'écran de connexion
  const locked = C.enabled && !C.currentUser() && !C.isRecovery();
  document.body.classList.toggle('portal-mode', locked);
  if (locked) setWallpaper(true);
  if (locked) { main.classList.remove('wide'); portalPage(main); enter(); window.scrollTo(0, 0); return; }
  const path = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
  const [p, query] = path.split('?');
  for (const [re, view] of routes) {
    const m = p.match(re);
    if (m) {
      const section = p.split('/')[1] || 'home';
      $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === ({ point: 'grammaire', entrainement: 'grammaire', compte: 'profil', lecon: 'lecons', 'kana-quiz': 'kana' }[section] || section)));
      $$('.nav a').forEach(a => a.classList.contains('active') ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
      try {
        const kanji = { home: '庭', revision: '復習', entrainement: '練習', grammaire: '文法', point: '文法', vocabulaire: '単語', jeux: '遊び', communaute: '仲間', profil: '自分', compte: '自分', reglages: '設定', lecons: '授業', lecon: '授業', kana: '仮名', 'kana-quiz': '仮名', confidents: '絆' }[section] || '桜';
        moveIndicator();
        // Changer de niveau dans une même section (onglets N5…N1) : pas de balayage, juste un fondu doux
        const LV_PAGE = /^\/(grammaire|vocabulaire|lecons)(?:\/(?:N[1-5]|keigo|kansai|extra))?$/;
        const soft = LV_PAGE.test(p) && LV_PAGE.test(prevPath) && p.split('/')[1] === prevPath.split('/')[1];
        prevPath = p;
        await sweep(async () => {
          main.classList.remove('wide');
          setWallpaper(false);
          await view(...m.slice(1), new URLSearchParams(query));
          if (!soft) window.scrollTo(0, 0);
        }, { label: kanji, section: p, soft });
      } catch (err) {
        console.error(err);
        main.replaceChildren(h('div.card.error', h('h2', 'Impossible d’afficher cette page'), h('p', err.message),
          h('p.small', 'Si tu as ouvert le fichier directement, lance un petit serveur local (voir le README).')));
      }
      main.focus({ preventScroll: true });
      refreshBadge();
      return;
    }
  }
  location.hash = '#/';
}
window.addEventListener('hashchange', route);

// Fond de page : celui du portail (voilé) sur l'accueil, un fond dédié par section ailleurs
const WP_SECTION = { lecons: 'grammaire', lecon: 'grammaire', revision: 'revision', entrainement: 'revision', grammaire: 'grammaire', point: 'grammaire', vocabulaire: 'vocabulaire',
  jeux: 'jeux', communaute: 'communaute', profil: 'profil', compte: 'profil', reglages: 'reglages', kana: 'vocabulaire', 'kana-quiz': 'vocabulaire', confidents: 'communaute' };
function setWallpaper(locked) {
  let wrap = $('#page-wallpaper');
  if (locked) { wrap?.remove(); return; }       // le portail a le sien (mêmes id de dégradés)
  const section = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  const kind = section ? WP_SECTION[section] || 'reglages' : 'home';
  if (!wrap) { wrap = h('div.wallpaper-wrap.soft#page-wallpaper', { 'aria-hidden': 'true' }); document.body.prepend(wrap); }
  if (wrap.dataset.kind !== kind) {
    wrap.dataset.kind = kind;
    mountWallpaper(wrap, kind === 'home' ? wallpaperSVG() : sectionWallpaperSVG(kind));
    wrap.classList.remove('fade-in'); void wrap.offsetWidth; wrap.classList.add('fade-in');
  }
  document.body.classList.toggle('wp-home', kind === 'home');
  document.body.classList.add('wp-on');
}

async function refreshBadge() {
  const n = await countDue();
  const b = $('#due-badge');
  b.hidden = n === 0; b.textContent = n > 99 ? '99+' : n;
  navAccount();
  mountDaily();
  mountSideExtras();
  requestAnimationFrame(moveIndicator);
}

// --- Accueil ----------------------------------------------------------------------
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

// Raccourcis de l'accueil : reprendre là où on s'est arrêté, plus deux portes d'entrée utiles
async function resumeRow() {
  const last = S.getExtra('last', null);
  const chip = (href, ico, small, strong) => h('a.resume-chip', { href }, h('span.resume-ico', { lang: 'ja', 'aria-hidden': 'true' }, ico), h('span', h('small', small), h('strong', { lang: /[぀-ヿ一-鿿]/.test(strong) ? 'ja' : null }, strong)));
  const lv = S.getSettings().grammarLevels[0] || 'N5';
  const games = Object.entries(GAMES);
  const [gk, g] = games[new Date().getDate() % games.length];
  return h('div.resume',
    last ? chip(`#/point/${last.id}`, '続', `Reprendre · ${last.lv}`, last.t)
      : chip(`#/grammaire/${lv}`, '始', 'Commencer', `Grammaire ${lv}`),
    chip(`#/lecons/${lv}`, '授', 'Leçons guidées', `Grammaire + vocabulaire`),
    chip(`#/jeux/${gk}`, g.glyph, 'Jeu du jour', g.name),
    chip('#/kana', '仮', 'Partir de zéro', 'Hiragana · Katakana'));
}

async function home() {
  const [{ queue, dueCount }, mastery] = await Promise.all([buildSrsQueue(), levelMastery()]);
  const rank = await computeRank(mastery);
  const streak = S.streak();
  const days = S.lastDays(7);
  const maxRev = Math.max(10, ...days.map(d => d.rev));
  const set = S.getSettings();

  const counter = (n, label, cls) => h(`div.counter.${cls}`, h('span.counter-n', n), h('span.counter-label', label));
  const hero = h('section.hero',
    petalsLayer(),
    h('div.hero-copy',
      h('h1.hero-title', { lang: 'ja', 'aria-label': '桜の文法', html: '<span><ruby>桜<rt>さくら</rt></ruby></span><span>の</span><span><ruby>文法<rt>ぶんぽう</rt></ruby></span>' }),
      h('p.hero-lead', 'La grammaire japonaise du N5 au N1, une phrase à la fois.'),
      await resumeRow()),
    h('div.today.glass',
      rankBlock(rank),
      h('p.today-title', 'Aujourd’hui'),
      queue.length
        ? h('div.counters', counter(dueCount, 'à réviser', 'due'))
        : h('p.today-done', 'Tout est révisé. Apprends du nouveau dans les Leçons, ou entraîne-toi librement.'),
      queue.length
        ? h('a.btn.primary.big.wide', { href: '#/revision' }, 'Commencer la révision')
        : h('a.btn.primary.big.wide', { href: '#/lecons' }, 'Apprendre du nouveau (Leçons)'),
      h('div.streak',
        h('span.streak-text', streakBadge(streak, { big: true }),
          h('span', streak ? (streak > 1 ? ' jours d’affilée' : ' jour d’affilée') : ' Ta série commence aujourd’hui'),
          h('small.streak-hint', (days[days.length - 1]?.rev || days[days.length - 1]?.les) ? 'Série validée aujourd’hui ✓' : 'Fais une révision ou une leçon aujourd’hui pour l’entretenir')),
        weekStrip())));

  const garden = h('section.garden',
    h('div.section-head', h('h2', 'Ton jardin'),
      h('p.section-note', 'Chaque fleur s’ouvre à mesure que les points de grammaire de son niveau s’installent dans ta mémoire.')),
    h('ul.levels', D.LEVELS.map(lv => {
      const m = mastery[lv];
      const pct = Math.round(m.open * 100);
      return h('li', h('a.level.glass', { href: `#/grammaire/${lv}` },
        h('span.ring', { style: { '--p': pct } },
          h('span.level-flower', { html: blossom(m.open, 64, `${lv} : ${pct} %`) })),
        h('span.level-name', lv), h('span.level-jp', { lang: 'ja', html: jr(D.LEVEL_JP[lv]) }),
        h('span.level-stat', `Gram. ${toPct(m.grammar)} % · Voc. ${toPct(m.vocab)} %`), m.passed ? h('span.level-ok', 'Validé') : null));
    })));

  const games = h('section.games-teaser',
    h('div.section-head', h('h2', 'Pause jeux')),
    h('ul.game-grid', Object.entries(GAMES).map(([k, gm]) => h('li', { class: k === 'cafe' ? 'featured' : null },
      h('a.game-tile.glass', { href: `#/jeux/${k}`, 'data-glyph': gm.glyph },
        h('span.game-emblem', { lang: 'ja', 'aria-hidden': 'true' }, gm.glyph),
        h('span.game-tile-text',
          h('span.game-tile-jp', { lang: 'ja', html: jr(gm.jp) }),
          h('strong', gm.name),
          h('span.game-tile-desc', k === 'cafe' ? gm.desc : gm.short)),
        h('span.play-chip', 'Jouer'))))));

  // Sur téléphone, la barre latérale n'existe pas : le panneau du jour se place sous l'en-tête
  main.replaceChildren(hero, h('div.daily-mobile', await dailyPanel({ compact: true })), garden, games);
}

// --- Révisions -----------------------------------------------------------------
async function revision() {
  const { queue } = await buildSrsQueue();
  if (!queue.length) {
    const set = S.getSettings();
    main.replaceChildren(h('div.card.empty',
      h('div', { html: blossom(1, 96, '') }),
      h('h2', 'Rien à réviser pour l’instant'),
      h('p', 'Les révisions reprennent uniquement ce que tu as déjà appris, au bon moment. Pour découvrir du nouveau, passe par les Leçons.'),
      h('div.actions',
        (set.grammarLevels.length ? set.grammarLevels : ['N5']).map(lv => h('a.btn', { href: `#/entrainement/${lv}` }, `Entraînement ${lv}`)),
        h('a.btn.primary', { href: '#/lecons' }, 'Aller aux Leçons'))));
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
  const [lessonP, progress, lessonM] = D.LEVELS.includes(lv) ? await Promise.all([lessonProgress(lv), progressByLevel(), lessonMastery(lv)]) : [new Map(), null, new Map()];
  const sectionGauge = progress ? h('section.section-progress.glass',
    gauge(progress[lv].grammar, `Progression grammaire ${lv}`, { kind: 'g', mark: 0.55, mastery: progress[lv].gMastery }),
    h('p.small', `${progress[lv].gSeen} points vus sur ${progress[lv].gTotal} · ${progress[lv].gBloom} en fleur (révisés à 21 jours ou plus). Le trait marque l’objectif de 55 % pour valider le niveau.`)) : null;

  const tabs = h('div.tabs', { role: 'tablist', 'aria-label': 'Niveau' },
    [...D.LEVELS, 'keigo', 'kansai', 'extra'].map(l => h('a.tab', { href: `#/grammaire/${l}`, role: 'tab', 'aria-selected': String(l === lv), class: l === lv ? 'tab active' : 'tab' }, D.LEVEL_NAMES[l])));
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
          !q && lessonP.has(le) ? h('span.lesson-gauge', { title: `Leçon ${le} : ${toPct(lessonP.get(le))} % maîtrisée` },
            h('span.mini-gauge', h('span', { style: { width: `${toPct(lessonP.get(le))}%` } }), lessonM.get(le) ? h('i.gauge-glow', { style: { width: `${toPct(lessonM.get(le))}%` } }) : null), h('span.small', `${toPct(lessonP.get(le))} %`)) : null,
          !q && h('div.lesson-actions',
            D.LESSON_LEVELS.includes(lv) && h('a.btn.small.primary', { href: `#/lecon/${lv}/g/${le}` }, 'Leçon'),
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
    h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('文法') }), 'Grammaire'),
      h('p.section-note', `${grammar.length} points du N5 au N1. Ajoute une leçon à tes révisions ou ouvre un point pour voir ses exemples.`)),
    regSwitch(() => toast('Les exemples et exercices suivront ce style')),
    tabs, ...(lv === 'keigo' ? [keigoBanner()] : []), ...(sectionGauge ? [sectionGauge] : []), search, listEl);
}

async function grammarPoint(id) {
  const grammar = await D.grammar();
  const g = await D.grammarById(id);
  if (!g) throw new Error('Ce point de grammaire n’existe pas.');
  const sents = await D.sentencesFor(g.id);
  const key = `g:${g.id}`;
  S.setExtra('last', { id: g.id, t: g.t, lv: D.LEVEL_NAMES[g.lv] });
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

  const exBox = h('div.examples-body');
  const renderEx = () => exBox.replaceChildren(sents.length
    ? h('ol.example-list', sents.map(s => h('li', sentenceLine(s, { furi }), h('p.fr', s.fr))))
    : h('p.section-note', 'Pas encore de phrase pour ce point : il sera révisé par son sens.'));
  renderEx();
  main.replaceChildren(h('article.point-page',
    h('a.back', { href: `#/grammaire/${g.lv}` }, `Grammaire ${D.LEVEL_NAMES[g.lv]} · leçon ${g.le}`),
    h('h1.point-big', { lang: 'ja', html: ruby(D.gramLabel(g), true) }),
    gramAudio(g),
    h('p.point-sense', g.s),
    g.x ? h('div.point-x', h('p.kicker', 'Explication'), h('p', { html: jr(g.x) })) : null,
    actionBox,
    h('section.examples',
      h('h2', 'Exemples'),
      sents.length ? regSwitch(renderEx) : null,
      exBox),
    h('nav.point-nav', { 'aria-label': 'Points voisins' },
      prev ? h('a', { href: `#/point/${prev.id}`, rel: 'prev' }, h('small', 'Précédent'), h('span', { lang: 'ja', html: ruby(D.gramLabel(prev), true) })) : h('span'),
      next ? h('a', { href: `#/point/${next.id}`, rel: 'next' }, h('small', 'Suivant'), h('span', { lang: 'ja', html: ruby(D.gramLabel(next), true) })) : h('span'))));
}

// --- Vocabulaire ----------------------------------------------------------------
async function vocabList(lv = 'N5') {
  const list = await D.vocab(lv);
  const units = new Map();
  list.forEach(v => { if (!units.has(v.unit)) units.set(v.unit, []); units.get(v.unit).push(v); });
  const cards = S.allCards();
  const progress = await progressByLevel();
  const tabs = h('div.tabs', { role: 'tablist', 'aria-label': 'Niveau' },
    D.LEVELS.map(l => h('a', { href: `#/vocabulaire/${l}`, role: 'tab', 'aria-selected': String(l === lv), class: l === lv ? 'tab active' : 'tab' }, l)));
  main.replaceChildren(
    h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('単語') }), 'Vocabulaire'),
      h('p.section-note', `${list.length} mots en ${lv}, rangés par unité.`)),
    tabs,
    h('section.section-progress.glass',
      gauge(progress[lv].vocab, `Progression vocabulaire ${lv}`, { kind: 'v', mark: 0.45, mastery: progress[lv].vMastery }),
      h('p.small', `${progress[lv].vSeen} mots vus sur ${progress[lv].vTotal} · ${progress[lv].vBloom} en fleur. Objectif 45 % pour valider le niveau.`)),
    h('ul.units', [...units].map(([u, words], i) => {
      const seen = words.filter(w => cards[D.vocabKey(w)]).length;
      return h('li', h('a.unit', { href: `#/vocabulaire/${lv}/${u}` },
        h('span.unit-n', `Unité ${i + 1}`),
        h('span.unit-sample', { lang: 'ja', html: words.slice(0, 4).map(w => ruby(w.f || w.w, true)).join('・') }),
        h('span.unit-bar', { style: { '--v': seen / words.length } },
          words.some(w => isMastered(cards[D.vocabKey(w)])) ? h('i.gauge-glow', { style: { width: `${toPct(words.filter(w => isMastered(cards[D.vocabKey(w)])).length / words.length)}%` } }) : null),
        h('span.small', `${seen}/${words.length}`)));
    })));
}

async function vocabUnit(lv, unit) {
  const list = (await D.vocab(lv)).filter(v => v.unit === Number(unit));
  const all = await D.vocab(lv);
  const unitIds = [...new Set(all.map(v => v.unit))];
  const nth = unitIds.indexOf(Number(unit)) + 1;
  const keys = list.map(D.vocabKey);
  const btn = h('button.btn', { onclick: () => {
    let n = 0; keys.forEach(k => { if (S.addCard(k)) n++; });
    toast(n ? `${n} mot(s) ajouté(s) à tes révisions` : 'Toute l’unité est déjà dans tes révisions');
    refreshBadge(); vocabUnit(lv, unit);
  } }, 'Ajouter l’unité à mes révisions');
  main.replaceChildren(
    h('a.back', { href: `#/vocabulaire/${lv}` }, `Vocabulaire ${lv}`),
    h('header.page-head', h('h1', `Unité ${nth}`), h('p.section-note', `${list.length} mots`)),
    h('div.actions.left', h('a.btn.primary', { href: `#/lecon/${lv}/v/1?unit=${unit}` }, 'Leçon guidée'), btn, h('a.btn', { href: `#/jeux/hanabira?lv=${lv}&unit=${unit}` }, 'Jouer à Hanabira avec ces mots')),
    h('div.table-wrap', h('table.vocab-table',
      h('thead', h('tr', h('th', { scope: 'col' }, 'Mot'), h('th', { scope: 'col' }, 'Sens'), h('th', { scope: 'col' }, h('span.sr', 'Statut')))),
      h('tbody', list.map(v => {
        const st = statusOf(D.vocabKey(v));
        return h('tr', h('td.vw', h('span', { lang: 'ja', html: ruby(v.f || v.w, true) }), wordAudio(v, { compact: true })), h('td', h('p.vm', v.m), vocabExamplesEl(v, { max: 1, compact: true })),
          h('td', h('span', { class: `dot ${st.cls}`, title: st.label }, h('span.sr', st.label))));
      })))));
}

// --- Jeux ---------------------------------------------------------------------
function gamesHub() {
  const best = S.getExtra('games', {});
  main.replaceChildren(
    h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('遊び') }), 'Jeux'),
      h('p.section-note', 'Pour apprendre sans en avoir l’air. Les jeux ne touchent pas à ton planning de révision.')),
    h('ul.game-grid.hub', Object.entries(GAMES).map(([k, g]) => h('li', { class: k === 'cafe' ? 'featured' : null },
      h('a.game-tile.glass', { href: `#/jeux/${k}`, 'data-glyph': g.glyph },
        h('span.game-emblem', { lang: 'ja', 'aria-hidden': 'true' }, g.glyph),
        h('span.game-tile-text',
          h('span.game-tile-jp', { lang: 'ja', html: jr(g.jp) }),
          h('strong', g.name),
          h('span.game-tile-desc', g.desc),
          best[k] ? h('span.record', `Record : ${best[k]}`) : null),
        h('span.play-chip', 'Jouer'))))));
}

async function game(name, params) {
  const g = GAMES[name];
  if (!g) { location.hash = '#/jeux'; return; }
  main.classList.add('wide');
  const mod = await import(g.file);
  await mod.default(main, { params, settings: S.getSettings(), saveBest: (score, variant = null) => {
    const best = { ...S.getExtra('games', {}) };
    const isRecord = !best[name] || score > best[name];
    if (isRecord) best[name] = score;
    S.setExtra('games', best);
    // Records détaillés (par niveau, par unité de Hanabira…) affichés sur le profil
    if (variant) {
      const det = { ...S.getExtra('gameDetail', {}) };
      const g = { ...(det[name] || {}) };
      if (!g[variant] || score > g[variant]) g[variant] = score;
      det[name] = g; S.setExtra('gameDetail', det);
    }
    S.recordGame();
    if (score > 0) celebrate({ ...verdict(1, { record: isRecord }), ...(isRecord ? {} : { title: '勝利！', sub: 'Partie gagnée !' }), detail: `Score : ${score}` });
    return isRecord;
  } });
}

// --- Réglages --------------------------------------------------------------------
/** Choix de la voix (les plus naturelles en premier), vitesse et timbre */
function voiceSettings(s) {
  const box = h('div.voice-settings');
  const SAMPLE = 'こんにちは。今日（きょう）もいっしょに、日本語（にほんご）を勉強（べんきょう）しましょう。';
  const render = () => {
    const voices = japaneseVoices();
    const current = refreshVoice();
    const select = h('select.voice-select', { 'aria-label': 'Voix japonaise', onchange: e => { S.setSettings({ voiceName: e.target.value }); refreshVoice(); speak(SAMPLE); } },
      voices.map(v => h('option', { value: v.name, selected: current && v.name === current.name },
        `${v.name}${/Natural|Neural|Online|Premium|Enhanced/i.test(v.name) ? ' ★ naturelle' : ''}`)));
    box.replaceChildren(
      h('fieldset', h('legend', 'Voix'),
        voices.length ? h('div.voice-row', select, speakBtn(SAMPLE, { label: 'Tester la voix' }))
          : h('p.small', 'Aucune voix japonaise trouvée sur cet appareil.'),
        h('p.small', 'Les voix marquées ★ sont les plus naturelles. Sur Windows, ouvre le site avec Edge pour avoir « Nanami Online (Natural) » ; sur iPhone et Mac, télécharge « Kyoko (Premium) » dans Réglages › Accessibilité › Contenu énoncé › Voix › Japonais.')),
      h('fieldset', h('legend', 'Vitesse'),
        h('div.checks', [[0.75, 'Lente'], [0.9, 'Posée'], [1.05, 'Normale']].map(([v, l]) =>
          h('label.check', h('input', { type: 'radio', name: 'rate', checked: Math.abs((s.voiceRate || .9) - v) < .01, onchange: () => { S.setSettings({ voiceRate: v }); speak(SAMPLE); } }), h('span', l))))),
      h('fieldset', h('legend', 'Timbre'),
        h('div.checks', [[0.95, 'Grave'], [1.06, 'Doux'], [1.18, 'Clair']].map(([v, l]) =>
          h('label.check', h('input', { type: 'radio', name: 'pitch', checked: Math.abs((s.voicePitch ?? 1.06) - v) < .01, onchange: () => { S.setSettings({ voicePitch: v }); speak(SAMPLE); } }), h('span', l))))));
  };
  render();
  window.speechSynthesis?.addEventListener?.('voiceschanged', render, { once: true });
  return box;
}

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
  const furi = h('fieldset', h('legend', 'Furigana'),
    h('div.checks', [['always', 'Partout (conseillé)'], ['auto', 'N5 et N4 seulement'], ['never', 'Jamais']].map(([v, l]) =>
      h('label.check', h('input', { type: 'radio', name: 'furi', checked: s.furigana === v, onchange: () => { S.setSettings({ furigana: v }); toast('Réglage enregistré'); } }), h('span', l)))));
  const fileIn = h('input', { type: 'file', accept: 'application/json', hidden: true, onchange: async e => {
    try { S.importAll(await e.target.files[0].text()); toast('Progression importée'); settingsPage(); }
    catch (err) { toast(err.message); }
  } });
  main.replaceChildren(
    h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('設定') }), 'Réglages')),
    h('div.card.settings',
      h('h2', 'Niveaux travaillés'),
      levelBoxes('grammarLevels', 'Niveaux de grammaire (entraînement, jeux)'),
      levelBoxes('vocabLevels', 'Niveaux de vocabulaire (entraînement, jeux)'),
      h('p.section-note', 'Le nouveau s’apprend dans les Leçons. Les révisions reprennent ensuite ce que tu as appris, en phrases à trous.'),
      h('h2', 'Affichage'), furi,
      h('div.checks',
        h('label.check', h('input', { type: 'checkbox', checked: !!s.reduceMotion, onchange: e => { S.setSettings({ reduceMotion: e.target.checked }); applyMotion(); toast(e.target.checked ? 'Animations réduites' : 'Animations activées'); } }),
          h('span', 'Réduire les animations : coupe les ombres mouvantes, reflets, rotations au survol, pétales et transitions (le réglage « réduire les animations » de ton appareil est aussi respecté)')),
        h('label.check', h('input', { type: 'checkbox', checked: s.gloss !== false, onchange: e => { S.setSettings({ gloss: e.target.checked }); toast('Réglage enregistré'); } }),
          h('span', 'Bulles d’explication : en passant la souris (ou en touchant) un mot d’une phrase japonaise, une bulle explique la particule, le mot, le verbe ou la forme grammaticale'))),
      h('h2', 'Style des phrases'),
      h('fieldset', h('legend', 'Phrases d’exemple'),
        h('div.checks', [['orig', 'Telles quelles'], ['polite', 'Polies (です・ます)'], ['plain', 'Neutres (forme simple)']].map(([v, l]) =>
          h('label.check', h('input', { type: 'radio', name: 'register', checked: (s.register || 'orig') === v, onchange: () => { S.setSettings({ register: v }); toast('Réglage enregistré'); } }), h('span', l)))),
        h('p.small', 'Chaque phrase a aussi un bouton « です・ます ⇄ ふつう » pour basculer d’un style à l’autre.')),
      h('h2', 'Voix et prononciation'),
      voiceOK ? voiceSettings(s) : h('p.section-note', 'Ton navigateur ne propose pas de voix de synthèse.'),
      h('div.checks',
        h('label.check', h('input', { type: 'checkbox', checked: s.autoSpeak !== false, onchange: e => { S.setSettings({ autoSpeak: e.target.checked }); toast('Réglage enregistré'); } }), h('span', 'Lire la réponse à voix haute en révision')),
        h('label.check', h('input', { type: 'checkbox', checked: s.pitch !== false, onchange: e => { S.setSettings({ pitch: e.target.checked }); toast('Réglage enregistré'); } }), h('span', 'Afficher le schéma d’accent tonal'))),
      h('h2', 'Effets sonores'),
      h('div.checks',
        h('label.check', h('input', { type: 'checkbox', checked: s.sound !== false, onchange: e => { S.setSettings({ sound: e.target.checked }); if (e.target.checked) play('select'); } }), h('span', 'Sons de l’interface et des jeux'))),
      h('label.field.range', h('span', 'Volume'),
        h('input', { type: 'range', min: 0, max: 1, step: .05, value: s.sfxVolume ?? .6, oninput: e => { S.setSettings({ sfxVolume: Number(e.target.value) }); setVolume(); play('cursor', { gap: 90 }); } })),
      h('p.section-note', 'Les voix sont celles de ton appareil (clic droit sur 🔊 pour écouter lentement). Accents tonals : données Kanjium, licence CC BY-SA 4.0.'),
      h('h2', 'Ta progression'),
      syncBox(),
      h('p.section-note', C.enabled && C.currentUser() ? 'Tout est lié à ton compte : niveau, XP, révisions, leçons, records des jeux, confidents et réglages. Tu peux aussi l’exporter dans un fichier.' : 'Elle est enregistrée dans ce navigateur. Connecte-toi pour la lier à ton compte, ou exporte-la dans un fichier.'),
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

// ☁ État de la synchro avec le compte (réglages)
function syncBox() {
  if (!C.enabled || !C.currentUser()) return null;
  const txt = h('span.sync-txt'), dot = h('i.sync-dot');
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'à l’instant' : m < 60 ? `il y a ${m} min` : `il y a ${Math.round(m / 60)} h`; };
  const paint = st => {
    box.dataset.status = st.status;
    txt.textContent = { syncing: 'Synchronisation…', pending: 'Envoi en cours…', error: `Échec de la synchro (${st.error || 'réseau'}). Nouvel essai automatique.`, offline: 'Hors ligne : tout sera envoyé au retour du réseau.', ok: `Synchronisé en temps réel avec ton compte (dernier échange ${ago(st.at)}).`, idle: 'Synchronisé en temps réel avec ton compte.' }[st.status] || '';
  };
  const box = h('div.sync-box', dot, txt);
  const off = C.onSync(paint); paint(C.getSyncState());
  const tick = setInterval(() => { if (!box.isConnected) { clearInterval(tick); off(); } else paint(C.getSyncState()); }, 30000);
  return box;
}
// Une synchro a apporté des données d'un autre appareil : on rafraîchit ce qui est affiché quand c'est sans risque
window.addEventListener('sakura:synced', () => {
  refreshBadge();
  if (/^#?\/?$|^#\/(profil|lecons|grammaire|vocabulaire|jeux|kana|reglages)(\/N[1-5])?$/.test(location.hash) && !document.querySelector('input:focus, textarea:focus')) route();
});

let booted = false;
C.onAuth(() => {
  if (!booted) return;
  navAccount();
  if (C.isRecovery()) { location.hash = '#/compte'; route(); }
  else if (/access_token|error_description/.test(location.hash)) location.hash = '#/';
  else route();
});
C.init().catch(err => console.warn('Comptes :', err.message)).finally(() => {
  booted = true;
  mountOnline();
  if (/access_token|error_description/.test(location.hash) && !C.isRecovery()) location.hash = '#/';
  navAccount(); Promise.resolve(route()).finally(() => window.__bootDone?.(bootSweep));
  setTimeout(perfProbe, 5000);
});

// --- Mise à jour automatique : si une nouvelle version est en ligne, on recharge (une fois) -------------
const MY_VERSION = new URL(import.meta.url).searchParams.get('v');
async function checkUpdate() {
  if (!MY_VERSION) return;
  if (/^#\/(lecon|revision|entrainement|jeux\/)/.test(location.hash) && document.querySelector('.session, .game-head')) return;
  try {
    const { v } = await (await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' })).json();
    if (!v || v <= MY_VERSION) return;
    const k = 'sakura.reloadedFor';
    if (sessionStorage.getItem(k) === v) return;
    sessionStorage.setItem(k, v);
    await Promise.all(['./', 'index.html'].map(u => fetch(u, { cache: 'reload' }).catch(() => {})));
    location.reload();
  } catch {}
}
checkUpdate();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(); });

// --- Pétales qui tombent doucement sur tout le site (discrets, coupés si « réduire les animations ») ---
(function petalSky() {
  if (reducedMotion() || document.querySelector('.petal-sky')) return;
  const n = matchMedia('(max-width: 860px)').matches ? 8 : 14;
  const sky = h('div.petal-sky', { 'aria-hidden': 'true' });
  for (let i = 0; i < n; i++) {
    const big = Math.random() < 0.25;
    sky.append(h('span', { class: big ? 'near' : null, style: {
      left: `${Math.random() * 100}%`, animationDelay: `${-Math.random() * 26}s`,
      animationDuration: `${(big ? 13 : 18) + Math.random() * 12}s`,
      '--drift': `${Math.random() * 220 - 110}px`, '--sway': `${18 + Math.random() * 30}px`,
      '--size': `${big ? 11 + Math.random() * 6 : 6 + Math.random() * 6}px`, '--spin': `${Math.random() * 900 - 450}deg`,
    } }, h('i')));
  }
  document.body.append(sky);
})();

initGloss();
initTilt();
if (C.enabled) initLinks();
initLevelUp();
// L'indication du bouton Kanji Dojo s'efface dès qu'on fait défiler la page
addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 30), { passive: true });

// --- Titres de page façon « Social Link » : kanji en relief, mot dans un bandeau blanc, grand mot en contour derrière ---
function p3Heads(root = main) {
  root.querySelectorAll('header.page-head, header.game-head, header.cf-head').forEach(head => {
    if (head.dataset.p3) return;
    const h1 = head.querySelector('h1');
    if (!h1 || head.classList.contains('cf-head')) { head.dataset.p3 = '1'; return; }
    head.dataset.p3 = '1';
    head.classList.add('p3-head');
    // Le texte du titre (hors kanji) passe dans un bandeau
    const words = [...h1.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
    words.forEach(n => { const s = h('span.ph-word', n.textContent.trim()); n.replaceWith(s); });
    const word = h1.querySelector('.ph-word')?.textContent || '';
    if (word && !head.querySelector('.ph-bg')) head.prepend(h('span.ph-bg', { 'aria-hidden': 'true' }, word.toUpperCase()));
    if (!head.classList.contains('game-head')) head.append(hudDate());
  });
}
new MutationObserver(() => p3Heads()).observe(main, { childList: true, subtree: true });
p3Heads();

// --- Réduire les animations (réglage du site) ---------------------------------------------------
function applyMotion() { document.documentElement.classList.toggle('reduce-motion', !!S.getSettings().reduceMotion); }
applyMotion();


// --- Mode allégé automatique : si la machine n'arrive pas à suivre (moins de ~40 images/s),
// on garde le même décor mais on fige ce qui coûte le plus (fond qui ondule, moitié des pétales, ombres qui bougent).
function perfProbe() {
  // Déjà allégé : on garde ce réglage une semaine avant de retester (sinon ça alternerait d'un chargement à l'autre)
  try { const t = Number(localStorage.getItem('sakura.liteAt') || 0); if (localStorage.getItem('sakura.lite') === '1' && Date.now() - t < 7 * 864e5) return; } catch {}
  if (document.hidden) { document.addEventListener('visibilitychange', () => setTimeout(perfProbe, 1500), { once: true }); return; }
  let n = 0, t0 = 0, worst = 0, last = 0;
  const f = t => {
    if (!t0) { t0 = last = t; }
    worst = Math.max(worst, t - last); last = t; n++;
    if (t - t0 < 2000) return requestAnimationFrame(f);
    const fps = n / ((t - t0) / 1000);
    const lite = fps < 40;
    document.documentElement.classList.toggle('lite', lite);
    try { localStorage.setItem('sakura.lite', lite ? '1' : '0'); localStorage.setItem('sakura.liteAt', String(Date.now())); } catch {}
  };
  requestAnimationFrame(f);
}
try { if (localStorage.getItem('sakura.lite') === '1') document.documentElement.classList.add('lite'); } catch {}

// --- HUD « calendrier » façon Persona 5 dans le coin des titres : date, jour en kanji, moment de la journée ---
const WD = [['日', 'DIMANCHE'], ['月', 'LUNDI'], ['火', 'MARDI'], ['水', 'MERCREDI'], ['木', 'JEUDI'], ['金', 'VENDREDI'], ['土', 'SAMEDI']];
function hudDate() {
  const d = new Date(), hr = d.getHours();
  const moment = hr < 5 ? ['深夜', 'Nuit'] : hr < 11 ? ['朝', 'Matin'] : hr < 14 ? ['昼', 'Midi'] : hr < 18 ? ['午後', 'Après-midi'] : hr < 22 ? ['夕方', 'Soirée'] : ['夜', 'Nuit'];
  const [k, name] = WD[d.getDay()];
  return h('div.hud-date', { 'aria-label': `${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}, ${moment[1].toLowerCase()}` },
    h('span.hd-num', { 'aria-hidden': 'true' },
      h('small', ...[...String(d.getMonth() + 1)].map((c, i) => h('span.dg', { style: { '--r': `${[-8, 6][i % 2]}deg`, '--y': `${[0, -4][i % 2]}px` } }, c))),
      h('i', '/'),
      h('b', ...[...String(d.getDate())].map((c, i) => h('span.dg', { style: { '--r': `${[-6, 9][i % 2]}deg`, '--y': `${[6, -6][i % 2]}px` } }, c)))),
    h('span.hd-wd', { 'aria-hidden': 'true' }, h('b', { lang: 'ja', class: d.getDay() === 0 ? 'sun' : d.getDay() === 6 ? 'sat' : null }, k), h('small', name)),
    h('span.hd-moment', { 'aria-hidden': 'true' }, h('b', { lang: 'ja' }, moment[0]), ' ', moment[1]));
}
