// Comptes en ligne avec Supabase : connexion, profils, photos, réactions, synchro de la progression.
// Tout est facultatif : sans configuration (js/config.js vide), le site marche en local.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js?v=20261020235205';
import * as S from './srs.js?v=20261020235205';
import { computeRank, publicScores } from './level.js?v=20261020235205';

export const enabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const REACTIONS = {
  sugoi: { jp: 'すごい！', fr: 'Trop fort', icon: '🌸' },
  ganbatte: { jp: 'がんばって', fr: 'Courage', icon: '💪' },
  omedetou: { jp: 'おめでとう', fr: 'Félicitations', icon: '🎉' },
  issho: { jp: '一緒に勉強しよう', fr: 'On révise ensemble ?', icon: '📚' },
  otsukare: { jp: 'お疲れさま', fr: 'Bien joué', icon: '🍵' },
};

let client = null, session = null, profile = null, recovery = false;
export const isRecovery = () => recovery;
const listeners = new Set();
export const onAuth = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach(fn => fn({ session, profile }));

export const currentUser = () => session?.user || null;
export const currentProfile = () => profile;

async function sb() {
  if (!enabled) throw new Error('Les comptes ne sont pas encore activés sur ce site.');
  if (!client) {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
      // worker : les battements de cœur du temps réel continuent même quand l'onglet est en arrière-plan
      // (sinon le navigateur les ralentit et l'élève « disparaît » de la liste des connectés)
      realtime: { worker: true, heartbeatIntervalMs: 20000, params: { eventsPerSecond: 20 } },
    });
  }
  return client;
}

const fail = (error, fallback) => {
  if (!error) return;
  const m = error.message || '';
  if (/Invalid login credentials/i.test(m)) throw new Error('Identifiant ou mot de passe incorrect.');
  if (/rate limit|too many|security purposes/i.test(m)) throw new Error('Le site a atteint sa limite d’e-mails pour l’instant (le service gratuit n’en envoie que quelques-uns par heure). Réessaie un peu plus tard, ou demande à l’administrateur du site de désactiver la confirmation par e-mail.');
  if (/Email not confirmed/i.test(m)) throw new Error('Confirme d’abord ton adresse : un e-mail t’a été envoyé.');
  if (/already registered|already exists/i.test(m)) throw new Error('Un compte existe déjà avec cet e-mail.');
  if (/duplicate key.*username|profiles_username/i.test(m)) throw new Error('Ce pseudo est déjà pris.');
  if (/duplicate key.*reactions/i.test(m)) throw new Error('Tu as déjà envoyé cette réaction aujourd’hui.');
  if (/Password should be/i.test(m)) throw new Error('Le mot de passe doit faire au moins 6 caractères.');
  throw new Error(fallback || m);
};

// --- Session -----------------------------------------------------------------------
export async function init() {
  if (!enabled) return;
  const c = await sb();
  const { data } = await c.auth.getSession();
  session = data.session;
  if (session) { await loadOwnProfile(); await pullProgress(); startLive().catch(() => {}); }
  emit();
  c.auth.onAuthStateChange(async (event, s) => {
    if (event === 'PASSWORD_RECOVERY') recovery = true;
    const was = session?.user?.id;
    session = s;
    if (s && s.user.id !== was) { await loadOwnProfile(); await pullProgress(); startLive().catch(() => {}); }
    if (!s) { profile = null; stopLive().catch(() => {}); }
    emit();
  });
  S.onChange(schedulePush);
}

