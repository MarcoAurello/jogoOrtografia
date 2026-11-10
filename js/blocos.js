/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Conte os Blocos. */

import { $, embaralhar, sortear } from './util.js?v=260';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=260';
import { SOM, tocar } from './som.js?v=260';
import { mascote, mostrar, telaJogos } from './telas.js?v=260';
import { escolherProfessorE } from './professor.js?v=260';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=260';

// ---------- Conte os Blocos ----------
// Visão espacial e contagem: uma construção de cubos aparece em perspectiva (isométrica) e a pergunta é
// "Quantos blocos tem na figura?", com 4 respostas. A construção é sempre "justa": cada pilha é mais baixa ou
// igual à que está atrás dela, então todo bloco escondido está embaixo de um bloco que aparece (ninguém flutua).
// Acertou: sobe um nível; errou: desce. As respostas erradas imitam os erros comuns: contar só os blocos que
// aparecem (esquecer os escondidos), contar só as pilhas (os de cima) e errar por um ou dois.
// Depois de responder, os blocos ficam transparentes e a conta aparece camada por camada.
const BLOCOS = { RODADAS: 12, NIVEL_MAX: 7, PAUSA: 2600 };
// tamanho da base (linhas x colunas), altura máxima e o que o nível treina
const NIVEIS_BL = [
  { lin: 1, col: [2, 4], alt: 1, titulo: 'Fileira de blocos' },
  { lin: 1, col: [3, 4], alt: 2, titulo: 'Blocos em cima de blocos' },
  { lin: 2, col: [2, 2], alt: 2, titulo: 'Base de 2 x 2' },
  { lin: 2, col: [3, 3], alt: 2, titulo: 'Base de 2 x 3' },
  { lin: 3, col: [3, 3], alt: 3, titulo: 'Escada de blocos' },
  { lin: 3, col: [3, 4], alt: 3, titulo: 'Blocos escondidos' },
  { lin: 4, col: [4, 4], alt: 4, titulo: 'Torre grande' },
];
const TIPOS_BL = NIVEIS_BL.map((n, i) => ({
  id: `blocos${i + 1}`, titulo: `Nível ${i + 1}: ${n.titulo}`, icone: '🧊', cor: '#1e64d2',
  regra: i < 2
    ? 'Contar os blocos um por um, sem esquecer os que estão em cima de outros.'
    : 'Contar camada por camada: os blocos de baixo continuam lá, mesmo escondidos atrás ou embaixo dos outros.',
}));
// cores dos cubos: topo (claro), lado esquerdo (cor) e lado direito (escuro)
const CORES_BL = [
  ['#ff7b72', '#e53935', '#b71c1c'], ['#6fa8ff', '#1e64d2', '#123f88'], ['#ffe066', '#f5c400', '#b38f00'],
  ['#7ddc8f', '#2e9e5b', '#1b6b3b'], ['#ffb066', '#f08a24', '#b35f0c'], ['#c79bf2', '#8e44ad', '#5e2b75'],
];
let blocos = null;   // a partida em andamento

// alturas das pilhas: a do fundo (x=0, y=0) é a mais alta e cada pilha é no máximo da altura das que estão atrás
function novaConstrucao(nivel) {
  const cfg = NIVEIS_BL[nivel - 1];
  const lin = cfg.lin, col = cfg.col[0] + Math.floor(Math.random() * (cfg.col[1] - cfg.col[0] + 1));
  for (let t = 0; t < 50; t++) {
    const h = Array.from({ length: lin }, () => Array(col).fill(0));
    for (let x = 0; x < lin; x++) {
      for (let y = 0; y < col; y++) {
        const teto = Math.min(cfg.alt, x ? h[x - 1][y] : cfg.alt, y ? h[x][y - 1] : cfg.alt);
        // o fundo fica alto; para a frente pode baixar (e, a partir do nível 3, até sumir)
        const piso = nivel <= 2 ? Math.min(1, teto) : 0;
        h[x][y] = x + y === 0 ? cfg.alt : piso + Math.floor(Math.random() * (teto - piso + 1));
      }
    }
    const total = h.flat().reduce((s, v) => s + v, 0);
    if (nivel === 1 && total >= 2) return h;
    // dos níveis 2 em diante, precisa ter bloco em cima de bloco; do 5 em diante, bloco escondido de verdade
    if (nivel >= 2 && h.flat().some((v) => v >= 2) && (nivel < 5 || contarVisiveis(h) < total)) return h;
  }
  return [[1, 1]];
}

