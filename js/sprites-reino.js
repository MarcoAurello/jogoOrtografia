/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Sprites em pixel art do jogo O Reino da Sintaxe (desenhados por código, sem arquivos de imagem). */

// Cada sprite é desenhado numa grade de pixels e vira um canvas pequeno; o jogo amplia sem suavizar
// (imageSmoothingEnabled = false), então os pixels ficam nítidos. Regras da arte (skill game-design-pedagogico):
//   - uma resolução só para o mundo: 1 pixel da arte = 2 unidades do mundo (ART);
//   - paleta curta e compartilhada; sombra puxa para o azul/roxo e luz para o amarelo (rampas com troca de matiz);
//   - luz vindo do alto à esquerda em tudo; contorno escuro automático, para a silhueta ler bem pequena;
//   - poses-chave fortes: caminhada em 4 quadros (passo, passagem, passo, passagem), com o corpo subindo 1 pixel.
// Os sprites são gerados uma vez e guardados (cache); o herói é gerado por cor de traje e cor do orbe.
export const ART = 2;
const CONTORNO = '#2b1d2e';
const PAL = {
  pele: '#f2c28b', peleS: '#d48f6a', bochecha: '#f39a8a', cabelo: '#6b3f2a', bota: '#4a2f3a', botaL: '#6e4a52',
  branco: '#fff8e7', ouro: '#ffcf4a', ouroS: '#d08a2a', madeira: '#9a6a43', madeiraS: '#6b4430', madeiraL: '#c08a55',
  grama: '#5fb544', gramaL: '#9be05e', gramaS: '#3b8a43', terra: '#9a6a43', terraS: '#74503a', terraL: '#b98654',
  pedra: '#a9b4c2', pedraS: '#7c8698', pedraL: '#d3dbe5', ferro: '#5b6470',
};

// ---------- cores: rampas com troca de matiz ----------
function hsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hex([h, s, l]) {
  const f = (n) => {
    const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
const puxar = (h, alvo, graus) => { const d = ((alvo - h + 540) % 360) - 180; return (h + Math.sign(d) * Math.min(Math.abs(d), graus) + 360) % 360; };
// sombra: mais escura e puxando para o azul; luz: mais clara e puxando para o amarelo
export function tons(cor) {
  const [h, s, l] = hsl(cor);
  return { c: cor, S: hex([puxar(h, 245, 14), Math.min(1, s * 1.05), l * 0.7]), L: hex([puxar(h, 55, 12), s, l + (1 - l) * 0.32]) };
}

// ---------- a grade de pixels ----------
export function grade(w, h) {
  const px = new Array(w * h).fill(null);
  const g = {
    w, h, px,
    p(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) px[y * w + x] = c; },
    r(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) g.p(x + i, y + j, c); },
    el(cx, cy, rx, ry, c) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) g.p(x, y, c);
      }
    },
    tri(x1, y1, x2, y2, x3, y3, c) {
      const area = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
      for (let y = Math.min(y1, y2, y3); y <= Math.max(y1, y2, y3); y++) {
        for (let x = Math.min(x1, x2, x3); x <= Math.max(x1, x2, x3); x++) {
          const a = ((x2 - x) * (y3 - y) - (x3 - x) * (y2 - y)) / area, b = ((x3 - x) * (y1 - y) - (x1 - x) * (y3 - y)) / area;
          if (a >= -0.02 && b >= -0.02 && 1 - a - b >= -0.02) g.p(x, y, c);
        }
      }
    },
    linha(x0, y0, x1, y1, c, esp = 1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
      for (let k = 0; k <= n; k++) { const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n; g.r(Math.round(x - (esp - 1) / 2), Math.round(y - (esp - 1) / 2), esp, esp, c); }
    },
  };
  return g;
}
// vira canvas; com contorno, todo pixel vazio encostado (4 vizinhos) num pixel pintado recebe a cor do contorno
export function paraCanvas(gr, contorno = CONTORNO) {
  const { w, h } = gr, px = [...gr.px];
  if (contorno) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (gr.px[y * w + x]) continue;
        const viz = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < w && Y < h && gr.px[Y * w + X]; });
        if (viz) px[y * w + x] = contorno;
      }
    }
  }
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d'), img = g.createImageData(w, h);
  px.forEach((c, k) => {
    if (!c) return;
    const n = parseInt(c.slice(1), 16);
    img.data.set([n >> 16, (n >> 8) & 255, n & 255, 255], k * 4);
  });
  g.putImageData(img, 0, 0);
  return cv;
}
const cache = new Map();
const guardado = (chave, fazer) => { if (!cache.has(chave)) cache.set(chave, fazer()); return cache.get(chave); };

