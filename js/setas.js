/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Setas e Cores. */

import { $, embaralhar, sortear } from './util.js?v=106';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=106';
import { SOM, tocar } from './som.js?v=106';
import { mascote, mostrar, telaJogos } from './telas.js?v=106';
import { escolherProfessorE } from './professor.js?v=106';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=106';

// ---------- Setas e Cores ----------
// Atenção, memória de trabalho e flexibilidade. Em cima, a legenda: cada seta tem uma cor (roxo = ↑, verde = ↓...).
// No meio aparece uma fila de setas e embaixo as faixas de cores: o aluno troca cada seta pela cor dela e toca na faixa
// certa, na mesma ordem. Acertar sobe um nível (mais setas, depois as diagonais e mais faixas); errar desce um.
// A cada 3 ou 4 perguntas a legenda muda: o aluno precisa largar as cores de antes e olhar de novo (flexibilidade).
// As faixas erradas imitam os erros comuns: usar as cores de antes, confundir a seta com a do lado oposto
// (↑ com ↓), trocar a ordem e olhar a seta errada.
const SETAS = { PERGUNTAS: 15, NIVEL_MAX: 7, PAUSA: 1900 };
const SETA_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M6 36h50V12l38 38-38 38V64H6z"/></svg>';
// as 4 primeiras entram no nível 1; as diagonais, a partir do nível 3
const DIRECOES = [
  { id: 'cima', nome: 'para cima', giro: -90 },
  { id: 'baixo', nome: 'para baixo', giro: 90 },
  { id: 'esquerda', nome: 'para a esquerda', giro: 180 },
  { id: 'direita', nome: 'para a direita', giro: 0 },
  { id: 'cima-dir', nome: 'na diagonal para cima', giro: -45 },
  { id: 'baixo-esq', nome: 'na diagonal para baixo', giro: 135 },
];
const OPOSTA = { cima: 'baixo', baixo: 'cima', esquerda: 'direita', direita: 'esquerda', 'cima-dir': 'baixo-esq', 'baixo-esq': 'cima-dir' };
const PALETA_SETAS = [
  { nome: 'roxo', cor: '#8e44ad' },
  { nome: 'verde', cor: '#2e9e5b' },
  { nome: 'vermelho', cor: '#d81b45' },
  { nome: 'amarelo', cor: '#f5c400' },
  { nome: 'rosa', cor: '#e040c8' },
  { nome: 'azul', cor: '#1fa8e8' },
];
// quantas setas, quantas direções (4 = só ↑ ↓ ← →; 6 = com as diagonais) e quantas faixas para escolher
const NIVEIS_SETAS = [
  { setas: 1, dirs: 4, opcoes: 3 },
  { setas: 2, dirs: 4, opcoes: 3 },
  { setas: 2, dirs: 6, opcoes: 3 },
  { setas: 3, dirs: 6, opcoes: 4 },
  { setas: 4, dirs: 6, opcoes: 4 },
  { setas: 5, dirs: 6, opcoes: 4 },
  { setas: 6, dirs: 6, opcoes: 4 },
];
const TIPOS_SETAS = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: `setas${n}`, titulo: n === 1 ? '1 seta' : `${n} setas`, icone: '🧭', cor: '#8e44ad',
  regra: n === 1
    ? 'Olhar a seta, achar a mesma seta na legenda e escolher a cor dela. Confira a ponta da seta: para cima e para baixo são diferentes.'
    : `Trocar cada uma das ${n} setas pela cor dela, na mesma ordem (da esquerda para a direita), guardando as cores na cabeça até escolher a faixa.`,
}));
let setas = null;   // a partida em andamento
const direcao = (id) => DIRECOES.find((d) => d.id === id);
const corDe = (i) => PALETA_SETAS[i];

function telaSetasMenu() {
  pararSetas();
  mascote('davi-setas', 'oi');
  mostrar('tela-setas-menu');
}

