/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Universo dos Conjuntos. */

import { $, embaralhar, sortear } from './util.js?v=256';
import { aluno, definirMissao, definirResultados, estrelasTexto, lerEstrelas, missao, resultados } from './estado.js?v=256';
import { SOM, tocar } from './som.js?v=256';
import { mascote, mostrar, telaJogos } from './telas.js?v=256';
import { escolherProfessorE } from './professor.js?v=256';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=256';
import { OBJETOS, REGRAS } from './dados-conjuntos.js?v=256';

// ---------- Universo dos Conjuntos ----------
// Matemática (4º ao 6º ano) com o diagrama de Venn como mecânica central: os objetos chegam um por vez (a "esteira") e
// a criança toca no lugar certo do diagrama: dentro do círculo, na parte em que os círculos se cruzam ou fora de todos.
// As regras são objetivas e dá para conferir na figura (js/dados-conjuntos.js): nada de "a boia é brinquedo?".
// Cinco fases em degraus: 1 círculo (∈ e ∉) → 2 círculos (interseção) → ∪, ∩ e − sobre o diagrama montado →
// 3 círculos → regra secreta (o detetive descobre a regra pelos exemplos). Cada fase tem 3 rodadas.
// Gamificação: combo 🔥 (3 seguidos = pontos x2, 6 = x3), estrelas e recorde por fase, "Diagrama completo!" no fim da
// rodada. Erro não pune: o objeto volta, a mensagem mostra ✔/✘ em cada regra e a criança tenta de novo; no segundo erro
// o objeto vai sozinho para o lugar certo. Só a primeira tentativa conta para o relatório e as estrelas.
const FASES = [
  { id: 'dentro', nome: 'Dentro ou fora', icone: '🎯', cor: '#00897b', circulos: 1, objetos: 6,
    desc: '1 círculo: pertence (∈) ou não pertence (∉)', instrucao: 'Toque <b>dentro</b> do círculo se o objeto atende à regra; <b>fora</b>, se não atende.' },
  { id: 'dois', nome: 'Dois círculos', icone: '🔗', cor: '#7b4fc9', circulos: 2, objetos: 6,
    desc: 'O que fica nos dois ao mesmo tempo? (∩)', instrucao: 'Atende às <b>duas</b> regras? Toque onde os círculos se <b>cruzam</b>.' },
  { id: 'operacoes', nome: 'União e interseção', icone: '∪', cor: '#1e64d2', circulos: 2, objetos: 5, perguntas: 2,
    desc: 'Monte o diagrama e responda ∪, ∩ e −', instrucao: 'Monte o diagrama. Depois vêm as perguntas de <b>∪</b>, <b>∩</b> e <b>−</b>!' },
  { id: 'tres', nome: 'Três círculos', icone: '🔺', cor: '#e5731f', circulos: 3, objetos: 6, perguntas: 1,
    desc: 'Três regras de uma vez', instrucao: 'Confira as <b>três</b> regras antes de tocar.' },
  { id: 'secreta', nome: 'Regra secreta', icone: '🕵️', cor: '#c2185b', circulos: 1, objetos: 3, secreta: true,
    desc: 'Descubra a regra do círculo misterioso', instrucao: 'Olhe quem está <b>dentro</b> e quem está <b>fora</b>: qual é a regra secreta?' },
];
const RODADAS = 3;
const LETRAS = ['A', 'B', 'C'];
const COR_CIRCULO = ['#7b4fc9', '#e5731f', '#00897b'];
// o diagrama (viewBox) e os círculos [cx, cy, r] para 1, 2 e 3 regras
const GEO = {
  1: { w: 360, h: 240, c: [[180, 122, 96]] },
  2: { w: 360, h: 240, c: [[132, 124, 88], [228, 124, 88]] },
  3: { w: 360, h: 284, c: [[142, 112, 80], [218, 112, 80], [180, 184, 80]] },
};
const TIPOS_CONJ = {
  1: { id: 'conj-venn1', titulo: 'Pertence ou não (1 círculo)', icone: '🎯', cor: '#00897b', regra: 'x ∈ A quando o objeto atende à regra de A; senão, x ∉ A (fica fora do círculo).' },
  2: { id: 'conj-venn2', titulo: 'Dois conjuntos e a interseção', icone: '🔗', cor: '#7b4fc9', regra: 'Quem atende às duas regras fica na interseção (A ∩ B), onde os círculos se cruzam.' },
  3: { id: 'conj-venn3', titulo: 'Três conjuntos', icone: '🔺', cor: '#e5731f', regra: 'Conferir as três regras: o objeto fica na parte que atende exatamente às regras certas.' },
  u: { id: 'conj-uniao', titulo: 'União (∪)', icone: '∪', cor: '#1e64d2', regra: 'A ∪ B: tudo que está em A OU em B (em pelo menos um), contando cada objeto uma vez.' },
  i: { id: 'conj-intersecao', titulo: 'Interseção (∩)', icone: '∩', cor: '#7b4fc9', regra: 'A ∩ B: só o que está em A E em B ao mesmo tempo.' },
  d: { id: 'conj-diferenca', titulo: 'Diferença (−)', icone: '−', cor: '#e5731f', regra: 'A − B: o que está em A, mas NÃO está em B.' },
  secreta: { id: 'conj-secreta', titulo: 'Regra secreta', icone: '🕵️', cor: '#c2185b', regra: 'Descobrir a regra comparando quem está dentro (atende) e quem está fora (não atende).' },
};
const CHAVE_RECORDE = 'pleno-ortografia:conjuntos-recorde';
const OPS = { u: '∪', i: '∩', d: '−' };
const SVGNS = 'http://www.w3.org/2000/svg';
let faseId = 'dentro';
let jogo = null;   // a partida em andamento

