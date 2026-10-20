// 作文 (Thème) : une phrase en français, à écrire entièrement en japonais, librement.
// Correction tolérante : kanji ou kana au choix pour chaque mot, hiragana / katakana équivalents,
// ponctuation et espaces ignorés. Sinon, on montre la différence caractère par caractère.
import { h, ruby, shuffle, kana, plain, jr, hitFx, HIT_WORDS, smoothType } from '../util.js?v=20261020223621';
import * as D from '../data.js?v=20261020223621';
import * as S from '../srs.js?v=20261020223621';
import { play as sfx } from '../sfx.js?v=20261020223621';
import { speakBtn } from '../voice.js?v=20261020223621';
import { burst } from '../celebrate.js?v=20261020223621';
import { regChip } from '../review.js?v=20261020223621';

const ROUNDS = 6;
const KANJI_READING = /([㐀-鿿豈-﫿々〆ヶ〇]+)（([^）]+)）/g;
const PUNCT = /[\s　。、．，,.!！?？「」『』（）()・…〜～ー-]/g;
const hira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const norm = s => hira(s.normalize('NFKC').replace(PUNCT, ''));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Expression régulière qui accepte, pour chaque mot à lecture, le kanji OU sa lecture */
function answerRegex(jp) {
  const src = jp.replace(/[[\]|]/g, '');
  let re = '', last = 0;
  for (const m of src.matchAll(KANJI_READING)) {
    re += esc(norm(src.slice(last, m.index)));
    re += `(?:${esc(norm(m[1]))}|${esc(norm(m[2]))})`;
    last = m.index + m[0].length;
  }
  re += esc(norm(src.slice(last)));
  return new RegExp(`^${re}$`);
}

/** Différence (plus longue sous-séquence commune) : [{ch, op: 'ok'|'miss'|'extra'}] */
function diff(a, b) {
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ ch: b[j], op: 'ok' }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { out.push({ ch: a[i], op: 'extra' }); i++; }
    else { out.push({ ch: b[j], op: 'miss' }); j++; }
  }
  while (i < n) out.push({ ch: a[i++], op: 'extra' });
  while (j < m) out.push({ ch: b[j++], op: 'miss' });
  return { ops: out, ratio: m ? L[0][0] / Math.max(n, m) : 0 };
}

let wanakana = null;
async function loadWanakana() {
  if (wanakana) return wanakana;
  try { wanakana = await import('https://cdn.jsdelivr.net/npm/wanakana@5.3.1/+esm'); } catch { wanakana = false; }
  return wanakana;
}

