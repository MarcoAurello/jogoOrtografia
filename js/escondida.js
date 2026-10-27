/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Palavra Escondida. */

import { $, sortear } from './util.js?v=99';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=99';
import { SOM, tocar } from './som.js?v=99';
import { mascote, mostrar, telaJogos } from './telas.js?v=99';
import { escolherProfessorE } from './professor.js?v=99';
import { segundos } from './luzes.js?v=99';
import { fimDaMissao } from './relatorio.js?v=99';

// ---------- Palavra Escondida ----------
// Atenção seletiva, leitura e rapidez. Uma pilha de 10 vagas recebe uma letra a cada 2 segundos: palavras escondidas
// chegam no meio de letras soltas e de "iscas" (pedaços do começo da palavra). A criança marca as letras da palavra
// (tocando uma depois da outra ou arrastando o dedo); quando acerta, as letras dela saem da pilha e abrem espaço.
// Pilha cheia: a letra mais antiga sai pela esquerda; se era de uma palavra ainda não achada, a palavra é perdida.
// Quanto menos tempo depois que a palavra entrou inteira, mais pontos.
// Nível 1: dica com figura; nível 2: só a categoria; nível 3: só o número de letras e palavras maiores.
const ESCONDIDA = { PALAVRAS: 10, NIVEL_MAX: 3, VAGAS: 10, INTERVALO: 2000 };
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
    regra: 'Olhar a figura, pensar no nome e procurar as letras dele em sequência no meio das letras misturadas.' },
  2: { id: 'esc2', titulo: 'Só com a categoria', icone: '🏷️', cor: '#7b4fc9',
    regra: 'Sem a figura, só com a categoria (ex.: um animal): é preciso ler as filas e reconhecer uma palavra que combina.' },
  3: { id: 'esc3', titulo: 'Só com o número de letras', icone: '🔢', cor: '#7b4fc9',
    regra: 'Sem dica de figura nem de categoria: ler as filas com atenção, ignorando as iscas (pedaços parecidos) até achar uma palavra inteira.' },
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
  escondida = { nivel: 1, nivelMax: 1, pontos: 0, acertos: 0, perdidas: 0, geradas: 0, usadas: new Set(), rodando: true,
    fila: [], pilha: [], palavras: [], proximoId: 1, sel: null };
  mostrar('tela-escondida');
  msgEscondida('As letras vão chegar! Fique de olho na dica. 👀');
  desenharPilha();
  escondida.relogio = setInterval(entraLetra, ESCONDIDA.INTERVALO);
  setTimeout(entraLetra, 400);
}

function pararEscondida() {
  if (escondida) { escondida.rodando = false; clearInterval(escondida.relogio); clearInterval(escondida.cronometro); }
  escondida = null;
}
const msgEscondida = (texto, tipo = '') => { $('escondida-msg').innerHTML = texto; $('escondida-msg').className = `escondida-msg ${tipo}`; };

// completa a fila de letras que vão chegar: letras soltas (às vezes com uma isca da próxima palavra) e a palavra
function encherFila() {
  const e = escondida;
  while (e.fila.length < 12 && e.geradas < ESCONDIDA.PALAVRAS) {
    let opcoes = PALAVRAS_ESCONDIDAS[e.nivel].filter(([p]) => !e.usadas.has(p));
    if (!opcoes.length) opcoes = PALAVRAS_ESCONDIDAS[e.nivel];
    const [palavra, figura, categoria] = sortear(opcoes);
    e.usadas.add(palavra);
    e.geradas++;
    const w = { id: e.geradas, palavra, figura, categoria, nivel: e.nivel, chegou: 0, tentativas: [], estado: 'vindo' };
    e.palavras.push(w);
    const soltas = () => (Math.random() < 0.5 ? sortear([...palavra]) : sortear([...ABC_ESCONDIDA]));
    const antes = Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => ({ l: soltas() }));
    if (Math.random() < 0.6) {   // isca: um pedaço do começo da palavra, separado dela por letras soltas
      const tam = 2 + Math.floor(Math.random() * Math.max(1, palavra.length - 3));
      antes.unshift(...[...palavra.slice(0, tam)].map((l) => ({ l })), { l: sortear([...ABC_ESCONDIDA]) });
    }
    e.fila.push(...antes, ...[...palavra].map((l, i) => ({ l, w: w.id, ultima: i === palavra.length - 1 })));
  }
  if (!e.fila.length) e.fila.push({ l: sortear([...ABC_ESCONDIDA]) });   // acabaram as palavras: só letras soltas
}

