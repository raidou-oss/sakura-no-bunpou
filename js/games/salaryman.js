// サラリーマン Salaryman : une journée de travail dans une entreprise de Tokyo.
// Le patron, les supérieurs et les clients te parlent ; tu réponds avec le bon keigo
// (respect pour leurs actions, humilité pour les tiennes, ウチ・ソト face aux clients).
import { play } from '../sfx.js?v=20261024004140';
import { h, ruby, shuffle, toast, jr } from '../util.js?v=20261024004140';
import { hitFx, HIT_WORDS, answerRegex, normJa, kana, kanaKeyboardToggle, smoothType } from '../util.js?v=20261024004140';
import * as St from '../srs.js?v=20261024004140';

// Personnages
const WHO = {
  shacho: { jp: '社長（しゃちょう）', name: 'Président Kurosawa', k: '社', c: '#FFD86B', rank: 'Le patron' },
  bucho: { jp: '部長（ぶちょう）', name: 'Directrice Takeda', k: '部', c: '#FF94CB', rank: 'Ta directrice' },
  kacho: { jp: '課長（かちょう）', name: 'Chef Morimoto', k: '課', c: '#46D9FF', rank: 'Ton chef de section' },
  client: { jp: 'お客様（きゃくさま）', name: 'M. Ishida, client', k: '客', c: '#63F0C3', rank: 'Un client important' },
  phone: { jp: '電話（でんわ）', name: 'Appel entrant', k: '電', c: '#B8F3FF', rank: 'Un partenaire au téléphone' },
  senpai: { jp: '先輩（せんぱい）', name: 'Sato, ta collègue', k: '先', c: '#7FA8FF', rank: 'Ta collègue plus ancienne' },
};
// Moments de la journée
const TIMES = ['9:00', '9:40', '10:20', '11:00', '12:10', '13:30', '14:15', '15:00', '16:20', '17:30'];
const GRADES = [
  ['新入社員（しんにゅうしゃいん）', 'Nouvelle recrue'], ['主任（しゅにん）', 'Responsable'], ['係長（かかりちょう）', 'Chef d’équipe'],
  ['課長（かちょう）', 'Chef de section'], ['部長（ぶちょう）', 'Directeur'], ['社長（しゃちょう）', 'Président'],
];

