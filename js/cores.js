/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Somando as Cores. */

import { $, embaralhar, sortear } from './util.js?v=101';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=101';
import { SOM, tocar } from './som.js?v=101';
import { mascote, mostrar, telaJogos } from './telas.js?v=101';
import { escolherProfessorE } from './professor.js?v=101';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=101';

// ---------- Somando as Cores ----------
// Coordenadas, atenção e cálculo. Uma tabela de cores (linhas A, B, C... e colunas 1, 2, 3...) e, em cima, as
// bolinhas com o valor de cada cor. A conta usa casas da tabela (A2 + C3): o aluno acha a cor de cada casa, troca
// pelo valor e faz a conta. Acertar sobe um nível, errar desce. Os níveis aumentam a tabela, as cores, os valores,
// o número de casas na conta e trazem a subtração e a multiplicação. As respostas erradas imitam os erros comuns:
// trocar a linha pela coluna (ler A2 como B1) e olhar a casa vizinha. Tocar numa casa da conta acende a linha e a
// coluna dela (dica, contada no relatório).
const CORES = { CONTAS: 15, NIVEL_MAX: 8, PAUSA: 2200 };
const PALETA_CORES = [
  { id: 'verde', nome: 'verde', cor: '#2e7d32' },
  { id: 'vermelho', nome: 'vermelho', cor: '#e53935' },
  { id: 'roxo', nome: 'roxo', cor: '#8e44ad' },
  { id: 'azul', nome: 'azul', cor: '#1e64d2' },
  { id: 'amarelo', nome: 'amarelo', cor: '#fbc02d' },
  { id: 'laranja', nome: 'laranja', cor: '#f57c00' },
];
// lado da tabela, quantas cores, faixa dos valores, casas na conta e operações de cada nível
const NIVEIS_CORES = [
  { lado: 4, cores: 3, min: 1, max: 5, termos: 2, ops: ['+'] },
  { lado: 4, cores: 4, min: 1, max: 9, termos: 2, ops: ['+'] },
  { lado: 4, cores: 4, min: 1, max: 9, termos: 2, ops: ['+', '−'] },
  { lado: 4, cores: 5, min: 2, max: 12, termos: 3, ops: ['+'] },
  { lado: 5, cores: 5, min: 2, max: 15, termos: 3, ops: ['+', '−'] },
  { lado: 5, cores: 6, min: 1, max: 9, termos: 2, ops: ['×'] },
  { lado: 5, cores: 6, min: 2, max: 20, termos: 3, ops: ['+', '−'] },
  { lado: 5, cores: 6, min: 1, max: 9, termos: 3, ops: ['×', '+'] },
];
const TIPOS_CORES = {
  soma: { id: 'soma', titulo: 'Somar as cores', icone: '➕', cor: '#2e7d32',
    regra: 'Ache a linha (letra) e a coluna (número) de cada casa, veja a cor e troque pelo valor da bolinha. Depois some.' },
  sub: { id: 'sub', titulo: 'Somar e tirar', icone: '➖', cor: '#e53935',
    regra: 'Troque cada casa pelo valor da cor e faça a conta da esquerda para a direita: primeiro o que vem antes.' },
  mult: { id: 'mult', titulo: 'Multiplicar as cores', icone: '✖️', cor: '#8e44ad',
    regra: 'Troque cada casa pelo valor da cor. Na conta com × e +, faça primeiro a multiplicação e depois some.' },
};
const LETRAS = 'ABCDE';
let cores = null;   // a partida em andamento
const nomeCasa = (l, c) => `${LETRAS[l]}${c + 1}`;

function telaCoresMenu() {
  pararCores();
  mascote('davi-cores', 'oi');
  mostrar('tela-cores-menu');
}

function comecarCores() {
  pararCores();
  definirMissao({ id: 'cores', cores: true, icone: '🎨', cor: '#8e44ad', titulo: 'Somando as Cores' });
  definirResultados([]);
  cores = { nivel: 1, nivelMax: 1, feitas: 0, acertos: 0, pontos: 0, dicas: 0, conta: null, timers: [], rodando: true };
  mostrar('tela-cores');
  proximaCores();
}

function pararCores() {
  if (cores) { cores.rodando = false; cores.timers.forEach(clearTimeout); }
  cores = null;
}
const depoisCores = (ms, fn) => { const c = cores; const t = setTimeout(() => { if (cores === c && c.rodando) fn(); }, ms); c.timers.push(t); };
const msgCores = (texto, tipo = '') => { $('cores-msg').innerHTML = texto; $('cores-msg').className = `cores-msg ${tipo}`; };

