/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Barquinhos. */

import { $, embaralhar } from './util.js?v=119';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=119';
import { SOM, tocar } from './som.js?v=119';
import { mascote, mostrar, telaJogos } from './telas.js?v=119';
import { escolherProfessorE } from './professor.js?v=119';
import { segundos } from './luzes.js?v=119';
import { fimDaMissao } from './relatorio.js?v=119';

// ---------- Barquinhos ----------
// Lateralidade (esquerda e direita), atenção e contagem. Aparece uma fila de barcos, uns virados para a esquerda e
// outros para a direita; a criança conta e toca no botão certo, por exemplo "3D – 2E" (3 para a direita, 2 para
// a esquerda), entre 4 opções. Acertou: o próximo tem mais barcos (em duas fileiras, balançando e, no fim, os barcos
// somem depois de alguns segundos e é preciso lembrar). Errou: fica mais fácil. Quanto mais rápido, mais pontos.
// Errou 2 vezes seguidas: aparece uma janelinha que ensina esquerda e direita antes da próxima rodada.
const BARCOS = { RODADAS: 12, NIVEL_MAX: 8 };
// n: quantos barcos; fileiras; balanco: os barcos balançam na água; some: segundos até os barcos afundarem (memória)
// (no máximo 12 barcos: 3 fileiras de 4, como no caderno)
const NIVEIS_BARCOS = [
  { n: 3, fileiras: 1 }, { n: 4, fileiras: 1 }, { n: 6, fileiras: 2 }, { n: 8, fileiras: 2 },
  { n: 8, fileiras: 2, balanco: true }, { n: 10, fileiras: 3, balanco: true }, { n: 12, fileiras: 3, balanco: true },
  { n: 12, fileiras: 3, balanco: true, some: 7 },
];
const TIPOS_BARCOS = {
  poucos: { id: 'barcos-poucos', titulo: 'Até 5 barcos', icone: '⛵', cor: '#1e88e5',
    regra: 'Olhar para onde aponta a frente de cada barco (o lado oposto à âncora) e contar os que vão para a direita e os que vão para a esquerda.' },
  muitos: { id: 'barcos-muitos', titulo: '6 a 12 barcos', icone: '🚢', cor: '#1565c0',
    regra: 'Com mais barcos e várias fileiras, contar com calma, fileira por fileira, sem pular nenhum barco.' },
  memoria: { id: 'barcos-memoria', titulo: 'Barcos que somem (memória)', icone: '🌊', cor: '#0b3d91',
    regra: 'Os barcos afundam depois de alguns segundos: é preciso contar rápido e guardar os dois números na memória.' },
};
let barcos = null;   // a partida em andamento

const rotulo = (o) => `${o.d}D – ${o.e}E`;

function telaBarcosMenu() {
  pararBarcos();
  mascote('davi-barcos', 'oi');
  mostrar('tela-barcos-menu');
}

function comecarBarcos() {
  pararBarcos();
  definirMissao({ id: 'barcos', barcos: true, icone: '⛵', cor: '#1e88e5', titulo: 'Barquinhos (esquerda e direita)' });
  definirResultados([]);
  barcos = { nivel: 1, nivelMax: 1, pontos: 0, feitas: 0, acertos: 0, rodando: true, erros: {}, errosSeguidos: 0, ajudas: 0 };
  mostrar('tela-barcos');
  novaRodadaBarcos();
}

function pararBarcos() {
  if (barcos) { barcos.rodando = false; clearInterval(barcos.relogio); clearTimeout(barcos.proxima); clearTimeout(barcos.afundar); }
  barcos = null;
  $('barcos-ajuda').hidden = true;
}
const msgBarcos = (texto, tipo = '') => { $('barcos-msg').innerHTML = texto; $('barcos-msg').className = `barcos-msg ${tipo}`; };

// 4 opções: a certa, a trocada (D e E invertidos) e vizinhas (um barco a mais ou a menos de um lado)
function opcoesBarcos(d, e) {
  const candidatos = [{ d: e, e: d }, { d: d + 1, e: e - 1 }, { d: d - 1, e: e + 1 }, { d: d + 1, e }, { d, e: e + 1 }, { d: d - 1, e }, { d, e: e - 1 }, { d: d + 2, e: e - 2 }];
  const vistas = new Set([`${d}-${e}`]);
  const erradas = [];
  for (const o of candidatos) {
    const k = `${o.d}-${o.e}`;
    if (o.d < 0 || o.e < 0 || vistas.has(k)) continue;
    vistas.add(k);
    erradas.push(o);
    if (erradas.length === 3) break;
  }
  return embaralhar([{ d, e, certa: true }, ...erradas]);
}

