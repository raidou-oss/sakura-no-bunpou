// Plein écran pour les exercices (leçons, révisions, jeux…) — téléphones et tablettes uniquement.
// On ne verrouille jamais l'orientation : tel tenu en portrait → plein écran en portrait, en paysage → paysage.
import { h } from './util.js?v=20261024005335';
import { play } from './sfx.js?v=20261024005335';

const ua = navigator.userAgent;
const bridge = () => typeof window.SakuraApp?.fullscreen === 'function';     // app Android : barres système masquées en natif
const standalone = () => matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone;
const touch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 1 && !/Windows|Macintosh|Linux x86/.test(ua) && !/Electron/.test(ua));
const root = document.documentElement;
const webApi = !!(root.requestFullscreen || root.webkitRequestFullscreen) && (document.fullscreenEnabled || document.webkitFullscreenEnabled);
const SUPPORTED = !/Electron/.test(ua) && touch && (bridge() || (webApi && !standalone() && !/SakuraApp/.test(ua)));   // ancienne APK sans pont : pas de bouton

// Pages d'exercice où le bouton apparaît
const EXERCISE = /^#\/(lecon\/|revision|entrainement\/|jeux\/\w|kana-quiz|nombres\?s=)/;

let appFs = false;
const isFs = () => bridge() ? appFs : !!(document.fullscreenElement || document.webkitFullscreenElement);

const ICON_IN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
const ICON_OUT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
let btn = null;

function sync() {
  if (!btn) return;
  const on = isFs();
  document.body.classList.toggle('is-fs', on);
  btn.innerHTML = on ? ICON_OUT : ICON_IN;
  btn.setAttribute('aria-label', on ? 'Quitter le plein écran' : 'Plein écran');
  btn.title = btn.getAttribute('aria-label');
  // Visible sur les pages d'exercice, et partout tant qu'on est en plein écran (pour pouvoir en sortir)
  btn.hidden = !(on || EXERCISE.test(location.hash));
}

async function toggle() {
  play('select');
  if (bridge()) { appFs = !appFs; window.SakuraApp.fullscreen(appFs); sync(); return; }
  try {
    if (isFs()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' });
    else root.webkitRequestFullscreen();
  } catch { /* refusé par le navigateur : rien à faire */ }
}

export function initFullscreen() {
  if (!SUPPORTED) return;
  btn = h('button.fs-btn', { type: 'button', onclick: toggle });
  document.body.append(btn);
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  addEventListener('hashchange', sync);
  // L'app Android prévient quand le bouton retour fait sortir du plein écran
  addEventListener('sakura:appfs', e => { appFs = !!e.detail; sync(); });
  sync();
}
