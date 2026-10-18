// Pages sociales : profil, communauté, connexion / inscription, rang N5 → N1.
import { h, $, toast } from './util.js';
import * as C from './cloud.js';
import { computeRank, rankLabel, rankTitle, RANK_NAMES } from './level.js';

const fmtDate = iso => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const initials = name => (name || '?').slice(0, 2).toUpperCase();

/** Rang en kanji stylé + jauge vers le niveau suivant */
export function rankBlock(r, { compact = false } = {}) {
  const next = r.rank >= RANK_NAMES.length ? null : (r.rank + 1 < RANK_NAMES.length ? RANK_NAMES[r.rank + 1] : 'N1 validé');
  const pct = Math.round(r.gauge * 100);
  return h(`div.rank${compact ? '.compact' : ''}`,
    h('div.rank-top',
      h('span.rank-badge.kanji-pop', { lang: 'ja' }, rankLabel(r.rank).replace(' validé', '')),
      h('span.rank-text', h('strong', rankTitle(r.rank)), h('span', next ? `${pct} % vers ${next}` : 'Tous les niveaux validés'))),
    h('div.gauge', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': `Avancement du rang ${rankLabel(r.rank)}` },
      h('span', { style: { width: `${Math.max(3, pct)}%` } })));
}

function avatar(p, size = 'm') {
  const el = h(`span.avatar.${size}`);
  if (p?.avatar_url) el.append(h('img', { src: p.avatar_url, alt: '', loading: 'lazy' }));
  else el.append(h('span.avatar-initials', initials(p?.username)));
  return el;
}

/** Met à jour l'entrée « Profil » du menu (photo + réactions non lues) */
export async function navAccount() {
  const link = document.querySelector('[data-nav="profil"]');
  if (!link) return;
  const slot = link.querySelector('.nav-avatar');
  const p = C.currentProfile();
  slot.replaceChildren(...(p ? [avatar(p, 'xs')] : []));
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
  const fresh = isMe ? (C.currentProfile() || p) : p;
  render(fresh);

  async function render(p) {
    const r = { rank: p.rank, gauge: p.gauge };
    const header = h('section.profile-head',
      h('div.banner', p.banner_url ? { style: { backgroundImage: `url("${p.banner_url}")` } } : null),
      h('div.profile-id',
        avatar(p, 'xl'),
        h('div.profile-name',
          h('h1', p.username),
          p.bio ? h('p.bio', p.bio) : (isMe ? h('p.bio.muted', 'Ajoute une petite bio dans « Modifier le profil ».') : null)),
        h('div.profile-actions', isMe
          ? [h('button.btn.small', { onclick: () => editProfile(main, p, render) }, 'Modifier le profil'),
             h('a.btn.small.ghost', { href: '#/communaute' }, 'Communauté'),
             h('a.btn.small.ghost', { href: '#/reglages' }, 'Réglages'),
             h('button.btn.small.ghost', { onclick: async () => { await C.signOut(); toast('Déconnecté'); location.hash = '#/'; } }, 'Se déconnecter')]
          : [h('a.btn.small.ghost', { href: '#/communaute' }, 'Communauté')])));

    const stats = h('section.profile-stats',
      h('div.glass.rank-card', rankBlock(r)),
      h('div.stat-chips',
        chip(p.xp, 'XP'), chip(p.streak, p.streak > 1 ? 'jours d’affilée' : 'jour d’affilée'), chip(p.learned, 'cartes apprises')));

    const reactBox = h('section.glass.react-box');
    main.replaceChildren(header, stats, reactBox);

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

const chip = (n, label) => h('div.stat-chip.glass', h('strong', n ?? 0), h('span', label));
const stamp = kind => { const v = C.REACTIONS[kind]; return h('span.stamp', h('span', { 'aria-hidden': 'true' }, v.icon), h('span', { lang: 'ja' }, v.jp), h('span.small', v.fr)); };

/** Profil local (sans compte) : rang calculé sur cet appareil + invitation */
async function localProfile(main) {
  const r = await computeRank();
  main.replaceChildren(
    h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja' }, '自分'), 'Mon profil')),
    h('section.profile-stats',
      h('div.glass.rank-card', rankBlock(r)),
      h('div.stat-chips', chip(r.xp, 'XP'), chip(r.streak, r.streak > 1 ? 'jours d’affilée' : 'jour d’affilée'), chip(r.learned, 'cartes apprises'))),
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
  const name = h('input#pf-name', { value: p.username, maxlength: 20, minlength: 3, required: true, autocomplete: 'nickname' });
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
      if (!/^[\w\-.ぁ-んァ-ン一-龯]{3,20}$/.test(patch.username)) throw new Error('Pseudo : 3 à 20 caractères (lettres, chiffres, _ - .).');
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
  const head = h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja' }, '仲間'), 'Communauté'),
    h('p.section-note', 'Les élèves de 桜の文法, classés par rang. Ouvre un profil pour lui envoyer une réaction.'));
  if (!C.enabled) {
    main.replaceChildren(head, h('div.card.empty', h('h2', 'Comptes pas encore activés'), h('p', 'La communauté apparaîtra dès que les comptes seront activés sur ce site.')));
    return;
  }
  const search = h('input.search', { type: 'search', placeholder: 'Chercher un pseudo…', 'aria-label': 'Chercher un élève' });
  const grid = h('ul.members');
  let timer;
  const load = async () => {
    const list = await C.listProfiles(search.value.trim());
    const me = C.currentUser()?.id;
    grid.replaceChildren(...(list.length ? list.map(p => h('li', h('a.member.glass', { href: `#/profil/${p.id}` },
      avatar(p, 'l'),
      h('span.member-name', p.username, p.id === me ? h('span.you', 'toi') : null),
      rankBlock({ rank: p.rank, gauge: p.gauge }, { compact: true }),
      h('span.small', `${p.xp} XP · ${p.learned} cartes`))))
      : [h('li.empty-line', 'Personne ne correspond à cette recherche.')]));
  };
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 300); });
  main.replaceChildren(...[head,
    C.currentUser() ? null : h('div.glass.join-banner', h('p', 'Crée ton compte pour apparaître ici et envoyer des réactions.'), h('a.btn.primary.small', { href: '#/compte' }, 'Créer un compte')),
    search, grid].filter(Boolean));
  await load();
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
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let i = 0; i < 18; i++) petals.append(h('span', { style: {
      left: `${Math.random() * 100}%`, animationDelay: `${-Math.random() * 14}s`, animationDuration: `${10 + Math.random() * 8}s`,
      '--drift': `${Math.random() * 120 - 60}px`, '--size': `${8 + Math.random() * 10}px`, '--spin': `${Math.random() * 720 - 360}deg` } }));
  }
  main.replaceChildren(h('section.portal', petals,
    h('div.portal-copy',
      h('h1.hero-title', { lang: 'ja', 'aria-label': '桜の文法', html: '<span>桜</span><span>の</span><span>文法</span>' }),
      h('p.hero-lead', 'La grammaire japonaise du N5 au N1, une phrase à la fois.'),
      h('ul.portal-points',
        h('li', h('span.kanji-pop', { lang: 'ja' }, '復習'), h('span', 'Révisions espacées : ce que tu rates revient vite, ce que tu sais revient plus tard.')),
        h('li', h('span.kanji-pop', { lang: 'ja' }, '遊び'), h('span', 'Mini-jeux : sers des clients au café, attrape les pétales, place les particules.')),
        h('li', h('span.kanji-pop', { lang: 'ja' }, '仲間'), h('span', 'Ton rang de N5 à N1, ton profil, et des réactions entre élèves.')))),
    slot));
  accountPage(slot, { portal: true });
}

