// 選択クイズ (Sentaku) : les anciennes questions à choix, en jeu. Trois vies, des séries qui rapportent.
import { play as sfx } from '../sfx.js?v=20261023204819';
import { burst } from '../celebrate.js?v=20261023204819';
import { h, shuffle, toast, jr, ruby } from '../util.js?v=20261023204819';
import * as D from '../data.js?v=20261023204819';
import * as S from '../srs.js?v=20261023204819';
import { sentenceHTML, clozeDisp, regChip, vocabPractice, highlightFr } from '../review.js?v=20261023204819';

const LIVES = 3;
const MODES = [['m', 'Les deux'], ['g', 'Grammaire'], ['v', 'Vocabulaire']];

export default async function choix(root, { settings, saveBest }) {
  const sents = await D.sentences();
  let lv = settings.grammarLevels[0] || 'N5';
  let mode = 'm';
  const head = hud => h('header.game-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('選択クイズ') }), 'Sentaku'), hud);
  const furiOf = l => settings.furigana === 'always' || (settings.furigana === 'auto' && (l === 'N5' || l === 'N4'));

  function choiceRow(list, cur, set) {
    return h('div.choice-row', list.map(([v, l]) => h('button.btn.small', { 'aria-pressed': String(v === cur), onclick: e => {
      set(v); e.target.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.target)));
    } }, l)));
  }

  function menu() {
    root.replaceChildren(head(null), h('section.card.game-intro',
      h('p', `Des questions à choix, sans fin : la bonne particule ou forme dans une phrase, ou le sens d'un mot. Une bonne réponse rapporte un point (plus en série). ${LIVES} erreurs et la partie s'arrête.`),
      h('p', h('strong', 'Niveau')), choiceRow(D.LEVELS.map(l => [l, l]), lv, v => { lv = v; }),
      h('p', h('strong', 'Questions')), choiceRow(MODES, mode, v => { mode = v; }),
      h('p.small', 'Au clavier : touches 1 à 4.'),
      h('div.actions.left', h('button.btn.primary.big', { onclick: play }, 'C’est parti'))));
  }

  async function play() {
    const vocab = mode === 'g' ? [] : await D.vocab(lv);
    const gs = mode === 'v' ? [] : sents.filter(s => s.lv === lv);
    let lives = LIVES, score = 0, combo = 0, answered = 0, good = 0, cur, locked = false;
    const scoreEl = h('b', '0'), livesEl = h('b.lives'), comboEl = h('span.combo');
    const card = h('div.card.question.dash');
    const lastEl = h('p.dash-last', { 'aria-live': 'polite' });
    const paintLives = () => { livesEl.textContent = '♥'.repeat(lives) + '♡'.repeat(LIVES - lives); };
    paintLives();
    root.replaceChildren(head(h('div.hud', h('span', 'Vies ', livesEl), h('span', 'Score ', scoreEl), comboEl)), card, lastEl);

    const keyFn = e => { const n = Number(e.key); const b = card.querySelectorAll('.option'); if (n >= 1 && n <= b.length) { e.preventDefault(); b[n - 1].click(); } };
    document.addEventListener('keydown', keyFn);
    const stop = () => document.removeEventListener('keydown', keyFn);
    window.addEventListener('hashchange', stop, { once: true });

    function next() {
      locked = false;
      const useG = gs.length && (!vocab.length || Math.random() < 0.5);
      const furi = furiOf(lv);
      if (useG) {
        const s = gs[Math.floor(Math.random() * gs.length)];
        const disp = clozeDisp(s);
        cur = { key: `g:${s.g}`, answer: s.a, fill: right => sentenceHTML(s, { fill: true, furi, cls: right ? 'ok' : 'ko' }) };
        card.replaceChildren(
          h('div.kicker-row', h('p.kicker', `Complète · ${lv}`), regChip(s)),
          h('p.jp.big', { lang: 'ja', html: sentenceHTML(s, { furi }) }),
          h('p.fr', { html: highlightFr(s.fr, null, s.fk) }),
          h('div.options.four', shuffle([s.a, ...s.d]).map((o, i) => h('button.option', { lang: 'ja', 'data-v': o, onclick: () => pickIt(o) },
            h('span.option-key', i + 1), h('span.option-text', { html: ruby(disp[o] || o, furi) })))));
      } else {
        const v = vocab[Math.floor(Math.random() * vocab.length)];
        const q = vocabPractice(v, vocab);
        cur = { key: D.vocabKey(v), answer: q.answer, fill: () => `${ruby(v.f || v.w, true)} : ${q.answer}` };
        card.replaceChildren(
          h('p.kicker', `Sens du mot · ${lv}`),
          h('p.word', { lang: 'ja', html: ruby(v.f || v.w, furi) }),
          h('div.options.four', q.options.map((o, i) => h('button.option', { 'data-v': o, onclick: () => pickIt(o) },
            h('span.option-key', i + 1), h('span.option-text', o)))));
      }
    }

    function pickIt(o) {
      if (locked) return;
      locked = true;
      const right = o === cur.answer;
      answered++;
      sfx(right ? 'correct' : 'wrong', { gap: 0 });
      S.recordPractice(cur.key, right);
      card.querySelectorAll('.option').forEach(b => {
        b.disabled = true;
        if (b.dataset.v === cur.answer) b.classList.add('correct'); else if (b.dataset.v === o) b.classList.add('wrong');
      });
      if (right) { good++; combo++; score += 1 + Math.floor(combo / 5); burst(card, { count: 12 }); }
      else { combo = 0; lives--; paintLives(); }
      lastEl.innerHTML = `${right ? '○' : '×'} <span lang="ja">${cur.fill(right)}</span>`;
      scoreEl.textContent = score;
      comboEl.textContent = combo >= 3 ? `série ×${combo}` : '';
      setTimeout(() => (lives > 0 ? next() : end()), right ? 350 : 900);
    }

    function end() {
      stop();
      const rec = saveBest(score, `${lv} · ${MODES.find(m => m[0] === mode)[1]}`);
      root.replaceChildren(head(null), h('section.card.finish',
        h('h2', 'Plus de vies'),
        h('p', `${score} points · ${good} bonne${good > 1 ? 's' : ''} réponse${good > 1 ? 's' : ''} sur ${answered}.`),
        rec ? h('p.small', 'Nouveau record !') : null,
        h('div.actions', h('button.btn.primary', { onclick: play }, 'Rejouer'), h('button.btn', { onclick: menu }, 'Changer de niveau'), h('a.btn', { href: '#/jeux' }, 'Autres jeux'))));
      if (rec) toast('新記録！');
    }
    next();
  }

  menu();
}
