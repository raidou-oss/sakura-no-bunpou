import math, random, sys
sys.path.insert(0, sys.path[0])
from lib import *

def cloud(x, y, s, col="#0E1640", line="#46D9FF"):
    # nuage façon estampe : lobes ronds + volute
    lobes = [(0, 0, 40), (44, -14, 34), (84, -2, 30), (-40, -6, 28), (118, 8, 22)]
    body = "".join(f'<circle cx="{f(x+lx*s)}" cy="{f(y+ly*s)}" r="{f(r*s)}"/>' for lx, ly, r in lobes)
    curl = f'<path d="M{f(x-20*s)} {f(y+6*s)} q{f(20*s)} {f(-26*s)} {f(40*s)} {f(-4*s)} q{f(-14*s)} {f(-6*s)} {f(-20*s)} {f(8*s)}" fill="none" stroke="{line}" stroke-width="{f(3*s)}" stroke-linecap="round" opacity=".7"/>'
    base = ''
    return f'<g fill="{col}" stroke="{line}" stroke-opacity=".35" stroke-width="{f(2*s)}">{body}{base}</g>{curl}'

def wave(x0, y0, w, h, seed):
    random.seed(seed)
    out = []
    crest = f"M{x0} {y0+h} C{x0+w*.2} {y0+h*.2} {x0+w*.5} {y0-h*.25} {x0+w*.72} {y0+h*.05} C{x0+w*.86} {y0+h*.18} {x0+w*.8} {y0+h*.42} {x0+w*.68} {y0+h*.36} C{x0+w*.74} {y0+h*.6} {x0+w*.9} {y0+h*.7} {x0+w} {y0+h} Z"
    out.append(f'<path d="{crest}" fill="url(#r_wave)" stroke="#B8F3FF" stroke-width="2.5" stroke-opacity=".8"/>')
    # écume : griffes recourbées + gouttes
    for i in range(16):
        t = i/15
        px = x0 + w*(.40 + .36*t); py = y0 - h*.2 + h*.28*t*t
        L = 16 + 10*math.sin(i*1.7)
        out.append(f'<path d="M{f(px)} {f(py)} c{f(-6)} {f(-L*.6)} {f(6)} {f(-L)} {f(14)} {f(-L*.7)} c{f(-8)} {f(2)} {f(-10)} {f(L*.4)} {f(-4)} {f(L*.7)}" fill="#E6FBFF"/>')
        out.append(f'<circle cx="{f(px+18)}" cy="{f(py-L-6)}" r="{f(2+random.random()*3)}" fill="#E6FBFF"/>')
    for k in range(5):
        yy = y0 + h*(.35 + k*.13)
        out.append(f'<path d="M{f(x0+w*.1)} {f(yy+h*.3)} C{f(x0+w*.3)} {f(yy)} {f(x0+w*.5)} {f(yy-h*.05)} {f(x0+w*.62)} {f(yy+h*.04)}" fill="none" stroke="#B8F3FF" stroke-opacity=".5" stroke-width="2"/>')
    return "".join(out)