function comecarSetas() {
  pararSetas();
  definirMissao({ id: 'setas', setas: true, icone: '🧭', cor: '#8e44ad', titulo: 'Setas e Cores' });
  definirResultados([]);
  setas = { nivel: 1, nivelMax: 1, feitas: 0, acertos: 0, pontos: 0, legenda: null, antiga: null, desdeTroca: 0, trocarEm: sortear([3, 4]),
    trocas: 0, aposTroca: 0, errosAposTroca: 0, pergunta: null, timers: [], rodando: true };
  mostrar('tela-setas');
  proximaSetas();
}

function pararSetas() {
  if (setas) { setas.rodando = false; setas.timers.forEach(clearTimeout); }
  setas = null;
}
const depoisSetas = (ms, fn) => { const s = setas; const t = setTimeout(() => { if (setas === s && s.rodando) fn(); }, ms); s.timers.push(t); };
const msgSetas = (texto, tipo = '') => { $('setas-msg').innerHTML = texto; $('setas-msg').className = `cores-msg ${tipo}`; };

// nova legenda: uma cor diferente para cada direção, e nenhuma direção fica com a cor que tinha antes
function novaLegenda(dirs, antiga) {
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const cores = embaralhar(PALETA_SETAS.map((_, i) => i));
    const legenda = Object.fromEntries(dirs.map((d, i) => [d, cores[i]]));
    if (!antiga || dirs.every((d) => antiga[d] !== legenda[d])) return legenda;
  }
  return Object.fromEntries(dirs.map((d, i) => [d, i]));
}

// fila de setas: pode repetir, mas não 3 iguais seguidas
function sortearFila(nv, dirs) {
  const fila = [];
  while (fila.length < nv.setas) {
    const d = sortear(dirs);
    if (fila.length >= 2 && fila[fila.length - 1] === d && fila[fila.length - 2] === d) continue;
    fila.push(d);
  }
  return fila;
}

// faixas erradas que imitam os erros comuns; cada uma guarda o motivo (vai para o relatório)
function opcoesSetas(fila, nv, legenda, antiga, logoAposTroca) {
  const certa = fila.map((d) => legenda[d]);
  const chave = (cores) => cores.join(',');
  const erradas = new Map();   // chave -> { cores, motivo }
  const juntar = (cores, motivo) => { const k = chave(cores); if (k !== chave(certa) && !erradas.has(k)) erradas.set(k, { cores, motivo }); };
  const posicao = () => Math.floor(Math.random() * fila.length);
  if (antiga && logoAposTroca && fila.every((d) => d in antiga)) juntar(fila.map((d) => antiga[d]), 'usou as cores de antes');
  { const i = posicao(); juntar(certa.map((c, k) => (k === i ? legenda[OPOSTA[fila[i]]] : c)), 'confundiu a seta com a do lado oposto'); }
  if (fila.length >= 2) {
    const pares = embaralhar(fila.slice(1).map((_, i) => i)).filter((i) => certa[i] !== certa[i + 1]);
    if (pares.length) { const i = pares[0]; const c = [...certa]; [c[i], c[i + 1]] = [c[i + 1], c[i]]; juntar(c, 'trocou a ordem'); }
  }
  const usadas = Object.values(legenda);
  for (let tentativa = 0; erradas.size < nv.opcoes - 1 && tentativa < 40; tentativa++) {
    const i = posicao();
    juntar(certa.map((c, k) => (k === i ? sortear(usadas.filter((u) => u !== c)) : c)), 'olhou a seta errada');
  }
  // as cores de antes só entram se couberem; o resto é sorteado entre os erros
  const lista = [...erradas.values()];
  const escolhidas = [lista[0], ...embaralhar(lista.slice(1))].slice(0, nv.opcoes - 1);
  return { certa, opcoes: embaralhar([{ cores: certa, certa: true }, ...escolhidas]) };
}