export async function signUp(email, password, username) {
  const c = await sb();
  const { data, error } = await c.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: location.origin + location.pathname } });
  fail(error);
  return { needsConfirm: !data.session };
}
export async function signIn(email, password) {
  const c = await sb();
  const { error } = await c.auth.signInWithPassword({ email, password });
  fail(error);
}
export async function updatePassword(password) {
  const c = await sb();
  const { error } = await c.auth.updateUser({ password });
  fail(error);
  recovery = false;
}
/** Connexion par identifiant (pseudo, japonais compris) ou par e-mail */
export async function signInWithLogin(login, password) {
  if (login.includes('@')) return signIn(login, password);
  const c = await sb();
  const { data, error } = await c.rpc('login_email', { p_login: login, p_password: password });
  if (error) fail(error, /login_email/.test(error.message) ? 'La connexion par identifiant n’est pas encore activée sur ce site.' : undefined);
  if (!data) throw new Error('Identifiant ou mot de passe incorrect.');
  return signIn(data, password);
}
export async function usernameAvailable(name) {
  const c = await sb();
  const { data, error } = await c.rpc('username_available', { p_username: name });
  if (error) return true; // fonction absente : le serveur tranchera
  return data;
}
export async function resendConfirmation(email) {
  const c = await sb();
  const { error } = await c.auth.resend({ type: 'signup', email, options: { emailRedirectTo: location.origin + location.pathname } });
  fail(error);
}
export async function signOut() { const c = await sb(); await c.auth.signOut(); }
export async function resetPassword(email) {
  const c = await sb();
  const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  fail(error);
}

// --- Profils -------------------------------------------------------------------------
async function loadOwnProfile() {
  profile = await getProfile(session.user.id);
}
export async function getProfile(id) {
  const c = await sb();
  const { data, error } = await c.from('profiles').select('*').eq('id', id).maybeSingle();
  fail(error, 'Impossible de charger ce profil.');
  return data;
}
export async function updateProfile(patch) {
  const c = await sb();
  const { data, error } = await c.from('profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', session.user.id).select().single();
  fail(error, 'Impossible d’enregistrer le profil.');
  profile = data; emit(); trackPresence();
  return data;
}
export async function listProfiles(search = '') {
  const c = await sb();
  const run = cols => {
    let q = c.from('profiles').select(cols).order('rank', { ascending: false }).order('gauge', { ascending: false }).order('xp', { ascending: false }).limit(60);
    if (search) q = q.ilike('username', `%${search.replace(/[%_]/g, '')}%`);
    return q;
  };
  // « scores » sert à savoir si la série d'un élève est encore en cours (colonne absente si la migration 04 manque)
  let { data, error } = await run('id, username, avatar_url, rank, gauge, xp, streak, learned, scores');
  if (error && /scores|column/i.test(error.message)) ({ data, error } = await run('id, username, avatar_url, rank, gauge, xp, streak, learned'));
  fail(error, 'Impossible de charger la communauté.');
  return data || [];
}

/** Envoie une image redimensionnée (avatar carré ou bannière 3:1) et renvoie son URL publique */
export async function uploadImage(file, kind) {
  const c = await sb();
  const blob = await resizeImage(file, kind === 'avatar' ? [400, 400] : [1500, 500]);
  const path = `${session.user.id}/${kind}.jpg`;
  const { error } = await c.storage.from('profiles').upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
  fail(error, 'Envoi de l’image impossible.');
  const { data } = c.storage.from('profiles').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

function resizeImage(file, [w, h]) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type)) return reject(new Error('Choisis une image (JPEG, PNG, WebP…).'));
    if (file.size > 12 * 1024 * 1024) return reject(new Error('Image trop lourde (12 Mo maximum).'));
    const img = new Image();
    img.onload = () => {
      // Recadrage centré au bon format, puis réduction
      const ratio = w / h, src = img.width / img.height;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (src > ratio) { sw = img.height * ratio; sx = (img.width - sw) / 2; } else { sh = img.width / ratio; sy = (img.height - sh) / 2; }
      const scale = Math.min(1, w / sw);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(sw * scale); canvas.height = Math.round(sh * scale);
      canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Conversion de l’image impossible.')), 'image/jpeg', 0.86);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Cette image ne peut pas être lue.'));
    img.src = URL.createObjectURL(file);
  });
}