// valores diferentes para cada cor, sorteados na faixa do nível
function sortearValores(nv) {
  const faixa = Array.from({ length: nv.max - nv.min + 1 }, (_, i) => nv.min + i);
  return embaralhar(faixa).slice(0, nv.cores);
}

// tabela com todas as cores do nível (cada uma aparece pelo menos uma vez)
function sortearTabela(nv) {
  const n = nv.lado * nv.lado;
  const lista = Array.from({ length: n }, (_, i) => (i < nv.cores ? i : Math.floor(Math.random() * nv.cores)));
  const misturada = embaralhar(lista);
  return Array.from({ length: nv.lado }, (_, l) => misturada.slice(l * nv.lado, (l + 1) * nv.lado));
}

// calcula a conta (× antes de + e −; o resto da esquerda para a direita); null se algum passo ficar negativo
function calcularCores(vals, ops) {
  const termos = [vals[0]], sinais = [];
  ops.forEach((op, i) => {
    if (op === '×') termos.push(termos.pop() * vals[i + 1]);
    else { sinais.push(op); termos.push(vals[i + 1]); }
  });
  let total = termos[0];
  for (let i = 0; i < sinais.length; i++) {
    total = sinais[i] === '+' ? total + termos[i + 1] : total - termos[i + 1];
    if (total < 0) return null;
  }
  return total;
}

function montarContaCores(nv, tabela, valores) {
  const todas = [];
  for (let l = 0; l < nv.lado; l++) for (let c = 0; c < nv.lado; c++) todas.push([l, c]);
  for (let tentativa = 0; tentativa < 80; tentativa++) {
    const casas = embaralhar(todas).slice(0, nv.termos);
    let ops = Array.from({ length: nv.termos - 1 }, () => sortear(nv.ops));
    if (nv.ops.includes('×') && nv.ops.length > 1) ops = ['×', '+'];   // nível 8: A1 × B2 + C3
    if (nv.ops.includes('−') && !ops.includes('−') && Math.random() < 0.6) ops[ops.length - 1] = '−';
    const vals = casas.map(([l, c]) => valores[tabela[l][c]]);
    const res = calcularCores(vals, ops);
    if (res == null) continue;
    if (res === 0 && tentativa < 60) continue;   // evita muitas contas que dão zero
    const tipo = ops.includes('×') ? TIPOS_CORES.mult : ops.includes('−') ? TIPOS_CORES.sub : TIPOS_CORES.soma;
    return { casas, ops, vals, res, tipo };
  }
  return null;
}

// respostas erradas: trocou linha e coluna, olhou a casa vizinha e errou a conta (vizinhos do resultado)
function opcoesCores(conta, nv, tabela, valores) {
  const erradas = new Map();   // valor -> motivo
  const valorCom = (casas) => calcularCores(casas.map(([l, c]) => valores[tabela[l][c]]), conta.ops);
  const trocadas = conta.casas.map(([l, c]) => [c, l]);
  const r1 = valorCom(trocadas);
  if (r1 != null && r1 !== conta.res) erradas.set(r1, 'trocou a linha pela coluna');
  for (let k = 0; k < conta.casas.length && erradas.size < 2; k++) {
    const [l, c] = conta.casas[k];
    for (const [dl, dc] of embaralhar([[0, 1], [0, -1], [1, 0], [-1, 0]])) {
      const nl = l + dl, nc = c + dc;
      if (nl < 0 || nc < 0 || nl >= nv.lado || nc >= nv.lado) continue;
      const casas = conta.casas.map((x, i) => (i === k ? [nl, nc] : x));
      const r = valorCom(casas);
      if (r != null && r !== conta.res && !erradas.has(r)) { erradas.set(r, 'olhou a casa vizinha'); break; }
    }
  }
  for (const d of embaralhar([1, -1, 2, -2, 10, -10, 3])) {
    if (erradas.size >= 3) break;
    const v = conta.res + d;
    if (v >= 0 && v !== conta.res && !erradas.has(v)) erradas.set(v, 'errou a conta');
  }
  for (let v = conta.res + 4; erradas.size < 3; v++) if (!erradas.has(v)) erradas.set(v, 'errou a conta');   // sempre 4 botões, só 1 certo
  conta.motivos = erradas;
  return embaralhar([conta.res, ...[...erradas.keys()].slice(0, 3)]);
}

