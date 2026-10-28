/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Caminho da Memória e Siga o Táxi (o mesmo mapa de estradas e cruzamentos). */

import { $, sortear } from './util.js?v=116';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=116';
import { SOM, tocar } from './som.js?v=116';
import { mascote, mostrar, telaJogos } from './telas.js?v=116';
import { escolherProfessorE } from './professor.js?v=116';
import { segundos } from './luzes.js?v=116';
import { fimDaMissao } from './relatorio.js?v=116';

// ---------- Caminho da Memória e Siga o Táxi ----------
// Memória visual e de trabalho e orientação espacial, num mapa de cruzamentos ligados por estradas.
// Caminho da Memória: aparece a sequência de formas coloridas do caminho (4 segundos por figura); ela some e a criança
// leva o carro, tocando cruzamento por cruzamento, da primeira forma até a casa. Entre os vizinhos de cada cruzamento,
// só um tem a forma seguinte (as formas podem se repetir no mapa).
// Siga o Táxi: os cruzamentos são só pontos; o táxi faz o caminho todo, a criança pode pedir para ver de novo e
// depois refaz o mesmo caminho com o carro.
// Nos dois: acertou, o caminho fica mais longo; errou, o carro para, o caminho certo aparece e o próximo fica mais curto.
const CAMINHO = { RODADAS: 8, NIVEL_MAX: 7, SEGUNDOS_POR_FIGURA: 4 };
const CORES_CAMINHO = { V: '#e53935', A: '#1e88e5', M: '#fbc02d', G: '#43a047', R: '#8e24aa' };
const NOME_COR_CAMINHO = { V: 'vermelho', A: 'azul', M: 'amarelo', G: 'verde', R: 'roxo' };
const NOME_FORMA_CAMINHO = { Q: 'quadrado', T: 'triângulo', C: 'círculo', E: 'estrela' };
const TIPOS_CAMINHO = {
  curto: { id: 'cam-curto', titulo: 'Caminhos curtos (3 e 4 cruzamentos)', icone: '🚗', cor: '#43a047',
    regra: 'Guardar a ordem das figuras e, no mapa, escolher sempre o vizinho ligado por estrada que vem a seguir.' },
  medio: { id: 'cam-medio', titulo: 'Caminhos médios (5 e 6 cruzamentos)', icone: '🛣️', cor: '#fbc02d',
    regra: 'Caminhos maiores: dividir a sequência em pedaços (de 2 ou 3) ajuda a lembrar.' },
  longo: { id: 'cam-longo', titulo: 'Caminhos longos (7 cruzamentos ou mais)', icone: '🏁', cor: '#e53935',
    regra: 'Muitos passos: repetir a sequência em voz baixa e conferir cada cruzamento antes de tocar.' },
};
const tipoDoTamanho = (n) => (n <= 4 ? TIPOS_CAMINHO.curto : n <= 6 ? TIPOS_CAMINHO.medio : TIPOS_CAMINHO.longo);
let cam = null;   // a partida em andamento

// ---------- o mapa: cruzamentos numa grade (com um pouco de bagunça) e estradas entre vizinhos ----------
function novoMapa(nos) {
  const cols = nos <= 5 ? 3 : 4, linhas = 3;
  for (;;) {
    const pts = [];
    for (let l = 0; l < linhas; l++) for (let c = 0; c < cols; c++) {
      pts.push({ x: 42 + c * (236 / (cols - 1)) + (Math.random() - 0.5) * 26, y: 42 + l * 78 + (Math.random() - 0.5) * 22, c, l });
    }
    const viz = pts.map(() => new Set());
    const ligar = (a, b) => { viz[a].add(b); viz[b].add(a); };
    const id = (c, l) => l * cols + c;
    for (let l = 0; l < linhas; l++) for (let c = 0; c < cols; c++) {
      if (c + 1 < cols && Math.random() < 0.72) ligar(id(c, l), id(c + 1, l));
      if (l + 1 < linhas && Math.random() < 0.72) ligar(id(c, l), id(c, l + 1));
      // uma diagonal por quadradinho, às vezes (nunca as duas, para as estradas não se cruzarem fora dos cruzamentos)
      if (c + 1 < cols && l + 1 < linhas && Math.random() < 0.3) {
        if (Math.random() < 0.5) ligar(id(c, l), id(c + 1, l + 1)); else ligar(id(c + 1, l), id(c, l + 1));
      }
    }
    // todos os cruzamentos ligados
    const visto = new Set([0]), fila = [0];
    while (fila.length) { const a = fila.shift(); viz[a].forEach((b) => { if (!visto.has(b)) { visto.add(b); fila.push(b); } }); }
    if (visto.size === pts.length) return { pts, viz: viz.map((s) => [...s]) };
  }
}

