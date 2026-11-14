/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Sprites em pixel art do jogo Missão Respiração (desenhados por código, sem arquivos de imagem). */

import { grade, paraCanvas, tons } from './sprites-reino.js?v=287';

// As partículas do ar são bolinhas com rostinho, como os nutrientes da Missão Digestão, cada uma com uma silhueta
// própria: o oxigênio é uma molécula (duas bolinhas grudadas, O₂), a poeira um montinho irregular, o pólen uma bolinha
// com espinhos, o vírus uma bolinha com antenas (a "coroa") e a poluição uma nuvenzinha de fumaça.
// Mesmas regras de arte: 1 pixel = 2 unidades do mundo, sombra em meia-lua embaixo à direita, luz em cima à esquerda,
// contorno automático. Tamanhos: 'g' e 'm'.
const TAM = { g: 22, m: 17, p: 12 };
const BRANCO = '#fff8e7', OLHO = '#2b1d2e', BOCA = '#7a2f3b', MOLHADO = '#e3f6ff', GOTA = '#8fd3ff';
const cache = new Map();
const guardado = (chave, fazer) => { if (!cache.has(chave)) cache.set(chave, fazer()); return cache.get(chave); };

// quadro: 'a' (normal), 'b' (amassado), 'susto' ou 'feliz'; molhado: brilho de muco
export function spriteParticula(forma, cor, tam = 'm', quadro = 'a', molhado = false) {
  return guardado(`part|${forma}|${cor}|${tam}|${quadro}|${molhado}`, () => {
    const S = TAM[tam], amassa = quadro === 'b';
    const w = Math.ceil(S * 1.3) + 6, h = S + 6;
    const g = grade(w, h), T = tons(cor);
    const L = Math.round(S * (amassa ? 1.1 : 1)), A = Math.round(S * (amassa ? 0.9 : 1));
    const cx = (w - 1) / 2, base = h - 3, topo = base - A + 1, cy = topo + A / 2;
    // a silhueta de cada partícula
    const silhueta = (gg, c, ox, oy) => {
      const x = cx + ox, y = cy + oy;
      if (forma === 'molecula') {
        gg.el(x - L * 0.26, y + 1, L * 0.34, A * 0.4, c);
        gg.el(x + L * 0.26, y, L * 0.36, A * 0.46, c);
      } else if (forma === 'poeira') {
        gg.el(x, y + 1, L * 0.42, A * 0.4, c);
        gg.el(x - L * 0.28, y - A * 0.12, L * 0.22, A * 0.24, c);
        gg.el(x + L * 0.24, y - A * 0.2, L * 0.24, A * 0.24, c);
        gg.el(x + L * 0.1, y + A * 0.3, L * 0.3, A * 0.18, c);
      } else if (forma === 'fumaca' || forma === 'nuvem') {   // a nuvenzinha (o ar) tem o mesmo jeito da fumaça
        gg.el(x - L * 0.24, y + A * 0.12, L * 0.28, A * 0.3, c);
        gg.el(x + L * 0.22, y + A * 0.1, L * 0.3, A * 0.32, c);
        gg.el(x, y - A * 0.14, L * 0.32, A * 0.34, c);
      } else gg.el(x, y, L / 2 - 1, A / 2 - 1, c);   // pólen e vírus: bolinha (os espinhos vêm depois)
    };
    // espinhos do pólen e antenas do vírus, em volta
    if (forma === 'polen' || forma === 'virus') {
      const n = forma === 'polen' ? 12 : 8, r = L / 2 - 1;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2, px = cx + Math.cos(a) * (r + 1.5), py = cy + Math.sin(a) * (r + 1.5);
        g.p(px, py, T.S);
        if (forma === 'virus') { const qx = cx + Math.cos(a) * (r + 2.6), qy = cy + Math.sin(a) * (r + 2.6); g.r(Math.round(qx) - 1, Math.round(qy) - 1, 2, 2, '#e57373'); }
      }
    }
    silhueta(g, T.S, 0, 0);
    const luz = grade(w, h), off = S >= 20 ? 2 : 1;
    silhueta(luz, T.c, -off, -off);
    luz.px.forEach((c, k) => { if (c && g.px[k]) g.px[k] = c; });
    // detalhes: brilho, manchinhas
    g.p(cx - L * 0.32, topo + A * 0.22, T.L); g.p(cx - L * 0.26, topo + A * 0.16, T.L);
    if (forma === 'poeira') [[-0.2, 0.15], [0.15, 0.3], [0.05, -0.1]].forEach(([dx, dy]) => g.p(cx + dx * L, cy + dy * A, T.S));
    if (forma === 'polen') [[-0.15, 0.1], [0.12, 0.2], [0.1, -0.15], [-0.05, -0.05]].forEach(([dx, dy]) => g.p(cx + dx * L, cy + dy * A, T.S));
    // rosto (na bolinha da direita, no oxigênio)
    const fx = forma === 'molecula' ? cx + L * 0.26 : cx, oy = Math.round(cy - A * 0.06), dx = Math.max(2, Math.round(S * 0.15));
    [-1, 1].forEach((k) => {
      const ox = Math.round(fx + k * dx);
      if (quadro === 'susto') { g.r(ox - 1, oy - 1, 3, 3, BRANCO); g.p(ox, oy, OLHO); }
      else if (quadro === 'feliz') { g.p(ox - 1, oy, OLHO); g.p(ox, oy - 1, OLHO); g.p(ox + 1, oy, OLHO); }
      else { g.r(ox - 1, oy - 1, 2, 2, BRANCO); g.r(ox, oy - 1, 1, 2, OLHO); }
    });
    const my = oy + 3, mx = Math.round(fx);
    if (quadro === 'susto') g.r(mx, my, 2, 2, BOCA);
    else if (quadro === 'feliz') { g.r(mx - 1, my, 3, 1, BOCA); g.p(mx - 2, my - 1, BOCA); g.p(mx + 2, my - 1, BOCA); }
    else if (forma === 'virus') { g.r(mx - 1, my, 3, 1, BOCA); g.p(mx + 2, my - 1, BOCA); }   // sorrisinho de levado
    else g.r(mx, my, 2, 1, BOCA);
    if (molhado) {
      g.p(cx - L * 0.36, topo + A * 0.34, MOLHADO); g.p(cx + L * 0.34, topo + A * 0.3, MOLHADO);
      g.p(cx + L * 0.4, base - 1, GOTA); g.p(cx + L * 0.4, base - 2, GOTA);
    }
    return paraCanvas(g);
  });
}
