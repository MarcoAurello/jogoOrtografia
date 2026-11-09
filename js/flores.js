/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Flores do Dado. */

import { $, embaralhar, sortear } from './util.js?v=252';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=252';
import { frase, pararVoz, SOM, tocar } from './som.js?v=252';
import { mascote, mostrar, telaJogos } from './telas.js?v=252';
import { escolherProfessorE } from './professor.js?v=252';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=252';

// ---------- Flores do Dado ----------
// Atenção seletiva, conferência e flexibilidade: em cima, a legenda (cada número do dado tem uma cor); embaixo, 4 flores
// com números nas pétalas (podem se repetir), algumas pétalas pintadas e outras em branco. A criança toca na única flor
// em que TODA pétala pintada tem a cor do seu número. As erradas têm um erro cada: uma pétala com a cor de outro número,
// duas cores trocadas ou, quando a legenda muda, a pintura com a legenda ANTIGA (pega quem decorou em vez de conferir).
// A legenda mostra só o dado (contar as bolinhas); do nível 3 em diante ela muda a cada rodada.
// Depois da resposta, as pétalas erradas das outras flores ficam marcadas. Acertou: sobe um nível; errou: desce.
const FLORES = { RODADAS: 10, NIVEL_MAX: 6, PAUSA: 2600 };
const NIVEIS_FL = [
  { cores: 4, petalas: 6, erradas: 2, brancas: 0, muda: false, titulo: '4 cores' },
  { cores: 5, petalas: 7, erradas: 2, brancas: 2, muda: false, titulo: '5 cores, flores pintadas em parte' },
  { cores: 6, petalas: 8, erradas: 1, brancas: 2, muda: true, titulo: '6 cores, legenda que muda' },
  { cores: 6, petalas: 8, erradas: 1, brancas: 3, muda: true, antigo: true, titulo: 'Cuidado com a legenda antiga' },
  { cores: 6, petalas: 9, erradas: 1, brancas: 3, muda: true, antigo: true, titulo: '9 pétalas' },
  { cores: 6, petalas: 10, erradas: 1, brancas: 4, muda: true, antigo: true, titulo: '10 pétalas' },
];
const TIPOS_FL = NIVEIS_FL.map((c, i) => ({
  id: `flores${i + 1}`, titulo: `Nível ${i + 1}: ${c.titulo}`, icone: '🌼', cor: '#ec4899',
  regra: c.muda
    ? 'A legenda muda a cada rodada: conferir pétala por pétala com a legenda da tela (não com a da rodada anterior).'
    : 'Para cada pétala pintada, achar o número na legenda e conferir se a cor é a mesma; pétala em branco não conta.',
}));
const PALETA_FL = [['amarelo', '#ffd21f'], ['rosa', '#f15a9a'], ['verde', '#2e9e5b'], ['azul', '#1e5bff'], ['vermelho', '#e5191f'], ['roxo', '#6a1b9a']];
let jogo = null;   // a partida em andamento

// a legenda: número → índice da cor
const novaLegenda = (n) => { const cores = embaralhar(PALETA_FL.map((_, i) => i)).slice(0, n); return Object.fromEntries(cores.map((c, i) => [i + 1, c])); };
const mesmaLegenda = (a, b) => a && b && Object.keys(a).every((k) => a[k] === b[k]);

// uma flor: números das pétalas (com repetição) e se cada uma está pintada
function novaFlor(cfg) {
  const numeros = Array.from({ length: cfg.petalas }, () => 1 + Math.floor(Math.random() * cfg.cores));
  const pintada = numeros.map(() => true);
  embaralhar([...numeros.keys()]).slice(0, cfg.brancas).forEach((i) => { pintada[i] = false; });
  return { numeros, pintada };
}
const pintarCom = (flor, legenda) => flor.numeros.map((n, i) => (flor.pintada[i] ? legenda[n] : null));

