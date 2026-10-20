import math, random, sys
sys.path.insert(0, sys.path[0])
from lib import *

def wing(side=1):
    bone = catmull([(55, -170), (200, -280), (360, -330), (520, -290), (600, -230)], 10)
    bone = [(x*side, y) for x, y in bone]
    back, front, ribs = [], [], []
    n = 30
    for i in range(n):
        t = i/(n-1)
        k = min(len(bone)-1, int(t*(len(bone)-1))); bx, by = bone[k]
        L = 110 + 330*t**1.15
        deg = 98 - 72*t**1.2                     # vers le bas près de l'épaule, vers l'extérieur au bout
        a = math.radians(deg)
        dx, dy = math.cos(a)*L*side, math.sin(a)*L
        tip = (bx + dx, by + dy)
        bend = 18*side
        c = bez((bx, by), (bx + dx*0.3 + bend, by + dy*0.3), (bx + dx*0.75 + bend*0.6, by + dy*0.75), tip, 18)
        wmax = 9 + 13*t
        wf = lambda u, wmax=wmax: wmax * math.sin(math.pi*min(1, u*1.05 + .06))**0.55 * (1 - u**5) + .8
        back.append(ribbon(c, wf)); ribs.append(c)
    for i in range(22):
        t = i/21; k = min(len(bone)-1, int(t*(len(bone)-1))); bx, by = bone[k]
        L = 50 + 80*t; a = math.radians(100 - 40*t)
        dx, dy = math.cos(a)*L*side, math.sin(a)*L
        c = bez((bx, by - 8), (bx + dx*.3, by + dy*.3), (bx + dx*.7, by + dy*.7), (bx + dx, by + dy), 12)
        front.append(ribbon(c, lambda u: 13*math.sin(math.pi*min(1, u + .1))**0.5*(1-u**3) + 1))
    return back, front, ribs, bone

def figure():
    body = ("M-30 -222 C-60 -215 -78 -200 -86 -170 L-104 -60 C-108 -30 -98 -8 -80 2 L-60 -20 L-62 60 "
            "C-70 120 -80 172 -96 204 L-30 196 L0 210 L30 196 L96 204 C80 172 70 120 62 60 L60 -20 L80 2 "
            "C98 -8 108 -30 104 -60 L86 -170 C78 -200 60 -215 30 -222 Z")
    return body