const ocupado = (h, x, y, z) => x >= 0 && y >= 0 && x < h.length && y < h[0].length && z < h[x][y];
// cubos com alguma face à mostra (topo, lado esquerdo ou direito); os outros ficam totalmente escondidos
function contarVisiveis(h) {
  let n = 0;
  h.forEach((linha, x) => linha.forEach((alt, y) => {
    for (let z = 0; z < alt; z++) if (!(ocupado(h, x + 1, y, z) && ocupado(h, x, y + 1, z) && ocupado(h, x, y, z + 1))) n++;
  }));
  return n;
}
const total = (h) => h.flat().reduce((s, v) => s + v, 0);
const pilhasDe = (h) => h.flat().filter((v) => v > 0).length;
// quantos blocos em cada camada, de baixo para cima
const porCamada = (h) => Array.from({ length: Math.max(...h.flat()) }, (_, z) => h.flat().filter((v) => v > z).length);

// desenho isométrico: o aluno olha do canto da frente (x e y crescem para a frente); pinta do fundo para a frente
function construcaoSVG(h, { cores, transparente = false, classe = '' } = {}) {
  const W = 26, H = 15, S = 30;   // meia largura e meia altura do losango e a altura do cubo
  const P = (i, j, k) => [(i - j) * W, (i + j) * H - k * S];
  const cubos = [];
  h.forEach((linha, x) => linha.forEach((alt, y) => { for (let z = 0; z < alt; z++) cubos.push({ x, y, z }); }));
  cubos.sort((a, b) => a.x + a.y + a.z - (b.x + b.y + b.z) || a.z - b.z);
  const pts = cubos.flatMap(({ x, y, z }) => [P(x, y, z + 1), P(x + 1, y + 1, z), P(x, y + 1, z), P(x + 1, y, z)]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs) - 4, minY = Math.min(...ys) - 4, larg = Math.max(...xs) - minX + 4, alt = Math.max(...ys) - minY + 4;
  const poli = (lista, cor) => `<polygon points="${lista.map((p) => p.join(',')).join(' ')}" fill="${cor}"/>`;
  const corpo = cubos.map(({ x, y, z }, i) => {
    const [claro, base, escuro] = CORES_BL[cores[`${x},${y},${z}`] ?? 0];
    const topo = [P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)];
    const dir = [P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x + 1, y + 1, z), P(x + 1, y, z)];
    const esq = [P(x, y + 1, z + 1), P(x + 1, y + 1, z + 1), P(x + 1, y + 1, z), P(x, y + 1, z)];
    return `<g class="bloco" style="--i:${i}">${poli(topo, claro)}${poli(esq, base)}${poli(dir, escuro)}</g>`;
  }).join('');
  return `<svg class="blocos-svg ${classe}${transparente ? ' raio-x' : ''}" viewBox="${minX} ${minY} ${larg} ${alt}" role="img" aria-label="Construção de blocos">`
    + `<g stroke="#13294b" stroke-width="1.6" stroke-linejoin="round">${corpo}</g></svg>`;
}

// cores sorteadas, evitando o mesmo tom no bloco de baixo
function sortearCores(h) {
  const cores = {};
  h.forEach((linha, x) => linha.forEach((alt, y) => {
    for (let z = 0; z < alt; z++) {
      const baixo = cores[`${x},${y},${z - 1}`];
      cores[`${x},${y},${z}`] = sortear(CORES_BL.map((_, k) => k).filter((k) => k !== baixo));
    }
  }));
  return cores;
}