// ---------- o herói Sintaxista (20 x 26, pés na linha 24) ----------
// quadros: 'parado0', 'parado1' (respirando), 'anda0'..'anda3', 'magia' (cajado erguido), 'susto'
export function spriteHeroi(cor, orbe, quadro) {
  return guardado(`heroi|${cor}|${orbe}|${quadro}`, () => {
    const g = grade(20, 26), T = tons(cor), O = tons(orbe);
    const passagem = quadro === 'anda1' || quadro === 'anda3' || quadro === 'parado1';
    const dy = passagem ? -1 : 0;     // na passagem e ao respirar, o corpo sobe 1 pixel
    const magia = quadro === 'magia', susto = quadro === 'susto';
    // pernas: a de trás mais escura (profundidade)
    const pernas = { anda0: [[4, 'tras'], [10, 'frente']], anda2: [[10, 'tras'], [4, 'frente']], anda1: [[6, 'tras'], [8, 'frente']], anda3: [[8, 'tras'], [6, 'frente']] }[quadro]
      || [[6, 'tras'], [9, 'frente']];
    pernas.forEach(([x, lado]) => {
      g.r(x, 21, 2, 3, lado === 'tras' ? PAL.bota : PAL.botaL);
      g.p(x + 2, 23, lado === 'tras' ? PAL.bota : PAL.botaL);   // bico da bota para a frente
    });
    // capa atrás, balançando
    const ponta = quadro === 'anda0' || quadro === 'anda2' ? 2 : 3;
    g.r(4, 13 + dy, 2, 8, T.S);
    g.r(ponta, 18 + dy, 2, 4, T.S);
    // túnica: luz à esquerda, sombra à direita, cinto dourado
    g.r(5, 13 + dy, 7, 8, T.c);
    g.r(5, 13 + dy, 1, 7, T.L);
    g.r(10, 13 + dy, 2, 8, T.S);
    g.r(5, 20 + dy, 7, 1, T.S);
    g.r(5, 17 + dy, 7, 1, PAL.ouro);
    g.p(8, 17 + dy, PAL.ouroS);
    // braço da frente segurando o cajado
    if (magia) { g.r(11, 14 + dy, 3, 2, T.c); g.r(14, 14 + dy, 1, 2, PAL.pele); }
    else { g.r(11, 14 + dy, 2, 2, T.c); g.r(12, 16 + dy, 2, 2, PAL.pele); }
    // cabeça
    g.r(6, 8 + dy, 6, 5, PAL.pele);
    g.r(11, 9 + dy, 1, 4, PAL.peleS);
    g.r(7, 12 + dy, 4, 1, PAL.pele);
    g.r(5, 8 + dy, 2, 3, PAL.cabelo);
    g.p(6, 11 + dy, PAL.cabelo);
    if (susto) { g.r(8, 9 + dy, 1, 2, CONTORNO); g.r(10, 9 + dy, 1, 2, CONTORNO); g.p(9, 12 + dy, CONTORNO); }
    else { g.r(8, 10 + dy, 1, 1, CONTORNO); g.r(10, 10 + dy, 1, 1, CONTORNO); g.p(9, 11 + dy, PAL.bochecha); }
    // chapéu pontudo com a ponta caída para a frente, faixa e estrela
    g.r(4, 7 + dy, 10, 1, T.c); g.r(12, 7 + dy, 2, 1, T.S);
    const cone = [[6, 6], [6, 5], [7, 4], [7, 3], [8, 2], [9, 1]];
    const larg = [6, 5, 4, 3, 2, 2];
    cone.forEach(([x, y], k) => { g.r(x, y + dy, larg[k], 1, T.c); g.p(x + larg[k] - 1, y + dy, T.S); g.p(x, y + dy, T.L); });
    g.p(11, 0 + dy, T.c);
    g.r(6, 6 + dy, 6, 1, PAL.ouro);
    g.p(8, 4 + dy, PAL.ouro);
    // cajado de madeira com o Orbe da Precisão
    if (magia) {
      g.linha(13, 22, 16, 5 + dy, PAL.madeira);
      g.el(16.5, 3 + dy, 1.6, 1.6, O.c); g.p(17, 4 + dy, O.S); g.p(16, 2 + dy, PAL.branco);
      g.p(18, 1 + dy, O.L); g.p(14, 1 + dy, O.L); g.p(19, 4 + dy, O.L);
    } else {
      g.r(14, 5 + dy, 1, 19 - dy, PAL.madeira);
      g.r(14, 18 + dy, 1, 6 - dy, PAL.madeiraS);
      g.el(14, 3 + dy, 1.6, 1.6, O.c); g.p(15, 4 + dy, O.S); g.p(13, 2 + dy, PAL.branco);
    }
    return paraCanvas(g);
  });
}
// ícone do traje para os botões do menu (o herói parado, ampliado)
export function iconeHeroi(cor) {
  return guardado(`icone|${cor}`, () => {
    const spr = spriteHeroi(cor, '#9be7ff', 'parado0');
    const cv = document.createElement('canvas');
    cv.width = 60; cv.height = 78;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(spr, 0, 0, 60, 78);
    return cv.toDataURL();
  });
}

