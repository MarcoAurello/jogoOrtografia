/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* O Reino da Sintaxe. */

import { $, embaralhar } from './util.js?v=287';
import { aluno, definirMissao, definirResultados, estrelasTexto, lerEstrelas, missao, resultados } from './estado.js?v=287';
import { frase, SOM, tocar } from './som.js?v=287';
import { mascote, mostrar, telaJogos } from './telas.js?v=287';
import { escolherProfessorE } from './professor.js?v=287';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=287';
import { CLASSES, CRONICAS, HISTORIAS, LACUNAS, TIPOS_REINO } from './dados-reino.js?v=287';
import { ART, desenharSprite, iconeHeroi, spriteDragao, spriteHeroi, spriteMonstro, SPR } from './sprites-reino.js?v=287';

// ---------- O Reino da Sintaxe ----------
// Leitura e sintaxe (3º ao 6º ano) num mundo 2D desenhado no canvas, com o herói Sintaxista e o Cajado da Coesão.
// Três modos, cada um com a mecânica exercitando o conteúdo:
//   Ponte de Lacunas: o herói anda sozinho até um abismo ou porta; a criança toca na esfera com a palavra que completa
//     a frase e a palavra vira a ponte (concordância; no nível 2, pontuação, preposições e conectivos).
//   Força das Classes: monstrinhos chegam carregando uma palavra; a criança escolhe a sintonia do cajado (verbo ⚡,
//     substantivo 🧱, adjetivo ❄️, pronome 🔄) e cada classe tem o seu efeito. No nível 2, o chefe Dragão da Desordem.
//   Livro Mágico: a criança toca nas partes da história na ordem; o palco encena a história nessa ordem, e a parte que
//     vem antes da hora vira uma cena absurda (o erro de lógica aparece na prática).
// Acessível e com poucos toques: um toque por ação, nada de tempo correndo nem "game over" (o monstro só chega mais
// perto), feedback com cor + ícone + som, 🔊 para ouvir a frase, erro que explica e dá outra chance; no segundo erro
// a resposta certa vai sozinha. Só a primeira tentativa conta para o relatório e as estrelas.
// Gamificação: Orbe da Precisão (combo: 3 seguidos = pontos x2 e o herói acelera com brilho; 6 = x3 e aura dourada),
// trajes que se ganham a cada fase, Livro das Crônicas (uma página por fase) e Diário do Lexicógrafo (as regras que a
// criança já encontrou, com um exemplo).
const FASES = [
  { id: 'ponte1', modo: 'ponte', nivel: 1, nome: 'Ponte de Lacunas', icone: '🌉', cor: '#2e7d32', itens: 6, desc: 'Complete a frase e a ponte aparece' },
  { id: 'classes1', modo: 'classes', nivel: 1, nome: 'Força das Classes', icone: '⚡', cor: '#e08e00', itens: 8, desc: 'Verbo, substantivo ou adjetivo?' },
  { id: 'historia1', modo: 'historia', nivel: 1, nome: 'Livro Mágico', icone: '📖', cor: '#7b4fc9', itens: 3, desc: 'Coloque a história na ordem certa' },
  { id: 'ponte2', modo: 'ponte', nivel: 2, nome: 'Portas da Montanha', icone: '🚪', cor: '#5d4037', itens: 6, desc: 'Pontuação, preposições e conectivos' },
  { id: 'classes2', modo: 'classes', nivel: 2, nome: 'Dragão da Desordem', icone: '🐉', cor: '#c62828', itens: 4, chefe: 6, desc: 'Entra o pronome. Vença o chefe!' },
  { id: 'historia2', modo: 'historia', nivel: 2, nome: 'A Grande Crônica', icone: '👑', cor: '#1e64d2', itens: 3, desc: 'Primeiro, Depois, Então, Por fim' },
];
const SINTONIAS = {
  ve: { nome: 'Verbo', icone: '⚡', cor: '#e08e00', pista: 'verbo é ação' },
  su: { nome: 'Substantivo', icone: '🧱', cor: '#8d5a2b', pista: 'substantivo é nome' },
  aj: { nome: 'Adjetivo', icone: '❄️', cor: '#0a8fc2', pista: 'adjetivo é característica' },
  pn: { nome: 'Pronome', icone: '🔄', cor: '#8e44ad', pista: 'pronome fica no lugar do nome' },
};
// trajes: o primeiro já vem; os outros, um por fase concluída
const TRAJES = [
  { id: 'aprendiz', nome: 'Aprendiz', cor: '#1e64d2' },
  { id: 'floresta', nome: 'Guardião da Floresta', cor: '#2e7d32', fase: 'ponte1' },
  { id: 'raio', nome: 'Mago do Raio', cor: '#e08e00', fase: 'classes1' },
  { id: 'contador', nome: 'Contador de Histórias', cor: '#7b4fc9', fase: 'historia1' },
  { id: 'montanha', nome: 'Explorador', cor: '#d84315', fase: 'ponte2' },
  { id: 'dragao', nome: 'Domador de Dragões', cor: '#b71c1c', fase: 'classes2' },
  { id: 'mestre', nome: 'Sintaxista Mestre', cor: '#c99a06', fase: 'historia2' },
];
const ALT = 220, CHAO = 182;   // o mundo tem 220 de altura (a largura acompanha a tela); o chão fica em 182
const CHAVE = 'pleno-ortografia:reino';
const FONTE = 'Fredoka, sans-serif';
let faseId = 'ponte1';
let jogo = null;   // a partida em andamento

const fase = () => FASES.find((f) => f.id === faseId) || FASES[0];
const lerDados = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; } };
const gravarDados = (d) => { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) { /* sem armazenamento */ } };
const concluida = (id) => (lerEstrelas()[`reino-${id}`] || 0) > 0;
const trajeLiberado = (t) => !t.fase || concluida(t.fase);
const trajeAtual = () => { const d = lerDados(); const t = TRAJES.find((x) => x.id === d.traje); return t && trajeLiberado(t) ? t : TRAJES[0]; };
function anotarNoDiario(tipo, exemplo) {
  const d = lerDados();
  d.diario = d.diario || {};
  d.diario[tipo] = exemplo;
  gravarDados(d);
}
const depois = (ms, fn) => { const j = jogo; const t = setTimeout(() => { if (jogo === j) fn(); }, ms); j.timers.push(t); };
const msg = (texto, tipo = '') => { $('reino-msg').innerHTML = texto; $('reino-msg').className = `cores-msg reino-msg ${tipo}`; };
const ouvir = (texto) => frase('reino-frase', texto);
// sorteia n itens alternando os grupos (cada tipo aparece), para a fase não cair só num assunto
function escolherItens(lista, n, chave) {
  const grupos = {};
  embaralhar(lista).forEach((x) => { (grupos[x[chave]] = grupos[x[chave]] || []).push(x); });
  const filas = embaralhar(Object.values(grupos)), saida = [];
  while (saida.length < n && filas.some((f) => f.length)) filas.forEach((f) => { if (f.length && saida.length < n) saida.push(f.pop()); });
  return embaralhar(saida);
}

// ---------- menu: as páginas do livro ----------
function telaReinoMenu() {
  pararReino();
  mascote('davi-reino', 'oi');
  const estrelas = lerEstrelas(), d = lerDados(), rec = d.recordes || {};
  const proxima = FASES.find((f) => (estrelas[`reino-${f.id}`] || 0) < 3);
  $('reino-fases').innerHTML = FASES.map((f, k) => `
    <button class="missao reino-fase${f === proxima ? ' reino-proxima' : ''}" style="--c:${f.cor}" data-fase="${f.id}" type="button">
      ${f === proxima ? '<span class="reino-tag">▶ Jogue esta</span>' : ''}
      <span class="missao-icone">${f.icone}</span>
      <span class="missao-titulo">${k + 1}. ${f.nome}</span>
      <span class="missao-descricao">${f.desc}</span>
      <span class="missao-estrelas">${estrelasTexto(estrelas[`reino-${f.id}`] || 0)}</span>
      ${rec[f.id] ? `<span class="reino-recorde">🏆 ${rec[f.id]}</span>` : ''}
    </button>`).join('');
  $('reino-fases').querySelectorAll('[data-fase]').forEach((b) => {
    b.onclick = () => { SOM.clique(); faseId = b.dataset.fase; comecarReino(); };
  });
  const atual = trajeAtual();
  $('reino-trajes').innerHTML = TRAJES.map((t) => {
    const ok = trajeLiberado(t);
    return `<button class="reino-traje${t === atual ? ' ativo' : ''}" type="button" data-traje="${t.id}" style="--c:${t.cor}"
      ${ok ? '' : 'disabled'} aria-label="${t.nome}${ok ? '' : ' (bloqueado)'}" title="${t.nome}">${ok ? `<img src="${iconeHeroi(t.cor)}" alt="">` : '🔒'}</button>`;
  }).join('') + `<span class="reino-traje-nome">${atual.nome}</span>`;
  $('reino-trajes').querySelectorAll('[data-traje]').forEach((b) => {
    b.onclick = () => { SOM.clique(); const dd = lerDados(); dd.traje = b.dataset.traje; gravarDados(dd); telaReinoMenu(); };
  });
  const paginas = FASES.filter((f) => concluida(f.id)).length;
  $('reino-btn-livro').textContent = `📖 Livro das Crônicas (${paginas}/${FASES.length})`;
  $('reino-btn-diario').textContent = `📔 Diário (${Object.keys(d.diario || {}).length}/${Object.keys(TIPOS_REINO).length})`;
  mostrar('tela-reino-menu');
}

