// Effets sonores synthétisés en direct (Web Audio) : aucun fichier audio, rien à télécharger.
// Inspirés de l'esprit des menus de Persona : bips de curseur cristallins, « shing » de validation,
// balayages de vent pour les transitions, arpèges brillants pour les bonnes réponses.
import * as S from './srs.js?v=20261019152944';

let ctx = null, master = null, verb = null, noiseBuf = null;
const last = {};

function setup() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = volume();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  // Petite réverbération synthétique (impulsion de bruit qui décroît) : donne l'éclat « verre »
  verb = ctx.createConvolver();
  const len = ctx.sampleRate * 1.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  verb.buffer = ir;
  const wet = ctx.createGain(); wet.gain.value = .22;
  verb.connect(wet).connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return ctx;
}
const volume = () => { const v = S.getSettings().sfxVolume; return (v == null ? .6 : v) * .5; };
export const enabled = () => S.getSettings().sound !== false;
export function setVolume() { if (master) master.gain.value = volume(); }

// Débloque l'audio au premier geste (règle des navigateurs)
const unlock = () => { setup(); if (ctx && ctx.state === 'suspended') ctx.resume(); };
['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { capture: true, passive: true }));

// --- Briques --------------------------------------------------------------------------
function tone(freq, t, dur, { type = 'sine', gain = .3, to = null, attack = .004, wet = true, detune = 0 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(master);
  if (wet) g.connect(verb);
  o.start(t); o.stop(t + dur + .05);
}
function noise(t, dur, { gain = .3, type = 'bandpass', from = 800, to = 4000, q = 1.2, attack = .01, wet = false } = {}) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; src.loop = true;
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  if (wet) g.connect(verb);
  src.start(t); src.stop(t + dur + .05);
}
const N = n => 440 * Math.pow(2, (n - 69) / 12);   // note MIDI → Hz

// --- Sons --------------------------------------------------------------------------------
const SOUNDS = {
  // Curseur : double bip cristallin, très court
  cursor(t) { tone(2093, t, .05, { type: 'triangle', gain: .12 }); tone(3136, t + .018, .06, { gain: .07 }); },
  // Validation : « shing » métallique + petit accord qui monte
  select(t) {
    noise(t, .09, { gain: .16, type: 'highpass', from: 5000, to: 9000, q: .7 });
    tone(N(84), t, .16, { type: 'triangle', gain: .16 }); tone(N(91), t + .03, .22, { gain: .12 }); tone(N(96), t + .06, .3, { gain: .08 });
  },
  // Retour / annulation : deux notes qui descendent
  back(t) { tone(N(79), t, .07, { type: 'triangle', gain: .14 }); tone(N(72), t + .06, .12, { type: 'triangle', gain: .12 }); },
  // Transition : souffle de vent qui traverse + impact grave
  whoosh(t) {
    noise(t, .34, { gain: .32, from: 300, to: 5200, q: 1.6, attack: .12 });
    noise(t + .05, .3, { gain: .12, type: 'highpass', from: 2500, to: 8000, q: .5, attack: .1 });
    tone(110, t + .2, .25, { type: 'sine', gain: .28, to: 46, wet: false });
  },
  // Révélation de la page : coup de lame + éclat brillant
  slash(t) {
    noise(t, .14, { gain: .3, type: 'highpass', from: 7000, to: 2500, q: .8, attack: .002 });
    tone(N(88), t + .02, .45, { type: 'sine', gain: .1 }); tone(N(95), t + .05, .55, { type: 'sine', gain: .07 });
  },
  // Carte qui arrive (révision)
  card(t) { noise(t, .16, { gain: .14, from: 1200, to: 3800, q: 2, attack: .03 }); tone(N(86), t + .05, .08, { type: 'triangle', gain: .07 }); },
  // Bonne réponse : arpège majeur cristallin
  correct(t) {
    [76, 83, 88, 95].forEach((n, i) => tone(N(n), t + i * .055, .42, { type: i % 2 ? 'sine' : 'triangle', gain: .16 - i * .02 }));
    noise(t + .17, .35, { gain: .06, type: 'highpass', from: 7000, to: 10000, q: .5, attack: .02, wet: true });
  },
  // Mauvaise réponse : bourdonnement grave dissonant
  wrong(t) {
    tone(N(50), t, .28, { type: 'sawtooth', gain: .1, to: N(45), wet: false });
    tone(N(51), t, .28, { type: 'square', gain: .05, to: N(46), wet: false, detune: 12 });
    noise(t, .1, { gain: .1, type: 'lowpass', from: 900, to: 200, q: 1 });
  },
  // Prise d'un morceau (glisser-déposer)
  pick(t) { tone(N(81), t, .06, { type: 'triangle', gain: .12, to: N(86) }); },
  // Morceau déposé
  drop(t) { tone(N(74), t, .08, { type: 'triangle', gain: .14 }); noise(t, .05, { gain: .08, type: 'lowpass', from: 1800, to: 500 }); },
  // Fin de partie / record : petite fanfare
  fanfare(t) {
    [[72, 0], [76, .09], [79, .18], [84, .27], [88, .42], [91, .42], [96, .42]].forEach(([n, d], i) =>
      tone(N(n), t + d, d > .4 ? .9 : .2, { type: i > 3 ? 'sine' : 'triangle', gain: d > .4 ? .1 : .14 }));
    noise(t + .42, .6, { gain: .08, type: 'highpass', from: 6000, to: 11000, q: .5, attack: .02, wet: true });
  },
  // Réaction reçue
  ping(t) { tone(N(93), t, .3, { gain: .12 }); tone(N(100), t + .08, .4, { gain: .08 }); },
};

/** Joue un son par son nom ; `gap` évite les rafales du même son */
export function play(name, { gap = 40 } = {}) {
  if (!enabled() || !SOUNDS[name]) return;
  if (!setup() || ctx.state !== 'running') { ctx?.resume?.(); if (!ctx || ctx.state !== 'running') return; }
  const now = performance.now();
  if (last[name] && now - last[name] < gap) return;
  last[name] = now;
  SOUNDS[name](ctx.currentTime + .005);
}

// --- Branchement automatique sur l'interface --------------------------------------------
// Tout ce qui est cliquable déclenche le bip de curseur au survol (souris uniquement)
const HOVER = 'a[href], button:not(:disabled), [role="tab"], label.check, summary, input[type="range"], select';
let lastHover = null;
document.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest?.(HOVER);
  if (el && el !== lastHover) { lastHover = el; play('cursor', { gap: 60 }); }
  if (!el) lastHover = null;
});
document.addEventListener('click', e => {
  const el = e.target.closest?.('button, a[href]');
  if (!el || el.disabled) return;
  // Les liens de navigation déclenchent le balayage (whoosh) ; les réponses, correct/wrong
  if (el.matches('.option, .speak-btn, .tile, .nav-list a') || el.closest('.nav-list')) return;
  if (el.matches('.session-quit, .back, [rel="prev"]') || /retour|annuler|effacer|retirer/i.test(el.textContent)) return play('back');
  if (el.matches('a[href^="#/"]')) return;           // le changement de page a son propre son
  play('select');
}, true);
