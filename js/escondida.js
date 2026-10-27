/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Palavra Escondida. */

import { $, sortear } from './util.js?v=102';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=102';
import { SOM, tocar } from './som.js?v=102';
import { mascote, mostrar, telaJogos } from './telas.js?v=102';
import { escolherProfessorE } from './professor.js?v=102';
import { segundos } from './luzes.js?v=102';
import { fimDaMissao } from './relatorio.js?v=102';

// ---------- Palavra Escondida ----------
// Atenção seletiva, leitura e rapidez. As letras chegam em LINHAS: cada linha nova entra em cima e empurra as outras
// para baixo, e cada uma esconde uma palavra no meio de letras soltas e de "iscas" (pedaços do começo da palavra).
// A dica fica no começo da linha. A criança marca as letras da palavra (tocando uma depois da outra ou arrastando o
// dedo); acertou, a linha some. Com o quadro cheio, a linha de baixo (a mais antiga) cai e a palavra é perdida.
// O ritmo se ajusta: quanto mais rápido a criança acha as palavras, mais rápido entram as linhas. Marcou errado:
// entram 2 linhas de uma vez. Quanto menos tempo depois que a linha entrou, mais pontos.
// Nível 1: dica com figura; nível 2: só a primeira letra; nível 3: só o número de letras e palavras maiores.
const ESCONDIDA = { PALAVRAS: 10, NIVEL_MAX: 3, LINHAS: 6, COLUNAS: 10, RITMO_INICIAL: 7000, RITMO_MIN: 2500, RITMO_MAX: 9000 };
// [palavra, figura, categoria] (sem acentos, para as letras ficarem iguais às do teclado)
const PALAVRAS_ESCONDIDAS = {
  1: [['PEIXE', '🐟', 'um animal'], ['TIGRE', '🐯', 'um animal'], ['ZEBRA', '🦓', 'um animal'], ['PIANO', '🎹', 'um instrumento'],
    ['LIVRO', '📖', 'um objeto'], ['BOLSA', '👜', 'um objeto'], ['PRAIA', '🏖️', 'um lugar'], ['BANANA', '🍌', 'uma fruta'],
    ['MACACO', '🐒', 'um animal'], ['TOMATE', '🍅', 'um alimento'], ['GIRAFA', '🦒', 'um animal'], ['PIPOCA', '🍿', 'um alimento']],
  2: [['COELHO', '🐰', 'um animal'], ['BALEIA', '🐳', 'um animal'], ['ESCOLA', '🏫', 'um lugar'], ['SAPATO', '👞', 'uma roupa'],
    ['JANELA', '🪟', 'uma parte da casa'], ['ESCOVA', '🪥', 'um objeto'], ['CENOURA', '🥕', 'um legume'], ['ESTRELA', '⭐', 'algo do céu'],
    ['CADERNO', '📓', 'um material da escola'], ['TESOURA', '✂️', 'um objeto'], ['MORANGO', '🍓', 'uma fruta'], ['SORVETE', '🍦', 'um doce']],
  // até 9 letras: com mais, as letras ficam pequenas demais para tocar num celular pequeno
  3: [['ABACAXI', '🍍', 'uma fruta'], ['FOGUETE', '🚀', 'um transporte'], ['BICICLETA', '🚲', 'um transporte'], ['BORBOLETA', '🦋', 'um animal'],
    ['CHOCOLATE', '🍫', 'um doce'], ['TARTARUGA', '🐢', 'um animal'], ['MELANCIA', '🍉', 'uma fruta'], ['ELEFANTE', '🐘', 'um animal'],
    ['BRINQUEDO', '🧸', 'um objeto'], ['CACHORRO', '🐶', 'um animal'], ['PANQUECA', '🥞', 'um alimento'], ['MOCHILA', '🎒', 'um objeto']],
};
const TIPOS_ESCONDIDA = {
  1: { id: 'esc1', titulo: 'Com a figura de dica', icone: '🖼️', cor: '#7b4fc9',
    regra: 'Olhar a figura, pensar no nome e procurar as letras dele em sequência no meio das letras da linha.' },
  2: { id: 'esc2', titulo: 'Só com a primeira letra', icone: '🔤', cor: '#7b4fc9',
    regra: 'Sem a figura, só com a primeira letra e o tamanho: ler a linha e reconhecer uma palavra inteira que começa com ela.' },
  3: { id: 'esc3', titulo: 'Só com o número de letras', icone: '🔢', cor: '#7b4fc9',
    regra: 'Sem dica de figura nem de letra: ler a linha com atenção, ignorando as iscas (pedaços parecidos) até achar uma palavra inteira.' },
};
let escondida = null;   // a partida em andamento
const ABC_ESCONDIDA = 'ABCDEFGHIJLMNOPRSTUVZ';