// Livro das Crônicas e Diário do Lexicógrafo: a mesma tela, duas abas
function telaLivro(aba) {
  pararReino();
  const d = lerDados(), diario = d.diario || {};
  $('reino-aba-livro').classList.toggle('ativa', aba === 'livro');
  $('reino-aba-diario').classList.toggle('ativa', aba === 'diario');
  $('reino-aba-livro').setAttribute('aria-selected', aba === 'livro');
  $('reino-aba-diario').setAttribute('aria-selected', aba === 'diario');
  if (aba === 'livro') {
    $('reino-livro').innerHTML = FASES.map((f, k) => {
      const c = CRONICAS[f.id];
      if (!concluida(f.id)) return `<div class="reino-pagina bloqueada"><span class="reino-pagina-cena">🔒</span><b>Página ${k + 1}</b><p>Complete a fase "${f.nome}" para ler esta página.</p></div>`;
      return `<div class="reino-pagina" style="--c:${f.cor}"><span class="reino-pagina-cena">${c.cena}</span><b>${c.titulo}</b><p>${c.texto}</p>
        <button class="reino-ouvir" type="button" data-ouvir="${f.id}" aria-label="Ouvir a página">🔊</button></div>`;
    }).join('');
    $('reino-livro').querySelectorAll('[data-ouvir]').forEach((b) => {
      b.onclick = () => { const c = CRONICAS[b.dataset.ouvir]; ouvir(`${c.titulo}. ${c.texto}`); };
    });
  } else {
    $('reino-livro').innerHTML = Object.entries(TIPOS_REINO).map(([k, t]) => (diario[k]
      ? `<div class="reino-pagina reino-verbete" style="--c:${t.cor}"><span class="reino-pagina-cena">${t.icone}</span><b>${t.titulo}</b><p>${t.regra}</p>
          <p class="reino-exemplo">Exemplo seu: <i>${diario[k]}</i></p></div>`
      : `<div class="reino-pagina bloqueada"><span class="reino-pagina-cena">❔</span><b>${t.titulo}</b><p>Jogue para descobrir esta regra.</p></div>`)).join('');
  }
  mostrar('tela-reino-livro');
}

// ---------- começar e parar ----------
function comecarReino() {
  pararReino();
  const f = fase();
  definirMissao({ id: `reino-${f.id}`, reino: true, icone: '📖', cor: f.cor, titulo: `Reino da Sintaxe: ${f.nome}` });
  definirResultados([]);
  jogo = { f, i: 0, pontos: 0, combo: 0, melhorCombo: 0, timers: [], rodando: true, t: 0, ultimo: performance.now(),
    cam: 0, heroi: { x: 60, passo: 0, alvo: null, susto: 0 }, part: [], raio: null, estado: 'andando', tentativa: 1,
    traje: trajeAtual(), t0: performance.now() };
  $('reino-titulo').textContent = `${f.icone} ${f.nome}`;
  $('tela-reino').dataset.modo = f.modo;
  $('reino-controles').innerHTML = '';
  $('reino-frase').innerHTML = '';
  msg('');
  mostrar('tela-reino');
  if (f.modo === 'ponte') iniciarPonte();
  else if (f.modo === 'classes') iniciarClasses();
  else iniciarHistoria();
  hud();
  requestAnimationFrame(quadro);
}

function pararReino() {
  if (jogo) { jogo.rodando = false; jogo.timers.forEach(clearTimeout); }
  jogo = null;
}

// ---------- HUD, pontos e Orbe da Precisão ----------
function hud() {
  const j = jogo;
  $('reino-pontos').textContent = j.pontos;
  const total = j.itens.length + (j.f.chefe ? 1 : 0);
  $('reino-progresso').innerHTML = Array.from({ length: total }, (_, k) => `<i class="${k < j.i ? 'feito' : ''}${k === total - 1 && j.f.chefe ? ' chefe' : ''}"></i>`).join('');
  const o = $('reino-orbe');
  o.hidden = j.combo < 2;
  o.textContent = j.combo >= 6 ? `🔮 ${j.combo} seguidos · x3` : j.combo >= 3 ? `🔮 ${j.combo} seguidos · x2` : `🔮 ${j.combo} seguidos`;
  o.classList.toggle('quente', j.combo >= 3);
  o.classList.toggle('mestre', j.combo >= 6);
}
const mult = () => (jogo.combo >= 6 ? 3 : jogo.combo >= 3 ? 2 : 1);
function acertouDePrimeira(base, x, y) {
  const j = jogo;
  j.combo++;
  j.melhorCombo = Math.max(j.melhorCombo, j.combo);
  const pts = base * mult();
  j.pontos += pts;
  texto(x, y, `+${pts}`, '#1d6b3d');
  if (j.combo === 3 || j.combo === 6) { tocar([[784, 0.08], [988, 0.08], [1319, 0.16]]); texto(x, y - 22, j.combo === 3 ? '🔮 Fluência x2!' : '🔮 Mestre x3!', '#7a3fa3'); }
  hud();
}
function errou() { jogo.combo = 0; hud(); }
function registrar(tipo, certa, erros) {
  resultados.push({ m: TIPOS_REINO[tipo], certa, erros, tempo: (performance.now() - jogo.t0) / 1000 });
}

// ---------- partículas e textos que sobem ----------
function particulas(x, y, cor, n = 12, forca = 90) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, v = forca * (0.4 + Math.random() * 0.8);
    jogo.part.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, vida: 0.7 + Math.random() * 0.4, max: 1.1, cor, tam: 2 + Math.random() * 3, g: 160 });
  }
}
function texto(x, y, t, cor) { jogo.part.push({ x, y, vx: 0, vy: -28, vida: 1.3, max: 1.3, texto: t, cor, g: 0 }); }
function emojiVoando(x, y, e, vx, vy) { jogo.part.push({ x, y, vx, vy, vida: 1.6, max: 1.6, emoji: e, tam: 22, g: -10 }); }

// ---------- laço do jogo ----------
function quadro(agora) {
  const j = jogo;
  if (!j || !j.rodando) return;
  const dt = Math.min(0.05, (agora - j.ultimo) / 1000);
  j.ultimo = agora;
  j.t += dt;
  const tela = medidas();
  if (j.f.modo === 'ponte') atualizarPonte(dt, tela);
  else if (j.f.modo === 'classes') atualizarClasses(dt, tela);
  else atualizarHistoria(dt, tela);
  j.part = j.part.filter((p) => (p.vida -= dt) > 0);
  j.part.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; });
  if (j.raio) { j.raio.t -= dt; if (j.raio.t <= 0) j.raio = null; }
  if (j.heroi.susto > 0) j.heroi.susto -= dt;
  desenhar(tela);
  requestAnimationFrame(quadro);
}

function medidas() {
  const cv = $('reino-canvas');
  const w = cv.clientWidth || 320, h = cv.clientHeight || 200, dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const s = h / ALT;
  return { cv, g: cv.getContext('2d'), w, h, dpr, s, W: w / s };
}
// velocidade do herói: o Orbe da Precisão acelera
const velocidade = () => 72 * (jogo.combo >= 6 ? 1.55 : jogo.combo >= 3 ? 1.3 : 1);
const pontaDoCajado = () => ({ x: jogo.heroi.x + 9, y: CHAO - 43 });   // o orbe no sprite do herói (pixel 14,3)

// ============ Modo 1: Ponte de Lacunas ============
function iniciarPonte() {
  const j = jogo;
  j.itens = escolherItens(LACUNAS[j.f.nivel], j.f.itens, 'tipo');
  // abismo e porta se alternam; no nível 2 os conectivos sempre são portas (a porta certa x o atalho perigoso)
  j.obs = j.itens.map((item, k) => ({ x: 250 + k * 300, larg: 78, item, tipo: item.tipo === 'conect' || k % 2 ? 'porta' : 'abismo', feito: false, anim: 0 }));
  j.castelo = 250 + j.itens.length * 300 + 80;
  j.esferas = [];
  $('reino-frase').innerHTML = `<span class="reino-dica">O herói vai andando... Prepare-se para completar a frase!</span>`;
}

