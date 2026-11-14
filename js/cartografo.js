/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Cartógrafo do Vale: cruzar as camadas do mapa (relevo, água, vegetação) para resolver missões. */

import { $, embaralhar } from './util.js?v=277';
import { aluno, definirMissao, definirResultados, estrelasTexto, lerEstrelas, missao, resultados } from './estado.js?v=277';
import { SOM, tocar } from './som.js?v=277';
import { mascote, mostrar, telaJogos } from './telas.js?v=277';
import { escolherProfessorE } from './professor.js?v=277';
import { fimDaMissao } from './relatorio.js?v=277';
import { CAMADAS, CELULAS, COLUNAS, ESTRADAS, FASES_CARTOGRAFO, LINHAS, LUGARES, NIVEIS, RIO, USOS, celula } from './dados-cartografo.js?v=277';

// ---------- Cartógrafo do Vale ----------
// O aluno é o cartógrafo do Vale do Rio Claro (um território fictício). Cada missão pede uma decisão (onde fica a
// nascente, onde construir, qual estrada) e só se resolve CRUZANDO camadas: ele liga e desliga Relevo, Água e
// Vegetação e toca no mapa para usar a lupa (que só conta o que as camadas ligadas mostram). Depois escolhe o
// ponto (A, B ou C) ou o trajeto. Errou: a explicação daquele lugar; 2º erro: o jogo mostra a resposta. Acertou: a
// "Análise do território" explica o porquê e a descoberta vai para o Diário de campo (guardado no aparelho).
// Pontos como nos outros jogos: +100 por missão (+50 sem erro), combo x2 e x3; erro só zera o combo.
const CART = { BASE: 100, SEM_ERRO: 50, LADO: 30 };
let carto = null;   // a partida em andamento
let ultimaFase = 0;

// ---------- Diário de campo (no aparelho, separado por aluno) ----------
const chaveDiario = () => 'pleno-ortografia:cartografo:' + (aluno || '').trim().toLowerCase();
function lerDiario() { try { return JSON.parse(localStorage.getItem(chaveDiario())) || []; } catch (e) { return []; } }
function anotar(id) {
  const d = lerDiario();
  if (d.includes(id)) return false;
  d.push(id);
  try { localStorage.setItem(chaveDiario(), JSON.stringify(d)); } catch (e) { /* sem armazenamento */ }
  return true;
}
const idMissao = (f, m) => `${FASES_CARTOGRAFO[f].id}-${m}`;
const multiplicador = (combo) => (combo >= 3 ? 3 : combo >= 2 ? 2 : 1);

