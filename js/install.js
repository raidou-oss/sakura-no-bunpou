import { h, jr } from './util.js?v=20261024003835';
import { play } from './sfx.js?v=20261024003835';
import * as S from './srs.js?v=20261024003835';

// Page « Installer l'app » : le même site, en application (moteur Chromium partout où c'est possible)
const DL = 'https://github.com/raidou-oss/sakura-no-bunpou/releases/download/app/';
const ua = navigator.userAgent;
const IOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const DEVICE = IOS ? 'ios' : /Android/.test(ua) ? 'android' : /Windows/.test(ua) ? 'windows' : /Mac/.test(ua) ? 'mac' : /Linux|CrOS/.test(ua) ? 'linux' : null;
export const IN_APP = /SakuraApp|Electron/.test(ua) || matchMedia('(display-mode: standalone)').matches || navigator.standalone;

let deferred = null;   // invitation d'installation du navigateur (Chrome, Edge…)
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; document.querySelector('.ia-pwa')?.removeAttribute('hidden'); });

const PLATFORMS = [
  { id: 'android', jp: '携帯', name: 'Android', file: 'sakura-no-bunpou.apk', size: '≈ 0,4 Mo', engine: 'WebView Chromium',
    steps: ['Télécharge l’APK sur ton téléphone.', 'Ouvre-le : Android demande d’autoriser l’installation depuis ton navigateur ou tes fichiers → Autoriser.', 'Installer, et l’icône 桜 apparaît dans tes applis.'] },
  { id: 'ios', jp: '林檎', name: 'iPhone · iPad', engine: 'Safari (WebKit)',
    steps: ['Ouvre le site dans Safari.', 'Touche le bouton Partager (le carré avec la flèche ↑).', 'Choisis « Sur l’écran d’accueil », puis Ajouter.'],
    note: 'Rien à télécharger : une fois ajoutée à l’écran d’accueil, l’appli s’ouvre en plein écran avec son icône 桜, comme une vraie appli, et se met à jour toute seule.' },
  { id: 'windows', jp: '窓', name: 'Windows', file: 'sakura-no-bunpou-windows-setup.exe', size: '≈ 75 Mo', engine: 'Chromium (Electron)',
    steps: ['Télécharge l’installeur et lance-le.', 'Windows SmartScreen peut prévenir (appli non signée) : « Informations complémentaires » → « Exécuter quand même ».', 'Choisis le dossier, et un raccourci 桜の文法 est créé sur le Bureau.'] },
  { id: 'mac', jp: '机', name: 'Mac', file: 'sakura-no-bunpou-mac.dmg', size: '≈ 200 Mo', engine: 'Chromium (Electron) · Intel + Apple Silicon',
    steps: ['Ouvre le .dmg et glisse l’appli dans Applications.', 'Premier lancement : macOS bloque une appli non signée → Réglages Système › Confidentialité et sécurité › « Ouvrir quand même ».', 'Ensuite, elle s’ouvre normalement.'] },
  { id: 'linux', jp: '企鵝', name: 'Linux', file: 'sakura-no-bunpou-linux.AppImage', size: '≈ 78 Mo', engine: 'Chromium (Electron)',
    steps: ['Télécharge l’AppImage.', 'Rends-la exécutable (clic droit › Propriétés, ou chmod +x).', 'Double-clic pour lancer.'] },
];

function card(p, i) {
  const mine = p.id === DEVICE;
  return h(`article.ia-card${mine ? '.mine' : ''}`, { style: { '--i': i } },
    h('div.ia-top',
      h('span.ia-jp', { lang: 'ja' }, p.jp),
      h('div', h('h2', p.name), h('p.ia-engine', p.engine)),
      mine ? h('span.ia-badge', 'Ton appareil') : null),
    h('ol.ia-steps', p.steps.map(s => h('li', s))),
    p.note ? h('p.ia-note', p.note) : null,
    p.file
      ? h('a.btn.primary.ia-dl', { href: DL + p.file, download: '', onclick: () => play('select') }, `Télécharger ${p.file.split('.').pop().toUpperCase()}`, h('small', p.size))
      : h('a.btn.ia-dl', { href: location.href.split('#')[0], onclick: e => { if (IOS) e.preventDefault(); } }, IOS ? 'Suis les 3 étapes ci-dessus ↑' : 'Ouvre ce site sur ton iPhone'));
}

export function installPage(main) {
  const order = [...PLATFORMS].sort((a, b) => (b.id === DEVICE) - (a.id === DEVICE));
  const pwa = h('div.ia-pwa.card', { hidden: !deferred },
    h('p', h('b', 'Installation express : '), 'ton navigateur sait installer le site directement comme une appli (sans rien télécharger).'),
    h('button.btn.primary', { onclick: async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; pwa.hidden = true; } }, 'Installer depuis le navigateur'));
  main.replaceChildren(...[
    h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('導入') }), 'Applis'),
      h('p.lead', 'Le même site, dans sa propre fenêtre avec son icône 桜. Tout se met à jour tout seul : chaque nouveauté du site arrive dans l’app, sans réinstaller.')),
    IN_APP ? h('p.ia-already.card', '✔ Tu utilises déjà l’application. Rien d’autre à faire !') : null,
    pwa,
    h('div.ia-grid', order.map(card)),
    h('p.section-note', 'Applis de test, gratuites et non signées : c’est pour ça que ton système demande une confirmation la première fois. Ta progression suit ton compte, quel que soit l’appareil.')].filter(Boolean));
}

/** Ouvert depuis une app : on le note dans le compte (synchronisé), pour ne plus proposer l'app nulle part */
export function markAppUse() {
  if (!IN_APP) return;
  const used = S.getExtra('usedApp', {}) || {};
  const k = DEVICE || 'autre';
  if (used[k]) return;
  S.setExtra('usedApp', { ...used, [k]: Date.now() });
}

/** Bandeau « Installe l'app » de l'accueil : jamais dans l'app, ni sur un type d'appareil où ce compte s'est déjà connecté depuis l'app
 *  (l'app Android utilisée → plus de bandeau sur les navigateurs Android, mais toujours sur PC, et inversement) */
export function appPromo() {
  const used = S.getExtra('usedApp', {}) || {};
  if (IN_APP || used[DEVICE || 'autre']) return null;
  return h('a.card.ia-promo.ia-home', { href: '#/app' },
    h('img', { src: 'img/logo-192.png', alt: '', width: 56, height: 56 }),
    h('span', h('b', 'Installe l’app 桜の文法'), h('small', 'Android · iPhone · Windows · Mac · Linux')),
    h('span.ia-arrow', '›'));
}
