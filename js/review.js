// Séances de révision : phrases à trous, sens des points de grammaire, vocabulaire.
import { h, ruby, shuffle, sample, pick, blossom, toast } from './util.js?v=20261018232551';
import * as D from './data.js?v=20261018232551';
import * as S from './srs.js?v=20261018232551';

const showFuri = lv => {
  const f = S.getSettings().furigana;
  return f === 'always' || (f === 'auto' && (lv === 'N5' || lv === 'N4'));
};

/** Phrase avec trou → HTML ; `fill` remplace le trou par la réponse */
export function sentenceHTML(s, { fill = false, furi = true, cls = '' } = {}) {
  const html = ruby(s.jp.replace(/\|/g, ''), furi);
  return html.replace(/\[([^\]]+)\]/, (_, inner) =>
    fill ? `<mark class="filled ${cls}">${inner}</mark>` : `<span class="blank" aria-label="trou">＿＿＿</span>`);
}

// --- Construction des séances ---------------------------------------------------
export async function buildSrsQueue() {
  const now = Date.now();
  const cards = S.allCards();
  const due = Object.keys(cards).filter(k => cards[k].d <= now).sort((a, b) => cards[a].d - cards[b].d).slice(0, 200);
  const set = S.getSettings();
  const fresh = [];
  let leftG = S.newLeftToday('g');
  if (leftG > 0) {
    for (const g of await D.grammar()) {
      if (leftG <= 0) break;
      if (set.grammarLevels.includes(g.lv) && !cards[`g:${g.id}`]) { fresh.push(`g:${g.id}`); leftG--; }
    }
  }
  let leftV = S.newLeftToday('v');
  for (const lv of D.LEVELS) {
    if (leftV <= 0 || !set.vocabLevels.includes(lv)) continue;
    for (const v of await D.vocab(lv)) {
      if (leftV <= 0) break;
      const k = D.vocabKey(v);
      if (!cards[k]) { fresh.push(k); leftV--; }
    }
  }
  // Une nouvelle carte toutes les trois révisions
  const q = [];
  let i = 0;
  for (const k of due) { q.push(k); if (++i % 3 === 0 && fresh.length) q.push(fresh.shift()); }
  q.push(...fresh);
  return { queue: q, dueCount: due.length };
}

export async function countDue() {
  const now = Date.now(), cards = S.allCards();
  return Object.values(cards).filter(c => c.d <= now).length;
}

// --- Résolution d'une clé en question --------------------------------------------
async function resolve(key, last) {
  if (key.startsWith('g:')) {
    const g = await D.grammarById(key.slice(2));
    if (!g) return null;
    const sents = await D.sentencesFor(g.id);
    if (sents.length) {
      const pool = sents.length > 1 ? sents.filter(s => s.id !== last) : sents;
      const s = pick(pool);
      return { key, kind: 'cloze', g, s, lv: g.lv, options: shuffle([s.a, ...s.d]), answer: s.a };
    }
    const others = (await D.grammar()).filter(x => x.lv === g.lv && x.s !== g.s);
    const opts = shuffle([g.s, ...sample(others, 3).map(x => x.s)]);
    return { key, kind: 'meaning', g, lv: g.lv, options: opts, answer: g.s };
  }
  const [, lv, ...rest] = key.split(':');
  const w = rest.join(':');
  const list = await D.vocab(lv);
  const v = list.find(x => x.w === w);
  if (!v) return null;
  const card = S.getCard(key);
  const reverse = card && card.r >= 2 && Math.random() < 0.4;
  const mean = D.shortMeaning(v.m);
  const others = sample(list.filter(x => D.shortMeaning(x.m) !== mean && x.w !== v.w), 3);
  if (reverse) return { key, kind: 'vocab-rev', v, lv, options: shuffle([v.w, ...others.map(x => x.w)]), answer: v.w, others };
  return { key, kind: 'vocab', v, lv, options: shuffle([mean, ...others.map(x => D.shortMeaning(x.m))]), answer: mean };
}

/** Questions d'entraînement libre à partir de phrases (sans effet sur les révisions) */
export function practiceItems(sents, grammarById) {
  return shuffle(sents).map(s => ({ key: null, kind: 'cloze', s, g: grammarById.get(s.g), lv: s.lv, options: shuffle([s.a, ...s.d]), answer: s.a }));
}

// --- Séance -----------------------------------------------------------------------
/**
 * mode 'srs' : `queue` = clés de cartes, les réponses sont notées.
 * mode 'practice' : `items` = questions prêtes, rien n'est enregistré.
 */
