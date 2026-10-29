/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Quebra-Cabeça de Pixels. */

import { $, embaralhar, sortear } from './util.js?v=138';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=138';
import { SOM, tocar } from './som.js?v=138';
import { mascote, mostrar, telaJogos } from './telas.js?v=138';
import { escolherProfessorE } from './professor.js?v=138';
import { segundos } from './luzes.js?v=138';
import { fimDaMissao } from './relatorio.js?v=138';

// ---------- Quebra-Cabeça de Pixels ----------
// Percepção visual, análise de partes e todo e orientação no plano (linhas e colunas numeradas). Em cima, o modelo em
// pixels; embaixo, o contorno vazio, com as mesmas linhas e colunas numeradas. As peças (pedaços coloridos do desenho)
// ficam numa faixa com rolagem para os lados: arrastando uma peça para cima, ela sai da faixa e encaixa na grade; uma
// peça da grade pode voltar para a faixa. Com todas no lugar, "Conferir": as peças erradas voltam para a faixa.
// Montou sem erro, o próximo desenho é maior e tem mais peças; com erros, o próximo é mais simples.
const PIXELS = { DESENHOS: 5, NIVEL_MAX: 6 };
const CORES_PX = { B: '#8d5a2b', G: '#5cb85c', K: '#13294b', R: '#e53935', W: '#ffffff', O: '#fb8c00', Y: '#fdd835', M: '#795548', A: '#1e88e5' };
// desenhos originais, do mais simples ao mais difícil (letra = cor; ponto = vazio); peças de "min" a "max" quadradinhos
const DESENHOS_PX = [
  { nome: 'Tartaruga', a: 'a', min: 3, max: 5, linhas: [
    '...BBB...GG',
    '..BBBBB..GK',
    '.BBBBBBBGGG',
    'GBBBBBBBBG.',
    '..G...G....'] },
  { nome: 'Coração', a: 'o', min: 4, max: 6, linhas: [
    '.RR...RR.',
    'RWRR.RRRR',
    'RRRRRRRRR',
    'RRRRRRRRR',
    '.RRRRRRR.',
    '..RRRRR..',
    '...RRR...',
    '....R....'] },
  { nome: 'Peixe', a: 'o', min: 4, max: 6, linhas: [
    '....OOO.....',
    '...OOOOO...O',
    '..OOOOOOO.OO',
    '.OKOOOOOOOOO',
    '.OOOOOOOOOOO',
    '..OOOOOOO.OO',
    '...OOOOO...O',
    '....OOO.....'] },
  { nome: 'Casa', a: 'a', min: 5, max: 7, linhas: [
    '.....R.....',
    '....RRR....',
    '...RRRRR...',
    '..RRRRRRR..',
    '.RRRRRRRRR.',
    '.YYYYYYYYY.',
    '.YAAYYYAAY.',
    '.YAAYYYAAY.',
    '.YYYYMMYYY.',
    '.YYYYMMYYY.'] },
  { nome: 'Carinha feliz', a: 'a', min: 5, max: 7, linhas: [
    '...YYYYY...',
    '..YYYYYYY..',
    '.YYKYYYKYY.',
    'YYYKYYYKYYY',
    'YYYYYYYYYYY',
    'YKYYYYYYYKY',
    'YYKYYYYYKYY',
    '.YYKKKKKYY.',
    '..YYYYYYY..',
    '...YYYYY...'] },
  { nome: 'Foguete', a: 'o', min: 5, max: 8, linhas: [
    '....R....',
    '...RRR...',
    '...WWW...',
    '..WWWWW..',
    '..WAAAW..',
    '..WAAAW..',
    '..WWWWW..',
    '..WWWWW..',
    '.RWWWWWR.',
    'RRWWWWWRR',
    'R.WWWWW.R',
    '...OYO...',
    '....O....'] },
];
const TIPOS_PX = {
  pequeno: { id: 'px-peq', titulo: 'Desenhos pequenos', icone: '🧩', cor: '#5cb85c',
    regra: 'Comparar a peça com o modelo usando os números das linhas e colunas: em que linha e coluna fica cada cor.' },
  grande: { id: 'px-gde', titulo: 'Desenhos grandes', icone: '🖼️', cor: '#1e88e5',
    regra: 'Desenhos grandes: começar pelas peças com detalhes (olhos, janelas) e pelas bordas, e conferir a posição pelos números.' },
};
let px = null;   // a partida em andamento