// as erradas: cada uma com um tipo de erro, e as pétalas que ficaram erradas (para marcar depois)
function errarUma(flor, legenda, k) {
  const cores = pintarCom(flor, legenda);
  const pintadas = [...cores.keys()].filter((i) => cores[i] !== null);
  const erradas = embaralhar(pintadas).slice(0, k);
  erradas.forEach((i) => { cores[i] = sortear(Object.values(legenda).filter((c) => c !== legenda[flor.numeros[i]])); });
  return { cores, erradas, motivo: k > 1 ? 'pétalas com a cor de outro número' : 'uma pétala com a cor de outro número' };
}
function trocarDuas(flor, legenda) {
  const presentes = [...new Set(flor.numeros.filter((_, i) => flor.pintada[i]))];
  if (presentes.length < 2) return null;
  const [a, b] = embaralhar(presentes);
  const troca = { ...legenda, [a]: legenda[b], [b]: legenda[a] };
  const cores = pintarCom(flor, troca);
  const erradas = [...cores.keys()].filter((i) => cores[i] !== null && cores[i] !== legenda[flor.numeros[i]]);
  return { cores, erradas, motivo: `trocou as cores do ${a} e do ${b}` };
}
function legendaAntiga(flor, legenda, antiga) {
  // a legenda antiga precisa ter todos os números desta flor (no nível anterior podia ter menos cores)
  if (!antiga || flor.numeros.some((n, i) => flor.pintada[i] && antiga[n] === undefined)) return null;
  const cores = pintarCom(flor, antiga);
  const erradas = [...cores.keys()].filter((i) => cores[i] !== null && cores[i] !== legenda[flor.numeros[i]]);
  if (!erradas.length) return null;
  return { cores, erradas, motivo: 'pintou com a legenda antiga' };
}

function novaRodada(nivel, antiga) {
  const cfg = NIVEIS_FL[nivel - 1];
  let legenda = antiga && !cfg.muda && Object.keys(antiga).length === cfg.cores ? antiga : novaLegenda(cfg.cores);
  if (cfg.muda) for (let t = 0; t < 20 && mesmaLegenda(legenda, antiga); t++) legenda = novaLegenda(cfg.cores);
  const flores = [];
  const certa = novaFlor(cfg);
  flores.push({ ...certa, cores: pintarCom(certa, legenda), erradas: [], certa: true });
  // as 3 erradas: uma de cada tipo quando der (a da legenda antiga só nos níveis que pedem)
  const tipos = embaralhar(['uma', 'troca', cfg.antigo ? 'antigo' : 'uma']);
  for (const tipo of tipos) {
    let e = null;
    for (let t = 0; t < 20 && !e; t++) {
      const f = novaFlor(cfg);
      e = tipo === 'troca' ? trocarDuas(f, legenda) : tipo === 'antigo' ? legendaAntiga(f, legenda, antiga) : errarUma(f, legenda, cfg.erradas);
      if (e) flores.push({ ...f, ...e });
    }
    if (!e) { const f = novaFlor(cfg); flores.push({ ...f, ...errarUma(f, legenda, cfg.erradas) }); }
  }
  return { cfg, legenda, flores: embaralhar(flores) };
}

// desenhos: o dado (com o número embaixo nos níveis fáceis) e a flor com as pétalas numeradas
function dadoSVG(n) {
  const p = { 1: [[15, 15]], 2: [[9, 9], [21, 21]], 3: [[8, 8], [15, 15], [22, 22]], 4: [[9, 9], [21, 9], [9, 21], [21, 21]],
    5: [[8, 8], [22, 8], [15, 15], [8, 22], [22, 22]], 6: [[9, 8], [21, 8], [9, 15], [21, 15], [9, 22], [21, 22]] }[n];
  return `<svg class="flor-dado" viewBox="0 0 30 30" aria-hidden="true"><rect x="1.5" y="1.5" width="27" height="27" rx="6" fill="#fff" stroke="#13294b" stroke-width="2"/>`
    + p.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.8" fill="#13294b"/>`).join('') + '</svg>';
}
function florSVG(f, marcar = false) {
  const n = f.numeros.length, R = 44, raio = 23;
  const petalas = f.numeros.map((num, i) => {
    const ang = (360 / n) * i - 90;
    const cor = f.cores[i] === null ? '#fff' : PALETA_FL[f.cores[i]][1];
    const rad = (ang * Math.PI) / 180, tx = 60 + Math.cos(rad) * 36, ty = 60 + Math.sin(rad) * 36;
    const claro = f.cores[i] === null || f.cores[i] === 0;
    const errada = marcar && f.erradas.includes(i);
    return `<g><ellipse cx="60" cy="${60 - R + raio - 2}" rx="${Math.min(15, 95 / n)}" ry="${raio}" transform="rotate(${ang + 90} 60 60)"
      fill="${cor}" stroke="${errada ? '#e5191f' : '#13294b'}" stroke-width="${errada ? 4 : 2}"/>
      <text x="${tx}" y="${ty + 5}" text-anchor="middle" font-size="15" font-weight="700" font-family="Fredoka, sans-serif"
      fill="${claro ? '#13294b' : '#fff'}" stroke="${claro ? 'none' : '#13294b'}" stroke-width="${claro ? 0 : 0.6}">${num}</text></g>`;
  }).join('');
  return `<svg class="flor-svg" viewBox="0 0 120 120" aria-hidden="true">${petalas}<circle cx="60" cy="60" r="13" fill="#fff" stroke="#13294b" stroke-width="2"/></svg>`;
}