const fase = () => FASES.find((f) => f.id === faseId) || FASES[0];
const lerRecordes = () => { try { return JSON.parse(localStorage.getItem(CHAVE_RECORDE)) || {}; } catch (e) { return {}; } };
const guardarRecorde = (id, pts) => { const r = lerRecordes(); r[id] = pts; try { localStorage.setItem(CHAVE_RECORDE, JSON.stringify(r)); } catch (e) { /* sem armazenamento */ } };
const nomeObj = (o) => o.nome[0].toUpperCase() + o.nome.slice(1);
// as letras (A, B, C) das regras da rodada que o objeto atende: a "parte" do diagrama dele ('' = fora de todos)
const chaveDe = (o, regras = jogo.rod.regras) => regras.map((r, i) => (o.em.includes(r) ? LETRAS[i] : '')).join('');
const letraHTML = (i) => `<b class="conj-letra" style="--c:${COR_CIRCULO[i]}">${LETRAS[i]}</b>`;
const regraHTML = (i) => { const r = REGRAS[jogo.rod.regras[i]]; return `${letraHTML(i)} ${r.icone} <b>${r.nome}</b>`; };
function nomeParte(chave) {
  const n = jogo.rod.regras.length;
  if (!chave) return n === 1 ? 'fora do círculo' : 'fora de todos os círculos';
  if (n === 1) return 'dentro do círculo';
  if (chave.length === 1) return `só em ${chave}`;
  return chave.length === n && n === 3 ? 'nos três círculos' : `em ${chave.split('').join(' e ')}`;
}
const depois = (ms, fn) => { const j = jogo; const t = setTimeout(() => { if (jogo === j) fn(); }, ms); j.timers.push(t); };
const msg = (texto, tipo = '') => { $('conj-msg').innerHTML = texto; $('conj-msg').className = `cores-msg conj-msg ${tipo}`; };

// ---------- menu: o mapa das fases ----------
function telaConjuntosMenu() {
  pararConjuntos();
  mascote('davi-conjuntos', 'oi');
  const estrelas = lerEstrelas(), recordes = lerRecordes();
  const proxima = FASES.find((f) => (estrelas[`conjuntos-${f.id}`] || 0) < 3);
  $('conj-fases').innerHTML = FASES.map((f, k) => `
    <button class="missao conj-fase${f === proxima ? ' conj-proxima' : ''}" style="--c:${f.cor}" data-fase="${f.id}" type="button">
      ${f === proxima ? '<span class="conj-tag">▶ Jogue esta</span>' : ''}
      <span class="missao-icone">${f.icone}</span>
      <span class="missao-titulo">${k + 1}. ${f.nome}</span>
      <span class="missao-descricao">${f.desc}</span>
      <span class="missao-estrelas">${estrelasTexto(estrelas[`conjuntos-${f.id}`] || 0)}</span>
      ${recordes[f.id] ? `<span class="conj-recorde">🏆 Recorde: ${recordes[f.id]}</span>` : ''}
    </button>`).join('');
  $('conj-fases').querySelectorAll('[data-fase]').forEach((b) => {
    b.onclick = () => { SOM.clique(); faseId = b.dataset.fase; comecarConjuntos(); };
  });
  mostrar('tela-conjuntos-menu');
}

function comecarConjuntos() {
  pararConjuntos();
  const f = fase();
  definirMissao({ id: `conjuntos-${f.id}`, conjuntos: true, icone: '🔵', cor: f.cor, titulo: `Universo dos Conjuntos: ${f.nome}` });
  definirResultados([]);
  jogo = { f, rodada: 0, pontos: 0, combo: 0, melhorCombo: 0, usados: new Set(), rod: null, timers: [], ocupado: false };
  mostrar('tela-conjuntos');
  novaRodada();
}

function pararConjuntos() {
  if (jogo) jogo.timers.forEach(clearTimeout);
  jogo = null;
}

