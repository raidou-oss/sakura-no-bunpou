import math, random, sys
sys.path.insert(0, sys.path[0])
from lib import *

def bolt(a, b, seed, rough=0.22, depth=6):
    random.seed(seed)
    P = [a, b]
    for d in range(depth):
        Q = [P[0]]
        for i in range(len(P)-1):
            (x1, y1), (x2, y2) = P[i], P[i+1]
            mx, my = (x1+x2)/2, (y1+y2)/2
            L = math.hypot(x2-x1, y2-y1)
            nx, ny = -(y2-y1)/L, (x2-x1)/L
            off = (random.random()-.5)*L*rough
            Q += [(mx+nx*off, my+ny*off), (x2, y2)]
        P = Q
    return P

def tomoe(cx, cy, r, rot):
    out = []
    for k in range(3):
        a = rot + k*120
        hr = r*.3
        d = (f"M{f(hr)} {f(-r*.42)} A{f(hr)} {f(hr)} 0 1 0 {f(-hr*.2)} {f(-r*.42+hr*.98)} "
             f"Q{f(r*.2)} {f(-r*.05)} {f(-r*.1)} {f(r*.32)} Q{f(r*.55)} {f(r*.05)} {f(hr)} {f(-r*.42)} Z")
        out.append(f'<path transform="translate({f(cx)} {f(cy)}) rotate({f(a)})" d="{d}"/>')
    return "".join(out)

def limb(pts_, w0, w1):
    c = catmull(pts_, 14)
    # muscle : renflement au premier tiers, articulation plus fine au milieu, renflement à l'avant-bras
    return ribbon(c, lambda t: (w0 + (w1-w0)*t) * (1 + .28*math.sin(math.pi*min(1, t*2.1)) + .18*math.sin(math.pi*max(0, t*2.1-1.1))))

