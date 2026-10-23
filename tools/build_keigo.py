#!/usr/bin/env python3
"""敬語 Keigo : points de grammaire, phrases à trous, vocabulaire et guide.

Ajoute (ou remplace) le niveau « keigo » dans data/grammar.json et data/sentences.json,
écrit data/vocab_keigo.json, data/vocab_ex_keigo.json et data/keigo_guide.json (à partir des CSV de tools/keigo/).
Usage : python3 tools/build_keigo.py
"""
import csv, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
SRC = os.path.join(ROOT, 'tools', 'keigo')
plain = lambda s: re.sub(r'（[^）]*）', '', s)

POINTS, SENTS = [], []
def P(pid, le, t, f, s, x):
    POINTS.append({'id': pid, 'o': pid, 'lv': 'keigo', 'le': le, 't': t, 'f': f, 's': s, 'x': x})
def S(gid, jp, fr, dis, fk):
    m = re.findall(r'\[([^\]]+)\]', jp)
    assert len(m) == 1, jp
    assert len(dis) == 3, jp
    a = plain(m[0])
    d = [plain(x) for x in dis]
    assert a not in d, jp
    assert fk in fr, (fk, fr)
    n = sum(1 for x in SENTS if x['g'] == gid) + 1
    SENTS.append({'id': f'k{gid}-{n}', 'g': gid, 'lv': 'keigo', 'jp': jp, 'fr': fr, 'a': a, 'd': d, 'af': m[0], 'df': dis, 'reg': 'p', 'fk': fk})

# ---------------------------------------------------------------------------------------------
# Leçon 1 · Les bases : 丁寧語 et 美化語
P(2001, 1, 'です・ます（丁寧語）', 'です・ます（丁寧語（ていねいご））', 'Forme polie de base : parler poliment à son interlocuteur',
  'Le 丁寧語 (« langage poli ») ne grandit personne : il rend simplement ta phrase polie envers la personne à qui tu parles. '
  'C’est le socle de tout le keigo : 尊敬語 et 謙譲語 s’emploient presque toujours avec です・ます.')
S(2001, '私（わたし）は営業部（えいぎょうぶ）の山田（やまだ）[です]。', 'Je suis Yamada, du service commercial.', ['だ', 'である', 'だった'], 'Je suis Yamada')
S(2001, '会議（かいぎ）は三時（さんじ）から[始（はじ）まります]。', 'La réunion commence à 15 h.', ['始（はじ）まる', '始（はじ）まった', '始（はじ）めます'], 'commence')
S(2001, '資料（しりょう）はもう[できました]。', 'Les documents sont déjà prêts.', ['できた', 'できる', 'できない'], 'sont déjà prêts')
S(2001, '明日（あした）は会社（かいしゃ）に[行（い）きません]。', 'Demain, je ne vais pas au bureau.', ['行（い）かない', '行（い）かなかった', '行（い）きました'], 'je ne vais pas')

P(2002, 1, '〜でございます', '〜でございます', 'Être (copule très polie, remplace です) ; ございます remplace あります',
  '(で)ございます est la version très soignée de です : on l’entend dans les grands magasins, à la réception d’un hôtel, au téléphone avec un client. '
  'ございます remplace aussi あります. Attention : でいらっしゃる est réservé aux personnes ; pour une chose, c’est でございます.')
S(2002, 'こちらが会議室（かいぎしつ）[でございます]。', 'Voici la salle de réunion.', ['でいらっしゃいます', 'であります', 'だ'], 'Voici la salle de réunion')
S(2002, 'お手洗（てあら）いは二階（にかい）に[ございます]。', 'Les toilettes sont au premier étage.', ['いらっしゃいます', 'おります', 'あるです'], 'sont au premier étage')
S(2002, '担当（たんとう）の佐藤（さとう）[でございます]。', 'Je suis Sato, la personne chargée du dossier.', ['でいらっしゃいます', 'さんです', '様（さま）です'], 'Je suis Sato')
S(2002, '何（なに）かご質問（しつもん）は[ございますか]。', 'Avez-vous des questions ?', ['いらっしゃいますか', 'おりますか', 'あるか'], 'Avez-vous des questions')

P(2003, 1, 'お／ご＋名詞（美化語・尊敬）', 'お／ご＋名詞（めいし）', 'Préfixe お (mot japonais) ou ご (mot sino-japonais) : embellit ou honore un nom',
  'お s’ajoute plutôt aux mots japonais (お名前, お手紙, お茶), ご aux mots sino-japonais (ご住所, ご家族, ご連絡). '
  'Sur ce qui appartient à l’autre (お名前), c’est du respect ; sur un objet neutre (お茶, お料理), c’est du 美化語 : juste plus élégant. '
  'On ne le met pas sur ses propres affaires (×私のお考え).')
S(2003, 'こちらに[お名前（なまえ）]をお書（か）きください。', 'Veuillez écrire votre nom ici.', ['ご名前（なまえ）', 'お名前（なまえ）様（さま）', '名前（なまえ）さん'], 'votre nom')
S(2003, '[ご住所（じゅうしょ）]を確認（かくにん）させていただけますか。', 'Puis-je vérifier votre adresse ?', ['お住所（じゅうしょ）', '住所（じゅうしょ）様（さま）', 'ご住所（じゅうしょ）さん'], 'votre adresse')
S(2003, '[ご家族（かぞく）]の皆様（みなさま）はお元気（げんき）ですか。', 'Votre famille va bien ?', ['お家族（かぞく）', '家族（かぞく）さん', 'ご家族（かぞく）さん'], 'Votre famille')
S(2003, '[お茶（ちゃ）]をお持（も）ちしました。', 'Je vous ai apporté du thé.', ['ご茶（ちゃ）', '茶（ちゃ）様（さま）', 'お茶（ちゃ）さん'], 'du thé')

P(2004, 1, '形容詞＋ございます', '形容詞（けいようし）＋ございます', 'Adjectif en い à la forme très polie (おいしゅうございます)',
  'Pour être très poli avec un adjectif en い, on modifie sa fin avant ございます : -ai → -ō (たかい → たこう), -ii → -yū (おいしい → おいしゅう), '
  '-ui → -ū (かるい → かるう), -oi → -ō (おもい → おもう). Rare dans la vie courante, mais toujours vivant dans les formules : ありがとうございます, おめでとうございます.')
S(2004, 'このお菓子（かし）は大変（たいへん）[おいしゅうございます]。', 'Ces gâteaux sont délicieux.', ['おいしいでございます', 'おいしゅうです', 'おいしくございます'], 'délicieux')
S(2004, '本日（ほんじつ）は少（すこ）し[寒（さむ）うございます]ね。', 'Il fait un peu froid aujourd’hui, n’est-ce pas ?', ['寒（さむ）いでございます', '寒（さむ）くございます', '寒（さむ）うです'], 'froid')
S(2004, 'お心遣（こころづか）い、まことに[ありがとうございます]。', 'Merci infiniment pour votre attention.', ['ありがたいでございます', 'ありがたくございます', 'ありがとうです'], 'Merci infiniment')

# Leçon 2 · 尊敬語 : verbes spéciaux (1)
P(2005, 2, 'いらっしゃる', 'いらっしゃる', 'Aller, venir, être là (respectueux)',
  'いらっしゃる remplace 行く, 来る et いる quand le sujet est une personne à élever (client, supérieur, professeur). '
  'Conjugaison : いらっしゃいます (jamais ×いらっしゃります). Jamais pour soi, ni pour quelqu’un de sa propre entreprise quand on parle à l’extérieur.')
S(2005, '社長（しゃちょう）は今（いま）、会議室（かいぎしつ）に[いらっしゃいます]。', 'Le président est en salle de réunion en ce moment.', ['おります', '参（まい）ります', 'いらっしゃります'], 'est en salle de réunion')
S(2005, '部長（ぶちょう）は明日（あした）大阪（おおさか）へ[いらっしゃる]そうです。', 'Il paraît que le directeur va à Osaka demain.', ['参（まい）る', '伺（うかが）う', 'おる'], 'va à Osaka')
S(2005, 'お客様（きゃくさま）が受付（うけつけ）に[いらっしゃいました]。', 'Un client est arrivé à l’accueil.', ['参（まい）りました', '伺（うかが）いました', 'おりました'], 'est arrivé')
S(2005, '先生（せんせい）、明日（あした）は大学（だいがく）に[いらっしゃいますか]。', 'Professeur, serez-vous à l’université demain ?', ['おりますか', '参（まい）りますか', 'いらっしゃりますか'], 'serez-vous à l’université')

P(2006, 2, 'おっしゃる', 'おっしゃる', 'Dire (respectueux)',
  'おっしゃる remplace 言う pour ce que dit une personne à élever. Comme いらっしゃる : おっしゃいます, おっしゃって. '
  'Pour ce que JE dis, on utilise 申す ou 申し上げる.')
S(2006, '部長（ぶちょう）が[おっしゃった]とおりに進（すす）めます。', 'Je procède comme l’a dit le directeur.', ['申（もう）した', '申（もう）し上（あ）げた', '言（い）われられた'], 'comme l’a dit le directeur')
S(2006, '失礼（しつれい）ですが、お名前（なまえ）は何（なん）と[おっしゃいますか]。', 'Excusez-moi, comment vous appelez-vous ?', ['申（もう）しますか', '申（もう）し上（あ）げますか', 'おっしゃりますか'], 'comment vous appelez-vous')
S(2006, '先生（せんせい）の[おっしゃる]ことはよく分（わ）かります。', 'Je comprends bien ce que vous dites, professeur.', ['申（もう）す', '申（もう）し上（あ）げる', 'おっしゃられる'], 'ce que vous dites')
S(2006, 'もう一度（いちど）[おっしゃって]いただけますか。', 'Pourriez-vous le répéter, s’il vous plaît ?', ['申（もう）して', '申（もう）し上（あ）げて', 'おっしゃられて'], 'le répéter')

