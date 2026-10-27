/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Atenção à Forma. */

import { $, embaralhar, sortear } from './util.js?v=112';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=112';
import { SOM, tocar } from './som.js?v=112';
import { mascote, mostrar, telaJogos } from './telas.js?v=112';
import { escolherProfessorE } from './professor.js?v=112';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=112';

// ---------- Atenção à Forma ----------
// Atenção seletiva e discriminação visual (forma E cor), como a placa de pinos com cartas de modelo. No alto aparece uma
// carta com uma figura montada com várias peças (casa, barco, foguete, flor...); embaixo, um tabuleiro com peças soltas.
// O aluno toca nas peças que formam a figura, exatamente iguais: mesma forma e mesma cor (a posição pode mudar).
// Cada acerto voa até a carta e a peça sai dela; figura completa, vem a próxima carta. As armadilhas são a mesma forma
// em outra cor (o erro principal), a mesma cor em outra forma e as formas parecidas. Carta sem toque errado: a próxima
// figura tem mais peças e o tabuleiro mais armadilhas; com 2 toques errados ou mais, fica mais fácil.
// Cada carta tem 1,5 segundo por peça da figura: se o tempo acabar antes de completar, a carta passa (e fica mais fácil).
const SIMBOLOS = { CARTAS: 8, NIVEL_MAX: 6, PAUSA: 1000, POR_PECA: 1500, CHEGADA: 500 };   // tempo em ms por peça; o relógio começa quando a carta pousa
// formas das peças (viewBox 0 0 100 100, centradas em 50,50)
const FORMAS = {
  quadrado: { nome: 'quadrado', svg: '<rect x="10" y="10" width="80" height="80" rx="6"/>' },
  barra: { nome: 'barra', svg: '<rect x="30" y="5" width="40" height="90" rx="6"/>' },
  triangulo: { nome: 'triângulo', svg: '<polygon points="50,8 93,90 7,90"/>' },
  circulo: { nome: 'círculo', svg: '<circle cx="50" cy="50" r="41"/>' },
  semicirculo: { nome: 'meia-lua', svg: '<path d="M7 68 A43 43 0 0 1 93 68 Z"/>' },
  arco: { nome: 'arco', svg: '<path d="M7 34 A43 43 0 0 0 93 34 L71 34 A21 21 0 0 1 29 34 Z"/>' },
  trapezio: { nome: 'trapézio', svg: '<polygon points="28,20 72,20 94,80 6,80"/>' },
  gota: { nome: 'gota', svg: '<path d="M50 6 C50 6 83 46 83 63 A33 33 0 0 1 17 63 C17 46 50 6 50 6 Z"/>' },
  losango: { nome: 'losango', svg: '<polygon points="50,6 90,50 50,94 10,50"/>' },
};
const IDS_FORMAS = Object.keys(FORMAS);
const PARECIDAS = {
  quadrado: ['losango', 'barra', 'trapezio'], barra: ['quadrado'], triangulo: ['trapezio', 'gota'], circulo: ['semicirculo', 'gota'],
  semicirculo: ['circulo', 'arco'], arco: ['semicirculo'], trapezio: ['quadrado', 'triangulo'], gota: ['circulo', 'triangulo'], losango: ['quadrado'],
};
const CORES_SIMB = {
  vermelho: { nome: 'vermelho', cor: '#e53935' }, azul: { nome: 'azul', cor: '#1e64d2' }, amarelo: { nome: 'amarelo', cor: '#f7c600' },
  verde: { nome: 'verde', cor: '#2e9e5b' }, roxo: { nome: 'roxo', cor: '#8e44ad' }, laranja: { nome: 'laranja', cor: '#f57c00' },
};
const IDS_CORES = Object.keys(CORES_SIMB);
// as figuras das cartas: cada peça é [forma, cor, x, y, largura, altura, giro] na carta de 200 x 200
const FIGURAS = [
  { nome: 'sorvete', pecas: [['triangulo', 'amarelo', 100, 140, 0.7, 0.85, 180], ['semicirculo', 'roxo', 100, 84, 0.62, 0.62, 0], ['circulo', 'vermelho', 100, 52, 0.18, 0.18, 0]] },
  { nome: 'barco', pecas: [['trapezio', 'vermelho', 100, 148, 1.35, 0.5, 180], ['barra', 'roxo', 100, 92, 0.16, 0.8, 0], ['triangulo', 'amarelo', 124, 96, 0.42, 0.62, 0], ['triangulo', 'azul', 78, 102, 0.36, 0.48, 0]] },
  { nome: 'peixe', pecas: [['circulo', 'laranja', 88, 100, 0.95, 0.66, 0], ['triangulo', 'laranja', 152, 100, 0.42, 0.42, 90], ['triangulo', 'amarelo', 92, 64, 0.32, 0.26, 0], ['circulo', 'azul', 62, 92, 0.13, 0.13, 0]] },
  { nome: 'casa', pecas: [['quadrado', 'azul', 100, 126, 0.8, 0.8, 0], ['triangulo', 'vermelho', 100, 70, 1.12, 0.56, 0], ['barra', 'amarelo', 106, 142, 0.5, 0.38, 0], ['quadrado', 'amarelo', 78, 112, 0.2, 0.2, 0], ['circulo', 'amarelo', 160, 34, 0.26, 0.26, 0]] },
  { nome: 'árvore', pecas: [['barra', 'laranja', 100, 162, 0.5, 0.4, 0], ['triangulo', 'verde', 100, 122, 1.0, 0.5, 0], ['triangulo', 'verde', 100, 90, 0.82, 0.44, 0], ['triangulo', 'verde', 100, 62, 0.62, 0.38, 0], ['circulo', 'vermelho', 78, 118, 0.12, 0.12, 0]] },
  { nome: 'foguete', pecas: [['barra', 'azul', 100, 104, 1, 0.92, 0], ['triangulo', 'vermelho', 100, 40, 0.48, 0.32, 0], ['circulo', 'amarelo', 100, 84, 0.2, 0.2, 0], ['triangulo', 'amarelo', 74, 140, 0.3, 0.34, 0], ['triangulo', 'amarelo', 126, 140, 0.3, 0.34, 0], ['gota', 'laranja', 100, 172, 0.3, 0.32, 180]] },
  { nome: 'carro', pecas: [['barra', 'vermelho', 100, 124, 0.95, 1.55, 90], ['trapezio', 'vermelho', 100, 88, 0.8, 0.52, 0], ['quadrado', 'azul', 100, 92, 0.26, 0.2, 0], ['circulo', 'roxo', 64, 154, 0.3, 0.3, 0], ['circulo', 'roxo', 136, 154, 0.3, 0.3, 0], ['circulo', 'amarelo', 166, 118, 0.12, 0.12, 0]] },
  { nome: 'flor', pecas: [['gota', 'roxo', 100, 50, 0.3, 0.34, 0], ['gota', 'roxo', 131, 80, 0.3, 0.34, 90], ['gota', 'roxo', 100, 110, 0.3, 0.34, 180], ['gota', 'roxo', 69, 80, 0.3, 0.34, 270], ['circulo', 'amarelo', 100, 80, 0.26, 0.26, 0], ['barra', 'verde', 100, 156, 0.22, 0.56, 0], ['gota', 'verde', 120, 156, 0.24, 0.3, 60]] },
  { nome: 'robô', pecas: [['quadrado', 'azul', 100, 56, 0.5, 0.46, 0], ['circulo', 'amarelo', 88, 54, 0.1, 0.1, 0], ['circulo', 'amarelo', 112, 54, 0.1, 0.1, 0], ['triangulo', 'verde', 100, 22, 0.2, 0.2, 0], ['quadrado', 'vermelho', 100, 120, 0.72, 0.68, 0], ['losango', 'amarelo', 100, 120, 0.2, 0.2, 0], ['barra', 'azul', 52, 118, 0.42, 0.56, 0], ['barra', 'azul', 148, 118, 0.42, 0.56, 0]] },
  { nome: 'modelo da placa', pecas: [['arco', 'verde', 52, 40, 0.38, 0.38, 0], ['arco', 'amarelo', 100, 40, 0.38, 0.38, 0], ['arco', 'vermelho', 148, 40, 0.38, 0.38, 0],
    ['triangulo', 'azul', 66, 92, 0.34, 0.32, 0], ['quadrado', 'amarelo', 100, 92, 0.32, 0.32, 0], ['quadrado', 'vermelho', 134, 92, 0.32, 0.32, 0],
    ['triangulo', 'azul', 83, 126, 0.34, 0.32, 180], ['quadrado', 'verde', 117, 126, 0.32, 0.32, 0], ['triangulo', 'amarelo', 100, 160, 0.34, 0.32, 180], ['circulo', 'vermelho', 160, 162, 0.16, 0.16, 0]] },
];
// figuras de cada nível (pelo número de peças) e quantas peças-armadilha o tabuleiro tem
const NIVEIS_SIMB = [
  { pecas: [3, 4], armadilhas: 3 },
  { pecas: [4, 5], armadilhas: 4 },
  { pecas: [5, 6], armadilhas: 5 },
  { pecas: [6, 7], armadilhas: 6 },
  { pecas: [7, 8], armadilhas: 7 },
  { pecas: [8, 10], armadilhas: 8 },
];
const TIPOS_SIMB = [
  { ate: 4, id: 'forma-ate4', titulo: 'Figura de 3 ou 4 peças' },
  { ate: 6, id: 'forma-ate6', titulo: 'Figura de 5 ou 6 peças' },
  { ate: 8, id: 'forma-ate8', titulo: 'Figura de 7 ou 8 peças' },
  { ate: 99, id: 'forma-9mais', titulo: 'Figura de 9 peças ou mais' },
].map((t) => ({ ...t, icone: '🃏', cor: '#8e44ad',
  regra: 'Achar no tabuleiro cada peça da figura exatamente igual (mesma forma e mesma cor) e não tocar na mesma forma de outra cor, na mesma cor de outra forma nem nas formas parecidas.' }));
