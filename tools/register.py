"""Conversion poli (です・ます) ⇄ neutre (forme simple) de la fin d'une phrase japonaise.

On ne touche qu'au prédicat final (et à la particule finale éventuelle) ; les furigana sont gardés.
Si la fin de phrase n'est pas reconnue avec certitude, on ne propose pas de variante (None).
"""
import glob, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KR = re.compile(r'([㐀-鿿豈-﫿々〆ヶ〇]+)（([^）]+)）')
plain = lambda t: KR.sub(r'\1', t).replace('[', '').replace(']', '').replace('|', '')
kana = lambda t: KR.sub(r'\2', t).replace('[', '').replace(']', '').replace('|', '')

I_ROW = dict(zip('うくぐすつぬぶむる', 'いきぎしちにびみり'))
A_ROW = dict(zip('うくぐすつぬぶむる', 'わかがさたなばまら'))
O_ROW = dict(zip('うくぐすつぬぶむる', 'おこごそとのぼもろ'))
TA = {'う': 'った', 'つ': 'った', 'る': 'った', 'む': 'んだ', 'ぶ': 'んだ', 'ぬ': 'んだ', 'く': 'いた', 'ぐ': 'いだ', 'す': 'した'}
GODAN_RU = set('帰る 入る 走る 知る 切る 要る 減る 限る 喋る 滑る 握る 散る 焦る 蹴る 照る 参る 茂る 湿る 練る 遮る 陥る 罵る 覆る 甦る 嘲る 混じる 交じる 捻る 撚る 弄る 詰る 抉る 翻る 侮る 煎る 炒る 耽る 迫る 縮る 煉る'.split())
NA_ADJ_I = {'きれい', '綺麗', '嫌い', '大嫌い', 'きらい', 'だいきらい', 'ゆうめい', 'ていねい', 'とくい', 'しつれい', 'くらい', 'ぐらい', '限り', 'せい', 'あい', 'はい', 'ばかり', 'あいだ', 'ぐらい', 'くらい', '向かい', '違い', 'お祝い', '付き合い', '知り合い', '払い', '手伝い', '思い', '戦い', '間違い', '小遣い', 'お見舞い', '扱い', '願い', '言葉遣い', '気遣い'}
SKIP_WORDS = ('ございます', 'いたし', 'まいり', '参り', 'いらっしゃ', 'おり', '申し', 'なさい', 'ください', '下さい', 'くださ', 'でございます', 'おっしゃ', '召し上が')
VERB_FR = re.compile(r"^(se |s'|s’|)?[a-zàâçéèêëîïôûùüÿœæ'-]+(er|ir|re|oir|ire)\b")

class Verb:
    def __init__(self, w, ichidan, irregular=None):
        self.w, self.ichidan, self.irr = w, ichidan, irregular
        b = w[:-1]
        if irregular == 'suru':
            x = w[:-2]
            self.f = {'dict': w, 'masu': x + 'し', 'nai': x + 'しない', 'ta': x + 'した', 'vol': x + 'しよう'}
        elif ichidan:
            self.f = {'dict': w, 'masu': b, 'nai': b + 'ない', 'ta': b + 'た', 'vol': b + 'よう'}
        else:
            u = w[-1]
            ta = b + ('った' if w in ('行く', 'いく') else TA[u])
            nai = 'ない' if w == 'ある' else b + A_ROW[u] + 'ない'
            self.f = {'dict': w, 'masu': b + I_ROW[u], 'nai': nai, 'ta': ta, 'vol': b + O_ROW[u] + 'う'}

    def forms(self):
        f, m = self.f, self.f['masu']
        nk = f['nai'][:-1] + 'かった'
        # (forme neutre, forme polie)
        return [(f['dict'], m + 'ます'), (f['ta'], m + 'ました'), (f['nai'], m + 'ません'), (nk, m + 'ませんでした'), (f['vol'], m + 'ましょう')]

