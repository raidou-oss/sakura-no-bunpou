// 勉強 Minuteur d'études : objectif d'heures par semaine (1 à 50 h), compte à rebours en overlay.
// On clique dessus quand on étudie ; il s'arrête tout seul dès qu'on quitte l'onglet (alt-tab, autre appli…).
// Le temps est rangé par jour (extra.study) et synchronisé avec le compte : chaque jour garde le plus grand total.
import { h, toast, dayKey } from './util.js?v=20261103115437';
import * as S from './srs.js?v=20261103115437';

const DAY = 864e5;
const K_MIN = 'sakura.study.min';
export const GOAL_MIN = 1, GOAL_MAX = 50;
export const goalHours = () => { const n = Math.round(Number(S.getSettings().studyGoal)); return n >= GOAL_MIN && n <= GOAL_MAX ? n : 5; };
export const enabled = () => S.getSettings().studyTimer !== false;

let runningSince = 0;      // horodatage du début du segment en cours (0 = en pause)
let el = null, tickT = null, saveT = null;

/** Lundi 0 h (heure locale) de la semaine de t */
function weekStart(t = Date.now()) { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }
/** Secondes étudiées cette semaine (enregistrées + segment en cours) */
export function weekSeconds(now = Date.now()) {
  const st = S.getExtra('study', {}) || {};
  let s = 0;
  for (let t = weekStart(now) + DAY / 2; t <= now + DAY / 2; t += DAY) s += st[dayKey(t)] || 0;   // midi : pas de souci d'heure d'été
  return s + (runningSince ? Math.max(0, (now - runningSince) / 1000) : 0);
}
/** Range le segment en cours dans le total du jour (et le découpe à minuit) */
function commit(now = Date.now(), { quiet = true } = {}) {
  if (!runningSince) return;
  const st = { ...(S.getExtra('study', {}) || {}) };
  let a = runningSince;
  while (a < now) {
    const mid = new Date(a); mid.setHours(24, 0, 0, 0);
    const b = Math.min(now, mid.getTime()), k = dayKey(a);
    st[k] = Math.round(((st[k] || 0) + (b - a) / 1000) * 10) / 10;
    a = b;
  }
  runningSince = now;
  S.setExtra('study', st, { quiet });
}

const pad = n => String(Math.floor(n)).padStart(2, '0');
const clock = sec => { sec = Math.max(0, Math.floor(sec)); return `${pad(sec / 3600)}:${pad(sec % 3600 / 60)}:${pad(sec % 60)}`; };
const short = sec => { const m = Math.round(sec / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${pad(m % 60)}`; };

function start() {
  if (runningSince) return;
  runningSince = Date.now();
  clearInterval(saveT); saveT = setInterval(() => commit(), 15000);
  render(); tick();
}
function pause(reason) {
  if (!runningSince) return;
  commit(Date.now(), { quiet: false });
  runningSince = 0; clearInterval(saveT);
  render();
  if (reason) toast(reason);
}
const toggle = () => (runningSince ? pause() : start());

function tick() {
  clearTimeout(tickT);
  if (!el) return;
  const goal = goalHours() * 3600, done = weekSeconds(), left = goal - done;
  const p = Math.min(1, done / goal);
  el.style.setProperty('--p', (p * 100).toFixed(2));
  el.querySelector('.st-time').textContent = left > 0 ? clock(left) : `+${clock(-left)}`;
  el.querySelector('.st-sub').textContent = left > 0 ? `${short(done)} / ${goalHours()} h cette semaine` : `Objectif de ${goalHours()} h atteint ✓`;
  el.classList.toggle('done', left <= 0);
  if (runningSince && left <= 0 && left > -1.2 && !el.dataset.cheered) { el.dataset.cheered = '1'; toast(`お疲れさま！ ${goalHours()} h d’étude cette semaine 🌸`); }
  if (runningSince) tickT = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
}

function render() {
  if (!el) return;
  el.classList.toggle('on', !!runningSince);
  el.querySelector('.st-main').setAttribute('aria-label', runningSince ? 'Mettre le minuteur d’études en pause' : 'Lancer le minuteur d’études');
  el.querySelector('.st-state').textContent = runningSince ? '勉強中 · en cours' : '一時停止 · en pause';
  tick();
}

function build() {
  const collapsed = (() => { try { return localStorage.getItem(K_MIN) === '1'; } catch { return false; } })();
  el = h('div.study-timer', { class: collapsed ? 'study-timer mini' : 'study-timer', role: 'group', 'aria-label': 'Minuteur d’études' },
    h('button.st-main', { type: 'button', onclick: toggle },
      h('span.st-ring', { 'aria-hidden': 'true' },
        h('b.st-kanji', { lang: 'ja' }, '勉'),
        h('span.st-ico', { html: '<svg viewBox="0 0 24 24" class="i-play"><path d="M8 5.5v13l10.5-6.5z"/></svg><svg viewBox="0 0 24 24" class="i-pause"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>' })),
      h('span.st-text',
        h('small.st-state'),
        h('strong.st-time', '00:00:00'),
        h('small.st-sub'))),
    h('button.st-fold', { type: 'button', 'aria-label': 'Réduire ou agrandir le minuteur', title: 'Réduire / agrandir',
      onclick: () => { el.classList.toggle('mini'); try { localStorage.setItem(K_MIN, el.classList.contains('mini') ? '1' : '0'); } catch {} } },
      h('span', { 'aria-hidden': 'true' }, '›')));
  document.body.append(el);
  render();
}

/** Affiche / retire l'overlay selon les réglages (appelé au démarrage et quand on change le réglage) */
export function refreshStudy() {
  if (!enabled()) { pause(); el?.remove(); el = null; return; }
  if (!el) build(); else render();
}

export function initStudy() {
  refreshStudy();
  // Quitter l'onglet ou la fenêtre (alt-tab, autre appli, écran verrouillé) arrête le minuteur
  const away = () => pause('Minuteur d’études en pause : tu as quitté le site');
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') away(); });
  window.addEventListener('blur', away);
  window.addEventListener('pagehide', () => pause());
  // Synchro d'un autre appareil / nouvelle semaine : on remet l'affichage à jour
  window.addEventListener('sakura:synced', () => tick());
  setInterval(() => { if (!runningSince) tick(); }, 60000);
}