function proximaSetas() {
  if (setas.feitas >= SETAS.PERGUNTAS) { terminarSetas(); return; }
  const nv = NIVEIS_SETAS[setas.nivel - 1];
  const dirs = DIRECOES.slice(0, nv.dirs).map((d) => d.id);
  // troca a legenda a cada 3 ou 4 perguntas (e quando entram as diagonais)
  let mudou = false;
  if (!setas.legenda || dirs.some((d) => !(d in setas.legenda)) || setas.desdeTroca >= setas.trocarEm) {
    if (setas.legenda) { setas.antiga = setas.legenda; mudou = true; setas.trocas++; }
    setas.legenda = novaLegenda(DIRECOES.map((d) => d.id), setas.antiga);
    setas.desdeTroca = 0;
    setas.trocarEm = sortear([3, 4]);
  }
  setas.desdeTroca++;
  const fila = sortearFila(nv, dirs);
  const { certa, opcoes } = opcoesSetas(fila, nv, setas.legenda, setas.antiga, setas.desdeTroca === 1 && setas.trocas > 0);
  setas.feitas++;
  setas.pergunta = { fila, certa, opcoes, nv, aposTroca: setas.desdeTroca === 1 && setas.trocas > 0, t0: performance.now() };
  hudSetas();
  // legenda: só as direções do nível
  const leg = $('setas-legenda');
  leg.innerHTML = dirs.map((d, i) =>
    `<span class="setas-chave" style="--cor:${corDe(setas.legenda[d]).cor};--giro:${direcao(d).giro}deg;animation-delay:${i * 60}ms" title="${direcao(d).nome}: ${corDe(setas.legenda[d]).nome}">${SETA_SVG}</span>`).join('');
  leg.classList.remove('mudou');
  if (mudou) { void leg.offsetWidth; leg.classList.add('mudou'); tocar([[523, 0.08], [659, 0.08], [784, 0.12]]); }
  $('setas-fila').className = 'setas-fila';
  $('setas-fila').innerHTML = fila.map((d, i) =>
    `<span class="setas-casa" style="--giro:${direcao(d).giro}deg;animation-delay:${i * 70}ms" aria-label="${direcao(d).nome}">${SETA_SVG}</span>`).join('');
  msgSetas(mudou ? '🔄 As cores mudaram! Olhe a legenda de novo.'
    : setas.feitas === 1 ? 'Troque cada seta pela cor dela e toque na faixa certa.' : '', mudou ? 'aviso' : '');
  $('setas-respostas').innerHTML = '';
  $('setas-respostas').classList.toggle('largas', nv.setas >= 4);
  opcoes.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'setas-opcao';
    b.dataset.tecla = i + 1;
    b.style.animationDelay = `${120 + i * 70}ms`;
    b.setAttribute('aria-label', o.cores.map((c) => corDe(c).nome).join(', '));
    b.innerHTML = o.cores.map((c) => `<i style="--cor:${corDe(c).cor}"></i>`).join('');
    b.onclick = () => responderSetas(o, b);
    $('setas-respostas').append(b);
  });
}

function hudSetas() {
  $('setas-nivel').textContent = `🧭 Nível ${setas.nivel} de ${SETAS.NIVEL_MAX}`;
  $('setas-pontos').textContent = setas.pontos;
  $('setas-contador').textContent = `${setas.feitas}/${SETAS.PERGUNTAS}`;
}

const nomesCores = (cores) => cores.map((c) => corDe(c).nome).join(', ');
const miniCores = (cores) => cores.map((c) => `<span class="cores-mini" style="--cor:${corDe(c).cor}"></span>`).join(' ');