// ---------- O mapa (SVG) ----------
const L = CART.LADO;
const centro = ([c, l]) => [c * L + L / 2, l * L + L / 2];
// texturas além das cores (para quem não distingue bem as cores): montanha com hachura, planalto com pontinhos,
// lavoura com listras
const DEFS = `<defs>
  <pattern id="cg-hachura" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#5d4037" stroke-width="1.6" opacity="0.45"/></pattern>
  <pattern id="cg-pontos" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.1" fill="#e65100" opacity="0.45"/></pattern>
  <pattern id="cg-listras" width="7" height="7" patternUnits="userSpaceOnUse"><line x1="0" y1="3.5" x2="7" y2="3.5" stroke="#c17900" stroke-width="1.6" opacity="0.6"/></pattern>
</defs>`;
const quadrado = (cel, cor, extra = '') => `<rect x="${cel.c * L}" y="${cel.l * L}" width="${L}" height="${L}" fill="${cor}"${extra}/>`;
const icone = (cel, txt, tam = 15) => `<text x="${cel.c * L + L / 2}" y="${cel.l * L + L / 2 + tam * 0.35}" font-size="${tam}" text-anchor="middle">${txt}</text>`;
// Elementos obrigatórios de todo mapa (convenção cartográfica): título, rosa dos ventos, escala e fonte. A legenda fica
// embaixo do mapa, só com as camadas ligadas. Escala: cada quadradinho = 250 m, então 4 quadradinhos = 1 km.
const FAIXA = 46;   // a faixa embaixo do mapa, com os elementos (não cobre nenhum quadradinho)
const ELEMENTOS_DO_MAPA = (() => {
  const W = COLUNAS * L, H = LINHAS * L, y = H + FAIXA / 2;
  const escala = `<g class="cg-escala" transform="translate(12 ${y + 2})">
    ${[0, 1, 2, 3].map((i) => `<rect x="${i * L}" y="0" width="${L}" height="6" class="${i % 2 ? 'branca' : 'preta'}"/>`).join('')}
    <text x="0" y="-4">0</text><text x="${2 * L}" y="-4" text-anchor="middle">500 m</text><text x="${4 * L}" y="-4" text-anchor="middle">1 km</text>
    <text x="0" y="17" class="cg-escala-texto">Escala</text></g>`;
  const titulo = `<g class="cg-titulo-mapa"><text x="${W / 2 + 22}" y="${y - 3}" text-anchor="middle">Vale do Rio Claro</text>
    <text x="${W / 2 + 22}" y="${y + 12}" text-anchor="middle" class="cg-fonte">Mapa fictício (didático)</text></g>`;
  const rosa = `<g class="cg-rosa" transform="translate(${W - 32} ${y})">
    <circle r="15" class="cg-rosa-fundo"/>
    <polygon points="0,-13 3.5,0 0,3 -3.5,0" class="cg-rosa-norte"/><polygon points="0,13 3.5,0 0,-3 -3.5,0" class="cg-rosa-sul"/>
    <polygon points="13,0 0,3 -3,0 0,-3" class="cg-rosa-sul"/><polygon points="-13,0 0,3 3,0 0,-3" class="cg-rosa-sul"/>
    <text y="-17" text-anchor="middle" class="cg-rosa-n">N</text><text x="-21" y="3.5" text-anchor="middle">O</text>
    <text x="21" y="3.5" text-anchor="middle">L</text></g>`;
  return `<rect x="0" y="${H}" width="${W}" height="${FAIXA}" class="cg-faixa"/>${escala}${titulo}${rosa}`;
})();
// O mapa é desenhado a partir da grade, mas sem cara de quadradinhos: cada faixa (altitude, tipo de vegetação, lagoa)
// vira uma mancha de contorno arredondado (o filtro "suave" desfoca e corta a borda) com uma leve sombra, como num
// mapa de atlas. As texturas entram por máscara, dentro da mesma mancha.
const W = COLUNAS * L, H = LINHAS * L;
const MAPA_DEFS = `<defs>
  <filter id="cg-suave" x="-10%" y="-10%" width="120%" height="120%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/>
    <feComponentTransfer in="b" result="g"><feFuncA type="table" tableValues="0 0 0 1 1"/></feComponentTransfer>
    <feDropShadow in="g" dx="0" dy="1.6" stdDeviation="1.3" flood-color="#3e2723" flood-opacity="0.35"/>
  </filter>
  <filter id="cg-forma" x="-10%" y="-10%" width="120%" height="120%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/>
    <feComponentTransfer in="b"><feFuncA type="table" tableValues="0 0 0 1 1"/></feComponentTransfer>
  </filter>
  <filter id="cg-sombra" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.4" flood-color="#000" flood-opacity="0.35"/></filter>
  <clipPath id="cg-recorte"><rect width="${W}" height="${H}" rx="10"/></clipPath>
  <radialGradient id="cg-papel" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#fbf6ea"/><stop offset="1" stop-color="#efe3c8"/></radialGradient>
</defs>`;
// cada quadradinho vira um círculo que encosta nos vizinhos: a união deles tem borda ondulada (natural), sem os degraus
// dos quadrados. Na beira do mapa, um retângulo leva a mancha até fora da borda (o recorte arredonda o canto).
const bloco = (cel) => {
  const [x, y] = centro([cel.c, cel.l]), r = L * 0.74;
  let s = `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}"/>`;
  if (cel.c === 0) s += `<rect x="-30" y="${y - L / 2}" width="${x + 30}" height="${L}"/>`;
  if (cel.c === COLUNAS - 1) s += `<rect x="${x}" y="${y - L / 2}" width="${W - x + 30}" height="${L}"/>`;
  if (cel.l === 0) s += `<rect x="${x - L / 2}" y="-30" width="${L}" height="${y + 30}"/>`;
  if (cel.l === LINHAS - 1) s += `<rect x="${x - L / 2}" y="${y}" width="${L}" height="${H - y + 30}"/>`;
  return s;
};
const mancha = (filtro, cor, celulas) => `<g clip-path="url(#cg-recorte)"><g filter="url(#${filtro})" fill="${cor}">${celulas.map(bloco).join('')}</g></g>`;
// textura dentro de uma mancha: máscara com a mesma forma
let mascaras = 0;
const texturaEm = (padrao, celulas) => {
  const id = `cg-m${mascaras++}`;
  return `<mask id="${id}"><g filter="url(#cg-forma)" fill="#fff">${celulas.map(bloco).join('')}</g></mask>
    <rect width="${W}" height="${H}" fill="url(#${padrao})" mask="url(#${id})" clip-path="url(#cg-recorte)"/>`;
};
// curva suave passando pelos pontos (Catmull-Rom → Bézier)
function curva(pts) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
// o rio com meandros: entre um ponto e outro, um desvio para os lados (alternando)
const RIO_CURVO = (() => {
  const out = [];
  RIO.forEach((p, i) => {
    const a = centro(p);
    out.push(a);
    if (i < RIO.length - 1) {
      const b = centro(RIO[i + 1]), dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1, lado = i % 2 ? 7 : -7;
      out.push([(a[0] + b[0]) / 2 - (dy / n) * lado, (a[1] + b[1]) / 2 + (dx / n) * lado]);
    }
  });
  return out;
})();
// o rio vai engrossando da nascente até a lagoa: cada trecho (de um ponto ao seguinte) é uma curva, e a largura cresce
function trecho(pts, i) {
  const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
  const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
  return `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
}
const rioDesenhado = () => {
  const n = RIO_CURVO.length - 1;
  const trechos = Array.from({ length: n }, (_, i) => ({ d: trecho(RIO_CURVO, i), largura: 2.5 + (i / (n - 1)) * 6 }));
  return trechos.map((t) => `<path d="${t.d}" stroke="#0d47a1" stroke-width="${(t.largura + 2.5).toFixed(1)}" opacity="0.3"/>`).join('')
    + trechos.map((t) => `<path d="${t.d}" stroke="#2196f3" stroke-width="${t.largura.toFixed(1)}"/>`).join('')
    + `<path d="${curva(RIO_CURVO)}" stroke="#bbdefb" stroke-width="1.2" stroke-dasharray="4 8" opacity="0.8"/>`;
};
const vizinhosIguais = (cel, campo) => [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dc, dl]) => {
  const c = cel.c + dc, l = cel.l + dl;
  return c < 0 || l < 0 || c >= COLUNAS || l >= LINHAS || celula(c, l)[campo] === cel[campo];
});
// árvores, casinhas e pedras espalhadas no meio das manchas (sem tocar a borda)
const simbolo = (cel, txt, tam, dx = 0, dy = 0) => `<text x="${cel.c * L + L / 2 + dx}" y="${cel.l * L + L / 2 + tam * 0.35 + dy}" font-size="${tam}" text-anchor="middle">${txt}</text>`;
// estradas: trechos retos com cantos arredondados (a curva suave fazia laços nos trajetos)
const caminho = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${centro(p).join(' ')}`).join(' ');