function proximaCores() {
  if (cores.feitas >= CORES.CONTAS) { terminarCores(); return; }
  const nv = NIVEIS_CORES[cores.nivel - 1];
  let tabela, valores, conta;
  do {
    tabela = sortearTabela(nv);
    valores = sortearValores(nv);
    conta = montarContaCores(nv, tabela, valores);
  } while (!conta);
  cores.feitas++;
  cores.nv = nv;
  cores.tabela = tabela;
  cores.valores = valores;
  cores.conta = conta;
  cores.t0 = performance.now();
  cores.dicaNestaConta = false;
  hudCores();
  // legenda: uma bolinha por cor com o valor
  $('cores-legenda').innerHTML = valores.map((v, i) =>
    `<span class="cores-bola" style="--cor:${PALETA_CORES[i].cor};animation-delay:${i * 60}ms" title="${PALETA_CORES[i].nome}">${v}</span>`).join('');
  // tabela com cabeçalhos: canto vazio, números das colunas e letras das linhas
  const g = $('cores-grade');
  g.style.setProperty('--lado', nv.lado);
  let html = '<span class="cores-cab cores-canto"></span>';
  for (let c = 0; c < nv.lado; c++) html += `<span class="cores-cab" data-col="${c}">${c + 1}</span>`;
  for (let l = 0; l < nv.lado; l++) {
    html += `<span class="cores-cab" data-lin="${l}">${LETRAS[l]}</span>`;
    for (let c = 0; c < nv.lado; c++) {
      const k = tabela[l][c];
      html += `<span class="cores-casa" data-lin="${l}" data-col="${c}" style="--cor:${PALETA_CORES[k].cor};animation-delay:${(l + c) * 35}ms" aria-label="${nomeCasa(l, c)} ${PALETA_CORES[k].nome}"></span>`;
    }
  }
  g.innerHTML = html;
  // a conta: cada casa é um botão que acende a linha e a coluna
  $('cores-conta').className = 'cores-conta';
  $('cores-conta').innerHTML = conta.casas.map(([l, c], i) =>
    (i ? `<span class="cores-sinal">${conta.ops[i - 1]}</span>` : '')
    + `<button class="cores-coord" type="button" data-lin="${l}" data-col="${c}">${nomeCasa(l, c)}</button>`).join('')
    + '<span class="cores-sinal">=</span><span class="cores-res">?</span>';
  msgCores(cores.feitas === 1 ? 'Ache a cor de cada casa e troque pelo número da bolinha.' : '');
  $('cores-respostas').innerHTML = '';
  opcoesCores(conta, nv, tabela, valores).forEach((v, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mat-resposta';
    b.textContent = v;
    b.dataset.tecla = i + 1;
    b.onclick = () => responderCores(v, b);
    $('cores-respostas').append(b);
  });
}

function hudCores() {
  $('cores-nivel').textContent = `🎨 Nível ${cores.nivel} de ${CORES.NIVEL_MAX}`;
  $('cores-pontos').textContent = cores.pontos;
  $('cores-contador').textContent = `${cores.feitas}/${CORES.CONTAS}`;
}

// acende a linha e a coluna de uma casa (e a própria casa)
function acenderCasa(l, c, fixo) {
  const g = $('cores-grade');
  g.querySelectorAll('.guia').forEach((x) => x.classList.remove('guia'));
  g.querySelectorAll(`[data-lin="${l}"], [data-col="${c}"]`).forEach((x) => x.classList.add('guia'));
  const casa = g.querySelector(`.cores-casa[data-lin="${l}"][data-col="${c}"]`);
  if (casa) { casa.classList.remove('alvo'); void casa.offsetWidth; casa.classList.add('alvo'); }
  if (!fixo) depoisCores(1600, () => g.querySelectorAll('.guia').forEach((x) => x.classList.remove('guia')));
}

$('cores-conta').onclick = (e) => {
  const b = e.target.closest('.cores-coord');
  if (!b || !cores || !cores.conta) return;
  if (!cores.conta.respondida && !cores.dicaNestaConta) { cores.dicaNestaConta = true; cores.dicas++; }
  tocar([[660, 0.05]]);
  acenderCasa(Number(b.dataset.lin), Number(b.dataset.col), false);
};

