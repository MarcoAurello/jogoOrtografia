/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Missão Respiração. */

import { $, embaralhar } from './util.js?v=287';
import { aluno, definirMissao, definirResultados, estrelasTexto, lerEstrelas, missao, resultados } from './estado.js?v=287';
import { frase, SOM, tocar } from './som.js?v=287';
import { mascote, mostrar, telaJogos } from './telas.js?v=287';
import { escolherProfessorE } from './professor.js?v=287';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=287';
import { AR, PARADAS_RESP, perguntasAlveolos, perguntasCelula, perguntasNariz, perguntasTraqueia, TIPOS_RESP } from './dados-respiracao.js?v=287';
import { desenharSprite } from './sprites-reino.js?v=287';
import { spriteParticula } from './sprites-respiracao.js?v=287';

// ---------- Missão Respiração ----------
// Ciências (4º e 5º ano, BNCC EF05CI06): a mesma gamificação da Missão Digestão para o sistema respiratório. A criança
// toca em "Começar" e guia o próprio ar (uma nuvenzinha com rostinho, que entra trazendo poeira) pela viagem, em corte de lado,
// pintado pixel a pixel (skill arte-pixel-cenarios). A cena respira: o vento entra e sai no ritmo da respiração.
// Fase 1: o nariz (a entrada, os pelinhos e o muco, o ar aquecido e umedecido) e a garganta (faringe, laringe e as
// cordas vocais). No nariz, a poeira que veio com o ar fica presa nos pelinhos e o ar segue limpinho.
// Fase 2: a traqueia (vista por dentro, como um túnel: anéis de cartilagem, cílios e muco subindo, a tosse que joga a
// migalha para fora) e, de frente, os pulmões com a árvore dos brônquios até os alvéolos.
// Fase 3: o cacho de alvéolos (o diafragma desce e eles enchem como balões; um macrófago passeia comendo poeira) e,
// dentro de um alvéolo, a troca de gases: o oxigênio passa para o sangue, o gás carbônico sai e a hemácia leva o
// oxigênio embora (BNCC EF05CI06 e EF05CI07).
// Fase 4 (fecha o ciclo): o coração bombeia o sangue; numa célula do músculo, o oxigênio (do ar) e a glicose (da
// comida, piscadinha para a Missão Digestão) viram energia; sobra o gás carbônico, que volta aos pulmões e sai na
// expiração. No fim, o Painel do Fôlego resume o ciclo com dicas de saúde.
// Mesmo padrão: um toque por resposta, sem tempo e sem "game over", erro que explica, explicação no painel até tocar
// em "Continuar", 🔊 para ouvir, só a primeira tentativa conta, sequência dá pontos x2/x3, mini-mapa e Álbum.
const ALT = 220;
const CHAVE = 'pleno-ortografia:respiracao';
const FONTE = 'Fredoka, sans-serif';
const MISSAO_ID = 'respiracao-viagem';
const CENA_DA = { entrada: 'nariz', poeira: 'nariz', aquecer: 'nariz', faringe: 'garganta', voz: 'garganta',
  cilios: 'traqueia', aneis: 'traqueia', tosse: 'traqueia', divisao: 'bronquios', galhos: 'bronquios',
  inspirar: 'alveolos', entra: 'troca', sai: 'troca', carona: 'troca', bomba: 'coracao', energia: 'celula', sobra: 'celula', expirar: 'expira' };
const FIM = { nariz: 580, garganta: 600, traqueia: 620, bronquios: 600, alveolos: 520, troca: 620, coracao: 600, celula: 640, expira: 600 };
const PARA = { entrada: 54, poeira: 142, aquecer: 300, faringe: 316, voz: 316, cilios: 150, aneis: 300, tosse: 450, divisao: 300, galhos: 0, inspirar: 160, entra: 300, sai: 300, carona: 300, bomba: 290, energia: 250, sobra: 384, expirar: 524 };
const SAIDA = { nariz: 556, traqueia: 590, alveolos: 356, coracao: 488, celula: 620 };
const ENTRADA = { garganta: -14, traqueia: -14, bronquios: 292, alveolos: -10, troca: 230, coracao: -10, celula: -10, expira: 524 };
const TITULO_CENA = { garganta: 'A garganta: faringe e laringe', traqueia: 'A traqueia: o tubo do ar', bronquios: 'Agora, de frente: os pulmões', alveolos: 'Os alvéolos: cachinhos de ar', troca: 'Dentro de um alvéolo', coracao: 'O coração: a bomba do sangue', celula: 'Uma célula do músculo da perna', expira: 'De volta aos pulmões' };
const BARRA_CENA = { nariz: '👃 Nariz', garganta: '🗣️ Garganta', traqueia: '〰️ Traqueia', bronquios: '🌳 Brônquios', alveolos: '🫧 Alvéolos', troca: '🫧 Troca de gases', coracao: '❤️ Coração', celula: '⚡ Célula', expira: '😮‍💨 Expiração' };
const AVISO_CENA = { garganta: 'O ar passou pelo nariz! Agora vem a garganta...', traqueia: 'O ar desceu pela laringe! Agora a traqueia...',
  bronquios: 'Fim da traqueia: ela vai se dividir em dois...', alveolos: 'Chegando ao fim dos galhos: os alvéolos!', troca: 'Vamos entrar num alvéolo...',
  coracao: 'A hemácia leva o oxigênio até o coração...', celula: 'O sangue chega ao músculo da perna...', expira: 'O gás carbônico volta aos pulmões...' };
const EPI = [292, 144], CORDAS_Y = 180;   // a epiglote (dobradiça) e as cordas vocais, na garganta (mundo)

let jogo = null;      // a partida em andamento

const lerDados = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; } };
const gravarDados = (d) => { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) { /* sem armazenamento */ } };
const depois = (ms, fn) => { const j = jogo; const t = setTimeout(() => { if (jogo === j) fn(); }, ms); j.timers.push(t); };
const msg = (texto, tipo = '') => { $('resp-msg').innerHTML = texto; $('resp-msg').className = `cores-msg reino-msg ${tipo}`; };
const ouvir = (texto) => frase('resp-frase', texto);
const R = (v) => Math.round(v / 2) * 2;   // tudo no grid de pixels da arte (1 pixel = 2 unidades)
function bloco(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(R(x), R(y), Math.max(2, R(w)), Math.max(2, R(h))); }

// o som da respiração: um sopro (ruído filtrado), entrando ou saindo. Respeita o botão de som (🔇).
let audioSopro = null;
function sopro(entrando) {
  if ($('btn-som') && $('btn-som').textContent.includes('🔇')) return;
  try {
    audioSopro = audioSopro || new (window.AudioContext || window.webkitAudioContext)();
    const a = audioSopro, dur = entrando ? 1.3 : 1.5, n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let k = 0; k < n; k++) d[k] = Math.random() * 2 - 1;
    const src = a.createBufferSource(), filtro = a.createBiquadFilter(), v = a.createGain(), t = a.currentTime;
    src.buffer = buf; filtro.type = 'bandpass'; filtro.frequency.value = entrando ? 950 : 620; filtro.Q.value = 0.7;
    v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(0.045, t + dur * 0.35); v.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(filtro); filtro.connect(v); v.connect(a.destination); src.start(t); src.stop(t + dur);
  } catch (e) { /* sem áudio */ }
}

// ============ telas de fora da fase ============
// menu: sem escolhas (pedido do Marco): um botão grande começa a viagem do ar. A viagem inteira é comprida (18
// perguntas, mais que uma aula), então o mapa da viagem deixa começar numa fase: tocar numa parada escolhe onde começa.
// As 4 fases: nariz e garganta, traqueia e brônquios, alvéolos, e coração e célula (começam na primeira tela de cada).
let inicio = 'nariz';
const FASE_DA_PARADA = { nariz: 'nariz', garganta: 'nariz', traqueia: 'traqueia', bronquios: 'traqueia', alveolos: 'alveolos', celula: 'coracao' };
const NOME_DO_INICIO = { nariz: 'no nariz', traqueia: 'na traqueia', alveolos: 'nos alvéolos', coracao: 'no coração' };
function telaRespiracaoMenu() {
  pararRespiracao();
  mascote('davi-resp', 'oi');
  const estrelas = lerEstrelas();
  $('resp-comecar').innerHTML = '<button class="reino-btn resp-comecar-btn" type="button" id="resp-comecar-btn">▶ Começar a viagem <small>💨 guiando o ar</small></button>';
  $('resp-comecar-btn').onclick = () => { SOM.clique(); comecarRespiracao(); };
  $('resp-viagem').innerHTML = PARADAS_RESP.map((p, k) => {
    const fase = FASE_DA_PARADA[p.id], seta = k ? '<span class="dig-seta" aria-hidden="true">›</span>' : '';
    const n = estrelas[fase === 'nariz' ? MISSAO_ID : `${MISSAO_ID}-${fase}`] || 0;
    return `${seta}<button class="dig-parada pronta${inicio === fase ? ' escolhida' : ''}" type="button" data-inicio="${fase}" aria-pressed="${inicio === fase}">
      <span class="dig-parada-icone">${p.icone}</span>${p.nome}<small>${estrelasTexto(n)}</small></button>`;
  }).join('');
  $('resp-viagem').querySelectorAll('[data-inicio]').forEach((b) => { b.onclick = () => { SOM.clique(); inicio = b.dataset.inicio; telaRespiracaoMenu(); }; });
  $('resp-inicio').textContent = inicio === 'nariz' ? 'A viagem começa no nariz. Toque numa parada para começar direto nela.'
    : `A viagem começa direto ${NOME_DO_INICIO[inicio]}. Toque no nariz para fazer a viagem inteira.`;
  mostrar('tela-resp-menu');
}

// ============ começar e parar ============
function comecarRespiracao() {
  pararRespiracao();
  const p = AR, todas = [...perguntasNariz(), ...perguntasTraqueia(), ...perguntasAlveolos(), ...perguntasCelula()];
  const itens = todas.slice(Math.max(0, todas.findIndex((it) => CENA_DA[it.parada] === inicio)));
  definirMissao({ id: inicio === 'nariz' ? MISSAO_ID : `${MISSAO_ID}-${inicio}`, respiracao: true, icone: '🫁', cor: p.cor,
    titulo: `Missão Respiração: ${inicio === 'nariz' ? 'o ciclo do ar' : `começando ${NOME_DO_INICIO[inicio]}`}` });
  definirResultados([]);
  jogo = { p, pId: 'ar', itens, i: 0, pontos: 0, combo: 0, melhorCombo: 0, timers: [], rodando: true,
    t: 0, ultimo: performance.now(), cam: 0, estado: 'andando', tentativa: 1, t0: performance.now(), mover: null, cena: inicio, transicao: null,
    // começando no coração, o personagem já é o oxigênio no sangue
    heroi: { x: inicio === 'nariz' ? 4 : ENTRADA[inicio], passo: 0, susto: 0, feliz: 0, molhado: inicio !== 'nariz', forma: inicio === 'coracao' ? 'molecula' : undefined, cor: inicio === 'coracao' ? '#4fc3f7' : undefined },
    // os pontinhos de poeira que vêm com o ar (em volta da nuvenzinha); no nariz, grudam nos pelinhos
    poeiras: [0, 1, 2, 3, 4].map((k) => ({ a: k * 1.26, r: 26 + (k % 2) * 8, presa: null })),
    part: [], ventos: [], yG: 140, yGAlvo: 140, epi: 0, vibra: 0, inspirando: false,
    cilios: 0, aneisT: -1, tosse: 0, migalha: null, sujeira: Array.from({ length: 22 }, (_, k) => ({ x: k * 23, cima: k % 2 === 0 })), alveolo: 0,
    enche: 0, macrofago: { come: 0 }, co2: [104, 116, 128, 138].map((x) => ({ x, sobe: -1 })), hemacias: Array.from({ length: 14 }, (_, k) => ({ x: k * 22 })),
    setaO2: false, setaCO2: false, carona: null, bombaT: 0, glicoseT: -1, energiaT: 0, co2c: [], expiraT: 0 };
  tituloBarra();
  $('resp-controles').innerHTML = '';
  $('resp-frase').innerHTML = `<span class="reino-dica">${p.icone} ${inicio === 'nariz' ? 'Você é o ar! Veja: você está trazendo poeira. Vamos entrar no corpo!' : `Você é o ar, e a viagem começa ${NOME_DO_INICIO[inicio]}!`}</span>`;
  msg('');
  mostrar('tela-resp');
  hud();
  proximaParada();
  requestAnimationFrame(quadro);
}
function tituloBarra() { $('resp-titulo').textContent = `${BARRA_CENA[jogo.cena]} · ${jogo.p.icone} ${jogo.p.nome}`; }

function pararRespiracao() {
  if (jogo) { jogo.rodando = false; jogo.timers.forEach(clearTimeout); }
  jogo = null;
}

