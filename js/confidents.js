// 絆 Page des confidents, façon menu « Social Link » de Persona 3 : liste en biais, grande carte de tarot, rangs.
import { h, jr, toast } from './util.js?v=20261020095640';
import * as C from './cloud.js?v=20261020095640';
import * as L from './links.js?v=20261020095640';
import { play } from './sfx.js?v=20261020095640';

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
  const list = h('ol.cf-list', h('li.cf-loading', 'Chargement des liens…'));
  const detail = h('section.cf-detail');
  main.replaceChildren(head, h('div.cf-layout', h('nav.cf-side', { 'aria-label': 'Mes confidents' }, list), detail));

  const links = await L.allLinks({ fresh: true }).catch(() => []);
  const profiles = await Promise.all(links.map(l => C.getProfile(l.id).catch(() => null)));
  const people = links.map((l, k) => ({ ...l, p: profiles[k] || { id: l.id, username: l.name || 'Élève' } }));
  if (!people.length) {
    list.replaceChildren();
    detail.replaceChildren(h('div.cf-empty',
      L.tarotCard({ arcana: ['愚者', 'Le Fou'], rank: 0, size: 'l' }),
      h('div', h('p.cf-empty-kicker', 'AUCUN LIEN… POUR L’INSTANT'),
        h('h2', 'Ton histoire commence ici'),
        h('p', 'Envoie une réaction ou un poke à un autre élève : votre premier lien apparaîtra avec son arcane.'),
        h('a.btn.primary', { href: '#/communaute' }, 'Aller à la communauté'))));
    return;
  }

  let sel = 0;
  const renderList = () => list.replaceChildren(...people.map((c, k) => {
    const arc = L.arcanaOf(c.id);
    return h('li', { style: { '--i': k } }, h('button.cf-row', { type: 'button', class: k === sel ? 'cf-row on' : 'cf-row', 'aria-current': k === sel ? 'true' : null,
      onclick: () => { if (sel === k) return; sel = k; play('cursor'); renderList(); renderDetail(true); } },
      h('span.cf-roman', ROMAN[c.rank]),
      h('span.cf-rowtxt', h('span.cf-arcname', { lang: 'ja' }, `${arc[0]} · ${arc[1]}`), h('strong', c.p.username)),
      c.rank >= L.MAX_RANK ? h('span.cf-maxtag', 'MAX') : pips(c.rank)));
  }));

  function renderDetail(animate = false) {
    const c = people[sel];
    const arc = L.arcanaOf(c.id);
    const title = L.titleOf(c.id, c.rank);
    const toNext = c.next ? c.next - c.xp : 0;
    detail.replaceChildren(
      h('div.cf-cardcol', L.tarotCard({ arcana: arc, rank: c.rank, name: c.p.username, size: 'l' }),
        h('button.cf-replay', { type: 'button', onclick: () => L.rankUpBanner({ name: c.p.username, rank: Math.max(1, c.rank), title, arcana: arc }) }, '▶ Revoir le RANK UP')),
      h('div.cf-info',
        h('p.cf-arcana', h('span', { lang: 'ja' }, arc[0]), ` ${arc[1].toUpperCase()}`),
        h('div.cf-who', avatar(c.p), h('div', h('h2', c.p.username), h('p.cf-ttl', title))),
        h('div.cf-rankbox',
          h('div.cf-rankbig', h('small', 'RANK'), h('b', String(c.rank)), c.rank >= L.MAX_RANK ? h('em', 'MAX') : null),
          h('div.cf-rankright', pips(c.rank),
            h('div.cf-bar', h('span', { style: { width: `${Math.round(c.pct * 100)}%` } })),
            h('p.small', c.rank >= L.MAX_RANK ? 'Lien indéfectible : le rang maximum est atteint.' : `${toNext} XP avant le rang ${c.rank + 1} — ${L.TITLES[c.rank + 1]}`))),
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
    if (animate) { detail.classList.remove('swap'); void detail.offsetWidth; detail.classList.add('swap'); }
  }

  function editForm(c) {
    const card = L.linkCard(c, { name: c.p.username, onChange: () => { renderList(); renderDetail(true); } });
    const box = h('div.cf-edit', card, h('button.btn.small.ghost', { type: 'button', onclick: () => renderDetail() }, 'Fermer'));
    detail.querySelector('.cf-actions').replaceWith(box);
    card.querySelector('.lc-edit')?.click();
  }

  renderList();
  renderDetail(true);
  play('card');
  // Navigation au clavier : ↑ ↓ pour changer de confident
  const onKey = e => {
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      sel = (sel + (e.key === 'ArrowDown' ? 1 : people.length - 1)) % people.length;
      play('cursor'); renderList(); renderDetail(true);
      list.querySelector('.cf-row.on')?.focus();
    }
  };
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', () => document.removeEventListener('keydown', onKey), { once: true });
  void toast;
}
