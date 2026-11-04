/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Jogo da Fila. */

import { $, embaralhar, sortear } from './util.js?v=184';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=184';
import { frase, pararVoz, SOM, tocar } from './som.js?v=184';
import { mascote, mostrar, telaJogos } from './telas.js?v=184';
import { escolherProfessorE } from './professor.js?v=184';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=184';

// ---------- Jogo da Fila ----------
// Raciocínio lógico e linguagem de posição: as crianças da fila aparecem com o nome e as pistas vêm uma por vez
// ("Caio é o último", "Elisa fica logo depois de Pedro"...). Depois da última pista, 3 filas desenhadas (só as crianças)
// e a criança toca na fila certa. O enigma sempre tem uma resposta só: as pistas são sorteadas entre as verdadeiras
// e o jogo confere, por força bruta (no máximo 6! = 720 filas), que só a fila certa cumpre todas.
// As duas filas erradas cumprem todas as pistas menos uma: o relatório mostra qual pista ficou para trás.
// Começa com 3 crianças e pistas de lugar fixo; acertou, sobe um nível; errou, desce.
const FILA = { RODADAS: 8, NIVEL_MAX: 6, PAUSA: 2600 };
const NIVEIS_FI = [
  // começa com 3 (com 2 crianças só existem 2 filas, e são 3 alternativas); no 1º nível, só pistas de lugar fixo
  { n: 3, tipos: ['primeiro', 'ultimo', 'posicao'], titulo: 'Fila de 3 (primeiro e último)' },
  { n: 3, tipos: ['primeiro', 'ultimo', 'logoDepois', 'logoAntes', 'posicao'], titulo: 'Fila de 3 com "logo depois"' },
  { n: 4, tipos: ['primeiro', 'ultimo', 'logoDepois', 'logoAntes', 'posicao'], titulo: 'Fila de 4' },
  { n: 4, tipos: ['ultimo', 'logoDepois', 'logoAntes', 'antes', 'depois', 'entre'], titulo: 'Fila de 4 com "antes" e "entre"' },
  { n: 5, tipos: ['ultimo', 'primeiro', 'logoDepois', 'antes', 'depois', 'entre'], titulo: 'Fila de 5' },
  { n: 6, tipos: ['logoDepois', 'logoAntes', 'antes', 'depois', 'entre', 'naoPrimeiro', 'naoUltimo', 'ultimo'], titulo: 'Fila de 6' },
];
const TIPOS_FI = NIVEIS_FI.map((c, i) => ({
  id: `fila${i + 1}`, titulo: `Nível ${i + 1}: ${c.titulo}`, icone: '🧍', cor: '#e5484d',
  regra: i < 3
    ? 'Ler cada pista e colocar a criança no lugar: o 1º da fila é o da frente; "logo depois" é o lugar seguinte, colado.'
    : '"Antes" e "depois" podem ter gente no meio; "logo" quer dizer colado. Usar uma pista de cada vez e conferir todas no fim.',
}));

// as crianças: nome, se é menina (para "o primeiro" / "a primeira") e o visual do desenho
const CRIANCAS = [
  { nome: 'Caio', a: false, pele: '#f6c9a6', cabelo: '#d9692c', estilo: 'espetado', blusa: '#e5484d', short: '#3b6fa8', tenis: '#8a5a33' },
  { nome: 'Bia', a: true, pele: '#8d5a3b', cabelo: '#2b1a12', estilo: 'puff', blusa: '#f5c518', short: '#3b6fa8', tenis: '#f2f2f2' },
  { nome: 'Pedro', a: false, pele: '#f3c39c', cabelo: '#e0892f', estilo: 'curto', blusa: '#f5a623', short: '#4a7fb5', tenis: '#e8e8e8' },
  { nome: 'Elisa', a: true, pele: '#f6cfb0', cabelo: '#7a4a2a', estilo: 'bob', blusa: '#efe4d2', short: '#a0723f', tenis: '#8a5a33' },
  { nome: 'Iara', a: true, pele: '#f1c6a6', cabelo: '#8b4a2b', estilo: 'rabo', blusa: '#f28b8b', short: '#3b6fa8', tenis: '#e5484d' },
  { nome: 'Léo', a: false, pele: '#c98b5e', cabelo: '#1f1f1f', estilo: 'curto', blusa: '#3fae5a', short: '#555b66', tenis: '#f2f2f2' },
];
const POR_NOME = Object.fromEntries(CRIANCAS.map((c) => [c.nome, c]));

