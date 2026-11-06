/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Palitos Sobrepostos. */

import { $, embaralhar, sortear } from './util.js?v=235';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=235';
import { frase, pararVoz, SOM, tocar } from './som.js?v=235';
import { mascote, mostrar, telaJogos } from './telas.js?v=235';
import { escolherProfessorE } from './professor.js?v=235';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=235';

// ---------- Palitos Sobrepostos ----------
// Percepção visual (figura e fundo) e controle inibitório: de 3 a 6 palitos coloridos, um por cima do outro, e a
// pergunta sobre a ordem: "De cima para baixo, qual é o 3º palito?" (ou de baixo para cima). As 3 respostas são
// palavras de cor escritas com tinta de OUTRA cor (como no teste de Stroop): vale a palavra, não a cor da letra.
// Uma das erradas sempre vem escrita com a tinta da cor certa, para pegar quem vai pela cor da letra; a outra é o
// palito vizinho ou o do lado contrário da contagem. Depois da resposta, os palitos ganham o número da contagem.
// Acertou: sobe um nível; errou: desce.
const PALITOS = { RODADAS: 10, NIVEL_MAX: 6, PAUSA: 2700 };
const NIVEIS_PA = [
  { n: 3, so: 'ponta', titulo: '3 palitos: o de cima e o de baixo' },
  { n: 3, titulo: '3 palitos' },
  { n: 4, titulo: '4 palitos' },
  { n: 5, titulo: '5 palitos' },
  { n: 6, so: 'cima', titulo: '6 palitos, de cima para baixo' },
  { n: 6, titulo: '6 palitos, contando dos dois lados' },
];
const TIPOS_PA = NIVEIS_PA.map((c, i) => ({
  id: `palitos${i + 1}`, titulo: `Nível ${i + 1}: ${c.titulo}`, icone: '🥢', cor: '#8e44ad',
  regra: 'Seguir cada palito com os olhos: quem passa por cima esconde o outro. Contar a partir do lado pedido e ler a PALAVRA da resposta (não a cor da letra).',
}));
const CORES_PA = {
  vermelho: { cor: '#e53935', tinta: '#d32f2f' },
  azul: { cor: '#1e64d2', tinta: '#1e64d2' },
  amarelo: { cor: '#f5c518', tinta: '#c99700' },
  verde: { cor: '#2e9e5b', tinta: '#23854b' },
  roxo: { cor: '#8e44ad', tinta: '#8e44ad' },
  laranja: { cor: '#f08a24', tinta: '#e06b00' },
};
const NOMES_CORES = Object.keys(CORES_PA);
let palitos = null;   // a partida em andamento

// os palitos passam perto do centro, com ângulos bem diferentes; todos se cruzam (senão não dá para saber a ordem)
function cruzam([a, b], [c, d]) {
  const lado = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return lado(a, b, c) !== lado(a, b, d) && lado(c, d, a) !== lado(c, d, b);
}
function novosPalitos(n) {
  for (let t = 0; t < 400; t++) {
    const angulos = [];
    const base = Math.random() * 180;
    for (let k = 0; k < n; k++) angulos.push(base + (180 / n) * k + (Math.random() - 0.5) * (120 / n));
    const lista = embaralhar(angulos).map((ang) => {
      const r = (ang * Math.PI) / 180, meio = 105 + Math.random() * 20;
      const cx = 150 + (Math.random() - 0.5) * 60, cy = 150 + (Math.random() - 0.5) * 60;
      return [{ x: cx - Math.cos(r) * meio, y: cy - Math.sin(r) * meio }, { x: cx + Math.cos(r) * meio, y: cy + Math.sin(r) * meio }];
    });
    const dentro = lista.every((s) => s.every((p) => p.x > 22 && p.x < 278 && p.y > 22 && p.y < 278));
    if (!dentro) continue;
    let ok = true;
    for (let i = 0; i < n && ok; i++) for (let j = i + 1; j < n && ok; j++) if (!cruzam(lista[i], lista[j])) ok = false;
    if (ok) return lista;
  }
  return null;
}

