// Panneau « Aujourd'hui » de la barre latérale : remplit l'espace vide sous le menu avec ce qui
// fait vraiment progresser : l'objectif de révisions du jour, la série, et un mot du jour
// (voix, accent tonal, ajout aux révisions en un clic).
import { h, ruby, kana, toast, jr } from './util.js?v=20261023234516';
import * as D from './data.js?v=20261023234516';
import * as S from './srs.js?v=20261023234516';
import { countDue } from './review.js?v=20261023234516';
import { streakBadge } from './aura.js?v=20261023234516';
import { speakBtn } from './voice.js?v=20261023234516';
import { pitchSVG } from './pitch.js?v=20261023234516';
import { play } from './sfx.js?v=20261023234516';

const dayKey = () => new Date().toISOString().slice(0, 10);
const hash = str => [...str].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);

/** Mot du jour : le même pour toute la journée, choisi parmi les mots pas encore appris si possible */
export async function wordOfDay() {
  const levels = S.getSettings().vocabLevels?.length ? S.getSettings().vocabLevels : ['N5'];
  const list = (await Promise.all(levels.map(lv => D.vocab(lv)))).flat();
  if (!list.length) return null;
  const cards = S.allCards();
  const start = hash(dayKey()) % list.length;
  for (let k = 0; k < 80; k++) {
    const v = list[(start + k * 97) % list.length];
    if (!cards[D.vocabKey(v)]) return v;
  }
  return list[start];
}

export async function dailyPanel({ compact = false } = {}) {
  const [due, v] = await Promise.all([countDue(), wordOfDay()]);
  const today = S.lastDays(1)[0] || { rev: 0, ok: 0 };
  const done = today.rev || 0, total = done + due;
  const ratio = total ? done / total : 1;
  const streak = S.streak();

  const goal = h('div.daily-goal',
    h('div.daily-ring', { style: { '--p': Math.round(ratio * 100) }, 'aria-hidden': 'true' }, h('span', total ? `${Math.round(ratio * 100)}%` : '✓')),
    h('div.daily-goal-text',
      h('strong', due ? `${due} à réviser` : total ? 'Objectif atteint' : 'Rien en attente'),
      h('span', `${done} faite${done > 1 ? 's' : ''} aujourd’hui · série `, streakBadge(streak), ' j'),
      due ? h('a.daily-cta', { href: '#/revision' }, 'Réviser maintenant') : null));

  let word = null;
  if (v) {
    const r = kana(v.f || v.w), key = D.vocabKey(v);
    const inSrs = () => !!S.getCard(key);
    const add = h('button.daily-add', { type: 'button', disabled: inSrs(), onclick: () => {
      S.addCard(key); add.disabled = true; add.textContent = 'Dans tes révisions ✓'; play('correct'); toast(`${v.w} ajouté à tes révisions`);
    } }, inSrs() ? 'Dans tes révisions ✓' : '+ Ajouter aux révisions');
    word = h('div.daily-word',
      h('p.daily-label', h('span', { lang: 'ja', html: jr('今日の言葉') }), ' Mot du jour'),
      h('p.daily-w', { lang: 'ja', html: ruby(v.f || v.w, true) }),
      h('p.daily-m', D.shortMeaning(v.m)),
      h('div.daily-audio', speakBtn(r, { label: `Écouter ${v.w}`, small: true }),
        S.getSettings().pitch !== false && v.p != null ? h('span', { html: pitchSVG(r, v.p, { compact: true }) }) : null),
      add);
  }
  return h(`aside.daily${compact ? '.compact' : ''}`, { 'aria-label': 'Aujourd’hui' }, goal, word);
}

/** (Re)monte le panneau dans la barre latérale */
let pending = null;
export function mountDaily() {
  const nav = document.querySelector('.nav');
  if (!nav || document.body.classList.contains('portal-mode')) return;
  clearTimeout(pending);
  pending = setTimeout(async () => {
    const panel = await dailyPanel();
    panel.id = 'nav-daily';
    const old = document.getElementById('nav-daily');
    old ? old.replaceWith(panel) : nav.append(panel);
  }, 30);
}

// --- Colonne de droite, sous « En ligne » : point de grammaire du jour ------------
import { sentenceHTML, sentenceText, sentenceLine } from './review.js?v=20261023234516';

export async function grammarOfDay() {
  const levels = S.getSettings().grammarLevels?.length ? S.getSettings().grammarLevels : ['N5'];
  const all = (await D.grammar()).filter(g => levels.includes(g.lv));
  if (!all.length) return null;
  const cards = S.allCards();
  const start = hash('g' + dayKey()) % all.length;
  let pick = all[start];
  for (let k = 0; k < all.length; k++) {
    const g = all[(start + k * 13) % all.length];
    if (!cards[`g:${g.id}`] && (await D.sentencesFor(g.id)).length) { pick = g; break; }
  }
  return { g: pick, ex: (await D.sentencesFor(pick.id))[0] };
}

export async function sideExtras() {
  const god = await grammarOfDay();
  const furi = S.getSettings().furigana !== 'never';
  const point = god && h('section.side-card.side-point',
    h('p.daily-label', h('span', { lang: 'ja', html: jr('今日の文法') }), ' Point du jour'),
    h('a.side-point-title', { href: `#/point/${god.g.id}`, lang: 'ja', html: ruby(D.gramLabel(god.g), true) }),
    h('p.daily-m', god.g.s),
    god.ex && h('div.side-ex',
      sentenceLine(god.ex, { furi }),
      h('p.small', god.ex.fr)));
  return h('div.side-extra#side-extra', point);
}

let sidePending = null;
export function mountSideExtras() {
  const panel = document.querySelector('.online-panel');
  if (!panel || document.body.classList.contains('portal-mode')) return;
  clearTimeout(sidePending);
  sidePending = setTimeout(async () => {
    const el = await sideExtras();
    const old = document.getElementById('side-extra');
    old ? old.replaceWith(el) : panel.append(el);
  }, 60);
}