// --- Réactions -----------------------------------------------------------------------
export async function sendReaction(toUser, kind) {
  const c = await sb();
  const { error } = await c.from('reactions').insert({ from_user: session.user.id, to_user: toUser, kind });
  fail(error, 'Réaction non envoyée.');
  emitInteraction({ other: toUser, type: 'reaction', out: true });
}
/** Toutes les réactions échangées avec moi (envoyées et reçues), pour les liens de confident */
export async function myReactionPairs() {
  if (!session) return [];
  const c = await sb();
  const me = session.user.id;
  const [a, b] = await Promise.all([
    c.from('reactions').select('from_user, to_user, kind, created_at').eq('from_user', me).limit(2000),
    c.from('reactions').select('from_user, to_user, kind, created_at').eq('to_user', me).limit(2000)]);
  return [...(a.data || []), ...(b.data || [])];
}
// Interactions (réactions, pokes) : écoutées par les liens de confident
const interactionListeners = new Set();
export const onInteraction = fn => { interactionListeners.add(fn); return () => interactionListeners.delete(fn); };
function emitInteraction(e) { interactionListeners.forEach(fn => { try { fn(e); } catch {} }); }
export async function reactionsFor(userId, limit = 30) {
  const c = await sb();
  const { data, error } = await c.from('reactions')
    .select('id, kind, created_at, seen, from_user, sender:profiles!reactions_from_user_fkey(id, username, avatar_url)')
    .eq('to_user', userId).order('created_at', { ascending: false }).limit(limit);
  fail(error, 'Impossible de charger les réactions.');
  return data || [];
}
export async function reactionCounts(userId) {
  const c = await sb();
  const { data, error } = await c.from('reactions').select('kind').eq('to_user', userId).limit(1000);
  fail(error);
  const out = {};
  (data || []).forEach(r => { out[r.kind] = (out[r.kind] || 0) + 1; });
  return out;
}
export async function unseenCount() {
  if (!enabled || !session) return 0;
  const c = await sb();
  const { count } = await c.from('reactions').select('id', { count: 'exact', head: true }).eq('to_user', session.user.id).eq('seen', false);
  return count || 0;
}
export async function markSeen() {
  const c = await sb();
  await c.from('reactions').update({ seen: true }).eq('to_user', session.user.id).eq('seen', false);
}

// --- Synchro de la progression ------------------------------------------------------------
// La progression stockée dans ce navigateur appartient à un compte : si quelqu'un d'autre se
// connecte, on charge SA progression (ou on repart de zéro) au lieu de lui donner celle du précédent.
const K_OWNER = 'sakura.owner.v1';
// État de la synchro, affiché dans les réglages : idle | syncing | ok | error | offline
let syncState = { status: 'idle', at: 0, error: '' };
const syncListeners = new Set();
export const getSyncState = () => syncState;
export const onSync = fn => { syncListeners.add(fn); return () => syncListeners.delete(fn); };
const setSync = patch => { syncState = { ...syncState, ...patch }; syncListeners.forEach(fn => { try { fn(syncState); } catch {} }); };

let syncing = null, again = false;
/**
 * Synchro complète : on lit la progression du compte, on la FUSIONNE avec celle de cet appareil
 * (chaque révision, record, leçon… garde le meilleur des deux), puis on renvoie le résultat.
 * Plusieurs appareils peuvent donc travailler en parallèle sans s'écraser.
 */