function mostrarLacuna() {
  const j = jogo, ob = j.obs[j.i], item = ob.item;
  j.estado = 'pergunta';
  j.tentativa = 1;
  j.t0 = performance.now();
  const [antes, depoisTxt] = item.t.split('___');
  $('reino-frase').innerHTML = `<button class="reino-ouvir" type="button" id="reino-ouvir" aria-label="Ouvir a frase">🔊</button>
    <span class="reino-texto">${antes}<span class="reino-lacuna" id="reino-lacuna">?</span>${depoisTxt}</span>`;
  $('reino-ouvir').onclick = () => ouvir(item.t.replace('___', ', hum, '));
  const tela = medidas();
  const cam = Math.max(0, j.heroi.x - tela.W * 0.25);   // onde a câmera vai parar (ela ainda pode estar deslizando)
  const opcoes = embaralhar([item.c, ...item.e]);
  j.esferas = opcoes.map((p, k) => {
    const x = cam + tela.W * (0.32 + (0.56 * (k + 0.5)) / opcoes.length);
    return { palavra: p, certa: p === item.c, x, y: 70 + (k % 2) * 26, x0: x, y0: 70 + (k % 2) * 26, fase: k * 1.7, usada: false, voo: null };
  });
  msg(j.i === 0 ? '👆 Toque na <b>esfera</b> com a palavra que completa a frase.' : 'Qual palavra completa a frase?');
}

function tocarCanvas(e) {
  const j = jogo;
  if (!j || j.f.modo !== 'ponte' || j.estado !== 'pergunta') return;
  const tela = medidas(), r = tela.cv.getBoundingClientRect();
  const x = (e.clientX - r.left) / tela.s + j.cam, y = (e.clientY - r.top) / tela.s;
  const alvo = j.esferas.find((s) => !s.usada && Math.hypot(s.x - x, s.y - y) < raioEsfera(tela.g, s) + 10);
  if (alvo) lancarEsfera(alvo);
}
function raioEsfera(g, s) {
  g.font = `700 15px ${FONTE}`;
  return Math.max(22, g.measureText(s.palavra).width / 2 + 11);
}

// o cajado dispara na esfera e ela voa até o abismo/porta
function lancarEsfera(s) {
  const j = jogo, ob = j.obs[j.i];
  j.estado = 'voando';
  SOM.clique();
  const p = pontaDoCajado();
  j.raio = { x1: p.x, y1: p.y, x2: s.x, y2: s.y, t: 0.25, cor: '#9be7ff' };
  s.voo = { t: 0, de: { x: s.x, y: s.y }, para: { x: ob.x + ob.larg / 2, y: ob.tipo === 'porta' ? CHAO - 52 : CHAO - 6 }, volta: !s.certa };
}

function chegouEsfera(s) {
  const j = jogo, ob = j.obs[j.i], item = ob.item;
  const completa = item.t.replace('___', item.c);
  if (s.certa) {
    j.estado = 'construindo';
    ob.feito = true;
    j.esferas.forEach((x) => { x.usada = true; });
    s.some = true;
    $('reino-lacuna').textContent = item.c;
    $('reino-lacuna').classList.add('ok');
    particulas(s.x, s.y, '#ffd54f', 18);
    SOM.certo();
    if (j.tentativa === 1) { registrar(item.tipo, completa, []); acertouDePrimeira(10, s.x, s.y - 20); msg(`✅ <b>${completa}</b>`, 'ok'); }
    else msg(`✔ <b>${completa}</b> ${item.por}`, 'ok');
    anotarNoDiario(item.tipo, completa);
    j.i++;
    hud();
    depois(1100, () => { j.estado = 'andando'; $('reino-frase').innerHTML = `<span class="reino-dica">${ob.tipo === 'porta' ? '🚪 A porta abriu!' : '🌉 A ponte apareceu!'}</span>`; });
    return;
  }
  // errou: a esfera bate, volta apagada e a mensagem explica
  SOM.errado();
  j.heroi.susto = 0.6;
  particulas(s.x, s.y, '#e53935', 10, 60);
  s.usada = true;
  s.voo = { t: 0, de: { x: s.x, y: s.y }, para: { x: s.x0, y: s.y0 }, volta: false, retorno: true };
  if (item.tipo === 'conect' && ob.tipo === 'porta') emojiVoando(ob.x + ob.larg / 2, CHAO - 60, '🦇', 50, -40);
  $('reino-lacuna').classList.add('treme');
  depois(450, () => $('reino-lacuna') && $('reino-lacuna').classList.remove('treme'));
  if (j.tentativa === 1) {
    registrar(item.tipo, completa, [`escolheu "${s.palavra}"`]);
    errou();
    j.tentativa = 2;
    const atalho = item.tipo === 'conect' ? '🦇 Essa porta era um atalho perigoso! ' : '';
    // a dica é só a primeira parte do porquê (antes de ": exemplo"), para não entregar a resposta pronta
    msg(`✘ ${atalho}"${s.palavra}" não combina aqui. ${item.por.split(': ')[0].replace(/\.$/, '')}. Tente outra esfera!`, 'erro');
    depois(350, () => { j.estado = 'pergunta'; });
  } else {
    msg(`✘ A palavra certa era <b>${item.c}</b>. ${item.por}`, 'erro');
    depois(1600, () => { const certa = j.esferas.find((x) => x.certa); lancarEsfera(certa); });
  }
}

function atualizarPonte(dt, tela) {
  const j = jogo, h = j.heroi, ob = j.obs[j.i];
  if (j.estado === 'andando') {
    h.x += velocidade() * dt;
    h.passo += dt * velocidade() / 9;
    if (j.combo >= 3 && Math.random() < 0.5) j.part.push({ x: h.x - 8, y: CHAO - 10 - Math.random() * 20, vx: -20, vy: -10, vida: 0.5, max: 0.5, cor: j.combo >= 6 ? '#ffd54f' : '#9be7ff', tam: 2.5, g: 0 });
    if (ob && h.x >= ob.x - 30) { h.x = ob.x - 30; mostrarLacuna(); }
    if (!ob && h.x >= j.castelo - 20) { h.x = j.castelo - 20; j.estado = 'fim'; SOM.vitoria(); particulas(j.castelo, CHAO - 80, '#ffd54f', 30, 120); depois(1300, terminarReino); }
  }
  j.cam += (Math.max(0, h.x - tela.W * 0.25) - j.cam) * Math.min(1, dt * 6);
  j.obs.forEach((o) => { if (o.feito && o.anim < 1) o.anim = Math.min(1, o.anim + dt * 1.6); });
  j.esferas.forEach((s) => {
    if (s.voo) {
      s.voo.t += dt / 0.4;
      const k = Math.min(1, s.voo.t), e = 1 - (1 - k) * (1 - k);
      s.x = s.voo.de.x + (s.voo.para.x - s.voo.de.x) * e;
      s.y = s.voo.de.y + (s.voo.para.y - s.voo.de.y) * e - Math.sin(k * Math.PI) * 30;
      if (k >= 1) { const v = s.voo; s.voo = null; if (!v.retorno) chegouEsfera(s); }
    } else if (!s.some) { s.y = s.y0 + Math.sin(j.t * 2.2 + s.fase) * 5; }
  });
}

// ============ Modo 2: Força das Classes ============
function iniciarClasses() {
  const j = jogo;
  const lista = CLASSES[j.f.nivel];
  const todos = escolherItens(lista, j.f.itens + (j.f.chefe || 0), 'c');
  j.itens = todos.slice(0, j.f.itens);
  j.palavrasChefe = todos.slice(j.f.itens);
  j.sintonias = j.f.nivel === 1 ? ['ve', 'su', 'aj'] : ['ve', 'su', 'aj', 'pn'];
  j.heroi.x = 46;
  j.inimigo = null;
  j.chefe = null;
  j.bloco = null;
  $('reino-controles').innerHTML = `<div class="reino-sintonias">${j.sintonias.map((k) => {
    const s = SINTONIAS[k];
    return `<button class="reino-sintonia" type="button" data-s="${k}" style="--c:${s.cor}"><span class="reino-sint-icone">${s.icone}</span>${s.nome}</button>`;
  }).join('')}</div>`;
  $('reino-controles').querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => sintonizar(b.dataset.s, b); });
  depois(500, proximoInimigo);
}

