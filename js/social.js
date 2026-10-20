// Pages sociales : profil, communauté, connexion / inscription, rang N5 → N1.
import { h, $, toast, jr, ruby, reducedMotion } from './util.js?v=20261020235205';
import * as D from './data.js?v=20261020235205';
import * as S from './srs.js?v=20261020235205';
import { wallpaperSVG } from './wallpaper.js?v=20261020235205';
import * as C from './cloud.js?v=20261020235205';
import { play } from './sfx.js?v=20261020235205';
import { computeRank, rankLabel, rankTitle, RANK_NAMES, THRESHOLD, pct as toPct, playerLevel, publicScores, myXp } from './level.js?v=20261020235205';
import { streakFor, withAura, streakBadge, auraTier, AURAS, nextAura, flame, weekStrip } from './aura.js?v=20261020235205';
// Pour moi, l'XP vient toujours de ma progression locale (la plus à jour) : même Lv partout
const xpFor = p => (p?.id && p.id === C.currentUser()?.id ? Math.max(Number(p.xp) || 0, myXp() || 0) : p?.xp);
import { GAMES } from './gamelist.js?v=20261020235205';
import * as L from './links.js?v=20261020235205';

const fmtDate = iso => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const initials = name => (name || '?').slice(0, 2).toUpperCase();

/** Rang en kanji stylé + jauge vers le niveau suivant */
/** Jauge simple réutilisable */
export function gauge(value, label, { kind = '', mark = null, mastery = null, detail = null } = {}) {
  const p = toPct(value);
  // Valeur fine : sous 10 %, une décimale, pour que chaque leçon fasse bouger la jauge
  const exact = Math.max(0, Math.min(100, (value || 0) * 100));
  const shown = exact > 0 && exact < 10 ? exact.toFixed(1).replace('.', ',') : String(p);
  const m = mastery == null ? null : Math.min(p, toPct(mastery));
  return h(`div.gauge-row${kind ? '.' + kind : ''}`,
    h('div.gauge-label', h('span', label, detail ? h('small.gauge-detail', detail) : null), h('strong', `${shown} %`, m ? h('small.mastery-tag', { title: 'Maîtrise : éléments révisés à 21 jours ou plus, réussis au moins 4 fois d’affilée et facilement' }, ` · ${m} % maîtrisé`) : null)),
    h('div.gauge', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': p, 'aria-label': label },
      h('span', { style: { width: `${exact > 0 ? Math.max(1.5, exact) : 0}%` } }),
      m ? h('i.gauge-glow', { style: { width: `${m}%` } }) : null,
      mark != null ? h('i.gauge-mark', { style: { left: `${toPct(mark)}%` }, title: `Objectif ${toPct(mark)} %` }) : null));
}

/** Rang en kanji stylé + jauge vers le niveau suivant (+ détail grammaire / vocabulaire) */
export function rankBlock(r, { compact = false } = {}) {
  const done = r.rank >= RANK_NAMES.length;
  const next = done ? null : (r.rank + 1 < RANK_NAMES.length ? RANK_NAMES[r.rank + 1] : 'N1 validé');
  const p = toPct(r.gauge);
  const lv = RANK_NAMES[Math.min(r.rank, RANK_NAMES.length - 1)];
  return h(`div.rank${compact ? '.compact' : ''}`,
    h('div.rank-top',
      h('span.rank-badge.kanji-pop', { lang: 'ja' }, rankLabel(r.rank).replace(' validé', '')),
      h('span.rank-text', h('strong', { html: jr(rankTitle(r.rank)) }), h('span', next ? `${p} % vers ${next}` : 'Tous les niveaux validés'))),
    h('div.gauge.main-gauge', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': p, 'aria-label': `Avancement du rang ${rankLabel(r.rank)}` },
      h('span', { style: { width: `${Math.max(3, p)}%` } }),
      r.mastery ? h('i.gauge-glow', { style: { width: `${Math.min(p, toPct(r.mastery))}%` }, title: `${toPct(r.mastery)} % maîtrisé` }) : null),
    !compact && r.grammar != null && !done ? h('div.rank-split',
      gauge(r.grammar, `Grammaire ${lv}`, { kind: 'g', mark: THRESHOLD.grammar, mastery: r.gMastery, detail: r.gSeen != null ? `${r.gSeen}/${r.gTotal} points` : null }),
      gauge(r.vocab, `Vocabulaire ${lv}`, { kind: 'v', mark: THRESHOLD.vocab, mastery: r.vMastery, detail: r.vSeen != null ? `${r.vSeen}/${r.vTotal} mots` : null })) : null);
}

function avatar(p, size = 'm', { level = false, aura = true } = {}) {
  const el = h(`span.avatar.${size}`);
  if (p?.avatar_url) el.append(h('img', { src: p.avatar_url, alt: '', loading: 'lazy' }));
  else el.append(h('span.avatar-initials', initials(p?.username)));
  const xp = xpFor(p);
  const streak = aura ? streakFor(p, C.currentUser()?.id) : 0;
  if ((!level || xp == null) && !auraTier(streak)) return el;
  return withAura(h(`span.av-wrap.${size}`, el, level && xp != null ? lvBadge(xp) : null), streak);
}

/** Pastille de niveau façon RPG, posée au-dessus de l'avatar */
export function lvBadge(xp, { inline = false } = {}) {
  const { lv } = playerLevel(xp);
  return h(`span.lv-badge${inline ? '.inline' : ''}`, { title: `Niveau ${lv}`, 'aria-label': `Niveau ${lv}` },
    h('small', 'Lv'), h('b', String(lv)));
}

