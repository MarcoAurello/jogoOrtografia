/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Chave e Cadeado. */

import { $, embaralhar, sortear } from './util.js?v=181';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=181';
import { frase, pararVoz, SOM, tocar } from './som.js?v=181';
import { mascote, mostrar, telaJogos } from './telas.js?v=181';
import { escolherProfessorE } from './professor.js?v=181';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=181';

// ---------- Chave e Cadeado ----------
// Discriminação visual e atenção aos detalhes: cadeados numerados, cada um com o buraco da fechadura num formato de
// dentes, e chaves soltas; a pergunta vem um cadeado por vez ("Qual chave abre o cadeado 2?"). A chave certa tem os
// dentes exatamente do formato do buraco. As cores são só enfeite: a cor da chave nunca combina com a do cadeado.
// Errou: a chave treme, sai do jogo e a criança tenta de novo; depois de 2 erros, a chave certa pisca.
// Níveis: mais cadeados, chaves sobrando, chaves "quase iguais" (um dente diferente) e, no fim, chaves tortas.
// Cada conjunto sem erro sobe um nível; com 2 erros ou mais desce.
const CADEADO = { CONJUNTOS: 6, NIVEL_MAX: 6, PAUSA: 1200 };
const NIVEIS_CA = [
  { cad: 2, chaves: 2, dentes: 3, parecidas: 0, torta: 0, titulo: '2 cadeados' },
  { cad: 3, chaves: 4, dentes: 3, parecidas: 0, torta: 0, titulo: '3 cadeados e uma chave a mais' },
  { cad: 3, chaves: 5, dentes: 3, parecidas: 1, torta: 0, titulo: '3 cadeados com chave quase igual' },
  { cad: 4, chaves: 6, dentes: 4, parecidas: 2, torta: 0, titulo: '4 cadeados com chaves quase iguais' },
  { cad: 4, chaves: 6, dentes: 4, parecidas: 2, torta: 35, titulo: '4 cadeados com chaves tortas' },
  { cad: 5, chaves: 8, dentes: 4, parecidas: 3, torta: 45, titulo: '5 cadeados com chaves tortas e quase iguais' },
];
const TIPOS_CA = NIVEIS_CA.map((c, i) => ({
  id: `cadeado${i + 1}`, titulo: `Nível ${i + 1}: ${c.titulo}`, icone: '🔑', cor: '#c99700',
  regra: c.parecidas
    ? 'Comparar dente por dente (alto, baixo ou sem dente), da ponta da chave até o cabo: uma diferença só já não abre.'
    : 'Olhar o formato do buraco da fechadura e achar a chave com os dentes iguais (a cor não importa).',
}));
const CORES_CA = ['#e53935', '#1e64d2', '#f5c518', '#2e9e5b', '#8e44ad', '#f08a24', '#ec4899', '#38bdf8'];
let jogo = null;   // a partida em andamento

// o formato: a altura de cada dente (0 = sem dente, 1 = baixo, 2 = alto)
const chavePerfil = (p) => p.join('');
function novoPerfil(dentes, usados) {
  for (let t = 0; t < 200; t++) {
    const p = Array.from({ length: dentes }, () => Math.floor(Math.random() * 3));
    if (p.every((h) => h === 0) || usados.has(chavePerfil(p))) continue;
    return p;
  }
  return null;
}
// a "quase igual": muda um dente só
function parecida(p, usados) {
  for (const i of embaralhar([...p.keys()])) {
    for (const h of embaralhar([0, 1, 2])) {
      if (h === p[i]) continue;
      const q = [...p];
      q[i] = h;
      if (!q.every((x) => x === 0) && !usados.has(chavePerfil(q))) return q;
    }
  }
  return null;
}

// a parte de cima do formato (o "cano" da chave) e os dentes embaixo, como retângulos juntos; com contorno, o contorno
// vai primeiro e o recheio por cima, para os retângulos parecerem uma peça só
function formato(p, x0, y0, { comp, larg, alt, passo, unidade }) {
  const rets = [[x0, y0, comp, larg]];
  p.forEach((h, i) => { if (h) rets.push([x0 + comp - (i + 1) * passo, y0 + larg - 1, passo - 2, h * unidade + 1]); });
  return rets;
}
const retsSVG = (rets, cor, contorno) => (contorno
  ? rets.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${contorno}" stroke="${contorno}" stroke-width="5" stroke-linejoin="round"/>`).join('')
  : '') + rets.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${cor}"/>`).join('');