P(2007, 2, 'なさる', 'なさる', 'Faire (respectueux)',
  'なさる remplace する. Conjugaison : なさいます, なさって, なさらない. Avec un nom sino-japonais : 検討なさる, ご心配なさる.')
S(2007, '週末（しゅうまつ）は何（なに）を[なさいますか]。', 'Que faites-vous ce week-end ?', ['いたしますか', 'なさりますか', 'させていただきますか'], 'Que faites-vous')
S(2007, '社長（しゃちょう）はゴルフを[なさる]そうです。', 'Il paraît que le président joue au golf.', ['いたす', 'なさられる', 'させていただく'], 'joue au golf')
S(2007, 'どうぞ、ご心配（しんぱい）[なさらないで]ください。', 'Je vous en prie, ne vous inquiétez pas.', ['いたさないで', 'なさらなくて', 'させないで'], 'ne vous inquiétez pas')
S(2007, '課長（かちょう）はもう出張（しゅっちょう）の準備（じゅんび）を[なさいました]か。', 'Le chef de section a-t-il déjà préparé son déplacement ?', ['いたしました', 'なさりました', 'させていただきました'], 'a-t-il déjà préparé')

P(2008, 2, '召し上がる', '召（め）し上（あ）がる', 'Manger, boire (respectueux)',
  '召し上がる remplace 食べる et 飲む pour une personne à élever. Pour offrir : どうぞ召し上がってください. Pour soi : いただく. '
  'お召し上がりください est un double keigo devenu courant et toléré ; ×召し上がられる reste maladroit.')
S(2008, 'どうぞ、温（あたた）かいうちに[召（め）し上（あ）がって]ください。', 'Je vous en prie, mangez-le pendant que c’est chaud.', ['いただいて', '召（め）し上（あ）がられて', '頂戴（ちょうだい）して'], 'mangez-le')
S(2008, '部長（ぶちょう）、コーヒーを[召（め）し上（あ）がります]か。', 'Directeur, prendrez-vous un café ?', ['いただきます', '召（め）し上（あ）がられます', '頂戴（ちょうだい）します'], 'prendrez-vous un café')
S(2008, 'お客様（きゃくさま）は何（なに）を[召（め）し上（あ）がりました]か。', 'Qu’a pris le client ?', ['いただきました', '召（め）し上（あ）がられました', '食（た）べさせていただきました'], 'Qu’a pris')

# Leçon 3 · 尊敬語 : verbes spéciaux (2)
P(2009, 3, 'ご覧になる', 'ご覧（らん）になる', 'Regarder, voir (respectueux)',
  'ご覧になる est la forme respectueuse de 見る. Pour inviter quelqu’un à regarder : ご覧ください. Pour soi : 拝見する.')
S(2009, 'こちらの資料（しりょう）を[ご覧（らん）ください]。', 'Veuillez regarder ce document.', ['拝見（はいけん）ください', 'お見（み）ください', 'ご覧（らん）になられてください'], 'Veuillez regarder')
S(2009, '社長（しゃちょう）はもう報告書（ほうこくしょ）を[ご覧（らん）になりました]か。', 'Le président a-t-il déjà lu le rapport ?', ['拝見（はいけん）しました', 'お見（み）になりました', 'ご覧（らん）になられました'], 'a-t-il déjà lu le rapport')
S(2009, '昨日（きのう）のニュースを[ご覧（らん）になりました]か。', 'Avez-vous vu les informations d’hier ?', ['拝見（はいけん）しました', 'お見（み）になりました', 'ご覧（らん）になられました'], 'Avez-vous vu')

P(2010, 3, 'ご存じだ', 'ご存（ぞん）じだ', 'Savoir, connaître (respectueux)',
  'ご存じ(です) remplace 知っている quand il s’agit de l’autre. Question type : ご存じですか. '
  'Pour soi, on dit 存じております (savoir une chose) ou 存じ上げております (connaître une personne).')
S(2010, 'この件（けん）について[ご存（ぞん）じです]か。', 'Êtes-vous au courant de cette affaire ?', ['存（ぞん）じております', '存（ぞん）じ上（あ）げます', 'ご存（ぞん）じになります'], 'Êtes-vous au courant')
S(2010, '部長（ぶちょう）は田中（たなか）さんを[ご存（ぞん）じ]でしょうか。', 'Le directeur connaît-il M. Tanaka ?', ['存（ぞん）じ上（あ）げ', '存（ぞん）じ', 'お知（し）り'], 'connaît-il')
S(2010, '駅（えき）までの道（みち）を[ご存（ぞん）じです]か。', 'Connaissez-vous le chemin jusqu’à la gare ?', ['存（ぞん）じております', '存（ぞん）じ上（あ）げます', 'ご存（ぞん）じになります'], 'Connaissez-vous le chemin')

P(2011, 3, 'くださる', '下（くだ）さる', 'Donner (à moi, à nous), faire pour moi (respectueux)',
  'くださる remplace くれる : une personne élevée fait ou donne quelque chose pour moi. Forme polie : くださいます (pas ×くださります). '
  'Le sujet prend が : 部長が教えてくださった. Vu de mon côté, le pendant humble est いただく (部長に教えていただいた).')
S(2011, '部長（ぶちょう）がこの本（ほん）を[くださいました]。', 'Le directeur m’a donné ce livre.', ['いただきました', '差（さ）し上（あ）げました', 'くださりました'], 'm’a donné')
S(2011, '先生（せんせい）が丁寧（ていねい）に教（おし）えて[くださいました]。', 'Le professeur m’a expliqué avec soin.', ['いただきました', '差（さ）し上（あ）げました', 'くださりました'], 'm’a expliqué')
S(2011, 'お忙（いそが）しいところ、お越（こ）し[くださり]ありがとうございます。', 'Merci d’être venu malgré votre emploi du temps chargé.', ['さしあげ', 'いたし', '申（もう）し上（あ）げ'], 'd’être venu')

P(2012, 3, 'お休みになる・お召しになる', 'お休（やす）みになる・お召（め）しになる', 'Dormir, se coucher / porter un vêtement (respectueux)',
  'Deux formes irrégulières : お休みになる (寝る, dormir) et お召しになる (着る, porter un vêtement). '
  'On les entend surtout envers des clients, à l’hôtel, ou envers des personnes âgées.')
S(2012, '昨夜（ゆうべ）はよく[お休（やす）みになれました]か。', 'Avez-vous bien dormi cette nuit ?', ['お休（やす）みできました', '休（やす）まれられました', 'お寝（ね）になれました'], 'Avez-vous bien dormi')
S(2012, '社長（しゃちょう）はもう[お休（やす）みになりました]。', 'Le président est déjà allé se coucher.', ['お休（やす）みしました', 'お寝（ね）になりました', '休（やす）ませていただきました'], 'est déjà allé se coucher')
S(2012, '素敵（すてき）な着物（きもの）を[お召（め）しになって]いますね。', 'Vous portez un très beau kimono.', ['お着（き）になって', '召（め）し上（あ）がって', 'お召（め）しして'], 'Vous portez')

# Leçon 4 · 尊敬語 : formes régulières
P(2013, 4, 'お〜になる', 'お〜になる', 'Faire (respectueux) : お + radical en ます + になる',
  'La forme respectueuse la plus courante pour les verbes japonais : 待つ → お待ちになる, 帰る → お帰りになる, 書く → お書きになる. '
  'Elle ne marche pas avec les verbes au radical d’une seule syllabe (見る, 寝る, いる) : on prend alors les verbes spéciaux (ご覧になる, お休みになる, いらっしゃる).')
S(2013, '部長（ぶちょう）はもう[お帰（かえ）りになりました]。', 'Le directeur est déjà rentré.', ['お帰（かえ）りしました', '帰（かえ）られになりました', 'お帰（かえ）りになられました'], 'est déjà rentré')
S(2013, '社長（しゃちょう）がこの手紙（てがみ）を[お書（か）きになりました]。', 'C’est le président qui a écrit cette lettre.', ['お書（か）きしました', '書（か）かれになりました', 'お書（か）きになられました'], 'a écrit cette lettre')
S(2013, 'お客様（きゃくさま）、どのくらい[お待（ま）ちになりました]か。', 'Combien de temps avez-vous attendu ?', ['お待（ま）ちしました', '待（ま）たれになりました', 'お待（ま）ちになられました'], 'avez-vous attendu')
S(2013, '先生（せんせい）はいつ日本（にほん）に[お戻（もど）りになります]か。', 'Professeur, quand rentrerez-vous au Japon ?', ['お戻（もど）りします', '戻（もど）られになります', 'お戻（もど）りになられます'], 'quand rentrerez-vous')

P(2014, 4, 'ご〜になる', 'ご〜になる', 'Faire (respectueux) avec un nom sino-japonais : ご + nom + になる',
  'Pour les verbes en する d’origine chinoise : 利用する → ご利用になる, 出席する → ご出席になる, 説明する → ご説明になる. '
  'Attention : ご〜する est HUMBLE. Seules ご〜になる (et 〜なさる) sont respectueuses.')
S(2014, '社長（しゃちょう）は明日（あした）の会議（かいぎ）に[ご出席（しゅっせき）になります]。', 'Le président assistera à la réunion de demain.', ['ご出席（しゅっせき）します', 'ご出席（しゅっせき）いたします', 'ご出席（しゅっせき）になられます'], 'assistera à la réunion')
S(2014, '部長（ぶちょう）が新（あたら）しい計画（けいかく）を[ご説明（せつめい）になりました]。', 'Le directeur a présenté le nouveau projet.', ['ご説明（せつめい）しました', 'ご説明（せつめい）いたしました', 'ご説明（せつめい）になられました'], 'a présenté le nouveau projet')
S(2014, '先生（せんせい）はよくこの図書館（としょかん）を[ご利用（りよう）になります]。', 'Le professeur utilise souvent cette bibliothèque.', ['ご利用（りよう）します', 'ご利用（りよう）いたします', 'ご利用（りよう）になられます'], 'utilise souvent')

