import math, random
W, H = 1600, 900
def f(x): return f"{x:.1f}".rstrip('0').rstrip('.')
def pts(ps): return " ".join(f"{f(x)},{f(y)}" for x, y in ps)
def bez(p0, p1, p2, p3, n=40):
    out = []
    for i in range(n + 1):
        t = i / n; u = 1 - t
        out.append((u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0], u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1]))
    return out
def catmull(cps, n=12):
    out = []
    P = [cps[0]] + cps + [cps[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i-1], P[i], P[i+1], P[i+2]
        for k in range(n):
            t = k / n; t2 = t*t; t3 = t2*t
            out.append(tuple(0.5*((2*p1[j]) + (-p0[j]+p2[j])*t + (2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2 + (-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3) for j in (0, 1)))
    out.append(cps[-1]); return out
def normals(c):
    ns = []
    for i in range(len(c)):
        a = c[max(0, i-1)]; b = c[min(len(c)-1, i+1)]
        dx, dy = b[0]-a[0], b[1]-a[1]; L = math.hypot(dx, dy) or 1
        ns.append((-dy/L, dx/L))
    return ns
def ribbon(c, wfn):
    """Forme effilée autour d'une ligne centrale : wfn(t) = demi-largeur"""
    ns = normals(c); n = len(c)
    L = [(c[i][0]+ns[i][0]*wfn(i/(n-1)), c[i][1]+ns[i][1]*wfn(i/(n-1))) for i in range(n)]
    R = [(c[i][0]-ns[i][0]*wfn(i/(n-1)), c[i][1]-ns[i][1]*wfn(i/(n-1))) for i in range(n)]
    return "M" + pts(L) + " L" + pts(R[::-1]) + " Z"
def smooth_path(ps, closed=True):
    # chemin lissé (quadratiques par les milieux)
    if len(ps) < 3: return "M" + pts(ps)
    d = f"M{f((ps[0][0]+ps[1][0])/2)},{f((ps[0][1]+ps[1][1])/2)}"
    rng = range(1, len(ps)) if not closed else range(1, len(ps)+1)
    for i in rng:
        p = ps[i % len(ps)]; q = ps[(i+1) % len(ps)]
        if not closed and i == len(ps)-1: d += f" L{f(p[0])},{f(p[1])}"; break
        d += f" Q{f(p[0])},{f(p[1])} {f((p[0]+q[0])/2)},{f((p[1]+q[1])/2)}"
    return d + (" Z" if closed else "")
def ridge(y0, amp, seed, step=40, rough=0.55, x0=-20, x1=W+20):
    random.seed(seed)
    xs = list(range(x0, x1+step, step)); ys = []
    v = 0
    for i, x in enumerate(xs):
        v = v*rough + (random.random()-0.5)*amp
        ys.append(y0 + v + amp*0.4*math.sin(x/230 + seed))
    ps = list(zip(xs, ys))
    return "M" + pts([(x0, H+10)] + ps + [(x1, H+10)]) + " Z"
def stars(n, seed, ymax=520, cls="st"):
    random.seed(seed); out = []
    for i in range(n):
        x, y = random.random()*W, random.random()*ymax; r = random.choice([0.6, 0.8, 1, 1.2, 1.6, 2.2])
        out.append(f'<circle class="{cls}" cx="{f(x)}" cy="{f(y)}" r="{r}" style="--d:{f(2+random.random()*4)}s;--w:{f(-random.random()*4)}s"/>')
    return "".join(out)
def mist(y, h, color, op, seed, n=6):
    random.seed(seed); out = []
    for i in range(n):
        cx = random.random()*W; rx = 260 + random.random()*420
        out.append(f'<ellipse cx="{f(cx)}" cy="{f(y + (random.random()-.5)*h)}" rx="{f(rx)}" ry="{f(h*0.35+random.random()*h*0.3)}" fill="{color}" opacity="{f(op*(0.5+random.random()*0.5))}"/>')
    return f'<g filter="url(#blur30)">{"".join(out)}</g>'
def defs_common():
    return '''<filter id="blur30" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>
<filter id="blur12" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>
<filter id="blur4" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .05 0"/></filter>'''
def svg(body, defs=""):
    style = '<style>.st{fill:#fff;animation:tw var(--d) ease-in-out var(--w) infinite}@keyframes tw{50%{opacity:.25}}.fl{animation:flk 2.6s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}@keyframes flk{50%{transform:scale(.94,1.06)}}.sway{animation:sway 7s ease-in-out infinite;transform-box:fill-box;transform-origin:0% 100%}@keyframes sway{50%{transform:rotate(1.6deg)}}.drift{animation:drift 14s ease-in-out infinite alternate}@keyframes drift{to{transform:translateX(40px)}}.pulse{animation:pls 3s ease-in-out infinite}@keyframes pls{50%{opacity:.55}}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">{style}<defs>{defs_common()}{defs}</defs>{body}<rect width="{W}" height="{H}" filter="url(#grain)" opacity=".6"/></svg>'