// modelos (só enfeite, sorteados: o modelo nunca diz qual chave abre qual cadeado)
// cabeça da chave, centrada em (22, 22): argola, quadrada, trevo, coração e oval; todas com o furinho no meio
const CABECAS = {
  argola: (c) => `<circle cx="22" cy="22" r="15" fill="${c}" stroke="#13294b" stroke-width="3"/>`,
  quadrada: (c) => `<rect x="8" y="8" width="28" height="28" rx="7" fill="${c}" stroke="#13294b" stroke-width="3"/>`,
  trevo: (c) => `<g fill="${c}" stroke="#13294b" stroke-width="3"><circle cx="22" cy="12" r="9"/><circle cx="13" cy="28" r="9"/><circle cx="31" cy="28" r="9"/></g>`
    + `<circle cx="22" cy="23" r="9" fill="${c}"/>`,
  coracao: (c) => `<path d="M22 37 C4 26 4 9 14 8 Q20 8 22 14 Q24 8 30 8 C40 9 40 26 22 37Z" fill="${c}" stroke="#13294b" stroke-width="3" stroke-linejoin="round"/>`,
  oval: (c) => `<ellipse cx="22" cy="22" rx="12" ry="17" fill="${c}" stroke="#13294b" stroke-width="3"/>`,
};
// corpo do cadeado (viewBox 0 0 90 112): quadrado, redondo, arco (de baixo redondo) e oitavado
const CORPOS = {
  quadrado: (c) => `<rect x="6" y="44" width="78" height="62" rx="14" fill="${c}" stroke="#13294b" stroke-width="3"/>`,
  redondo: (c) => `<circle cx="45" cy="74" r="36" fill="${c}" stroke="#13294b" stroke-width="3"/>`,
  arco: (c) => `<path d="M6 46 H84 V72 Q84 108 45 108 Q6 108 6 72Z" fill="${c}" stroke="#13294b" stroke-width="3" stroke-linejoin="round"/>`,
  oitavado: (c) => `<path d="M24 42 H66 L84 60 V90 L66 108 H24 L6 90 V60Z" fill="${c}" stroke="#13294b" stroke-width="3" stroke-linejoin="round"/>`,
};
const MODELOS_CHAVE = Object.keys(CABECAS);
const MODELOS_CADEADO = Object.keys(CORPOS);

// chave deitada (viewBox 0 0 130 50): cabeça à esquerda, cano e dentes à direita
function chaveSVG(p, cor, modelo = 'argola') {
  const dentes = formato(p, 44, 18, { comp: 78, larg: 8, alt: 0, passo: 10, unidade: 7 });
  return `<svg class="cad-chave-svg" viewBox="0 0 130 50" aria-hidden="true">
    <rect x="32" y="16.5" width="16" height="11" fill="#13294b"/><rect x="32" y="19" width="16" height="6" fill="${cor}"/>
    ${CABECAS[modelo](cor)}<circle cx="22" cy="22" r="5" fill="#fff" stroke="#13294b" stroke-width="2"/>
    ${retsSVG(dentes, cor, '#13294b')}</svg>`;
}
// cadeado: alça em cima e, no corpo, o buraco com o mesmo formato da chave
function cadeadoSVG(p, cor, aberto = false, modelo = 'quadrado') {
  const buraco = formato(p, 16, 64, { comp: 56, larg: 7, alt: 0, passo: 8, unidade: 6 });
  return `<svg class="cad-cadeado-svg${aberto ? ' aberto' : ''}" viewBox="0 0 90 112" aria-hidden="true">
    <path class="cad-alca" d="M22 50 V30 Q22 8 45 8 Q68 8 68 30 V50" fill="none" stroke="#13294b" stroke-width="12" stroke-linecap="round"/>
    <path class="cad-alca" d="M22 50 V30 Q22 8 45 8 Q68 8 68 30 V50" fill="none" stroke="#cbd5e1" stroke-width="6" stroke-linecap="round"/>
    ${CORPOS[modelo](cor)}
    <rect x="12" y="57" width="66" height="34" rx="7" fill="#fff" opacity=".6"/>
    ${retsSVG(buraco, '#13294b')}</svg>`;
}

function novoConjunto(nivel) {
  const cfg = NIVEIS_CA[nivel - 1];
  const usados = new Set();
  const cadeados = [];
  const coresCad = embaralhar(CORES_CA);
  for (let i = 0; i < cfg.cad; i++) {
    const p = novoPerfil(cfg.dentes, usados);
    usados.add(chavePerfil(p));
    cadeados.push({ num: i + 1, perfil: p, cor: coresCad[i % coresCad.length], modelo: sortear(MODELOS_CADEADO), aberto: false });
  }
  // as chaves: a de cada cadeado, as "quase iguais" (de cadeados sorteados) e outras quaisquer até completar
  const chaves = cadeados.map((c) => ({ perfil: c.perfil, abre: c.num }));
  for (const c of embaralhar(cadeados).slice(0, cfg.parecidas)) {
    const q = parecida(c.perfil, usados);
    if (q) { usados.add(chavePerfil(q)); chaves.push({ perfil: q, abre: 0, quase: c.num }); }
  }
  while (chaves.length < Math.max(cfg.chaves, cfg.cad)) {
    const q = novoPerfil(cfg.dentes, usados);
    if (!q) break;
    usados.add(chavePerfil(q));
    chaves.push({ perfil: q, abre: 0 });
  }
  // cor da chave: nunca a cor do cadeado que ela abre (a cor não pode ser pista)
  chaves.forEach((k, i) => {
    const dono = cadeados.find((c) => c.num === k.abre);
    const opcoes = CORES_CA.filter((x) => !dono || x !== dono.cor);
    k.cor = opcoes[(i * 3 + Math.floor(Math.random() * opcoes.length)) % opcoes.length];
    k.giro = cfg.torta ? Math.round((Math.random() * 2 - 1) * cfg.torta) : 0;
    k.modelo = sortear(MODELOS_CHAVE);
    k.id = i;
  });
  return { cfg, cadeados, chaves: embaralhar(chaves), fila: embaralhar(cadeados.map((c) => c.num)), erros: 0 };
}

