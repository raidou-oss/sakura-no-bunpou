// Tuiles à assembler en phrase (Narabe, Kotoba Kōhī) : toucher pour ajouter / retirer,
// ou glisser-déposer pour insérer un morceau n'importe où dans la phrase et la réordonner.
// Clavier : sur une tuile placée, flèches gauche / droite pour la déplacer.
import { h } from '../util.js?v=20261023232821';
import { play } from '../sfx.js?v=20261023232821';

/**
 * line : zone de la phrase ; tray : réserve ; items : toutes les tuiles ; chosen : tableau (muté) des tuiles placées.
 * html(p) / text(p) : contenu et nom lisible d'une tuile. onChange() : appelé après chaque rendu.
 * Retourne render().
 */
export function tileBoard({ line, tray, items, chosen, html, text, placeholder, onChange }) {
  let locked = false;
  const caret = h('span.drop-caret', { 'aria-hidden': 'true' });

  const tileEl = (p, placed, k) => {
    const b = h(`button.tile${placed ? '.placed' : ''}`, { lang: 'ja', html: html(p), disabled: !placed && chosen.includes(p),
      'aria-label': placed ? `${text(p)}, position ${k + 1}. Flèches pour déplacer, Entrée pour retirer` : `Ajouter ${text(p)}` });
    b.onclick = () => {
      if (b.dataset.dragged) return;
      if (placed) { chosen.splice(k, 1); play('back'); } else { chosen.push(p); play('drop'); }
      render();
      if (!placed) line.lastElementChild?.classList.add('just-dropped');
    };
    if (placed) b.onkeydown = e => {
      const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      if (!d || !chosen[k + d]) return;
      e.preventDefault(); [chosen[k], chosen[k + d]] = [chosen[k + d], chosen[k]]; play('drop');
      render(); line.children[k + d]?.focus();
    };
    b.addEventListener('pointerdown', e => startDrag(e, b, p));
    return b;
  };

  function render() {
    line.replaceChildren(...(chosen.length ? chosen.map((p, k) => tileEl(p, true, k)) : [h('span.order-placeholder', placeholder)]));
    tray.replaceChildren(...items.map(p => tileEl(p, false)));
    locked = false;
    onChange?.();
  }

  // Position d'insertion sous le pointeur, en suivant le sens de lecture (les lignes peuvent passer à la ligne)
  function insertIndex(x, y) {
    const tiles = [...line.querySelectorAll('.tile.placed:not(.dragging)')];
    for (let i = 0; i < tiles.length; i++) {
      const r = tiles[i].getBoundingClientRect();
      if (y < r.top - 6) return i;
      if (y <= r.bottom + 6 && x < r.left + r.width / 2) return i;
    }
    return tiles.length;
  }

  function startDrag(e, el, p) {
    if (el.disabled || locked || e.button > 0) return;
    const sx = e.clientX, sy = e.clientY;
    let ghost = null, started = false;
    const move = ev => {
      if (!started) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 7) return;
        started = true; locked = true; play('pick');
        const r = el.getBoundingClientRect();
        ghost = el.cloneNode(true);
        ghost.classList.add('tile-ghost');
        Object.assign(ghost.style, { width: `${r.width}px`, height: `${r.height}px`, left: `${r.left}px`, top: `${r.top}px` });
        document.body.append(ghost);
        el.classList.add('dragging');
        document.body.classList.add('is-dragging');
      }
      ev.preventDefault();
      ghost.style.transform = `translate(${ev.clientX - sx}px, ${ev.clientY - sy}px) rotate(-4deg) scale(1.08)`;
      const lr = line.getBoundingClientRect();
      const inside = ev.clientX > lr.left - 30 && ev.clientX < lr.right + 30 && ev.clientY > lr.top - 46 && ev.clientY < lr.bottom + 46;
      line.classList.toggle('drop-over', inside);
      line.querySelector('.order-placeholder')?.remove();
      if (inside) {
        const idx = insertIndex(ev.clientX, ev.clientY);
        if (caret._idx !== idx || !caret.isConnected) {
          caret._idx = idx;
          const tiles = [...line.querySelectorAll('.tile.placed:not(.dragging)')];
          tiles[idx] ? line.insertBefore(caret, tiles[idx]) : line.append(caret);
          play('cursor', { gap: 70 });
        }
      } else caret.remove();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!started) return;
      el.dataset.dragged = '1';                   // le clic qui suit le relâchement est ignoré
      document.body.classList.remove('is-dragging');
      const inside = line.classList.contains('drop-over');
      const idx = caret.isConnected ? caret._idx : chosen.length;
      caret.remove(); line.classList.remove('drop-over');
      ghost.remove();
      const from = chosen.indexOf(p);
      if (inside) {
        if (from >= 0) chosen.splice(from, 1);    // idx est compté sans la tuile déplacée
        chosen.splice(Math.min(idx, chosen.length), 0, p);
        play('drop');
      } else if (from >= 0) { chosen.splice(from, 1); play('back'); }
      render();
      if (inside) line.children[chosen.indexOf(p)]?.classList.add('just-dropped');
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  return render;
}