function responderCores(valor, botao) {
  const conta = cores && cores.conta;
  if (!conta || conta.respondida || !cores.rodando) return;
  conta.respondida = true;
  const tempo = (performance.now() - cores.t0) / 1000;
  const botoes = [...document.querySelectorAll('#cores-respostas .mat-resposta')];
  botoes.forEach((b) => { b.disabled = true; });
  const certoEl = botoes.find((b) => Number(b.textContent) === conta.res);
  const nomes = conta.casas.map(([l, c]) => nomeCasa(l, c));
  const texto = nomes.map((n, i) => (i ? ` ${conta.ops[i - 1]} ` : '') + n).join('') + ` = ${conta.res}`;
  const explicacao = conta.casas.map(([l, c], i) => {
    const k = cores.tabela[l][c];
    return `${nomes[i]} <span class="cores-mini" style="--cor:${PALETA_CORES[k].cor}"></span> = <b>${conta.vals[i]}</b>`;
  }).join(' · ');
  const contaNum = conta.vals.map((v, i) => (i ? ` ${conta.ops[i - 1]} ` : '') + v).join('') + ` = ${conta.res}`;
  $('cores-conta').querySelector('.cores-res').textContent = conta.res;
  // as casas da conta piscam na tabela (continuação: a resposta aponta de volta para onde estava a cor)
  conta.casas.forEach(([l, c], i) => depoisCores(i * 220, () => {
    const casa = $('cores-grade').querySelector(`.cores-casa[data-lin="${l}"][data-col="${c}"]`);
    if (casa) { casa.classList.remove('alvo'); void casa.offsetWidth; casa.classList.add('alvo'); }
  }));
  const cor = (n) => PALETA_CORES[cores.tabela[conta.casas[n][0]][conta.casas[n][1]]].nome;
  const textoRel = `${texto} (${conta.casas.map((_, i) => `${nomes[i]} ${cor(i)} = ${conta.vals[i]}`).join(', ')})`;
  if (valor === conta.res) {
    const rapidez = Math.max(0, 1 - tempo / 30);
    const ganhou = 10 * cores.nivel + Math.round(rapidez * 10) - (cores.dicaNestaConta ? 3 : 0);
    cores.pontos += Math.max(5, ganhou);
    cores.acertos++;
    botao.classList.add('certa');
    $('cores-conta').classList.remove('acertou', 'errou'); void $('cores-conta').offsetWidth;
    $('cores-conta').classList.add('acertou');
    resultados.push({ m: conta.tipo, certa: textoRel, erros: [], nivel: cores.nivel, tempo });
    cores.nivel = Math.min(CORES.NIVEL_MAX, cores.nivel + 1);
    cores.nivelMax = Math.max(cores.nivelMax, cores.nivel);
    msgCores(`✅ Isso! ${explicacao} → ${contaNum}`, 'ok');
    SOM.certo();
  } else {
    const motivo = conta.motivos.get(valor) || 'errou a conta';
    botao.classList.add('errada');
    if (certoEl) certoEl.classList.add('certa');
    botoes.forEach((b) => { if (b !== botao && b !== certoEl) b.classList.add('apagada'); });
    $('cores-conta').classList.remove('acertou', 'errou'); void $('cores-conta').offsetWidth;
    $('cores-conta').classList.add('errou');
    // tremida curta na tabela (impacto do erro, sem exagero)
    const q = $('cores-quadro');
    q.classList.remove('tremer'); void q.offsetWidth; q.classList.add('tremer');
    resultados.push({ m: conta.tipo, certa: textoRel, erros: [`respondeu ${valor} (${motivo})`], nivel: cores.nivel, tempo });
    cores.nivel = Math.max(1, cores.nivel - 1);
    const dica = motivo === 'trocou a linha pela coluna' ? 'A <b>letra</b> é a linha (deitada) e o <b>número</b> é a coluna (em pé). '
      : motivo === 'olhou a casa vizinha' ? 'Siga a linha e a coluna com o dedo até elas se encontrarem. ' : '';
    msgCores(`Quase! ${dica}${explicacao} → ${contaNum}`, 'erro');
    SOM.errado();
  }
  hudCores();
  depoisCores(CORES.PAUSA + (valor === conta.res ? 0 : 1200), proximaCores);
}

function terminarCores() {
  const { acertos, feitas, pontos, nivelMax, dicas } = cores;
  pararCores();
  missao.resumo = [
    `Acertou ${acertos} de ${feitas} contas e chegou ao nível ${nivelMax} de ${CORES.NIVEL_MAX}.`,
    `Pediu para acender a linha e a coluna em ${dicas} de ${feitas} contas.`,
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Tabela dominada! 🎨' : 'Fim das contas!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitas} contas, chegou ao nível ${nivelMax} e fez ${pontos} pontos!`;
}

// teclas 1 a 4 escolhem a resposta no computador
document.addEventListener('keydown', (e) => {
  if (!cores || !$('tela-cores').classList.contains('ativa')) return;
  const b = document.querySelector(`#cores-respostas .mat-resposta[data-tecla="${e.key}"]`);
  if (b && !b.disabled) b.click();
});

$('btn-cores').onclick = () => { SOM.clique(); escolherProfessorE('Somando as Cores', telaCoresMenu); };
$('cores-voltar').onclick = telaJogos;
$('btn-cores-comecar').onclick = () => { SOM.clique(); comecarCores(); };
$('cores-sair').onclick = telaCoresMenu;

export { comecarCores, pararCores, telaCoresMenu };
