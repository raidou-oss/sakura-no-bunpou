// 絆 Liens de confident (façon Persona) : plus on échange avec quelqu'un (réactions, pokes), plus le lien monte.
// Réactions : lues dans la base (visibles des deux côtés). Pokes : comptés de son côté, avec la progression du compte.
import { h, jr, toast } from './util.js?v=20261019145238';
import * as C from './cloud.js?v=20261019145238';
import * as S from './srs.js?v=20261019145238';
import { play } from './sfx.js?v=20261019145238';

export const REACT_XP = 15;          // par réaction échangée (envoyée ou reçue)
export const POKE_XP = 30;           // par poke : plus d'interaction, donc plus d'XP
export const POKE_DAILY = 3;         // pokes comptés par jour et par personne (pas de « farm »)
const THRESH = [0, 1, 30, 80, 150, 240, 350, 480, 640, 830, 1050];   // XP pour atteindre le rang 1 … 10
export const MAX_RANK = 10;
export const TITLES = ['', 'Connaissance', 'Camarade', 'Copain', 'Ami', 'Bon ami', 'Super ami', 'Ami proche', 'Meilleur ami', 'Âme sœur d’étude', 'Lien indéfectible'];
export const ARCANA = [
  ['愚者', 'Le Fou'], ['魔術師', 'Le Magicien'], ['女教皇', 'La Prêtresse'], ['女帝', 'L’Impératrice'], ['皇帝', 'L’Empereur'],
  ['法王', 'Le Pape'], ['恋愛', 'Les Amoureux'], ['戦車', 'Le Chariot'], ['正義', 'La Justice'], ['隠者', 'L’Ermite'],
  ['運命', 'La Roue de fortune'], ['剛毅', 'La Force'], ['刑死者', 'Le Pendu'], ['死神', 'La Mort'], ['節制', 'La Tempérance'],
  ['悪魔', 'Le Diable'], ['塔', 'La Tour'], ['星', 'L’Étoile'], ['月', 'La Lune'], ['太陽', 'Le Soleil'], ['審判', 'Le Jugement'], ['世界', 'Le Monde']];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function rankOf(xp) {
  let r = 0;
  for (let k = 1; k <= MAX_RANK; k++) if (xp >= THRESH[k]) r = k;
  const next = r >= MAX_RANK ? null : THRESH[r + 1];
  const pct = r >= MAX_RANK ? 1 : (xp - THRESH[r]) / (next - THRESH[r]);
  return { rank: r, pct: Math.max(0, Math.min(1, pct)), next, roman: ROMAN[r] || '0' };
}
const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const localAll = () => S.getExtra('links', {}) || {};
const localOf = id => localAll()[id] || {};
function saveLocal(id, patch) {
  const all = { ...localAll() };
  all[id] = { ...(all[id] || {}), ...patch };
  S.setExtra('links', all);
}
/** Arcane du lien : choisie par l'élève, sinon tirée de la paire (stable) */
export const arcanaOf = id => {
  const k = localOf(id).arcana;
  return ARCANA[k ?? hash([C.currentUser()?.id, id].sort().join(':')) % ARCANA.length];
};
export const titleOf = (id, rank) => localOf(id).title || TITLES[rank] || 'Inconnu';
export function setCustom(id, { title, arcana }) {
  saveLocal(id, { title: (title || '').trim().slice(0, 28) || null, arcana: arcana ?? localOf(id).arcana ?? null });
}

const today = () => new Date().toISOString().slice(0, 10);
function countPoke(id) {
  const l = localOf(id);
  const d = today();
  const n = l.pokeDay === d ? l.pokeN || 0 : 0;
  if (n >= POKE_DAILY) return false;
  saveLocal(id, { pokeDay: d, pokeN: n + 1, pokes: (l.pokes || 0) + 1 });
  return true;
}

let pairsP = null;
const loadPairs = (fresh = false) => { if (fresh || !pairsP) pairsP = C.myReactionPairs().catch(() => []); return pairsP; };

/** Tous mes liens : [{ id, xp, reactions, pokes, rank… }] du plus fort au plus faible */
export async function allLinks({ fresh = false } = {}) {
  const me = C.currentUser()?.id;
  if (!me) return [];
  const pairs = await loadPairs(fresh);
  const map = new Map();
  const get = id => { if (!map.has(id)) map.set(id, { id, reactions: 0, pokes: 0 }); return map.get(id); };
  pairs.forEach(r => { const other = r.from_user === me ? r.to_user : r.from_user; if (other && other !== me) get(other).reactions++; });
  Object.entries(localAll()).forEach(([id, l]) => { if (l.pokes) get(id).pokes = l.pokes; });
  return [...map.values()].map(l => {
    const xp = l.reactions * REACT_XP + l.pokes * POKE_XP;
    return { ...l, xp, ...rankOf(xp), name: localOf(l.id).name || null };
  }).filter(l => l.xp > 0).sort((a, b) => b.xp - a.xp);
}
export async function linkWith(id, opts) {
  return (await allLinks(opts)).find(l => l.id === id) || { id, xp: 0, reactions: 0, pokes: 0, ...rankOf(0) };
}