const palavraDe = (item) => item.f.match(/\*([^*]+)\*/)[1];
function proximoInimigo() {
  const j = jogo, tela = medidas();
  j.tentativa = 1;
  j.t0 = performance.now();
  liberarSintonias();
  let item;
  if (j.i < j.itens.length) {
    item = j.itens[j.i];
    j.inimigo = { item, x: tela.W + 30, y: CHAO, estado: 'anda', t: 0, cor: ['#7cb342', '#ab47bc', '#26a69a', '#ef6c00'][j.i % 4], bola: false };
  } else {
    if (!j.chefe) j.chefe = { hp: j.f.chefe, max: j.f.chefe, x: tela.W - 62, flash: 0, morto: 0, novo: true };
    item = j.palavrasChefe[j.chefe.max - j.chefe.hp];
    j.inimigo = { item, x: j.chefe.x - 40, y: CHAO - 60, estado: 'anda', t: 0, cor: '#ff7043', bola: true };
  }
  const p = palavraDe(item);
  $('reino-frase').innerHTML = `<button class="reino-ouvir" type="button" id="reino-ouvir" aria-label="Ouvir a frase">🔊</button>
    <span class="reino-texto">${item.f.replace(/\*([^*]+)\*/, '<mark class="reino-marca">$1</mark>')}</span>`;
  $('reino-ouvir').onclick = () => ouvir(`${item.f.replace(/\*/g, '')} A palavra é: ${p}.`);
  if (j.chefe && j.chefe.novo) { j.chefe.novo = false; msg(`🐉 O <b>Dragão da Desordem</b> apareceu! Devolva a palavra com a sintonia certa: <b>"${p}"</b> é...`); }
  else msg(j.chefe ? `🐉 Que classe é <b>"${p}"</b>?` : j.i === 0 ? `👆 Que classe é <b>"${p}"</b>? Toque na sintonia do cajado.` : `Que classe é <b>"${p}"</b>?`);
  j.estado = 'pergunta';
}
function liberarSintonias() {
  $('reino-controles').querySelectorAll('[data-s]').forEach((b) => { b.disabled = false; b.classList.remove('errada', 'certa'); });
}

function sintonizar(k, botao) {
  const j = jogo;
  if (!j || j.estado !== 'pergunta' || !j.inimigo) return;
  const inim = j.inimigo, item = inim.item, p = palavraDe(item), certa = item.c;
  const limpa = item.f.replace(/\*/g, '');
  if (k === certa) {
    botao.classList.add('certa');
    efeitoClasse(k, inim);
    SOM.certo();
    if (j.tentativa === 1) { registrar(certa, `"${p}" é ${SINTONIAS[certa].nome.toLowerCase()}: ${limpa}`, []); acertouDePrimeira(j.chefe ? 15 : 10, inim.x, inim.y - 60); msg(`✅ "${p}" é <b>${SINTONIAS[certa].nome.toLowerCase()}</b>!`, 'ok'); }
    else msg(`✔ "${p}" é <b>${SINTONIAS[certa].nome.toLowerCase()}</b>: ${TIPOS_REINO[certa].regra}`, 'ok');
    anotarNoDiario(certa, limpa);
    seguirDepoisDoEfeito();
    return;
  }
  // errou: o cajado falha, o monstrinho ri e chega mais perto (sem perder nada)
  SOM.errado();
  botao.classList.add('errada');
  botao.disabled = true;
  j.heroi.susto = 0.6;
  const pc = pontaDoCajado();
  particulas(pc.x + 6, pc.y, '#9e9e9e', 8, 40);
  inim.x = Math.max(inim.bola ? 120 : 92, inim.x - 30);
  inim.ri = 0.8;
  if (j.tentativa === 1) {
    registrar(certa, `"${p}" é ${SINTONIAS[certa].nome.toLowerCase()}: ${limpa}`, [`marcou ${SINTONIAS[k].nome.toLowerCase()}`]);
    errou();
    j.tentativa = 2;
    msg(`✘ "${p}" não é ${SINTONIAS[k].nome.toLowerCase()} (${SINTONIAS[k].pista}). É ação, nome, característica ou fica no lugar do nome? Tente de novo!`, 'erro');
  } else {
    j.estado = 'efeito';
    msg(`✘ "${p}" é <b>${SINTONIAS[certa].nome.toLowerCase()}</b>: ${TIPOS_REINO[certa].regra}`, 'erro');
    depois(1500, () => {
      const b = $('reino-controles').querySelector(`[data-s="${certa}"]`);
      if (b) b.classList.add('certa');
      efeitoClasse(certa, inim);
      SOM.certo();
      anotarNoDiario(certa, limpa);
      seguirDepoisDoEfeito();
    });
  }
}

// cada sintonia tem o seu efeito: verbo empurra (ação), substantivo materializa um bloco, adjetivo congela,
// pronome troca o monstrinho por outra forma
function efeitoClasse(k, inim) {
  const j = jogo, pc = pontaDoCajado();
  j.estado = 'efeito';
  inim.estado = 'efeito';
  inim.efeito = k;
  inim.t = 0;
  if (k === 've') j.raio = { x1: pc.x, y1: pc.y, x2: inim.x, y2: inim.y - 20, t: 0.35, cor: '#ffd54f', zigue: true };
  if (k === 'su' && !inim.bola) j.bloco = { x: inim.x, y: -30, alvo: inim.y - 34, t: 0 };
  if (k === 'aj') { j.raio = { x1: pc.x, y1: pc.y, x2: inim.x, y2: inim.y - 20, t: 0.35, cor: '#81d4fa' }; particulas(inim.x, inim.y - 20, '#e1f5fe', 14, 50); }
  if (k === 'pn') { particulas(inim.x, inim.y - 20, '#ce93d8', 22, 80); }
  if (inim.bola && j.chefe) {
    // no chefe, a palavra volta para o dragão
    inim.volta = true;
  }
}

function seguirDepoisDoEfeito() {
  const j = jogo;
  depois(1100, () => {
    if (j.chefe && j.i >= j.itens.length) {
      j.chefe.hp--;
      j.chefe.flash = 0.5;
      particulas(j.chefe.x, CHAO - 60, '#ff8a65', 18, 100);
      tocar([[196, 0.12, 'square'], [147, 0.18, 'square']]);
      if (j.chefe.hp <= 0) {
        j.i++;
        hud();
        j.inimigo = null;
        j.chefe.morto = 0.01;
        msg('🏆 Você venceu o <b>Dragão da Desordem</b>!', 'ok');
        SOM.vitoria();
        depois(2200, terminarReino);
        return;
      }
    } else j.i++;
    hud();
    j.inimigo = null;
    j.bloco = null;
    if (!j.f.chefe && j.i >= j.itens.length) { j.estado = 'fim'; SOM.vitoria(); depois(900, terminarReino); return; }
    depois(350, proximoInimigo);
  });
}

function atualizarClasses(dt, tela) {
  const j = jogo, inim = j.inimigo;
  j.cam = 0;
  j.heroi.passo += dt * 2;
  if (j.chefe) {
    j.chefe.x = tela.W - 62;
    if (j.chefe.flash > 0) j.chefe.flash -= dt;
    if (j.chefe.morto) j.chefe.morto += dt;
  }
  if (j.bloco) { j.bloco.t += dt; j.bloco.y = Math.min(j.bloco.alvo, j.bloco.y + dt * 420); }
  if (!inim) return;
  inim.t += dt;
  if (inim.ri > 0) inim.ri -= dt;
  if (inim.estado === 'anda') {
    const parar = inim.bola ? 120 : 92;
    const v = (j.f.nivel === 1 ? 16 : 20) * (inim.bola ? 0.7 : 1);
    if (inim.x > parar) inim.x = Math.max(parar, inim.x - v * dt);
  } else if (inim.estado === 'efeito') {
    if (inim.volta) { inim.x += dt * 260; inim.y -= dt * 10; }
    else if (inim.efeito === 've') { inim.x += dt * 320; inim.giro = (inim.giro || 0) + dt * 12; }
    else if (inim.efeito === 'aj' && inim.t > 0.7 && !inim.quebrou) { inim.quebrou = true; particulas(inim.x, inim.y - 18, '#b3e5fc', 26, 110); tocar([[1568, 0.05], [1175, 0.08]]); }
    else if (inim.efeito === 'pn' && inim.t > 0.3 && !inim.trocou) { inim.trocou = true; emojiVoando(inim.x, inim.y - 24, '🦋', 30, -40); }
  }
}

// ============ Modo 3: Livro Mágico (sequência narrativa) ============
function iniciarHistoria() {
  const j = jogo;
  j.itens = embaralhar(HISTORIAS[j.f.nivel]).slice(0, j.f.itens);
  j.heroi.x = 80;
  depois(200, novaHistoria);
}

function novaHistoria() {
  const j = jogo, h = j.itens[j.i];
  j.tentativa = 1;
  j.t0 = performance.now();
  j.estado = 'montar';
  j.ordem = [];        // índices (ordem certa) na ordem em que a criança tocou
  j.travadas = new Set();
  j.cena = null;
  j.blocos = embaralhar(h.partes.map((_, k) => k));
  $('reino-frase').innerHTML = `<span class="reino-texto"><b>📖 ${h.titulo}</b></span>`;
  msg(j.i === 0 ? '👆 Toque nas partes na ordem em que acontecem: o que vem <b>primeiro</b>?' : 'O que acontece <b>primeiro</b>?');
  desenharBlocos();
}

