// Voix japonaises : synthèse vocale du navigateur (Web Speech API, voix ja-JP de l'appareil).
// Rien à télécharger : chaque système fournit ses voix (Kyoko/Otoya sur Apple, Nanami/Haruka
// sur Windows, Google 日本語 sur Chrome et Android).
import { h, toast } from './util.js?v=20261024003117';
import * as S from './srs.js?v=20261024003117';

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
export const supported = !!synth;
let voice = null, warned = false;

// Classement des voix : les voix « naturelles » (neuronales) sont bien moins robotiques que les
// voix système classiques. Edge : « Microsoft Nanami Online (Natural) » ; Apple : « Kyoko (Premium /
// Enhanced) » ; Chrome : « Google 日本語 ». À qualité égale, on préfère une voix féminine, plus douce.
const SOFT = /Nanami|Kyoko|O-?ren|Haruka|Ayumi|Sayaka|Mizuki|Aoi|Shiori|Mayu|Nanako|Hikari/i;
function score(v) {
  let s = 0;
  if (/Natural|Neural|Online/i.test(v.name)) s += 100;
  if (/Premium/i.test(v.name)) s += 90;
  if (/Enhanced|Siri/i.test(v.name)) s += 70;
  if (/Google/i.test(v.name)) s += 55;
  if (SOFT.test(v.name)) s += 25;
  if (/Ichiro|Otoya|Keita|Hattori|Daichi|Naoki/i.test(v.name)) s -= 15;
  if (/compact|eloquence/i.test(v.name)) s -= 40;
  return s;
}
export const japaneseVoices = () => synth ? synth.getVoices().filter(v => /^ja[-_]?/i.test(v.lang)).sort((a, b) => score(b) - score(a)) : [];

function pickVoice() {
  const ja = japaneseVoices();
  if (!ja.length) return null;
  const wanted = S.getSettings().voiceName;
  return (wanted && ja.find(v => v.name === wanted)) || ja[0];
}
export function refreshVoice() { voice = pickVoice(); return voice; }
if (synth) {
  voice = pickVoice();
  synth.addEventListener?.('voiceschanged', () => { voice = pickVoice(); });
}

/** Lit un texte japonais. Les lectures entre parenthèses et les marqueurs de phrase sont retirés. */
export function speak(text, { rate, onend } = {}) {
  if (!synth || !text) return false;
  voice = voice || pickVoice();
  const clean = text.replace(/（[^）]*）/g, '').replace(/[[\]|]/g, '').replace(/[〜～]/g, '');
  synth.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = 'ja-JP';
  if (voice) u.voice = voice;
  u.rate = rate || S.getSettings().voiceRate || 0.9;
  u.pitch = S.getSettings().voicePitch ?? 1.06;   // un peu plus haut : timbre plus doux
  u.volume = 0.92;
  u.onend = onend || null;
  u.onerror = onend || null;
  synth.speak(u);
  if (!voice && !warned) setTimeout(() => {
    if (!pickVoice() && !warned) { warned = true; toast('Aucune voix japonaise n’est installée sur cet appareil.'); }
  }, 600);
  return true;
}
export const stop = () => synth?.cancel();

const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9.5h3.2L12 5.6v12.8l-4.8-3.9H4z" fill="currentColor"/><path class="wave w1" d="M15.2 9.2a4 4 0 0 1 0 5.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path class="wave w2" d="M17.8 6.8a7.4 7.4 0 0 1 0 10.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';

/** Bouton « écouter ». `text` peut être une fonction (lue au clic). */
export function speakBtn(text, { label = 'Écouter', small = false, slow = true } = {}) {
  if (!supported) return null;
  const read = rate => {
    const t = typeof text === 'function' ? text() : text;
    btn.classList.add('playing');
    speak(t, { rate, onend: () => btn.classList.remove('playing') });
  };
  const btn = h(`button.speak-btn${small ? '.small' : ''}`, {
    type: 'button', 'aria-label': label, title: slow ? `${label} (clic droit : lentement)` : label, html: ICON,
    onclick: e => { e.preventDefault(); e.stopPropagation(); read(); },
    oncontextmenu: slow ? e => { e.preventDefault(); read(0.6); } : null,
  });
  return btn;
}
