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

// --- Réponses écrites : kanji ou lecture au choix, mais orthographe exacte (ー, katakana, petits kana…) ---
// Seuls les espaces et la ponctuation de fin de phrase sont ignorés.
const PUNCT = /[\s　。、．，,.!！?？「」『』（）()…〜～]/g;
export const toHira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
export const normJa = s => String(s).normalize('NFKC').replace(PUNCT, '');
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Expression régulière qui accepte une réponse annotée (漢字（かんじ）…) écrite en kanji OU en kana */
export function answerRegex(annotated) {
  const src = String(annotated).replace(/[[\]|]/g, '');
  let re = '', last = 0;
  for (const m of src.matchAll(new RegExp(KANJI_READING.source, 'g'))) {
    re += reEsc(normJa(src.slice(last, m.index)));
    re += `(?:${reEsc(normJa(m[1]))}|${reEsc(normJa(m[2]))})`;
    last = m.index + m[0].length;
  }
  re += reEsc(normJa(src.slice(last)));
  return new RegExp(`^${re}$`);
}
let wanakanaP = null;
/** Saisie en romaji → kana (WanaKana, chargé à la demande ; sans effet s'il n'est pas joignable) */
export function bindRomaji(input) {
  wanakanaP = wanakanaP || import('https://cdn.jsdelivr.net/npm/wanakana@5.3.1/+esm').catch(() => null);
  return wanakanaP.then(w => { if (w?.bind && !input.dataset.wk) { w.bind(input, { IMEMode: true }); input.dataset.wk = '1'; } });
}
export function unbindRomaji(input) {
  if (!wanakanaP || !input.dataset.wk) return;
  wanakanaP.then(w => { try { w?.unbind?.(input); } catch {} delete input.dataset.wk; });
}
/**
 * ⌨ Bouton « Clavier japonais » : on tape en romaji sur un clavier AZERTY/QWERTY, ça devient des kana.
 * Le choix est lié au compte (réglage romaji).
 */
export function kanaKeyboardToggle(input, { get, set }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'kb-toggle';
  btn.title = 'Tape en lettres latines sur ton clavier : « neko » devient ねこ. En MAJUSCULES, « NEKO » devient ネコ.';
  const paint = () => {
    const on = get();
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('on', on);
    btn.innerHTML = `<span class="kb-ico" aria-hidden="true">⌨</span><span class="kb-txt"><b>Clavier japonais</b><small>${on ? 'Activé · neko → ねこ · NEKO → ネコ' : 'Désactivé · clique pour taper en kana'}</small></span><span class="kb-state">${on ? 'ON' : 'OFF'}</span>`;
  };
  btn.addEventListener('click', () => {
    const on = !get(); set(on);
    if (on) bindRomaji(input); else unbindRomaji(input);
    paint(); input.focus();
  });
  if (get()) bindRomaji(input);
  paint();
  return btn;
}

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

/** Animations réduites : réglage du site (classe sur <html>) ou réglage de l'appareil */
export const reducedMotion = () => document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;

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

/**
 * 正 Effet « particule qui se place » (comme sur l'écran de chargement) :
 * onde de choc rose/cyan, étincelles, petit rebond de l'élément et tampon dans le coin de la carte.
 */
/** Onde de choc commune (leçons, clics…) : éclair, disque de choc, deux anneaux dégradés, croix « slash »,
 *  traits lumineux de longueurs variées et éclats en losange */
