/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Sprites em pixel art do jogo Missão Digestão (desenhados por código, sem arquivos de imagem). */

import { grade, paraCanvas, tons } from './sprites-reino.js?v=287';

// Mesmas regras de arte do Reino da Sintaxe (1 pixel da arte = 2 unidades do mundo, sombra puxando para o azul,
// luz para o amarelo, luz vindo do alto à esquerda, contorno automático). Os nutrientes são bolinhas com rostinho,
// cada um com uma silhueta própria para a criança reconhecer de longe: grão (amido), cadeia de contas (proteína),
// gota (gorduras), cristal (açúcar e sal), folha (fibras) e orbe (vitaminas). Três tamanhos, porque a mastigação
// deixa o pedaço menor: 'g' (inteiro), 'm' (cortado) e 'p' (triturado). 'mini' é o nutriente já absorvido, do
// tamanho dos vasos do intestino.
const TAM = { g: 22, m: 17, p: 13, mini: 9 };
const BRANCO = '#fff8e7', OLHO = '#2b1d2e', BOCA = '#7a2f3b', MOLHADO = '#e3f6ff', GOTA = '#8fd3ff';
const cache = new Map();
const guardado = (chave, fazer) => { if (!cache.has(chave)) cache.set(chave, fazer()); return cache.get(chave); };