P(2015, 4, '〜(ら)れる（尊敬）', '〜(ら)れる（尊敬（そんけい））', 'Forme respectueuse en れる・られる (identique au passif)',
  'On peut rendre presque tout verbe respectueux avec la forme passive : 行く → 行かれる, 読む → 読まれる, 来る → 来られる, する → される. '
  'C’est un peu moins élevé que お〜になる ou les verbes spéciaux, mais très courant à l’oral et dans la presse. On n’y ajoute rien d’autre (×お読みになられる).')
S(2015, '社長（しゃちょう）は何時（なんじ）に[来（こ）られます]か。', 'À quelle heure vient le président ?', ['来（こ）られられます', '参（まい）られます', '来（こ）させます'], 'vient le président')
S(2015, '部長（ぶちょう）はこの本（ほん）を[読（よ）まれました]か。', 'Le directeur a-t-il lu ce livre ?', ['お読（よ）みされました', '読（よ）まされました', '読（よ）まれられました'], 'a-t-il lu ce livre')
S(2015, '課長（かちょう）は来月（らいげつ）、新（あたら）しいプロジェクトを[始（はじ）められる]そうです。', 'Il paraît que le chef de section lance un nouveau projet le mois prochain.', ['始（はじ）めさせる', '始（はじ）められられる', 'お始（はじ）めする'], 'lance un nouveau projet')
S(2015, '田中（たなか）先生（せんせい）は毎朝（まいあさ）散歩（さんぽ）を[されます]。', 'Le professeur Tanaka fait une promenade chaque matin.', ['いたします', 'させます', 'されられます'], 'fait une promenade')

P(2016, 4, 'お〜です', 'お〜です', 'Être en train de / avoir (respectueux) : お + radical + です',
  'Forme courte et très courante pour décrire l’état ou l’action d’une personne à élever : お待ちです (attend), '
  'お出かけです (est sorti), お持ちですか (avez-vous… ?), お急ぎですか (êtes-vous pressé ?).')
S(2016, 'お客様（きゃくさま）が受付（うけつけ）で[お待（ま）ちです]。', 'Un client attend à l’accueil.', ['お待（ま）ちします', '待（ま）ちでございます', 'お待（ま）ちいたします'], 'attend à l’accueil')
S(2016, '会員（かいいん）カードを[お持（も）ちです]か。', 'Avez-vous une carte de membre ?', ['お持（も）ちします', 'お持（も）ちいたします', '持（も）ちでございます'], 'Avez-vous une carte')
S(2016, '[お急（いそ）ぎです]か。でしたら、こちらへどうぞ。', 'Êtes-vous pressé ? Alors, par ici, je vous prie.', ['お急（いそ）ぎします', 'お急（いそ）ぎいたします', '急（いそ）ぎでございます'], 'Êtes-vous pressé')

# Leçon 5 · Demander poliment
P(2017, 5, 'お〜ください・ご〜ください', 'お〜ください・ご〜ください', 'Veuillez faire ~ (demande respectueuse)',
  'Version polie de 〜てください : お + radical + ください (お待ちください, お入りください), ご + nom + ください (ご記入ください, ご確認ください). '
  'Indispensable avec les clients. Erreur fréquente : ×ご確認してください (ご〜する est humble).')
S(2017, '少々（しょうしょう）[お待（ま）ちください]。', 'Veuillez patienter un instant.', ['お待（ま）ちしてください', 'お待（ま）ちいたしてください', '待（ま）たれてください'], 'Veuillez patienter')
S(2017, 'こちらに[ご記入（きにゅう）ください]。', 'Veuillez remplir ici.', ['ご記入（きにゅう）してください', 'お記入（きにゅう）ください', 'ご記入（きにゅう）いたしてください'], 'Veuillez remplir')
S(2017, '内容（ないよう）を[ご確認（かくにん）ください]。', 'Veuillez vérifier le contenu.', ['ご確認（かくにん）してください', 'お確認（かくにん）ください', '確認（かくにん）させてください'], 'Veuillez vérifier')
S(2017, 'どうぞ、中（なか）へ[お入（はい）りください]。', 'Je vous en prie, entrez.', ['お入（はい）りしてください', 'ご入（はい）りください', '入（はい）られてください'], 'entrez')

P(2018, 5, '〜ていただけませんか', '〜ていただけませんか', 'Pourriez-vous ~ ? (demande humble)',
  'Pour demander un service à un supérieur, on évite l’ordre direct. 〜ていただけませんか / 〜ていただけますか (« pourrais-je recevoir de vous le fait de… ») '
  'est la forme la plus naturelle au bureau. Encore plus doux : 〜ていただけないでしょうか.')
S(2018, 'すみませんが、この書類（しょるい）を[見（み）ていただけませんか]。', 'Excusez-moi, pourriez-vous jeter un œil à ce document ?', ['見（み）てさしあげませんか', '見（み）ていただきませんか', '見（み）てもらいませんか'], 'pourriez-vous jeter un œil')
S(2018, 'お手数（てすう）ですが、もう一度（いちど）[説明（せつめい）していただけますか]。', 'Désolé de vous déranger, pourriez-vous m’expliquer encore une fois ?', ['説明（せつめい）してさしあげますか', '説明（せつめい）していただきますか', '説明（せつめい）してあげますか'], 'pourriez-vous m’expliquer')
S(2018, '明日（あした）までにお返事（へんじ）を[いただけないでしょうか]。', 'Pourrais-je avoir votre réponse d’ici demain ?', ['いたさないでしょうか', '申（もう）し上（あ）げないでしょうか', '拝見（はいけん）しないでしょうか'], 'Pourrais-je avoir votre réponse')

P(2019, 5, '〜てもよろしいでしょうか', '〜てもよろしいでしょうか', 'Puis-je ~ ? (demande de permission très polie)',
  'Version polie de 〜てもいいですか : よろしい est le keigo de いい, et 〜でしょうか adoucit encore la question. '
  'Pour plus d’humilité : 〜させていただいてもよろしいでしょうか.')
S(2019, 'こちらの席（せき）に座（すわ）っても[よろしいでしょうか]。', 'Puis-je m’asseoir à cette place ?', ['よろしくでしょうか', 'いいでございますか', 'よろしいでいらっしゃいますか'], 'Puis-je m’asseoir')
S(2019, '今日（きょう）は少（すこ）し早（はや）めに帰（かえ）っても[よろしいでしょうか]。', 'Puis-je partir un peu plus tôt aujourd’hui ?', ['よろしくでしょうか', 'いいでございますか', 'よろしいでいらっしゃいますか'], 'Puis-je partir')
S(2019, '窓（まど）を開（あ）けても[よろしいですか]。', 'Puis-je ouvrir la fenêtre ?', ['よろしいでございますか', 'いいでございますか', 'よろしくですか'], 'Puis-je ouvrir')

P(2020, 5, 'お〜いただく・ご〜いただく', 'お〜いただく・ご〜いただく', 'Recevoir la faveur que quelqu’un fasse ~ (humble, très courant)',
  'Tournure humble centrée sur le bienfait reçu : ご利用いただきありがとうございます (merci d’utiliser…), お越しいただき (merci d’être venu). '
  'Le pendant respectueux (ご利用くださり, お越しくださり) est tout aussi correct. Au potentiel : ご提出いただけますか (pourriez-vous remettre…).')
S(2020, '本日（ほんじつ）はご来店（らいてん）[いただき]、ありがとうございます。', 'Merci d’être venu dans notre magasin aujourd’hui.', ['さしあげ', 'いたし', '申（もう）し上（あ）げ'], 'Merci d’être venu')
S(2020, 'いつも弊社（へいしゃ）の製品（せいひん）を[ご利用（りよう）いただき]、ありがとうございます。', 'Merci d’utiliser toujours les produits de notre société.', ['ご利用（りよう）し', 'ご利用（りよう）いたし', 'ご利用（りよう）になり'], 'd’utiliser toujours')
S(2020, '書類（しょるい）は明日（あした）までに[ご提出（ていしゅつ）いただけます]か。', 'Pourriez-vous remettre les documents d’ici demain ?', ['ご提出（ていしゅつ）できます', 'ご提出（ていしゅつ）いたせます', 'ご提出（ていしゅつ）さしあげます'], 'Pourriez-vous remettre')

# Leçon 6 · 謙譲語Ⅰ : verbes spéciaux
P(2021, 6, '伺う', '伺（うかが）う', 'Rendre visite, demander, écouter (humble)',
  '伺う est humble : il élève la personne VERS qui va mon action (celle chez qui je vais, à qui je demande, que j’écoute). '
  'Trois sens : 訪ねる (visiter), 聞く / 尋ねる (demander, écouter). À ne jamais utiliser pour l’action du client : ×担当者に伺ってください → 担当者にお聞きください.')
S(2021, '明日（あした）の午後（ごご）、御社（おんしゃ）に[伺（うかが）います]。', 'Je passerai dans votre société demain après-midi.', ['いらっしゃいます', 'お越（こ）しになります', '参（まい）られます'], 'Je passerai dans votre société')
S(2021, 'ちょっと[伺（うかが）いたい]ことがあるのですが。', 'J’aurais quelque chose à vous demander.', ['お聞（き）きになりたい', 'おっしゃりたい', '伺（うかが）われたい'], 'à vous demander')
S(2021, '先生（せんせい）のお話（はなし）を[伺（うかが）って]、とても勉強（べんきょう）になりました。', 'Écouter votre exposé, professeur, m’a beaucoup appris.', ['お聞（き）きになって', '拝見（はいけん）して', 'おっしゃって'], 'Écouter votre exposé')

P(2022, 6, '申し上げる', '申（もう）し上（あ）げる', 'Dire (humble, vers une personne élevée)',
  '申し上げる est le « dire » humble qui élève celui à qui l’on parle : お礼を申し上げます, お詫び申し上げます. '
  'Il sert aussi dans お〜申し上げる (plus formel encore que お〜する). Pour se présenter, c’est 申す (山田と申します), pas 申し上げる.')
