#!/usr/bin/env python3
"""Convertit les CSV (grammaire, vocabulaire) et les phrases à trous en JSON pour le site.

Usage : python3 tools/build_data.py <dossier_csv>
Le dossier doit contenir grammar_points.csv et n1..n5_vocab.csv (les préfixes éventuels sont ignorés).
"""
import csv, glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'csv')
OUT = os.path.join(ROOT, 'data')
os.makedirs(OUT, exist_ok=True)

def find(pattern):
    hits = glob.glob(os.path.join(SRC, '*' + pattern))
    if not hits:
        sys.exit(f'Fichier introuvable : *{pattern} dans {SRC}')
    return hits[0]

def read_csv(path):
    with open(path, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))

LEVEL = {'JLPT5': 'N5', 'JLPT4': 'N4', 'JLPT3': 'N3', 'JLPT2': 'N2', 'JLPT1': 'N1',
         '関西弁': 'kansai', 'Non-JLPT': 'extra'}

# --- Grammaire -------------------------------------------------------------
grammar = []
for r in read_csv(find('grammar_points.csv')):
    grammar.append({
        'id': int(r['id']), 'o': int(r['ordre']), 'lv': LEVEL.get(r['niveau'], 'extra'),
        'le': int(r['lecon']), 't': r['titre'].strip(),
        # la colonne furigana n'est utile que si elle contient une lecture （…）
        'f': r['furigana'].strip() if '（' in r['furigana'] else r['titre'].strip(),
        's': r['sens'].strip(),
    })
grammar.sort(key=lambda g: g['o'])
gids = {g['id']: g for g in grammar}

# --- Phrases à trous -------------------------------------------------------
sentences, errors = [], []
for path in sorted(glob.glob(os.path.join(ROOT, 'tools', 'sentences_*.txt'))):
    for n, line in enumerate(open(path, encoding='utf-8'), 1):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        parts = [p.strip() for p in line.split('||')]
        where = f'{os.path.basename(path)}:{n}'
        if len(parts) != 4:
            errors.append(f'{where} : 4 champs attendus'); continue
        gid, jp, fr, dis = parts
        gid = int(gid)
        if gid not in gids:
            errors.append(f'{where} : grammaire {gid} inconnue'); continue
        blanks = re.findall(r'\[([^\]]+)\]', jp)
        if len(blanks) != 1:
            errors.append(f'{where} : un seul trou attendu'); continue
        answer = re.sub(r'（[^）]*）', '', blanks[0])
        dl = [d.strip() for d in dis.split(';') if d.strip()]
        if answer in dl or len(dl) != 3:
            errors.append(f'{where} : distracteurs invalides'); continue
        if jp.count('（') != jp.count('）'):
            errors.append(f'{where} : furigana mal fermé'); continue
        sentences.append({'id': f's{len(sentences)+1}', 'g': gid, 'lv': gids[gid]['lv'],
                          'jp': jp, 'fr': fr, 'a': answer, 'd': dl})
if errors:
    print('\n'.join(errors)); sys.exit(1)

# --- Vocabulaire -----------------------------------------------------------
vocab_counts = {}
for lv in ('n5', 'n4', 'n3', 'n2', 'n1'):
    rows = read_csv(find(f'{lv}_vocab.csv'))
    items = [[int(r['unit']), int(r['ordre']), r['mot'].strip(), r['furigana'].strip(), r['sens'].strip()]
             for r in rows if r['mot'].strip()]
    items.sort(key=lambda x: (x[0], x[1]))
    with open(os.path.join(OUT, f'vocab_{lv}.json'), 'w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, separators=(',', ':'))
    vocab_counts[lv.upper()] = len(items)

with open(os.path.join(OUT, 'grammar.json'), 'w', encoding='utf-8') as f:
    json.dump(grammar, f, ensure_ascii=False, separators=(',', ':'))
with open(os.path.join(OUT, 'sentences.json'), 'w', encoding='utf-8') as f:
    json.dump(sentences, f, ensure_ascii=False, separators=(',', ':'))

by_lv = {}
for s in sentences:
    by_lv[s['lv']] = by_lv.get(s['lv'], 0) + 1
print(f'{len(grammar)} points de grammaire, {len(sentences)} phrases {by_lv}, vocab {vocab_counts}')