export async function accountPage(main, { portal = false } = {}) {
  if (!C.enabled) { location.hash = '#/profil'; return; }
  if (C.isRecovery()) return newPassword(main);
  if (C.currentUser()) { if (!portal) location.hash = '#/profil'; return; }
  let mode = portal ? 'login' : 'signup';
  const render = () => {
    const email = h('input#ac-email', { type: 'email', required: true, autocomplete: 'email', placeholder: 'toi@exemple.fr' });
    const pass = h('input#ac-pass', { type: 'password', required: mode !== 'reset', minlength: 6, autocomplete: mode === 'signup' ? 'new-password' : 'current-password' });
    const name = h('input#ac-name', { required: true, minlength: 3, maxlength: 20, autocomplete: 'nickname', placeholder: 'Ton pseudo' });
    const msg = h('p.form-msg', { 'aria-live': 'polite' });
    const submit = h('button.btn.primary.wide', { type: 'submit' }, mode === 'signup' ? 'Créer mon compte' : mode === 'login' ? 'Se connecter' : 'Envoyer le lien');
    const form = h('form.card.auth-card', { onsubmit: async e => {
      e.preventDefault(); submit.disabled = true; msg.textContent = '';
      try {
        if (mode === 'signup') {
          if (!/^[\w\-.ぁ-んァ-ン一-龯]{3,20}$/.test(name.value.trim())) throw new Error('Pseudo : 3 à 20 caractères (lettres, chiffres, _ - .).');
          const r = await C.signUp(email.value.trim(), pass.value, name.value.trim());
          if (r.needsConfirm) { msg.className = 'form-msg ok'; msg.textContent = 'Compte créé ! Ouvre l’e-mail de confirmation, puis reviens te connecter.'; mode = 'login'; submit.disabled = false; return; }
        } else if (mode === 'login') {
          await C.signIn(email.value.trim(), pass.value);
        } else {
          await C.resetPassword(email.value.trim());
          msg.className = 'form-msg ok'; msg.textContent = 'Si un compte existe avec cet e-mail, un lien vient de t’être envoyé.'; submit.disabled = false; return;
        }
        toast('Bienvenue !'); if (!portal) location.hash = '#/profil';
      } catch (err) { msg.className = 'form-msg ko'; msg.textContent = err.message; submit.disabled = false; }
    } },
      h('div.tabs.auth-tabs',
        h('button', { type: 'button', class: mode === 'signup' ? 'tab active' : 'tab', onclick: () => { mode = 'signup'; render(); } }, 'Inscription'),
        h('button', { type: 'button', class: mode === 'login' ? 'tab active' : 'tab', onclick: () => { mode = 'login'; render(); } }, 'Connexion')),
      h('h1.auth-title', h('span.kanji-pop', { lang: 'ja' }, mode === 'signup' ? 'ようこそ' : mode === 'login' ? 'おかえり' : '鍵'),
        h('span', mode === 'signup' ? 'Crée ton compte' : mode === 'login' ? 'Content de te revoir' : 'Mot de passe oublié')),
      mode === 'signup' ? h('label.field', { for: 'ac-name' }, h('span', 'Pseudo'), name) : null,
      h('label.field', { for: 'ac-email' }, h('span', 'E-mail'), email),
      mode !== 'reset' ? h('label.field', { for: 'ac-pass' }, h('span', 'Mot de passe (6 caractères min.)'), pass) : null,
      submit, msg,
      mode === 'login' ? h('button.linkish', { type: 'button', onclick: () => { mode = 'reset'; render(); } }, 'Mot de passe oublié ?') : null,
      mode === 'signup' ? h('p.small', 'Ta progression actuelle sera rattachée à ton compte.') : null);
    main.replaceChildren(form);
  };
  render();
}
