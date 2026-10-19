// Schéma de l'accent tonal (高低アクセント) d'un mot japonais.
// Convention : 0 = 平板 (plat), 1 = 頭高 (tombe après la 1re more),
// n = la voix tombe après la n-ième more (中高), n = nombre de mores → 尾高 (tombe sur la particule).

const SMALL = 'ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ';

/** Découpe en mores : きょう → [きょ, う] ; がっこう → [が, っ, こ, う] */
export function morae(kana) {
  const out = [];
  for (const ch of kana) {
    if (SMALL.includes(ch) && out.length) out[out.length - 1] += ch;
    else if (/[぀-ヿー]/.test(ch)) out.push(ch);
  }
  return out;
}

/** Hauteurs : tableau de booléens (true = haut) pour chaque more + la particule qui suit */
export function heights(n, acc) {
  const hs = [];
  for (let i = 0; i < n; i++) {
    if (acc === 0) hs.push(i > 0);
    else if (acc === 1) hs.push(i === 0);
    else hs.push(i > 0 && i < acc);
  }
  if (n === 1 && acc === 0) hs[0] = false;
  hs.push(acc === 0);              // particule : reste haute seulement en heiban
  return hs;
}

export function patternName(n, acc) {
  if (acc === 0) return ['平板', 'Plat', 'monte après la 1re more et reste haut, particule comprise'];
  if (acc === 1) return ['頭高', 'Tête haute', 'haut sur la 1re more, puis tout redescend'];
  if (acc >= n) return ['尾高', 'Queue haute', 'monte et reste haut jusqu’au bout, la particule redescend'];
  return ['中高', 'Milieu haut', `monte après la 1re more, redescend après la ${acc}e`];
}

/**
 * SVG du schéma. `reading` en kana, `acc` = numéro d'accent.
 * compact : pas de légende, taille réduite (tableaux, révisions).
 */
export function pitchSVG(reading, acc, { compact = false, particle = 'が' } = {}) {
  if (acc == null || !reading) return '';
  const ms = morae(reading);
  if (!ms.length || acc > ms.length) return '';
  const hs = heights(ms.length, acc);
  const step = compact ? 22 : 34, top = compact ? 8 : 12, low = compact ? 24 : 40, pad = compact ? 10 : 16;
  const W = pad * 2 + step * (hs.length - 1), H = compact ? 46 : 74;
  const xy = hs.map((hi, i) => [pad + i * step, hi ? top : low]);
  const line = xy.slice(0, -1).map(p => p.join(',')).join(' ');
  const last = xy[xy.length - 1], prev = xy[xy.length - 2];
  const fs = compact ? 12 : 16, ty = H - (compact ? 4 : 8);
  const [jp, fr, desc] = patternName(ms.length, acc);
  const dots = xy.map(([x, y], i) => i === hs.length - 1
    ? `<circle cx="${x}" cy="${y}" r="${compact ? 3.4 : 5}" class="pp-part"/>`
    : `<circle cx="${x}" cy="${y}" r="${compact ? 3.6 : 5.2}" class="pp-dot${hs[i] ? ' hi' : ''}"/>`).join('');
  const labels = [...ms, particle].map((m, i) =>
    `<text x="${pad + i * step}" y="${ty}" class="${i === ms.length ? 'pp-ptxt' : 'pp-txt'}" font-size="${m.length > 1 ? fs * .82 : fs}">${m}</text>`).join('');
  const svg = `<svg class="pitch-svg${compact ? ' compact' : ''}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Accent ${fr.toLowerCase()} (${acc}) : ${desc}">
    <polyline points="${line}" class="pp-line"/>
    <line x1="${prev[0]}" y1="${prev[1]}" x2="${last[0]}" y2="${last[1]}" class="pp-line part"/>
    ${dots}${labels}</svg>`;
  if (compact) return `<span class="pitch compact" title="${jp} ${fr} [${acc}] : ${desc}">${svg}</span>`;
  return `<figure class="pitch"><figcaption><span class="pitch-tag" lang="ja">${jp}</span><strong>${fr}</strong> <span class="pitch-n">[${acc}]</span><span class="pitch-desc">${desc}.</span></figcaption>${svg}</figure>`;
}