// Scénarios : qui parle, contexte, réplique (facultative), réponses [texte, correct, explication]
// lv : 1 bases · 2 respect / humilité · 3 ウチ・ソト et pièges
const S = [
  // ---- Niveau 1
  { lv: 1, who: 'bucho', ctx: 'Tu arrives au bureau. La directrice est déjà là.', line: 'おはよう。', fr: 'Bonjour.',
    a: [['おはようございます。', 1, 'Avec un supérieur, on ajoute toujours ございます.'], ['おはよう。', 0, 'Trop familier : réservé aux amis ou aux subordonnés.'], ['ご苦労様（くろうさま）です。', 0, 'ご苦労様 se dit à un subordonné : vers un supérieur, c’est impoli.']] },
  { lv: 1, who: 'kacho', ctx: 'Le chef te tend un dossier.', line: 'この資料（しりょう）、コピーしておいて。', fr: 'Fais-moi des copies de ce document.',
    a: [['はい、承知（しょうち）いたしました。', 1, '承知いたしました : la réponse humble et professionnelle à une consigne.'], ['了解（りょうかい）です。', 0, '了解 passe entre collègues mais sonne désinvolte face à un supérieur.'], ['うん、分（わ）かった。', 0, 'Familier : on ne répond pas ainsi à son chef.']] },
  { lv: 1, who: 'senpai', ctx: 'Ta collègue rentre d’une longue réunion.', line: 'ただいま戻（もど）りました。', fr: 'Je suis de retour.',
    a: [['お疲（つか）れ様（さま）です。', 1, 'La formule de bureau universelle pour saluer le travail de quelqu’un.'], ['ご苦労様（くろうさま）です。', 0, 'ご苦労様 vient d’en haut : à éviter envers une personne plus ancienne.'], ['お帰（かえ）り。', 0, 'お帰り se dit à la maison, pas au bureau.']] },
  { lv: 1, who: 'client', ctx: 'Un client se présente à l’accueil. Tu te présentes.', line: 'はじめまして。石田（いしだ）です。', fr: 'Enchanté, je suis Ishida.',
    a: [['はじめまして。営業部（えいぎょうぶ）の田中（たなか）と申（もう）します。', 1, '申す : le « s’appeler » humble pour se présenter.'], ['はじめまして。営業部（えいぎょうぶ）の田中（たなか）とおっしゃいます。', 0, 'おっしゃる est respectueux : on ne l’emploie jamais pour soi.'], ['はじめまして。営業部（えいぎょうぶ）の田中（たなか）様（さま）です。', 0, 'On ne met jamais 様 à son propre nom.']] },
  { lv: 1, who: 'client', ctx: 'Le client attend à l’accueil. Tu dois le faire patienter.', line: '', fr: '',
    a: [['少々（しょうしょう）お待（ま）ちください。', 1, 'お〜ください : la demande respectueuse type.'], ['ちょっと待（ま）って。', 0, 'Beaucoup trop familier pour un client.'], ['少々（しょうしょう）お待（ま）ちしてください。', 0, 'お〜する est humble : ×お待ちしてください mélange les deux.']] },
  { lv: 1, who: 'client', ctx: 'Tu accompagnes le client jusqu’à la salle de réunion.', line: '', fr: '',
    a: [['会議室（かいぎしつ）までご案内（あんない）いたします。', 1, 'ご〜いたす : humble et soigné, parfait pour guider un client.'], ['会議室（かいぎしつ）までご案内（あんない）になります。', 0, 'ご〜になる est respectueux : c’est TOI qui guides, donc humble.'], ['会議室（かいぎしつ）まで案内（あんない）してあげます。', 0, 'てあげる sonne condescendant envers un client.']] },
  { lv: 1, who: 'bucho', ctx: 'Tu dois partir avant ta directrice.', line: '', fr: '',
    a: [['お先（さき）に失礼（しつれい）いたします。', 1, 'La formule pour quitter le bureau avant les autres.'], ['じゃあ、帰（かえ）ります。', 0, 'Trop sec : il manque la formule d’usage.'], ['お先（さき）にお帰（かえ）りになります。', 0, 'お〜になる élève le sujet : ici le sujet, c’est toi.']] },
  { lv: 1, who: 'client', ctx: 'Le client te tend sa carte de visite. Tu demandes son nom en entier.', line: '', fr: '',
    a: [['恐（おそ）れ入（い）りますが、お名前（なまえ）を伺（うかが）ってもよろしいでしょうか。', 1, 'Coussin 恐れ入りますが + 伺う (humble) + よろしいでしょうか.'], ['名前（なまえ）は何（なん）ですか。', 0, 'Trop direct et sans お : impoli avec un client.'], ['お名前（なまえ）を申（もう）してください。', 0, '申す est humble : on ne demande pas au client de « s’abaisser ».']] },
  { lv: 1, who: 'phone', ctx: 'Le téléphone sonne. Tu décroches.', line: '', fr: '',
    a: [['お電話（でんわ）ありがとうございます。サクラ商事（しょうじ）でございます。', 1, 'でございます : la copule très polie de l’accueil téléphonique.'], ['もしもし、サクラ商事（しょうじ）です。誰（だれ）？', 0, '誰 au lieu de どちら様 : beaucoup trop familier.'], ['はい、サクラ商事（しょうじ）でいらっしゃいます。', 0, 'でいらっしゃる élève une personne : pas sa propre entreprise.']] },
  { lv: 1, who: 'kacho', ctx: 'Tu as fait une erreur dans un rapport.', line: 'この数字（すうじ）、間違（まちが）っているよ。', fr: 'Ce chiffre est faux, tu sais.',
    a: [['申（もう）し訳（わけ）ございません。すぐに修正（しゅうせい）いたします。', 1, 'Excuse très polie + いたす pour ta propre action.'], ['すみません、すぐに直（なお）してあげます。', 0, 'てあげる : comme si tu rendais service à ton chef.'], ['ごめん、すぐ直（なお）すね。', 0, 'Langage entre amis : inacceptable avec un chef.']] },
  // ---- Niveau 2
  { lv: 2, who: 'kacho', ctx: 'Tu cherches la directrice.', line: 'あれ、部長（ぶちょう）は？', fr: 'Tiens, où est la directrice ?',
    a: [['部長（ぶちょう）は会議室（かいぎしつ）にいらっしゃいます。', 1, 'En interne, on élève la directrice : いらっしゃる.'], ['部長（ぶちょう）は会議室（かいぎしつ）におります。', 0, 'おる abaisse la directrice : à réserver pour parler d’elle à un client (ウチ・ソト).'], ['部長（ぶちょう）は会議室（かいぎしつ）に参（まい）っています。', 0, '参る est humble : jamais pour l’action d’un supérieur, en interne.']] },
  { lv: 2, who: 'bucho', ctx: 'Tu veux savoir si la directrice a lu ton rapport.', line: '', fr: '',
    a: [['部長（ぶちょう）、報告書（ほうこくしょ）をご覧（らん）になりましたか。', 1, 'ご覧になる : le « voir » respectueux.'], ['部長（ぶちょう）、報告書（ほうこくしょ）を拝見（はいけん）しましたか。', 0, '拝見する est humble : c’est TOI qui regardes avec humilité, pas elle.'], ['部長（ぶちょう）、報告書（ほうこくしょ）をご覧（らん）になられましたか。', 0, 'Double keigo : ご覧になる + られる.']] },
  { lv: 2, who: 'shacho', ctx: 'Le président passe dans les bureaux. Tu lui proposes un café.', line: '', fr: '',
    a: [['社長（しゃちょう）、コーヒーを召（め）し上（あ）がりますか。', 1, '召し上がる : manger / boire respectueux.'], ['社長（しゃちょう）、コーヒーをいただきますか。', 0, 'いただく est humble : il s’emploie pour soi.'], ['社長（しゃちょう）、コーヒー飲（の）む？', 0, 'Familier : impensable avec le président.']] },
  { lv: 2, who: 'bucho', ctx: 'La directrice t’annonce son déplacement.', line: '来週（らいしゅう）、大阪（おおさか）に出張（しゅっちょう）するの。', fr: 'La semaine prochaine, je pars en déplacement à Osaka.',
    a: [['そうですか。何日（なんにち）にいらっしゃいますか。', 1, 'いらっしゃる pour le déplacement d’un supérieur.'], ['そうですか。何日（なんにち）に参（まい）りますか。', 0, '参る est humble : uniquement pour toi ou ton camp.'], ['そうですか。何日（なんにち）に伺（うかが）いますか。', 0, '伺う est humble : il élèverait les gens d’Osaka, pas ta directrice.']] },
  { lv: 2, who: 'kacho', ctx: 'Le chef te demande ton avis.', line: 'この企画（きかく）、どう思（おも）う？', fr: 'Que penses-tu de ce projet ?',
    a: [['大変（たいへん）よいと存（ぞん）じます。', 1, '存じる : « penser » humble et soigné.'], ['大変（たいへん）よいとお思（おも）いになります。', 0, 'お思いになる est respectueux : c’est ta pensée, donc humble.'], ['すごくいいと思（おも）うよ。', 0, 'Langage d’ami, pas de bureau.']] },
  { lv: 2, who: 'client', ctx: 'Tu dois passer chez le client demain.', line: 'では、明日（あした）お待（ま）ちしています。', fr: 'Bon, je vous attends demain.',
    a: [['はい、明日（あした）十時（じゅうじ）に伺（うかが）います。', 1, '伺う : je viens chez vous, et je vous élève.'], ['はい、明日（あした）十時（じゅうじ）にいらっしゃいます。', 0, 'いらっしゃる élève le sujet : ici, c’est toi qui viens.'], ['はい、明日（あした）十時（じゅうじ）に来（き）ます。', 0, 'Correct mais trop neutre face à un client.']] },
  { lv: 2, who: 'bucho', ctx: 'La directrice t’a offert un souvenir de voyage.', line: 'これ、お土産（みやげ）。どうぞ。', fr: 'Tiens, un petit souvenir.',
    a: [['ありがとうございます。遠慮（えんりょ）なくいただきます。', 1, 'いただく : recevoir / manger humble.'], ['ありがとうございます。遠慮（えんりょ）なく召（め）し上（あ）がります。', 0, '召し上がる est respectueux : jamais pour soi.'], ['ありがとう。もらうね。', 0, 'Trop familier.']] },
  { lv: 2, who: 'kacho', ctx: 'Tu veux demander au chef de relire ton e-mail.', line: '', fr: '',
    a: [['お忙（いそが）しいところすみませんが、このメールを確認（かくにん）していただけませんか。', 1, 'Coussin + ていただけませんか : la demande parfaite à un supérieur.'], ['このメールを確認（かくにん）してください。', 0, 'Correct grammaticalement, mais trop direct pour un chef.'], ['このメールを確認（かくにん）してくれる？', 0, 'Familier.']] },
  { lv: 2, who: 'bucho', ctx: 'La directrice t’explique une procédure. Tu veux qu’elle répète.', line: '', fr: '',
    a: [['恐（おそ）れ入（い）りますが、もう一度（いちど）おっしゃっていただけますか。', 1, 'おっしゃる (respect) + ていただけますか (demande humble).'], ['すみません、もう一度（いちど）申（もう）してください。', 0, '申す est humble : on ne l’emploie pas pour ce que dit un supérieur.'], ['え？もう一回（いっかい）言（い）って。', 0, 'Familier et brusque.']] },
  { lv: 2, who: 'shacho', ctx: 'Le président te demande si tu connais un client.', line: '石田（いしだ）様（さま）を知（し）っているかね。', fr: 'Connais-tu M. Ishida ?',
    a: [['はい、存（ぞん）じ上（あ）げております。', 1, '存じ上げる : connaître (une personne élevée), humble.'], ['はい、ご存（ぞん）じです。', 0, 'ご存じ est respectueux : il s’emploie pour l’autre.'], ['はい、知（し）ってるよ。', 0, 'Familier.']] },
  { lv: 2, who: 'client', ctx: 'Le client veut le document de présentation. Tu le lui remets.', line: '', fr: '',
    a: [['こちらが資料（しりょう）でございます。どうぞご覧（らん）ください。', 1, 'でございます + ご覧ください : parfait.'], ['これが資料（しりょう）です。拝見（はいけん）してください。', 0, '拝見する est humble : tu ne peux pas demander au client de s’abaisser.'], ['こちらが資料（しりょう）でいらっしゃいます。', 0, 'でいらっしゃる élève une personne, pas un document.']] },
  { lv: 2, who: 'kacho', ctx: 'Le chef a fini son repas.', line: '', fr: '',
    a: [['課長（かちょう）、もうお昼（ひる）は召（め）し上（あ）がりましたか。', 1, '召し上がる pour le repas d’un supérieur.'], ['課長（かちょう）、もうお昼（ひる）はいただきましたか。', 0, 'いただく : humble, pour soi.'], ['課長（かちょう）、もうお昼（ひる）は召（め）し上（あ）がられましたか。', 0, 'Double keigo : 召し上がる + られる.']] },
  // ---- Niveau 3
  { lv: 3, who: 'phone', ctx: 'Un client appelle et demande ta directrice, Takeda. Elle est sortie.', line: '武田（たけだ）部長（ぶちょう）はいらっしゃいますか。', fr: 'La directrice Takeda est-elle là ?',
    a: [['申（もう）し訳（わけ）ございません。武田（たけだ）はただいま外出（がいしゅつ）しております。', 1, 'ウチ・ソト : face au client, ta directrice est de ton camp. Pas de titre, et おる (humble).'], ['申（もう）し訳（わけ）ございません。武田（たけだ）部長（ぶちょう）はただいま外出（がいしゅつ）していらっしゃいます。', 0, 'Face à l’extérieur, on n’élève pas son propre supérieur.'], ['武田（たけだ）さんは今（いま）いません。', 0, 'さん sur son propre camp + trop sec.']] },
  { lv: 3, who: 'phone', ctx: 'Le client demande que ta directrice le rappelle.', line: '戻（もど）られたら、お電話（でんわ）をいただけますか。', fr: 'Pourra-t-elle me rappeler à son retour ?',
    a: [['かしこまりました。戻（もど）りましたら、武田（たけだ）からお電話（でんわ）いたします。', 1, 'Ton camp parle humblement au client : 戻る (neutre), お電話いたします.'], ['かしこまりました。お戻（もど）りになったら、武田（たけだ）部長（ぶちょう）がお電話（でんわ）なさいます。', 0, 'Respect pour sa propre directrice face à un client : erreur de ウチ・ソト.'], ['了解（りょうかい）です。伝（つた）えておきます。', 0, '了解 est trop désinvolte avec un client.']] },
  { lv: 3, who: 'kacho', ctx: 'Avant la réunion, tu veux savoir si le chef emporte le dossier.', line: '', fr: '',
    a: [['課長（かちょう）、このファイルも会議室（かいぎしつ）にお持（も）ちになりますか。', 1, 'Le chef porte : respect, お持ちになる.'], ['課長（かちょう）、このファイルも会議室（かいぎしつ）にお持（も）ちしますか。', 0, 'お持ちする est humble : tu demandes en fait si TOI tu portes.'], ['課長（かちょう）、このファイルも会議室（かいぎしつ）に持（も）って参（まい）りますか。', 0, '参る est humble : pas pour l’action d’un supérieur.']] },
  { lv: 3, who: 'client', ctx: 'Le client demande des détails techniques que tu ne connais pas.', line: '', fr: '',
    a: [['詳（くわ）しいことは担当（たんとう）の者（もの）にお聞（き）きください。', 1, 'Le client agit : お聞きください (respect).'], ['詳（くわ）しいことは担当者（たんとうしゃ）に伺（うかが）ってください。', 0, '伺う élève le responsable (ton camp) et abaisse le client.'], ['詳（くわ）しいことは担当者（たんとうしゃ）にお聞（き）きしてください。', 0, 'お聞きする est humble : on ne l’impose pas au client.']] },
  { lv: 3, who: 'client', ctx: 'Le client voit ton directeur arriver. Tu le présentes.', line: '', fr: '',
    a: [['ご紹介（しょうかい）いたします。部長（ぶちょう）の武田（たけだ）でございます。', 1, '« 部長の武田 » : titre devant, nom nu. Ton camp, donc でございます.'], ['ご紹介（しょうかい）いたします。武田（たけだ）部長（ぶちょう）でいらっしゃいます。', 0, 'Face au client, on n’élève pas sa directrice.'], ['こちらは武田（たけだ）様（さま）です。', 0, '様 sur quelqu’un de son propre camp : faute classique.']] },
  { lv: 3, who: 'client', ctx: 'Le client demande s’il peut payer par carte. C’est possible.', line: 'カードは使（つか）えますか。', fr: 'Puis-je payer par carte ?',
    a: [['はい、お使（つか）いになれます。', 1, 'Potentiel respectueux : お〜になれる.'], ['はい、お使（つか）いできます。', 0, 'お〜できる est le potentiel de l’HUMBLE : il ne marche pas pour le client.'], ['はい、使（つか）えるよ。', 0, 'Familier.']] },
  { lv: 3, who: 'bucho', ctx: 'La directrice vient de faire une belle présentation. Tu veux la remercier.', line: '', fr: '',
    a: [['分（わ）かりやすくご説明（せつめい）いただき、ありがとうございました。', 1, 'On remercie pour ce qu’on a reçu, sans « juger » sa supérieure.'], ['部長（ぶちょう）、説明（せつめい）がとてもお上手（じょうず）ですね。', 0, 'Complimenter les compétences d’un supérieur revient à l’évaluer : maladroit.'], ['部長（ぶちょう）、ご苦労様（くろうさま）でした。', 0, 'ご苦労様 : de haut en bas uniquement.']] },
  { lv: 3, who: 'shacho', ctx: 'Le président demande ce qu’a dit le chef Morimoto lors de la réunion.', line: '森本（もりもと）君（くん）は何（なん）と言（い）っていた？', fr: 'Qu’a dit Morimoto ?',
    a: [['森本（もりもと）課長（かちょう）は、予算（よさん）が足（た）りないとおっしゃっていました。', 1, 'En interne, on élève son chef même devant le président : おっしゃる.'], ['森本（もりもと）課長（かちょう）は、予算（よさん）が足（た）りないと申（もう）し上（あ）げていました。', 0, '申し上げる élèverait le président de façon maladroite pour une parole passée du chef.'], ['森本（もりもと）は、予算（よさん）が足（た）りないって。', 0, 'Familier et sans titre : c’est ton supérieur.']] },
  { lv: 3, who: 'client', ctx: 'Le client demande à rapporter un article acheté. Ce n’est pas possible.', line: '', fr: '',
    a: [['申（もう）し訳（わけ）ございませんが、返品（へんぴん）はお受（う）けいたしかねます。', 1, '〜かねます : refus très poli.'], ['返品（へんぴん）はできません。', 0, 'Correct mais sec face à un client.'], ['申（もう）し訳（わけ）ございませんが、返品（へんぴん）はお受（う）けしかねません。', 0, '〜かねません veut dire l’inverse : « il se pourrait bien que… ».']] },
  { lv: 3, who: 'client', ctx: 'Tu termines un e-mail à un client que tu connais déjà.', line: '', fr: '',
    a: [['今後（こんご）とも、よろしくお願（ねが）い申（もう）し上（あ）げます。', 1, 'お〜申し上げる : la formule la plus soignée de fin de lettre.'], ['これからもよろしくね。', 0, 'Familier.'], ['今後（こんご）とも、よろしくお願（ねが）いになります。', 0, 'お〜になる est respectueux : c’est TA demande.']] },
  { lv: 3, who: 'bucho', ctx: 'Tu veux partir plus tôt demain pour un rendez-vous médical.', line: '', fr: '',
    a: [['明日（あした）、病院（びょういん）に行（い）くため、早退（そうたい）させていただけないでしょうか。', 1, 'させていただく + demande indirecte : l’autorisation dépend d’elle.'], ['明日（あした）、早退（そうたい）させていただきます。', 0, 'Tu décides à sa place : il faut demander la permission.'], ['明日（あした）、早（はや）く帰（かえ）ってもいい？', 0, 'Familier.']] },
  { lv: 3, who: 'phone', ctx: 'Un inconnu appelle. Tu veux savoir qui il est.', line: 'もしもし、武田（たけだ）さんをお願（ねが）いします。', fr: 'Allô, je voudrais parler à Mme Takeda.',
    a: [['失礼（しつれい）ですが、どちら様（さま）でしょうか。', 1, 'どちら様でしょうか : la façon polie de demander qui appelle.'], ['あなたは誰（だれ）ですか。', 0, 'あなた + 誰 : direct et froid.'], ['失礼（しつれい）ですが、どなたでございますか。', 0, 'でございます est humble : pas pour parler de l’autre.']] },
  { lv: 3, who: 'client', ctx: 'Au restaurant d’affaires, tu demandes si la commande du client est complète.', line: '', fr: '',
    a: [['ご注文（ちゅうもん）の品（しな）は、以上（いじょう）でよろしいでしょうか。', 1, 'On ne met pas de respect sur une chose : 以上でよろしいでしょうか.'], ['ご注文（ちゅうもん）の品（しな）はおそろいになりましたでしょうか。', 0, 'お〜になる élève… la commande : le fameux keigo « manuel ».'], ['注文（ちゅうもん）はこれで全部（ぜんぶ）？', 0, 'Familier.']] },
];

