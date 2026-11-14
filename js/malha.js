/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Caminho na Malha. */

import { $, sortear } from './util.js?v=277';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=277';
import { frase, pararVoz, SOM, tocar } from './som.js?v=277';
import { mascote, mostrar, telaJogos } from './telas.js?v=277';
import { escolherProfessorE } from './professor.js?v=277';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=277';

// ---------- Caminho na Malha ----------
// Orientação espacial e coordenadas: uma malha com colunas em letras (A, B, C...) e linhas numeradas de baixo para
// cima; o boneco parte da casa S e a ordem manda andar ("4 casas para a direita, depois 3 para cima"). A criança
// toca na casa onde acha que ele parou. Depois de responder, o boneco anda o caminho certo, passo a passo, deixando o
// rastro na malha (quem errou vê onde se perdeu).
// Níveis: 1 e 2 movimentos diretos; ida e volta (direita e depois esquerda); caminhos longos; e por fim as quantidades
// viram contas ("ande 2 × 2 casas", "ande 9 ÷ 3 casas"). Acertou: sobe um nível; errou: desce.
// O toque errado é comparado com os erros comuns (trocar esquerda e direita, trocar cima e baixo, contar a casa de
// saída como passo, contar uma casa a mais, ler as linhas de cima para baixo, errar a conta, parar no meio do caminho).
const MALHA = { RODADAS: 10, NIVEL_MAX: 6, PASSO_MS: 280, PAUSA: 2400 };
const NIVEIS_MA = [
  { col: 5, lin: 5, mov: [1, 1], passo: [1, 3], titulo: 'Um movimento' },
  { col: 5, lin: 5, mov: [2, 2], passo: [1, 3], titulo: 'Dois movimentos' },
  { col: 6, lin: 6, mov: [3, 3], passo: [1, 3], volta: true, titulo: 'Ida e volta' },
  { col: 6, lin: 6, mov: [3, 4], passo: [1, 4], volta: true, titulo: 'Caminho longo' },
  { col: 7, lin: 7, mov: [2, 3], passo: [1, 5], conta: 'soma', titulo: 'Com contas de mais e de menos' },
  { col: 8, lin: 8, mov: [2, 3], passo: [1, 6], conta: 'vezes', volta: true, titulo: 'Com contas de vezes e de dividir' },
];
const TIPOS_MA = NIVEIS_MA.map((n, i) => ({
  id: `malha${i + 1}`, titulo: `Nível ${i + 1}: ${n.titulo}`, icone: '🧭', cor: '#1e88e5',
  regra: n.conta
    ? 'Primeiro resolver a conta para saber quantas casas andar; depois andar casa por casa, sem contar a casa de onde saiu.'
    : 'Andar casa por casa na direção pedida (direita, esquerda, cima, baixo), sem contar a casa de onde saiu.',
}));
const DIRECOES = {
  dir: { seta: '➡️', nome: 'para a direita', dc: 1, dl: 0, oposta: 'esq' },
  esq: { seta: '⬅️', nome: 'para a esquerda', dc: -1, dl: 0, oposta: 'dir' },
  cima: { seta: '⬆️', nome: 'para cima', dc: 0, dl: 1, oposta: 'baixo' },
  baixo: { seta: '⬇️', nome: 'para baixo', dc: 0, dl: -1, oposta: 'cima' },
};
const LETRAS = 'ABCDEFGH';
const nomeCasa = ({ c, l }) => `${LETRAS[c]}${l}`;
const entre = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
let malha = null;   // a partida em andamento

// a quantidade de casas escrita como conta (níveis 5 e 6); "ingenua" é o resultado de quem erra a conta do jeito comum
function contaPara(n, tipo) {
  if (tipo === 'soma') {
    if (n >= 2 && Math.random() < 0.55) { const a = entre([1, n - 1]); return { texto: `${a} + ${n - a}`, fala: `${a} mais ${n - a}`, ingenua: Math.abs(a - (n - a)) }; }
    const b = entre([1, 3]);
    return { texto: `${n + b} − ${b}`, fala: `${n + b} menos ${b}`, ingenua: n + 2 * b };
  }
  const pares = [];
  for (let a = 2; a <= n; a++) if (n % a === 0 && n / a >= 2) pares.push([a, n / a]);
  if (pares.length && Math.random() < 0.5) { const [a, b] = sortear(pares); return { texto: `${a} × ${b}`, fala: `${a} vezes ${b}`, ingenua: a + b }; }
  const b = entre([2, 3]);
  return { texto: `${n * b} ÷ ${b}`, fala: `${n * b} dividido por ${b}`, ingenua: n * b - b };
}

