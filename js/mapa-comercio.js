/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Conexão Global: o mapa-múndi simplificado (desenhado em código), os portos e o navio que percorre as rotas. */
// O contorno dos continentes é aproximado de propósito: o mapa serve para mostrar onde fica cada porto e o caminho
// do navio, não para a criança acertar a forma do país.

const LARGURA = 1000, ALTURA = 470;
// longitude/latitude → ponto no desenho (de 78° N a 56° S, para sobrar mais espaço para os países)
export const projetar = ([lon, lat]) => [((lon + 180) / 360) * LARGURA, ((78 - lat) / 134) * ALTURA];

// contornos (longitude, latitude), bem simplificados
const TERRAS = [
  // América do Norte
  [[-168, 66], [-140, 70], [-100, 72], [-80, 72], [-65, 60], [-55, 50], [-70, 43], [-76, 35], [-81, 27], [-80, 25], [-90, 29], [-97, 26],
    [-97, 20], [-88, 21], [-87, 15], [-83, 9], [-79, 8], [-85, 11], [-92, 15], [-105, 20], [-110, 23], [-117, 32], [-124, 40], [-124, 48], [-135, 57], [-150, 60], [-165, 60]],
  // Groenlândia
  [[-50, 60], [-40, 65], [-22, 70], [-20, 78], [-60, 78], [-70, 76], [-55, 70]],
  // América do Sul
  [[-79, 8], [-72, 12], [-60, 10], [-50, 0], [-35, -6], [-39, -15], [-48, -26], [-58, -35], [-65, -42], [-68, -53], [-74, -50], [-73, -40], [-71, -30], [-70, -18], [-76, -12], [-81, -5], [-80, 0]],
  // Europa
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [10, 57], [5, 62], [15, 69], [28, 71], [40, 67], [45, 55], [40, 47], [30, 45], [28, 41], [23, 37], [20, 40], [16, 38], [12, 44], [8, 44], [3, 43], [-1, 37]],
  // Grã-Bretanha e Irlanda
  [[-5, 50], [1, 51], [2, 53], [-2, 56], [-5, 58], [-6, 55]],
  [[-10, 52], [-6, 52], [-6, 55], [-9, 55]],
  // África
  [[-17, 15], [-17, 21], [-10, 30], [-6, 36], [10, 37], [20, 32], [32, 31], [34, 28], [43, 12], [51, 12], [42, -2], [40, -15], [35, -24], [32, -29], [20, -35], [17, -29], [12, -17], [13, -5], [9, 4], [-4, 5], [-13, 8]],
  // Madagascar
  [[44, -17], [50, -15], [48, -25], [44, -24]],
  // Ásia (com a Rússia, o Oriente Médio e a Índia)
  [[28, 41], [36, 36], [34, 28], [44, 13], [58, 23], [57, 26], [66, 25], [72, 21], [77, 8], [80, 15], [88, 22], [92, 22], [98, 16], [100, 13], [103, 1], [105, 9], [109, 12],
    [108, 21], [117, 24], [122, 31], [121, 39], [126, 38], [129, 35], [130, 43], [141, 52], [156, 58], [163, 66], [180, 68], [180, 72], [140, 74], [110, 77], [80, 74], [60, 70], [45, 68], [40, 67], [45, 55], [40, 47], [30, 45]],
  // Japão
  [[130, 31], [136, 34], [141, 38], [142, 44], [140, 42], [135, 35]],
  // Sumatra/Java e Bornéu
  [[95, 5], [105, -6], [115, -8], [120, -9], [114, -6], [106, -3], [100, 0]],
  [[109, 1], [117, 7], [119, 1], [116, -4], [110, -3]],
  // Austrália e Nova Zelândia
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [141, -38], [131, -31], [115, -34]],
  [[172, -35], [178, -38], [174, -42], [167, -46]],
];
const caminhoTerra = (pts) => 'M' + pts.map((p) => projetar(p).map((n) => n.toFixed(1)).join(' ')).join('L') + 'Z';
const TERRAS_SVG = TERRAS.map((t) => `<path d="${caminhoTerra(t)}"/>`).join('');

// curva de uma rota: um arco por cima do caminho reto, mais alto quanto mais longe
function curvaRota(de, para) {
  const [x1, y1] = projetar(de), [x2, y2] = projetar(para);
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - Math.min(140, dist * 0.22);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

// desenha o mapa: portos (todos pequenos), destaques (maiores, com nome) e as rotas já feitas
export function desenharMapa(el, { paises, destaques = [], rotas = [], nomes = true }) {
  const portos = paises.map((p) => {
    const [x, y] = projetar(p.pos);
    const d = destaques.includes(p.id);
    return `<g class="cm-porto${d ? ' destaque' : ''}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
      ${d ? '<circle class="cm-porto-onda" r="9"/>' : ''}<circle r="${d ? 7 : 4.5}"/>
      ${d && nomes ? `<text y="-13" text-anchor="middle">${p.nome}</text>` : ''}</g>`;
  }).join('');
  const linhas = rotas.map((r) => `<path class="cm-rota" d="${curvaRota(r.de, r.para)}"/>`).join('');
  el.innerHTML = `<svg class="cm-mapa-svg" viewBox="0 0 ${LARGURA} ${ALTURA}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa-múndi com os portos">
    <rect width="${LARGURA}" height="${ALTURA}" class="cm-mar"/>
    <g class="cm-terras">${TERRAS_SVG}</g><g>${linhas}</g><g>${portos}</g><g class="cm-navio-camada"></g></svg>`;
}

// o navio sai de um porto e vai até o outro pela curva; a rota fica desenhada. Devolve uma promessa (espera a viagem)
export function animarNavio(el, de, para, duracao = 1800) {
  return new Promise((resolver) => {
    const svg = el.querySelector('svg');
    if (!svg) { resolver(); return; }
    const ns = 'http://www.w3.org/2000/svg';
    const rota = document.createElementNS(ns, 'path');
    rota.setAttribute('d', curvaRota(de, para));
    rota.setAttribute('class', 'cm-rota nova');
    svg.querySelector('.cm-navio-camada').append(rota);
    const navio = document.createElementNS(ns, 'text');
    navio.setAttribute('class', 'cm-navio');
    navio.setAttribute('text-anchor', 'middle');
    navio.setAttribute('dominant-baseline', 'middle');
    navio.textContent = '🚢';
    svg.querySelector('.cm-navio-camada').append(navio);
    const total = rota.getTotalLength();
    rota.style.strokeDasharray = `${total}`;
    rota.style.strokeDashoffset = `${total}`;
    const t0 = performance.now();
    // sem animação (o aparelho pede menos movimento): chega direto
    const reduzir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function passo(agora) {
      const t = reduzir ? 1 : Math.min(1, (agora - t0) / duracao);
      const suave = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
      const p = rota.getPointAtLength(total * suave);
      navio.setAttribute('x', p.x.toFixed(1));
      navio.setAttribute('y', p.y.toFixed(1));
      rota.style.strokeDashoffset = `${total * (1 - suave)}`;
      if (t < 1) requestAnimationFrame(passo);
      else { rota.style.strokeDasharray = ''; rota.style.strokeDashoffset = ''; setTimeout(() => { navio.remove(); resolver(); }, 250); }
    }
    requestAnimationFrame(passo);
  });
}