function telaEscondidaMenu() {
  pararEscondida();
  mascote('davi-escondida', 'oi');
  mostrar('tela-escondida-menu');
}

function comecarEscondida() {
  pararEscondida();
  definirMissao({ id: 'escondida', escondida: true, icone: '🔎', cor: '#7b4fc9', titulo: 'Palavra Escondida (atenção, leitura e rapidez)' });
  definirResultados([]);
  escondida = { nivel: 1, nivelMax: 1, pontos: 0, acertos: 0, perdidas: 0, geradas: 0, erradas: 0, usadas: new Set(), rodando: true,
    linhas: [], proximoId: 1, sel: null, ritmo: ESCONDIDA.RITMO_INICIAL, recentes: [] };
  mostrar('tela-escondida');
  msgEscondida('As linhas vão chegar! Ache a palavra de cada uma. 👀');
  desenharLinhas();
  escondida.proxima = setTimeout(() => entraLinha(), 500);
}

function pararEscondida() {
  if (escondida) { escondida.rodando = false; clearTimeout(escondida.proxima); }
  escondida = null;
}
const msgEscondida = (texto, tipo = '') => { $('escondida-msg').innerHTML = texto; $('escondida-msg').className = `escondida-msg ${tipo}`; };

// monta uma linha: a palavra numa posição sorteada, letras soltas em volta e, se couber, uma isca (começo da palavra)
function novaLinha() {
  const e = escondida;
  let opcoes = PALAVRAS_ESCONDIDAS[e.nivel].filter(([p]) => !e.usadas.has(p));
  if (!opcoes.length) opcoes = PALAVRAS_ESCONDIDAS[e.nivel];
  const [palavra, figura, categoria] = sortear(opcoes);
  e.usadas.add(palavra);
  e.geradas++;
  const solta = () => (Math.random() < 0.5 ? sortear([...palavra]) : sortear([...ABC_ESCONDIDA]));
  const letras = Array.from({ length: ESCONDIDA.COLUNAS }, solta);
  const pos = Math.floor(Math.random() * (ESCONDIDA.COLUNAS - palavra.length + 1));
  [...palavra].forEach((l, i) => { letras[pos + i] = l; });
  // isca: um pedaço do começo da palavra no espaço que sobrou (antes ou depois), separado dela por uma letra solta
  const antes = pos - 1, depois = ESCONDIDA.COLUNAS - (pos + palavra.length) - 1;
  const espaco = Math.max(antes, depois);
  if (espaco >= 2 && Math.random() < 0.7) {
    const tam = 2 + Math.floor(Math.random() * Math.min(espaco - 1, palavra.length - 2));
    const ini = antes >= depois ? Math.floor(Math.random() * (antes - tam + 1)) : pos + palavra.length + 1 + Math.floor(Math.random() * (depois - tam + 1));
    [...palavra.slice(0, tam)].forEach((l, i) => { letras[ini + i] = l; });
  }
  return { id: e.proximoId++, letras, palavra, figura, categoria, pos, nivel: e.nivel, entrou: performance.now(), tentativas: [], nova: true };
}

