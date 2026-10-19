"""Reconstruit uniquement data/sentences.json à partir de tools/sentences_*.txt
(sans toucher au vocabulaire ni à la grammaire, déjà traduits).
Usage : python3 tools/build_sentences.py"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
grammar = json.load(open(os.path.join(ROOT, 'data', 'grammar.json'), encoding='utf-8'))
gids = {g['id']: g for g in grammar}
sentences, errors, seen = [], [], set()
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
        if answer in dl or len(dl) != 3 or len(set(dl)) != 3:
            errors.append(f'{where} : distracteurs invalides'); continue
        if jp.count('（') != jp.count('）'):
            errors.append(f'{where} : furigana mal fermé'); continue
        if re.search(r'（[^）]*[^ぁ-んァ-ヶー]）', jp):
            errors.append(f'{where} : lecture non kana'); continue
        key = re.sub(r'（[^）]*）|[|\[\]]', '', jp)
        if key in seen:
            errors.append(f'{where} : phrase en double'); continue
        seen.add(key)
        sentences.append({'id': f's{len(sentences)+1}', 'g': gid, 'lv': gids[gid]['lv'],
                          'jp': jp, 'fr': fr, 'a': answer, 'd': dl})
if errors:
    print('\n'.join(errors)); sys.exit(1)
with open(os.path.join(ROOT, 'data', 'sentences.json'), 'w', encoding='utf-8') as f:
    json.dump(sentences, f, ensure_ascii=False, separators=(',', ':'))
by = {}
for s in sentences: by[s['lv']] = by.get(s['lv'], 0) + 1
print(f'{len(sentences)} phrases {by}')