def scene():
    defs = '''<linearGradient id="r_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#02081C"/><stop offset=".55" stop-color="#0A2152"/><stop offset="1" stop-color="#0D3A6E"/></linearGradient>
<linearGradient id="r_body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1B2D78"/><stop offset=".5" stop-color="#0B1648"/><stop offset="1" stop-color="#040A26"/></linearGradient>
<linearGradient id="r_belly" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A6A2E"/><stop offset="1" stop-color="#3E2C12"/></linearGradient>
<linearGradient id="r_wave" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16408F"/><stop offset=".6" stop-color="#0A1D52"/><stop offset="1" stop-color="#040C24"/></linearGradient>
<radialGradient id="r_pearl" cx=".38" cy=".35"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="#C8F6FF"/><stop offset="1" stop-color="#46D9FF"/></radialGradient>
<radialGradient id="r_pglow"><stop offset="0" stop-color="#B8F3FF" stop-opacity=".9"/><stop offset=".4" stop-color="#46D9FF" stop-opacity=".35"/><stop offset="1" stop-color="#46D9FF" stop-opacity="0"/></radialGradient>
<linearGradient id="r_head" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22389A"/><stop offset=".6" stop-color="#0D1A55"/><stop offset="1" stop-color="#050B2C"/></linearGradient>'''
    b = [f'<rect width="{W}" height="{H}" fill="url(#r_sky)"/>', stars(110, 17, 380)]
    b.append('<circle cx="1320" cy="170" r="300" fill="url(#r_pglow)" opacity=".35"/>')
    b.append(mist(300, 120, '#46D9FF', .12, 41, 6))
    b.append('<path class="pulse" d="M1460 0 L1420 90 L1450 96 L1390 220 L1430 226 L1360 360" fill="none" stroke="#B8F3FF" stroke-width="3" filter="url(#glow)" opacity=".7"/>')
    # nuages lointains
    for (x, y, s_) in [(180, 210, 1.1), (1180, 120, .9), (1420, 330, 1.2), (560, 140, .8)]:
        b.append(f'<g opacity=".7" class="drift">{cloud(x, y, s_)}</g>')
    # corps du dragon : grand S qui traverse la scène
    cps = [(1700, 760), (1460, 600), (1240, 720), (980, 820), (760, 640), (880, 430), (1120, 380), (1180, 230), (980, 150), (760, 230), (600, 330)]
    c = catmull(cps, 16)
    n = len(c)
    wf = lambda t: 5 + 42*min(1, t*1.8)**0.8 * (1 - 0.3*max(0, t - .88)/.12)
    body = ribbon(c, wf)
    ns = normals(c)
    b.append(f'<g filter="url(#blur12)" opacity=".5"><path d="{body}" fill="#46D9FF"/></g>')
    # nageoire dorsale (côté gauche de la ligne)
    spikes = []
    for i in range(6, n-8, 5):
        t = i/(n-1); w_ = wf(t); x, y = c[i]; nx, ny = ns[i]
        bx, by = x + nx*w_, y + ny*w_
        tx, ty = bx + nx*(26 + 12*math.sin(i)), by + ny*(26 + 12*math.sin(i))
        ax, ay = c[min(n-1, i+3)]
        spikes.append(f'<path d="M{f(bx)} {f(by)} L{f(tx + (ax-x)*.5)} {f(ty + (ay-y)*.5)} L{f(ax + nx*wf((i+3)/(n-1)))} {f(ay + ny*wf((i+3)/(n-1)))} Z" fill="#160A2E" stroke="#FF94CB" stroke-width="1.5" stroke-opacity=".8"/>')
    b.append("".join(spikes))
    b.append(f'<path d="{body}" fill="url(#r_body)" stroke="#46D9FF" stroke-width="2.2" stroke-opacity=".85"/>')
    # ventre clair (côté droit)
    belly = ribbon([(x - ns[i][0]*wf(i/(n-1))*.62, y - ns[i][1]*wf(i/(n-1))*.62) for i, (x, y) in enumerate(c)], lambda t: wf(t)*.3)
    b.append(f'<path d="{belly}" fill="url(#r_belly)" opacity=".75"/>')
    for i in range(4, n-2, 3):
        x, y = c[i]; nx, ny = ns[i]; w_ = wf(i/(n-1))
        p1 = (x - nx*w_*.2, y - ny*w_*.2); p2 = (x - nx*w_*.92, y - ny*w_*.92)
        b.append(f'<line x1="{f(p1[0])}" y1="{f(p1[1])}" x2="{f(p2[0])}" y2="{f(p2[1])}" stroke="#FFD86B" stroke-width="1.2" opacity=".35"/>')
    # écailles (arcs en quinconce)
    sc_ = []
    for i in range(3, n-3, 2):
        t = i/(n-1); w_ = wf(t); x, y = c[i]; nx, ny = ns[i]
        tx, ty = c[min(n-1, i+1)][0]-x, c[min(n-1, i+1)][1]-y
        for row in (0.15, 0.5, 0.82):
            if row < .2 and i % 4: continue
            px, py = x + nx*w_*row, y + ny*w_*row
            r = 3 + w_*.11
            a0 = math.degrees(math.atan2(ty, tx))
            sc_.append(f'<path d="M{f(px - r)} {f(py)} a{f(r)} {f(r)} 0 0 0 {f(2*r)} 0" transform="rotate({f(a0)} {f(px)} {f(py)})"/>')
    b.append(f'<g fill="none" stroke="#46D9FF" stroke-opacity=".3" stroke-width="1.3">{"".join(sc_)}</g>')
    # tête (au bout du corps, regard à gauche)
    hx, hy = c[-1]
    head = (f'<g transform="translate({f(hx+18)} {f(hy+10)}) rotate(-10) scale(1.5)">'
            # crinière
            + "".join(f'<path d="{ribbon(bez((10, -10+k*10), (60, -40+k*14), (110, -10+k*20), (150+k*6, 20+k*24), 14), lambda u: 12*(1-u)+1)}" fill="#5A1A4A" stroke="#FF94CB" stroke-opacity=".6" opacity="{f(.9-k*.1)}" class="sway"/>' for k in range(4))
            # cornes
            + '<path d="M-40 -34 C-20 -90 30 -120 80 -126 C40 -108 6 -80 -20 -30 Z" fill="#D8CDB0" stroke="#3E2C12" stroke-width="1.5"/>'
            '<path d="M-20 -32 C6 -76 50 -92 92 -90 C56 -78 24 -56 0 -28 Z" fill="#B9AE90" stroke="#3E2C12" stroke-width="1.5"/>'
            # joues / nageoires
            '<path d="M-10 -10 L44 34 L18 6 L52 10 L14 -14 Z" fill="#160A2E" stroke="#FF94CB" stroke-width="1.5"/>'
            # mâchoire inférieure (ouverte)
            '<path d="M-30 8 C-70 16 -130 34 -190 52 C-196 60 -186 64 -170 62 C-120 56 -70 46 -36 36 C-18 30 -12 22 -30 8 Z" fill="#070D33" stroke="#46D9FF" stroke-width="2"/>'
            '<path d="M-176 56 C-130 46 -80 36 -40 26" stroke="#E0245E" stroke-width="7" stroke-linecap="round" opacity=".55" fill="none"/>'
            '<path d="M-170 58 l6 -12 l6 10 l8 -13 l6 11 l9 -13 l6 11 l9 -12 l6 10 l9 -11 l5 9" fill="#E6FBFF"/>'
            '<path d="M-150 44 C-190 30 -214 40 -236 26 M-214 36 l-14 -2 M-214 36 l-10 10" stroke="#C81E3A" stroke-width="3" fill="none" stroke-linecap="round"/>'
            # crâne + museau
            '<path d="M20 -40 C-10 -62 -60 -66 -100 -58 C-112 -70 -126 -72 -136 -62 C-160 -56 -190 -50 -214 -44 C-226 -48 -236 -42 -232 -30 C-230 -22 -222 -18 -210 -18 L-120 -10 C-90 -8 -60 0 -30 4 C-10 8 10 0 20 -10 Z" fill="url(#r_head)" stroke="#46D9FF" stroke-width="2"/>'
            '<path d="M-210 -18 l7 12 l6 -11 l8 13 l6 -12 l8 12 l6 -11 l8 11 l6 -10 l8 10 l6 -9" fill="#E6FBFF"/>'
            # reflets de lumière sur le dessus de la tête
            '<path d="M10 -40 C-30 -58 -70 -60 -100 -56 M-140 -60 C-170 -52 -196 -48 -214 -44" stroke="#B8F3FF" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>'
            # naseau en volute
            '<path d="M-226 -38 c6 -6 14 -2 12 4 c-2 6 -10 6 -10 0" fill="none" stroke="#46D9FF" stroke-width="2"/>'
            # arcade et œil
            '<path d="M-100 -58 L-110 -78 L-118 -60 L-128 -80 L-136 -62 Z" fill="#160A2E" stroke="#FF94CB" stroke-width="1.2"/>'
            '<path d="M-138 -44 Q-120 -58 -96 -48 Q-116 -38 -138 -44 Z" fill="#FFD86B" filter="url(#glow)"/><ellipse cx="-117" cy="-47" rx="2.6" ry="6.5" fill="#1b1033"/>'
            '<path d="M-140 -40 Q-118 -32 -96 -44" stroke="#46D9FF" stroke-width="1.4" fill="none" opacity=".7"/>'
            # écailles de joue
            '<g fill="none" stroke="#46D9FF" stroke-opacity=".35" stroke-width="1.2"><path d="M-70 -20 a6 6 0 0 0 12 0 M-54 -14 a6 6 0 0 0 12 0 M-40 -8 a6 6 0 0 0 12 0 M-62 -32 a6 6 0 0 0 12 0 M-46 -26 a6 6 0 0 0 12 0 M-30 -20 a6 6 0 0 0 12 0"/></g>'
            # moustaches
            '<path class="sway" d="M-222 -24 C-260 0 -250 70 -210 110 C-180 140 -220 180 -260 200" fill="none" stroke="#B8F3FF" stroke-width="2.6" stroke-opacity=".8" stroke-linecap="round"/>'
            '<path class="sway" d="M-200 -20 C-214 30 -170 70 -140 96 C-110 124 -130 160 -170 190" fill="none" stroke="#B8F3FF" stroke-width="2" stroke-linecap="round" opacity=".8"/>'
            # barbiche
            '<path d="M-60 46 C-70 80 -60 110 -80 140" fill="none" stroke="#5A1A4A" stroke-width="6" stroke-linecap="round" opacity=".9"/>'
            '</g>')
    b.append(head)
    # nuages devant
    for (x, y, s_) in [(120, 520, 1.4), (1300, 520, 1.3), (520, 760, 1.1)]:
        b.append(f'<g class="drift" opacity=".9">{cloud(x, y, s_, "#101A4C", "#7FA8FF")}</g>')
    # perle
    px, py = hx - 330, hy + 150
    b.append(f'<circle cx="{f(px)}" cy="{f(py)}" r="110" fill="url(#r_pglow)" class="pulse"/><circle cx="{f(px)}" cy="{f(py)}" r="30" fill="url(#r_pearl)"/>'
             f'<g fill="none" stroke="#FFD86B" stroke-width="2.5" opacity=".8"><path d="M{f(px-46)} {f(py)} q8 -24 20 -6 q10 -30 22 -4"/><path d="M{f(px+46)} {f(py+6)} q-8 -24 -20 -6 q-10 -30 -22 -2"/></g>')
    # mer et grande vague
    b.append(f'<path d="{ridge(760, 30, 51, 40, .4)}" fill="#0A1E52"/>')
    b.append(wave(-60, 640, 760, 300, 3))
    b.append(f'<path d="{ridge(840, 20, 52, 30, .4)}" fill="#061433"/>')
    random.seed(77)
    for i in range(40):
        x, y = random.random()*W, 700 + random.random()*200
        b.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(1+random.random()*2.5)}" fill="#E6FBFF" opacity="{f(.3+random.random()*.6)}"/>')
    b.append('<radialGradient id="vig"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient><rect width="1600" height="900" fill="url(#vig)"/>')
    return svg("".join(b), defs)
open(sys.argv[1], 'w').write(scene())