// entra uma linha em cima (ou duas, depois de uma marcação errada); com o quadro cheio, a de baixo cai.
// Acabaram as palavras: no lugar de entrar linha nova, a de baixo cai (bem mais devagar), para o jogo não parar.
function entraLinha(quantas = 1, porErro = false) {
  const e = escondida;
  if (!e || !e.rodando) return;
  if (e.geradas >= ESCONDIDA.PALAVRAS) {
    if (porErro) return;
    if (e.linhas.length) perderLinha(e.linhas.pop());
    desenharLinhas();
    if (!verSeAcabou()) agendarLinha(2);
    return;
  }
  for (let k = 0; k < quantas && e.geradas < ESCONDIDA.PALAVRAS; k++) {
    if (e.linhas.length >= ESCONDIDA.LINHAS) perderLinha(e.linhas.pop());
    e.linhas.unshift(novaLinha());
  }
  tocar([[440, 0.04], [494, 0.04]]);
  desenharLinhas();
  if (!verSeAcabou()) agendarLinha(e.geradas < ESCONDIDA.PALAVRAS ? 1 : 2);
}
function agendarLinha(vezes = 1) {
  const e = escondida;
  clearTimeout(e.proxima);
  e.proxima = setTimeout(() => entraLinha(), e.ritmo * vezes);
  // a barrinha mostra quando chega a próxima linha
  const ritmo = $('escondida-ritmo');
  ritmo.classList.remove('andando');
  ritmo.style.animationDuration = `${e.ritmo * vezes}ms`;
  void ritmo.offsetWidth;
  ritmo.classList.add('andando');
}

// dica no começo da linha, conforme o nível em que a palavra foi sorteada
const dicaLinha = (x) => (x.nivel === 1 ? `<span class="dica-figura">${x.figura}</span>`
  : x.nivel === 2 ? `<span class="dica-letra">${x.palavra[0]}…<small>${x.palavra.length}</small></span>`
    : `<span class="dica-letra">${x.palavra.length}<small>letras</small></span>`);

function desenharLinhas() {
  const e = escondida;
  $('escondida-nivel').textContent = `🔎 Nível ${e.nivel} de ${ESCONDIDA.NIVEL_MAX}`;
  $('escondida-pontos').textContent = e.pontos;
  $('escondida-contador').textContent = `✅ ${e.acertos} · ❌ ${e.perdidas} · faltam ${ESCONDIDA.PALAVRAS - e.acertos - e.perdidas}`;
  $('escondida-tempo').textContent = `⏱ 1 linha / ${segundos(e.ritmo / 1000)}`;
  const cheio = e.linhas.length >= ESCONDIDA.LINHAS;
  const vagas = Array.from({ length: ESCONDIDA.LINHAS }, (_, n) => e.linhas[n]);
  $('escondida-grade').innerHTML = vagas.map((x, n) => (x
    ? `<div class="linha-escondida${x.nova ? ' entrou' : ''}${cheio && n === ESCONDIDA.LINHAS - 1 ? ' vai-cair' : ''}" data-l="${x.id}">
        <span class="dica-linha" aria-label="Dica">${dicaLinha(x)}</span>${x.letras.map((l, i) =>
          `<button class="letra-escondida${e.sel && e.sel.l === x.id && i >= e.sel.a && i <= e.sel.b ? ' marcada' : ''}" type="button" data-l="${x.id}" data-i="${i}">${l}</button>`).join('')}
      </div>`
    : '<div class="linha-escondida vazia" aria-hidden="true"></div>')).join('');
  e.linhas.forEach((x) => { x.nova = false; });
}

function marcarEscondida() {
  const { sel } = escondida;
  $('escondida-grade').querySelectorAll('.letra-escondida').forEach((b) => {
    const i = Number(b.dataset.i);
    b.classList.toggle('marcada', !!sel && Number(b.dataset.l) === sel.l && i >= sel.a && i <= sel.b);
  });
}