// ---------- montar a rodada: regras e objetos ----------
function partes(regras) {
  const grupos = {};
  OBJETOS.forEach((o) => { const k = chaveDe(o, regras); (grupos[k] ||= []).push(o); });
  return grupos;
}
// sorteia regras que rendam um diagrama interessante: dentro e fora com objetos; com 2, a interseção quase sempre
// cheia (às vezes vazia, para aparecer o ∅); com 3, pelo menos 5 partes com objetos
function sortearRegras(n) {
  const ids = Object.keys(REGRAS);
  const cores = ['vermelho', 'amarelo', 'verde', 'azul'];
  let melhor = null, melhorNota = -1;
  const vazioOk = n === 2 && Math.random() < 0.2;
  for (let t = 0; t < 400; t++) {
    const regras = embaralhar(ids).slice(0, n);
    if (regras.filter((r) => cores.includes(r)).length > 1) continue;   // duas cores nunca se cruzam: diagrama sem graça
    const g = partes(regras);
    const cheias = Object.keys(g).filter((k) => k);
    let ok;
    if (n === 1) ok = (g.A || []).length >= 3 && (g[''] || []).length >= 3;
    else if (n === 2) ok = vazioOk ? !g.AB && (g.A || []).length >= 2 && (g.B || []).length >= 2 : (g.AB || []).length >= 1 && cheias.length === 3;
    else ok = cheias.length >= 5;
    const repetida = jogo.usados.has(regras.slice().sort().join());
    const nota = cheias.length - (repetida ? 10 : 0);
    if (ok && !repetida) { melhor = regras; break; }
    if (nota > melhorNota) { melhorNota = nota; melhor = regras; }
  }
  jogo.usados.add(melhor.slice().sort().join());
  return melhor;
}
// um objeto de cada parte do diagrama (para cobrir todas), depois completa; sem repetir objeto na partida
function sortearObjetos(regras, k, evitar = []) {
  const g = partes(regras);
  const escolhidos = [];
  const pegar = (lista) => {
    const livres = lista.filter((o) => !escolhidos.includes(o) && !evitar.includes(o));
    const novos = livres.filter((o) => !jogo.usados.has(o.id));
    const o = sortear(novos.length ? novos : livres);
    if (o) { escolhidos.push(o); jogo.usados.add(o.id); }
  };
  embaralhar(Object.keys(g)).forEach((chave) => { if (escolhidos.length < k) pegar(g[chave]); });
  while (escolhidos.length < k) pegar(OBJETOS);
  return embaralhar(escolhidos);
}

function novaRodada() {
  const f = jogo.f;
  jogo.rodada++;
  jogo.ocupado = false;   // o fim da rodada anterior travou os toques
  const regras = sortearRegras(f.circulos);
  jogo.rod = { regras, colocados: [], fila: [], atual: null, tentativa: 1, revelada: !f.secreta, perguntas: [] };
  if (f.secreta) {
    // o círculo misterioso já começa com 3 exemplos dentro e 3 fora
    const g = partes(regras);
    const dentro = embaralhar(g.A).slice(0, 3), fora = embaralhar(g['']).slice(0, 3);
    [...dentro, ...fora].forEach((o) => jogo.usados.add(o.id));
    jogo.rod.exemplos = [...dentro, ...fora];
    jogo.rod.fila = sortearObjetos(regras, f.objetos, jogo.rod.exemplos);
  } else jogo.rod.fila = sortearObjetos(regras, f.objetos);
  if (f.perguntas) jogo.rod.perguntas = montarPerguntas(regras.length, f.perguntas);
  desenharDiagrama();
  desenharLegenda();
  hud();
  $('conj-acoes').innerHTML = '';
  $('conj-instrucao').innerHTML = f.instrucao;
  if (f.secreta) {
    jogo.rod.exemplos.forEach((o) => colocar(o, null, false));
    perguntarRegraSecreta();
  } else proximoObjeto();
}

// ---------- o diagrama (SVG) ----------
function desenharDiagrama() {
  const geo = GEO[jogo.rod.regras.length];
  const svg = $('conj-diagrama');
  svg.setAttribute('viewBox', `0 0 ${geo.w} ${geo.h}`);
  svg.innerHTML = `<rect class="conj-universo" x="3" y="3" width="${geo.w - 6}" height="${geo.h - 6}" rx="18"/>
    <text class="conj-u" x="16" y="28">U</text>
    ${geo.c.map(([cx, cy, r], i) => `<circle class="conj-circulo" cx="${cx}" cy="${cy}" r="${r}" style="--c:${COR_CIRCULO[i]}"/>`).join('')}
    ${geo.c.map(([cx, cy, r], i) => {
      // a letra fica na borda do círculo, para fora (em cima para A e B, embaixo para C)
      const ang = geo.c.length === 1 ? -Math.PI * 0.75 : i === 0 ? -Math.PI * 0.8 : i === 1 ? -Math.PI * 0.2 : Math.PI / 2;
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      const rotulo = jogo.rod.revelada ? LETRAS[i] : '?';
      return `<g class="conj-rotulo" style="--c:${COR_CIRCULO[i]}"><circle cx="${x}" cy="${y}" r="15"/><text x="${x}" y="${y + 6}">${rotulo}</text></g>`;
    }).join('')}
    <g id="conj-objetos"></g><g id="conj-marcas"></g>`;
  svg.onclick = (e) => tocarDiagrama(e);
}
// em que parte do diagrama está o ponto (letras dos círculos que o contêm; null = fora do retângulo)
function parteDoPonto(x, y) {
  const geo = GEO[jogo.rod.regras.length];
  if (x < 3 || y < 3 || x > geo.w - 3 || y > geo.h - 3) return null;
  return geo.c.map(([cx, cy, r], i) => (Math.hypot(x - cx, y - cy) < r ? LETRAS[i] : '')).join('');
}
// distância até a borda mais próxima (círculos e retângulo): o emoji não pode ficar em cima de uma linha
function folga(x, y) {
  const geo = GEO[jogo.rod.regras.length];
  return Math.min(x - 3, y - 3, geo.w - 3 - x, geo.h - 3 - y, ...geo.c.map(([cx, cy, r]) => Math.abs(Math.hypot(x - cx, y - cy) - r)));
}
function lugarNaParte(chave, perto = null) {
  const geo = GEO[jogo.rod.regras.length];
  const livre = (x, y, d) => jogo.rod.colocados.every((c) => Math.hypot(c.x - x, c.y - y) >= d);
  if (perto && parteDoPonto(perto.x, perto.y) === chave && folga(perto.x, perto.y) >= 15 && livre(perto.x, perto.y, 26)) return perto;
  for (const d of [30, 24, 18, 0]) {
    for (let t = 0; t < 300; t++) {
      const x = 18 + Math.random() * (geo.w - 36), y = 34 + Math.random() * (geo.h - 52);
      if (parteDoPonto(x, y) === chave && folga(x, y) >= 15 && livre(x, y, d)) return { x, y };
    }
  }
  return { x: geo.w / 2, y: geo.h / 2 };
}
function pontoDoToque(e) {
  const svg = $('conj-diagrama');
  const p = svg.createSVGPoint();
  p.x = e.clientX; p.y = e.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}