// corta o desenho em peças: cada peça cresce a partir de um quadradinho, pelos vizinhos, até ter de "min" a "max";
// sobras pequenas grudam numa peça vizinha
function cortar(des) {
  const H = des.linhas.length, W = des.linhas[0].length;
  const cheio = (r, c) => r >= 0 && c >= 0 && r < H && c < W && des.linhas[r][c] !== '.';
  const dono = des.linhas.map((l) => [...l].map(() => -1));
  const pecas = [];
  const viz = (r, c) => [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => cheio(a, b));
  const celulas = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (cheio(r, c)) celulas.push([r, c]);
  for (const [r0, c0] of embaralhar(celulas)) {
    if (dono[r0][c0] >= 0) continue;
    const alvo = des.min + Math.floor(Math.random() * (des.max - des.min + 1));
    const p = [[r0, c0]];
    dono[r0][c0] = pecas.length;
    while (p.length < alvo) {
      const borda = p.flatMap(([r, c]) => viz(r, c)).filter(([r, c]) => dono[r][c] < 0);
      if (!borda.length) break;
      const [r, c] = sortear(borda);
      dono[r][c] = pecas.length;
      p.push([r, c]);
    }
    pecas.push(p);
  }
  // peças muito pequenas (1 ou 2 quadradinhos) entram numa vizinha
  for (let i = 0; i < pecas.length; i++) {
    if (pecas[i].length > 2) continue;
    const vizinha = pecas[i].flatMap(([r, c]) => viz(r, c)).map(([r, c]) => dono[r][c]).find((d) => d !== i && pecas[d].length);
    if (vizinha === undefined) continue;
    pecas[i].forEach(([r, c]) => { dono[r][c] = vizinha; pecas[vizinha].push([r, c]); });
    pecas[i] = [];
  }
  return pecas.filter((p) => p.length).map((p, id) => {
    const r0 = Math.min(...p.map(([r]) => r)), c0 = Math.min(...p.map(([, c]) => c));
    const cel = p.map(([r, c]) => [r - r0, c - c0, des.linhas[r][c]]);
    return { id, cel, h: Math.max(...cel.map(([r]) => r)) + 1, w: Math.max(...cel.map(([, c]) => c)) + 1, pos: null };
  });
}

// ---------- telas ----------
function telaPixelsMenu() { pararPixels(); mascote('davi-pixels', 'oi'); mostrar('tela-pixels-menu'); }

function comecarPixels() {
  pararPixels();
  definirMissao({ id: 'pixels', pixels: true, icone: '🧩', cor: '#5cb85c', titulo: 'Quebra-Cabeça de Pixels (partes e todo)' });
  definirResultados([]);
  px = { nivel: 1, nivelMax: 1, pontos: 0, feitos: 0, primeira: 0, rodando: true, erradas: 0, timers: [] };
  mostrar('tela-pixels');
  novoDesenho();
}
function pararPixels() {
  if (px) { px.rodando = false; px.timers.forEach(clearTimeout); clearInterval(px.relogio); }
  px = null;
  soltarArrasto();
}
const msg = (texto, tipo = '') => { $('pixels-msg').innerHTML = texto; $('pixels-msg').className = `pixels-msg ${tipo}`; };