// toque: começa a marcação ou aumenta (letra vizinha na mesma linha); arrasto: marca do início até o dedo
let arrastoEscondida = null;
$('escondida-grade').addEventListener('pointerdown', (ev) => {
  const b = ev.target.closest('.letra-escondida');
  if (!b || !escondida || !escondida.rodando) return;
  ev.preventDefault();
  const l = Number(b.dataset.l), i = Number(b.dataset.i), sel = escondida.sel;
  if (sel && sel.l === l && i === sel.b + 1) sel.b = i;
  else if (sel && sel.l === l && i === sel.a - 1) sel.a = i;
  else escondida.sel = { l, a: i, b: i };
  arrastoEscondida = { inicio: escondida.sel.a === i ? escondida.sel.b : escondida.sel.a, i };
  tocar([[523 + (escondida.sel.b - escondida.sel.a) * 40, 0.05]]);
  marcarEscondida();
});
document.addEventListener('pointermove', (ev) => {
  if (!arrastoEscondida || !escondida || !escondida.rodando || !escondida.sel) return;
  const el = document.elementFromPoint(ev.clientX, ev.clientY);
  const b = el && el.closest('#escondida-grade .letra-escondida');
  if (!b || Number(b.dataset.l) !== escondida.sel.l) return;
  const j = Number(b.dataset.i), ini = arrastoEscondida.inicio;
  if (j === arrastoEscondida.i) return;
  arrastoEscondida.i = j;
  escondida.sel = { l: escondida.sel.l, a: Math.min(ini, j), b: Math.max(ini, j) };
  tocar([[523 + (escondida.sel.b - escondida.sel.a) * 40, 0.04]]);
  marcarEscondida();
});
document.addEventListener('pointerup', () => {
  if (!arrastoEscondida) return;
  arrastoEscondida = null;
  if (escondida && escondida.rodando) conferirEscondida();
});

// confere quando a marcação tem o tamanho da palavra daquela linha; errou: entram 2 linhas
function conferirEscondida() {
  const e = escondida, sel = e.sel;
  const x = sel && e.linhas.find((y) => y.id === sel.l);
  if (!x || sel.b - sel.a + 1 < x.palavra.length) return;
  const marcada = x.letras.slice(sel.a, sel.b + 1).join('');
  if (marcada === x.palavra) { acharPalavra(x); return; }
  x.tentativas.push(marcada);
  e.erradas++;
  e.sel = null;
  SOM.errado();
  const grade = $('escondida-grade');
  grade.classList.remove('tremer');
  void grade.offsetWidth;
  grade.classList.add('tremer');
  msgEscondida(`<b>${marcada}</b> não é a palavra. Entraram 2 linhas! 👀`, 'erro');
  entraLinha(2, true);
}
$('btn-escondida-limpar').onclick = () => {
  if (!escondida || !escondida.rodando) return;
  escondida.sel = null;
  marcarEscondida();
};

// o ritmo segue a rapidez da criança: vai, aos poucos, para um pouco mais que a média dos 3 últimos tempos para achar
function ajustarRitmo() {
  const e = escondida;
  const media = e.recentes.reduce((s, t) => s + t, 0) / e.recentes.length;
  const alvo = (media * 1.2 + 1) * 1000;
  e.ritmo = Math.round(Math.max(ESCONDIDA.RITMO_MIN, Math.min(ESCONDIDA.RITMO_MAX, e.ritmo * 0.6 + alvo * 0.4)));
}