S(2022, '心（こころ）よりお礼（れい）[申（もう）し上（あ）げます]。', 'Je vous remercie du fond du cœur.', ['おっしゃいます', '申（もう）されます', 'お言（い）いします'], 'Je vous remercie')
S(2022, '部長（ぶちょう）に一言（ひとこと）[申（もう）し上（あ）げたい]ことがあります。', 'J’ai un mot à dire au directeur.', ['おっしゃりたい', '申（もう）されたい', '言（い）われたい'], 'J’ai un mot à dire')
S(2022, 'ご迷惑（めいわく）をおかけして、深（ふか）くお詫（わ）び[申（もう）し上（あ）げます]。', 'Je vous présente mes plus sincères excuses pour le désagrément.', ['なさいます', 'おっしゃいます', 'くださいます'], 'Je vous présente mes plus sincères excuses')

P(2023, 6, '拝見する', '拝見（はいけん）する', 'Voir, regarder, lire (humble)',
  '拝見する est le 見る humble : je regarde quelque chose qui appartient à une personne élevée (son document, son billet, sa lettre). '
  'Pour l’autre : ご覧になる. ×拝見なさる mélange humble et respect.')
S(2023, 'お手紙（てがみ）、[拝見（はいけん）しました]。', 'J’ai lu votre lettre.', ['ご覧（らん）になりました', 'お見（み）しました', '拝見（はいけん）なさいました'], 'J’ai lu votre lettre')
S(2023, '恐（おそ）れ入（い）りますが、チケットを[拝見（はいけん）します]。', 'Excusez-moi, je vais regarder votre billet.', ['ご覧（らん）になります', 'ご覧（らん）ください', '拝見（はいけん）なさいます'], 'je vais regarder votre billet')
S(2023, '資料（しりょう）を[拝見（はいけん）しても]よろしいでしょうか。', 'Puis-je consulter le document ?', ['ご覧（らん）になっても', 'ご覧（らん）しても', '拝見（はいけん）なさっても'], 'Puis-je consulter')

P(2024, 6, 'いただく', '頂（いただ）く', 'Recevoir ; manger, boire (humble)',
  'いただく remplace もらう (recevoir d’une personne élevée) et, pour soi, 食べる / 飲む. La personne qui donne prend に : 部長に本をいただいた. '
  '〜ていただく : recevoir un service de quelqu’un (部長に教えていただいた).')
S(2024, '部長（ぶちょう）にお土産（みやげ）を[いただきました]。', 'J’ai reçu un souvenir du directeur.', ['くださいました', '差（さ）し上（あ）げました', 'いただかれました'], 'J’ai reçu un souvenir')
S(2024, 'では、遠慮（えんりょ）なく[いただきます]。', 'Alors je me sers, sans façon.', ['召（め）し上（あ）がります', '召（め）し上（あ）がらせます', 'くださいます'], 'je me sers')
S(2024, '課長（かちょう）に書類（しょるい）をチェックして[いただきました]。', 'Le chef de section a bien voulu vérifier mes documents.', ['くださいました', '差（さ）し上（あ）げました', 'さしあげられました'], 'a bien voulu vérifier mes documents')

P(2025, 6, '差し上げる', '差（さ）し上（あ）げる', 'Donner, offrir (humble)',
  '差し上げる remplace あげる quand on donne à une personne élevée. '
  'Attention : 〜てさしあげる (« faire pour l’autre ») sonne condescendant devant la personne elle-même ; on préfère お〜する (お持ちします plutôt que 持ってさしあげます).')
S(2025, 'お客様（きゃくさま）に資料（しりょう）を[差（さ）し上（あ）げました]。', 'J’ai remis les documents au client.', ['くださいました', 'いただきました', 'あげられました'], 'J’ai remis les documents')
S(2025, '先生（せんせい）に花束（はなたば）を[差（さ）し上（あ）げたい]と思（おも）います。', 'J’aimerais offrir un bouquet au professeur.', ['くださりたい', 'いただきたい', 'お差（さ）し上（あ）げしたい'], 'offrir un bouquet')
S(2025, 'よろしければ、こちらのカタログを[差（さ）し上（あ）げます]。', 'Si vous le souhaitez, je vous offre ce catalogue.', ['くださいます', 'いただきます', '差（さ）し上（あ）げられます'], 'je vous offre')

P(2026, 6, 'お目にかかる', 'お目（め）にかかる', 'Rencontrer (humble)',
  'お目にかかる est le 会う humble : rencontrer une personne élevée. Formule classique : お目にかかれて光栄です (je suis honoré de vous rencontrer). '
  'Son cousin « montrer » : お目にかける / ご覧に入れる.')
S(2026, '社長（しゃちょう）に[お目（め）にかかる]のは初（はじ）めてです。', 'C’est la première fois que je rencontre le président.', ['お会（あ）いになる', 'お目（め）にかかられる', 'ご覧（らん）になる'], 'je rencontre le président')
S(2026, '[お目（め）にかかれて]光栄（こうえい）です。', 'Je suis honoré de vous rencontrer.', ['お会（あ）いになれて', 'お目（め）にかけて', 'ご覧（らん）になれて'], 'de vous rencontrer')
S(2026, '来週（らいしゅう）[お目（め）にかかれる]のを楽（たの）しみにしております。', 'Je me réjouis de vous rencontrer la semaine prochaine.', ['お会（あ）いになれる', 'お目（め）にかけられる', 'お見（み）えになれる'], 'de vous rencontrer la semaine prochaine')

P(2027, 6, '存じ上げる・拝借する', '存（ぞん）じ上（あ）げる・拝借（はいしゃく）する', 'Connaître (une personne) / emprunter (humble)',
  '存じ上げる : connaître une personne élevée (お名前は存じ上げております). 拝借する : emprunter à une personne élevée (ペンを拝借してもよろしいですか). '
  'Deux verbes humbles très « bureau ».')
S(2027, '先生（せんせい）のお名前（なまえ）はよく[存（ぞん）じ上（あ）げております]。', 'Je connais bien votre nom, professeur.', ['ご存（ぞん）じです', '存（ぞん）じ上（あ）げられます', 'ご存（ぞん）じ上（あ）げております'], 'Je connais bien votre nom')
S(2027, 'ペンを[拝借（はいしゃく）しても]よろしいでしょうか。', 'Pourrais-je vous emprunter un stylo ?', ['お借（か）りになっても', '拝借（はいしゃく）なさっても', 'お貸（か）しになっても'], 'vous emprunter un stylo')
S(2027, 'この資料（しりょう）、少（すこ）し[拝借（はいしゃく）できます]か。', 'Pourrais-je emprunter ce document un instant ?', ['お借（か）りになれます', '拝借（はいしゃく）なさいます', 'ご借（か）りできます'], 'emprunter ce document')

# Leçon 7 · 謙譲語Ⅰ : formes régulières
P(2028, 7, 'お〜する', 'お〜する', 'Faire (humble) pour quelqu’un : お + radical en ます + する',
  'Je fais quelque chose POUR une personne élevée : お持ちします, お送りします, お伝えします. Il faut une personne bénéficiaire : '
  '×お乗りする (monter dans un train) ne marche pas. Jamais pour demander ce que fait l’autre : ×課長、お持ちしますか → お持ちになりますか.')
S(2028, 'お荷物（にもつ）を[お持（も）ちします]。', 'Je vais porter vos bagages.', ['お持（も）ちになります', 'お持（も）ちなさいます', '持（も）たれます'], 'Je vais porter vos bagages')
S(2028, '資料（しりょう）は明日（あした）メールで[お送（おく）りします]。', 'Je vous enverrai les documents demain par e-mail.', ['お送（おく）りになります', '送（おく）られます', 'お送（おく）りなさいます'], 'Je vous enverrai les documents')
S(2028, '部長（ぶちょう）にはそのように[お伝（つた）えします]。', 'Je le transmettrai ainsi au directeur.', ['お伝（つた）えになります', '伝（つた）えられます', 'お伝（つた）えなさいます'], 'Je le transmettrai')
S(2028, '駅（えき）まで車（くるま）で[お送（おく）りしましょう]か。', 'Voulez-vous que je vous raccompagne en voiture jusqu’à la gare ?', ['お送（おく）りになりましょう', '送（おく）られましょう', 'お送（おく）りなさいましょう'], 'que je vous raccompagne')

P(2029, 7, 'ご〜する・ご〜いたす', 'ご〜する・ご〜いたす', 'Faire (humble) avec un nom sino-japonais : ご + nom + する / いたす',
  'Pour les verbes sino-japonais : ご案内する, ご説明する, ご連絡いたします. ご〜いたす est à la fois humble (Ⅰ) et soigné (Ⅱ) : '
  'c’est la forme reine du service client. Ne la confonds pas avec ご〜になる (respect).')
S(2029, '会議室（かいぎしつ）まで[ご案内（あんない）します]。', 'Je vous conduis jusqu’à la salle de réunion.', ['ご案内（あんない）になります', 'ご案内（あんない）なさいます', 'ご案内（あんない）されます'], 'Je vous conduis')
S(2029, '結果（けっか）が出（で）ましたら、すぐに[ご連絡（れんらく）いたします]。', 'Dès que nous aurons le résultat, je vous contacterai.', ['ご連絡（れんらく）になります', 'ご連絡（れんらく）なさいます', 'ご連絡（れんらく）くださいます'], 'je vous contacterai')
S(2029, '新（あたら）しいサービスについて[ご説明（せつめい）いたします]。', 'Je vais vous présenter notre nouveau service.', ['ご説明（せつめい）になります', 'ご説明（せつめい）なさいます', 'ご説明（せつめい）されます'], 'Je vais vous présenter')

P(2030, 7, 'お〜申し上げる', 'お〜申（もう）し上（あ）げる', 'Faire (humble, très formel) : お／ご〜申し上げる',
  'Version la plus solennelle de お〜する, réservée aux lettres officielles, aux discours et aux grandes excuses : '
  'お祈り申し上げます, お喜び申し上げます, ご案内申し上げます.')
