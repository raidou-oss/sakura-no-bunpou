// Séances de révision : phrases à trous, sens des points de grammaire, vocabulaire.
import { h, ruby, shuffle, sample, pick, blossom, toast, plain, kana, answerRegex, normJa, bindRomaji } from './util.js?v=20261019113147';
import { speak, speakBtn } from './voice.js?v=20261019113147';
import { pitchSVG } from './pitch.js?v=20261019113147';
import { play } from './sfx.js?v=20261019113147';
import { burst, celebrate, verdict } from './celebrate.js?v=20261019113147';
import * as D from './data.js?v=20261019113147';
import * as S from './srs.js?v=20261019113147';

const showFuri = lv => {
  const f = S.getSettings().furigana;
  return f === 'always' || (f === 'auto' && (lv === 'N5' || lv === 'N4'));
};

/** Ligne « écouter + accent » d'un mot de vocabulaire */
export function wordAudio(v, { compact = false } = {}) {
  const r = kana(v.f || v.w);
  const show = S.getSettings().pitch !== false && v.p != null;
  return h('div.word-audio', speakBtn(r, { label: `Écouter ${v.w}` }), show ? h('span', { html: pitchSVG(r, v.p, { compact }) }) : null);
}
/** Phrases d'exemple d'un mot (chargées à la demande, s'insèrent dans `box`) */
export function vocabExamplesEl(v, { max = 2, compact = false } = {}) {
  const box = h(`div.vocab-ex${compact ? '.compact' : ''}`);
  D.vocabExamples(v).then(list => {
    const furi = S.getSettings().furigana !== 'never';
    box.replaceChildren(...list.slice(0, max).map(([jp, fr, reg, alt]) => h('div.vx',
      sentenceLine({ jp, reg, alt }, { furi }),
      h('p.fr', fr))));
  });
  return box;
}

/** Ligne « écouter » d'un point de grammaire (+ accent si c'est un mot simple) */
export function gramAudio(g, { compact = false } = {}) {
  const r = g.r || plain(g.t).replace(/[〜～]/g, '');
  const show = S.getSettings().pitch !== false && g.p != null;
  return h('div.word-audio', speakBtn(r, { label: `Écouter ${g.t}` }), show ? h('span', { html: pitchSVG(r, g.p, { compact }) }) : null);
}
// --- Style des phrases : poli (です・ます) ⇄ neutre (forme simple) ---------------------------
/** Texte (annoté) d'une phrase dans le style voulu : 'p' poli, 'n' neutre, sinon tel quel */
function inStyle(s, style) {
  if (!s.alt || !s.reg || !style || style === s.reg) return { text: s.jp, reg: s.reg };
  return { text: s.alt, reg: style };
}
const preferred = () => ({ polite: 'p', plain: 'n' }[S.getSettings().register] || null);
const filledHTML = (text, furi, cls = '') => ruby(text.replace(/\|/g, ''), furi)
  .replace(/\[([^\]]+)\]/, (_, inner) => `<mark class="filled ${cls}">${inner}</mark>`);

/** Bouton « です・ます ⇄ ふつう » qui bascule le texte affiché dans `el` (et ce que lit la voix) */
export function regButton(s, el, { furi = true, cls = '', onSwitch } = {}) {
  if (!s?.alt || !s.reg) return null;
  let cur = inStyle(s, preferred()).reg;
  const btn = h('button.reg-btn', { type: 'button' });
  const paint = () => {
    const t = inStyle(s, cur).text;
    el.innerHTML = filledHTML(t, furi, cls);
    el.dataset.say = plain(t);
    btn.innerHTML = cur === 'p' ? '<span lang="ja">ふつう</span><small>neutre</small>' : '<span lang="ja">です・ます</span><small>poli</small>';
    btn.title = cur === 'p' ? 'Voir la phrase en forme neutre (simple)' : 'Voir la phrase en forme polie (です・ます)';
    btn.setAttribute('aria-label', btn.title);
    el.classList.remove('reg-swap'); void el.offsetWidth; el.classList.add('reg-swap');
    onSwitch?.(cur);
  };
  btn.onclick = e => { e.stopPropagation(); cur = cur === 'p' ? 'n' : 'p'; paint(); };
  paint();
  return btn;
}