def load_lexicon():
    verbs, iadj = {}, set()
    for vf in glob.glob(os.path.join(ROOT, 'data', 'vocab_n[1-5].json')):
        for row in json.load(open(vf, encoding='utf-8')):
            w, f, m = row[2], row[3] or row[2], row[4]
            r = kana(f)
            for form in ({w} if re.search(r'[㐀-鿿々]', w) else {w, r}):
                if not form or len(form) < 2: continue
                if VERB_FR.match(m.split(',')[0].strip().lower()) and form[-1] in I_ROW and re.fullmatch(r'[぀-ゟ㐀-鿿々]+', form):
                    if form in ('来る', 'くる') or any(x in form for x in ('いらっしゃ', 'くださ', 'なさ', 'おっしゃ')): continue
                    if form.endswith('する'):
                        verbs[form] = Verb(form, False, 'suru'); continue
                    rk = kana(f)
                    ich = form[-1] == 'る' and len(rk) >= 2 and rk[-2] in 'いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ' and w not in GODAN_RU and form not in GODAN_RU
                    if form == 'ある': ich = False
                    verbs[form] = Verb(form, ich)
                elif form.endswith('い') and form not in NA_ADJ_I and not VERB_FR.match(m.split(',')[0].strip().lower()):
                    iadj.add(form)
    for w, ich in (('いる', True), ('ある', False), ('なる', False), ('する', None), ('できる', True), ('わかる', False), ('分かる', False),
                   ('みる', True), ('おく', False), ('しまう', False), ('あげる', True), ('くれる', True), ('もらう', False), ('いく', False), ('いう', False)):
        verbs[w] = Verb(w, False, 'suru') if ich is None else Verb(w, ich)
    kuru = Verb('くる', True); kuru.f = {'dict': 'くる', 'masu': 'き', 'nai': 'こない', 'ta': 'きた', 'vol': 'こよう'}; verbs['くる'] = kuru
    pairs = []
    for v in verbs.values():
        pairs += v.forms()
    return pairs, iadj

PAIRS, IADJ = load_lexicon()
PLAIN_TO_POLITE = sorted(PAIRS, key=lambda p: -len(p[0]))
POLITE_TO_PLAIN = sorted(PAIRS, key=lambda p: -len(p[1]))
I_ADJ_SUFFIX = sorted(IADJ | {'たい', 'ない', 'らしい', 'いい', 'よい', 'みたい'}, key=len, reverse=True)

END_P = re.compile(r'[。！？!?]*$')
CASUAL = ('かな', 'っけ', 'もん', 'もの', 'ぞ', 'ぜ', 'わ', 'さ', 'の', 'じゃん', 'って', 'ってば', 'けど')

def _swap(body, old, new):
    """Remplace le suffixe neutre `old` (sans furigana) par `new` à la fin de `body` (avec furigana / crochets)."""
    nb = body.replace('[', '').replace(']', '')
    if not plain(nb).endswith(old): return None
    # le suffixe doit être écrit en kana (sans furigana) pour qu'on puisse le remplacer tel quel
    i = len(old)
    while i > 0 and old[:i] and not nb.endswith(old[-i:]): i -= 1
    common = len(os.path.commonprefix([old[::-1], new[::-1]]))
    o, n = old, new
    # on réduit au plus petit suffixe différent
    k = len(os.path.commonprefix([old, new]))
    o, n = old[k:], new[k:]
    if not nb.endswith(o): return None
    last = body.rfind(']')
    cut_nb = len(nb) - len(o)
    # position de ']' dans les coordonnées sans crochets
    if last >= 0 and body[:last].count('[') and (last - body[:last].count('[')) > cut_nb:
        return nb[:cut_nb] + n            # le trou touche la fin : variante sans trou
    # retirer `o` de body en sautant les crochets
    out, rem = body, len(o)
    while rem:
        if out[-1] in '[]': out = out[:-1]; continue
        out = out[:-1]; rem -= 1
    return out + n

def convert(raw):
    r = _convert(raw)
    if not r: return None
    reg, t = r
    # crochets cassés par la conversion : on enlève le trou (la variante est affichée remplie)
    if t.count('[') != t.count(']') or '[]' in t or re.search(r'\][^\[]*\]|\[[^\]]*\[', t):
        t = t.replace('[', '').replace(']', '')
    if plain(t) == plain(raw): return None
    return reg, t