// desenho de uma criança (viewBox 60 x 110), no estilo das ilustrações infantis: cabeça grande e sorriso
function criancaSVG(c, classe = '') {
  const cabelo = {
    curto: `<path d="M13 32 Q12 12 30 11 Q48 12 47 32 Q44 22 30 21 Q16 22 13 32Z" fill="${c.cabelo}"/>`,
    espetado: `<path d="M13 32 Q11 16 18 13 L20 7 L25 12 L30 5 L34 11 L40 7 L42 14 Q49 18 47 32 Q44 22 30 21 Q16 22 13 32Z" fill="${c.cabelo}"/>`,
    puff: `<circle cx="30" cy="9" r="8" fill="${c.cabelo}"/><path d="M12 34 Q9 12 30 12 Q51 12 48 34 Q46 22 30 22 Q14 22 12 34Z" fill="${c.cabelo}"/><circle cx="30" cy="13" r="2.4" fill="#e5484d"/>`,
    bob: `<path d="M11 44 Q7 12 30 11 Q53 12 49 44 L44 44 Q46 26 30 22 Q14 26 16 44Z" fill="${c.cabelo}"/>`,
    rabo: `<path d="M13 33 Q11 12 30 11 Q49 12 47 33 Q44 22 30 21 Q16 22 13 33Z" fill="${c.cabelo}"/><path d="M46 22 Q58 26 54 44 Q51 34 45 30Z" fill="${c.cabelo}"/><circle cx="47" cy="23" r="2.2" fill="#e5484d"/>`,
  }[c.estilo];
  return `<svg class="crianca ${classe}" viewBox="0 0 60 110" role="img" aria-label="${c.nome}">
    <rect x="20" y="86" width="7" height="16" rx="3" fill="${c.pele}"/><rect x="33" y="86" width="7" height="16" rx="3" fill="${c.pele}"/>
    <rect x="16" y="100" width="13" height="7" rx="3.5" fill="${c.tenis}" stroke="#13294b" stroke-width="1"/><rect x="31" y="100" width="13" height="7" rx="3.5" fill="${c.tenis}" stroke="#13294b" stroke-width="1"/>
    <path d="M17 74 H43 V88 H32 L30 82 L28 88 H17Z" fill="${c.short}"/>
    <rect x="7" y="56" width="8" height="24" rx="4" fill="${c.pele}" transform="rotate(8 11 56)"/><rect x="45" y="56" width="8" height="24" rx="4" fill="${c.pele}" transform="rotate(-8 49 56)"/>
    <path d="M14 58 Q14 51 22 50 H38 Q46 51 46 58 V77 H14Z" fill="${c.blusa}"/><path d="M8 58 Q10 51 17 51 L18 63 L9 64Z" fill="${c.blusa}"/><path d="M52 58 Q50 51 43 51 L42 63 L51 64Z" fill="${c.blusa}"/>
    <rect x="26" y="44" width="8" height="8" fill="${c.pele}"/>
    <ellipse cx="30" cy="31" rx="17" ry="17" fill="${c.pele}"/>${cabelo}
    <ellipse cx="24" cy="32" rx="2" ry="2.4" fill="#2b1a12"/><ellipse cx="36" cy="32" rx="2" ry="2.4" fill="#2b1a12"/>
    <ellipse cx="20" cy="38" rx="3" ry="2" fill="#f28b8b" opacity=".55"/><ellipse cx="40" cy="38" rx="3" ry="2" fill="#f28b8b" opacity=".55"/>
    <path d="M24 39 Q30 45 36 39" stroke="#7a2e1e" stroke-width="1.8" fill="#fff" stroke-linecap="round"/>
  </svg>`;
}

