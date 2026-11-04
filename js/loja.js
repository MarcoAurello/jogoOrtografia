/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Jogo da Loja. */

import { $, embaralhar, sortear } from './util.js?v=186';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=186';
import { frase, pararVoz, SOM, tocar } from './som.js?v=186';
import { mascote, mostrar, telaJogos } from './telas.js?v=186';
import { escolherProfessorE } from './professor.js?v=186';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=186';

// ---------- Jogo da Loja ----------
// Dinheiro no dia a dia (adição, multiplicação e troco): em cima, a tabela de preços da papelaria (figura e preço,
// muda a cada rodada); no meio, o desenho da compra ("2 lápis e 1 borracha") e a pergunta: "Quanto custa a compra?"
// ou "João pagou com R$ 10,00. Qual é o troco?". As 3 respostas vêm com o desenho das notas e moedas (para pagar ou
// de troco). As erradas imitam os erros comuns: esquecer a quantidade (somar só os preços), errar a conta por pouco
// e, no troco, responder o valor da compra em vez do troco. Acertou: sobe um nível; errou: desce.
const LOJA = { RODADAS: 10, NIVEL_MAX: 6, PAUSA: 2600 };
const NIVEIS_LO = [
  { tipos: [1, 1], qtd: [1, 2], max: 10, pergunta: 'total', titulo: 'Quanto custa (um item)' },
  { tipos: [2, 2], qtd: [1, 1], max: 15, pergunta: 'total', titulo: 'Quanto custa (dois itens)' },
  { tipos: [1, 2], qtd: [1, 2], max: 9, pergunta: 'troco', nota: 10, titulo: 'Troco de R$ 10' },
  { tipos: [2, 2], qtd: [1, 3], max: 30, pergunta: 'total', titulo: 'Quanto custa (com quantidades)' },
  { tipos: [2, 2], qtd: [1, 2], max: 19, pergunta: 'troco', nota: 20, titulo: 'Troco de R$ 20' },
  { tipos: [3, 3], qtd: [1, 3], max: 49, pergunta: 'troco', nota: 50, titulo: 'Troco de R$ 50' },
];
const TIPOS_LO = NIVEIS_LO.map((n, i) => ({
  id: `loja${i + 1}`, titulo: `Nível ${i + 1}: ${n.titulo}`, icone: '🛒', cor: '#2e9e5b',
  regra: n.pergunta === 'troco'
    ? 'Primeiro somar a compra (quantidade × preço de cada item); depois tirar do valor pago: o que sobra é o troco.'
    : 'Para cada item, multiplicar a quantidade pelo preço da tabela; depois somar tudo.',
}));
const NOMES_LO = ['João', 'Ana', 'Lia', 'Davi', 'Malu', 'Theo', 'Bia', 'Caio'];

