// Séances de révision : phrases à trous, sens des points de grammaire, vocabulaire.
import { h, ruby, shuffle, sample, pick, blossom, toast, plain, kana, answerRegex, normJa, bindRomaji } from './util.js?v=20261019224708';
import { speak, speakBtn } from './voice.js?v=20261019224708';
import { pitchSVG } from './pitch.js?v=20261019224708';
import { play } from './sfx.js?v=20261019224708';
import { burst, celebrate, verdict } from './celebrate.js?v=20261019224708';
import * as D from './data.js?v=20261019224708';
import * as S from './srs.js?v=20261019224708';

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

/** Nuances attendues dans la réponse : accompli, en cours, négatif, insistance (ん)… */
export function nuanceChips(answer) {
  const a = plain(String(answer || '')).replace(/[〜～]/g, '');
  if (!a) return [];
  const out = [];
  const add = (label, title) => out.push(h('span.nuance-chip', { title }, label));
  if (/ん(?:です|だ|でしょう|じゃ)|^のです|^んです|^の(?:だ|です)$/.test(a)) add('Insistance / explication (ん)', 'La phrase explique ou insiste : forme en 〜んです・〜のだ');
  if (/(?:てい|でい|てる|でる)/.test(a)) add('En cours / état', 'Action en train de se faire, ou état qui dure : 〜ている');
  else if (/(?:た|だ|ました|でした|かった)$/.test(a) && !/^(?:だ|ただ|また)$/.test(a)) add('Accompli (passé)', 'L’action est terminée : forme passée');
  if (/(?:ない|ません|なかった|ず|ぬ)/.test(a) && !/ないで(?:ください)?$/.test(a)) add('Négatif', 'La réponse est à la forme négative');
  if (/(?:ましょう|よう|おう)$/.test(a)) add('Volonté / invitation', '« Faisons… », « je vais… »');
  if (/たい/.test(a)) add('Envie (〜たい)', 'Vouloir faire');
  if (/(?:られ|させ)/.test(a)) add('Passif / causatif', 'Forme passive ou causative');
  return out.slice(0, 3);
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
      const s = pick((await D.easiest(pool, g.lv)).slice(0, 3));
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

// Formes conjuguées : on prend la plus courte terminaison plausible après le radical (負う → 負った, 食べる → 食べました)
const TERMINAL = /(?:た|て|[んい]だ|[んい]で|る|う|く|ぐ|す|つ|ぬ|ぶ|む|い|ば|ろ|よう)$/;
const FOLLOW = /^(?:が|を|に|で|と|も|か|よ|ね|な|わ|から|けど|けれど|こと|の|は|へ|や|し|ので|のに|ん|です|でしょう|だろう|じゃ|ぞ|ぜ|ほう|とき|ところ|もの|あと|まえ|ため|つもり|はず|みたい|らしい|まま|ながら|だけ|しか|まで|より|ほど|くらい|ぐらい|でも|って|くだ|いる|いま|いた|いて|しま|おき|おく|みる|みた|みま|ある|あり|あげ|くれ|もら|ほし|[ァ-ヺ㐀-鿿々]|[。、！？!?」』）)\s]|$)/;
// Première syllabe possible après le radical, selon la terminaison du mot au dictionnaire
const ROW = { う: 'わいうえおっ', く: 'かきくけこい', ぐ: 'がぎぐげごい', す: 'さしすせそ', つ: 'たちつてとっ', ぬ: 'なにぬねのん', ぶ: 'ばびぶべぼん', む: 'まみむめもん' };
const I_E = /[いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ]$/;
function firstOk(target, p) {
  const end = target.slice(-1), stem = target.slice(0, -1), c = p[0];
  if (ROW[end]) return ROW[end].includes(c);
  if (end === 'い') return 'かくけ'.includes(c);
  if (end === 'る') {
    if ('らりるれろっ'.includes(c)) return true;
    // Verbe en -iru / -eru (ou radical en kanji seul : 見る, 寝る) : la terminaison suit directement le radical
    if (I_E.test(stem)) return true;
    // Radical en kanji seul (見る, 寝る, 出る) : seules les terminaisons d'ichidan, pour ne pas confondre 見る et 見せる
    return /[㐀-鿿々]$|）$/.test(stem) && 'まますたてなられろよばず'.includes(c);
  }
  return false;
}
function conjugated(text, target) {
  if (!/[ぁ-ゖ]$/.test(target) || [...plain(target)].length < 2) return null;
  const stem = target.slice(0, -1);
  if (!/[㐀-鿿々]|（/.test(stem) && [...stem].length < 2) return null;   // radical trop court en kana seuls : trop ambigu
  let from = 0;
  while (true) {
    const i = text.indexOf(stem, from);
    if (i < 0) return null;
    const run = (text.slice(i + stem.length).match(/^[ぁ-ゖ]{1,6}/) || [''])[0];
    if (run && target.endsWith('い') && !target.endsWith('いい')) {
      const m = run.match(/^(?:かった|くて|く|ければ)/);
      if (m) return { index: i, surface: stem + m[0] };
    } else if (run && firstOk(target, run)) {
      for (let n = 1; n <= run.length; n++) {
        const p = run.slice(0, n);
        if (n > 1 && /[はをがのにも]/.test(p.slice(1))) break;          // une particule : on est sorti du mot
        if (/[^んい][でだ]/.test(p)) break;                               // 休みでした : で n'est pas une terminaison ici
        const rest = text.slice(i + stem.length + n);
        if (/[いっん]$/.test(p) && /^[てでただ]/.test(rest)) continue;    // 脱いで, 待って, 飲んだ : la forme continue
        if (TERMINAL.test(p) && FOLLOW.test(rest)) return { index: i, surface: stem + p };
      }
    }
    from = i + 1;
  }
}