// ---------- HUD, pontos e sequência ----------
function hud() {
  const j = jogo;
  $('resp-pontos').textContent = j.pontos;
  $('resp-progresso').innerHTML = j.itens.map((_, k) => `<i class="${k < j.i ? 'feito' : ''}"></i>`).join('');
  const o = $('resp-orbe');
  o.hidden = j.combo < 2;
  o.textContent = j.combo >= 6 ? `⚡ ${j.combo} seguidos · x3` : j.combo >= 3 ? `⚡ ${j.combo} seguidos · x2` : `⚡ ${j.combo} seguidos`;
  o.classList.toggle('quente', j.combo >= 3);
  o.classList.toggle('mestre', j.combo >= 6);
}
const mult = () => (jogo.combo >= 6 ? 3 : jogo.combo >= 3 ? 2 : 1);
function acertouDePrimeira(x, y) {
  const j = jogo;
  j.combo++;
  j.melhorCombo = Math.max(j.melhorCombo, j.combo);
  const pts = 10 * mult();
  j.pontos += pts;
  texto(x, y, `+${pts}`, '#1d6b3d');
  if (j.combo === 3) { tocar([[784, 0.08], [988, 0.08], [1319, 0.16]]); texto(x, y - 20, '⚡ Fôlego x2!', '#b45309'); }
  hud();
}
function registrar(item, erros) {
  const certa = item.ops.find((o) => o.certa);
  const rotulo = { entrada: 'Por onde o ar entra', poeira: 'A poeira no nariz', aquecer: 'O ar dentro do nariz', faringe: 'Depois da faringe', voz: 'As cordas vocais',
    cilios: 'Os cílios da traqueia', aneis: 'Os anéis da traqueia', tosse: 'A migalha no caminho errado', divisao: 'A traqueia se divide', galhos: 'Onde os galhos terminam',
    inspirar: 'O diafragma na inspiração', entra: 'O que passa para o sangue', sai: 'O que sai do sangue', carona: 'Quem leva o oxigênio',
    bomba: 'O que o coração faz', energia: 'Do que a célula precisa', sobra: 'O gás que sobra', expirar: 'Como o gás carbônico sai' }[item.parada];
  resultados.push({ m: TIPOS_RESP[item.tipo], certa: `${rotulo}: ${certa.t}`, erros, tempo: (performance.now() - jogo.t0) / 1000 });
}

// ---------- partículas do efeito e textos que sobem ----------
function particulas(x, y, cor, n = 12, forca = 90) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, v = forca * (0.4 + Math.random() * 0.8);
    jogo.part.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, vida: 0.7 + Math.random() * 0.4, max: 1.1, cor, tam: 2 + Math.random() * 3, g: 160 });
  }
}
// os textos que sobem ficam um tempo bom na tela (para dar tempo de ler)
function texto(x, y, t, cor) { jogo.part.push({ x, y, vx: 0, vy: -16, vida: 2.6, max: 2.6, texto: t, cor, g: 0 }); }

// ============ as paradas ============
function proximaParada() {
  const j = jogo;
  if (j.i >= j.itens.length) return;
  j.estado = 'andando';
  $('resp-controles').innerHTML = '';
  const parada = j.itens[j.i].parada;
  if (CENA_DA[parada] === j.cena) { irPara(PARA[parada], mostrarPergunta); return; }
  const nova = CENA_DA[parada];
  $('resp-frase').innerHTML = `<span class="reino-dica">${AVISO_CENA[nova]}</span>`;
  const trocar = () => { j.transicao = { t: 0, trocou: false, cena: nova, depois: () => irPara(PARA[parada], mostrarPergunta) }; };
  if (SAIDA[j.cena] !== undefined) irPara(SAIDA[j.cena], trocar); else trocar();
}
function irPara(x, aoChegar) { jogo.mover = { x, aoChegar }; }

function mostrarPergunta() {
  const j = jogo, item = j.itens[j.i];
  if (item.parada === 'tosse') j.migalha = { x: j.heroi.x + 46, voa: 0 };
  j.estado = 'pergunta';
  j.tentativa = 1;
  j.t0 = performance.now();
  $('resp-frase').innerHTML = `<button class="reino-ouvir" type="button" id="resp-ouvir" aria-label="Ouvir a pergunta">🔊</button>
    <span class="reino-texto">${item.q}</span>`;
  $('resp-ouvir').onclick = () => ouvir(`${item.q} ${item.ops.map((o) => o.t).join('? ')}?`);
  const curtas = item.ops.every((o) => o.t.length <= 12);
  const ops = embaralhar(item.ops);
  $('resp-controles').innerHTML = `<div class="reino-sintonias ${curtas ? 'dig-opcoes-dentes' : 'dig-opcoes-longas'}">${ops.map((o) => `
    <button class="reino-sintonia dig-opcao" type="button" data-op="${item.ops.indexOf(o)}" style="--c:${item.tipo === 'nariz' ? '#0277bd' : '#7b1fa2'}">
      <span class="reino-sint-icone" aria-hidden="true">${o.icone}</span><span>${o.t}</span>
    </button>`).join('')}</div>`;
  $('resp-controles').querySelectorAll('[data-op]').forEach((b) => { b.onclick = () => responder(item.ops[Number(b.dataset.op)], b); });
  if (j.i === 0) msg('👆 Toque na resposta. Se quiser, toque em 🔊 para ouvir.');
  else msg('');
}

function responder(op, botao) {
  const j = jogo;
  if (!j || j.estado !== 'pergunta' || botao.disabled) return;
  const item = j.itens[j.i], certa = item.ops.find((o) => o.certa);
  if (op.certa) {
    j.estado = 'acao';
    botao.classList.add('certa');
    $('resp-controles').querySelectorAll('button').forEach((b) => { b.disabled = true; });
    SOM.certo();
    j.heroi.feliz = 1.4;
    if (j.tentativa === 1) { registrar(item, []); acertouDePrimeira(j.heroi.x, piso(j.heroi.x) - 64); msg(`✅ <b>${certa.t}.</b> ${item.por}`, 'ok'); }
    else msg(`✔ <b>${certa.t}.</b> ${item.por}`, 'ok');
    j.i++;
    hud();
    // a explicação fica no painel até a criança tocar em "Continuar"; a viagem segue quando a animação acabou e ela tocou
    const explicacao = `${certa.t}. ${item.por}`;
    $('resp-controles').innerHTML = `<div class="dig-feedback">
      <button class="reino-ouvir" type="button" id="resp-ouvir-exp" aria-label="Ouvir a explicação">🔊</button>
      <button class="reino-btn dig-continuar" type="button" id="resp-continuar">Continuar ▶</button></div>`;
    $('resp-ouvir-exp').onclick = () => ouvir(explicacao);
    let animOk = false, botaoOk = false;
    const seguir = () => {
      if (!animOk || !botaoOk || jogo !== j) return;
      if (j.i < j.itens.length) proximaParada(); else terminarRespiracao();
    };
    $('resp-continuar').onclick = () => { SOM.clique(); botaoOk = true; $('resp-continuar').disabled = true; seguir(); };
    $('resp-continuar').focus({ preventScroll: true });
    acaoCerta(item, () => { animOk = true; seguir(); });
    return;
  }
  SOM.errado();
  botao.classList.add('errada');
  botao.disabled = true;
  j.heroi.susto = 0.8;
  acaoErrada(item, op);
  if (j.tentativa === 1) {
    registrar(item, [`escolheu "${op.t}"`]);
    j.combo = 0;
    hud();
    j.tentativa = 2;
    msg(`✘ ${op.por} Tente outra resposta!`, 'erro');
  } else {
    j.estado = 'esperando';
    msg(`✘ A resposta certa é <b>${certa.t}</b>. ${item.por}`, 'erro');
    $('resp-controles').querySelectorAll('button').forEach((b) => { b.disabled = true; });
    depois(2600, () => {
      j.estado = 'pergunta';
      const b = $('resp-controles').querySelector(`[data-op="${item.ops.indexOf(certa)}"]`);
      b.disabled = false;
      responder(certa, b);
    });
  }
}

// a resposta certa acontece no cenário
function acaoCerta(item, seguir) {
  const j = jogo, h = j.heroi;
  if (item.parada === 'entrada') {
    // um sopro forte de ar entra pela narina e leva a partícula
    sopro(true);
    texto(h.x + 30, piso(h.x) - 60, '👃 Pelo nariz!', '#0277bd');
    depois(900, seguir);
  } else if (item.parada === 'poeira') {
    // a poeira solta da nuvenzinha e gruda nos pelinhos do nariz; o ar segue limpinho
    j.poeiras.forEach((p, k) => { p.presa = { t: 0, x: 104 + k * 9, y: 168 + (k % 2) * 4 }; });
    tocar([[523, 0.06, 'sine'], [440, 0.06, 'sine'], [349, 0.1, 'sine']]);
    texto(h.x, piso(h.x) - 60, '🧽 Presa nos pelinhos!', '#6d4c41');
    depois(1600, seguir);
  } else if (item.parada === 'aquecer') {
    h.molhado = true;
    particulas(h.x, piso(h.x) - 14, '#ffccbc', 12, 60);
    texto(h.x, piso(h.x) - 60, '♨️ Quentinho e úmido', '#0277bd');
    depois(1500, seguir);
  } else if (item.parada === 'faringe') {
    // a epiglote fica aberta: o ar desce para a laringe, até as cordas vocais
    j.yGAlvo = CORDAS_Y - 2;
    sopro(true);
    depois(1400, seguir);
  } else if (item.parada === 'voz') {
    // as cordas vocais vibram com o ar: "Aaaa... Olá!"; depois o ar desce para a traqueia
    j.vibra = 1.8;
    tocar([[220, 0.14, 'sawtooth'], [224, 0.14, 'sawtooth'], [220, 0.14, 'sawtooth'], [247, 0.22, 'sawtooth']]);
    texto(h.x - 40, piso(h.x) - 50, 'Olá! 🎤', '#7b1fa2');
    depois(1700, () => { j.yGAlvo = 250; });
    depois(2600, seguir);
  } else if (item.parada === 'cilios') {
    // os cílios balançam mais forte e o muco com a sujeira sobe depressa, como uma escada rolante
    j.cilios = 2.6;
    tocar([[660, 0.05, 'sine'], [740, 0.05, 'sine'], [830, 0.05, 'sine'], [880, 0.08, 'sine']]);
    texto(h.x, piso(h.x) - 50, '🧹 Escada rolante!', '#c2185b');
    depois(1800, seguir);
  } else if (item.parada === 'aneis') {
    // os anéis acendem um a um: a traqueia fica sempre aberta
    j.aneisT = 0;
    tocar([[523, 0.06], [587, 0.06], [659, 0.06], [784, 0.1]]);
    texto(h.x, piso(h.x) - 50, '⭕ Sempre aberta!', '#5e35b1');
    depois(1900, seguir);
  } else if (item.parada === 'tosse') {
    // cof, cof! o ar sai com força dos pulmões e joga a migalha para fora
    j.tosse = 1.2;
    if (j.migalha) j.migalha.voa = 0.01;
    sopro(false);
    tocar([[200, 0.08, 'sawtooth'], [150, 0.1, 'sawtooth'], [210, 0.08, 'sawtooth'], [140, 0.12, 'sawtooth']]);
    texto(h.x, piso(h.x) - 54, 'Cof! Cof!', '#c62828');
    for (let k = 0; k < 18; k++) j.ventos.push({ x: h.x + 60 + Math.random() * 60, y: 60 + Math.random() * 110, vida: 1, forte: true });
    depois(1800, seguir);
  } else if (item.parada === 'divisao') {
    j.galhosT = 0;
    sopro(true);
    texto(h.x + 30, piso(h.x) - 30, '🌳 Brônquios!', '#6a1b9a');
    depois(1500, seguir);
  } else if (item.parada === 'galhos') {
    // vai até a ponta do galho e chega num cachinho de alvéolos, que brilha
    irPara(CAMINHO_B[CAMINHO_B.length - 1][0] * 2, () => {
      j.alveolo = 2;
      tocar([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.18]]);
      texto(h.x, piso(h.x) - 30, '🫧 Alvéolos!', '#ad1457');
      depois(1500, seguir);
    });
  } else if (item.parada === 'inspirar') {
    // o diafragma desce e os alvéolos enchem como balões: pop!
    j.enche = 2;
    sopro(true);
    tocar([[880, 0.04, 'sine'], [660, 0.05, 'sine'], [990, 0.04, 'sine'], [740, 0.05, 'sine']]);
    texto(h.x, piso(h.x) - 40, '🎈 Os pulmões enchem!', '#ad1457');
    depois(1700, seguir);
  } else if (item.parada === 'entra') {
    // o oxigênio do ar atravessa a parede fininha e entra no sangue
    j.setaO2 = true;
    h.forma = 'molecula'; h.cor = '#4fc3f7';
    tocar([[1047, 0.06], [1319, 0.1]]);
    texto(h.x, piso(h.x) - 40, 'O₂: o oxigênio do ar!', '#0277bd');
    depois(500, () => { h.mergulho = { t: 0, fim: () => { h.mergulho = null; h.noSangue = true; } }; });
    depois(1900, seguir);
  } else if (item.parada === 'sai') {
    // o gás carbônico sai do sangue para o alvéolo (e vai embora na expiração)
    j.setaCO2 = true;
    j.co2.forEach((c, k) => { c.sobe = -k * 0.25; });
    tocar([[523, 0.06], [440, 0.06], [349, 0.1]]);
    texto(h.x - 50, 150, 'CO₂ vai embora!', '#5e35b1');
    depois(1900, seguir);
  } else if (item.parada === 'carona') {
    // uma hemácia chega e o oxigênio pega carona até o corpo todo
    j.carona = { x: j.cam - 30 };
    tocar([[392, 0.08], [523, 0.08], [659, 0.08], [784, 0.16]]);
    depois(900, () => { texto(h.x, piso(h.x) - 40, '🔴 Carona na hemácia!', '#c62828'); irPara(FIM.troca + 40, () => {}); });
    depois(2600, seguir);
  } else if (item.parada === 'bomba') {
    // tum-tum! o coração aperta e o sangue dispara pela artéria
    j.bombaT = 1.4;
    tocar([[70, 0.12], [55, 0.18], [70, 0.12], [55, 0.18]]);
    for (let k = 0; k < 16; k++) j.part.push({ x: 330 + Math.random() * 40, y: 60 + Math.random() * 20, vx: 80 + Math.random() * 80, vy: -40 + Math.random() * 30, vida: 0.8, max: 0.8, cor: k % 2 ? '#e53935' : '#ff8a80', tam: 3, g: 120 });
    texto(h.x, piso(h.x) - 40, '❤️ Tum-tum!', '#c62828');
    depois(1500, seguir);
  } else if (item.parada === 'energia') {
    // o oxigênio sobe para a mitocôndria e a glicose (que veio da comida) também: juntos, viram energia
    j.glicoseT = 0;
    irPara(PARA.sobra, () => {
      j.energiaT = 2;
      for (let k = 0; k < 20; k++) j.part.push({ x: 384 + (Math.random() - 0.5) * 30, y: 84 + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 60, vida: 0.9, max: 0.9, cor: k % 2 ? '#ffd54f' : '#fff59d', tam: 3, g: 60 });
      tocar([[523, 0.06], [784, 0.06], [1047, 0.06], [1568, 0.14]]);
      texto(h.x, piso(h.x) - 34, '⚡ Energia!', '#ef6c00');
      depois(600, () => texto(h.x + 60, piso(h.x) - 10, '💪 A perna ganhou força!', '#ef6c00'));
    });
    depois(2400, seguir);
  } else if (item.parada === 'sobra') {
    // o que sobra é o gás carbônico: agora você é ele! e vai embora pelo sangue
    h.forma = 'molecula'; h.cor = '#9575cd';
    j.co2c = [0, 1, 2].map((k) => ({ t: -k * 0.3 }));
    tocar([[392, 0.08], [330, 0.08], [262, 0.14]]);
    texto(h.x, piso(h.x) - 34, 'Agora você é gás carbônico!', '#5e35b1');
    depois(1700, seguir);
  } else if (item.parada === 'expirar') {
    // o diafragma sobe, os pulmões esvaziam e o ar sai levando o gás carbônico: fuuu!
    j.expiraT = 3;
    sopro(false);
    tocar([[330, 0.12, 'sine'], [294, 0.14, 'sine'], [262, 0.2, 'sine']]);
    irPara(ENTRADA.bronquios, () => { texto(h.x, 20, 'Fuuu! 😮‍💨', '#5e35b1'); depois(900, seguir); });
  }
}