function desenharConjunto() {
  const s = jogo.conj;
  $('cad-cadeados').innerHTML = s.cadeados.map((c) => `<div class="cad-cadeado${c.aberto ? ' aberto' : ''}${jogo.atual && jogo.atual.num === c.num ? ' pedido' : ''}" data-num="${c.num}">`
    + `<span class="cad-num">${c.num}</span>${cadeadoSVG(c.perfil, c.cor, c.aberto, c.modelo)}</div>`).join('');
  // chave torta: encolhe o suficiente para caber no botão (a chave tem 130 x 50 e o botão, mais ou menos 2 x 1)
  const giro = (k) => {
    if (!k.giro) return 'none';
    const r = (Math.abs(k.giro) * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r), alto = 50 / 130;
    return `rotate(${k.giro}deg) scale(${Math.min(1 / (c + sn * alto), 0.44 / (sn + c * alto)).toFixed(3)})`;
  };
  $('cad-chaves').innerHTML = s.chaves.map((k) => `<button type="button" class="cad-chave${k.usada ? ' usada' : ''}${k.fora ? ' fora' : ''}" data-id="${k.id}" ${k.usada || k.fora ? 'disabled' : ''}`
    + ` aria-label="Chave com dentes ${k.perfil.join(', ')}"><span class="cad-giro" style="transform:${giro(k)}">${chaveSVG(k.perfil, k.cor, k.modelo)}</span></button>`).join('');
}

function telaCadeadoMenu() {
  pararCadeado();
  mascote('davi-cadeado', 'oi');
  mostrar('tela-cadeado-menu');
}

function comecarCadeado() {
  pararCadeado();
  definirMissao({ id: 'cadeado', cadeado: true, icone: '🔑', cor: '#c99700', titulo: 'Chave e Cadeado' });
  definirResultados([]);
  jogo = { nivel: 1, nivelMax: 1, conjuntos: 0, abertos: 0, primeira: 0, pontos: 0, quase: 0, outra: 0, conj: null, atual: null, timers: [], rodando: true };
  mostrar('tela-cadeado');
  proximoConjunto();
}

function pararCadeado() {
  if (jogo) { jogo.rodando = false; jogo.timers.forEach(clearTimeout); pararVoz(); }
  jogo = null;
}
const depois = (ms, fn) => { const p = jogo; const t = setTimeout(() => { if (jogo === p && p.rodando) fn(); }, ms); p.timers.push(t); };
const msg = (texto, tipo = '') => { $('cad-msg').innerHTML = texto; $('cad-msg').className = `cores-msg ${tipo}`; };

function hud() {
  $('cad-nivel').textContent = `🔑 Nível ${jogo.nivel}`;
  $('cad-pontos').textContent = jogo.pontos;
  $('cad-contador').textContent = `${jogo.conjuntos}/${CADEADO.CONJUNTOS}`;
}

function proximoConjunto() {
  if (jogo.conjuntos >= CADEADO.CONJUNTOS) { terminarCadeado(); return; }
  jogo.conjuntos++;
  jogo.conj = novoConjunto(jogo.nivel);
  jogo.conj.n = jogo.nivel;
  jogo.atual = null;
  hud();
  tocar([[523, 0.07], [659, 0.09]]);
  proximoCadeado();
}