function novoDesenho() {
  const p = px;
  if (!p || !p.rodando) return;
  if (p.feitos >= PIXELS.DESENHOS) { terminar(); return; }
  p.feitos++;
  const des = DESENHOS_PX[p.nivel - 1];
  Object.assign(p, { des, H: des.linhas.length, W: des.linhas[0].length, pecas: embaralhar(cortar(des)), errosDesenho: 0, conferindo: false, t0: performance.now() });
  $('pixels-nivel').textContent = `🧩 Nível ${p.nivel} de ${PIXELS.NIVEL_MAX}`;
  $('pixels-pontos').textContent = p.pontos;
  $('pixels-contador').textContent = `Desenho ${p.feitos} de ${PIXELS.DESENHOS} · ${des.nome} · ${p.pecas.length} peças`;
  msg('Arraste as peças para cima e monte o desenho igual ao modelo. 🧩');
  $('btn-pixels-conferir').disabled = true;
  desenharTudo();
  clearInterval(p.relogio);
  p.relogio = setInterval(() => { if (px && !px.conferindo) $('pixels-tempo').textContent = `⏱ ${segundos((performance.now() - px.t0) / 1000)}`; }, 250);
}

// tamanho do quadradinho: o maior que cabe no espaço do tabuleiro (com a coluna e a linha dos números)
function medir() {
  const p = px, area = $('pixels-area');
  const lado = Math.floor(Math.min((area.clientWidth - 4) / (p.W + 1), (area.clientHeight - 4) / (p.H + 1)));
  p.cel = Math.max(12, Math.min(34, lado));
  document.documentElement.style.setProperty('--px-cel', `${p.cel}px`);
}

// grade numerada (modelo ou tabuleiro): a primeira linha e a primeira coluna têm os números
function gradeHTML(cores, classe) {
  const p = px;
  let h = `<div class="px-grade ${classe}" style="grid-template-columns: repeat(${p.W + 1}, var(--c)); grid-template-rows: repeat(${p.H + 1}, var(--c))">`;
  h += '<span class="px-num"></span>';
  for (let c = 0; c < p.W; c++) h += `<span class="px-num">${c + 1}</span>`;
  for (let r = 0; r < p.H; r++) {
    h += `<span class="px-num">${r + 1}</span>`;
    for (let c = 0; c < p.W; c++) {
      const k = p.des.linhas[r][c];
      h += k === '.' ? '<span class="px-vazio"></span>' : `<span class="px-cel" style="--cor:${cores ? CORES_PX[k] : '#fff'}"></span>`;
    }
  }
  return `${h}</div>`;
}
const pecaHTML = (pc) => `<div class="px-peca" data-id="${pc.id}" style="grid-template-columns: repeat(${pc.w}, var(--px-cel)); grid-template-rows: repeat(${pc.h}, var(--px-cel))">${pc.cel.map(([r, c, k]) => `<span class="px-cel" style="grid-row:${r + 1};grid-column:${c + 1};--cor:${CORES_PX[k]}"></span>`).join('')}</div>`;

function desenharTudo() {
  const p = px;
  $('pixels-modelo').innerHTML = gradeHTML(true, 'px-modelo-grade');
  medir();
  $('pixels-tabuleiro').innerHTML = gradeHTML(false, 'px-tabuleiro-grade') + '<div class="px-colocadas" id="px-colocadas"></div>';
  desenharPecas();
}
function desenharPecas() {
  const p = px;
  $('px-colocadas').innerHTML = p.pecas.filter((pc) => pc.pos).map((pc) => {
    const [r, c] = pc.pos;
    return `<div class="px-no-lugar" style="top: calc(${r + 1} * var(--px-cel)); left: calc(${c + 1} * var(--px-cel))">${pecaHTML(pc)}</div>`;
  }).join('');
  const naFaixa = p.pecas.filter((pc) => !pc.pos);
  $('pixels-faixa').innerHTML = naFaixa.map(pecaHTML).join('') || '<p class="px-faixa-vazia">Todas as peças estão no desenho. Toque em <b>Conferir</b>!</p>';
  $('btn-pixels-conferir').disabled = naFaixa.length > 0;
}

