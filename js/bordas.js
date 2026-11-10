/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Cores da Borda. */

import { $, embaralhar } from './util.js?v=260';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=260';
import { frase, pararVoz, SOM, tocar } from './som.js?v=260';
import { mascote, mostrar, telaJogos } from './telas.js?v=260';
import { escolherProfessorE } from './professor.js?v=260';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=260';

// ---------- Cores da Borda ----------
// Atenção, percepção visual e coordenação de duas referências (linha e coluna): um tabuleiro com cores nas bordas
// (em cima e embaixo de cada coluna, à esquerda e à direita de cada linha). Entra uma figura por vez, com bolinhas em
// cruz: a de cima é a cor da borda de cima, a da esquerda é a cor da borda da esquerda, e assim por diante. A criança
// toca no quadrado cujas bordas têm exatamente essas cores; a figura fica nele. Errou: o quadrado treme, a dica diz o
// que estava certo (a linha ou a coluna) e ela tenta de novo; depois de 2 erros, a linha e a coluna certas acendem.
// Cada tabuleiro tem 4 figuras; sem erro sobe um nível, com 2 erros ou mais desce.
// As cores não se repetem num mesmo lado (assim a resposta é única); podem se repetir em lados diferentes.
// Do nível 3 em diante, depois de cada figura as colunas e as linhas trocam de lugar (as cores das bordas mudam):
// não dá para decorar onde estava cada cor. As figuras já colocadas vão junto com a coluna e a linha delas.
const BORDAS = { TABULEIROS: 6, FIGURAS: 4, NIVEL_MAX: 6, PAUSA: 1100 };   // 6 tabuleiros: quem não erra chega ao 4 x 6
const NIVEIS_BO = [
  { col: 2, lin: 2, lados: 2, titulo: 'Tabuleiro 2 x 2 (cima e esquerda)' },
  { col: 3, lin: 3, lados: 2, titulo: 'Tabuleiro 3 x 3 (cima e esquerda)' },
  { col: 3, lin: 3, lados: 4, muda: true, titulo: 'Tabuleiro 3 x 3 (as quatro bordas; as cores mudam)' },
  { col: 4, lin: 4, lados: 4, muda: true, titulo: 'Tabuleiro 4 x 4 (as cores mudam)' },
  { col: 4, lin: 5, lados: 4, muda: true, titulo: 'Tabuleiro 4 x 5 (as cores mudam)' },
  { col: 4, lin: 6, lados: 4, muda: true, titulo: 'Tabuleiro 4 x 6 (as cores mudam)' },
];
const TIPOS_BO = NIVEIS_BO.map((c, i) => ({
  id: `bordas${i + 1}`, titulo: `Nível ${i + 1}: ${c.titulo}`, icone: '🎨', cor: '#e5731f',
  regra: c.lados === 2
    ? 'Achar a coluna pela cor de cima e a linha pela cor da esquerda: o quadrado fica onde as duas se encontram.'
    : 'Usar duas cores para achar a coluna (cima e embaixo) e duas para a linha (esquerda e direita); conferir as quatro antes de tocar.',
}));
// cores bem diferentes entre si (sem dois azuis ou dois verdes parecidos)
const PALETA = [
  ['vermelho', '#e53935'], ['azul', '#1e64d2'], ['amarelo', '#f5c518'], ['verde', '#2e9e5b'], ['roxo', '#8e44ad'],
  ['laranja', '#f08a24'], ['rosa', '#ec4899'], ['marrom', '#7a4a2a'], ['azul-claro', '#38bdf8'],
];
const COR_DE = Object.fromEntries(PALETA);
let bordas = null;   // a partida em andamento

function novoTabuleiro(nivel) {
  const cfg = NIVEIS_BO[nivel - 1];
  const nomes = PALETA.map(([n]) => n);
  const tab = { cfg, cima: embaralhar(nomes).slice(0, cfg.col), esquerda: embaralhar(nomes).slice(0, cfg.lin) };
  // em cada coluna, a cor de cima e a de baixo são diferentes (e o mesmo para a linha), para não parecer repetido
  const outroLado = (frente, n) => {
    for (let t = 0; t < 60; t++) { const s = embaralhar(nomes).slice(0, n); if (s.every((x, i) => x !== frente[i])) return s; }
    return embaralhar(nomes).slice(0, n);
  };
  tab.baixo = outroLado(tab.cima, cfg.col);
  tab.direita = outroLado(tab.esquerda, cfg.lin);
  // as casas das figuras deste tabuleiro (sem repetir)
  const casas = [];
  for (let l = 0; l < cfg.lin; l++) for (let c = 0; c < cfg.col; c++) casas.push({ c, l });
  tab.fila = embaralhar(casas).slice(0, Math.min(BORDAS.FIGURAS, casas.length));
  tab.colocadas = [];
  return tab;
}