function desenharBlocos() {
  const j = jogo, h = j.itens[j.i];
  $('reino-controles').innerHTML = `<div class="reino-blocos">${j.blocos.map((k) => {
    const pos = j.ordem.indexOf(k);
    const trav = j.travadas.has(k);
    return `<button class="reino-bloco${pos >= 0 ? ' marcado' : ''}${trav ? ' travado' : ''}" type="button" data-k="${k}" ${trav || j.estado !== 'montar' ? 'disabled' : ''}>
      <span class="reino-num">${pos >= 0 ? pos + 1 : ''}</span>
      <span class="reino-bloco-texto">${h.partes[k].t}</span>
      <span class="reino-ouvir-bloco" data-ouvir="${k}" role="button" aria-label="Ouvir esta parte">🔊</span></button>`;
  }).join('')}</div>`;
  $('reino-controles').querySelectorAll('[data-k]').forEach((b) => {
    b.onclick = (e) => {
      const k = Number(b.dataset.k);
      if (e.target.dataset.ouvir) { ouvir(h.partes[k].t); return; }
      tocarBloco(k);
    };
  });
}

function tocarBloco(k) {
  const j = jogo, h = j.itens[j.i];
  if (j.estado !== 'montar' || j.travadas.has(k)) return;
  SOM.clique();
  const pos = j.ordem.indexOf(k);
  if (pos >= 0) j.ordem.splice(pos, 1);   // tocar de novo tira o número (as travadas ✔ continuam)
  else j.ordem.push(k);
  desenharBlocos();
  if (j.ordem.length === h.partes.length) { j.estado = 'lendo'; desenharBlocos(); depois(450, lerHistoria); }
}

// o palco encena a história na ordem escolhida; a parte que chega antes da hora vira cena absurda
function lerHistoria() {
  const j = jogo, h = j.itens[j.i];
  msg('📖 O livro mágico está lendo a sua história...');
  const passos = [];
  const visto = new Set();
  j.ordem.forEach((k) => {
    const absurdo = h.partes.slice(0, k).some((_, a) => !visto.has(a));
    visto.add(k);
    passos.push({ k, absurdo });
  });
  let n = 0;
  const passo = () => {
    if (n >= passos.length) { conferirHistoria(); return; }
    const { k, absurdo } = passos[n];
    const p = h.partes[k];
    j.cena = { parte: p, absurdo, t: 0, de: j.heroi.x };
    $('reino-frase').innerHTML = `<span class="reino-texto${absurdo ? ' reino-absurdo' : ''}">${absurdo ? `😂 ${p.absurdo}` : p.t}</span>`;
    $('reino-controles').querySelectorAll('.reino-bloco').forEach((b) => b.classList.toggle('lendo', Number(b.dataset.k) === k));
    if (absurdo) tocar([[330, 0.1, 'sawtooth'], [220, 0.2, 'sawtooth']]);
    else tocar([[523 + n * 60, 0.1]]);
    ouvir(absurdo ? p.absurdo : p.t);
    n++;
    depois(absurdo ? 3200 : 2600, passo);
  };
  passo();
}

function conferirHistoria() {
  const j = jogo, h = j.itens[j.i];
  const certas = j.ordem.map((k, pos) => k === pos);
  const tudo = certas.every(Boolean);
  const nome = `${h.titulo}`;
  if (tudo) {
    SOM.vitoria();
    if (j.tentativa === 1) { registrar('seq', nome, []); acertouDePrimeira(30, medidas().W / 2, 60); msg(`⭐ História completa! Começo, meio e fim no lugar certo.`, 'ok'); }
    else msg('✔ Agora sim: a história faz sentido!', 'ok');
    anotarNoDiario('seq', h.partes.map((p) => p.t).join(' '));
    particulas(medidas().W / 2, 70, '#ffd54f', 30, 120);
    j.i++;
    hud();
    j.estado = 'fim-historia';
    const ultima = j.i >= j.itens.length;
    $('reino-controles').innerHTML = `<button class="reino-btn" type="button" id="reino-seguir">${ultima ? 'Ver resultado 🏁' : 'Próxima história ▶'}</button>`;
    $('reino-seguir').onclick = () => { SOM.clique(); if (ultima) terminarReino(); else novaHistoria(); };
    $('reino-seguir').focus({ preventScroll: true });
    return;
  }
  // errou: as partes certas ficam travadas ✔, as outras voltam sem número
  SOM.errado();
  if (j.tentativa === 1) { registrar('seq', nome, [`ordem ${j.ordem.map((k) => k + 1).join('-')}`]); errou(); }
  j.tentativa++;
  if (j.tentativa > 2) {
    msg('Veja a ordem certa: o livro vai ler de novo.', 'erro');
    j.ordem = h.partes.map((_, k) => k);
    j.ordem.forEach((k) => j.travadas.add(k));
    j.estado = 'lendo';
    desenharBlocos();
    depois(1200, lerHistoria);
    return;
  }
  const certasIdx = j.ordem.filter((k, pos) => k === pos);
  // só fica travado o começo certo seguido (1, 2...), para a criança refazer a partir do primeiro erro
  j.travadas = new Set();
  for (let pos = 0; pos < j.ordem.length && j.ordem[pos] === pos; pos++) j.travadas.add(pos);
  j.ordem = [...j.travadas];
  j.estado = 'montar';
  j.cena = null;
  desenharBlocos();
  const dica = j.f.nivel === 2 ? ' Dica: <b>Primeiro</b>, <b>Depois</b>, <b>Então</b> e <b>Por fim</b> mostram a ordem.' : ' Pense: o que precisa acontecer antes?';
  msg(`✘ A história ficou estranha!${certasIdx.length && j.travadas.size ? ' As partes ✔ já estão certas.' : ''}${dica}`, 'erro');
}

function atualizarHistoria(dt, tela) {
  const j = jogo, c = j.cena;
  j.cam = 0;
  if (!c) { j.heroi.passo += dt * 2; return; }
  c.t += dt;
  const alvo = c.parte.heroi * tela.W;
  const k = Math.min(1, c.t / 0.8);
  const antes = j.heroi.x;
  j.heroi.x = c.de + (alvo - c.de) * k;
  if (Math.abs(j.heroi.x - antes) > 0.01) j.heroi.passo += dt * 8;
  if (c.absurdo && c.t > 0.8) j.heroi.susto = 0.2;
}

// ============ desenho ============
function desenhar(tela) {
  const { g, dpr, s, W } = tela, j = jogo;
  g.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, W, ALT);
  const modo = j.f.modo;
  if (modo === 'historia') fundoHistoria(g, W, j.cena ? j.cena.parte.fundo : 'livro');
  else fundoMundo(g, W, j.cam, modo === 'ponte' ? (j.f.nivel === 1 ? 'floresta' : 'montanha') : (j.chefe ? 'dragao' : 'vale'));
  g.save();
  g.translate(-j.cam, 0);
  if (modo === 'ponte') desenharPonte(g, W);
  else if (modo === 'classes') chao(g, j.cam - 10, j.cam + W + 10, j.chefe ? 'rocha' : 'grama');
  else chao(g, j.cam - 10, j.cam + W + 10, (j.cena ? j.cena.parte.fundo : 'livro') === 'campo' ? 'grama' : corChaoHistoria(j.cena ? j.cena.parte.fundo : 'livro'));
  if (modo === 'classes') desenharClasses(g, W);
  if (modo === 'historia') desenharCena(g, W);
  const andando = modo === 'ponte' ? j.estado === 'andando' : modo === 'historia' && !!j.cena && j.cena.t < 0.8;
  desenharHeroi(g, j.heroi.x, CHAO, j.traje.cor, j.heroi.passo, j.heroi.susto > 0, andando);
  if (j.raio) desenharRaio(g, j.raio);
  if (modo === 'ponte') j.esferas.forEach((e) => desenharEsfera(g, e));
  j.part.forEach((p) => {
    g.globalAlpha = Math.max(0, Math.min(1, p.vida / (p.max * 0.5)));
    if (p.texto) { g.font = `700 14px ${FONTE}`; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#fff'; g.strokeText(p.texto, p.x, p.y); g.fillStyle = p.cor; g.fillText(p.texto, p.x, p.y); }
    else if (p.emoji) { g.font = `${p.tam}px sans-serif`; g.textAlign = 'center'; g.fillText(p.emoji, p.x, p.y); }
    else { g.fillStyle = p.cor; g.fillRect(Math.round(p.x - p.tam / 2), Math.round(p.y - p.tam / 2), p.tam, p.tam); }   // partículas quadradas, no estilo pixel
  });
  g.globalAlpha = 1;
  g.restore();
}