function acaoErrada(item, op) {
  const j = jogo, h = j.heroi;
  if (item.parada === 'faringe' && op.id !== 'laringe') {
    // vai para o caminho da comida e volta: ops!
    j.estado = 'esperando';
    irPara(358, () => {
      texto(h.x, piso(h.x) - 50, 'Ops! Caminho da comida', '#c62828');
      h.susto = 0.8;
      irPara(PARA.faringe, () => { if (j.estado === 'esperando' && j.tentativa === 2) j.estado = 'pergunta'; });
    });
  } else particulas(h.x, piso(h.x) - 30, '#9e9e9e', 8, 50);
}

// ============ laço do jogo ============
function quadro(agora) {
  const j = jogo;
  if (!j || !j.rodando) return;
  const dt = Math.min(0.05, (agora - j.ultimo) / 1000);
  j.ultimo = agora;
  j.t += dt;
  const tela = medidas();
  atualizar(dt, tela);
  desenhar(tela);
  requestAnimationFrame(quadro);
}
function medidas() {
  const cv = $('resp-canvas');
  const w = cv.clientWidth || 320, h = cv.clientHeight || 200, dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const s = h / ALT;
  return { cv, g: cv.getContext('2d'), w, h, dpr, s, W: w / s };
}
const velocidade = () => 78 * (jogo.combo >= 6 ? 1.5 : jogo.combo >= 3 ? 1.25 : 1);
// a respiração: 1 = puxando o ar (inspira), -1 = soltando (expira); um ciclo a cada 4,4 s
const respiracao = () => Math.sin((jogo.t * Math.PI * 2) / 4.4);
// onde a partícula fica (mundo): no nariz, no chão da fossa nasal (em cima do céu da boca), descendo no fundo para a
// garganta; na garganta, pela passagem de cima, descendo pela faringe até a laringe e as cordas vocais
function piso(x) {
  if (jogo.cena === 'traqueia') return 150;
  if (jogo.cena === 'bronquios') return 2 * linearX(CAMINHO_B, x / 2) + 14;
  if (jogo.cena === 'alveolos') return 2 * linearX(CAMINHO_A, x / 2) + 10;
  if (jogo.cena === 'coracao') return 2 * linearX(CAMINHO_H, x / 2) + 10;
  if (jogo.cena === 'celula') return 2 * linearX(CAMINHO_C, x / 2) + 10;
  if (jogo.cena === 'expira') return 2 * linearX(CAMINHO_B, x / 2) + 14;
  if (jogo.cena === 'troca') {
    const h = jogo.heroi, ar = 2 * fundoDoAlveolo(x / 2) - 2, sangue = 210;
    if (h.mergulho) return ar + (sangue - ar) * h.mergulho.t;
    return h.noSangue ? sangue : ar;
  }
  if (jogo.cena === 'nariz') return x < 556 ? 176 : 176 + (x - 556) * 1.6;
  if (x < 296) return 60;
  if (x < 312) return 60 + (x - 296) * 5;
  if (x <= 324) return jogo.yG;
  return 140;
}

function atualizar(dt, tela) {
  const j = jogo, h = j.heroi;
  if (j.mover) {
    const d = j.mover.x - h.x, passo = velocidade() * dt;
    if (Math.abs(d) <= passo) { h.x = j.mover.x; const f = j.mover.aoChegar; j.mover = null; if (f) f(); }
    else { h.x += Math.sign(d) * passo; h.passo += dt * 7; }
  }
  if (j.transicao) {
    const tr = j.transicao;
    tr.t += dt / 1.8;
    if (tr.t >= 0.5 && !tr.trocou) { tr.trocou = true; j.cena = tr.cena; h.x = ENTRADA[tr.cena]; j.cam = 0; j.ventos = []; tituloBarra(); }
    if (tr.t >= 1) { const f = tr.depois; j.transicao = null; f(); }
  }
  // a respiração: o som do sopro a cada vez que muda de puxar para soltar
  const r = respiracao(), puxando = r > 0;
  if (puxando !== j.inspirando) { j.inspirando = puxando; if (!j.transicao && j.cena !== 'coracao' && j.cena !== 'celula') sopro(puxando); }
  // no coração, o tum-tum (e ele cresce um pouquinho a cada batida)
  if (j.cena === 'coracao') { j.somCor = (j.somCor || 0) - dt; if (j.somCor <= 0) { tocar([[78, 0.1], [62, 0.15]]); j.batidaC = 0.25; j.somCor = j.bombaT > 0 ? 0.45 : 0.85; } if (j.batidaC > 0) j.batidaC -= dt; }
  // o vento: risquinhos de ar indo para dentro (puxando) ou para fora (soltando)
  if (!['bronquios', 'alveolos', 'troca', 'coracao', 'celula', 'expira'].includes(j.cena) && j.ventos.length < 26 && Math.random() < 0.5) {
    const x = j.cam + Math.random() * tela.W;
    const y = j.cena === 'nariz' ? 60 + Math.random() * 110 : j.cena === 'traqueia' ? 50 + Math.random() * 120 : (x < 296 ? 22 + Math.random() * 34 : 30 + Math.random() * 100);
    j.ventos.push({ x, y, vida: 1.2 });
  }
  j.ventos.forEach((v) => { v.x += (v.forte ? -260 : r * 70) * dt; v.vida -= dt; });
  if (j.cilios > 0) j.cilios -= dt;
  if (j.tosse > 0) j.tosse -= dt;
  if (j.alveolo > 0) j.alveolo -= dt;
  if (j.enche > 0) j.enche -= dt;
  if (h.mergulho) { h.mergulho.t += dt / 1.1; if (h.mergulho.t >= 1) h.mergulho.fim(); }
  j.co2.forEach((c) => { if (c.sobe > -9 && c.sobe < 3) c.sobe += dt * (c.sobe < 0 && !j.setaCO2 ? 0 : 1); });
  j.hemacias.forEach((c) => { c.x = (c.x + dt * 22) % 330; });
  if (j.carona) j.carona.x += (h.x - j.carona.x) * Math.min(1, dt * 4);
  j.macrofago.come = (j.macrofago.come + dt / 6) % 1;
  if (j.bombaT > 0) j.bombaT -= dt;
  if (j.energiaT > 0) j.energiaT -= dt;
  if (j.expiraT > 0) j.expiraT -= dt;
  if (j.glicoseT >= 0 && j.glicoseT < 1) j.glicoseT = Math.min(1, j.glicoseT + dt / 1.4);
  j.co2c.forEach((c) => { c.t += dt / 1.6; });
  if (j.aneisT >= 0) j.aneisT += dt;
  if (j.migalha && j.migalha.voa > 0) j.migalha.voa += dt;
  // a sujeira no muco sobe (vai para a esquerda, rumo à garganta); com os cílios a todo vapor, depressa
  j.sujeira.forEach((p) => { p.x = (p.x - dt * (j.cilios > 0 ? 70 : 10) + LARG_ARTE) % LARG_ARTE; });
  j.ventos = j.ventos.filter((v) => v.vida > 0);
  if (h.susto > 0) h.susto -= dt;
  if (h.feliz > 0) h.feliz -= dt;
  if (j.vibra > 0) j.vibra -= dt;
  j.poeiras.forEach((p) => { if (p.presa && p.presa.t < 1) p.presa.t = Math.min(1, p.presa.t + dt * 1.6); });
  j.yG += (j.yGAlvo - j.yG) * Math.min(1, dt * 3);
  j.epi += ((j.cena === 'garganta' ? 1 : 0) - j.epi) * Math.min(1, dt * 4);
  j.part = j.part.filter((p) => (p.vida -= dt) > 0);
  j.part.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; });
  const alvoCam = Math.max(0, Math.min(FIM[j.cena] - tela.W, h.x - tela.W * 0.35));
  j.cam += (alvoCam - j.cam) * Math.min(1, dt * 5);
}

// ============ desenho ============
// Regras de arte (skill arte-pixel-cenarios), como na Missão Digestão: o quadro é desenhado num canvas pequeno
// (1 pixel = 2 unidades do mundo) e ampliado sem suavizar; o cenário de cada tela é pintado uma vez, pixel a pixel, com
// rampas (sombra para o roxo, luz para o amarelo), dithering Bayer só nos degradês e contorno de 1 pixel. As paredes de
// dentro do nariz e da garganta brilham de muco (1 pixel claro na borda do vazio). O ar de fora é azul-claro; dentro,
// rosado; na laringe, um azul-escuro frio.
const LARG_ARTE = 480, ALT_ARTE = ALT / 2;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const RAMPA = {
  ar: ['#a9d8ef', '#c4e6f6', '#def2fb', '#eef9fd'],
  pele: ['#9a5f45', '#c98a62', '#eab389', '#f8d6b0'],
  labio: ['#8e2f4a', '#bb4b62', '#df6f80', '#f49aa5'],
  tecido: ['#8c4f5c', '#b0737a', '#d0968f', '#e9b8a8'],
  osso: ['#8f7a5c', '#bba57e', '#dfcca4', '#f6ebd0'],
  mucosa: ['#7c2a46', '#a9445f', '#d0647c', '#ee90a5', '#ffc4cf'],
  lingua: ['#7e2846', '#ad425f', '#d45f7b', '#f0849b', '#ffb3c2'],
  paredeN: ['#4a1426', '#6e2238', '#94344d', '#b84d66', '#d06d84', '#e391a4'],
  luzN: ['#2a0d18', '#40142a', '#5c1f3a', '#7c2f4d', '#a24766', '#c8708a'],
  luzL: ['#0d0a18', '#1c1630', '#2e2648', '#453a63'],
  boca: ['#22070f', '#36091a', '#4c1126', '#641a33'],
  seio: ['#3a1220', '#5a1d33', '#7d2c48', '#9e4561'],
  cartilagem: ['#8f8499', '#c3b9cc', '#ece6f0'],
  cabelo: ['#3e2723', '#5d4037', '#795548'],
  luzT: ['#3a0f22', '#55172f', '#702440', '#8d3554'],
  peito: ['#140b17', '#1f1224', '#2c1a33', '#3a2342'],
  pulmao: ['#7e2f48', '#a8476a', '#cf6d8c', '#e996ae', '#f8c3d2'],
  bronquio: ['#7a2c3a', '#b5525e', '#e08a8a', '#f6c1b9'],
  alveolo: ['#b83b5e', '#e0708f', '#ffb0c3'],
  coracao: ['#4d0c18', '#7a1424', '#a8243a', '#d14858'],
  fibra: ['#7a1f2e', '#a8323f', '#c94a55', '#de6e72'],
  membrana: ['#c48a3a', '#e6b366', '#ffe0a3'],
  citoplasma: ['#e8b49a', '#f5cdb6', '#fde4d4', '#fff3ea'],
  nucleo: ['#4a148c', '#6a1b9a', '#8e24aa', '#ba68c8'],
  mito: ['#bf360c', '#e65100', '#fb8c00', '#ffb74d'],
  alveoloB: ['#b0405f', '#d2627f', '#ec8ea6', '#fbbfce', '#fff0f4'],
  tecidoP: ['#b9607a', '#d07d95', '#e49cb0', '#f2bccb'],
  arA: ['#f6d4dd', '#fbe5eb', '#fff3f6', '#fffafc'],
  sangueAzul: ['#283593', '#3949ab', '#5c6bc0', '#7986cb'],
  sangueVerm: ['#8e0000', '#c62828', '#e53935', '#ef5350'],
  esofago: ['#4a0f22', '#6e1b36', '#94304c', '#b84b65'],
};
const VAZIO = new Set(['ar', 'luzN', 'luzL', 'boca', 'seio', 'luzT', 'peito', 'tecidoP', 'arA', 'fibra']);
function tom(rampa, t, x, y) {
  const n = rampa.length - 1, v = Math.max(0, Math.min(1, t)) * n, i = Math.floor(v);
  return rampa[Math.min(n, i + (v - i > BAYER[(y & 3) * 4 + (x & 3)] ? 1 : 0))];
}
function ruido(x, y) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
const linear = (pts, y) => {
  for (let k = 1; k < pts.length; k++) if (y <= pts[k][0]) { const [y0, x0] = pts[k - 1], [y1, x1] = pts[k]; return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0 || 1); }
  return pts[pts.length - 1][1];
};