// a figura de uma casa: bolinhas em cruz com as cores das bordas
function figuraSVG(tab, { c, l }, classe = '') {
  const bola = (x, y, cor) => `<circle cx="${x}" cy="${y}" r="10.5" fill="${COR_DE[cor]}" stroke="#13294b" stroke-width="1.6"/>`;
  const quatro = tab.cfg.lados === 4;
  return `<svg class="bordas-figura ${classe}" viewBox="0 0 60 60" role="img" aria-label="Figura: em cima ${tab.cima[c]}, à esquerda ${tab.esquerda[l]}${quatro ? `, à direita ${tab.direita[l]}, embaixo ${tab.baixo[c]}` : ''}">`
    + `${bola(30, 12, tab.cima[c])}${bola(12, 30, tab.esquerda[l])}${quatro ? bola(48, 30, tab.direita[l]) + bola(30, 48, tab.baixo[c]) : ''}</svg>`;
}

// troca a ordem das colunas e das linhas (com as cores das bordas e as figuras já postas); nunca deixa igual
function mudarCores(tab) {
  const perm = (n) => { let p; do p = embaralhar([...Array(n).keys()]); while (n > 1 && p.every((v, i) => v === i)); return p; };
  const pc = perm(tab.cfg.col), pl = perm(tab.cfg.lin);   // nova posição i recebe a antiga p[i]
  tab.cima = pc.map((i) => tab.cima[i]);
  tab.baixo = pc.map((i) => tab.baixo[i]);
  tab.esquerda = pl.map((i) => tab.esquerda[i]);
  tab.direita = pl.map((i) => tab.direita[i]);
  const mover = (p) => ({ c: pc.indexOf(p.c), l: pl.indexOf(p.l) });
  tab.colocadas = tab.colocadas.map(mover);
  tab.fila = tab.fila.map(mover);
}

function desenharTabuleiro() {
  const tab = bordas.tab, { col, lin, lados } = tab.cfg;
  const el = $('bordas-tabuleiro');
  el.style.setProperty('--col', col);
  el.style.setProperty('--lin', lin);
  el.style.aspectRatio = `${col + 0.7} / ${lin + 0.7}`;
  el.style.width = `min(100%, calc(var(--bordas-alto) * ${(col + 0.7) / (lin + 0.7)}), 520px)`;
  const tira = (cor, onde) => `<span class="bordas-tira ${onde}" style="background:${COR_DE[cor]}" aria-hidden="true"></span>`;
  const partes = ['<span></span>'];
  for (let c = 0; c < col; c++) partes.push(tira(tab.cima[c], 'cima'));
  partes.push('<span></span>');
  for (let l = 0; l < lin; l++) {
    partes.push(tira(tab.esquerda[l], 'esq'));
    for (let c = 0; c < col; c++) {
      const posta = tab.colocadas.find((p) => p.c === c && p.l === l);
      partes.push(`<button type="button" class="bordas-casa${posta ? ' ocupada' : ''}" data-c="${c}" data-l="${l}" aria-label="Linha ${l + 1}, coluna ${c + 1}">${posta ? figuraSVG(tab, posta) : ''}</button>`);
    }
    partes.push(lados === 4 ? tira(tab.direita[l], 'dir') : '<span></span>');
  }
  partes.push('<span></span>');
  for (let c = 0; c < col; c++) partes.push(lados === 4 ? tira(tab.baixo[c], 'baixo') : '<span></span>');
  partes.push('<span></span>');
  el.innerHTML = partes.join('');
}

function telaBordasMenu() {
  pararBordas();
  mascote('davi-bordas', 'oi');
  mostrar('tela-bordas-menu');
}

function comecarBordas() {
  pararBordas();
  definirMissao({ id: 'bordas', bordas: true, icone: '🎨', cor: '#e5731f', titulo: 'Cores da Borda' });
  definirResultados([]);
  bordas = { nivel: 1, nivelMax: 1, tabuleiros: 0, figuras: 0, primeira: 0, pontos: 0, errosLinha: 0, errosColuna: 0, errosAmbos: 0,
    tab: null, atual: null, timers: [], rodando: true };
  mostrar('tela-bordas');
  proximoTabuleiro();
}

function pararBordas() {
  if (bordas) { bordas.rodando = false; bordas.timers.forEach(clearTimeout); pararVoz(); }
  bordas = null;
}
const depoisBordas = (ms, fn) => { const p = bordas; const t = setTimeout(() => { if (bordas === p && p.rodando) fn(); }, ms); p.timers.push(t); };
const msgBordas = (texto, tipo = '') => { $('bordas-msg').innerHTML = texto; $('bordas-msg').className = `cores-msg ${tipo}`; };