// o caminho: casa de saída e os movimentos, sempre dentro da malha (inclusive no meio do caminho)
function novoCaminho(nivel) {
  const cfg = NIVEIS_MA[nivel - 1];
  const dentro = ({ c, l }) => c >= 0 && c < cfg.col && l >= 1 && l <= cfg.lin;
  for (let t = 0; t < 300; t++) {
    const inicio = { c: entre([0, cfg.col - 1]), l: entre([1, cfg.lin]) };
    const qtos = entre(cfg.mov);
    const movs = [];
    let pos = { ...inicio }, ok = true, temVolta = false;
    for (let k = 0; k < qtos && ok; k++) {
      const ant = movs[k - 1];
      // não repete a direção anterior; no "ida e volta", às vezes volta pela direção oposta
      let opcoes = Object.keys(DIRECOES).filter((d) => !ant || d !== ant.dir);
      if (ant && cfg.volta && !temVolta && Math.random() < 0.6) opcoes = [DIRECOES[ant.dir].oposta];
      const dir = sortear(opcoes), d = DIRECOES[dir];
      // o maior passo que cabe nessa direção
      const cabe = d.dc > 0 ? cfg.col - 1 - pos.c : d.dc < 0 ? pos.c : d.dl > 0 ? cfg.lin - pos.l : pos.l - 1;
      const max = Math.min(cfg.passo[1], cabe);
      if (max < cfg.passo[0]) { ok = false; break; }
      const n = entre([cfg.passo[0], max]);
      if (ant && dir === DIRECOES[ant.dir].oposta) temVolta = true;
      movs.push({ dir, n, conta: cfg.conta ? contaPara(n, cfg.conta) : null });
      pos = { c: pos.c + d.dc * n, l: pos.l + d.dl * n };
    }
    if (!ok || movs.length < qtos || (pos.c === inicio.c && pos.l === inicio.l)) continue;
    if (cfg.volta && qtos >= 3 && !temVolta) continue;
    if (!dentro(pos)) continue;
    return { cfg, inicio, movs, fim: pos };
  }
  return { cfg, inicio: { c: 0, l: 1 }, movs: [{ dir: 'dir', n: 2, conta: null }], fim: { c: 2, l: 1 } };
}

// anda os movimentos (sem limite de malha), mudando o jeito de ler cada um para imitar um erro
function andar(inicio, movs, { trocaLado = false, trocaAltura = false, ajuste = 0, contaErrada = false } = {}) {
  let pos = { ...inicio };
  movs.forEach((m) => {
    let dir = m.dir;
    if (trocaLado && (dir === 'dir' || dir === 'esq')) dir = DIRECOES[dir].oposta;
    if (trocaAltura && (dir === 'cima' || dir === 'baixo')) dir = DIRECOES[dir].oposta;
    const n = (contaErrada && m.conta ? m.conta.ingenua : m.n) + ajuste;
    pos = { c: pos.c + DIRECOES[dir].dc * n, l: pos.l + DIRECOES[dir].dl * n };
  });
  return pos;
}
// as casas do caminho certo, uma por passo (para o boneco andar e para o rastro)
function casasDoCaminho(inicio, movs) {
  const casas = [{ ...inicio }];
  movs.forEach((m) => {
    const d = DIRECOES[m.dir];
    for (let k = 0; k < m.n; k++) { const p = casas[casas.length - 1]; casas.push({ c: p.c + d.dc, l: p.l + d.dl }); }
  });
  return casas;
}