function desenharMapa() {
  const m = carto.missao;
  mascaras = 0;
  const de = (f) => CELULAS.filter(f);
  // relevo: a planície cobre tudo e cada faixa mais alta vem por cima, em degraus suaves
  const relevo = `<rect width="${W}" height="${H}" fill="${NIVEIS[0].cor}"/>
    ${mancha('cg-suave', NIVEIS[1].cor, de((c) => c.nivel >= 1))}
    ${mancha('cg-suave', NIVEIS[2].cor, de((c) => c.nivel >= 2))}${texturaEm('cg-pontos', de((c) => c.nivel === 2))}
    ${mancha('cg-suave', NIVEIS[3].cor, de((c) => c.nivel >= 3))}${texturaEm('cg-hachura', de((c) => c.nivel >= 3))}`;
  // vegetação: o campo cobre tudo e as outras manchas vêm por cima
  const vegetacao = `<rect width="${W}" height="${H}" fill="${USOS.C.cor}"/>
    ${mancha('cg-suave', USOS.L.cor, de((c) => c.uso === 'L'))}${texturaEm('cg-listras', de((c) => c.uso === 'L'))}
    ${mancha('cg-suave', USOS.R.cor, de((c) => c.uso === 'R'))}
    ${mancha('cg-suave', USOS.F.cor, de((c) => c.uso === 'F'))}
    ${mancha('cg-suave', USOS.U.cor, de((c) => c.uso === 'U'))}
    ${mancha('cg-suave', '#64b5f6', de((c) => c.uso === 'A'))}
    ${de((c) => c.uso === 'F' && vizinhosIguais(c, 'uso') && (c.c + c.l) % 2 === 0).map((c) => simbolo(c, '🌲', 17)).join('')}
    ${de((c) => c.uso === 'R' && (c.c + c.l) % 2 === 1).map((c) => simbolo(c, '🪨', 11)).join('')}
    ${de((c) => c.uso === 'U').map((c, i) => simbolo(c, i % 2 ? '🏠' : '🏘️', 15)).join('')}`;
  // cidades: as estradas e os lugares, com o nome escrito (convenção: todo lugar habitado tem nome no mapa)
  const SIMBOLO = { vila: ['🏘️', 19], bairro: ['🏠', 16], sitio: ['🏡', 15] };
  const cidades = `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
      ${ESTRADAS.map((e) => `<path d="${caminho(e.pts)}" stroke="#455a64" stroke-width="7"/><path d="${caminho(e.pts)}" stroke="#90a4ae" stroke-width="4.5"/>
      <path d="${caminho(e.pts)}" stroke="#fff" stroke-width="1.2" stroke-dasharray="5 5"/>`).join('')}</g>
    ${LUGARES.map((lg) => {
      const xs = lg.celulas.map((p) => centro(p));
      const x = xs.reduce((s, p) => s + p[0], 0) / xs.length, y = xs.reduce((s, p) => s + p[1], 0) / xs.length;
      const [sim, tam] = SIMBOLO[lg.tipo];
      return `<g filter="url(#cg-sombra)"><circle cx="${x}" cy="${y}" r="${tam * 0.72}" fill="#fff" opacity="0.9"/></g>
        ${xs.map((p) => `<text x="${p[0]}" y="${p[1] + tam * 0.35}" font-size="${tam}" text-anchor="middle">${sim}</text>`).join('')}
        <text x="${x}" y="${y + tam * 0.72 + 11}" class="cg-rotulo-lugar" text-anchor="middle">${lg.nome}</text>`;
    }).join('')}`;
  const nasc = centro(RIO[0]);
  const agua = `${mancha('cg-suave', '#42a5f5', de((c) => c.uso === 'A'))}
    <g fill="none" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#cg-recorte)">${rioDesenhado()}</g>
    <circle cx="${nasc[0]}" cy="${nasc[1]}" r="8" fill="#e3f2fd" stroke="#1e88e5" stroke-width="2.5" filter="url(#cg-sombra)"/>
    <text x="${nasc[0]}" y="${nasc[1] + 4}" font-size="10" text-anchor="middle">💧</text>
    <text x="${W - 50}" y="${H - 22}" class="cg-rotulo-agua" text-anchor="middle">Lagoa Grande</text>`;
  // de onde a colheita sai (o começo dos trajetos)
  const saida = m.tipo === 'rota' ? (() => { const [x, y] = centro(Object.values(m.rotas)[0][0]); return `<g filter="url(#cg-sombra)"><circle cx="${x}" cy="${y}" r="12" fill="#fff" stroke="#2e7d32" stroke-width="2.5"/></g><text x="${x}" y="${y + 5}" font-size="14" text-anchor="middle">🚜</text>`; })() : '';
  const rotas = m.tipo === 'rota' ? Object.entries(m.rotas).map(([letra, pts]) => {
    const meio = centro(pts[Math.floor(pts.length / 2)]);
    return `<g class="cg-rota${carto.escolha === letra ? ' escolhida' : ''}${(carto.errados || []).includes(letra) ? ' errada' : ''}" data-op="${letra}">
      <path d="${caminho(pts)}" class="cg-rota-linha"/><path d="${caminho(pts)}" class="cg-rota-toque"/>
      <g filter="url(#cg-sombra)"><circle cx="${meio[0]}" cy="${meio[1]}" r="12" class="cg-marca"/></g><text x="${meio[0]}" y="${meio[1] + 5}" class="cg-marca-letra">${letra}</text></g>`;
  }).join('') : '';
  // os pontos A, B, C como alfinetes de mapa
  const pontos = m.tipo === 'ponto' ? Object.entries(m.pontos).map(([letra, p]) => {
    const [x, y] = centro(p);
    return `<g class="cg-ponto${carto.escolha === letra ? ' escolhida' : ''}${(carto.errados || []).includes(letra) ? ' errada' : ''}" data-op="${letra}">
      <circle cx="${x}" cy="${y - 10}" r="22" class="cg-ponto-toque"/>
      <g filter="url(#cg-sombra)"><path d="M${x} ${y} C${x - 4} ${y - 8} ${x - 13} ${y - 11} ${x - 13} ${y - 21} A13 13 0 1 1 ${x + 13} ${y - 21} C${x + 13} ${y - 11} ${x + 4} ${y - 8} ${x} ${y} Z" class="cg-marca"/></g>
      <text x="${x}" y="${y - 16}" class="cg-marca-letra">${letra}</text></g>`;
  }).join('') : '';
  $('cg-mapa').innerHTML = `<svg class="cg-svg" viewBox="0 0 ${W} ${H + FAIXA}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa do Vale do Rio Claro">${DEFS}${MAPA_DEFS}
    <rect width="${W}" height="${H}" rx="10" fill="url(#cg-papel)"/>
    <g class="cg-camada" data-camada="relevo">${relevo}</g>
    <g class="cg-camada" data-camada="vegetacao">${vegetacao}</g>
    <g class="cg-camada" data-camada="agua">${agua}</g>
    <g class="cg-camada" data-camada="cidades">${cidades}</g>
    <rect width="${W}" height="${H}" rx="10" class="cg-moldura"/>
    <g class="cg-destaque" id="cg-destaque"></g>
    <g id="cg-alvo"></g>
    <g>${rotas}${saida}${pontos}</g>
    ${ELEMENTOS_DO_MAPA}</svg>`;
  aplicarCamadas();
}

