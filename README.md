# 桜の文法 — Sakura no Bunpō

Site pour apprendre la grammaire japonaise du JLPT N5 au N1, dans une ambiance cerisier en fleur.

- **Révisions en répétition espacée** : phrases à trous, sens des points de grammaire et vocabulaire. Une carte ratée revient plus loin dans la séance puis le lendemain ; une carte réussie revient de plus en plus tard (variante de SM-2, comme Anki).
- **Grammaire** : 979 points (N5 → N1, kansai-ben, hors JLPT), 514 phrases d'exemple avec furigana et traduction.
- **Vocabulaire** : ~9 100 mots rangés par unité.
- **Mini-jeux** :
  - **コトバ珈琲 Kotoba Kōhī** : un client francophone dicte sa commande, tu la passes au barista en japonais, puis tu lis le montant annoncé à la caisse.
  - **花びら Hanabira** : attrape le pétale qui porte le bon mot.
  - **助詞ダッシュ Joshi Dash** : 60 secondes de particules.
  - **並べ替え Narabe** : remets la phrase dans l'ordre.

La progression est enregistrée dans le navigateur (export / import dans les Réglages).

## Lancer en local

Le site est 100 % statique (HTML, CSS, JavaScript), sans étape de compilation. Il faut juste un petit serveur, car les navigateurs bloquent le chargement des données en `file://` :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Mettre en ligne avec GitHub Pages

1. Pousse le dépôt sur GitHub.
2. Dans **Settings → Pages**, choisis *Deploy from a branch*, branche `main`, dossier `/ (root)`.
3. Le site sera disponible sur `https://<ton-pseudo>.github.io/<nom-du-depot>/`.

## Modifier les données

Les données sources sont dans `csv/` (grammaire et vocabulaire) et `tools/sentences_*.txt` (phrases à trous). Après modification, régénère les JSON :

```bash
python3 tools/build_data.py csv
```

Format d'une phrase (une par ligne) :

```
id_grammaire || phrase || traduction || distracteur1;distracteur2;distracteur3
```

- `[ ]` entoure le trou (la bonne réponse),
- `|` découpe la phrase en morceaux pour le jeu Narabe,
- `漢字（かんじ）` ajoute des furigana.

Exemple : `21 || 水（みず）[を]|飲（の）みます。 || Je bois de l'eau. || へ;に;や`

Le script vérifie chaque ligne (un seul trou, trois distracteurs, point de grammaire existant) et s'arrête en cas d'erreur.

## Structure

```
index.html          page unique
css/style.css       design (clair et sombre)
js/app.js           pages et navigation
js/review.js        séances de révision
js/srs.js           algorithme de répétition espacée, stats, sauvegarde
js/games/           mini-jeux
data/               JSON générés
tools/              script de génération + phrases à trous
csv/                données sources
```

## Activer les comptes (profils, photos, réactions)

Le site fonctionne sans comptes. Pour les activer, il faut un projet Supabase (gratuit) :

1. Crée un compte sur https://supabase.com puis **New project** (région Europe, mot de passe au choix).
2. Dans le projet : **SQL Editor → New query**, colle tout le contenu de `supabase/schema.sql`, clique sur **Run**.
3. **Authentication → URL Configuration** : mets `https://raidou-oss.github.io/sakura-no-bunpou/` dans *Site URL* et dans *Redirect URLs*.
4. **Project Settings → API** : copie *Project URL* et la clé *anon public* (ou *publishable*) dans `js/config.js`.
5. Exécute aussi, dans l'ordre, `supabase/migration_02_pseudo.sql` (connexion par identifiant) et `supabase/migration_03_live.sql` (réactions en direct, jauges).

Ce que ça active : inscription par e-mail, profil public (pseudo, bio, photo, bannière), rang N5 → N1 avec jauge,
page Communauté classée par rang, réactions entre élèves (une de chaque type par jour), synchro de la progression entre appareils.

## Algorithme de progression

Chaque carte révisée a un score de maîtrise entre 0 et 1 (`js/level.js`) :
- 0,15 dès la première bonne réponse, puis une courbe logarithmique jusqu'à 1 quand l'intervalle de révision atteint 21 jours ;
- −8 % par oubli (plancher 60 %) : une carte souvent ratée est fragile ;
- érosion si la révision est en retard : rétention ≈ e^(−retard / 2(intervalle+1)), plancher 50 %.

Par niveau, la progression grammaire et la progression vocabulaire sont la moyenne des scores sur tous les éléments du niveau.
On valide un niveau (N5 → N4 → … → N1) quand la grammaire atteint 55 % **et** le vocabulaire 45 %.
La jauge du rang combine les deux (60 % grammaire, 40 % vocabulaire), chacune plafonnée à son objectif.

Après chaque modification du site : `python3 tools/bump_version.py` pour forcer les navigateurs à recharger les fichiers.

## Voix et accent tonal

- **Voix** : `js/voice.js` utilise la synthèse vocale du navigateur (voix `ja-JP` de l'appareil). Bouton 🔊 sur les mots, les points de grammaire et les phrases ; clic droit pour écouter lentement. Vitesse et lecture automatique dans Réglages.
- **Accent tonal** : `js/pitch.js` dessine le schéma haut/bas par more (平板, 頭高, 中高, 尾高). Les numéros d'accent viennent de [Kanjium](https://github.com/mifunetoshiro/kanjium) (licence CC BY-SA 4.0), extrait dans `tools/pitch_accents.tsv` et ajouté aux données par `python3 tools/add_pitch.py` (à relancer après `build_data.py`).

## Fonds de page

`js/wallpaper.js` : le fond du portail (repris en version voilée sur l'accueil) et un fond dédié par section (`sectionWallpaperSVG`) : orbites pour les révisions, papier 原稿用紙 pour la grammaire, cartes de mots pour le vocabulaire, lignes de vitesse pour les jeux, constellation pour la communauté, pleine lune et cadre pour le profil.

## Effets sonores, glisser-déposer, panneau du jour

- `js/sfx.js` : sons synthétisés en direct (Web Audio, aucun fichier) : curseur, validation, retour, balayage de transition, bonne / mauvaise réponse, fanfare, réaction reçue. Activables et réglables dans Réglages.
- `js/games/tiles.js` : tuiles de phrase partagées par Narabe et Kotoba Kōhī. Toucher pour ajouter / retirer, glisser-déposer pour insérer n'importe où, flèches du clavier pour déplacer une tuile placée.
- `js/daily.js` : panneau sous le menu (objectif de révisions du jour, série, mot du jour avec voix et accent) ; sur téléphone il s'affiche sur l'accueil.
