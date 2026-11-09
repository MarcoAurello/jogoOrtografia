/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Caminho do Tatu. */

import { $, embaralhar, sortear } from './util.js?v=255';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=255';
import { frase, pararVoz, SOM, tocar } from './som.js?v=255';
import { mascote, mostrar, telaJogos } from './telas.js?v=255';
import { escolherProfessorE } from './professor.js?v=255';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=255';

// ---------- Caminho do Tatu ----------
// Orientação espacial, sequência e memória de trabalho: o tatu está no ponto do canto de cima, à esquerda, de uma malha
// de pontos; em cima aparece a fila de setas (cada seta = um passo até o próximo ponto). A criança segue as setas "de
// cabeça" e toca na maçã onde ele vai parar (a última seta sempre desce da última linha até uma maçã).
// Depois da resposta, o tatu anda o caminho passo a passo, com a seta da vez acesa, deixando o rastro.
// O caminho nunca sai da malha e não passa duas vezes pelo mesmo ponto. Acertou: sobe um nível; errou: desce.
// O toque errado é comparado com os erros comuns: trocar esquerda e direita, pular uma seta, fazer uma seta a mais.
const TATU = { RODADAS: 10, NIVEL_MAX: 6, PASSO_MS: 330, PAUSA: 2300 };
const NIVEIS_TA = [
  { col: 3, lin: 1, setas: [2, 3], esquerda: false, macas: 'todas', titulo: '2 ou 3 setas' },
  { col: 4, lin: 2, setas: [3, 4], esquerda: false, macas: 'todas', titulo: '3 ou 4 setas' },
  { col: 5, lin: 3, setas: [5, 6], esquerda: true, macas: 'todas', titulo: '5 ou 6 setas, com a esquerda' },
  { col: 6, lin: 4, setas: [7, 9], esquerda: true, macas: 'todas', titulo: '7 a 9 setas' },
  { col: 8, lin: 5, setas: [10, 12], esquerda: true, macas: 'alternadas', titulo: '10 a 12 setas' },
  { col: 9, lin: 7, setas: [13, 15], esquerda: true, macas: 'alternadas', titulo: '13 a 15 setas' },
];
const TIPOS_TA = NIVEIS_TA.map((c, i) => ({
  id: `tatu${i + 1}`, titulo: `Nível ${i + 1}: ${c.titulo}`, icone: '🍎', cor: '#e53935',
  regra: 'Seguir as setas uma por uma, na ordem, com o dedo ou com os olhos: cada seta é só um passo até o ponto do lado.',
}));
const MACAS = [['laranja', '#f08a24'], ['rosa', '#e85a8c'], ['verde', '#4c9a2a'], ['vermelha', '#e53935'], ['amarela', '#f5d10a'], ['roxa', '#8e44ad']];
const SETAS = { dir: { seta: '→', dc: 1, dl: 0 }, esq: { seta: '←', dc: -1, dl: 0 }, baixo: { seta: '↓', dc: 0, dl: 1 } };
const E = 40, M = 30;   // distância entre os pontos e a margem do desenho
let jogo = null;   // a partida em andamento

// colunas que têm maçã embaixo e a cor de cada uma
function macasDo(cfg) {
  const cols = [...Array(cfg.col).keys()].filter((c) => cfg.macas === 'todas' || c % 2 === 0);
  const cores = embaralhar(MACAS);
  return cols.map((c, i) => ({ c, nome: cores[i % cores.length][0], cor: cores[i % cores.length][1] }));
}

// o caminho: setas que descem as linhas (a última sai da malha até a maçã) e setas para os lados no meio
function novoCaminho(cfg, macas) {
  const comMaca = new Set(macas.map((m) => m.c));
  for (let t = 0; t < 2000; t++) {
    const n = cfg.setas[0] + Math.floor(Math.random() * (cfg.setas[1] - cfg.setas[0] + 1));
    const descidas = cfg.lin;   // lin - 1 dentro da malha + 1 para sair até a maçã
    const lados = n - descidas;
    if (lados < 0) continue;
    // sorteia a ordem: a última é sempre descer; antes dela, as outras descidas e os passos para o lado
    const ordem = embaralhar([...Array(descidas - 1).fill('baixo'), ...Array(lados).fill('lado')]);
    let c = 0, l = 0, ok = true;
    const vistos = new Set(['0,0']);
    const setas = [];
    for (const o of ordem) {
      let d = 'baixo';
      if (o === 'lado') {
        const ant = setas[setas.length - 1];
        const podeDir = c + 1 < cfg.col && !vistos.has(`${c + 1},${l}`) && ant !== 'esq';
        const podeEsq = cfg.esquerda && c > 0 && !vistos.has(`${c - 1},${l}`) && ant !== 'dir';
        if (!podeDir && !podeEsq) { ok = false; break; }
        d = podeDir && podeEsq ? (Math.random() < 0.6 ? 'dir' : 'esq') : podeDir ? 'dir' : 'esq';
      }
      c += SETAS[d].dc;
      l += SETAS[d].dl;
      if (vistos.has(`${c},${l}`)) { ok = false; break; }
      vistos.add(`${c},${l}`);
      setas.push(d);
    }
    if (!ok || l !== cfg.lin - 1 || !comMaca.has(c)) continue;
    // nos níveis com esquerda, ela tem de aparecer de verdade
    if (cfg.esquerda && cfg.setas[0] >= 5 && !setas.includes('esq')) continue;
    setas.push('baixo');
    return { setas, fim: c };
  }
  return { setas: ['dir', 'baixo'], fim: 1 };
}

