"""Exemples pour le vocabulaire : data/vocab_examples.json = { "N5:食べる": [[jp, fr], …] }.
1) phrases écrites pour le vocabulaire (tools/vocab_examples_*.txt : mot || phrase || traduction) ;
2) phrases de grammaire qui contiennent le mot avec la même lecture (repérées automatiquement).
Usage : python3 tools/build_vocab_examples.py [--missing N5]  (liste les mots encore sans exemple)"""
import glob, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from register import convert   # variante poli ⇄ neutre
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KR = re.compile(r'([㐀-鿿豈-﫿々〆ヶ〇]+)（([^）]+)）')
K = re.compile(r'[㐀-鿿豈-﫿々〆ヶ〇]')
MAX = 2

def clean(jp):            # phrase de grammaire → phrase complète (trou rempli), furigana gardés
    return jp.replace('|', '').replace('[', '').replace(']', '')

sents = json.load(open(os.path.join(ROOT, 'data', 'sentences.json'), encoding='utf-8'))
ORDER = {'N5': 5, 'N4': 4, 'N3': 3, 'N2': 2, 'N1': 1}
# Phrases de grammaire du même niveau ou plus faciles, les plus courtes d'abord (exemples simples et parlants)
pool = sorted(((clean(s['jp']), s['fr'], ORDER.get(s['lv'], 0)) for s in sents), key=lambda x: len(x[0]))
written, errors = {}, []
for path in sorted(glob.glob(os.path.join(ROOT, 'tools', 'vocab_examples_*.txt'))):
    lv = re.search(r'vocab_examples_(n\d)', path).group(1).upper()
    for n, line in enumerate(open(path, encoding='utf-8'), 1):
        line = line.strip()
        if not line or line.startswith('#'): continue
        parts = [p.strip() for p in line.split('||')]
        if len(parts) != 3: errors.append(f'{os.path.basename(path)}:{n} : 3 champs attendus'); continue
        w, jp, fr = parts
        if jp.count('（') != jp.count('）'): errors.append(f'{os.path.basename(path)}:{n} : furigana mal fermé'); continue
        bare = K.findall(KR.sub('', jp))
        if bare: errors.append(f'{os.path.basename(path)}:{n} : kanji sans lecture {"".join(bare)}'); continue
        written.setdefault(f'{lv}:{w}', []).append([jp, fr])
if errors:
    print('\n'.join(errors)); sys.exit(1)
# Les phrases écrites pour le vocabulaire servent aussi d'exemples pour les autres mots qu'elles contiennent
for key, exs in written.items():
    for jp, fr in exs:
        pool.append((jp, fr, ORDER[key.split(':')[0]]))
pool.sort(key=lambda x: len(x[0]))

# Passage de la traduction à surligner (ou « ! » : exemple écarté, il n'emploie pas vraiment le mot)
FR_KEYS = {}
for _l in open(os.path.join(ROOT, 'tools', 'fr_keys_vocab.tsv'), encoding='utf-8'):
    if _l.startswith('#') or _l.count('\t') != 2: continue
    _k, _j, _v = _l.rstrip('\n').split('\t')
    FR_KEYS[(_k, _j)] = _v
plainjp = lambda jp: re.sub(r'（[^）]*）', '', jp)
# Mots dont la recherche automatique donne de faux exemples (au moins deux écartés) : seulement les exemples écrits à la main
from collections import Counter as _C
BANNED = _C(k for (k, _j), v in FR_KEYS.items() if v == '!')
out, missing = {}, {}
for vf in sorted(glob.glob(os.path.join(ROOT, 'data', 'vocab_n[1-5].json'))):
    lv = re.search(r'vocab_(n\d)', vf).group(1).upper()
    rows = json.load(open(vf, encoding='utf-8'))
    # Homographes (même écriture, lectures différentes : 人 じん / ひと / にん) : un jeu d'exemples par lecture
    homo = {w for w, c in _C(r[2] for r in rows).items() if c > 1}
    for row in rows:
        w, f = row[2], row[3] or row[2]
        key = f'{lv}:{f}' if w in homo else f'{lv}:{w}'
        ex = [e for e in written.get(key, []) if FR_KEYS.get((key, plainjp(e[0]))) != '!']
        # Forme recherchée : le mot annoté (même lecture) ; pour un verbe/adjectif, sans sa dernière syllabe
        needle = f
        if K.search(w) and len(w) > 1 and not K.search(w[-1]) and needle.endswith(w[-1]):
            needle = needle[:-1]
        if not K.search(w) and len(w) < 3: needle = None
        if BANNED[key] >= 2: needle = None
        if needle:
            for jp, fr, slv in pool:
                if len(ex) >= MAX: break
                if slv >= ORDER[lv] and needle in jp and [jp, fr] not in ex and FR_KEYS.get((key, plainjp(jp))) != '!': ex.append([jp, fr])
        if ex:
            # 3e et 4e colonnes : style de la phrase ('p' poli / 'n' neutre) et sa variante dans l'autre style
            # 5e colonne : passage de la traduction qui correspond au mot (surligné en rose dans les exercices)
            def row_of(e):
                r = list(convert(e[0]) or (None, None))
                fk = FR_KEYS.get((key, plainjp(e[0])))
                return e + r + ([fk] if fk and fk in e[1] else [])
            out[key] = [row_of(e) for e in ex[:MAX]]
        else: missing.setdefault(lv, []).append(w)
# Un fichier par niveau (chargé à la demande) : { mot: [[phrase, traduction], …] }
for lv in ['N5', 'N4', 'N3', 'N2', 'N1']:
    part = {k.split(':', 1)[1]: v for k, v in out.items() if k.startswith(lv + ':')}
    with open(os.path.join(ROOT, 'data', f'vocab_ex_{lv.lower()}.json'), 'w', encoding='utf-8') as fh:
        json.dump(part, fh, ensure_ascii=False, separators=(',', ':'))
print(f'{len(out)} mots avec exemple ; sans exemple : ' + ', '.join(f'{k} {len(v)}' for k, v in sorted(missing.items())))
if '--missing' in sys.argv:
    lv = sys.argv[sys.argv.index('--missing') + 1]
    print(' '.join(missing.get(lv, [])))