// a cada 2 s entra uma letra; com a pilha cheia, a mais antiga sai pela esquerda
function entraLetra() {
  const e = escondida;
  if (!e || !e.rodando) return;
  encherFila();
  if (e.pilha.length >= ESCONDIDA.VAGAS) {
    const saiu = e.pilha.shift();
    if (e.sel) { e.sel = { a: e.sel.a - 1, b: e.sel.b - 1 }; if (e.sel.a < 0) e.sel = null; }
    const w = saiu.w && e.palavras.find((x) => x.id === saiu.w);
    if (w && w.estado !== 'achada' && w.estado !== 'perdida') perderPalavra(w);
  }
  const nova = { ...e.fila.shift(), id: e.proximoId++, nova: true };
  e.pilha.push(nova);
  if (nova.ultima) { const w = e.palavras.find((x) => x.id === nova.w); if (w.estado === 'vindo') { w.estado = 'inteira'; w.chegou = performance.now(); } }
  tocar([[440, 0.03]]);
  desenharPilha();
  // reinicia a barrinha que mostra quando chega a próxima letra
  const ritmo = $('escondida-ritmo');
  ritmo.classList.remove('andando');
  void ritmo.offsetWidth;
  ritmo.classList.add('andando');
}

// palavra da vez: a mais antiga que ainda não foi achada nem perdida
const palavraDaVez = () => escondida.palavras.find((w) => w.estado === 'vindo' || w.estado === 'inteira');

function desenharPilha() {
  const e = escondida;
  const w = palavraDaVez();
  const letrasTxt = w ? `<b>${w.palavra.length} letras</b>` : '';
  // o tipo de dica segue o nível atual (a palavra pode ter sido sorteada antes de o nível mudar)
  $('escondida-dica').innerHTML = !w ? '<span class="escondida-figura">⏳</span><span>Esperando as letras…</span>'
    : e.nivel === 1 ? `<span class="escondida-figura">${w.figura}</span><span>Ache o nome desta figura · ${letrasTxt}</span>`
      : e.nivel === 2 ? `<span class="escondida-figura">🏷️</span><span>Ache <b>${w.categoria}</b> · ${letrasTxt}</span>`
        : `<span class="escondida-figura">🔢</span><span>Ache uma palavra de ${letrasTxt}</span>`;
  $('escondida-nivel').textContent = `🔎 Nível ${e.nivel} de ${ESCONDIDA.NIVEL_MAX}`;
  $('escondida-pontos').textContent = e.pontos;
  $('escondida-contador').textContent = `Palavra ${Math.min(ESCONDIDA.PALAVRAS, e.acertos + e.perdidas + 1)} de ${ESCONDIDA.PALAVRAS}`;
  const vagas = Array.from({ length: ESCONDIDA.VAGAS }, (_, i) => e.pilha[i]);
  $('escondida-grade').innerHTML = vagas.map((x, i) => (x
    ? `<button class="letra-escondida${x.nova ? ' entrou' : ''}${e.sel && i >= e.sel.a && i <= e.sel.b ? ' marcada' : ''}" type="button" data-i="${i}">${x.l}</button>`
    : '<span class="vaga-escondida" aria-hidden="true"></span>')).join('');
  e.pilha.forEach((x) => { x.nova = false; });
  const cheia = e.pilha.length >= ESCONDIDA.VAGAS - 1;
  $('escondida-grade').classList.toggle('quase-cheia', cheia);
}

function marcarEscondida() {
  const { sel } = escondida;
  $('escondida-grade').querySelectorAll('.letra-escondida').forEach((b) => {
    const i = Number(b.dataset.i);
    b.classList.toggle('marcada', !!sel && i >= sel.a && i <= sel.b);
  });
}

// toque: começa a marcação ou aumenta (letra vizinha); arrasto: marca do início até o dedo
let arrastoEscondida = null;
$('escondida-grade').addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.letra-escondida');
  if (!b || !escondida || !escondida.rodando) return;
  e.preventDefault();
  const i = Number(b.dataset.i), sel = escondida.sel;
  if (sel && i === sel.b + 1) sel.b = i;
  else if (sel && i === sel.a - 1) sel.a = i;
  else escondida.sel = { a: i, b: i };
  arrastoEscondida = { inicio: escondida.sel.a === i ? escondida.sel.b : escondida.sel.a, i };
  tocar([[523 + (escondida.sel.b - escondida.sel.a) * 40, 0.05]]);
  marcarEscondida();
});
document.addEventListener('pointermove', (e) => {
  if (!arrastoEscondida || !escondida || !escondida.rodando) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const b = el && el.closest('#escondida-grade .letra-escondida');
  if (!b) return;
  const j = Number(b.dataset.i), ini = arrastoEscondida.inicio;
  if (j === arrastoEscondida.i) return;
  arrastoEscondida.i = j;
  escondida.sel = { a: Math.min(ini, j), b: Math.max(ini, j) };
  tocar([[523 + (escondida.sel.b - escondida.sel.a) * 40, 0.04]]);
  marcarEscondida();
});
document.addEventListener('pointerup', () => {
  if (!arrastoEscondida) return;
  arrastoEscondida = null;
  if (escondida && escondida.rodando) conferirEscondida();
});