/** Barre de niveau : Lv actuel et XP restante */
function levelBar(xp) {
  const L = playerLevel(xp);
  return h('div.level-bar',
    h('div.level-bar-top', h('span.lv-big', h('small', 'Lv'), h('b', String(L.lv))),
      h('span.small', L.lv >= 99 ? 'Niveau maximum' : `${L.toNext} XP avant le niveau ${L.lv + 1}`)),
    h('div.gauge', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(L.pct * 100), 'aria-label': 'Progression du niveau' },
      h('span', { style: { width: `${Math.max(3, Math.round(L.pct * 100))}%` } })));
}

/** 絆 Liens de confident : tous les miens sur mon profil, notre lien sur le profil d'un autre */
function linksSection(other) {
  const box = h('section.glass.links-box',
    h('h2', h('span.jp-head', { lang: 'ja', html: jr('絆') }), other ? `Ton lien avec ${other.username}` : 'Confidents'),
    h('p.small.muted', L.LINK_HELP, ' ', h('a', { href: '#/confidents' }, 'Ouvrir la page Confidents →')));
  const list = h('div.link-grid', h('p.small', 'Chargement…'));
  box.append(list);
  (async () => {
    if (other) {
      const l = await L.linkWith(other.id, { fresh: true });
      list.replaceChildren(l.xp ? L.linkCard(l, { name: other.username })
        : h('p.small', `Pas encore de lien : envoie une réaction ou un poke à ${other.username} pour le commencer.`));
      return;
    }
    const links = (await L.allLinks({ fresh: true })).slice(0, 12);
    if (!links.length) { list.replaceChildren(h('p.small', 'Aucun lien pour l’instant. Envoie des réactions ou des pokes aux autres élèves : chaque échange rapproche.')); return; }
    const names = await Promise.all(links.map(l => l.name ? l.name : C.getProfile(l.id).then(p => p?.username).catch(() => null)));
    list.replaceChildren(...links.map((l, k) => L.linkCard(l, { name: names[k] })));
  })().catch(() => list.replaceChildren(h('p.small', 'Liens indisponibles pour le moment.')));
  return box;
}

/** Tableau des scores : record de chaque jeu, détail par niveau et par unité */
function scoresSection(sc, { mine = false } = {}) {
  sc = sc || {};
  const games = sc.games || {}, detail = sc.detail || {};
  const played = Object.keys(GAMES).filter(k => games[k] != null);
  const total = (sc.ok || 0) + (sc.ko || 0);
  const box = h('section.glass.scores-box',
    h('h2', h('span.jp-head', { lang: 'ja', html: jr('記録') }), 'Scores'),
    h('div.stat-chips.score-chips',
      chip(sc.lessons || 0, (sc.lessons || 0) > 1 ? 'leçons validées' : 'leçon validée'),
      chip(total ? `${Math.round((sc.ok / total) * 100)} %` : '—', 'réussite aux exercices'),
      chip(sc.kana || 0, 'kana maîtrisés')));
  if (!played.length) {
    box.append(h('p.small.muted', mine ? 'Joue à un mini-jeu pour afficher tes records ici.' : 'Pas encore de record.'));
    return box;
  }
  box.append(h('ul.score-grid', played.map(k => {
    const g = GAMES[k];
    const rows = Object.entries(detail[k] || {}).sort((a, b) => a[0].localeCompare(b[0], 'fr', { numeric: true }));
    return h('li.score-card',
      h('div.score-head', h('span.score-glyph', { lang: 'ja', 'aria-hidden': 'true' }, g.glyph),
        h('span.score-name', h('span.small', { lang: 'ja' }, g.jp), h('strong', g.name)),
        h('span.score-best', h('small', 'Record'), h('b', String(games[k])))),
      rows.length ? h('ul.score-detail', rows.slice(0, 12).map(([v, n]) => h('li', h('span', v), h('b', String(n))))) : null);
  })));
  return box;
}

/** Met à jour l'entrée « Profil » du menu (photo + réactions non lues) */
export async function navAccount() {
  const link = document.querySelector('[data-nav="profil"]');
  if (!link) return;
  const slot = link.querySelector('.nav-avatar');
  const p = C.currentProfile();
  slot.replaceChildren(...(p ? [avatar(p, 'xs', { aura: false })] : []));
  slot.hidden = !p;
  const badge = document.getElementById('react-badge');
  const n = await C.unseenCount().catch(() => 0);
  badge.hidden = !n; badge.textContent = n > 9 ? '9+' : n;
}

