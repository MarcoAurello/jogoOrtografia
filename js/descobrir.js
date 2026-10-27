/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Descobrindo o Peso. */

import { $, embaralhar, sortear } from './util.js?v=104';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=104';
import { SOM, tocar } from './som.js?v=104';
import { mascote, mostrar, telaJogos } from './telas.js?v=104';
import { escolherProfessorE } from './professor.js?v=104';
import { segundos } from './luzes.js?v=104';
import { fimDaMissao } from './relatorio.js?v=104';

// ---------- Descobrindo o Peso ----------
// Raciocínio algébrico (a ideia de incógnita) com uma balança de cozinha. Na balança há peças coloridas e o visor mostra
// o peso total; a legenda diz quanto pesam as peças conhecidas. A criança descobre quanto pesa a peça que falta e toca
// na resposta certa entre 4. As erradas imitam os erros comuns: esqueceu de tirar o peso conhecido, somou em vez de
// subtrair, tirou só uma das peças repetidas, esqueceu de dividir, errou a conta por 1.
// Níveis (acertou sobe, errou desce): 1 peça conhecida; 2 ou 3 conhecidas; conhecidas repetidas; a desconhecida repetida
// (divide por 2); duas balanças (a primeira mostra o peso de uma peça); duas balanças com divisão e mais formas misturadas.
// São 6 formas (círculo, triângulo, quadrado, estrela, losango, hexágono). Errou 2 seguidas: uma janelinha ensina.
const DESCOBRIR = { RODADAS: 10, NIVEL_MAX: 6 };
const FORMAS_PESO = {
  C: { nome: 'círculo azul', cor: '#1e88e5' },
  T: { nome: 'triângulo amarelo', cor: '#f5b800' },
  Q: { nome: 'quadrado verde', cor: '#2e9e5b' },
  E: { nome: 'estrela roxa', cor: '#8e44ad' },
  L: { nome: 'losango laranja', cor: '#fb8c00' },
  H: { nome: 'hexágono rosa', cor: '#e91e63' },
};
const NIVEIS_DESCOBRIR = [
  { titulo: 'Uma peça conhecida' },
  { titulo: 'Várias peças conhecidas' },
  { titulo: 'Peças conhecidas repetidas' },
  { titulo: 'A peça que falta repetida' },
  { titulo: 'Duas balanças' },
  { titulo: 'Duas balanças e divisão' },
];
const TIPOS_DESCOBRIR = {
  subtrair: { id: 'desc-sub', titulo: 'Tirar o peso conhecido', icone: '➖', cor: '#1e88e5',
    regra: 'Do peso total, tirar o peso das peças que já conhecemos: o que sobra é o peso da peça que falta.' },
  repetidas: { id: 'desc-rep', titulo: 'Peças repetidas', icone: '✖️', cor: '#e0a100',
    regra: 'Peças iguais pesam igual: com 2 iguais, multiplicar (2 × o peso) para tirar, ou dividir o que sobra por 2 para achar uma.' },
  duas: { id: 'desc-duas', titulo: 'Duas balanças', icone: '⚖️', cor: '#8e44ad',
    regra: 'Usar a primeira balança para descobrir o peso de uma peça e levar esse peso para a segunda balança.' },
};
let desc = null;   // a partida em andamento

const kg = (n) => `${n} kg`;
// desenho de uma peça (círculo, triângulo, quadrado ou estrela) num quadradinho de 40 × 40
function formaSVG(f, x = 0, y = 0, t = 40) {
  const c = FORMAS_PESO[f].cor, s = t / 40;
  const g = `transform="translate(${x} ${y}) scale(${s})"`;
  if (f === 'C') return `<g ${g}><circle cx="20" cy="20" r="17" fill="${c}" stroke="#13294b" stroke-width="2"/></g>`;
  if (f === 'T') return `<g ${g}><polygon points="20,3 38,37 2,37" fill="${c}" stroke="#13294b" stroke-width="2" stroke-linejoin="round"/></g>`;
  if (f === 'Q') return `<g ${g}><rect x="4" y="4" width="32" height="32" rx="3" fill="${c}" stroke="#13294b" stroke-width="2"/></g>`;
  if (f === 'L') return `<g ${g}><polygon points="20,2 38,20 20,38 2,20" fill="${c}" stroke="#13294b" stroke-width="2" stroke-linejoin="round"/></g>`;
  if (f === 'H') return `<g ${g}><polygon points="11,4 29,4 38,20 29,36 11,36 2,20" fill="${c}" stroke="#13294b" stroke-width="2" stroke-linejoin="round"/></g>`;
  return `<g ${g}><polygon points="20,2 25,15 39,15 28,24 32,38 20,30 8,38 12,24 1,15 15,15" fill="${c}" stroke="#13294b" stroke-width="2" stroke-linejoin="round"/></g>`;
}
const formaIcone = (f) => `<svg class="forma-peso" viewBox="0 0 40 40" aria-label="${FORMAS_PESO[f].nome}">${formaSVG(f)}</svg>`;