export async function runSession(root, { mode = 'srs', queue = [], items = [], title = 'Révisions', onDone }) {
  const list = mode === 'srs' ? [...queue] : [...items];
  const total = list.length;
  const retries = new Map();
  let idx = 0, ok = 0, seen = 0, lastSentence = null, keyHandler = null;
  const missed = new Set();

  const bar = h('div.progress', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-label': 'Progression de la séance' }, h('span'));
  const counter = h('span.session-count');
  const stage = h('div.stage');
  root.replaceChildren(
    h('div.session',
      h('header.session-head',
        h('a.session-quit', { href: '#/', 'aria-label': 'Quitter la séance' }, '×'),
        bar, counter),
      stage));

  const updateBar = () => {
    const done = Math.min(idx, list.length);
    bar.firstChild.style.width = `${(done / Math.max(list.length, 1)) * 100}%`;
    bar.setAttribute('aria-valuenow', done);
    counter.textContent = `${Math.max(list.length - idx, 0)} restante${list.length - idx > 1 ? 's' : ''}`;
  };

  const setKeys = fn => {
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = fn; if (fn) document.addEventListener('keydown', fn);
  };
  // Nettoyage si on quitte la page
  window.addEventListener('hashchange', () => setKeys(null), { once: true });

  async function next() {
    updateBar();
    if (idx >= list.length) return finish();
    const entry = list[idx];
    const item = mode === 'srs' ? await resolve(entry, lastSentence) : entry;
    if (!item) { idx++; return next(); }
    if (item.s) lastSentence = item.s.id;
    const card = item.key && S.getCard(item.key);
    if (mode === 'srs' && item.kind !== 'vocab-rev' && (!card || card.s === 0) && !retries.has(item.key)) return intro(item);
    ask(item);
  }

  // Découverte d'une nouvelle carte avant le premier test
  async function intro(item) {
    const furi = showFuri(item.lv);
    let body;
    if (item.g) {
      const ex = (await D.sentencesFor(item.g.id))[0];
      body = h('div.intro',
        h('p.kicker', `Nouveau point · ${D.LEVEL_NAMES[item.lv]}`),
        h('h2.gram-title', { lang: 'ja', html: ruby(D.gramLabel(item.g), true) }),
        h('p.gram-meaning', item.g.s),
        ex && h('div.example',
          h('p.jp', { lang: 'ja', html: sentenceHTML(ex, { fill: true, furi }) }),
          h('p.fr', ex.fr)));
    } else {
      const v = item.v;
      body = h('div.intro',
        h('p.kicker', `Nouveau mot · ${v.lv} · unité ${v.unit}`),
        h('p.word', { lang: 'ja', html: ruby(v.f || v.w, true) }),
        h('p.gram-meaning', v.m));
    }
    const go = h('button.btn.primary', { onclick: () => ask(item) }, 'Je teste');
    stage.replaceChildren(h('div.card.question', body, h('div.actions', go)));
    go.focus();
    setKeys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ask(item); } });
  }

  function ask(item) {
    const furi = showFuri(item.lv);
    let prompt;
    if (item.kind === 'cloze') {
      prompt = [
        h('p.kicker', `Complète la phrase · ${D.LEVEL_NAMES[item.lv]}`),
        h('p.jp.big', { lang: 'ja', html: sentenceHTML(item.s, { furi }) }),
        h('p.fr', item.s.fr)];
    } else if (item.kind === 'meaning') {
      prompt = [
        h('p.kicker', `Que veut dire ce point ? · ${D.LEVEL_NAMES[item.lv]}`),
        h('p.gram-title', { lang: 'ja', html: ruby(D.gramLabel(item.g), furi) })];
    } else if (item.kind === 'vocab') {
      prompt = [
        h('p.kicker', `Sens du mot · ${item.lv}`),
        h('p.word', { lang: 'ja' }, item.v.w)];
    } else {
      prompt = [
        h('p.kicker', `Quel mot ? · ${item.lv}`),
        h('p.word-fr', D.shortMeaning(item.v.m))];
    }
    const jpOpts = item.kind === 'cloze' || item.kind === 'vocab-rev';
    const buttons = item.options.map((o, i) => h('button.option', {
      lang: jpOpts ? 'ja' : null, 'data-n': i + 1,
      onclick: () => answer(item, o, buttons),
    }, h('span.option-key', { 'aria-hidden': 'true' }, i + 1), h('span.option-text', o)));
    stage.replaceChildren(h('div.card.question', ...prompt, h('div.options', buttons)));
    setKeys(e => {
      const n = Number(e.key);
      if (n >= 1 && n <= buttons.length) { e.preventDefault(); buttons[n - 1].click(); }
    });
  }

  function answer(item, choice, buttons) {
    const right = choice === item.answer;
    seen++; if (right) ok++;
    buttons.forEach(b => {
      b.disabled = true;
      const t = b.querySelector('.option-text').textContent;
      if (t === item.answer) b.classList.add('correct');
      else if (t === choice) b.classList.add('wrong');
    });
    const card = stage.querySelector('.question');
    const furi = showFuri(item.lv);
    // Réponse complète
    const reveal = h('div.reveal');
    if (item.kind === 'cloze') {
      card.querySelector('.jp.big').innerHTML = sentenceHTML(item.s, { fill: true, furi, cls: right ? 'ok' : 'ko' });
      reveal.append(h('a.gram-link', { href: `#/point/${item.g.id}` },
        h('span', { lang: 'ja', html: ruby(D.gramLabel(item.g), true) }), ' — ', item.g.s));
    } else if (item.kind === 'meaning') {
      reveal.append(h('p.small', `${item.g.t} : ${item.g.s}`));
    } else {
      const v = item.v;
      reveal.append(h('p.reading', { lang: 'ja', html: ruby(v.f || v.w, true) }), h('p.small', v.m));
    }

    const actions = h('div.actions');
    if (mode === 'srs') {
      if (right) {
        const pv = S.previewIntervals(item.key);
        const fmt = d => d === 1 ? '1 j' : d < 30 ? `${d} j` : `${Math.round(d / 30)} mois`;
        const mk = (label, q, cls, n) => h(`button.btn.grade.${cls}`, { onclick: () => done(item, q), 'data-n': n },
          h('span', label), h('small', fmt(pv[q])));
        actions.append(mk('Difficile', S.GRADES.HARD, 'hard', 1), mk('Bien', S.GRADES.GOOD, 'good', 2), mk('Facile', S.GRADES.EASY, 'easy', 3));
        setKeys(e => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === '2') { e.preventDefault(); done(item, S.GRADES.GOOD); }
          if (e.key === '1') done(item, S.GRADES.HARD);
          if (e.key === '3') done(item, S.GRADES.EASY);
        });
      } else {
        actions.append(h('p.again-note', 'Cette carte revient un peu plus loin dans la séance.'),
          h('button.btn.primary', { onclick: () => done(item, S.GRADES.AGAIN) }, 'Continuer'));
        setKeys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); done(item, S.GRADES.AGAIN); } });
      }
    } else {
      actions.append(h('button.btn.primary', { onclick: () => done(item, right ? 4 : 0) }, 'Continuer'));
      setKeys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); done(item, right ? 4 : 0); } });
    }
    card.append(reveal, actions);
    actions.querySelector('button')?.focus({ preventScroll: true });
    card.classList.add(right ? 'is-right' : 'is-wrong');
  }

  function done(item, q) {
    if (mode === 'srs') S.grade(item.key, q);
    if (q < 3) {
      missed.add(item.key || item.s?.id);
      const id = item.key || item.s?.id || item.v?.w;
      const n = retries.get(id) || 0;
      if (n < 3) {
        retries.set(id, n + 1);
        const pos = Math.min(list.length, idx + 4 + Math.floor(Math.random() * 3));
        list.splice(pos, 0, mode === 'srs' ? item.key : { ...item, options: shuffle(item.options) });
      }
    }
    idx++;
    next();
  }

  function finish() {
    setKeys(null);
    const rate = seen ? Math.round((ok / seen) * 100) : 0;
    stage.replaceChildren(h('div.card.finish',
      h('div.finish-flower', { html: blossom(seen ? ok / seen : 0, 120, `${rate} % de bonnes réponses`) }),
      h('h2', seen ? 'Séance terminée' : 'Rien à réviser pour le moment'),
      seen ? h('p', `${total} carte${total > 1 ? 's' : ''}, ${rate} % de bonnes réponses du premier coup ou après reprise.`) : h('p', 'Reviens plus tard ou ajoute des leçons depuis la grammaire.'),
      missed.size ? h('p.small', `${missed.size} carte${missed.size > 1 ? 's' : ''} à retravailler : ${mode === 'srs' ? 'elles reviendront bientôt.' : 'refais un tour pour les fixer.'}`) : null,
      h('div.actions',
        h('a.btn.primary', { href: '#/' }, 'Retour à l’accueil'),
        h('a.btn', { href: '#/jeux' }, 'Jouer un peu'))));
    onDone && onDone({ ok, seen });
    if (seen && rate >= 90) toast('満開！ Presque tout juste.');
  }

  next();
}