// --- Profil ---------------------------------------------------------------------------
export async function profilePage(main, id) {
  const me = C.currentUser();
  if (!id) {
    if (!C.enabled || !me) return localProfile(main);
    id = me.id;
  }
  if (!C.enabled) return localProfile(main);
  const p = await C.getProfile(id);
  if (!p) { main.replaceChildren(h('div.card.empty', h('h2', 'Profil introuvable'), h('a.btn', { href: '#/communaute' }, 'Voir la communauté'))); return; }
  const isMe = me && me.id === p.id;
  if (isMe) await C.pushProgress().catch(() => {}); // rang à jour
  const liveOf = q => { const u = C.onlineUsers().find(x => x.id === q.id); return u ? { ...q, rank: Math.max(q.rank || 0, u.rank || 0), gauge: u.gauge ?? q.gauge, xp: Math.max(q.xp || 0, u.xp || 0), streak: u.streak ?? q.streak, scores: { ...(q.scores || {}), streakDay: u.streakDay ?? q.scores?.streakDay } } : q; };
  const fresh = isMe ? (C.currentProfile() || p) : liveOf(p);
  await render(fresh);
  if (!isMe) {
    // Profil d'un autre élève : statut « en ligne », Lv et série suivent en direct
    let lastSig = `${fresh.xp}|${fresh.rank}|${fresh.streak}`;
    const off = C.onOnline(users => {
      if (!main.isConnected || !main.querySelector('.profile-head')) return;
      const on = users.some(u => u.id === p.id);
      main.querySelector('.profile-online')?.classList.toggle('on', on);
      const q = liveOf(p), sig = `${q.xp}|${q.rank}|${q.streak}`;
      if (on && sig !== lastSig) { lastSig = sig; render(q); }
    });
    window.addEventListener('hashchange', off, { once: true });
  }

  async function render(p) {
    const r = isMe ? await computeRank() : { rank: p.rank, gauge: p.gauge, grammar: p.grammar_pct ?? null, vocab: p.vocab_pct ?? null };
    const header = h('section.profile-head',
      h('div.banner', p.banner_url ? { style: { backgroundImage: `url("${p.banner_url}")` } } : null),
      h('div.profile-id',
        avatar({ ...p, xp: isMe ? (r.xp ?? p.xp) : p.xp }, 'xl', { level: true }),
        h('div.profile-name',
          h('h1', p.username, !isMe ? h('span.profile-online', { class: C.onlineUsers().some(u => u.id === p.id) ? 'profile-online on' : 'profile-online' }, h('i'), h('span.po-on', 'En ligne'), h('span.po-off', 'Hors ligne')) : null),
          p.bio ? h('p.bio', p.bio) : (isMe ? h('p.bio.muted', 'Ajoute une petite bio dans « Modifier le profil ».') : null)),
        h('div.profile-actions', isMe
          ? [h('button.btn.small', { onclick: () => editProfile(main, p, render) }, 'Modifier le profil'),
             h('a.btn.small.ghost', { href: '#/communaute' }, 'Communauté'),
             h('a.btn.small.ghost', { href: '#/reglages' }, 'Réglages'),
             h('button.btn.small.ghost', { onclick: async () => { await C.signOut(); toast('Déconnecté'); location.hash = '#/'; } }, 'Se déconnecter')]
          : [h('a.btn.small.ghost', { href: '#/communaute' }, 'Communauté')])));

    const xp = isMe ? r.xp : p.xp;
    const stats = h('section.profile-stats',
      h('div.glass.rank-card', rankBlock(r), levelBar(xp)),
      h('div.stat-chips',
        chip(xp, 'XP'), streakChip(streakFor(p, me?.id)), chip(p.learned, 'cartes apprises')));

    const reactBox = h('section.glass.react-box');
    const linksBox = me ? linksSection(isMe ? null : p) : null;
    main.replaceChildren(...[header, stats, isMe ? streakCard() : null, scoresSection(isMe ? publicScores() : p.scores, { mine: isMe }), linksBox, reactBox].filter(Boolean));

    if (isMe) {
      const list = await C.reactionsFor(p.id).catch(() => []);
      reactBox.append(h('h2', 'Réactions reçues'),
        list.length ? h('ul.react-list', list.map(x => h('li', { class: x.seen ? null : 'unseen' },
          h('a.react-from', { href: `#/profil/${x.sender?.id}` }, avatar(x.sender, 's'), h('strong', x.sender?.username || '?')),
          stamp(x.kind), h('time.small', fmtDate(x.created_at)))))
          : h('p.small', 'Pas encore de réaction. Va saluer les autres élèves dans la communauté !'),
        h('a.btn.small', { href: '#/communaute' }, 'Voir la communauté'));
      if (list.some(x => !x.seen)) C.markSeen().then(navAccount);
    } else {
      const counts = await C.reactionCounts(p.id).catch(() => ({}));
      reactBox.append(h('h2', `Encourager ${p.username}`),
        me ? h('p.small', 'Une réaction de chaque type par jour.') : h('p.small', h('a', { href: '#/compte' }, 'Connecte-toi'), ' pour envoyer une réaction.'),
        h('div.stamps', Object.entries(C.REACTIONS).map(([k, v]) => h('button.stamp-btn', {
          disabled: !me, onclick: async e => {
            const btn = e.currentTarget; btn.disabled = true;
            try { await C.sendReaction(p.id, k); counts[k] = (counts[k] || 0) + 1; btn.querySelector('.stamp-count').textContent = counts[k]; btn.classList.add('sent'); toast(`${v.jp} envoyé à ${p.username}`); }
            catch (err) { toast(err.message); btn.disabled = false; }
          } },
          h('span.stamp-icon', { 'aria-hidden': 'true' }, v.icon), h('span.stamp-jp', { lang: 'ja' }, v.jp), h('span.stamp-fr', v.fr),
          h('span.stamp-count', counts[k] || 0)))));
    }
  }
}

/** Grande carte de série (mon profil) : flamme, palier d'aura et semaine 月→日 */
function streakCard() {
  const n = S.streak(), t = auraTier(n), nx = nextAura(n);
  const today = S.todayStats();
  return h('section.glass.streak-card',
    h('div.sc-left', flame({ size: 54, cls: n ? '' : 'off' }),
      h('div', h('b.sc-num', String(n)), h('span.sc-lbl', n > 1 ? 'jours d’affilée' : 'jour d’affilée'),
        t ? h('em.aura-name', { lang: 'ja' }, `${AURAS[t].jp} ${AURAS[t].name}`) : null,
        h('small', nx ? `Prochaine aura : ${nx.name} à ${nx.min} jours` : 'Aura maximale atteinte'))),
    h('div.sc-right', weekStrip({ big: true }),
      h('p.small.sc-rule', today.rev > 0 || today.les > 0 ? 'Série validée aujourd’hui ✓' : 'Fais une révision ou termine une leçon aujourd’hui pour garder ta flamme.')));
}
/** Case « jours d'affilée » : flamme bleue + palier d'aura et prochain palier */
function streakChip(n) {
  n = n || 0;
  const t = auraTier(n), nx = nextAura(n);
  return h(`div.stat-chip.glass.streak-chip.tier-${t}`,
    h('strong', flame({ size: 30, cls: n ? '' : 'off' }), String(n)),
    h('span', n > 1 ? 'jours d’affilée' : 'jour d’affilée'),
    t ? h('em.aura-name', { lang: 'ja' }, `${AURAS[t].jp} ${AURAS[t].name}`) : null,
    null);
}
const chip = (n, label) => h('div.stat-chip.glass', h('strong', n ?? 0), h('span', label));
const stamp = kind => { const v = C.REACTIONS[kind]; return h('span.stamp', h('span', { 'aria-hidden': 'true' }, v.icon), h('span', { lang: 'ja' }, v.jp), h('span.small', v.fr)); };