// ---------- tela 1: o nariz (em pixels) ----------
// Como no corte de lado dos livros: o rosto de perfil (testa, nariz e o lábio de cima) com o ar na frente; a narina; o
// vestíbulo (a entradinha forrada de pele, com os pelinhos); a fossa nasal, onde se vê a parede rosada do lado com as
// três conchas (prateleiras de carne enroladas, inclinadas para trás, cada uma com a sombra do meato embaixo); os
// seios da face (ocos de ar com borda de osso) em cima; o céu da boca embaixo e a descida para a garganta no fundo.
// Tudo é medido a partir de OX: a cena começa mais para a direita, para o rosto aparecer inteiro.
const OX = 40;
const PERFIL_NARIZ = [[0, 26], [12, 25], [22, 22], [32, 17], [42, 12], [50, 8], [56, 5], [60, 2], [64, 0], [68, -2], [72, -1], [75, 2], [77, 6], [78, 11]];   // a ponta do nariz é redondinha e sai um pouco
const PERFIL_LABIO = [[88, 16], [92, 12], [97, 10], [100, 11], [104, 13], [110, 14]];
const tetoNariz = (u) => (u < 54 ? 66 - (u - 20) * 1.5 : u < 230 ? 15 + (u - 54) * 0.11 : 34 + (u - 230) * 1.1);
// as conchas: [começo, fim, altura na frente, altura no fundo, espessura na frente, no fundo]
const CONCHAS = [[118, 214, 27, 34, 4, 2.5], [92, 224, 40, 48, 6, 3.5], [66, 230, 55, 64, 8, 4.5]];
const SEIOS = [[46, 9, 11, 6], [206, 9, 13, 6]];   // frontal (em cima do nariz) e esfenoidal (atrás): [x, y, raio x, raio y]
function naConcha(u, y) {
  for (const [a, b, y0, y1, e0, e1] of CONCHAS) {
    if (u < a || u > b) continue;
    const k = (u - a) / (b - a), yc = y0 + (y1 - y0) * k, esp = (e0 + (e1 - e0) * k) * Math.min(1, Math.sqrt((u - a + 0.5) / 7));
    if (y >= yc - esp * 0.7 && y <= yc + esp) return true;   // a borda de baixo enrola (mais cheia)
  }
  return false;
}
function classeNariz(x, y) {
  const u = x - OX;
  if (y <= 78) {
    const p = linear(PERFIL_NARIZ, y);
    if (u < p) return 'ar';
    if (u < p + 3) return 'pele';
    // por dentro do nariz, como no corte dos livros: o osso do nariz em cima e a cartilagem descendo até a ponta
    if (y >= 12 && y < 30 && u < p + 9) return 'osso';
    if (y >= 30 && y < 68 && u < p + 8) return 'cartilagem';
  }
  // a asa do nariz: a dobra de pele arredondada em volta da narina
  const asa = ((u - 15) / 10) ** 2 + ((y - 76) / 7) ** 2;
  if (asa <= 1 && asa >= 0.42 && y < 82) return 'asa';
  if (y > 78 && y < 88) {
    if (u < 16) return 'ar';   // a narina: por onde o ar entra
  } else if (y >= 88) {
    const p = linear(PERFIL_LABIO, y), labio = y >= 92 && y <= 102;
    if (u < p) return 'ar';
    if (u < p + (labio ? 5 : 2)) return labio ? 'labio' : 'pele';
  }
  for (const [cx, cy, rx, ry] of SEIOS) {
    const d = ((u - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d <= 1) return 'seio';
    if (d <= 1.45) return 'osso';
  }
  const teto = tetoNariz(u);
  if (u >= 16 && u < 262 && y > teto && y < 88) {
    if (naConcha(u, y)) return 'concha';
    if (u < 42) {
      // os pelinhos do vestíbulo (a entradinha): risquinhos curvos do chão e do teto, inclinados para dentro
      const dc = 87 - y, xc = u - Math.floor(dc / 2);
      if (dc >= 0 && dc <= 3 + (((xc % 2) + 2) % 2) * 2 && ((xc % 3) + 3) % 3 === 0) return 'pelo';
      const dt = Math.floor(y - teto) - 1, xt = u - Math.floor(dt / 2);
      if (u < 30 && teto > 56 && dt >= 0 && dt <= 3 && ((xt % 3) + 3) % 3 === 1) return 'pelo';
    }
    return 'luzN';
  }
  if (u >= 238 && u < 262 && y >= 88) return 'luzN';   // descendo para a garganta
  if (u >= 262 && u < 266) return 'mucosa';
  if (u >= 272 && u < 296) return y % 14 < 11 ? 'osso' : 'disco';
  if (y >= teto - 3 && y <= teto && u >= 20 && u < 238) return 'osso';
  if (y >= 88 && y < 95 && u >= 24 && u < 238) return y < 90 ? 'mucosa' : 'osso';   // o céu da boca (palato duro)
  if (y >= 95 && u >= 26 && u < 238) return 'lingua';   // a boca fechada: a língua encostada no céu da boca
  return 'tecido';
}

// ---------- tela 2: a garganta (em pixels) ----------
// Um corte do pescoço, de lado. Em cima, a passagem do fundo do nariz (nasofaringe) sobre o céu da boca mole e a
// úvula; à esquerda, a língua, o queixo e a frente do pescoço com o "pomo de adão" (a cartilagem da laringe) e o ar
// de fora; no meio, a faringe descendo e, embaixo, a laringe (na frente, com os anéis de cartilagem) e o esôfago
// (atrás, fechado); à direita, a parede do fundo, a coluna, os músculos da nuca, a pele e o ar de fora.
// Tudo é medido a partir de OXG (a garganta fica no meio da tela).
const OXG = 60;
const linguaG = (u) => 52 + (Math.max(0, u) / 84) ** 2 * 20;
const frenteDoPescoco = (y) => (y < 70 ? -999 : y < 78 ? -40 + (y - 70) * 1.2 : y < 90 ? -30 + Math.sin(((y - 78) / 12) * Math.PI) * 5 : -30);
function classeGarganta(x, y) {
  const u = x - OXG;
  // o ar de fora, na frente do pescoço (embaixo do queixo) e atrás da nuca
  const frente = frenteDoPescoco(y);
  if (u < frente) return 'ar';
  if (u < frente + 2) return 'pele';
  if (u >= 214) return 'ar';
  if (u >= 212) return 'pele';
  if (u >= 168) return y < 14 ? 'cabelo' : 'musculo';   // os músculos da nuca (e o cabelo, em cima)
  if (u >= 126 && u < 132) return 'mucosa';
  if (u >= 138 && u < 162) return y % 14 < 11 ? 'osso' : 'disco';
  if (u >= 132) return 'tecido';
  if (y < 8) return 'tecido';
  if (y < 30 && u < 126) return 'luzN';
  if (u >= 88 && y < 72) return 'luzN';
  if (y < 38 && u < 88) return 'mucosa';
  if (u >= 59 && u <= 65 && y < 50 - Math.abs(u - 62)) return 'mucosa';
  if (((u - 78) / 8) ** 2 + ((y - 86) / 11) ** 2 <= 1) return 'cartilagem';   // o "pomo de adão"
  if (u < 86 && y < linguaG(u)) return 'boca';
  if (u < 86) return y < linguaG(u) + 30 ? 'lingua' : 'tecido';
  if (u >= 86 && u < 108) return u < 88 || u >= 106 ? ((y - 72) % 5 < 3 ? 'cartilagem' : 'tecido') : 'luzL';
  if (u >= 112 && u < 126) return 'esofago';
  return 'tecido';
}

// ---------- tela 3: a traqueia (em pixels) ----------
// vista por dentro, como um túnel: em cima e embaixo, a parede com os anéis de cartilagem (faixas claras, separadas por
// tecido) e a mucosa; no meio, o vazio do tubo. Os cílios e o muco são desenhados no quadro (eles se mexem).
const anelTraqueia = (x) => ((x % 16) + 16) % 16 < 11;
const centroDoAnel = (x) => Math.floor(x / 16) * 16 + 8;
function classeTraqueia(x, y) {
  // cada anel, cortado, aparece na parede como um ovalzinho de cartilagem
  const dx = x - centroDoAnel(x);
  if (y < 17) return y >= 6 && (dx / 5.5) ** 2 + ((y - 11) / 4.5) ** 2 <= 1 ? 'cartilagem' : 'tecido';
  if (y < 20) return 'mucosa';
  if (y < 90) return 'luzT';
  if (y < 93) return 'mucosa';
  return y < 104 && (dx / 5.5) ** 2 + ((y - 98) / 4.5) ** 2 <= 1 ? 'cartilagem' : 'tecido';
}

// ---------- tela 4: os brônquios, de frente (em pixels) ----------
// Como nas referências: o peito por dentro (escuro, com as costelas atrás), os dois pulmões rosados (o direito do
// menino fica à esquerda da tela; o esquerdo, à direita, com o cantinho do coração), a traqueia com anéis descendo no
// meio e a árvore dos brônquios: galhos cada vez mais finos, com cachinhos de alvéolos nas pontas. O diafragma sobe e
// desce no quadro. A árvore é desenhada uma vez numa máscara; o caminho do ar é um dos galhos do pulmão esquerdo.
const PULMOES = [[84, 58, 58, 48, -1], [216, 58, 56, 48, 1]];
const naCaixa = (x, y) => y < 102;
function noPulmao(x, y) {
  for (const [cx, cy, rx, ry, lado] of PULMOES) {
    if (lado < 0 ? x > 140 : x < 160) continue;
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1 || !naCaixa(x, y)) continue;
    if (lado > 0 && (x - 172) ** 2 + (y - 86) ** 2 <= 22 * 22) continue;   // o cantinho do coração
    return true;
  }
  return false;
}
const noCoracao = (x, y) => { const u = (x - 154) / 15, v = -(y - 80) / 15; return (u * u + v * v - 1) ** 3 - u * u * v * v * v <= 0; };
// o caminho do ar pelos brônquios (pixels): começa na traqueia, desce pelo brônquio esquerdo e vai pelos galhos
const CAMINHO_B = (() => {
  const pts = [[146, 6], [150, 30]];
  let [x, y] = [150, 30], ang = Math.PI * 0.2, len = 44;
  [0, 0.4, -0.45, 0.4, -0.45].forEach((d, k) => { if (k) { ang += d; len *= 0.72; } x += Math.cos(ang) * len; y += Math.sin(ang) * len; pts.push([x, y]); });
  return pts;
})();
PARA.galhos = Math.round((CAMINHO_B[3][0] + CAMINHO_B[4][0])) ;
function linearX(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let k = 1; k < pts.length; k++) if (x <= pts[k][0]) { const [x0, y0] = pts[k - 1], [x1, y1] = pts[k]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1); }
  return pts[pts.length - 1][1];
}
let mapaBronquios = null;
function prepararBronquios() {
  if (mapaBronquios) return;
  const W = LARG_ARTE, H = ALT_ARTE, m = new Uint8Array(W * H);   // 1 = galho, 2 = alvéolo
  const pinta = (x, y, v) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H && (v === 1 || !m[y * W + x])) m[y * W + x] = v; };
  const ramo = (x1, y1, x2, y2, w1, w2) => {
    const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t, r = (w1 + (w2 - w1) * t) / 2;
      for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) if (dx * dx + dy * dy <= r * r + 0.3) pinta(x + dx, y + dy, 1);
    }
  };
  const cacho = (x, y) => [[0, 0], [-3, 1], [3, 1], [0, 3], [-2, -2], [2, -2]].forEach(([dx, dy]) => { for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (a * a + b * b <= 3) pinta(x + dx + a, y + dy + b, 2); });
  const arvore = (x, y, ang, len, w, prof) => {
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    if (prof < 4 && !noPulmao(x2, y2)) { cacho(x, y); return; }
    ramo(x, y, x2, y2, w, w * 0.72);
    if (prof === 0) { cacho(x2, y2); return; }
    arvore(x2, y2, ang - 0.45, len * 0.72, w * 0.72, prof - 1);
    arvore(x2, y2, ang + 0.4, len * 0.72, w * 0.72, prof - 1);
  };
  ramo(146, 0, 150, 30, 12, 12);
  arvore(150, 30, Math.PI * 0.8, 44, 8, 5);
  arvore(150, 30, Math.PI * 0.2, 44, 8, 5);
  mapaBronquios = m;
}
function classeBronquios(x, y) {
  if (x < 0 || y < 0 || x >= LARG_ARTE || y >= ALT_ARTE) return 'peito';
  const v = mapaBronquios[y * LARG_ARTE + x];
  if (v === 1) return y < 30 && x > 138 && x < 160 ? 'traqueiaF' : 'bronquio';
  if (noCoracao(x, y)) return 'coracao';
  if (v === 2) return 'alveolo';
  if (noPulmao(x, y)) return 'pulmao';
  if (y >= 102) return 'musculo';
  // as costelas, atrás (arcos claros)
  for (let k = 0; k < 6; k++) { const yc = 14 + k * 16 + ((x - 150) / 150) ** 2 * 18; if (Math.abs(y - yc) < 2.2) return 'costela'; }
  return 'peito';
}

