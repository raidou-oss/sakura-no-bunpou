// Petits outils partagés : DOM, furigana, hasard, stockage.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Crée un élément : h('div.card#id', {onclick, ...attrs}, ...enfants) */
export function h(tag, attrs, ...kids) {
  const m = tag.match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i);
  const el = document.createElement(m[1] || 'div');
  (m[2].match(/[.#][\w-]+/g) || []).forEach(t => t[0] === '.' ? el.classList.add(t.slice(1)) : (el.id = t.slice(1)));
  if (attrs != null && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') for (const [p, val] of Object.entries(v)) p.startsWith('--') ? el.style.setProperty(p, val) : (el.style[p] = val);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const KANJI_READING = /([㐀-鿿豈-﫿々〆ヶ〇]+)（([^）]+)）/g;

/** 学生（がくせい）→ <ruby>学生<rt>がくせい</rt></ruby> ; sans furigana : supprime la lecture */
export function ruby(text, show = true) {
  const safe = esc(text);
  return show ? safe.replace(KANJI_READING, '<ruby>$1<rt>$2</rt></ruby>') : safe.replace(KANJI_READING, '$1');
}

// Lectures des mots japonais de l'interface (titres, menus, tampons…), pour avoir des furigana partout
const DECOR = {
  花吹雪: 'はなふぶき', 新記録: 'しんきろく', 今日: 'きょう', 文法: 'ぶんぽう', 単語: 'たんご', 遊: 'あそ', 設定: 'せってい', 授業: 'じゅぎょう',
  自分: 'じぶん', 仲間: 'なかま', 珈琲: 'コーヒー', 花: 'はな', 助詞: 'じょし', 並: 'なら', 替: 'か', 作文: 'さくぶん', 復習: 'ふくしゅう',
  庭: 'にわ', 蕾: 'つぼみ', 綻: 'ほころび', 咲: 'さき', 満開: 'まんかい', 桜: 'さくら', 修了: 'しゅうりょう', 見事: 'みごと', 完璧: 'かんぺき',
  勝利: 'しょうり', 疲: 'つか', 両方: 'りょうほう', 言葉: 'ことば', 先輩: 'せんぱい', 返事: 'へんじ', 済: 'すみ', 練習: 'れんしゅう',
  番付: 'ばんづけ', 鍵: 'かぎ', 大丈夫: 'だいじょうぶ', 一緒: 'いっしょ', 頑張: 'がんば', 凄: 'すご', 日本語: 'にほんご', 勉強: 'べんきょう',
  巡: 'めぐ', 語: 'ご', 遊び: 'あそび', 己: 'おのれ', 整: 'せい', 絆: 'きずな', 文: 'ぶん', 法: 'ほう',
};
const DECOR_RE = new RegExp(Object.keys(DECOR).sort((a, b) => b.length - a.length).join('|'), 'g');
/** Ajoute des furigana aux mots connus d'un libellé (sans toucher à ce qui a déjà une lecture) */
export const jr = text => {
  if (!text) return '';
  if (/（/.test(text)) return ruby(text, true);
  return esc(text).replace(DECOR_RE, m => `<ruby>${m}<rt>${DECOR[m]}</rt></ruby>`);
};

/** Texte brut sans lecture ni balises de phrase */
export const plain = text => text.replace(KANJI_READING, '$1').replace(/[[\]|]/g, '');

/** Lecture en kana d'un mot (額（ひたい） → ひたい ; 耕（たがや）す → たがやす) */
export const kana = text => text.replace(KANJI_READING, '$2');

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const sample = (arr, n) => shuffle(arr).slice(0, n);

export const DAY = 86400000;
export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const dayKey = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

// Stockage local robuste (navigation privée, stockage bloqué…)
export const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  },
};

let toastTimer;
export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fleur de sakura en SVG ; `open` de 0 à 1 ouvre les pétales un par un */
let blossomId = 0;
export function blossom(open = 1, size = 64, label = '') {
  const id = `bloom${++blossomId}`;
  const petals = [];
  for (let i = 0; i < 5; i++) {
    const fill = Math.max(0, Math.min(1, open * 5 - i));
    petals.push(`<path class="petal" fill="url(#${id})" style="--fill:${fill.toFixed(2)}" transform="rotate(${i * 72} 50 50)"
      d="M50 50 C36 36 36 18 44 9 L50 15 L56 9 C64 18 64 36 50 50Z"/>`);
  }
  return `<svg class="blossom" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${esc(label)}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#38D6FF"/><stop offset=".5" stop-color="#8FB4FF"/><stop offset="1" stop-color="#FF8CC6"/></linearGradient></defs>
    ${petals.join('')}<circle cx="50" cy="50" r="7" class="pistil"/></svg>`;
}

/** Texte vertical robuste : un caractère par ligne (évite les soucis de writing-mode) */
export const stack = text => [...text].map(c => `<span>${esc(c)}</span>`).join('');