/** Ligne de phrase d'exemple : texte (remplie), bascule poli/neutre, bouton d'écoute */
export function sentenceLine(s, { furi = true, big = false } = {}) {
  const p = h(`p.jp${big ? '.big' : ''}`, { lang: 'ja' });
  const tag = h('span.reg-tag');
  const btn = regButton(s, p, { furi, onSwitch: r => { tag.textContent = r === 'p' ? 'poli' : 'neutre'; } });
  if (!btn) { p.innerHTML = filledHTML(s.jp, furi); p.dataset.say = plain(s.jp); }
  return h('div.jp-line', p, h('div.line-tools', btn, speakBtn(() => p.dataset.say, { label: 'Écouter la phrase', small: true })));
}

/** Bascule globale du style des phrases : telles quelles / polies / neutres */
export function regSwitch(onChange) {
  const opts = [['orig', 'Telles quelles'], ['polite', 'Polies (です・ます)'], ['plain', 'Neutres (ふつう)']];
  const seg = h('div.seg', { role: 'radiogroup', 'aria-label': 'Style des phrases' });
  const paint = () => {
    const cur = S.getSettings().register || 'orig';
    seg.replaceChildren(...opts.map(([v, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(v === cur), class: v === cur ? 'active' : null,
      onclick: () => { if (v === cur) return; S.setSettings({ register: v }); play('select'); paint(); onChange?.(v); } }, l)));
  };
  paint();
  return h('div.reg-switch', h('span.lbl', 'Style des phrases'), seg);
}

/** Pastille qui dit quel style de phrase est attendu (poli ou neutre) */
export function regChip(s) {
  if (!s?.reg) return null;
  return h(`span.reg-chip.${s.reg === 'p' ? 'polite' : 'plain'}`, { title: s.reg === 'p' ? 'Réponds en forme polie (です・ます)' : 'Réponds en forme neutre (forme simple)' },
    h('span', { lang: 'ja' }, s.reg === 'p' ? 'です・ます' : 'ふつう'), s.reg === 'p' ? 'Forme polie' : 'Forme neutre');
}

/** Phrase avec bouton d'écoute */
export const sentenceText = s => plain(s.jp);

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
      return { key, kind: 'cloze', g, s, lv: g.lv, options: shuffle([s.a, ...s.d]), answer: s.a, disp: clozeDisp(s) };
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
  if (reverse) return { key, kind: 'vocab-rev', v, lv, options: shuffle([v.w, ...others.map(x => x.w)]), answer: v.w, others, disp: Object.fromEntries([v, ...others].map(x => [x.w, x.f || x.w])) };
  return { key, kind: 'vocab', v, lv, options: shuffle([mean, ...others.map(x => D.shortMeaning(x.m))]), answer: mean };
}

/** Choix d'une phrase à trous avec leurs furigana : { texte brut → texte annoté } */
export const clozeDisp = s => Object.fromEntries([[s.a, s.af || s.a], ...s.d.map((d, i) => [d, s.df?.[i] || d])]);

/** Question de vocabulaire hors révision (sens du mot, 4 choix pris dans `list`) */
export function vocabPractice(v, list) {
  const mean = D.shortMeaning(v.m);
  const others = sample(list.filter(x => D.shortMeaning(x.m) !== mean && x.w !== v.w), 3);
  return { key: null, kind: 'vocab', v, lv: v.lv, options: shuffle([mean, ...others.map(x => D.shortMeaning(x.m))]), answer: mean };
}