// por que a criança tocou naquela casa (o primeiro erro comum que leva até ela)
function motivoDoErro(r, toque) {
  const igual = (p) => p.c === toque.c && p.l === toque.l;
  const fim = r.fim;
  const candidatos = [
    [andar(r.inicio, r.movs, { trocaLado: true }), 'trocou esquerda e direita', 'lado'],
    [andar(r.inicio, r.movs, { trocaAltura: true }), 'trocou cima e baixo', 'lado'],
    [andar(r.inicio, r.movs, { ajuste: -1 }), 'contou a casa de onde saiu como passo (andou uma a menos)', 'contagem'],
    [andar(r.inicio, r.movs, { ajuste: 1 }), 'andou uma casa a mais em cada movimento', 'contagem'],
    [{ c: fim.c, l: r.cfg.lin + 1 - fim.l }, 'contou as linhas de cima para baixo', 'linha'],
    [{ c: fim.c, l: r.inicio.l },'andou só para os lados (esqueceu o cima ou baixo)', 'parou'],
  ];
  if (r.movs.some((m) => m.conta)) candidatos.splice(0, 0, [andar(r.inicio, r.movs, { contaErrada: true }), 'errou a conta', 'conta']);
  const achou = candidatos.find(([p]) => !(p.c === fim.c && p.l === fim.l) && igual(p));
  if (achou) return { texto: achou[1], grupo: achou[2] };
  if (r.casas.some(igual)) return { texto: 'parou no meio do caminho', grupo: 'parou' };
  if (igual(r.inicio)) return { texto: 'tocou na casa de saída', grupo: 'parou' };
  return { texto: 'foi para outra casa', grupo: 'outro' };
}

// textos da ordem: na tela (com setas) e falado
const qtd = (m) => (m.conta ? m.conta.texto : m.n);
const casasTxt = (m) => (m.conta || m.n !== 1 ? 'casas' : 'casa');
function ordemHTML(r) {
  return `<li class="malha-saida">Parta da casa <b class="malha-s">S</b> (${nomeCasa(r.inicio)}).</li>`
    // sem setas na ordem: a criança tem de entender "direita", "esquerda", "cima" e "baixo" pela palavra (a seta entregava a direção)
    + r.movs.map((m, i) => `<li style="--i:${i}"><span>${i ? 'Depois ande' : 'Ande'} <b class="${m.conta ? 'malha-conta' : 'malha-num'}">${qtd(m)}</b> ${casasTxt(m)} <b>${DIRECOES[m.dir].nome}</b>.</span></li>`).join('');
}
function ordemFalada(r) {
  return `Parta da casa S. ${r.movs.map((m, i) => `${i ? 'Depois ande' : 'Ande'} ${m.conta ? m.conta.fala : m.n} ${casasTxt(m)} ${DIRECOES[m.dir].nome}.`).join(' ')} Onde o boneco vai parar?`;
}

function telaMalhaMenu() {
  pararMalha();
  mascote('davi-malha', 'oi');
  mostrar('tela-malha-menu');
}

function comecarMalha() {
  pararMalha();
  definirMissao({ id: 'malha', malha: true, icone: '🧭', cor: '#1e88e5', titulo: 'Caminho na Malha' });
  definirResultados([]);
  malha = { nivel: 1, nivelMax: 1, feitas: 0, acertos: 0, pontos: 0, erros: { lado: 0, contagem: 0, linha: 0, conta: 0, parou: 0, outro: 0 },
    rodada: null, timers: [], rodando: true };
  mostrar('tela-malha');
  proximaMalha();
}

function pararMalha() {
  if (malha) { malha.rodando = false; malha.timers.forEach(clearTimeout); pararVoz(); }
  malha = null;
}
const depoisMalha = (ms, fn) => { const p = malha; const t = setTimeout(() => { if (malha === p && p.rodando) fn(); }, ms); p.timers.push(t); };
const msgMalha = (texto, tipo = '') => { $('malha-msg').innerHTML = texto; $('malha-msg').className = `cores-msg ${tipo}`; };
const falarOrdem = () => { if (malha && malha.rodada) frase('', ordemFalada(malha.rodada)); };

function hudMalha() {
  $('malha-nivel').textContent = `🧭 Nível ${malha.nivel}`;
  $('malha-pontos').textContent = malha.pontos;
  $('malha-contador').textContent = `${malha.feitas}/${MALHA.RODADAS}`;
}

// posição (em %) do centro de uma casa dentro da área das casas
const posCasa = (cfg, { c, l }) => ({ x: ((c + 0.5) / cfg.col) * 100, y: ((cfg.lin - l + 0.5) / cfg.lin) * 100 });
function colocarBoneco(cfg, casa) {
  const { x, y } = posCasa(cfg, casa);
  const b = $('malha-boneco');
  b.style.left = `${x}%`;
  b.style.top = `${y}%`;
}