// um caminho sem repetir cruzamento, com n cruzamentos
function novoPercurso(mapa, n) {
  for (let t = 0; t < 300; t++) {
    const p = [Math.floor(Math.random() * mapa.pts.length)];
    while (p.length < n) {
      const opcoes = mapa.viz[p[p.length - 1]].filter((b) => !p.includes(b));
      if (!opcoes.length) break;
      p.push(sortear(opcoes));
    }
    if (p.length === n) return p;
  }
  return null;
}

// formas dos cruzamentos (Caminho da Memória): entre os vizinhos de cada cruzamento do caminho, só o próximo
// tem a forma seguinte (senão a criança não teria como saber)
function rotular(mapa, percurso, nivel) {
  const formas = nivel <= 2 ? ['Q', 'T', 'C'] : ['Q', 'T', 'C', 'E'];
  const cores = Object.keys(CORES_CAMINHO).slice(0, nivel <= 2 ? 3 : nivel <= 4 ? 4 : 5);
  const todas = formas.flatMap((f) => cores.map((c) => f + c));
  for (let t = 0; t < 400; t++) {
    const rot = mapa.pts.map(() => sortear(todas));
    const ok = percurso.slice(0, -1).every((a, i) => {
      const prox = percurso[i + 1];
      return mapa.viz[a].filter((b) => b !== prox && rot[b] === rot[prox]).length === 0;
    });
    if (ok) return rot;
  }
  return null;
}