// liga/desliga as camadas (com relevo ligado, a vegetação fica mais transparente para os dois aparecerem juntos)
function aplicarCamadas() {
  const svg = $('cg-mapa').querySelector('svg');
  if (!svg) return;
  for (const g of svg.querySelectorAll('.cg-camada')) g.classList.toggle('ligada', carto.ligadas.has(g.dataset.camada));
  svg.classList.toggle('com-relevo', carto.ligadas.has('relevo'));
  svg.classList.toggle('sem-camada', !carto.ligadas.size);
  $('cg-camadas').querySelectorAll('[data-camada]').forEach((b) => {
    const on = carto.ligadas.has(b.dataset.camada);
    b.classList.toggle('ligada', on);
    b.setAttribute('aria-pressed', on);
  });
  desenharLegenda();
}

// legenda: só das camadas ligadas (na missão de restaurar a legenda, ela é o próprio quebra-cabeça)
const AMOSTRAS = {
  nivel0: `<rect width="22" height="16" rx="3" fill="${NIVEIS[0].cor}"/>`, nivel1: `<rect width="22" height="16" rx="3" fill="${NIVEIS[1].cor}"/>`,
  nivel2: `<rect width="22" height="16" rx="3" fill="${NIVEIS[2].cor}"/><rect width="22" height="16" rx="3" fill="url(#cg-pontos)"/>`,
  nivel3: `<rect width="22" height="16" rx="3" fill="${NIVEIS[3].cor}"/><rect width="22" height="16" rx="3" fill="url(#cg-hachura)"/>`,
  rio: '<path d="M1 12 Q7 2 11 8 T21 4" fill="none" stroke="#1e88e5" stroke-width="4" stroke-linecap="round"/>',
  nascente: '<circle cx="11" cy="8" r="7" fill="#e3f2fd" stroke="#1e88e5" stroke-width="2"/><text x="11" y="12" font-size="9" text-anchor="middle">💧</text>',
  lagoa: '<rect width="22" height="16" rx="6" fill="#42a5f5"/>',
  usoF: `<rect width="22" height="16" rx="3" fill="${USOS.F.cor}"/><text x="11" y="12.5" font-size="10" text-anchor="middle">🌲</text>`,
  usoL: `<rect width="22" height="16" rx="3" fill="${USOS.L.cor}"/><rect width="22" height="16" rx="3" fill="url(#cg-listras)"/>`,
  usoC: `<rect width="22" height="16" rx="3" fill="${USOS.C.cor}"/>`, usoR: `<rect width="22" height="16" rx="3" fill="${USOS.R.cor}"/>`,
  usoU: `<rect width="22" height="16" rx="3" fill="${USOS.U.cor}"/><text x="11" y="12.5" font-size="10" text-anchor="middle">🏘️</text>`,
  estrada: '<path d="M1 8 H21" stroke="#455a64" stroke-width="7"/><path d="M1 8 H21" stroke="#90a4ae" stroke-width="4.5"/><path d="M1 8 H21" stroke="#fff" stroke-width="1.2" stroke-dasharray="3 3"/>',
  vila: '<text x="11" y="13" font-size="13" text-anchor="middle">🏘️</text>',
  bairro: '<text x="11" y="13" font-size="12" text-anchor="middle">🏠</text>',
  sitio: '<text x="11" y="13" font-size="12" text-anchor="middle">🏡</text>',
};
const amostra = (k) => `<svg class="cg-amostra" viewBox="0 0 22 16" aria-hidden="true">${DEFS}${AMOSTRAS[k]}</svg>`;
const LEGENDA = {
  relevo: [['nivel0', 'Planície'], ['nivel1', 'Colinas'], ['nivel2', 'Planalto'], ['nivel3', 'Montanha']],
  agua: [['rio', 'Rio'], ['nascente', 'Nascente'], ['lagoa', 'Lagoa']],
  vegetacao: [['usoF', 'Floresta'], ['usoL', 'Lavoura'], ['usoC', 'Campo'], ['usoR', 'Rocha'], ['usoU', 'Vila']],
  cidades: [['estrada', 'Estrada'], ['vila', 'Cidade'], ['bairro', 'Bairro'], ['sitio', 'Sítio']],
};
function desenharLegenda() {
  const m = carto.missao;
  if (m.tipo === 'legenda') return;   // na restauração, a legenda está no painel da missão
  const itens = [...carto.ligadas].flatMap((k) => LEGENDA[k]);
  $('cg-legenda').innerHTML = itens.length ? itens.map(([a, n]) => `<span class="cg-leg-item">${amostra(a)}${n}</span>`).join('')
    : '<span class="cg-leg-vazia">Ligue uma camada para ver a legenda.</span>';
}

