// Effets sonores synthétisés en direct (Web Audio) : aucun fichier audio, rien à télécharger.
// Inspirés de l'esprit des menus de Persona : bips de curseur cristallins, « shing » de validation,
// balayages de vent pour les transitions, arpèges brillants pour les bonnes réponses.
import * as S from './srs.js?v=20261021001343';

let ctx = null, master = null, verb = null, room = null, echo = null, noiseBuf = null;
const last = {};

function impulse(sec, decay, dark) {
  const len = Math.floor(ctx.sampleRate * sec), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c); let lp = 0;
    for (let i = 0; i < len; i++) { const n = Math.random() * 2 - 1; lp += (n - lp) * dark; d[i] = lp * Math.pow(1 - i / len, decay); }
  }
  return ir;
}
function setup() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = volume();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = .002; comp.release.value = .12;
  master.connect(comp).connect(ctx.destination);
  // Grande réverbération « plaque » (éclat des menus) + petite pièce (clics) + écho ping-pong (scintillement)
  verb = ctx.createConvolver(); verb.buffer = impulse(2.4, 2.6, .55);
  const wet = ctx.createGain(); wet.gain.value = .28; verb.connect(wet).connect(master);
  room = ctx.createConvolver(); room.buffer = impulse(.35, 3, .8);
  const rw = ctx.createGain(); rw.gain.value = .35; room.connect(rw).connect(master);
  echo = ctx.createGain();
  const dl = ctx.createDelay(1), dr = ctx.createDelay(1), fb = ctx.createGain(), pl = ctx.createStereoPanner(), pr = ctx.createStereoPanner(), ef = ctx.createBiquadFilter();
  dl.delayTime.value = .19; dr.delayTime.value = .29; fb.gain.value = .32; pl.pan.value = -.7; pr.pan.value = .7; ef.type = 'highpass'; ef.frequency.value = 900;
  echo.connect(ef).connect(dl); dl.connect(pl).connect(master); dl.connect(dr); dr.connect(pr).connect(master); dr.connect(fb).connect(dl);
  pl.connect(verb);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
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
function out(g, { wet = 0, rm = 0, ech = 0, pan = 0 } = {}) {
  let node = g;
  if (pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
  node.connect(master);
  if (wet) { const w = ctx.createGain(); w.gain.value = wet; node.connect(w).connect(verb); }
  if (rm) { const w = ctx.createGain(); w.gain.value = rm; node.connect(w).connect(room); }
  if (ech) { const w = ctx.createGain(); w.gain.value = ech; node.connect(w).connect(echo); }
}
function env(g, t, gain, attack, dur) {
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
}
function tone(freq, t, dur, { type = 'sine', gain = .3, to = null, attack = .004, detune = 0, ...fx } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur * .9);
  env(g, t, gain, attack, dur);
  o.connect(g); out(g, fx);
  o.start(t); o.stop(t + dur + .05);
}
/** Cloche FM : timbre métallique et cristallin (modulateur au ratio non entier = sonorité de verre) */
function bell(freq, t, dur, { gain = .15, ratio = 3.5, index = 2.4, ...fx } = {}) {
  const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
  car.frequency.value = freq; mod.frequency.value = freq * ratio;
  mg.gain.setValueAtTime(freq * index, t); mg.gain.exponentialRampToValueAtTime(freq * .05, t + dur * .7);
  mod.connect(mg).connect(car.frequency);
  env(g, t, gain, .002, dur);
  car.connect(g); out(g, fx);
  car.start(t); mod.start(t); car.stop(t + dur + .05); mod.stop(t + dur + .05);
}
function noise(t, dur, { gain = .3, type = 'bandpass', from = 800, to = 4000, q = 1.2, attack = .01, panFrom = null, panTo = null, ...fx } = {}) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; src.loop = true; src.playbackRate.value = .8 + Math.random() * .4;
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
  env(g, t, gain, attack, dur);
  src.connect(f).connect(g);
  if (panFrom != null) {
    const p = ctx.createStereoPanner(); p.pan.setValueAtTime(panFrom, t); p.pan.linearRampToValueAtTime(panTo ?? -panFrom, t + dur);
    g.connect(p); out(p, fx);
  } else out(g, fx);
  src.start(t, Math.random()); src.stop(t + dur + .05);
}
/** Impact grave : sinus qui plonge + petit clic d'attaque */
function thump(t, { from = 150, to = 42, dur = .22, gain = .5 } = {}) {
  tone(from, t, dur, { gain, to, attack: .002 });
  noise(t, .025, { gain: gain * .5, type: 'lowpass', from: 3000, to: 600, q: .7, attack: .001 });
}
/** Accord de nappe en dents de scie, filtre qui s'ouvre (éclat de victoire) */
function pad(notes, t, dur, { gain = .05, from = 400, to = 5000 } = {}) {
  const f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'lowpass'; f.Q.value = 4; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur * .35); f.frequency.exponentialRampToValueAtTime(from * 2, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .03); g.gain.setValueAtTime(gain, t + dur * .5); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  f.connect(g); out(g, { wet: .6 });
  notes.forEach((n, i) => [-9, 9].forEach(dt => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = N(n); o.detune.value = dt + i;
    o.connect(f); o.start(t); o.stop(t + dur + .05);
  }));
}
const N = n => 440 * Math.pow(2, (n - 69) / 12);   // note MIDI → Hz