// ---------- arrastar: da faixa para o tabuleiro e de volta ----------
// na faixa, deslizar para os lados rola a faixa; puxar para cima (ou para baixo) pega a peça
let arrasto = null;
function soltarArrasto() {
  if (!arrasto) return;
  arrasto.fantasma?.remove();
  arrasto = null;
}
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('#pixels-faixa .px-peca, #px-colocadas .px-peca');
  if (!el || !px || px.conferindo) return;
  const pc = px.pecas.find((x) => x.id === Number(el.dataset.id));
  const caixa = el.getBoundingClientRect();
  // o quadradinho da peça que ficou embaixo do dedo
  const gr = Math.floor((e.clientY - caixa.top) / px.cel), gc = Math.floor((e.clientX - caixa.left) / px.cel);
  arrasto = { pc, el, gr, gc, x0: e.clientX, y0: e.clientY, daFaixa: !pc.pos, ativo: false, id: e.pointerId };
  if (!arrasto.daFaixa) comecarArrasto(e);
});
function comecarArrasto(e) {
  const a = arrasto;
  a.ativo = true;
  a.fantasma = document.createElement('div');
  a.fantasma.className = 'px-fantasma';
  a.fantasma.innerHTML = pecaHTML(a.pc);
  document.body.append(a.fantasma);
  a.el.classList.add('px-pegando');
  moverFantasma(e);
  tocar([[523, 0.04]]);
}
const moverFantasma = (e) => { arrasto.fantasma.style.transform = `translate(${e.clientX - (arrasto.gc + 0.5) * px.cel}px, ${e.clientY - (arrasto.gr + 0.5) * px.cel}px) scale(1.06)`; };
document.addEventListener('pointermove', (e) => {
  const a = arrasto;
  if (!a || e.pointerId !== a.id) return;
  if (!a.ativo) {
    const dx = Math.abs(e.clientX - a.x0), dy = Math.abs(e.clientY - a.y0);
    if (dx > 10 && dx > dy) { soltarArrasto(); return; }   // deslizou para o lado: é rolagem da faixa
    if (dy > 8) comecarArrasto(e); else return;
  }
  e.preventDefault();
  moverFantasma(e);
}, { passive: false });
document.addEventListener('pointerup', (e) => {
  const a = arrasto;
  if (!a || e.pointerId !== a.id) return;
  if (!a.ativo) { soltarArrasto(); return; }
  const p = px, pc = a.pc;
  // onde a peça cai: o quadradinho do tabuleiro embaixo do dedo, descontando o pedaço da peça que estava sob o dedo
  const grade = $('pixels-tabuleiro').getBoundingClientRect();
  const r = Math.floor((e.clientY - grade.top) / p.cel) - 1 - a.gr, c = Math.floor((e.clientX - grade.left) / p.cel) - 1 - a.gc;
  const dentro = e.clientY >= grade.top && e.clientY <= grade.bottom && e.clientX >= grade.left && e.clientX <= grade.right;
  pc.pos = null;
  if (dentro && cabe(pc, r, c)) { pc.pos = [r, c]; tocar([[523, 0.04], [659, 0.06]]); }
  else if (dentro) { msg('A peça não cabe aí: ela precisa ficar dentro do contorno, sem cobrir outra peça. 🧩', 'erro'); tocar([[220, 0.08]]); }
  soltarArrasto();
  desenharPecas();
});
document.addEventListener('pointercancel', soltarArrasto);

// cabe: todos os quadradinhos dentro do contorno e sem cobrir outra peça
function cabe(pc, r, c) {
  const ocupado = new Set();
  px.pecas.forEach((o) => { if (o.pos && o !== pc) o.cel.forEach(([a, b]) => ocupado.add(`${o.pos[0] + a},${o.pos[1] + b}`)); });
  return pc.cel.every(([a, b]) => {
    const rr = r + a, cc = c + b;
    return rr >= 0 && cc >= 0 && rr < px.H && cc < px.W && px.des.linhas[rr][cc] !== '.' && !ocupado.has(`${rr},${cc}`);
  });
}

