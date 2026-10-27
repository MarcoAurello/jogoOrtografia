/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Rotina Certa. */

import { $, embaralhar, seguro } from './util.js?v=87';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=87';
import { SOM, tocar } from './som.js?v=87';
import { mascote, mostrar, telaJogos } from './telas.js?v=87';
import { escolherProfessorE } from './professor.js?v=87';
import { segundos } from './luzes.js?v=87';
import { fimDaMissao } from './relatorio.js?v=87';

// ---------- Rotina Certa ----------
// Sequência e planejamento (funções executivas). Cada rotina do dia a dia tem 6 passos em ordem; os passos aparecem
// embaralhados numa pilha de botões e a criança arrasta (ou toca em dois para trocar) até ficar na ordem certa,
// depois toca em "Testar". Os passos certos ficam verdes e presos; os outros ela tenta de novo (até 3 vezes).
// Acertou de primeira: a próxima rotina tem mais passos (3 a 6). Precisou de ajuda: a próxima tem menos.
const ROTINA = { NIVEL_MAX: 4, TENTATIVAS: 3 };   // nível 1 = 3 passos ... nível 4 = 6 passos
const ROTINAS = [
  { titulo: 'Tomar banho', icone: '🛁', passos: [
    ['🧺', 'Separar a toalha e a roupa limpa'], ['👕', 'Tirar a roupa suja'], ['🚿', 'Entrar no chuveiro e molhar o corpo'],
    ['🧼', 'Passar o sabonete e o xampu'], ['💦', 'Enxaguar o corpo todo'], ['👚', 'Secar com a toalha e vestir a roupa'] ] },
  { titulo: 'Hora do almoço', icone: '🍽️', passos: [
    ['🧴', 'Lavar as mãos'], ['🪑', 'Sentar à mesa'], ['🍛', 'Servir a comida no prato'],
    ['😋', 'Comer devagar, mastigando bem'], ['🧽', 'Levar o prato para a pia'], ['🪥', 'Escovar os dentes'] ] },
  { titulo: 'Ir para a escola', icone: '🎒', passos: [
    ['⏰', 'Acordar com o despertador'], ['🛏️', 'Levantar da cama'], ['🥣', 'Tomar o café da manhã'],
    ['🪥', 'Escovar os dentes'], ['🎒', 'Colocar a mochila nas costas'], ['🏫', 'Ir para a escola'] ] },
  { titulo: 'Fazer um bolo (com um adulto)', icone: '🎂', passos: [
    ['🧴', 'Lavar as mãos e separar os ingredientes'], ['🥚', 'Quebrar os ovos numa tigela'], ['🥄', 'Misturar os ovos, o açúcar e a farinha'],
    ['🫗', 'Colocar a massa na forma'], ['🔥', 'Assar no forno com a ajuda do adulto'], ['🍰', 'Esperar esfriar e cortar'] ] },
  { titulo: 'Escovar os dentes', icone: '🪥', passos: [
    ['🪥', 'Pegar a escova de dentes'], ['🧴', 'Colocar um pouco de pasta na escova'], ['😁', 'Escovar os dentes da frente'],
    ['👅', 'Escovar os dentes de trás e a língua'], ['💧', 'Cuspir e enxaguar a boca'], ['🧽', 'Lavar a escova e guardar'] ] },
  { titulo: 'Hora de dormir', icone: '🌙', passos: [
    ['🧸', 'Guardar os brinquedos'], ['🛁', 'Tomar banho'], ['👘', 'Vestir o pijama'],
    ['🪥', 'Escovar os dentes'], ['📖', 'Deitar e ouvir uma história'], ['💡', 'Apagar a luz e dormir'] ] },
];
// tamanho da rotina no relatório
const TIPOS_ROTINA = [3, 4, 5, 6].map((n) => ({
  id: `rotina${n}`, titulo: `Rotina com ${n} passos`, icone: '🧩', cor: '#2e9e5b',
  regra: `Ordenar ${n} passos de uma tarefa do dia a dia: pensar no que vem primeiro, no meio e por último (planejamento e sequência).`,
}));
let rotina = null;   // a partida em andamento

function telaRotinaMenu() {
  pararRotina();
  mascote('davi-rotina', 'oi');
  mostrar('tela-rotina-menu');
}