/** Phrase à trou à écrire soi-même (dans le style préféré si la variante existe) */
export function typedCloze(s, g) {
  const st = inStyle(s, preferred());
  const shown = { ...s, jp: st.text, reg: st.reg };
  const inner = (st.text.match(/\[([^\]]+)\]/) || [])[1] || s.af || s.a;
  return { key: null, kind: 'cloze-type', s: shown, g, lv: s.lv, accept: [inner, s.af || s.a].filter((x, i, l) => l.indexOf(x) === i) };
}

/** Mot de vocabulaire à écrire : retiré d'une phrase d'exemple, sinon à partir du sens */
export async function typedVocab(v) {
  const target = v.f || v.w;
  const pref = preferred();
  let ex = null;
  for (const [jp, fr, reg, alt] of shuffle(await D.vocabExamples(v))) {
    const st = inStyle({ jp, reg, alt }, pref);
    for (const t of [target, v.w]) {
      if (t && st.text.includes(t)) { ex = { jp: st.text.replace(t, `[${t}]`), fr, reg: st.reg }; break; }
    }
    if (ex) break;
  }
  return { key: null, kind: 'vocab-type', v, lv: v.lv, ex, accept: [target] };
}

/** Point de grammaire à écrire à partir de son sens (si sa forme s'écrit en japonais seul) */
export function typedMeaning(g) {
  const forms = String(g.f || g.t).replace(/[①-⑳]/g, '').split(/[・／/]/).map(x => x.replace(/[〜～\s]/g, '').trim()).filter(Boolean);
  if (!forms.length || forms.some(x => /[A-Za-zÀ-ÿ+⇒＋]/.test(x))) return null;
  return { key: null, kind: 'meaning-type', g, lv: g.lv, accept: forms };
}

/** Transforme une question à choix en question à écrire (même clé de révision) */
export async function toTyped(item) {
  if (!item || item.kind.endsWith('-type')) return item;
  let t = null;
  if (item.kind === 'cloze' && item.s) t = typedCloze(item.s, item.g);
  else if ((item.kind === 'vocab' || item.kind === 'vocab-rev') && item.v) t = await typedVocab(item.v);
  else if (item.kind === 'meaning' && item.g) t = typedMeaning(item.g);
  return t ? { ...t, key: item.key, lid: item.lid } : item;
}

/** Questions d'entraînement libre à partir de phrases (sans effet sur les révisions) */
export function practiceItems(sents, grammarById) {
  return shuffle(sents).map(s => ({ key: null, kind: 'cloze', s, g: grammarById.get(s.g), lv: s.lv, options: shuffle([s.a, ...s.d]), answer: s.a, disp: clozeDisp(s) }));
}

// --- Séance -----------------------------------------------------------------------
/**
 * mode 'srs' : `queue` = clés de cartes, les réponses sont notées.
 * mode 'practice' : `items` = questions prêtes, rien n'est enregistré.
 */