def scene():
    defs = '''<linearGradient id="t_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050716"/><stop offset=".5" stop-color="#1A0E3A"/><stop offset=".78" stop-color="#4A1236"/><stop offset="1" stop-color="#1B0A24"/></linearGradient>
<radialGradient id="t_moon" cx=".5" cy=".5"><stop offset="0" stop-color="#FFB38A"/><stop offset=".55" stop-color="#E0245E"/><stop offset=".85" stop-color="#7A0F3A"/><stop offset="1" stop-color="#3A0626"/></radialGradient>
<radialGradient id="t_halo"><stop offset="0" stop-color="#FF4F7A" stop-opacity=".5"/><stop offset=".4" stop-color="#C81E3A" stop-opacity=".18"/><stop offset="1" stop-color="#C81E3A" stop-opacity="0"/></radialGradient>
<linearGradient id="t_wing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121640"/><stop offset="1" stop-color="#03041A"/></linearGradient>
<linearGradient id="t_blade" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#9FB4FF"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient>'''
    b = [f'<rect width="{W}" height="{H}" fill="url(#t_sky)"/>', stars(140, 9, 420)]
    cx, cy = 800, 420
    b.append(f'<circle cx="{cx}" cy="{cy-40}" r="520" fill="url(#t_halo)"/><circle cx="{cx}" cy="{cy-40}" r="250" fill="url(#t_moon)"/>')
    b.append(mist(330, 140, '#C81E3A', .18, 31, 6))
    # pics de montagne acérés
    random.seed(4)
    for layer, (y0, col, op) in enumerate([(560, '#140B30', 1), (650, '#0B0822', 1)]):
        xs = list(range(-40, 1700, 90)); ps = [(-40, 900)]
        for x in xs:
            ps += [(x, y0 - random.random()*180*(1 - layer*.3)), (x + 45, y0 + 40)]
        ps.append((1700, 900))
        b.append(f'<path d="M{pts(ps)} Z" fill="{col}" opacity="{op}"/>')
    b.append(mist(620, 80, '#FF94CB', .12, 33, 6))
    # rocher sommet
    b.append(f'<path d="{smooth_path([(650,900),(690,760),(730,690),(770,662),(830,660),(880,690),(930,780),(980,900)])}" fill="#05041A"/>')
    # ailes
    fx, fy, sc = cx, 476, 0.78
    g = [f'<g transform="translate({fx} {fy}) scale({sc})">']
    for side in (1, -1):
        back, front, ribs, bone = wing(side)
        g.append('<g filter="url(#blur4)" opacity=".7">' + "".join(f'<path d="{d}" fill="#E0245E" opacity=".35" transform="translate({3*side} -3)"/>' for d in back) + '</g>')
        g.append("".join(f'<path d="{d}" fill="url(#t_wing)" stroke="#46D9FF" stroke-opacity=".3" stroke-width="1.4"/>' for d in back))
        g.append("".join(f'<polyline points="{pts(r[2:-3])}" fill="none" stroke="#7FA8FF" stroke-opacity=".25" stroke-width="1"/>' for r in ribs))
        g.append("".join(f'<path d="{d}" fill="#0A0D2E" stroke="#FF94CB" stroke-opacity=".25" stroke-width="1"/>' for d in front))
    # katana
    g.append('<path d="M86 -6 Q170 -170 262 -320 L268 -316 Q178 -166 96 0 Z" fill="url(#t_blade)" opacity=".95"/><path d="M90 -4 Q172 -168 264 -318" stroke="#fff" stroke-width="1" fill="none"/><rect x="80" y="-14" width="22" height="7" fill="#FFD86B" transform="rotate(-62 90 -10)"/>'
             '<path d="M78 8 L92 -16 L98 -13 L84 11 Z" fill="#1b1033"/>')
    # corps
    body = figure()
    g.append(f'<path d="{body}" fill="#04051A" stroke="#E0245E" stroke-opacity=".55" stroke-width="2"/>')
    # ceinture et col
    g.append('<path d="M-62 40 Q0 54 62 40 L62 58 Q0 72 -62 58 Z" fill="#C81E3A"/><path d="M-30 -222 L0 -160 L30 -222" fill="none" stroke="#F4F7FF" stroke-width="4" opacity=".7"/>'
             '<g fill="#F4F7FF" opacity=".9"><circle cx="-26" cy="-160" r="9"/><circle cx="-26" cy="-132" r="9"/><circle cx="26" cy="-160" r="9"/><circle cx="26" cy="-132" r="9"/></g><g fill="#E0245E"><circle cx="-26" cy="-160" r="4"/><circle cx="-26" cy="-132" r="4"/><circle cx="26" cy="-160" r="4"/><circle cx="26" cy="-132" r="4"/></g>')
    # jambes et geta
    g.append('<rect x="-30" y="204" width="18" height="30" fill="#04051A"/><rect x="12" y="204" width="18" height="30" fill="#04051A"/><rect x="-40" y="232" width="34" height="8" fill="#2a1450"/><rect x="6" y="232" width="34" height="8" fill="#2a1450"/>')
    # tête : masque de tengu de profil (long nez), cheveux au vent, tokin
    g.append('<path d="M-24 -230 C-60 -236 -100 -246 -160 -226 C-120 -262 -80 -284 -30 -282 Z" fill="#F4F7FF" opacity=".92" class="sway"/><path d="M-30 -236 C-70 -230 -110 -224 -150 -200" stroke="#F4F7FF" stroke-width="3" fill="none" opacity=".6" class="sway"/>'
             '<ellipse cx="0" cy="-250" rx="32" ry="36" fill="#C81E3A" stroke="#1b1033" stroke-width="2"/>'
             '<path d="M20 -258 Q70 -270 112 -296 Q118 -286 110 -278 Q66 -250 24 -236 Z" fill="#B0182F" stroke="#1b1033" stroke-width="1.6"/>'
             '<path d="M-6 -268 Q10 -280 26 -268" stroke="#F4F7FF" stroke-width="6" fill="none" stroke-linecap="round"/>'
             '<path d="M2 -258 Q12 -264 20 -256 Q12 -252 2 -258 Z" fill="#FFD86B"/><path d="M-12 -232 Q2 -224 16 -232" stroke="#1b1033" stroke-width="2" fill="none"/>'
             '<path d="M-16 -284 L0 -302 L16 -284 L12 -276 L-12 -276 Z" fill="#05041A"/><circle cx="0" cy="-289" r="3" fill="#E0245E"/>')
    g.append('</g>')
    b.append("".join(g))
    # traînées de vent
    random.seed(12)
    for i in range(16):
        y = 120 + random.random()*620; x = random.random()*1600; L = 120 + random.random()*260
        b.append(f'<path class="drift" d="M{f(x)} {f(y)} q{f(L/2)} -{f(10+random.random()*16)} {f(L)} 0" fill="none" stroke="#F4F7FF" stroke-opacity="{f(.12+random.random()*.2)}" stroke-width="{f(1+random.random()*2)}" stroke-linecap="round" style="animation-delay:-{i}s"/>')
    # plumes qui volent
    for i in range(14):
        x, y = random.random()*W, random.random()*H*0.85; r = random.random()*360
        b.append(f'<path d="M{f(x)} {f(y)} q10 -26 4 -48 q-12 22 -4 48z" fill="#0A0D2E" stroke="#46D9FF" stroke-opacity=".4" transform="rotate({int(r)} {f(x)} {f(y)})"/>')
    b.append('<radialGradient id="vig"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient><rect width="1600" height="900" fill="url(#vig)"/>')
    return svg("".join(b), defs)
open(sys.argv[1], 'w').write(scene())