function comecarRotina() {
  pararRotina();
  definirMissao({ id: 'rotina', rotina: true, icone: '🧩', cor: '#2e9e5b', titulo: 'Rotina Certa (sequência e planejamento)' });
  definirResultados([]);
  rotina = { fila: embaralhar(ROTINAS), feitas: 0, nivel: 1, nivelMax: 1, pontos: 0, acertosPrimeira: 0, tentativasTotal: 0, rodando: true };
  mostrar('tela-rotina');
  novaRotina();
}

function pararRotina() {
  if (rotina) { rotina.rodando = false; clearInterval(rotina.relogio); clearTimeout(rotina.proxima); }
  rotina = null;
}

// escolhe quantos passos usar pelo nível, sempre mantendo a ordem original (o primeiro e o último ficam sempre)
function passosDoNivel(r, n) {
  if (n >= r.passos.length) return r.passos.map((p, i) => ({ id: i, icone: p[0], texto: p[1] }));
  const meio = embaralhar(r.passos.slice(1, -1).map((_, i) => i + 1)).slice(0, n - 2).sort((a, b) => a - b);
  return [0, ...meio, r.passos.length - 1].map((i) => ({ id: i, icone: r.passos[i][0], texto: r.passos[i][1] }));
}

function novaRotina() {
  if (!rotina || !rotina.rodando) return;
  if (rotina.feitas >= rotina.fila.length) { terminarRotina(); return; }
  const r = rotina.fila[rotina.feitas];
  rotina.feitas++;
  const certos = passosDoNivel(r, rotina.nivel + 2);
  let ordem;
  do { ordem = embaralhar(certos); } while (ordem.every((p, i) => p === certos[i]));   // nunca começa já certa
  Object.assign(rotina, { atual: r, certos, ordem, presos: new Set(), tentativas: 0, t0: performance.now(), selecionado: null, respondendo: true });
  $('rotina-nivel').textContent = `🧩 Nível ${rotina.nivel} de ${ROTINA.NIVEL_MAX}`;
  $('rotina-pontos').textContent = rotina.pontos;
  $('rotina-contador').textContent = `Rotina ${rotina.feitas} de ${rotina.fila.length}`;
  $('rotina-tarefa').textContent = `${r.icone} ${r.titulo}`;
  msgRotina(`Coloque os ${certos.length} passos na ordem certa.`);
  $('btn-rotina-testar').disabled = false;
  desenharPilha(true);
  clearInterval(rotina.relogio);
  rotina.relogio = setInterval(() => {
    if (rotina && rotina.respondendo) $('rotina-tempo').textContent = `⏱ ${segundos((performance.now() - rotina.t0) / 1000)}`;
  }, 200);
}
const msgRotina = (texto, tipo = '') => { $('rotina-msg').textContent = texto; $('rotina-msg').className = `rotina-msg ${tipo}`; };

// a pilha: cada botão fica numa "vaga" (top = posição × altura); ao arrastar, os outros deslizam para abrir espaço
const alturaVaga = () => { const b = $('rotina-pilha').querySelector('.passo-rotina'); return b ? b.offsetHeight + 8 : 60; };
function desenharPilha(novos) {
  const pilha = $('rotina-pilha');
  if (novos) {
    pilha.innerHTML = rotina.ordem.map((p) =>
      `<button class="passo-rotina" type="button" role="listitem" data-id="${p.id}"><span class="passo-num"></span><span class="passo-icone" aria-hidden="true">${p.icone}</span><span class="passo-texto">${seguro(p.texto)}</span><span class="passo-alca" aria-hidden="true">⠿</span></button>`).join('');
  }
  const h = alturaVaga();
  pilha.style.height = `${rotina.ordem.length * h - 8}px`;
  rotina.ordem.forEach((p, i) => {
    const b = pilha.querySelector(`[data-id="${p.id}"]`);
    if (!b.classList.contains('arrastando')) b.style.transform = `translateY(${i * h}px)`;
    b.querySelector('.passo-num').textContent = i + 1;
    b.setAttribute('aria-label', `Posição ${i + 1}: ${p.texto}`);
    b.classList.toggle('preso', rotina.presos.has(p.id));
    b.classList.toggle('selecionado', rotina.selecionado === p.id);
  });
}