function novaRodadaBarcos() {
  const b = barcos;
  if (!b || !b.rodando) return;
  if (b.feitas >= BARCOS.RODADAS) { terminarBarcos(); return; }
  b.feitas++;
  const nv = NIVEIS_BARCOS[b.nivel - 1];
  // cada barco vira para um lado; nunca todos para o mesmo lado
  let lados;
  do { lados = Array.from({ length: nv.n }, () => (Math.random() < 0.5 ? 'd' : 'e')); } while (lados.every((x) => x === lados[0]));
  const d = lados.filter((x) => x === 'd').length, e = nv.n - d;
  Object.assign(b, { d, e, nv, respondendo: true, t0: performance.now() });
  $('barcos-nivel').textContent = `⛵ Nível ${b.nivel} de ${BARCOS.NIVEL_MAX}`;
  $('barcos-pontos').textContent = b.pontos;
  $('barcos-contador').textContent = `Rodada ${b.feitas} de ${BARCOS.RODADAS}`;
  // os barcos na água, em uma ou duas fileiras
  const porFileira = Math.ceil(nv.n / nv.fileiras);
  const fileiras = Array.from({ length: nv.fileiras }, (_, f) => lados.slice(f * porFileira, (f + 1) * porFileira));
  const mar = $('barcos-mar');
  mar.classList.toggle('balanca', !!nv.balanco);
  mar.classList.remove('afundou');
  mar.style.setProperty('--por-fileira', porFileira);
  mar.innerHTML = fileiras.map((f) => `<div class="barcos-fileira">${f.map((lado) =>
    // a imagem do barco aponta para a direita (a frente é o lado oposto à âncora); para a esquerda, ela é espelhada
    `<img class="barco${lado === 'e' ? ' espelho' : ''}" data-lado="${lado}" src="assets/barco.png" alt="barco virado para a ${lado === 'd' ? 'direita' : 'esquerda'}" style="--atraso:${(Math.random() * 1.6).toFixed(2)}s">`).join('')}</div>`).join('');
  // botões de resposta
  $('barcos-opcoes').innerHTML = opcoesBarcos(d, e).map((o) =>
    `<button class="mat-resposta barcos-opcao" type="button" data-d="${o.d}" data-e="${o.e}">${rotulo(o)}</button>`).join('');
  msgBarcos(nv.some ? `Conte rápido: os barcos vão afundar em ${nv.some} segundos! 🌊` : 'Quantos barcos vão para a <b>direita</b> e quantos para a <b>esquerda</b>?');
  clearTimeout(b.afundar);
  if (nv.some) b.afundar = setTimeout(() => { if (barcos === b && b.respondendo) { mar.classList.add('afundou'); msgBarcos('Os barcos afundaram! Quantos eram para cada lado? 🤔'); } }, nv.some * 1000);
  clearInterval(b.relogio);
  b.relogio = setInterval(() => { if (barcos && barcos.respondendo) $('barcos-tempo').textContent = `⏱ ${segundos((performance.now() - barcos.t0) / 1000)}`; }, 200);
}

// tipo do erro, para o relatório
function tipoDoErroBarcos(o, b) {
  if (o.d === b.e && o.e === b.d) return 'trocou direita e esquerda';
  if (o.d + o.e === b.d + b.e) return 'contou errado de um lado';
  return 'contou barcos a mais ou a menos';
}