// ---------- monstrinho geleca (18 x 16): 'a', 'b' (amassado), 'ri' (boca aberta) ----------
export function spriteMonstro(cor, quadro) {
  return guardado(`monstro|${cor}|${quadro}`, () => {
    const g = grade(18, 16), T = tons(cor);
    const amassa = quadro === 'b';
    g.el(9, amassa ? 10 : 9, amassa ? 8 : 7, amassa ? 5 : 6, T.c);
    g.r(2, 13, 14, 2, T.c);
    g.el(12, 12, 5, 3, T.S);
    g.r(3, 14, 13, 1, T.S);
    g.p(5, amassa ? 7 : 5, T.L); g.p(6, amassa ? 6 : 4, T.L); g.p(4, amassa ? 8 : 6, T.L); g.p(5, amassa ? 6 : 4, PAL.branco);
    const oy = amassa ? 9 : 8;
    g.r(6, oy - 1, 2, 3, PAL.branco); g.r(11, oy - 1, 2, 3, PAL.branco);
    g.p(7, oy, CONTORNO); g.p(12, oy, CONTORNO);
    if (quadro === 'ri') { g.r(7, oy + 3, 5, 2, CONTORNO); g.r(8, oy + 4, 3, 1, '#e5737f'); }
    else g.r(8, oy + 3, 3, 1, CONTORNO);
    return paraCanvas(g);
  });
}

// ---------- chefe: Dragão da Desordem (56 x 48, olhando para a esquerda): asa 'a' (em cima) ou 'b' ----------
export function spriteDragao(quadro, branco = false) {
  return guardado(`dragao|${quadro}|${branco}`, () => {
    const g = grade(56, 48);
    const T = branco ? { c: '#ffffff', S: '#e0e0e0', L: '#ffffff' } : tons('#d63a3a');
    const barriga = branco ? '#ffffff' : '#ffd29a', barrigaS = branco ? '#eeeeee' : '#e8a86a';
    // asa de trás (atrás do corpo)
    if (quadro === 'a') { g.tri(30, 22, 44, 1, 53, 18, T.S); g.linha(31, 21, 44, 3, T.c); g.linha(36, 21, 51, 17, T.c); }
    else { g.tri(30, 22, 51, 12, 53, 31, T.S); g.linha(31, 22, 50, 13, T.c); g.linha(36, 24, 52, 29, T.c); }
    // cauda com ponta
    g.linha(42, 36, 54, 27, T.c, 3);
    g.tri(51, 22, 55, 26, 51, 28, PAL.ouro);
    // corpo, barriga listrada e luz no alto à esquerda
    g.el(34, 32, 12, 10, T.c);
    g.el(38, 36, 8, 6, T.S);
    g.el(31, 35, 7, 7, barriga);
    for (let y = 30; y <= 41; y += 3) g.r(26, y, 11, 1, barrigaS);
    g.el(30, 26, 4, 2, T.L);
    // pescoço e cabeça
    g.el(21, 22, 5, 8, T.c);
    g.el(13, 14, 8, 7, T.c);
    g.r(2, 14, 9, 6, T.c);
    g.r(2, 19, 9, 1, T.S);
    g.el(10, 10, 3, 2, T.L);
    g.p(4, 15, CONTORNO);
    g.p(5, 20, PAL.branco); g.p(8, 20, PAL.branco);
    // olho bravo com sobrancelha
    g.r(10, 11, 3, 3, PAL.branco);
    g.r(10, 12, 2, 2, CONTORNO);
    g.linha(9, 10, 14, 9, T.S);
    // chifres e espinhos
    g.tri(15, 8, 19, 1, 18, 9, '#ffe9b0');
    g.tri(10, 8, 11, 2, 13, 8, '#ffe9b0');
    g.tri(22, 15, 24, 11, 26, 16, PAL.ouro);
    g.tri(28, 23, 31, 17, 34, 23, PAL.ouro);
    g.tri(36, 23, 39, 18, 42, 24, PAL.ouro);
    // braço e pernas com garras
    g.r(22, 32, 4, 5, T.S);
    g.r(26, 40, 6, 6, T.S); g.r(38, 40, 6, 6, T.S);
    [26, 28, 30, 38, 40, 42].forEach((x) => g.p(x, 46, PAL.branco));
    return paraCanvas(g);
  });
}