// para onde iria quem erra do jeito comum (sem limite de malha)
function fimCom(setas, { troca = false, pula = -1, dobra = -1 } = {}) {
  let c = 0;
  setas.forEach((d, i) => {
    if (i === pula) return;
    let dc = SETAS[d].dc;
    if (troca) dc = -dc;
    c += dc * (i === dobra ? 2 : 1);
  });
  return c;
}
function motivoDoErro(r, col) {
  if (fimCom(r.setas, { troca: true }) === col) return 'trocou esquerda e direita';
  for (let i = 0; i < r.setas.length; i++) if (SETAS[r.setas[i]].dc && fimCom(r.setas, { pula: i }) === col) return 'pulou uma seta';
  for (let i = 0; i < r.setas.length; i++) if (SETAS[r.setas[i]].dc && fimCom(r.setas, { dobra: i }) === col) return 'fez uma seta a mais';
  return 'se perdeu no caminho';
}

// desenhos
function macaSVG(cor) {
  return `<path d="M20 14 C10 6 2 14 4 26 C6 38 14 44 20 40 C26 44 34 38 36 26 C38 14 30 6 20 14Z" fill="${cor}" stroke="#13294b" stroke-width="2"/>`
    + '<path d="M20 14 Q20 7 24 4" stroke="#6b4423" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    + '<path d="M22 9 Q30 4 32 10 Q26 13 22 9Z" fill="#4c9a2a" stroke="#13294b" stroke-width="1.2"/>'
    + '<ellipse cx="12" cy="22" rx="3" ry="5" fill="#fff" opacity=".45"/>';
}
// o tatu (de lado, olhando para a direita), centrado em (0, 0)
const TATU_SVG = '<g class="tatu"><ellipse cx="0" cy="9" rx="15" ry="3" fill="#13294b" opacity=".15"/>'
  + '<path d="M-14 6 Q-16 -12 0 -13 Q14 -12 14 6Z" fill="#b08968" stroke="#5c3d2e" stroke-width="1.8"/>'
  + '<path d="M-7 -11 V6 M0 -13 V6 M7 -11 V6" stroke="#5c3d2e" stroke-width="1.4"/>'
  + '<path d="M13 0 Q20 -2 24 3 Q20 7 13 5Z" fill="#d6b48c" stroke="#5c3d2e" stroke-width="1.5"/>'
  + '<ellipse cx="13" cy="-4" rx="2.4" ry="4" fill="#d6b48c" stroke="#5c3d2e" stroke-width="1.2"/>'
  + '<circle cx="18" cy="1" r="1.3" fill="#13294b"/>'
  + '<path d="M-14 3 Q-22 4 -24 9" stroke="#5c3d2e" stroke-width="2" fill="none" stroke-linecap="round"/>'
  + '<rect x="-10" y="5" width="4" height="5" rx="1.5" fill="#5c3d2e"/><rect x="6" y="5" width="4" height="5" rx="1.5" fill="#5c3d2e"/></g>';