function hudBordas() {
  $('bordas-nivel').textContent = `🎨 Nível ${bordas.nivel}`;
  $('bordas-pontos').textContent = bordas.pontos;
  $('bordas-contador').textContent = `${bordas.tabuleiros}/${BORDAS.TABULEIROS}`;
}

function proximoTabuleiro() {
  if (bordas.tabuleiros >= BORDAS.TABULEIROS) { terminarBordas(); return; }
  bordas.tabuleiros++;
  bordas.tab = novoTabuleiro(bordas.nivel);
  bordas.tab.n = bordas.nivel;
  bordas.tab.erros = 0;
  hudBordas();
  desenharTabuleiro();
  tocar([[523, 0.07], [659, 0.09], [784, 0.1]]);
  proximaFigura();
}

function proximaFigura() {
  const tab = bordas.tab;
  if (tab.colocadas.length >= tab.fila.length) {
    // fim do tabuleiro: sem erro sobe, com 2 erros ou mais desce
    if (tab.erros === 0) bordas.nivel = Math.min(BORDAS.NIVEL_MAX, bordas.nivel + 1);
    else if (tab.erros >= 2) bordas.nivel = Math.max(1, bordas.nivel - 1);
    bordas.nivelMax = Math.max(bordas.nivelMax, bordas.nivel);
    msgBordas(tab.erros === 0 ? '🌟 Tabuleiro completo sem errar!' : '✅ Tabuleiro completo!', 'ok');
    depoisBordas(1500, proximoTabuleiro);
    return;
  }
  const casa = tab.fila[tab.colocadas.length];
  bordas.atual = { casa, erros: [], t0: performance.now() };
  $('bordas-vez').innerHTML = figuraSVG(tab, casa, 'entra');
  $('bordas-falta').textContent = `Figura ${tab.colocadas.length + 1} de ${tab.fila.length}`;
  document.querySelectorAll('#bordas-tabuleiro .acesa').forEach((e) => e.classList.remove('acesa'));
  if (bordas.figuras === 0) msgBordas(tab.cfg.lados === 2 ? '👆 Ache a coluna pela cor de cima e a linha pela cor da esquerda.' : '👆 Confira as quatro cores das bordas!');
  else if (!tab.colocadas.length) msgBordas(tab.cfg.muda ? '🔀 Atenção: neste tabuleiro as cores mudam de lugar!' : '');
}

function tocarCasa(botao) {
  const a = bordas && bordas.atual, tab = bordas && bordas.tab;
  if (!a || !bordas.rodando || botao.classList.contains('ocupada')) return;
  const c = Number(botao.dataset.c), l = Number(botao.dataset.l);
  const tipo = TIPOS_BO[tab.n - 1];
  if (c === a.casa.c && l === a.casa.l) {
    const tempo = (performance.now() - a.t0) / 1000;
    bordas.atual = null;
    bordas.figuras++;
    if (!a.erros.length) bordas.primeira++;
    bordas.pontos += [10 * tab.n, 4 * tab.n, tab.n][Math.min(2, a.erros.length)] + (a.erros.length ? 0 : Math.round(Math.max(0, 1 - tempo / 15) * 5));
    const lados = tab.cfg.lados === 4 ? `cima ${tab.cima[c]}, esquerda ${tab.esquerda[l]}, direita ${tab.direita[l]}, embaixo ${tab.baixo[c]}` : `cima ${tab.cima[c]}, esquerda ${tab.esquerda[l]}`;
    resultados.push({ m: tipo, certa: `Linha ${l + 1}, coluna ${c + 1} (${lados})`, erros: a.erros, nivel: tab.n, tempo });
    tab.colocadas.push({ c, l });
    desenharTabuleiro();
    document.querySelector(`#bordas-tabuleiro .bordas-casa[data-c="${c}"][data-l="${l}"]`)?.classList.add('certa');
    msgBordas(a.erros.length ? '✅ Achou!' : '✅ Isso!', 'ok');
    SOM.certo();
    hudBordas();
    // do nível 3 em diante, as cores das bordas mudam antes da próxima figura
    if (tab.cfg.muda && tab.colocadas.length < tab.fila.length) {
      depoisBordas(BORDAS.PAUSA, () => {
        mudarCores(tab);
        desenharTabuleiro();
        $('bordas-tabuleiro').classList.remove('mudou'); void $('bordas-tabuleiro').offsetWidth; $('bordas-tabuleiro').classList.add('mudou');
        tocar([[392, 0.06], [523, 0.06], [440, 0.08]]);
        msgBordas('🔀 As cores mudaram de lugar!');
        depoisBordas(700, proximaFigura);
      });
      return;
    }
    depoisBordas(BORDAS.PAUSA, proximaFigura);
    return;
  }
  // errou: diz o que estava certo e o que não
  const linhaOk = l === a.casa.l, colunaOk = c === a.casa.c;
  const motivo = linhaOk ? 'linha certa, coluna errada' : colunaOk ? 'coluna certa, linha errada' : 'linha e coluna erradas';
  if (linhaOk) bordas.errosColuna++; else if (colunaOk) bordas.errosLinha++; else bordas.errosAmbos++;
  a.erros.push(`tocou linha ${l + 1}, coluna ${c + 1} (${motivo})`);
  tab.erros++;
  botao.classList.remove('treme'); void botao.offsetWidth; botao.classList.add('treme');
  const quatro = tab.cfg.lados === 4;
  const dica = linhaOk ? `A linha está certa! Agora confira a cor de cima${quatro ? ' e a de baixo' : ''}.`
    : colunaOk ? `A coluna está certa! Agora confira a cor da esquerda${quatro ? ' e a da direita' : ''}.`
      : `Comece pela cor de cima: ache a coluna. Depois a da esquerda: ache a linha.`;
  msgBordas(`Quase! ${dica}`, 'erro');
  SOM.errado();
  // depois de 2 erros, a linha e a coluna certas acendem
  if (a.erros.length >= 2) {
    document.querySelectorAll(`#bordas-tabuleiro .bordas-casa[data-c="${a.casa.c}"], #bordas-tabuleiro .bordas-casa[data-l="${a.casa.l}"]`).forEach((e) => e.classList.add('acesa'));
  }
}