function colocar(o, perto, animar = true) {
  const { x, y } = lugarNaParte(chaveDe(o), perto);
  jogo.rod.colocados.push({ o, x, y });
  const t = document.createElementNS(SVGNS, 'text');
  t.setAttribute('class', `conj-colocado${animar ? ' chega' : ''}`);
  t.setAttribute('x', x); t.setAttribute('y', y + 11);
  t.dataset.id = o.id;
  t.textContent = o.emoji;
  const titulo = document.createElementNS(SVGNS, 'title');
  titulo.textContent = o.nome;
  t.append(titulo);
  $('conj-objetos').append(t);
  return { x, y };
}
// marca rápida no diagrama: "+20", "✘"...
function marca(x, y, texto, classe) {
  const t = document.createElementNS(SVGNS, 'text');
  t.setAttribute('class', `conj-marca-svg ${classe}`);
  t.setAttribute('x', x); t.setAttribute('y', y);
  t.textContent = texto;
  $('conj-marcas').append(t);
  setTimeout(() => t.remove(), 1100);
}

function desenharLegenda() {
  $('conj-legenda').innerHTML = jogo.rod.regras.map((id, i) => {
    const r = REGRAS[id];
    return jogo.rod.revelada
      ? `<button class="conj-chip" type="button" data-i="${i}" style="--c:${COR_CIRCULO[i]}" aria-label="${LETRAS[i]}: ${r.nome}. Toque para ver a regra.">${letraHTML(i)}<span aria-hidden="true">${r.icone}</span> ${r.nome}</button>`
      : `<span class="conj-chip conj-misterio" style="--c:${COR_CIRCULO[i]}">${letraHTML(i)} ❓ Regra secreta</span>`;
  }).join('');
  $('conj-legenda').querySelectorAll('button.conj-chip').forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); SOM.clique(); const r = REGRAS[jogo.rod.regras[b.dataset.i]]; msg(`${regraHTML(Number(b.dataset.i))}: ${r.regra}`, 'aviso'); };
  });
}

function hud() {
  const f = jogo.f;
  $('conj-titulo').textContent = `${f.icone} Rodada ${jogo.rodada}/${RODADAS}`;
  $('conj-pontos').textContent = jogo.pontos;
  const mult = multiplicador();
  $('conj-combo').hidden = jogo.combo < 2;
  $('conj-combo').textContent = `🔥 ${jogo.combo} seguidos${mult > 1 ? ` · pontos x${mult}` : ''}`;
  $('conj-combo').classList.toggle('quente', mult > 1);
  const total = jogo.rod ? jogo.rod.colocados.length - (jogo.rod.exemplos || []).length + jogo.rod.fila.length + (jogo.rod.atual ? 1 : 0) : 0;
  const feitos = jogo.rod ? jogo.rod.colocados.length - (jogo.rod.exemplos || []).length : 0;
  $('conj-progresso').innerHTML = Array.from({ length: total }, (_, k) => `<i class="${k < feitos ? 'feito' : ''}"></i>`).join('');
}
const multiplicador = () => (jogo.combo >= 6 ? 3 : jogo.combo >= 3 ? 2 : 1);
function ganhar(base, x, y) {
  jogo.combo++;
  jogo.melhorCombo = Math.max(jogo.melhorCombo, jogo.combo);
  const pts = base * multiplicador();
  jogo.pontos += pts;
  if (x != null) marca(x, y - 18, `+${pts}`, 'ganho');
  if (jogo.combo === 3 || jogo.combo === 6) tocar([[660, 0.07], [880, 0.07], [1100, 0.12]]);
  hud();
}
const perderCombo = () => { jogo.combo = 0; hud(); };