export function shockHTML({ sparks = 12, shards = 6 } = {}) {
  const sp = Array.from({ length: sparks }, (_, i) => {
    const a = i * (360 / sparks) + Math.random() * 18, d = 52 + Math.random() * 46, l = 10 + Math.random() * 14;
    return `<i class="fx-spark${i % 3 === 0 ? ' c' : ''}" style="--a:${a.toFixed(0)}deg;--d:-${d.toFixed(0)}px;--l:${l.toFixed(0)}px;--t:${(.42 + Math.random() * .22).toFixed(2)}s"></i>`;
  }).join('');
  const sh = Array.from({ length: shards }, () => {
    const a = Math.random() * 360, d = 34 + Math.random() * 40;
    return `<i class="fx-shard" style="--a:${a.toFixed(0)}deg;--d:-${d.toFixed(0)}px;--r:${(Math.random() * 540 - 270).toFixed(0)}deg"></i>`;
  }).join('');
  return '<i class="fx-core"></i><i class="fx-disc"></i><i class="fx-wave"></i><i class="fx-wave c"></i><i class="fx-x"></i><i class="fx-x b"></i>' + sp + sh;
}
export function hitFx(target, { card = null, stamp = null, pop = true } = {}) {
  if (!target || reducedMotion()) return;
  window.__lastHit = performance.now();
  // Les effets suivent l'élément (même s'il bouge pendant l'animation) : on les pose dedans, centrés
  const host = /^(INPUT|TEXTAREA)$/.test(target.tagName) ? target.parentElement : target;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const layer = document.createElement('span');
  layer.className = 'fx-layer';
  layer.innerHTML = shockHTML();
  host.append(layer);
  setTimeout(() => layer.remove(), 900);
  if (pop) { target.classList.remove('fx-pop'); void target.offsetWidth; target.classList.add('fx-pop'); }
  if (card) {
    if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
    card.classList.remove('fx-shake'); void card.offsetWidth; card.classList.add('fx-shake');
    if (stamp) {
      card.querySelector('.fx-stamp')?.remove();
      const st = document.createElement('span');
      st.className = 'fx-stamp'; st.textContent = stamp;
      card.append(st);
    }
  }
}
export const HIT_WORDS = ['HIT!', 'NICE!', 'GOOD!', '正解!', 'GREAT!'];

/**
 * ✍ Saisie « douce » : le texte tapé apparaît caractère par caractère (fondu, léger glissé, flou qui se resserre).
 * Le vrai champ reste dessous (curseur, sélection, clavier japonais) ; un calque identique affiche le texte animé.
 */
export function smoothType(field) {
  if (!field || field.dataset.smooth) return;
  const attach = () => {
    if (!field.parentNode) return requestAnimationFrame(attach);
    field.dataset.smooth = '1';
    const wrap = document.createElement('span');
    wrap.className = `st-wrap${field.tagName === 'TEXTAREA' ? ' st-area' : ''}`;
    const mirror = document.createElement('span');
    mirror.className = 'st-mirror';
    mirror.setAttribute('aria-hidden', 'true');
    field.replaceWith(wrap);
    wrap.append(field, mirror);
    field.classList.add('st-field');
    let prev = '', styled = false;
    const copy = () => {
      if (!field.isConnected) return;
      const c = getComputedStyle(field);
      for (const k of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight', 'textAlign', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'wordSpacing', 'textIndent'])
        mirror.style[k] = c[k];
      mirror.style.borderStyle = 'solid'; mirror.style.borderColor = 'transparent';
      mirror.style.borderWidth = c.borderWidth;
      styled = true;
    };
    const render = () => {
      if (!styled) copy();
      const v = field.value;
      let i = 0; while (i < prev.length && i < v.length && prev[i] === v[i]) i++;
      const chars = [...v];
      const keep = [...v.slice(0, i)].length;
      mirror.replaceChildren(...chars.map((ch, k) => {
        const s = document.createElement('span');
        s.textContent = ch;
        if (k >= keep && !reducedMotion()) { s.className = 'st-new'; s.style.animationDelay = `${Math.min(6, k - keep) * 22}ms`; }
        return s;
      }));
      if (field.tagName === 'TEXTAREA') mirror.scrollTop = field.scrollTop; else mirror.scrollLeft = field.scrollLeft;
      prev = v;
    };
    field.addEventListener('input', render);
    field.addEventListener('scroll', () => { mirror.scrollTop = field.scrollTop; mirror.scrollLeft = field.scrollLeft; });
    field.addEventListener('focus', copy);
    window.addEventListener('resize', () => { styled = false; });
    render();
  };
  attach();
}
