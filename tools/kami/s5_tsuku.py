import math, random, sys
sys.path.insert(0, sys.path[0])
from lib import *
HZ = 612

def figure():
    g = []
    g.append('<path d="M-96 -4 C-30 12 90 16 230 6 C320 0 380 8 440 22 C350 32 210 36 60 28 C-20 24 -76 16 -104 6 Z" fill="url(#y_robe)" opacity=".95"/>')
    # manches (furisode) : la droite flotte au vent
    g.append('<path d="M-46 -292 C-74 -272 -92 -222 -96 -162 C-100 -112 -94 -72 -80 -42 C-66 -62 -60 -112 -56 -172 Z" fill="url(#y_robe)" stroke="#B8F3FF" stroke-opacity=".5" stroke-width="1.6"/>')
    g.append('<path class="sway" d="M46 -292 C96 -272 146 -222 186 -150 C206 -110 212 -80 202 -58 C170 -88 126 -138 70 -182 Z" fill="url(#y_robe)" stroke="#B8F3FF" stroke-opacity=".5" stroke-width="1.6"/>')
    g.append('<path class="sway" d="M70 -182 C120 -140 168 -96 202 -58" stroke="#FFD86B" stroke-opacity=".5" stroke-width="1.4" fill="none"/>')
    # robe
    g.append('<path d="M-48 -300 C-20 -312 20 -312 48 -300 C58 -230 68 -150 82 -70 C88 -30 94 -10 98 0 L-94 0 C-90 -10 -86 -30 -80 -70 C-68 -150 -60 -230 -48 -300 Z" fill="url(#y_robe)" stroke="#B8F3FF" stroke-opacity=".6" stroke-width="2"/>')
    g.append('<g fill="none" stroke="#FFD86B" stroke-opacity=".5" stroke-width="1.3">' + "".join(f'<path d="M{-88+i*24} -12 a12 12 0 0 1 24 0 M{-84+i*24} -12 a8 8 0 0 1 16 0"/>' for i in range(8)) + '</g>')
    g.append('<path d="M-26 -290 C-30 -200 -40 -100 -46 0 M30 -290 C34 -200 44 -100 52 0" stroke="#9FB4FF" stroke-opacity=".18" stroke-width="2" fill="none"/>')
    # obi + nœud taiko
    g.append('<path d="M-62 -206 C-20 -200 20 -200 64 -206 L66 -180 C20 -174 -20 -174 -64 -180 Z" fill="#E0245E"/>'
             '<path d="M-34 -204 L34 -204 C40 -180 40 -150 32 -132 L-32 -132 C-40 -150 -40 -180 -34 -204 Z" fill="#FF94CB" stroke="#7A0F3A" stroke-width="1.5"/>'
             '<path d="M-34 -150 L34 -150" stroke="#FFD86B" stroke-width="3"/><path d="M-40 -192 L40 -192" stroke="#FFD86B" stroke-width="2" opacity=".8"/>')
    # nuque et col (de dos)
    g.append('<path d="M-12 -330 C-12 -314 -10 -306 0 -300 C10 -306 12 -314 12 -330 Z" fill="#F3E3D8"/>'
             '<path d="M-36 -300 Q0 -282 36 -300" stroke="#F4F7FF" stroke-width="4" fill="none"/>')
    # longue chevelure qui descend dans le dos puis s'envole
    c = catmull([(0, -340), (-6, -280), (-4, -220), (10, -160), (36, -110), (80, -80), (130, -70)], 12)
    g.append(f'<path class="sway" d="{ribbon(c, lambda t: 16*(1-t)**.7 + 2)}" fill="#05061A" stroke="#B8F3FF" stroke-opacity=".7" stroke-width="1.6"/>')
    for k in range(5):
        c = catmull([(4, -330), (20 + k*6, -300), (60 + k*16, -290 + k*8), (110 + k*26, -270 + k*14), (160 + k*36, -250 + k*20)], 10)
        g.append(f'<path class="sway" style="animation-delay:-{k*.5:.1f}s" d="{ribbon(c, lambda t: 4*(1-t)+.5)}" fill="#05061A" stroke="#B8F3FF" stroke-opacity=".45" stroke-width=".8"/>')
    # tête de dos, chignon, kanzashi
    g.append('<ellipse cx="0" cy="-352" rx="23" ry="27" fill="#05061A" stroke="#B8F3FF" stroke-opacity=".85" stroke-width="2"/>'
             '<ellipse cx="0" cy="-384" rx="17" ry="11" fill="#05061A" stroke="#B8F3FF" stroke-opacity=".85" stroke-width="2"/>'
             '<path d="M8 -388 L54 -420" stroke="#FFD86B" stroke-width="2.6"/><circle cx="56" cy="-421" r="4.5" fill="#FFD86B"/>'
             '<path d="M54 -420 l-4 16 M54 -420 l6 14" stroke="#FFD86B" stroke-width="1.4"/>'
             '<g fill="#FF94CB"><circle cx="-14" cy="-390" r="4.5"/><circle cx="-21" cy="-384" r="3.5"/><circle cx="-18" cy="-397" r="3.5"/></g>')
    return "".join(g)

