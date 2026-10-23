// 敬語 Guide complet du keigo : les 5 catégories, les verbes spéciaux, les formes régulières,
// les grands principes, ウチ・ソト et les pièges les plus fréquents (d'après data/keigo_guide.json).
import { h, jr, ruby } from './util.js?v=20261024004140';
import * as D from './data.js?v=20261024004140';
import { play } from './sfx.js?v=20261024004140';

const STATUS = {
  '適切': ['ok', '✔', 'Correct'], '注意': ['warn', '!', 'Attention'], '不適切': ['ko', '✘', 'Incorrect'], '慣用': ['use', '≈', 'Admis par l’usage'],
};
// Qui est élevé, pour chacune des 5 catégories
const WHO = [
  ['↑', 'L’autre (celui qui agit)', 'Je parle de l’action d’une personne à respecter : je l’élève.'],
  ['↗', 'La personne visée', 'Mon action va vers quelqu’un : en m’abaissant, j’élève cette personne.'],
  ['→', 'Mon interlocuteur', 'Je présente mes propres actions avec soin, par égard pour qui m’écoute.'],
  ['→', 'Mon interlocuteur', 'Je parle poliment, sans élever ni abaisser personne.'],
  ['✿', 'La chose dont on parle', 'J’embellis simplement le mot.'],
];
// Tableau comparatif : verbe neutre → 尊敬語 / 謙譲語Ⅰ / 謙譲語Ⅱ
const TABLE = [
  ['行（い）く・来（く）る', 'aller, venir', 'いらっしゃる・おいでになる・お越（こ）しになる', '伺（うかが）う', '参（まい）る'],
  ['いる', 'être là', 'いらっしゃる・おいでになる', '—', 'おる'],
  ['言（い）う', 'dire', 'おっしゃる', '申（もう）し上（あ）げる', '申（もう）す'],
  ['する', 'faire', 'なさる', '—', '致（いた）す'],
  ['食（た）べる・飲（の）む', 'manger, boire', '召（め）し上（あ）がる', '頂（いただ）く', '—'],
  ['見（み）る', 'voir, regarder', 'ご覧（らん）になる', '拝見（はいけん）する', '—'],
  ['知（し）っている', 'savoir, connaître', 'ご存（ぞん）じだ', '存（ぞん）じ上（あ）げる', '存（ぞん）じる'],
  ['思（おも）う', 'penser', 'お思（おも）いになる', '—', '存（ぞん）じる'],
  ['会（あ）う', 'rencontrer', 'お会（あ）いになる', 'お目（め）にかかる', '—'],
  ['見（み）せる', 'montrer', 'お見（み）せになる', 'お目（め）にかける・ご覧（らん）に入（い）れる', '—'],
  ['聞（き）く・尋（たず）ねる', 'écouter, demander', 'お聞（き）きになる・お尋（たず）ねになる', '伺（うかが）う・拝聴（はいちょう）する', '—'],
  ['訪（たず）ねる', 'rendre visite', 'お訪（たず）ねになる', '伺（うかが）う・お邪魔（じゃま）する', '—'],
  ['くれる', 'donner (à moi)', '下（くだ）さる', '—', '—'],
  ['もらう', 'recevoir', '—', '頂（いただ）く', '—'],
  ['あげる', 'donner', '—', '差（さ）し上（あ）げる', '—'],
  ['借（か）りる', 'emprunter', 'お借（か）りになる', '拝借（はいしゃく）する', '—'],
  ['引（ひ）き受（う）ける', 'accepter (une demande)', 'お引（ひ）き受（う）けになる', '承（うけたまわ）る', 'かしこまる'],
  ['寝（ね）る', 'dormir', 'お休（やす）みになる', '—', '—'],
  ['着（き）る', 'porter (un vêtement)', 'お召（め）しになる', '—', '—'],
];