// os materiais (viewBox 60 x 60): nome no singular e no plural, faixa de preço e o desenho
const ITENS = {
  lapis: { nome: 'lápis', plural: 'lápis', preco: [1, 3], svg: '<path d="M10 50 L42 18 L50 26 L18 58Z" fill="#f5c518" stroke="#13294b" stroke-width="2"/><path d="M42 18 L48 12 Q52 10 54 14 Q56 18 54 20 L50 26Z" fill="#f28b8b" stroke="#13294b" stroke-width="2"/><path d="M10 50 L18 58 L6 60Z" fill="#f6cfb0" stroke="#13294b" stroke-width="2"/><path d="M6 60 L8 55 L11 58Z" fill="#13294b"/>' },
  borracha: { nome: 'borracha', plural: 'borrachas', preco: [1, 3], svg: '<g transform="rotate(-20 30 30)"><rect x="8" y="20" width="44" height="22" rx="5" fill="#f28b8b" stroke="#13294b" stroke-width="2"/><rect x="30" y="20" width="22" height="22" rx="5" fill="#6fa8ff" stroke="#13294b" stroke-width="2"/></g>' },
  caneta: { nome: 'caneta', plural: 'canetas', preco: [2, 4], svg: '<g transform="rotate(-45 30 30)"><rect x="6" y="25" width="40" height="10" rx="3" fill="#1e64d2" stroke="#13294b" stroke-width="2"/><path d="M46 25 L56 30 L46 35Z" fill="#cbd5e1" stroke="#13294b" stroke-width="2"/><rect x="12" y="21" width="16" height="4" rx="2" fill="#13294b"/></g>' },
  regua: { nome: 'régua', plural: 'réguas', preco: [2, 5], svg: `<g transform="rotate(-30 30 30)"><rect x="2" y="22" width="56" height="16" rx="2" fill="#ffe066" stroke="#13294b" stroke-width="2"/>${[8, 14, 20, 26, 32, 38, 44, 50].map((x, i) => `<line x1="${x}" y1="22" x2="${x}" y2="${i % 2 ? 28 : 31}" stroke="#13294b" stroke-width="1.5"/>`).join('')}</g>` },
  caderno: { nome: 'caderno', plural: 'cadernos', preco: [5, 12], svg: `<rect x="14" y="6" width="38" height="50" rx="4" fill="#e5484d" stroke="#13294b" stroke-width="2"/><rect x="22" y="16" width="24" height="10" rx="2" fill="#fff" stroke="#13294b" stroke-width="1.5"/>${[12, 20, 28, 36, 44, 52].map((y) => `<circle cx="14" cy="${y}" r="3" fill="#fff" stroke="#13294b" stroke-width="1.5"/>`).join('')}` },
  cola: { nome: 'cola', plural: 'colas', preco: [3, 6], svg: '<rect x="18" y="22" width="24" height="34" rx="6" fill="#f8fafc" stroke="#13294b" stroke-width="2"/><path d="M24 22 L26 12 H34 L36 22Z" fill="#f08a24" stroke="#13294b" stroke-width="2"/><path d="M28 12 L30 4 L32 12Z" fill="#f08a24" stroke="#13294b" stroke-width="2"/><rect x="21" y="32" width="18" height="12" rx="2" fill="#6fa8ff"/>' },
  tesoura: { nome: 'tesoura', plural: 'tesouras', preco: [4, 8], svg: '<path d="M30 30 L52 6" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/><path d="M30 30 L56 14" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round"/><circle cx="18" cy="44" r="9" fill="none" stroke="#e5484d" stroke-width="5"/><circle cx="34" cy="50" r="9" fill="none" stroke="#e5484d" stroke-width="5"/><path d="M24 37 L30 30 L32 41" stroke="#e5484d" stroke-width="5" fill="none" stroke-linecap="round"/>' },
  apontador: { nome: 'apontador', plural: 'apontadores', preco: [1, 3], svg: '<rect x="12" y="18" width="36" height="28" rx="6" fill="#3fae5a" stroke="#13294b" stroke-width="2"/><circle cx="26" cy="32" r="7" fill="#13294b"/><rect x="36" y="22" width="8" height="20" rx="2" fill="#cbd5e1" stroke="#13294b" stroke-width="1.5"/>' },
  giz: { nome: 'caixa de giz de cera', plural: 'caixas de giz de cera', preco: [4, 9], svg: '<rect x="18" y="8" width="7" height="24" rx="2" fill="#e5484d" stroke="#13294b" stroke-width="1.5"/><rect x="27" y="4" width="7" height="28" rx="2" fill="#1e64d2" stroke="#13294b" stroke-width="1.5"/><rect x="36" y="10" width="7" height="22" rx="2" fill="#f5c518" stroke="#13294b" stroke-width="1.5"/><rect x="10" y="26" width="40" height="30" rx="4" fill="#f08a24" stroke="#13294b" stroke-width="2"/><rect x="16" y="34" width="28" height="12" rx="3" fill="#fff"/>' },
  estojo: { nome: 'estojo', plural: 'estojos', preco: [8, 15], svg: '<rect x="4" y="18" width="52" height="28" rx="12" fill="#8e44ad" stroke="#13294b" stroke-width="2"/><path d="M8 30 H52" stroke="#13294b" stroke-width="2" stroke-dasharray="3 2"/><circle cx="46" cy="30" r="3.5" fill="#f5c518" stroke="#13294b" stroke-width="1.5"/>' },
  livro: { nome: 'livro', plural: 'livros', preco: [10, 25], svg: '<path d="M6 14 Q18 8 30 14 V54 Q18 48 6 54Z" fill="#6fa8ff" stroke="#13294b" stroke-width="2"/><path d="M54 14 Q42 8 30 14 V54 Q42 48 54 54Z" fill="#9cc3ff" stroke="#13294b" stroke-width="2"/><path d="M12 22 Q18 19 24 22 M12 30 Q18 27 24 30 M36 22 Q42 19 48 22 M36 30 Q42 27 48 30" stroke="#13294b" stroke-width="1.5" fill="none"/>' },
  mochila: { nome: 'mochila', plural: 'mochilas', preco: [20, 40], svg: '<path d="M22 12 Q22 4 30 4 Q38 4 38 12" stroke="#13294b" stroke-width="3" fill="none"/><rect x="10" y="12" width="40" height="44" rx="12" fill="#2e9e5b" stroke="#13294b" stroke-width="2"/><rect x="16" y="34" width="28" height="16" rx="5" fill="#7ddc8f" stroke="#13294b" stroke-width="2"/><line x1="16" y1="40" x2="44" y2="40" stroke="#13294b" stroke-width="1.5"/>' },
};
const itemSVG = (id, classe = '') => `<svg class="loja-item ${classe}" viewBox="0 0 60 60" aria-hidden="true">${ITENS[id].svg}</svg>`;