S(2030, '皆様（みなさま）のご健康（けんこう）を[お祈（いの）り申（もう）し上（あ）げます]。', 'Je vous souhaite à tous une bonne santé.', ['お祈（いの）りになります', 'お祈（いの）りくださいます', 'お祈（いの）りなさいます'], 'Je vous souhaite')
S(2030, 'ご入学（にゅうがく）を心（こころ）より[お喜（よろこ）び申（もう）し上（あ）げます]。', 'Je vous félicite de tout cœur pour votre entrée à l’école.', ['お喜（よろこ）びになります', 'お喜（よろこ）びくださいます', '喜（よろこ）ばれます'], 'Je vous félicite')
S(2030, '今後（こんご）とも、よろしく[お願（ねが）い申（もう）し上（あ）げます]。', 'Je compte sur votre bienveillance à l’avenir.', ['お願（ねが）いになります', 'お願（ねが）いくださいます', 'お願（ねが）いなさいます'], 'Je compte sur votre bienveillance')

P(2031, 7, '〜させていただく', '〜させていただく', 'Se permettre de ~ (avec la permission de l’autre)',
  '〜させていただく : je fais quelque chose avec la permission (réelle ou supposée) de l’autre, et j’en tire un bienfait : '
  '休ませていただけますか, コピーを取らせていただきます. Très (trop) répandu : sans permission ni bienfait, 〜いたします est plus sobre (発表いたします).')
S(2031, '明日（あした）、休（やす）ませて[いただけません]か。', 'Pourrais-je prendre congé demain ?', ['さしあげません', 'いたしません', 'おりません'], 'Pourrais-je prendre congé')
S(2031, 'こちらの資料（しりょう）をコピーさせて[いただきます]。', 'Je me permets de photocopier ce document.', ['くださいます', 'さしあげます', 'なさいます'], 'Je me permets de photocopier')
S(2031, '本日（ほんじつ）、司会（しかい）を[務（つと）めさせていただきます]田中（たなか）です。', 'Je suis Tanaka, et j’ai l’honneur d’animer la séance aujourd’hui.', ['務（つと）めさせてくださる', '務（つと）めていただきます', 'お務（つと）めになります'], 'j’ai l’honneur d’animer')

# Leçon 8 · 謙譲語Ⅱ (丁重語)
P(2032, 8, '参る', '参（まい）る', 'Aller, venir (humble II : poli envers l’interlocuteur)',
  '参る présente MON déplacement de façon soignée à mon interlocuteur, sans élever la destination : 明日大阪へ参ります. '
  'C’est la différence avec 伺う, qui élève la personne chez qui l’on va. 参る s’emploie avec ます, et jamais pour l’action de l’autre (×どちらから参りましたか).')
S(2032, '明日（あした）から出張（しゅっちょう）で福岡（ふくおか）へ[参（まい）ります]。', 'À partir de demain, je pars en déplacement à Fukuoka.', ['いらっしゃいます', 'お越（こ）しになります', '参（まい）られます'], 'je pars en déplacement')
S(2032, 'ただいま担当者（たんとうしゃ）が[参（まい）ります]ので、少々（しょうしょう）お待（ま）ちください。', 'Le responsable arrive tout de suite, veuillez patienter un instant.', ['いらっしゃいます', 'お見（み）えになります', '伺（うかが）われます'], 'Le responsable arrive')
S(2032, '電車（でんしゃ）が[参（まい）ります]。白線（はくせん）の内側（うちがわ）までお下（さ）がりください。', 'Le train arrive. Veuillez reculer derrière la ligne blanche.', ['いらっしゃいます', 'お見（み）えになります', '伺（うかが）います'], 'Le train arrive')

P(2033, 8, '申す', '申（もう）す', 'Dire, s’appeler (humble II)',
  '申す : MON « dire », présenté poliment à l’interlocuteur. Surtout pour se présenter (山田と申します) '
  'et pour rapporter à l’extérieur les paroles de son propre camp (田中もそう申しておりました).')
S(2033, 'はじめまして、山田（やまだ）と[申（もう）します]。', 'Enchanté, je m’appelle Yamada.', ['おっしゃいます', '申（もう）されます', '申（もう）し上（あ）げます'], 'je m’appelle Yamada')
S(2033, '父（ちち）もそのように[申（もう）して]おりました。', 'Mon père disait la même chose.', ['おっしゃって', '申（もう）されて', '言（い）われて'], 'Mon père disait')
S(2033, '弊社（へいしゃ）の社長（しゃちょう）もよろしくと[申（もう）して]おりました。', 'Notre président vous transmet aussi ses salutations.', ['おっしゃって', '申（もう）されて', '申（もう）し上（あ）げられて'], 'vous transmet aussi ses salutations')

P(2034, 8, 'いたす', '致（いた）す', 'Faire (humble II)',
  'いたす remplace する pour SES propres actions : 私がいたします, 失礼いたします, よろしくお願いいたします. '
  'Avec お／ご (ご案内いたします), c’est la forme la plus utilisée en entreprise.')
S(2034, 'その仕事（しごと）は私（わたし）が[いたします]。', 'Ce travail, c’est moi qui m’en charge.', ['なさいます', 'されます', 'いたされます'], 'c’est moi qui m’en charge')
S(2034, 'では、お先（さき）に[失礼（しつれい）いたします]。', 'Bon, je me retire avant vous.', ['失礼（しつれい）なさいます', '失礼（しつれい）されます', '失礼（しつれい）くださいます'], 'je me retire avant vous')
S(2034, '今後（こんご）ともよろしくお願（ねが）い[いたします]。', 'Je compte sur vous à l’avenir aussi.', ['なさいます', 'くださいます', 'されます'], 'Je compte sur vous')

P(2035, 8, 'おる・〜ております', 'おる・〜ております', 'Être, se trouver ; être en train de (humble II)',
  'おる remplace いる pour soi et son camp : 私は会社におります, 〜ております (〜ている soigné). '
  'Classique au téléphone : 田中は席を外しております (Tanaka n’est pas à son poste).')
S(2035, '私（わたし）は三時（さんじ）まで会社（かいしゃ）に[おります]。', 'Je suis au bureau jusqu’à 15 h.', ['いらっしゃいます', 'おいでになります', 'お見（み）えです'], 'Je suis au bureau')
S(2035, '申（もう）し訳（わけ）ございません、田中（たなか）はただいま席（せき）を外（はず）して[おります]。', 'Je suis désolé, Tanaka s’est absenté de son poste pour le moment.', ['いらっしゃいます', 'おいでになります', 'なさっています'], 's’est absenté de son poste')
S(2035, 'ご連絡（れんらく）をお待（ま）ちして[おります]。', 'J’attends de vos nouvelles.', ['いらっしゃいます', 'おいでです', 'なさいます'], 'J’attends de vos nouvelles')

P(2036, 8, '存じる', '存（ぞん）じる', 'Savoir, penser (humble II)',
  '存じる (surtout 存じております / 存じません) présente MON savoir ou MA pensée de façon soignée : その件は存じております, 大変うれしく存じます. '
  'Pour connaître une personne élevée : 存じ上げる.')
S(2036, 'その件（けん）については[存（ぞん）じて]おります。', 'Je suis au courant de cette affaire.', ['ご存（ぞん）じで', '存（ぞん）じ上（あ）げられて', '知（し）られて'], 'Je suis au courant')
S(2036, '申（もう）し訳（わけ）ございませんが、[存（ぞん）じません]。', 'Je suis désolé, mais je ne sais pas.', ['ご存（ぞん）じません', '知（し）りませんでございます', 'ご存（ぞん）じでいらっしゃいません'], 'je ne sais pas')
S(2036, 'お会（あ）いできて、大変（たいへん）うれしく[存（ぞん）じます]。', 'Je suis très heureux de vous rencontrer.', ['ご存（ぞん）じです', '存（ぞん）じ上（あ）げられます', 'お思（おも）いになります'], 'Je suis très heureux')

# Leçon 9 · Au bureau
P(2037, 9, 'クッション言葉', 'クッション言葉（ことば）', 'Formules « coussin » qui adoucissent une demande ou un refus',
  'Avant de demander ou de refuser, on pose un « coussin » : 恐れ入りますが (excusez-moi de vous déranger), お手数ですが (désolé pour la peine), '
  '申し訳ございませんが (je suis désolé mais), あいにく (malheureusement). Sans lui, une demande paraît brusque.')
S(2037, '[恐（おそ）れ入（い）りますが]、お名前（なまえ）を伺（うかが）ってもよろしいでしょうか。', 'Excusez-moi, puis-je vous demander votre nom ?', ['お疲（つか）れ様（さま）ですが', 'ご苦労様（くろうさま）ですが', '恐（おそ）れ入（い）りましたから'], 'Excusez-moi')
S(2037, '[お手数（てすう）ですが]、こちらにご記入（きにゅう）ください。', 'Désolé pour la peine, mais veuillez remplir ici.', ['ご苦労（くろう）ですが', 'お手数（てすう）でしたら', 'お世話様（せわさま）ですが'], 'Désolé pour la peine')
S(2037, '[あいにく]、部長（ぶちょう）の田中（たなか）は外出中（がいしゅつちゅう）でございます。', 'Malheureusement, notre directeur Tanaka est en déplacement.', ['せっかく', 'わざわざ', 'さっそく'], 'Malheureusement')

P(2038, 9, '〜かねます', '〜かねます', 'Ne pas pouvoir ~ (refus très poli)',
  '〜かねます (radical + かねる) est un refus formel et feutré : いたしかねます (je ne peux pas le faire), 分かりかねます (je ne saurais vous dire). '
  'Bien plus doux que できません au service client. Piège : 〜かねません veut dire l’inverse (« il se pourrait bien que… »).')