function montarMalha(r) {
  const { cfg } = r;
  const casas = $('malha-casas');
  casas.style.setProperty('--col', cfg.col);
  casas.style.setProperty('--lin', cfg.lin);
  $('malha-linhas').style.setProperty('--lin', cfg.lin);
  $('malha-colunas').style.setProperty('--col', cfg.col);
  $('malha-linhas').innerHTML = Array.from({ length: cfg.lin }, (_, i) => `<span>${cfg.lin - i}</span>`).join('');
  $('malha-colunas').innerHTML = Array.from({ length: cfg.col }, (_, i) => `<span>${LETRAS[i]}</span>`).join('');
  const botoes = [];
  for (let l = cfg.lin; l >= 1; l--) {
    for (let c = 0; c < cfg.col; c++) {
      const s = c === r.inicio.c && l === r.inicio.l;
      botoes.push(`<button type="button" class="malha-casa${s ? ' saida' : ''}" data-c="${c}" data-l="${l}" aria-label="Casa ${LETRAS[c]}${l}${s ? ', saída' : ''}">${s ? 'S' : ''}</button>`);
    }
  }
  casas.innerHTML = `${botoes.join('')}<svg class="malha-rastro" id="malha-rastro" viewBox="0 0 ${cfg.col} ${cfg.lin}" preserveAspectRatio="none" aria-hidden="true"></svg>`
    + '<span class="malha-boneco" id="malha-boneco" aria-hidden="true">🧒</span>';
  colocarBoneco(cfg, r.inicio);
}

function proximaMalha() {
  if (malha.feitas >= MALHA.RODADAS) { terminarMalha(); return; }
  const cam = novoCaminho(malha.nivel);
  malha.feitas++;
  malha.rodada = { ...cam, n: malha.nivel, casas: casasDoCaminho(cam.inicio, cam.movs), respondida: false, t0: performance.now() };
  hudMalha();
  const r = malha.rodada;
  montarMalha(r);
  $('malha-ordem').innerHTML = ordemHTML(r);
  msgMalha(malha.feitas === 1 ? '👆 Toque na casa onde o boneco vai parar.' : '');
  tocar([[523, 0.07], [659, 0.09]]);
  depoisMalha(350, falarOrdem);
}

// o boneco anda o caminho certo, casa por casa, e o rastro vai aparecendo
function animarCaminho(r, aoTerminar) {
  const rastro = $('malha-rastro');
  const ponto = ({ c, l }) => `${c + 0.5},${r.cfg.lin - l + 0.5}`;
  let k = 0;
  const passo = () => {
    k++;
    colocarBoneco(r.cfg, r.casas[k]);
    rastro.innerHTML = `<polyline points="${r.casas.slice(0, k + 1).map(ponto).join(' ')}"/>`;
    tocar([[440 + k * 30, 0.04]]);
    if (k < r.casas.length - 1) depoisMalha(MALHA.PASSO_MS, passo); else depoisMalha(300, aoTerminar);
  };
  if (r.casas.length > 1) depoisMalha(200, passo); else aoTerminar();
}