// ---- as pistas: cada uma sabe se vale numa fila (p = lista de nomes, p[0] é o primeiro) e como se escreve ----
const art = (x, m, f) => (POR_NOME[x].a ? f : m);
const PISTAS = {
  primeiro: { vale: (p, { a }) => p[0] === a, texto: ({ a }) => `${a} é ${art(a, 'o primeiro', 'a primeira')} da fila.` },
  ultimo: { vale: (p, { a }) => p[p.length - 1] === a, texto: ({ a }) => `${a} é ${art(a, 'o último', 'a última')} da fila.` },
  posicao: { vale: (p, { a, n }) => p[n - 1] === a, texto: ({ a, n }) => `${a} está no lugar ${n}.` },
  logoDepois: { vale: (p, { a, b }) => p.indexOf(a) === p.indexOf(b) + 1, texto: ({ a, b }) => `${a} fica logo depois de ${b}.` },
  logoAntes: { vale: (p, { a, b }) => p.indexOf(a) === p.indexOf(b) - 1, texto: ({ a, b }) => `${a} fica logo antes de ${b}.` },
  antes: { vale: (p, { a, b }) => p.indexOf(a) < p.indexOf(b), texto: ({ a, b }) => `${a} está antes de ${b} (pode ter gente no meio).` },
  depois: { vale: (p, { a, b }) => p.indexOf(a) > p.indexOf(b), texto: ({ a, b }) => `${a} está depois de ${b} (pode ter gente no meio).` },
  entre: { vale: (p, { a, b, c }) => Math.abs(p.indexOf(a) - p.indexOf(b)) === 1 && Math.abs(p.indexOf(a) - p.indexOf(c)) === 1,
    texto: ({ a, b, c }) => `${a} fica entre ${b} e ${c}.` },
  naoPrimeiro: { vale: (p, { a }) => p[0] !== a, texto: ({ a }) => `${a} não é ${art(a, 'o primeiro', 'a primeira')}.` },
  naoUltimo: { vale: (p, { a }) => p[p.length - 1] !== a, texto: ({ a }) => `${a} não é ${art(a, 'o último', 'a última')}.` },
};
const vale = (p, pista) => PISTAS[pista.t].vale(p, pista);
const textoPista = (pista) => PISTAS[pista.t].texto(pista);

// todas as pistas verdadeiras para a fila certa, só dos tipos do nível
function pistasVerdadeiras(sol, tipos) {
  const lista = [];
  const n = sol.length;
  sol.forEach((a, i) => {
    if (tipos.includes('primeiro') && i === 0) lista.push({ t: 'primeiro', a });
    if (tipos.includes('ultimo') && i === n - 1) lista.push({ t: 'ultimo', a });
    if (tipos.includes('posicao') && i > 0 && i < n - 1) lista.push({ t: 'posicao', a, n: i + 1 });
    if (tipos.includes('naoPrimeiro') && i > 1) lista.push({ t: 'naoPrimeiro', a });
    if (tipos.includes('naoUltimo') && i < n - 2) lista.push({ t: 'naoUltimo', a });
    if (tipos.includes('entre') && i > 0 && i < n - 1) lista.push({ t: 'entre', a, b: sol[i - 1], c: sol[i + 1] });
    sol.forEach((b, j) => {
      if (i === j) return;
      if (tipos.includes('logoDepois') && i === j + 1) lista.push({ t: 'logoDepois', a, b });
      if (tipos.includes('logoAntes') && i === j - 1) lista.push({ t: 'logoAntes', a, b });
      // "antes"/"depois" só quando não são vizinhos (senão viraria "logo")
      if (tipos.includes('antes') && j - i >= 2) lista.push({ t: 'antes', a, b });
      if (tipos.includes('depois') && i - j >= 2) lista.push({ t: 'depois', a, b });
    });
  });
  return lista;
}

