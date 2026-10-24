// PIB RUSH : un montant tombe sur l'écran, écris-le en japonais (kanji ou kana) avant la fin du chrono.
// Plus tu enchaînes, plus les nombres grossissent : de quelques yens au PIB d'un pays… et au-delà.
import { h, jr, ruby, kanaKeyboardToggle, smoothType, hitFx, HIT_WORDS, toast } from '../util.js?v=20261024114041';
import * as S from '../srs.js?v=20261024114041';
import { play } from '../sfx.js?v=20261024114041';
import { toJapanese, checkNumber, by4, by3 } from '../numbers.js?v=20261024114041';

const TIME = 60;
const FLAVOR = [
  [1e1, 'Prix d’un bonbon', '円'], [1e3, 'Un repas', '円'], [1e4, 'Une sortie entre amis', '円'], [1e5, 'Un loyer à Tokyo', '円'],
  [1e6, 'Une voiture d’occasion', '円'], [1e8, 'Un appartement à Shibuya', '円'], [1e10, 'Le budget d’une ville', '円'],
  [1e12, 'Le chiffre d’affaires d’un géant', '円'], [1e14, 'Le PIB d’un pays', '円'], [1e16, 'La dette mondiale (presque)', '円'],
];
const pickFlavor = n => { let f = FLAVOR[0]; for (const x of FLAVOR) if (n >= x[0]) f = x; return f; };
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
/** Nombre « rond » de la bonne taille : quelques chiffres significatifs, le reste à zéro */
function makeNumber(level) {
  const digits = Math.min(17, 1 + Math.floor(level * 1.25) + rnd(0, 1));
  const sig = Math.min(digits, rnd(1, Math.min(4, 1 + Math.floor(level / 2))));
  let s = String(rnd(1, 9));
  for (let k = 1; k < sig; k++) s += rnd(0, 9);
  return BigInt(s + '0'.repeat(digits - sig));
}

