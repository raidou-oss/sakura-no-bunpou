// Fond d'écran du portail : coupe diagonale lumière / encre, lune, rubans et pétales.
// Inspiré du langage graphique des visuels de Persona 3 Reload (aplats tranchés, rubans
// qui passent du sakura au cyan puis au bleu nuit), sans reprendre aucun personnage.

const petal = (x, y, s, r, fill, o = 1) =>
  `<path transform="translate(${x} ${y}) rotate(${r}) scale(${s})" d="M0 0 C-7 -8 -7 -18 -2 -24 L0 -21 L2 -24 C7 -18 7 -8 0 0Z" fill="${fill}" opacity="${o}"/>`;

/** Ruban : bande effilée entre deux courbes de Bézier */
const ribbon = (d, fill, o = 1, cls = '') => `<path class="wp-ribbon ${cls}" d="${d}" fill="${fill}" opacity="${o}"/>`;

export function wallpaperSVG() {
  // Pétales éparpillés : roses côté nuit, bleu nuit et cyan côté lumière
  const dark = [[200, 120, 1.4, 20], [190, 820, 1.1, -40], [470, 90, .9, 70], [640, 860, 1.5, 15], [120, 760, 1, -10], [760, 480, .8, 120], [700, 300, .7, 200]]
    .map(([x, y, s, r], i) => petal(x, y, s, r, i % 3 ? 'url(#wp-petal)' : '#FF94CB', .55 + (i % 3) * .15)).join('');
  const light = [[1240, 120, 1.3, 30], [1450, 300, 1, -60], [1330, 520, 1.6, 100], [1520, 700, .9, 10], [1120, 780, 1.2, -30], [1380, 840, .8, 160]]
    .map(([x, y, s, r], i) => petal(x, y, s, r, i % 2 ? '#0B2A7A' : '#1BA7E0', .75)).join('');
  // Éclats géométriques (comme les fragments violets / verts de l'affiche)
  const shards = [[130, 690, 26, '#7B5CFF'], [740, 380, 18, '#46D9FF'], [1060, 860, 22, '#7B5CFF'], [1500, 430, 16, '#63F0C3'], [820, 90, 14, '#FF94CB']]
    .map(([x, y, s, c]) => `<rect x="${x}" y="${y}" width="${s}" height="${s * .55}" transform="rotate(${(x + y) % 60 - 30} ${x} ${y})" fill="${c}" opacity=".7"/>`).join('');

  return `<svg class="wallpaper" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="wp-light" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset=".65" stop-color="#EEF7FF"/><stop offset="1" stop-color="#D7ECFF"/>
    </linearGradient>
    <linearGradient id="wp-ink" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#000208"/><stop offset="1" stop-color="#030A24"/>
    </linearGradient>
    <linearGradient id="wp-ribbon" x1="0" y1="0" x2="1600" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FF94CB"/><stop offset=".38" stop-color="#7FA8FF"/>
      <stop offset=".55" stop-color="#46D9FF"/><stop offset=".72" stop-color="#1468C8"/><stop offset="1" stop-color="#071A55"/>
    </linearGradient>
    <linearGradient id="wp-ribbon-2" x1="0" y1="0" x2="1600" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#46D9FF"/><stop offset=".5" stop-color="#7FA8FF"/><stop offset=".7" stop-color="#0E3A9A"/><stop offset="1" stop-color="#050F3A"/>
    </linearGradient>
    <linearGradient id="wp-petal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#46D9FF"/><stop offset="1" stop-color="#FF94CB"/>
    </linearGradient>
    <radialGradient id="wp-moon" cx=".38" cy=".36" r=".64">
      <stop offset="0" stop-color="#F7FCFF"/><stop offset=".55" stop-color="#CFEFFF"/><stop offset=".9" stop-color="#8DBBFF"/><stop offset="1" stop-color="#8DBBFF" stop-opacity="0"/>
    </radialGradient>
    <mask id="wp-crescent"><rect width="1600" height="900" fill="#fff"/><circle cx="952" cy="168" r="128" fill="#000"/></mask>
    <filter id="wp-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>

  <!-- Éclat de lumière : la grande coupe diagonale -->
  <polygon class="wp-light" points="900,0 1600,0 1600,900 1250,900" fill="url(#wp-light)"/>
  <polygon points="900,0 920,0 1270,900 1250,900" fill="#46D9FF" opacity=".55"/>
  <!-- Encre : aplats noirs tranchés -->
  <polygon points="0,0 300,0 0,270" fill="url(#wp-ink)" opacity=".9"/>
  <polygon points="0,700 0,900 360,900" fill="url(#wp-ink)"/>

  <!-- Lune, dans l'intervalle entre le titre et la carte, à cheval sur la coupe -->
  <g class="wp-moon">
    <circle cx="880" cy="200" r="190" fill="#46D9FF" opacity=".22" filter="url(#wp-glow)"/>
    <circle cx="880" cy="200" r="150" fill="url(#wp-moon)" mask="url(#wp-crescent)"/>
  </g>

  <!-- Rubans : ils naissent en bas, montent vers la lune et repartent bleu nuit sur la lumière -->
  <g class="wp-ribbons">
    ${ribbon('M560 940 C 640 800, 700 690, 800 590 S 980 380, 1120 360 S 1400 330, 1660 180 L 1660 214 C 1410 360, 1260 386, 1124 392 S 990 420, 826 610 S 680 820, 600 940 Z', 'url(#wp-ribbon)', .95)}
    ${ribbon('M700 940 C 790 820, 860 760, 980 690 S 1240 560, 1400 600 S 1560 640, 1660 560 L 1660 576 C 1560 660, 1420 624, 1400 622 S 1250 590, 996 712 S 820 830, 730 940 Z', 'url(#wp-ribbon-2)', .75, 'slow')}
    ${ribbon('M980 -40 C 1010 60, 960 140, 1040 220 S 1260 300, 1320 440 L 1304 446 C 1240 320, 1080 260, 1024 230 S 980 70, 962 -40 Z', 'url(#wp-ribbon-2)', .7)}
    ${ribbon('M-40 880 C 120 840, 260 860, 420 940 L 380 940 C 240 880, 120 870, -40 900 Z', 'url(#wp-ribbon)', .7, 'slow')}
  </g>

  <g class="wp-petals">${dark}${light}${shards}</g>
</svg>`;
}