let simb = null;   // a partida em andamento

const pecaSVG = (forma, cor) => `<svg class="simb" viewBox="0 0 100 100"><g fill="${CORES_SIMB[cor].cor}" stroke="#13294b" stroke-width="5" stroke-linejoin="round">${FORMAS[forma].svg}</g></svg>`;
const nomeDe = (p) => `${FORMAS[p.forma].nome} ${CORES_SIMB[p.cor].nome}`;
const igual = (a, b) => a.forma === b.forma && a.cor === b.cor;
// a figura da carta: cada peça é posicionada, girada e esticada na carta de 200 x 200
const figuraSVG = (pecas) => `<svg class="simb-figura" viewBox="0 0 200 200" role="img" aria-label="Figura da carta">${pecas.map((p, i) =>
  `<g class="simb-parte" data-i="${i}" data-peca="${nomeDe(p)}" style="--i:${i}" transform="translate(${p.x} ${p.y}) rotate(${p.giro}) scale(${p.sx} ${p.sy}) translate(-50 -50)"><g fill="${CORES_SIMB[p.cor].cor}" stroke="#13294b" stroke-width="${(5 / Math.max(0.35, Math.min(p.sx, p.sy))).toFixed(1)}" stroke-linejoin="round">${FORMAS[p.forma].svg}</g></g>`).join('')}</svg>`;