export async function runSession(root, { mode = 'srs', queue = [], items = [], title = 'Révisions', onDone, onAnswer, extraActions = null, untilCorrect = false, celebrateEnd = true, typed = true }) {
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
    let item = mode === 'srs' ? await resolve(entry, lastSentence) : entry;
    if (typed) item = await toTyped(item);
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
        gramAudio(item.g),
        h('p.gram-meaning', item.g.s),
        ex && h('div.example',
          sentenceLine(ex, { furi }),
          h('p.fr', ex.fr)));
    } else {
      const v = item.v;
      body = h('div.intro',
        h('p.kicker', `Nouveau mot · ${v.lv} · unité ${v.unit}`),
        h('p.word', { lang: 'ja', html: ruby(v.f || v.w, true) }),
        wordAudio(v),
        h('p.gram-meaning', v.m),
        vocabExamplesEl(v, { max: 1 }));
      if (S.getSettings().autoSpeak) setTimeout(() => speak(kana(v.f || v.w)), 250);
    }
    const go = h('button.btn.primary', { onclick: () => ask(item) }, 'Je teste');
    stage.replaceChildren(h('div.card.question', body, h('div.actions', go)));
    go.focus();
    setKeys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ask(item); } });
  }

  function ask(item) {
    const furi = showFuri(item.lv);
    let prompt;
    if (item.kind === 'cloze-type' || item.kind === 'vocab-type') return askTyped(item, furi);
    if (item.kind === 'cloze') {
      prompt = [
        h('div.kicker-row', h('p.kicker', `Complète la phrase · ${D.LEVEL_NAMES[item.lv]}`), regChip(item.s)),
        h('p.jp.big', { lang: 'ja', html: sentenceHTML(item.s, { furi }) }),
        h('p.fr', item.s.fr)];
    } else if (item.kind === 'meaning') {
      prompt = [
        h('p.kicker', `Que veut dire ce point ? · ${D.LEVEL_NAMES[item.lv]}`),
        h('p.gram-title', { lang: 'ja', html: ruby(D.gramLabel(item.g), furi) })];
    } else if (item.kind === 'vocab') {
      prompt = [
        h('p.kicker', `Sens du mot · ${item.lv}`),
        h('p.word', { lang: 'ja', html: ruby(item.v.f || item.v.w, furi) })];
    } else {
      prompt = [
        h('p.kicker', `Quel mot ? · ${item.lv}`),
        h('p.word-fr', D.shortMeaning(item.v.m))];
    }
    const jpOpts = item.kind === 'cloze' || item.kind === 'vocab-rev';
    const buttons = item.options.map((o, i) => h('button.option', {
      lang: jpOpts ? 'ja' : null, 'data-n': i + 1, 'data-v': o,
      onclick: () => answer(item, o, buttons),
    }, h('span.option-key', { 'aria-hidden': 'true' }, i + 1),
      jpOpts ? h('span.option-text', { html: ruby(item.disp?.[o] || o, furi) }) : h('span.option-text', o)));
    stage.replaceChildren(h('div.card.question', ...prompt, h('div.options', buttons)));
    play('card');
    setKeys(e => {
      const n = Number(e.key);
      if (n >= 1 && n <= buttons.length) { e.preventDefault(); buttons[n - 1].click(); }
    });
  }

  // Exercice écrit : on tape le mot / la particule / la forme qui manque (kanji ou kana, orthographe exacte)
  function askTyped(item, furi) {
    const input = h('input.type-answer', { type: 'text', lang: 'ja', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
      placeholder: 'Écris ta réponse en japonais…', 'aria-label': 'Ta réponse' });
    let romaji = false; try { romaji = localStorage.getItem('sakura.theme.romaji') === '1'; } catch {}
    if (romaji) bindRomaji(input);
    const romajiBox = h('label.check.small', { title: 'En romaji, tape en MAJUSCULES pour obtenir des katakana' }, h('input', { type: 'checkbox', checked: romaji, onchange: e => {
      try { localStorage.setItem('sakura.theme.romaji', e.target.checked ? '1' : '0'); } catch {}
      if (e.target.checked) bindRomaji(input); else toast('Romaji désactivé à la prochaine question');
      input.focus(); } }), h('span', 'Taper en romaji (MAJUSCULES = katakana)'));
    const fb = h('p.type-feedback', { 'aria-live': 'polite' });
    const hintBox = h('div.type-hints');
    let tries = 0, hints = 0;
    const reading = kana(item.accept[0]).replace(/[〜～]/g, '');
    const hintSteps = [
      // 1er indice : le sens du point visé (sans sa forme, qui serait la réponse) et la longueur
      () => item.kind === 'cloze-type'
        ? h('p', h('strong', 'Sens du point visé : '), `« ${item.g.s} » · ${[...reading].length} kana`)
        : h('p', h('strong', 'Longueur : '), `${[...reading].length} kana`),
      () => {
        const ch = [...reading], k = Math.max(1, Math.ceil(ch.length / 2));
        return h('p', h('strong', 'Début : '), h('span.type-mask', { lang: 'ja' }, ch.slice(0, k).join('') + '＿'.repeat(ch.length - k)));
      },
    ];
    const hintBtn = h('button.btn', { type: 'button', onclick: () => {
      if (hints >= hintSteps.length) return;
      hintBox.append(hintSteps[hints++]()); play('cursor');
      if (hints >= hintSteps.length) hintBtn.disabled = true;
      input.focus();
    } }, 'Indice');
    const giveUp = h('button.btn.ghost', { type: 'button', onclick: () => finishTyped(false, true) }, 'Voir la réponse');
    const send = h('button.btn.primary', { type: 'button', onclick: () => check() }, 'Valider');
    const tools = h('div.actions.left.type-tools', hintBtn, giveUp);
    function finishTyped(right, gaveUp = false) {
      input.readOnly = true; send.remove(); tools.remove(); fb.remove();
      answer(item, input.value.trim(), null, right, input, { gaveUp, tries, hints });
    }
    const check = () => {
      const v = input.value.trim();
      if (!v) { input.focus(); return; }
      if (item.accept.some(a => answerRegex(a).test(normJa(v)))) return finishTyped(true);
      tries++;
      play('wrong');
      input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
      fb.textContent = tries === 1 ? 'Pas tout à fait : vérifie l’orthographe (ー, っ, petits kana, katakana…) et réessaie.'
        : `Toujours pas (${tries} essais). Prends un indice, ou regarde la réponse : la question sera à revoir.`;
      input.select();
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing && !input.readOnly) { e.preventDefault(); e.stopPropagation(); check(); } });
    let prompt;
    if (item.kind === 'cloze-type') {
      prompt = [
        h('div.kicker-row', h('p.kicker', `Écris ce qui manque · ${D.LEVEL_NAMES[item.lv]}`), regChip(item.s)),
        h('p.jp.big', { lang: 'ja', html: sentenceHTML(item.s, { furi }) }),
        h('p.fr', item.s.fr)];
    } else if (item.kind === 'meaning-type') {
      prompt = [
        h('p.kicker', `Écris le point de grammaire · ${D.LEVEL_NAMES[item.lv]}`),
        h('p.word-fr', item.g.s)];
    } else {
      prompt = [
        h('div.kicker-row', h('p.kicker', `Écris le mot · ${item.lv}`), item.ex?.reg ? regChip(item.ex) : null),
        h('p.word-fr', D.shortMeaning(item.v.m)),
        item.ex ? h('p.jp.big', { lang: 'ja', html: sentenceHTML(item.ex, { furi }) }) : null,
        item.ex ? h('p.fr', item.ex.fr) : null];
    }
    stage.replaceChildren(h('div.card.question.typed', ...prompt, h('div.type-row', input, send), fb, hintBox, tools, romajiBox));
    play('card');
    setKeys(null);
    setTimeout(() => input.focus(), 60);
  }

  function answer(item, choice, buttons, forced = null, input = null, typedInfo = null) {
    const right = forced ?? choice === item.answer;
    const gaveUp = !!typedInfo?.gaveUp;
    if (gaveUp) { input.value = ''; input.placeholder = ''; item = { ...item, gaveUp: true }; }
    play(right ? 'correct' : gaveUp ? 'back' : 'wrong');
    if (right) burst(input || buttons.find(b => b.dataset.v === choice));
    if (input) input.classList.add(right ? 'ok' : 'ko');
    seen++; if (right) ok++;
    (buttons || []).forEach(b => {
      b.disabled = true;
      const t = b.dataset.v;
      if (t === item.answer) b.classList.add('correct');
      else if (t === choice) b.classList.add('wrong');
    });
    const card = stage.querySelector('.question');
    const furi = showFuri(item.lv);
    // Réponse complète
    const reveal = h('div.reveal');
    if (input) {
      reveal.append(h('p.type-solution', right ? 'Bonne réponse : ' : 'La réponse : ', h('strong', { lang: 'ja', html: ruby(item.accept[0], true) }),
        item.accept.length > 1 && !right ? h('span.small', { lang: 'ja' }, ` (aussi accepté : ${item.accept.slice(1).map(plain).join('、')})`) : null));
      if (right && (typedInfo?.tries || typedInfo?.hints)) reveal.append(h('p.small.type-note', `Réussi ${typedInfo.hints ? `avec ${typedInfo.hints} indice${typedInfo.hints > 1 ? 's' : ''}` : ''}${typedInfo.hints && typedInfo.tries ? ' et ' : ''}${typedInfo.tries ? `après ${typedInfo.tries} erreur${typedInfo.tries > 1 ? 's' : ''}` : ''} : compté comme difficile.`));
      if (gaveUp) reveal.append(h('p.again-note', 'Réponse consultée : la question est marquée « à revoir » et reviendra.'));
    }
    if (item.kind === 'meaning-type') {
      reveal.append(h('div.type-explain',
        h('p', h('strong', { lang: 'ja', html: ruby(D.gramLabel(item.g), true) }), ` : ${item.g.s}`),
        gramAudio(item.g, { compact: true }),
        h('a.gram-link', { href: `#/point/${item.g.id}` }, 'Ouvrir la fiche du point')));
    } else if (item.kind === 'vocab-type') {
      const v = item.v;
      const big = card.querySelector('.jp.big');
      if (big && item.ex) big.innerHTML = sentenceHTML(item.ex, { fill: true, furi, cls: right ? 'ok' : 'ko' });
      reveal.append(h('div.type-explain',
        h('p.reading', { lang: 'ja', html: ruby(v.f || v.w, true) }), wordAudio(v), h('p.small', v.m),
        !item.ex ? vocabExamplesEl(v, { max: 1, compact: true }) : null));
    } else if (item.kind === 'cloze' || item.kind === 'cloze-type') {
      const big = card.querySelector('.jp.big');
      big.innerHTML = sentenceHTML(item.s, { fill: true, furi, cls: right ? 'ok' : 'ko' });
      big.dataset.say = sentenceText(item.s);
      reveal.append(h('div.word-audio', speakBtn(() => big.dataset.say, { label: 'Réécouter la phrase' }), h('span.small', 'Écouter la phrase'),
          item.kind === 'cloze' ? regButton(item.s, big, { furi, cls: right ? 'ok' : 'ko' }) : null),
        item.kind === 'cloze-type' && !right ? h('p.small.type-explain', `Explication : ici on utilise `, h('span', { lang: 'ja', html: ruby(D.gramLabel(item.g), true) }),
          ` (« ${item.g.s} »). La phrase complète veut dire : ${item.s.fr}`) : null,
        h('a.gram-link', { href: `#/point/${item.g.id}` },
        h('span', { lang: 'ja', html: ruby(D.gramLabel(item.g), true) }), ' — ', item.g.s));
      if (S.getSettings().autoSpeak) speak(sentenceText(item.s));
    } else if (item.kind === 'meaning') {
      reveal.append(h('p.small', h('span', { lang: 'ja', html: ruby(D.gramLabel(item.g), true) }), ` : ${item.g.s}`), gramAudio(item.g, { compact: true }));
    } else {
      const v = item.v;
      reveal.append(h('p.reading', { lang: 'ja', html: ruby(v.f || v.w, true) }), wordAudio(v), h('p.small', v.m), vocabExamplesEl(v, { max: 1, compact: true }));
      if (S.getSettings().autoSpeak) speak(kana(v.f || v.w));
    }

    const actions = h('div.actions');
    if (mode === 'srs') {
      if (right) {
        const pv = S.previewIntervals(item.key);
        const fmt = d => d === 1 ? '1 j' : d < 30 ? `${d} j` : `${Math.round(d / 30)} mois`;
        const mk = (label, q, cls, n) => h(`button.btn.grade.${cls}`, { onclick: () => done(item, q), 'data-n': n },
          h('span', label), h('small', fmt(pv[q])));
        if (typedInfo?.tries || typedInfo?.hints) {
          actions.append(mk('Difficile', S.GRADES.HARD, 'hard', 1));
          setKeys(e => { if (e.key === 'Enter' || e.key === ' ' || e.key === '1') { e.preventDefault(); done(item, S.GRADES.HARD); } });
        } else {
        actions.append(mk('Difficile', S.GRADES.HARD, 'hard', 1), mk('Bien', S.GRADES.GOOD, 'good', 2), mk('Facile', S.GRADES.EASY, 'easy', 3));
        setKeys(e => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === '2') { e.preventDefault(); done(item, S.GRADES.GOOD); }
          if (e.key === '1') done(item, S.GRADES.HARD);
          if (e.key === '3') done(item, S.GRADES.EASY);
        });
        }
      } else {
        actions.append(h('p.again-note', 'Cette carte revient un peu plus loin dans la séance.'),
          h('button.btn.primary', { onclick: () => done(item, S.GRADES.AGAIN) }, 'Continuer'));
        setKeys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); done(item, S.GRADES.AGAIN); } });
      }
    } else {
      const q = !right ? 0 : (typedInfo?.tries || typedInfo?.hints) ? 3 : 4;
      actions.append(h('button.btn.primary', { onclick: () => done(item, q) }, 'Continuer'));
      setKeys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); done(item, q); } });
    }
    card.append(reveal, actions);
    actions.querySelector('button')?.focus({ preventScroll: true });
    card.classList.add(right ? 'is-right' : 'is-wrong');
  }

  function done(item, q) {
    onAnswer?.(item, q >= 3);
    if (mode === 'srs') S.grade(item.key, q);
    else {
      const k = item.g ? `g:${item.g.id}` : item.v ? D.vocabKey(item.v) : null;
      S.recordPractice(k, q >= 3);
      // Réponse consultée : l'élément part dans les révisions comme « à revoir »
      if (item.gaveUp && k) { if (S.getCard(k)) S.grade(k, S.GRADES.AGAIN); else S.addCard(k); }
    }
    if (q < 3) {
      missed.add(item.key || item.s?.id || (item.v && `v:${item.v.w}`) || (item.g && `g:${item.g.id}`));
      const id = item.key || item.s?.id || item.v?.w;
      const n = retries.get(id) || 0;
      if (n < 3 || untilCorrect) {
        retries.set(id, n + 1);
        const pos = Math.min(list.length, idx + 4 + Math.floor(Math.random() * 3));
        list.splice(pos, 0, mode === 'srs' ? item.key : { ...item, options: item.options ? shuffle(item.options) : undefined });
      }
    }
    idx++;
    next();
  }

  function finish() {
    setKeys(null);
    const rate = seen ? Math.round((ok / seen) * 100) : 0;
    if (seen && celebrateEnd) celebrate({ ...verdict(ok / seen), detail: `${ok} / ${seen} bonnes réponses` });
    stage.replaceChildren(h('div.card.finish',
      h('div.finish-flower', { html: blossom(seen ? ok / seen : 0, 120, `${rate} % de bonnes réponses`) }),
      h('h2', seen ? 'Séance terminée' : 'Rien à réviser pour le moment'),
      seen ? h('p', `${total} carte${total > 1 ? 's' : ''}, ${rate} % de bonnes réponses du premier coup ou après reprise.`) : h('p', 'Reviens plus tard ou ajoute des leçons depuis la grammaire.'),
      missed.size ? h('p.small', `${missed.size} carte${missed.size > 1 ? 's' : ''} à retravailler : ${mode === 'srs' ? 'elles reviendront bientôt.' : 'refais un tour pour les fixer.'}`) : null,
      h('div.actions', ...(extraActions || [
        h('a.btn.primary', { href: '#/' }, 'Retour à l’accueil'),
        h('a.btn', { href: '#/jeux' }, 'Jouer un peu')]))));
    onDone && onDone({ ok, seen, missed: missed.size });
  }

  next();
}
