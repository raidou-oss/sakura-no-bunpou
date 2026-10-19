// 並べ替え (Narabe) : remettre les morceaux d'une phrase dans l'ordre.
import { h, ruby, shuffle, jr } from '../util.js?v=20261019150232';
import { play as sfx } from '../sfx.js?v=20261019150232';
import { burst } from '../celebrate.js?v=20261019150232';
import { tileBoard } from './tiles.js?v=20261019150232';
import { speakBtn } from '../voice.js?v=20261019150232';
import * as D from '../data.js?v=20261019150232';
import * as S from '../srs.js?v=20261019150232';

const ROUNDS = 8;

export default async function narabe(root, { settings, saveBest }) {
  const sents = (await D.sentences()).filter(s => s.jp.split('|').length >= 3);
  let lv = settings.grammarLevels[0] || 'N5';
  const head = hud => h('header.game-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('並べ替え') }), 'Narabe'), hud);

  function menu() {
    const counts = Object.fromEntries(D.LEVELS.map(l => [l, sents.filter(s => s.lv === l).length]));
    root.replaceChildren(head(null), h('section.card.game-intro',
      h('p', `Lis la traduction, puis touche les morceaux ou fais-les glisser où tu veux dans la phrase pour la reconstruire. Tu peux les réordonner à tout moment. ${ROUNDS} phrases par partie.`),
      h('p', h('strong', 'Niveau')),
      h('div.choice-row', D.LEVELS.filter(l => counts[l] >= ROUNDS).map(l => h('button.btn.small', { 'aria-pressed': String(l === lv), onclick: e => {
        lv = l; e.target.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.target)));
      } }, `${l} (${counts[l]})`))),
      h('div.actions.left', h('button.btn.primary.big', { onclick: play }, 'Jouer'))));
  }

  function play() {
    const pool = shuffle(sents.filter(s => s.lv === lv)).slice(0, ROUNDS);
    const furi = settings.furigana === 'always' || (settings.furigana === 'auto' && (lv === 'N5' || lv === 'N4'));
    let i = 0, score = 0;
    const roundEl = h('b'), scoreEl = h('b', '0');
    const stage = h('div');
    root.replaceChildren(head(h('div.hud', h('span', 'Phrase ', roundEl), h('span', 'Score ', scoreEl))), stage);

    function round() {
      if (i >= pool.length) return end();
      roundEl.textContent = `${i + 1}/${pool.length}`;
      const s = pool[i];
      const pieces = s.jp.replace(/[[\]]/g, '').split('|').map((t, k) => ({ t, k }));
      let order;
      do { order = shuffle(pieces); } while (order.every((p, k) => p.k === k) && pieces.length > 1);
      const chosen = [];
      let tries = 0;
      const line = h('div.order-line'), tray = h('div.tile-pool'), fb = h('div.cafe-feedback', { 'aria-live': 'polite' });
      const ok = h('button.btn.primary', { onclick: check }, 'Valider');
      const render = tileBoard({ line, tray, items: order, chosen, html: p => ruby(p.t, furi), text: p => p.t,
        placeholder: 'Touche ou fais glisser les morceaux ici…', onChange: () => { ok.disabled = chosen.length !== pieces.length; } });
      function check() {
        const attempt = chosen.map(p => p.t).join('');
        const target = pieces.map(p => p.t).join('');
        if (attempt === target) {
          const pts = tries ? 1 : 3; score += pts; scoreEl.textContent = score;
          sfx('correct'); burst(line, { count: 26 }); S.recordPractice(`g:${s.g}`, true);
          fb.replaceChildren(h('p', tries ? 'Bien rattrapé. +1' : 'Parfait du premier coup. +3'), speakBtn(s.jp, { label: 'Réécouter la phrase', small: true }));
          finishRound();
        } else if (++tries >= 2) {
          S.recordPractice(`g:${s.g}`, false);
          sfx('wrong');
          fb.replaceChildren(h('p', 'La phrase était :'), h('p.correct-line', { lang: 'ja', html: ruby(target, true) }));
          finishRound();
        } else {
          sfx('wrong');
          let k = 0; while (chosen[k] && chosen[k].t === pieces[k].t) k++;
          fb.replaceChildren(h('p.small', k ? `Juste jusqu’au morceau ${k}. Essaie encore.` : 'Le premier morceau n’est pas le bon. Essaie encore.'));
          chosen.splice(k); render();
        }
      }
      function finishRound() {
        [...line.children, ...tray.children].forEach(b => b.disabled = true); ok.remove();
        const nx = h('button.btn.primary', { onclick: () => { i++; round(); } }, i + 1 >= pool.length ? 'Voir le score' : 'Phrase suivante');
        fb.append(nx); nx.focus();
      }
      stage.replaceChildren(h('div.card.narabe',
        h('p.kicker', 'Traduis en remettant dans l’ordre'), h('p.narabe-fr', s.fr),
        line, tray, h('div.actions.left', h('button.btn', { onclick: () => { chosen.length = 0; render(); } }, 'Effacer'), ok), fb));
      render();
    }

    function end() {
      const rec = saveBest(score, lv);
      root.replaceChildren(head(null), h('section.card.finish',
        h('h2', 'Bien joué'), h('p', `${score} points sur ${pool.length * 3}.`), rec ? h('p.small', 'Nouveau record !') : null,
        h('div.actions', h('button.btn.primary', { onclick: play }, 'Rejouer'), h('button.btn', { onclick: menu }, 'Changer de niveau'), h('a.btn', { href: '#/jeux' }, 'Autres jeux'))));
    }
    round();
  }

  menu();
}