def _convert(raw):
    """→ ('p' | 'n', variante) ou None"""
    if any(w in plain(raw) for w in SKIP_WORDS): return None
    if raw.rstrip().endswith('」'): return None
    raw = raw.replace('|', '')
    punct = END_P.search(raw).group(0)
    body = raw[:len(raw) - len(punct)]
    pb = plain(body)
    if not pb: return None
    for c in CASUAL:
        if pb.endswith(c) and not pb.endswith('ます' + c) and not pb.endswith('です' + c) and c != 'けど':
            return None
    part = ''
    for p in ('よね', 'よ', 'ね', 'か', 'けど', 'から', 'が', 'し'):
        if pb.endswith(p) and len(pb) > len(p) + 1:
            cand = pb[:-len(p)]
            if p == 'か' and not (cand.endswith('ます') or cand.endswith('です') or cand.endswith('ません') or cand.endswith('ました') or cand.endswith('でした') or cand.endswith('ましょう')):
                continue
            part = p; break
    core_body, part_raw = body, ''
    if part:
        # retirer la particule (écrite en kana) en sautant les crochets ; on garde le morceau tel quel
        rem, cut = len(part), len(body)
        while rem and cut:
            cut -= 1
            if body[cut] not in '[]': rem -= 1
        if body[cut - 1:cut] == '[': cut -= 1
        core_body, part_raw = body[:cut], body[cut:]
        if plain(part_raw) != part: return None
    pc = plain(core_body)
    question = part == 'か'

    # --- Poli → neutre
    for ppl, ppo in (('だ', 'です'), ('だった', 'でした'), ('じゃない', 'ではありません'), ('じゃない', 'じゃありません'), ('じゃなかった', 'ではありませんでした'),
                     ('じゃなかった', 'じゃありませんでした'), ('だろう', 'でしょう'), ('んだ', 'んです'), ('のだ', 'のです')):
        if pc.endswith(ppo) and not pc.endswith('ませんでした' if ppo == 'でした' else '\0'):
            stem = pc[:-len(ppo)]
            # です après un adjectif en い (ou たい / ない) : on enlève simplement です
            if ppo == 'です' and (any(stem.endswith(a) for a in I_ADJ_SUFFIX) or stem.endswith('い') or stem.endswith('かった') or stem.endswith('くない')) and not any(stem.endswith(x) for x in NA_ADJ_I):
                new_plain = ''
            else:
                new_plain = ppl
            if question and ppo in ('です',): new_plain, qp = '', '？'
            else: qp = None
            nb = _swap(core_body, ppo, new_plain) if new_plain != '' or True else None
            if nb is None: return None
            tail = (part_raw if part and part != 'か' else '') + (qp or (('？' if question else '') or punct))
            if part and part != 'か' and new_plain == '' and part in ('よ', 'ね', 'よね'): pass
            return ('p', nb + tail)
    for ppl, ppo in POLITE_TO_PLAIN:
        if pc.endswith(ppo):
            nb = _swap(core_body, ppo, ppl)
            if nb is None: return None
            if question:
                return ('p', nb + ('か？' if ppo.endswith('ましょう') else '？'))
            return ('p', nb + part_raw + punct)

    if question: return None
    # Fin polie non reconnue : on ne tente surtout pas l'inverse
    if re.search(r'(ます|ました|ません|ませんでした|ましょう|です|でした|でしょう)$', pc): return None
    # --- Neutre → poli
    for ppl, ppo in (('じゃなかった', 'じゃありませんでした'), ('じゃない', 'じゃありません'), ('だった', 'でした'), ('だろう', 'でしょう')):
        if pc.endswith(ppl):
            nb = _swap(core_body, ppl, ppo)
            return ('n', nb + part_raw + punct) if nb else None
    for ppl, ppo in PLAIN_TO_POLITE:
        if pc.endswith(ppl):
            if ppl in ('ない', 'なかった') and pc[-len(ppl) - 1:-len(ppl)] not in ('が', 'は', 'も', 'く', 'で', ''):
                continue
            # éviter de prendre la fin d'un autre mot : le caractère précédent ne doit pas être un kana « collé » ambigu
            nb = _swap(core_body, ppl, ppo)
            return ('n', nb + part_raw + punct) if nb else None
    for ppl, ppo in (('んだ', 'んです'), ('のだ', 'のです')):
        if pc.endswith(ppl):
            nb = _swap(core_body, ppl, ppo)
            return ('n', nb + part_raw + punct) if nb else None
    if pc.endswith('だ'):
        nb = _swap(core_body, 'だ', 'です')
        return ('n', nb + part_raw + punct) if nb else None
    if any(pc.endswith(a) for a in I_ADJ_SUFFIX) or pc.endswith('い') or pc.endswith('かった') or pc.endswith('くない'):
        if any(pc.endswith(x) for x in NA_ADJ_I): return None
        return ('n', core_body + 'です' + part_raw + punct)
    return None

if __name__ == '__main__':
    import sys
    tests = ['毎朝（まいあさ）|パンを|[食（た）べ]ます。', '今日（きょう）は|暑（あつ）いです[ね]。', 'これは|ペン[だ]。', '昨日（きのう）、|すしを|[食（た）べた]。',
             '明日（あした）は|雨（あめ）[でしょう]。', 'あなたは|学生（がくせい）です[か]。', '日本語（にほんご）が|話（はな）せる[ようになった]。', '早（はや）く|帰（かえ）ろう。',
             '一緒（いっしょ）に|映画（えいが）を|見（み）[ませんか]。', 'この|映画（えいが）は|[おもしろくない]。', '私（わたし）は|学生（がくせい）[じゃない]。']
    for t in tests: print(t, '→', convert(t))