// ---------- Menu ----------
function telaCartografoMenu() {
  pararCartografo();
  mascote('davi-cartografo', 'oi');
  const estrelas = lerEstrelas();
  $('cg-fases').innerHTML = FASES_CARTOGRAFO.map((f, k) => `
    <button class="missao" style="--c:#2e7d32" data-fase="${k}" type="button">
      <span class="missao-icone">${f.icone}</span>
      <span class="missao-titulo">Fase ${k + 1}</span>
      <span class="missao-descricao">${f.nome} · ${f.missoes.length} missões</span>
      <span class="missao-estrelas">${estrelasTexto(estrelas[f.id] || 0)}</span>
    </button>`).join('');
  const d = lerDiario(), total = FASES_CARTOGRAFO.reduce((s, f) => s + f.missoes.length, 0);
  $('cg-diario-qtd').textContent = `· ${d.length} de ${total}`;
  mostrar('tela-cartografo-menu');
}
$('cg-fases').onclick = (e) => {
  const b = e.target.closest('[data-fase]');
  if (!b) return;
  SOM.clique();
  comecarCartografo(Number(b.dataset.fase));
};

// ---------- Partida ----------
function comecarCartografo(k = 0) {
  pararCartografo();
  ultimaFase = k;
  const fase = FASES_CARTOGRAFO[k];
  definirMissao({ id: fase.id, cartografo: true, icone: '🧭', cor: '#2e7d32', titulo: `Cartógrafo do Vale – ${fase.nome}` });
  definirResultados([]);
  carto = { fase, k, idx: -1, pontos: 0, combo: 0, dePrimeira: 0, novas: 0, rodando: true, lendo: false };
  // os botões das camadas da fase
  $('cg-camadas').innerHTML = fase.camadas.map((id) => `<button class="cg-camada-btn" type="button" data-camada="${id}" aria-pressed="false">
    <span aria-hidden="true">${CAMADAS[id].icone}</span>${CAMADAS[id].nome}</button>`).join('');
  mostrar('tela-cartografo');
  proximaMissao();
}

function pararCartografo() {
  if (carto) carto.rodando = false;
  carto = null;
  $('cg-analise').hidden = true;
}
const msgCarto = (t, tipo = '') => { $('cg-msg').innerHTML = t; $('cg-msg').className = `cg-msg ${tipo}`; };

