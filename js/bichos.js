/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Memória dos Bichos. */

import { $, embaralhar } from './util.js?v=185';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=185';
import { frase, pararVoz, SOM, tocar } from './som.js?v=185';
import { mascote, mostrar, telaJogos } from './telas.js?v=185';
import { escolherProfessorE } from './professor.js?v=185';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=185';

// ---------- Memória dos Bichos ----------
// Memória de trabalho (associação par a par): aparece uma tabela com símbolos e o bicho de cada um, por um tempo
// (com barrinha e o botão "Já decorei"). Ela some e vem um símbolo por vez: a criança toca no bicho que estava com ele.
// Começa com 2 pares; acertou tudo na rodada: a próxima tem um par a mais (até 9); errou: um par a menos.
// O erro mais comum é trocar pelo bicho de outro símbolo da mesma tabela (interferência): o relatório guarda qual foi.
const BICHOS = { RODADAS: 8, MIN: 2, MAX: 9, SEG_POR_PAR: 2.5, SEG_BASE: 2, PAUSA: 1600 };
const NIVEL_MAX = BICHOS.MAX - BICHOS.MIN + 1;   // nível 1 = 2 pares ... nível 8 = 9 pares

// os símbolos (azuis, como na folha), viewBox 0 0 40 40
const AZ = '#1450a3';
const SIMBOLOS = {
  espiral: { nome: 'espiral', svg: `<path d="M20 20 m0 -2 a2 2 0 1 1 -2 2 a4 4 0 0 1 4 -4 a6 6 0 0 1 6 6 a8 8 0 0 1 -8 8 a10 10 0 0 1 -10 -10 a12 12 0 0 1 12 -12 a14 14 0 0 1 14 14" fill="none" stroke="${AZ}" stroke-width="3" stroke-linecap="round"/>` },
  sol: { nome: 'sol', svg: `<circle cx="20" cy="20" r="8" fill="${AZ}"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M20 4 L22.5 9 L17.5 9Z" fill="${AZ}" transform="rotate(${a} 20 20)"/>`).join('')}` },
  losango: { nome: 'losango', svg: `<path d="M20 3 L31 20 L20 37 L9 20Z" fill="${AZ}"/>` },
  espada: { nome: 'espada', svg: `<path d="M20 5 C26 13 34 17 30 25 C27 30 22 27 21 25 L24 35 H16 L19 25 C18 27 13 30 10 25 C6 17 14 13 20 5Z" fill="${AZ}"/>` },
  trevo: { nome: 'trevo', svg: `<g fill="${AZ}"><circle cx="20" cy="12" r="7"/><circle cx="12" cy="20" r="7"/><circle cx="28" cy="20" r="7"/><circle cx="20" cy="28" r="7"/></g>` },
  paus: { nome: 'paus', svg: `<g fill="${AZ}"><circle cx="20" cy="12" r="7"/><circle cx="12" cy="23" r="7"/><circle cx="28" cy="23" r="7"/><path d="M18 22 H22 L25 36 H15Z"/></g>` },
  seta: { nome: 'seta', svg: `<path d="M4 15 H22 V7 L36 20 L22 33 V25 H4Z" fill="${AZ}"/>` },
  cruz: { nome: 'cruz', svg: `<path d="M15 5 H25 V15 H35 V25 H25 V35 H15 V25 H5 V15 H15Z" fill="${AZ}"/>` },
  arco: { nome: 'arco e flecha', svg: `<path d="M12 6 Q34 20 12 34" fill="none" stroke="${AZ}" stroke-width="3.5"/><line x1="12" y1="6" x2="12" y2="34" stroke="${AZ}" stroke-width="1.6"/><path d="M4 20 H34" stroke="${AZ}" stroke-width="3"/><path d="M36 20 L29 15 V25Z" fill="${AZ}"/><path d="M4 20 L1 16 M4 20 L1 24" stroke="${AZ}" stroke-width="2"/>` },
};
const BICHOS_LISTA = [['🐴', 'cavalo'], ['🐥', 'pintinho'], ['🐰', 'coelho'], ['🐷', 'porco'], ['🐮', 'vaca'], ['🦆', 'pato'], ['🐑', 'ovelha'], ['🐐', 'cabra'], ['🦃', 'peru']];
const simboloSVG = (id) => `<svg class="bicho-simbolo" viewBox="0 0 40 40" role="img" aria-label="${SIMBOLOS[id].nome}">${SIMBOLOS[id].svg}</svg>`;
const TIPOS_BI = Array.from({ length: NIVEL_MAX }, (_, i) => ({
  id: `bichos${i + 1}`, titulo: `${i + BICHOS.MIN} pares de símbolo e bicho`, icone: '🐮', cor: '#2e9e5b',
  regra: 'Ligar cada símbolo ao seu bicho e guardar todos os pares; ajuda falar baixinho "sol é o porco, trevo é a vaca...".',
}));
let jogo = null;   // a partida em andamento

function telaBichosMenu() {
  pararBichos();
  mascote('davi-bichos', 'oi');
  mostrar('tela-bichos-menu');
}

function comecarBichos() {
  pararBichos();
  definirMissao({ id: 'bichos', bichos: true, icone: '🐮', cor: '#2e9e5b', titulo: 'Memória dos Bichos' });
  definirResultados([]);
  jogo = { pares: BICHOS.MIN, maxPares: BICHOS.MIN, feitas: 0, rodadasCertas: 0, acertos: 0, perguntas: 0, pontos: 0, rodada: null, timers: [], relogio: 0, rodando: true };
  mostrar('tela-bichos');
  proximaRodada();
}

function pararBichos() {
  if (jogo) { jogo.rodando = false; jogo.timers.forEach(clearTimeout); clearInterval(jogo.relogio); pararVoz(); }
  jogo = null;
}
const depois = (ms, fn) => { const p = jogo; const t = setTimeout(() => { if (jogo === p && p.rodando) fn(); }, ms); p.timers.push(t); };
const msg = (texto, tipo = '') => { $('bichos-msg').innerHTML = texto; $('bichos-msg').className = `cores-msg ${tipo}`; };

function hud() {
  $('bichos-nivel').textContent = `🐮 ${jogo.pares} pares`;
  $('bichos-pontos').textContent = jogo.pontos;
  $('bichos-contador').textContent = `${jogo.feitas}/${BICHOS.RODADAS}`;
}

// a tabela: símbolos em cima, bichos embaixo (como na folha); no celular quebra em linhas de pares
function desenharTabela(r) {
  // até 5 pares numa linha; com mais, duas linhas (no celular, 9 colunas ficariam miúdas)
  const n = r.pares.length;
  $('bichos-tabela').style.setProperty('--colunas', n <= 5 ? n : Math.ceil(n / 2));
  $('bichos-tabela').innerHTML = r.pares.map((p) => `<div class="bicho-par">${simboloSVG(p.simbolo)}<span class="bicho-emoji" aria-label="${p.bicho[1]}">${p.bicho[0]}</span></div>`).join('');
}

function proximaRodada() {
  if (jogo.feitas >= BICHOS.RODADAS) { terminarBichos(); return; }
  jogo.feitas++;
  const n = jogo.pares;
  const simbolos = embaralhar(Object.keys(SIMBOLOS)).slice(0, n);
  const bichos = embaralhar(BICHOS_LISTA).slice(0, n);
  const pares = simbolos.map((s, i) => ({ simbolo: s, bicho: bichos[i] }));
  // perguntas da rodada: 2 com até 3 pares, 3 com mais (símbolos diferentes, em ordem sorteada)
  const perguntas = embaralhar(pares).slice(0, n <= 3 ? 2 : 3);
  jogo.rodada = { pares, perguntas, k: 0, erros: 0, fase: 'decorar' };
  hud();
  $('bichos-pergunta').hidden = true;
  $('bichos-opcoes').innerHTML = '';
  $('bichos-tabela').hidden = false;
  $('bichos-decorei').hidden = false;
  desenharTabela(jogo.rodada);
  msg(jogo.feitas === 1 ? '👀 Guarde qual bicho está com cada símbolo!' : `Agora são <b>${n} pares</b>. Guarde bem!`);
  tocar([[523, 0.07], [659, 0.09]]);
  frase('', 'Guarde qual bicho está com cada símbolo!');
  // o tempo de decorar cresce com o número de pares; a barrinha mostra quanto falta
  const total = (BICHOS.SEG_BASE + BICHOS.SEG_POR_PAR * n) * 1000, t0 = performance.now();
  const barra = $('bichos-tempo');
  barra.hidden = false;
  clearInterval(jogo.relogio);
  jogo.relogio = setInterval(() => {
    const falta = Math.max(0, 1 - (performance.now() - t0) / total);
    barra.firstElementChild.style.width = `${falta * 100}%`;
    if (falta <= 0) esconderTabela();
  }, 100);
}

function esconderTabela() {
  const r = jogo && jogo.rodada;
  if (!r || r.fase !== 'decorar') return;
  r.fase = 'responder';
  clearInterval(jogo.relogio);
  $('bichos-tempo').hidden = true;
  $('bichos-decorei').hidden = true;
  $('bichos-tabela').hidden = true;
  msg('');
  proximaPergunta();
}

function proximaPergunta() {
  const r = jogo.rodada;
  if (r.k >= r.perguntas.length) { fimDaRodada(); return; }
  const p = r.perguntas[r.k];
  r.t0 = performance.now();
  r.respondida = false;
  $('bichos-pergunta').hidden = false;
  $('bichos-simbolo').innerHTML = simboloSVG(p.simbolo);
  $('bichos-qual').textContent = r.perguntas.length > 1 ? `Pergunta ${r.k + 1} de ${r.perguntas.length}` : '';
  // as opções: os bichos da tabela (até 4; com mais pares, o certo e 3 de outros símbolos)
  const outros = embaralhar(r.pares.filter((x) => x !== p)).slice(0, Math.min(3, r.pares.length - 1));
  const caixa = $('bichos-opcoes');
  caixa.innerHTML = '';
  embaralhar([p, ...outros]).forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bicho-opcao';
    b.dataset.tecla = i + 1;
    b.style.animationDelay = `${i * 70}ms`;
    b.setAttribute('aria-label', o.bicho[1]);
    b.innerHTML = `<span class="bicho-emoji">${o.bicho[0]}</span><span class="bicho-nome">${o.bicho[1]}</span>`;
    b.onclick = () => responder(o, p, b);
    caixa.append(b);
  });
  frase('', 'Qual bicho estava com este símbolo?');
}

function responder(escolha, certo, botao) {
  const r = jogo && jogo.rodada;
  if (!r || r.respondida || !jogo.rodando) return;
  r.respondida = true;
  const tempo = (performance.now() - r.t0) / 1000;
  const botoes = [...document.querySelectorAll('#bichos-opcoes .bicho-opcao')];
  botoes.forEach((b) => { b.disabled = true; });
  const tipo = TIPOS_BI[r.pares.length - BICHOS.MIN];
  const certaTxt = `${SIMBOLOS[certo.simbolo].nome} = ${certo.bicho[1]} (tabela de ${r.pares.length} pares)`;
  jogo.perguntas++;
  pararVoz();
  if (escolha === certo) {
    jogo.acertos++;
    jogo.pontos += 5 * r.pares.length + Math.round(Math.max(0, 1 - tempo / 10) * 5);
    botao.classList.add('certa');
    resultados.push({ m: tipo, certa: certaTxt, erros: [], nivel: r.pares.length - BICHOS.MIN + 1, tempo });
    msg(`✅ Isso! ${certo.bicho[0]}`, 'ok');
    SOM.certo();
  } else {
    r.erros++;
    botao.classList.add('errada');
    botoes[[...botoes].findIndex((b) => b.getAttribute('aria-label') === certo.bicho[1])]?.classList.add('certa');
    resultados.push({ m: tipo, certa: certaTxt, erros: [`escolheu ${escolha.bicho[1]} (o bicho do símbolo ${SIMBOLOS[escolha.simbolo].nome})`], nivel: r.pares.length - BICHOS.MIN + 1, tempo });
    msg(`Quase! Era o ${certo.bicho[1]} ${certo.bicho[0]}. O ${escolha.bicho[1]} estava com o símbolo ${SIMBOLOS[escolha.simbolo].nome}.`, 'erro');
    SOM.errado();
  }
  hud();
  r.k++;
  depois(BICHOS.PAUSA + (escolha === certo ? 0 : 1200), proximaPergunta);
}

// fim da rodada: mostra a tabela de novo (para conferir) e ajusta o número de pares
function fimDaRodada() {
  const r = jogo.rodada;
  $('bichos-pergunta').hidden = true;
  $('bichos-opcoes').innerHTML = '';
  $('bichos-tabela').hidden = false;
  if (r.erros === 0) {
    jogo.rodadasCertas++;
    jogo.pares = Math.min(BICHOS.MAX, jogo.pares + 1);
    msg(jogo.pares > r.pares.length ? '🌟 Acertou tudo! A próxima tabela tem mais um par.' : '🌟 Acertou tudo!', 'ok');
  } else {
    jogo.pares = Math.max(BICHOS.MIN, jogo.pares - 1);
    msg('Veja a tabela de novo. A próxima vai ter um par a menos.', 'erro');
  }
  jogo.maxPares = Math.max(jogo.maxPares, r.pares.length);
  depois(2600, proximaRodada);
}

function terminarBichos() {
  const { acertos, perguntas, pontos, maxPares, rodadasCertas, feitas } = jogo;
  pararBichos();
  missao.resumo = [
    `Acertou ${acertos} de ${perguntas} perguntas e ${rodadasCertas} de ${feitas} tabelas inteiras.`,
    `Chegou a guardar ${maxPares} pares de símbolo e bicho (o máximo do jogo é ${BICHOS.MAX}).`,
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Memória de elefante! 🐘' : 'Fim da memória dos bichos!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${perguntas} e guardou até ${maxPares} pares!`;
}

document.addEventListener('keydown', (e) => {
  if (!jogo || !$('tela-bichos').classList.contains('ativa')) return;
  const b = document.querySelector(`#bichos-opcoes .bicho-opcao[data-tecla="${e.key}"]`);
  if (b && !b.disabled) b.click();
});

// capa do cartão: dois pares
$('bichos-capa').innerHTML = `<span class="bichos-capa-linha"><span class="bicho-par">${simboloSVG('sol')}<span class="bicho-emoji">🐷</span></span>`
  + `<span class="bicho-par">${simboloSVG('trevo')}<span class="bicho-emoji">🐮</span></span></span>`;

$('btn-bichos').onclick = () => { SOM.clique(); escolherProfessorE('Memória dos Bichos', telaBichosMenu); };
$('bichos-voltar').onclick = telaJogos;
$('btn-bichos-comecar').onclick = () => { SOM.clique(); comecarBichos(); };
$('bichos-sair').onclick = telaBichosMenu;
$('bichos-decorei').onclick = () => { SOM.clique(); esconderTabela(); };

export { BICHOS, comecarBichos, NIVEL_MAX as BICHOS_NIVEL_MAX, pararBichos, telaBichosMenu };