// ---------- tela 5: o cacho de alvéolos (em pixels) ----------
// zoom na ponta do galho: o bronquíolo chega da esquerda e termina num cacho de saquinhos de ar (os alvéolos), coberto
// por uma rede de vasinhos (azuis antes da troca, vermelhos depois, como nos livros); outro cachinho menor embaixo; o
// fundo é o tecido esponjoso do pulmão. O diafragma e o macrófago (a célula de defesa) são desenhados no quadro.
const CAMINHO_A = [[0, 22], [60, 36], [112, 50], [150, 58], [178, 64]];
const CACHO = [[196, 62, 11], [184, 52, 9], [208, 50, 9], [214, 66, 10], [200, 78, 10], [184, 74, 9], [176, 62, 8], [222, 56, 8], [192, 42, 8], [226, 74, 8], [210, 87, 8], [190, 88, 8],
  [70, 84, 7], [62, 78, 6], [79, 78, 6], [66, 91, 6], [78, 91, 6]];
function pertoDoCaminho(pts, x, y) {
  for (let k = 1; k < pts.length; k++) {
    const [x1, y1] = pts[k - 1], [x2, y2] = pts[k], dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
    const r = 6 - ((x1 + dx * t) / 60);
    if ((x - x1 - dx * t) ** 2 + (y - y1 - dy * t) ** 2 <= r * r) return true;
  }
  return false;
}
function classeAlveolos(x, y) {
  if (y >= 104) return 'musculo';
  // o alvéolo da frente (o último da lista que cobre o pixel) e, por cima dele, poucos vasinhos finos e ondulados
  let bolha = null;
  for (const c of CACHO) if ((x - c[0]) ** 2 + (y - c[1]) ** 2 <= c[2] * c[2]) bolha = c;
  if (bolha) {
    const [cx, cy] = bolha, u = x - cx, v = y - cy;
    if (Math.abs(Math.sin(u * 0.45 + Math.sin(v * 0.4) * 1.6)) < 0.1 || Math.abs(Math.sin(v * 0.5 + Math.sin(u * 0.35))) < 0.07) return x < 198 ? 'capilarA' : 'capilarV';
    return 'alveolo';
  }
  if (pertoDoCaminho(CAMINHO_A, x, y) || pertoDoCaminho([[60, 36], [70, 76]], x, y)) return 'bronquio';
  return 'tecidoP';
}

// ---------- tela 6: dentro de um alvéolo (em pixels) ----------
// como na referência: a bolha de ar do alvéolo (clara), com a parede curva e fininha, colada embaixo no capilar (o
// vasinho de sangue, azul de um lado e vermelho do outro); outros alvéolos aparecem nos cantos. As hemácias, o gás
// carbônico e as setas de O₂ e CO₂ são desenhados no quadro.
const BOLHA = [150, 50, 44];   // encosta no capilar embaixo
const fundoDoAlveolo = (x) => BOLHA[1] + Math.sqrt(Math.max(0, BOLHA[2] ** 2 - (x - BOLHA[0]) ** 2)) - 4;
function classeTroca(x, y) {
  if (y >= 92 && y < 108) return y < 94 || y >= 106 ? 'capilarParede' : 'sangueT';
  for (const [cx, cy, r] of [BOLHA, [26, 34, 30], [276, 34, 30]]) {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= r) return 'arA';
    if (d <= r + 3) return 'paredeA';
  }
  return 'tecidoP';
}

// ---------- tela 7: o coração, de frente (em pixels) ----------
// o peito por dentro, com a beirada dos pulmões dos lados; a veia que traz o sangue vermelho (com oxigênio) dos
// pulmões, a artéria grande (aorta) que sai por cima e desce levando o sangue para o corpo, e as veias azuis que trazem
// o sangue de volta. O coração é desenhado no quadro (ele bate).
const CAMINHO_H = [[0, 62], [124, 62], [146, 58], [162, 32], [170, 14], [198, 9], [220, 20], [232, 48], [240, 90], [244, 108]];
const tuboEm = (pts, x, y, r) => {
  for (let k = 1; k < pts.length; k++) {
    const [x1, y1] = pts[k - 1], [x2, y2] = pts[k], dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
    if ((x - x1 - dx * t) ** 2 + (y - y1 - dy * t) ** 2 <= r * r) return true;
  }
  return false;
};
function classeCoracao(x, y) {
  if (((x + 20) / 60) ** 2 + ((y - 56) / 50) ** 2 <= 1 || ((x - 320) / 60) ** 2 + ((y - 56) / 50) ** 2 <= 1) return 'pulmao';
  if (tuboEm([[0, 62], [124, 62], [146, 58]], x, y, 5) || tuboEm(CAMINHO_H.slice(2), x, y, 6)) return 'vasoV';
  if (tuboEm([[128, 0], [132, 44]], x, y, 6) || tuboEm([[130, 110], [134, 80]], x, y, 6) || tuboEm([[146, 42], [112, 22], [56, 30]], x, y, 5)) return 'vasoA';
  return 'peito';
}

// ---------- tela 8: uma célula do músculo da perna (em pixels) ----------
// a célula grande (a membrana, o citoplasma, o núcleo e as mitocôndrias, as "usinas de energia") no meio das fibras
// do músculo; embaixo, o capilar: vermelho quando chega (com oxigênio) e azul quando sai (com gás carbônico).
const CELULA = [160, 46, 86, 34];
const MITOS = [[192, 40, 14, 7], [170, 62, 11, 6], [226, 58, 10, 5]];
const CAMINHO_C = [[0, 98], [125, 98], [160, 70], [192, 46], [230, 72], [262, 98], [330, 98]];
function classeCelula(x, y) {
  if (y >= 88 && y < 105) return y < 90 || y >= 103 ? 'capilarParede' : 'sangueC';
  const [cx, cy, rx, ry] = CELULA, d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
  if (d > 1) return 'fibra';
  if (d > 0.9) return 'membrana';
  if (((x - 112) / 18) ** 2 + ((y - 44) / 13) ** 2 <= 1) return ((x - 116) / 5) ** 2 + ((y - 41) / 4) ** 2 <= 1 ? 'nucleolo' : 'nucleo';
  for (const [mx, my, mrx, mry] of MITOS) {
    const dm = ((x - mx) / mrx) ** 2 + ((y - my) / mry) ** 2;
    if (dm <= 1) return dm > 0.7 ? 'mitoBorda' : Math.abs(Math.sin((x - mx) * 0.9)) < 0.3 ? 'mitoCrista' : 'mito';
  }
  return 'citoplasma';
}