function telaFloresMenu() {
  pararFlores();
  mascote('davi-flores', 'oi');
  mostrar('tela-flores-menu');
}

function comecarFlores() {
  pararFlores();
  definirMissao({ id: 'flores', flores: true, icone: '🌼', cor: '#ec4899', titulo: 'Flores do Dado' });
  definirResultados([]);
  jogo = { nivel: 1, nivelMax: 1, feitas: 0, acertos: 0, pontos: 0, motivos: {}, legenda: null, rodada: null, timers: [], rodando: true };
  mostrar('tela-flores');
  proximaFlores();
}

function pararFlores() {
  if (jogo) { jogo.rodando = false; jogo.timers.forEach(clearTimeout); pararVoz(); }
  jogo = null;
}
const depois = (ms, fn) => { const p = jogo; const t = setTimeout(() => { if (jogo === p && p.rodando) fn(); }, ms); p.timers.push(t); };
const msg = (texto, tipo = '') => { $('flores-msg').innerHTML = texto; $('flores-msg').className = `cores-msg ${tipo}`; };

function hud() {
  $('flores-nivel').textContent = `🌼 Nível ${jogo.nivel}`;
  $('flores-pontos').textContent = jogo.pontos;
  $('flores-contador').textContent = `${jogo.feitas}/${FLORES.RODADAS}`;
}

function proximaFlores() {
  if (jogo.feitas >= FLORES.RODADAS) { terminarFlores(); return; }
  const antiga = jogo.legenda;
  const r = novaRodada(jogo.nivel, antiga);
  jogo.feitas++;
  const mudou = !!antiga && !mesmaLegenda(antiga, r.legenda);
  jogo.legenda = r.legenda;
  jogo.rodada = { ...r, n: jogo.nivel, respondida: false, t0: performance.now() };
  hud();
  $('flores-legenda').innerHTML = Object.entries(r.legenda).map(([num, c]) => `<span class="flor-codigo">${dadoSVG(Number(num))}`
    // a legenda mostra só o dado (contar as bolinhas), em todos os níveis
    + `<span class="flor-igual">=</span><span class="flor-cor" style="background:${PALETA_FL[c][1]}"></span></span>`).join('');
  $('flores-legenda').classList.remove('mudou'); void $('flores-legenda').offsetWidth;
  if (mudou) $('flores-legenda').classList.add('mudou');
  const caixa = $('flores-opcoes');
  caixa.innerHTML = '';
  r.flores.forEach((f, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'flor-opcao';
    b.dataset.tecla = i + 1;
    b.style.animationDelay = `${i * 80}ms`;
    b.setAttribute('aria-label', `Flor ${i + 1}`);
    b.innerHTML = florSVG(f);
    b.onclick = () => responderFlores(f, b);
    caixa.append(b);
  });
  msg(jogo.feitas === 1 ? '👀 Confira cada pétala pintada com a legenda. Pétala em branco não conta!' : mudou ? '🔀 A legenda mudou! Confira de novo.' : '');
  tocar([[523, 0.07], [659, 0.09]]);
  depois(300, () => frase('', mudou ? 'A legenda mudou! Qual flor está pintada certinho?' : 'Qual flor está pintada certinho com a legenda?'));
}