// céu, montanhas e árvores ao longe (paralaxe: o que está longe anda mais devagar)
function fundoMundo(g, W, cam, tema) {
  const S = SPR();
  // céu em faixas (degradê "pixelado", sem suavizar)
  const ceu = { floresta: ['#8fd0ff', '#b5e2ff', '#d8f1ff'], montanha: ['#ffb37a', '#ffd0a0', '#ffe9cc'], vale: ['#9fd8ff', '#c4e9ff', '#e4f6ff'], dragao: ['#3b2357', '#5e3a7a', '#8f5a8f'] }[tema];
  const faixa = CHAO / 3;
  ceu.forEach((c, k) => { g.fillStyle = c; g.fillRect(0, k * faixa, W, faixa + 1); });
  if (tema === 'dragao') { g.fillStyle = '#ffe9b0'; g.fillRect(W - 60, 22, 14, 14); g.fillStyle = '#f5d690'; g.fillRect(W - 50, 26, 4, 4); }
  // nuvens
  for (let k = -1; k < W / 170 + 2; k++) {
    const x = k * 170 - ((cam * 0.1 + jogo.t * 5) % 170), y = 34 + (k % 2) * 20;
    desenharSprite(g, S.nuvem, x, y, { alfa: tema === 'dragao' ? 0.25 : 0.95 });
  }
  // montanhas/colinas em duas camadas, com o lado da sombra
  const passo = tema === 'floresta' || tema === 'vale' ? 150 : 130;
  const longe = { floresta: ['#a8d8a0', '#8cc489'], montanha: ['#c9a383', '#a8836a'], vale: ['#b3dfae', '#93c990'], dragao: ['#4a2f63', '#3a2450'] }[tema];
  for (let k = -1; k < W / passo + 2; k++) {
    const x = k * passo - ((cam * 0.2) % passo), alto = 70 + (((k % 3) + 3) % 3) * 16;
    const topo = CHAO - alto - (tema === 'montanha' || tema === 'dragao' ? 30 : 0);
    g.fillStyle = longe[0];
    g.beginPath(); g.moveTo(x - 30, CHAO); g.lineTo(x + passo / 2, topo); g.lineTo(x + passo + 30, CHAO); g.fill();
    g.fillStyle = longe[1];
    g.beginPath(); g.moveTo(x + passo / 2, topo); g.lineTo(x + passo + 30, CHAO); g.lineTo(x + passo / 2 + 10, CHAO); g.fill();
    if (tema === 'montanha') { g.fillStyle = '#fff8f0'; g.beginPath(); g.moveTo(x + passo / 2, topo); g.lineTo(x + passo / 2 - 16, topo + 22); g.lineTo(x + passo / 2 - 4, topo + 16); g.lineTo(x + passo / 2 + 8, topo + 22); g.fill(); }
  }
  // árvores mais perto (sprites)
  const arv = tema === 'floresta' || tema === 'vale' ? S.arvore : S.pinheiro;
  for (let k = -1; k < W / 96 + 2; k++) {
    const x = k * 96 - ((cam * 0.5) % 96) + 30;
    desenharSprite(g, arv, x, CHAO + 2, { alfa: tema === 'dragao' ? 0.55 : 1 });
  }
}

// chão: tiles de grama ou de rocha em pixel art; numa cor lisa nos palcos de dentro de casa, cidade etc.
function chao(g, x1, x2, tipo) {
  if (tipo !== 'grama' && tipo !== 'rocha') {
    g.fillStyle = tipo; g.fillRect(x1, CHAO, x2 - x1, ALT - CHAO);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x1, CHAO + 6, x2 - x1, ALT - CHAO);
    g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x1, CHAO, x2 - x1, 2);
    return;
  }
  const tile = SPR()[tipo], larg = tile.width * ART;
  g.save();
  g.beginPath(); g.rect(x1, CHAO - 1, x2 - x1, ALT); g.clip();
  g.fillStyle = tipo === 'grama' ? '#74503a' : '#6a5650';
  g.fillRect(x1, CHAO, x2 - x1, ALT - CHAO);
  for (let x = Math.floor(x1 / larg) * larg; x < x2; x += larg) g.drawImage(tile, x, CHAO, larg, larg);
  g.restore();
}

function desenharPonte(g, W) {
  const j = jogo, S = SPR(), x1 = j.cam - 10, x2 = j.cam + W + 10;
  const tipoChao = j.f.nivel === 1 ? 'grama' : 'rocha';
  // chão com buracos nos abismos
  let x = x1;
  j.obs.filter((o) => o.tipo === 'abismo' && o.x + o.larg > x1 && o.x < x2).forEach((o) => { chao(g, x, o.x, tipoChao); x = o.x + o.larg; });
  chao(g, x, x2, tipoChao);
  j.obs.forEach((o) => {
    if (o.x + o.larg < x1 || o.x > x2) return;
    if (o.tipo === 'abismo') {
      // o abismo: paredes de terra, escuro e água lá no fundo
      g.fillStyle = '#1b2a3a'; g.fillRect(o.x, CHAO, o.larg, ALT - CHAO);
      g.fillStyle = '#2c4058'; g.fillRect(o.x, CHAO, 4, ALT - CHAO); g.fillRect(o.x + o.larg - 4, CHAO, 4, ALT - CHAO);
      g.fillStyle = '#1565c0'; g.fillRect(o.x, ALT - 10, o.larg, 10);
      g.fillStyle = '#64b5f6';
      for (let k = 0; k < 3; k++) g.fillRect(Math.round(o.x + 6 + ((jogo.t * 20 + k * 25) % (o.larg - 16))), ALT - 10, 8, 2);
      // a ponte: tábuas aparecendo uma a uma, presas em postes, com a corda
      if (o.feito) {
        const larg = S.tabua.width * ART, n = Math.ceil(o.larg / larg);
        for (let k = 0; k < n; k++) {
          if (o.anim < (k + 1) / n) break;
          const cai = Math.max(0, 1 - (o.anim * n - k) * 2) * 10;   // cada tábua cai um pouquinho no lugar
          g.drawImage(S.tabua, o.x + k * larg, CHAO - 4 - cai, larg, S.tabua.height * ART);
        }
        g.fillStyle = '#5d4037'; g.fillRect(o.x - 3, CHAO - 20, 4, 22);
        if (o.anim >= 1) g.fillRect(o.x + o.larg - 1, CHAO - 20, 4, 22);
        g.strokeStyle = '#c8a26b'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(o.x, CHAO - 18); g.quadraticCurveTo(o.x + o.larg / 2, CHAO - 8, o.x + o.larg * Math.min(1, o.anim), CHAO - 18); g.stroke();
      }
    } else {
      // porta de pedra com folha de madeira: sobe quando a frase fica certa
      const cx = o.x + o.larg / 2, pw = S.pilar.width * ART, dw = S.porta.width * ART, dh = S.porta.height * ART;
      const sobe = (o.feito ? o.anim : 0) * (dh - 6);
      g.save(); g.beginPath(); g.rect(cx - dw / 2, CHAO - dh - 4, dw, dh + 4); g.clip();
      g.drawImage(S.porta, cx - dw / 2, CHAO - dh - sobe, dw, dh);
      g.restore();
      desenharSprite(g, S.pilar, cx - dw / 2 - pw / 2 + 2, CHAO);
      desenharSprite(g, S.pilar, cx + dw / 2 + pw / 2 - 2, CHAO);
      g.fillStyle = '#7c8698'; g.fillRect(cx - dw / 2 - pw, CHAO - S.pilar.height * ART - 8, dw + pw * 2, 9);
      g.fillStyle = '#d3dbe5'; g.fillRect(cx - dw / 2 - pw, CHAO - S.pilar.height * ART - 8, dw + pw * 2, 2);
    }
  });
  // castelo da chegada, com a bandeira da cor da fase
  const c = j.castelo;
  if (c - 60 < x2) {
    desenharSprite(g, S.castelo, c + 48, CHAO + 2);
    const topo = CHAO - S.castelo.height * ART + 2;
    g.fillStyle = '#455a64'; g.fillRect(c + 46, topo - 34, 3, 34);
    g.fillStyle = jogo.f.cor;
    const onda = Math.round(Math.sin(jogo.t * 5) * 2);
    g.fillRect(c + 49, topo - 34, 18, 6); g.fillRect(c + 49, topo - 28, 14 + onda, 6);
  }
}

