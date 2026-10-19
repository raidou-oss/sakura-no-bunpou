"""Reconstruit uniquement data/sentences.json à partir de tools/sentences_*.txt
(sans toucher au vocabulaire ni à la grammaire, déjà traduits).
Usage : python3 tools/build_sentences.py"""
import glob, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from register import convert   # variante poli ⇄ neutre

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
grammar = json.load(open(os.path.join(ROOT, 'data', 'grammar.json'), encoding='utf-8'))
KR = re.compile(r'([㐀-鿿豈-﫿々〆ヶ〇]+)（([^）]+)）')
KANJI = re.compile(r'[㐀-鿿豈-﫿々〆ヶ〇]+')

# Dictionnaire « kanji → lecture » tiré de toutes les données déjà annotées (phrases, vocabulaire, grammaire)
from collections import Counter, defaultdict
READ = defaultdict(Counter)
def learn(text):
    for k, r in KR.findall(text or ''):
        READ[k][r] += 1
for vf in glob.glob(os.path.join(ROOT, 'data', 'vocab_n[1-5].json')):
    for row in json.load(open(vf, encoding='utf-8')):
        learn(row[3])
for g in grammar:
    learn(g.get('f'))
for path in glob.glob(os.path.join(ROOT, 'tools', 'sentences_*.txt')):
    learn(open(path, encoding='utf-8').read())
EXTRA = {}   # lectures ajoutées à la main pour les distracteurs introuvables
extra_path = os.path.join(ROOT, 'tools', 'readings_extra.txt')
if os.path.exists(extra_path):
    for line in open(extra_path, encoding='utf-8'):
        if '\t' in line and not line.startswith('#'):
            k, r = line.rstrip('\n').split('\t'); EXTRA[k] = r
unknown = Counter()
# Lectures qui dépendent du contexte (le dictionnaire automatique prendrait la plus fréquente)
NK = r'(?<![㐀-鿿豈-﫿々〆ヶ〇])'
RULES = [
    (NK + r'上(?![㐀-鿿]|[がげ（])', '上（うえ）'), (NK + r'下(?![㐀-鿿]|[さ（])', '下（した）'), (NK + r'即(?=し)', '即（そく）'), (NK + r'即(?![ち（])', '即（そく）'),
    (NK + r'堪(?![㐀-鿿])', '堪（た）'), (NK + r'応(?=え)', '応（こた）'), (NK + r'少(?=な)', '少（すく）'), (NK + r'回(?![㐀-鿿]|[るっ（])', '回（かい）'),
    (NK + r'未(?=だ)', '未（いま）'), (NK + r'毎(?![㐀-鿿]|（)', '毎（まい）'), (NK + r'番(?![㐀-鿿])', '番（ばん）'), (NK + r'前方(?![㐀-鿿])', '前方（ぜんぽう）'),
    (NK + r'前日', '前日（ぜんじつ）'), (NK + r'方(?![㐀-鿿]|[（])', '方（ほう）'), (NK + r'決(?=して)', '決（けっ）'), (NK + r'全(?![㐀-鿿]|[く（])', '全（ぜん）'),
    (NK + r'何(?=[だとで])', '何（なん）'),
]
def annotate(text):
    """Ajoute les furigana aux kanji d'un texte court (distracteurs) d'après les données connues"""
    if '（' in text:
        return text
    for pat, rep_ in RULES:
        text = re.sub(pat, rep_, text)
    def rep(m):
        k = m.group(0)
        if k in EXTRA: return f'{k}（{EXTRA[k]}）'
        if READ.get(k): return f'{k}（{READ[k].most_common(1)[0][0]}）'
        # sinon, kanji par kanji si chacun est connu seul
        parts = []
        for ch in k:
            r = EXTRA.get(ch) or (READ[ch].most_common(1)[0][0] if READ.get(ch) else None)
            if not r: unknown[k] += 1; return k
            parts.append(f'{ch}（{r}）')
        return ''.join(parts)
    return re.sub(r'(?<![㐀-鿿豈-﫿々〆ヶ〇])[㐀-鿿豈-﫿々〆ヶ〇]+(?![㐀-鿿豈-﫿々〆ヶ〇（])', rep, text)
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
        item = {'id': f's{len(sentences)+1}', 'g': gid, 'lv': gids[gid]['lv'],
                'jp': jp, 'fr': fr, 'a': answer, 'd': dl}
        af, dfs = blanks[0] if '（' in blanks[0] else annotate(blanks[0]), [annotate(d) for d in dl]
        if af != answer: item['af'] = af
        if any(x != d for x, d in zip(dfs, dl)): item['df'] = dfs
        r = convert(jp)
        # pas de variante si la conversion touche la partie étudiée (le trou) : la phrase ne montrerait plus le point
        if r and '[' in r[1]: item['reg'], item['alt'] = r
        sentences.append(item)
if errors:
    print('\n'.join(errors)); sys.exit(1)
if unknown:
    print('Kanji sans lecture connue (à ajouter dans tools/readings_extra.txt) :', ' '.join(unknown))
with open(os.path.join(ROOT, 'data', 'sentences.json'), 'w', encoding='utf-8') as f:
    json.dump(sentences, f, ensure_ascii=False, separators=(',', ':'))
by = {}
for s in sentences: by[s['lv']] = by.get(s['lv'], 0) + 1
print(f'{len(sentences)} phrases {by} ; variante poli/neutre : {sum(1 for s in sentences if "alt" in s)}')