export function syncNow() {
  if (!session) return Promise.resolve();
  if (syncing) { again = true; return syncing; }
  syncing = (async () => {
    do {
      again = false;
      await doSync();
    } while (again);
  })().finally(() => { syncing = null; });
  return syncing;
}
async function doSync() {
  if (!session) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { setSync({ status: 'offline' }); return; }
  setSync({ status: 'syncing' });
  try {
    const c = await sb();
    const me = session.user.id;
    const { data, error } = await c.from('progress').select('data, updated_at').eq('user_id', me).maybeSingle();
    if (error) throw error;
    const owner = localStorage.getItem(K_OWNER);
    let remoteChanged = true, localChanged = false;
    if (owner && owner !== me) {
      // Un autre compte s'était servi de ce navigateur : on charge la progression de CE compte, sans mélanger
      S.replaceAll(data ? data.data : { cards: {}, settings: S.getSettings(), stats: { days: {} }, extra: {}, updated: 1 });
      localChanged = true; remoteChanged = !data;
    } else if (data) {
      ({ localChanged, remoteChanged } = S.mergeIn(data.data));
    }
    localStorage.setItem(K_OWNER, me);
    // Ancien niveau affiché sur le profil : il sert de plancher pour ne pas perdre de Lv après la mise à jour
    if (profile?.xp) {
      const peak = S.getExtra('peak', {}) || {};
      if (profile.xp > (peak.xp || 0)) { S.setExtra('peak', { ...peak, xp: profile.xp, rank: Math.max(peak.rank || 0, profile.rank || 0) }, { quiet: true }); remoteChanged = true; }
    }
    if (remoteChanged) await upload(c);
    else await pushProfile(c);
    setSync({ status: 'ok', at: Date.now(), error: '' });
    if (localChanged) window.dispatchEvent(new CustomEvent('sakura:synced'));
  } catch (e) {
    setSync({ status: 'error', error: e?.message || String(e) });
    throw e;
  }
}
async function upload(c) {
  const snap = S.snapshot();
  const { error } = await c.from('progress').upsert({ user_id: session.user.id, data: snap, updated_at: new Date().toISOString() });
  if (error) throw error;
  // Prévient mes autres appareils / onglets ouverts : ils récupèrent la progression tout de suite
  if (syncChannel) syncChannel.send({ type: 'broadcast', event: 'updated', payload: { from: TAB_ID, at: Date.now() } }).catch(() => {});
  await pushProfile(c);
}
async function pushProfile(c) {
  const r = await computeRank();
  const patch = { rank: r.rank, gauge: r.gauge, xp: r.xp, streak: r.streak, learned: r.learned, updated_at: new Date().toISOString() };
  // Les colonnes récentes (jauges, scores) peuvent manquer si une migration n'a pas été lancée : on retombe sur moins
  const tries = [{ ...patch, grammar_pct: r.grammar, vocab_pct: r.vocab, scores: publicScores() }, { ...patch, grammar_pct: r.grammar, vocab_pct: r.vocab }, patch];
  let res;
  for (const t of tries) {
    res = await c.from('profiles').update(t).eq('id', session.user.id).select().single();
    if (!res.error || !/column|schema|scores|grammar_pct|vocab_pct/i.test(res.error.message)) break;
  }
  if (res.data) { profile = res.data; trackPresence(); }
}
const pullProgress = () => syncNow().catch(() => {});
let pushTimer;
function schedulePush() {
  if (!session) return;
  setSync({ status: 'pending' });
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => syncNow().catch(() => {}), 1500);
}
export const pushProgress = () => syncNow();
// Synchro aussi quand on revient sur l'onglet, quand le réseau revient, régulièrement, et avant de quitter
if (typeof window !== 'undefined') {
  let lastFocus = 0;
  const onBack = () => { if (!session || Date.now() - lastFocus < 5000) return; lastFocus = Date.now(); syncNow().catch(() => {}); };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onBack();
    else if (session && (syncState.status === 'pending' || syncState.status === 'error')) { clearTimeout(pushTimer); syncNow().catch(() => {}); }
  });
  window.addEventListener('focus', onBack);
  window.addEventListener('online', () => { if (session) syncNow().catch(() => {}); });
  window.addEventListener('pagehide', () => { if (session && syncState.status === 'pending') { clearTimeout(pushTimer); syncNow().catch(() => {}); } });
  setInterval(() => { if (session && document.visibilityState === 'visible') syncNow().catch(() => {}); }, 30000);
  // Niveau gagné : on prévient tout de suite les autres (liste « En ligne », communauté)
  window.addEventListener('sakura:level', () => { trackPresence(); syncNow().catch(() => {}); });
  // Toute variation d'XP : la pastille Lv de la liste « En ligne » suit tout de suite (chez moi et chez les autres)
  let xpT; window.addEventListener('sakura:xp', () => { clearTimeout(xpT); xpT = setTimeout(trackPresence, 400); });
}