function desenharEsfera(g, e) {
  if (e.some) return;
  const r = raioEsfera(g, e);
  g.globalAlpha = e.usada && !e.voo ? 0.3 : 1;
  // brilho mágico em volta (só nas que ainda podem ser tocadas)
  if (!e.usada) { g.fillStyle = 'rgba(155,231,255,.35)'; g.beginPath(); g.arc(e.x, e.y, r + 4 + Math.sin(jogo.t * 4 + e.fase) * 1.5, 0, 7); g.fill(); }
  const gr = g.createRadialGradient(e.x - r / 3, e.y - r / 3, 2, e.x, e.y, r);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, e.usada ? '#cfd8dc' : '#b3e5fc');
  g.fillStyle = gr;
  g.beginPath(); g.arc(e.x, e.y, r, 0, 7); g.fill();
  g.lineWidth = 2.5; g.strokeStyle = e.usada ? '#90a4ae' : '#0288d1'; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(e.x - r * 0.4, e.y - r * 0.5, r * 0.25, r * 0.12, -0.5, 0, 7); g.fill();
  g.fillStyle = '#0d2a4a'; g.font = `700 15px ${FONTE}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(e.palavra, e.x, e.y + 1);
  if (e.usada && !e.voo) { g.fillStyle = '#c62828'; g.fillText('✘', e.x + r - 4, e.y - r + 4); }
  g.textBaseline = 'alphabetic';
  g.globalAlpha = 1;
}

function desenharRaio(g, r) {
  g.globalAlpha = Math.min(1, r.t * 5);
  const n = 8;
  for (const [cor, larg] of [[r.cor, 5], ['#ffffff', 2]]) {
    g.strokeStyle = cor; g.lineWidth = larg;
    g.beginPath(); g.moveTo(r.x1, r.y1);
    for (let k = 1; k < n; k++) g.lineTo(r.x1 + ((r.x2 - r.x1) * k) / n, r.y1 + ((r.y2 - r.y1) * k) / n + (r.zigue ? (k % 2 ? -8 : 8) : 0));
    g.lineTo(r.x2, r.y2); g.stroke();
  }
  g.globalAlpha = 1;
}

// o herói (sprite): caminhada em 4 quadros, respirando parado, cajado erguido ao lançar magia, susto no erro
function desenharHeroi(g, x, y, cor, passo, susto, andando = true) {
  const j = jogo, trem = susto ? Math.round(Math.sin(j.t * 60) * 1.5) : 0;
  const orbe = j.combo >= 6 ? '#ffd54f' : j.combo >= 3 ? '#4dd0e1' : '#9be7ff';
  const quadro = susto ? 'susto' : j.raio ? 'magia' : andando ? `anda${Math.floor(passo) % 4}` : `parado${Math.floor(j.t * 1.6) % 2}`;
  g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(Math.round(x - 12), y - 1, 24, 3);
  if (j.combo >= 6) { g.fillStyle = 'rgba(255,213,79,.28)'; g.beginPath(); g.arc(x, y - 26, 30 + Math.sin(j.t * 6) * 2, 0, 7); g.fill(); }
  desenharSprite(g, spriteHeroi(cor, orbe, quadro), x + trem, y + ART);
  // o orbe brilha mais com a fluência
  if (j.combo >= 3) {
    const p = pontaDoCajado();
    g.fillStyle = j.combo >= 6 ? 'rgba(255,213,79,.45)' : 'rgba(77,208,225,.4)';
    g.beginPath(); g.arc(p.x, p.y, 7 + Math.sin(j.t * 8) * 1.5, 0, 7); g.fill();
  }
  if (susto) { g.font = `700 13px ${FONTE}`; g.textAlign = 'center'; g.fillStyle = '#c62828'; g.fillText('?!', x, y - 58); }
}

function desenharClasses(g, W) {
  const j = jogo, inim = j.inimigo;
  if (j.chefe) desenharDragao(g, j.chefe);
  if (j.bloco) desenharSprite(g, SPR().bloco, j.bloco.x, j.bloco.y + 32);
  if (!inim) return;
  const p = palavraDe(inim.item);
  const e = inim.estado === 'efeito' ? inim.efeito : null;
  let esc = 1, alfa = 1, cor = inim.cor;
  if (e === 'su') esc = j.bloco && j.bloco.y >= j.bloco.alvo ? 0.25 : 1;
  if (e === 'aj') { cor = '#9fd8f2'; if (inim.quebrou) alfa = 0; }
  if (e === 'pn' && inim.trocou) alfa = 0;
  if (e === 've' || inim.volta) alfa = Math.max(0, 1 - inim.t * 1.2);
  if (alfa <= 0) return;
  g.globalAlpha = alfa;
  if (inim.bola) {
    // bola de fogo do dragão carregando a palavra (pixel: quadrados concêntricos piscando)
    const y = inim.y - 14 + Math.round(Math.sin(j.t * 4) * 3), fogo = e === 'aj' ? ['#4fc3f7', '#b3e5fc', '#ffffff'] : ['#e64a19', '#ff9800', '#fff59d'];
    [16, 11, 6].forEach((r, k) => { g.fillStyle = fogo[k]; g.fillRect(Math.round(inim.x - r), Math.round(y - r), r * 2, r * 2); });
    if (!e) { g.fillStyle = '#ff9800'; for (let k = 0; k < 3; k++) g.fillRect(Math.round(inim.x + 14 + k * 6), Math.round(y - 6 + ((j.t * 30 + k * 7) % 12)), 4, 4); }
  } else {
    g.save();
    g.translate(Math.round(inim.x), inim.y);
    if (inim.giro) g.rotate(inim.giro);
    g.scale(1, esc);
    const pulo = inim.ri > 0 ? -Math.abs(Math.sin(inim.ri * 12)) * 8 : 0;
    const quadro = inim.ri > 0 ? 'ri' : Math.floor(j.t * 3) % 2 ? 'b' : 'a';
    desenharSprite(g, spriteMonstro(cor, quadro), 0, pulo + ART, { escala: 1.2 });
    if (e === 'aj') { g.fillStyle = 'rgba(225,245,254,.7)'; g.fillRect(-6, -30, 4, 4); g.fillRect(8, -22, 4, 4); g.fillRect(-14, -12, 4, 4); }
    g.restore();
  }
  // a placa com a palavra
  g.font = `700 14px ${FONTE}`;
  const lw = g.measureText(p).width + 16, py = inim.bola ? inim.y - 48 : inim.y - 58;
  g.fillStyle = '#5d4037'; g.fillRect(Math.round(inim.x - 1), py + 8, 3, inim.bola ? 6 : 14);
  g.fillStyle = '#fffde7'; g.strokeStyle = '#5d4037'; g.lineWidth = 2;
  g.beginPath(); g.roundRect ? g.roundRect(inim.x - lw / 2, py - 14, lw, 22, 6) : g.rect(inim.x - lw / 2, py - 14, lw, 22); g.fill(); g.stroke();
  g.fillStyle = '#3e2723'; g.textAlign = 'center'; g.fillText(p, inim.x, py + 2);
  if (inim.ri > 0) { g.fillStyle = '#6a1b9a'; g.font = `700 11px ${FONTE}`; g.fillText('hihi!', inim.x + 24, py - 16); }
  g.globalAlpha = 1;
}

function desenharDragao(g, c) {
  const j = jogo;
  const caiu = c.morto ? Math.min(1, c.morto / 1.2) : 0;
  const quadro = Math.floor(j.t * 3) % 2 ? 'a' : 'b';
  const branco = c.flash > 0 && Math.sin(j.t * 40) > 0;
  g.save();
  g.translate(Math.round(c.x), CHAO + 2 + Math.round(Math.sin(j.t * 3) * 2));
  g.rotate(caiu * 0.6);
  desenharSprite(g, spriteDragao(quadro, branco), 0, 0, { alfa: 1 - caiu * 0.8 });
  g.restore();
  // vida do chefe (corações de pixel numa barra)
  if (!c.morto) {
    const larg = 76, y = CHAO - 112;
    g.fillStyle = '#2b1d2e'; g.fillRect(c.x - larg / 2 - 2, y - 2, larg + 4, 12);
    g.fillStyle = '#5b2333'; g.fillRect(c.x - larg / 2, y, larg, 8);
    g.fillStyle = '#e53935'; g.fillRect(c.x - larg / 2, y, (larg * c.hp) / c.max, 8);
    g.fillStyle = '#ff8a80'; g.fillRect(c.x - larg / 2, y, (larg * c.hp) / c.max, 2);
    g.font = `700 11px ${FONTE}`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(`🐉 ${c.hp}/${c.max}`, c.x, y - 6);
  }
}

// palco do livro mágico
const FUNDOS = {
  livro: ['#f3e5c8', '#fff8e8', '#c8a879'], campo: ['#bfe6ff', '#e8f7ff', '#7cb342'], caverna: ['#3e3a46', '#57505f', '#5d4e46'],
  casa: ['#ffe0b2', '#fff3e0', '#bc8f5f'], praia: ['#81d4fa', '#e1f5fe', '#f2d39b'], noite: ['#1a237e', '#3949ab', '#33691e'],
  cidade: ['#cfd8dc', '#eceff1', '#9e9e9e'],
};
const corChaoHistoria = (f) => (FUNDOS[f] || FUNDOS.livro)[2];
function fundoHistoria(g, W, fundo) {
  const c = FUNDOS[fundo] || FUNDOS.livro;
  // céu em 4 faixas (degradê de pixel art) e, ao ar livre, nuvens e árvores em sprite
  for (let k = 0; k < 4; k++) {
    const t = k / 3, mistura = (i) => Math.round(parseInt(c[0].slice(i, i + 2), 16) * (1 - t) + parseInt(c[1].slice(i, i + 2), 16) * t);
    g.fillStyle = `rgb(${mistura(1)},${mistura(3)},${mistura(5)})`;
    g.fillRect(0, (k * CHAO) / 4, W, CHAO / 4 + 1);
  }
  if (fundo === 'campo' || fundo === 'praia') { desenharSprite(g, SPR().nuvem, W * 0.2, 40); desenharSprite(g, SPR().nuvem, W * 0.78, 28); }
  if (fundo === 'campo') { desenharSprite(g, SPR().arvore, W * 0.08, CHAO + 2); desenharSprite(g, SPR().arvore, W * 0.92, CHAO + 2); }
  if (fundo === 'noite') { desenharSprite(g, SPR().pinheiro, W * 0.08, CHAO + 2, { alfa: 0.7 }); desenharSprite(g, SPR().pinheiro, W * 0.93, CHAO + 2, { alfa: 0.7 }); }
  if (fundo === 'noite') { g.fillStyle = '#fff'; for (let k = 0; k < 18; k++) g.fillRect((k * 53) % W, (k * 29) % 90 + 6, 2, 2); }
  if (fundo === 'praia') { g.fillStyle = '#29b6f6'; g.fillRect(0, CHAO - 26, W, 26); }
  if (fundo === 'casa') { g.fillStyle = 'rgba(141,90,43,.25)'; g.fillRect(W * 0.08, 40, 46, 40); g.fillStyle = '#bbdefb'; g.fillRect(W * 0.08 + 4, 44, 38, 32); }
  if (fundo === 'cidade') { g.fillStyle = '#b0bec5'; for (let k = 0; k < W / 50; k++) g.fillRect(k * 50 + 4, CHAO - 50 - (k % 3) * 22, 40, 50 + (k % 3) * 22); }
  if (fundo === 'caverna') { g.fillStyle = '#2b2730'; for (let k = 0; k < W / 30; k++) { g.beginPath(); g.moveTo(k * 30, 0); g.lineTo(k * 30 + 15, 22 + (k % 3) * 8); g.lineTo(k * 30 + 30, 0); g.fill(); } }
  if (fundo === 'livro') {
    g.fillStyle = '#8d5a2b'; g.font = `700 18px ${FONTE}`; g.textAlign = 'center';
    g.fillText('📖 Livro Mágico', W / 2, 60);
    g.font = `600 12px ${FONTE}`; g.fillStyle = '#6d4c41';
    g.fillText('Toque nas partes na ordem certa', W / 2, 82);
  }
}

function desenharCena(g, W) {
  const c = jogo.cena;
  if (!c) return;
  const entra = Math.min(1, c.t / 0.35);
  c.parte.cena.forEach(([e, rx, alt, tam], k) => {
    const x = rx * W, y = CHAO - alt;
    g.save();
    g.translate(x, y);
    if (c.absurdo) { g.rotate(Math.PI + Math.sin(jogo.t * 6 + k) * 0.3); g.translate(0, tam * 0.8); }
    g.scale(entra, entra);
    g.font = `${tam}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom';
    g.fillText(e, 0, 0);
    g.restore();
  });
  g.textBaseline = 'alphabetic';
}