function formaCaminho(r, x, y, t = 22) {
  const f = r[0], cor = CORES_CAMINHO[r[1]], h = t / 2;
  const traco = 'stroke="#13294b" stroke-width="2" stroke-linejoin="round"';
  if (f === 'Q') return `<rect x="${x - h}" y="${y - h}" width="${t}" height="${t}" rx="3" fill="${cor}" ${traco}/>`;
  if (f === 'C') return `<circle cx="${x}" cy="${y}" r="${h}" fill="${cor}" ${traco}/>`;
  if (f === 'T') return `<polygon points="${x},${y - h} ${x + h},${y + h} ${x - h},${y + h}" fill="${cor}" ${traco}/>`;
  const p = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? h * 0.45 : h; return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`; }).join(' ');
  return `<polygon points="${p}" fill="${cor}" ${traco}/>`;
}
const iconeForma = (r) => `<svg class="forma-caminho" viewBox="0 0 30 30" aria-label="${NOME_FORMA_CAMINHO[r[0]]} ${NOME_COR_CAMINHO[r[1]]}">${formaCaminho(r, 15, 15, 24)}</svg>`;

// ---------- as telas ----------
function telaCaminhoMenu() { pararCaminho(); mascote('davi-caminho', 'oi'); mostrar('tela-caminho-menu'); }
function telaTaxiMenu() { pararCaminho(); mascote('davi-taxi', 'oi'); mostrar('tela-taxi-menu'); }

function comecar(modo) {
  pararCaminho();
  if (modo === 'taxi') definirMissao({ id: 'taxi', taxi: true, icone: '🚕', cor: '#f9a825', titulo: 'Siga o Táxi (memória do caminho)' });
  else definirMissao({ id: 'caminho', caminho: true, icone: '🛣️', cor: '#43a047', titulo: 'Caminho da Memória (sequência e mapa)' });
  definirResultados([]);
  cam = { modo, nivel: 1, nivelMax: 1, pontos: 0, feitas: 0, acertos: 0, rodando: true, errosPasso: {}, repeticoes: 0, timers: [] };
  mostrar('tela-caminho');
  novaRodada();
}
const comecarCaminho = () => comecar('caminho');
const comecarTaxi = () => comecar('taxi');

function pararCaminho() {
  if (cam) { cam.rodando = false; cam.timers.forEach(clearTimeout); clearInterval(cam.relogio); }
  cam = null;
}
const depois = (ms, f) => { const c = cam; c.timers.push(setTimeout(() => { if (cam === c && c.rodando) f(); }, ms)); };
const msg = (texto, tipo = '') => { $('caminho-msg').innerHTML = texto; $('caminho-msg').className = `caminho-msg ${tipo}`; };
const botoes = (lista) => {
  $('caminho-botoes').innerHTML = lista.map(([id, txt, classe]) => `<button class="${classe || 'btn-grande'}" id="${id}" type="button">${txt}</button>`).join('');
};

function novaRodada() {
  const c = cam;
  if (!c || !c.rodando) return;
  if (c.feitas >= CAMINHO.RODADAS) { terminar(); return; }
  c.feitas++;
  const n = c.nivel + 2;   // cruzamentos do caminho: de 3 a 9
  let mapa, percurso, rot;
  do {
    mapa = novoMapa(n + 3);
    percurso = novoPercurso(mapa, n);
    rot = percurso && c.modo === 'caminho' ? rotular(mapa, percurso, c.nivel) : [];
  } while (!percurso || !rot);
  Object.assign(c, { mapa, percurso, rot, n, pos: 0, fase: 'ver', tentou: false, repeticoesRodada: 0, t0: 0 });
  $('caminho-nivel').textContent = `${c.modo === 'taxi' ? '🚕' : '🛣️'} Nível ${c.nivel} de ${CAMINHO.NIVEL_MAX}`;
  $('caminho-pontos').textContent = c.pontos;
  $('caminho-contador').textContent = `Rodada ${c.feitas} de ${CAMINHO.RODADAS} · ${n} cruzamentos`;
  $('caminho-tempo').textContent = '';
  if (c.modo === 'caminho') mostrarSequencia(); else mostrarTaxi();
}

// Caminho da Memória: a sequência fica na tela 4 s por figura (dá para encerrar antes)
function mostrarSequencia() {
  const c = cam, total = c.n * CAMINHO.SEGUNDOS_POR_FIGURA;
  $('caminho-seq').hidden = false;
  $('caminho-mapa').hidden = true;
  $('caminho-seq-figuras').innerHTML = c.percurso.map((a, i) => `${i ? '<span class="seta-caminho">➜</span>' : ''}${iconeForma(c.rot[a])}`).join('');
  const barra = $('caminho-seq-barra');
  barra.style.animation = 'none';
  void barra.offsetWidth;
  barra.style.animation = `caminho-tempo ${total}s linear forwards`;
  msg(`Memorize a sequência do caminho! Você tem <b>${total} segundos</b>.`);
  botoes([['btn-caminho-pronto', 'Já memorizei ▶']]);
  $('btn-caminho-pronto').onclick = () => { SOM.clique(); irParaMapa(); };
  c.fimMemoria = performance.now() + total * 1000;
  depois(total * 1000, irParaMapa);
}
function irParaMapa() {
  const c = cam;
  if (!c || c.fase !== 'ver') return;
  c.sobrou = Math.max(0, (c.fimMemoria - performance.now()) / 1000);
  c.timers.forEach(clearTimeout);
  c.timers = [];
  $('caminho-seq').hidden = true;
  vezDaCrianca();
}

// Siga o Táxi: o táxi faz o caminho; depois a criança pode ver de novo ou começar
function mostrarTaxi() {
  const c = cam;
  $('caminho-seq').hidden = true;
  desenharMapa('taxi');
  msg('Olhe bem o caminho que o <b>táxi</b> faz! 🚕');
  botoes([]);
  andarVeiculo('taxi', c.percurso, 0, () => {
    msg('Agora é a sua vez: faça o mesmo caminho com o carro. Quer ver de novo?');
    botoes([['btn-taxi-de-novo', '🔁 Ver o táxi de novo', 'btn-sec'], ['btn-taxi-vez', 'Agora é você ▶']]);
    $('btn-taxi-de-novo').onclick = () => { SOM.clique(); c.repeticoes++; c.repeticoesRodada++; mostrarTaxi(); };
    $('btn-taxi-vez').onclick = () => { SOM.clique(); vezDaCrianca(); };
  });
}

function vezDaCrianca() {
  const c = cam;
  c.fase = 'jogar';
  c.pos = 0;
  c.t0 = performance.now();
  desenharMapa('carro');
  botoes([]);
  msg(c.modo === 'caminho' ? 'Toque nos cruzamentos, na ordem da sequência, até a casa! 🏠' : 'Toque nos cruzamentos e faça o caminho do táxi! 🏠');
  clearInterval(c.relogio);
  c.relogio = setInterval(() => { if (cam && cam.fase === 'jogar') $('caminho-tempo').textContent = `⏱ ${segundos((performance.now() - cam.t0) / 1000)}`; }, 250);
}

// o mapa: estradas, cruzamentos (formas ou pontos), a casa no fim e o veículo no começo
function desenharMapa(veiculo) {
  const c = cam, { pts, viz } = c.mapa;
  const estradas = [];
  viz.forEach((vs, a) => vs.forEach((b) => { if (a < b) estradas.push(`<line x1="${pts[a].x}" y1="${pts[a].y}" x2="${pts[b].x}" y2="${pts[b].y}"/>`); }));
  const fim = pts[c.percurso[c.percurso.length - 1]], ini = pts[c.percurso[0]];
  const nos = pts.map((p, i) => `<g class="no-caminho" data-i="${i}">
      <circle class="alvo-no" cx="${p.x}" cy="${p.y}" r="24" fill="transparent"/>
      ${c.modo === 'caminho' ? formaCaminho(c.rot[i], p.x, p.y, 22) : `<circle cx="${p.x}" cy="${p.y}" r="9" fill="#fff" stroke="#8d6e63" stroke-width="3"/>`}
    </g>`).join('');
  $('caminho-mapa').hidden = false;
  $('caminho-mapa').innerHTML = `<svg class="mapa-caminho" viewBox="0 0 320 240" role="img" aria-label="Mapa com estradas e cruzamentos">
    <rect width="320" height="240" rx="14" fill="#e7f5e1"/>
    <g stroke="#c9a77c" stroke-width="15" stroke-linecap="round">${estradas.join('')}</g>
    <g stroke="#f3e2c7" stroke-width="10" stroke-linecap="round">${estradas.join('')}</g>
    <g class="rastro" id="caminho-rastro"></g>
    <text x="${fim.x + (fim.x > 260 ? -26 : 26)}" y="${fim.y - 12}" font-size="26" text-anchor="middle">🏠</text>
    ${nos}
    <g class="veiculo" id="caminho-veiculo" style="transform: translate(${ini.x}px, ${ini.y - 4}px)"><text font-size="26" text-anchor="middle" y="-8">${veiculo === 'taxi' ? '🚕' : '🚗'}</text></g>
  </svg>`;
}

// leva o veículo pelo caminho, um cruzamento por vez
function andarVeiculo(veiculo, percurso, i, fim) {
  const c = cam;
  if (i === 0) desenharMapa(veiculo);
  if (i >= percurso.length - 1) { depois(500, fim); return; }
  depois(i === 0 ? 700 : 750, () => {
    moverPara(percurso[i + 1], percurso[i]);
    tocar([[440 + i * 30, 0.05]]);
    andarVeiculo(veiculo, percurso, i + 1, fim);
  });
}
function moverPara(b, a) {
  const { pts } = cam.mapa, p = pts[b], q = pts[a];
  $('caminho-veiculo').style.transform = `translate(${p.x}px, ${p.y - 4}px)`;
  $('caminho-rastro').insertAdjacentHTML('beforeend', `<line x1="${q.x}" y1="${q.y}" x2="${p.x}" y2="${p.y}"/>`);
}

$('caminho-mapa').addEventListener('click', (e) => {
  const no = e.target.closest('.no-caminho');
  const c = cam;
  if (!no || !c || c.fase !== 'jogar') return;
  const b = Number(no.dataset.i), atual = c.percurso[c.pos], certo = c.percurso[c.pos + 1];
  if (b === atual) return;
  if (!c.mapa.viz[atual].includes(b)) {
    msg('Esse cruzamento não está ligado por estrada ao carro. Escolha um vizinho! 🛣️', 'erro');
    tocar([[220, 0.08]]);
    return;
  }
  if (b === certo) {
    moverPara(b, atual);
    c.pos++;
    SOM.clique();
    if (c.pos === c.percurso.length - 1) fimDaRodada(true);
    else msg(`Isso! Faltam <b>${c.percurso.length - 1 - c.pos}</b> ${c.percurso.length - 1 - c.pos === 1 ? 'cruzamento' : 'cruzamentos'}. 🚗`, 'ok');
    return;
  }
  // errou o caminho: o carro para e o caminho certo aparece
  c.passoErrado = c.pos + 1;
  no.classList.add('errado');
  fimDaRodada(false);
});

function fimDaRodada(acertou) {
  const c = cam;
  c.fase = 'fim';
  clearInterval(c.relogio);
  const tempo = (performance.now() - c.t0) / 1000;
  const tipo = tipoDoTamanho(c.n);
  const texto = `Caminho de ${c.n} cruzamentos${c.modo === 'caminho' ? `: ${c.percurso.map((a) => `${NOME_FORMA_CAMINHO[c.rot[a][0]]} ${NOME_COR_CAMINHO[c.rot[a][1]]}`).join(' → ')}` : ''}`;
  const extras = c.modo === 'taxi' && c.repeticoesRodada ? [`viu o táxi ${c.repeticoesRodada + 1} vezes`] : [];
  if (acertou) {
    const bonus = c.modo === 'caminho' ? Math.round((c.sobrou || 0) * 2) : -10 * c.repeticoesRodada;
    const ganho = Math.max(10, 15 * c.n + bonus + Math.max(0, Math.round(40 - tempo * 3)));
    c.pontos += ganho;
    c.acertos++;
    resultados.push({ m: tipo, certa: texto, erros: [], nivel: c.nivel, tempo });
    SOM.certo();
    msg(`🏠 Chegou em casa! +${ganho} pontos em ${segundos(tempo)}${extras.length ? ` (${extras[0]})` : ''}`, 'ok');
    c.nivel = Math.min(CAMINHO.NIVEL_MAX, c.nivel + 1);
  } else {
    const passo = `errou no ${c.passoErrado}º passo`;
    c.errosPasso[c.passoErrado] = (c.errosPasso[c.passoErrado] || 0) + 1;
    resultados.push({ m: tipo, certa: texto, erros: [passo, ...extras], nivel: c.nivel, tempo });
    SOM.errado();
    // mostra o caminho certo
    const { pts } = c.mapa;
    $('caminho-rastro').innerHTML = '';
    $('caminho-rastro').classList.add('certo');
    c.percurso.slice(1).forEach((b, i) => {
      const a = c.percurso[i];
      $('caminho-rastro').insertAdjacentHTML('beforeend', `<line x1="${pts[a].x}" y1="${pts[a].y}" x2="${pts[b].x}" y2="${pts[b].y}"/>`);
    });
    msg(`Não era por aí (${passo}). O caminho certo está em verde. 🛣️`, 'erro');
    c.nivel = Math.max(1, c.nivel - 1);
  }
  c.nivelMax = Math.max(c.nivelMax, c.nivel);
  $('caminho-pontos').textContent = c.pontos;
  botoes([]);
  depois(acertou ? 2000 : 3500, novaRodada);
}

function terminar() {
  const c = cam;
  pararCaminho();
  const tempos = resultados.filter((x) => !x.erros.length).map((x) => x.tempo);
  const passos = Object.entries(c.errosPasso).sort((a, b) => a[0] - b[0]);
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${c.pontos}. Chegou ao nível ${c.nivelMax} de ${CAMINHO.NIVEL_MAX} (caminhos de ${c.nivelMax + 2} cruzamentos).`,
    `Chegou em casa em ${c.acertos} de ${c.feitas} rodadas.`,
    passos.length ? `Onde errou o caminho: ${passos.map(([p, n]) => `${p}º passo (${n})`).join(', ')}.` : 'Não errou nenhum caminho!',
    ...(c.modo === 'taxi' ? [c.repeticoes ? `Pediu para ver o táxi de novo ${c.repeticoes} ${c.repeticoes === 1 ? 'vez' : 'vezes'}.` : 'Nunca precisou ver o táxi de novo.'] : []),
    ...(tempos.length ? [`Tempo médio para fazer o caminho certo: ${segundos(tempos.reduce((s, t) => s + t, 0) / tempos.length)}.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = c.acertos === c.feitas ? 'Memória de motorista! 🏁' : c.modo === 'taxi' ? 'Fim do Siga o Táxi!' : 'Fim do Caminho da Memória!';
  $('fim-texto').textContent = `${aluno}, você chegou em casa em ${c.acertos} de ${c.feitas} rodadas e fez ${c.pontos} pontos!`;
}

$('btn-caminho').onclick = () => { SOM.clique(); escolherProfessorE('Caminho da Memória', telaCaminhoMenu); };
$('btn-taxi').onclick = () => { SOM.clique(); escolherProfessorE('Siga o Táxi', telaTaxiMenu); };
$('caminho-voltar').onclick = telaJogos;
$('taxi-voltar').onclick = telaJogos;
$('btn-caminho-comecar').onclick = () => { SOM.clique(); comecarCaminho(); };
$('btn-taxi-comecar').onclick = () => { SOM.clique(); comecarTaxi(); };
$('caminho-sair').onclick = () => (cam && cam.modo === 'taxi' ? telaTaxiMenu() : telaCaminhoMenu());

export { CAMINHO, comecarCaminho, comecarTaxi, pararCaminho, telaCaminhoMenu, telaTaxiMenu };
