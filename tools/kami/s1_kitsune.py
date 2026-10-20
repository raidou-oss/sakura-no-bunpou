import math, random, sys
sys.path.insert(0, sys.path[0])
from lib import *

def tail(base, ang, length, curl, width, seed):
    random.seed(seed)
    a = math.radians(ang)
    p0 = base
    p3 = (base[0] + math.cos(a)*length, base[1] + math.sin(a)*length)
    perp = (-math.sin(a), math.cos(a))
    p1 = (base[0] + math.cos(a)*length*0.3 + perp[0]*curl*0.6, base[1] + math.sin(a)*length*0.3 + perp[1]*curl*0.6)
    p2 = (base[0] + math.cos(a)*length*0.75 - perp[0]*curl, base[1] + math.sin(a)*length*0.75 - perp[1]*curl)
    c = bez(p0, p1, p2, p3, 50)
    # pointe recourbée
    tipc = [(p3[0] + perp[0]*k*curl*0.04 - math.cos(a)*k*2, p3[1] + perp[1]*k*curl*0.04 - math.sin(a)*k*2) for k in range(1, 7)]
    c = c + tipc
    ph = random.random()*6
    wf = lambda t: (width * (0.7 + 2.1*math.sin(math.pi*min(1, t*0.95))**0.6) * (1 - t**3.2) + 0.5) * (1 + (0.07*math.sin(t*18 + ph) if t > 0.3 else 0))
    shape = ribbon(c, wf)
    strands = []
    for k, off in enumerate((-0.45, 0, 0.45)):
        ns = normals(c)
        sc = [(c[i][0] + ns[i][0]*wf(i/(len(c)-1))*off, c[i][1] + ns[i][1]*wf(i/(len(c)-1))*off) for i in range(8, len(c)-6)]
        strands.append(sc)
    return shape, strands, c[-1]

def fox_body():
    return ("M4 98 C12 90 30 84 48 76 C56 72 60 64 64 58 L70 2 L88 44 L108 6 C112 30 116 52 118 70 "
            "C124 92 128 108 134 124 C150 150 178 184 190 228 C198 262 192 296 168 314 C150 322 120 322 96 320 L64 320 "
            "C54 320 50 312 58 308 C66 306 72 304 74 296 C76 270 78 244 76 222 C70 210 62 204 66 196 C58 190 54 182 60 176 "
            "C52 170 48 160 54 154 C46 146 42 136 44 128 C36 120 26 112 18 108 C12 106 6 104 4 98 Z")

