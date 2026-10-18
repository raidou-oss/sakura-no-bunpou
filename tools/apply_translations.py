#!/usr/bin/env python3
"""Applique les traductions françaises (tools/translations) aux CSV de csv/.

Les versions d'origine sont copiées une seule fois dans csv/original/.
Usage : python3 tools/apply_translations.py
"""
import csv, glob, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV = os.path.join(ROOT, 'csv')
TR = os.path.join(ROOT, 'tools', 'translations')
ORIG = os.path.join(CSV, 'original')
os.makedirs(ORIG, exist_ok=True)

def load_map(pattern):
    out = {}
    for path in sorted(glob.glob(os.path.join(TR, pattern))):
        for line in open(path, encoding='utf-8'):
            line = line.rstrip('\n')
            if not line or line.startswith('#'):
                continue
            k, v = line.split('|', 1)
            out[int(k)] = v.strip()
    return out

def rw(name, transform):
    src = os.path.join(CSV, name)
    backup = os.path.join(ORIG, name)
    if not os.path.exists(backup):
        shutil.copy(src, backup)
    with open(backup, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        fields, rows = reader.fieldnames, list(reader)
    changed = transform(rows)
    with open(src, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader(); w.writerows(rows)
    print(f'{name} : {changed} lignes traduites')

# Vocabulaire N2 / N1 (index = position de la ligne)
for lv in ('n2', 'n1'):
    tr = load_map(f'{lv}_*.txt')
    def t(rows, tr=tr, lv=lv):
        missing = [i for i in range(len(rows)) if i not in tr]
        if missing:
            sys.exit(f'{lv} : traductions manquantes pour {missing[:10]}…')
        for i, r in enumerate(rows):
            r['sens'] = tr[i]
        return len(rows)
    rw(f'{lv}_vocab.csv', t)

# Grammaire : sens, titres et libellés restés en anglais
gtr = load_map('grammar_fr.txt')
LABELS = [(r'\bNoun\b', 'Nom'), (r'\bVerbs?\b', 'Verbe'), (r'\bAdjectives?\b', 'Adjectif'), (r'\bAdj\b', 'Adj.'),
          (r'\bNegative-Past\b', 'Négatif passé'), (r'\bNegative\b', 'Négatif'), (r'\bPast\b', 'Passé'),
          (r'\bDictionary\b', 'Dictionnaire'), (r'\bNon-Past\b', 'Non passé'), (r'\bPredicate\b', 'Prédicat'),
          (r'\bPassive\b', 'Passif'), (r'\bCausative-Passive\b', 'Causatif-passif'), (r'\bCausative\b', 'Causatif'),
          (r'\bVolitional\b', 'Volitif'), (r'\bPotential\b', 'Potentiel'), (r'\bReasons and Causes\b', 'Raisons et causes'),
          (r'\bMeans and Manner\b', 'Moyen et manière'), (r'\bQualities and States\b', 'Qualités et états'),
          (r'\bAdjectives and Nouns\b', 'Adjectifs et noms'), (r'\bHave/Wear\b', 'Avoir/Porter'),
          (r'\bTime/Price\b', 'Temps/Prix'), (r'\bChange\b', 'Changement'), (r'\bQuestions\b', 'Questions'),
          (r'\bSubject\b', 'Sujet'), (r'\bProhibitive\b', 'Interdiction'), (r'\bSequence\b', 'Enchaînement'),
          (r'\bCost\b', 'Coût'), (r'\bCounter\b', 'compteur'), (r'\bReasons\b', 'Raisons'),
          (r'\bQuestion-Phrase\b', 'Phrase interrogative'), (r'\bParticle\b', 'Particule'), (r'\bFiller\b', 'Tic de langage'),
          (r'\bCasual\b', 'familier'), (r'\bConjunctive\b', 'Conjonctif'), (r'\bAs Desired\b', 'Comme on veut'),
          (r'\bSlang\b', 'argot'), (r'\bFrequency\b', 'Fréquence'), (r'\bPolite\b', 'Poli'), (r'\bHonorific\b', 'Honorifique'),
          (r'\bHumble\b', 'Humble'), (r'\bImperative\b', 'Impératif'), (r'\bConditional\b', 'Conditionnel'), (r'\bIntransitive\b', 'Intransitif'), (r'\bTransitive\b', 'Transitif'),
          (r'\bNumber\b', 'Nombre'), (r'\bAmount\b', 'Quantité'), (r'\bRequest\b', 'demande'), (r'\bConjunction\b', 'Conjonction')]
def fix_label(s):
    s = s.replace('Adjectives and Nouns', 'Adjectifs et noms')
    for a, b in LABELS:
        s = re.sub(a, b, s)
    return s
def g(rows):
    n = 0
    for r in rows:
        before = (r['sens'], r['titre'], r['furigana'])
        if int(r['id']) in gtr:
            r['sens'] = gtr[int(r['id'])]
        r['titre'] = fix_label(r['titre'])
        r['furigana'] = fix_label(r['furigana'])
        n += before != (r['sens'], r['titre'], r['furigana'])
    return n
rw('grammar_points.csv', g)