function permutacoes(lista) {
  if (lista.length <= 1) return [lista];
  return lista.flatMap((x, i) => permutacoes([...lista.slice(0, i), ...lista.slice(i + 1)]).map((r) => [x, ...r]));
}

// um enigma com resposta única e o mínimo de pistas (cada pista que sobra é necessária)
function novoEnigma(nivel) {
  const cfg = NIVEIS_FI[nivel - 1];
  for (let t = 0; t < 60; t++) {
    const sol = embaralhar(CRIANCAS).slice(0, cfg.n).map((c) => c.nome);
    const todas = permutacoes(sol);
    let restam = todas;
    const pistas = [];
    for (const p of embaralhar(pistasVerdadeiras(sol, cfg.tipos))) {
      if (restam.length === 1) break;
      const depois = restam.filter((f) => vale(f, p));
      if (depois.length < restam.length) { pistas.push(p); restam = depois; }
    }
    if (restam.length !== 1) continue;
    // tira as pistas que não fazem falta
    for (let i = pistas.length - 1; i >= 0; i--) {
      const sem = pistas.filter((_, k) => k !== i);
      if (todas.filter((f) => sem.every((p) => vale(f, p))).length === 1) pistas.splice(i, 1);
    }
    if (pistas.length > cfg.n + 1) continue;
    // no fácil, as pistas de lugar fixo (primeiro, último, lugar N) vêm antes: dá um ponto de partida
    if (nivel <= 3) pistas.sort((x, y) => ['primeiro', 'ultimo', 'posicao'].includes(y.t) - ['primeiro', 'ultimo', 'posicao'].includes(x.t));
    // as filas erradas: as que quebram só uma pista (cada uma, uma pista diferente)
    const erradas = [];
    const usadas = new Set();
    for (const f of embaralhar(todas)) {
      if (f.join() === sol.join()) continue;
      const quebra = pistas.filter((p) => !vale(f, p));
      if (quebra.length === 1 && !usadas.has(quebra[0])) { erradas.push({ fila: f, quebra: quebra[0] }); usadas.add(quebra[0]); }
      if (erradas.length === 2) break;
    }
    // se não houver duas filas que quebram só uma pista, completa com outra fila qualquer
    for (const f of embaralhar(todas)) {
      if (erradas.length >= 2) break;
      if (f.join() !== sol.join() && !erradas.some((e) => e.fila.join() === f.join())) erradas.push({ fila: f, quebra: pistas.find((p) => !vale(f, p)) });
    }
    const opcoes = embaralhar([{ fila: sol, certa: true }, ...erradas]);
    return { cfg, sol, pistas, opcoes };
  }
  return null;
}

let fila = null;   // a partida em andamento

function telaFilaMenu() {
  pararFila();
  mascote('davi-fila', 'oi');
  mostrar('tela-fila-menu');
}

function comecarFila() {
  pararFila();
  definirMissao({ id: 'fila', fila: true, icone: '🧍', cor: '#e5484d', titulo: 'Jogo da Fila' });
  definirResultados([]);
  fila = { nivel: 1, nivelMax: 1, feitas: 0, acertos: 0, pontos: 0, rodada: null, timers: [], rodando: true };
  mostrar('tela-fila');
  proximaFila();
}

function pararFila() {
  if (fila) { fila.rodando = false; fila.timers.forEach(clearTimeout); pararVoz(); }
  fila = null;
}
const depoisFila = (ms, fn) => { const p = fila; const t = setTimeout(() => { if (fila === p && p.rodando) fn(); }, ms); p.timers.push(t); };
const msgFila = (texto, tipo = '') => { $('fila-msg').innerHTML = texto; $('fila-msg').className = `cores-msg ${tipo}`; };

function hudFila() {
  $('fila-nivel').textContent = `🧍 Nível ${fila.nivel}`;
  $('fila-pontos').textContent = fila.pontos;
  $('fila-contador').textContent = `${fila.feitas}/${FILA.RODADAS}`;
}