function proximoCadeado() {
  const s = jogo.conj;
  const abertos = s.cadeados.filter((c) => c.aberto).length;
  if (abertos >= s.cadeados.length) {
    if (s.erros === 0) jogo.nivel = Math.min(CADEADO.NIVEL_MAX, jogo.nivel + 1);
    else if (s.erros >= 2) jogo.nivel = Math.max(1, jogo.nivel - 1);
    jogo.nivelMax = Math.max(jogo.nivelMax, jogo.nivel);
    msg(s.erros === 0 ? '🌟 Abriu todos sem errar!' : '🔓 Todos abertos!', 'ok');
    depois(1500, proximoConjunto);
    return;
  }
  const num = s.fila[abertos];
  // as chaves que erraram no cadeado anterior voltam (só a usada sai)
  s.chaves.forEach((k) => { k.fora = false; });
  jogo.atual = { num, erros: [], t0: performance.now() };
  desenharConjunto();
  $('cad-pergunta').innerHTML = `Qual chave abre o <b>cadeado ${num}</b>?`;
  if (jogo.abertos === 0) msg('👀 Compare os dentes da chave com o buraco da fechadura. A cor não importa!');
  else if (!abertos && s.cfg.torta) msg('🔄 Atenção: agora as chaves estão tortas!');
  else if (!abertos && s.cfg.parecidas) msg('🔍 Cuidado: tem chave quase igual!');
  else msg('');
  frase('', `Qual chave abre o cadeado ${num}?`);
}

function tocarChave(botao) {
  const a = jogo && jogo.atual, s = jogo && jogo.conj;
  if (!a || !jogo.rodando || botao.disabled) return;
  const k = s.chaves.find((x) => x.id === Number(botao.dataset.id));
  const tipo = TIPOS_CA[s.n - 1];
  const cad = s.cadeados.find((c) => c.num === a.num);
  if (k.abre === a.num) {
    const tempo = (performance.now() - a.t0) / 1000;
    jogo.atual = null;
    k.usada = true;
    cad.aberto = true;
    jogo.abertos++;
    if (!a.erros.length) jogo.primeira++;
    jogo.pontos += [10 * s.n, 4 * s.n, s.n][Math.min(2, a.erros.length)] + (a.erros.length ? 0 : Math.round(Math.max(0, 1 - tempo / 20) * 5));
    resultados.push({ m: tipo, certa: `Cadeado ${a.num}: dentes ${cad.perfil.join('-')} (0 = sem dente, 2 = alto)`, erros: a.erros, nivel: s.n, tempo });
    desenharConjunto();
    msg('🔓 Abriu!', 'ok');
    SOM.certo();
    tocar([[784, 0.06], [1046, 0.1]]);
    hud();
    depois(CADEADO.PAUSA, proximoCadeado);
    return;
  }
  // errou: a chave treme e sai do jogo neste cadeado
  const motivo = k.quase === a.num ? 'chave quase igual (um dente diferente)' : 'chave de outro formato';
  if (k.quase === a.num) jogo.quase++; else jogo.outra++;
  a.erros.push(`escolheu ${motivo} (dentes ${k.perfil.join('-')})`);
  s.erros++;
  k.fora = true;
  botao.classList.add('treme');
  SOM.errado();
  msg(k.quase === a.num ? 'Quase! Essa chave tem <b>um dente diferente</b>. Compare dente por dente.' : 'Essa não abre. Olhe bem o formato do buraco!', 'erro');
  depois(450, () => {
    desenharConjunto();
    if (a.erros.length >= 2) document.querySelector(`#cad-chaves .cad-chave[data-id="${s.chaves.find((x) => x.abre === a.num).id}"]`)?.classList.add('dica');
  });
}

function terminarCadeado() {
  const { abertos, primeira, pontos, nivelMax, quase, outra } = jogo;
  pararCadeado();
  missao.resumo = [
    `Abriu ${abertos} cadeados (${primeira} de primeira) e chegou ao nível ${nivelMax} de ${CADEADO.NIVEL_MAX}.`,
    quase + outra ? `Escolheu chave quase igual (um dente diferente): ${quase}. Chave de outro formato: ${outra}.` : 'Não errou nenhuma chave.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Chaveiro de primeira! 🗝️' : 'Fim dos cadeados!';
  $('fim-texto').textContent = `${aluno}, você abriu ${primeira} de ${abertos} cadeados de primeira e fez ${pontos} pontos!`;
}

$('cad-chaves').addEventListener('click', (e) => {
  const b = e.target.closest('.cad-chave');
  if (b) tocarChave(b);
});

// capa do cartão: um cadeado e uma chave
$('cadeado-capa').innerHTML = `<span class="cad-capa-cadeado">${cadeadoSVG([2, 0, 1], '#f08a24', false, 'redondo')}</span><span class="cad-capa-chave">${chaveSVG([2, 0, 1], '#1e64d2', 'trevo')}</span>`;

$('btn-cadeado').onclick = () => { SOM.clique(); escolherProfessorE('Chave e Cadeado', telaCadeadoMenu); };
$('cadeado-voltar').onclick = telaJogos;
$('btn-cadeado-comecar').onclick = () => { SOM.clique(); comecarCadeado(); };
$('cadeado-sair').onclick = telaCadeadoMenu;

export { CADEADO, comecarCadeado, pararCadeado, telaCadeadoMenu };