function proximaMissao() {
  const c = carto;
  c.idx++;
  if (c.idx >= c.fase.missoes.length) { terminarCartografo(); return; }
  const m = c.fase.missoes[c.idx];
  Object.assign(c, { missao: m, ligadas: new Set(), escolha: null, errados: [], erros: [], sel: null, feitos: new Set(),
    bandeja: m.tipo === 'legenda' ? embaralhar([...m.itens.map((i) => i.id), 'distrator']) : [] });
  $('cg-titulo').textContent = `🧭 ${c.fase.nome}`;
  $('cg-progresso').textContent = `Missão ${c.idx + 1} de ${c.fase.missoes.length}`;
  $('cg-pontos').textContent = c.pontos;
  $('cg-combo').textContent = multiplicador(c.combo) > 1 ? `🔥 Combo x${multiplicador(c.combo)}` : '';
  // só o título e a pergunta: as camadas úteis já pulsam nos botões
  $('cg-pergunta').innerHTML = `<b>${m.titulo}</b><span>${m.pergunta}</span>`;
  c.ultimaCel = null;
  $('cg-camadas').querySelectorAll('[data-camada]').forEach((b) => b.classList.toggle('util', m.camadas.includes(b.dataset.camada)));
  msgCarto(m.tipo === 'legenda' ? 'Toque num nome lá embaixo e depois no lugar dele na legenda.'
    : m.tipo === 'rota' ? 'Ligue as camadas, compare os trajetos e toque no A, no B ou no C.'
      : 'Ligue as camadas e toque no mapa: a 🔍 lupa conta o que tem ali. Depois escolha A, B ou C.');
  desenharMapa();
  desenharPainel();
}

// painel de baixo: a legenda para restaurar ou o botão de confirmar a escolha
function desenharPainel() {
  const c = carto, m = c.missao;
  if (m.tipo === 'legenda') {
    $('cg-legenda').innerHTML = m.itens.map((it) => `
      <button class="cg-lacuna${c.feitos.has(it.id) ? ' feita' : ''}" type="button" data-lacuna="${it.id}"${c.feitos.has(it.id) ? ' disabled' : ''}>
        ${amostra(it.amostra)}<span>${c.feitos.has(it.id) ? it.nome.split(' (')[0] : '? ? ?'}</span></button>`).join('');
    $('cg-acao').innerHTML = `<div class="cg-bandeja">${c.bandeja.filter((id) => !c.feitos.has(id)).map((id) => `
      <button class="cg-ficha${c.sel === id ? ' selecionada' : ''}" type="button" data-ficha="${id}">${id === 'distrator' ? m.distrator : m.itens.find((i) => i.id === id).nome}</button>`).join('')}</div>`;
    return;
  }
  $('cg-acao').innerHTML = c.escolha
    ? `<button class="btn-grande cg-confirmar" type="button" id="btn-cg-confirmar">Escolher ${m.tipo === 'rota' ? 'o trajeto' : 'o ponto'} ${c.escolha} ✔</button>`
    : '';
}

// ---------- Toques no mapa: lupa, pontos e trajetos ----------
$('cg-mapa').onclick = (e) => {
  const c = carto;
  if (!c || !c.rodando || c.lendo) return;
  const op = e.target.closest('[data-op]');
  if (op && !op.classList.contains('errada')) {
    SOM.clique();
    c.escolha = op.dataset.op;
    desenharMapa();
    desenharPainel();
    const m = c.missao;
    if (m.tipo === 'ponto') mostrarLupa(celula(...m.pontos[c.escolha]));
    else msgCarto(`Trajeto ${c.escolha} escolhido. Compare com os outros e confirme lá embaixo.`);
    return;
  }
  // lupa: o quadradinho tocado
  const svg = $('cg-mapa').querySelector('svg');
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const col = Math.floor(p.x / L), lin = Math.floor(p.y / L);
  if (col < 0 || col >= COLUNAS || lin < 0 || lin >= LINHAS) return;
  tocar([[880, 0.04]]);
  mostrarLupa(celula(col, lin));
};

// a lupa só conta o que as camadas ligadas mostram (sem camada, ela pede para ligar uma). O resultado aparece na faixa
// logo abaixo do mapa (não cobre nada) e o lugar tocado ganha um alvo; ao ligar outra camada, a lupa se atualiza.
function mostrarLupa(cel) {
  const c = carto;
  c.ultimaCel = cel;
  const partes = [];
  if (c.ligadas.has('relevo')) partes.push(`⛰️ ${NIVEIS[cel.nivel].nome}, ${cel.metros} m`);
  if (c.ligadas.has('agua')) {
    partes.push(cel.nascente ? '💧 nascente do rio' : cel.rio ? '🌊 o rio passa aqui' : cel.lagoa ? '🌊 Lagoa Grande'
      : cel.agua === 1 ? '🌊 colado no rio' : cel.agua <= 3 ? '🌊 rio a poucos passos' : '🏜️ longe da água');
  }
  if (c.ligadas.has('cidades')) {
    partes.push(cel.lugar ? `🏘️ ${cel.lugar.nome}: ${cel.lugar.pessoas >= 1000 ? `muita gente (${cel.lugar.pessoas.toLocaleString('pt-BR')})` : cel.lugar.pessoas >= 100 ? `${cel.lugar.pessoas} moradores` : `poucos moradores (${cel.lugar.pessoas})`}`
      : '👥 ninguém mora aqui');
    if (cel.estrada) partes.push(`🛣️ ${cel.estrada.toLowerCase()}`);
  }
  if (c.ligadas.has('vegetacao')) partes.push(`${USOS[cel.uso].icone} ${USOS[cel.uso].nome.toLowerCase()}${cel.uso === 'F' && cel.agua <= 1 ? ' da beira do rio' : ''}`);
  msgCarto(partes.length ? `🔍 ${partes.join(' · ')}` : '🔍 Ligue uma camada para a lupa descobrir o que tem aqui.', 'lupa');
  const [x, y] = centro([cel.c, cel.l]);
  $('cg-alvo').innerHTML = `<circle cx="${x}" cy="${y}" r="11" class="cg-alvo"/><circle cx="${x}" cy="${y}" r="2.5" class="cg-alvo-meio"/>`;
}