// --- Sons (esprit menus Persona : nets, métalliques, avec de l'air) ----------------------------
const SOUNDS = {
  // Curseur : « tic » de verre très court, petite pièce
  cursor(t) {
    bell(2637, t, .07, { gain: .07, ratio: 2.01, index: 1.2, rm: .6 });
    noise(t, .012, { gain: .06, type: 'highpass', from: 8000, to: 9000, q: .5, attack: .001 });
  },
  // Validation : « SHING » (lame + cloche) posé sur un impact sourd, avec scintillement en écho
  select(t) {
    thump(t, { from: 170, to: 55, dur: .16, gain: .32 });
    noise(t, .05, { gain: .22, type: 'highpass', from: 9000, to: 4000, q: .7, attack: .001 });
    noise(t + .01, .35, { gain: .07, type: 'bandpass', from: 7000, to: 11000, q: 3, attack: .005, wet: .5 });
    bell(N(88), t + .005, .5, { gain: .13, ratio: 3.51, index: 2, wet: .5, ech: .25 });
    bell(N(95), t + .03, .6, { gain: .08, ratio: 2.76, index: 1.6, wet: .5, ech: .25 });
  },
  // Retour : souffle qui redescend + deux notes qui tombent
  back(t) {
    noise(t, .18, { gain: .14, from: 4000, to: 500, q: 1.5, attack: .01, panFrom: .4, panTo: -.4 });
    bell(N(81), t, .14, { gain: .09, ratio: 2, index: 1, rm: .5 });
    bell(N(74), t + .07, .2, { gain: .08, ratio: 2, index: 1, rm: .5 });
  },
  // Transition : rafale de vent qui traverse l'écran de gauche à droite + montée grave
  whoosh(t) {
    noise(t, .42, { gain: .34, from: 220, to: 6500, q: 1.8, attack: .16, panFrom: -.9, panTo: .9 });
    noise(t + .04, .36, { gain: .12, type: 'highpass', from: 3000, to: 10000, q: .5, attack: .14, panFrom: -.7, panTo: .9 });
    tone(55, t, .38, { type: 'sine', gain: .18, to: 110, attack: .2 });
  },
  // Révélation : coup de lame net + anneau métallique + impact
  slash(t) {
    noise(t, .09, { gain: .38, type: 'highpass', from: 11000, to: 2200, q: 1, attack: .001, panFrom: .6, panTo: -.6 });
    thump(t + .01, { from: 130, to: 38, dur: .3, gain: .42 });
    bell(N(93), t + .015, .9, { gain: .07, ratio: 5.4, index: 1.4, wet: .7 });
    bell(N(86), t + .02, .7, { gain: .06, ratio: 2.76, index: 1.2, wet: .7, pan: .3 });
  },
  // Carte qui arrive : claquement de carte + tintement
  card(t) {
    noise(t, .07, { gain: .18, from: 2500, to: 6000, q: 2.5, attack: .003, panFrom: -.3, panTo: .3 });
    noise(t + .05, .03, { gain: .12, type: 'lowpass', from: 2500, to: 800, attack: .001 });
    bell(N(91), t + .04, .25, { gain: .06, ratio: 3.5, index: 1.4, rm: .5 });
  },
  // Bonne réponse : « ting-ding » brillant, arpège qui scintille en écho, petite nappe
  correct(t) {
    thump(t, { from: 200, to: 80, dur: .1, gain: .18 });
    bell(N(88), t, .55, { gain: .16, ratio: 3.5, index: 2.2, wet: .45 });
    bell(N(95), t + .07, .7, { gain: .14, ratio: 3.5, index: 2.2, wet: .45, ech: .3 });
    [100, 103, 107].forEach((n, i) => bell(N(n), t + .14 + i * .045, .4, { gain: .05, ratio: 2, index: 1, ech: .4, pan: (i - 1) * .5 }));
    noise(t + .12, .5, { gain: .05, type: 'highpass', from: 8000, to: 12000, q: .5, attack: .02, wet: .6 });
  },
  // Mauvaise réponse : « bzzt » sourd, désaccordé
  wrong(t) {
    thump(t, { from: 90, to: 40, dur: .25, gain: .35 });
    tone(N(46), t, .26, { type: 'sawtooth', gain: .07, to: N(41) });
    tone(N(47), t, .26, { type: 'square', gain: .04, to: N(42), detune: 14 });
    noise(t, .12, { gain: .1, type: 'lowpass', from: 1200, to: 200, q: 1.2 });
  },
  // Prise / dépôt d'un morceau
  pick(t) { bell(N(84), t, .1, { gain: .09, ratio: 2, index: 1.2, rm: .5 }); noise(t, .02, { gain: .08, type: 'highpass', from: 6000, to: 8000 }); },
  drop(t) { thump(t, { from: 220, to: 90, dur: .08, gain: .2 }); bell(N(76), t, .14, { gain: .08, ratio: 2, index: .8, rm: .5 }); },
  // RANK UP / LEVEL UP / record : impact, cymbale, accord qui s'ouvre, arpège de cloches
  fanfare(t) {
    thump(t, { from: 120, to: 32, dur: .55, gain: .55 });
    noise(t, 1.6, { gain: .16, type: 'highpass', from: 5000, to: 9000, q: .4, attack: .005, wet: .8 });
    noise(t, .08, { gain: .3, type: 'highpass', from: 9000, to: 3000, q: .8, attack: .001 });
    pad([60, 64, 67, 71, 74], t, 1.8, { gain: .045 });
    [72, 76, 79, 83, 86, 91].forEach((n, i) => bell(N(n + 12), t + .08 + i * .06, .9, { gain: .09, ratio: 3.5, index: 1.8, wet: .5, ech: .2, pan: (i % 2 ? .4 : -.4) }));
  },
  // Notification / réaction : deux cloches de cristal
  ping(t) {
    bell(N(93), t, .5, { gain: .12, ratio: 3.5, index: 2, wet: .5, ech: .3 });
    bell(N(100), t + .09, .6, { gain: .08, ratio: 3.5, index: 2, wet: .5, ech: .3 });
  },
};

/** Joue un son par son nom ; `gap` évite les rafales du même son */
export function play(name, { gap = 40 } = {}) {
  if (name === 'correct') setTimeout(() => dispatchEvent(new CustomEvent('sakura:sfx', { detail: name })), 30);
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
