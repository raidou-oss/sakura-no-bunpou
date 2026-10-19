// コトバ珈琲 (Kotoba Kōhī) : un client étranger dicte sa commande en français,
// tu la passes au barista en japonais, puis tu lis le montant annoncé en caisse.
import { play } from '../sfx.js?v=20261019124428';
import { burst } from '../celebrate.js?v=20261019124428';
import { tileBoard } from './tiles.js?v=20261019124428';
import { h, ruby, shuffle, pick, sample, toast, jr } from '../util.js?v=20261019124428';

const DRINKS = [
  { hot: 'ホットコーヒー', ice: 'アイスコーヒー', fr: ['café', 'cafés'], g: 'm', price: 380 },
  { hot: '紅茶（こうちゃ）', ice: 'アイスティー', fr: ['thé', 'thés'], g: 'm', price: 360 },
  { hot: 'カフェラテ', ice: 'アイスカフェラテ', fr: ['café latte', 'cafés latte'], g: 'm', price: 450 },
  { hot: '抹茶（まっちゃ）ラテ', ice: 'アイス抹茶（まっちゃ）ラテ', fr: ['matcha latte', 'matcha latte'], g: 'm', price: 520 },
  { hot: 'ココア', ice: 'アイスココア', fr: ['chocolat', 'chocolats'], g: 'm', price: 420 },
];
const COLD_ONLY = [{ name: 'オレンジジュース', fr: ['jus d’orange', 'jus d’orange'], g: 'm', price: 400 }];
const FOOD = [
  { name: 'ケーキ', fr: ['gâteau', 'gâteaux'], g: 'm', price: 480 },
  { name: 'チーズケーキ', fr: ['cheesecake', 'cheesecakes'], g: 'm', price: 520 },
  { name: 'クッキー', fr: ['cookie', 'cookies'], g: 'm', price: 200 },
  { name: 'サンドイッチ', fr: ['sandwich', 'sandwichs'], g: 'm', price: 550 },
  { name: 'どら焼（や）き', fr: ['dorayaki', 'dorayakis'], g: 'm', price: 250 },
  { name: 'メロンパン', fr: ['melon pan', 'melon pans'], g: 'm', price: 220 },
];
const COUNT = ['', '一（ひと）つ', '二（ふた）つ', '三（みっ）つ', '四（よっ）つ', '五（いつ）つ'];
const WRONG_COUNTERS = ['', ['一本（いっぽん）', '一枚（いちまい）', '一人（ひとり）'], ['二本（にほん）', '二枚（にまい）', '二人（ふたり）'],
  ['三本（さんぼん）', '三枚（さんまい）', '三人（さんにん）'], ['四本（よんほん）', '四枚（よんまい）', '四人（よにん）'], ['五本（ごほん）', '五枚（ごまい）', '五人（ごにん）']];
const FR_NUM = ['', 'un', 'deux', 'trois', 'quatre', 'cinq'];
const SIZES = [{ jp: 'Sサイズの', fr: 'en petit' }, { jp: 'Mサイズの', fr: 'en moyen' }, { jp: 'Lサイズの', fr: 'en grand' }];
const PLACES = [{ jp: '持（も）ち帰（かえ）りで', fr: 'C’est à emporter.' }, { jp: '店内（てんない）で', fr: 'C’est pour manger sur place.' }];
const MODS = [
  { jp: '砂糖（さとう）なしで', fr: 'sans sucre' },
  { jp: '氷（こおり）少（すく）なめで', fr: 'avec peu de glaçons', iceOnly: true },
  { jp: 'ミルク多（おお）めで', fr: 'avec plus de lait' },
];
const ENDINGS = ['ください', 'お願（ねが）いします'];
const CUSTOMERS = [
  ['Emma', 'Lyon'], ['Lucas', 'Bruxelles'], ['Chloé', 'Montréal'], ['Hugo', 'Genève'], ['Inès', 'Marseille'],
  ['Nathan', 'Lille'], ['Léa', 'Dakar'], ['Yanis', 'Toulouse'], ['Manon', 'Nantes'], ['Malik', 'Abidjan'],
  ['Camille', 'Bordeaux'], ['Jules', 'Rennes'], ['Sarah', 'Strasbourg'], ['Adam', 'Casablanca'],
];
const HELLO = ['Bonjour !', 'Salut !', 'Bonsoir !', 'Excusez-moi…'];
const LEVELS = [
  { id: 1, jp: '見習（みなら）い', name: 'Apprenti', note: 'Un article, compteur en つ, ください.', time: 50 },
  { id: 2, jp: 'バリスタ', name: 'Barista', note: 'Taille, sur place ou à emporter, parfois deux articles.', time: 55 },
  { id: 3, jp: '店長（てんちょう）', name: 'Gérant', note: 'Deux articles, préférences (sans sucre…), quantités jusqu’à cinq.', time: 60 },
];
const SHIFT = 6;