const px = (c) => M + c * E, py = (l) => M + l * E;
function malhaSVG(r) {
  const { col, lin } = r.cfg;
  const larg = M * 2 + (col - 1) * E, baseMaca = py(lin - 1) + E + 6, alt = baseMaca + 46;
  let s = `<g stroke="#64748b" stroke-width="1.4" stroke-dasharray="3 4">`;
  for (let l = 0; l < lin; l++) s += `<line x1="${M - 14}" y1="${py(l)}" x2="${px(col - 1) + 14}" y2="${py(l)}"/>`;
  for (let c = 0; c < col; c++) s += `<line x1="${px(c)}" y1="${M - 14}" x2="${px(c)}" y2="${py(lin - 1) + 14}"/>`;
  s += '</g>';
  for (let l = 0; l < lin; l++) for (let c = 0; c < col; c++) s += `<rect x="${px(c) - 5}" y="${py(l) - 5}" width="10" height="10" rx="2" fill="#1e88e5"/>`;
  // as setas que descem até as maçãs e as maçãs
  s += r.macas.map((m) => `<line x1="${px(m.c)}" y1="${py(lin - 1) + 8}" x2="${px(m.c)}" y2="${baseMaca - 4}" stroke="#e53935" stroke-width="2.5"/>`
    + `<path d="M${px(m.c) - 5} ${baseMaca - 9} L${px(m.c)} ${baseMaca - 2} L${px(m.c) + 5} ${baseMaca - 9}Z" fill="#e53935"/>`
    + `<g class="tatu-maca" data-c="${m.c}" transform="translate(${px(m.c) - 20} ${baseMaca})" role="button" tabindex="0" aria-label="Maçã ${m.nome}">`
    + `<rect x="-2" y="-2" width="44" height="50" rx="10" fill="transparent"/>${macaSVG(m.cor)}</g>`).join('');
  s += `<polyline class="tatu-rastro" id="tatu-rastro" points="" fill="none"/>`;
  s += `<g id="tatu-bicho" transform="translate(${px(0)} ${py(0) - 14})">${TATU_SVG}</g>`;
  return `<svg class="tatu-svg" viewBox="0 0 ${larg} ${alt}" role="img" aria-label="Malha de pontos com o tatu e as maçãs">${s}</svg>`;
}

function telaTatuMenu() {
  pararTatu();
  mascote('davi-tatu', 'oi');
  mostrar('tela-tatu-menu');
}

function comecarTatu() {
  pararTatu();
  definirMissao({ id: 'tatu', tatu: true, icone: '🍎', cor: '#e53935', titulo: 'Caminho do Tatu' });
  definirResultados([]);
  jogo = { nivel: 1, nivelMax: 1, feitas: 0, acertos: 0, pontos: 0, motivos: {}, rodada: null, timers: [], rodando: true };
  mostrar('tela-tatu');
  proximaTatu();
}

function pararTatu() {
  if (jogo) { jogo.rodando = false; jogo.timers.forEach(clearTimeout); pararVoz(); }
  jogo = null;
}
const depois = (ms, fn) => { const p = jogo; const t = setTimeout(() => { if (jogo === p && p.rodando) fn(); }, ms); p.timers.push(t); };
const msg = (texto, tipo = '') => { $('tatu-msg').innerHTML = texto; $('tatu-msg').className = `cores-msg ${tipo}`; };

function hud() {
  $('tatu-nivel').textContent = `🍎 Nível ${jogo.nivel}`;
  $('tatu-pontos').textContent = jogo.pontos;
  $('tatu-contador').textContent = `${jogo.feitas}/${TATU.RODADAS}`;
}

function proximaTatu() {
  if (jogo.feitas >= TATU.RODADAS) { terminarTatu(); return; }
  const cfg = NIVEIS_TA[jogo.nivel - 1];
  const macas = macasDo(cfg);
  const cam = novoCaminho(cfg, macas);
  jogo.feitas++;
  jogo.rodada = { cfg, macas, ...cam, n: jogo.nivel, respondida: false, t0: performance.now() };
  hud();
  const r = jogo.rodada;
  $('tatu-setas').innerHTML = r.setas.map((d, i) => `<span class="tatu-seta" style="--i:${i}">${SETAS[d].seta}</span>`).join('');
  $('tatu-malha').innerHTML = malhaSVG(r);
  msg(jogo.feitas === 1 ? '👆 Siga as setas com o dedo, uma de cada vez, e toque na maçã.' : '');
  tocar([[523, 0.07], [659, 0.09]]);
  depois(300, () => frase('', 'Siga as setas. Em qual maçã o tatu vai parar?'));
}

// o tatu anda o caminho certo, com a seta da vez acesa
function andar(r, aoTerminar) {
  const bicho = $('tatu-bicho'), rastro = $('tatu-rastro');
  const cartoes = [...document.querySelectorAll('#tatu-setas .tatu-seta')];
  let c = 0, l = 0, k = 0;
  const pts = [[px(0), py(0)]];
  const baseMaca = py(r.cfg.lin - 1) + E + 6;
  const passo = () => {
    const d = r.setas[k];
    cartoes.forEach((x, i) => x.classList.toggle('acesa', i === k));
    if (k > 0) cartoes[k - 1].classList.add('feita');
    c += SETAS[d].dc;
    l += SETAS[d].dl;
    const fora = l >= r.cfg.lin;   // a última desce até a maçã
    const x = px(c), y = fora ? baseMaca + 6 : py(l);
    pts.push([x, y]);
    rastro.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
    bicho.setAttribute('transform', `translate(${x} ${y - 14})${d === 'esq' ? ' scale(-1 1)' : ''}`);
    tocar([[440 + k * 20, 0.04]]);
    k++;
    if (k < r.setas.length) depois(TATU.PASSO_MS, passo);
    else { cartoes[k - 1].classList.add('feita'); depois(250, aoTerminar); }
  };
  depois(150, passo);
}

