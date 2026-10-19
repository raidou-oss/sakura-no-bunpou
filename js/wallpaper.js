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

// --- Fonds dédiés aux sections ---------------------------------------------------------
// Même grammaire visuelle que le portail (coupe diagonale, encre, rubans, pétales),
// mais chaque section a son motif, sa couleur dominante et son grand kanji en filigrane.
const SECTIONS = {
  revision:   { kanji: '巡', a: '#46D9FF', b: '#7FA8FF', cut: 'left' },
  grammaire:  { kanji: '文', a: '#7FA8FF', b: '#FF94CB', cut: 'right' },
  vocabulaire:{ kanji: '語', a: '#FF94CB', b: '#46D9FF', cut: 'left' },
  jeux:       { kanji: '遊', a: '#FFB86B', b: '#FF94CB', cut: 'right' },
  communaute: { kanji: '絆', a: '#63F0C3', b: '#46D9FF', cut: 'left' },
  profil:     { kanji: '己', a: '#FF94CB', b: '#7B5CFF', cut: 'right' },
  reglages:   { kanji: '整', a: '#7FA8FF', b: '#46D9FF', cut: 'left' },
};
export const SECTION_KINDS = Object.keys(SECTIONS);

// Pseudo-aléatoire déterministe : le fond est le même à chaque visite
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function motif(kind, a, b, r) {
  switch (kind) {
    case 'revision': {
      // Orbites : les cartes reviennent, de plus en plus loin
      const cx = 1180, cy = 470;
      return [90, 170, 270, 390, 530].map((rad, i) =>
        `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${i % 2 ? b : a}" stroke-width="${i === 2 ? 3 : 1.4}" stroke-dasharray="${i % 2 ? '2 14' : `${rad * .9} ${rad * .5}`}" opacity="${.5 - i * .06}" transform="rotate(${i * 37} ${cx} ${cy})"/>`).join('')
        + [0, 1, 2, 3, 4].map(i => { const ang = i * 1.3 + .4, rad = [90, 170, 270, 390, 530][i];
          return `<circle cx="${(cx + Math.cos(ang) * rad).toFixed(0)}" cy="${(cy + Math.sin(ang) * rad).toFixed(0)}" r="${7 - i}" fill="${i % 2 ? b : a}"/>`; }).join('');
    }
    case 'grammaire': {
      // Papier quadrillé japonais (原稿用紙), colonnes verticales
      let g = '';
      for (let x = 980; x < 1600; x += 56) g += `<rect x="${x}" y="80" width="44" height="740" fill="none" stroke="${a}" stroke-width="1" opacity=".22"/>`;
      for (let y = 80; y < 820; y += 46) g += `<line x1="980" y1="${y}" x2="1600" y2="${y}" stroke="${a}" stroke-width="1" opacity=".14"/>`;
      return g + `<text x="1090" y="250" font-size="40" fill="${b}" opacity=".28" font-family="serif" writing-mode="tb">は・が・を</text>`;
    }
    case 'vocabulaire': {
      // Cartes de mots qui volent
      const words = ['桜', '空', '夢', '月', '道', '光', '声', '花'];
      return words.map((w, i) => {
        const x = 900 + r() * 620, y = 90 + r() * 700, rot = r() * 40 - 20, s = .7 + r() * .6;
        return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${rot.toFixed(0)}) scale(${s.toFixed(2)})" opacity=".55">
          <rect x="-46" y="-58" width="92" height="116" rx="14" fill="#071A55" stroke="${i % 2 ? a : b}" stroke-width="2"/>
          <text x="0" y="16" font-size="46" text-anchor="middle" fill="${i % 2 ? a : b}" font-family="sans-serif">${w}</text></g>`;
      }).join('');
    }
    case 'jeux': {
      // Lignes de vitesse et étoiles
      let g = '';
      for (let i = 0; i < 26; i++) {
        const y = 40 + r() * 820, len = 120 + r() * 380, x = 900 + r() * 700;
        g += `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x + len).toFixed(0)}" y2="${(y - len * .18).toFixed(0)}" stroke="${i % 3 ? a : b}" stroke-width="${(1 + r() * 3).toFixed(1)}" stroke-linecap="round" opacity="${(.25 + r() * .4).toFixed(2)}"/>`;
      }
      const star = (x, y, s, c) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -20 L5 -5 L20 0 L5 5 L0 20 L-5 5 L-20 0 L-5 -5Z" fill="${c}"/>`;
      return g + star(1150, 200, 2.2, a) + star(1420, 640, 1.6, b) + star(1000, 720, 1.1, '#fff') + star(1500, 160, 1, b);
    }
    case 'communaute': {
      // Constellation : élèves reliés entre eux
      const pts = Array.from({ length: 13 }, () => [900 + r() * 650, 80 + r() * 740]);
      let g = '';
      pts.forEach((p, i) => pts.slice(i + 1).forEach(q => {
        const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
        if (d < 260) g += `<line x1="${p[0].toFixed(0)}" y1="${p[1].toFixed(0)}" x2="${q[0].toFixed(0)}" y2="${q[1].toFixed(0)}" stroke="${a}" stroke-width="1.4" opacity="${(.5 - d / 700).toFixed(2)}"/>`;
      }));
      return g + pts.map((p, i) => `<circle cx="${p[0].toFixed(0)}" cy="${p[1].toFixed(0)}" r="${i % 4 ? 5 : 9}" fill="${i % 3 ? a : b}"/>`).join('');
    }
    case 'profil': {
      // Pleine lune derrière un cadre de portrait incliné
      return `<circle cx="1230" cy="380" r="210" fill="${b}" opacity=".18" filter="url(#pw-glow)"/>
        <circle cx="1230" cy="380" r="170" fill="url(#pw-moon)" opacity=".85"/>
        <rect x="1050" y="170" width="360" height="460" rx="28" fill="none" stroke="${a}" stroke-width="3" transform="rotate(-8 1230 400)" opacity=".7"/>
        <rect x="1070" y="190" width="320" height="420" rx="22" fill="none" stroke="#fff" stroke-width="1" transform="rotate(-8 1230 400)" opacity=".35"/>`;
    }
    default: {
      // Réglages : curseurs et réticule
      let g = '';
      [0, 1, 2, 3].forEach(i => {
        const y = 230 + i * 130, k = 1020 + r() * 420;
        g += `<line x1="980" y1="${y}" x2="1520" y2="${y}" stroke="${a}" stroke-width="3" stroke-linecap="round" opacity=".3"/>
          <circle cx="${k.toFixed(0)}" cy="${y}" r="14" fill="#071A55" stroke="${i % 2 ? b : a}" stroke-width="3" opacity=".8"/>`;
      });
      return g;
    }
  }
}