S(2038, '申（もう）し訳（わけ）ございませんが、ご返品（へんぴん）はお受（う）けし[かねます]。', 'Je suis désolé, mais nous ne pouvons pas accepter le retour.', ['かねません', 'がたいです', 'かねるです'], 'nous ne pouvons pas accepter le retour')
S(2038, 'その件（けん）については、私（わたくし）では分（わ）かり[かねます]。', 'Sur ce point, je ne saurais vous répondre.', ['かねません', 'かねられます', 'かねるです'], 'je ne saurais vous répondre')
S(2038, '恐（おそ）れ入（い）りますが、お電話（でんわ）でのご予約（よやく）は承（うけたまわ）り[かねます]。', 'Désolé, nous ne pouvons pas prendre de réservation par téléphone.', ['かねません', 'かねられます', 'かねでございます'], 'nous ne pouvons pas prendre de réservation')

P(2039, 9, 'ウチ・ソト', 'ウチ・ソト', 'Face à l’extérieur, on n’élève pas les gens de son propre camp',
  'Avec un client ou un partenaire (ソト), ton supérieur fait partie de ton camp (ウチ) : on le nomme sans titre ni さん (田中は…, 部長の田中は…) '
  'et on parle de lui avec l’humble (おります, 申しております, 参ります). En interne au contraire, on l’élève : 田中部長はいらっしゃいますか.')
S(2039, '申（もう）し訳（わけ）ございません、[田中（たなか）]はただいま外出（がいしゅつ）しております。', '(Au téléphone, à un client) Je suis désolé, Tanaka est sorti pour le moment.', ['田中（たなか）部長（ぶちょう）', '田中（たなか）さん', '田中様（たなかさま）'], 'Tanaka est sorti')
S(2039, '部長（ぶちょう）の田中（たなか）も、そのように[申（もう）しておりました]。', '(À un client) Tanaka, notre directeur, le disait aussi.', ['おっしゃっていました', '言（い）われていました', 'お話（はな）しになっていました'], 'le disait aussi')
S(2039, '担当（たんとう）の鈴木（すずき）がすぐに[参（まい）ります]。', '(À un client) Suzuki, la personne en charge, arrive tout de suite.', ['いらっしゃいます', 'お見（み）えになります', 'おいでになります'], 'arrive tout de suite')
S(2039, '田中（たなか）部長（ぶちょう）は今日（きょう）[いらっしゃいます]か。', '(En interne, à un collègue) Le directeur Tanaka est-il là aujourd’hui ?', ['おりますか', '参（まい）りますか', '伺（うかが）いますか'], 'est-il là aujourd’hui')

P(2040, 9, '弊社・御社・貴社', '弊社（へいしゃ）・御社（おんしゃ）・貴社（きしゃ）', 'Notre société (humble) / votre société (oral / écrit)',
  '弊社 (へいしゃ) : notre société, en s’abaissant. 御社 (おんしゃ) : votre société, à l’oral. 貴社 (きしゃ) : votre société, à l’écrit (lettres, CV). '
  'Erreur classique : dire 貴社 en entretien, ou écrire 御社 dans une lettre.')
S(2040, '[弊社（へいしゃ）]の新製品（しんせいひん）をご紹介（しょうかい）いたします。', 'Je vais vous présenter le nouveau produit de notre société.', ['御社（おんしゃ）', '貴社（きしゃ）', '御社様（おんしゃさま）'], 'de notre société')
S(2040, '[御社（おんしゃ）]を志望（しぼう）した理由（りゆう）は二（ふた）つあります。', '(En entretien, à l’oral) J’ai deux raisons de postuler dans votre entreprise.', ['弊社（へいしゃ）', '貴社（きしゃ）', '御社様（おんしゃさま）'], 'dans votre entreprise')
S(2040, '[貴社（きしゃ）]ますますご清栄（せいえい）のこととお喜（よろこ）び申（もう）し上（あ）げます。', '(Dans une lettre) Nous nous réjouissons de la prospérité toujours croissante de votre société.', ['弊社（へいしゃ）', '御社（おんしゃ）', '当社（とうしゃ）'], 'de votre société')

P(2041, 9, 'かしこまりました・承知いたしました', 'かしこまりました・承知（しょうち）いたしました', 'C’est entendu, bien reçu (réponse humble à une demande)',
  'Pour accepter la demande d’un client ou d’un supérieur : かしこまりました ou 承知いたしました. Pour une commande ou un message : 承りました. '
  '了解しました passe entre collègues mais paraît désinvolte vers un supérieur ; 分かりました est simplement neutre.')
S(2041, '部長（ぶちょう）：「この資料（しりょう）、コピーしておいて。」私（わたし）：「はい、[承知（しょうち）いたしました]。」', 'Directeur : « Fais-moi des copies de ce document. » Moi : « Bien, c’est entendu. »', ['了解（りょうかい）です', 'ご苦労様（くろうさま）です', '承知（しょうち）なさいました'], 'c’est entendu')
S(2041, 'お客様（きゃくさま）：「コーヒーを一（ひと）つください。」店員（てんいん）：「[かしこまりました]。」', 'Client : « Un café, s’il vous plaît. » Serveur : « Très bien. »', ['了解（りょうかい）しました', '分（わ）かったです', '承知（しょうち）なさいました'], 'Très bien')
S(2041, 'ご依頼（いらい）の件（けん）、確（たし）かに[承（うけたまわ）りました]。', 'Nous avons bien pris note de votre demande.', ['お受（う）けになりました', '受（う）けられました', '承（うけたまわ）られました'], 'bien pris note')

# Leçon 10 · Les pièges
P(2042, 10, '二重敬語に注意', '二重敬語（にじゅうけいご）に注意（ちゅうい）', 'Double keigo à éviter (×お読みになられる)',
  'On ne met qu’UNE forme de respect par verbe : お読みになる OU 読まれる, mais pas ×お読みになられる (お〜になる + られる). '
  'Quelques exceptions sont passées dans l’usage (お召し上がりになる, お伺いする). Dans le doute, choisis la forme la plus simple.')
S(2042, '社長（しゃちょう）はこの資料（しりょう）を[お読（よ）みになりました]。', 'Le président a lu ce document.', ['お読（よ）みになられました', 'お読（よ）まれになりました', 'お読（よ）みになさいました'], 'a lu ce document')
S(2042, 'お客様（きゃくさま）が[おっしゃった]ように、すぐに対応（たいおう）いたします。', 'Comme vous l’avez dit, nous allons nous en occuper tout de suite.', ['おっしゃられた', 'お言（い）いになられた', '申（もう）された'], 'Comme vous l’avez dit')
S(2042, '先生（せんせい）は明日（あした）[いらっしゃいます]か。', 'Professeur, viendrez-vous demain ?', ['いらっしゃられます', 'おいでになられます', 'お越（こ）しになられます'], 'viendrez-vous demain')
S(2042, '部長（ぶちょう）、もうお昼（ひる）は[召（め）し上（あ）がりました]か。', 'Directeur, avez-vous déjà déjeuné ?', ['召（め）し上（あ）がられました', 'お召（め）し上（あ）がりになられました', '召（め）し上（あ）がりになりました'], 'avez-vous déjà déjeuné')

P(2043, 10, '尊敬語と謙譲語の取り違え', '尊敬語（そんけいご）と謙譲語（けんじょうご）の取（と）り違（ちが）え', 'Ne pas confondre respect (pour l’autre) et humilité (pour soi)',
  'Question à se poser : QUI fait l’action ? Si c’est l’autre → 尊敬語 (お〜になる, いらっしゃる). Si c’est moi → 謙譲語 (お〜する, 伺う). '
  'Erreurs typiques : ×課長、お持ちしますか (= est-ce que JE porte ?) ; ×担当者に伺ってください (伺う élève le responsable, pas le client).')
S(2043, '課長（かちょう）、このファイルも会議室（かいぎしつ）に[お持（も）ちになります]か。', 'Chef, emportez-vous aussi ce dossier en salle de réunion ?', ['お持（も）ちします', 'お持（も）ちいたします', '持（も）って参（まい）ります'], 'emportez-vous aussi ce dossier')
S(2043, '詳（くわ）しいことは担当者（たんとうしゃ）に[お聞（き）き]ください。', 'Pour les détails, veuillez vous adresser au responsable.', ['伺（うかが）って', 'お聞（き）きして', '拝聴（はいちょう）して'], 'veuillez vous adresser au responsable')
S(2043, 'お客様（きゃくさま）、どちらから[いらっしゃいました]か。', 'D’où venez-vous ?', ['参（まい）りました', '伺（うかが）いました', 'おりました'], 'D’où venez-vous')
S(2043, '明日（あした）、私（わたし）が御社（おんしゃ）へ[伺（うかが）います]。', 'Demain, c’est moi qui viendrai dans votre société.', ['いらっしゃいます', 'お越（こ）しになります', 'お見（み）えになります'], 'c’est moi qui viendrai')

P(2044, 10, 'くださる（が）・いただく（に）', 'くださる（が）・いただく（に）', 'くださる avec が, いただく avec に',
  'Même faveur, deux points de vue : 部長が教えてくださった (le directeur m’a appris ; sujet : le directeur) / '
  '部長に教えていただいた (j’ai reçu son enseignement ; sujet : moi). Erreur fréquente : ×部長が教えていただいた.')
S(2044, '部長（ぶちょう）[が]丁寧（ていねい）に教（おし）えてくださいました。', 'Le directeur m’a expliqué avec soin.', ['に', 'を', 'で'], 'Le directeur m’a expliqué')
S(2044, '部長（ぶちょう）[に]丁寧（ていねい）に教（おし）えていただきました。', 'J’ai été formé avec soin par le directeur.', ['が', 'を', 'で'], 'par le directeur')
S(2044, 'お客様（きゃくさま）がアンケートに答（こた）えて[くださいました]。', 'Le client a bien voulu répondre au questionnaire.', ['いただきました', 'さしあげました', 'くださりました'], 'a bien voulu répondre')
S(2044, 'お客様（きゃくさま）にアンケートに答（こた）えて[いただきました]。', 'Nous avons obtenu que le client réponde au questionnaire.', ['くださいました', 'さしあげました', 'いただかれました'], 'que le client réponde')

