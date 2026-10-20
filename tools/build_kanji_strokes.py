#!/usr/bin/env python3
"""Ordre des traits des kanji du vocabulaire, tiré de KanjiVG (CC BY-SA 3.0, Ulrich Apel — https://kanjivg.tagaini.net).
Usage : python3 tools/build_kanji_strokes.py /chemin/vers/kanjivg
Sortie : data/kanji/<code hex>.json = {"s": [chemins des traits dans l'ordre], "n": [[x, y], …] positions des numéros}"""
import json, os, re, sys
src = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
chars = set()
for lv in ['n5', 'n4', 'n3', 'n2', 'n1']:
    for r in json.load(open(f'{root}/data/vocab_{lv}.json')):
        for c in str(r[2]) + str(r[3] or ''):
            if '一' <= c <= '鿿' or c == '々': chars.add(c)
out = f'{root}/data/kanji'
os.makedirs(out, exist_ok=True)
n = 0; missing = []
for c in sorted(chars):
    hx = f'{ord(c):05x}'
    f = f'{src}/kanji/{hx}.svg'
    if not os.path.exists(f): missing.append(c); continue
    svg = open(f, encoding='utf-8').read()
    sp = svg[svg.index('StrokePaths'):svg.index('StrokeNumbers')]
    paths = re.findall(r'<path[^>]*?\sd="([^"]+)"', sp)
    nums = [[round(float(x), 1), round(float(y), 1)] for x, y in re.findall(r'matrix\(1 0 0 1 ([\d.\-]+) ([\d.\-]+)\)', svg[svg.index('StrokeNumbers'):])]
    json.dump({'s': paths, 'n': nums}, open(f'{out}/{hx}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    n += 1
print(n, 'kanji ; manquants :', ''.join(missing))