$('barcos-opcoes').onclick = (ev) => {
  const btn = ev.target.closest('.barcos-opcao');
  const b = barcos;
  if (!btn || !b || !b.respondendo) return;
  b.respondendo = false;
  clearInterval(b.relogio);
  clearTimeout(b.afundar);
  const o = { d: Number(btn.dataset.d), e: Number(btn.dataset.e) };
  const tempo = (performance.now() - b.t0) / 1000;
  const acertou = o.d === b.d && o.e === b.e;
  const tipo = b.nv.some ? TIPOS_BARCOS.memoria : b.nv.n <= 5 ? TIPOS_BARCOS.poucos : TIPOS_BARCOS.muitos;
  const certa = `${b.nv.n} barcos: ${b.d} para a direita e ${b.e} para a esquerda (${rotulo(b)})`;
  $('barcos-mar').classList.remove('afundou');   // mostra os barcos de novo para conferir
  document.querySelectorAll('.barcos-opcao').forEach((x) => {
    x.disabled = true;
    if (Number(x.dataset.d) === b.d && Number(x.dataset.e) === b.e) x.classList.add('certa');
  });
  if (acertou) {
    const bom = 1.5 + b.nv.n * 0.5;
    const bonus = Math.max(0, Math.min(100, Math.round(100 * (1 - (tempo - bom) / (bom * 2)))));
    const ganho = 20 * b.nivel + bonus;
    b.pontos += ganho;
    b.acertos++;
    resultados.push({ m: tipo, certa, erros: [], nivel: b.nivel, tempo });
    SOM.certo();
    msgBarcos(`✅ Isso! ${rotulo(b)}. +${ganho} pontos em ${segundos(tempo)}`, 'ok');
    b.errosSeguidos = 0;
    b.nivel = Math.min(BARCOS.NIVEL_MAX, b.nivel + 1);
  } else {
    const erro = tipoDoErroBarcos(o, b);
    b.erros[erro] = (b.erros[erro] || 0) + 1;
    btn.classList.add('errada');
    resultados.push({ m: tipo, certa, erros: [`marcou ${rotulo(o)} (${erro})`], nivel: b.nivel, tempo });
    SOM.errado();
    msgBarcos(`Era <b>${rotulo(b)}</b>: ${b.d} para a direita ➡ e ${b.e} para a esquerda ⬅.`, 'erro');
    b.nivel = Math.max(1, b.nivel - 1);
    b.errosSeguidos++;
  }
  b.nivelMax = Math.max(b.nivelMax, b.nivel);
  $('barcos-pontos').textContent = b.pontos;
  // errou 2 vezes seguidas: antes da próxima rodada, a janelinha ensina esquerda e direita
  if (b.errosSeguidos >= 2) { b.errosSeguidos = 0; b.proxima = setTimeout(mostrarAjudaBarcos, 2200); return; }
  b.proxima = setTimeout(novaRodadaBarcos, acertou ? 1500 : 2800);
};

function mostrarAjudaBarcos() {
  const b = barcos;
  if (!b || !b.rodando) return;
  b.ajudas++;
  $('barcos-ajuda').hidden = false;
  tocar([[523, 0.1], [659, 0.1], [784, 0.16]]);
  $('btn-barcos-entendi').focus();
}
$('btn-barcos-entendi').onclick = () => {
  $('barcos-ajuda').hidden = true;
  SOM.clique();
  if (barcos && barcos.rodando) novaRodadaBarcos();
};

function terminarBarcos() {
  const b = barcos;
  pararBarcos();
  const tempos = resultados.filter((x) => !x.erros.length).map((x) => x.tempo);
  const erros = Object.entries(b.erros);
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${b.pontos}. Chegou ao nível ${b.nivelMax} de ${BARCOS.NIVEL_MAX} (${NIVEIS_BARCOS[b.nivelMax - 1].n} barcos).`,
    `Acertou ${b.acertos} de ${b.feitas} rodadas.`,
    erros.length ? `Erros: ${erros.map(([t, n]) => `${t} (${n})`).join(', ')}.` : 'Nenhum erro: ótima noção de esquerda e direita!',
    ...(b.ajudas ? [`Precisou da explicação de esquerda e direita ${b.ajudas} ${b.ajudas === 1 ? 'vez' : 'vezes'} (depois de 2 erros seguidos).`] : []),
    ...(tempos.length ? [`Tempo médio para responder certo: ${segundos(tempos.reduce((s, t) => s + t, 0) / tempos.length)}.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = b.acertos === b.feitas ? 'Capitão do mar! ⚓' : 'Fim da viagem!';
  $('fim-texto').textContent = `${aluno}, você acertou ${b.acertos} de ${b.feitas} e fez ${b.pontos} pontos!`;
}

$('btn-barcos').onclick = () => { SOM.clique(); escolherProfessorE('Barquinhos', telaBarcosMenu); };
$('barcos-voltar').onclick = telaJogos;
$('btn-barcos-comecar').onclick = () => { SOM.clique(); comecarBarcos(); };
$('barcos-sair').onclick = telaBarcosMenu;

export { BARCOS, comecarBarcos, pararBarcos, telaBarcosMenu };