/** Profil local (sans compte) : rang calculé sur cet appareil + invitation */
async function localProfile(main) {
  const r = await computeRank();
  main.replaceChildren(
    h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('自分') }), 'Mon profil')),
    h('section.profile-stats',
      h('div.glass.rank-card', rankBlock(r), levelBar(r.xp)),
      h('div.stat-chips', chip(r.xp, 'XP'), streakChip(r.streak), chip(r.learned, 'cartes apprises'))),
    scoresSection(publicScores(), { mine: true }),
    h('section.glass.react-box',
      C.enabled
        ? [h('h2', 'Crée ton compte'),
           h('p', 'Garde ta progression sur tous tes appareils, choisis une photo et une bannière, et échange des réactions avec les autres élèves.'),
           h('a.btn.primary', { href: '#/compte' }, 'Créer un compte ou se connecter')]
        : [h('h2', 'Comptes bientôt disponibles'),
           h('p.small', 'Les comptes ne sont pas encore activés sur ce site. Ta progression reste enregistrée sur cet appareil.')],
      h('div.actions.left', C.enabled ? h('a.btn.ghost', { href: '#/communaute' }, 'Communauté') : null, h('a.btn.ghost', { href: '#/reglages' }, 'Réglages'))));
}

function editProfile(main, p, rerender) {
  const name = h('input#pf-name', { value: p.username, maxlength: 20, minlength: 2, required: true, autocomplete: 'nickname' });
  const bio = h('textarea#pf-bio', { maxlength: 160, rows: 3 }, p.bio || '');
  const files = {};
  const preview = h('div.edit-preview', h('div.banner', p.banner_url ? { style: { backgroundImage: `url("${p.banner_url}")` } } : null), avatar(p, 'xl'));
  const pick = kind => h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: e => {
    const f = e.target.files[0]; if (!f) return;
    files[kind] = f;
    const url = URL.createObjectURL(f);
    if (kind === 'banner') preview.querySelector('.banner').style.backgroundImage = `url("${url}")`;
    else preview.querySelector('.avatar').replaceChildren(h('img', { src: url, alt: '' }));
  } });
  const avIn = pick('avatar'), bnIn = pick('banner');
  const save = h('button.btn.primary', { type: 'submit' }, 'Enregistrer');
  const form = h('form.card.edit-form', { onsubmit: async e => {
    e.preventDefault(); save.disabled = true; save.textContent = 'Enregistrement…';
    try {
      const patch = { username: name.value.trim(), bio: bio.value.trim() };
      if (!USERNAME_RE.test(patch.username)) throw new Error(USERNAME_HINT);
      if (files.avatar) patch.avatar_url = await C.uploadImage(files.avatar, 'avatar');
      if (files.banner) patch.banner_url = await C.uploadImage(files.banner, 'banner');
      const np = await C.updateProfile(patch);
      toast('Profil enregistré'); rerender(np); navAccount();
    } catch (err) { toast(err.message); save.disabled = false; save.textContent = 'Enregistrer'; }
  } },
    h('h2', 'Modifier le profil'), preview,
    h('div.actions.left', avIn, bnIn,
      h('button.btn.small', { type: 'button', onclick: () => avIn.click() }, 'Changer la photo'),
      h('button.btn.small', { type: 'button', onclick: () => bnIn.click() }, 'Changer la bannière')),
    h('label.field', { for: 'pf-name' }, h('span', 'Pseudo'), name),
    h('label.field', { for: 'pf-bio' }, h('span', 'Bio (160 caractères max)'), bio),
    h('div.actions.left', save, h('button.btn.ghost', { type: 'button', onclick: () => rerender(p) }, 'Annuler')));
  main.replaceChildren(form);
  name.focus();
}