P(2045, 10, 'お〜になれる（尊敬の可能）', 'お〜になれる（尊敬（そんけい）の可能（かのう））', 'Pouvoir faire (respectueux) : お〜になれる, et non ×お〜できる',
  'Pour dire qu’un client PEUT faire quelque chose : on met d’abord au respectueux, puis au potentiel → お使いになれます, ご利用になれます. '
  '×ご利用できます est le potentiel de l’HUMBLE (« je peux vous servir »), donc incorrect pour l’action du client.')
S(2045, 'こちらのカードは全国（ぜんこく）のお店（みせ）で[お使（つか）いになれます]。', 'Vous pouvez utiliser cette carte dans tous nos magasins du pays.', ['お使（つか）いできます', 'お使（つか）いになられます', '使（つか）わせていただけます'], 'Vous pouvez utiliser cette carte')
S(2045, 'このサービスは会員（かいいん）の方（かた）のみ[ご利用（りよう）になれます]。', 'Seuls les membres peuvent utiliser ce service.', ['ご利用（りよう）できます', 'ご利用（りよう）いたせます', 'ご利用（りよう）させられます'], 'peuvent utiliser ce service')
S(2045, 'お客様（きゃくさま）、こちらからは[ご乗車（じょうしゃ）になれません]。', 'Vous ne pouvez pas monter par ici.', ['ご乗車（じょうしゃ）できません', 'ご乗車（じょうしゃ）いたせません', 'ご乗車（じょうしゃ）させません'], 'Vous ne pouvez pas monter')

P(2046, 10, '〜におかれましては・〜かたがた', '〜におかれましては・〜かたがた', 'Quant à vous (ultra formel) / à l’occasion de, en profitant pour',
  'Deux tournures écrites très cérémonieuses : 皆様におかれましては (quant à vous tous, en tête de lettre) '
  'et ご挨拶かたがた (tout en profitant de l’occasion pour vous saluer). On les croise dans les lettres d’affaires et les discours.')
S(2046, '皆様（みなさま）[におかれましては]、ますますご健勝（けんしょう）のこととお喜（よろこ）び申（もう）し上（あ）げます。', 'Nous nous réjouissons de vous savoir tous en excellente santé.', ['にとりましては', 'につきましては', 'にございましては'], 'de vous savoir tous')
S(2046, '近（ちか）いうちに、ご挨拶（あいさつ）[かたがた]お伺（うかが）いいたします。', 'Je passerai prochainement, en profitant de l’occasion pour vous saluer.', ['ついでに', 'ばかりに', 'ものの'], 'en profitant de l’occasion pour vous saluer')
S(2046, '先日（せんじつ）のお礼（れい）[かたがた]、近況（きんきょう）をご報告（ほうこく）いたします。', 'Je vous écris pour vous remercier de l’autre jour et vous donner de mes nouvelles.', ['ながらも', 'つつ', 'ばかりか'], 'pour vous remercier')