$('cg-camadas').onclick = (e) => {
  const b = e.target.closest('[data-camada]');
  const c = carto;
  if (!b || !c || c.lendo) return;
  tocar([[c.ligadas.has(b.dataset.camada) ? 440 : 660, 0.07]]);
  if (c.ligadas.has(b.dataset.camada)) c.ligadas.delete(b.dataset.camada); else c.ligadas.add(b.dataset.camada);
  aplicarCamadas();
  if (c.ultimaCel && c.missao.tipo !== 'legenda') mostrarLupa(c.ultimaCel);   // a lupa mostra o que a camada nova acrescentou
};

// ---------- Legenda: ficha → lacuna ----------
$('cg-acao').onclick = (e) => {
  const c = carto;
  if (!c || !c.rodando || c.lendo) return;
  const ficha = e.target.closest('[data-ficha]');
  if (ficha) { SOM.clique(); c.sel = c.sel === ficha.dataset.ficha ? null : ficha.dataset.ficha; desenharPainel(); return; }
  if (e.target.closest('#btn-cg-confirmar')) confirmarEscolha();
};
$('cg-legenda').onclick = (e) => {
  const c = carto;
  const lacuna = e.target.closest('[data-lacuna]');
  if (!c || !lacuna || c.lendo || c.missao.tipo !== 'legenda') return;
  if (!c.sel) { msgCarto('Primeiro toque num nome lá embaixo. 👇'); return; }
  const item = c.missao.itens.find((i) => i.id === lacuna.dataset.lacuna);
  if (c.sel === item.id) {
    c.feitos.add(item.id);
    c.sel = null;
    SOM.certo();
    msgCarto(`✅ ${item.nome}! Veja no mapa onde ela aparece.`, 'ok');
    acenderNoMapa(item.amostra);
    desenharPainel();
    if (c.feitos.size === c.missao.itens.length) setTimeout(() => acertouMissao(), 900);
    return;
  }
  c.erros.push(`trocou "${item.nome}" por "${c.sel === 'distrator' ? c.missao.distrator : c.missao.itens.find((i) => i.id === c.sel).nome}"`);
  c.combo = 0;
  SOM.errado();
  if (navigator.vibrate) navigator.vibrate(150);
  lacuna.classList.add('balanca');
  msgCarto(`Não é esse. 💡 ${item.dica}`, 'erro');
};
// o lugar acende no mapa: os quadradinhos daquele tipo ganham contorno por um instante
function acenderNoMapa(tipo) {
  const alvo = tipo.startsWith('nivel') ? (cel) => cel.nivel === Number(tipo.slice(5)) : tipo.startsWith('uso') ? (cel) => cel.uso === tipo.slice(3)
    : tipo === 'rio' ? (cel) => cel.rio : tipo === 'nascente' ? (cel) => cel.nascente
      : tipo === 'estrada' ? (cel) => !!cel.estrada : ['vila', 'bairro', 'sitio'].includes(tipo) ? (cel) => cel.lugar && cel.lugar.tipo === tipo : () => false;
  $('cg-destaque').innerHTML = CELULAS.filter(alvo).map((cel) => quadrado(cel, 'none', ' class="cg-acende"')).join('');
  setTimeout(() => { if ($('cg-destaque')) $('cg-destaque').innerHTML = ''; }, 1800);
}

// ---------- Ponto ou trajeto: confirmar ----------
function confirmarEscolha() {
  const c = carto, m = c.missao, letra = c.escolha;
  if (!letra) return;
  if (letra === m.certa) { acertouMissao(); return; }
  c.errados.push(letra);
  c.erros.push(`escolheu ${letra}`);
  c.combo = 0;
  c.escolha = null;
  SOM.errado();
  if (navigator.vibrate) navigator.vibrate(150);
  if (c.errados.length >= 2) {   // com 3 opções e 2 erros, o jogo mostra a resposta
    resultados.push({ m: tipoDaFase(c), certa: m.titulo, erros: [...c.erros, 'o jogo mostrou a resposta'] });
    abrirAnalise(m.explica[m.certa], '📌 Esta era a resposta. Leia por quê e continue!', false);
    return;
  }
  msgCarto(`❌ ${m.explica[letra]} <span class="cg-dica">💡 ${m.dica}</span>`, 'erro');
  desenharMapa();
  desenharPainel();
}

const tipoDaFase = (c) => ({ id: c.fase.id, titulo: c.fase.nome, icone: c.fase.icone, cor: '#2e7d32',
  regra: 'Ler mapas é cruzar camadas: relevo (altitude), hidrografia (água) e vegetação (uso do solo).' });