// 作文・敬語 : [qui, contexte, phrase FR, réponses acceptées (annotées), formes clés, explication, erreurs reconnues [regex, message]]
const T = [
  { who: 'kacho', ctx: 'Ton chef te demande de faire des copies.', fr: 'Bien, c’est entendu.', hint: '承知（しょうち）いたしました・かしこまりました',
    a: ['承知（しょうち）いたしました', 'かしこまりました', 'はい、承知（しょうち）いたしました', 'はい、かしこまりました'],
    why: '承知いたしました / かしこまりました : accepter une consigne avec humilité.', bad: [['了解', '了解 est trop désinvolte face à un supérieur.']] },
  { who: 'client', ctx: 'Tu fais patienter un client.', fr: 'Veuillez patienter un instant.', hint: '少々（しょうしょう）・お〜ください',
    a: ['少々（しょうしょう）お待（ま）ちください', '少々（しょうしょう）お待（ま）ちくださいませ'],
    why: 'お〜ください : la demande respectueuse. 少々 est la version polie de ちょっと.', bad: [['おまちしてください', 'お〜する est humble : ×お待ちしてください.'], ['ちょっと', 'ちょっと est trop familier, dis 少々.']] },
  { who: 'client', ctx: 'Tu te présentes à un client.', fr: 'Je m’appelle Tanaka, du service commercial.', hint: '申（もう）す',
    a: ['営業部（えいぎょうぶ）の田中（たなか）と申（もう）します', '田中（たなか）と申（もう）します', '営業部（えいぎょうぶ）の田中（たなか）でございます'],
    why: '申す (humble) pour se présenter, ou でございます.', bad: [['おっしゃい', 'おっしゃる est respectueux : jamais pour soi.'], ['さま', 'On ne met jamais 様 à son propre nom.']] },
  { who: 'bucho', ctx: 'Tu demandes à ta directrice si elle a lu le rapport.', fr: 'Directrice, avez-vous lu le rapport ?', hint: 'ご覧（らん）になる',
    a: ['部長（ぶちょう）、報告書（ほうこくしょ）をご覧（らん）になりましたか', '報告書（ほうこくしょ）をご覧（らん）になりましたか', '部長（ぶちょう）、報告書（ほうこくしょ）はご覧（らん）になりましたか', '報告書（ほうこくしょ）はご覧（らん）になりましたか'],
    why: 'ご覧になる : le « voir / lire » respectueux pour l’action d’un supérieur.', bad: [['はいけん', '拝見する est humble : c’est pour TOI qui regardes.'], ['ごらんになられ', 'Double keigo : ご覧になる + られる.']] },
  { who: 'shacho', ctx: 'Tu proposes un café au président.', fr: 'Président, prendrez-vous un café ?', hint: '召（め）し上（あ）がる',
    a: ['社長（しゃちょう）、コーヒーを召（め）し上（あ）がりますか', 'コーヒーを召（め）し上（あ）がりますか', '社長（しゃちょう）、コーヒーはいかがですか', 'コーヒーはいかがですか', 'コーヒーをお召（め）し上（あ）がりになりますか'],
    why: '召し上がる (manger/boire respectueux), ou plus délicat : いかがですか.', bad: [['いただき', 'いただく est humble : c’est pour soi.']] },
  { who: 'client', ctx: 'Tu préviens le client que tu passeras demain.', fr: 'Je passerai chez vous demain à 10 h.', hint: '伺（うかが）う',
    a: ['明日（あした）十時（じゅうじ）に伺（うかが）います', '明日（みょうにち）十時（じゅうじ）に伺（うかが）います', '明日（あした）の十時（じゅうじ）に伺（うかが）います', '明日（あした）十時（じゅうじ）にお伺（うかが）いします'],
    why: '伺う : je vais chez vous, et je vous élève.', bad: [['いらっしゃ', 'いらっしゃる élève le sujet : ici c’est toi qui viens.'], ['まいり', '参る est poli mais n’élève pas le client : préfère 伺う.']] },
  { who: 'bucho', ctx: 'Ta directrice t’offre un souvenir.', fr: 'Merci beaucoup. Je l’accepte volontiers.', hint: 'いただく',
    a: ['ありがとうございます。遠慮（えんりょ）なくいただきます', 'ありがとうございます。ありがたくいただきます', 'ありがとうございます。いただきます'],
    why: 'いただく : recevoir (humble).', bad: [['めしあが', '召し上がる est respectueux : jamais pour soi.']] },
  { who: 'kacho', ctx: 'Tu demandes au chef de relire ton e-mail.', fr: 'Pourriez-vous vérifier cet e-mail, s’il vous plaît ?', hint: '〜ていただけませんか',
    a: ['このメールを確認（かくにん）していただけませんか', 'このメールをご確認（かくにん）いただけませんか', 'このメールを確認（かくにん）していただけますか', 'このメールをご確認（かくにん）いただけますか', 'このメールを確認（かくにん）していただけないでしょうか', 'このメールをご確認（かくにん）いただけないでしょうか'],
    why: '〜ていただけませんか : la demande humble et indirecte à un supérieur.', bad: [['してください$', 'してください est correct mais trop direct pour un chef.'], ['くれ', 'くれる est familier.']] },
  { who: 'client', ctx: 'Tu guides le client vers la salle de réunion.', fr: 'Je vous conduis à la salle de réunion.', hint: 'ご〜いたす',
    a: ['会議室（かいぎしつ）へご案内（あんない）いたします', '会議室（かいぎしつ）までご案内（あんない）いたします', '会議室（かいぎしつ）にご案内（あんない）いたします', '会議室（かいぎしつ）へご案内（あんない）します', '会議室（かいぎしつ）までご案内（あんない）します'],
    why: 'ご〜いたす (ou ご〜する) : humble, c’est toi qui guides.', bad: [['ごあんないになり', 'ご〜になる est respectueux : c’est TOI qui guides.']] },
  { who: 'phone', ctx: 'Un client demande ta directrice Takeda, qui est sortie.', fr: 'Je suis désolé, Takeda est sortie pour le moment.', hint: 'ウチ・ソト・おる',
    a: ['申（もう）し訳（わけ）ございません。武田（たけだ）はただいま外出（がいしゅつ）しております', '申（もう）し訳（わけ）ございません。武田（たけだ）は外出（がいしゅつ）しております', '申（もう）し訳（わけ）ありません。武田（たけだ）はただいま外出（がいしゅつ）しております'],
    why: 'ウチ・ソト : face à un client, ta directrice est de ton camp. Nom sans titre + おる (humble).', bad: [['ぶちょう', 'Pas de titre pour ton propre supérieur face à un client.'], ['いらっしゃ', 'On n’élève pas son propre camp face à l’extérieur.'], ['さん', 'Pas de さん pour quelqu’un de ton propre camp.']] },
  { who: 'kacho', ctx: 'Tu demandes au chef s’il emporte le dossier.', fr: 'Chef, emportez-vous aussi ce dossier ?', hint: 'お〜になる',
    a: ['課長（かちょう）、このファイルもお持（も）ちになりますか', 'このファイルもお持（も）ちになりますか', '課長（かちょう）、この資料（しりょう）もお持（も）ちになりますか', 'この資料（しりょう）もお持（も）ちになりますか'],
    why: 'C’est le chef qui porte : お持ちになる (respect).', bad: [['おもちします', 'お持ちする est humble : tu demandes en fait si TOI tu portes.']] },
  { who: 'bucho', ctx: 'Tu dois partir avant ta directrice.', fr: 'Je me retire avant vous.', hint: 'お先（さき）に・失礼（しつれい）いたします',
    a: ['お先（さき）に失礼（しつれい）いたします', 'お先（さき）に失礼（しつれい）します'],
    why: 'La formule consacrée pour quitter le bureau avant les autres.', bad: [['かえり', 'On ne dit pas simplement « je rentre » : utilise la formule お先に失礼いたします.']] },
  { who: 'client', ctx: 'Tu demandes son nom à un client.', fr: 'Excusez-moi, puis-je vous demander votre nom ?', hint: '恐（おそ）れ入（い）りますが・伺（うかが）う',
    a: ['恐（おそ）れ入（い）りますが、お名前（なまえ）を伺（うかが）ってもよろしいでしょうか', '恐（おそ）れ入（い）りますが、お名前（なまえ）を伺（うかが）ってもよろしいですか', '失礼（しつれい）ですが、お名前（なまえ）を伺（うかが）ってもよろしいでしょうか', '恐（おそ）れ入（い）りますが、お名前（なまえ）をお聞（き）きしてもよろしいでしょうか'],
    why: 'Coussin + 伺う (humble) + よろしいでしょうか.', bad: [['なんですか', 'Trop direct pour un client.']] },
  { who: 'shacho', ctx: 'Le président demande si tu connais M. Ishida.', fr: 'Oui, je le connais.', hint: '存（ぞん）じ上（あ）げる',
    a: ['はい、存（ぞん）じ上（あ）げております', 'はい、存（ぞん）じております', 'はい、存（ぞん）じ上（あ）げています'],
    why: '存じ上げる : connaître une personne élevée (humble).', bad: [['ごぞんじ', 'ご存じ est respectueux : pour l’autre.']] },
  { who: 'client', ctx: 'Tu remercies un client de sa venue.', fr: 'Merci d’être venu aujourd’hui.', hint: '本日（ほんじつ）・お越（こ）しいただく',
    a: ['本日（ほんじつ）はお越（こ）しいただき、ありがとうございます', '本日（ほんじつ）はお越（こ）しいただきありがとうございました', '本日（ほんじつ）はお越（こ）しくださり、ありがとうございます', '本日（ほんじつ）はお越（こ）しくださいまして、ありがとうございます', '本日（ほんじつ）はお越（こ）しいただきまして、ありがとうございます', '本日（ほんじつ）はお越（こ）しいただき、ありがとうございました'],
    why: 'お越しいただき (humble) ou お越しくださり (respect) : les deux sont corrects.', bad: [['きて', 'Trop neutre : utilise お越しいただく.']] },
  { who: 'bucho', ctx: 'Tu veux savoir quand ta directrice part à Osaka.', fr: 'Quand partez-vous à Osaka ?', hint: 'いらっしゃる',
    a: ['いつ大阪（おおさか）にいらっしゃいますか', 'いつ大阪（おおさか）へいらっしゃいますか', '大阪（おおさか）にはいつ行（い）かれますか', '大阪（おおさか）へはいついらっしゃいますか', '大阪（おおさか）にはいついらっしゃいますか', 'いつ大阪（おおさか）に行（い）かれますか'],
    why: 'いらっしゃる (ou 行かれる) pour le déplacement d’un supérieur.', bad: [['まいり', '参る est humble : jamais pour l’action d’un supérieur.'], ['うかがい', '伺う est humble : jamais pour l’action d’un supérieur.']] },
  { who: 'client', ctx: 'Tu refuses poliment un retour d’article.', fr: 'Je suis désolé, mais nous ne pouvons pas accepter les retours.', hint: '〜かねます',
    a: ['申（もう）し訳（わけ）ございませんが、返品（へんぴん）はお受（う）けいたしかねます', '申（もう）し訳（わけ）ございませんが、返品（へんぴん）はお受（う）けしかねます', '申（もう）し訳（わけ）ございませんが、返品（へんぴん）は承（うけたまわ）りかねます', '申（もう）し訳（わけ）ありませんが、返品（へんぴん）はお受（う）けしかねます'],
    why: '〜かねます : refus formel et feutré.', bad: [['かねません', '〜かねません veut dire l’inverse !'], ['できません', 'できません est correct mais sec : préfère 〜かねます.']] },
  { who: 'bucho', ctx: 'Tu veux partir plus tôt demain.', fr: 'Pourrais-je partir plus tôt demain ?', hint: '〜させていただく',
    a: ['明日（あした）、早退（そうたい）させていただけませんか', '明日（あした）、早退（そうたい）させていただけないでしょうか', '明日（あした）は早（はや）めに帰（かえ）らせていただけませんか', '明日（あした）、早退（そうたい）させていただいてもよろしいでしょうか', '明日（あした）、早退（そうたい）してもよろしいでしょうか', '明日（あした）、早（はや）めに帰（かえ）らせていただけないでしょうか'],
    why: 'させていただけませんか : la décision reste à ta directrice.', bad: [['させていただきます$', 'Tu décides à sa place : demande la permission.']] },
  { who: 'client', ctx: 'Tu informes le client que tu le recontacteras.', fr: 'Je vous contacterai dès que possible.', hint: 'ご〜いたす',
    a: ['できるだけ早（はや）くご連絡（れんらく）いたします', 'なるべく早（はや）くご連絡（れんらく）いたします', '早急（さっきゅう）にご連絡（れんらく）いたします', 'できるだけ早（はや）くご連絡（れんらく）します', 'すぐにご連絡（れんらく）いたします'],
    why: 'ご連絡いたします : humble et soigné.', bad: [['ごれんらくになり', 'ご〜になる est respectueux : c’est toi qui contactes.'], ['ごれんらくください', 'Ça, c’est demander au client de contacter.']] },
  { who: 'kacho', ctx: 'Tu demandes au chef de répéter.', fr: 'Pourriez-vous répéter, s’il vous plaît ?', hint: 'おっしゃる・〜ていただけますか',
    a: ['もう一度（いちど）おっしゃっていただけますか', 'もう一度（いちど）おっしゃっていただけませんか', '恐（おそ）れ入（い）りますが、もう一度（いちど）おっしゃっていただけますか', 'すみません、もう一度（いちど）おっしゃっていただけますか', 'もう一度（いちど）おっしゃっていただけないでしょうか'],
    why: 'おっしゃる (respect) + ていただけますか (demande humble).', bad: [['もうして', '申す est humble : pas pour ce que dit un supérieur.']] },
];