// --- Communauté -------------------------------------------------------------------------
export async function communityPage(main) {
  const head = h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('仲間') }), 'Communauté'),
    h('p.section-note', 'Les élèves de 桜の文法, classés par rang. Ouvre un profil pour lui envoyer une réaction. ', h('a', { href: '#/confidents' }, '絆 Mes confidents →')));
  if (!C.enabled) {
    main.replaceChildren(head, h('div.card.empty', h('h2', 'Comptes pas encore activés'), h('p', 'La communauté apparaîtra dès que les comptes seront activés sur ce site.')));
    return;
  }
  const search = h('input.search', { type: 'search', placeholder: 'Chercher un pseudo…', 'aria-label': 'Chercher un élève' });
  const grid = h('ul.members');
  let timer;
  let list = [];
  // Les élèves connectés : leurs Lv, rang et série arrivent en direct par la présence (plus frais que la base)
  const live = p => { const u = C.onlineUsers().find(x => x.id === p.id); return u ? { ...p, rank: Math.max(p.rank || 0, u.rank || 0), gauge: u.gauge ?? p.gauge, xp: Math.max(p.xp || 0, u.xp || 0), streak: u.streak ?? p.streak, scores: { ...(p.scores || {}), streakDay: u.streakDay ?? p.scores?.streakDay }, online: true } : p; };
  const paint = () => {
    const me = C.currentUser()?.id;
    grid.replaceChildren(...(list.length ? list.map(live).map(p => h('li', h('a.member.glass', { href: `#/profil/${p.id}`, class: p.online ? 'member glass is-online' : 'member glass' },
      p.online ? h('span.member-online', { title: 'En ligne maintenant' }, 'En ligne') : null,
      avatar(p, 'l', { level: true }),
      h('span.member-name', p.username, p.id === me ? h('span.you', 'toi') : null, streakFor(p, me) ? streakBadge(streakFor(p, me)) : null),
      rankBlock({ rank: p.rank, gauge: p.gauge }, { compact: true }),
      h('span.small', `${xpFor(p) ?? 0} XP · ${p.learned} cartes`))))
      : [h('li.empty-line', 'Personne ne correspond à cette recherche.')]));
  };
  const load = async () => { list = await C.listProfiles(search.value.trim()); paint(); };
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 300); });
  main.replaceChildren(...[head,
    C.currentUser() ? null : h('div.glass.join-banner', h('p', 'Crée ton compte pour apparaître ici et envoyer des réactions.'), h('a.btn.primary.small', { href: '#/compte' }, 'Créer un compte')),
    search, grid].filter(Boolean));
  await load();
  // Mises à jour en direct tant qu'on reste sur la page
  let pt; const offOnline = C.onOnline(() => { clearTimeout(pt); pt = setTimeout(() => { if (grid.isConnected) paint(); }, 250); });
  const refresh = setInterval(() => { if (!grid.isConnected) return; if (document.visibilityState === 'visible') load().catch(() => {}); }, 45000);
  window.addEventListener('hashchange', () => { offOnline(); clearInterval(refresh); }, { once: true });
}

function newPassword(main) {
  const pass = h('input#np-pass', { type: 'password', minlength: 6, required: true, autocomplete: 'new-password' });
  const msg = h('p.form-msg', { 'aria-live': 'polite' });
  main.replaceChildren(h('form.card.auth-card', { onsubmit: async e => {
    e.preventDefault();
    try { await C.updatePassword(pass.value); toast('Mot de passe modifié'); location.hash = '#/profil'; }
    catch (err) { msg.className = 'form-msg ko'; msg.textContent = err.message; }
  } },
    h('h1.auth-title', h('span.kanji-pop', { lang: 'ja' }, '鍵'), h('span', 'Nouveau mot de passe')),
    h('label.field', { for: 'np-pass' }, h('span', 'Nouveau mot de passe (6 caractères min.)'), pass),
    h('button.btn.primary.wide', { type: 'submit' }, 'Enregistrer'), msg));
}

// --- Connexion / inscription -------------------------------------------------------------
/** Portail d'entrée : visible tant qu'on n'est pas connecté */
export function portalPage(main) {
  const slot = h('div.portal-form');
  const petals = h('div.petal-rain', { 'aria-hidden': 'true' });
  if (!reducedMotion()) {
    for (let i = 0; i < 18; i++) petals.append(h('span', { style: {
      left: `${Math.random() * 100}%`, animationDelay: `${-Math.random() * 14}s`, animationDuration: `${10 + Math.random() * 8}s`,
      '--drift': `${Math.random() * 120 - 60}px`, '--size': `${8 + Math.random() * 10}px`, '--spin': `${Math.random() * 720 - 360}deg` } }));
  }
  main.replaceChildren(h('section.portal', h('div.wallpaper-wrap', { html: wallpaperSVG(), 'aria-hidden': 'true' }), petals,
    h('div.portal-copy',
      h('h1.hero-title', { lang: 'ja', 'aria-label': '桜の文法', html: '<span><ruby>桜<rt>さくら</rt></ruby></span><span>の</span><span><ruby>文法<rt>ぶんぽう</rt></ruby></span>' }),
      h('p.hero-lead', 'La grammaire japonaise du N5 au N1, une phrase à la fois.'),
      h('ul.portal-points',
        h('li', h('span.kanji-pop', { lang: 'ja' }, '復習'), h('span', 'Révisions espacées : ce que tu rates revient vite, ce que tu sais revient plus tard.')),
        h('li', h('span.kanji-pop', { lang: 'ja' }, '遊び'), h('span', 'Mini-jeux : sers des clients au café, attrape les pétales, place les particules.')),
        h('li', h('span.kanji-pop', { lang: 'ja' }, '仲間'), h('span', 'Ton rang de N5 à N1, ton profil, et des réactions entre élèves.')))),
    slot));
  accountPage(slot, { portal: true });
}