function responderFlores(flor, botao) {
  const r = jogo && jogo.rodada;
  if (!r || r.respondida || !jogo.rodando) return;
  r.respondida = true;
  const tempo = (performance.now() - r.t0) / 1000;
  const botoes = [...document.querySelectorAll('#flores-opcoes .flor-opcao')];
  botoes.forEach((b) => { b.disabled = true; });
  // as pétalas erradas de cada flor ficam marcadas (para ver o que estava errado)
  r.flores.forEach((f, i) => { if (!f.certa) botoes[i].innerHTML = florSVG(f, true); });
  const tipo = TIPOS_FL[r.n - 1];
  const legendaTxt = Object.entries(r.legenda).map(([num, c]) => `${num} = ${PALETA_FL[c][0]}`).join(', ');
  pararVoz();
  if (flor.certa) {
    jogo.pontos += 10 * r.n + Math.round(Math.max(0, 1 - tempo / 30) * 10);
    jogo.acertos++;
    botao.classList.add('certa');
    botoes.forEach((b) => { if (b !== botao) b.classList.add('apagada'); });
    resultados.push({ m: tipo, certa: `Legenda: ${legendaTxt}`, erros: [], nivel: r.n, tempo });
    jogo.nivel = Math.min(FLORES.NIVEL_MAX, jogo.nivel + 1);
    jogo.nivelMax = Math.max(jogo.nivelMax, jogo.nivel);
    msg('✅ Isso! Todas as pétalas pintadas batem com a legenda.', 'ok');
    SOM.certo();
    frase('', 'Isso! Flor certinha!');
  } else {
    botao.classList.add('errada');
    const certoEl = botoes[r.flores.findIndex((f) => f.certa)];
    if (certoEl) certoEl.classList.add('certa');
    jogo.motivos[flor.motivo.replace(/do \d e do \d/, 'de dois números')] = (jogo.motivos[flor.motivo.replace(/do \d e do \d/, 'de dois números')] || 0) + 1;
    resultados.push({ m: tipo, certa: `Legenda: ${legendaTxt}`, erros: [`escolheu a flor que ${flor.motivo}`], nivel: r.n, tempo });
    jogo.nivel = Math.max(1, jogo.nivel - 1);
    msg(`Quase! Essa flor ${flor.motivo} (veja as pétalas marcadas de vermelho).`, 'erro');
    SOM.errado();
    frase('', 'Quase! Veja as pétalas marcadas.');
  }
  hud();
  depois(FLORES.PAUSA + (flor.certa ? 0 : 2200), proximaFlores);
}

function terminarFlores() {
  const { acertos, feitas, pontos, nivelMax, motivos } = jogo;
  pararFlores();
  const lista = Object.entries(motivos);
  missao.resumo = [
    `Acertou ${acertos} de ${feitas} flores e chegou ao nível ${nivelMax} de ${FLORES.NIVEL_MAX}.`,
    lista.length ? `Erros (a flor escolhida ${lista.map(([t, n]) => `${t}: ${n}`).join('; ')}).` : 'Não errou nenhuma flor.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Jardineiro caprichoso! 🌸' : 'Fim das flores!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitas} flores e fez ${pontos} pontos!`;
}

document.addEventListener('keydown', (e) => {
  if (!jogo || !$('tela-flores').classList.contains('ativa')) return;
  const b = document.querySelector(`#flores-opcoes .flor-opcao[data-tecla="${e.key}"]`);
  if (b && !b.disabled) b.click();
});

// capa do cartão: uma flor colorida
$('flores-capa').innerHTML = florSVG({ numeros: [1, 3, 5, 2, 4, 6, 3, 2], cores: [0, 3, 4, 1, 2, 5, 3, null], erradas: [] });

$('btn-flores').onclick = () => { SOM.clique(); escolherProfessorE('Flores do Dado', telaFloresMenu); };
$('flores-voltar').onclick = telaJogos;
$('btn-flores-comecar').onclick = () => { SOM.clique(); comecarFlores(); };
$('flores-sair').onclick = telaFloresMenu;

export { comecarFlores, FLORES, pararFlores, telaFloresMenu };