// balança de cozinha com as peças em cima (em fileiras) e o visor com o total
function balancaSVG(pecas, total, rotulo = '') {
  const t = 34, porLinha = 3;
  const linhas = [];
  for (let i = 0; i < pecas.length; i += porLinha) linhas.push(pecas.slice(i, i + porLinha));
  const desenho = linhas.map((l, k) => l.map((f, j) => formaSVG(f, 100 - (l.length * (t + 4)) / 2 + j * (t + 4) + 2, 62 - (k + 1) * (t + 2), t)).join('')).join('');
  const topo = linhas.length > 1 ? -40 : 0;   // duas fileiras de peças: o desenho começa mais acima
  return `<svg class="balanca-peso" viewBox="0 ${topo} 200 ${200 - topo}" role="img" aria-label="Balança com ${pecas.map((f) => FORMAS_PESO[f].nome).join(', ')}: ${kg(total)}">
    ${rotulo ? `<text x="8" y="${topo + 20}" font-size="20" font-weight="800" fill="#c2185b">${rotulo}</text>` : ''}
    ${desenho}
    <rect x="34" y="62" width="132" height="10" rx="5" fill="#9aa7b4" stroke="#13294b" stroke-width="2"/>
    <rect x="92" y="72" width="16" height="10" fill="#6d7a87"/>
    <path d="M52 82 H148 L170 192 H30 Z" fill="#e8553f" stroke="#13294b" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="100" cy="135" r="38" fill="#fff" stroke="#13294b" stroke-width="2.5"/>
    <rect x="70" y="122" width="60" height="26" rx="5" fill="#13294b"/>
    <text x="100" y="141" font-size="17" font-weight="800" text-anchor="middle" fill="#7CFC9A" font-family="monospace">${total} kg</text>
  </svg>`;
}