// --- Présence : qui est connecté en ce moment -------------------------------------------
let presence = null, reactChannel = null, online = [];
const onlineListeners = new Set(), reactionListeners = new Set();
export const onOnline = fn => { onlineListeners.add(fn); fn(online); return () => onlineListeners.delete(fn); };
export const onReaction = fn => { reactionListeners.add(fn); return () => reactionListeners.delete(fn); };
const pokeListeners = new Set();
let pokeChannel = null, syncChannel = null;
const TAB_ID = Math.random().toString(36).slice(2);
export const onPoke = fn => { pokeListeners.add(fn); return () => pokeListeners.delete(fn); };
const lastPoke = new Map();
export const POKE_COOLDOWN = 45000;
export const pokeWait = to => Math.max(0, POKE_COOLDOWN - (Date.now() - (lastPoke.get(to) || 0)));

/** Poke : demande de conseil (ou réponse) envoyée en direct à un élève connecté */
export async function sendPoke(to, { msg = '', kind = 'ask', about = null } = {}) {
  if (!session) throw new Error('Connecte-toi pour envoyer un poke.');
  if (kind === 'ask' && pokeWait(to) > 0) throw new Error(`Patiente encore ${Math.ceil(pokeWait(to) / 1000)} s avant de le relancer.`);
  const c = await sb();
  const ch = c.channel(`sakura-poke-${to}`, { config: { broadcast: { ack: true } } });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Envoi impossible pour le moment.')), 6000);
    ch.subscribe(status => { if (status === 'SUBSCRIBED') { clearTimeout(t); resolve(); } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(t); reject(new Error('Envoi impossible pour le moment.')); } });
  });
  const me = profile || {};
  const res = await ch.send({ type: 'broadcast', event: 'poke', payload: {
    to, from: session.user.id, name: me.username || 'Quelqu’un', avatar_url: me.avatar_url || null, rank: me.rank || 0,
    msg: String(msg).slice(0, 160), kind, about, at: Date.now() } });
  c.removeChannel(ch).catch(() => {});
  if (res !== 'ok') throw new Error('Envoi impossible pour le moment.');
  if (kind === 'ask') lastPoke.set(to, Date.now());
  emitInteraction({ other: to, type: 'poke', out: true });
}
export const onlineUsers = () => online;

function presencePayload() {
  return { id: session.user.id, username: profile?.username || '…', avatar_url: profile?.avatar_url || null,
    rank: Math.max(profile?.rank ?? 0, (S.getExtra('peak', {}) || {}).rank ?? 0), gauge: profile?.gauge ?? 0,
    xp: Math.max(profile?.xp ?? 0, (S.getExtra('peak', {}) || {}).xp ?? 0), streak: S.streak(), streakDay: S.streakDay(), since: Date.now() };
}
function trackPresence() { if (presence && session && liveOk()) presence.track(presencePayload()).catch(() => {}); }