/** Pseudo : 2 à 20 caractères, japonais compris (kana, kanji), sans espaces ni symboles à risque */
export const USERNAME_RE = /^[^\s@<>"'`/\\]{2,20}$/u;
const USERNAME_HINT = 'Identifiant : 2 à 20 caractères, sans espace ni @ < > " \' ` / \\. Kana et kanji acceptés.';

export async function accountPage(main, { portal = false } = {}) {
  if (!C.enabled) { location.hash = '#/profil'; return; }
  if (C.isRecovery()) return newPassword(main);
  if (C.currentUser()) { if (!portal) location.hash = '#/profil'; return; }
  let mode = portal ? 'login' : 'signup';
  let lastEmail = '';
  const render = () => {
    const ident = h('input#ac-ident', { required: true, maxlength: 60, autocomplete: 'username', placeholder: 'さくら、yuki_fr…', autocapitalize: 'off', spellcheck: 'false' });
    const name = h('input#ac-name', { required: true, minlength: 2, maxlength: 20, autocomplete: 'username', placeholder: 'さくら、由紀、yuki_fr…', autocapitalize: 'off', spellcheck: 'false' });
    const email = h('input#ac-email', { type: 'email', required: true, autocomplete: 'email', placeholder: 'toi@exemple.fr', value: lastEmail });
    const pass = h('input#ac-pass', { type: 'password', required: true, minlength: 6, autocomplete: mode === 'signup' ? 'new-password' : 'current-password' });
    const msg = h('p.form-msg', { 'aria-live': 'polite' });
    const extra = h('div.form-extra');
    const submit = h('button.btn.primary.wide', { type: 'submit' }, mode === 'signup' ? 'Créer mon compte' : mode === 'login' ? 'Se connecter' : 'Envoyer le lien');
    const say = (text, ok) => { msg.className = `form-msg ${ok ? 'ok' : 'ko'}`; msg.textContent = text; };

    /** Bouton « Renvoyer » avec un délai de 60 s entre deux envois */
    const resendButton = (label, send) => {
      const btn = h('button.btn.small.ghost', { type: 'button' }, label);
      let left = 0, timer;
      const tick = () => { btn.disabled = left > 0; btn.textContent = left > 0 ? `${label} (${left} s)` : label; if (left-- > 0) timer = setTimeout(tick, 1000); };
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try { await send(); say('E-mail renvoyé. Pense à regarder dans les spams.', true); left = 60; tick(); }
        catch (err) { say(err.message); btn.disabled = false; }
      });
      left = 60; tick();
      return btn;
    };

    const form = h('form.card.auth-card', { onsubmit: async e => {
      e.preventDefault(); submit.disabled = true; msg.textContent = ''; extra.replaceChildren();
      try {
        if (mode === 'signup') {
          const pseudo = name.value.trim();
          if (!USERNAME_RE.test(pseudo)) throw new Error(USERNAME_HINT);
          if (!(await C.usernameAvailable(pseudo))) throw new Error('Cet identifiant est déjà pris.');
          lastEmail = email.value.trim();
          const r = await C.signUp(lastEmail, pass.value, pseudo);
          if (r.needsConfirm) {
            say(`Compte créé ! Un e-mail de confirmation a été envoyé à ${lastEmail}. Clique sur le lien, puis connecte-toi avec ton identifiant.`, true);
            extra.append(resendButton('Renvoyer l’e-mail de confirmation', () => C.resendConfirmation(lastEmail)));
            submit.disabled = false; return;
          }
        } else if (mode === 'login') {
          await C.signInWithLogin(ident.value.trim(), pass.value);
        } else {
          lastEmail = email.value.trim();
          await C.resetPassword(lastEmail);
          say('Si un compte existe avec cet e-mail, un lien de réinitialisation vient d’être envoyé.', true);
          extra.append(resendButton('Renvoyer l’e-mail', () => C.resetPassword(lastEmail)));
          submit.disabled = false; return;
        }
        toast('Bienvenue !'); if (!portal) location.hash = '#/profil';
      } catch (err) {
        say(err.message); submit.disabled = false;
        if (/Confirme d’abord/.test(err.message) && mode === 'login' && ident.value.includes('@'))
          extra.append(resendButton('Renvoyer l’e-mail de confirmation', () => C.resendConfirmation(ident.value.trim())));
      }
    } },
      mode !== 'reset' ? h('div.tabs.auth-tabs',
        h('button', { type: 'button', class: mode === 'signup' ? 'tab active' : 'tab', onclick: () => { mode = 'signup'; render(); } }, 'Inscription'),
        h('button', { type: 'button', class: mode === 'login' ? 'tab active' : 'tab', onclick: () => { mode = 'login'; render(); } }, 'Connexion')) : null,
      h('h1.auth-title', h('span.kanji-pop', { lang: 'ja', html: jr(mode === 'signup' ? 'ようこそ' : mode === 'login' ? 'おかえり' : '鍵') }),
        h('span', mode === 'signup' ? 'Crée ton compte' : mode === 'login' ? 'Content de te revoir' : 'Mot de passe oublié')),
      mode === 'login' ? h('label.field', { for: 'ac-ident' }, h('span', 'Identifiant'), ident) : null,
      mode === 'signup' ? h('label.field', { for: 'ac-name' }, h('span', 'Identifiant (kana et kanji acceptés)'), name) : null,
      mode !== 'login' ? h('label.field', { for: 'ac-email' }, h('span', 'E-mail'), email) : null,
      mode === 'reset' ? h('p.small', 'Indique l’e-mail utilisé à l’inscription : on t’envoie un lien pour choisir un nouveau mot de passe.') : null,
      mode !== 'reset' ? h('label.field', { for: 'ac-pass' }, h('span', 'Mot de passe (6 caractères min.)'), pass) : null,
      submit, msg, extra,
      mode === 'login' ? h('button.linkish', { type: 'button', onclick: () => { mode = 'reset'; render(); } }, 'Mot de passe oublié ?') : null,
      mode === 'reset' ? h('button.linkish', { type: 'button', onclick: () => { mode = 'login'; render(); } }, 'Retour à la connexion') : null,
      mode === 'signup' ? h('p.small', 'L’e-mail sert seulement à confirmer ton compte et à récupérer ton mot de passe. Tu te connectes ensuite avec ton identifiant.') : null);
    main.replaceChildren(form);
    (mode === 'login' ? ident : mode === 'signup' ? name : email).focus({ preventScroll: true });
  };
  render();
}