// confere quando a marcação tem o tamanho da palavra da vez
function conferirEscondida() {
  const e = escondida, w = palavraDaVez(), sel = e.sel;
  if (!w || !sel || sel.b - sel.a + 1 < w.palavra.length) return;
  const marcada = e.pilha.slice(sel.a, sel.b + 1).map((x) => x.l).join('');
  if (marcada === w.palavra) { acharPalavra(w, sel); return; }
  w.tentativas.push(marcada);
  e.sel = null;
  marcarEscondida();
  SOM.errado();
  const grade = $('escondida-grade');
  grade.classList.remove('tremer');
  void grade.offsetWidth;
  grade.classList.add('tremer');
  msgEscondida(`<b>${marcada}</b> não é a palavra. Procure de novo! 👀`, 'erro');
}
$('btn-escondida-limpar').onclick = () => {
  if (!escondida || !escondida.rodando) return;
  escondida.sel = null;
  marcarEscondida();
};

function acharPalavra(w, sel) {
  const e = escondida;
  const tempo = w.chegou ? (performance.now() - w.chegou) / 1000 : 0;
  // as letras da palavra sobem verdes e saem da pilha; as outras andam para a esquerda
  $('escondida-grade').querySelectorAll('.letra-escondida').forEach((b) => {
    const i = Number(b.dataset.i);
    if (i >= sel.a && i <= sel.b) b.classList.add('achada');
  });
  e.pilha.splice(sel.a, sel.b - sel.a + 1);
  e.sel = null;
  w.estado = 'achada';
  // quanto menos tempo, mais pontos: base pelo nível + bônus de rapidez; cada marcação errada tira metade do bônus
  const bonus = Math.max(0, Math.min(100, Math.round(100 - tempo * 10)));
  const ganho = 20 * e.nivel + Math.round(bonus / 2 ** w.tentativas.length);
  e.pontos += ganho;
  e.acertos++;
  resultados.push({ m: TIPOS_ESCONDIDA[e.nivel], certa: w.palavra, erros: w.tentativas.slice(), nivel: e.nivel, tempo });
  SOM.certo();
  msgEscondida(`✅ Achou <b>${w.palavra}</b>! +${ganho} pontos (${segundos(tempo)})`, 'ok');
  if (!w.tentativas.length) e.nivel = Math.min(ESCONDIDA.NIVEL_MAX, e.nivel + 1);
  e.nivelMax = Math.max(e.nivelMax, e.nivel);
  setTimeout(() => { if (escondida === e && e.rodando) { desenharPilha(); verSeAcabou(); } }, 380);
}

function perderPalavra(w) {
  const e = escondida;
  w.estado = 'perdida';
  e.perdidas++;
  resultados.push({ m: TIPOS_ESCONDIDA[e.nivel], certa: w.palavra, erros: [...w.tentativas, 'saiu da pilha sem ser achada'], nivel: e.nivel, tempo: null });
  SOM.errado();
  msgEscondida(`A palavra <b>${w.palavra}</b> saiu da pilha! Seja mais rápido na próxima. ⚡`, 'erro');
  e.nivel = Math.max(1, e.nivel - 1);
  verSeAcabou();
}

function verSeAcabou() {
  const e = escondida;
  if (e && e.acertos + e.perdidas >= ESCONDIDA.PALAVRAS) setTimeout(() => { if (escondida === e) terminarEscondida(); }, 900);
}

function terminarEscondida() {
  const e = escondida;
  pararEscondida();
  const tempos = resultados.filter((r) => !r.erros.length).map((r) => r.tempo);
  const marcacoesErradas = resultados.reduce((s, r) => s + r.erros.filter((x) => x !== 'saiu da pilha sem ser achada').length, 0);
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${e.pontos}. Chegou ao nível ${e.nivelMax} de ${ESCONDIDA.NIVEL_MAX}.`,
    `Achou ${e.acertos} de ${ESCONDIDA.PALAVRAS} palavras; ${e.perdidas} ${e.perdidas === 1 ? 'saiu' : 'saíram'} da pilha sem ser achada${e.perdidas === 1 ? '' : 's'}; ${marcacoesErradas} ${marcacoesErradas === 1 ? 'marcação errada' : 'marcações erradas'} (iscas ou pedaços).`,
    ...(tempos.length ? [`Tempo médio para achar depois que a palavra entrou inteira: ${segundos(tempos.reduce((s, x) => s + x, 0) / tempos.length)}; mais rápido: ${segundos(Math.min(...tempos))}.`] : []),
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