// ---------- colocar os objetos ----------
function proximoObjeto() {
  const rod = jogo.rod;
  rod.atual = rod.fila.shift() || null;
  rod.tentativa = 1;
  jogo.ocupado = false;
  hud();
  if (!rod.atual) { desenharEsteira(); fimDosObjetos(); return; }
  rod.t0 = performance.now();
  desenharEsteira();
  if (jogo.rodada === 1 && rod.colocados.length === (rod.exemplos || []).length) msg(jogo.f.circulos === 1 ? 'Toque <b>dentro</b> ou <b>fora</b> do círculo.' : 'Toque na parte certa do diagrama.');
  else msg('');
}
function desenharEsteira() {
  const rod = jogo.rod;
  if (!rod.atual) { $('conj-esteira').innerHTML = ''; return; }
  const proximos = rod.fila.slice(0, 3).map((o) => `<span class="conj-fila-item" aria-hidden="true">${o.emoji}</span>`).join('');
  $('conj-esteira').innerHTML = `<div class="conj-atual" aria-live="polite"><span class="conj-atual-emoji">${rod.atual.emoji}</span>
    <span class="conj-atual-nome">${nomeObj(rod.atual)}</span></div><div class="conj-fila">${proximos}</div>`;
}
// o porquê, regra por regra: "Peixe: é animal ✔ · não é vermelho ✘"
function conferencia(o) {
  return `<b>${nomeObj(o)}</b>: ${jogo.rod.regras.map((r, i) => `${letraHTML(i)} ${o.em.includes(r) ? `${REGRAS[r].ser} ✔` : `não ${REGRAS[r].ser} ✘`}`).join(' · ')}`;
}
function tocarDiagrama(e) {
  const rod = jogo && jogo.rod;
  if (!rod || jogo.ocupado) return;
  const p = pontoDoToque(e);
  const parte = parteDoPonto(p.x, p.y);
  if (parte === null) return;
  if (rod.modoPergunta) { responderParte(parte, p); return; }
  if (!rod.atual) return;
  const o = rod.atual, certa = chaveDe(o);
  const n = rod.regras.length;
  const tipo = rod.revelada && !jogo.f.secreta ? TIPOS_CONJ[n] : TIPOS_CONJ[1];
  const registrar = (erros) => resultados.push({ m: tipo, certa: `${o.nome}: ${nomeParte(certa)}`, erros, tempo: (performance.now() - rod.t0) / 1000 });
  if (parte === certa) {
    jogo.ocupado = true;
    const lugar = colocar(o, p);
    if (rod.tentativa === 1) { registrar([]); ganhar(10, lugar.x, lugar.y); SOM.certo(); msg(`✅ ${nomeObj(o)}: ${nomeParte(certa)}!`, 'ok'); }
    else { SOM.certo(); msg(`✅ Isso! ${conferencia(o)}`, 'ok'); }
    depois(rod.tentativa === 1 ? 450 : 1100, proximoObjeto);
    return;
  }
  SOM.errado();
  perderCombo();
  marca(p.x, p.y + 8, '✘', 'erro');
  if (rod.tentativa === 1) {
    rod.tentativa = 2;
    rod.primeiroErro = `tocou ${nomeParte(parte)}`;
    $('conj-esteira').querySelector('.conj-atual')?.classList.remove('treme');
    void $('conj-esteira').offsetWidth;
    $('conj-esteira').querySelector('.conj-atual')?.classList.add('treme');
    msg(`Ainda não! ${conferencia(o)}<br><small>Confira as regras e toque de novo.</small>`, 'erro');
    return;
  }
  // segundo erro: o objeto vai sozinho para o lugar certo e a explicação fica na tela
  jogo.ocupado = true;
  registrar([rod.primeiroErro, `tocou ${nomeParte(parte)}`]);
  colocar(o, null);
  msg(`${conferencia(o)} → fica <b>${nomeParte(certa)}</b>.`, 'erro');
  depois(1900, proximoObjeto);
}