// ---------- cenário ----------
// chão de grama (16 x 16, sem contorno, emenda dos dois lados)
function tileGrama(pedra) {
  const g = grade(16, 16);
  const [top, topL, topS, base, baseS, baseL] = pedra
    ? ['#9aa5a8', '#c8d0d2', '#6f7b80', '#8a7468', '#6a5650', '#a68e80']
    : [PAL.grama, PAL.gramaL, PAL.gramaS, PAL.terra, PAL.terraS, PAL.terraL];
  g.r(0, 0, 16, 16, base);
  g.r(0, 0, 16, 4, top);
  g.r(0, 4, 16, 1, topS);
  [1, 4, 6, 9, 12, 14].forEach((x, k) => { g.p(x, 0, topL); if (k % 2) g.p(x, 1, topL); });
  [2, 7, 11, 15].forEach((x) => g.p(x, 5, topS));
  [[3, 8], [10, 7], [6, 12], [13, 13], [1, 14], [8, 10]].forEach(([x, y], k) => { g.p(x, y, k % 2 ? baseS : baseL); g.p(x + 1, y, baseS); });
  return paraCanvas(g, null);
}
function arvore() {
  const g = grade(24, 32);
  g.r(10, 18, 4, 13, PAL.madeira); g.r(12, 18, 2, 13, PAL.madeiraS); g.r(9, 29, 6, 2, PAL.madeira);
  const v = '#43a047', vL = '#7ccf5a', vS = '#2e7040';
  g.el(12, 11, 9, 8, v); g.el(6, 15, 5, 4, v); g.el(18, 15, 5, 4, v);
  g.el(15, 15, 6, 4, vS); g.el(19, 16, 3, 3, vS);
  g.el(9, 7, 3, 2, vL); g.el(5, 13, 2, 1.5, vL); g.p(13, 5, vL); g.p(14, 6, vL);
  return paraCanvas(g, '#24442a');
}
function pinheiro() {
  const g = grade(20, 34);
  g.r(9, 26, 3, 8, PAL.madeira); g.r(10, 26, 1, 8, PAL.madeiraS);
  const v = '#2f7d55', vS = '#1f5a40', vL = '#57a874';
  g.tri(10, 1, 3, 12, 17, 12, v); g.tri(10, 6, 1, 20, 19, 20, v); g.tri(10, 13, 0, 28, 20, 28, v);
  g.tri(10, 1, 10, 12, 17, 12, vS); g.tri(10, 6, 10, 20, 19, 20, vS); g.tri(10, 13, 10, 28, 20, 28, vS);
  g.p(7, 9, vL); g.p(5, 17, vL); g.p(4, 25, vL); g.p(8, 4, '#ffffff'); g.p(9, 3, '#ffffff');
  return paraCanvas(g, '#173826');
}
function nuvem() {
  const g = grade(28, 12);
  g.el(8, 7, 6, 4, '#ffffff'); g.el(15, 5, 7, 5, '#ffffff'); g.el(22, 7, 5, 4, '#ffffff');
  g.r(3, 9, 23, 2, '#dfe9f5');
  return paraCanvas(g, '#c5d6ea');
}
function castelo() {
  const g = grade(48, 52);
  const { pedra: c, pedraS: S, pedraL: L } = PAL;
  g.r(4, 14, 40, 38, c);
  g.r(0, 4, 12, 48, c); g.r(36, 4, 12, 48, c);
  for (let x = 0; x < 48; x += 4) { if (x < 12 || x >= 36) g.r(x, 0, 2, 4, c); else g.r(x, 10, 2, 4, c); }
  g.r(9, 4, 3, 48, S); g.r(45, 4, 3, 48, S); g.r(4, 14, 1, 38, L); g.r(36, 4, 1, 48, L);
  for (let y = 18; y < 52; y += 6) for (let x = (y / 6) % 2 ? 2 : 5; x < 46; x += 8) g.r(x, y, 4, 1, S);
  g.el(24, 38, 7, 8, '#5b3a29'); g.r(17, 38, 15, 14, '#5b3a29');
  g.r(23, 31, 2, 21, '#3d271c');
  g.r(4, 20, 4, 6, '#3a4a6b'); g.r(40, 20, 4, 6, '#3a4a6b'); g.p(4, 20, '#ffe082'); g.p(40, 20, '#ffe082');
  return paraCanvas(g);
}
function porta() {
  const g = grade(22, 40);
  g.r(0, 0, 22, 40, PAL.madeira);
  for (let x = 5; x < 22; x += 5) g.r(x, 0, 1, 40, PAL.madeiraS);
  g.r(0, 0, 1, 40, PAL.madeiraL);
  g.r(0, 7, 22, 3, PAL.ferro); g.r(0, 29, 22, 3, PAL.ferro);
  [2, 8, 14, 19].forEach((x) => { g.p(x, 8, '#9aa3ad'); g.p(x, 30, '#9aa3ad'); });
  g.el(17, 20, 2, 2, PAL.ouro); g.p(17, 20, PAL.madeiraS);
  return paraCanvas(g);
}
function pilar() {
  const g = grade(10, 48);
  g.r(0, 0, 10, 48, PAL.pedra);
  g.r(7, 0, 3, 48, PAL.pedraS); g.r(0, 0, 1, 48, PAL.pedraL);
  for (let y = 6; y < 48; y += 7) g.r(0, y, 10, 1, PAL.pedraS);
  g.r(0, 0, 10, 2, PAL.pedraL);
  return paraCanvas(g);
}
function tabua() {
  const g = grade(9, 5);
  g.r(0, 0, 9, 4, PAL.madeira); g.r(0, 0, 9, 1, PAL.madeiraL); g.r(0, 3, 9, 1, PAL.madeiraS); g.p(2, 2, PAL.madeiraS); g.p(6, 1, PAL.madeiraS);
  return paraCanvas(g);
}
function bloco() {
  const g = grade(16, 16);
  g.r(0, 0, 16, 16, '#a48a7a'); g.r(0, 0, 16, 1, '#c9b2a1'); g.r(0, 0, 1, 16, '#c9b2a1');
  g.r(13, 0, 3, 16, '#7a6458'); g.r(0, 13, 16, 3, '#7a6458');
  g.r(0, 7, 16, 1, '#7a6458'); g.r(7, 0, 1, 7, '#7a6458'); g.r(3, 8, 1, 7, '#7a6458'); g.r(11, 8, 1, 7, '#7a6458');
  return paraCanvas(g);
}
let prontos = null;
export function SPR() {
  if (!prontos) prontos = { grama: tileGrama(false), rocha: tileGrama(true), arvore: arvore(), pinheiro: pinheiro(), nuvem: nuvem(), castelo: castelo(), porta: porta(), pilar: pilar(), tabua: tabua(), bloco: bloco() };
  return prontos;
}
// desenha um sprite com o ponto de apoio embaixo, no meio (x, yBase em unidades do mundo)
export function desenharSprite(g, spr, x, yBase, { escala = 1, virar = false, alfa = 1 } = {}) {
  const w = spr.width * ART * escala, h = spr.height * ART * escala;
  g.save();
  g.imageSmoothingEnabled = false;
  g.globalAlpha *= alfa;
  g.translate(Math.round(x), Math.round(yBase));
  if (virar) g.scale(-1, 1);
  g.drawImage(spr, -w / 2, -h, w, h);
  g.restore();
}