export default function salaryman(root, { settings, saveBest }) {
  const furi = settings.furigana !== 'never';
  let pool, i, score, trust, streak, best, lvl, timer = null;

  const head = hud => h('header.game-head', h('h1', h('span.jp-head', { lang: 'ja', html: jr('会社') }), 'Salaryman 「敬語」'), hud);

  function menu() {
    root.replaceChildren(head(null), h('section.sm-intro.card',
      h('div.sm-intro-art', { 'aria-hidden': 'true' }, h('span', { lang: 'ja' }, '敬'), h('i'), h('i'), h('i')),
      h('div',
        h('p.kicker', { lang: 'ja', html: ruby('サクラ商事（しょうじ）· 東京（とうきょう）', true) }),
        h('h2', 'Ton premier jour chez Sakura Shōji'),
        h('p', 'Tu viens d’être embauché. Toute la journée, ton chef, ta directrice, le président et les clients vont te parler : choisis la bonne réponse.'),
        h('ul',
          h('li', h('b', 'Leurs actions'), ' → respect (いらっしゃる, お〜になる…)'),
          h('li', h('b', 'Tes actions'), ' → humilité (伺う, お〜する, いたす…)'),
          h('li', h('b', 'Face à un client'), ' → ton chef fait partie de ton camp : pas de titre, langage humble'),
          h('li', 'Chaque bonne réponse fait monter la ', h('b', 'confiance'), '. Trois bévues avec le patron… et c’est la porte.')),
        h('a.small', { href: '#/keigo' }, 'Relire le guide du keigo ▶'),
        h('h3', 'Choisis ton poste'),
        h('div.sm-levels',
          [[1, '新人（しんじん）研修（けんしゅう）', 'Stage d’intégration', 'Salutations, formules, se présenter.'],
            [2, '営業部（えいぎょうぶ）', 'Service commercial', 'Respect et humilité au quotidien.'],
            [3, '本社（ほんしゃ）', 'Siège', 'ウチ・ソト, téléphone, pièges classiques.']].map(([l, jp, fr, d]) =>
            h('button.sm-level', { type: 'button', onclick: () => start(l) }, h('span', { lang: 'ja', html: ruby(jp, true) }), h('strong', fr), h('small', d)))),
        h('h3', 'Ou écris toi-même'),
        h('div.sm-levels', h('button.sm-level.sm-theme-btn', { type: 'button', onclick: startTheme },
          h('span', { lang: 'ja', html: ruby('作文（さくぶん）・敬語（けいご）', true) }), h('strong', 'Thème keigo'),
          h('small', 'Une phrase en français à dire à un supérieur ou un client : écris-la en japonais, en keigo.'))))));
  }

  function start(level) {
    lvl = level;
    const base = S.filter(s => s.lv <= level), top = S.filter(s => s.lv === level);
    pool = shuffle([...shuffle(top).slice(0, 7), ...shuffle(base.filter(s => s.lv < level)).slice(0, 3)]).slice(0, 10);
    if (pool.length < 10) pool = shuffle(base).slice(0, 10);
    i = 0; score = 0; trust = 50; streak = 0; best = 0; lives = 3;
    next();
  }
  let lives = 3;

  function next() {
    if (i >= pool.length || lives <= 0) return end();
    const sc = pool[i];
    const w = WHO[sc.who];
    const opts = shuffle(sc.a.map(([t, ok, why]) => ({ t, ok: !!ok, why })));
    const trustEl = h('i', { style: { width: `${trust}%` } });
    const hud = h('div.hud.sm-hud',
      h('span.sm-clock', h('b', TIMES[i] || '18:00'), h('small', `${i + 1}/${pool.length}`)),
      h('span.sm-trust', 'Confiance', h('span.sm-bar', trustEl)),
      h('span.sm-lives', { 'aria-label': `${lives} chances` }, ...[0, 1, 2].map(k => h('i', { class: k < lives ? 'on' : null }, '♦'))),
      h('span', 'Score ', h('b', String(score))));
    const card = h('div.sm-card');
    const feedback = h('div.sm-feedback', { 'aria-live': 'polite' });
    const buttons = opts.map((o, k) => h('button.sm-opt', { type: 'button', 'data-n': k + 1, onclick: () => choose(o, buttons[k]) },
      h('span.sm-key', String(k + 1)), h('span', { lang: 'ja', html: ruby(o.t, furi) })));
    card.append(
      h('div.sm-speaker', { style: { '--c': w.c } },
        h('div.sm-portrait', { 'aria-hidden': 'true' }, h('span', { lang: 'ja' }, w.k)),
        h('div', h('p.sm-who', { lang: 'ja', html: ruby(w.jp, true) }), h('p.sm-name', w.name), h('p.small', w.rank))),
      h('p.sm-ctx', sc.ctx),
      sc.line ? h('div.sm-bubble', h('p', { lang: 'ja', html: ruby(sc.line, furi) }), h('p.sm-fr', sc.fr)) : h('div.sm-bubble.you', h('p', 'À toi de parler…')),
      h('p.kicker', 'Ta réponse'),
      h('div.sm-opts', buttons),
      feedback);
    root.replaceChildren(head(hud), h('div.sm-stage', { style: { '--c': w.c } }, h('span.sm-bgk', { lang: 'ja', 'aria-hidden': 'true' }, w.k), card));
    play('card');
    const onKey = e => { const n = Number(e.key); if (n >= 1 && n <= buttons.length && !buttons[0].disabled) { e.preventDefault(); buttons[n - 1].click(); } };
    document.addEventListener('keydown', onKey);
    const off = () => document.removeEventListener('keydown', onKey);
    window.addEventListener('hashchange', off, { once: true });

    function choose(o, btn) {
      off();
      buttons.forEach(b => { b.disabled = true; });
      const good = opts.find(x => x.ok);
      buttons[opts.indexOf(good)].classList.add('correct');
      if (o.ok) {
        streak++; best = Math.max(best, streak);
        const gain = 100 + Math.min(streak - 1, 5) * 20;
        score += gain; trust = Math.min(100, trust + 8);
        play('correct'); hitFx(btn, { card, stamp: streak >= 3 ? `COMBO ×${streak}` : HIT_WORDS[Math.floor(Math.random() * HIT_WORDS.length)] });
        feedback.replaceChildren(h('p.sm-verdict.ok', { lang: 'ja' }, sc.who === 'client' || sc.who === 'phone' ? '「ありがとうございます。」' : '「うん、いいね。」'),
          h('p', o.why), h('p.small', `+${gain} points · confiance +8`));
      } else {
        streak = 0; trust = Math.max(0, trust - 15);
        if (sc.who === 'shacho' || sc.who === 'bucho' || sc.who === 'client') lives--;
        btn.classList.add('wrong'); play('wrong');
        card.classList.remove('sm-shake'); void card.offsetWidth; card.classList.add('sm-shake');
        feedback.replaceChildren(h('p.sm-verdict.ko', { lang: 'ja' }, sc.who === 'client' || sc.who === 'phone' ? '「……」' : '「ちょっと、それは……」'),
          h('p', h('strong', 'Pas ça : '), o.why),
          h('p', h('strong', 'Il fallait : '), h('span', { lang: 'ja', html: ruby(good.t, true) })), h('p.small', good.why));
      }
      trustEl.style.width = `${trust}%`;
      const nx = h('button.btn.primary', { type: 'button', onclick: () => { i++; next(); } }, i + 1 >= pool.length || lives <= 0 ? 'Fin de journée' : 'Suite ▶');
      feedback.append(h('div.actions.left', nx));
      setTimeout(() => nx.focus(), 50);
    }
  }

  function end() {
    const fired = lives <= 0;
    const g = fired ? 0 : Math.min(GRADES.length - 1, Math.floor(score / 220));
    const record = saveBest(fired ? 0 : score, `poste${lvl}`);
    root.replaceChildren(head(null), h('section.card.finish.sm-end', { class: fired ? 'card finish sm-end fired' : 'card finish sm-end' },
      h('p.kicker', { lang: 'ja', html: ruby(fired ? '解雇（かいこ）…' : 'お疲（つか）れ様（さま）でした！', true) }),
      h('h2', fired ? 'Convoqué chez le patron…' : 'Fin de la journée'),
      fired ? h('p', 'Trois bévues avec ta hiérarchie ou un client : le président te prie de revoir ton keigo. Courage, demain est un autre jour !')
        : h('div.sm-promo', h('small', 'Évaluation du jour'), h('b', { lang: 'ja', html: ruby(GRADES[g][0], true) }), h('span', GRADES[g][1])),
      h('p', `Score : ${score} · confiance ${trust} % · meilleure série : ${best}`),
      record ? h('p.small', 'Nouveau record !') : null,
      h('div.actions',
        h('button.btn.primary', { type: 'button', onclick: () => start(lvl) }, 'Nouvelle journée'),
        h('button.btn', { type: 'button', onclick: menu }, 'Changer de poste'),
        h('a.btn', { href: '#/keigo' }, 'Guide du keigo'),
        h('a.btn.ghost', { href: '#/jeux' }, 'Autres jeux'))));
    if (record) toast('新記録！ Nouveau record au bureau.');
    void timer;
  }

  // --- 作文・敬語 : phrase en français → japonais en keigo, écrit au clavier -------------------
  function startTheme() {
    pool = shuffle(T).slice(0, 8);
    i = 0; score = 0; streak = 0; best = 0; lvl = 'theme';
    nextTheme();
  }
  function nextTheme() {
    if (i >= pool.length) return endTheme();
    const t = pool[i], w = WHO[t.who];
    let tries = 0, hints = 0, done = false;
    const input = h('input.type-answer', { type: 'text', lang: 'ja', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: '敬語で…', 'aria-label': 'Ta phrase en japonais (keigo)' });
    const romajiBox = kanaKeyboardToggle(input, {
      get: () => { try { return St.getSettings().romaji ?? localStorage.getItem('sakura.theme.romaji') === '1'; } catch { return false; } },
      set: on => { try { localStorage.setItem('sakura.theme.romaji', on ? '1' : '0'); } catch {} St.setSettings({ romaji: on }); } });
    const fb = h('div.sm-feedback', { 'aria-live': 'polite' });
    const hintBox = h('div.sm-hints');
    const hintBtn = h('button.chip-btn', { type: 'button', onclick: () => {
      const steps = [() => h('p', h('strong', 'Formes à employer : '), h('span', { lang: 'ja', html: ruby(t.hint, true) })),
        () => h('p', h('strong', 'Début : '), h('span', { lang: 'ja' }, [...kana(t.a[0])].slice(0, Math.ceil([...kana(t.a[0])].length / 3)).join('') + '…'))];
      if (hints < steps.length) { hintBox.append(steps[hints++]()); play('cursor'); }
      if (hints >= steps.length) hintBtn.disabled = true;
      input.focus();
    } }, 'Indice');
    const giveBtn = h('button.chip-btn.ghost', { type: 'button', onclick: () => finish(false, true) }, 'Voir la réponse');
    const send = h('button.btn.primary', { type: 'button', onclick: () => check() }, 'Dire');
    smoothType(input);
    const scoreEl = h('b', String(score));
    const hud = h('div.hud.sm-hud', h('span.sm-clock', h('b', TIMES[i] || '18:00'), h('small', `${i + 1}/${pool.length}`)), h('span', 'Score ', scoreEl));
    const card = h('div.sm-card.sm-theme',
      h('div.sm-speaker', { style: { '--c': w.c } },
        h('div.sm-portrait', { 'aria-hidden': 'true' }, h('span', { lang: 'ja' }, w.k)),
        h('div', h('p.sm-who', { lang: 'ja', html: ruby(w.jp, true) }), h('p.sm-name', w.name), h('p.small', w.rank))),
      h('p.sm-ctx', t.ctx),
      h('div.sm-bubble.fr-say', h('small', 'Ce que tu veux dire'), h('p', t.fr)),
      h('p.kicker', 'Dis-le en japonais, en keigo'),
      h('div.answer-bar.sm-bar-in', input, send),
      h('div.type-tools', hintBtn, giveBtn, romajiBox),
      hintBox, fb);
    root.replaceChildren(head(hud), h('div.sm-stage', { style: { '--c': w.c } }, h('span.sm-bgk', { lang: 'ja', 'aria-hidden': 'true' }, w.k), card));
    play('card'); setTimeout(() => input.focus(), 60);
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); done ? nextBtn?.click() : check(); } });
    let nextBtn = null;
    function check() {
      const v = normJa(input.value.trim());
      if (!v) return input.focus();
      if (t.a.some(a => answerRegex(a).test(v))) return finish(true);
      tries++; play('wrong');
      card.classList.remove('sm-shake'); void card.offsetWidth; card.classList.add('sm-shake');
      const close = t.bad?.find(([re]) => new RegExp(re).test(v));
      fb.replaceChildren(h('p.sm-verdict.ko', { lang: 'ja' }, '「……」'),
        h('p', close ? close[1] : tries === 1 ? 'Pas tout à fait. Vérifie qui fait l’action (respect ou humilité ?) et la formule de politesse.' : 'Toujours pas. Prends un indice, ou regarde la réponse.'));
      if (tries >= 3) finish(false);
      else input.select();
    }
    function finish(ok, gaveUp = false) {
      done = true; input.readOnly = true; send.disabled = true; hintBtn.disabled = true; giveBtn.disabled = true;
      if (ok) {
        streak++; best = Math.max(best, streak);
        const gain = Math.max(40, 150 - tries * 40 - hints * 30) + Math.min(streak - 1, 5) * 15;
        score += gain; scoreEl.textContent = String(score);
        play('correct'); hitFx(input.closest('.answer-bar'), { card, stamp: streak >= 3 ? `COMBO ×${streak}` : HIT_WORDS[Math.floor(Math.random() * HIT_WORDS.length)] });
        fb.replaceChildren(h('p.sm-verdict.ok', { lang: 'ja' }, t.who === 'client' || t.who === 'phone' ? '「承知いたしました。」' : '「うん、完璧だ。」'),
          h('p', t.why), t.a.length > 1 ? h('p.small', 'Autres façons de le dire : ', h('span', { lang: 'ja', html: t.a.filter(a => !answerRegex(a).test(normJa(input.value))).map(a => ruby(a, true)).join(' ／ ') })) : null,
          h('p.small', `+${gain} points`));
      } else {
        streak = 0; play(gaveUp ? 'back' : 'wrong');
        fb.replaceChildren(h('p.sm-verdict.ko', { lang: 'ja' }, '「ちょっと、それは……」'),
          h('p', h('strong', 'On pouvait dire : '), h('span', { lang: 'ja', html: ruby(t.a[0], true) })),
          t.a.length > 1 ? h('p.small', 'Ou : ', h('span', { lang: 'ja', html: t.a.slice(1).map(a => ruby(a, true)).join(' ／ ') })) : null,
          h('p', t.why));
      }
      nextBtn = h('button.btn.primary', { type: 'button', onclick: () => { i++; nextTheme(); } }, i + 1 >= pool.length ? 'Fin de journée' : 'Suite ▶');
      fb.append(h('div.actions.left', nextBtn));
      setTimeout(() => nextBtn.focus(), 50);
    }
  }
  function endTheme() {
    const record = saveBest(score, 'theme');
    root.replaceChildren(head(null), h('section.card.finish.sm-end',
      h('p.kicker', { lang: 'ja', html: ruby('お疲（つか）れ様（さま）でした！', true) }),
      h('h2', 'Fin du thème keigo'),
      h('p', `Score : ${score} · meilleure série : ${best}`),
      record ? h('p.small', 'Nouveau record !') : null,
      h('div.actions',
        h('button.btn.primary', { type: 'button', onclick: startTheme }, 'Encore'),
        h('button.btn', { type: 'button', onclick: menu }, 'Menu'),
        h('a.btn', { href: '#/keigo' }, 'Guide du keigo'))));
  }

  menu();
}