function proximaFila() {
  if (fila.feitas >= FILA.RODADAS) { terminarFila(); return; }
  const e = novoEnigma(fila.nivel);
  fila.feitas++;
  fila.rodada = { ...e, n: fila.nivel, vistas: 0, respondida: false, t0: 0,
    turma: [...e.sol].sort((x, y) => x.localeCompare(y)),   // em ordem alfabética, para não entregar a resposta
    montagem: Array(e.sol.length).fill(null), escolhida: null };
  hudFila();
  desenharMontagem();
  $('fila-pistas').innerHTML = '';
  $('fila-opcoes').innerHTML = '';
  $('fila-opcoes').hidden = true;
  msgFila('');
  tocar([[523, 0.07], [659, 0.09]]);
  // todas as pistas juntas (numeradas), faladas em sequência, e as 3 filas já embaixo
  $('fila-pistas').innerHTML = e.pistas.map((p, i) => `<li style="--i:${i}"><span class="fila-num">${i + 1}</span><span>${textoPista(p)}</span></li>`).join('');
  fila.rodada.vistas = e.pistas.length;
  depoisFila(300, falarPistas);
  mostrarOpcoes();
}
const falarPistas = () => {
  const r = fila && fila.rodada;
  if (r) frase('', r.pistas.map(textoPista).join(' ').replace(/\(pode ter gente no meio\)/g, ', pode ter gente no meio'));
};

// ---- a fila de montar (rascunho): as crianças de cima (com nome) vão para os lugares 1º, 2º... ----
// Arrastar a criança até o lugar, ou tocar nela e depois no lugar. Tocar numa criança que já está num lugar
// (sem outra escolhida) devolve ela para cima. A resposta continua sendo uma das 3 filas de baixo.
function desenharMontagem() {
  const r = fila.rodada;
  $('fila-turma').innerHTML = r.turma.map((nome) => {
    const usada = r.montagem.includes(nome);
    return `<button type="button" class="fila-pessoa${usada ? ' usada' : ''}${r.escolhida === nome ? ' escolhida' : ''}" data-nome="${nome}" aria-label="${nome}${usada ? ' (já está na fila)' : ''}">`
      + `${criancaSVG(POR_NOME[nome])}<span class="fila-nome">${nome}</span></button>`;
  }).join('');
  $('fila-vagas').innerHTML = r.montagem.map((nome, i) => `<button type="button" class="fila-vaga${nome ? ' ocupada' : ''}${nome && r.escolhida === nome ? ' escolhida' : ''}" data-vaga="${i}"`
    + ` ${nome ? `data-nome="${nome}"` : ''} aria-label="Lugar ${i + 1}${nome ? `: ${nome}` : ', vazio'}"><b>${i + 1}º</b>${nome ? criancaSVG(POR_NOME[nome]) : '<span class="fila-vazia"></span>'}</button>`).join('');
}

// põe a criança no lugar i (quem estava lá vai para o lugar de onde ela saiu, ou volta para cima)
function colocarNaVaga(nome, i) {
  const r = fila.rodada;
  const de = r.montagem.indexOf(nome);
  const ocupante = r.montagem[i];
  if (de >= 0) r.montagem[de] = ocupante && de !== i ? ocupante : null;
  r.montagem[i] = nome;
  r.escolhida = null;
  tocar([[600, 0.05]]);
  desenharMontagem();
}
function devolver(nome) {
  const r = fila.rodada;
  r.montagem = r.montagem.map((x) => (x === nome ? null : x));
  r.escolhida = null;
  desenharMontagem();
}
function tocouNaMontagem(alvo) {
  const r = fila && fila.rodada;
  if (!r || r.respondida) return;
  const vaga = alvo.closest('.fila-vaga');
  const pessoa = alvo.closest('.fila-pessoa');
  if (vaga) {
    const i = Number(vaga.dataset.vaga);
    if (r.escolhida) { colocarNaVaga(r.escolhida, i); return; }
    if (vaga.dataset.nome) { r.escolhida = vaga.dataset.nome; desenharMontagem(); }   // escolhe para mudar de lugar
    return;
  }
  if (pessoa) {
    const nome = pessoa.dataset.nome;
    if (r.escolhida === nome) { r.escolhida = null; desenharMontagem(); return; }
    if (r.montagem.includes(nome) && !r.escolhida) { devolver(nome); return; }
    r.escolhida = nome;
    SOM.clique();
    desenharMontagem();
  }
}

