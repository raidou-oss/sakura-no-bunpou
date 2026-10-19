// 助詞ダッシュ (Joshi Dash) : 60 secondes pour placer un maximum de particules.
import { h, shuffle, toast } from '../util.js?v=20261019020334';
import * as D from '../data.js?v=20261019020334';
import { sentenceHTML } from '../review.js?v=20261019020334';

const PARTICLES = new Set(['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'か', 'や', 'よ', 'ね', 'から', 'まで', 'より', 'しか', 'だけ', 'でも', 'ほど', 'こそ', 'さえ', 'すら', 'など', 'ばかり', 'くらい', 'ごろ', 'でも']);
const DURATION = 60;

export default async function joshi(root, { settings, saveBest }) {
  const all = (await D.sentences()).filter(s => PARTICLES.has(s.a));
  const head = hud => h('header.game-head', h('h1', h('span.jp-head', { lang: 'ja' }, '助詞ダッシュ'), 'Joshi Dash'), hud);

  function menu() {
    root.replaceChildren(head(null), h('section.card.game-intro',
      h('p', `${DURATION} secondes, des phrases à trous, une particule à choisir à chaque fois. Une bonne réponse rapporte un point (plus en série), une erreur coûte trois secondes.`),
      h('p.small', `${all.length} phrases disponibles. Au clavier : touches 1 à 4.`),
      h('div.actions.left', h('button.btn.primary.big', { onclick: play }, 'C’est parti'))));
  }

  function play() {
    let left = DURATION, score = 0, combo = 0, answered = 0, good = 0, queue = shuffle(all), timer, cur;
    const timeEl = h('b', DURATION), scoreEl = h('b', '0'), comboEl = h('span.combo');
    const card = h('div.card.question.dash');
    const lastEl = h('p.dash-last', { 'aria-live': 'polite' });
    root.replaceChildren(head(h('div.hud', h('span', 'Temps ', timeEl), h('span', 'Score ', scoreEl), comboEl)), card, lastEl);

    const keyFn = e => { const n = Number(e.key); const b = card.querySelectorAll('.option'); if (n >= 1 && n <= b.length) { e.preventDefault(); b[n - 1].click(); } };
    document.addEventListener('keydown', keyFn);
    const stop = () => { clearInterval(timer); document.removeEventListener('keydown', keyFn); };
    window.addEventListener('hashchange', stop, { once: true });

    function next() {
      if (!queue.length) queue = shuffle(all);
      cur = queue.pop();
      const furi = settings.furigana === 'always' || (settings.furigana === 'auto' && (cur.lv === 'N5' || cur.lv === 'N4'));
      card.replaceChildren(
        h('p.jp.big', { lang: 'ja', html: sentenceHTML(cur, { furi }) }),
        h('p.fr', cur.fr),
        h('div.options.four', shuffle([cur.a, ...cur.d]).map((o, i) => h('button.option', { lang: 'ja', onclick: () => pickIt(o) },
          h('span.option-key', i + 1), h('span.option-text', o)))));
    }

    function pickIt(o) {
      answered++;
      if (o === cur.a) { good++; combo++; score += 1 + Math.floor(combo / 5); card.classList.remove('flash-ko'); card.classList.add('flash-ok'); }
      else { combo = 0; left = Math.max(0, left - 3); card.classList.remove('flash-ok'); card.classList.add('flash-ko'); }
      setTimeout(() => card.classList.remove('flash-ok', 'flash-ko'), 250);
      lastEl.innerHTML = `${o === cur.a ? '○' : '×'} <span lang="ja">${sentenceHTML(cur, { fill: true, furi: false, cls: o === cur.a ? 'ok' : 'ko' })}</span>`;
      scoreEl.textContent = score; timeEl.textContent = Math.ceil(left);
      comboEl.textContent = combo >= 3 ? `série ×${combo}` : '';
      if (left > 0) next();
    }

    timer = setInterval(() => {
      left -= 1; timeEl.textContent = Math.max(0, left);
      if (left <= 0) end();
    }, 1000);

    function end() {
      stop();
      const rec = saveBest(score);
      root.replaceChildren(head(null), h('section.card.finish',
        h('h2', 'Temps écoulé'),
        h('p', `${score} points · ${good} bonne${good > 1 ? 's' : ''} réponse${good > 1 ? 's' : ''} sur ${answered}.`),
        rec ? h('p.small', 'Nouveau record !') : null,
        h('div.actions', h('button.btn.primary', { onclick: play }, 'Rejouer'), h('a.btn', { href: '#/jeux' }, 'Autres jeux'))));
      if (rec) toast('新記録！');
    }
    next();
  }

  menu();
}