function telaSimbolosMenu() {
  pararSimbolos();
  mascote('davi-simbolos', 'oi');
  mostrar('tela-simbolos-menu');
}

function comecarSimbolos() {
  pararSimbolos();
  definirMissao({ id: 'simbolos', simbolos: true, icone: '🃏', cor: '#8e44ad', titulo: 'Atenção à Forma' });
  definirResultados([]);
  simb = { nivel: 1, nivelMax: 1, feitas: 0, semErro: 0, pontos: 0, toquesErrados: 0, errosCorDiferente: 0, errosFormaDiferente: 0,
    errosParecida: 0, errosOutro: 0, esgotadas: 0, usadas: [], carta: null, timers: [], rodando: true };
  mostrar('tela-simbolos');
  novaCarta();
}

function pararSimbolos() {
  if (simb) { simb.rodando = false; simb.timers.forEach(clearTimeout); }
  document.querySelectorAll('.simb-voando').forEach((v) => v.remove());
  simb = null;
}
const depoisSimb = (ms, fn) => { const s = simb; const t = setTimeout(() => { if (simb === s && s.rodando) fn(); }, ms); s.timers.push(t); };
const msgSimb = (texto, tipo = '') => { $('simbolos-msg').innerHTML = texto; $('simbolos-msg').className = `cores-msg ${tipo}`; };