function acertouMissao() {
  const c = carto, m = c.missao;
  const semErro = !c.erros.length;
  c.combo++;
  const mult = multiplicador(c.combo);
  const ganho = (CART.BASE + (semErro ? CART.SEM_ERRO : 0)) * mult;
  c.pontos += ganho;
  if (semErro) c.dePrimeira++;
  resultados.push({ m: tipoDaFase(c), certa: m.titulo, erros: c.erros });
  SOM.certo();
  const texto = m.tipo === 'legenda' ? 'Legenda restaurada! Agora todo mundo consegue ler este mapa.' : m.explica[m.certa];
  abrirAnalise(texto, `✅ <b>+${ganho} pontos</b>${mult > 1 ? ` (combo x${mult})` : ''}`, true);
}

// ---------- Análise do território (a recompensa: o porquê + a anotação no Diário) ----------
function abrirAnalise(texto, extra, acertou) {
  const c = carto, m = c.missao;
  c.lendo = true;
  const nova = acertou && anotar(idMissao(c.k, c.idx));
  if (nova) c.novas++;
  if (m.tipo !== 'legenda') { c.escolha = m.certa; desenharMapa(); }
  $('cg-analise-titulo').textContent = `🔎 Análise do território: ${m.titulo}`;
  $('cg-analise-camadas').innerHTML = m.camadas.map((k) => `<i>${CAMADAS[k].icone} ${CAMADAS[k].nome}</i>`).join(' + ');
  $('cg-analise-texto').textContent = texto;
  $('cg-analise-diario').innerHTML = `📓 <b>${nova ? 'Anotado no Diário de campo' : 'Diário de campo'}:</b> ${m.aprendi}`;
  $('cg-analise-extra').innerHTML = extra;
  $('cg-analise').hidden = false;
  $('btn-cg-continuar').focus();
}
$('btn-cg-continuar').onclick = () => {
  $('cg-analise').hidden = true;
  SOM.clique();
  if (!carto) return;
  carto.lendo = false;
  proximaMissao();
};

function terminarCartografo() {
  const c = carto;
  const comErro = resultados.filter((r) => r.erros.length).map((r) => r.certa);
  pararCartografo();
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${c.pontos}. Fase ${c.k + 1}: ${c.fase.nome}.`,
    `Resolveu ${c.dePrimeira} de ${c.fase.missoes.length} missões sem errar.`,
    comErro.length ? `Teve dificuldade em: ${comErro.join('; ')}.` : 'Nenhum erro: cruzou as camadas muito bem!',
  ];
  fimDaMissao();
  $('fim-titulo').textContent = c.dePrimeira === c.fase.missoes.length ? 'Cartógrafo de primeira! 🧭' : 'Fase concluída! 🧭';
  $('fim-texto').textContent = `${aluno}, você resolveu ${c.dePrimeira} de ${c.fase.missoes.length} missões sem errar e fez ${c.pontos} pontos!`
    + (c.novas ? ` ${c.novas} ${c.novas === 1 ? 'descoberta nova' : 'descobertas novas'} no Diário de campo.` : '');
  const proxima = FASES_CARTOGRAFO[c.k + 1];
  $('fim-acoes').innerHTML = `
    ${proxima ? `<button class="btn-grande" type="button" data-fim="proxima">▶ Próxima: ${proxima.nome}</button>` : ''}
    <button class="${proxima ? 'btn-sec' : 'btn-grande'}" type="button" data-fim="repetir">🔁 Jogar de novo</button>
    <button class="btn-sec" type="button" data-fim="sair">☰ Escolher outra fase</button>`;
  $('fim-acoes').onclick = (e) => {
    const b = e.target.closest('[data-fim]');
    if (!b) return;
    SOM.clique();
    if (b.dataset.fim === 'proxima') comecarCartografo(c.k + 1);
    else if (b.dataset.fim === 'repetir') comecarCartografo(c.k);
    else telaCartografoMenu();
  };
  $('fim-acoes').hidden = false;
  $('fim-acoes').querySelector('.btn-grande').focus({ preventScroll: true });
}
const repetirCartografo = () => comecarCartografo(ultimaFase);

// ---------- Diário de campo ----------
function telaDiario() {
  const d = lerDiario();
  $('cg-diario-lista').innerHTML = FASES_CARTOGRAFO.map((f, k) => `
    <h3 class="historia-arquivo-era" style="--c:#2e7d32">${f.icone} Fase ${k + 1}: ${f.nome}</h3>
    <div class="historia-arquivo-grade">${f.missoes.map((m, i) => (d.includes(idMissao(k, i)) ? `
      <article class="historia-doc" style="--c:#2e7d32"><header>📓 <b>${m.titulo}</b></header><p>${m.aprendi}</p></article>` : `
      <article class="historia-doc trancado"><header>🔒 <b>Descoberta escondida</b></header><p>Resolva a missão “${m.titulo}”.</p></article>`)).join('')}</div>`).join('');
  mostrar('tela-cartografo-diario');
}

$('btn-cartografo').onclick = () => { SOM.clique(); escolherProfessorE('Cartógrafo do Vale', telaCartografoMenu); };
$('cg-voltar').onclick = telaJogos;
$('btn-cg-diario').onclick = () => { SOM.clique(); telaDiario(); };
$('cg-diario-voltar').onclick = () => { SOM.clique(); telaCartografoMenu(); };
$('cg-sair').onclick = telaCartografoMenu;

export { comecarCartografo, pararCartografo, repetirCartografo, telaCartografoMenu };
