"""Génère toutes les icônes (site, PWA, Android, bureau) depuis tools/icon/source.png."""
from PIL import Image, ImageDraw
import os
R = os.path.dirname(os.path.abspath(__file__)) + '/../'
NAVY = (22, 25, 59)
src = Image.open(R + 'tools/icon/source.png').convert('RGB')
W = src.width  # 1254, cadre crème entre ~58 et ~74 px du bord

# Fleur seule sur fond uni (on efface le cadre)
inner = Image.new('RGB', src.size, NAVY)
cut = Image.new('L', src.size, 0)
ImageDraw.Draw(cut).rounded_rectangle((90, 90, W - 90, W - 90), radius=230, fill=255)
inner.paste(src, (0, 0), cut)

def rounded(img, radius_ratio):
    s = img.size[0]
    mask = Image.new('L', (s * 4, s * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, s * 4 - 1, s * 4 - 1), radius=int(s * 4 * radius_ratio), fill=255)
    out = img.convert('RGBA'); out.putalpha(mask.resize((s, s), Image.LANCZOS)); return out

def circle(img):
    s = img.size[0]
    mask = Image.new('L', (s * 4, s * 4), 0); ImageDraw.Draw(mask).ellipse((0, 0, s * 4 - 1, s * 4 - 1), fill=255)
    out = img.convert('RGBA'); out.putalpha(mask.resize((s, s), Image.LANCZOS)); return out

def padded(scale):
    """Fleur centrée occupant `scale` du carré (pour zones de sécurité maskable/adaptive)."""
    cx, cy, half = 627, 600, 470   # cercle englobant la fleur
    side = int(half * 2 / scale)
    c = Image.new('RGB', (side, side), NAVY)
    c.paste(inner, (side // 2 - cx, side // 2 - cy))
    return c

LZ = Image.LANCZOS
# --- Site ---
full = src.crop((48, 48, W - 48, W - 48))                       # avec le cadre, comme l'image d'origine
rounded(full, .2).resize((512, 512), LZ).save(R + 'img/icon-512.png')
rounded(full, .2).resize((192, 192), LZ).save(R + 'img/icon-192.png')
fav = rounded(padded(.92), .22)                                   # favicon : fleur bien lisible, sans le fin cadre
fav.resize((32, 32), LZ).save(R + 'img/favicon-32.png')
fav.resize((64, 64), LZ).save(R + 'img/favicon-64.png')
fav.resize((48, 48), LZ).save(R + 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
padded(.8).resize((180, 180), LZ).save(R + 'img/apple-touch-icon.png')   # iOS arrondit lui-même
padded(.62).resize((512, 512), LZ).save(R + 'img/icon-maskable-512.png')
# --- Android ---
A = R + 'android/app/src/main/res/'
for d, s in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
    os.makedirs(A + f'mipmap-{d}', exist_ok=True)
    rounded(full, .2).resize((s, s), LZ).save(A + f'mipmap-{d}/ic_launcher.png')
    circle(padded(.86)).resize((s, s), LZ).save(A + f'mipmap-{d}/ic_launcher_round.png')
    padded(66 / 108).resize((s * 108 // 48, s * 108 // 48), LZ).save(A + f'mipmap-{d}/ic_launcher_foreground.png')
# --- Bureau (Electron) ---
os.makedirs(R + 'desktop/build', exist_ok=True)
rounded(full, .2).resize((1024, 1024), LZ).save(R + 'desktop/build/icon.png')
rounded(full, .2).resize((512, 512), LZ).save(R + 'desktop/icon.png')
print('ok')