async function startLive() {
  const c = await sb();
  await stopLive();
  const me = session.user.id;
  presence = c.channel('sakura-online', { config: { presence: { key: me } } });
  presence.on('presence', { event: 'sync' }, () => {
    const state = presence.presenceState();
    // Plusieurs onglets / appareils pour un même élève : on garde l'entrée la plus avancée (et la plus récente à égalité)
    online = Object.values(state).map(metas => metas.reduce((a, m) => (!a || (m.xp || 0) > (a.xp || 0) || ((m.xp || 0) === (a.xp || 0) && (m.since || 0) > (a.since || 0)) ? m : a), null)).filter(Boolean)
      .sort((a, b) => (a.rank - b.rank) || (a.gauge - b.gauge) || String(a.username).localeCompare(String(b.username)));   // du N5 au N1
    onlineListeners.forEach(fn => fn(online));
  });
  presence.subscribe(status => {
    liveStatus = status;
    if (status === 'SUBSCRIBED') trackPresence();
    // Coupure (réseau, veille…) : on relance proprement au bout de quelques secondes
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') scheduleRestart(status === 'CLOSED' ? 4000 : 2000);
  });
  // Pokes (demandes de conseil) : messages éphémères en direct, sans base de données
  pokeChannel = c.channel(`sakura-poke-${me}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'poke' }, ({ payload }) => {
      if (!payload || payload.to !== me || !payload.from) return;
      pokeListeners.forEach(fn => fn(payload));
      emitInteraction({ other: payload.from, type: 'poke', out: false, name: payload.name, avatar_url: payload.avatar_url });
    })
    .subscribe();
  // Synchro en temps réel entre MES appareils : quand l'un enregistre, les autres récupèrent aussitôt
  syncChannel = c.channel(`sakura-sync-${me}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'updated' }, ({ payload }) => { if (payload?.from !== TAB_ID) syncNow().catch(() => {}); })
    .subscribe();
  // Réactions reçues en direct
  reactChannel = c.channel(`sakura-react-${me}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions', filter: `to_user=eq.${me}` }, async payload => {
      const r = payload.new;
      const sender = online.find(u => u.id === r.from_user) || await getProfile(r.from_user).catch(() => null);
      reactionListeners.forEach(fn => fn({ ...r, sender }));
      emitInteraction({ other: r.from_user, type: 'reaction', out: false, name: sender?.username, avatar_url: sender?.avatar_url });
    })
    .subscribe();
}
let liveStatus = 'idle', restartT = null, restarting = false;
function scheduleRestart(ms) {
  if (!session || restartT || restarting) return;
  restartT = setTimeout(async () => { restartT = null; await restartLive(); }, ms);
}
async function restartLive() {
  if (!session || restarting) return;
  restarting = true;
  try { await startLive(); } catch {} finally { restarting = false; }
}
const liveOk = () => presence && (presence.state === 'joined' || liveStatus === 'SUBSCRIBED');
// Surveillance : si on n'est plus dans le salon des connectés, on y revient ; sinon on rafraîchit sa fiche
if (typeof window !== 'undefined') {
  const check = () => { if (!session) return; if (!liveOk()) restartLive(); else trackPresence(); };
  setInterval(() => { if (session && !liveOk()) restartLive(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  window.addEventListener('online', () => setTimeout(check, 800));
  window.addEventListener('focus', () => { if (session && !liveOk()) restartLive(); });
  // Série / progression qui bougent : les autres le voient en direct
  let trT; S.onChange(() => { clearTimeout(trT); trT = setTimeout(trackPresence, 1500); });
}
async function stopLive() {
  const c = client;
  liveStatus = 'idle';
  if (!c) return;
  if (presence) { await c.removeChannel(presence).catch(() => {}); presence = null; }
  if (reactChannel) { await c.removeChannel(reactChannel).catch(() => {}); reactChannel = null; }
  if (pokeChannel) { await c.removeChannel(pokeChannel).catch(() => {}); pokeChannel = null; }
  if (syncChannel) { await c.removeChannel(syncChannel).catch(() => {}); syncChannel = null; }
  online = []; onlineListeners.forEach(fn => fn(online));
}
// Envoi immédiat quand on quitte la page
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && session) { clearTimeout(pushTimer); pushProgress().catch(() => {}); } });