// --- Nombres en japonais -----------------------------------------------------------
const DIG = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const KANA = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
export function jpNumber(n) {
  const th = Math.floor(n / 1000), hu = Math.floor(n / 100) % 10, te = Math.floor(n / 10) % 10, un = n % 10;
  const k = (th ? (th > 1 ? DIG[th] : '') + '千' : '') + (hu ? (hu > 1 ? DIG[hu] : '') + '百' : '') + (te ? (te > 1 ? DIG[te] : '') + '十' : '') + DIG[un];
  const rTh = { 1: 'せん', 3: 'さんぜん', 8: 'はっせん' }[th] ?? (th ? KANA[th] + 'せん' : '');
  const rHu = { 1: 'ひゃく', 3: 'さんびゃく', 6: 'ろっぴゃく', 8: 'はっぴゃく' }[hu] ?? (hu ? KANA[hu] + 'ひゃく' : '');
  const rTe = te ? (te > 1 ? KANA[te] : '') + 'じゅう' : '';
  return { kanji: k, reading: rTh + rHu + rTe + KANA[un] };
}

// --- Génération d'une commande ---------------------------------------------------------
function makeLine(level, avoid) {
  const kind = Math.random() < (level === 1 ? 0.55 : 0.65) ? 'drink' : 'food';
  const qty = 1 + Math.floor(Math.random() * (level === 3 ? 5 : 3));
  if (kind === 'drink') {
    const cold = Math.random() < 0.15;
    if (cold) {
      const d = COLD_ONLY[0];
      return { name: d.name, wrongName: pick(DRINKS).hot, frName: qty > 1 ? d.fr[1] : d.fr[0], qty, price: d.price, drink: true, ice: true };
    }
    let d; do { d = pick(DRINKS); } while (d === avoid);
    const ice = Math.random() < 0.5;
    const frBase = qty > 1 ? d.fr[1] : d.fr[0];
    const frTemp = ice ? (qty > 1 ? 'glacés' : 'glacé') : (qty > 1 ? 'chauds' : 'chaud');
    return { src: d, name: ice ? d.ice : d.hot, wrongName: ice ? d.hot : d.ice, frName: `${frBase} ${frTemp}`, qty, price: d.price + (ice ? 30 : 0), drink: true, ice };
  }
  let f; do { f = pick(FOOD); } while (f === avoid);
  return { src: f, name: f.name, wrongName: pick(FOOD.filter(x => x !== f)).name, frName: qty > 1 ? f.fr[1] : f.fr[0], qty, price: f.price, drink: false };
}