// D'après « 敬語の指針 » (文化審議会答申, 2007), chapitre 1 et chapitre 3 §1
const SPIRIT = [
  ['相互尊重', 'Le respect mutuel', 'Le keigo moderne n’est plus une échelle de castes : il exprime le respect entre personnes égales en dignité. Il va dans les deux sens : le supérieur aussi doit tenir compte de la situation de son subordonné.'],
  ['自己表現', 'Une façon de se présenter', 'Choisir ses formes de politesse, c’est montrer quelle personne tu es et comment tu vois la relation. Ce n’est pas réciter un manuel : c’est un choix personnel, adapté à la situation.'],
  ['社会的な立場', 'Respecter un rôle, pas forcément une personne', 'Le keigo n’exige pas d’admirer quelqu’un. Respecter sa place (client, professeur de ton enfant, partenaire plus jeune que toi) est déjà une forme d’égard. Ne pas l’utiliser quand il le faut fait passer pour impoli.'],
  ['適度', 'Ni trop, ni trop peu', 'Empiler les formes ne rend pas plus poli : une phrase ultra-polie avec un ton méprisant reste insultante (慇懃無礼, « politesse arrogante »). Et un contenu impoli ne devient pas poli parce qu’il est en keigo.'],
  ['気持ち', 'Choisir des mots qui collent à ce qu’on ressent', 'Les formules qui rabaissent ce qui est à soi (小社 « notre petite société », 拙稿 « mon médiocre manuscrit », 愚見 « mon humble avis ») ou qui grandissent ce qui est à l’autre (御高配 « votre haute bienveillance », 玉稿 « votre précieux manuscrit ») sont des conventions, pas de la fausse modestie. On les emploie si elles nous semblent justes.'],
  ['マニュアル敬語', 'Le keigo « manuel »', 'Les scripts de service client aident les débutants, mais réciter les mêmes phrases à tout le monde sonne creux, et crée des fautes célèbres (×ご注文の品はおそろいになりましたか). Le manuel est un point de départ, pas une fin.'],
  ['メール', 'E-mails et messages', 'Un e-mail reste une lettre adressée à quelqu’un : abréger le message ne doit pas faire oublier le keigo. Attention aussi aux messages envoyés à plusieurs personnes : chacun reste un destinataire à respecter.'],
  ['方言', 'Les dialectes', 'Chaque région a son keigo : le ～はる du Kansai (来はった) élève légèrement l’autre tout en restant chaleureux. Le keigo « standard » n’est qu’une variante parmi d’autres.'],
];
const FAQ = [
  ['Le keigo classe les gens en haut et en bas : ce n’est pas dépassé ?', 'Il a longtemps servi à marquer les rangs. Aujourd’hui, il exprime surtout le respect, l’égard pour la situation de l’autre et le degré de proximité. Le principe moderne, c’est le respect mutuel : personne ne doit se montrer arrogant ni se rabaisser plus que nécessaire.'],
  ['Dois-je parler en keigo à quelqu’un que je n’admire pas ?', 'Le respect ne se limite pas à l’admiration : reconnaître la place sociale de quelqu’un est déjà une marque d’égard, sans hypocrisie. Et ne pas utiliser le keigo quand la situation l’exige te fait passer pour quelqu’un qui manque de savoir-vivre.'],
  ['Faut-il du keigo avec un partenaire beaucoup plus jeune que moi ?', 'Oui : le keigo dépend aussi des rôles, pas seulement de l’âge. Un employé d’une autre entreprise ou le professeur de ton enfant ont un rôle qu’on respecte, même s’ils sont plus jeunes.'],
  ['Sans keigo, je me sens plus naturel. Ai-je raison ?', 'Parfois, oui : avec certaines personnes, renoncer au keigo rapproche. Mais ailleurs, ça peut blesser. C’est à toi de juger, selon la personne et le moment : c’est justement ça, le keigo comme « expression de soi ».'],
  ['Pourquoi certaines personnes très polies paraissent-elles impolies ?', 'Parce que des mots polis avec une attitude hautaine, ça s’entend (慇懃無礼). Mais attention à ne pas juger trop vite : quelqu’un de vraiment raffiné peut sembler « trop poli » à qui ne l’est pas.'],
  ['小社, 愚息, 拙稿… ce n’est pas de la fausse modestie ?', 'Ce sont des conventions de langage : on rapetisse ce qui est à soi pour montrer de l’égard, sans le penser vraiment. Pareil pour « お口に合うかどうか分かりませんが » en servant un plat réussi. Libre à toi de les employer si elles te ressemblent.'],
];
const DEPTH = [
  ['立てる', 'Ce que veut dire « élever »', 'Le guide officiel parle de 立てる : « placer quelqu’un haut par les mots ». On peut le faire par admiration, par politesse de circonstance, ou même pour garder ses distances : dans tous les cas, la personne est « élevée » dans la phrase.'],
  ['尊敬語', 'Respect : qui est élevé ?', 'On élève la personne qui agit (いらっしゃる), qui possède (お名前) ou qui est dans un état (お忙しい). Ce peut être ton interlocuteur, quelqu’un de son côté (sa famille), ou un tiers dont tu parles à un ami.'],
  ['くださる', 'くださる : respect + faveur', 'くださる élève celui qui agit ET dit que son geste est un bienfait pour toi : 先生が指導してくださった = « le professeur a eu la bonté de me guider ».'],
  ['謙譲語Ⅰ', 'Humble Ⅰ : il faut une personne à élever', 'Il élève la personne VERS qui va ton action (向かう先). Sans personne digne d’être élevée, il ne marche pas : 先生のところに伺う ✔, ×弟のところに伺う. Il existe aussi en nom : (先生への) お手紙, ご説明.'],
  ['謙譲語Ⅱ', 'Humble Ⅱ : poli envers ton interlocuteur', '参る, 申す, いたす présentent tes propres actions de façon soignée à la personne qui t’écoute, qu’il y ait quelqu’un à élever ou non : 弟のところに参ります ✔. Il s’emploie avec ます.'],
  ['バスが参りました', 'Humble Ⅱ pour les choses', 'Le 謙譲語Ⅱ sert aussi pour des choses ou des personnes qu’on n’a pas besoin d’élever : バスが参りました (« le bus arrive »), 夜も更けて参りました (« la nuit avance »). Ce qui compte, c’est la politesse envers l’auditeur.'],
  ['Ⅰ と Ⅱ', 'Ⅰ ou Ⅱ ? Le test', 'Quand la personne visée EST ton interlocuteur, 伺う et 参る reviennent au même. Mais quand tu parles d’un tiers à quelqu’un d’autre, seul 伺う élève le tiers ; 参る n’élève que ton auditeur. Et 伺う peut se passer de ます (明日先生のところに伺うよ), pas 参る.'],
  ['お〜いたす', 'お〜いたす : les deux à la fois', 'お待ちいたします combine お待ちする (Ⅰ : élève la personne qu’on attend) et いたす (Ⅱ : poli envers l’auditeur). C’est pour ça que c’est la forme reine du service client.'],
  ['丁寧語', 'Poli ou humble Ⅱ ?', 'です・ます se mettent partout, sur n’importe quel sujet. Le 謙譲語Ⅱ ne vaut que pour son propre camp et est plus solennel. (で)ございます a le même degré de solennité que le 謙譲語Ⅱ.'],
  ['美化語', 'Embellissement : n’élève personne', 'お酒, お料理 n’élèvent ni celui qui agit, ni la personne visée, ni l’auditeur : ils rendent juste le mot plus élégant. Mais ils viennent naturellement dans une phrase en keigo : 先生、お酒をお注ぎしましょう sonne mieux qu’avec 酒.'],
];
const RULES = [
  ['自分側は立てない', 'On n’élève jamais son propre camp', 'Toi et ta famille (ウチ) ne sont jamais élevés : ×父はいらっしゃいます → 父は参ります / 父は行きます.'],
  ['相手側を立てる', 'On élève le camp de l’autre', 'L’usage typique : ton interlocuteur et son entourage. 先生は来週いらっしゃるんでしたね.'],
  ['第三者', 'Un tiers : selon le contexte', 'On peut élever un tiers (ton professeur, devant un ami), mais pas quelqu’un que ton interlocuteur ne connaît pas : ×高校の先輩がいらっしゃった → 先輩が遊びに来た.'],
];