// a certa e três erradas que imitam os erros de contagem (cada errada guarda o motivo para o relatório)
function opcoesBlocos(h) {
  const certo = total(h), opcoes = new Map([[certo, { n: certo, certa: true }]]);
  const juntar = (n, motivo) => { if (n > 0 && !opcoes.has(n) && opcoes.size < 4) opcoes.set(n, { n, motivo }); };
  const visiveis = contarVisiveis(h);
  if (visiveis < certo) juntar(visiveis, 'contou só os blocos que aparecem (esqueceu os escondidos)');
  if (pilhasDe(h) < certo) juntar(pilhasDe(h), 'contou só os blocos de cima (as pilhas)');
  for (const d of embaralhar([1, -1, 2, -2, 3])) juntar(certo + d, d > 0 ? 'contou blocos a mais' : 'deixou de contar alguns blocos');
  return embaralhar([...opcoes.values()]);
}

function telaBlocosMenu() {
  pararBlocos();
  mascote('davi-blocos', 'oi');
  mostrar('tela-blocos-menu');
}

function comecarBlocos() {
  pararBlocos();
  definirMissao({ id: 'blocos', blocos: true, icone: '🧊', cor: '#1e64d2', titulo: 'Conte os Blocos' });
  definirResultados([]);
  blocos = { nivel: 1, nivelMax: 1, feitas: 0, acertos: 0, pontos: 0, escondidos: 0, soTopo: 0, umOuDois: 0, rodada: null, timers: [], rodando: true };
  mostrar('tela-blocos');
  proximaBlocos();
}

function pararBlocos() {
  if (blocos) { blocos.rodando = false; blocos.timers.forEach(clearTimeout); }
  blocos = null;
}
const depoisBlocos = (ms, fn) => { const b = blocos; const t = setTimeout(() => { if (blocos === b && b.rodando) fn(); }, ms); b.timers.push(t); };
const msgBlocos = (texto, tipo = '') => { $('blocos-msg').innerHTML = texto; $('blocos-msg').className = `cores-msg ${tipo}`; };

function hudBlocos() {
  $('blocos-nivel').textContent = `🧊 Nível ${blocos.nivel}`;
  $('blocos-pontos').textContent = blocos.pontos;
  $('blocos-contador').textContent = `${blocos.feitas}/${BLOCOS.RODADAS}`;
}

function proximaBlocos() {
  if (blocos.feitas >= BLOCOS.RODADAS) { terminarBlocos(); return; }
  const h = novaConstrucao(blocos.nivel);
  blocos.feitas++;
  blocos.rodada = { h, n: blocos.nivel, cores: sortearCores(h), opcoes: opcoesBlocos(h), respondida: false, t0: performance.now() };
  hudBlocos();
  const r = blocos.rodada;
  $('blocos-figura').innerHTML = construcaoSVG(h, { cores: r.cores, classe: 'cai' });
  msgBlocos(blocos.feitas === 1 ? '👀 Conte com calma: tem bloco escondido embaixo dos outros?' : '');
  tocar([[523, 0.07], [659, 0.09]]);
  const caixa = $('blocos-respostas');
  caixa.innerHTML = '';
  r.opcoes.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'blocos-opcao';
    b.dataset.tecla = i + 1;
    b.style.animationDelay = `${i * 70}ms`;
    b.textContent = o.n;
    b.setAttribute('aria-label', `${o.n} blocos`);
    b.onclick = () => responderBlocos(o, b);
    caixa.append(b);
  });
}