// ---------- fim da partida ----------
function terminarReino() {
  if (!jogo) return;
  const { f, pontos, melhorCombo } = jogo;
  const d = lerDados();
  d.recordes = d.recordes || {};
  const novoRecorde = pontos > (d.recordes[f.id] || 0);
  if (novoRecorde) { d.recordes[f.id] = pontos; gravarDados(d); }
  const jaTinha = concluida(f.id);
  const porTipo = Object.values(TIPOS_REINO).map((t) => {
    const rs = resultados.filter((r) => r.m.id === t.id);
    return rs.length ? `${t.titulo}: ${rs.filter((r) => !r.erros.length).length}/${rs.length}` : '';
  }).filter(Boolean);
  pararReino();
  missao.resumo = [
    `Fase: ${f.nome}. De primeira por habilidade: ${porTipo.join(' · ')}.`,
    `Melhor sequência sem errar: ${melhorCombo}.${novoRecorde ? ' Novo recorde!' : ''}`,
    `BNCC: ${[...new Set(Object.values(TIPOS_REINO).filter((t) => resultados.some((r) => r.m.id === t.id)).map((t) => t.bncc))].join(', ')}.`,
    `Pontos: ${pontos}`,
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  const traje = TRAJES.find((t) => t.fase === f.id);
  const ganhou = !jaTinha && concluida(f.id);
  if (ganhou && traje) { const dd = lerDados(); dd.traje = traje.id; gravarDados(dd); }
  $('fim-titulo').textContent = novoRecorde ? 'Novo recorde! 🏆' : n === 3 ? 'Sintaxista perfeito! 📖' : 'Fase completa!';
  $('fim-texto').textContent = `${aluno}, você fez ${pontos} pontos em "${f.nome}"${melhorCombo >= 3 ? ` e acertou ${melhorCombo} seguidos` : ''}!`
    + (ganhou ? ` Você ganhou o traje "${traje.nome}" e uma página nova no Livro das Crônicas!` : '');
}

// capa do cartão na lista de jogos: a mesma pixel art do jogo (o herói lançando a palavra que vira ponte)
function desenharCapa() {
  const cv = document.createElement('canvas');
  cv.width = 200; cv.height = 150;
  const g = cv.getContext('2d'), S = SPR();
  g.imageSmoothingEnabled = false;
  ['#8fd0ff', '#b5e2ff', '#d8f1ff'].forEach((c, k) => { g.fillStyle = c; g.fillRect(0, k * 38, 200, 39); });
  desenharSprite(g, S.nuvem, 44, 30); desenharSprite(g, S.nuvem, 160, 20);
  g.fillStyle = '#a8d8a0'; g.beginPath(); g.moveTo(-20, 116); g.lineTo(60, 60); g.lineTo(140, 116); g.fill();
  g.fillStyle = '#8cc489'; g.beginPath(); g.moveTo(90, 116); g.lineTo(170, 54); g.lineTo(240, 116); g.fill();
  desenharSprite(g, S.arvore, 16, 118); desenharSprite(g, S.arvore, 186, 118);
  for (let x = 0; x < 200; x += 32) g.drawImage(S.grama, x, 116, 32, 32);
  g.fillStyle = '#1b2a3a'; g.fillRect(100, 116, 52, 34); g.fillStyle = '#1565c0'; g.fillRect(100, 142, 52, 8);
  for (let k = 0; k < 3; k++) g.drawImage(S.tabua, 100 + k * 18, 112, 18, 10);
  desenharSprite(g, spriteHeroi('#1e64d2', '#4dd0e1', 'magia'), 62, 120);
  g.strokeStyle = '#9be7ff'; g.lineWidth = 3; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(76, 70); g.lineTo(116, 60); g.stroke(); g.setLineDash([]);
  g.fillStyle = 'rgba(155,231,255,.4)'; g.beginPath(); g.arc(134, 58, 23, 0, 7); g.fill();
  g.fillStyle = '#e1f5fe'; g.strokeStyle = '#0288d1'; g.lineWidth = 2.5; g.beginPath(); g.arc(134, 58, 19, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#0d2a4a'; g.font = `700 13px ${FONTE}`; g.textAlign = 'center'; g.fillText('ponte', 134, 63);
  g.fillStyle = '#fffde7'; g.strokeStyle = '#5d4037'; g.fillRect(8, 8, 88, 24); g.strokeRect(8, 8, 88, 24);
  g.fillStyle = '#3e2723'; g.font = `700 12px ${FONTE}`; g.fillText('A ___ caiu.', 52, 25);
  $('reino-capa').appendChild(cv);
}
desenharCapa();

$('reino-canvas').addEventListener('pointerdown', tocarCanvas);
$('btn-reino').onclick = () => { SOM.clique(); escolherProfessorE('O Reino da Sintaxe', telaReinoMenu); };
$('reino-voltar').onclick = telaJogos;
$('reino-sair').onclick = telaReinoMenu;
$('reino-btn-livro').onclick = () => { SOM.clique(); telaLivro('livro'); };
$('reino-btn-diario').onclick = () => { SOM.clique(); telaLivro('diario'); };
$('reino-aba-livro').onclick = () => telaLivro('livro');
$('reino-aba-diario').onclick = () => telaLivro('diario');
$('reino-livro-voltar').onclick = telaReinoMenu;

export { comecarReino, pararReino, telaReinoMenu };
