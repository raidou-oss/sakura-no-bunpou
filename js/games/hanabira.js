// 花びら (Hanabira) : des pétales portant des mots tombent ; attrape celui qui correspond au sens affiché.
import { play as sfx } from '../sfx.js?v=20261020182335';
import { h, ruby, shuffle, sample, pick, reducedMotion, toast, jr, esc } from '../util.js?v=20261020182335';
import * as D from '../data.js?v=20261020182335';
import * as S from '../srs.js?v=20261020182335';

export default async function hanabira(root, { params, settings, saveBest }) {
  let lv = params.get('lv') || settings.vocabLevels[0] || 'N5';
  const unit = params.get('unit') ? Number(params.get('unit')) : null;
  let raf, running = false;

  const head = hud => h('header.game-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('花びら') }), 'Hanabira'), hud);

  function menu() {
    cancelAnimationFrame(raf);
    root.replaceChildren(head(null), h('section.card.game-intro',
      h('p', 'Un sens s’affiche en bas. Quatre pétales tombent, chacun avec un mot japonais : touche le bon avant qu’il ne touche le sol. Trois erreurs et la partie s’arrête.'),
      h('p.small', 'Au clavier : touches 1 à 4, de gauche à droite.'),
      unit ? h('p', `Mots de l’unité choisie (${lv}).`) : [
        h('p', h('strong', 'Niveau')),
        h('div.choice-row', D.LEVELS.map(l => h('button.btn.small', { 'aria-pressed': String(l === lv), onclick: e => {
          lv = l; e.target.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.target)));
        } }, l)))],
      h('div.actions.left', h('button.btn.primary.big', { onclick: play }, 'Jouer'))));
  }

  async function play() {
    let words = await D.vocab(lv);
    if (unit) words = words.filter(w => w.unit === unit);
    if (words.length < 4) { toast('Pas assez de mots ici.'); return; }
    const furi = settings.furigana === 'always' || (settings.furigana === 'auto' && (lv === 'N5' || lv === 'N4'));
    let score = 0, lives = 3, speed = 55, round = 0, petals = [], target = null, last = 0, locked = false;

    const scoreEl = h('b', '0'), livesEl = h('b', '♥♥♥');
    const field = h('div.petal-field', { role: 'group', 'aria-label': 'Pétales qui tombent' });
    const prompt = h('div.petal-prompt', { 'aria-live': 'polite' });
    root.replaceChildren(head(h('div.hud', h('span', 'Score ', scoreEl), h('span', 'Vies ', livesEl))), field, prompt);

    const keyFn = e => {
      const n = Number(e.key);
      if (n >= 1 && n <= petals.length) { e.preventDefault(); [...petals].sort((a, b) => a.x - b.x)[n - 1]?.el.click(); }
    };
    document.addEventListener('keydown', keyFn);
    window.addEventListener('hashchange', () => { running = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', keyFn); }, { once: true });

    function newRound() {
      field.replaceChildren(); petals = []; locked = false; round++;
      target = pick(words);
      const tMean = D.shortMeaning(target.m);
      const others = sample(words.filter(w => w.w !== target.w && D.shortMeaning(w.m) !== tMean), 3);
      prompt.replaceChildren(h('span.small', 'Attrape :'), h('strong', tMean));
      const lanes = shuffle([0, 1, 2, 3]);
      shuffle([target, ...others]).forEach((w, i) => {
        const x = 2 + lanes[i] * 24.5 + Math.random() * 2;
        const el = h('button.falling', { lang: 'ja', style: { left: `${x}%` }, html: ruby(w.f || w.w, furi),
          onclick: () => hit(p) });
        const p = { w, el, x, y: -60 - Math.random() * 90, v: speed * (0.8 + Math.random() * 0.45) };
        field.append(el); petals.push(p);
      });
    }

    function hit(p) {
      if (locked) return;
      if (p.w === target) {
        locked = true; sfx('correct'); S.recordPractice(D.vocabKey(target), true); score += 10 + round; scoreEl.textContent = score;
        p.el.classList.add('caught');
        petals.forEach(q => q !== p && q.el.classList.add('gone'));
        speed = Math.min(150, speed + 4);
        setTimeout(newRound, reducedMotion() ? 150 : 550);
      } else {
        p.el.classList.add('wilted'); p.el.disabled = true;
        lose(`${ruby(p.w.f || p.w.w, true)} veut dire « ${esc(D.shortMeaning(p.w.m))} ».`);
      }
    }

    function lose(msg) {
      if (target) S.recordPractice(D.vocabKey(target), false);
      sfx('wrong'); lives--; livesEl.textContent = '♥'.repeat(Math.max(lives, 0)) + '♡'.repeat(3 - Math.max(lives, 0));
      prompt.append(h('span.small.miss', { lang: 'ja', html: msg }));
      if (lives <= 0) end();
    }

    function tick(t) {
      if (!running) return;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
      const H = field.clientHeight;
      for (const p of petals) {
        p.y += p.v * dt;
        p.el.style.transform = `translateY(${p.y}px) rotate(${Math.sin(p.y / 40) * 8}deg)`;
      }
      const tp = petals.find(p => p.w === target);
      if (!locked && tp && tp.y > H - 40) {
        locked = true;
        tp.el.classList.add('caught');
        lose(`C’était ${ruby(target.f || target.w, true)}.`);
        if (lives > 0) setTimeout(newRound, 900);
      }
      raf = requestAnimationFrame(tick);
    }

    function end() {
      running = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', keyFn);
      const rec = saveBest(score, unit ? `${lv} · unité ${unit}` : lv);
      setTimeout(() => root.replaceChildren(head(null), h('section.card.finish',
        h('h2', 'Les pétales se sont posés'),
        h('p', `${score} points, ${round} pétale${round > 1 ? 's' : ''} lancé${round > 1 ? 's' : ''}.`),
        rec ? h('p.small', 'Nouveau record !') : null,
        h('div.actions', h('button.btn.primary', { onclick: play }, 'Rejouer'), h('button.btn', { onclick: menu }, 'Changer de niveau'), h('a.btn', { href: '#/jeux' }, 'Autres jeux')))), 900);
    }

    running = true; last = 0; newRound(); raf = requestAnimationFrame(tick);
  }

  menu();
}