/** Mot de vocabulaire à écrire : retiré d'une phrase d'exemple (forme conjuguée comprise), sinon à partir du sens */
export async function typedVocab(v) {
  const target = v.f || v.w;
  const pref = preferred();
  let ex = null, conj = null;
  const list = (await D.easiest(shuffle(await D.vocabExamples(v)), v.lv, e => e[0])).map(([jp, fr, reg, alt, fk]) => ({ ...inStyle({ jp, reg, alt }, pref), fr, fk }));
  for (const st of list) {
    const t = [target, v.w].find(x => x && st.text.includes(x));
    if (t) { ex = { jp: st.text.replace(t, `[${t}]`), fr: st.fr, fk: st.fk, reg: st.reg }; break; }
  }
  if (!ex) for (const st of list) {
    const m = conjugated(st.text, target) || (v.f && conjugated(st.text, v.w));
    if (m) { conj = m.surface; ex = { jp: st.text.slice(0, m.index) + `[${m.surface}]` + st.text.slice(m.index + m.surface.length), fr: st.fr, fk: st.fk, reg: st.reg }; break; }
  }
  return { key: null, kind: 'vocab-type', v, lv: v.lv, ex, conj, accept: [conj || target] };
}

/** Met en valeur, dans la traduction, le mot français qui correspond au sens du mot japonais */
const deacc = s => [...s].map(c => c.normalize('NFD')[0]).join('').toLowerCase();
const STOP = new Set(['les', 'des', 'une', 'pour', 'avec', 'dans', 'sur', 'qui', 'que', 'est', 'etre', 'avoir', 'faire', 'quelque', 'chose', 'quelqu', 'chez']);
export function highlightFr(fr, meaning, key = null) {
  const esc = t => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  // Passage indiqué dans les données : c'est lui qu'on surligne
  if (key && fr.includes(key)) {
    const i = fr.indexOf(key);
    return `${esc(fr.slice(0, i))}<mark class="fr-key">${esc(key)}</mark>${esc(fr.slice(i + key.length))}`;
  }
  if (!meaning) return esc(fr);
  const words = String(meaning).replace(/\([^)]*\)/g, ' ').split(/[,;/]/)
    .flatMap(alt => alt.trim().split(/[\s'’-]+/)).map(w => deacc(w).replace(/[^a-z]/g, ''))
    .filter(w => w.length >= 2 && !STOP.has(w)).sort((a, b) => b.length - a.length);
  const nfr = deacc(fr);
  for (const w of words) {
    const stem = w.length <= 3 ? w : w.slice(0, Math.max(3, w.length - 2));
    const re = new RegExp(`(^|[^a-z])(${stem}${w.length <= 3 ? '' : '[a-z]*'})(?![a-z])`, 'g');
    const m = re.exec(nfr);
    if (!m) continue;
    const start = m.index + m[1].length, end = start + m[2].length;
    return `${esc(fr.slice(0, start))}<mark class="fr-key">${esc(fr.slice(start, end))}</mark>${esc(fr.slice(end))}`;
  }
  return esc(fr);
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
  let idx = 0, ok = 0, seen = 0, lastSentence = null, keyHandler = null, askedAt = 0;
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
    askedAt = Date.now();
    const furi = showFuri(item.lv);
    let prompt;
    if (item.kind === 'cloze-type' || item.kind === 'vocab-type') return askTyped(item, furi);
    if (item.kind === 'cloze') {
      prompt = [
        h('div.kicker-row', h('p.kicker', `Complète la phrase · ${D.LEVEL_NAMES[item.lv]}`), regChip(item.s)),
        h('p.jp.big', { lang: 'ja', html: sentenceHTML(item.s, { furi }) }),
        h('p.fr', { html: highlightFr(item.s.fr, null, item.s.fk) })];
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

  // Exercice écrit : la phrase au centre, le sens en dessous, et une barre de réponse en bas (orthographe exacte)
  function askTyped(item, furi) {
    const input = h('input.type-answer', { type: 'text', lang: 'ja', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
      placeholder: '答え', 'aria-label': 'Ta réponse en japonais' });
    let romaji = false; try { romaji = S.getSettings().romaji ?? localStorage.getItem('sakura.theme.romaji') === '1'; } catch {}
    if (romaji) bindRomaji(input);
    const romajiBox = h('label.check.small.type-romaji', { title: 'En romaji, tape en MAJUSCULES pour obtenir des katakana' }, h('input', { type: 'checkbox', checked: romaji, onchange: e => {
      try { localStorage.setItem('sakura.theme.romaji', e.target.checked ? '1' : '0'); } catch {} S.setSettings({ romaji: e.target.checked });
      if (e.target.checked) bindRomaji(input); else toast('Romaji désactivé à la prochaine question');
      input.focus(); } }), h('span', 'Romaji (MAJUSCULES = katakana)'));
    const fb = h('p.type-feedback', { 'aria-live': 'polite' });
    const hintBox = h('div.type-hints');
    let tries = 0, hints = 0;
    const reading = kana(item.accept[0]).replace(/[〜～]/g, '');
    const hintSteps = [
      () => item.kind === 'cloze-type'
        ? h('p', h('strong', 'Sens du point visé : '), `« ${item.g.s} » · ${[...reading].length} kana`)
        : item.conj ? h('p', h('strong', 'Forme du dictionnaire : '), h('span', { lang: 'ja', html: ruby(item.v.f || item.v.w, true) }), ' — à conjuguer comme dans la phrase')
          : h('p', h('strong', 'Longueur : '), `${[...reading].length} kana`),
      () => {
        const ch = [...reading], k = Math.max(1, Math.ceil(ch.length / 2));
        return h('p', h('strong', 'Début : '), h('span.type-mask', { lang: 'ja' }, ch.slice(0, k).join('') + '＿'.repeat(ch.length - k)));
      },
    ];
    const hintBtn = h('button.chip-btn', { type: 'button', onclick: () => {
      if (hints >= hintSteps.length) return;
      hintBox.append(hintSteps[hints++]()); play('cursor');
      if (hints >= hintSteps.length) hintBtn.disabled = true;
      input.focus();
    } }, 'Indice');
    const giveUp = h('button.chip-btn.ghost', { type: 'button', onclick: () => finishTyped(false, true) }, 'Voir la réponse');
    // Écouter la phrase entière aide beaucoup : ça compte comme un indice
    const sentence = item.kind === 'cloze-type' ? item.s : item.ex;
    const listen = sentence ? h('button.bar-btn.listen', { type: 'button', title: 'Écouter la phrase (compte comme un indice)', 'aria-label': 'Écouter la phrase (compte comme un indice)',
      onclick: () => { hints = Math.max(hints, 1); speak(sentenceText(sentence)); input.focus(); },
      html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>' }) : null;
    const send = h('button.bar-btn.send', { type: 'button', 'aria-label': 'Valider', onclick: () => check(),
      html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 4.5l17 7.5-17 7.5 3-7.5z M6.5 12h7" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>' });
    const bar = h('div.answer-bar', listen, input, send);
    const tools = h('div.type-tools', hintBtn, giveUp, romajiBox);
    function finishTyped(right, gaveUp = false) {
      input.readOnly = true; bar.classList.add('done'); tools.remove(); fb.remove();
      answer(item, input.value.trim(), null, right, input, { gaveUp, tries, hints });
    }
    const check = () => {
      const v = input.value.trim();
      if (!v) { input.focus(); return; }
      if (item.accept.some(a => answerRegex(a).test(normJa(v)))) return finishTyped(true);
      tries++;
      play('wrong');
      bar.classList.remove('shake'); void bar.offsetWidth; bar.classList.add('shake');
      fb.textContent = tries === 1 ? 'Pas tout à fait : vérifie l’orthographe (ー, っ, petits kana, katakana…) et réessaie.'
        : `Toujours pas (${tries} essais). Prends un indice, ou regarde la réponse : la question sera à revoir.`;
      input.select();
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing && !input.readOnly) { e.preventDefault(); e.stopPropagation(); check(); } });
    let prompt;
    if (item.kind === 'cloze-type') {
      prompt = [
        h('p.jp.big.type-sentence', { lang: 'ja', html: sentenceHTML(item.s, { furi }) }),
        h('p.fr.type-fr', { html: highlightFr(item.s.fr, null, item.s.fk) })];
    } else if (item.kind === 'meaning-type') {
      prompt = [h('p.type-fr.solo', { html: `Écris le point de grammaire qui veut dire <mark class="fr-key">${item.g.s.replace(/[&<>]/g, '')}</mark>` })];
    } else if (item.ex) {
      prompt = [
        h('p.jp.big.type-sentence', { lang: 'ja', html: sentenceHTML(item.ex, { furi }) }),
        h('p.fr.type-fr', { html: highlightFr(item.ex.fr, item.v.m, item.ex.fk) })];
    } else {
      prompt = [h('p.type-fr.solo', { html: `Écris le mot qui veut dire <mark class="fr-key">${D.shortMeaning(item.v.m).replace(/[&<>]/g, '')}</mark>` })];
    }
    const chip = item.kind === 'cloze-type' ? regChip(item.s) : item.ex?.reg ? regChip(item.ex) : null;
    const nuances = item.kind === 'cloze-type' || item.conj ? nuanceChips(item.accept[0]) : [];
    stage.replaceChildren(h('div.card.question.typed.clean',
      h('div.type-top', h('span.type-tag', item.kind === 'cloze-type' ? `Grammaire · ${D.LEVEL_NAMES[item.lv]}` : item.kind === 'meaning-type' ? `Grammaire · ${D.LEVEL_NAMES[item.lv]}` : `Vocabulaire · ${item.lv}`),
        h('span.type-chips', ...nuances, chip)),
      h('div.type-body', ...prompt),
      hintBox, fb, tools, bar));
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
    // append() écrirait « null » pour un élément absent : on les ignore
    reveal.append = (...xs) => Element.prototype.append.call(reveal, ...xs.filter(x => x != null && x !== false));
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
      // Note automatique : raté → à revoir ; réussi avec aide ou erreur → difficile ;
      // réussi seul → bien, ou facile si la réponse est venue vite
      const secs = (Date.now() - (askedAt || Date.now())) / 1000;
      const len = [...plain(String(item.accept?.[0] || item.answer || ''))].length;
      const q = !right ? S.GRADES.AGAIN
        : (typedInfo?.tries || typedInfo?.hints) ? S.GRADES.HARD
        : secs < 5 + len * 0.8 ? S.GRADES.EASY : S.GRADES.GOOD;
      const label = { [S.GRADES.AGAIN]: 'à revoir', [S.GRADES.HARD]: 'difficile', [S.GRADES.GOOD]: 'bien', [S.GRADES.EASY]: 'facile' }[q];
      let note;
      if (right) {
        const d = S.previewIntervals(item.key)[q];
        note = h('p.auto-grade', h('span', `Noté « ${label} »`), ` · prochaine révision dans ${d === 1 ? '1 jour' : d < 30 ? `${d} jours` : `${Math.round(d / 30)} mois`}`);
      } else note = h('p.again-note', 'Cette carte revient un peu plus loin dans la séance.');
      actions.append(note, h('button.btn.primary', { onclick: () => done(item, q) }, 'Continuer'));
      setKeys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); done(item, q); } });
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
