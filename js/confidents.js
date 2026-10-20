// 絆 Page des confidents, façon menu « Social Link » de Persona 3 : liste en biais, grande carte de tarot, rangs.
import { h, jr, toast } from './util.js?v=20261020234620';
import * as C from './cloud.js?v=20261020234620';
import * as L from './links.js?v=20261020234620';
import { play } from './sfx.js?v=20261020234620';
import { playerLevel, RANK_NAMES } from './level.js?v=20261020234620';

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const initials = n => (n || '?').slice(0, 2).toUpperCase();
const avatar = p => h('span.cf-avatar', p?.avatar_url ? h('img', { src: p.avatar_url, alt: '' }) : h('span', initials(p?.username)));
const pips = rank => h('span.cf-pips', { 'aria-label': `Rang ${rank} sur 10` },
  ...Array.from({ length: L.MAX_RANK }, (_, k) => h('i', { class: k < rank ? 'on' : null })));

export async function confidentsPage(main) {
  const head = h('header.cf-head',
    h('span.cf-bgword', { 'aria-hidden': 'true' }, 'SOCIAL LINK'),
    h('h1.cf-title', h('span.cf-kanji', { lang: 'ja', html: jr('絆') }), h('span.cf-word', 'CONFIDENTS')),
    h('p.cf-lead', 'Chaque échange rapproche. ', h('strong', `+${L.REACT_XP} XP`), ' par réaction, ', h('strong', `+${L.POKE_XP} XP`), ` par poke (${L.POKE_DAILY} par jour et par personne). Dix rangs, une arcane, un titre rien qu’à vous.`));
  if (!C.enabled || !C.currentUser()) {
    main.replaceChildren(head, h('section.cf-empty', L.tarotCard({ arcana: ['愚者', 'Le Fou'], rank: 0, size: 'l' }),
      h('div', h('h2', 'Connecte-toi pour nouer des liens'), h('a.btn.primary', { href: '#/compte' }, 'Se connecter'))));
    return;
  }
  main.classList.add('wide');
  const stage = h('div.sl-stage', h('div.sl-loading', 'Chargement des liens…'));
  const detail = h('section.cf-detail');
  main.replaceChildren(head, stage, detail);

  const links = await L.allLinks({ fresh: true }).catch(() => []);
  const profiles = await Promise.all(links.map(l => C.getProfile(l.id).catch(() => null)));
  const people = links.map((l, k) => ({ ...l, p: profiles[k] || { id: l.id, username: l.name || 'Élève' } }));
  const meP = await C.getProfile(C.currentUser().id).catch(() => null) || { username: 'Moi' };
  if (!people.length) {
    stage.replaceChildren();
    detail.replaceChildren(h('div.cf-empty',
      L.tarotCard({ arcana: ['愚者', 'Le Fou'], rank: 0, size: 'l' }),
      h('div', h('p.cf-empty-kicker', 'AUCUN LIEN… POUR L’INSTANT'),
        h('h2', 'Ton histoire commence ici'),
        h('p', 'Envoie une réaction ou un poke à un autre élève : votre premier lien apparaîtra avec son arcane.'),
        h('a.btn.primary', { href: '#/communaute' }, 'Aller à la communauté'))));
    return;
  }

  let sel = 0;
  const go = d => { sel = (sel + d + people.length) % people.length; play('cursor'); render(true); };
  const pick = k => { if (k === sel) return; sel = k; play('cursor'); render(true); };
  const stars = rank => h('span.sl-stars', { 'aria-label': `Rang ${rank} sur ${L.MAX_RANK}` },
    ...Array.from({ length: L.MAX_RANK }, (_, k) => h('i', { class: k < rank ? 'on' : null, style: { '--k': k } }, '★')));
  const portrait = (p, cls) => h(`div.sl-portrait.${cls}`,
    h('div.sl-pimg', p?.avatar_url ? h('img', { src: p.avatar_url, alt: '' }) : h('span.sl-pinit', initials(p?.username)), h('i.sl-tone'), h('i.sl-dots')));
  // Récit du lien, à la façon du journal de Social Link
  const story = (c, arc, title) => {
    const n = c.p.username;
    if (c.rank >= L.MAX_RANK) return `${n} et toi êtes allés au bout du chemin. Votre lien est désormais indéfectible : l’arcane ${arc[1].toLowerCase()} brille de tout son éclat.`;
    if (c.rank <= 1) return `Tu viens de croiser la route de ${n}. Un premier échange, quelques mots… L’arcane ${arc[1].toLowerCase()} s’est éveillée. Où ce lien vous mènera-t-il ?`;
    return `${n} et toi vous rapprochez un peu plus à chaque échange. Te voilà « ${title} » : l’arcane ${arc[1].toLowerCase()} résonne plus fort. Continue de lui écrire pour voir la suite.`;
  };

  function render(animate = false) {
    const c = people[sel];
    const arc = L.arcanaOf(c.id);
    const title = L.titleOf(c.id, c.rank);
    const toNext = c.next ? c.next - c.xp : 0;
    const pl = playerLevel(c.p.xp || 0);
    const info = [c.p.xp != null ? `Lv ${pl.lv}` : null, c.p.rank != null ? `niveau ${RANK_NAMES[Math.min(c.p.rank, 4)]}` : null].filter(Boolean).join(' · ');
    const card = L.tarotCard({ arcana: arc, rank: c.rank, name: null, size: 'l' });
    card.append(h('i.sl-holo', { 'aria-hidden': 'true' }));
    const scene = h('div.sl-scene',
      h('div.sl-bg', { 'aria-hidden': 'true' }, h('i.b1'), h('i.b2'), h('i.b3'), h('i.dots'), h('span.sl-bgk', { lang: 'ja' }, arc[0])),
      portrait(meP, 'me'),
      h('a.sl-plink', { href: `#/profil/${c.id}`, title: `Voir le profil de ${c.p.username}` }, portrait(c.p, 'them')),
      h('div.sl-lanyard', { 'aria-hidden': 'true' }, h('i.sl-cord'), h('a.sl-card', { href: `#/profil/${c.id}`, tabindex: '-1' }, card)),
      h('div.sl-left',
        h('div.sl-titlebar',
          h('button.sl-lr', { type: 'button', 'aria-label': 'Confident précédent', onclick: () => go(-1), disabled: people.length < 2 }, h('i', '‹'), 'L1'),
          h('span.sl-big', 'SOCIAL LINK'),
          h('button.sl-lr.r', { type: 'button', 'aria-label': 'Confident suivant', onclick: () => go(1), disabled: people.length < 2 }, 'R1', h('i', '›'))),
        h('div.sl-banner',
          h('div.sl-black', h('span', title)),
          h('div.sl-white',
            h('div.sl-arc', h('small', 'ARCANA'), h('b', arc[1].replace(/^(Le |La |L’|Les )/, '')), h('small.jp', { lang: 'ja' }, arc[0])),
            h('div.sl-rank', h('small', 'RANK'), h('b', String(c.rank)), c.rank >= L.MAX_RANK ? h('em', 'MAX') : null)),
          stars(c.rank)),
        h('p.sl-story', story(c, arc, title)),
        h('div.sl-xp', h('div.sl-xpbar', h('span', { style: { width: `${Math.round(c.pct * 100)}%` } })),
          h('small', c.rank >= L.MAX_RANK ? 'Rang maximum atteint' : `${toNext} XP avant le rang ${c.rank + 1} — ${L.TITLES[c.rank + 1]}`))),
      h('div.sl-namebox',
        h('a.sl-name', { href: `#/profil/${c.id}` }, c.p.username),
        h('div.sl-desc',
          h('p', c.p.bio || 'Pas encore de bio… mais chaque lien a son histoire.'),
          info ? h('p.sl-meta', info) : null)),
      h('div.sl-strip', { role: 'tablist', 'aria-label': 'Mes confidents' }, ...people.map((x, k) => {
        const a = L.arcanaOf(x.id);
        return h('button.sl-chip', { type: 'button', role: 'tab', 'aria-selected': String(k === sel), class: k === sel ? 'sl-chip on' : 'sl-chip', onclick: () => pick(k) },
          h('b', { lang: 'ja' }, a[0]), h('span', x.p.username), h('em', ROMAN[x.rank]));
      })),
      h('button.sl-replay', { type: 'button', onclick: () => L.rankUpBanner({ name: c.p.username, rank: Math.max(1, c.rank), title, arcana: arc }) }, '▶ Revoir le RANK UP'));
    stage.replaceChildren(scene);
    if (animate) { stage.classList.remove('swap'); void stage.offsetWidth; stage.classList.add('swap'); }
    detail.replaceChildren(
      h('div.cf-info',
        h('ul.cf-stats',
          h('li', h('b', String(c.xp)), h('span', 'XP de lien')),
          h('li', h('b', String(c.reactions)), h('span', c.reactions > 1 ? 'réactions' : 'réaction')),
          h('li', h('b', String(c.pokes)), h('span', c.pokes > 1 ? 'pokes' : 'poke'))),
        h('ol.cf-ladder', { 'aria-label': 'Les rangs du lien' }, ...L.TITLES.slice(1).map((t, k) => h('li', { class: k + 1 <= c.rank ? 'done' : k + 1 === c.rank + 1 ? 'next' : null },
          h('span', ROMAN[k + 1]), h('em', t)))),
        h('div.cf-actions',
          h('a.btn.primary', { href: `#/profil/${c.id}` }, 'Envoyer une réaction'),
          h('button.btn', { type: 'button', onclick: () => editForm(c) }, 'Personnaliser'),
          h('a.btn.ghost', { href: '#/communaute' }, 'Communauté'))));
  }
  const renderList = () => render();
  const renderDetail = a => render(a);

  function editForm(c) {
    const card = L.linkCard(c, { name: c.p.username, onChange: () => { renderList(); renderDetail(true); } });
    const box = h('div.cf-edit', card, h('button.btn.small.ghost', { type: 'button', onclick: () => renderDetail() }, 'Fermer'));
    detail.querySelector('.cf-actions').replaceWith(box);
    card.querySelector('.lc-edit')?.click();
  }

  render(true);
  play('card');
  // Clavier : ← → (ou Q / E façon L1 / R1) pour changer de confident
  const onKey = e => {
    if (e.target.closest('input, textarea, select')) return;
    if (['ArrowLeft', 'ArrowUp', 'q', 'Q'].includes(e.key)) { e.preventDefault(); go(-1); }
    if (['ArrowRight', 'ArrowDown', 'e', 'E'].includes(e.key)) { e.preventDefault(); go(1); }
  };
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', () => document.removeEventListener('keydown', onKey), { once: true });
  void toast;
}