// arrastar com o dedo ou o mouse: uma cópia da criança segue o ponteiro; se mexer pouco, vale como toque
let arraste = null;
function inicioArraste(e) {
  // o lugar vazio também entra aqui (sem nome): não arrasta, mas o toque nele coloca a criança escolhida
  const el = e.target.closest('.fila-pessoa, .fila-vaga');
  if (!el || !fila || !fila.rodada || fila.rodada.respondida) return;
  arraste = { el, nome: el.dataset.nome || null, x: e.clientX, y: e.clientY, copia: null };
}
function moveArraste(e) {
  if (!arraste || !arraste.nome) return;
  if (!arraste.copia) {
    if (Math.hypot(e.clientX - arraste.x, e.clientY - arraste.y) < 8) return;
    arraste.copia = document.createElement('div');
    arraste.copia.className = 'fila-arrastando';
    arraste.copia.innerHTML = criancaSVG(POR_NOME[arraste.nome]);
    document.body.append(arraste.copia);
  }
  e.preventDefault();
  arraste.copia.style.left = `${e.clientX}px`;
  arraste.copia.style.top = `${e.clientY}px`;
  document.querySelectorAll('.fila-vaga.sobre').forEach((v) => v.classList.remove('sobre'));
  document.elementFromPoint(e.clientX, e.clientY)?.closest('.fila-vaga')?.classList.add('sobre');
}
function fimArraste(e) {
  if (!arraste) return;
  const a = arraste;
  arraste = null;
  if (!a.copia) { tocouNaMontagem(a.el); return; }   // foi só um toque
  a.copia.remove();
  const alvo = document.elementFromPoint(e.clientX, e.clientY);
  const vaga = alvo && alvo.closest('.fila-vaga');
  if (vaga) colocarNaVaga(a.nome, Number(vaga.dataset.vaga));
  else if (alvo && alvo.closest('#fila-turma')) devolver(a.nome);   // soltou em cima: volta para a turma
  else desenharMontagem();
}
for (const id of ['fila-turma', 'fila-vagas']) {
  $(id).addEventListener('pointerdown', inicioArraste);
  $(id).addEventListener('click', (e) => { if (e.detail === 0) tocouNaMontagem(e.target); });   // teclado (Enter/espaço)
}
window.addEventListener('pointermove', moveArraste, { passive: false });
window.addEventListener('pointerup', fimArraste);
window.addEventListener('pointercancel', () => { if (arraste && arraste.copia) arraste.copia.remove(); arraste = null; });

function mostrarOpcoes() {
  const r = fila.rodada;
  r.t0 = performance.now();
  const caixa = $('fila-opcoes');
  caixa.innerHTML = '<p class="fila-pergunta">Qual é a fila certa? <small>(o 1º é o da frente)</small></p>';
  r.opcoes.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fila-opcao';
    b.style.animationDelay = `${i * 110}ms`;
    b.dataset.tecla = i + 1;
    b.setAttribute('aria-label', `Fila ${i + 1}: ${o.fila.join(', ')}`);
    b.innerHTML = o.fila.map((nome, k) => `<span class="fila-lugar"><b>${k + 1}º</b>${criancaSVG(POR_NOME[nome])}</span>`).join('');
    b.onclick = () => responderFila(o, b);
    caixa.append(b);
  });
  caixa.hidden = false;
  if (fila.feitas === 1) msgFila('👆 Arrume as crianças na fila de cima (se quiser) e toque na fila certa embaixo.');
}