// arrastar: o botão "levanta" (antecipação), segue o dedo e os outros abrem espaço; ao soltar, encaixa com um quique
let arrastoRotina = null;
$('rotina-pilha').addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.passo-rotina');
  if (!b || !rotina || !rotina.respondendo) return;
  const id = Number(b.dataset.id);
  if (rotina.presos.has(id)) return;
  e.preventDefault();
  arrastoRotina = { b, id, y0: e.clientY, inicio: rotina.ordem.findIndex((p) => p.id === id), moveu: false };
});
document.addEventListener('pointermove', (e) => {
  if (!arrastoRotina || !rotina) return;
  const a = arrastoRotina, h = alturaVaga();
  const dy = e.clientY - a.y0;
  if (!a.moveu && Math.abs(dy) < 6) return;
  if (!a.moveu) { a.moveu = true; a.b.classList.add('arrastando'); rotina.selecionado = null; }
  const max = (rotina.ordem.length - 1) * h;
  const y = Math.max(-h * 0.3, Math.min(max + h * 0.3, a.inicio * h + dy));
  a.b.style.transform = `translateY(${y}px) scale(1.04)`;
  // vaga para onde o botão está indo (os presos não saem do lugar)
  let alvo = Math.max(0, Math.min(rotina.ordem.length - 1, Math.round(y / h)));
  if (rotina.presos.has(rotina.ordem[alvo].id)) return;
  const atual = rotina.ordem.findIndex((p) => p.id === a.id);
  if (alvo !== atual) {
    const [item] = rotina.ordem.splice(atual, 1);
    rotina.ordem.splice(alvo, 0, item);
    // os presos voltam para a vaga deles
    corrigirPresos();
    desenharPilha(false);
  }
});
function soltarRotina() {
  if (!arrastoRotina) return;
  const { b, moveu } = arrastoRotina;
  arrastoRotina = null;
  if (!rotina) return;
  if (!moveu) { tocarPassoRotina(Number(b.dataset.id)); return; }
  b.classList.remove('arrastando');
  b.classList.add('encaixou');
  setTimeout(() => b.classList.remove('encaixou'), 260);
  tocar([[523, 0.06]]);
  desenharPilha(false);
}
document.addEventListener('pointerup', soltarRotina);
document.addEventListener('pointercancel', soltarRotina);

// mantém cada passo preso (já testado como certo) na sua posição certa
function corrigirPresos() {
  const livres = rotina.ordem.filter((p) => !rotina.presos.has(p.id));
  rotina.ordem = rotina.certos.map((p) => (rotina.presos.has(p.id) ? p : livres.shift()));
}

// sem arrastar: toca em um passo e depois em outro para trocarem de lugar
function tocarPassoRotina(id) {
  if (rotina.presos.has(id)) return;
  if (rotina.selecionado == null) { rotina.selecionado = id; SOM.clique(); desenharPilha(false); return; }
  if (rotina.selecionado !== id) {
    const i = rotina.ordem.findIndex((p) => p.id === rotina.selecionado), j = rotina.ordem.findIndex((p) => p.id === id);
    [rotina.ordem[i], rotina.ordem[j]] = [rotina.ordem[j], rotina.ordem[i]];
    tocar([[523, 0.06]]);
  }
  rotina.selecionado = null;
  desenharPilha(false);
}

$('btn-rotina-testar').onclick = () => {
  if (!rotina || !rotina.respondendo) return;
  rotina.tentativas++;
  rotina.tentativasTotal++;
  rotina.selecionado = null;
  const erradas = [];
  rotina.ordem.forEach((p, i) => { if (p.id === rotina.certos[i].id) rotina.presos.add(p.id); else erradas.push(p); });
  const pilha = $('rotina-pilha');
  pilha.querySelectorAll('.passo-rotina').forEach((b) => b.classList.remove('errado'));
  if (!erradas.length) { fimDaRotina(true); return; }
  // o primeiro passo fora do lugar vira a dica no relatório
  const i = rotina.ordem.findIndex((p, k) => p.id !== rotina.certos[k].id);
  rotina.primeiroErro = rotina.primeiroErro || `pôs "${rotina.ordem[i].texto}" no lugar de "${rotina.certos[i].texto}"`;
  erradas.forEach((p) => pilha.querySelector(`[data-id="${p.id}"]`).classList.add('errado'));
  SOM.errado();
  pilha.classList.remove('tremer');
  void pilha.offsetWidth;
  pilha.classList.add('tremer');
  desenharPilha(false);
  if (rotina.tentativas >= ROTINA.TENTATIVAS) { fimDaRotina(false); return; }
  msgRotina(`${erradas.length} ${erradas.length === 1 ? 'passo está' : 'passos estão'} fora do lugar. Os verdes já estão certos: tente de novo!`, 'erro');
};