// ---------- o personagem: quadro 'a' (normal), 'b' (amassado, no passo), 'susto' ou 'feliz' ----------
export function spriteNutriente(forma, cor, tam = 'g', quadro = 'a', molhado = false) {
  return guardado(`nut|${forma}|${cor}|${tam}|${quadro}|${molhado}`, () => {
    const S = TAM[tam], amassa = quadro === 'b';
    const w = Math.ceil(S * 1.15) + 4, h = S + 4;
    const g = grade(w, h), T = tons(cor);
    const L = Math.round(S * (amassa ? 1.12 : 1)), A = Math.round(S * (amassa ? 0.88 : 1));   // largura e altura do corpo
    const cx = (w - 1) / 2, base = h - 2, topo = base - A + 1, cy = topo + A / 2;
    // o corpo: primeiro a silhueta inteira na cor da sombra; depois a mesma silhueta na cor base, deslocada para o
    // alto à esquerda e só por cima do que já foi pintado. Sobra uma meia-lua de sombra embaixo à direita e o rosto
    // fica limpo (sem mancha no meio).
    const silhueta = (gg, c, ox, oy) => {
      const x = cx + ox, y0 = topo + oy, b = base + oy;
      if (forma === 'grao') {
        gg.el(x, y0 + A * 0.42, L / 2, A * 0.42, c);
        gg.r(Math.round(x - L / 2 + 1), Math.round(y0 + A * 0.42), L - 2, Math.round(A * 0.58), c);
      } else if (forma === 'cadeia') {
        const r = L / 4.4;
        [-1, 1].forEach((k) => gg.el(x + k * (L / 2 - r), y0 + A / 2 + 2, r, r, c));
        gg.el(x, y0 + A / 2, r * 1.45, A / 2 - 0.5, c);
      } else if (forma === 'gota') {
        const ry = A * 0.36;
        gg.el(x, b - ry, L / 2 - 0.5, ry, c);
        gg.tri(Math.round(x), y0, Math.round(x - L * 0.36), Math.round(b - ry - 1), Math.round(x + L * 0.36), Math.round(b - ry - 1), c);
      } else gg.el(x, y0 + A / 2, L / 2 - 0.5, A / 2 - 0.5, c);
    };
    if (forma === 'cristal') {
      // cubinho: face de cima clara, lado direito escuro
      const x0 = Math.round(cx - L / 2 + 1), lado = L - 2, face = Math.max(2, Math.round(A * 0.25));
      g.r(x0, topo + face, lado, A - face, T.c);
      for (let k = 0; k < face; k++) g.r(x0 + face - k, topo + k, lado - face, 1, T.L);
      g.r(x0 + lado - Math.round(lado * 0.22), topo + face, Math.round(lado * 0.22), A - face, T.S);
      g.r(x0, base - 1, lado, 1, T.S);
      g.p(x0 + 1, topo + face + 1, BRANCO);
    } else {
      if (forma === 'cadeia') g.linha(Math.round(cx - L / 2 + 2), Math.round(cy + 1), Math.round(cx + L / 2 - 2), Math.round(cy + 1), T.S, 2);
      silhueta(g, T.S, 0, 0);
      const luz = grade(w, h), off = S >= 20 ? 2 : 1;
      silhueta(luz, T.c, -off, -off);
      luz.px.forEach((c, k) => { if (c && g.px[k]) g.px[k] = c; });
      // os detalhes de cada um
      if (forma === 'grao') {
        [[-0.22, 0.72], [0.08, 0.84], [0.28, 0.66]].forEach(([dx, dy]) => g.p(cx + dx * L, topo + dy * A, T.S));
        g.r(Math.round(cx - L * 0.3), Math.round(topo + A * 0.12), Math.max(2, Math.round(L * 0.25)), 1, T.L);
      } else if (forma === 'cadeia') {
        const r = L / 4.4;
        [-1, 1].forEach((k) => g.p(cx + k * (L / 2 - r) - r / 2, cy + 2 - r / 2, T.L));
        g.p(cx - r * 0.7, topo + 2, T.L); g.p(cx - r * 0.4, topo + 1, T.L);
      } else if (forma === 'gota') {
        const ry = A * 0.36;
        g.r(Math.round(cx - L * 0.3), Math.round(base - ry * 1.3), 2, Math.max(2, Math.round(ry * 0.6)), T.L);
      } else if (forma === 'fio') {
        g.linha(Math.round(cx - L / 2 + 2), Math.round(cy + A * 0.32), Math.round(cx + L / 2 - 2), Math.round(cy - A * 0.32), T.S);
        g.p(cx - L * 0.25, topo + 2, T.L); g.p(cx - L * 0.15, topo + 1, T.L);
      } else {
        const sx = Math.round(cx - L * 0.24), sy = Math.round(topo + A * 0.22);
        g.p(sx, sy, BRANCO); g.p(sx - 1, sy, T.L); g.p(sx + 1, sy, T.L); g.p(sx, sy - 1, T.L); g.p(sx, sy + 1, T.L);
      }
    }
    // rosto: olhos olhando para a direita (para onde ele rola)
    const oy = Math.round(topo + A * (forma === 'gota' ? 0.52 : 0.4)), dx = Math.max(2, Math.round(S * 0.17));
    [-1, 1].forEach((k) => {
      const ox = Math.round(cx + k * dx);
      if (quadro === 'susto') { g.r(ox - 1, oy - 1, 3, 3, BRANCO); g.p(ox, oy, OLHO); }
      else if (quadro === 'feliz') { g.p(ox - 1, oy, OLHO); g.p(ox, oy - 1, OLHO); g.p(ox + 1, oy, OLHO); }
      else { g.r(ox - 1, oy - 1, 2, 2, BRANCO); g.r(ox, oy - 1, 1, 2, OLHO); }
    });
    const my = oy + 3;
    if (quadro === 'susto') g.r(Math.round(cx), my, 2, 2, BOCA);
    else if (quadro === 'feliz') { g.r(Math.round(cx) - 1, my, 3, 1, BOCA); g.p(Math.round(cx) - 2, my - 1, BOCA); g.p(Math.round(cx) + 2, my - 1, BOCA); }
    else g.r(Math.round(cx), my, 2, 1, BOCA);
    // molhado de saliva: brilho azulado e uma gotinha escorrendo
    if (molhado) {
      g.p(cx - L * 0.32, topo + A * 0.3, MOLHADO); g.p(cx - L * 0.36, topo + A * 0.38, MOLHADO); g.p(cx + L * 0.3, topo + A * 0.25, MOLHADO);
      g.p(cx + L * 0.38, base - 1, GOTA); g.p(cx + L * 0.38, base - 2, GOTA);
    }
    return paraCanvas(g);
  });
}