# ---------------------------------------------------------------------------------------------
# Vocabulaire keigo : [unité, mot, lecture annotée, sens, exemple, traduction, passage FR]
VOCAB = [
  (1, 'いらっしゃる', 'いらっしゃる', 'aller, venir, être (respectueux)', '社長（しゃちょう）は会議室（かいぎしつ）にいらっしゃいます。', 'Le président est en salle de réunion.', 'est en salle de réunion'),
  (1, 'おっしゃる', 'おっしゃる', 'dire (respectueux)', '先生（せんせい）がおっしゃったとおりです。', 'C’est exactement comme vous l’avez dit, professeur.', 'comme vous l’avez dit'),
  (1, 'なさる', 'なさる', 'faire (respectueux)', '週末（しゅうまつ）は何（なに）をなさいますか。', 'Que faites-vous ce week-end ?', 'Que faites-vous'),
  (1, '召し上がる', '召（め）し上（あ）がる', 'manger, boire (respectueux)', 'どうぞ召（め）し上（あ）がってください。', 'Je vous en prie, servez-vous.', 'servez-vous'),
  (1, 'ご覧になる', 'ご覧（らん）になる', 'regarder, voir (respectueux)', 'こちらの資料（しりょう）をご覧（らん）になりましたか。', 'Avez-vous regardé ce document ?', 'Avez-vous regardé'),
  (1, 'ご存じ', 'ご存（ぞん）じ', 'savoir, connaître (respectueux)', 'この件（けん）をご存（ぞん）じですか。', 'Êtes-vous au courant de cette affaire ?', 'Êtes-vous au courant'),
  (1, 'くださる', 'くださる', 'donner (à moi), faire pour moi (respectueux)', '部長（ぶちょう）が本（ほん）をくださいました。', 'Le directeur m’a donné un livre.', 'm’a donné'),
  (1, 'お見えになる', 'お見（み）えになる', 'venir, arriver (respectueux)', 'お客様（きゃくさま）がお見（み）えになりました。', 'Le client est arrivé.', 'est arrivé'),
  (1, 'お越しになる', 'お越（こ）しになる', 'venir, se rendre quelque part (respectueux)', '明日（あした）は何時（なんじ）にお越（こ）しになりますか。', 'À quelle heure viendrez-vous demain ?', 'viendrez-vous'),
  (1, 'お休みになる', 'お休（やす）みになる', 'dormir, se coucher (respectueux)', '社長（しゃちょう）はもうお休（やす）みになりました。', 'Le président est déjà couché.', 'est déjà couché'),
  (1, 'お召しになる', 'お召（め）しになる', 'porter un vêtement (respectueux)', '素敵（すてき）なお着物（きもの）をお召（め）しになっていますね。', 'Vous portez un très beau kimono.', 'Vous portez'),
  (1, 'おいでになる', 'おいでになる', 'aller, venir, être (respectueux)', '先生（せんせい）は研究室（けんきゅうしつ）においでになります。', 'Le professeur est dans son bureau.', 'est dans son bureau'),
  (2, '伺う', '伺（うかが）う', 'rendre visite, demander, écouter (humble)', '明日（あした）御社（おんしゃ）に伺（うかが）います。', 'Je passerai dans votre société demain.', 'Je passerai dans votre société'),
  (2, '申し上げる', '申（もう）し上（あ）げる', 'dire (humble, vers une personne élevée)', '心（こころ）よりお礼（れい）申（もう）し上（あ）げます。', 'Je vous remercie du fond du cœur.', 'Je vous remercie'),
  (2, '拝見する', '拝見（はいけん）する', 'voir, lire (humble)', 'お手紙（てがみ）を拝見（はいけん）しました。', 'J’ai lu votre lettre.', 'J’ai lu votre lettre'),
  (2, 'いただく', 'いただく', 'recevoir ; manger, boire (humble)', '部長（ぶちょう）にお土産（みやげ）をいただきました。', 'J’ai reçu un souvenir du directeur.', 'J’ai reçu un souvenir'),
  (2, '差し上げる', '差（さ）し上（あ）げる', 'donner, offrir (humble)', 'お客様（きゃくさま）にカタログを差（さ）し上（あ）げました。', 'J’ai remis un catalogue au client.', 'J’ai remis un catalogue'),
  (2, 'お目にかかる', 'お目（め）にかかる', 'rencontrer (humble)', '昨日（きのう）、社長（しゃちょう）にお目（め）にかかりました。', 'Hier, j’ai rencontré le président.', 'j’ai rencontré le président'),
  (2, 'お目にかける', 'お目（め）にかける', 'montrer (humble)', '新（あたら）しい作品（さくひん）をお目（め）にかけます。', 'Je vais vous montrer ma nouvelle œuvre.', 'Je vais vous montrer'),
  (2, '存じ上げる', '存（ぞん）じ上（あ）げる', 'connaître (une personne élevée) (humble)', 'お名前（なまえ）は存（ぞん）じ上（あ）げております。', 'Je connais votre nom.', 'Je connais votre nom'),
  (2, '拝借する', '拝借（はいしゃく）する', 'emprunter (humble)', 'ペンを拝借（はいしゃく）してもよろしいですか。', 'Puis-je vous emprunter un stylo ?', 'vous emprunter un stylo'),
  (2, '承る', '承（うけたまわ）る', 'recevoir (une demande, une commande), accepter (humble)', 'ご注文（ちゅうもん）を承（うけたまわ）りました。', 'Nous avons bien reçu votre commande.', 'bien reçu votre commande'),
  (2, '拝聴する', '拝聴（はいちょう）する', 'écouter (humble)', '先生（せんせい）のご講演（こうえん）を拝聴（はいちょう）しました。', 'J’ai écouté votre conférence, professeur.', 'J’ai écouté votre conférence'),
  (2, 'お邪魔する', 'お邪魔（じゃま）する', 'rendre visite, déranger (humble)', '明日（あした）、お宅（たく）にお邪魔（じゃま）します。', 'Je viendrai chez vous demain.', 'Je viendrai chez vous'),
  (3, '参る', '参（まい）る', 'aller, venir (humble II)', '明日（あした）大阪（おおさか）へ参（まい）ります。', 'Je vais à Osaka demain.', 'Je vais à Osaka'),
  (3, '申す', '申（もう）す', 'dire, s’appeler (humble II)', '山田（やまだ）と申（もう）します。', 'Je m’appelle Yamada.', 'Je m’appelle Yamada'),
  (3, 'いたす', 'いたす', 'faire (humble II)', 'その仕事（しごと）は私（わたし）がいたします。', 'C’est moi qui me charge de ce travail.', 'C’est moi qui me charge'),
  (3, 'おる', 'おる', 'être, se trouver (humble II)', '三時（さんじ）まで会社（かいしゃ）におります。', 'Je suis au bureau jusqu’à 15 h.', 'Je suis au bureau'),
  (3, '存じる', '存（ぞん）じる', 'savoir, penser (humble II)', 'その件（けん）は存（ぞん）じております。', 'Je suis au courant de cette affaire.', 'Je suis au courant'),
  (3, 'わたくし', 'わたくし', 'je, moi (très formel)', 'わたくし、営業部（えいぎょうぶ）の山田（やまだ）と申（もう）します。', 'Je me présente : Yamada, du service commercial.', 'Je me présente'),
  (3, '弊社', '弊社（へいしゃ）', 'notre société (humble)', '弊社（へいしゃ）の新製品（しんせいひん）です。', 'Voici le nouveau produit de notre société.', 'notre société'),
  (3, '御社', '御社（おんしゃ）', 'votre société (respectueux, à l’oral)', '御社（おんしゃ）の製品（せいひん）に興味（きょうみ）があります。', 'Les produits de votre société m’intéressent.', 'votre société'),
  (3, '貴社', '貴社（きしゃ）', 'votre société (respectueux, à l’écrit)', '貴社（きしゃ）の求人（きゅうじん）に応募（おうぼ）いたします。', 'Je postule à l’offre d’emploi de votre société.', 'votre société'),
  (3, '当社', '当社（とうしゃ）', 'notre société (neutre)', '当社（とうしゃ）は千九百九十年（せんきゅうひゃくきゅうじゅうねん）に設立（せつりつ）されました。', 'Notre société a été fondée en 1990.', 'Notre société'),
  (3, '小社', '小社（しょうしゃ）', 'notre (modeste) société', '小社（しょうしゃ）より新刊（しんかん）のお知（し）らせです。', 'Voici l’annonce d’une nouvelle parution de notre maison.', 'notre maison'),
  (3, '拙著', '拙著（せっちょ）', 'mon (modeste) ouvrage', '拙著（せっちょ）をお送（おく）りいたします。', 'Je vous envoie mon modeste ouvrage.', 'mon modeste ouvrage'),
  (4, 'かしこまりました', 'かしこまりました', 'c’est entendu, très bien (humble)', 'はい、かしこまりました。', 'Oui, c’est entendu.', 'c’est entendu'),
  (4, '承知いたしました', '承知（しょうち）いたしました', 'bien reçu, c’est noté (humble)', 'ご依頼（いらい）の件（けん）、承知（しょうち）いたしました。', 'Bien reçu pour votre demande.', 'Bien reçu'),
  (4, '恐れ入りますが', '恐（おそ）れ入（い）りますが', 'excusez-moi de vous déranger, mais…', '恐（おそ）れ入（い）りますが、少々（しょうしょう）お待（ま）ちください。', 'Excusez-moi, veuillez patienter un instant.', 'Excusez-moi'),
  (4, '申し訳ございません', '申（もう）し訳（わけ）ございません', 'je suis vraiment désolé (très poli)', 'ご迷惑（めいわく）をおかけして、申（もう）し訳（わけ）ございません。', 'Je suis vraiment désolé pour le désagrément.', 'Je suis vraiment désolé'),
  (4, '少々お待ちください', '少々（しょうしょう）お待（ま）ちください', 'veuillez patienter un instant', 'ただいま確認（かくにん）しますので、少々（しょうしょう）お待（ま）ちください。', 'Je vérifie, veuillez patienter un instant.', 'veuillez patienter un instant'),
  (4, 'お疲れ様です', 'お疲（つか）れ様（さま）です', 'merci pour votre travail (entre collègues, envers un supérieur)', '部長（ぶちょう）、お疲（つか）れ様（さま）です。', 'Directeur, merci pour votre travail.', 'merci pour votre travail'),
  (4, 'お世話になっております', 'お世話（せわ）になっております', 'merci pour votre soutien (formule d’ouverture)', 'いつもお世話（せわ）になっております。弊社（へいしゃ）の山田（やまだ）です。', 'Merci pour votre soutien constant. Ici Yamada, de notre société.', 'Merci pour votre soutien constant'),
  (4, '失礼いたします', '失礼（しつれい）いたします', 'excusez-moi, je me permets (en entrant, en partant)', '失礼（しつれい）いたします。入（はい）ってもよろしいでしょうか。', 'Excusez-moi. Puis-je entrer ?', 'Excusez-moi'),
  (4, 'よろしくお願いいたします', 'よろしくお願（ねが）いいたします', 'je compte sur vous (très poli)', '今後（こんご）ともよろしくお願（ねが）いいたします。', 'Je compte sur vous à l’avenir aussi.', 'Je compte sur vous'),
  (4, 'お手数ですが', 'お手数（てすう）ですが', 'désolé pour la peine, mais…', 'お手数（てすう）ですが、ご確認（かくにん）ください。', 'Désolé pour la peine, mais veuillez vérifier.', 'Désolé pour la peine'),
  (4, 'あいにく', 'あいにく', 'malheureusement, hélas', 'あいにく、田中（たなか）は外出（がいしゅつ）しております。', 'Malheureusement, Tanaka est sorti.', 'Malheureusement'),
  (4, '恐縮です', '恐縮（きょうしゅく）です', 'je suis confus, désolé de vous déranger', 'お忙（いそが）しいところ恐縮（きょうしゅく）です。', 'Je suis confus de vous déranger alors que vous êtes occupé.', 'Je suis confus'),
  (5, '本日', '本日（ほんじつ）', 'aujourd’hui (formel)', '本日（ほんじつ）はお越（こ）しいただき、ありがとうございます。', 'Merci d’être venus aujourd’hui.', 'aujourd’hui'),
  (5, '明日', '明日（みょうにち）', 'demain (formel)', '明日（みょうにち）、改（あらた）めてご連絡（れんらく）いたします。', 'Je vous recontacterai demain.', 'demain'),
  (5, '先ほど', '先（さき）ほど', 'tout à l’heure (passé, formel)', '先（さき）ほどお電話（でんわ）いたしました山田（やまだ）です。', 'Je suis Yamada, je vous ai appelé tout à l’heure.', 'tout à l’heure'),
  (5, '後ほど', '後（のち）ほど', 'plus tard (formel)', '後（のち）ほど改（あらた）めてお電話（でんわ）いたします。', 'Je vous rappellerai plus tard.', 'plus tard'),
  (5, 'ただいま', 'ただいま', 'en ce moment, tout de suite (formel)', 'ただいま参（まい）ります。', 'J’arrive tout de suite.', 'tout de suite'),
  (5, '少々', '少々（しょうしょう）', 'un peu, un instant (formel)', '少々（しょうしょう）お時間（じかん）をいただけますか。', 'Pourriez-vous m’accorder un instant ?', 'un instant'),
  (5, 'どちら様', 'どちら様（さま）', 'qui (très poli)', '失礼（しつれい）ですが、どちら様（さま）でしょうか。', 'Excusez-moi, à qui ai-je l’honneur ?', 'à qui ai-je l’honneur'),
  (5, 'いかが', 'いかが', 'comment ; que diriez-vous de (poli de どう)', 'コーヒーはいかがですか。', 'Que diriez-vous d’un café ?', 'Que diriez-vous'),
  (5, 'よろしい', 'よろしい', 'bien, convenable (poli de いい)', 'こちらでよろしいでしょうか。', 'Est-ce que cela vous convient ?', 'cela vous convient'),
  (5, 'お客様', 'お客様（きゃくさま）', 'client (respectueux)', 'お客様（きゃくさま）がお待（ま）ちです。', 'Un client attend.', 'Un client'),
  (5, 'お手洗い', 'お手洗（てあら）い', 'toilettes (美化語)', 'お手洗（てあら）いはあちらでございます。', 'Les toilettes sont par là.', 'Les toilettes'),
  (5, 'お宅', 'お宅（たく）', 'votre maison (respectueux)', '明日（あした）、お宅（たく）に伺（うかが）います。', 'Je passerai chez vous demain.', 'chez vous'),
  (5, 'ご家族', 'ご家族（かぞく）', 'votre famille (respectueux)', 'ご家族（かぞく）の皆様（みなさま）によろしくお伝（つた）えください。', 'Transmettez mes salutations à votre famille.', 'votre famille'),
  (5, '皆様', '皆様（みなさま）', 'vous tous, tout le monde (respectueux)', '皆様（みなさま）、お待（ま）たせいたしました。', 'Mesdames et messieurs, merci de votre patience.', 'Mesdames et messieurs'),
]

# ---------------------------------------------------------------------------------------------
def read(name):
    with open(os.path.join(SRC, f'keigo_{name}.csv'), encoding='utf-8-sig', newline='') as fh:
        return list(csv.DictReader(fh))

def main():
    gpath, spath = os.path.join(DATA, 'grammar.json'), os.path.join(DATA, 'sentences.json')
    grammar = [g for g in json.load(open(gpath, encoding='utf-8')) if g['lv'] != 'keigo'] + POINTS
    sents = [s for s in json.load(open(spath, encoding='utf-8')) if s.get('lv') != 'keigo'] + SENTS
    ids = [g['id'] for g in grammar]
    assert len(ids) == len(set(ids)), 'identifiant de point en double'
    for s in SENTS:
        assert any(p['id'] == s['g'] for p in POINTS), s['id']
    json.dump(grammar, open(gpath, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(sents, open(spath, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

    vocab, ex, seen = [], {}, set()
    for i, (unit, w, f, m, jp, fr, fk) in enumerate(VOCAB):
        assert w not in seen, w; seen.add(w)
        assert fk in fr, (w, fk)
        vocab.append([unit, i + 1, w, f, m, None])
        ex[w] = [[jp, fr, 'p', None, fk]]
    json.dump(vocab, open(os.path.join(DATA, 'vocab_keigo.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(ex, open(os.path.join(DATA, 'vocab_ex_keigo.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

    meta_path = os.path.join(DATA, 'meta.json')
    meta = json.load(open(meta_path, encoding='utf-8'))
    meta['grammar']['keigo'] = len(POINTS); meta['vocab']['keigo'] = len(vocab)
    json.dump(meta, open(meta_path, 'w', encoding='utf-8'), ensure_ascii=False)

    guide = {
        'categories': read('5_categories'), 'special': read('verbes_speciaux'), 'forms': read('formes_generales'),
        'principles': read('principes'), 'cases': read('cas_pratiques'), 'grammar': read('grammaire'), 'dialogues': read('dialogues'),
    }
    json.dump(guide, open(os.path.join(DATA, 'keigo_guide.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'{len(POINTS)} points, {len(SENTS)} phrases, {len(vocab)} mots, guide écrit.')

if __name__ == '__main__':
    main()
