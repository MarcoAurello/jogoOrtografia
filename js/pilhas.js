/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Pilhas de Cores. */

import { $, embaralhar, sortear } from './util.js?v=185';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=185';
import { SOM, tocar } from './som.js?v=185';
import { mascote, mostrar, telaJogos } from './telas.js?v=185';
import { escolherProfessorE } from './professor.js?v=185';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=185';

// ---------- Pilhas de Cores ----------
// Planejamento e funções executivas (parecido com a Torre de Hanói). São 4 cores: três com 5 bolinhas e uma com 4,
// em colunas que cabem 5 bolinhas cada. Só sai a bolinha de cima, uma por vez, e ela vai para uma coluna que tenha
// lugar. A fase termina quando cada cor está inteira numa coluna só.
// Fases 1 e 2: 4 colunas e um único lugar vazio (aquecimento: só as bolinhas de cima se mexem, resolve em até 4
// movimentos). Da fase 3 em diante entra uma 5ª coluna (6 lugares a mais) e as cores ficam bem mais misturadas.
// As fases nascem da arrumação pronta embaralhada com jogadas de verdade (de trás para a frente), então sempre têm
// solução. A referência do relatório é o menor número de movimentos (calculado quando dá) ou o do embaralho.
const PILHAS = { FASES: 6, NIVEL_MAX: 6, ALTURA: 5, PAUSA: 1800 };
// colunas, jogadas para embaralhar e quantas trocas de cor (vizinhas de cores diferentes) a fase precisa ter
const FASES_PILHAS = [
  { colunas: 4, passos: 6, mistura: 2 },
  { colunas: 4, passos: 10, mistura: 4 },
  { colunas: 5, passos: 10, mistura: 6 },
  { colunas: 5, passos: 14, mistura: 8 },
  { colunas: 5, passos: 18, mistura: 10 },
  { colunas: 5, passos: 24, mistura: 12 },
];
// cada cor tem um símbolo dentro, para quem confunde cores também conseguir jogar
const CORES = [
  { nome: 'vermelha', cor: '#e53935', sombra: '#9c1f1c', sinal: '♥' },
  { nome: 'azul', cor: '#1e64d2', sombra: '#103f8c', sinal: '●' },
  { nome: 'amarela', cor: '#f5c400', sombra: '#a98500', sinal: '★' },
  { nome: 'verde', cor: '#2e9e5b', sombra: '#1b6b3b', sinal: '▲' },
];
const TIPOS_PILHAS = FASES_PILHAS.map((f, i) => ({
  id: `pilhas${i + 1}`, titulo: `Fase ${i + 1} (${f.colunas} colunas)`, icone: '🎨', cor: '#e5731f',
  regra: f.colunas === 4
    ? 'Separar as cores com um só lugar vazio, movendo a bolinha de cima, uma por vez.'
    : 'Separar as cores usando a coluna vazia como apoio, movendo a bolinha de cima, uma por vez.',
}));
let pilhas = null;   // a partida em andamento

const copiar = (cols) => cols.map((c) => [...c]);
// cada coluna de uma cor só e cada cor numa coluna só (com a 5ª coluna, uma fica vazia)
const resolvido = (cols) => cols.every((c) => c.every((b) => b === c[0])) && cols.filter((c) => c.length).length === CORES.length;
// quantas vezes, subindo cada coluna, a cor muda: 0 é tudo arrumado
const mistura = (cols) => cols.reduce((s, c) => s + c.filter((b, i) => i && b !== c[i - 1]).length, 0);
const jogadasDe = (cols, ultima) => {
  const lista = [];
  cols.forEach((de, i) => cols.forEach((para, j) => {
    if (i !== j && de.length && para.length < PILHAS.ALTURA && !(ultima && ultima[0] === j && ultima[1] === i)) lista.push([i, j]);
  }));
  return lista;
};