function fimDaRotina(acertou) {
  rotina.respondendo = false;
  clearInterval(rotina.relogio);
  $('btn-rotina-testar').disabled = true;
  const tempo = (performance.now() - rotina.t0) / 1000;
  const n = rotina.certos.length;
  const tipo = TIPOS_ROTINA[n - 3];
  const texto = `${rotina.atual.titulo} (${n} passos)`;
  if (acertou) {
    // pontos: base pelo nível, bônus de rapidez e menos pontos a cada tentativa a mais
    const bom = n * 3;
    const bonus = Math.max(0, Math.min(100, Math.round(100 * (1 - (tempo - bom) / (bom * 2)))));
    const ganho = Math.max(10, Math.round((30 * rotina.nivel + bonus) / rotina.tentativas));
    rotina.pontos += ganho;
    const primeira = rotina.tentativas === 1;
    if (primeira) rotina.acertosPrimeira++;
    resultados.push({ m: tipo, certa: texto, erros: primeira ? [] : [`acertou na ${rotina.tentativas}ª tentativa; ${rotina.primeiroErro}`], nivel: rotina.nivel, tempo });
    SOM.certo();
    msgRotina(primeira ? `✅ Ordem perfeita! +${ganho} pontos em ${segundos(tempo)}` : `✅ Agora sim! +${ganho} pontos`, 'ok');
    $('rotina-pilha').querySelectorAll('.passo-rotina').forEach((b, i) => setTimeout(() => b.classList.add('festa'), i * 70));
    rotina.nivel = primeira ? Math.min(ROTINA.NIVEL_MAX, rotina.nivel + 1) : rotina.nivel;
  } else {
    // depois de 3 tentativas mostra a ordem certa
    resultados.push({ m: tipo, certa: texto, erros: [`não conseguiu em ${ROTINA.TENTATIVAS} tentativas; ${rotina.primeiroErro}`], nivel: rotina.nivel, tempo });
    rotina.ordem = rotina.certos.slice();
    rotina.certos.forEach((p) => rotina.presos.add(p.id));
    desenharPilha(false);
    msgRotina('Esta é a ordem certa. Vamos para a próxima!', 'erro');
    rotina.nivel = Math.max(1, rotina.nivel - 1);
  }
  rotina.primeiroErro = '';
  rotina.nivelMax = Math.max(rotina.nivelMax, rotina.nivel);
  $('rotina-pontos').textContent = rotina.pontos;
  rotina.proxima = setTimeout(novaRotina, acertou ? 1800 : 3200);
}

function terminarRotina() {
  const r = rotina;
  pararRotina();
  const tempos = resultados.filter((x) => !x.erros.length).map((x) => x.tempo);
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${r.pontos}. Chegou a rotinas de ${r.nivelMax + 2} passos (nível ${r.nivelMax} de ${ROTINA.NIVEL_MAX}).`,
    `Acertou de primeira ${r.acertosPrimeira} de ${r.feitas} rotinas; usou ${r.tentativasTotal} tentativas no total.`,
    ...(tempos.length ? [`Tempo médio para ordenar (acertos de primeira): ${segundos(tempos.reduce((s, t) => s + t, 0) / tempos.length)}.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = r.acertosPrimeira === r.feitas ? 'Rotina perfeita!' : 'Rotinas concluídas!';
  $('fim-texto').textContent = `${aluno}, você organizou ${r.feitas} rotinas e fez ${r.pontos} pontos!`;
}

$('btn-rotina').onclick = () => { SOM.clique(); escolherProfessorE('Rotina Certa', telaRotinaMenu); };
$('rotina-voltar').onclick = telaJogos;
$('btn-rotina-comecar').onclick = () => { SOM.clique(); comecarRotina(); };
$('rotina-sair').onclick = telaRotinaMenu;

export { comecarRotina, pararRotina, ROTINA, telaRotinaMenu };