// ---------- dentes: 'incisivo' (reto), 'canino' (pontudo) e 'molar' (largo, com cúspides) ----------
// desenhados com a ponta para cima (dente de baixo); o de cima é o mesmo virado (virar = true)
const ESMALTE = { c: '#fbf6ea', L: '#ffffff', S: '#cfd3e2', S2: '#aeb4cc' };
export function spriteDente(tipo, deCima = false) {
  return guardado(`dente|${tipo}|${deCima}`, () => {
    const dims = { incisivo: [9, 22], canino: [10, 24], molar: [15, 18] }[tipo];
    const [w, h] = dims, g0 = grade(w, h);
    // grade virada para o dente de cima: o mesmo desenho, de cabeça para baixo
    const g = deCima ? { p: (x, y, c) => g0.p(x, h - 1 - y, c), r: (x, y, ww, hh, c) => g0.r(x, h - y - hh, ww, hh, c), el: (cx, cy, rx, ry, c) => g0.el(cx, h - 1 - cy, rx, ry, c),
      tri: (x1, y1, x2, y2, x3, y3, c) => g0.tri(x1, h - 1 - y1, x2, h - 1 - y2, x3, h - 1 - y3, c) } : g0;
    if (tipo === 'incisivo') {
      g.r(1, 1, w - 2, h - 1, ESMALTE.c);
      g.r(1, 1, w - 2, 1, ESMALTE.L);
      g.r(w - 3, 2, 2, h - 2, ESMALTE.S);
      g.r(2, 3, 1, h - 8, ESMALTE.L);
    } else if (tipo === 'canino') {
      g.tri(5, 0, 1, 7, 8, 7, ESMALTE.c);
      g.r(1, 7, w - 2, h - 7, ESMALTE.c);
      g.r(w - 3, 6, 2, h - 6, ESMALTE.S);
      g.r(2, 6, 1, h - 10, ESMALTE.L); g.p(4, 2, ESMALTE.L);
    } else {
      g.el(3.5, 3, 3, 2.5, ESMALTE.c); g.el(10.5, 3, 3, 2.5, ESMALTE.c);
      g.r(1, 3, w - 2, h - 3, ESMALTE.c);
      g.p(7, 3, ESMALTE.S2); g.p(7, 4, ESMALTE.S2);
      g.r(w - 4, 3, 3, h - 3, ESMALTE.S);
      g.p(2, 2, ESMALTE.L); g.p(9, 2, ESMALTE.L); g.r(2, 5, 1, h - 9, ESMALTE.L);
    }
    return paraCanvas(g0, '#7a3a4a');
  });
}

// ---------- papila gustativa (cogumelinho da língua) ----------
export function spritePapila(cor = '#f28aa0') {
  return guardado(`papila|${cor}`, () => {
    const g = grade(10, 9), T = tons(cor);
    g.el(4.5, 3, 4, 2.5, T.c);
    g.r(3, 5, 3, 4, T.c);
    g.el(5.5, 4, 2.5, 1, T.S); g.r(5, 6, 1, 3, T.S);
    g.p(2, 2, T.L); g.p(3, 1, T.L);
    return paraCanvas(g, '#8a2a45');
  });
}

// ---------- bactéria boa (fofa): 'a' ou 'b' (balançando os pelinhos) ----------
export function spriteBacteria(cor, quadro = 'a') {
  return guardado(`bact|${cor}|${quadro}`, () => {
    const g = grade(13, 10), T = tons(cor);
    g.el(6, 5, 5, 3.5, T.c);
    g.el(7, 6.5, 3.5, 1.6, T.S);
    g.p(3, 3, T.L); g.p(4, 2, T.L);
    // pelinhos (cílios) em volta, mexendo
    const o = quadro === 'a' ? 0 : 1;
    [[1, 2 + o], [0, 5 - o], [1, 8 - o], [11, 2 + o], [12, 5 - o], [11, 8 - o]].forEach(([x, y]) => g.p(x, y, T.S));
    g.r(4, 4, 2, 2, BRANCO); g.p(5, 4, OLHO); g.p(5, 5, OLHO);
    g.r(8, 4, 2, 2, BRANCO); g.p(9, 4, OLHO); g.p(9, 5, OLHO);
    g.r(6, 7, 2, 1, BOCA);
    return paraCanvas(g, '#2b1d2e');
  });
}

// ---------- o ânus (pedido do Marco: bem bonitinho e rosado): um anel macio com brilho; aberto: 0, 1 ou 2 ----------
export function spriteAnus(aberto = 0) {
  return guardado(`anus|${aberto}`, () => {
    const g = grade(14, 22), R = { S: '#c2577a', c: '#f29bb3', L: '#ffc9d8', LL: '#fff0f4' };
    g.el(6.5, 11, 6, 10, R.c);
    g.el(8, 13, 4.5, 8, R.S);
    g.el(6, 10, 5, 8.5, R.c);
    g.el(4.5, 6, 2, 3, R.L);
    g.p(4, 5, R.LL); g.p(5, 4, R.LL);
    if (aberto === 0) {
      // fechado: uma dobrinha delicada, como uma estrelinha
      g.r(6, 8, 1, 6, R.S); g.p(5, 9, R.S); g.p(7, 9, R.S); g.p(5, 13, R.S); g.p(7, 13, R.S);
    } else {
      const ry = aberto === 1 ? 3 : 5.5, rx = aberto === 1 ? 1.5 : 2.6;
      g.el(6.5, 11, rx + 1, ry + 1, R.S);
      g.el(6.5, 11, rx, ry, '#4a1626');
    }
    return paraCanvas(g, '#8e3355');
  });
}