// ---------- perguntas sobre o diagrama montado (∪, ∩, −) ----------
function montarPerguntas(n, qtd) {
  const opcoes = n === 2
    ? [{ tipo: 'contar', expr: { op: 'u', a: 'A', b: 'B' } }, { tipo: 'contar', expr: { op: 'i', a: 'A', b: 'B' } },
      { tipo: 'parte', expr: { op: 'i', a: 'A', b: 'B' } }, { tipo: 'parte', expr: { op: 'd', a: 'A', b: 'B' } }, { tipo: 'parte', expr: { op: 'd', a: 'B', b: 'A' } },
      { tipo: 'contar', expr: { op: 'd', a: 'A', b: 'B' } }]
    : [{ tipo: 'contar', expr: { op: 'i', a: { op: 'u', a: 'A', b: 'B' }, b: 'C' } }, { tipo: 'contar', expr: { op: 'i', a: { op: 'i', a: 'A', b: 'B' }, b: 'C' } },
      { tipo: 'contar', expr: { op: 'd', a: { op: 'u', a: 'A', b: 'B' }, b: 'C' } }, { tipo: 'contar', expr: { op: 'u', a: 'A', b: 'C' } }];
  // uma de contar e uma de tocar na parte (com 2 círculos)
  const contar = embaralhar(opcoes.filter((p) => p.tipo === 'contar')), parte = embaralhar(opcoes.filter((p) => p.tipo === 'parte'));
  return (qtd === 1 ? [contar[0]] : [contar[0], parte[0] || contar[1]]);
}
// a expressão vale para uma parte do diagrama (as letras dos círculos)?
function vale(expr, chave) {
  if (typeof expr === 'string') return chave.includes(expr);
  const a = vale(expr.a, chave), b = vale(expr.b, chave);
  return expr.op === 'u' ? a || b : expr.op === 'i' ? a && b : a && !b;
}
const opPrincipal = (expr) => (expr.a.op && expr.op === 'i' ? 'i' : expr.op);
function exprTexto(expr, raiz = true) {
  if (typeof expr === 'string') return expr;
  const t = `${exprTexto(expr.a, false)} ${OPS[expr.op]} ${exprTexto(expr.b, false)}`;
  return raiz ? t : `(${t})`;
}
function exprHTML(expr, raiz = true) {
  if (typeof expr === 'string') return letraHTML(LETRAS.indexOf(expr));
  const t = `${exprHTML(expr.a, false)} <span class="conj-op">${OPS[expr.op]}</span> ${exprHTML(expr.b, false)}`;
  return raiz ? t : `(${t})`;
}
function exprPalavras(expr) {
  if (typeof expr === 'string') { const i = LETRAS.indexOf(expr); return `<b style="color:${COR_CIRCULO[i]}">${REGRAS[jogo.rod.regras[i]].nome}</b>`; }
  const liga = { u: ' <b>OU</b> ', i: ' <b>E</b> ', d: ', mas <b>NÃO</b> ' }[expr.op];
  const lado = (x) => (typeof x === 'string' ? exprPalavras(x) : `(${exprPalavras(x)})`);
  return lado(expr.a) + liga + lado(expr.b);
}
const dentroDe = (expr) => jogo.rod.colocados.filter((c) => vale(expr, chaveDe(c.o)));

function fimDosObjetos() {
  const rod = jogo.rod;
  if (rod.perguntas.length) { proximaPergunta(); return; }
  fimDaRodada();
}
function proximaPergunta() {
  const rod = jogo.rod;
  const p = rod.perguntas.shift();
  if (!p) { rod.modoPergunta = null; fimDaRodada(); return; }
  rod.modoPergunta = p;
  p.t0 = performance.now();
  p.tentativa = 1;
  jogo.ocupado = false;
  destacar(null);
  if (p.tipo === 'contar') {
    const certo = dentroDe(p.expr).length;
    const nums = new Set([certo]);
    for (const d of embaralhar([1, -1, 2, -2, 3])) { if (nums.size < 4 && certo + d >= 0) nums.add(certo + d); }
    $('conj-esteira').innerHTML = `<div class="conj-pergunta"><span class="conj-expr">${exprHTML(p.expr)}</span>
      <span class="conj-palavras">Quantos objetos são ${exprPalavras(p.expr)}?</span></div>`;
    $('conj-acoes').innerHTML = [...nums].sort((a, b) => a - b).map((v) => `<button class="conj-num" type="button" data-v="${v}">${v}</button>`).join('');
    $('conj-acoes').querySelectorAll('.conj-num').forEach((b) => { b.onclick = () => responderContagem(Number(b.dataset.v), b); });
    msg(`<b>${OPS[opPrincipal(p.expr)]}</b> ${{ u: '= OU: em pelo menos um.', i: '= E: nos dois ao mesmo tempo.', d: '= mas NÃO: do primeiro, tire o segundo.' }[opPrincipal(p.expr)]} Conte no diagrama!`);
  } else {
    $('conj-esteira').innerHTML = `<div class="conj-pergunta"><span class="conj-expr">${exprHTML(p.expr)}</span>
      <span class="conj-palavras">Toque na parte do diagrama que é ${exprPalavras(p.expr)}.</span></div>`;
    $('conj-acoes').innerHTML = '';
    msg('Toque <b>na parte</b> do diagrama (pode ser num espaço vazio dela).');
  }
}
// acende os objetos de um conjunto (e apaga os outros); null = todos normais
function destacar(lista) {
  const ids = lista ? new Set(lista.map((c) => c.o.id)) : null;
  $('conj-objetos').querySelectorAll('.conj-colocado').forEach((t) => {
    t.classList.toggle('brilha', !!ids && ids.has(t.dataset.id));
    t.classList.toggle('apagado', !!ids && !ids.has(t.dataset.id));
  });
}
function registrarPergunta(p, erros) {
  const lista = dentroDe(p.expr).map((c) => c.o.nome);
  resultados.push({ m: TIPOS_CONJ[opPrincipal(p.expr)], certa: `${exprTexto(p.expr)} = ${lista.length ? `{${lista.join(', ')}}` : '∅'}${p.tipo === 'contar' ? ` (${lista.length})` : ''}`,
    erros, tempo: (performance.now() - p.t0) / 1000 });
}
function responderContagem(v, botao) {
  const p = jogo.rod.modoPergunta;
  if (!p || jogo.ocupado) return;
  const lista = dentroDe(p.expr);
  if (v === lista.length) {
    jogo.ocupado = true;
    botao.classList.add('certa');
    if (p.tentativa === 1) { registrarPergunta(p, []); ganhar(20); }
    SOM.certo();
    destacar(lista);
    msg(`✅ ${exprHTML(p.expr)} = ${lista.length ? lista.map((c) => c.o.emoji).join(' ') : '∅'} → <b>${lista.length}</b> ${lista.length === 1 ? 'objeto' : 'objetos'}.`, 'ok');
    depois(1700, proximaPergunta);
    return;
  }
  SOM.errado();
  perderCombo();
  botao.disabled = true;
  botao.classList.add('errada');
  if (p.tentativa === 1) { p.tentativa = 2; p.erro = `respondeu ${v}`; registrarPergunta(p, [p.erro]); }
  // o diagrama acende a resposta para a criança contar junto
  destacar(lista);
  msg(`Não são ${v}. Olhe os que acenderam: eles são ${exprPalavras(p.expr)}. Conte de novo!`, 'erro');
}
function responderParte(parte, ponto) {
  const p = jogo.rod.modoPergunta;
  if (!p || p.tipo !== 'parte' || jogo.ocupado) return;
  const certa = vale(p.expr, parte);
  const lista = dentroDe(p.expr);
  if (certa) {
    jogo.ocupado = true;
    if (p.tentativa === 1) { registrarPergunta(p, []); ganhar(20, ponto.x, ponto.y); } else marca(ponto.x, ponto.y, '✔', 'ganho');
    SOM.certo();
    destacar(lista);
    msg(`✅ Essa parte é ${exprHTML(p.expr)}: ${lista.length ? lista.map((c) => c.o.emoji).join(' ') : 'está vazia (∅)'}.`, 'ok');
    depois(1700, proximaPergunta);
    return;
  }
  SOM.errado();
  perderCombo();
  marca(ponto.x, ponto.y + 8, '✘', 'erro');
  if (p.tentativa === 1) { p.tentativa = 2; registrarPergunta(p, [`tocou ${nomeParte(parte)}`]); }
  const dica = { i: 'nos dois círculos ao mesmo tempo (onde eles se cruzam)', d: `no primeiro círculo, mas fora do outro` }[opPrincipal(p.expr)] || '';
  msg(`Aí é ${nomeParte(parte)}. ${exprHTML(p.expr)} fica ${dica}. Tente de novo!`, 'erro');
}