function responderFila(opcao, botao) {
  const r = fila && fila.rodada;
  if (!r || r.respondida || !fila.rodando) return;
  r.respondida = true;
  const tempo = (performance.now() - r.t0) / 1000;
  const botoes = [...document.querySelectorAll('#fila-opcoes .fila-opcao')];
  botoes.forEach((b) => { b.disabled = true; });
  const tipo = TIPOS_FI[r.n - 1];
  const certa = r.sol.join(', ');
  // para o relatório: se montou a fila de rascunho e se ela estava certa
  const montou = r.montagem.every(Boolean) ? (r.montagem.join() === r.sol.join() ? ' · montou a fila certa' : ' · montou a fila errada') : '';
  r.escolhida = null;
  desenharMontagem();
  pararVoz();
  if (opcao.certa) {
    fila.pontos += 10 * r.n + Math.round(Math.max(0, 1 - tempo / 30) * 10);
    fila.acertos++;
    botao.classList.add('certa');
    botoes.forEach((b) => { if (b !== botao) b.classList.add('apagada'); });
    resultados.push({ m: tipo, certa, erros: [], nivel: r.n, tempo });
    fila.nivel = Math.min(FILA.NIVEL_MAX, fila.nivel + 1);
    fila.nivelMax = Math.max(fila.nivelMax, fila.nivel);
    msgFila(`✅ Isso! A fila é: <b>${certa}</b>.`, 'ok');
    SOM.certo();
    frase('', 'Isso! Fila certa!');
  } else {
    botao.classList.add('errada');
    const certoEl = botoes[r.opcoes.findIndex((o) => o.certa)];
    if (certoEl) certoEl.classList.add('certa');
    // marca a pista que a fila escolhida não cumpre
    const k = r.pistas.indexOf(opcao.quebra);
    if (k >= 0) $('fila-pistas').children[k].classList.add('quebrada');
    const pista = opcao.quebra ? textoPista(opcao.quebra) : '';
    resultados.push({ m: tipo, certa, erros: [`escolheu ${opcao.fila.join(', ')}${pista ? ` (não seguiu: ${pista})` : ''}${montou}`], nivel: r.n, tempo });
    fila.nivel = Math.max(1, fila.nivel - 1);
    msgFila(`Quase! Essa fila não combina com a pista ${k + 1}: <b>${pista}</b> A certa é: <b>${certa}</b>.`, 'erro');
    SOM.errado();
    frase('', `Quase! Olhe a pista ${k + 1} de novo.`);
  }
  hudFila();
  depoisFila(FILA.PAUSA + (opcao.certa ? 0 : 2200), proximaFila);
}

function terminarFila() {
  const { acertos, feitas, pontos, nivelMax } = fila;
  pararFila();
  missao.resumo = [
    `Acertou ${acertos} de ${feitas} filas e chegou ao nível ${nivelMax} de ${FILA.NIVEL_MAX} (até ${NIVEIS_FI[nivelMax - 1].n} crianças).`,
    acertos === feitas ? 'Seguiu todas as pistas sem errar.' : 'Nas filas erradas, veja abaixo qual pista ficou para trás.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Detetive das filas! 🕵️' : 'Fim das filas!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitas} filas e fez ${pontos} pontos!`;
}

// teclas 1 a 3 escolhem a fila no computador
document.addEventListener('keydown', (e) => {
  if (!fila || !$('tela-fila').classList.contains('ativa')) return;
  const b = document.querySelector(`#fila-opcoes .fila-opcao[data-tecla="${e.key}"]`);
  if (b && !b.disabled) b.click();
});

// capa do cartão: quatro crianças em fila
$('fila-capa').innerHTML = `<span class="fila-capa-linha">${CRIANCAS.slice(0, 4).map((c) => criancaSVG(c)).join('')}</span>`;

$('btn-fila').onclick = () => { SOM.clique(); escolherProfessorE('Jogo da Fila', telaFilaMenu); };
$('fila-voltar').onclick = telaJogos;
$('btn-fila-comecar').onclick = () => { SOM.clique(); comecarFila(); };
$('fila-sair').onclick = telaFilaMenu;
$('fila-ouvir').onclick = falarPistas;

export { comecarFila, FILA, pararFila, telaFilaMenu };