// menor número de movimentos (busca em largura); desiste depois de LIMITE posições e devolve null
function minimoDeMovimentos(inicio, limite = 60000) {
  const chave = (cols) => cols.map((c) => c.join('')).join('|');
  const vistos = new Set([chave(inicio)]);
  let fila = [inicio];
  for (let d = 0; fila.length; d++) {
    const proxima = [];
    for (const cols of fila) {
      if (resolvido(cols)) return d;
      for (const [i, j] of jogadasDe(cols, null)) {
        const n = copiar(cols); n[j].push(n[i].pop());
        const k = chave(n);
        if (vistos.has(k)) continue;
        vistos.add(k);
        if (vistos.size > limite) return null;
        proxima.push(n);
      }
    }
    fila = proxima;
  }
  return null;
}

// arrumação pronta (cada coluna de uma cor, uma delas com 4) embaralhada com jogadas válidas, sem desfazer a anterior
function novaFase(n) {
  const { colunas, passos, mistura: alvo } = FASES_PILHAS[n - 1];
  let melhor = null;
  for (let t = 0; t < 300; t++) {
    const cores = embaralhar([0, 1, 2, 3]);
    const cols = cores.map((c, i) => Array(i === 3 ? PILHAS.ALTURA - 1 : PILHAS.ALTURA).fill(c));
    while (cols.length < colunas) cols.push([]);
    const ordem = embaralhar(cols);
    let ultima = null;
    for (let p = 0; p < passos; p++) {
      const [i, j] = sortear(jogadasDe(ordem, ultima));
      ordem[j].push(ordem[i].pop());
      ultima = [i, j];
    }
    if (resolvido(ordem)) continue;
    const m = mistura(ordem);
    if (!melhor || m > melhor.m) melhor = { cols: ordem, m };
    if (m >= alvo) break;
  }
  // com 4 colunas a busca é instantânea; com 5 ela fica grande demais e o embaralho serve de referência (sempre dá)
  return { cols: melhor.cols, ref: (colunas === 4 && minimoDeMovimentos(melhor.cols)) || passos };
}

function telaPilhasMenu() {
  pararPilhas();
  mascote('davi-pilhas', 'oi');
  mostrar('tela-pilhas-menu');
}

function comecarPilhas() {
  pararPilhas();
  definirMissao({ id: 'pilhas', pilhas: true, icone: '🎨', cor: '#e5731f', titulo: 'Pilhas de Cores' });
  definirResultados([]);
  pilhas = { fase: 0, pontos: 0, movimentosTotal: 0, cheias: 0, vaiVolta: 0, recomecos: 0, pulos: 0, rodada: null, timers: [], rodando: true };
  mostrar('tela-pilhas');
  proximaPilhas();
}

function pararPilhas() {
  if (pilhas) { pilhas.rodando = false; pilhas.timers.forEach(clearTimeout); }
  pilhas = null;
}
const depoisPilhas = (ms, fn) => { const p = pilhas; const t = setTimeout(() => { if (pilhas === p && p.rodando) fn(); }, ms); p.timers.push(t); };
const msgPilhas = (texto, tipo = '') => { $('pilhas-msg').innerHTML = texto; $('pilhas-msg').className = `cores-msg ${tipo}`; };

function proximaPilhas() {
  if (pilhas.fase >= PILHAS.FASES) { terminarPilhas(); return; }
  pilhas.fase++;
  const { cols: inicio, ref } = novaFase(pilhas.fase);
  pilhas.rodada = { inicio, cols: copiar(inicio), ref, movimentos: 0, cheias: 0, vaiVolta: 0, recomecos: 0,
    escolhida: null, ultima: null, terminou: false, t0: performance.now() };
  $('pilhas-pular').hidden = true;
  msgPilhas(pilhas.fase === 1 ? '👆 Toque numa coluna para pegar a bolinha de cima e depois na coluna onde quer colocar.' : pilhas.fase === 3 ? '✨ Agora são 5 colunas: sobra mais espaço para ajudar, mas as cores estão bem mais misturadas!' : `Fase ${pilhas.fase}: as cores estão mais misturadas!`);
  hudPilhas();
  desenharPilhas('nasce');
}

function hudPilhas() {
  const r = pilhas.rodada;
  $('pilhas-nivel').textContent = `🎨 Fase ${pilhas.fase} de ${PILHAS.FASES}`;
  $('pilhas-pontos').textContent = pilhas.pontos;
  $('pilhas-movimentos').textContent = r ? r.movimentos : 0;
}