export function sectionWallpaperSVG(kind) {
  const c = SECTIONS[kind] || SECTIONS.reglages;
  const r = rng([...kind].reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) % 2147483646 + 1);
  const left = c.cut === 'left';
  // Coupe de lumière (côté opposé au contenu principal quand c'est possible)
  const cut = left ? '0,620 0,900 520,900 760,640' : '1040,0 1600,0 1600,330 1300,0';
  const edge = left ? '760,640 776,640 536,900 520,900' : '1040,0 1300,0 1316,0 1056,0';
  const petals = Array.from({ length: 12 }, (_, i) => petal((r() * 1600).toFixed(0), (r() * 900).toFixed(0), (.7 + r() * .9).toFixed(2), (r() * 360).toFixed(0), i % 3 ? c.b : c.a, .45)).join('');
  return `<svg class="wallpaper" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="pw-rib" x1="0" y1="0" x2="1600" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${c.b}"/><stop offset=".5" stop-color="${c.a}"/><stop offset="1" stop-color="#071A55"/>
    </linearGradient>
    <linearGradient id="pw-cut" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="${c.a}"/><stop offset="1" stop-color="${c.b}"/></linearGradient>
    <linearGradient id="pw-kanji" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.a}"/><stop offset="1" stop-color="${c.b}"/></linearGradient>
    <radialGradient id="pw-moon" cx=".38" cy=".36" r=".64"><stop offset="0" stop-color="#F7FCFF"/><stop offset=".6" stop-color="#CFEFFF"/><stop offset="1" stop-color="#8DBBFF" stop-opacity="0"/></radialGradient>
    <filter id="pw-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22"/></filter>
  </defs>
  <polygon points="${cut}" fill="url(#pw-cut)" opacity=".55"/>
  <polygon points="${edge}" fill="${c.a}" opacity=".6"/>
  <polygon points="0,0 260,0 0,220" fill="#000208" opacity=".85"/>
  <polygon points="1600,900 1600,700 1340,900" fill="#000208" opacity=".85"/>
  <text x="1300" y="760" font-size="720" text-anchor="middle" fill="none" stroke="url(#pw-kanji)" stroke-width="3" opacity=".28" font-family="'Dela Gothic One', 'Zen Kaku Gothic New', sans-serif" transform="rotate(-6 1300 500)">${c.kanji}</text>
  <g class="wp-motif">${motif(kind, c.a, c.b, r)}</g>
  <g class="wp-ribbons">
    ${ribbon('M-60 760 C 300 700, 640 820, 980 620 S 1400 420, 1660 470 L 1660 494 C 1400 450, 1220 470, 996 650 S 320 730, -60 790 Z', 'url(#pw-rib)', .55)}
    ${ribbon('M-60 120 C 260 160, 520 60, 820 110 S 1300 230, 1660 140 L 1660 150 C 1300 250, 1100 150, 822 124 S 260 180, -60 132 Z', 'url(#pw-rib)', .35, 'slow')}
  </g>
  <g class="wp-petals">${petals}</g>
</svg>`;
}