function corDoPixel(cena, classe, x, y) {
  const k = classe(x, y), nariz = cena === 'nariz';
  if (k === 'ar') return tom(RAMPA.ar, 0.95 - y / 130, x, y);
  const solidoEm = (dx, dy) => !VAZIO.has(classe(x + dx, y + dy));
  if (k === 'luzN') {
    // muco: a borda das paredes brilha (1 pixel claro e úmido)
    if (solidoEm(0, -1) || solidoEm(0, 1) || solidoEm(1, 0) || solidoEm(-1, 0)) return ruido(x, y) < 0.5 ? '#f6c1cf' : '#e79cb1';
    if (nariz) {
      // no nariz se vê a parede rosada do lado; embaixo de cada concha, a sombra do meato
      const u = x - OX;
      let t = 0.74 - u / 420 + 0.04 * Math.sin(u * 0.15 + 2 * Math.sin(y * 0.07));
      for (let d = 1; d <= 4; d++) if (classe(x, y - d) === 'concha') { t -= 0.5 - d * 0.08; break; }
      if (u > 50 && u < 232 && (Math.abs(y - (75 + 3 * Math.sin(u * 0.07))) < 0.7 || Math.abs(y - (35 + 2 * Math.sin(u * 0.09 + 1))) < 0.6)) return '#b8364f';   // vasinhos
      if (u < 46) t += (46 - u) / 70;   // a luz entrando pela narina
      if (u > 236) t -= (u - 236) / 40;  // o fundo, escurecendo para a garganta
      return tom(RAMPA.paredeN, t, x, y);
    }
    const t = 0.42 - x / 500 + 0.05 * Math.sin(x * 0.12 + 2 * Math.sin(y * 0.05));
    return tom(RAMPA.luzN, t, x, y);
  }
  if (k === 'luzL') return tom(RAMPA.luzL, 0.75 - (y - 72) / 40, x, y);
  if (k === 'luzT') {
    // no fundo do tubo, os anéis da parede de trás aparecem como arcos curvos (dá a sensação de túnel)
    const arco = Math.abs(x - centroDoAnel(x) + ((y - 55) / 35) ** 2 * 6) < 1.3;
    return tom(RAMPA.luzT, 0.62 - Math.abs(y - 55) / 70 + (arco ? 0.28 : 0), x, y);
  }
  if (k === 'tecidoP') return tom(RAMPA.tecidoP, 0.5 + (ruido(x, y) < 0.18 ? -0.3 : ruido(x, y) > 0.92 ? 0.3 : 0) - y / 500, x, y);   // o tecido esponjoso do pulmão
  if (k === 'fibra') return tom(RAMPA.fibra, Math.floor(x / 3) % 3 === 0 ? 0.25 : 0.6 + (Math.floor(y / 9) % 2 ? 0.15 : 0), x, y);   // as fibras do músculo, listradas
  if (k === 'arA') return tom(RAMPA.arA, 0.95 - Math.max(0, y - 20) / 140, x, y);   // o ar dentro do alvéolo: claro, luminoso
  if (k === 'peito') return tom(RAMPA.peito, 0.5 - Math.abs(x - 150) / 400 - y / 400, x, y);
  if (k === 'boca') return tom(RAMPA.boca, 0.3, x, y);
  if (k === 'seio') return tom(RAMPA.seio, 0.75 - (y - 3) / 14, x, y);
  const vazioEm = (dx, dy) => VAZIO.has(classe(x + dx, y + dy));
  const luzCima = vazioEm(0, -1), contorno = luzCima || vazioEm(1, 0) || vazioEm(-1, 0) || vazioEm(0, 1);
  const r = ruido(x, y);
  switch (k) {
    case 'pele': return tom(RAMPA.pele, vazioEm(-1, 0) || luzCima ? 1 : vazioEm(1, 0) || vazioEm(0, 1) ? 0.333 : 0.667, x, y);
    case 'asa': return tom(RAMPA.pele, classe(x, y - 1) !== 'asa' ? 0.85 : 0.333, x, y);
    case 'labio': return tom(RAMPA.labio, luzCima || vazioEm(-1, 0) ? 1 : contorno ? 0 : y === 96 ? 1 : 0.667, x, y);
    case 'osso': {
      const cortical = classe(x, y - 1) !== 'osso' || classe(x, y + 1) !== 'osso';
      return tom(RAMPA.osso, cortical ? (classe(x, y - 1) !== 'osso' ? 1 : 0.333) : r < 0.06 ? 0.333 : 0.667, x, y);
    }
    case 'disco': return tom(RAMPA.tecido, 1, x, y);
    case 'mucosa': return tom(RAMPA.mucosa, luzCima ? 0.75 : contorno ? 0 : r < 0.03 ? 1 : 0.5, x, y);
    // as conchas: luz em cima, sombra embaixo e uns vasinhos (é por isso que o nariz aquece o ar)
    case 'concha': return tom(RAMPA.mucosa, luzCima ? 1 : contorno ? 0 : vazioEm(0, -2) ? 0.85 : (x * 3 + y * 5) % 23 === 0 ? 0.4 : 0.62, x, y);
    case 'pelo': return '#4e342e';
    case 'lingua': return tom(RAMPA.lingua, luzCima ? 1 : y % 4 === 0 ? 0.45 : 0.6, x, y);
    case 'cartilagem': return tom(RAMPA.cartilagem, classe(x, y - 1) !== 'cartilagem' ? 1 : classe(x, y + 1) !== 'cartilagem' ? 0.15 : 0.6, x, y);
    case 'esofago': return tom(RAMPA.esofago, 0.35 + 0.3 * Math.sin(x * 1.4), x, y);
    case 'musculo': return tom(RAMPA.tecido, Math.floor((x + y * 0.5) / 2) % 3 === 0 ? 0.333 : 0.55, x, y);
    case 'cabelo': return tom(RAMPA.cabelo, 0.3 + (y % 3 === 0 ? 0.4 : 0), x, y);
    // os pulmões: esponjosos (pontinhos), com luz em cima e mais escuros embaixo e nas bordas
    case 'pulmao': return tom(RAMPA.pulmao, contorno ? 0 : luzCima ? 1 : 0.85 - y / 160 - (r < 0.12 ? 0.25 : 0) + (r > 0.94 ? 0.2 : 0), x, y);
    // os galhos dos brônquios: coral, com os anéis (faixas mais escuras atravessando)
    case 'bronquio': return tom(RAMPA.bronquio, classe(x, y - 1) !== 'bronquio' ? 1 : classe(x, y + 1) !== 'bronquio' ? 0.15 : Math.floor((x + y) / 2) % 3 === 0 ? 0.4 : 0.7, x, y);
    case 'traqueiaF': return tom(RAMPA.bronquio, y % 5 < 2 ? 0.95 : (x < 143 || x > 155 ? 0.3 : 0.6), x, y);
    case 'alveolo': {
      if (cena !== 'alveolos') return tom(RAMPA.alveolo, classe(x, y - 1) !== 'alveolo' ? 1 : r < 0.3 ? 0.4 : 0.7, x, y);
      // cada alvéolo é uma bolinha: luz em cima à esquerda, sombra embaixo à direita, contorno na borda
      let c = null;
      for (const b of CACHO) if ((x - b[0]) ** 2 + (y - b[1]) ** 2 <= b[2] * b[2]) c = b;
      const [cx, cy, rr] = c, d = Math.hypot(x - cx, y - cy);
      if (d > rr - 1) return RAMPA.alveolo[0];
      const luz = 1 - Math.hypot(x - (cx - rr * 0.35), y - (cy - rr * 0.4)) / (rr * 1.5);
      return tom(RAMPA.alveoloB, luz, x, y);
    }
    case 'coracao': return tom(RAMPA.coracao, classe(x, y - 1) !== 'coracao' ? 1 : 0.9 - (y - 66) / 30, x, y);
    case 'costela': return tom(RAMPA.osso, 0.35, x, y);
    case 'capilarA': return '#5c6bc0';
    case 'vasoV': return tom(RAMPA.sangueVerm, contorno ? 0 : luzCima ? 1 : 0.6, x, y);
    case 'vasoA': return tom(RAMPA.sangueAzul, contorno ? 0 : luzCima ? 1 : 0.6, x, y);
    case 'sangueC': { const k2 = Math.max(0, Math.min(1, (x - 140) / 70)); return tom(k2 < 0.5 ? RAMPA.sangueVerm : RAMPA.sangueAzul, 0.4 + (y < 93 ? 0.3 : 0) + ((x + y) % 7 === 0 ? 0.2 : 0), x, y); }
    case 'membrana': return tom(RAMPA.membrana, classe(x, y - 1) === 'fibra' ? 1 : 0.5, x, y);
    case 'citoplasma': return tom(RAMPA.citoplasma, 0.75 - y / 300 + (r < 0.05 ? -0.3 : 0), x, y);
    case 'nucleo': return tom(RAMPA.nucleo, classe(x, y - 1) !== 'nucleo' ? 1 : 0.55, x, y);
    case 'nucleolo': return RAMPA.nucleo[0];
    case 'mito': return tom(RAMPA.mito, 0.7, x, y);
    case 'mitoCrista': return tom(RAMPA.mito, 0.3, x, y);
    case 'mitoBorda': return tom(RAMPA.mito, classe(x, y - 1) === 'citoplasma' ? 1 : 0.15, x, y);
    case 'capilarV': return '#e53935';
    case 'paredeA': return tom(RAMPA.alveolo, classe(x, y - 1) === 'arA' || classe(x, y + 1) === 'arA' ? 1 : 0.55, x, y);
    case 'capilarParede': return tom(RAMPA.mucosa, y === 92 || y === 107 ? 0 : 0.6, x, y);
    // o sangue no capilar: azul antes da troca (à esquerda), vermelho depois (à direita), como nos livros
    case 'sangueT': { const k2 = Math.max(0, Math.min(1, (x - 120) / 70)); return tom(k2 < 0.5 ? RAMPA.sangueAzul : RAMPA.sangueVerm, 0.4 + (y < 97 ? 0.3 : 0) + ((x + y) % 7 === 0 ? 0.2 : 0), x, y); }
    default: return tom(RAMPA.tecido, contorno ? (luzCima ? 1 : 0) : r < 0.04 ? 0.333 : 0.667, x, y);
  }
}

const camadasProntas = {};
function camadas(cena) {
  if (camadasProntas[cena]) return camadasProntas[cena];
  if (cena === 'bronquios') prepararBronquios();
  if (cena === 'expira') prepararBronquios();
  const classe = { nariz: classeNariz, garganta: classeGarganta, traqueia: classeTraqueia, bronquios: classeBronquios, alveolos: classeAlveolos, troca: classeTroca,
    coracao: classeCoracao, celula: classeCelula, expira: classeBronquios }[cena];
  const fazer = () => { const cv = document.createElement('canvas'); cv.width = LARG_ARTE; cv.height = ALT_ARTE; return cv; };
  const fundo = fazer(), frente = fazer();
  const imgF = fundo.getContext('2d').createImageData(LARG_ARTE, ALT_ARTE), imgS = frente.getContext('2d').createImageData(LARG_ARTE, ALT_ARTE);
  const rgb = {};
  for (let y = 0; y < ALT_ARTE; y++) {
    for (let x = 0; x < LARG_ARTE; x++) {
      const c = corDoPixel(cena, classe, x, y);
      const n = rgb[c] || (rgb[c] = parseInt(c.slice(1), 16));
      (VAZIO.has(classe(x, y)) ? imgF : imgS).data.set([n >> 16, (n >> 8) & 255, n & 255, 255], (y * LARG_ARTE + x) * 4);
    }
  }
  fundo.getContext('2d').putImageData(imgF, 0, 0);
  frente.getContext('2d').putImageData(imgS, 0, 0);
  return (camadasProntas[cena] = { fundo, frente });
}

let quadroPx = null;
function desenhar(tela) {
  const { g, dpr, s, W } = tela, j = jogo;
  const lw = Math.ceil(W / 2) + 1;
  if (!quadroPx) quadroPx = document.createElement('canvas');
  if (quadroPx.width !== lw || quadroPx.height !== ALT_ARTE) { quadroPx.width = lw; quadroPx.height = ALT_ARTE; }
  const b = quadroPx.getContext('2d');
  const camPx = Math.round(j.cam / 2) + (j.tosse > 0 ? Math.round(Math.sin(j.t * 45) * 1.5) : 0), arte = camadas(j.cena);   // a tosse sacode a tela
  const pixels = () => b.setTransform(1, 0, 0, 1, 0, 0);
  const mundo = () => b.setTransform(0.5, 0, 0, 0.5, -camPx, 0);
  pixels();
  b.imageSmoothingEnabled = false;
  b.clearRect(0, 0, lw, ALT_ARTE);
  b.drawImage(arte.fundo, -camPx, 0);
  mundo();
  // o vento da respiração (atrás das paredes, só no vazio)
  j.ventos.forEach((v) => { b.globalAlpha = Math.min(0.55, v.vida * 0.6); bloco(b, v.x, v.y, 8, 2, '#e3f6ff'); });
  b.globalAlpha = 1;
  pixels(); b.drawImage(arte.frente, -camPx, 0);
  mundo();
  if (j.cena === 'garganta') { epiglote(b); cordasVocais(b); }
  if (j.cena === 'traqueia') { pixels(); ciliosEMuco(b, camPx, lw); mundo(); migalha(b); }
  if (j.cena === 'bronquios') { pixels(); diafragmaEAlveolo(b, camPx, lw); mundo(); }
  if (j.cena === 'alveolos') { pixels(); cachoVivo(b, camPx, lw); mundo(); }
  if (j.cena === 'troca') { pixels(); trocaViva(b, camPx, lw); mundo(); }
  if (j.cena === 'coracao') { pixels(); coracaoBatendo(b, camPx); mundo(); }
  if (j.cena === 'celula') { pixels(); celulaViva(b, camPx); mundo(); }
  if (j.cena === 'expira') { pixels(); diafragmaEAlveolo(b, camPx, lw); mundo(); }
  desenharHeroi(b);
  j.part.forEach((p) => {
    if (p.texto) return;
    b.globalAlpha = Math.max(0, Math.min(1, p.vida / (p.max * 0.5)));
    bloco(b, p.x - p.tam / 2, p.y - p.tam / 2, p.tam, p.tam, p.cor);
  });
  b.globalAlpha = 1;
  g.setTransform(dpr * s * 2, 0, 0, dpr * s * 2, 0, 0);
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, lw, ALT_ARTE);
  g.drawImage(quadroPx, 0, 0);
  g.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
  g.save();
  g.translate(-camPx * 2, 0);
  etiquetas(g);
  if (j.cena === 'troca') setasDaTroca(g);
  j.part.forEach((p) => {
    if (!p.texto) return;
    g.globalAlpha = Math.max(0, Math.min(1, p.vida / (p.max * 0.5)));
    g.textAlign = 'center'; g.font = `700 14px ${FONTE}`; g.lineWidth = 3; g.strokeStyle = '#fff'; g.strokeText(p.texto, p.x, p.y); g.fillStyle = p.cor; g.fillText(p.texto, p.x, p.y);
  });
  g.globalAlpha = 1;
  g.restore();
  miniMapa(g, W);
  if (j.transicao) {
    const a = Math.max(0, 1 - Math.abs(j.transicao.t - 0.5) * 2.2);
    g.globalAlpha = Math.min(1, a * 1.3); g.fillStyle = '#1a0610'; g.fillRect(0, 0, W, ALT);
    g.globalAlpha = Math.min(1, a * 1.6); g.fillStyle = '#ffe0ea'; g.font = `700 18px ${FONTE}`; g.textAlign = 'center';
    g.fillText(TITULO_CENA[j.transicao.cena], W / 2, ALT / 2);
    g.globalAlpha = 1;
  }
}

// traqueia: os cílios (pelinhos que balançam em onda) nas duas paredes, o muco com a sujeira subindo e os anéis que
// acendem um a um na resposta certa (em pixels)
function ciliosEMuco(b, camPx, lw) {
  const j = jogo, forte = j.cilios > 0 ? 2.2 : 1;
  if (j.aneisT >= 0) {
    for (let x = 0; x < lw; x++) {
      const wx = x + camPx, k = Math.floor(wx / 16);
      if (!anelTraqueia(wx) || k * 0.06 > j.aneisT || j.aneisT > 3) continue;
      b.globalAlpha = 0.55; b.fillStyle = '#fff59d'; b.fillRect(x, 8, 1, 10); b.fillRect(x, 92, 1, 10); b.globalAlpha = 1;
    }
  }
  b.globalAlpha = 0.5; b.fillStyle = '#e6dcae'; b.fillRect(0, 22, lw, 2); b.fillRect(0, 86, lw, 2); b.globalAlpha = 1;
  for (let x = 0; x < lw; x += 3) {
    const wx = x + camPx, dx = Math.round(Math.sin(j.t * 7 * forte - wx * 0.35) * 1.6 * forte);
    b.fillStyle = '#f8bbd0';
    b.fillRect(x, 20, 1, 1); b.fillRect(x + Math.round(dx / 2), 21, 1, 1); b.fillRect(x + dx, 22, 1, 1);
    b.fillRect(x, 89, 1, 1); b.fillRect(x + Math.round(dx / 2), 88, 1, 1); b.fillRect(x + dx, 87, 1, 1);
  }
  j.sujeira.forEach((p) => {
    const x = Math.round(p.x) - camPx;
    if (x < 0 || x > lw) return;
    b.fillStyle = '#5d4037'; b.fillRect(x, p.cima ? 22 : 86, 2, 2);
  });
}
// a migalha que entrou pelo caminho errado; na tosse, sai voando para trás
function migalha(g) {
  const m = jogo.migalha;
  if (!m) return;
  const x = m.x - m.voa * 420, y = 176 - Math.sin(Math.min(1, m.voa * 2) * Math.PI) * 50;
  if (x < jogo.cam - 40) return;
  bloco(g, x - 6, y - 8, 12, 8, '#5d4037'); bloco(g, x - 4, y - 8, 8, 6, '#d7a86e'); bloco(g, x - 4, y - 8, 4, 2, '#f3d29b');
}
// brônquios: o diafragma subindo e descendo com a respiração e o cachinho de alvéolos que brilha na chegada (em pixels)
function diafragmaEAlveolo(b, camPx, lw) {
  const j = jogo, sobe = Math.round(respiracao() * -2) - (j.expiraT > 0 ? 5 : 0);
  for (let x = 0; x < lw; x++) {
    const wx = x + camPx, y = Math.round(103 + sobe - Math.cos(((wx - 150) / 150) * Math.PI / 2) * 5);
    b.fillStyle = '#5e1626'; b.fillRect(x, y, 1, 1);
    b.fillStyle = '#b23a4c'; b.fillRect(x, y + 1, 1, 3);
  }
  if (j.alveolo > 0 && j.cena === 'bronquios') {
    const [ax, ay] = CAMINHO_B[CAMINHO_B.length - 1];
    b.globalAlpha = Math.min(0.7, j.alveolo * 0.4) * (0.6 + Math.sin(j.t * 10) * 0.4);
    b.fillStyle = '#fff3f6'; b.beginPath(); b.arc(ax - camPx, ay, 8, 0, 7); b.fill(); b.globalAlpha = 1;
  }
}