function terminarBordas() {
  const { figuras, primeira, pontos, nivelMax, errosLinha, errosColuna, errosAmbos } = bordas;
  pararBordas();
  missao.resumo = [
    `Colocou ${figuras} figuras (${primeira} de primeira) e chegou ao nível ${nivelMax} de ${BORDAS.NIVEL_MAX}.`,
    errosLinha + errosColuna + errosAmbos
      ? `Errou a linha (cores dos lados): ${errosLinha}. Errou a coluna (cores de cima e de baixo): ${errosColuna}. Errou as duas: ${errosAmbos}.`
      : 'Não errou nenhum quadrado.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Olho de pintor! 🎨' : 'Fim dos tabuleiros!';
  $('fim-texto').textContent = `${aluno}, você colocou ${primeira} de ${figuras} figuras de primeira e fez ${pontos} pontos!`;
}

$('bordas-tabuleiro').addEventListener('click', (e) => {
  const b = e.target.closest('.bordas-casa');
  if (b) tocarCasa(b);
});

// capa do cartão: um tabuleiro pequeno com as bordas coloridas e uma figura no meio
{
  const cores = ['#e53935', '#2e9e5b', '#f08a24', '#f5c518', '#8e44ad', '#1e64d2', '#ec4899', '#38bdf8'];
  const r = (x, y, w, h, f) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" stroke="#13294b" stroke-width="0.8"/>`;
  let s = '';
  for (let i = 0; i < 3; i++) { s += r(8 + i * 14, 2, 14, 6, cores[i]) + r(8 + i * 14, 50, 14, 6, cores[i + 3]); }
  for (let i = 0; i < 3; i++) { s += r(2, 8 + i * 14, 6, 14, cores[(i + 5) % 8]) + r(50, 8 + i * 14, 6, 14, cores[(i + 2) % 8]); }
  for (let i = 0; i < 9; i++) s += r(8 + (i % 3) * 14, 8 + Math.floor(i / 3) * 14, 14, 14, '#fff');
  s += '<circle cx="29" cy="25" r="2.6" fill="#2e9e5b"/><circle cx="25" cy="29" r="2.6" fill="#ec4899"/><circle cx="33" cy="29" r="2.6" fill="#f5c518"/><circle cx="29" cy="33" r="2.6" fill="#1e64d2"/>';
  $('bordas-capa').innerHTML = `<svg viewBox="0 0 58 58" aria-hidden="true">${s}</svg>`;
}

$('btn-bordas').onclick = () => { SOM.clique(); escolherProfessorE('Cores da Borda', telaBordasMenu); };
$('bordas-voltar').onclick = telaJogos;
$('btn-bordas-comecar').onclick = () => { SOM.clique(); comecarBordas(); frase('', 'Toque no quadrado que tem as cores da figura nas bordas.'); };
$('bordas-sair').onclick = telaBordasMenu;

export { BORDAS, comecarBordas, pararBordas, telaBordasMenu };