export default function pib(root, { settings, saveBest }) {
  const head = hud => h('header.game-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('数') }), 'PIB RUSH'), hud);
  let timer = null;
  const stop = () => { clearInterval(timer); timer = null; };
  window.addEventListener('hashchange', stop, { once: true });

  function menu() {
    stop();
    const best = S.getExtra('games', {}).pib || 0;
    root.replaceChildren(head(null), h('section.card.pib-intro',
      h('div.pib-ticker', { 'aria-hidden': 'true' }, h('span', '¥ 1,0000,0000,0000'), h('b', '一兆円')),
      h('p.kicker', 'GDP RUSH · 国内総生産'),
      h('h2', 'Un montant apparaît : écris-le en japonais'),
      h('ul',
        h('li', 'Kanji (', h('span', { lang: 'ja' }, '三千万'), ') ou kana (', h('span', { lang: 'ja' }, 'さんぜんまん'), '), comme tu veux.'),
        h('li', '60 secondes. Chaque bonne réponse rapporte du temps et fait grossir les nombres : du prix d’un bonbon au PIB d’un pays.'),
        h('li', 'Astuce : regarde les groupes de 4 chiffres (万, 億, 兆, 京).')),
      best ? h('p.small', `Record : ${best}`) : null,
      h('div.actions', h('button.btn.primary', { onclick: start }, 'Lancer le rush'), h('a.btn', { href: '#/nombres' }, 'Revoir la leçon des nombres'))));
  }

  function start() {
    let left = TIME, score = 0, level = 1, streak = 0, n = 0n, done = 0;
    const timeEl = h('b', String(TIME)), scoreEl = h('b', '0'), lvlEl = h('b', '1');
    const timeBar = h('span.pib-time', h('i'));
    const hud = h('div.hud', h('span', '⏱ ', timeEl, ' s'), h('span', 'Score ', scoreEl), h('span', 'Palier ', lvlEl));
    const flavorEl = h('p.pib-flavor'), numEl = h('p.pib-num'), groupEl = h('p.pib-groups');
    const input = h('input.type-answer.pib-input', { type: 'text', lang: 'ja', autocomplete: 'off', spellcheck: 'false', placeholder: '漢字 ou かな', 'aria-label': 'Le montant en japonais' });
    const kb = kanaKeyboardToggle(input, {
      get: () => { try { return S.getSettings().romaji ?? localStorage.getItem('sakura.theme.romaji') === '1'; } catch { return false; } },
      set: on => { try { localStorage.setItem('sakura.theme.romaji', on ? '1' : '0'); } catch {} S.setSettings({ romaji: on }); } });
    smoothType(input);
    const fb = h('p.pib-fb', { 'aria-live': 'polite' });
    const card = h('div.card.pib-card', timeBar, flavorEl, numEl, groupEl,
      h('div.answer-bar.sm-bar-in', input, h('button.btn.primary', { onclick: () => check() }, 'OK')),
      h('div.type-tools', h('button.chip-btn', { type: 'button', onclick: hint }, 'Groupes de 4 (−3 s)'), h('button.chip-btn.ghost', { type: 'button', onclick: skip }, 'Passer'), kb), fb);
    root.replaceChildren(head(hud), h('div.pib-stage', card));
    const nextNum = () => {
      n = makeNumber(level);
      const [, label] = pickFlavor(Number(n));
      flavorEl.textContent = label;
      numEl.textContent = `¥ ${by3(n)}`;
      numEl.classList.remove('in'); void numEl.offsetWidth; numEl.classList.add('in');
      groupEl.textContent = '';
      input.value = ''; input.dispatchEvent(new Event('input')); input.focus();
    };
    function hint() { groupEl.textContent = `¥ ${by4(n)}`; left = Math.max(1, left - 3); play('cursor'); input.focus(); }
    function skip() { const j = toJapanese(n); fb.innerHTML = `Passé : <span lang="ja"><ruby>${j.kanji}<rt>${j.reading}</rt></ruby></span>`; streak = 0; play('back'); nextNum(); }
    function check() {
      if (!input.value.trim()) return;
      if (checkNumber(n, input.value)) {
        done++; streak++;
        const gain = Math.round(10 * level * (1 + Math.min(streak, 10) * .1));
        score += gain; scoreEl.textContent = String(score);
        left = Math.min(TIME, left + 4 + Math.floor(level / 3));
        if (done % 3 === 0) { level = Math.min(13, level + 1); lvlEl.textContent = String(level); }
        const j = toJapanese(n);
        fb.innerHTML = `+${gain} · <span lang="ja"><ruby>${j.kanji}<rt>${j.reading}</rt></ruby></span>`;
        play('correct'); hitFx(numEl, { card, stamp: streak >= 3 ? `COMBO ×${streak}` : HIT_WORDS[done % HIT_WORDS.length] });
        nextNum();
      } else {
        streak = 0; play('wrong'); left = Math.max(1, left - 2);
        card.classList.remove('sm-shake'); void card.offsetWidth; card.classList.add('sm-shake');
        fb.textContent = 'Pas ça (−2 s). Pense aux groupes de 4 chiffres.';
        input.select();
      }
    }
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); check(); } });
    nextNum();
    stop();
    timer = setInterval(() => {
      left -= .1;
      timeEl.textContent = String(Math.ceil(left));
      timeBar.firstChild.style.width = `${(left / TIME) * 100}%`;
      timeBar.classList.toggle('low', left < 10);
      if (left <= 0) { stop(); end(score, done, level, n); }
    }, 100);
  }

  function end(score, done, level, last) {
    const record = saveBest(score);
    const j = toJapanese(last);
    root.replaceChildren(head(null), h('section.card.finish',
      h('p.kicker', '時間切れ！'), h('h2', `${score} points`),
      h('p', `${done} montant${done > 1 ? 's' : ''} écrit${done > 1 ? 's' : ''}, palier ${level} atteint.`),
      h('p.small', 'Le dernier était : ', h('span', { lang: 'ja', html: `<ruby>${j.kanji}<rt>${j.reading}</rt></ruby>` }), ` (¥ ${by3(last)})`),
      record ? h('p.small', 'Nouveau record !') : null,
      h('div.actions', h('button.btn.primary', { onclick: start }, 'Rejouer'), h('a.btn', { href: '#/nombres' }, 'Leçon des nombres'), h('a.btn.ghost', { href: '#/jeux' }, 'Autres jeux'))));
    if (record) toast('新記録！');
    void ruby; void settings;
  }

  menu();
}