// alvéolos: os balões enchendo (contornos claros que crescem), o diafragma descendo e o macrófago passeando e comendo
// um restinho de poeira (em pixels)
function cachoVivo(b, camPx, lw) {
  const j = jogo, cresce = (respiracao() + 1) / 2 + (j.enche > 0 ? 1 : 0);
  b.globalAlpha = 0.5; b.strokeStyle = '#fff3f6'; b.lineWidth = 1;
  CACHO.forEach(([cx, cy, r]) => { b.beginPath(); b.arc(cx - camPx + 0.5, cy + 0.5, r + cresce, 0, 7); b.stroke(); });
  b.globalAlpha = 1;
  const desce = Math.round(respiracao() * 2 + (j.enche > 0 ? 3 : 0));
  for (let x = 0; x < lw; x++) { const y = 103 + desce; b.fillStyle = '#5e1626'; b.fillRect(x, y, 1, 1); b.fillStyle = '#b23a4c'; b.fillRect(x, y + 1, 1, 6); }
  // o macrófago: uma bolota roxa com bracinhos que mexem; vai até um grão de poeira e come
  const m = j.macrofago, mx = Math.round(118 + Math.sin(j.t * 0.5) * 18) - camPx, my = 92;
  const px = mx + 22 - m.come * 22, py = my - 2;
  if (m.come < 0.95) { b.fillStyle = '#5d4037'; b.fillRect(Math.round(px), py, 2, 2); }
  b.fillStyle = '#4a148c'; b.beginPath(); b.ellipse(mx + 0.5, my + 0.5, 7, 5, 0, 0, 7); b.fill();
  b.fillStyle = '#8e24aa'; b.beginPath(); b.ellipse(mx + 0.5, my - 0.5, 6, 4, 0, 0, 7); b.fill();
  for (let k = 0; k < 4; k++) { const a = k * 1.6 + j.t * 2; b.fillRect(Math.round(mx + Math.cos(a) * 8), Math.round(my + Math.sin(a) * 6), 2, 2); }
  b.fillStyle = '#e1bee7'; b.fillRect(mx - 3, my - 3, 2, 1);
  b.fillStyle = '#fff'; b.fillRect(mx + 1, my - 2, 2, 2); b.fillStyle = '#2b1d2e'; b.fillRect(mx + 2, my - 2, 1, 2);
}
// dentro do alvéolo: as hemácias correndo no capilar (azuis antes da troca, vermelhas depois), o gás carbônico saindo
// do sangue e a hemácia que dá carona ao oxigênio (em pixels)
function trocaViva(b, camPx, lw) {
  const j = jogo;
  j.hemacias.forEach((c) => {
    const x = Math.round(c.x) - camPx, k = Math.max(0, Math.min(1, (c.x - 120) / 70));
    if (x < -6 || x > lw) return;
    // a hemácia: um disco com a borda escura e o meio afundadinho (mais claro que o sangue, para aparecer)
    b.fillStyle = k < 0.5 ? '#1a237e' : '#5d0000'; b.fillRect(x, 95, 8, 7);
    b.fillStyle = k < 0.5 ? '#9fa8da' : '#ff6e6e'; b.fillRect(x + 1, 96, 6, 5);
    b.fillStyle = k < 0.5 ? '#c5cae9' : '#ffcdd2'; b.fillRect(x + 2, 96, 3, 1);
    b.fillStyle = k < 0.5 ? '#5c6bc0' : '#d32f2f'; b.fillRect(x + 2, 98, 4, 1);
  });
  j.co2.forEach((c) => {
    const subida = Math.max(0, c.sobe), y = Math.round(99 - subida * 22), x = Math.round(c.x + subida * 6) - camPx;
    if (c.sobe > 2.6) return;
    b.globalAlpha = c.sobe > 1.8 ? Math.max(0, 2.6 - c.sobe) : 1;
    b.fillStyle = '#4a3a6b'; b.fillRect(x - 3, y - 2, 6, 5); b.fillStyle = '#9575cd'; b.fillRect(x - 2, y - 1, 4, 3); b.fillStyle = '#d1c4e9'; b.fillRect(x - 2, y - 1, 1, 1);
    b.globalAlpha = 1;
  });
  if (j.carona) {
    const x = Math.round(j.carona.x / 2) - camPx;
    b.fillStyle = '#8e0000'; b.fillRect(x - 6, 95, 13, 8); b.fillStyle = '#e53935'; b.fillRect(x - 5, 96, 11, 6); b.fillStyle = '#ef9a9a'; b.fillRect(x - 3, 97, 7, 1); b.fillStyle = '#b71c1c'; b.fillRect(x - 2, 99, 5, 1);
  }
}
// o coração em forma de coração (como na Missão Digestão), pintado pixel a pixel com volume e um brilho
const coracoesProntos = {};
function spriteCoracao(t) {
  if (coracoesProntos[t]) return coracoesProntos[t];
  const w = Math.ceil(t * 2.6), h = Math.ceil(t * 2.5), cx = w / 2, cy = t * 1.1;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'), img = g.createImageData(w, h);
  const dentro = (x, y) => { const u = (x - cx) / t, v = -(y - cy) / t; return (u * u + v * v - 1) ** 3 - u * u * v * v * v <= 0; };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!dentro(x, y)) continue;
      const borda = !dentro(x - 1, y) || !dentro(x + 1, y) || !dentro(x, y - 1) || !dentro(x, y + 1);
      const brilho = (x - cx + t * 0.55) ** 2 + (y - cy + t * 0.45) ** 2 <= t * 0.12;
      const c = borda ? '#3a0812' : brilho ? '#ffd0d6' : tom(RAMPA.coracao, 1 - (y / h) * 0.8 - Math.max(0, (x - cx) / w) * 0.4, x, y);
      const n = parseInt(c.slice(1), 16);
      img.data.set([n >> 16, (n >> 8) & 255, n & 255, 255], (y * w + x) * 4);
    }
  }
  g.putImageData(img, 0, 0);
  return (coracoesProntos[t] = cv);
}
// o coração grande, batendo (cresce a cada tum-tum; na resposta certa, bate forte)
function coracaoBatendo(b, camPx) {
  const j = jogo, forte = j.bombaT > 0 && Math.sin(j.t * 14) > 0;
  const spr = spriteCoracao(forte ? 34 : (j.batidaC || 0) > 0.12 ? 31 : 29);
  b.drawImage(spr, Math.round(150 - spr.width / 2) - camPx, Math.round(64 - spr.height * 0.45));
}
// a célula: as mitocôndrias brilham na hora da energia; a glicose (amarela, da comida) vem pelo sangue; o gás carbônico
// sai da mitocôndria para o sangue
function celulaViva(b, camPx) {
  const j = jogo;
  if (j.energiaT > 0) {
    b.globalAlpha = Math.min(0.6, j.energiaT * 0.3) * (0.6 + Math.sin(j.t * 12) * 0.4);
    b.fillStyle = '#fff59d'; MITOS.forEach(([mx, my, rx, ry]) => { b.beginPath(); b.ellipse(mx - camPx, my, rx + 3, ry + 3, 0, 0, 7); b.fill(); });
    b.globalAlpha = 1;
  }
  const g0 = [150, 96], g1 = [198, 42], k = j.glicoseT < 0 ? 0 : j.glicoseT, gx = Math.round(g0[0] + (g1[0] - g0[0]) * k) - camPx, gy = Math.round(g0[1] + (g1[1] - g0[1]) * k);
  if (j.glicoseT < 1 || j.energiaT > 1.2) {
    // a glicose: um hexágono amarelo (como nos desenhos de molécula), com brilho
    b.fillStyle = '#8d6e00'; b.fillRect(gx - 4, gy - 3, 8, 6); b.fillRect(gx - 3, gy - 4, 6, 8);
    b.fillStyle = '#ffd54f'; b.fillRect(gx - 3, gy - 2, 6, 4); b.fillRect(gx - 2, gy - 3, 4, 6);
    b.fillStyle = '#fff8e1'; b.fillRect(gx - 2, gy - 2, 1, 1);
  }
  j.co2c.forEach((c) => {
    if (c.t < 0 || c.t > 1.4) return;
    const t = Math.min(1, c.t), x = Math.round(192 + (262 - 192) * t + (c.t > 1 ? (c.t - 1) * 60 : 0)) - camPx, y = Math.round(46 + (98 - 46) * t);
    b.fillStyle = '#4a3a6b'; b.fillRect(x - 3, y - 2, 6, 5); b.fillStyle = '#9575cd'; b.fillRect(x - 2, y - 1, 4, 3);
  });
}

// as setas da troca de gases (desenhadas por cima, nítidas): O₂ entra (azul, para baixo) e CO₂ sai (roxa, para cima)
function setasDaTroca(g) {
  const j = jogo;
  const seta = (x, y1, y2, cor, t) => {
    g.strokeStyle = cor; g.fillStyle = cor; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y1); g.lineTo(x, y2); g.stroke();
    const d = Math.sign(y2 - y1); g.beginPath(); g.moveTo(x - 8, y2 - d * 8); g.lineTo(x + 8, y2 - d * 8); g.lineTo(x, y2 + d * 4); g.fill();
    g.font = `700 12px ${FONTE}`; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#fff'; g.strokeText(t, x, Math.min(y1, y2) - 6); g.fillText(t, x, Math.min(y1, y2) - 6);
  };
  if (j.setaO2) seta(330, 120, 178, '#0277bd', 'O₂ entra');
  if (j.setaCO2) seta(250, 182, 124, '#5e35b1', 'CO₂ sai');
}

// a epiglote: aberta (em pé) enquanto respiramos, para o ar descer para a laringe
function epiglote(g) {
  g.save();
  g.translate(EPI[0], EPI[1]);
  g.rotate(-1.45);
  g.fillStyle = '#7c2a46'; g.fillRect(-2, -10, 50, 12);
  for (let k = 0; k < 44; k += 2) { const esp = k < 6 ? 6 : k > 36 ? 6 - (k - 36) * 0.6 : 8; g.fillStyle = k % 8 === 0 ? '#ee90a5' : '#d0647c'; g.fillRect(k, -esp, 2, esp); }
  g.fillStyle = '#ffc4cf'; g.fillRect(4, -8, 32, 2);
  g.restore();
}
// as cordas vocais: duas dobrinhas nas paredes da laringe; com o ar passando (resposta certa), vibram
function cordasVocais(g) {
  const j = jogo, vib = j.vibra > 0 ? Math.round(Math.sin(j.t * 60) * 2) : 0, abre = j.yGAlvo > 200 ? 6 : 0;
  bloco(g, 296, CORDAS_Y, 14 - abre + vib, 4, '#f3e5f5'); bloco(g, 296, CORDAS_Y + 4, 14 - abre + vib, 2, '#ab47bc');
  bloco(g, 320 + abre - vib, CORDAS_Y, 14 - abre + vib, 4, '#f3e5f5'); bloco(g, 320 + abre - vib, CORDAS_Y + 4, 14 - abre + vib, 2, '#ab47bc');
}