// escolhe a figura do nível (sem repetir a anterior) e monta o tabuleiro com as peças dela e as armadilhas
function montarCarta(nv) {
  let opcoes = FIGURAS.filter((f) => f.pecas.length >= nv.pecas[0] && f.pecas.length <= nv.pecas[1]);
  const novas = opcoes.filter((f) => !simb.usadas.includes(f.nome));
  if (novas.length) opcoes = novas;
  const fig = sortear(opcoes);
  simb.usadas.push(fig.nome);
  const carta = fig.pecas.map(([forma, cor, x, y, sx, sy, giro]) => ({ forma, cor, x, y, sx, sy, giro }));
  const pecas = carta.map((p) => ({ forma: p.forma, cor: p.cor, certa: true }));
  const existe = (p) => pecas.some((q) => igual(p, q));
  const armadilhas = [];
  const juntar = (p, motivo) => { if (!existe(p) && !armadilhas.some((q) => igual(p, q))) armadilhas.push({ ...p, certa: false, motivo }); };
  // metade: a mesma forma em outra cor (o erro principal); depois a mesma cor em outra forma e as formas parecidas
  for (let t = 0; t < 60 && armadilhas.length < Math.ceil(nv.armadilhas / 2); t++) {
    const base = sortear(carta);
    juntar({ forma: base.forma, cor: sortear(IDS_CORES.filter((c) => c !== base.cor)) }, 'mesma forma, outra cor');
  }
  for (let t = 0; t < 60 && armadilhas.length < nv.armadilhas; t++) {
    const base = sortear(carta);
    if (Math.random() < 0.5) juntar({ forma: sortear(PARECIDAS[base.forma]), cor: base.cor }, 'mesma cor, forma parecida');
    else juntar({ forma: sortear(IDS_FORMAS.filter((f) => f !== base.forma)), cor: base.cor }, 'mesma cor, outra forma');
  }
  const todas = embaralhar([...pecas, ...armadilhas]).map((p) => ({ ...p, giro: Math.round(Math.random() * 50 - 25) }));
  return { fig, carta, pecas: todas };
}

function novaCarta() {
  if (simb.feitas >= SIMBOLOS.CARTAS) { terminarSimbolos(); return; }
  const nv = NIVEIS_SIMB[simb.nivel - 1];
  const { fig, carta, pecas } = montarCarta(nv);
  simb.feitas++;
  const limite = carta.length * SIMBOLOS.POR_PECA;
  simb.carta = { fig, carta, pecas, achadas: new Set(), erros: [], t0: performance.now(), nivel: simb.nivel, limite };
  hudSimb();
  // barra do tempo: começa cheia quando a carta pousa e esvazia até acabar (fica vermelha no fim)
  const barra = $('simbolos-tempo').firstElementChild;
  barra.style.animation = 'none'; void barra.offsetWidth;
  barra.style.animation = `simb-tempo ${limite}ms linear ${SIMBOLOS.CHEGADA}ms forwards`;
  const c0 = simb.carta;
  depoisSimb(SIMBOLOS.CHEGADA + limite, () => { if (simb.carta === c0 && !c0.terminou) tempoEsgotado(); });
  // a carta chega girando, como quem dá a carta na mesa
  const c = $('simbolos-carta');
  c.className = 'simbolos-carta chega';
  c.innerHTML = figuraSVG(carta);
  const t = $('simbolos-tabuleiro');
  t.style.setProperty('--colunas', pecas.length <= 8 ? 4 : 5);
  t.innerHTML = '';
  pecas.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'simb-peca';
    b.style.setProperty('--giro', `${p.giro}deg`);
    b.style.animationDelay = `${120 + i * 30}ms`;
    b.setAttribute('aria-label', nomeDe(p));
    b.innerHTML = pecaSVG(p.forma, p.cor);
    b.onclick = () => tocarPeca(p, b);
    t.append(b);
  });
  msgSimb(simb.feitas === 1 ? 'Ache as peças da figura: mesma forma <b>e</b> mesma cor!' : `Monte o ${fig.nome}: ${carta.length} peças.`);
}

function hudSimb() {
  $('simbolos-nivel').textContent = `🃏 Nível ${simb.nivel} de ${SIMBOLOS.NIVEL_MAX}`;
  $('simbolos-pontos').textContent = simb.pontos;
  $('simbolos-contador').textContent = `${simb.feitas}/${SIMBOLOS.CARTAS}`;
}