// dinheiro: a moeda de 1 real e as notas de 2, 5, 10, 20 e 50 (desenhos simplificados, com a cor de cada nota)
const DINHEIRO = [50, 20, 10, 5, 2, 1];
const COR_NOTA = { 2: ['#7fa7d6', '#3c6ea8'], 5: ['#b9a2d6', '#6c4c9a'], 10: ['#e79a8f', '#b0402f'], 20: ['#f2cf6b', '#b0861a'], 50: ['#f0a868', '#b5631d'] };
function notaSVG(v) {
  if (v === 1) {
    return '<svg class="loja-moeda" viewBox="0 0 30 30" role="img" aria-label="moeda de 1 real"><circle cx="15" cy="15" r="13.5" fill="#e6c25a" stroke="#8a6d1f" stroke-width="1.5"/>'
      + '<circle cx="15" cy="15" r="9" fill="#d9dde3" stroke="#8a6d1f" stroke-width="1"/><text x="15" y="19.5" text-anchor="middle" font-size="12" font-weight="700" fill="#13294b" font-family="Fredoka, sans-serif">1</text></svg>';
  }
  const [claro, escuro] = COR_NOTA[v];
  return `<svg class="loja-nota" viewBox="0 0 64 32" role="img" aria-label="nota de ${v} reais"><rect x="1" y="1" width="62" height="30" rx="3" fill="${claro}" stroke="${escuro}" stroke-width="1.5"/>`
    + `<rect x="4" y="4" width="56" height="24" rx="2" fill="none" stroke="${escuro}" stroke-width="0.8" stroke-dasharray="2 1.5"/>`
    + `<circle cx="42" cy="16" r="8" fill="${escuro}" opacity=".25"/>`
    + `<text x="8" y="21" font-size="15" font-weight="700" fill="${escuro}" font-family="Fredoka, sans-serif">${v}</text>`
    + `<text x="58" y="27" text-anchor="end" font-size="5.5" font-weight="700" fill="${escuro}" font-family="Fredoka, sans-serif">REAIS</text></svg>`;
}
// o valor em notas e moedas (do maior para o menor)
function emDinheiro(valor) {
  const lista = [];
  let resto = valor;
  for (const v of DINHEIRO) while (resto >= v) { lista.push(v); resto -= v; }
  return lista;
}
const reais = (v) => `R$ ${v},00`;

let loja = null;   // a partida em andamento

// uma rodada: 6 itens com preço na tabela, a compra (alguns deles) e a pergunta com 3 respostas
function novaRodada(nivel) {
  const cfg = NIVEIS_LO[nivel - 1];
  for (let t = 0; t < 200; t++) {
    const tabela = embaralhar(Object.keys(ITENS)).slice(0, 6).map((id) => {
      const [a, b] = ITENS[id].preco;
      return { id, preco: a + Math.floor(Math.random() * (b - a + 1)) };
    });
    const qtosTipos = cfg.tipos[0] + Math.floor(Math.random() * (cfg.tipos[1] - cfg.tipos[0] + 1));
    const compra = embaralhar(tabela).slice(0, qtosTipos).map((it) => ({ ...it, qtd: cfg.qtd[0] + Math.floor(Math.random() * (cfg.qtd[1] - cfg.qtd[0] + 1)) }));
    const total = compra.reduce((s, it) => s + it.qtd * it.preco, 0);
    if (total > cfg.max || total < 2) continue;
    // nos níveis com quantidade, pelo menos um item com mais de 1 (senão a multiplicação não aparece)
    if (cfg.qtd[1] > 1 && nivel >= 4 && !compra.some((it) => it.qtd > 1)) continue;
    const semQtd = compra.reduce((s, it) => s + it.preco, 0);
    const certo = cfg.pergunta === 'troco' ? cfg.nota - total : total;
    if (certo <= 0) continue;
    const opcoes = new Map([[certo, { valor: certo, certa: true }]]);
    const juntar = (v, motivo) => { if (v > 0 && !opcoes.has(v) && opcoes.size < 3) opcoes.set(v, { valor: v, motivo }); };
    if (cfg.pergunta === 'troco') {
      juntar(total, 'respondeu o valor da compra, e não o troco');
      if (semQtd !== total) juntar(cfg.nota - semQtd, 'esqueceu a quantidade de algum item');
    } else if (semQtd !== total) juntar(semQtd, 'somou os preços sem contar a quantidade');
    for (const d of embaralhar([1, -1, 2, -2])) juntar(certo + d, 'errou a conta por pouco');
    return { cfg, tabela, compra, total, certo, nome: sortear(NOMES_LO), opcoes: embaralhar([...opcoes.values()]) };
  }
  return null;
}

