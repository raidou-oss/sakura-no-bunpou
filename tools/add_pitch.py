"""Ajoute l'accent tonal (pitch accent) au vocabulaire et aux points de grammaire.

Source : Kanjium (https://github.com/mifunetoshiro/kanjium), accents.txt, licence CC BY-SA 4.0.
Usage : python3 tools/add_pitch.py [chemin/vers/accents.txt]
Sans argument, réutilise tools/pitch_accents.tsv (extrait déjà filtré, versionné dans le dépôt).

Le nombre d'accent suit la convention habituelle : 0 = heiban (plat), 1 = atamadaka,
n = la voix tombe après la n-ième more. Il est ajouté en 6e colonne des fichiers vocab_*.json
(null si inconnu) et en champ "p" (avec "r" = lecture) dans grammar.json.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
TSV = os.path.join(ROOT, 'tools', 'pitch_accents.tsv')
KANJI_READING = re.compile(r'([㐀-鿿豈-﫿々〆ヶ〇]+)（([^）]+)）')
KANJI = re.compile(r'[㐀-鿿豈-﫿々〆ヶ〇]')

def hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)

def first_accent(field):
    """'0,2' → 0 ; '(副)0,(名)3' → 0"""
    m = re.search(r'\d+', field)
    return int(m.group()) if m else None

def load(src):
    by_pair, by_word, by_reading = {}, {}, {}
    with open(src, encoding='utf-8') as f:
        for line in f:
            parts = line.rstrip('\n').split('\t')
            if len(parts) != 3: continue
            w, r, a = parts
            r = r or w
            acc = first_accent(a)
            if acc is None: continue
            by_pair.setdefault((w, hira(r)), (acc, w, r, a))
            by_word.setdefault(w, []).append((acc, w, r, a))
            by_reading.setdefault(hira(r), []).append((acc, w, r, a))
    return by_pair, by_word, by_reading

def lookup(idx, word, reading):
    by_pair, by_word, by_reading = idx
    hr = hira(reading)
    if (word, hr) in by_pair: return by_pair[(word, hr)]
    cands = by_word.get(word, [])
    if len(cands) == 1 and hira(cands[0][2]) == hr: return cands[0]
    # Mot en kana seul : on accepte la lecture si toutes les entrées sont d'accord
    if not KANJI.search(word):
        cands = [c for c in by_reading.get(hr, []) if not KANJI.search(c[1])]
        accs = {c[0] for c in cands}
        if len(accs) == 1: return cands[0]
    return None

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else TSV
    idx = load(src)
    used = {}
    total = found = 0
    for lv in ['n5', 'n4', 'n3', 'n2', 'n1']:
        path = os.path.join(DATA, f'vocab_{lv}.json')
        rows = json.load(open(path, encoding='utf-8'))
        for row in rows:
            row[:] = row[:5]
            word, furi = row[2], row[3] or row[2]
            reading = KANJI_READING.sub(r'\2', furi)
            hit = lookup(idx, word, reading)
            row.append(hit[0] if hit else None)
            total += 1
            if hit: found += 1; used[(hit[1], hit[2])] = hit[3]
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(rows, f, ensure_ascii=False, separators=(',', ':'))
    gpath = os.path.join(DATA, 'grammar.json')
    grammar = json.load(open(gpath, encoding='utf-8'))
    gfound = 0
    for g in grammar:
        g.pop('p', None); g.pop('r', None)
        t = g['t']
        if not re.fullmatch(r'[぀-ヿ㐀-鿿ー々]+', t): continue
        reading = KANJI_READING.sub(r'\2', g.get('f') or t)
        if KANJI.search(reading): continue
        hit = lookup(idx, t, reading)
        if hit:
            g['p'], g['r'] = hit[0], hira(reading); gfound += 1; used[(hit[1], hit[2])] = hit[3]
    with open(gpath, 'w', encoding='utf-8') as f:
        json.dump(grammar, f, ensure_ascii=False, separators=(',', ':'))
    if src != TSV:
        with open(TSV, 'w', encoding='utf-8') as f:
            f.write('# Extrait de Kanjium accents.txt (CC BY-SA 4.0) : https://github.com/mifunetoshiro/kanjium\n')
            for (w, r), a in sorted(used.items()):
                f.write(f'{w}\t{r if r != w else ""}\t{a}\n')
    print(f'vocabulaire : {found}/{total} mots avec accent ; grammaire : {gfound} points')

if __name__ == '__main__':
    main()