// ---------- regra secreta ----------
function perguntarRegraSecreta() {
  const rod = jogo.rod;
  const certa = rod.regras[0];
  // as alternativas erradas contradizem pelo menos um exemplo (senão haveria duas respostas certas)
  const contradiz = (r) => rod.exemplos.some((o, k) => o.em.includes(r) !== (k < 3));
  const erradas = embaralhar(Object.keys(REGRAS).filter((r) => r !== certa && contradiz(r))).slice(0, 2);
  rod.opcoes = embaralhar([certa, ...erradas]);
  rod.t0 = performance.now();
  rod.erroSecreta = null;
  $('conj-esteira').innerHTML = `<div class="conj-pergunta"><span class="conj-expr">🕵️ ${letraHTML(0)} = ❓</span>
    <span class="conj-palavras">Quem está <b>dentro</b> atende à regra; quem está <b>fora</b>, não. Qual é a regra?</span></div>`;
  $('conj-acoes').innerHTML = rod.opcoes.map((r) => `<button class="conj-opcao" type="button" data-r="${r}">${REGRAS[r].icone} ${REGRAS[r].nome}</button>`).join('');
  $('conj-acoes').querySelectorAll('.conj-opcao').forEach((b) => { b.onclick = () => escolherRegra(b.dataset.r, b); });
  msg('Compare: o que <b>todos de dentro</b> têm e <b>nenhum de fora</b> tem?');
  hud();
}
function escolherRegra(r, botao) {
  const rod = jogo.rod;
  if (jogo.ocupado) return;
  const certa = rod.regras[0];
  if (r === certa) {
    jogo.ocupado = true;
    resultados.push({ m: TIPOS_CONJ.secreta, certa: `regra: ${REGRAS[certa].nome}`, erros: rod.erroSecreta ? [rod.erroSecreta] : [], tempo: (performance.now() - rod.t0) / 1000 });
    if (!rod.erroSecreta) ganhar(30);
    SOM.certo();
    botao.classList.add('certa');
    rod.revelada = true;
    desenharLegenda();
    $('conj-diagrama').querySelector('.conj-rotulo text').textContent = 'A';
    msg(`✅ Descobriu! A regra é ${REGRAS[certa].icone} <b>${REGRAS[certa].nome}</b>. Agora coloque os novos objetos.`, 'ok');
    depois(1600, () => { $('conj-acoes').innerHTML = ''; $('conj-instrucao').innerHTML = 'Agora você sabe a regra: coloque os novos objetos!'; proximoObjeto(); });
    return;
  }
  SOM.errado();
  perderCombo();
  botao.disabled = true;
  botao.classList.add('errada');
  // mostra o exemplo que derruba a alternativa
  const k = rod.exemplos.findIndex((o, j) => o.em.includes(r) !== (j < 3));
  const o = rod.exemplos[k];
  if (!rod.erroSecreta) rod.erroSecreta = `escolheu ${REGRAS[r].nome}`;
  destacar(rod.colocados.filter((c) => c.o === o));
  msg(k < 3 ? `${o.emoji} ${nomeObj(o)} está <b>dentro</b>, mas não ${REGRAS[r].ser}. Tente outra!` : `${o.emoji} ${nomeObj(o)} está <b>fora</b>, mas ${REGRAS[r].ser}. Tente outra!`, 'erro');
}

