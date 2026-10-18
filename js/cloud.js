// Comptes en ligne avec Supabase : connexion, profils, photos, réactions, synchro de la progression.
// Tout est facultatif : sans configuration (js/config.js vide), le site marche en local.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import * as S from './srs.js';
import { computeRank } from './level.js';

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
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return client;
}

const fail = (error, fallback) => {
  if (!error) return;
  const m = error.message || '';
  if (/Invalid login credentials/i.test(m)) throw new Error('E-mail ou mot de passe incorrect.');
  if (/Email not confirmed/i.test(m)) throw new Error('Confirme d’abord ton adresse : un e-mail t’a été envoyé.');
  if (/already registered|already exists/i.test(m)) throw new Error('Un compte existe déjà avec cet e-mail.');
  if (/duplicate key.*username/i.test(m)) throw new Error('Ce pseudo est déjà pris.');
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
  if (session) { await loadOwnProfile(); await pullProgress(); }
  emit();
  c.auth.onAuthStateChange(async (event, s) => {
    if (event === 'PASSWORD_RECOVERY') recovery = true;
    const was = session?.user?.id;
    session = s;
    if (s && s.user.id !== was) { await loadOwnProfile(); await pullProgress(); }
    if (!s) profile = null;
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
  profile = data; emit();
  return data;
}
export async function listProfiles(search = '') {
  const c = await sb();
  let q = c.from('profiles').select('id, username, avatar_url, rank, gauge, xp, streak, learned').order('rank', { ascending: false }).order('gauge', { ascending: false }).order('xp', { ascending: false }).limit(60);
  if (search) q = q.ilike('username', `%${search.replace(/[%_]/g, '')}%`);
  const { data, error } = await q;
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
}
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
async function pullProgress() {
  const c = await sb();
  const { data } = await c.from('progress').select('data, updated_at').eq('user_id', session.user.id).maybeSingle();
  const local = S.snapshot();
  const remoteTime = data ? data.data.updated || Date.parse(data.updated_at) : 0;
  if (data && remoteTime > (local.updated || 0)) S.replaceAll(data.data);
  else await pushProgress();
}
let pushTimer;
function schedulePush() {
  if (!session) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushProgress().catch(() => {}), 4000);
}
export async function pushProgress() {
  if (!session) return;
  const c = await sb();
  const snap = S.snapshot();
  await c.from('progress').upsert({ user_id: session.user.id, data: snap, updated_at: new Date().toISOString() });
  const r = await computeRank();
  const patch = { rank: r.rank, gauge: r.gauge, xp: r.xp, streak: r.streak, learned: r.learned, updated_at: new Date().toISOString() };
  const { data } = await c.from('profiles').update(patch).eq('id', session.user.id).select().single();
  if (data) profile = data;
}
// Envoi immédiat quand on quitte la page
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && session) { clearTimeout(pushTimer); pushProgress().catch(() => {}); } });