// a peça certa voa até o seu lugar na carta (antecipação: cresce um pouco antes de sair) e sai da figura
function voarParaCarta(botao, alvo, depois) {
  const de = botao.getBoundingClientRect(), para = alvo.getBoundingClientRect();
  const v = botao.firstElementChild.cloneNode(true);
  v.classList.add('simb-voando');
  Object.assign(v.style, { left: `${de.left}px`, top: `${de.top}px`, width: `${de.width}px`, height: `${de.height}px` });
  document.body.append(v);
  const dx = para.left + para.width / 2 - (de.left + de.width / 2), dy = para.top + para.height / 2 - (de.top + de.height / 2);
  const k = Math.max(0.15, Math.max(para.width, para.height) / de.width);
  const giro = getComputedStyle(botao).getPropertyValue('--giro') || '0deg';
  const anim = v.animate([
    { transform: `rotate(${giro}) scale(1)` },
    { transform: `rotate(${giro}) scale(1.18, 0.86)`, offset: 0.18 },
    { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(${k})`, opacity: 0.6 },
  ], { duration: 520, easing: 'cubic-bezier(0.5, 0, 0.3, 1)' });
  // garante a saída mesmo se a animação não terminar (aba em segundo plano, por exemplo)
  let feito = false;
  const fim = () => { if (feito) return; feito = true; v.remove(); depois(); };
  anim.onfinish = fim;
  setTimeout(fim, 650);
}

function tocarPeca(p, botao) {
  const c = simb && simb.carta;
  if (!c || c.terminou || botao.disabled || !simb.rodando) return;
  if (p.certa) {
    // a peça da figura que ainda não saiu, igual a esta
    const i = c.carta.findIndex((q, j) => !c.achadas.has(j) && igual(q, p));
    if (i < 0) return;
    c.achadas.add(i);
    botao.disabled = true;
    botao.classList.add('achou');
    simb.pontos += 10 * simb.nivel;
    hudSimb();
    tocar([[660, 0.06], [880, 0.08]]);
    const alvo = $('simbolos-carta').querySelector(`.simb-parte[data-i="${i}"]`);
    const sair = () => { if (alvo) alvo.classList.add('sai'); };
    if (alvo && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) voarParaCarta(botao, alvo, sair); else sair();
    if (c.achadas.size === c.carta.length) { c.terminou = true; $('simbolos-tempo').firstElementChild.style.animationPlayState = 'paused'; depoisSimb(650, fimDaCarta); }
    return;
  }
  // errou: a peça treme e fica marcada; a carta continua
  simb.toquesErrados++;
  const motivo = p.motivo;
  if (motivo === 'mesma forma, outra cor') simb.errosCorDiferente++;
  else if (motivo === 'mesma cor, forma parecida') simb.errosParecida++;
  else if (motivo === 'mesma cor, outra forma') simb.errosFormaDiferente++;
  else simb.errosOutro++;
  if (!c.erros.some((e) => e.botao === botao)) c.erros.push({ botao, texto: `tocou ${nomeDe(p)} (${motivo})` });
  botao.classList.remove('errou'); void botao.offsetWidth; botao.classList.add('errou');
  const formaNaCarta = c.carta.find((q) => q.forma === p.forma);
  msgSimb(motivo === 'mesma forma, outra cor' ? `A forma é igual, mas a cor não! Na figura o ${FORMAS[p.forma].nome} é ${CORES_SIMB[formaNaCarta.cor].nome}.`
    : motivo === 'mesma cor, forma parecida' ? `A cor é igual, mas é ${FORMAS[p.forma].nome}! Olhe bem a forma.`
      : 'A cor engana! Essa forma não está na figura.', 'erro');
  SOM.errado();
}

// acabou o tempo da carta: ela passa sem completar e a próxima fica mais fácil
function tempoEsgotado() {
  const c = simb.carta;
  c.terminou = true;
  simb.esgotadas++;
  const faltam = c.carta.length - c.achadas.size;
  const tipo = TIPOS_SIMB.find((t) => c.carta.length <= t.ate);
  resultados.push({ m: tipo, certa: `${c.fig.nome}: ${c.carta.map(nomeDe).join(', ')}`, erros: [...c.erros.map((e) => e.texto), `o tempo acabou (faltaram ${faltam} de ${c.carta.length} peças)`], nivel: c.nivel, tempo: null });
  simb.nivel = Math.max(1, simb.nivel - 1);
  hudSimb();
  document.querySelectorAll('#simbolos-tabuleiro .simb-peca').forEach((b) => { b.disabled = true; });
  msgSimb(`⏰ Acabou o tempo! Faltaram ${faltam} ${faltam === 1 ? 'peça' : 'peças'}.`, 'erro');
  SOM.errado();
  $('simbolos-carta').className = 'simbolos-carta vai';
  depoisSimb(SIMBOLOS.PAUSA + 900, novaCarta);
}

function fimDaCarta() {
  const c = simb.carta;
  const tempo = (performance.now() - c.t0) / 1000;
  const tipo = TIPOS_SIMB.find((t) => c.carta.length <= t.ate);
  resultados.push({ m: tipo, certa: `${c.fig.nome}: ${c.carta.map(nomeDe).join(', ')}`, erros: c.erros.map((e) => e.texto), nivel: c.nivel, tempo });
  if (!c.erros.length) {
    simb.semErro++;
    simb.pontos += 15 + Math.round(Math.max(0, 1 - (tempo * 1000 - SIMBOLOS.CHEGADA) / c.limite) * 20);   // bônus por sobrar tempo
    simb.nivel = Math.min(SIMBOLOS.NIVEL_MAX, simb.nivel + 1);
    msgSimb(simb.nivel > c.nivel ? `✅ ${c.fig.nome[0].toUpperCase() + c.fig.nome.slice(1)} completo sem errar! A próxima figura é maior.` : '✅ Figura completa sem errar!', 'ok');
    SOM.certo();
  } else {
    if (c.erros.length >= 2) simb.nivel = Math.max(1, simb.nivel - 1);
    msgSimb(`Figura completa! ${c.erros.length === 1 ? '1 toque errado' : `${c.erros.length} toques errados`}.`, c.erros.length >= 2 ? 'erro' : 'ok');
  }
  simb.nivelMax = Math.max(simb.nivelMax, simb.nivel);
  hudSimb();
  // a carta completa sai voando e a próxima chega
  $('simbolos-carta').className = 'simbolos-carta vai';
  depoisSimb(SIMBOLOS.PAUSA + (c.erros.length ? 600 : 0), novaCarta);
}

function terminarSimbolos() {
  const { feitas, semErro, pontos, nivelMax, esgotadas, toquesErrados, errosCorDiferente, errosFormaDiferente, errosParecida, errosOutro } = simb;
  pararSimbolos();
  missao.resumo = [
    `Completou ${feitas - esgotadas} de ${feitas} figuras no tempo (1,5 s por peça), ${semErro} sem nenhum toque errado, e chegou ao nível ${nivelMax} de ${SIMBOLOS.NIVEL_MAX}.`,
    toquesErrados ? `Toques errados: ${toquesErrados} (mesma forma de outra cor: ${errosCorDiferente}; mesma cor de forma parecida: ${errosParecida}; mesma cor de outra forma: ${errosFormaDiferente + errosOutro}).`
      : 'Não tocou em nenhuma peça errada.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Olho de detetive! 🔍' : 'Fim das cartas!';
  $('fim-texto').textContent = `${aluno}, você completou ${feitas - esgotadas} de ${feitas} figuras no tempo, ${semErro} sem errar, e fez ${pontos} pontos!`;
}

// capa do cartão na lista de jogos: a carta com a casa
$('simbolos-capa').innerHTML = `<span class="simbolos-carta">${figuraSVG(FIGURAS[3].pecas.map(([forma, cor, x, y, sx, sy, giro]) => ({ forma, cor, x, y, sx, sy, giro })))}</span>`;

$('btn-simbolos').onclick = () => { SOM.clique(); escolherProfessorE('Atenção à Forma', telaSimbolosMenu); };
$('simbolos-voltar').onclick = telaJogos;
$('btn-simbolos-comecar').onclick = () => { SOM.clique(); comecarSimbolos(); };
$('simbolos-sair').onclick = telaSimbolosMenu;

export { comecarSimbolos, pararSimbolos, telaSimbolosMenu };