def scene():
    defs = '''<linearGradient id="y_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#02040F"/><stop offset=".6" stop-color="#0E1A4E"/><stop offset="1" stop-color="#3A2A7A"/></linearGradient>
<radialGradient id="y_moon" cx=".45" cy=".4"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#EEF2FF"/><stop offset="1" stop-color="#C6D2FF"/></radialGradient>
<radialGradient id="y_halo"><stop offset=".35" stop-color="#D8E2FF" stop-opacity=".45"/><stop offset=".6" stop-color="#8A7BFF" stop-opacity=".15"/><stop offset="1" stop-color="#8A7BFF" stop-opacity="0"/></radialGradient>
<linearGradient id="y_water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D2466"/><stop offset=".4" stop-color="#0A1238"/><stop offset="1" stop-color="#03061A"/></linearGradient>
<linearGradient id="y_robe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A2464"/><stop offset=".7" stop-color="#0A1040"/><stop offset="1" stop-color="#050828"/></linearGradient>
<linearGradient id="y_fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="y_rm"><rect x="0" y="612" width="1600" height="300" fill="url(#y_fade)"/></mask>
<clipPath id="y_top"><rect width="1600" height="612"/></clipPath>'''
    b = [f'<rect width="{W}" height="{H}" fill="url(#y_sky)"/>', stars(200, 31, 560)]
    mx, my, R = 800, 430, 290
    b.append(f'<g clip-path="url(#y_top)"><circle cx="{mx}" cy="{my}" r="{R*2}" fill="url(#y_halo)"/><circle cx="{mx}" cy="{my}" r="{R}" fill="url(#y_moon)"/>'
             f'<g fill="#B9C6F2" opacity=".07"><circle cx="{mx-90}" cy="{my-60}" r="46"/><circle cx="{mx+70}" cy="{my+40}" r="66"/><circle cx="{mx+120}" cy="{my-110}" r="22"/><circle cx="{mx-40}" cy="{my+120}" r="30"/></g></g>')
    b.append(mist(560, 70, '#C6D2FF', .18, 61, 6))
    # torii dans l'eau (à gauche) et collines lointaines
    b.append(f'<path d="{ridge(HZ-10, 30, 63, 60, .5)}" fill="#0B1036" clip-path="url(#y_top)"/>')
    b.append('<g transform="translate(280 612)" fill="#C81E3A"><path d="M-110 -190 Q0 -212 110 -190 L116 -174 Q0 -194 -116 -174 Z"/><rect x="-86" y="-160" width="172" height="12"/><rect x="-68" y="-180" width="16" height="180"/><rect x="52" y="-180" width="16" height="180"/><rect x="-6" y="-160" width="12" height="20"/></g>')
    # eau
    b.append(f'<rect x="0" y="{HZ}" width="{W}" height="{H-HZ}" fill="url(#y_water)"/>')
    # reflet de lune : traits qui scintillent
    random.seed(2)
    refl = []
    for i in range(46):
        y = HZ + 6 + i*6.2; w_ = (R*.9) * (1 - i/60) * (0.5 + random.random()*.6)
        x = mx + (random.random()-.5)*40
        refl.append(f'<rect class="pulse" style="animation-delay:-{random.random()*3:.1f}s" x="{f(x-w_/2)}" y="{f(y)}" width="{f(w_)}" height="{f(2+random.random()*2.5)}" rx="2" fill="#E6ECFF" opacity="{f(.15+.55*(1-i/46))}"/>')
    b.append("".join(refl))
    # reflet du torii
    b.append('<g transform="translate(280 612) scale(1 -1)" fill="#C81E3A" opacity=".25" mask="url(#y_rm)"><rect x="-68" y="-180" width="16" height="180"/><rect x="52" y="-180" width="16" height="180"/><rect x="-86" y="-160" width="172" height="12"/></g>')
    # personnage
    fx, fy, sc = 940, 640, 1.18
    fig = figure()
    b.append(f'<g transform="translate({fx} {fy}) scale({sc} {-sc*.9})" opacity=".22" filter="url(#blur4)">{fig}</g>')
    b.append(f'<g transform="translate({fx} {fy}) scale({sc})">{fig}</g>')
    # ondes autour des pieds
    for k in range(4):
        b.append(f'<ellipse class="pulse" style="animation-delay:-{k*.7:.1f}s" cx="{fx}" cy="{fy+4}" rx="{140+k*70}" ry="{14+k*7}" fill="none" stroke="#B8F3FF" stroke-opacity="{f(.45-k*.09)}" stroke-width="1.6"/>')
    # lotus et pétales
    def lotus(x, y, s_):
        petals = "".join(f'<path d="M{f(x)} {f(y)} q{f(-14*s_)} {f(-22*s_)} 0 {f(-40*s_)} q{f(14*s_)} {f(18*s_)} 0 {f(40*s_)}z" fill="#FF94CB" opacity=".9" transform="rotate({a} {f(x)} {f(y)})"/>' for a in (-50, -25, 0, 25, 50))
        return f'<ellipse cx="{f(x)}" cy="{f(y+4)}" rx="{f(46*s_)}" ry="{f(10*s_)}" fill="#0E3A3A"/>{petals}<circle cx="{f(x)}" cy="{f(y-10*s_)}" r="{f(5*s_)}" fill="#FFD86B"/>'
    for (x, y, s_) in [(420, 760, 1.1), (1300, 720, .9), (1460, 820, 1.2), (180, 850, 1)]:
        b.append(lotus(x, y, s_))
    random.seed(13)
    for i in range(26):
        x, y = random.random()*W, random.random()*H*.9
        b.append(f'<path d="M{f(x)} {f(y)} q6 -8 12 0 q-6 8 -12 0z" fill="#FF94CB" opacity="{f(.35+random.random()*.5)}" transform="rotate({int(random.random()*360)} {f(x)} {f(y)})"/>')
    for i in range(16):
        x, y = random.random()*W, 300 + random.random()*500
        b.append(f'<g class="drift" style="animation-delay:-{i}s"><circle cx="{f(x)}" cy="{f(y)}" r="9" fill="#FFD86B" opacity=".18"/><circle cx="{f(x)}" cy="{f(y)}" r="2.2" fill="#FFF3C4"/></g>')
    b.append('<radialGradient id="vig"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient><rect width="1600" height="900" fill="url(#vig)"/>')
    return svg("".join(b), defs)
open(sys.argv[1], 'w').write(scene())