// desenho: o primeiro da lista fica embaixo (pinta primeiro); contorno escuro para ver bem onde um passa sobre o outro
function palitosSVG(r, { numeros = false, destaque = -1 } = {}) {
  const corpo = r.pilha.map((cor, i) => {
    const [a, b] = r.segs[i];
    // o pedido ganha um contorno dourado no próprio lugar da pilha (deixar os outros transparentes fazia o de baixo
    // parecer estar por cima)
    const brilho = i === destaque ? `<line class="palito-brilho" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#ffd43b" stroke-width="37" stroke-linecap="round"/>` : '';
    return `<g class="palito" style="--i:${i}">${brilho}<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#13294b" stroke-width="27" stroke-linecap="round"/>`
      + `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${CORES_PA[cor].cor}" stroke-width="21" stroke-linecap="round"/></g>`;
  }).join('');
  // os números da contagem pedida (1º = o primeiro do lado da pergunta), na ponta de cada palito
  const marcas = numeros ? r.pilha.map((_, i) => {
    const pos = r.lado === 'cima' ? r.pilha.length - i : i + 1;
    const p = r.segs[i][0];
    return `<g class="palito-num"><circle cx="${p.x}" cy="${p.y}" r="13" fill="#fff" stroke="#13294b" stroke-width="2.5"/>`
      + `<text x="${p.x}" y="${p.y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#13294b" font-family="Fredoka, sans-serif">${pos}º</text></g>`;
  }).join('') : '';
  return `<svg class="palitos-svg" viewBox="0 0 300 300" role="img" aria-label="Palitos sobrepostos">${corpo}${marcas}</svg>`;
}

// a rodada: as cores de baixo para cima, o lado e a posição perguntados e as 3 respostas (palavra + tinta)
function novaRodada(nivel) {
  const cfg = NIVEIS_PA[nivel - 1];
  const segs = novosPalitos(cfg.n);
  const pilha = embaralhar(NOMES_CORES).slice(0, cfg.n);   // pilha[0] é o de baixo
  const lado = cfg.so === 'cima' ? 'cima' : sortear(['cima', 'baixo']);
  const pos = cfg.so === 'ponta' ? 1 : 1 + Math.floor(Math.random() * cfg.n);
  // índice na pilha (de baixo para cima) do palito pedido
  const idx = (p, l) => (l === 'cima' ? cfg.n - p : p - 1);
  const certa = pilha[idx(pos, lado)];
  const espelho = pilha[idx(pos, lado === 'cima' ? 'baixo' : 'cima')];
  const vizinhos = [pilha[idx(pos, lado) - 1], pilha[idx(pos, lado) + 1]].filter(Boolean);
  // a outra palavra errada: o do lado contrário da contagem, senão um vizinho, senão qualquer outra cor da pilha
  const outra = (espelho !== certa ? espelho : null) || sortear(vizinhos) || sortear(pilha.filter((c) => c !== certa));
  const motivoOutra = outra === espelho ? 'contou do lado contrário' : 'errou a posição (pegou o palito vizinho)';
  // a armadilha: uma palavra errada escrita com a tinta da cor certa
  const armadilha = sortear(pilha.filter((c) => c !== certa && c !== outra)) || sortear(NOMES_CORES.filter((c) => c !== certa && c !== outra));
  const opcoes = [
    { palavra: certa, certa: true },
    { palavra: outra, motivo: motivoOutra },
    { palavra: armadilha, tinta: certa, motivo: 'foi pela cor da letra, e não pela palavra' },
  ];
  // tintas: nunca a cor da própria palavra; a certa pega a cor de uma das erradas (para confundir de verdade)
  opcoes[0].tinta = sortear([outra, armadilha]);
  opcoes[1].tinta = sortear(NOMES_CORES.filter((c) => c !== outra && c !== certa));
  return { cfg, segs, pilha, lado, pos, certa, opcoes: embaralhar(opcoes) };
}
const textoPergunta = (r) => (r.cfg.so === 'ponta'
  ? (r.lado === 'cima' ? 'Qual palito está por cima de todos?' : 'Qual palito está embaixo de todos?')
  : `${r.lado === 'cima' ? 'De cima para baixo' : 'De baixo para cima'}, qual é o ${r.pos}º palito?`);