const textoCompra = (compra) => compra.map((it) => `${it.qtd} ${it.qtd > 1 ? ITENS[it.id].plural : ITENS[it.id].nome}`)
  .join(', ').replace(/, ([^,]*)$/, ' e $1');
function textoPergunta(r) {
  return r.cfg.pergunta === 'troco'
    ? `${r.nome} comprou ${textoCompra(r.compra)} e pagou com ${r.cfg.nota} reais. Qual é o troco?`
    : `${r.nome} comprou ${textoCompra(r.compra)}. Quanto custa a compra?`;
}

function telaLojaMenu() {
  pararLoja();
  mascote('davi-loja', 'oi');
  mostrar('tela-loja-menu');
}

function comecarLoja() {
  pararLoja();
  definirMissao({ id: 'loja', loja: true, icone: '🛒', cor: '#2e9e5b', titulo: 'Jogo da Loja' });
  definirResultados([]);
  loja = { nivel: 1, nivelMax: 1, feitas: 0, acertos: 0, pontos: 0, rodada: null, timers: [], rodando: true };
  mostrar('tela-loja');
  proximaLoja();
}

function pararLoja() {
  if (loja) { loja.rodando = false; loja.timers.forEach(clearTimeout); pararVoz(); }
  loja = null;
}
const depoisLoja = (ms, fn) => { const p = loja; const t = setTimeout(() => { if (loja === p && p.rodando) fn(); }, ms); p.timers.push(t); };
const msgLoja = (texto, tipo = '') => { $('loja-msg').innerHTML = texto; $('loja-msg').className = `cores-msg ${tipo}`; };
const falarPergunta = () => { if (loja && loja.rodada) frase('', textoPergunta(loja.rodada)); };

function hudLoja() {
  $('loja-nivel').textContent = `🛒 Nível ${loja.nivel}`;
  $('loja-pontos').textContent = loja.pontos;
  $('loja-contador').textContent = `${loja.feitas}/${LOJA.RODADAS}`;
}

function proximaLoja() {
  if (loja.feitas >= LOJA.RODADAS) { terminarLoja(); return; }
  const r = novaRodada(loja.nivel);
  loja.feitas++;
  loja.rodada = { ...r, n: loja.nivel, respondida: false, t0: performance.now() };
  hudLoja();
  // a tabela de preços: figura e o preço do lado
  $('loja-tabela').innerHTML = r.tabela.map((it) => `<div class="loja-preco">${itemSVG(it.id)}<span><b>${ITENS[it.id].nome}</b><em>${reais(it.preco)}</em></span></div>`).join('');
  // a compra: cada item desenhado quantas vezes foi comprado, com "2 x" ao lado
  $('loja-compra').innerHTML = r.compra.map((it) => `<div class="loja-pacote"><span class="loja-qtd">${it.qtd} ×</span>`
    + `${Array.from({ length: it.qtd }, () => itemSVG(it.id)).join('')}</div>`).join('<span class="loja-mais">+</span>');
  $('loja-pergunta').innerHTML = r.cfg.pergunta === 'troco'
    ? `${r.nome} pagou com <span class="loja-pagou">${notaSVG(r.cfg.nota)}</span> <b>${reais(r.cfg.nota)}</b>. Qual é o <b>troco</b>?`
    : `${r.nome} comprou isso. Quanto custa a <b>compra</b>?`;
  msgLoja(loja.feitas === 1 ? '👀 Veja o preço de cada coisa na tabela de cima.' : '');
  tocar([[523, 0.07], [659, 0.09]]);
  const caixa = $('loja-opcoes');
  caixa.innerHTML = '';
  r.opcoes.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'loja-opcao';
    b.dataset.tecla = i + 1;
    b.style.animationDelay = `${i * 90}ms`;
    b.setAttribute('aria-label', reais(o.valor));
    b.innerHTML = `<span class="loja-dinheiro">${emDinheiro(o.valor).map(notaSVG).join('')}</span><span class="loja-valor">${reais(o.valor)}</span>`;
    b.onclick = () => responderLoja(o, b);
    caixa.append(b);
  });
  depoisLoja(350, falarPergunta);
}