function responderMalha(botao) {
  const r = malha && malha.rodada;
  if (!r || r.respondida || !malha.rodando) return;
  r.respondida = true;
  const toque = { c: Number(botao.dataset.c), l: Number(botao.dataset.l) };
  const tempo = (performance.now() - r.t0) / 1000;
  document.querySelectorAll('#malha-casas .malha-casa').forEach((b) => { b.disabled = true; });
  const tipo = TIPOS_MA[r.n - 1];
  const caminho = `${nomeCasa(r.fim)} (saiu de ${nomeCasa(r.inicio)}: ${r.movs.map((m) => `${qtd(m)} ${DIRECOES[m.dir].seta}`).join(', ')})`;
  const certa = toque.c === r.fim.c && toque.l === r.fim.l;
  botao.classList.add(certa ? 'tocada-certa' : 'tocada-errada');
  pararVoz();
  if (certa) {
    const rapidez = Math.max(0, 1 - tempo / 30);
    malha.pontos += 10 * r.n + Math.round(rapidez * 10);
    malha.acertos++;
    resultados.push({ m: tipo, certa: caminho, erros: [], nivel: r.n, tempo });
    malha.nivel = Math.min(MALHA.NIVEL_MAX, malha.nivel + 1);
    malha.nivelMax = Math.max(malha.nivelMax, malha.nivel);
    msgMalha(`✅ Isso! O boneco para em <b>${nomeCasa(r.fim)}</b>. Veja o caminho:`, 'ok');
    SOM.certo();
  } else {
    const motivo = motivoDoErro(r, toque);
    malha.erros[motivo.grupo]++;
    resultados.push({ m: tipo, certa: caminho, erros: [`tocou ${nomeCasa(toque)} (${motivo.texto})`], nivel: r.n, tempo });
    malha.nivel = Math.max(1, malha.nivel - 1);
    const dica = motivo.grupo === 'lado' ? 'Lembre: a direita é para o lado das letras que vêm depois (A, B, C...).'
      : motivo.grupo === 'contagem' ? 'Não conte a casa de onde saiu: o primeiro passo já é a casa do lado.'
        : motivo.grupo === 'linha' ? 'As linhas são contadas de baixo para cima: a linha 1 é a de baixo.'
          : motivo.grupo === 'conta' ? 'Resolva a conta primeiro para saber quantas casas andar.'
            : 'Siga cada ordem até o fim, uma de cada vez.';
    msgMalha(`Quase! Você tocou em ${nomeCasa(toque)}, mas o boneco para em <b>${nomeCasa(r.fim)}</b>. ${dica}`, 'erro');
    SOM.errado();
  }
  hudMalha();
  animarCaminho(r, () => {
    document.querySelector(`#malha-casas .malha-casa[data-c="${r.fim.c}"][data-l="${r.fim.l}"]`)?.classList.add('chegada');
    frase('', certa ? `Isso! ${LETRAS[r.fim.c]} ${r.fim.l}!` : `O boneco parou em ${LETRAS[r.fim.c]} ${r.fim.l}.`);
    depoisMalha(MALHA.PAUSA + (certa ? 0 : 1500), proximaMalha);
  });
}

function terminarMalha() {
  const { acertos, feitas, pontos, nivelMax, erros } = malha;
  pararMalha();
  const lista = [['trocou os lados', erros.lado], ['errou a contagem de casas', erros.contagem], ['contou as linhas de cima para baixo', erros.linha],
    ['errou a conta', erros.conta], ['parou antes do fim', erros.parou], ['foi para outra casa', erros.outro]].filter(([, n]) => n);
  missao.resumo = [
    `Acertou ${acertos} de ${feitas} caminhos e chegou ao nível ${nivelMax} de ${MALHA.NIVEL_MAX}.`,
    lista.length ? `Erros: ${lista.map(([t, n]) => `${t}: ${n}`).join('; ')}.` : 'Não errou nenhum caminho.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Bússola na mão! 🧭' : 'Fim dos caminhos!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitas} caminhos e fez ${pontos} pontos!`;
}

$('malha-casas').addEventListener('click', (e) => {
  const b = e.target.closest('.malha-casa');
  if (b && !b.disabled) responderMalha(b);
});

// capa do cartão: uma malha pequena com o S, o rastro e o boneco
{
  const cel = Array.from({ length: 16 }, (_, i) => `<rect x="${(i % 4) * 10}" y="${Math.floor(i / 4) * 10}" width="10" height="10"/>`).join('');
  $('malha-capa').innerHTML = `<svg viewBox="-2 -2 44 44" aria-hidden="true"><g fill="#fff" stroke="#1e88e5" stroke-width="0.8">${cel}</g>`
    + '<text x="5" y="38.4" text-anchor="middle" font-size="7" font-weight="700" fill="#1e88e5" font-family="Fredoka, sans-serif">S</text>'
    + '<polyline points="5,35 25,35 25,15" fill="none" stroke="#f08a24" stroke-width="2" stroke-dasharray="3 2" stroke-linecap="round"/>'
    + '<text x="25" y="18" text-anchor="middle" font-size="9">🧒</text></svg>';
}

$('btn-malha').onclick = () => { SOM.clique(); escolherProfessorE('Caminho na Malha', telaMalhaMenu); };
$('malha-voltar').onclick = telaJogos;
$('btn-malha-comecar').onclick = () => { SOM.clique(); comecarMalha(); };
$('malha-sair').onclick = telaMalhaMenu;
$('malha-ouvir').onclick = falarOrdem;

export { comecarMalha, MALHA, pararMalha, telaMalhaMenu };