// monta a rodada do nível: as balanças, a legenda (pesos conhecidos), a peça a descobrir, as contas e as erradas
function novoProblema(nivel) {
  const [K, K2, X, Y] = embaralhar(Object.keys(FORMAS_PESO));
  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  let balancas, legenda, x, passos, erradas, tipo;
  if (nivel === 1) {
    const a = r(1, 5); x = r(1, 7);
    const T = a + x;
    balancas = [{ pecas: embaralhar([K, X]), total: T }]; legenda = [[K, a]]; tipo = 'subtrair';
    passos = [`${T} − ${a} = ${x}`];
    erradas = [[T, 'esqueceu de tirar o peso conhecido'], [T + a, 'somou em vez de subtrair']];
  } else if (nivel === 2) {
    // 2 ou 3 formas conhecidas diferentes
    const conhecidas = (Math.random() < 0.5 ? [K, K2] : [K, K2, Y]).map((f) => [f, r(1, 5)]);
    const soma = conhecidas.reduce((s, [, v]) => s + v, 0);
    x = r(1, 8);
    const T = soma + x;
    balancas = [{ pecas: embaralhar([...conhecidas.map(([f]) => f), X]), total: T }]; legenda = conhecidas; tipo = 'subtrair';
    passos = [`${conhecidas.map(([, v]) => v).join(' + ')} = ${soma}`, `${T} − ${soma} = ${x}`];
    erradas = [...conhecidas.map(([, v]) => [T - v, 'tirou só uma das peças conhecidas']), [T, 'esqueceu de tirar o peso conhecido']];
  } else if (nivel === 3) {
    const n = r(2, 3), a = r(2, 5); x = r(1, 8);
    const T = n * a + x;
    balancas = [{ pecas: embaralhar([...Array(n).fill(K), X]), total: T }]; legenda = [[K, a]]; tipo = 'repetidas';
    passos = [`${n} × ${a} = ${n * a}`, `${T} − ${n * a} = ${x}`];
    erradas = [[T - a, 'tirou só uma das peças repetidas'], [T, 'esqueceu de tirar o peso conhecido'], [T + n * a, 'somou em vez de subtrair']];
  } else if (nivel === 4) {
    const a = r(1, 6); x = r(2, 7);
    const T = a + 2 * x;
    balancas = [{ pecas: embaralhar([K, X, X]), total: T }]; legenda = [[K, a]]; tipo = 'repetidas';
    passos = [`${T} − ${a} = ${2 * x}`, `${2 * x} ÷ 2 = ${x}`];
    erradas = [[2 * x, 'esqueceu de dividir pelas 2 peças iguais'], [T, 'esqueceu de tirar o peso conhecido'], [(T + a) / 2, 'somou em vez de subtrair']];
  } else if (nivel === 5) {
    const a = r(2, 6); x = r(1, 8);
    const A = 2 * a, T = a + x;
    balancas = [{ pecas: [K, K], total: A, rotulo: '1' }, { pecas: embaralhar([K, X]), total: T, rotulo: '2' }]; legenda = []; tipo = 'duas';
    passos = [`Balança 1: ${A} ÷ 2 = ${a}`, `Balança 2: ${T} − ${a} = ${x}`];
    erradas = [[T - A, 'usou o peso das 2 peças da balança 1'], [T, 'esqueceu de tirar o peso conhecido'], [Math.abs(T - A) || T + a, 'usou o peso das 2 peças da balança 1']];
  } else {
    // a balança 2 mistura a peça da balança 1, uma peça da legenda e duas iguais da que falta
    const n = r(2, 3), a = r(2, 5), c = r(1, 4); x = r(2, 7);
    const A = n * a, T = a + c + 2 * x;
    balancas = [{ pecas: Array(n).fill(K), total: A, rotulo: '1' }, { pecas: embaralhar([K, Y, X, X]), total: T, rotulo: '2' }]; legenda = [[Y, c]]; tipo = 'duas';
    passos = [`Balança 1: ${A} ÷ ${n} = ${a}`, `Balança 2: ${T} − ${a} − ${c} = ${2 * x}`, `${2 * x} ÷ 2 = ${x}`];
    erradas = [[2 * x, 'esqueceu de dividir pelas 2 peças iguais'], [T - A - c, 'usou o peso da balança 1 inteira'], [(T - a) / 2, 'esqueceu de tirar uma das peças conhecidas'], [T - a - c, 'esqueceu de dividir pelas 2 peças iguais']];
  }
  // 3 erradas diferentes da certa e maiores que zero (as que faltarem: um a mais ou a menos)
  const opcoes = [{ v: x, certa: true }];
  for (const [v, motivo] of [...embaralhar(erradas), [x + 1, 'errou a conta (1 a mais)'], [x - 1, 'errou a conta (1 a menos)'], [x + 2, 'errou a conta'], [x + 3, 'errou a conta']]) {
    if (opcoes.length >= 4) break;
    if (!Number.isInteger(v) || v <= 0 || opcoes.some((o) => o.v === v)) continue;
    opcoes.push({ v, motivo });
  }
  return { balancas, legenda, X, x, passos, tipo, opcoes: embaralhar(opcoes) };
}

function telaDescobrirMenu() {
  pararDescobrir();
  mascote('davi-descobrir', 'oi');
  mostrar('tela-descobrir-menu');
}

function comecarDescobrir() {
  pararDescobrir();
  definirMissao({ id: 'descobrir', descobrir: true, icone: '⚖️', cor: '#e8553f', titulo: 'Descobrindo o Peso (balança e incógnita)' });
  definirResultados([]);
  desc = { nivel: 1, nivelMax: 1, pontos: 0, feitas: 0, acertos: 0, rodando: true, erros: {}, errosSeguidos: 0, ajudas: 0 };
  mostrar('tela-descobrir');
  novaRodadaDescobrir();
}