// cada coluna é um botão; as bolinhas empilham de baixo para cima. "chegou" marca a bolinha que acabou de cair.
function desenharPilhas(efeito = '', chegou = -1) {
  const r = pilhas.rodada;
  const caixa = $('pilhas-colunas');
  caixa.classList.toggle('cinco', r.cols.length > 4);
  caixa.innerHTML = '';
  r.cols.forEach((col, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pilhas-coluna${r.escolhida === i ? ' escolhida' : ''}${r.terminou ? ' pronta' : ''}`;
    b.dataset.tecla = i + 1;
    b.setAttribute('aria-label', `Coluna ${i + 1}: ${col.length ? col.map((k) => CORES[k].nome).join(', ') : 'vazia'} (de baixo para cima)`);
    b.innerHTML = Array.from({ length: PILHAS.ALTURA }, (_, k) => {
      if (k >= col.length) return '<span class="pilhas-vaga"></span>';
      const c = CORES[col[k]];
      const classe = [efeito === 'nasce' ? 'nasce' : '', i === chegou && k === col.length - 1 ? 'chegou' : '', r.escolhida === i && k === col.length - 1 ? 'no-ar' : ''].join(' ');
      return `<span class="pilhas-bola ${classe}" style="--cor:${c.cor};--sombra:${c.sombra};--i:${i * PILHAS.ALTURA + k}">${c.sinal}</span>`;
    }).join('');
    b.onclick = () => tocarColuna(i);
    caixa.append(b);
  });
}

function tremerColuna(i) {
  const b = $('pilhas-colunas').children[i];
  if (!b) return;
  b.classList.remove('tremer'); void b.offsetWidth; b.classList.add('tremer');
}

function tocarColuna(i) {
  const r = pilhas && pilhas.rodada;
  if (!r || r.terminou || !pilhas.rodando) return;
  if (r.escolhida === null) {
    if (!r.cols[i].length) return;
    r.escolhida = i;
    tocar([[523, 0.06]]);
    desenharPilhas();
    return;
  }
  const de = r.escolhida;
  r.escolhida = null;
  if (de === i) { desenharPilhas(); return; }   // tocou na mesma coluna: solta a bolinha de volta
  if (r.cols[i].length >= PILHAS.ALTURA) {
    r.cheias++;
    pilhas.cheias++;
    desenharPilhas();
    tremerColuna(i);
    msgPilhas('Essa coluna está cheia! Escolha uma que tenha lugar vazio.', 'erro');
    tocar([[220, 0.12, 'square']]);
    return;
  }
  // levar a bolinha de volta para onde ela estava logo antes é um movimento perdido
  if (r.ultima && r.ultima[0] === i && r.ultima[1] === de) { r.vaiVolta++; pilhas.vaiVolta++; }
  r.cols[i].push(r.cols[de].pop());
  r.ultima = [de, i];
  r.movimentos++;
  pilhas.movimentosTotal++;
  tocar([[392 + i * 90, 0.08], [523 + i * 90, 0.08]]);
  msgPilhas('');
  if (r.movimentos >= r.ref * 3 + 10) $('pilhas-pular').hidden = false;
  hudPilhas();
  if (resolvido(r.cols)) { faseCompleta(); return; }
  desenharPilhas('', i);
}

function faseCompleta() {
  const r = pilhas.rodada;
  r.terminou = true;
  const tempo = (performance.now() - r.t0) / 1000;
  const tipo = TIPOS_PILHAS[pilhas.fase - 1];
  const sobra = Math.max(0, r.movimentos - r.ref);
  pilhas.pontos += Math.max(20, 100 - sobra * 3);
  const erros = [];
  if (r.movimentos > Math.ceil(r.ref * 1.5) + 2) erros.push(`usou ${r.movimentos} movimentos (referência: ${r.ref})`);
  if (r.vaiVolta >= 3) erros.push(`levou a bolinha de volta para onde estava ${r.vaiVolta} vezes`);
  if (r.recomecos) erros.push(`recomeçou a fase ${r.recomecos} ${r.recomecos === 1 ? 'vez' : 'vezes'}`);
  resultados.push({ m: tipo, certa: `Fase ${pilhas.fase}: separou as cores em ${r.movimentos} movimentos`, erros, nivel: pilhas.fase, tempo, ref: r.ref });
  hudPilhas();
  desenharPilhas('', -1);
  $('pilhas-pular').hidden = true;
  msgPilhas(r.movimentos <= r.ref ? `✅ Perfeito! Só ${r.movimentos} movimentos. Que planejamento!` : `✅ Cores separadas em ${r.movimentos} movimentos!`, 'ok');
  SOM.certo();
  depoisPilhas(PILHAS.PAUSA, proximaPilhas);
}

function recomecarFase() {
  const r = pilhas && pilhas.rodada;
  if (!r || r.terminou || !r.movimentos) return;
  SOM.clique();
  r.cols = copiar(r.inicio);
  r.recomecos++;
  pilhas.recomecos++;
  r.escolhida = null;
  r.ultima = null;
  msgPilhas('↺ A fase voltou ao começo. Pense antes de mexer: qual cor dá para juntar primeiro?');
  desenharPilhas('nasce');
}

// muitas jogadas sem conseguir: deixa passar para a próxima fase (vai para o relatório)
function pularFase() {
  const r = pilhas && pilhas.rodada;
  if (!r || r.terminou) return;
  r.terminou = true;
  pilhas.pulos++;
  const tempo = (performance.now() - r.t0) / 1000;
  resultados.push({ m: TIPOS_PILHAS[pilhas.fase - 1], certa: `Fase ${pilhas.fase}: não terminou`, erros: [`pulou a fase depois de ${r.movimentos} movimentos`], nivel: pilhas.fase, tempo, ref: r.ref });
  $('pilhas-pular').hidden = true;
  msgPilhas('Tudo bem! Vamos para a próxima fase.', 'erro');
  SOM.errado();
  depoisPilhas(PILHAS.PAUSA, proximaPilhas);
}

function terminarPilhas() {
  const { pontos, movimentosTotal, cheias, vaiVolta, recomecos, pulos } = pilhas;
  const feitas = resultados.filter((x) => !x.certa.includes('não terminou')).length;
  const refTotal = resultados.reduce((s, x) => s + (x.ref || 0), 0);
  pararPilhas();
  missao.resumo = [
    `Completou ${feitas} de ${PILHAS.FASES} fases com ${movimentosTotal} movimentos no total (referência: ${refTotal}).`,
    `Movimentos perdidos (bolinha de volta para onde estava): ${vaiVolta}. Toques em coluna cheia: ${cheias}. Recomeços: ${recomecos}.${pulos ? ` Fases puladas: ${pulos}.` : ''}`,
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Mestre das cores! 🎨' : 'Fim das Pilhas de Cores!';
  $('fim-texto').textContent = `${aluno}, você separou as cores em ${feitas} de ${PILHAS.FASES} fases e fez ${pontos} pontos!`;
}

// teclas 1 a 4 escolhem a coluna no computador
document.addEventListener('keydown', (e) => {
  if (!pilhas || !$('tela-pilhas').classList.contains('ativa')) return;
  const b = document.querySelector(`#pilhas-colunas .pilhas-coluna[data-tecla="${e.key}"]`);
  if (b) b.click();
});

// capa do cartão: quatro colunas misturadas
$('pilhas-capa').innerHTML = [[0, 1, 2, 3, 0], [2, 3, 1, 1, 0], [3, 2, 0, 2], [1, 3, 2, 0, 1]].map((col) =>
  `<i>${col.map((k) => `<b style="--cor:${CORES[k].cor};--sombra:${CORES[k].sombra}"></b>`).join('')}</i>`).join('');

$('btn-pilhas').onclick = () => { SOM.clique(); escolherProfessorE('Pilhas de Cores', telaPilhasMenu); };
$('pilhas-voltar').onclick = telaJogos;
$('btn-pilhas-comecar').onclick = () => { SOM.clique(); comecarPilhas(); };
$('pilhas-sair').onclick = telaPilhasMenu;
$('pilhas-recomecar').onclick = recomecarFase;
$('pilhas-pular').onclick = pularFase;

export { comecarPilhas, PILHAS, pararPilhas, telaPilhasMenu };