function telaPalitosMenu() {
  pararPalitos();
  mascote('davi-palitos', 'oi');
  mostrar('tela-palitos-menu');
}

function comecarPalitos() {
  pararPalitos();
  definirMissao({ id: 'palitos', palitos: true, icone: '🥢', cor: '#8e44ad', titulo: 'Palitos Sobrepostos' });
  definirResultados([]);
  palitos = { nivel: 1, nivelMax: 1, feitas: 0, acertos: 0, pontos: 0, tinta: 0, lado: 0, posicao: 0, rodada: null, timers: [], rodando: true };
  mostrar('tela-palitos');
  proximaPalitos();
}

function pararPalitos() {
  if (palitos) { palitos.rodando = false; palitos.timers.forEach(clearTimeout); pararVoz(); }
  palitos = null;
}
const depoisPalitos = (ms, fn) => { const p = palitos; const t = setTimeout(() => { if (palitos === p && p.rodando) fn(); }, ms); p.timers.push(t); };
const msgPalitos = (texto, tipo = '') => { $('palitos-msg').innerHTML = texto; $('palitos-msg').className = `cores-msg ${tipo}`; };
const falarPergunta = () => { if (palitos && palitos.rodada) frase('', textoPergunta(palitos.rodada)); };

function hudPalitos() {
  $('palitos-nivel').textContent = `🥢 Nível ${palitos.nivel}`;
  $('palitos-pontos').textContent = palitos.pontos;
  $('palitos-contador').textContent = `${palitos.feitas}/${PALITOS.RODADAS}`;
}

function proximaPalitos() {
  if (palitos.feitas >= PALITOS.RODADAS) { terminarPalitos(); return; }
  const r = novaRodada(palitos.nivel);
  palitos.feitas++;
  palitos.rodada = { ...r, n: palitos.nivel, respondida: false, t0: performance.now() };
  hudPalitos();
  $('palitos-figura').innerHTML = palitosSVG(r);
  $('palitos-figura').firstChild.classList.add('cai');
  $('palitos-pergunta').innerHTML = textoPergunta(r).replace(/(De cima para baixo|De baixo para cima|por cima de todos|embaixo de todos)/, '<b>$1</b>');
  msgPalitos(palitos.feitas === 1 ? '⚠️ Leia a <b>palavra</b>! A cor da letra é só para confundir.' : '');
  tocar([[523, 0.07], [659, 0.09]]);
  const caixa = $('palitos-opcoes');
  caixa.innerHTML = '';
  r.opcoes.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'palitos-opcao';
    b.dataset.tecla = i + 1;
    b.style.animationDelay = `${i * 90}ms`;
    b.style.color = CORES_PA[o.tinta].tinta;
    b.textContent = o.palavra.toUpperCase();
    b.setAttribute('aria-label', o.palavra);
    b.onclick = () => responderPalitos(o, b);
    caixa.append(b);
  });
  depoisPalitos(350, falarPergunta);
}