// ---------- conferir: as cores de cada peça batem com o modelo? as erradas voltam para a faixa ----------
$('btn-pixels-conferir').onclick = () => {
  const p = px;
  if (!p || p.conferindo || p.pecas.some((pc) => !pc.pos)) return;
  const erradas = p.pecas.filter((pc) => pc.cel.some(([a, b, k]) => p.des.linhas[pc.pos[0] + a][pc.pos[1] + b] !== k));
  if (erradas.length) {
    p.errosDesenho += erradas.length;
    p.erradas += erradas.length;
    SOM.errado();
    document.querySelectorAll('#px-colocadas .px-peca').forEach((el) => { if (erradas.some((pc) => pc.id === Number(el.dataset.id))) el.classList.add('px-errada'); });
    msg(`${erradas.length} ${erradas.length === 1 ? 'peça está no lugar errado e vai' : 'peças estão no lugar errado e vão'} voltar para a faixa. Compare com o modelo pelos números! 🔢`, 'erro');
    p.conferindo = true;
    p.timers.push(setTimeout(() => {
      if (px !== p) return;
      erradas.forEach((pc) => { pc.pos = null; });
      p.conferindo = false;
      desenharPecas();
    }, 1600));
    return;
  }
  // montou certo
  p.conferindo = true;
  clearInterval(p.relogio);
  const tempo = (performance.now() - p.t0) / 1000;
  const n = p.pecas.length;
  const ganho = Math.max(20, 20 * n - 15 * p.errosDesenho + Math.max(0, Math.round(80 - tempo)));
  p.pontos += ganho;
  if (!p.errosDesenho) p.primeira++;
  resultados.push({ m: p.nivel <= 3 ? TIPOS_PX.pequeno : TIPOS_PX.grande, certa: `${p.des.nome} (${n} peças)`,
    erros: p.errosDesenho ? [`${p.errosDesenho} ${p.errosDesenho === 1 ? 'peça posta no lugar errado' : 'peças postas no lugar errado'}`] : [], nivel: p.nivel, tempo });
  SOM.certo();
  $('pixels-tabuleiro').classList.add('px-pronto');
  msg(`✅ ${p.des.nome} montad${p.des.a}! +${ganho} pontos em ${segundos(tempo)}`, 'ok');
  if (!p.errosDesenho) p.nivel = Math.min(PIXELS.NIVEL_MAX, p.nivel + 1);
  else if (p.errosDesenho >= 3) p.nivel = Math.max(1, p.nivel - 1);
  p.nivelMax = Math.max(p.nivelMax, p.nivel);
  $('pixels-pontos').textContent = p.pontos;
  p.timers.push(setTimeout(() => { if (px !== p) return; $('pixels-tabuleiro').classList.remove('px-pronto'); novoDesenho(); }, 2200));
};

window.addEventListener('resize', () => { if (px && $('tela-pixels').classList.contains('ativa')) { medir(); } });

function terminar() {
  const p = px;
  pararPixels();
  const tempos = resultados.map((x) => x.tempo);
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${p.pontos}. Chegou ao nível ${p.nivelMax} de ${PIXELS.NIVEL_MAX} (${DESENHOS_PX[p.nivelMax - 1].nome.toLowerCase()}).`,
    `Montou ${p.feitos} desenhos; ${p.primeira} sem nenhuma peça no lugar errado.`,
    p.erradas ? `Peças postas no lugar errado (e corrigidas): ${p.erradas}.` : 'Não colocou nenhuma peça no lugar errado!',
    `Tempo médio para montar cada desenho: ${segundos(tempos.reduce((s, t) => s + t, 0) / tempos.length)}.`,
  ];
  fimDaMissao();
  $('fim-titulo').textContent = p.primeira === p.feitos ? 'Mestre dos pixels! 🧩' : 'Fim do Quebra-Cabeça!';
  $('fim-texto').textContent = `${aluno}, você montou ${p.feitos} desenhos e fez ${p.pontos} pontos!`;
}

$('btn-pixels').onclick = () => { SOM.clique(); escolherProfessorE('Quebra-Cabeça de Pixels', telaPixelsMenu); };
$('pixels-voltar').onclick = telaJogos;
$('btn-pixels-comecar').onclick = () => { SOM.clique(); comecarPixels(); };
$('pixels-sair').onclick = telaPixelsMenu;

export { comecarPixels, PIXELS, pararPixels, telaPixelsMenu };