// ---------- fim da rodada e da partida ----------
function fimDaRodada() {
  jogo.ocupado = true;
  destacar(null);
  $('conj-diagrama').classList.remove('completo'); void $('conj-diagrama').offsetWidth;
  $('conj-diagrama').classList.add('completo');
  tocar([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.16]]);
  $('conj-esteira').innerHTML = `<div class="conj-pergunta conj-completo"><span class="conj-expr">⭐ Diagrama completo!</span>
    <span class="conj-palavras">Rodada ${jogo.rodada} de ${RODADAS} · ${jogo.pontos} pontos${jogo.melhorCombo >= 3 ? ` · melhor sequência: ${jogo.melhorCombo} 🔥` : ''}</span></div>`;
  msg('');
  const ultima = jogo.rodada >= RODADAS;
  $('conj-acoes').innerHTML = `<button class="conj-btn" type="button" id="btn-conj-seguir">${ultima ? 'Ver resultado 🏁' : 'Próxima rodada ▶'}</button>`;
  $('btn-conj-seguir').onclick = () => { SOM.clique(); if (ultima) terminarConjuntos(); else novaRodada(); };
  $('btn-conj-seguir').focus({ preventScroll: true });
}

function terminarConjuntos() {
  const { f, pontos, melhorCombo } = jogo;
  const recordeAntes = lerRecordes()[f.id] || 0;
  const novoRecorde = pontos > recordeAntes;
  if (novoRecorde) guardarRecorde(f.id, pontos);
  const porTipo = Object.values(TIPOS_CONJ).map((t) => {
    const rs = resultados.filter((r) => r.m.id === t.id);
    return rs.length ? `${t.titulo}: ${rs.filter((r) => !r.erros.length).length}/${rs.length}` : '';
  }).filter(Boolean);
  pararConjuntos();
  missao.resumo = [
    `Fase: ${f.nome} (${RODADAS} rodadas). De primeira por habilidade: ${porTipo.join(' · ')}.`,
    `Melhor sequência sem errar: ${melhorCombo}.${novoRecorde ? ' Novo recorde!' : ''}`,
    `Pontos: ${pontos}`,
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = novoRecorde ? 'Novo recorde! 🏆' : n === 3 ? 'Mestre dos conjuntos! 🔵' : 'Fase completa!';
  $('fim-texto').textContent = `${aluno}, você fez ${pontos} pontos em "${f.nome}"${melhorCombo >= 3 ? ` e acertou ${melhorCombo} seguidos` : ''}!`;
}

// capa do cartão na lista de jogos: o diagrama de Venn com objetos
$('conjuntos-capa').innerHTML = `<svg viewBox="0 0 200 150" aria-hidden="true"><rect width="200" height="150" fill="#eaf4ff"/>
  <rect x="6" y="6" width="188" height="138" rx="14" fill="#fff" stroke="#9fb8d8" stroke-width="3"/>
  <circle cx="78" cy="78" r="52" fill="rgba(123,79,201,.18)" stroke="#7b4fc9" stroke-width="4"/><circle cx="122" cy="78" r="52" fill="rgba(229,115,31,.18)" stroke="#e5731f" stroke-width="4"/>
  <text x="44" y="96" font-size="26">🐶</text><text x="87" y="94" font-size="26">🍎</text><text x="128" y="98" font-size="26">🚗</text><text x="160" y="40" font-size="20">⚽</text>
  <circle cx="40" cy="30" r="12" fill="#7b4fc9"/><text x="40" y="36" font-size="15" font-weight="700" fill="#fff" text-anchor="middle" font-family="Fredoka, sans-serif">A</text>
  <circle cx="160" cy="118" r="12" fill="#e5731f"/><text x="160" y="124" font-size="15" font-weight="700" fill="#fff" text-anchor="middle" font-family="Fredoka, sans-serif">B</text></svg>`;

$('btn-conjuntos').onclick = () => { SOM.clique(); escolherProfessorE('Universo dos Conjuntos', telaConjuntosMenu); };
$('conjuntos-voltar').onclick = telaJogos;
$('conjuntos-sair').onclick = telaConjuntosMenu;

export { comecarConjuntos, pararConjuntos, telaConjuntosMenu };