let guideP = null;
const guide = () => (guideP = guideP || D.load('keigo_guide'));

/** Bandeau en tête de l'onglet Grammaire › 敬語 */
const FIVE = [['尊敬語', 'Respect', 'l’autre agit', 'いらっしゃる・お〜になる'], ['謙譲語Ⅰ', 'Humble Ⅰ', 'vers une personne', '伺う・お〜する'],
  ['謙譲語Ⅱ', 'Humble Ⅱ', 'je présente mes actes', '参る・いたす'], ['丁寧語', 'Poli', 'je parle poliment', 'です・ます'], ['美化語', 'Embellissement', 'j’embellis le mot', 'お茶・ご飯']];
export function keigoBanner() {
  return h('div.keigo-top', bannerLink(),
    h('ol.keigo-five', FIVE.map(([k, fr, who, ex], i) => h('li', { class: `c${i + 1}` },
      h('b', String(i + 1)), h('span.kf-k', { lang: 'ja', html: jr(k.replace('Ⅰ', '').replace('Ⅱ', '')) + (k.endsWith('Ⅰ') ? 'Ⅰ' : k.endsWith('Ⅱ') ? 'Ⅱ' : '') }),
      h('span.kf-fr', fr), h('small', who), h('span.kf-ex', { lang: 'ja' }, ex)))));
}
function bannerLink() {
  return h('a.keigo-banner', { href: '#/keigo' },
    h('span.kb-kanji', { lang: 'ja', 'aria-hidden': 'true' }, '敬'),
    h('span.kb-text', h('small', 'GUIDE COMPLET'), h('strong', 'Tout comprendre au keigo'),
      h('span', 'Les 5 catégories, les verbes spéciaux, les formes, ウチ・ソト et les pièges classiques.')),
    h('span.kb-go', 'Lire ▶'));
}