function responderSetas(opcao, botao) {
  const p = setas && setas.pergunta;
  if (!p || p.respondida || !setas.rodando) return;
  p.respondida = true;
  const tempo = (performance.now() - p.t0) / 1000;
  const botoes = [...document.querySelectorAll('#setas-respostas .setas-opcao')];
  botoes.forEach((b) => { b.disabled = true; });
  const certoEl = botoes[p.opcoes.findIndex((o) => o.certa)];
  const tipo = TIPOS_SETAS[p.fila.length - 1];
  const textoRel = `${p.fila.map((d) => direcao(d).nome).join(', ')} = ${nomesCores(p.certa)}`;
  if (p.aposTroca) setas.aposTroca++;
  // cada seta da fila ganha a sua cor, uma depois da outra (a resposta aparece no lugar da pergunta)
  const casas = [...$('setas-fila').querySelectorAll('.setas-casa')];
  casas.forEach((c, i) => depoisSetas(i * 140, () => { c.style.setProperty('--cor', corDe(p.certa[i]).cor); c.classList.add('pintada'); }));
  if (opcao.certa) {
    const rapidez = Math.max(0, 1 - tempo / 20);
    setas.pontos += 10 * setas.nivel + Math.round(rapidez * 10);
    setas.acertos++;
    botao.classList.add('certa');
    $('setas-fila').classList.add('acertou');
    resultados.push({ m: tipo, certa: textoRel, erros: [], nivel: setas.nivel, tempo });
    setas.nivel = Math.min(SETAS.NIVEL_MAX, setas.nivel + 1);
    setas.nivelMax = Math.max(setas.nivelMax, setas.nivel);
    msgSetas(`✅ Isso! ${miniCores(p.certa)}`, 'ok');
    SOM.certo();
  } else {
    const motivo = opcao.motivo || 'olhou a seta errada';
    if (p.aposTroca) setas.errosAposTroca++;
    botao.classList.add('errada');
    if (certoEl) certoEl.classList.add('certa');
    botoes.forEach((b) => { if (b !== botao && b !== certoEl) b.classList.add('apagada'); });
    const q = $('setas-fila');
    q.classList.remove('tremer'); void q.offsetWidth; q.classList.add('tremer');
    resultados.push({ m: tipo, certa: textoRel, erros: [`escolheu ${nomesCores(opcao.cores)} (${motivo})`], nivel: setas.nivel, tempo });
    setas.nivel = Math.max(1, setas.nivel - 1);
    const dica = motivo === 'usou as cores de antes' ? 'As cores mudaram: confira a legenda em cima a cada rodada. '
      : motivo === 'confundiu a seta com a do lado oposto' ? 'Olhe bem para onde aponta a ponta da seta. '
        : motivo === 'trocou a ordem' ? 'As cores vão na mesma ordem das setas, da esquerda para a direita. ' : '';
    msgSetas(`Quase! ${dica}Era ${miniCores(p.certa)}`, 'erro');
    SOM.errado();
  }
  hudSetas();
  depoisSetas(SETAS.PAUSA + (opcao.certa ? 0 : 1300), proximaSetas);
}

function terminarSetas() {
  const { acertos, feitas, pontos, nivelMax, trocas, aposTroca, errosAposTroca } = setas;
  pararSetas();
  missao.resumo = [
    `Acertou ${acertos} de ${feitas} sequências e chegou ao nível ${nivelMax} de ${SETAS.NIVEL_MAX}.`,
    trocas ? `As cores mudaram ${trocas} ${trocas === 1 ? 'vez' : 'vezes'}; logo depois da mudança, errou ${errosAposTroca} de ${aposTroca} sequências.` : 'As cores não chegaram a mudar nesta partida.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Olhos de águia! 🧭' : 'Fim das setas!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitas} sequências, chegou ao nível ${nivelMax} e fez ${pontos} pontos!`;
}

// teclas 1 a 4 escolhem a faixa no computador
document.addEventListener('keydown', (e) => {
  if (!setas || !$('tela-setas').classList.contains('ativa')) return;
  const b = document.querySelector(`#setas-respostas .setas-opcao[data-tecla="${e.key}"]`);
  if (b && !b.disabled) b.click();
});

$('btn-setas').onclick = () => { SOM.clique(); escolherProfessorE('Setas e Cores', telaSetasMenu); };
$('setas-voltar').onclick = telaJogos;
$('btn-setas-comecar').onclick = () => { SOM.clique(); comecarSetas(); };
$('setas-sair').onclick = telaSetasMenu;

export { comecarSetas, pararSetas, telaSetasMenu };