function responderTatu(col) {
  const r = jogo && jogo.rodada;
  if (!r || r.respondida || !jogo.rodando) return;
  r.respondida = true;
  const tempo = (performance.now() - r.t0) / 1000;
  const tipo = TIPOS_TA[r.n - 1];
  const certaM = r.macas.find((m) => m.c === r.fim);
  const tocada = r.macas.find((m) => m.c === col);
  const certa = `Maçã ${certaM.nome} (${r.setas.map((d) => SETAS[d].seta).join(' ')})`;
  document.querySelector(`.tatu-maca[data-c="${col}"]`)?.classList.add(col === r.fim ? 'certa' : 'errada');
  pararVoz();
  if (col === r.fim) {
    jogo.pontos += 10 * r.n + Math.round(Math.max(0, 1 - tempo / 30) * 10);
    jogo.acertos++;
    resultados.push({ m: tipo, certa, erros: [], nivel: r.n, tempo });
    jogo.nivel = Math.min(TATU.NIVEL_MAX, jogo.nivel + 1);
    jogo.nivelMax = Math.max(jogo.nivelMax, jogo.nivel);
    msg(`✅ Isso! Veja o tatu indo até a maçã <b>${certaM.nome}</b>.`, 'ok');
    SOM.certo();
  } else {
    const motivo = motivoDoErro(r, col);
    jogo.motivos[motivo] = (jogo.motivos[motivo] || 0) + 1;
    resultados.push({ m: tipo, certa, erros: [`tocou na maçã ${tocada.nome} (${motivo})`], nivel: r.n, tempo });
    jogo.nivel = Math.max(1, jogo.nivel - 1);
    const dica = motivo.includes('esquerda') ? 'Cuidado: ← é esquerda e → é direita.'
      : motivo.includes('pulou') ? 'Faltou uma seta: faça uma de cada vez.'
        : motivo.includes('a mais') ? 'Cada seta é um passo só.' : 'Siga as setas na ordem, da primeira à última.';
    msg(`Quase! Veja o caminho do tatu. ${dica}`, 'erro');
    SOM.errado();
  }
  hud();
  andar(r, () => {
    document.querySelector(`.tatu-maca[data-c="${r.fim}"]`)?.classList.add('certa');
    frase('', `O tatu chegou na maçã ${certaM.nome}!`);
    depois(TATU.PAUSA, proximaTatu);
  });
}

function terminarTatu() {
  const { acertos, feitas, pontos, nivelMax, motivos } = jogo;
  pararTatu();
  const lista = Object.entries(motivos);
  missao.resumo = [
    `Acertou ${acertos} de ${feitas} caminhos e chegou ao nível ${nivelMax} de ${TATU.NIVEL_MAX} (${NIVEIS_TA[nivelMax - 1].titulo}).`,
    lista.length ? `Erros: ${lista.map(([t, n]) => `${t}: ${n}`).join('; ')}.` : 'Não errou nenhum caminho.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'O tatu chegou em todas! 🍎' : 'Fim dos caminhos do tatu!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitas} caminhos e fez ${pontos} pontos!`;
}

$('tatu-malha').addEventListener('click', (e) => {
  const g = e.target.closest('.tatu-maca');
  if (g) responderTatu(Number(g.dataset.c));
});
$('tatu-malha').addEventListener('keydown', (e) => {
  const g = e.target.closest('.tatu-maca');
  if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); responderTatu(Number(g.dataset.c)); }
});

// capa do cartão: o tatu, algumas setas e duas maçãs
$('tatu-capa').innerHTML = `<svg viewBox="0 0 120 80" aria-hidden="true"><g transform="translate(26 30) scale(1.3)">${TATU_SVG}</g>`
  + '<text x="62" y="30" font-size="16" font-weight="700" fill="#13294b" font-family="Fredoka, sans-serif">→ ↓ →</text>'
  + `<g transform="translate(56 40) scale(.8)">${macaSVG('#e53935')}</g><g transform="translate(86 40) scale(.8)">${macaSVG('#f5d10a')}</g></svg>`;

$('btn-tatu').onclick = () => { SOM.clique(); escolherProfessorE('Caminho do Tatu', telaTatuMenu); };
$('tatu-voltar').onclick = telaJogos;
$('btn-tatu-comecar').onclick = () => { SOM.clique(); comecarTatu(); };
$('tatu-sair').onclick = telaTatuMenu;

export { comecarTatu, pararTatu, TATU, telaTatuMenu };