function pararDescobrir() {
  if (desc) { desc.rodando = false; clearInterval(desc.relogio); clearTimeout(desc.proxima); }
  desc = null;
  $('descobrir-ajuda').hidden = true;
}
const msgDescobrir = (texto, tipo = '') => { $('descobrir-msg').innerHTML = texto; $('descobrir-msg').className = `descobrir-msg ${tipo}`; };

function novaRodadaDescobrir() {
  const d = desc;
  if (!d || !d.rodando) return;
  if (d.feitas >= DESCOBRIR.RODADAS) { terminarDescobrir(); return; }
  d.feitas++;
  const p = novoProblema(d.nivel);
  Object.assign(d, { p, respondendo: true, t0: performance.now() });
  $('descobrir-nivel').textContent = `⚖️ Nível ${d.nivel} de ${DESCOBRIR.NIVEL_MAX}`;
  $('descobrir-pontos').textContent = d.pontos;
  $('descobrir-contador').textContent = `${d.feitas}/${DESCOBRIR.RODADAS} · ${NIVEIS_DESCOBRIR[d.nivel - 1].titulo}`;
  $('descobrir-balancas').className = `descobrir-balancas balancas-${p.balancas.length}`;
  $('descobrir-balancas').innerHTML = p.balancas.map((b) => balancaSVG(b.pecas, b.total, b.rotulo)).join('');
  $('descobrir-pergunta').innerHTML = (p.legenda.length
    ? `<span class="descobrir-legenda">${p.legenda.map(([f, v]) => `<span class="legenda-peso">${formaIcone(f)} = <b>${kg(v)}</b></span>`).join('')}</span>`
    : '<span class="descobrir-legenda dica">A balança 1 conta quanto pesa uma peça!</span>')
    + (p.legenda.length && p.balancas.length > 1 ? '<span class="descobrir-legenda dica">e a balança 1 conta outra!</span>' : '')
    + `<span class="descobrir-quanto">Quanto pesa ${p.balancas.length > 1 || p.legenda.length ? 'o' : ''} ${formaIcone(p.X)} ?</span>`;
  $('descobrir-opcoes').innerHTML = p.opcoes.map((o, i) => `<button class="descobrir-opcao" type="button" data-i="${i}">${kg(o.v)}</button>`).join('');
  msgDescobrir('');
  clearInterval(d.relogio);
  d.relogio = setInterval(() => { if (desc && desc.respondendo) $('descobrir-tempo').textContent = `⏱ ${segundos((performance.now() - desc.t0) / 1000)}`; }, 250);
}

$('descobrir-opcoes').onclick = (e) => {
  const btn = e.target.closest('.descobrir-opcao');
  const d = desc;
  if (!btn || !d || !d.respondendo) return;
  d.respondendo = false;
  clearInterval(d.relogio);
  const p = d.p, o = p.opcoes[Number(btn.dataset.i)];
  const tempo = (performance.now() - d.t0) / 1000;
  const tipo = TIPOS_DESCOBRIR[p.tipo];
  // ex.: "círculo + hexágono + hexágono = 18 kg (círculo = 4 kg): hexágono rosa = 7 kg"
  const curto = (f) => FORMAS_PESO[f].nome.split(' ')[0];
  const texto = `${p.balancas.map((bl) => `${bl.pecas.map(curto).join(' + ')} = ${kg(bl.total)}`).join('; ')}`
    + `${p.legenda.length ? ` (${p.legenda.map(([f, v]) => `${curto(f)} = ${kg(v)}`).join(', ')})` : ''}: ${FORMAS_PESO[p.X].nome} = ${kg(p.x)}`;
  document.querySelectorAll('.descobrir-opcao').forEach((b) => { b.disabled = true; if (p.opcoes[Number(b.dataset.i)].certa) b.classList.add('certa'); });
  const conta = `<span class="descobrir-conta">${p.passos.join('<br>')}</span>`;
  if (o.certa) {
    const bom = 4 + d.nivel;
    const bonus = Math.max(0, Math.min(100, Math.round(100 * (1 - (tempo - bom) / (bom * 2)))));
    const ganho = 20 * d.nivel + bonus;
    d.pontos += ganho;
    d.acertos++;
    d.errosSeguidos = 0;
    resultados.push({ m: tipo, certa: texto, erros: [], nivel: d.nivel, tempo });
    SOM.certo();
    msgDescobrir(`✅ Isso! +${ganho} pontos em ${segundos(tempo)}${conta}`, 'ok');
    d.nivel = Math.min(DESCOBRIR.NIVEL_MAX, d.nivel + 1);
  } else {
    btn.classList.add('errada');
    d.erros[o.motivo] = (d.erros[o.motivo] || 0) + 1;
    d.errosSeguidos++;
    resultados.push({ m: tipo, certa: texto, erros: [`escolheu ${kg(o.v)} (${o.motivo})`], nivel: d.nivel, tempo });
    SOM.errado();
    msgDescobrir(`Não foi essa (${o.motivo}). Veja a conta:${conta}`, 'erro');
    d.nivel = Math.max(1, d.nivel - 1);
  }
  d.nivelMax = Math.max(d.nivelMax, d.nivel);
  $('descobrir-pontos').textContent = d.pontos;
  if (d.errosSeguidos >= 2) { d.errosSeguidos = 0; d.proxima = setTimeout(mostrarAjudaDescobrir, 3000); return; }
  d.proxima = setTimeout(novaRodadaDescobrir, o.certa ? 2000 : 3800);
};