// --- Connectés en direct (panneau latéral) -------------------------------------------------
let onlineMounted = false;
export function mountOnline() {
  if (onlineMounted || !C.enabled) return;
  onlineMounted = true;
  const list = h('ul.online-list');
  const count = h('span.online-count', '0');
  // 絆 Accès aux confidents, juste sous les connectés (c'est le même sujet : les autres élèves)
  const confRows = h('ol.oc-rows');
  const confBox = h('section.online-conf',
    h('a.oc-head', { href: '#/confidents', onclick: () => document.body.classList.remove('online-open') },
      h('span.oc-kanji', { lang: 'ja' }, '絆'), h('span.oc-word', 'CONFIDENTS'), h('span.oc-go', { 'aria-hidden': 'true' }, '›')),
    confRows);
  // Sur la page Confidents, c'est ce bouton (à droite) qui porte la sélection, comme l'onglet actif du menu
  const markConf = () => { const on = /^#\/confidents/.test(location.hash); confBox.firstChild.classList.toggle('on', on); on ? confBox.firstChild.setAttribute('aria-current', 'page') : confBox.firstChild.removeAttribute('aria-current'); };
  markConf(); window.addEventListener('hashchange', markConf);
  const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const refreshConf = async (fresh = false) => {
    if (!C.currentUser()) { confRows.replaceChildren(); return; }
    const links = (await L.allLinks({ fresh }).catch(() => [])).slice(0, 3);
    if (!links.length) { confRows.replaceChildren(h('li.oc-empty.small', 'Réagis ou poke un élève pour nouer ton premier lien.')); return; }
    const names = await Promise.all(links.map(l => l.name || C.getProfile(l.id).then(p => p?.username).catch(() => null)));
    confRows.replaceChildren(...links.map((l, k) => h('li', h('a.oc-row', { href: '#/confidents', onclick: () => document.body.classList.remove('online-open') },
      h('span.oc-arc', { lang: 'ja' }, L.arcanaOf(l.id)[0]),
      h('span.oc-name', names[k] || 'Élève'),
      h('span.oc-rank', l.rank >= L.MAX_RANK ? 'MAX' : ROMAN[l.rank]),
      h('span.oc-bar', h('i', { style: { width: `${Math.round(l.pct * 100)}%` } }))))));
  };
  C.onInteraction(() => setTimeout(() => refreshConf(true), 600));
  C.onAuth(() => refreshConf(true));
  setTimeout(() => refreshConf(true), 1500);
  const panel = h('aside.online-panel', { 'aria-label': 'Élèves connectés' },
    h('header.online-head',
      h('span.live-dot', { 'aria-hidden': 'true' }),
      h('h2', 'En ligne'), count,
      h('button.online-close', { type: 'button', 'aria-label': 'Fermer', onclick: () => document.body.classList.remove('online-open') }, '×')),
    h('p.online-hint.small', 'Classés du N5 au N1. Touche un élève pour une réaction ou un poke (先輩 = plus avancé que toi).'),
    list, confBox);
  const fab = h('button.online-fab', { type: 'button', onclick: () => document.body.classList.toggle('online-open'), 'aria-label': 'Voir les élèves connectés' },
    h('span.live-dot', { 'aria-hidden': 'true' }), h('span.online-fab-n', '0'));
  document.querySelector('.shell').append(panel);
  document.body.append(fab);
  let openId = null;

  let pokeOpen = null;
  const SUGGEST = ['Tu as un conseil pour bien réviser ?', 'Comment tu retiens les kanji ?', 'Tu peux m’expliquer ce point ?', 'Comment tu as passé ce niveau ?'];
  const currentPoint = () => { const m = location.hash.match(/^#\/point\/(\d+)/); return m ? Number(m[1]) : null; };

  function pokeForm(u) {
    const about = currentPoint();
    const ta = h('textarea.poke-input', { rows: 2, maxlength: 160, placeholder: 'Ta question (facultatif)…', 'aria-label': `Question pour ${u.username}` });
    const send = h('button.btn.small.primary', { type: 'button', onclick: async () => {
      send.disabled = true;
      try {
        await C.sendPoke(u.id, { msg: ta.value.trim(), about });
        play('select'); toast(`👉 Poke envoyé à ${u.username}`);
        pokeOpen = null; render(C.onlineUsers());
      } catch (err) { toast(err.message); send.disabled = false; }
    } }, 'Envoyer le poke');
    const wait = C.pokeWait(u.id);
    if (wait) { send.disabled = true; send.textContent = `Patiente ${Math.ceil(wait / 1000)} s`; setTimeout(() => { if (pokeOpen === u.id) render(C.onlineUsers()); }, wait + 50); }
    return h('div.poke-form',
      h('div.poke-suggest', SUGGEST.map(t => h('button.poke-chip', { type: 'button', onclick: () => { ta.value = t; ta.focus(); play('cursor'); } }, t))),
      about ? h('p.small.poke-about', '📎 Le point que tu regardes sera joint à ta question.') : null,
      ta, h('div.poke-actions', send));
  }

  const render = users => {
    const me = C.currentUser()?.id;
    count.textContent = users.length;
    fab.querySelector('.online-fab-n').textContent = users.length;
    document.body.classList.toggle('has-online', Boolean(me));
    if (!users.length) { list.replaceChildren(h('li.online-empty.small', 'Personne d’autre pour l’instant.')); return; }
    const myRank = users.find(u => u.id === me)?.rank ?? 0;
    // Groupes par niveau, du N5 (débutants) au N1
    const groups = new Map();
    users.forEach(u => { const k = Math.min(u.rank || 0, RANK_NAMES.length); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(u); });
    const rows = [];
    [...groups.keys()].sort((a, b) => a - b).forEach(k => {
      rows.push(h('li.online-group', h('span', { lang: 'ja' }, rankLabel(k).replace(' validé', ' ✓')), h('small', `${groups.get(k).length}`)));
      groups.get(k).forEach(u => {
        const isMe = u.id === me;
        const open = openId === u.id;
        const item = h('li.online-item', { class: open ? 'online-item open' : 'online-item' });
        const row = h('button.online-row', { type: 'button', disabled: isMe, onclick: () => { openId = open ? null : u.id; pokeOpen = null; render(C.onlineUsers()); } },
          avatar(u, 's'),
          xpFor(u) != null ? lvBadge(xpFor(u), { inline: true }) : null,
          h('span.online-name', h('span.on-n', u.username), isMe ? h('span.you', 'toi') : null, !isMe && (u.rank || 0) > myRank ? h('span.can-help', { title: 'Plus avancé que toi : idéal pour demander conseil', html: jr('先輩') }) : null),
          streakFor(u, me) ? h('span.online-streak', flame({ size: 11 }), String(streakFor(u, me))) : null,
          h('span.online-rank', { lang: 'ja' }, rankLabel(u.rank || 0).replace(' validé', '')));
        item.append(row);
        if (open && !isMe) {
          item.append(h('div.online-stamps',
            h('button.poke-btn', { type: 'button', class: pokeOpen === u.id ? 'poke-btn on' : 'poke-btn', onclick: () => { pokeOpen = pokeOpen === u.id ? null : u.id; play('cursor'); render(C.onlineUsers()); } },
              h('span', { 'aria-hidden': 'true' }, '👉'), 'Poke · demander conseil'),
            ...Object.entries(C.REACTIONS).map(([k, v]) => h('button.mini-stamp', {
              type: 'button', title: `${v.jp} · ${v.fr}`, 'aria-label': `Envoyer ${v.fr} à ${u.username}`,
              onclick: async e => {
                const btn = e.currentTarget; btn.disabled = true;
                try { await C.sendReaction(u.id, k); btn.classList.add('sent'); toast(`${v.icon} ${v.jp} envoyé à ${u.username}`); }
                catch (err) { toast(err.message); btn.disabled = false; }
              } }, h('span', { 'aria-hidden': 'true' }, v.icon))),
            pokeOpen === u.id ? pokeForm(u) : null,
            h('a.online-profile.small', { href: `#/profil/${u.id}`, onclick: () => document.body.classList.remove('online-open') }, 'Voir le profil')));
        }
        rows.push(item);
      });
    });
    // Une mise à jour de présence ne doit pas effacer une question en cours d'écriture
    const oldTa = list.querySelector('.poke-input'), draft = oldTa?.value, hadFocus = oldTa && document.activeElement === oldTa;
    list.replaceChildren(...rows);
    const ta = list.querySelector('.poke-input');
    if (ta) { if (draft) ta.value = draft; if (hadFocus || !oldTa) ta.focus({ preventScroll: true }); }
  };

  // Pokes reçus : une carte qui reste jusqu'à ce qu'on réponde ou la ferme
  const stack = h('div.poke-stack', { 'aria-live': 'polite' });
  document.body.append(stack);
  C.onPoke(async p => {
    play('ping');
    navigator.vibrate?.([30, 60, 30]);
    const g = p.about ? await D.grammarById(p.about).catch(() => null) : null;
    const replyBox = h('div.poke-reply');
    const close = () => { card.classList.add('leaving'); setTimeout(() => card.remove(), 300); };
    const isReply = p.kind === 'reply';
    const card = h('section.poke-card', { role: 'alert' },
      h('header.poke-head', avatar({ id: p.from, username: p.name, avatar_url: p.avatar_url }, 's'),
        h('div', h('p.poke-title', { lang: 'ja', html: jr(isReply ? 'お返事！' : 'つんつん！') }),
          h('p.poke-who', h('strong', p.name), ` (${rankLabel(p.rank || 0).replace(' validé', '')}) `, isReply ? 'te répond' : 'te demande conseil')),
        h('button.poke-x', { type: 'button', 'aria-label': 'Fermer', onclick: close }, '×')),
      p.msg ? h('blockquote.poke-msg', p.msg) : null,
      g ? h('a.poke-point', { href: `#/point/${g.id}`, onclick: close }, h('span', { lang: 'ja', html: ruby(D.gramLabel(g), true) }), ` · ${g.s}`) : null,
      replyBox,
      h('div.poke-actions',
        h('button.btn.small.primary', { type: 'button', onclick: e => {
          e.currentTarget.remove();
          const ta = h('textarea.poke-input', { rows: 2, maxlength: 160, placeholder: isReply ? 'Ta réponse…' : 'Ton conseil…' });
          const send = h('button.btn.small.primary', { type: 'button', onclick: async () => {
            if (!ta.value.trim()) { ta.focus(); return; }
            send.disabled = true;
            try { await C.sendPoke(p.from, { msg: ta.value.trim(), kind: 'reply', about: p.about }); play('select'); toast(`Réponse envoyée à ${p.name}`); close(); }
            catch (err) { toast(err.message); send.disabled = false; }
          } }, 'Envoyer');
          replyBox.replaceChildren(ta, send); ta.focus();
        } }, 'Répondre'),
        h('a.btn.small', { href: `#/profil/${p.from}`, onclick: close }, 'Profil'),
        h('button.btn.small.ghost', { type: 'button', onclick: close }, 'Plus tard')));
    stack.prepend(card);
    [...stack.children].slice(3).forEach(c => c.remove());
  });

  C.onOnline(render);
  window.addEventListener('sakura:xp', () => render(C.onlineUsers()));
  // Au démarrage : on calcule mon XP pour que ma pastille Lv soit juste même avant la première synchro
  computeRank().catch(() => {});
  C.onAuth(() => render(C.onlineUsers()));
  C.onReaction(r => {
    const v = C.REACTIONS[r.kind];
    play('ping');
    toast(`${v?.icon || '🌸'} ${r.sender?.username || 'Quelqu’un'} t’envoie ${v?.jp || r.kind}`);
    navAccount();
  });
}
