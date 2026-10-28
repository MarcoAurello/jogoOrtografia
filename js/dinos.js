/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Memória dos Dinossauros. */

import { $, embaralhar, sortear } from './util.js?v=118';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=118';
import { SOM, tocar } from './som.js?v=118';
import { mascote, mostrar, telaJogos } from './telas.js?v=118';
import { escolherProfessorE } from './professor.js?v=118';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=118';

// ---------- Memória dos Dinossauros ----------
// Memória visual de sequência (memória de trabalho). Em cada rodada uma fila de
// dinossauros aparece por 3 segundos e se esconde atrás do mato. Vem a pergunta "Qual a sequência de dinossauros?"
// com 4 filas para escolher. Acertou: a próxima fila tem um dinossauro a mais (1, 2, 3...); errou: um a menos.
// As filas erradas imitam os erros de memória: trocar dois vizinhos de lugar, inverter a fila, trocar o primeiro
// com o último e trocar um dinossauro por outro.
const DINOS = { RODADAS: 12, NIVEL_MAX: 8, MOSTRAR: 3000, PAUSA: 2100 };
// desenhos 2D no estilo da folha de atividades (cabeça grande, bochecha rosada, barriga clara);
// viewBox 0 0 120 100, chão em y=90. Cada espécie recebe a cor do corpo (c) e a dos detalhes (d).
const OLHO = (x, y) => `<circle cx="${x}" cy="${y}" r="5.5" fill="#fff"/><circle cx="${x + 1}" cy="${y + 0.5}" r="3" fill="#13294b" stroke="none"/><circle cx="${x + 2}" cy="${y - 1}" r="1.1" fill="#fff" stroke="none"/>`;
const BOCHECHA = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="4.5" ry="3" fill="#ff8fa3" opacity="0.75" stroke="none"/>`;
const DESENHOS = {
  rex: (c, d) => `<path fill="${d}" d="M45 41 L37 35 L46 32 Z M40 51 L31 47 L40 43 Z M37 61 L28 59 L36 54 Z"/>
    <path fill="${c}" d="M34 74 Q16 80 5 72 Q16 66 33 61 Z"/>
    <path fill="${c}" d="M31 88 Q26 70 34 56 Q38 46 47 42 Q44 30 50 20 Q58 8 74 10 Q93 12 97 26 Q99 37 88 40 Q76 42 71 44 Q75 54 73 66 Q71 76 63 82 L65 88 L54 88 L52 84 Q47 86 43 84 L43 88 Z"/>
    <ellipse cx="57" cy="65" rx="9" ry="13" fill="#fff6c8" stroke="none"/><path d="M71 52 q7 2 9 7" fill="none"/>
    <path d="M85 33 q5 3 9 -1" fill="none" stroke-width="2.2"/>${OLHO(81, 22)}${BOCHECHA(89, 29)}`,
  triceratops: (c, d) => `<circle cx="79" cy="50" r="18" fill="${d}"/>
    <path fill="${c}" d="M17 66 Q6 64 4 57 Q12 59 19 61 Z"/>
    <path fill="${c}" d="M14 70 Q14 50 40 48 Q60 46 70 58 Q74 70 68 78 L68 88 L58 88 L57 80 L34 80 L33 88 L23 88 L22 79 Q12 78 14 70 Z"/>
    <circle cx="32" cy="60" r="3.5" fill="${d}" stroke="none"/><circle cx="44" cy="56" r="2.5" fill="${d}" stroke="none"/><circle cx="50" cy="66" r="3" fill="${d}" stroke="none"/>
    <path fill="${c}" d="M70 53 Q86 40 102 52 Q109 62 98 70 Q86 75 76 66 Q70 60 70 53 Z"/>
    <path fill="#fff" d="M83 45 L88 30 L92 46 Z M95 46 L103 33 L102 50 Z M104 58 L113 54 L106 63 Z"/>${OLHO(89, 56)}${BOCHECHA(96, 64)}`,
  estegossauro: (c, d) => `<path fill="${d}" d="M33 57 L30 42 L43 48 Z M45 49 L47 32 L57 45 Z M59 47 L65 32 L71 49 Z M73 53 L82 42 L84 57 Z"/>
    <path fill="${c}" d="M8 77 Q14 70 26 70 Q30 52 50 46 Q70 42 82 56 Q88 46 94 40 Q104 34 110 42 Q112 51 104 53 Q96 55 92 62 Q92 74 84 80 L84 88 L74 88 L73 82 L50 82 L49 88 L39 88 L39 80 Q30 80 24 78 Q14 83 8 77 Z"/>
    <circle cx="52" cy="62" r="3" fill="#fff" opacity="0.5" stroke="none"/><circle cx="64" cy="58" r="2.5" fill="#fff" opacity="0.5" stroke="none"/><circle cx="70" cy="68" r="3" fill="#fff" opacity="0.5" stroke="none"/>
    ${OLHO(103, 43)}${BOCHECHA(107, 49)}`,
  pterodactilo: (c, d) => `<path fill="${d}" d="M52 52 L33 18 Q63 24 72 50 Z"/><path d="M52 52 L33 18" fill="none" stroke="${c}" stroke-width="5"/>
    <path fill="${c}" d="M40 59 Q46 45 60 45 Q75 45 78 55 Q80 67 66 70 Q50 72 40 59 Z"/>
    <path fill="#fff6c8" d="M52 60 Q60 54 70 58 Q66 66 56 66 Z" stroke="none"/>
    <path fill="${c}" d="M73 31 L56 18 L77 28 Z"/>
    <path fill="${c}" d="M62 47 Q60 32 72 28 Q85 26 89 34 L111 38 L87 42 Q81 49 70 49 Z"/>
    <path fill="${d}" d="M58 56 Q38 54 12 72 Q40 75 62 67 Z"/><path d="M60 70 l-2 9 M68 70 l2 9" fill="none"/>
    ${OLHO(78, 34)}${BOCHECHA(83, 41)}`,
  braquiossauro: (c, d) => `<path fill="${c}" d="M15 75 Q4 77 2 70 Q9 70 16 68 Z"/>
    <path fill="${c}" d="M10 80 Q12 62 34 58 Q52 54 66 62 L72 40 Q74 18 84 12 Q96 6 102 16 Q104 26 94 28 Q88 30 86 38 L82 66 Q82 78 74 82 L74 90 L64 90 L63 84 L40 84 L39 90 L29 90 L29 84 Q18 84 10 80 Z"/>
    <circle cx="38" cy="66" r="4" fill="${d}" stroke="none"/><circle cx="50" cy="63" r="3" fill="${d}" stroke="none"/><circle cx="46" cy="72" r="2.5" fill="${d}" stroke="none"/><circle cx="60" cy="70" r="3.5" fill="${d}" stroke="none"/>
    ${OLHO(94, 16)}${BOCHECHA(98, 23)}`,
};
// os personagens da folha: as espécies aparecem em mais de uma cor (bom para treinar o olhar no detalhe)
const ESPECIES = [
  { id: 'rex-verde', especie: 'rex', nome: 'Rex verde', cor: '#8cc63f', cor2: '#f2c230' },
  { id: 'rex-laranja', especie: 'rex', nome: 'Rex laranja', cor: '#f26b21', cor2: '#ffd166' },
  { id: 'triceratops', especie: 'triceratops', nome: 'Tricerátops azul', cor: '#4d7ad8', cor2: '#9dbcf2' },
  { id: 'estego-verde', especie: 'estegossauro', nome: 'Estegossauro verde', cor: '#4caf6a', cor2: '#e8574a' },
  { id: 'estego-amarelo', especie: 'estegossauro', nome: 'Estegossauro amarelo', cor: '#f6c445', cor2: '#f08a4b' },
  { id: 'ptero-roxo', especie: 'pterodactilo', nome: 'Pterodáctilo roxo', cor: '#7b80d1', cor2: '#e8574a' },
  { id: 'ptero-lilas', especie: 'pterodactilo', nome: 'Pterodáctilo lilás', cor: '#b46bd6', cor2: '#7a3fa3' },
  { id: 'braquio-verde', especie: 'braquiossauro', nome: 'Braquiossauro verde-água', cor: '#1faa8a', cor2: '#8fe6cf' },
  { id: 'braquio-vermelho', especie: 'braquiossauro', nome: 'Braquiossauro vermelho', cor: '#e8574a', cor2: '#ffb199' },
];
const TIPOS_DINOS = Array.from({ length: DINOS.NIVEL_MAX }, (_, i) => ({
  id: `dinos${i + 1}`, titulo: i ? `Sequência de ${i + 1}` : 'Sequência de 1', icone: '🦕', cor: '#3fae5a',
  regra: i
    ? `Guardar ${i + 1} dinossauros na ordem em que apareceram (da esquerda para a direita) durante 3 segundos e reconhecer a fila igual entre 4 parecidas.`
    : 'Guardar um dinossauro durante 3 segundos e achá-lo entre 4.',
}));
let dinos = null;   // a partida em andamento

const dinoSVG = (k, classe = '', atraso = 0) => {
  const e = ESPECIES[k];
  return `<svg class="dino ${classe}" viewBox="0 0 120 100" style="--i:${atraso}" role="img" aria-label="${e.nome}"><g stroke="#13294b" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${DESENHOS[e.especie](e.cor, e.cor2)}</g></svg>`;
};
const nomes = (fila) => fila.map((k) => ESPECIES[k].nome).join(', ');

function telaDinosMenu() {
  pararDinos();
  mascote('davi-dinos', 'oi');
  mostrar('tela-dinos-menu');
}

function comecarDinos() {
  pararDinos();
  definirMissao({ id: 'dinos', dinos: true, icone: '🦕', cor: '#3fae5a', titulo: 'Memória dos Dinossauros' });
  definirResultados([]);
  dinos = { nivel: 1, nivelMax: 1, maiorAcerto: 0, feitas: 0, acertos: 0, pontos: 0, errosOrdem: 0, errosDino: 0, rodada: null, timers: [], rodando: true };
  mostrar('tela-dinos');
  proximaDinos();
}

function pararDinos() {
  if (dinos) { dinos.rodando = false; dinos.timers.forEach(clearTimeout); }
  dinos = null;
}
const depoisDinos = (ms, fn) => { const d = dinos; const t = setTimeout(() => { if (dinos === d && d.rodando) fn(); }, ms); d.timers.push(t); };
const msgDinos = (texto, tipo = '') => { $('dinos-msg').innerHTML = texto; $('dinos-msg').className = `cores-msg ${tipo}`; };

// fila sorteada sem repetir (são 9 personagens); se um dia passar disso, repete sem ficar encostado
function sortearFila(n) {
  if (n <= ESPECIES.length) return embaralhar(ESPECIES.map((_, i) => i)).slice(0, n);
  const fila = [];
  while (fila.length < n) { const k = sortear(ESPECIES.map((_, i) => i)); if (k !== fila[fila.length - 1]) fila.push(k); }
  return fila;
}

// filas erradas que imitam os erros de memória; cada uma guarda o motivo (vai para o relatório)
function opcoesDinos(fila) {
  const n = fila.length, chave = (f) => f.join(','), erradas = new Map();
  const juntar = (f, motivo) => { const k = chave(f); if (k !== chave(fila) && !erradas.has(k)) erradas.set(k, { fila: f, motivo }); };
  // o mesmo dinossauro de outra cor (Rex verde no lugar do Rex laranja): o erro de olhar só a forma
  for (const i of embaralhar(fila.map((_, j) => j))) {
    const irmao = ESPECIES.findIndex((e, k) => k !== fila[i] && e.especie === ESPECIES[fila[i]].especie);
    if (irmao >= 0 && !fila.includes(irmao)) { juntar(fila.map((k, j) => (j === i ? irmao : k)), 'trocou pela mesma espécie de outra cor'); break; }
  }
  if (n >= 2) {
    const i = Math.floor(Math.random() * (n - 1)); const f = [...fila]; [f[i], f[i + 1]] = [f[i + 1], f[i]];
    juntar(f, 'trocou dois vizinhos de lugar');
  }
  if (n >= 3) {
    juntar([...fila].reverse(), 'inverteu a fila');
    const f = [...fila]; [f[0], f[n - 1]] = [f[n - 1], f[0]]; juntar(f, 'trocou o primeiro com o último');
  }
  for (let t = 0; erradas.size < 3 + 2 && t < 50; t++) {
    const i = Math.floor(Math.random() * n);
    const outro = sortear(ESPECIES.map((_, k) => k).filter((k) => k !== fila[i] && k !== fila[i - 1] && k !== fila[i + 1]));
    juntar(fila.map((k, j) => (j === i ? outro : k)), n === 1 ? 'escolheu outro dinossauro' : 'trocou um dinossauro por outro');
  }
  // a de outra cor entra sempre que existir; as outras são sorteadas
  const todas = [...erradas.values()];
  const cor = todas.filter((o) => o.motivo.includes('outra cor'));
  const lista = [...cor, ...embaralhar(todas.filter((o) => !cor.includes(o)))].slice(0, 3);
  return embaralhar([{ fila, certa: true }, ...lista]);
}

const tempoMostrar = (n) => DINOS.MOSTRAR + Math.max(0, n - 4) * 500;   // filas longas ganham meio segundo a mais por dinossauro

function proximaDinos() {
  if (dinos.feitas >= DINOS.RODADAS) { terminarDinos(); return; }
  const n = dinos.nivel;
  const fila = sortearFila(n);
  dinos.feitas++;
  dinos.rodada = { fila, n, opcoes: opcoesDinos(fila), fase: 'mostrando' };
  hudDinos();
  $('dinos-respostas').innerHTML = '';
  $('dinos-pergunta').hidden = true;
  $('dinos-tempo').hidden = true;
  $('dinos-fila').innerHTML = '';
  mostrarFila(fila);
}

function mostrarFila(fila) {
  const r = dinos.rodada;
  r.fase = 'mostrando';
  msgDinos(dinos.feitas === 1 ? '👀 Guarde a ordem e as cores: eles vão se esconder!' : '');
  tocar([[523, 0.07], [784, 0.1]]);   // aviso curto de que a fila apareceu
  const palco = $('dinos-fila');
  palco.style.setProperty('--n', fila.length);   // cada dinossauro ocupa a sua parte da largura
  palco.innerHTML = fila.map((k, i) => dinoSVG(k, 'entra', i)).join('');
  const ms = tempoMostrar(fila.length);
  const barra = $('dinos-tempo');
  barra.hidden = false;
  barra.firstElementChild.style.animation = 'none'; void barra.offsetWidth;
  barra.firstElementChild.style.animation = `dinos-tempo ${ms}ms linear forwards`;
  depoisDinos(ms, () => esconderFila());
}

// os dinossauros se abaixam (antecipação) e somem atrás do mato; no lugar ficam pontos de interrogação
function esconderFila() {
  const r = dinos.rodada;
  r.fase = 'pergunta';
  $('dinos-tempo').hidden = true;
  $('dinos-fila').querySelectorAll('.dino').forEach((d) => d.classList.add('sai'));
  depoisDinos(450, () => {
    $('dinos-fila').innerHTML = r.fila.map((_, i) => `<span class="dinos-oculto" style="--i:${i}">?</span>`).join('');
    $('dinos-pergunta').hidden = false;
    const caixa = $('dinos-respostas');
    caixa.className = `dinos-respostas${r.n >= 4 ? ' largas' : ''}`;
    caixa.innerHTML = '';
    r.opcoes.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dinos-opcao';
      b.dataset.tecla = i + 1;
      b.style.animationDelay = `${i * 80}ms`;
      b.setAttribute('aria-label', nomes(o.fila));
      b.innerHTML = o.fila.map((k) => dinoSVG(k, 'mini')).join('');
      b.onclick = () => responderDinos(o, b);
      caixa.append(b);
    });
    r.t0 = performance.now();
  });
}

function hudDinos() {
  $('dinos-nivel').textContent = `🦕 ${dinos.nivel} ${dinos.nivel === 1 ? 'dinossauro' : 'dinossauros'}`;
  $('dinos-pontos').textContent = dinos.pontos;
  $('dinos-contador').textContent = `${dinos.feitas}/${DINOS.RODADAS}`;
}

function responderDinos(opcao, botao) {
  const r = dinos && dinos.rodada;
  if (!r || r.fase !== 'pergunta' || r.respondida || !dinos.rodando) return;
  r.respondida = true;
  const tempo = (performance.now() - r.t0) / 1000;
  const botoes = [...document.querySelectorAll('#dinos-respostas .dinos-opcao')];
  botoes.forEach((b) => { b.disabled = true; });
  const certoEl = botoes[r.opcoes.findIndex((o) => o.certa)];
  const tipo = TIPOS_DINOS[r.n - 1];
  // a fila de verdade volta a aparecer, pulando do mato (a resposta aparece no lugar da pergunta)
  $('dinos-fila').innerHTML = r.fila.map((k, i) => dinoSVG(k, 'volta', i)).join('');
  if (opcao.certa) {
    const rapidez = Math.max(0, 1 - tempo / 15);
    dinos.pontos += 10 * r.n + Math.round(rapidez * 10);
    dinos.acertos++;
    dinos.maiorAcerto = Math.max(dinos.maiorAcerto, r.n);
    botao.classList.add('certa');
    resultados.push({ m: tipo, certa: nomes(r.fila), erros: [], nivel: r.n, tempo });
    dinos.nivel = Math.min(DINOS.NIVEL_MAX, dinos.nivel + 1);
    dinos.nivelMax = Math.max(dinos.nivelMax, dinos.nivel);
    msgDinos(dinos.nivel > r.n ? `✅ Isso! Agora vão ser ${dinos.nivel} dinossauros.` : '✅ Isso! Memória de dinossauro!', 'ok');
    SOM.certo();
  } else {
    const motivo = opcao.motivo || 'trocou um dinossauro por outro';
    if (/um dinossauro|outro dinossauro|outra cor/.test(motivo)) dinos.errosDino++; else dinos.errosOrdem++;
    botao.classList.add('errada');
    if (certoEl) certoEl.classList.add('certa');
    botoes.forEach((b) => { if (b !== botao && b !== certoEl) b.classList.add('apagada'); });
    const p = $('dinos-palco');
    p.classList.remove('tremer'); void p.offsetWidth; p.classList.add('tremer');
    resultados.push({ m: tipo, certa: nomes(r.fila), erros: [`escolheu ${nomes(opcao.fila)} (${motivo})`], nivel: r.n, tempo });
    dinos.nivel = Math.max(1, dinos.nivel - 1);
    const dica = motivo.startsWith('trocou dois') ? 'Dois dinossauros trocaram de lugar. Olhe a ordem, da esquerda para a direita.'
      : motivo === 'inverteu a fila' ? 'Era a fila ao contrário! Comece pelo primeiro da esquerda.'
        : motivo.startsWith('trocou o primeiro') ? 'O primeiro e o último trocaram de lugar.'
          : motivo.includes('outra cor') ? 'Era o mesmo dinossauro, mas de outra cor! Olhe a forma e a cor.'
          : 'Um dinossauro era diferente. Tente dizer o nome de cada um baixinho enquanto olha.';
    msgDinos(`Quase! ${dica}`, 'erro');
    SOM.errado();
  }
  hudDinos();
  depoisDinos(DINOS.PAUSA + (opcao.certa ? 0 : 1500), proximaDinos);
}

function terminarDinos() {
  const { acertos, feitas, pontos, maiorAcerto, errosOrdem, errosDino } = dinos;
  pararDinos();
  missao.resumo = [
    `Acertou ${acertos} de ${feitas} sequências; a maior que acertou tinha ${maiorAcerto || 0} ${maiorAcerto === 1 ? 'dinossauro' : 'dinossauros'}.`,
    errosOrdem + errosDino ? `Erros de ordem (dinossauros certos no lugar errado): ${errosOrdem}. Erros de dinossauro (trocou um por outro ou pela mesma espécie de outra cor): ${errosDino}.` : 'Não errou nenhuma sequência.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Memória jurássica! 🦖' : 'Fim da caça aos dinossauros!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitas} sequências, a maior com ${maiorAcerto || 0} ${maiorAcerto === 1 ? 'dinossauro' : 'dinossauros'}, e fez ${pontos} pontos!`;
}

// teclas 1 a 4 escolhem a fila no computador
document.addEventListener('keydown', (e) => {
  if (!dinos || !$('tela-dinos').classList.contains('ativa')) return;
  const b = document.querySelector(`#dinos-respostas .dinos-opcao[data-tecla="${e.key}"]`);
  if (b && !b.disabled) b.click();
});

// capa do cartão na lista de jogos: três dinossauros da folha
$('dinos-capa').innerHTML = [0, 2, 3].map((k) => dinoSVG(k)).join('');

$('btn-dinos').onclick = () => { SOM.clique(); escolherProfessorE('Memória dos Dinossauros', telaDinosMenu); };
$('dinos-voltar').onclick = telaJogos;
$('btn-dinos-comecar').onclick = () => { SOM.clique(); comecarDinos(); };
$('dinos-sair').onclick = telaDinosMenu;

export { comecarDinos, ESPECIES, pararDinos, telaDinosMenu };