const jp = (text, cls = 'span') => h(`${cls}`, { lang: 'ja', html: ruby(text, true) });

export async function keigoGuide(main) {
  const [g, grammar] = await Promise.all([guide(), D.grammar()]);
  const points = grammar.filter(p => p.lv === 'keigo');
  const sections = [];
  const sec = (id, kanji, title, lead, ...body) => {
    sections.push([id, title]);
    return h(`section.kg-sec#kg-${id}`,
      h('header.kg-sec-head', h('span.kg-sec-k', { lang: 'ja', 'aria-hidden': 'true' }, kanji), h('div', h('h2', title), lead ? h('p.section-note', lead) : null)),
      ...body);
  };

  // 1 · Les 5 catégories
  const cats = sec('cinq', '五', 'Les 5 keigo', 'Depuis 2007, le ministère japonais de la Culture distingue cinq catégories (l’ancien classement en comptait trois).',
    h('ol.kg-cats', g.categories.map((c, i) => h('li.kg-cat', { style: { '--i': i }, class: `kg-cat c${i + 1}` },
      h('div.kg-cat-top', h('span.kg-num', String(i + 1)),
        h('div', h('h3', { lang: 'ja', html: jr(c.nom_ja.replace('（', ' · ').replace('）', '')) }), h('p.kg-fr', c.nom_fr))),
      h('p.kg-who', h('b', WHO[i][0]), h('span', h('small', 'On élève'), WHO[i][1])),
      h('p.kg-fn', c.fonction_fr),
      h('p.kg-model', 'Modèle : ', h('span', { lang: 'ja' }, c.type_modele)),
      h('div.kg-chips', c.exemples_ja.split(/,\s*/).map(x => h('span.kg-chip', { lang: 'ja' }, x))),
      h('p.small.kg-old', `Ancien classement : `, h('span', { lang: 'ja' }, c.ancien_classement_3), ` · ${WHO[i][2]}`)))));

  // 0 · L'esprit du keigo
  const spirit = sec('esprit', '心', 'L’esprit du keigo', 'Ce qu’en dit le guide officiel 敬語の指針 (文化審議会, 2007) avant toute règle.',
    h('div.kg-spirit', SPIRIT.map(([k, t, x], i) => h('article.kg-sp', { style: { '--i': i } }, h('span.kg-sp-k', { lang: 'ja' }, k), h('h3', t), h('p', { html: jr(x) })))),
    h('div.kg-faq', h('p.kicker', 'Les questions qu’on se pose tous'),
      FAQ.map(([q, a]) => h('details.kg-case', h('summary', h('span.kg-case-sit', q)), h('div.kg-case-body', h('p', a))))));
  // 1 bis · Les 5 en profondeur
  const depth = sec('fond', '深', 'Les 5 en profondeur', 'Les nuances qui font la différence entre « correct » et « juste ».',
    h('div.kg-princ', DEPTH.map(([k, t, x]) => h('article.kg-pr', h('p.kg-sp-k.small', { lang: 'ja' }, k), h('h3', t), h('p', x)))),
    h('p.kicker', 'Qui élever ? Les trois règles'),
    h('ol.kg-rules', RULES.map(([k, t, x]) => h('li', h('b', { lang: 'ja' }, k), h('strong', t), h('span', x)))));
  // 2 · Le réflexe : deux questions
  const reflex = sec('reflexe', '問', 'Le réflexe en deux questions', 'Avant de parler, demande-toi :',
    h('div.kg-flow',
      h('div.kg-q', h('b', '1'), h('p', h('strong', 'Qui fait l’action ?')),
        h('ul', h('li', 'Une personne à respecter → ', h('span.kg-tag.r', { lang: 'ja', html: jr('尊敬語') }), ' (いらっしゃる, お〜になる)'),
          h('li', 'Moi ou mon camp, vers quelqu’un → ', h('span.kg-tag.h', { lang: 'ja', html: jr('謙譲語') }), ' Ⅰ (伺う, お〜する)'),
          h('li', 'Moi ou mon camp, sans personne visée → ', h('span.kg-tag.h2', { lang: 'ja', html: jr('謙譲語') }), ' Ⅱ (参る, いたす)'))),
      h('div.kg-q', h('b', '2'), h('p', h('strong', 'À qui je parle ?')),
        h('ul', h('li', 'Toujours : ', h('span.kg-tag.p', { lang: 'ja', html: jr('丁寧語') }), ' (です・ます)'),
          h('li', 'À l’extérieur (client, partenaire) : mon chef fait partie de ', h('b', 'mon camp (ウチ)'), ' → on ne l’élève pas'),
          h('li', 'En interne : on élève son supérieur normalement'))),
      h('div.kg-q.warn', h('b', '!'), h('p', h('strong', 'Une seule couche de respect par verbe')),
        h('p', { lang: 'ja', html: ruby('×お読（よ）みになられる → お読（よ）みになる ／ 読（よ）まれる', true) }))));

  // 3 · Tableau des verbes spéciaux
  const table = sec('verbes', '動', 'Les verbes spéciaux', 'Les incontournables : à apprendre par cœur, colonne par colonne.',
    h('div.kg-table-wrap', h('table.kg-table',
      h('thead', h('tr', h('th', 'Neutre'), h('th.r', { lang: 'ja', html: jr('尊敬語') }), h('th.h', { lang: 'ja', html: `${jr('謙譲語')}Ⅰ` }), h('th.h2', { lang: 'ja', html: `${jr('謙譲語')}Ⅱ` }))),
      h('tbody', TABLE.map(([n, fr, r, h1, h2]) => h('tr',
        h('td', jp(n), h('small', fr)), h('td.r', jp(r)), h('td.h', jp(h1)), h('td.h2', jp(h2))))))),
    h('details.kg-more', h('summary', 'Liste détaillée (avec remarques)'),
      h('ul.kg-list', g.special.map(v => h('li', h('span.kg-tag', { class: tagCls(v.categorie) }, v.categorie), ' ',
        h('b', { lang: 'ja' }, v.forme_keigo), ' ← ', h('span', { lang: 'ja' }, v.verbe_neutre), ` : ${v.sens_fr}`, v.note ? h('small', ` — ${v.note}`) : null)))));

  // 4 · Les formes régulières
  const byCat = new Map();
  g.forms.forEach(f => { if (!byCat.has(f.categorie)) byCat.set(f.categorie, []); byCat.get(f.categorie).push(f); });
  const forms = sec('formes', '型', 'Les formes régulières', 'Pour tous les autres verbes : des « moules » à appliquer. ✔ correct · ! attention · ✘ incorrect · ≈ admis par l’usage.',
    ...[...byCat].map(([cat, list]) => h('div.kg-formgroup',
      h('h3', { lang: 'ja', html: jr(cat) }),
      h('ul.kg-forms', list.map(f => {
        const [cls, ico, lbl] = STATUS[f.statut] || ['use', '·', f.statut];
        return h(`li.kg-form.${cls}`, h('span.kg-stat', { title: lbl, 'aria-label': lbl }, ico),
          h('div', h('p.kg-form-name', { lang: 'ja' }, f.forme), h('p.kg-form-ex', { lang: 'ja' }, f.exemples), f.remarque_fr ? h('p.small', f.remarque_fr) : null));
      })))));

  // 5 · Les grands principes
  const principles = sec('principes', '理', 'Les grands principes', null,
    h('div.kg-princ', g.principles.map(p => h('article.kg-pr',
      h('h3', p.principe_fr), h('p', p.explication_fr),
      p.exemple_ok ? h('p.kg-ok', { lang: 'ja' }, h('b', '○'), p.exemple_ok) : null,
      p.exemple_ng ? h('p.kg-ng', { lang: 'ja' }, h('b', '×'), p.exemple_ng) : null))));

  // 6 · Cas pratiques, ウチ・ソト, pièges
  const themes = new Map();
  g.cases.forEach(c => { if (!themes.has(c.theme)) themes.set(c.theme, []); themes.get(c.theme).push(c); });
  const cases = sec('cas', '例', 'Cas pratiques et pièges', 'Les erreurs que font même les Japonais, et ce qu’il vaut mieux dire.',
    ...[...themes].map(([th, list]) => h('div.kg-case-group', h('h3', { lang: 'ja', html: jr(th) }),
      ...list.map(c => h('details.kg-case',
        h('summary', h('span.kg-case-sit', { lang: 'ja' }, c.situation), h('span.kg-case-pb', c.probleme)),
        h('div.kg-case-body',
          h('p', h('strong', 'Mieux : '), h('span', { lang: 'ja' }, c.forme_recommandee)),
          h('p', c.explication_fr)))))));

  // 7 · Les leçons
  const lessonsMap = new Map();
  points.forEach(p => { if (!lessonsMap.has(p.le)) lessonsMap.set(p.le, []); lessonsMap.get(p.le).push(p); });
  const lessons = sec('lecons', '習', 'Les leçons de keigo', `${points.length} points répartis en ${lessonsMap.size} leçons, chacun avec des phrases d’exemple et des exercices.`,
    h('ol.kg-lessons', [...lessonsMap].map(([le, pts]) => h('li',
      h('a.kg-lesson', { href: `#/lecon/keigo/g/${le}` }, h('span.kg-ln', String(le).padStart(2, '0')),
        h('span.kg-lp', pts.map(p => h('span', { lang: 'ja', html: ruby(D.gramLabel(p), true) })))))),
    ),
    h('div.kg-scenes', h('p.kicker', 'Situations où le keigo est indispensable'),
      h('div.kg-chips', g.dialogues.map(d => h('span.kg-chip.scene', h('span', { lang: 'ja' }, d.titre_ja), h('small', d.titre_fr))))));

  const nav = h('nav.kg-nav', { 'aria-label': 'Sommaire du guide' }, sections.map(([id, t]) => h('a', { href: `#/keigo`, onclick: e => {
    e.preventDefault(); play('cursor'); document.getElementById(`kg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } }, t)));

  main.replaceChildren(
    h('header.page-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('敬語') }), 'Keigo'),
      h('p.section-note', 'Le langage du respect : choisir ses mots selon qui agit et à qui l’on parle. Tout ce qu’il faut savoir, des bases aux pièges.')),
    h('div.kg-cta',
      h('a.btn.primary', { href: '#/lecons/keigo' }, 'Leçons de keigo'),
      h('a.btn', { href: '#/grammaire/keigo' }, 'Les points de grammaire'),
      h('a.btn', { href: '#/jeux/salaryman' }, 'Jouer à Salaryman')),
    nav, spirit, cats, depth, reflex, table, forms, principles, cases, lessons);
}

function tagCls(cat) {
  if (cat.startsWith('尊敬')) return 'kg-tag r';
  if (cat.includes('謙譲語Ⅱ')) return 'kg-tag h2';
  if (cat.startsWith('謙譲')) return 'kg-tag h';
  return 'kg-tag p';
}