function responderBlocos(opcao, botao) {
  const r = blocos && blocos.rodada;
  if (!r || r.respondida || !blocos.rodando) return;
  r.respondida = true;
  const tempo = (performance.now() - r.t0) / 1000;
  const botoes = [...document.querySelectorAll('#blocos-respostas .blocos-opcao')];
  botoes.forEach((b) => { b.disabled = true; });
  const tipo = TIPOS_BL[r.n - 1];
  const certo = total(r.h);
  const camadas = porCamada(r.h);
  const conta = camadas.length > 1 ? ` (${camadas.map((c, z) => `${z ? '' : 'embaixo '}${c}`).join(' + ')} = ${certo})` : '';
  // raio-x: os blocos ficam transparentes para mostrar os escondidos
  $('blocos-figura').innerHTML = construcaoSVG(r.h, { cores: r.cores, transparente: true });
  if (opcao.certa) {
    const rapidez = Math.max(0, 1 - tempo / 20);
    blocos.pontos += 10 * r.n + Math.round(rapidez * 10);
    blocos.acertos++;
    botao.classList.add('certa');
    resultados.push({ m: tipo, certa: `${certo} blocos${conta}`, erros: [], nivel: r.n, tempo });
    blocos.nivel = Math.min(BLOCOS.NIVEL_MAX, blocos.nivel + 1);
    blocos.nivelMax = Math.max(blocos.nivelMax, blocos.nivel);
    msgBlocos(`✅ Isso! São ${certo} blocos${conta}.`, 'ok');
    SOM.certo();
  } else {
    const motivo = opcao.motivo;
    if (motivo.includes('escondidos')) blocos.escondidos++; else if (motivo.includes('de cima')) blocos.soTopo++; else blocos.umOuDois++;
    botao.classList.add('errada');
    const certoEl = botoes[r.opcoes.findIndex((o) => o.certa)];
    if (certoEl) certoEl.classList.add('certa');
    botoes.forEach((b) => { if (b !== botao && b !== certoEl) b.classList.add('apagada'); });
    resultados.push({ m: tipo, certa: `${certo} blocos${conta}`, erros: [`respondeu ${opcao.n} (${motivo})`], nivel: r.n, tempo });
    blocos.nivel = Math.max(1, blocos.nivel - 1);
    const dica = motivo.includes('escondidos') ? 'Tem blocos escondidos! Todo bloco de cima está apoiado em outro embaixo.'
      : motivo.includes('de cima') ? 'Você contou só as pilhas. Conte também os blocos que estão embaixo.'
        : 'Conte camada por camada, começando pela de baixo.';
    msgBlocos(`Quase! Eram ${certo} blocos${conta}. ${dica}`, 'erro');
    SOM.errado();
  }
  hudBlocos();
  depoisBlocos(BLOCOS.PAUSA + (opcao.certa ? 0 : 1800), proximaBlocos);
}

function terminarBlocos() {
  const { acertos, feitas, pontos, nivelMax, escondidos, soTopo, umOuDois } = blocos;
  pararBlocos();
  missao.resumo = [
    `Acertou ${acertos} de ${feitas} construções e chegou ao nível ${nivelMax} de ${BLOCOS.NIVEL_MAX}.`,
    escondidos + soTopo + umOuDois
      ? `Esqueceu os blocos escondidos: ${escondidos}. Contou só as pilhas (os de cima): ${soTopo}. Errou a contagem por pouco: ${umOuDois}.`
      : 'Não errou nenhuma contagem.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Olho de engenheiro! 🏗️' : 'Fim da contagem de blocos!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitas} construções e fez ${pontos} pontos!`;
}

// teclas 1 a 4 escolhem a resposta no computador
document.addEventListener('keydown', (e) => {
  if (!blocos || !$('tela-blocos').classList.contains('ativa')) return;
  const b = document.querySelector(`#blocos-respostas .blocos-opcao[data-tecla="${e.key}"]`);
  if (b && !b.disabled) b.click();
});

// capa do cartão: uma construção parecida com a da folha
{
  const h = [[3, 2, 1], [2, 1, 1], [1, 1, 0]];
  const cores = {};
  h.forEach((l, x) => l.forEach((a, y) => { for (let z = 0; z < a; z++) cores[`${x},${y},${z}`] = (x * 2 + y + z * 3) % CORES_BL.length; }));
  $('blocos-capa').innerHTML = construcaoSVG(h, { cores });
}

$('btn-blocos').onclick = () => { SOM.clique(); escolherProfessorE('Conte os Blocos', telaBlocosMenu); };
$('blocos-voltar').onclick = telaJogos;
$('btn-blocos-comecar').onclick = () => { SOM.clique(); comecarBlocos(); };
$('blocos-sair').onclick = telaBlocosMenu;

export { BLOCOS, comecarBlocos, pararBlocos, telaBlocosMenu };