// --- Montée de rang : bannière façon Persona -----------------------------------------------
export function rankUpBanner({ name, rank, title, arcana }) {
  play('fanfare');
  const el = h('div.link-rankup', { role: 'status' },
    h('div.lr-card', h('span.lr-arcana', { lang: 'ja' }, arcana[0]), h('span.lr-roman', ROMAN[rank])),
    h('div.lr-text',
      h('p.lr-kicker', { lang: 'ja', html: jr('絆') }, ' RANK UP'),
      h('p.lr-name', name || 'Ton confident'),
      h('p.lr-rank', `Rang ${rank}${rank >= MAX_RANK ? ' · MAX' : ''} — ${title}`),
      h('p.lr-sub', `Arcane ${arcana[1]} · Ton lien s’approfondit…`)));
  document.body.append(el);
  setTimeout(() => el.classList.add('out'), 3600);
  setTimeout(() => el.remove(), 4200);
}

/** À brancher une fois : chaque réaction / poke fait progresser le lien, avec bannière si le rang monte */
export function initLinks() {
  C.onInteraction(async e => {
    if (!e.other) return;
    if (e.name) saveLocal(e.other, { name: e.name });
    else if (!localOf(e.other).name) {
      const p = await C.getProfile(e.other).catch(() => null);
      if (p?.username) saveLocal(e.other, { name: p.username });
    }
    if (e.type === 'poke' && !countPoke(e.other)) return;
    const l = await linkWith(e.other, { fresh: e.type === 'reaction' });
    const before = localOf(e.other).lastRank || 0;
    if (l.rank > before) {
      saveLocal(e.other, { lastRank: l.rank });
      if (before > 0 || l.rank > 1) rankUpBanner({ name: localOf(e.other).name, rank: l.rank, title: titleOf(e.other, l.rank), arcana: arcanaOf(e.other) });
      else toast(`絆 Nouveau lien de confident : ${localOf(e.other).name || 'un élève'}`);
    } else if (e.type === 'poke') toast(`絆 +${POKE_XP} XP de lien`);
  });
}

// --- Cartes de lien (profil) ------------------------------------------------------------------
export function linkCard(l, { name, editable = true, onChange } = {}) {
  const arc = arcanaOf(l.id);
  const title = titleOf(l.id, l.rank);
  const card = h('div.link-card');
  const paint = () => {
    const a = arcanaOf(l.id), t = titleOf(l.id, l.rank);
    card.replaceChildren(
      h('div.lc-tarot', { title: `Arcane : ${a[1]}` }, h('span.lc-arc', { lang: 'ja' }, a[0]), h('span.lc-roman', ROMAN[l.rank] || '0'), h('small', a[1])),
      h('div.lc-info',
        h('a.lc-name', { href: `#/profil/${l.id}` }, name || l.name || 'Élève'),
        h('p.lc-title', h('span', t), localOf(l.id).title ? h('small', ` · ${TITLES[l.rank] || 'Inconnu'}`) : null),
        h('div.gauge.lc-gauge', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(l.pct * 100), 'aria-label': 'Progression du lien' },
          h('span', { style: { width: `${Math.max(3, Math.round(l.pct * 100))}%` } })),
        h('p.small.lc-meta', `Rang ${l.rank}${l.rank >= MAX_RANK ? ' · MAX' : ''} · ${l.xp} XP${l.next ? ` / ${l.next}` : ''} · ${l.reactions} réaction${l.reactions > 1 ? 's' : ''}, ${l.pokes} poke${l.pokes > 1 ? 's' : ''}`)),
      editable ? h('button.lc-edit', { type: 'button', title: 'Personnaliser le titre et l’arcane', 'aria-label': 'Personnaliser ce lien', onclick: edit }, '✎') : null);
  };
  function edit() {
    const cur = localOf(l.id);
    const input = h('input.lc-input', { type: 'text', maxlength: 28, value: cur.title || '', placeholder: `Titre (par défaut : ${TITLES[l.rank] || 'Inconnu'})`, 'aria-label': 'Titre personnalisé' });
    const sel = h('select.lc-select', { 'aria-label': 'Arcane' },
      ARCANA.map(([jp, fr], k) => h('option', { value: k, selected: arcanaOf(l.id)[0] === jp }, `${jp} · ${fr}`)));
    card.replaceChildren(h('div.lc-form',
      h('p.small', 'Donne un titre à votre relation (ex. « Senpai des kanji », « Binôme de révision ») et choisis son arcane.'),
      input, sel,
      h('div.actions.left',
        h('button.btn.small.primary', { type: 'button', onclick: () => { setCustom(l.id, { title: input.value, arcana: Number(sel.value) }); play('select'); toast('Lien personnalisé'); paint(); onChange?.(); } }, 'Enregistrer'),
        h('button.btn.small.ghost', { type: 'button', onclick: paint }, 'Annuler'))));
    input.focus();
  }
  void arc; void title;
  paint();
  return card;
}

export const LINK_HELP = `+${REACT_XP} XP par réaction échangée, +${POKE_XP} XP par poke (${POKE_DAILY} pokes par jour et par personne comptent).`;