function responderLoja(opcao, botao) {
  const r = loja && loja.rodada;
  if (!r || r.respondida || !loja.rodando) return;
  r.respondida = true;
  const tempo = (performance.now() - r.t0) / 1000;
  const botoes = [...document.querySelectorAll('#loja-opcoes .loja-opcao')];
  botoes.forEach((b) => { b.disabled = true; });
  const tipo = TIPOS_LO[r.n - 1];
  // a conta, do jeito que a criança deve fazer: 2 × R$ 3,00 + 1 × R$ 4,00 = R$ 10,00 (e o troco)
  const conta = `${r.compra.map((it) => `${it.qtd} × ${reais(it.preco)}`).join(' + ')} = ${reais(r.total)}`;
  const explica = r.cfg.pergunta === 'troco' ? `${conta}; troco: ${reais(r.cfg.nota)} − ${reais(r.total)} = ${reais(r.certo)}` : conta;
  const certa = `${textoCompra(r.compra)}: ${explica}`;
  pararVoz();
  if (opcao.certa) {
    loja.pontos += 10 * r.n + Math.round(Math.max(0, 1 - tempo / 30) * 10);
    loja.acertos++;
    botao.classList.add('certa');
    botoes.forEach((b) => { if (b !== botao) b.classList.add('apagada'); });
    resultados.push({ m: tipo, certa, erros: [], nivel: r.n, tempo });
    loja.nivel = Math.min(LOJA.NIVEL_MAX, loja.nivel + 1);
    loja.nivelMax = Math.max(loja.nivelMax, loja.nivel);
    msgLoja(`✅ Isso! ${explica}.`, 'ok');
    SOM.certo();
    frase('', r.cfg.pergunta === 'troco' ? `Isso! O troco é ${r.certo} reais!` : `Isso! A compra custa ${r.certo} reais!`);
  } else {
    botao.classList.add('errada');
    const certoEl = botoes[r.opcoes.findIndex((o) => o.certa)];
    if (certoEl) certoEl.classList.add('certa');
    botoes.forEach((b) => { if (b !== botao && b !== certoEl) b.classList.add('apagada'); });
    resultados.push({ m: tipo, certa, erros: [`respondeu ${reais(opcao.valor)} (${opcao.motivo})`], nivel: r.n, tempo });
    loja.nivel = Math.max(1, loja.nivel - 1);
    msgLoja(`Quase! ${explica}.`, 'erro');
    SOM.errado();
    frase('', r.cfg.pergunta === 'troco' ? `Quase! O troco é ${r.certo} reais.` : `Quase! A compra custa ${r.certo} reais.`);
  }
  hudLoja();
  depoisLoja(LOJA.PAUSA + (opcao.certa ? 0 : 2200), proximaLoja);
}

function terminarLoja() {
  const { acertos, feitas, pontos, nivelMax } = loja;
  pararLoja();
  const motivos = {};
  resultados.forEach((x) => x.erros.forEach((e) => { const m = e.match(/\((.*)\)$/); if (m) motivos[m[1]] = (motivos[m[1]] || 0) + 1; }));
  const lista = Object.entries(motivos);
  missao.resumo = [
    `Acertou ${acertos} de ${feitas} compras e chegou ao nível ${nivelMax} de ${LOJA.NIVEL_MAX}.`,
    lista.length ? `Erros: ${lista.map(([t, n]) => `${t}: ${n}`).join('; ')}.` : 'Não errou nenhuma conta.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Caixa da loja nota 10! 💰' : 'Fim das compras!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitas} compras e fez ${pontos} pontos!`;
}

// teclas 1 a 3 escolhem a resposta no computador
document.addEventListener('keydown', (e) => {
  if (!loja || !$('tela-loja').classList.contains('ativa')) return;
  const b = document.querySelector(`#loja-opcoes .loja-opcao[data-tecla="${e.key}"]`);
  if (b && !b.disabled) b.click();
});

// capa do cartão: alguns materiais e uma nota
$('loja-capa').innerHTML = `<span class="loja-capa-linha">${['lapis', 'caderno', 'regua'].map((id) => itemSVG(id)).join('')}</span>`
  + `<span class="loja-capa-nota">${notaSVG(10)}</span>`;

$('btn-loja').onclick = () => { SOM.clique(); escolherProfessorE('Jogo da Loja', telaLojaMenu); };
$('loja-voltar').onclick = telaJogos;
$('btn-loja-comecar').onclick = () => { SOM.clique(); comecarLoja(); };
$('loja-sair').onclick = telaLojaMenu;
$('loja-ouvir').onclick = falarPergunta;

export { comecarLoja, LOJA, pararLoja, telaLojaMenu };