def scene():
    defs = '''<linearGradient id="j_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05061A"/><stop offset=".5" stop-color="#14123E"/><stop offset="1" stop-color="#2A1240"/></linearGradient>
<radialGradient id="j_flash" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#9FD8FF" stop-opacity=".55"/><stop offset=".45" stop-color="#6A5BFF" stop-opacity=".18"/><stop offset="1" stop-color="#6A5BFF" stop-opacity="0"/></radialGradient>
<radialGradient id="j_drum" cx=".4" cy=".35"><stop offset="0" stop-color="#F3E3C4"/><stop offset="1" stop-color="#B9A27A"/></radialGradient>
<linearGradient id="j_body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1A2464"/><stop offset=".6" stop-color="#080C30"/><stop offset="1" stop-color="#03051A"/></linearGradient>
<linearGradient id="j_cloud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B2A6E"/><stop offset="1" stop-color="#07081F"/></linearGradient>'''
    b = [f'<rect width="{W}" height="{H}" fill="url(#j_sky)"/>', stars(60, 23, 260)]
    b.append(f'<rect width="{W}" height="{H}" fill="url(#j_flash)" class="pulse"/>')
    # nuages d'orage (boules éclairées par le dessus)
    random.seed(5)
    def cloudbank(y, n, rmin, rmax, col, op, seed):
        random.seed(seed); o = []
        for i in range(n):
            x = -100 + i*(1800/n) + random.random()*60; r = rmin + random.random()*(rmax-rmin)
            o.append(f'<circle cx="{f(x)}" cy="{f(y + random.random()*40)}" r="{f(r)}"/>')
        return f'<g fill="{col}" opacity="{op}">{"".join(o)}</g>'
    b.append(cloudbank(250, 16, 80, 150, '#1C1A52', .8, 1))
    b.append(cloudbank(720, 14, 110, 190, 'url(#j_cloud)', 1, 2))
    # éclairs de fond
    for i, (a_, b_) in enumerate([((240, 0), (420, 520)), ((1380, 0), (1250, 480)), ((1530, 60), (1580, 400))]):
        P = bolt(a_, b_, i+3, .3, 6)
        b.append(f'<g class="pulse" style="animation-delay:-{i*.9:.1f}s"><polyline points="{pts(P)}" fill="none" stroke="#B8F3FF" stroke-width="7" opacity=".35" filter="url(#blur4)"/><polyline points="{pts(P)}" fill="none" stroke="#FFFFFF" stroke-width="2"/></g>')
    cx, cy = 800, 400
    # anneau de tambours
    R = 260; ring = []
    ring.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="#FFD86B" stroke-width="6" opacity=".85"/><circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="#FFD86B" stroke-width="18" opacity=".18" filter="url(#blur4)"/>')
    drums = []
    for k in range(8):
        a = math.radians(k*45 - 90)
        x, y = cx + math.cos(a)*R, cy + math.sin(a)*R
        drums.append((x, y))
        ring.append(f'<g><ellipse cx="{f(x)}" cy="{f(y+8)}" rx="44" ry="44" fill="#5A0F22"/><circle cx="{f(x)}" cy="{f(y)}" r="42" fill="#C81E3A" stroke="#1b1033" stroke-width="3"/>'
                    f'<circle cx="{f(x)}" cy="{f(y)}" r="32" fill="url(#j_drum)" stroke="#5A0F22" stroke-width="2"/>'
                    + "".join(f'<circle cx="{f(x + math.cos(math.radians(j*30))*37)}" cy="{f(y + math.sin(math.radians(j*30))*37)}" r="2.6" fill="#FFD86B"/>' for j in range(12))
                    + f'<g fill="#C81E3A">{tomoe(x, y, 26, k*20)}</g></g>')
    # arcs électriques entre tambours
    for k in range(8):
        P = bolt(drums[k], drums[(k+1) % 8], 40+k, .25, 4)
        ring.append(f'<polyline class="pulse" style="animation-delay:-{k*.37:.2f}s" points="{pts(P)}" fill="none" stroke="#9BF0FF" stroke-width="2" opacity=".85"/>')
    b.append("".join(ring))
    # le dieu du tonnerre (silhouette éclairée)
    g = [f'<g transform="translate({cx} {cy+60})">']
    # écharpe céleste qui flotte
    scarf = catmull([(-60, -110), (-200, -150), (-300, -60), (-220, 40), (-60, 30), (80, 60), (240, 20), (320, -90), (220, -170), (90, -120)], 12)
    g.append(f'<path d="{ribbon(scarf, lambda t: 3 + 7*math.sin(math.pi*t))}" fill="#E0245E" opacity=".8" class="sway"/><path d="{ribbon(scarf, lambda t: 1 + 2*math.sin(math.pi*t))}" fill="#FF94CB" opacity=".7" class="sway"/>')
    # cheveux sauvages
    for k in range(9):
        a = math.radians(-150 + k*14)
        L = 90 + 40*math.sin(k)
        c = bez((0, -170), (math.cos(a)*L*.4, -170 + math.sin(a)*L*.4), (math.cos(a+.3)*L*.8 + 30, -170 + math.sin(a+.3)*L*.8), (math.cos(a+.4)*L + 50, -170 + math.sin(a+.4)*L), 14)
        g.append(f'<path d="{ribbon(c, lambda t: 14*(1-t)+1)}" fill="#F4F7FF" opacity=".9"/>')
    body = []
    body.append(limb([(-40, 10), (-120, 70), (-90, 170)], 30, 16))   # jambe gauche
    body.append(limb([(40, 10), (130, 50), (165, 145)], 30, 16))     # jambe droite
    body.append(limb([(-84, -104), (-170, -160), (-150, -250)], 26, 16))  # bras levé
    body.append(limb([(84, -104), (170, -56), (236, -100)], 26, 16))      # bras tendu
    torso = "M-96 -116 C-70 -146 70 -146 96 -116 C110 -84 92 -60 70 -44 C60 -20 52 0 46 14 L-46 14 C-52 0 -60 -20 -70 -44 C-92 -60 -110 -84 -96 -116 Z"
    pants = "M-56 0 L56 0 L70 40 L20 60 L0 40 L-20 60 L-70 40 Z"
    for d in body:
        g.append(f'<path d="{d}" fill="url(#j_body)" stroke="#46D9FF" stroke-width="2" stroke-opacity=".8"/>')
    # poings et pieds
    for (x, y, r) in [(-150, -252, 20), (238, -100, 20), (-92, 172, 18), (168, 146, 18)]:
        g.append(f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{r*.85}" fill="url(#j_body)" stroke="#46D9FF" stroke-width="2" stroke-opacity=".8"/>')
    g.append(f'<path d="{torso}" fill="url(#j_body)" stroke="#46D9FF" stroke-width="2" stroke-opacity=".8"/>')
    g.append('<path d="M-50 -100 Q0 -80 50 -100 M-30 -60 Q0 -50 30 -60 M0 -96 L0 -10" stroke="#46D9FF" stroke-opacity=".35" stroke-width="2" fill="none"/>')
    # pagne en peau de tigre
    g.append(f'<path d="{pants}" fill="#E8A21E" stroke="#1b1033" stroke-width="2"/><path d="M-44 8 l10 20 M-20 6 l8 26 M10 8 l6 22 M34 6 l8 20" stroke="#1b1033" stroke-width="5" stroke-linecap="round"/>')
    # baguettes
    g.append('<path d="M-150 -250 L-112 -340" stroke="#FFD86B" stroke-width="8" stroke-linecap="round"/><circle cx="-112" cy="-344" r="10" fill="#FFD86B"/>'
             '<path d="M236 -100 L320 -60" stroke="#FFD86B" stroke-width="8" stroke-linecap="round"/><circle cx="324" cy="-58" r="10" fill="#FFD86B"/>')
    # tête : visage d'oni, cornes, yeux luisants
    g.append('<path d="M-22 -184 C-34 -214 -54 -232 -70 -240 C-52 -220 -44 -200 -38 -178 Z" fill="#F3E3C4" stroke="#1b1033" stroke-width="1.6"/>'
             '<path d="M22 -184 C34 -214 54 -232 70 -240 C52 -220 44 -200 38 -178 Z" fill="#F3E3C4" stroke="#1b1033" stroke-width="1.6"/>'
             '<path d="M-34 -176 C-36 -150 -24 -124 0 -118 C24 -124 36 -150 34 -176 C22 -196 -22 -196 -34 -176 Z" fill="url(#j_body)" stroke="#46D9FF" stroke-width="2"/>'
             '<path d="M-24 -164 L-8 -158 L-24 -154 Z M24 -164 L8 -158 L24 -154 Z" fill="#FFD86B" filter="url(#glow)"/>'
             '<path d="M-14 -136 Q0 -128 14 -136 L10 -130 L4 -136 L0 -128 L-4 -136 L-10 -130 Z" fill="#F4F7FF"/>')
    g.append('</g>')
    b.append("".join(g))
    # pluie
    random.seed(99)
    rain = "".join(f'<line x1="{f(x)}" y1="{f(y)}" x2="{f(x-10)}" y2="{f(y+40)}"/>' for x, y in ((random.random()*1700, random.random()*900) for _ in range(140)))
    b.append(f'<g stroke="#9FB4FF" stroke-opacity=".25" stroke-width="1.2">{rain}</g>')
    b.append(cloudbank(860, 12, 120, 200, '#05061A', 1, 3))
    b.append('<radialGradient id="vig"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient><rect width="1600" height="900" fill="url(#vig)"/>')
    return svg("".join(b), defs)
open(sys.argv[1], 'w').write(scene())