function mostrarAjudaDescobrir() {
  const d = desc;
  if (!d || !d.rodando) return;
  d.ajudas++;
  $('descobrir-ajuda').hidden = false;
  tocar([[523, 0.1], [659, 0.1], [784, 0.16]]);
  $('btn-descobrir-entendi').focus();
}
$('btn-descobrir-entendi').onclick = () => {
  $('descobrir-ajuda').hidden = true;
  SOM.clique();
  if (desc && desc.rodando) novaRodadaDescobrir();
};
// exemplo da janelinha: 🔵 + 🔺 = 7 kg, com o 🔵 de 2 kg
$('descobrir-ajuda-exemplo').innerHTML = `${balancaSVG(['C', 'T'], 7)}<p class="barcos-ajuda-dica">${formaIcone('C')} = <b>2 kg</b>. A balança marca <b>7 kg</b>.
  Tire da balança o que você já sabe: <b>7 − 2 = 5</b>. Então ${formaIcone('T')} = <b>5 kg</b>!</p>
  <p class="barcos-ajuda-dica">Duas peças iguais? Elas pesam igual: <b>divida por 2</b>. Duas balanças? Descubra uma peça na balança 1 e use na balança 2.</p>`;

function terminarDescobrir() {
  const d = desc;
  pararDescobrir();
  const tempos = resultados.filter((x) => !x.erros.length).map((x) => x.tempo);
  const erros = Object.entries(d.erros);
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${d.pontos}. Chegou ao nível ${d.nivelMax} de ${DESCOBRIR.NIVEL_MAX} (${NIVEIS_DESCOBRIR[d.nivelMax - 1].titulo.toLowerCase()}).`,
    `Acertou ${d.acertos} de ${d.feitas} rodadas.`,
    erros.length ? `Erros: ${erros.map(([t, n]) => `${t} (${n})`).join(', ')}.` : 'Nenhum erro: descobriu todos os pesos!',
    ...(d.ajudas ? [`Precisou da explicação da balança ${d.ajudas} ${d.ajudas === 1 ? 'vez' : 'vezes'} (depois de 2 erros seguidos).`] : []),
    ...(tempos.length ? [`Tempo médio para acertar: ${segundos(tempos.reduce((s, t) => s + t, 0) / tempos.length)}.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = d.acertos === d.feitas ? 'Detetive dos pesos! 🕵️' : 'Fim do Descobrindo o Peso!';
  $('fim-texto').textContent = `${aluno}, você acertou ${d.acertos} de ${d.feitas} e fez ${d.pontos} pontos!`;
}

$('btn-descobrir').onclick = () => { SOM.clique(); escolherProfessorE('Descobrindo o Peso', telaDescobrirMenu); };
$('descobrir-voltar').onclick = telaJogos;
$('btn-descobrir-comecar').onclick = () => { SOM.clique(); comecarDescobrir(); };
$('descobrir-sair').onclick = telaDescobrirMenu;

export { comecarDescobrir, DESCOBRIR, pararDescobrir, telaDescobrirMenu };