function desenharHeroi(g) {
  const j = jogo, h = j.heroi;
  if (j.transicao && j.transicao.t > 0.35 && j.transicao.t < 0.6) return;
  let y = piso(h.x);
  const andando = !!j.mover;
  const q = h.susto > 0 ? 'susto' : h.feliz > 0 ? 'feliz' : andando && Math.floor(h.passo) % 2 ? 'b' : 'a';
  // flutua no ar: um sobe-e-desce leve, mais forte quando o vento puxa
  const boia = Math.sin(j.t * 3) * 2 + (andando ? Math.abs(Math.sin(h.passo * Math.PI / 2)) * 3 : 0);
  g.globalAlpha = 0.25; bloco(g, h.x - 12, y - 2, 24, 4, '#3a0c1a'); g.globalAlpha = 1;
  const pequeno = ['bronquios', 'alveolos', 'coracao', 'celula', 'expira'].includes(j.cena) || (j.cena === 'troca' && (h.noSangue || h.mergulho));
  if (j.cena === 'coracao' || (j.cena === 'celula' && h.x < PARA.energia + 4 && !h.forma2)) {
    bloco(g, h.x - 13, y - 14, 26, 16, '#5d0000'); bloco(g, h.x - 11, y - 12, 22, 12, '#e53935'); bloco(g, h.x - 7, y - 10, 14, 2, '#ef9a9a');
  }
  desenharSprite(g, spriteParticula(h.forma || j.p.forma, h.cor || j.p.cor, pequeno ? 'p' : 'm', q, h.molhado), R(h.x), y - R(boia));
  // a poeira: pontinhos marrons girando em volta da nuvenzinha; depois de presos, ficam nos pelinhos do nariz
  if (j.cena === 'nariz') j.poeiras.forEach((p) => {
    const a = p.a + j.t * 1.5, sx = h.x + Math.cos(a) * p.r, sy = y - 16 + Math.sin(a) * p.r * 0.55;
    const k = p.presa ? p.presa.t : 0, px = p.presa ? sx + (p.presa.x - sx) * k : sx, py = p.presa ? sy + (p.presa.y - sy) * k : sy;
    bloco(g, px - 4, py - 4, 8, 8, '#3e2723'); bloco(g, px - 2, py - 2, 4, 4, '#8d6e63'); bloco(g, px - 2, py - 2, 2, 2, '#bcaaa4');
  });
}

// os nomes das partes: na margem ou num espaço vazio, com uma linhazinha; os que entregam a resposta só depois
function etiqueta(g, x, y, t, ax, ay) {
  g.font = `600 9px ${FONTE}`;
  const w = Math.round(g.measureText(t).width + 8);
  if (ax !== undefined) { g.strokeStyle = 'rgba(255,248,236,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(ax, ay); g.stroke(); g.fillStyle = '#fff8ec'; g.fillRect(ax - 1.5, ay - 1.5, 3, 3); }
  g.fillStyle = 'rgba(255,248,236,.93)'; g.fillRect(Math.round(x - w / 2), y - 7, w, 12);
  g.fillStyle = '#5a1428'; g.textAlign = 'center'; g.fillText(t, x, y + 2);
}
function etiquetas(g) {
  const j = jogo, feito = (parada) => j.itens.findIndex((it) => it.parada === parada) < j.i && j.itens.some((it) => it.parada === parada);
  if (j.cena === 'nariz') {
    etiqueta(g, 60, 210, 'Narina', 100, 168);
    if (feito('poeira')) etiqueta(g, 210, 128, 'Pelinhos e muco', 120, 166);
    etiqueta(g, 216, 14, 'Seio da face', 172, 18);
    etiqueta(g, 300, 40, 'Conchas nasais', 380, 84);
    etiqueta(g, 530, 150, 'Fossa nasal');
    etiqueta(g, 400, 206, 'Céu da boca', 400, 184);
  } else if (j.cena === 'garganta') {
    etiqueta(g, 120, 12, 'Fundo do nariz');
    etiqueta(g, 356, 40, 'Faringe');
    etiqueta(g, 226, 112, 'Epiglote', 292, 118);
    etiqueta(g, 150, 150, 'Língua');
    etiqueta(g, 96, 196, 'Pescoço');
    if (feito('faringe')) { etiqueta(g, 250, 212, 'Laringe', 300, 200); etiqueta(g, 410, 206, 'Esôfago', 364, 190); }
    if (feito('voz')) etiqueta(g, 230, 186, 'Cordas vocais', 298, 182);
    etiqueta(g, 420, 112, 'Coluna');
    etiqueta(g, 500, 160, 'Nuca');
  } else if (j.cena === 'traqueia') {
    etiqueta(g, 90, 10, 'Anéis de cartilagem', 90, 26);
    etiqueta(g, 260, 62, 'Cílios e muco', 250, 44);
    etiqueta(g, 560, 120, 'Traqueia');
  } else if (j.cena === 'alveolos') {
    etiqueta(g, 70, 20, 'Bronquíolo', 60, 44);
    etiqueta(g, 470, 30, 'Alvéolos', 432, 84);
    etiqueta(g, 470, 172, 'Vasinhos de sangue', 416, 140);
    etiqueta(g, 236, 214, 'Macrófago: célula de defesa', 236, 192);
    etiqueta(g, 70, 214, 'Diafragma');
  } else if (j.cena === 'troca') {
    etiqueta(g, 300, 30, 'Ar dentro do alvéolo');
    etiqueta(g, 110, 112, 'Parede do alvéolo', 172, 150);
    etiqueta(g, 470, 172, 'Capilar (vasinho de sangue)', 440, 196);
    if (feito('carona')) etiqueta(g, 160, 168, 'Hemácias', 200, 198);
  } else if (j.cena === 'coracao') {
    etiqueta(g, 300, 204, 'Coração', 300, 186);
    etiqueta(g, 470, 14, 'Artéria: leva o sangue ao corpo', 420, 24);
    etiqueta(g, 110, 104, 'Veia: sangue com oxigênio', 140, 124);
    etiqueta(g, 140, 14, 'Veia: sangue que volta', 256, 30);
  } else if (j.cena === 'celula') {
    etiqueta(g, 320, 10, 'Célula do músculo da perna');
    etiqueta(g, 140, 112, 'Núcleo', 210, 92);
    etiqueta(g, 500, 160, 'Mitocôndria: usina de energia', 452, 124);
    if (jogo.glicoseT < 0) etiqueta(g, 300, 160, 'Glicose (veio da Missão Digestão!)', 300, 188);
    etiqueta(g, 560, 212, 'Capilar');
  } else if (j.cena === 'expira') {
    etiqueta(g, 238, 14, 'Traqueia', 292, 30);
    etiqueta(g, 168, 32, 'Pulmão direito');
    etiqueta(g, 470, 32, 'Pulmão esquerdo');
    etiqueta(g, 420, 76, 'Brônquios', 372, 84);
    etiqueta(g, 470, 214, 'Diafragma');
  } else if (j.cena === 'bronquios') {
    etiqueta(g, 238, 14, 'Traqueia', 292, 30);
    etiqueta(g, 168, 32, 'Pulmão direito');
    etiqueta(g, 470, 32, 'Pulmão esquerdo');
    etiqueta(g, 308, 196, 'Coração');
    etiqueta(g, 470, 214, 'Diafragma');
    if (feito('divisao')) etiqueta(g, 420, 76, 'Brônquios', 372, 84);
    if (feito('galhos')) { const [ax, ay] = CAMINHO_B[CAMINHO_B.length - 1]; etiqueta(g, ax * 2 + 6, ay * 2 + 30, 'Alvéolos', ax * 2, ay * 2 + 8); etiqueta(g, ax * 2 - 60, ay * 2 - 34, 'Bronquíolos', ax * 2 - 22, ay * 2 - 14); }
  }
}

// mini-mapa: o menino de lado, com o caminho do ar (nariz → garganta → traqueia → pulmões) e o pontinho
function miniMapa(g, W) {
  const j = jogo, esc = W < 330 ? 0.7 : 1;
  g.save();
  g.translate(Math.round(W - 66 * esc), 6);
  g.scale(esc, esc);
  g.fillStyle = 'rgba(255,250,240,.92)'; g.fillRect(0, 0, 60, 62);
  g.strokeStyle = '#c8a879'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, 59, 61);
  g.fillStyle = '#6d4c41'; g.beginPath(); g.arc(34, 13, 12, Math.PI, 0); g.fill();
  g.fillStyle = '#f2c28b'; g.beginPath(); g.arc(34, 16, 11, 0, 7); g.fill();
  g.beginPath(); g.moveTo(24, 12); g.lineTo(19, 19); g.lineTo(25, 20); g.fill();
  g.fillRect(30, 26, 8, 5);
  g.fillRect(22, 30, 26, 24);
  g.fillStyle = '#f06292'; g.beginPath(); g.ellipse(29, 42, 5, 8, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(41, 42, 5, 8, 0, 0, 7); g.fill();
  g.strokeStyle = '#4fc3f7'; g.lineWidth = 2; g.beginPath(); g.moveTo(22, 19); g.lineTo(30, 17); g.lineTo(33, 24); g.lineTo(35, 36); g.stroke();
  const k = Math.max(0, Math.min(1, j.heroi.x / (SAIDA[j.cena] || FIM[j.cena])));
  const p = { nariz: [21 + 10 * k, 18.5 - 1.5 * k], garganta: [32 + 3 * k, 21 + 12 * k], traqueia: [34 + k, 27 + 7 * k], bronquios: [36 + 6 * k, 35 + 9 * k], alveolos: [41, 44], troca: [41.5, 45], coracao: [34 + 2 * k, 40 + 8 * k], celula: [34, 56], expira: [40 - 18 * k, 44 - 25 * k] }[j.cena];
  const r = 3 + Math.sin(j.t * 6) * 0.8;
  g.fillStyle = '#ffd54f'; g.strokeStyle = '#5a1428'; g.lineWidth = 1.2;
  g.beginPath(); g.arc(p[0], p[1], r, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#5a1428'; g.font = `600 7px ${FONTE}`; g.textAlign = 'center'; g.fillText('você está aqui', 30, 60);
  g.restore();
}

// ---------- fim da fase ----------
function terminarRespiracao() {
  if (!jogo) return;
  const { pontos, melhorCombo } = jogo;
  const d = lerDados();
  const novoRecorde = pontos > (d.recorde || 0);
  if (novoRecorde) { d.recorde = pontos; gravarDados(d); }
  const porTipo = Object.values(TIPOS_RESP).map((t) => {
    const rs = resultados.filter((r) => r.m.id === t.id);
    return rs.length ? `${t.titulo}: ${rs.filter((r) => !r.erros.length).length}/${rs.length}` : '';
  }).filter(Boolean);
  pararRespiracao();
  missao.resumo = [
    `O ciclo do ar completo (nariz, garganta, traqueia, brônquios, alvéolos, coração, célula e expiração). De primeira por habilidade: ${porTipo.join(' · ')}.`,
    `Melhor sequência sem errar: ${melhorCombo}.${novoRecorde ? ' Novo recorde!' : ''}`,
    `BNCC: ${[...new Set(Object.values(TIPOS_RESP).filter((t) => resultados.some((r) => r.m.id === t.id)).map((t) => t.bncc))].join(', ')}.`,
    `Pontos: ${pontos}`,
  ];
  fimDaMissao();
  const estrelas = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = novoRecorde ? 'Novo recorde! 🏆' : estrelas === 3 ? 'Fôlego perfeito! 🫁' : 'Ciclo completo! 🫁';
  $('fim-acoes').innerHTML = painelDoFolego();
  $('fim-acoes').hidden = false;
  $('fim-texto').textContent = `${aluno}, você fez a viagem inteira do ar e marcou ${pontos} pontos! O oxigênio entrou, virou energia na célula com a glicose da comida, e o gás carbônico saiu na expiração.`;
}

// o Painel do Fôlego: a roda do ciclo do ar e dicas de saúde (sem culpar ninguém)
function painelDoFolego() {
  const ciclo = [['👃', 'O ar entra pelo nariz'], ['🫁', 'O oxigênio passa para o sangue nos alvéolos'], ['❤️', 'O coração bombeia o sangue'],
    ['⚡', 'A célula faz energia com o oxigênio e a glicose'], ['⚫', 'Sobra o gás carbônico'], ['😮‍💨', 'Ele sai na expiração']];
  return `<div class="dig-painel resp-painel"><h3>🫁 Painel do Fôlego: o ciclo do ar</h3>
    <ol class="resp-ciclo">${ciclo.map(([i, t]) => `<li><span aria-hidden="true">${i}</span>${t}</li>`).join('')}</ol>
    <p><b>Para respirar bem:</b> respire pelo nariz · ar limpo e plantas por perto fazem bem · brincar e se exercitar
    deixa os pulmões fortes · cubra a tosse com o braço.</p></div>`;
}

// capa do cartão na lista de jogos: o nariz em corte, com o oxigênio entrando pela narina e o vento
function desenharCapa() {
  const arte = camadas('nariz'), W = 150, H = ALT_ARTE;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  const x0 = 24;
  g.drawImage(arte.fundo, -x0, 0);
  g.fillStyle = '#e3f6ff';
  [[30, 80], [60, 74], [92, 70], [118, 76], [76, 30], [104, 50]].forEach(([x, y]) => g.fillRect(x, y, 4, 1));
  g.drawImage(arte.frente, -x0, 0);
  const spr = spriteParticula('nuvem', AR.cor, 'm', 'feliz', false);
  g.drawImage(spr, Math.round(70 - spr.width / 2), 88 - spr.height);
  $('resp-capa').appendChild(cv);
}
setTimeout(desenharCapa, 400);

$('btn-respiracao').onclick = () => { SOM.clique(); escolherProfessorE('Missão Respiração', telaRespiracaoMenu); };
$('resp-voltar').onclick = telaJogos;
$('resp-sair').onclick = telaRespiracaoMenu;

export { comecarRespiracao, pararRespiracao, telaRespiracaoMenu };