function acharPalavra(x) {
  const e = escondida;
  const tempo = (performance.now() - x.entrou) / 1000;
  // as letras da palavra ficam verdes e a linha some
  const linha = $('escondida-grade').querySelector(`.linha-escondida[data-l="${x.id}"]`);
  linha.querySelectorAll('.letra-escondida').forEach((b) => { const i = Number(b.dataset.i); if (i >= e.sel.a && i <= e.sel.b) b.classList.add('achada'); });
  linha.classList.add('saindo');
  e.linhas = e.linhas.filter((y) => y !== x);
  e.sel = null;
  // quanto menos tempo, mais pontos: base pelo nível + bônus de rapidez; cada marcação errada tira metade do bônus
  const bonus = Math.max(0, Math.min(100, Math.round(100 - tempo * 8)));
  const ganho = 20 * x.nivel + Math.round(bonus / 2 ** x.tentativas.length);
  e.pontos += ganho;
  e.acertos++;
  e.recentes = [...e.recentes, tempo].slice(-3);
  ajustarRitmo();
  resultados.push({ m: TIPOS_ESCONDIDA[x.nivel], certa: x.palavra, erros: x.tentativas.slice(), nivel: x.nivel, tempo });
  SOM.certo();
  msgEscondida(`✅ Achou <b>${x.palavra}</b>! +${ganho} pontos (${segundos(tempo)})`, 'ok');
  if (!x.tentativas.length) e.nivel = Math.min(ESCONDIDA.NIVEL_MAX, e.nivel + 1);
  e.nivelMax = Math.max(e.nivelMax, e.nivel);
  setTimeout(() => {
    if (escondida !== e || !e.rodando) return;
    desenharLinhas();
    if (verSeAcabou()) return;
    // achou e o quadro ficou vazio: a próxima linha não demora
    if (!e.linhas.length && e.geradas < ESCONDIDA.PALAVRAS) { clearTimeout(e.proxima); e.proxima = setTimeout(() => entraLinha(), 600); }
  }, 420);
}

function perderLinha(x) {
  const e = escondida;
  e.perdidas++;
  resultados.push({ m: TIPOS_ESCONDIDA[x.nivel], certa: x.palavra, erros: [...x.tentativas, 'a linha caiu sem a palavra ser achada'], nivel: x.nivel, tempo: null });
  if (e.sel && e.sel.l === x.id) e.sel = null;
  SOM.errado();
  msgEscondida(`A linha com <b>${x.palavra}</b> caiu! Seja mais rápido na próxima. ⚡`, 'erro');
  e.nivel = Math.max(1, e.nivel - 1);
  e.ritmo = Math.min(ESCONDIDA.RITMO_MAX, Math.round(e.ritmo * 1.25));   // perdeu: as linhas vêm mais devagar
}

function verSeAcabou() {
  const e = escondida;
  if (!e || e.acertos + e.perdidas < ESCONDIDA.PALAVRAS) return false;
  clearTimeout(e.proxima);
  setTimeout(() => { if (escondida === e) terminarEscondida(); }, 900);
  return true;
}

function terminarEscondida() {
  const e = escondida;
  pararEscondida();
  const tempos = resultados.filter((r) => !r.erros.length).map((r) => r.tempo);
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${e.pontos}. Chegou ao nível ${e.nivelMax} de ${ESCONDIDA.NIVEL_MAX}.`,
    `Achou ${e.acertos} de ${ESCONDIDA.PALAVRAS} palavras; ${e.perdidas} ${e.perdidas === 1 ? 'linha caiu' : 'linhas caíram'} sem a palavra ser achada; ${e.erradas} ${e.erradas === 1 ? 'marcação errada' : 'marcações erradas'} (iscas ou pedaços), cada uma fez entrar 2 linhas.`,
    `Ritmo no fim: uma linha a cada ${segundos(e.ritmo / 1000)} (o ritmo acompanha a rapidez do aluno).`,
    ...(tempos.length ? [`Tempo médio para achar a palavra depois que a linha entrou: ${segundos(tempos.reduce((s, x) => s + x, 0) / tempos.length)}; mais rápido: ${segundos(Math.min(...tempos))}.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = e.perdidas === 0 ? 'Olhos de águia! 🦅' : 'Fim da busca!';
  $('fim-texto').textContent = `${aluno}, você achou ${e.acertos} de ${ESCONDIDA.PALAVRAS} palavras e fez ${e.pontos} pontos!`;
}

$('btn-escondida').onclick = () => { SOM.clique(); escolherProfessorE('Palavra Escondida', telaEscondidaMenu); };
$('escondida-voltar').onclick = telaJogos;
$('btn-escondida-comecar').onclick = () => { SOM.clique(); comecarEscondida(); };
$('escondida-sair').onclick = telaEscondidaMenu;

export { comecarEscondida, ESCONDIDA, pararEscondida, telaEscondidaMenu };