export default async function theme(root, { settings, saveBest, params }) {
  const [sents, grammar] = await Promise.all([D.sentences(), D.grammar()]);
  const byId = new Map(grammar.map(g => [g.id, g]));
  let lv = params?.get('lv') || settings.grammarLevels[0] || 'N5';
  const lesson = params?.get('le') ? Number(params.get('le')) : null;
  let romaji = settings.romaji ?? localStorage.getItem('sakura.theme.romaji') === '1';
  const head = hud => h('header.game-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('作文') }), 'Thème'), hud);

  const poolFor = l => sents.filter(s => s.lv === l && (!lesson || byId.get(s.g)?.le === lesson));

  function menu() {
    const counts = Object.fromEntries(D.LEVELS.map(l => [l, poolFor(l).length]));
    const romajiBox = h('label.check', h('input', { type: 'checkbox', checked: romaji, onchange: e => { romaji = e.target.checked; try { localStorage.setItem('sakura.theme.romaji', romaji ? '1' : '0'); } catch {} S.setSettings({ romaji }); } }),
      h('span', '⌨ Clavier japonais : tape en romaji sur ton clavier, ça devient des kana (« neko » → ねこ, « NEKO » → ネコ)'));
    root.replaceChildren(head(null), h('section.card.game-intro',
      h('p', `Lis la phrase en français et écris-la en japonais, en entier. ${ROUNDS} phrases par partie.`),
      h('p.small', 'Kanji ou kana, comme tu veux : 日本語 et にほんご sont acceptés tous les deux. La ponctuation et les espaces ne comptent pas.'),
      lesson ? h('p.small', `Phrases de la leçon ${lesson}.`) : null,
      h('p', h('strong', 'Niveau')),
      h('div.choice-row', D.LEVELS.filter(l => counts[l] >= 1).map(l => h('button.btn.small', { 'aria-pressed': String(l === lv), onclick: e => {
        lv = l; e.target.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.target)));
      } }, `${l} (${counts[l]})`))),
      h('div.checks', romajiBox),
      h('div.actions.left', h('button.btn.primary.big', { onclick: start }, 'Commencer'))));
  }

  async function start() {
    const pool = shuffle(poolFor(lv)).slice(0, ROUNDS);
    if (!pool.length) return menu();
    const wk = romaji ? await loadWanakana() : null;
    const furi = settings.furigana !== 'never';
    let i = 0, score = 0;
    const roundEl = h('b'), scoreEl = h('b', '0');
    const stage = h('div');
    root.replaceChildren(head(h('div.hud', h('span', 'Phrase ', roundEl), h('span', 'Score ', scoreEl))), stage);

    function round() {
      if (i >= pool.length) return end();
      roundEl.textContent = `${i + 1}/${pool.length}`;
      const s0 = pool[i], g = byId.get(s0.g);
      // Style demandé : celui des réglages s'il existe une variante, sinon celui de la phrase
      const pref = { polite: 'p', plain: 'n' }[S.getSettings().register];
      const swap = !!(pref && s0.alt && s0.reg && pref !== s0.reg);
      const s = swap ? { ...s0, jp: s0.alt, reg: pref } : s0;
      const other = s0.alt ? (swap ? s0.jp : s0.alt) : null;
      const re = answerRegex(s.jp), reOther = other ? answerRegex(other) : null;
      const kanjiT = norm(plain(s.jp)), kanaT = norm(kana(s.jp.replace(/[[\]|]/g, '')));
      let tries = 0, hintLevel = 0, closed = false;
      const input = h('textarea.theme-input', { lang: 'ja', rows: 2, placeholder: romaji ? 'Tape en romaji : kinou sushi wo tabeta…' : 'Écris la phrase en japonais…', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Ta phrase en japonais' });
      if (wk && wk.bind) wk.bind(input, { IMEMode: true });
      smoothType(input);
      const fb = h('div.theme-feedback', { 'aria-live': 'polite' });
      const hint = h('div.theme-hint');
      const ok = h('button.btn.primary', { onclick: check }, 'Valider');
      const hintBtn = h('button.btn', { onclick: showHint }, 'Indice');
      const skip = h('button.btn.ghost', { onclick: () => reveal(false) }, 'Voir la réponse');
      input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); closed ? next() : check(); } });

      // Indices : ils aident à trouver, sans jamais donner la phrase
      let lastPrefix = null;
      function showHint() {
        hintLevel++;
        sfx('cursor');
        const style = s.reg === 'p' ? 'forme polie (です・ます)' : s.reg === 'n' ? 'forme neutre (forme simple)' : null;
        const lines = [h('p', h('strong', 'Idée à exprimer : '), g ? `« ${g.s} »` : 'relis bien la phrase française', style ? ` · ${style}` : '')];
        // Construction générale (ex. « Verbe + たことがある ») seulement si c'est un modèle, pas un mot qui serait la réponse
        if (hintLevel >= 2 && g) {
          const label = D.gramLabel(g);
          const pattern = /[〜～+＋A-Za-zÀ-ÿ]/.test(label);
          lines.push(pattern
            ? h('p', h('strong', 'Construction à utiliser : '), h('span', { lang: 'ja', html: ruby(label, true) }), ' — ', h('a', { href: `#/point/${g.id}`, target: '_blank', rel: 'noopener' }, 'revoir la fiche'))
            : h('p', h('strong', 'Pour t’aider : '), `relis la fiche du point qui veut dire « ${g.s} » (sans regarder la phrase) : `, h('a', { href: `#/point/${g.id}`, target: '_blank', rel: 'noopener' }, 'ouvrir la fiche')));
        }
        if (hintLevel >= 3) {
          const n = s.jp.split('|').length;
          lines.push(lastPrefix
            ? h('p', h('strong', 'Où ça coince : '), 'ta dernière phrase est juste jusqu’à « ', h('span', { lang: 'ja' }, lastPrefix), ' », c’est la suite qu’il faut revoir.')
            : h('p', h('strong', 'Structure : '), `la phrase se découpe en ${n} morceaux. Écris-en une version, je te dirai où ça coince.`));
        }
        hint.replaceChildren(...lines);
        if (hintLevel >= 3) hintBtn.disabled = true;
      }
      function check() {
        const raw = input.value.trim();
        if (!raw) { input.focus(); return; }
        const v = norm(wk?.toKana ? wk.toKana(raw, { IMEMode: true }) : raw);
        const otherStyle = !re.test(v) && reOther?.test(v);
        if (otherStyle) {
          S.recordPractice(`g:${s.g}`, true);
          score += 2; scoreEl.textContent = score;
          sfx('correct'); burst(input, { count: 16 });
          fb.replaceChildren(h('p.theme-ok', 'Juste ! +2'),
            h('p.small', `Ta phrase est correcte, mais en forme ${s.reg === 'p' ? 'neutre' : 'polie'} : on demandait la forme ${s.reg === 'p' ? 'polie (です・ます)' : 'neutre (forme simple)'}.`), answerLine());
          hitFx(input, { card: input.closest('.card'), stamp: 'OK!', pop: false });
          return close();
        }
        if (re.test(v)) {
          S.recordPractice(`g:${s.g}`, true);
          const pts = Math.max(1, (tries ? 2 : 3) - (hintLevel ? 1 : 0)); score += pts; scoreEl.textContent = score;
          sfx('correct'); burst(input, { count: 28 });
          fb.replaceChildren(h('p.theme-ok', tries ? `Bien corrigé ! +${pts}` : `Parfait ! +${pts}`), answerLine());
          hitFx(input, { card: input.closest('.card'), stamp: tries ? 'NICE!' : HIT_WORDS[(Math.random() * HIT_WORDS.length) | 0], pop: false });
          return close();
        }
        tries++;
        // On compare à la version (kanji ou kana) la plus proche, mais on ne montre que TA phrase :
        // en vert ce qui est juste, barré ce qui ne va pas, ▢ là où il manque quelque chose (sans dire quoi)
        const a = diff(v, kanjiT), b = diff(v, kanaT);
        const best = a.ratio >= b.ratio ? a : b;
        sfx('wrong');
        const view = h('p.theme-diff', { lang: 'ja' });
        let prev = null;
        for (const o of best.ops) {
          if (o.op === 'miss') { if (prev !== 'miss') view.append(h('span.d-gap', { title: 'Il manque quelque chose ici' }, '▢')); }
          else view.append(h(`span.d-${o.op === 'ok' ? 'ok' : 'extra'}`, o.ch));
          prev = o.op;
        }
        const firstBad = best.ops.findIndex(o => o.op !== 'ok');
        lastPrefix = firstBad > 0 ? best.ops.slice(0, firstBad).filter(o => o.op === 'ok').map(o => o.ch).join('') : null;
        const onlyEnd = firstBad >= 0 && best.ops.slice(firstBad).every(o => o.op === 'miss');
        const tips = [];
        if (onlyEnd) tips.push('Le début est juste : il manque quelque chose à la fin.');
        const polite = /(?:です|ます|でした|ました|ません|ましょう)/.test(v);
        if (s.reg === 'p' && !polite) tips.push('On demande la forme polie (です・ます).');
        if (s.reg === 'n' && polite) tips.push('On demande la forme neutre, sans です・ます.');
        fb.replaceChildren(h('p', `Pas tout à fait (${Math.round(best.ratio * 100)} % de ressemblance). En vert ce qui est juste, barré ce qui ne va pas, ▢ là où il manque quelque chose.`), view,
          ...tips.map(t => h('p.theme-tip', t)),
          h('p.small', tries >= 3 ? 'Prends un indice, ou clique sur « Voir la réponse » (la phrase sera à revoir).' : 'Corrige et valide à nouveau.'));
        input.focus();
      }
      function answerLine() {
        return h('div.theme-answer', h('p.jp', { lang: 'ja', html: ruby(s.jp.replace(/[[\]|]/g, ''), true) }), speakBtn(plain(s.jp), { label: 'Écouter la phrase', small: true }));
      }
      // Réponse consultée : on montre la phrase et l'explication, et le point part dans les révisions « à revoir »
      function reveal() {
        sfx('back');
        const k = `g:${s.g}`;
        S.recordPractice(k, false);
        if (S.getCard(k)) S.grade(k, S.GRADES.AGAIN); else S.addCard(k);
        fb.replaceChildren(h('p', 'La phrase était :'), answerLine(),
          g ? h('p.small', 'Explication : ', h('span', { lang: 'ja', html: ruby(D.gramLabel(g), true) }), ` — ${g.s}. `, h('a', { href: `#/point/${g.id}` }, 'Voir la fiche')) : null,
          h('p.again-note', 'Réponse consultée : ce point est ajouté à tes révisions comme « à revoir ».'));
        close();
      }
      function close() {
        closed = true; input.readOnly = true; ok.remove(); hintBtn.remove(); skip.remove();
        const nx = h('button.btn.primary', { onclick: next }, i + 1 >= pool.length ? 'Voir le score' : 'Phrase suivante');
        fb.append(h('div.actions.left', nx)); nx.focus();
      }
      function next() { i++; round(); }

      stage.replaceChildren(h('div.card.theme',
        h('div.kicker-row', h('p.kicker', `Thème · ${lv}`), regChip(s)),
        h('p.narabe-fr', s.fr),
        input, hint,
        h('div.actions.left', ok, hintBtn, skip),
        fb));
      input.focus();
    }

    function end() {
      const rec = saveBest(score, lv);
      root.replaceChildren(head(null), h('section.card.finish',
        h('h2', 'Thème terminé'), h('p', `${score} points sur ${pool.length * 3}.`), rec ? h('p.small', 'Nouveau record !') : null,
        h('div.actions', h('button.btn.primary', { onclick: start }, 'Rejouer'), h('button.btn', { onclick: menu }, 'Changer de niveau'), h('a.btn', { href: '#/jeux' }, 'Autres jeux'))));
    }
    round();
  }
  menu();
}