export function makeOrder(level) {
  const lines = [makeLine(level)];
  if (level === 3 || (level === 2 && Math.random() < 0.35)) lines.push(makeLine(level, lines[0].src));
  const first = lines[0];
  const size = level >= 2 && first.drink && Math.random() < 0.6 ? pick(SIZES) : null;
  const place = level === 3 || (level === 2 && Math.random() < 0.5) ? pick(PLACES) : null;
  const mods = level === 3 && first.drink && Math.random() < 0.6 ? MODS.filter(m => !m.iceOnly || first.ice) : [];
  const mod = mods.length ? pick(mods) : null;
  const ending = level === 3 ? ENDINGS[1] : pick(ENDINGS);

  // Tuiles canoniques
  const lineTiles = (l, i) => [...(i === 0 && size ? [size.jp] : []), l.name, 'を', COUNT[l.qty]];
  const body = lines.flatMap((l, i) => i ? ['と', ...lineTiles(l, i)] : lineTiles(l, i));
  const tail = [...(mod ? [mod.jp] : []), ending];
  const canonical = [...(place ? [place.jp] : []), ...body, ...tail];

  // Variantes acceptées : lieu au début ou juste avant la fin, deux articles dans les deux ordres, ください ⇄ お願いします
  const accepted = new Set();
  const bodies = [body];
  if (lines.length === 2 && !size) bodies.push([...lineTiles(lines[1], 0), 'と', ...lineTiles(lines[0], 0)]);
  for (const b of bodies) for (const end of ENDINGS) {
    const t = [...(mod ? [mod.jp] : []), end];
    if (place) { accepted.add([place.jp, ...b, ...t].join('|')); accepted.add([...b, ...(mod ? [mod.jp] : []), place.jp, end].join('|')); }
    else accepted.add([...b, ...t].join('|'));
  }

  // Distracteurs : mauvais compteur, mauvaise particule, mauvaise température, forme incorrecte
  const distract = new Set([pick(WRONG_COUNTERS[first.qty]), pick(['が', 'に', 'で']), first.wrongName, pick(['くれ', 'なさい', 'ほしい'])]);
  if (level >= 2) distract.add(pick(['の', 'へ']));
  if (size) distract.add(pick(SIZES.filter(s => s !== size)).jp);
  if (lines[1]) distract.add(pick(WRONG_COUNTERS[lines[1].qty]));
  canonical.forEach(t => distract.delete(t));
  ENDINGS.forEach(e => { if (!canonical.includes(e)) distract.add(e); }); // l'autre formule de politesse est aussi acceptée
  const pool = shuffle([...canonical, ...distract]);

  // Phrase du client
  const cust = pick(CUSTOMERS);
  const frLine = (l, i) => `${FR_NUM[l.qty]} ${l.frName}${i === 0 && size ? ` ${size.fr}` : ''}`;
  const want = lines.map(frLine).join(' et ');
  const frText = `${pick(HELLO)} Je voudrais ${want}${mod ? `, ${mod.fr}` : ''}, s’il vous plaît.${place ? ' ' + place.fr : ''}`;
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0) + (size ? [-50, 0, 80][SIZES.indexOf(size)] * first.qty : 0);
  return { cust, frText, canonical, accepted, pool, total, lines };
}

// --- Visuel du client (silhouette générique) ---------------------------------------------
const SKIN = ['#F3D2B6', '#E0AC86', '#B97C55', '#8A5A3B', '#F7E0CB'];
const HAIR = ['#2A1F2D', '#6B4A3A', '#C99A3B', '#8E2746', '#4A3B52'];
function avatar(mood = 'ok') {
  const s = pick(SKIN), hc = pick(HAIR), style = Math.floor(Math.random() * 3);
  const hair = [
    `<path d="M22 46c0-18 12-28 28-28s28 10 28 28c-6-8-16-12-28-12s-22 4-28 12z" fill="${hc}"/>`,
    `<path d="M20 52c-2-22 10-34 30-34s32 12 30 34c-4-4-6-14-8-18-10 6-30 6-44 0-2 4-4 14-8 18z" fill="${hc}"/>`,
    `<path d="M24 44c2-16 12-24 26-24s24 8 26 24l-6-6-8 4-12-6-12 6-8-4z" fill="${hc}"/><circle cx="50" cy="14" r="8" fill="${hc}"/>`,
  ][style];
  return (m = mood) => `<svg viewBox="0 0 100 100" width="96" height="96" aria-hidden="true">
    <rect x="18" y="74" width="64" height="30" rx="20" fill="var(--tide-2)"/>
    <circle cx="50" cy="50" r="27" fill="${s}"/>${hair}
    <circle cx="40" cy="52" r="3" fill="#2A1F2D"/><circle cx="60" cy="52" r="3" fill="#2A1F2D"/>
    ${m === 'happy' ? '<path d="M40 62q10 9 20 0" stroke="#2A1F2D" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : m === 'sad' ? '<path d="M40 66q10-7 20 0" stroke="#2A1F2D" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : '<path d="M42 63h16" stroke="#2A1F2D" stroke-width="3" stroke-linecap="round"/>'}
    <circle cx="34" cy="60" r="4" fill="var(--sakura)" opacity=".6"/><circle cx="66" cy="60" r="4" fill="var(--sakura)" opacity=".6"/></svg>`;
}