function responderPalitos(opcao, botao) {
  const r = palitos && palitos.rodada;
  if (!r || r.respondida || !palitos.rodando) return;
  r.respondida = true;
  const tempo = (performance.now() - r.t0) / 1000;
  const botoes = [...document.querySelectorAll('#palitos-opcoes .palitos-opcao')];
  botoes.forEach((b) => { b.disabled = true; });
  const tipo = TIPOS_PA[r.n - 1];
  const ordem = `${r.lado === 'cima' ? 'de cima para baixo' : 'de baixo para cima'}: ${(r.lado === 'cima' ? [...r.pilha].reverse() : r.pilha).join(', ')}`;
  const certa = `${r.pos}º ${r.lado === 'cima' ? 'de cima' : 'de baixo'} = ${r.certa} (${ordem})`;
  // depois da resposta: os números da contagem e o palito pedido em destaque
  $('palitos-figura').innerHTML = palitosSVG(r, { numeros: true, destaque: r.pilha.indexOf(r.certa) });
  pararVoz();
  if (opcao.certa) {
    palitos.pontos += 10 * r.n + Math.round(Math.max(0, 1 - tempo / 20) * 10);
    palitos.acertos++;
    botao.classList.add('certa');
    botoes.forEach((b) => { if (b !== botao) b.classList.add('apagada'); });
    resultados.push({ m: tipo, certa, erros: [], nivel: r.n, tempo });
    palitos.nivel = Math.min(PALITOS.NIVEL_MAX, palitos.nivel + 1);
    palitos.nivelMax = Math.max(palitos.nivelMax, palitos.nivel);
    msgPalitos(`✅ Isso! É o palito <b>${r.certa}</b>.`, 'ok');
    SOM.certo();
    frase('', `Isso! ${r.certa}!`);
  } else {
    botao.classList.add('errada');
    const certoEl = botoes[r.opcoes.findIndex((o) => o.certa)];
    if (certoEl) certoEl.classList.add('certa');
    botoes.forEach((b) => { if (b !== botao && b !== certoEl) b.classList.add('apagada'); });
    if (opcao.motivo.includes('cor da letra')) palitos.tinta++; else if (opcao.motivo.includes('contrário')) palitos.lado++; else palitos.posicao++;
    resultados.push({ m: tipo, certa, erros: [`escolheu "${opcao.palavra}" escrito em ${opcao.tinta} (${opcao.motivo})`], nivel: r.n, tempo });
    palitos.nivel = Math.max(1, palitos.nivel - 1);
    const dica = opcao.motivo.includes('cor da letra') ? 'Você foi pela cor da letra: leia a palavra!'
      : opcao.motivo.includes('contrário') ? `Comece a contar ${r.lado === 'cima' ? 'pelo palito de cima' : 'pelo palito de baixo'}.`
        : 'Veja os números: conte um palito de cada vez.';
    msgPalitos(`Quase! Era o palito <b>${r.certa}</b>. ${dica}`, 'erro');
    SOM.errado();
    frase('', `Quase! Era o ${r.certa}.`);
  }
  hudPalitos();
  depoisPalitos(PALITOS.PAUSA + (opcao.certa ? 0 : 2000), proximaPalitos);
}

function terminarPalitos() {
  const { acertos, feitas, pontos, nivelMax, tinta, lado, posicao } = palitos;
  pararPalitos();
  missao.resumo = [
    `Acertou ${acertos} de ${feitas} perguntas e chegou ao nível ${nivelMax} de ${PALITOS.NIVEL_MAX} (até ${NIVEIS_PA[nivelMax - 1].n} palitos).`,
    tinta + lado + posicao
      ? `Foi pela cor da letra: ${tinta}. Contou do lado contrário: ${lado}. Errou a posição: ${posicao}.`
      : 'Não errou nenhuma pergunta.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Olhos de águia! 🦅' : 'Fim dos palitos!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitas} perguntas e fez ${pontos} pontos!`;
}

// teclas 1 a 3 escolhem a resposta no computador
document.addEventListener('keydown', (e) => {
  if (!palitos || !$('tela-palitos').classList.contains('ativa')) return;
  const b = document.querySelector(`#palitos-opcoes .palitos-opcao[data-tecla="${e.key}"]`);
  if (b && !b.disabled) b.click();
});

// capa do cartão: três palitos cruzados, como na folha
$('palitos-capa').innerHTML = palitosSVG({
  pilha: ['amarelo', 'azul', 'vermelho'],
  segs: [[{ x: 50, y: 210 }, { x: 250, y: 210 }], [{ x: 70, y: 70 }, { x: 230, y: 230 }], [{ x: 40, y: 150 }, { x: 260, y: 60 }]],
});

$('btn-palitos').onclick = () => { SOM.clique(); escolherProfessorE('Palitos Sobrepostos', telaPalitosMenu); };
$('palitos-voltar').onclick = telaJogos;
$('btn-palitos-comecar').onclick = () => { SOM.clique(); comecarPalitos(); };
$('palitos-sair').onclick = telaPalitosMenu;
$('palitos-ouvir').onclick = falarPergunta;

export { comecarPalitos, PALITOS, pararPalitos, telaPalitosMenu };
