#!/usr/bin/env python3
"""Ajoute un numéro de version (?v=...) à tous les fichiers CSS/JS/JSON du site,
pour que les navigateurs chargent toujours la dernière version après une mise à jour.

Usage : python3 tools/bump_version.py   (à lancer avant chaque commit qui touche le site)
"""
import glob, os, re, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = time.strftime('%Y%m%d%H%M%S')
Q = re.compile(r"(\.(?:js|css|json))(\?v=\w+)?(['\"`])")

def bump(path, pattern):
    s = open(path, encoding='utf-8').read()
    n = pattern.sub(lambda m: f"{m.group(1)}?v={V}{m.group(len(m.groups()))}", s)
    if n != s:
        open(path, 'w', encoding='utf-8').write(n)

# Imports relatifs dans les modules (./x.js, ../x.js), chargement des JSON et des jeux
rel = re.compile(r"((?:\.\.?/)[\w/.-]+?\.(?:js|json))(\?v=\w+)?(['\"`])")
for f in glob.glob(os.path.join(ROOT, 'js', '**', '*.js'), recursive=True):
    bump(f, rel)
data = re.compile(r"(data/\$\{name\}\.json)(\?v=\w+)?(`)")
bump(os.path.join(ROOT, 'js', 'data.js'), data)
# index.html : feuille de style et script principal
html = re.compile(r"((?:css|js)/[\w/.-]+?\.(?:js|css))(\?v=\w+)?(\")")
bump(os.path.join(ROOT, 'index.html'), html)
print('version', V)