def scene():
    defs = '''<linearGradient id="k_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#030716"/><stop offset=".55" stop-color="#0B1A4A"/><stop offset=".8" stop-color="#2A1452"/><stop offset="1" stop-color="#3B1848"/></linearGradient>
<radialGradient id="k_moon" cx=".42" cy=".38"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#E8EEFF"/><stop offset="1" stop-color="#B9C6F2"/></radialGradient>
<radialGradient id="k_halo"><stop offset="0" stop-color="#9FD8FF" stop-opacity=".55"/><stop offset=".35" stop-color="#6A7BFF" stop-opacity=".18"/><stop offset="1" stop-color="#6A7BFF" stop-opacity="0"/></radialGradient>
<linearGradient id="k_tail" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#0B1B5C"/><stop offset=".45" stop-color="#2F6BFF"/><stop offset=".8" stop-color="#46D9FF"/><stop offset="1" stop-color="#F0FDFF"/></linearGradient>
<radialGradient id="k_fire"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".35" stop-color="#9BF0FF"/><stop offset=".7" stop-color="#2F6BFF" stop-opacity=".5"/><stop offset="1" stop-color="#2F6BFF" stop-opacity="0"/></radialGradient>
<linearGradient id="k_rock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141A3E"/><stop offset="1" stop-color="#05071A"/></linearGradient>
<radialGradient id="k_fur" cx=".75" cy=".35" r=".8"><stop offset="0" stop-color="#1A2464"/><stop offset=".5" stop-color="#0A0F34"/><stop offset="1" stop-color="#03051A"/></radialGradient>
<linearGradient id="k_rim" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#B8F3FF"/><stop offset=".4" stop-color="#46D9FF" stop-opacity=".5"/><stop offset="1" stop-color="#46D9FF" stop-opacity="0"/></linearGradient>'''
    b = [f'<rect width="{W}" height="{H}" fill="url(#k_sky)"/>', stars(170, 3)]
    # lune et halo
    b.append('<circle cx="1080" cy="300" r="420" fill="url(#k_halo)"/><circle cx="1080" cy="300" r="190" fill="url(#k_moon)"/>')
    b.append('<g fill="#AFC0EE" opacity=".35"><circle cx="1030" cy="250" r="26"/><circle cx="1130" cy="340" r="38"/><circle cx="1060" cy="380" r="14"/><circle cx="1150" cy="230" r="12"/></g>'.replace('opacity=".35"','opacity=".07"'))
    b.append(mist(430, 120, '#7B5BD6', .25, 5, 7))
    # montagnes en couches
    b.append(f'<path d="{ridge(560, 140, 11, 50, .6)}" fill="#12123F" opacity=".9"/>')
    b.append(f'<path d="{ridge(640, 110, 12, 40, .6)}" fill="#0C0E30"/>')
    # torii lointain sur une crête
    b.append('<g transform="translate(1290 560) scale(.55)" fill="#C81E3A" opacity=".75"><path d="M-80 0 Q0 -14 80 0 L84 10 Q0 -2 -84 10 Z"/><rect x="-64" y="18" width="128" height="7"/><rect x="-52" y="8" width="9" height="90"/><rect x="43" y="8" width="9" height="90"/></g>')
    b.append(mist(640, 90, '#46D9FF', .14, 7, 6))
    b.append(f'<path d="{ridge(735, 70, 13, 30, .5)}" fill="#070A24"/>')
    # rocher du renard
    rock = smooth_path([(330,700),(420,640),(520,610),(640,606),(760,622),(840,660),(900,720),(980,900),(260,900)])
    b.append(f'<path d="{rock}" fill="url(#k_rock)"/><path d="M520 612 Q640 600 760 622 Q840 650 880 700" fill="none" stroke="#46D9FF" stroke-width="2" opacity=".45"/>')
    # queues (derrière le corps)
    fx, fy, sc = 470, 132, 1.5
    base = (fx + 178*sc, fy + 262*sc)
    angs = [-150, -133, -116, -99, -82, -65, -48, -31, -14]
    tails = []
    for i, a in enumerate(angs):
        L = 340 + 90*math.sin(i/8*math.pi)
        tails.append(tail(base, a, L, 80 if i % 2 else -70, 25, i))
    glow = "".join(f'<path d="{t[0]}" fill="#46D9FF"/>' for t in tails)
    b.append(f'<g filter="url(#blur12)" opacity=".55">{glow}</g>')
    tb = []
    for i, (shape, strands, tip) in enumerate(tails):
        tb.append(f'<g class="sway" style="animation-delay:{-i*0.7:.1f}s"><path d="{shape}" fill="url(#k_tail)" opacity=".95"/>' + "".join(f'<polyline points="{pts(s)}" fill="none" stroke="#E6FBFF" stroke-width="1.2" opacity=".35"/>' for s in strands) + '</g>')
        tb.append(f'<g class="fl" style="animation-delay:{-i*0.3:.1f}s"><path d="M{f(tip[0]-14)} {f(tip[1]+10)} Q{f(tip[0]-16)} {f(tip[1]-14)} {f(tip[0])} {f(tip[1]-40)} Q{f(tip[0]+16)} {f(tip[1]-14)} {f(tip[0]+14)} {f(tip[1]+10)} Q{f(tip[0])} {f(tip[1]+18)} {f(tip[0]-14)} {f(tip[1]+10)}Z" fill="url(#k_fire)"/></g>')
    b.append("".join(tb))
    # renard
    body = fox_body()
    b.append(f'<g transform="translate({fx} {fy}) scale({sc})"><path d="{body}" fill="url(#k_fur)"/>'
             f'<path d="{body}" fill="none" stroke="url(#k_rim)" stroke-width="2.4"/>'
             '<path d="M38 84 Q50 76 60 84 Q48 88 38 84 Z" fill="#9BF0FF" filter="url(#glow)"/>'
             '<path d="M10 100 Q-26 92 -46 98 M12 104 Q-22 108 -42 118" stroke="#9BF0FF" stroke-width=".8" opacity=".5" fill="none"/>'
             '<path d="M58 318 L62 306 M74 318 L76 307" stroke="#46D9FF" stroke-width="1.4" opacity=".5"/>'
             # collier rouge et clochette (messager d'Inari)
             '<path d="M46 128 Q70 150 112 132" fill="none" stroke="#C81E3A" stroke-width="7" stroke-linecap="round"/><circle cx="72" cy="148" r="7" fill="#FFD86B"/>'
             '</g>')
    # feux follets
    random.seed(21)
    for i in range(14):
        x, y, r = 200 + random.random()*1250, 180 + random.random()*520, 6 + random.random()*14
        b.append(f'<g class="drift" style="animation-delay:{-i:.0f}s"><circle cx="{f(x)}" cy="{f(y)}" r="{f(r*2.6)}" fill="url(#k_fire)" opacity=".5"/><circle cx="{f(x)}" cy="{f(y)}" r="{f(r*.5)}" fill="#fff"/></g>')
    # pétales
    random.seed(8)
    for i in range(22):
        x, y = random.random()*W, random.random()*H
        b.append(f'<path d="M{f(x)} {f(y)} q6 -8 12 0 q-6 8 -12 0z" fill="#FF94CB" opacity="{f(.4+random.random()*.5)}" transform="rotate({int(random.random()*360)} {f(x)} {f(y)})"/>')
    # vignette
    b.append('<radialGradient id="vig"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient><rect width="1600" height="900" fill="url(#vig)"/>')
    return svg("".join(b), defs)
open(sys.argv[1], 'w').write(scene())