// --- Jeu ------------------------------------------------------------------------------
export default function cafe(root, { settings, saveBest }) {
  const furi = settings.furigana !== 'never';
  let level, served, tips, perfect, timer;

  const head = (hud) => h('header.game-head',
    h('h1', h('span.jp-head', { lang: 'ja', html: jr('コトバ珈琲') }), 'Kotoba Kōhī'), hud);

  function menu() {
    clearInterval(timer);
    root.replaceChildren(head(null), h('section.cafe-intro.card',
      h('p', 'Tu travailles dans un petit café de Kyoto. Des clients francophones arrivent sans parler japonais : écoute ce qu’ils veulent et transmets la commande au barista avec les bonnes tuiles.'),
      h('ul',
        h('li', 'Les quantités se comptent avec ', h('span', { lang: 'ja', html: ruby('一（ひと）つ・二（ふた）つ・三（みっ）つ', furi) }), ' (pas avec 本 ou 枚 ici).'),
        h('li', 'Structure : ', h('span', { lang: 'ja' }, '［sur place / à emporter］［article］を［quantité］ください')),
        h('li', 'Ensuite, lis le montant annoncé en japonais pour encaisser.')),
      h('h2', 'Choisis ton poste'),
      h('div.cafe-levels', LEVELS.map(l => h('button.cafe-level', { onclick: () => start(l) },
        h('span', { lang: 'ja', html: ruby(l.jp, true) }), h('strong', l.name), h('small', l.note))))));
  }

  function start(l) { level = l; served = 0; tips = 0; perfect = 0; nextCustomer(); }

  function nextCustomer() {
    clearInterval(timer);
    if (served >= SHIFT) return endShift();
    const order = makeOrder(level.id);
    const face = avatar();
    let tries = 0, left = level.time;
    const chosen = [];

    const tipsEl = h('b', `${tips}円`);
    const showTips = () => { tipsEl.textContent = `${tips}円`; };
    const hud = h('div.hud',
      h('span', 'Client ', h('b', `${served + 1}/${SHIFT}`)),
      h('span', 'Pourboires ', tipsEl));
    const faceEl = h('div.cust-face', { html: face() });
    const patience = h('div.patience', { role: 'progressbar', 'aria-label': 'Patience du client', 'aria-valuemin': 0, 'aria-valuemax': level.time }, h('span'));
    const bubble = h('div.bubble.fr', h('p.cust-name', `${order.cust[0]}, de ${order.cust[1]}`), h('p', order.frText));
    const answerZone = h('div.order-line', { 'aria-label': 'Ta commande au barista', 'aria-live': 'polite' });
    const poolZone = h('div.tile-pool');
    const feedback = h('div.cafe-feedback', { 'aria-live': 'polite' });
    const sendBtn = h('button.btn.primary', { onclick: check }, 'Passer la commande');
    const clearBtn = h('button.btn', { onclick: () => { chosen.length = 0; render(); } }, 'Effacer');

    const tiles = order.pool.map((t, i) => ({ t, i }));
    const render = tileBoard({ line: answerZone, tray: poolZone, items: tiles, chosen, html: tile => ruby(tile.t, furi),
      text: tile => tile.t.replace(/（[^）]*）/g, ''), placeholder: 'Touche ou fais glisser les tuiles pour composer la phrase…',
      onChange: () => { sendBtn.disabled = !chosen.length; } });

    function check() {
      const attempt = chosen.map(c => c.t).join('|');
      if (order.accepted.has(attempt)) {
        clearInterval(timer);
        const bonus = Math.round(left * 2) + (tries === 0 ? 100 : 30);
        if (tries === 0) perfect++;
        faceEl.innerHTML = face('happy'); play('correct'); burst(answerZone, { count: 26 });
        feedback.replaceChildren(h('p.barista', { lang: 'ja' }, '「かしこまりました！」'), h('p.small', `Parfait. +${bonus}円 de pourboire.`));
        tips += bonus; showTips();
        setTimeout(() => checkout(), 900);
        lock();
      } else {
        tries++;
        // Indique la première tuile fausse
        // Variante acceptée la plus proche de la tentative
        let k = 0;
        for (const v of order.accepted) {
          const can = v.split('|');
          let p = 0; while (p < chosen.length && chosen[p].t === can[p]) p++;
          k = Math.max(k, p);
        }
        if (tries >= 2) return fail();
        faceEl.innerHTML = face('sad'); play('wrong');
        feedback.replaceChildren(h('p.barista', { lang: 'ja' }, '「すみません、もう一度お願いします。」'),
          h('p.small', k < chosen.length ? `Le barista n’a pas compris à partir de la tuile ${k + 1}. Corrige et renvoie.` : 'Il manque quelque chose à la fin de ta phrase.'));
        chosen.splice(k);
        render();
      }
    }

    function fail(timeout = false) {
      clearInterval(timer);
      faceEl.innerHTML = face('sad'); play('wrong');
      feedback.replaceChildren(
        h('p', timeout ? `${order.cust[0]} s’impatiente et repart. La bonne commande était :` : 'Le client repart un peu déçu. La bonne commande était :'),
        h('p.correct-line', { lang: 'ja', html: order.canonical.map(t => ruby(t, true)).join(' ') }),
        h('button.btn.primary', { onclick: () => { served++; nextCustomer(); } }, 'Client suivant'));
      lock();
      feedback.querySelector('button').focus();
    }

    function lock() { [...poolZone.children, ...answerZone.children].forEach(b => b.disabled = true); sendBtn.disabled = true; clearBtn.disabled = true; }

    // Encaissement : lire le montant en japonais
    function checkout() {
      const n = jpNumber(order.total);
      const near = new Set([order.total]);
      while (near.size < 4) {
        const delta = pick([-200, -100, 100, 200, 50, -50, 1000, -1000, 300]);
        const v = order.total + delta;
        if (v > 0) near.add(v);
      }
      const opts = shuffle([...near]);
      const res = h('div.cafe-feedback');
      const buttons = opts.map(v => h('button.option', { onclick: () => {
        buttons.forEach(b => b.disabled = true);
        play(v === order.total ? 'correct' : 'wrong');
        if (v === order.total) { tips += 50; showTips(); res.replaceChildren(h('p', `Exact ! ${n.reading}えん, soit ${order.total} ¥. +50円.`)); }
        else res.replaceChildren(h('p', `Raté : c’était ${order.total} ¥ (${n.reading}えん).`));
        buttons.find(b => Number(b.dataset.v) === order.total).classList.add('correct');
        if (v !== order.total) buttons.find(b => Number(b.dataset.v) === v).classList.add('wrong');
        res.append(h('button.btn.primary', { onclick: () => { served++; nextCustomer(); } }, served + 1 >= SHIFT ? 'Fin du service' : 'Client suivant'));
        res.querySelector('button.btn').focus();
      }, 'data-v': v }, `${v.toLocaleString('fr-FR')} ¥`));
      stage.replaceChildren(
        h('div.register.card',
          h('p.kicker', 'Encaissement'),
          h('p.barista.big', { lang: 'ja', html: `「${ruby('お会計（かいけい）は', furi)}${furi ? `<ruby>${n.kanji}<rt>${n.reading}</rt></ruby>` : n.kanji}${ruby('円（えん）です。', furi)}」` }),
          h('p', `${order.cust[0]} te demande combien ça fait. Que réponds-tu ?`),
          h('div.options', buttons), res));
    }

    const stage = h('div.cafe-stage',
      h('div.counter-scene',
        h('div.customer', faceEl, patience, bubble),
        h('aside.menu-board', { 'aria-label': 'Menu du café' },
          h('p.menu-title', { lang: 'ja' }, 'メニュー'),
          h('ul', { lang: 'ja' },
            DRINKS.map(d => h('li', h('span', { html: ruby(d.hot, furi) }), h('span', `${d.price}円`))),
            h('li', h('span', 'アイス'), h('span', '+30円')),
            FOOD.map(f => h('li', h('span', { html: ruby(f.name, furi) }), h('span', `${f.price}円`)))))),
      h('div.order-panel',
        h('p.kicker', 'Ta phrase au barista'),
        answerZone, poolZone,
        h('div.actions.left', clearBtn, sendBtn),
        feedback));

    root.replaceChildren(head(hud), stage);
    render();
    const bar = patience.firstChild;
    timer = setInterval(() => {
      left -= 0.25;
      bar.style.width = `${(left / level.time) * 100}%`;
      bar.classList.toggle('low', left < level.time * 0.25);
      patience.setAttribute('aria-valuenow', Math.ceil(left));
      if (left <= 0) fail(true);
    }, 250);
    window.addEventListener('hashchange', () => clearInterval(timer), { once: true });
  }

  function endShift() {
    const record = saveBest(tips);
    root.replaceChildren(head(null), h('section.card.finish',
      h('p.kicker', { lang: 'ja', html: ruby('お疲（つか）れさまでした！', furi) }),
      h('h2', 'Fin du service'),
      h('p', `${perfect} commande${perfect > 1 ? 's' : ''} parfaite${perfect > 1 ? 's' : ''} sur ${SHIFT}, ${tips}円 de pourboires.`),
      record ? h('p.small', 'Nouveau record !') : null,
      h('div.actions',
        h('button.btn.primary', { onclick: () => start(level) }, 'Nouveau service'),
        h('button.btn', { onclick: menu }, 'Changer de poste'),
        h('a.btn', { href: '#/jeux' }, 'Autres jeux'))));
    if (record) toast('新記録！ Nouveau record de pourboires.');
  }

  menu();
}
