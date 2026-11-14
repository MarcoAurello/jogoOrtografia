/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Missão Digestão. */

import { $, embaralhar } from './util.js?v=287';
import { aluno, definirMissao, definirResultados, estrelasTexto, lerEstrelas, missao, resultados } from './estado.js?v=287';
import { frase, SOM, tocar } from './som.js?v=287';
import { mascote, mostrar, telaJogos } from './telas.js?v=287';
import { escolherProfessorE } from './professor.js?v=287';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=287';
import { CLASSES_DIG, LANCHES, NUTRIENTES, PARADAS, perguntasBoca, perguntasEstomago, perguntasGrosso, perguntasIntestino, TIPOS_DIG } from './dados-digestao.js?v=287';
import { desenharSprite } from './sprites-reino.js?v=287';
import { spriteAnus, spriteBacteria, spriteDente, spriteNutriente, spritePapila } from './sprites-digestao.js?v=287';

// ---------- Missão Digestão ----------
// Ciências (4º e 5º ano, BNCC EF05CI06 e EF05CI08): a criança escolhe um lanche, vê o lanche "destrinchado" nos
// nutrientes que ele tem (com a marca 💚 faz bem, 🟡 só um pouco, ⛔ evitar) e escolhe um nutriente para guiar pela
// viagem dentro do corpo. O nutriente vira o personagem (uma bolinha em pixel art com rostinho).
// Fase 1, a Boca: o nutriente rola sozinho pela língua e para em 5 paradas; em cada uma, um toque responde e a
// resposta certa vira a ação no cenário (os dentes mordem e o pedaço fica menor, a saliva cai e ele fica molhado,
// a epiglote fecha a traqueia e ele desce pelo esôfago). O erro também aparece no cenário (o ar da traqueia empurra
// de volta, a úvula fecha o nariz) e a mensagem explica; no segundo erro a resposta certa vai sozinha.
// Mesmo padrão do Reino da Sintaxe: sem tempo e sem "game over", feedback com cor + ícone + som, 🔊 para ouvir,
// só a primeira tentativa conta para o relatório e as estrelas, sequência de acertos dá pontos x2/x3.
// A viagem segue direto, sem parar (pedido do Marco): engoliu, desce pelo esôfago (os músculos empurram em ondas) e
// chega ao estômago (suco gástrico, a quebra de cada nutriente, o muco que protege e a saída pelo piloro). Os
// intestinos continuam: no duodeno chegam a bile e o suco pancreático (cada nutriente termina de ser quebrado e ganha o
// seu poder: glicose rápida, aminoácidos de montar, gordura deslizando) e, no intestino delgado, ele passa pelas
// vilosidades para o sangue, que leva tudo para o corpo todo. As fibras não passam e seguem para o intestino grosso.
// No intestino grosso, a criança guia a Sobrinha (o que sobrou do lanche: fibras e água; quem guia a fibra segue com
// ela): a parede puxa a água, as bactérias boas comem as fibras e, no fim, o reto e o ânus (rosado e fofinho). A tela de
// fim mostra o Painel do Corpo: o que o lanche escolhido deu ao corpo (energia, construção, defesa) e o que é só um pouco.
const ALT = 220, CHAO = 182;   // o mundo tem 220 de altura (a largura acompanha a tela); a língua fica em 182
const CHAVE = 'pleno-ortografia:digestao';
const FONTE = 'Fredoka, sans-serif';
// A Boca é vista em corte, de lado (como nos livros de Ciências), em duas telas para a imagem ficar fácil de entender:
// a frente (rosto, lábios, dentes, língua e mandíbula) e, depois dos dentes, o fundo (glândulas salivares, papilas,
// úvula, epiglote, traqueia e esôfago descendo, e a coluna atrás). Cada tela tem o seu mundo (unidades do mundo).
// Depois vêm o esôfago (um tubo descendo em diagonal, com o coração na frente e o diafragma embaixo) e o estômago
// (a caverna em "J", com pregas, muco e o lago de suco gástrico).
const CENA_DA = { corte: 'frente', triturar: 'frente', saliva: 'fundo', sabor: 'fundo', engolir: 'fundo',
  peristalse: 'esofago', suco: 'estomago', quebra: 'estomago', muco: 'estomago', saida: 'estomago',
  bile: 'duodeno', pancreas: 'duodeno', absorcao: 'jejuno', circulacao: 'jejuno', fibra: 'jejuno',
  agua: 'grosso', bacterias: 'grosso', fibras: 'grosso' };
const FIM = { frente: 430, fundo: 600, esofago: 420, estomago: 640, duodeno: 520, jejuno: 640, grosso: 780 };
const PARA = { corte: 76, triturar: 196, saliva: 128, sabor: 290, engolir: 380, peristalse: 120, suco: 200, quebra: 290, muco: 380, saida: 456, bile: 200, pancreas: 272, absorcao: 156, circulacao: 340, fibra: 340, agua: 170, bacterias: 312, fibras: 452 };
const SAIDA = { frente: 400, esofago: 372, duodeno: 500 };   // onde a tela termina (no fundo da boca, ele cai pelo esôfago)
const ENTRADA = { fundo: -16, esofago: -12, estomago: 10, duodeno: -12, jejuno: -14, grosso: -14 };
const TITULO_CENA = { fundo: 'O fundo da boca e a garganta', esofago: 'O esôfago', estomago: 'Dentro do estômago', duodeno: 'O duodeno: o laboratório das enzimas', jejuno: 'O intestino delgado: a absorção', grosso: 'O intestino grosso' };
const BARRA_CENA = { frente: '👄 Boca', fundo: '👄 Boca', esofago: '〰️ Esôfago', estomago: '🫧 Estômago', duodeno: '🧪 Duodeno', jejuno: '🌿 Intestino delgado', grosso: '💧 Intestino grosso' };
const AVISO_CENA = { fundo: 'Passou pelos dentes! Agora vem o fundo da boca e a garganta...',
  esofago: 'Engoliu! Agora o bolo alimentar desce pelo esôfago...', estomago: 'A cárdia abriu: chegando ao estômago!',
  duodeno: 'O piloro abriu: chegando ao duodeno, o começo do intestino!', jejuno: 'Agora o intestino delgado, cheio de dobrinhas...',
  grosso: 'As fibras chegaram ao intestino grosso!' };
// a parada 'saida' existe no estômago e no intestino grosso: o lugar depende da tela em que a criança está
const paradaX = (item) => (item.tipo === 'grosso' && item.parada === 'saida' ? 600 : PARA[item.parada]);
const cenaDa = (item) => (item.tipo === 'grosso' ? 'grosso' : CENA_DA[item.parada]);
// por onde a viagem pode começar (no mapa): cada começo pula as telas de antes, e o nutriente chega no estado certo
const COMECO = { boca: 'boca', esofago: 'esofago', estomago: 'esofago', duodeno: 'duodeno', delgado: 'duodeno', grosso: 'grosso' };
const idMissao = (c) => (c === 'boca' ? MISSAO_ID : c === 'esofago' ? `${MISSAO_ID}-estomago` : `${MISSAO_ID}-${c}`);
const DE_ONDE = { boca: 'da boca', esofago: 'do esôfago', duodeno: 'do duodeno', grosso: 'do intestino grosso' };
const MISSAO_ID = 'digestao-viagem';
const DENTES_BOCA = [
  { tipo: 'incisivo', grupo: 'incisivos', x: 112 }, { tipo: 'incisivo', grupo: 'incisivos', x: 130 },
  { tipo: 'canino', grupo: 'caninos', x: 168 },
  { tipo: 'molar', grupo: 'molares', x: 216 }, { tipo: 'molar', grupo: 'molares', x: 250 }, { tipo: 'molar', grupo: 'molares', x: 284 },
];
const MORDE_EM = { incisivos: 121, caninos: 168, molares: 250 };
const GENGIVA = 30;   // onde os dentes de cima nascem (embaixo do céu da boca)
const GLANDULAS = [104, 150];
const UVULA_X = 330;
const EPI_X = 404, TRAQ = [408, 450], ESOF = [468, 514], PAREDE = 514;
const GLAND_EST = [70, 115, 160];   // de onde pinga o suco gástrico (pixels)

let escolha = null;   // { lanche, ali (índice do alimento), nut (id do nutriente) }
let inicio = 'boca';  // onde a viagem começa: 'boca' ou 'esofago' (pula a boca; escolhido no mapa da viagem)
let jogo = null;      // a partida em andamento

const lerDados = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; } };
const gravarDados = (d) => { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) { /* sem armazenamento */ } };
const noAlbum = (id) => !!(lerDados().album || {})[id];
const depois = (ms, fn) => { const j = jogo; const t = setTimeout(() => { if (jogo === j) fn(); }, ms); j.timers.push(t); };
const msg = (texto, tipo = '') => { $('dig-msg').innerHTML = texto; $('dig-msg').className = `cores-msg reino-msg ${tipo}`; };
const ouvir = (texto) => frase('dig-frase', texto);
const lanchesCom = (id) => LANCHES.filter((l) => l.alimentos.some((a) => a.nutrientes.includes(id))).map((l) => l.nome);
const R = (v) => Math.round(v / 2) * 2;   // tudo no grid de pixels da arte (1 pixel = 2 unidades)
function bloco(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(R(x), R(y), Math.max(2, R(w)), Math.max(2, R(h))); }

// ============ telas de fora da fase ============
// menu: os lanches e o mapa da viagem
function telaDigestaoMenu() {
  pararDigestao();
  mascote('davi-dig', 'oi');
  const estrelas = lerEstrelas()[MISSAO_ID] || 0;
  $('dig-lanches').innerHTML = LANCHES.map((l) => `
    <button class="missao dig-lanche" style="--c:${l.cor}" data-lanche="${l.id}" type="button">
      <span class="missao-icone">${l.icone}</span>
      <span class="missao-titulo">${l.nome}</span>
      <span class="dig-lanche-itens" aria-hidden="true">${l.alimentos.map((a) => a.icone).join(' ')}</span>
      <span class="missao-descricao">${l.alimentos.map((a) => a.nome).join(', ')}</span>
    </button>`).join('');
  $('dig-lanches').querySelectorAll('[data-lanche]').forEach((b) => {
    b.onclick = () => { SOM.clique(); telaPrato(b.dataset.lanche); };
  });
  // o mapa da viagem: as paradas prontas são botões e escolhem onde a viagem começa (a boca, ou direto o esôfago)
  const todas = lerEstrelas();
  $('dig-viagem').innerHTML = PARADAS.map((p, k) => {
    const comeco = COMECO[p.id];
    const seta = k ? '<span class="dig-seta" aria-hidden="true">›</span>' : '';
    if (!p.pronta) return `${seta}<span class="dig-parada"><span class="dig-parada-icone">${p.icone}</span>${p.nome}<small>em breve</small></span>`;
    return `${seta}<button class="dig-parada pronta${inicio === comeco ? ' escolhida' : ''}" type="button" data-inicio="${comeco}"
      aria-pressed="${inicio === comeco}"><span class="dig-parada-icone">${p.icone}</span>${p.nome}
      <small>${estrelasTexto(Math.max(estrelas, todas[idMissao(comeco)] || 0))}</small></button>`;
  }).join('');
  $('dig-viagem').querySelectorAll('[data-inicio]').forEach((b) => {
    b.onclick = () => { SOM.clique(); inicio = b.dataset.inicio; telaDigestaoMenu(); };
  });
  $('dig-inicio').textContent = { boca: 'A viagem começa na boca. Toque em outra parada para começar direto lá.',
    esofago: 'A viagem começa direto no esôfago (o alimento já foi mastigado e engolido).',
    duodeno: 'A viagem começa direto no duodeno (o alimento já virou quimo no estômago).',
    grosso: 'A viagem começa direto no intestino grosso (os nutrientes já foram entregues ao corpo).' }[inicio];
  const n = Object.keys(lerDados().album || {}).length;
  $('dig-btn-album').textContent = `📒 Álbum dos Nutrientes (${n}/${Object.keys(NUTRIENTES).length})`;
  mostrar('tela-dig-menu');
}

// o lanche destrinchado: cada alimento com os nutrientes dele; um toque escolhe quem vai ser guiado
function telaPrato(lancheId) {
  pararDigestao();
  const l = LANCHES.find((x) => x.id === lancheId) || LANCHES[0];
  $('dig-prato-titulo').textContent = `${l.icone} ${l.nome}`;
  $('dig-alimentos').innerHTML = l.alimentos.map((a, k) => `
    <div class="dig-alimento">
      <div class="dig-alimento-nome"><span class="dig-alimento-icone" aria-hidden="true">${a.icone}</span>${a.nome}</div>
      <div class="dig-nutris">${a.nutrientes.map((id) => {
        const n = NUTRIENTES[id], c = CLASSES_DIG[n.classe];
        return `<button class="dig-nutri" type="button" data-ali="${k}" data-nut="${id}" style="--c:${n.cor};--cl:${c.cor}"
          aria-label="${n.nome}, ${c.nome}${noAlbum(id) ? ', já está no álbum' : ''}">
          <span class="dig-nutri-icone" aria-hidden="true">${n.icone}</span><span class="dig-nutri-nome">${n.nome}</span>
          <span class="dig-nutri-classe">${c.icone} ${c.nome}</span>${noAlbum(id) ? '<span class="dig-nutri-ok" aria-hidden="true">✓</span>' : '<span class="dig-nutri-novo" aria-hidden="true">novo</span>'}
        </button>`;
      }).join('')}</div>
    </div>`).join('');
  $('dig-alimentos').querySelectorAll('[data-nut]').forEach((b) => {
    b.onclick = () => { SOM.clique(); escolha = { lanche: l.id, ali: Number(b.dataset.ali), nut: b.dataset.nut }; comecarDigestao(); };
  });
  $('dig-prato-ouvir').onclick = () => ouvir(`${l.nome}. ${l.alimentos.map((a) => `${a.nome}: ${a.nutrientes.map((id) => NUTRIENTES[id].nome).join(', ')}`).join('. ')}. Toque no nutriente que você vai guiar.`);
  mostrar('tela-dig-prato');
}

// Álbum dos Nutrientes: uma figurinha por nutriente guiado até o fim; as que faltam dizem em que lanche procurar
function telaAlbum() {
  pararDigestao();
  const album = lerDados().album || {};
  $('dig-album').innerHTML = Object.entries(NUTRIENTES).map(([id, n]) => {
    const c = CLASSES_DIG[n.classe];
    if (!album[id]) return `<div class="reino-pagina bloqueada"><span class="reino-pagina-cena">❔</span><b>${n.nome}</b>
      <p>Guie este nutriente pela viagem para ganhar a figurinha. Está em: ${lanchesCom(id).join(', ')}.</p></div>`;
    return `<div class="reino-pagina" style="--c:${n.cor}"><span class="reino-pagina-cena">${n.icone}</span><b>${n.nome}</b>
      <p class="dig-album-classe" style="--cl:${c.cor}">${c.icone} ${c.nome} · ${n.grupo}</p><p>${n.fato}</p>
      ${(lerDados().viagens || {})[id] ? '<span class="dig-selo">🏁 Viagem completa</span>' : ''}
      <button class="reino-ouvir" type="button" data-ouvir="${id}" aria-label="Ouvir a figurinha">🔊</button></div>`;
  }).join('');
  $('dig-album').querySelectorAll('[data-ouvir]').forEach((b) => {
    b.onclick = () => { const n = NUTRIENTES[b.dataset.ouvir]; ouvir(`${n.nome}. ${CLASSES_DIG[n.classe].nome}. ${n.fato}`); };
  });
  mostrar('tela-dig-album');
}

// ============ começar e parar ============
function comecarDigestao() {
  pararDigestao();
  if (!escolha) { telaDigestaoMenu(); return; }
  const l = LANCHES.find((x) => x.id === escolha.lanche), ali = l.alimentos[escolha.ali], n = NUTRIENTES[escolha.nut];
  const c = inicio, direto = c !== 'boca', ordem = ['boca', 'esofago', 'duodeno', 'grosso'], desde = (x) => ordem.indexOf(c) <= ordem.indexOf(x);
  definirMissao({ id: idMissao(c), digestao: true, icone: '🍔', cor: n.cor, titulo: `Missão Digestão: ${DE_ONDE[c]} ao fim da viagem (${n.nome})` });
  definirResultados([]);
  const itens = [...(desde('boca') ? perguntasBoca(escolha.nut, ali) : []), ...(desde('esofago') ? perguntasEstomago(escolha.nut) : []),
    ...(desde('duodeno') ? perguntasIntestino(escolha.nut) : []), ...perguntasGrosso()];
  const cena0 = { boca: 'frente', esofago: 'esofago', duodeno: 'duodeno', grosso: 'grosso' }[c];
  jogo = { l, ali, n, nId: escolha.nut, itens, i: 0, pontos: 0, combo: 0, melhorCombo: 0, timers: [], rodando: true, t: 0,
    ultimo: performance.now(), cam: 0, estado: 'andando', tentativa: 1, t0: performance.now(), mover: null, cena: cena0, transicao: null, comeco: c,
    // começando direto no esôfago, o nutriente já chega mastigado (pequeno) e molhado de saliva
    heroi: { x: direto ? ENTRADA[cena0] : -8, passo: 0, susto: 0, feliz: 0, tam: direto ? 'p' : 'g', molhado: direto, brilho: c === 'esofago' && escolha.nut === 'amido',
      quimo: c === 'duodeno', salto: null, queda: null },
    somT: 1, batida: 0, direto, bile: 0, pancreas: 0, fluxo: 0, celulas: [], velocista: false, absorvendo: null,
    part: [], gotas: [], ar: [], bolhas: [], saliva: 0, epi: 0, epiAlvo: 0, mord: null, marca: null, sabor: null, uvula: 0,
    onda: false, ondaAmb: 0, cardia: 0, cardiaAlvo: 0, piloro: 0, piloroAlvo: 0, lagoBrilho: 0, mistura: 0, muco: 0, bolhasLago: [],
    aguas: [], puxa: 0, nhac: 0, anus: 0, anusAlvo: 0, sobrinha: false, rapido: false };
  if (c === 'grosso') virarSobrinha();
  tituloBarra();
  $('dig-controles').innerHTML = '';
  $('dig-frase').innerHTML = `<span class="reino-dica">${n.icone} Você é ${n.oNome}, ${ali.de}. ${{ boca: 'A viagem começa na boca!', esofago: 'Já mastigado e engolido: a viagem começa no esôfago!', duodeno: 'Já virou quimo: a viagem começa no duodeno!', grosso: 'A viagem começa no intestino grosso!' }[c]}</span>`;
  msg('');
  mostrar('tela-dig');
  hud();
  proximaParada();
  requestAnimationFrame(quadro);
}

function tituloBarra() { $('dig-titulo').textContent = `${BARRA_CENA[jogo.cena]} · ${jogo.sobrinha ? '🟢 Sobrinha' : `${jogo.n.icone} ${jogo.n.nome}`}`; }
// no intestino grosso, quem segue é a Sobrinha: o que sobrou do lanche (fibras e água), verde e molhadinha
// (quem guia a fibra continua com ela mesma)
function virarSobrinha() {
  const j = jogo, h = j.heroi;
  Object.assign(h, { tam: 'p', vaso: null, mergulho: null, rastro: null, quimo: false, brilho: false, gotinhas: false, quebrado: false, molhado: true });
  j.velocista = false; j.fluxo = 0;
  if (j.nId !== 'fibra') { j.sobrinha = true; h.forma = 'fio'; h.cor = '#7cb342'; }
}

function pararDigestao() {
  if (jogo) { jogo.rodando = false; jogo.timers.forEach(clearTimeout); }
  jogo = null;
}

// ---------- HUD, pontos e sequência ----------
function hud() {
  const j = jogo;
  $('dig-pontos').textContent = j.pontos;
  $('dig-progresso').innerHTML = j.itens.map((_, k) => `<i class="${k < j.i ? 'feito' : ''}"></i>`).join('');
  const o = $('dig-orbe');
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
  if (j.combo === 3) { tocar([[784, 0.08], [988, 0.08], [1319, 0.16]]); texto(x, y - 20, '⚡ Energia x2!', '#b45309'); }
  hud();
}
function registrar(item, erros) {
  const certa = item.ops.find((o) => o.certa);
  const rotulo = { corte: `${item.alvo === 'caninos' ? 'Rasgar' : 'Cortar'} o pedaço de ${jogo.ali.nome.toLowerCase()}`, triturar: 'Triturar a comida',
    saliva: `A saliva e ${jogo.n.oNome}`, sabor: `Como comer ${jogo.n.nome.toLowerCase()}`, engolir: 'Engolir',
    agua: 'A água no intestino grosso', bacterias: 'As bactérias boas', fibras: 'Por que comer fibras',
    peristalse: 'Descer pelo esôfago', suco: 'O suco gástrico', quebra: `${jogo.n.nome} no estômago`, muco: 'O muco do estômago', saida: item.tipo === 'grosso' ? 'O fim do intestino grosso' : 'A saída do estômago',
    bile: 'A bile', pancreas: `${jogo.n.nome} no duodeno`, absorcao: 'A absorção', circulacao: 'O sangue leva os nutrientes', fibra: 'O caminho das fibras' }[item.parada];
  resultados.push({ m: TIPOS_DIG[item.tipo], certa: `${rotulo}: ${certa.t}`, erros, tempo: (performance.now() - jogo.t0) / 1000 });
}

// ---------- partículas e textos que sobem ----------
function particulas(x, y, cor, n = 12, forca = 90) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, v = forca * (0.4 + Math.random() * 0.8);
    jogo.part.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, vida: 0.7 + Math.random() * 0.4, max: 1.1, cor, tam: 2 + Math.random() * 3, g: 160 });
  }
}
// os textos que sobem no cenário ficam um tempo bom na tela (pedido do Marco: sumiam rápido demais)
function texto(x, y, t, cor) { jogo.part.push({ x, y, vx: 0, vy: -16, vida: 2.6, max: 2.6, texto: t, cor, g: 0 }); }
function emojiVoando(x, y, e) { jogo.part.push({ x, y, vx: 0, vy: -30, vida: 1.6, max: 1.6, emoji: e, tam: 22, g: -6 }); }

// ============ as paradas ============
// o nutriente rola até a próxima parada; lá aparece a pergunta
function proximaParada() {
  const j = jogo;
  if (j.i >= j.itens.length) return;
  j.estado = 'andando';
  $('dig-controles').innerHTML = '';
  const item = j.itens[j.i], parada = item.parada;
  if (cenaDa(item) === j.cena) { irPara(paradaX(item), mostrarPergunta); return; }
  // acabou esta tela: escurece e abre na próxima (no fundo da boca, ele já desceu pelo esôfago)
  const nova = cenaDa(item);
  const aviso = nova === 'grosso' && j.nId !== 'fibra' ? 'O nutriente foi entregue! O que sobrou do lanche continua...' : AVISO_CENA[nova];
  $('dig-frase').innerHTML = `<span class="reino-dica">${aviso}</span>`;
  const trocar = () => { j.transicao = { t: 0, trocou: false, cena: nova, depois: () => irPara(paradaX(item), mostrarPergunta) }; };
  if (SAIDA[j.cena] !== undefined) irPara(SAIDA[j.cena], trocar); else trocar();
}
function irPara(x, aoChegar) { jogo.mover = { x, aoChegar }; }

function mostrarPergunta() {
  const j = jogo, item = j.itens[j.i];
  j.estado = 'pergunta';
  j.tentativa = 1;
  j.t0 = performance.now();
  $('dig-frase').innerHTML = `<button class="reino-ouvir" type="button" id="dig-ouvir" aria-label="Ouvir a pergunta">🔊</button>
    <span class="reino-texto">${item.q}</span>`;
  $('dig-ouvir').onclick = () => ouvir(`${item.q} ${item.ops.map((o) => o.t).join('? ')}?`);
  // dentes: as três opções lado a lado; respostas em frase: uma por linha (cabe no celular)
  const longas = item.tipo === 'saliva' || item.tipo === 'nutri' || (item.tipo === 'estomago' && item.parada !== 'saida') || item.tipo === 'esofago'
    || (item.tipo === 'intestino' && item.parada !== 'bile') || item.tipo === 'circulacao' || item.tipo === 'fibras';
  const ops = item.tipo === 'dentes' ? item.ops : embaralhar(item.ops);
  $('dig-controles').innerHTML = `<div class="reino-sintonias ${longas ? 'dig-opcoes-longas' : 'dig-opcoes-dentes'}">${ops.map((o) => `
    <button class="reino-sintonia dig-opcao" type="button" data-op="${item.ops.indexOf(o)}" style="--c:${corDaParada(item)}">
      <span class="reino-sint-icone" aria-hidden="true">${o.icone}</span><span>${o.t}${o.sub ? `<small class="dig-sub">${o.sub}</small>` : ''}</span>
    </button>`).join('')}</div>`;
  $('dig-controles').querySelectorAll('[data-op]').forEach((b) => { b.onclick = () => responder(item.ops[Number(b.dataset.op)], b); });
  if (j.i === 0) msg('👆 Toque na resposta. Se quiser, toque em 🔊 para ouvir.');
  else msg('');
}
const corDaParada = (item) => ({ dentes: '#5b6b80', saliva: '#0277bd', nutri: '#2e7d32', engolir: '#8e24aa', esofago: '#8e24aa', estomago: '#827717', intestino: '#6d4c41', circulacao: '#c62828', grosso: '#2e7d32', fibras: '#558b2f' }[item.tipo]);

function responder(op, botao) {
  const j = jogo;
  if (!j || j.estado !== 'pergunta' || botao.disabled) return;
  const item = j.itens[j.i], certa = item.ops.find((o) => o.certa);
  if (op.certa) {
    j.estado = 'acao';
    botao.classList.add('certa');
    $('dig-controles').querySelectorAll('button').forEach((b) => { b.disabled = true; });
    SOM.certo();
    j.heroi.feliz = 1.4;
    if (j.tentativa === 1) { registrar(item, []); acertouDePrimeira(j.heroi.x, piso(j.heroi.x) - 70); msg(`✅ <b>${certa.t}.</b> ${item.por}`, 'ok'); }
    else msg(`✔ <b>${certa.t}.</b> ${item.por}`, 'ok');
    j.i++;
    hud();
    // a explicação fica no painel até a criança tocar em "Continuar" (cada um lê no seu tempo; 🔊 lê em voz alta).
    // A viagem só segue quando a animação acabou e ela tocou no botão.
    const explicacao = `${certa.t}. ${item.por}`;
    $('dig-controles').innerHTML = `<div class="dig-feedback">
      <button class="reino-ouvir" type="button" id="dig-ouvir-exp" aria-label="Ouvir a explicação">🔊</button>
      <button class="reino-btn dig-continuar" type="button" id="dig-continuar">Continuar ▶</button></div>`;
    $('dig-ouvir-exp').onclick = () => ouvir(explicacao);
    let animOk = false, botaoOk = false;
    const seguir = () => {
      if (!animOk || !botaoOk || jogo !== j) return;
      if (j.i < j.itens.length) proximaParada(); else terminarDigestao();
    };
    $('dig-continuar').onclick = () => { SOM.clique(); botaoOk = true; $('dig-continuar').disabled = true; seguir(); };
    $('dig-continuar').focus({ preventScroll: true });
    acaoCerta(item, () => { animOk = true; seguir(); });
    return;
  }
  // errou: o cenário mostra o engano, a mensagem explica e a criança tenta de novo
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
    $('dig-controles').querySelectorAll('button').forEach((b) => { b.disabled = true; });
    depois(2600, () => {
      j.estado = 'pergunta';
      const b = $('dig-controles').querySelector(`[data-op="${item.ops.indexOf(certa)}"]`);
      b.disabled = false;
      responder(certa, b);
    });
  }
}

// a resposta certa acontece no cenário
function acaoCerta(item, seguir) {
  const j = jogo, h = j.heroi;
  if (item.tipo === 'dentes') {
    // vai até os dentes certos e a boca morde: 2 mordidas para cortar, 3 para triturar
    const corte = item.parada === 'corte';
    irPara(MORDE_EM[item.alvo], () => {
      j.mord = { t: 0, n: corte ? 2 : 3, mordidas: 0, aoMorder: () => {
        h.tam = corte ? 'm' : 'p';
        particulas(h.x, piso(h.x) - 14, j.n.cor, 10, 70);
        tocar([[140, 0.07, 'square'], [110, 0.05, 'square']]);
      }, aoFim: () => {
        texto(h.x, piso(h.x) - 56, corte ? (item.alvo === 'caninos' ? 'Rasgou!' : 'Cortou!') : 'Triturou!', '#5b6b80');
        depois(500, seguir);
      } };
    });
  } else if (item.tipo === 'saliva') {
    // a cachoeira de saliva cai em cima; o amido começa a soltar faíscas (a amilase trabalhando)
    j.saliva = 1.8;
    depois(700, () => {
      h.molhado = true;
      particulas(h.x, piso(h.x) - 20, '#bfe9ff', 14, 70);
      if (j.nId === 'amido') { h.brilho = true; texto(h.x, piso(h.x) - 60, '✨ Amilase!', '#b8860b'); tocar([[880, 0.06], [1175, 0.06], [1568, 0.12]]); }
      else texto(h.x, piso(h.x) - 60, '💧 Bolo alimentar!', '#0277bd');
    });
    depois(2000, seguir);
  } else if (item.tipo === 'nutri') {
    const c = CLASSES_DIG[j.n.classe];
    j.sabor = { cor: c.cor, t: 1.8 };
    emojiVoando(h.x, piso(h.x) - 60, c.icone);
    depois(1900, seguir);
  } else if (item.tipo === 'engolir') {
    // a epiglote fecha a traqueia e o bolo desce pelo esôfago
    j.epiAlvo = 1;
    tocar([[392, 0.08], [330, 0.08]]);
    depois(650, () => irPara((ESOF[0] + ESOF[1]) / 2, () => {
      j.estado = 'caindo';
      h.queda = { t: 0 };
      tocar([[523, 0.1], [440, 0.1], [349, 0.1], [262, 0.2]]);
      depois(1300, seguir);
    }));
  } else if (item.tipo === 'esofago') {
    // a onda dos músculos vem por trás e empurra o bolo até a cárdia
    j.onda = true;
    tocar([[196, 0.12], [247, 0.12], [294, 0.16]]);
    depois(500, seguir);
  } else if (item.parada === 'suco') {
    j.lagoBrilho = 2.2;
    for (let k = 0; k < 24; k++) j.bolhasLago.push({ x: h.x + (Math.random() - 0.5) * 160, y: 200 + Math.random() * 16, vy: -30 - Math.random() * 30 });
    tocar([[330, 0.06], [392, 0.06], [494, 0.06], [587, 0.1]]);
    texto(h.x, piso(h.x) - 60, '🧪 Suco gástrico!', '#827717');
    depois(1900, seguir);
  } else if (item.parada === 'quebra') {
    if (j.nId === 'proteina') {
      h.quebrado = true;
      particulas(h.x, piso(h.x) - 16, j.n.cor, 16, 80);
      tocar([[523, 0.06], [659, 0.06], [784, 0.12]]);
      texto(h.x, piso(h.x) - 60, '✂️ Peptídeos!', '#c62828');
    } else if (j.nId === 'amido') { h.brilho = false; texto(h.x, piso(h.x) - 60, '⏸️ A amilase parou', '#5b6b80'); }
    else if (j.n.forma === 'gota') texto(h.x, piso(h.x) - 60, '⏳ Fica para o intestino', '#b45309');
    else texto(h.x, piso(h.x) - 60, '➡️ Passa direto', '#2e7d32');
    depois(1900, seguir);
  } else if (item.parada === 'bile') {
    // a bile desce verde pelo canal; nas gorduras, a gota grande se parte em gotinhas (como detergente)
    j.bile = 1.8;
    tocar([[700, 0.05, 'sine'], [560, 0.05, 'sine'], [820, 0.06, 'sine']]);
    depois(800, () => {
      if (j.n.forma === 'gota') { h.gotinhas = true; particulas(h.x, piso(h.x) - 14, '#e6f08e', 12, 60); texto(h.x, piso(h.x) - 60, '🟢 Gotinhas!', '#558b2f'); }
      else texto(h.x, piso(h.x) - 60, '🟢 Bile', '#558b2f');
    });
    depois(1900, seguir);
  } else if (item.parada === 'pancreas') {
    // o suco pancreático termina a quebra: cada nutriente ganha o seu poder
    j.pancreas = 1.8;
    tocar([[523, 0.06], [659, 0.06], [784, 0.06], [1047, 0.12]]);
    depois(900, () => {
      const id = j.nId, y = piso(h.x) - 60;
      particulas(h.x, piso(h.x) - 14, '#fff6dc', 16, 80);
      if (id === 'amido' || id === 'acucar') { h.forma = 'orbe'; h.cor = id === 'amido' ? '#ffe066' : '#ffd27a'; h.rastro = 'glicose'; j.velocista = true; texto(h.x, y, id === 'amido' ? '⚡ Glicose!' : '⚡ Glicose e frutose!', '#b8860b'); }
      else if (id === 'proteina') { h.quebrado = false; h.forma = 'cristal'; h.rastro = 'amino'; texto(h.x, y, '🧱 Aminoácidos!', '#c62828'); }
      else if (j.n.forma === 'gota') { h.gotinhas = false; h.rastro = 'graxos'; h.cor = misturar(j.n.cor, '#fff3c4', 0.35); texto(h.x, y, '✂️ Ácidos graxos!', '#b45309'); }
      else if (id === 'fibra') texto(h.x, y, '🥬 Continua inteira', '#2e7d32');
      else texto(h.x, y, '➡️ Pronto para passar', '#2e7d32');
    });
    depois(2100, seguir);
  } else if (item.parada === 'absorcao') {
    if (j.nId === 'fibra') {
      // grande demais: tenta a vilosidade e não passa
      h.salto = { t: 0 };
      texto(h.x, piso(h.x) - 60, 'Grande demais!', '#2e7d32');
      depois(1300, seguir);
    } else {
      // mergulha na vilosidade e cai no vaso (gordura: o vaso linfático, branco; os outros: o sangue)
      const alvo = j.n.forma === 'gota' ? 'linfa' : 'sangue', k = Math.round((h.x / 2 - 6) / 12);
      j.absorvendo = k;
      irPara((k * 12 + 6) * 2, () => {
        tocar([[660, 0.08, 'sine'], [440, 0.1, 'sine'], [330, 0.14, 'sine']]);
        h.mergulho = { t: 0, alvo, k, fim: () => {
          h.vaso = alvo; h.tam = 'mini'; h.mergulho = null; j.absorvendo = null;
          texto(h.x, piso(h.x) - 40, alvo === 'linfa' ? 'Vaso linfático!' : 'No sangue! ❤️', '#c62828');
          depois(700, seguir);
        } };
      });
    }
  } else if (item.parada === 'circulacao') {
    // o sangue corre forte e leva o nutriente para o corpo todo
    j.fluxo = 4;
    for (let k = 0; k < 5; k++) depois(k * 220, () => emojiVoando(h.x + 30 + k * 30, piso(h.x) - 40, '❤️'));
    tocar([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.2]]);
    depois(900, () => irPara(FIM.jejuno, seguir));
  } else if (item.parada === 'fibra') {
    texto(h.x, piso(h.x) - 60, '💧 Rumo ao intestino grosso', '#2e7d32');
    depois(900, () => irPara(FIM.jejuno, seguir));
  } else if (item.tipo === 'grosso' && item.parada === 'agua') {
    // a parede (esponja) puxa a água: as gotinhas voam para a parede e a Sobrinha fica mais firme
    for (let k = 0; k < 18; k++) j.aguas.push({ x: h.x + (Math.random() - 0.5) * 70, y: piso(h.x) - 10 - Math.random() * 40, vx: 0, vy: 0 });
    j.puxa = 2;
    tocar([[880, 0.04, 'sine'], [990, 0.04, 'sine'], [1175, 0.06, 'sine']]);
    depois(1300, () => { h.molhado = false; if (j.sobrinha || j.nId === 'fibra') h.cor = '#8d8a3a'; texto(h.x, piso(h.x) - 56, '💧 Mais firme!', '#0277bd'); });
    depois(2100, seguir);
  } else if (item.parada === 'bacterias') {
    // as bactérias boas comem as fibras (nhac!) e soltam brilhos de vitamina
    j.nhac = 2.2;
    for (let k = 0; k < 4; k++) depois(k * 300, () => { tocar([[520 + k * 60, 0.04, 'square'], [380, 0.04, 'square']]); texto(h.x - 30 + k * 20, piso(h.x) - 40 - k * 6, 'nhac!', '#2e7d32'); });
    depois(1300, () => { particulas(h.x, piso(h.x) - 20, '#ffb74d', 16, 70); texto(h.x, piso(h.x) - 70, '✨ Vitamina K!', '#e65100'); });
    depois(2300, seguir);
  } else if (item.parada === 'fibras') {
    j.rapido = true;
    tocar([[392, 0.08], [494, 0.08], [587, 0.12]]);
    texto(h.x, piso(h.x) - 56, '🥬 O caminho ficou mais fácil!', '#558b2f');
    depois(1700, seguir);
  } else if (item.tipo === 'grosso' && item.parada === 'saida') {
    // o reto e o ânus: abre devagarinho, a Sobrinha sai e... hora do banheiro!
    irPara(676, () => {
      j.anusAlvo = 2;
      tocar([[330, 0.08, 'sine'], [262, 0.12, 'sine']]);
      depois(700, () => irPara(FIM.grosso, () => {
        j.estado = 'fim';
        texto(720, 90, 'Hora do banheiro! 🚽', '#0277bd');
        emojiVoando(740, 140, '🚽');
        descarga();
        j.anusAlvo = 0;
        depois(1900, seguir);
      }));
    });
  } else if (item.parada === 'muco') {
    j.muco = 2.2;
    tocar([[440, 0.08], [554, 0.08], [659, 0.14]]);
    texto(h.x, piso(h.x) - 64, '🛡️ Muco!', '#6d6a3a');
    depois(1900, seguir);
  } else if (item.tipo === 'estomago') {
    // o estômago mistura tudo (vira quimo) e o piloro abre aos pouquinhos
    j.mistura = 2.4;
    tocar([[70, 0.35, 'sawtooth'], [62, 0.35, 'sawtooth']]);
    depois(1300, () => { h.quimo = true; particulas(h.x, piso(h.x) - 14, '#efe2b4', 14, 70); texto(h.x, piso(h.x) - 60, '🥣 Quimo!', '#8d6e00'); });
    depois(2500, () => {
      j.piloroAlvo = 1;
      tocar([[294, 0.1], [370, 0.1], [440, 0.16]]);
      irPara(FIM.estomago, seguir);
    });
  }
}

// o engano também acontece no cenário (sem perder nada: ele só volta para a parada)
function acaoErrada(item, op) {
  const j = jogo, h = j.heroi;
  if (item.tipo === 'dentes') j.marca = { grupo: op.id, t: 1.1 };
  else if (item.tipo === 'saliva') particulas(h.x, CHAO - 30, '#9e9e9e', 8, 50);
  else if (item.tipo === 'nutri') j.sabor = { cor: '#9e9e9e', t: 0.8 };
  else if (item.tipo === 'grosso' || item.tipo === 'fibras' || item.tipo === 'esofago' || item.tipo === 'intestino' || item.tipo === 'circulacao' || item.parada === 'quebra' || item.parada === 'suco') particulas(h.x, piso(h.x) - 30, '#9e9e9e', 8, 50);
  else if (item.parada === 'muco') {
    // sem a proteção certa, respingos de ácido pulam do lago
    for (let k = 0; k < 14; k++) j.part.push({ x: h.x + (Math.random() - 0.5) * 40, y: piso(h.x), vx: (Math.random() - 0.5) * 80, vy: -90 - Math.random() * 60, vida: 0.8, max: 0.8, cor: k % 2 ? '#c2d64a' : '#eef59a', tam: 3, g: 260 });
    tocar([[620, 0.05, 'square'], [520, 0.05, 'square']]);
  } else if (item.parada === 'saida' && item.tipo !== 'grosso') {
    // volta para a porta errada (cárdia ou esôfago) e o estômago devolve
    j.estado = 'esperando';
    irPara(op.id === 'cardia' ? 150 : 110, () => {
      texto(h.x, piso(h.x) - 56, op.id === 'cardia' ? 'Azia! 🔥' : 'Eca! Vômito não!', '#c62828');
      tocar([[160, 0.1, 'sawtooth'], [130, 0.12, 'sawtooth']]);
      h.susto = 0.8;
      irPara(PARA.saida, () => { if (j.estado === 'esperando' && j.tentativa === 2) j.estado = 'pergunta'; });
    });
  } else if (op.id === 'traqueia') {
    // vai em direção à traqueia e o ar empurra de volta: cof, cof!
    j.estado = 'esperando';
    irPara(EPI_X - 12, () => {
      texto(h.x, piso(h.x) - 60, 'Cof! Cof!', '#c62828');
      for (let k = 0; k < 14; k++) j.ar.push({ x: TRAQ[0] + Math.random() * 40, y: CHAO + 4, vx: -60 - Math.random() * 60, vy: -40 - Math.random() * 50, vida: 0.9 });
      tocar([[180, 0.08, 'sawtooth'], [150, 0.1, 'sawtooth']]);
      h.susto = 0.8;
      irPara(PARA.engolir, () => { if (j.estado === 'esperando' && j.tentativa === 2) j.estado = 'pergunta'; });
    });
  } else {
    // pula para o fundo do nariz e a úvula fecha o caminho
    j.estado = 'esperando';
    h.salto = { t: 0 };
    j.uvula = 1;
    depois(450, () => texto(h.x + 20, 40, 'Tum! Fechado.', '#8e24aa'));
    depois(900, () => { if (j.estado === 'esperando' && j.tentativa === 2) j.estado = 'pergunta'; });
  }
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
  const cv = $('dig-canvas');
  const w = cv.clientWidth || 320, h = cv.clientHeight || 200, dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const s = h / ALT;
  return { cv, g: cv.getContext('2d'), w, h, dpr, s, W: w / s };
}
// a glicose é velocista: depois do suco pancreático, ela anda mais rápido
const CORRENTE = { calma: 35, forte: 90 };   // a velocidade do sangue (pixels por segundo)
const velocidade = () => (jogo.heroi.vaso ? 2 * (jogo.fluxo > 0 ? CORRENTE.forte : CORRENTE.calma)
  : 78 * (jogo.combo >= 6 ? 1.5 : jogo.combo >= 3 ? 1.25 : 1) * (jogo.velocista ? 1.4 : 1) * (jogo.rapido ? 1.3 : 1));
// onde o nutriente pisa (unidades do mundo): a mesma língua pintada no cenário; fora da boca, o lábio de baixo
const piso = (x) => {
  const c = jogo.cena;
  if (c === 'frente') return x < 52 ? 184 : 2 * Math.round(linguaFrente(x / 2));
  if (c === 'fundo') return x >= EPI_X ? CHAO : 2 * Math.round(linguaFundo(x / 2));
  if (c === 'esofago') return R(2 * (ycEso(x / 2) + 11));
  if (c === 'duodeno') return R(2 * (ycDuo(x / 2) + 9));
  if (c === 'jejuno') return pisoJejuno();
  if (c === 'grosso') return pisoGrosso(x);
  return pisoEstomago(x);
};

function atualizar(dt, tela) {
  const j = jogo, h = j.heroi;
  if (j.mover) {
    const d = j.mover.x - h.x, passo = velocidade() * dt;
    if (Math.abs(d) <= passo) { h.x = j.mover.x; const f = j.mover.aoChegar; j.mover = null; if (f) f(); }
    else { h.x += Math.sign(d) * passo; h.passo += dt * 7; }
  }
  // troca de tela: escurece, troca no meio (com a tela escura) e clareia na tela nova
  if (j.transicao) {
    const tr = j.transicao;
    tr.t += dt / 1.8;
    if (tr.t >= 0.5 && !tr.trocou) {
      tr.trocou = true;
      j.cena = tr.cena; h.x = ENTRADA[tr.cena]; h.queda = null; j.cam = 0; j.gotas = []; j.bolhas = []; j.ar = []; j.bolhasLago = [];
      if (tr.cena === 'estomago') j.cardia = 1;
      if (tr.cena === 'grosso') virarSobrinha();
      tituloBarra();
      j.part = j.part.filter((p) => p.texto);
    }
    if (tr.t >= 1) { const f = tr.depois; j.transicao = null; f(); }
  }
  // a mordida: cada mordida fecha e abre a boca (0 → 1 → 0); no meio, o pedaço quebra
  if (j.mord) {
    const m = j.mord;
    m.t += dt / 0.42;
    const feitas = Math.floor(m.t);
    if (m.t - feitas >= 0.5 && m.mordidas === feitas && feitas < m.n) { m.mordidas++; m.aoMorder(); }
    if (m.t >= m.n) { const f = m.aoFim; j.mord = null; f(); }
  }
  if (h.salto) { h.salto.t += dt / 0.9; if (h.salto.t >= 1) h.salto = null; }
  if (h.queda) h.queda.t += dt;
  if (h.susto > 0) h.susto -= dt;
  if (h.feliz > 0) h.feliz -= dt;
  if (j.marca && (j.marca.t -= dt) <= 0) j.marca = null;
  if (j.sabor && (j.sabor.t -= dt) <= 0) j.sabor = null;
  if (j.saliva > 0) j.saliva -= dt;
  if (j.uvula > 0) j.uvula = Math.max(0, j.uvula - dt * 1.1);
  j.epi += (j.epiAlvo - j.epi) * Math.min(1, dt * 6);
  if (j.cena === 'fundo') {
    // saliva: as glândulas pingam sempre; na parada da saliva, vira cachoeira em cima do nutriente
    GLANDULAS.forEach((gx) => {
      const forte = j.saliva > 0;
      if (Math.random() < (forte ? 0.9 : 0.12)) {
        const alvo = forte ? h.x + (Math.random() - 0.5) * 30 : gx;
        j.gotas.push({ x: gx + (Math.random() - 0.5) * 6, y: palatoMole(gx) + 14, vx: (alvo - gx) * (forte ? 1.6 : 0) + (Math.random() - 0.5) * 8, vy: 20 + Math.random() * 30 });
      }
    });
    // o ar subindo e descendo pela traqueia enquanto a epiglote está aberta
    if (j.epi < 0.5 && Math.random() < 0.15) j.ar.push({ x: TRAQ[0] + 6 + Math.random() * 30, y: ALT, vx: (Math.random() - 0.5) * 10, vy: -35 - Math.random() * 20, vida: 1.4 });
  }
  // sons do corpo por dentro: no esôfago, o coração batendo ao lado (tum-tum); no estômago, roncos e bolhas;
  // na boca, a saliva pingando. São curtos e baixos, para não atrapalhar a leitura.
  j.somT -= dt;
  if (j.somT <= 0 && !j.transicao) {
    if (j.cena === 'esofago') { tocar([[82, 0.11], [64, 0.15]]); j.batida = 0.22; j.somT = 0.9; }
    else if (j.cena === 'estomago') {
      const f = 95 + Math.random() * 70;
      tocar(Math.random() < 0.5 ? [[f, 0.09], [f * 0.75, 0.12], [f * 1.15, 0.07], [f * 0.6, 0.14]] : [[420 + Math.random() * 200, 0.05, 'sine'], [620 + Math.random() * 200, 0.04, 'sine']]);
      j.somT = 0.9 + Math.random() * 1.8;
    } else if (j.cena === 'duodeno') { tocar([[760 + Math.random() * 260, 0.04, 'sine'], [560 + Math.random() * 120, 0.05, 'sine']]); j.somT = 0.8 + Math.random() * 1.4; }
    else if (j.cena === 'jejuno') { tocar([[78, 0.1], [60, 0.14]]); j.somT = j.fluxo > 0 ? 0.45 : 0.9; }
    else if (j.cena === 'grosso') { const f = 70 + Math.random() * 40; tocar([[f, 0.14], [f * 0.85, 0.18], [f * 1.1, 0.1]]); j.somT = 1.6 + Math.random() * 2; }
    else { tocar([[1250 + Math.random() * 450, 0.05, 'sine']]); j.somT = 1.6 + Math.random() * 2.4; }
  }
  if (j.batida > 0) j.batida -= dt;
  if (j.cena === 'duodeno') {
    // a bile (verde) e o suco pancreático (claro) pingam no duodeno pelos canais
    if (Math.random() < (j.bile > 0 ? 0.7 : 0.05)) j.gotas.push({ x: 244 + (Math.random() - 0.5) * 6, y: 140, vx: (Math.random() - 0.5) * 30, vy: 10, cor: '#7cb342' });
    if (Math.random() < (j.pancreas > 0 ? 0.7 : 0.05)) j.gotas.push({ x: 250 + (Math.random() - 0.5) * 6, y: 140, vx: (Math.random() - 0.5) * 30, vy: 10, cor: '#fff6dc' });
  }
  if (j.bile > 0) j.bile -= dt;
  if (j.pancreas > 0) j.pancreas -= dt;
  if (j.fluxo > 0) j.fluxo -= dt;
  if (j.cena === 'jejuno') {
    if (!j.celulas.length) for (let k = 0; k < 46; k++) j.celulas.push({ x: Math.random() * LARG_ARTE, y: 91 + Math.floor(Math.random() * 9), v: 0.85 + Math.random() * 0.3 });
    j.celulas.forEach((c) => { c.x = (c.x + c.v * dt * (j.fluxo > 0 ? CORRENTE.forte : CORRENTE.calma)) % LARG_ARTE; });
  }
  if (j.cena === 'grosso') {
    // gotinhas de água boiando; a parede (esponja) puxa: na resposta certa, todas voam para a parede
    if (j.aguas.length < 10 && Math.random() < 0.04) j.aguas.push({ x: j.cam + Math.random() * tela.W, y: 2 * (ycGro((j.cam + Math.random() * tela.W) / 2) - 10 + Math.random() * 20), vx: 0, vy: 0 });
    j.aguas.forEach((a) => {
      const yc = 2 * ycGro(a.x / 2), alvo = a.y < yc ? yc - 2 * raioGro(a.x / 2) : yc + 2 * raioGro(a.x / 2);
      a.vy += ((alvo - a.y) * (j.puxa > 0 ? 3 : 0.15)) * dt; a.vy *= 0.96; a.y += a.vy * dt; a.x += Math.sin(j.t + a.y) * dt * 4;
      a.some = Math.abs(alvo - a.y) < 6;
    });
    j.aguas = j.aguas.filter((a) => !a.some);
  }
  if (j.puxa > 0) j.puxa -= dt;
  if (j.nhac > 0) j.nhac -= dt;
  j.anus += (j.anusAlvo - j.anus) * Math.min(1, dt * 3);
  if (h.mergulho) { h.mergulho.t += dt / 2; if (h.mergulho.t >= 1) h.mergulho.fim(); }
  if (h.rastro === 'glicose' && Math.random() < 0.5) j.part.push({ x: h.x - 10 + (Math.random() - 0.5) * 8, y: piso(h.x) - 6 - Math.random() * 14, vx: -20, vy: -6, vida: 0.5, max: 0.5, cor: Math.random() < 0.5 ? '#ffe066' : '#fff8c4', tam: 2, g: 0 });
  if (j.cena === 'esofago') {
    // uma onda fraquinha passa de vez em quando (o esôfago está vivo); a cárdia abre quando o bolo chega perto
    j.ondaAmb = (j.ondaAmb + dt * 110) % 700;
    if (h.x > 300) j.cardiaAlvo = 1;
  }
  if (j.cena === 'estomago') {
    // o suco gástrico pinga das glândulas da parede; bolhas sobem no lago
    GLAND_EST.forEach((gx) => {
      if (Math.random() < 0.06) j.gotas.push({ x: gx * 2 + (Math.random() - 0.5) * 6, y: 2 * (topoEstomago(gx) + 4), vx: 0, vy: 10, acido: true });
    });
    if (Math.random() < (j.lagoBrilho > 0 || j.mistura > 0 ? 0.6 : 0.12)) j.bolhasLago.push({ x: 50 + Math.random() * 440, y: 214, vy: -14 - Math.random() * 20 });
    j.bolhasLago.forEach((bo) => { bo.y += bo.vy * dt; });
    j.bolhasLago = j.bolhasLago.filter((bo) => bo.y > 2 * nivelLago(bo.x / 2) + 2);
    if (h.x > 110) j.cardia = Math.max(0, j.cardia - dt * 2);
  }
  j.cardia += (j.cardiaAlvo - j.cardia) * Math.min(1, dt * 4) * (j.cena === 'esofago' ? 1 : 0);
  j.piloro += (j.piloroAlvo - j.piloro) * Math.min(1, dt * 3);
  if (j.lagoBrilho > 0) j.lagoBrilho -= dt;
  if (j.mistura > 0) j.mistura = Math.max(0, j.mistura - dt);
  if (j.muco > 0) j.muco -= dt;
  j.gotas.forEach((d) => { d.vy += 320 * dt; d.x += d.vx * dt; d.y += d.vy * dt; });
  j.gotas = j.gotas.filter((d) => {
    const chao = d.acido ? 2 * nivelLago(d.x / 2) : piso(d.x);
    if (d.y < chao - 2) return true;
    if (d.acido) return false;
    if (Math.random() < 0.3) j.part.push({ x: d.x, y: piso(d.x) - 2, vx: (Math.random() - 0.5) * 50, vy: -40, vida: 0.3, max: 0.3, cor: '#cdeeff', tam: 2, g: 300 });
    return false;
  });
  j.ar.forEach((a) => { a.x += a.vx * dt; a.y += a.vy * dt; a.vida -= dt; });
  j.ar = j.ar.filter((a) => a.vida > 0);
  if ((j.cena === 'frente' || j.cena === 'fundo') && j.bolhas.length < 12 && Math.random() < 0.05) j.bolhas.push({ x: j.cam + 60 + Math.random() * tela.W, y: CHAO - 10, r: 1.5 + Math.random() * 2.5, f: Math.random() * 6 });
  j.bolhas.forEach((b) => { b.y -= dt * (8 + b.r * 3); b.x += Math.sin(j.t * 2 + b.f) * dt * 6; });
  j.bolhas = j.bolhas.filter((b) => b.y > 60);
  // as faíscas do amido (a amilase está quebrando o amido aos pouquinhos)
  if (h.brilho && Math.random() < 0.25) j.part.push({ x: h.x + (Math.random() - 0.5) * 20, y: piso(h.x) - 8 - Math.random() * 18, vx: 0, vy: -18, vida: 0.6, max: 0.6, cor: Math.random() < 0.5 ? '#ffe082' : '#fff8c4', tam: 2, g: 0 });
  j.part = j.part.filter((p) => (p.vida -= dt) > 0);
  j.part.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; });
  const alvoCam = Math.max(0, Math.min(FIM[j.cena] - tela.W, h.x - tela.W * 0.35));
  j.cam += (alvoCam - j.cam) * Math.min(1, dt * 5);
}

// ============ desenho ============
// Regras de arte (skill arte-pixel-cenarios): uma grade de pixel só. O quadro inteiro é desenhado num canvas pequeno
// (1 pixel = 2 unidades do mundo) e ampliado sem suavizar; as etiquetas e o mini-mapa vão por cima, nítidos.
// O cenário de cada tela é pintado uma vez, pixel a pixel, com paleta em rampas (sombra puxando para o roxo, luz para o
// amarelo), dithering Bayer 4x4 nos degradês e contorno de 1 pixel: escuro onde a parte encosta num vazio e claro na
// borda virada para cima (a luz vem de cima e da boca). Cada forma é uma parte de verdade do corte (nada de enfeite).
// Camadas: fundo (os vazios: a boca por dentro, o nariz e o ar de fora), os dentes de baixo, a frente (tudo o que é
// sólido no corte: rosto, osso, língua, céu da boca, tubos) e, por cima, o nutriente, os dentes de cima, a úvula, a
// epiglote e a saliva.
const LARG_ARTE = 480, ALT_ARTE = ALT / 2;   // o cenário pintado (pixels); cobre até telas bem largas
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const RAMPA = {
  ar: ['#a9d8ef', '#c4e6f6', '#def2fb', '#eef9fd'],
  pele: ['#9a5f45', '#c98a62', '#eab389', '#f8d6b0'],
  labio: ['#8e2f4a', '#bb4b62', '#df6f80', '#f49aa5'],
  tecido: ['#8c4f5c', '#b0737a', '#d0968f', '#e9b8a8'],
  osso: ['#8f7a5c', '#bba57e', '#dfcca4', '#f6ebd0'],
  boca: ['#22070f', '#36091a', '#4c1126', '#641a33', '#7e2642', '#9b3a55', '#b9566c'],
  nariz: ['#2c0a16', '#46122a', '#65203d', '#86344f'],
  mucosa: ['#7c2a46', '#a9445f', '#d0647c', '#ee90a5', '#ffc4cf'],
  lingua: ['#7e2846', '#ad425f', '#d45f7b', '#f0849b', '#ffb3c2'],
  glandula: ['#a65a6c', '#d08896', '#efb5bd', '#fde0e0'],
  traqueia: ['#0d0a18', '#1c1630', '#2e2648', '#453a63'],
  cartilagem: ['#8f8499', '#c3b9cc', '#ece6f0'],
  esofago: ['#4a0f22', '#6e1b36', '#94304c', '#b84b65'],
  luzEso: ['#1c050c', '#2d0a16', '#431223', '#5c1b31', '#77283f'],
  luzEst: ['#110a0e', '#1d1016', '#2b1a1d', '#3a2a22', '#4c3d26', '#63562c', '#7d7232'],
  musculo: ['#5e1626', '#8a2338', '#b23a4c', '#d65f6a'],
  coracao: ['#4d0c18', '#7a1424', '#a8243a', '#d14858'],
  gordura: ['#9c7f45', '#c4a663', '#e2cc8f', '#f5e9c0'],
  serosa: ['#b98378', '#dcae9f', '#f2d3c5'],
  muco: ['#bdb68e', '#e4dfbd', '#fbf8e4'],
  intestino: ['#8f4152', '#b9687a', '#dc919d', '#f2bcc2'],
  acido: ['#33400c', '#566a18', '#83992a', '#b5cc46', '#e6f08e'],
  luzInt: ['#140c06', '#22140a', '#33200f', '#463014', '#5c431c'],
  figado: ['#4a1a14', '#73291f', '#9c3d2c', '#c25a42'],
  vesicula: ['#2f5a1e', '#4f8a2c', '#7cb342', '#b5e07a'],
  pancreas: ['#9c7a4a', '#c9a36a', '#e6c88f', '#f6e2b6'],
  linfa: ['#cbb88a', '#efe0b8', '#fff6dc'],
  sangue: ['#3e050d', '#5c0a15', '#7a111e'],
  luzGro: ['#120d06', '#1f170a', '#2f2410', '#413418', '#574722'],
  peleRosa: ['#c9787f', '#e7a3a3', '#f6c6c2', '#fde4df'],
};
const VAZIO = new Set(['ar', 'boca', 'nariz', 'luz', 'luzE']);
// a cor de uma rampa para um valor de 0 (sombra) a 1 (luz), com o pontilhado Bayer entre dois tons vizinhos
function tom(rampa, t, x, y) {
  const n = rampa.length - 1, v = Math.max(0, Math.min(1, t)) * n, i = Math.floor(v);
  return rampa[Math.min(n, i + (v - i > BAYER[(y & 3) * 4 + (x & 3)] ? 1 : 0))];
}
// ruído fixo por pixel (a mesma textura sempre)
function ruido(x, y) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
const linear = (pts, y) => {
  for (let k = 1; k < pts.length; k++) if (y <= pts[k][0]) { const [y0, x0] = pts[k - 1], [y1, x1] = pts[k]; return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0 || 1); }
  return pts[pts.length - 1][1];
};

// ---------- tela 1: a frente da boca (em pixels) ----------
// o perfil do rosto, de cima para baixo: [y, x] (testa, nariz, pele embaixo do nariz, lábio de cima; lábio de baixo, queixo)
const PERFIL_CIMA = [[0, 10], [6, 8], [11, 5], [15, 1], [18, 0], [21, 1], [23, 4], [25, 9], [27, 13], [31, 12], [40, 10], [46, 8], [50, 6], [56, 6], [61, 8], [64, 12]];
const PERFIL_BAIXO = [[92, 13], [94, 9], [97, 7], [100, 7], [102, 9], [104, 12], [107, 11], [110, 10]];
// a superfície da língua: a ponta perto dos lábios e a cúpula
const linguaFrente = (x) => (x < 26 ? 999 : x < 60 ? 96 - 26 * Math.sin((Math.PI / 2) * ((x - 26) / 34)) : 70 - 4 * Math.sin(Math.PI * Math.min(1, (x - 60) / 160)));
function classeFrente(x, y) {
  if (y <= 64 || y >= 92) {
    const p = linear(y <= 64 ? PERFIL_CIMA : PERFIL_BAIXO, y), labio = (y >= 47 && y <= 64) || (y >= 92 && y <= 100);
    if (x < p) return 'ar';
    if (x < p + (labio ? 5 : 2)) return labio ? 'labio' : 'pele';
  } else if (x < 14) return 'ar';
  if (y < 15) {
    if (y >= 1 && y <= 7 && x >= 22) return 'nariz';
    if (y >= 8 && y <= 11 && x >= 18) return 'osso';
    if (y >= 12 && x >= 24) return 'mucosa';
    return 'tecido';
  }
  if (y <= 64 && x < 32) return x >= 30 ? 'mucosa' : 'tecido';
  if (y <= 17 && x >= 42 && x <= 154) return 'gengiva';
  if (y >= 101) return y >= 102 && y <= 108 && x >= 14 ? 'osso' : 'tecido';
  if (y >= 92 && x < 28) return x >= 26 ? 'mucosa' : 'tecido';
  if (y >= linguaFrente(x)) return 'lingua';
  return 'boca';
}

// ---------- tela 2: o fundo da boca e a garganta (em pixels) ----------
const linguaFundo = (x) => (x < 190 ? 72 + 19 * (x / 190) ** 2 : 91);   // a base da língua descendo até a epiglote
const pmPx = (x) => 11 + 0.07 * Math.min(x, UVULA_X / 2);   // a borda de baixo do céu da boca mole
function classeFundo(x, y) {
  const P = PAREDE / 2, EX = EPI_X / 2, T0 = TRAQ[0] / 2, T1 = TRAQ[1] / 2, E0 = ESOF[0] / 2, E1 = ESOF[1] / 2;
  if (x >= P) {
    if (x < P + 3) return 'mucosa';
    if (x >= P + 9 && x < P + 31) return y % 14 < 11 ? 'osso' : 'disco';   // as vértebras da coluna
    return 'tecido';
  }
  if (y >= 91 || (x < EX - 1 && y >= linguaFundo(x))) {
    if (x < EX - 1) {
      if (y >= linguaFundo(x) && y <= 100) return 'lingua';
      if (y < linguaFundo(x)) return 'boca';
      return ((x - 178) / 9) ** 2 + ((y - 104) / 2.5) ** 2 <= 1 ? 'osso' : 'tecido';   // o osso hioide
    }
    if (x >= T0 && x < T1) return x < T0 + 2 || x >= T1 - 2 ? ((y - 91) % 5 < 3 ? 'cartilagem' : 'tecido') : 'traqueia';
    if (x >= E0 && x < E1) return 'esofago';
    return 'tecido';
  }
  const pm = pmPx(x);
  if (x < UVULA_X / 2) {
    if (y < pm - 7) return 'nariz';
    if (y < pm) return 'mucosa';
  } else if (y < 23) return 'nariz';
  // as glândulas salivares: cachinhos presos embaixo do céu da boca
  for (const gw of GLANDULAS) {
    const cx = gw / 2, cy = pmPx(cx) + 3;
    if ((x - cx) ** 2 + (y - cy) ** 2 <= 16 || (x - cx - 4) ** 2 + (y - cy + 1) ** 2 <= 6 || (x - cx + 4) ** 2 + (y - cy + 1) ** 2 <= 6) return 'glandula';
  }
  return 'boca';
}

// ---------- tela 3: o esôfago (em pixels) ----------
// um tubo de músculo descendo em diagonal; na frente (à esquerda), o coração; embaixo, o diafragma; no fim, a cárdia
// e o começo do estômago
const ycEso = (x) => 12 + x * 0.4;   // o meio do tubo
const diafragma = (x) => 78 + ((x - 80) / 160) ** 2 * 16;
function classeEsofago(x, y) {
  const dy = Math.abs(y - ycEso(x));
  if (x < 206) {
    if (dy <= 11) return 'luz';
    if (dy <= 12) return 'mucosa';
    if (dy <= 17) return 'musculo';
  } else if (((x - 246) / 44) ** 2 + ((y - 100) / 24) ** 2 <= 1) return 'luzE';
  else if (((x - 246) / 50) ** 2 + ((y - 100) / 30) ** 2 <= 1) return 'musculo';
  const d = diafragma(x);
  if (y >= d && y < d + 6) return 'musculo';
  return y >= d + 6 ? 'gordura' : 'tecido';
}

// ---------- tela 4: o estômago (em pixels) ----------
// a caverna em "J": o corpo (à esquerda), o antro subindo para a direita e o canal do piloro; em cima, a chegada do
// esôfago pela cárdia. A parede tem camadas (muco, mucosa com pregas, músculo e a capa de fora), calculadas pela
// distância de cada pixel até a borda do vazio de dentro.
function dentroEstomago(x, y) {
  if (((x - 105) / 88) ** 2 + ((y - 60) / 38) ** 2 <= 1) return true;
  if (((x - 205) / 62) ** 2 + ((y + (x - 205) * 0.2 - 74) / 22) ** 2 <= 1) return true;
  if (x >= 255 && x <= 302 && Math.abs(y - 60) <= 5) return true;   // o canal do piloro
  if (x > 300 && Math.abs(y - (60 + (x - 300) * 0.7)) <= 6) return true;   // o começo do intestino
  return x >= -2 && x <= 52 && Math.abs(y - (x * 0.62 + 2)) <= 6;   // a chegada do esôfago
}
const topoEstomago = (x) => 60 - 38 * Math.sqrt(Math.max(0, 1 - ((x - 105) / 88) ** 2));
let mapaEstomago = null;
function prepararEstomago() {
  if (mapaEstomago) return;
  const W = LARG_ARTE, H = ALT_ARTE, N = W * H, dentro = new Uint8Array(N), dist = new Uint8Array(N).fill(255), fila = [];
  const viz = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let i = 0; i < N; i++) dentro[i] = dentroEstomago(i % W, (i / W) | 0) ? 1 : 0;
  for (let i = 0; i < N; i++) {
    const x = i % W, y = (i / W) | 0;
    if (viz.some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < W && Y < H && dentro[Y * W + X] !== dentro[i]; })) { dist[i] = 1; fila.push(i); }
  }
  for (let k = 0; k < fila.length; k++) {
    const i = fila[k], x = i % W, y = (i / W) | 0;
    if (dist[i] >= 9) continue;
    viz.forEach(([dx, dy]) => {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= W || Y >= H) return;
      const v = Y * W + X;
      if (dentro[v] === dentro[i] && dist[v] === 255) { dist[v] = dist[i] + 1; fila.push(v); }
    });
  }
  mapaEstomago = { dentro, dist, W };
}
function classeEstomago(x, y) {
  if (x < 0 || y < 0 || x >= LARG_ARTE || y >= ALT_ARTE) return 'gordura';
  const m = mapaEstomago, i = y * m.W + x, d = m.dist[i];
  if (m.dentro[i]) {
    if (d <= 3 && x > 40 && x < 256 && Math.sin(x * 0.55 + y * 0.22) > 0.4) return 'ruga';   // as pregas da parede
    return d === 1 ? 'muco' : 'luz';
  }
  if (d <= 2) return 'mucosa';
  if (d <= 6) return 'musculo';
  if (d <= 7) return 'serosa';
  if (y < 6 + ((x - 150) / 220) ** 2 * 10) return 'musculo';   // o diafragma, em cima
  return y > 103 ? 'intestino' : 'gordura';
}

// ---------- tela 5: o duodeno (em pixels) ----------
// o tubo em "C" (aqui, um "U") contornando o pâncreas; em cima, o fígado e a vesícula; os dois canais, o da bile e o do
// pâncreas, chegam juntos no fundo do "U"
const ycDuo = (x) => 34 + 46 * Math.sin(Math.PI * Math.max(0, Math.min(1, x / 250)));
const AMPOLA = [122, 64];   // onde os dois canais chegam na parede do duodeno (pixels)
function pertoDoSegmento(x, y, x1, y1, x2, y2, r) {
  const dx = x2 - x1, dy = y2 - y1, k = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return (x - x1 - k * dx) ** 2 + (y - y1 - k * dy) ** 2 <= r * r;
}
function classeDuodeno(x, y) {
  const dy = Math.abs(y - ycDuo(x));
  if (dy <= 10) return 'luz';
  if (dy <= 11) return 'mucosa';
  if (dy <= 16) return 'musculo';
  if (y < 20 + 5 * Math.sin(x * 0.035) && x < 236) return 'figado';
  if (((x - 66) / 9) ** 2 + ((y - 28) / 7) ** 2 <= 1) return 'vesicula';
  if (pertoDoSegmento(x, y, 70, 34, AMPOLA[0], AMPOLA[1], 1.6)) return 'ducto';
  if (pertoDoSegmento(x, y, 186, 50, AMPOLA[0] + 2, AMPOLA[1], 1.6)) return 'ductoP';
  if (((x - 128) / 64) ** 2 + ((y - 46) / 13) ** 2 <= 1 + 0.12 * Math.sin(x * 0.5) * Math.sin(y * 0.7)) return 'pancreas';
  return 'gordura';
}

// ---------- tela 6: o intestino delgado (em pixels) ----------
// o tubo deitado: em cima, a parede; embaixo, a parede com as vilosidades (desenhadas no quadro, balançando) e, mais
// fundo, o vaso linfático (branco) e o vaso de sangue (com o sangue correndo)
const VILO_BASE = 72, VILO_TOPO = 42;
function classeJejuno(x, y) {
  if (y < 5) return 'musculo';
  if (y < 9) return 'mucosa';
  if (y < VILO_BASE) return 'luz';
  if (y < 76) return 'mucosa';
  if (y < 78) return 'tecido';
  if (y < 86) return 'linfa';
  if (y < 88) return 'tecido';
  if (y < 90 || y >= 102) return 'musculo';
  return 'sangue';
}

// ---------- tela 7: o intestino grosso (em pixels) ----------
// um tubo largo, com as bolsinhas da parede (haustros). Começa no ceco (um fundo de saco, com o apêndice pendurado
// embaixo), onde chega o fim do intestino delgado; termina no reto, que afina até o ânus (o anel rosado, desenhado à
// parte) e, depois dele, o lado de fora.
const ycGro = (x) => (x < 280 ? 55 : 55 + (x - 280) * 0.25);
const raioGro = (x) => (x < 280 ? 24 + 4 * Math.abs(Math.sin((Math.PI * x) / 28)) : Math.max(8, 26 - (x - 280) * 0.26));
const dentroGro = (x, y, e) => {
  const yc = ycGro(x), r = raioGro(x) + e;
  return x < 14 ? ((x - 14) / (8 + e)) ** 2 + ((y - yc) / r) ** 2 <= 1 : Math.abs(y - yc) <= r;
};
function classeGrosso(x, y) {
  if (x >= 358) return 'ar';
  if (x >= 352) return Math.abs(y - ycGro(352)) <= 6 ? 'luz' : 'peleRosa';
  if (x < 16 && Math.abs(y - 42) <= 5) return 'luz';   // a chegada do intestino delgado
  if (dentroGro(x, y, 0)) return 'luz';
  if (x < 16 && Math.abs(y - 42) <= 8) return 'musculo';
  if (dentroGro(x, y, 1)) return 'mucosa';
  if (dentroGro(x, y, 6)) return 'musculo';
  if (pertoDoSegmento(x, y, 17, 82, 7, 104, 1.4)) return 'luz';   // o apêndice
  if (pertoDoSegmento(x, y, 17, 82, 7, 104, 3.6)) return 'musculo';
  return y > 100 ? 'tecido' : 'gordura';
}
// onde a Sobrinha fica (mundo): chega pelo intestino delgado, desce no ceco, segue pelo chão do tubo e afunila no reto
function pisoGrosso(x) {
  const xp = x / 2, chao = (v) => 2 * (ycGro(v) + (v < 280 ? 18 : Math.min(18, raioGro(v) - 1)));
  if (xp < 12) return 2 * 47;
  if (xp < 30) return 2 * 47 + (chao(30) - 2 * 47) * ((xp - 12) / 18);
  return R(chao(Math.min(xp, 356)));
}

// a cor de cada pixel: o material, a luz (de cima e da entrada da boca) e o contorno
function corDoPixel(cena, classe, x, y) {
  const k = classe(x, y);
  const frente = cena === 'frente';
  if (k === 'ar') return tom(RAMPA.ar, 0.95 - y / 130, x, y);
  if (k === 'boca') {
    let t = frente ? 0.8 - x / 290 : 0.52 - x / 620;
    t += 0.05 * Math.sin(x * 0.12 + 2 * Math.sin(y * 0.05));   // as dobras da bochecha, por dentro (suaves)
    t -= 0.3 * Math.max(0, 1 - (y - 15) / 22);                   // sombra embaixo do céu da boca
    t -= 0.12 * Math.max(0, (y - 50) / 40);
    if (frente && x < 44) t += (44 - x) / 70;                    // a luz entrando pela boca
    return tom(RAMPA.boca, t, x, y);
  }
  if (k === 'luz' || k === 'luzE') {
    if (cena === 'esofago' && k === 'luz') return tom(RAMPA.luzEso, 0.85 - Math.abs(y - ycEso(x)) / 13, x, y);
    if (cena === 'duodeno') return tom(RAMPA.luzInt, 0.85 - Math.abs(y - ycDuo(x)) / 12, x, y);
    if (cena === 'grosso') return tom(RAMPA.luzGro, 0.8 - Math.abs(y - ycGro(x)) / 36 + 0.05 * Math.sin(x * 0.08), x, y);
    if (cena === 'jejuno') return tom(RAMPA.luzInt, 0.25 + Math.max(0, (y - 9) / 63) * 0.55 + 0.05 * Math.sin(x * 0.07), x, y);
    // estômago: escuro, iluminado de baixo pelo brilho esverdeado do lago de ácido
    const perto = Math.max(0, 1 - Math.abs(80 - y) / 36);
    return tom(RAMPA.luzEst, 0.1 + perto * 0.75 + 0.05 * Math.sin(x * 0.09 + y * 0.06), x, y);
  }
  if (k === 'nariz') return tom(RAMPA.nariz, (frente ? 0.4 : 0.25) + 0.3 * Math.sin(x * 0.22) * Math.cos(y * 0.8) - (frente ? 0 : Math.max(0, (x - 150) / 300)), x, y);
  // borda: em cima pega luz; nos outros lados, contorno escuro
  const vazioEm = (dx, dy) => VAZIO.has(classe(x + dx, y + dy));
  const luzCima = vazioEm(0, -1), contorno = luzCima || vazioEm(1, 0) || vazioEm(-1, 0) || vazioEm(0, 1);
  const r = ruido(x, y);
  switch (k) {
    case 'pele': return tom(RAMPA.pele, vazioEm(-1, 0) || luzCima ? 1 : 0.667, x, y);
    case 'labio': return tom(RAMPA.labio, luzCima || vazioEm(-1, 0) ? 1 : contorno ? 0 : y === 52 || y === 95 ? 1 : 0.667, x, y);
    case 'osso': {
      const cortical = classe(x, y - 1) !== 'osso' || classe(x, y + 1) !== 'osso';
      return tom(RAMPA.osso, cortical ? (classe(x, y - 1) !== 'osso' ? 1 : 0.333) : r < 0.06 ? 0.333 : 0.667, x, y);
    }
    case 'disco': return tom(RAMPA.tecido, 1, x, y);
    case 'mucosa': case 'gengiva': {
      const base = k === 'gengiva' ? 0.25 : 0.5;
      return tom(RAMPA.mucosa, luzCima ? 0.75 : contorno ? 0 : r < 0.03 ? 1 : base, x, y);
    }
    case 'lingua': {
      const d = y - (frente ? linguaFrente(x) : linguaFundo(x));
      let t = d < 1 ? 1 : d < 2 ? 0.8 : 0.72 - Math.min(1, d / 22) * 0.62;
      if (d > 6 && y % 4 === 0) t -= 0.07;   // as fibras do músculo da língua
      t += frente ? (1 - x / 215) * 0.12 : 0.04;
      if (d >= 2 && d <= 7 && r < 0.07) t += 0.3;   // as papilas (pontinhos)
      return tom(RAMPA.lingua, t, x, y);
    }
    case 'glandula': return tom(RAMPA.glandula, luzCima ? 1 : contorno ? 0 : r < 0.25 ? 0.333 : 0.667, x, y);
    case 'traqueia': return tom(RAMPA.traqueia, 0.15 + 0.6 * Math.max(0, 1 - (y - 91) / 16), x, y);
    case 'cartilagem': return tom(RAMPA.cartilagem, 0.7 - (y - 91) / 60, x, y);
    case 'esofago': return tom(RAMPA.esofago, y < 93 ? 0.85 : 0.35 + 0.3 * Math.sin(x * 1.4) - (y - 93) / 60, x, y);
    case 'musculo': return tom(RAMPA.musculo, contorno ? (luzCima ? 1 : 0) : Math.floor((x + y * 0.6) / 2) % 3 === 0 ? 0.333 : 0.667, x, y);
    case 'coracao': return tom(RAMPA.coracao, luzCima ? 1 : contorno ? 0 : 0.95 - ((y - 46) / 32) * 0.75 - Math.max(0, (x - 40) / 60) * 0.2, x, y);   // volume: luz em cima
    case 'gordura': return tom(RAMPA.gordura, r < 0.1 ? 0.333 : 0.667, x, y);
    case 'serosa': return tom(RAMPA.serosa, 0.5, x, y);
    case 'muco': return tom(RAMPA.muco, r < 0.3 ? 1 : 0.5, x, y);
    case 'ruga': return tom(RAMPA.mucosa, luzCima ? 0.75 : contorno ? 0 : 0.5, x, y);
    case 'figado': return tom(RAMPA.figado, luzCima ? 1 : r < 0.08 ? 0.333 : 0.667 - Math.max(0, (y - 10) / 40), x, y);
    case 'vesicula': return tom(RAMPA.vesicula, (x - 62) ** 2 + (y - 25) ** 2 <= 4 ? 1 : 0.667 - (y - 21) / 30, x, y);
    case 'ducto': return tom(RAMPA.vesicula, 0.85, x, y);
    case 'ductoP': return tom(RAMPA.linfa, 0.5, x, y);
    case 'pancreas': return tom(RAMPA.pancreas, Math.sin(x * 0.6) * Math.sin(y * 0.8) > 0.35 ? 0.333 : r < 0.1 ? 1 : 0.667, x, y);
    case 'linfa': return tom(RAMPA.linfa, y === 78 ? 1 : y === 85 ? 0 : 0.5, x, y);
    case 'peleRosa': return tom(RAMPA.peleRosa, vazioEm(1, 0) ? 1 : 0.667, x, y);
    case 'sangue': return tom(RAMPA.sangue, 0.3 + (y - 90) / 24, x, y);
    case 'intestino': return tom(RAMPA.intestino, Math.sin(x * 0.35) * Math.sin(y * 0.6) > 0.2 ? 0.333 : 0.667, x, y);
    default: return tom(RAMPA.tecido, contorno ? (luzCima ? 1 : 0) : r < 0.04 ? 0.333 : 0.667, x, y);
  }
}

// pinta as duas camadas de uma tela (uma vez só; fica guardado)
const camadasProntas = {};
function camadas(cena) {
  if (camadasProntas[cena]) return camadasProntas[cena];
  if (cena === 'estomago') prepararEstomago();
  const classe = { frente: classeFrente, fundo: classeFundo, esofago: classeEsofago, estomago: classeEstomago, duodeno: classeDuodeno, jejuno: classeJejuno, grosso: classeGrosso }[cena];
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

// quanto as mandíbulas estão fechadas agora (0 = aberta, 1 = mordendo)
const fechada = () => (jogo.mord ? (1 - Math.cos((jogo.mord.t % 1) * Math.PI * 2)) / 2 : 0);
const alturaHeroi = () => ({ g: 26, m: 21, p: 17, mini: 13 }[jogo.heroi.tam] * 2);
const palatoMole = (x) => 2 * pmPx(x / 2);   // a borda de baixo do céu da boca mole, em unidades do mundo

let quadroPx = null;   // o quadro em pixels (resolução nativa), ampliado depois
function desenhar(tela) {
  const { g, dpr, s, W } = tela, j = jogo;
  const lw = Math.ceil(W / 2) + 1;
  if (!quadroPx) quadroPx = document.createElement('canvas');
  if (quadroPx.width !== lw || quadroPx.height !== ALT_ARTE) { quadroPx.width = lw; quadroPx.height = ALT_ARTE; }
  const b = quadroPx.getContext('2d');
  const camPx = Math.round(j.cam / 2) + (j.mistura > 0 ? Math.round(Math.sin(j.t * 38)) : 0), arte = camadas(j.cena);   // o estômago mistura: a tela treme
  const pixels = () => b.setTransform(1, 0, 0, 1, 0, 0);
  const mundo = () => b.setTransform(0.5, 0, 0, 0.5, -camPx, 0);
  pixels();
  b.imageSmoothingEnabled = false;
  b.clearRect(0, 0, lw, ALT_ARTE);
  b.drawImage(arte.fundo, -camPx, 0);
  if (j.cena === 'frente') {
    mundo(); dentes(b, false);
    pixels(); b.drawImage(arte.frente, -camPx, 0);
    mundo(); desenharHeroi(b); dentes(b, true);
  } else if (j.cena === 'esofago') {
    pixels(); b.drawImage(arte.frente, -camPx, 0);
    coracao(b, camPx);
    mundo(); ondaPeristaltica(b); cardia(b, 402, 2 * ycEso(201), 22); desenharHeroi(b);
  } else if (j.cena === 'estomago') {
    pixels(); lago(b, camPx, lw); b.drawImage(arte.frente, -camPx, 0);
    mundo();
    cardia(b, 72, 2 * (0.62 * 36 + 2), 12);
    piloro(b);
    j.gotas.forEach((d) => { bloco(b, d.x, d.y, 2, 4, '#c2d64a'); });
    desenharHeroi(b);
    escudoMuco(b);
    pixels(); laminaLago(b, camPx);
  } else if (j.cena === 'duodeno') {
    pixels(); b.drawImage(arte.frente, -camPx, 0);
    mundo();
    canais(b);
    desenharHeroi(b);
    j.gotas.forEach((d) => { bloco(b, d.x, d.y, 2, 4, d.cor || '#bfe9ff'); });
  } else if (j.cena === 'jejuno') {
    pixels(); vilosidades(b, camPx, lw); b.drawImage(arte.frente, -camPx, 0); sangueCorrendo(b, camPx, lw); luzAbsorvida(b, camPx);
    mundo(); desenharHeroi(b);
  } else if (j.cena === 'grosso') {
    pixels(); b.drawImage(arte.frente, -camPx, 0);
    mundo();
    bacterias(b);
    j.aguas.forEach((a) => { bloco(b, a.x, a.y, 4, 4, '#2b5b8a'); bloco(b, a.x, a.y, 2, 2, '#8fd3ff'); });
    desenharHeroi(b);
    desenharSprite(b, spriteAnus(Math.round(j.anus)), 704, R(2 * ycGro(352)) + 22);
  } else {
    pixels(); b.drawImage(arte.frente, -camPx, 0);
    mundo();
    uvula(b);
    papilas(b);
    epiglote(b);
    desenharHeroi(b);
    j.gotas.forEach((d) => { bloco(b, d.x, d.y, 2, 4, '#bfe9ff'); });
    if (j.saliva > 0) {
      b.globalAlpha = Math.min(0.35, j.saliva * 0.3);
      GLANDULAS.forEach((gx) => { b.fillStyle = '#d4f1ff'; b.beginPath(); b.moveTo(gx - 4, palatoMole(gx) + 12); b.lineTo(gx + 4, palatoMole(gx) + 12); b.lineTo(j.heroi.x + 18, CHAO); b.lineTo(j.heroi.x - 18, CHAO); b.fill(); });
      b.globalAlpha = 1;
    }
    j.ar.forEach((a) => { b.globalAlpha = Math.min(0.6, a.vida * 0.5); bloco(b, a.x, a.y, 2, 2, '#e8f4ff'); });
    b.globalAlpha = 1;
  }
  j.bolhas.forEach((bo) => { b.globalAlpha = 0.5; bloco(b, bo.x, bo.y, 2, 2, '#ffd9e4'); });
  b.globalAlpha = 1;
  j.part.forEach((p) => {
    if (p.texto || p.emoji) return;
    b.globalAlpha = Math.max(0, Math.min(1, p.vida / (p.max * 0.5)));
    bloco(b, p.x - p.tam / 2, p.y - p.tam / 2, p.tam, p.tam, p.cor);
  });
  b.globalAlpha = 1;
  // amplia o quadro de pixels para a tela (sem suavizar) e escreve por cima, nítido
  g.setTransform(dpr * s * 2, 0, 0, dpr * s * 2, 0, 0);
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, lw, ALT_ARTE);
  g.drawImage(quadroPx, 0, 0);
  g.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
  g.save();
  g.translate(-camPx * 2, 0);
  etiquetas(g);
  j.part.forEach((p) => {
    if (!p.texto && !p.emoji) return;
    g.globalAlpha = Math.max(0, Math.min(1, p.vida / (p.max * 0.5)));
    g.textAlign = 'center';
    if (p.texto) { g.font = `700 14px ${FONTE}`; g.lineWidth = 3; g.strokeStyle = '#fff'; g.strokeText(p.texto, p.x, p.y); g.fillStyle = p.cor; g.fillText(p.texto, p.x, p.y); }
    else { g.font = `${p.tam}px sans-serif`; g.fillText(p.emoji, p.x, p.y); }
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

// os dentes: os de baixo nascem atrás da língua; os de cima, na frente (eles mordem por cima)
function dentes(g, deCima) {
  const j = jogo, f = fechada(), topoHeroi = piso(j.heroi.x) - alturaHeroi() + 10;
  DENTES_BOCA.forEach((d) => {
    const spr = spriteDente(d.tipo, deCima), alt = spr.height * 2;
    let base;
    if (deCima) {
      const parada = GENGIVA + 4 + alt;
      base = parada + R(f * Math.max(0, topoHeroi - parada + 6));
    } else base = piso(d.x) + 26 - R(f * 6);
    desenharSprite(g, spr, d.x, base);
    // destaque: os dentes errados piscam em vermelho; os certos, em verde, enquanto mordem
    const marca = j.marca && j.marca.grupo === d.grupo ? '#e53935' : j.mord && j.itens[j.i - 1] && j.itens[j.i - 1].alvo === d.grupo ? '#43a047' : null;
    if (marca && (Math.floor(j.t * 8) % 2 === 0 || j.mord)) {
      g.globalAlpha = 0.4; g.fillStyle = marca; g.fillRect(d.x - spr.width, base - alt, spr.width * 2, alt); g.globalAlpha = 1;
    }
  });
}

// o coração (em forma de coração, que é mais divertido), na frente do esôfago, batendo junto com o som: tum-tum
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
function coracao(b, camPx) {
  const spr = spriteCoracao(jogo.batida > 0.08 ? 18 : 16);
  b.drawImage(spr, Math.round(42 - spr.width / 2) - camPx, Math.round(68 - spr.height * 0.45));
}

// esôfago: a onda dos músculos (um anel que aperta o tubo). Depois da resposta certa ela vem logo atrás do bolo e o
// empurra; antes, uma onda fraquinha passa de vez em quando, para mostrar que o esôfago está vivo.
function ondaPeristaltica(g) {
  const j = jogo, x = j.onda ? j.heroi.x - 30 : j.ondaAmb - 120;
  if (x < -20 || x > SAIDA.esofago + 20) return;
  const yc = 2 * ycEso(x / 2);
  g.globalAlpha = j.onda ? 1 : 0.55;
  bloco(g, x - 8, yc - 36, 16, 14, '#5e1626');
  bloco(g, x - 8, yc + 22, 16, 14, '#5e1626');
  bloco(g, x - 6, yc - 22, 12, 16, '#b23a4c'); bloco(g, x - 6, yc - 22, 12, 2, '#d65f6a');
  bloco(g, x - 6, yc + 6, 12, 16, '#b23a4c'); bloco(g, x - 6, yc + 20, 12, 2, '#5e1626');
  g.globalAlpha = 1;
}
// um anel de músculo que abre e fecha (a cárdia: a porta de cima do estômago); aberto = 1
function cardia(g, x, yc, raio) {
  const j = jogo, a = j.cardia, alt = R(raio * (1 - a * 0.85));
  bloco(g, x - 6, yc - raio - 4, 12, alt + 4, '#8a2338'); bloco(g, x - 6, yc - raio - 4 + alt + 2, 12, 2, '#d65f6a');
  bloco(g, x - 6, yc + raio - alt, 12, alt + 4, '#8a2338'); bloco(g, x - 6, yc + raio - alt, 12, 2, '#d65f6a');
}
// o piloro: o anel de saída do estômago (abre aos pouquinhos)
function piloro(g) {
  const a = jogo.piloro, alt = R(10 * (1 - a * 0.85));
  bloco(g, 524, 106, 12, alt + 4, '#8a2338'); bloco(g, 524, 106 + alt + 2, 12, 2, '#d65f6a');
  bloco(g, 524, 130 - alt, 12, alt + 4, '#8a2338'); bloco(g, 524, 130 - alt, 12, 2, '#d65f6a');
}
// o lago de suco gástrico (em pixels): superfície ondulando, faixas da rampa, brilhos que correm (ciclo de cor) e bolhas
const nivelLago = (xp) => 79 + Math.sin(xp * 0.08 + jogo.t * 1.6) * (1.2 + jogo.mistura * 1.6);
// onde o nutriente fica no estômago (mundo): desce pela chegada do esôfago, escorrega pela parede até o lago, boia
// meio afundado no suco gástrico, sobe o antro até o canal do piloro e desce para o intestino
function pisoEstomago(x) {
  const xp = x / 2, lagoY = 2 * nivelLago(xp) + 8, tubo = (v) => 2 * (v * 0.62 + 2 + 5);
  if (xp < 50) return tubo(xp);
  if (xp < 86) { const k = (xp - 50) / 36; return tubo(50) + (lagoY - tubo(50)) * k * k; }
  if (xp < 236) return lagoY;
  if (xp < 262) return lagoY + (130 - lagoY) * ((xp - 236) / 26);
  if (xp < 302) return 130;
  return 130 + (xp - 302) * 1.4;
}
function lago(b, camPx, lw) {
  const j = jogo, A = RAMPA.acido, claro = j.lagoBrilho > 0 ? 1 : 0;
  for (let sx = 0; sx < lw; sx++) {
    const x = sx + camPx;
    if (x < 14 || x > 272) continue;
    const ys = Math.round(nivelLago(x));
    b.fillStyle = A[4]; b.fillRect(sx, ys, 1, 1);
    b.fillStyle = A[3]; b.fillRect(sx, ys + 1, 1, 2);
    b.fillStyle = A[2 + claro]; b.fillRect(sx, ys + 3, 1, 7);
    b.fillStyle = A[1 + claro]; b.fillRect(sx, ys + 10, 1, 9);
    b.fillStyle = A[claro]; b.fillRect(sx, ys + 19, 1, ALT_ARTE);
    if ((x + Math.floor(j.t * 10)) % 17 === 0) { b.fillStyle = A[4]; b.fillRect(sx, ys + 4, 2, 1); }
    if ((x * 3 + Math.floor(j.t * 6)) % 29 === 0) { b.fillStyle = A[3]; b.fillRect(sx, ys + 12, 1, 1); }
  }
  b.fillStyle = A[4];
  j.bolhasLago.forEach((bo) => b.fillRect(Math.round(bo.x / 2) - camPx, Math.round(bo.y / 2), 1, 1));
}
// a parte de baixo do nutriente fica dentro do suco (uma lâmina do lago passa por cima dele)
function laminaLago(b, camPx) {
  const h = jogo.heroi, xp = Math.round(h.x / 2);
  if (xp < 86 || xp > 236) return;
  b.globalAlpha = 0.6;
  for (let x = xp - 9; x <= xp + 9; x++) {
    const ys = Math.round(nivelLago(x));
    b.fillStyle = RAMPA.acido[4]; b.fillRect(x - camPx, ys, 1, 1);
    b.fillStyle = RAMPA.acido[3]; b.fillRect(x - camPx, ys + 1, 1, 4);
  }
  b.globalAlpha = 1;
}
// o muco cobrindo o nutriente como uma capa (resposta certa no estômago)
function escudoMuco(g) {
  const j = jogo, h = j.heroi;
  if (j.muco <= 0) return;
  const r = alturaHeroi() * 0.62, cy = piso(h.x) - alturaHeroi() * 0.4;
  g.globalAlpha = Math.min(1, j.muco);
  for (let a = 0; a < Math.PI * 2; a += 0.35) bloco(g, h.x + Math.cos(a + j.t) * r, cy + Math.sin(a + j.t) * r * 0.85, 2, 2, a % 0.7 < 0.35 ? '#fbf8e4' : '#e4dfbd');
  g.globalAlpha = 1;
}
function misturar(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  return `#${[16, 8, 0].map((d) => Math.round(((pa >> d) & 255) * (1 - t) + ((pb >> d) & 255) * t).toString(16).padStart(2, '0')).join('')}`;
}

// duodeno: gotinhas correndo pelos canais até a parede (a bile verde, o suco do pâncreas claro); mais rápidas na resposta
function canais(g) {
  const j = jogo;
  [[[70, 34], '#b5e07a', j.bile], [[186, 50], '#fff6dc', j.pancreas]].forEach(([de, cor, forte]) => {
    const n = forte > 0 ? 6 : 3;
    for (let k = 0; k < n; k++) {
      const u = (j.t * (forte > 0 ? 1.4 : 0.5) + k / n) % 1;
      bloco(g, 2 * (de[0] + (AMPOLA[0] - de[0]) * u) - 1, 2 * (de[1] + (AMPOLA[1] - de[1]) * u) - 1, 2, 2, cor);
    }
  });
}
// intestino delgado: as vilosidades (dedinhos com vasos de sangue vermelhos e o vaso linfático branco no meio), balançando
const topoVilo = (k) => VILO_TOPO + ((((k * 7) % 4) + 4) % 4) * 2;
function vilosidades(b, camPx, lw) {
  const j = jogo;
  for (let k = Math.floor(camPx / 12) - 1; k * 12 + 6 - camPx < lw + 8; k++) {
    // cada vilosidade com a sua altura (nada de cerca certinha)
    const topo = topoVilo(k);
    const x0 = k * 12 + 6 - camPx, balanco = Math.sin(j.t * 1.4 + k * 0.9) * 1.6, aceso = j.absorvendo === k;
    for (let y = topo - 1; y <= VILO_BASE; y++) {
      const f = (VILO_BASE - y) / (VILO_BASE - topo), cx = x0 + Math.round(balanco * f);
      const meia = y < topo ? 1 : y < topo + 3 ? [1, 2, 3][y - topo] : 3;
      b.fillStyle = '#7c2a46'; b.fillRect(cx - meia - 1, y, meia * 2 + 3, 1);
      if (y < topo) continue;
      b.fillStyle = aceso ? '#f096a9' : '#d0647c'; b.fillRect(cx - meia, y, meia * 2 + 1, 1);
      if (meia >= 2) { b.fillStyle = '#c62828'; b.fillRect(cx - meia + 1, y, 1, 1); b.fillRect(cx + meia - 1, y, 1, 1); b.fillStyle = '#fff1d6'; b.fillRect(cx, y, 1, 1); }
    }
    b.fillStyle = '#ffc4cf'; b.fillRect(x0 + Math.round(balanco) - 1, topo + 1, 1, 1);
  }
}
// o sangue correndo no vaso (glóbulos vermelhos); depois da resposta da circulação, corre forte
function sangueCorrendo(b, camPx, lw) {
  const j = jogo;
  j.celulas.forEach((c) => {
    const x = Math.round(c.x) - camPx;
    if (x < -3 || x > lw) return;
    b.fillStyle = '#e53935'; b.fillRect(x, c.y, 3, 2);
    b.fillStyle = '#ff8a80'; b.fillRect(x, c.y, 1, 1);
  });
}
// onde o nutriente fica no intestino delgado (mundo): em cima das pontas das vilosidades; mergulhando; dentro do vaso
// onde o nutriente fica no intestino delgado (mundo): boiando no quimo logo acima das pontas, num sobe-e-desce leve;
// no mergulho, desce até a ponta da vilosidade e entra nela; depois, dentro do vaso, levado pela corrente
const fundoVaso = (alvo) => (alvo === 'linfa' ? 176 : 202);
function pisoJejuno() {
  const j = jogo, h = j.heroi, boia = Math.sin(j.t * 2.2) * 3;
  if (h.mergulho) {
    const m = h.mergulho, ponta = 2 * topoVilo(m.k) + 6;
    if (m.t < 0.45) return 2 * VILO_TOPO - 2 + (ponta - 2 * VILO_TOPO + 2) * Math.min(1, m.t / 0.3);
    return fundoVaso(m.alvo);
  }
  if (h.vaso) return fundoVaso(h.vaso) + Math.round(Math.sin(j.t * 3));
  return 2 * VILO_TOPO - 2 + boia;
}
// a luz do nutriente descendo por dentro da vilosidade até o vaso (no meio do mergulho, quando ele já sumiu)
function luzAbsorvida(b, camPx) {
  const m = jogo.heroi.mergulho;
  if (!m || m.t < 0.4 || m.t > 0.85) return;
  const u = (m.t - 0.4) / 0.45, x = m.k * 12 + 6 - camPx, de = topoVilo(m.k) + 2, ate = m.alvo === 'linfa' ? 82 : 96;
  const y = Math.round(de + (ate - de) * u), cor = m.alvo === 'linfa' ? '#fff6dc' : '#ffe066';
  b.globalAlpha = 0.5; b.fillStyle = cor; b.fillRect(x, y - 4, 1, 4);
  b.globalAlpha = 1; b.fillStyle = '#2b1d2e'; b.fillRect(x - 1, y - 1, 4, 4); b.fillStyle = cor; b.fillRect(x, y, 2, 2);
}

// intestino grosso: as bactérias boas (fofas) nas paredes, mexendo os pelinhos; na resposta, correm até a Sobrinha
const BACTERIAS = [40, 62, 86, 108, 132, 156, 178, 202, 226, 250, 272].map((x, k) => ({ x, cima: k % 2 === 1, cor: ['#4db6ac', '#9575cd', '#ffb74d', '#81c784'][k % 4] }));
function bacterias(g) {
  const j = jogo, h = j.heroi;
  BACTERIAS.forEach((bt, k) => {
    let x = bt.x * 2, y = 2 * (ycGro(bt.x) + (bt.cima ? -raioGro(bt.x) + 9 : raioGro(bt.x) - 1));
    if (j.nhac > 0 && Math.abs(x - h.x) < 130) { const f = Math.min(1, (2.2 - j.nhac) * 1.5); x += (h.x - 24 + (k % 3) * 22 - x) * f; y += (piso(h.x) - 2 - y) * f; }
    const quadro = Math.floor(j.t * 3 + k) % 2 ? 'a' : 'b';
    desenharSprite(g, spriteBacteria(bt.cor, quadro), R(x), R(y), { virar: k % 2 === 1 });
  });
}
function descarga() {
  // o som da descarga: um "fuuush" descendo
  tocar([[620, 0.06, 'sawtooth'], [540, 0.06, 'sawtooth'], [470, 0.07, 'sawtooth'], [400, 0.08, 'sawtooth'], [330, 0.1, 'sawtooth'], [260, 0.14, 'sawtooth'], [200, 0.2, 'sawtooth']]);
}

// a úvula (a "campainha"), balançando; quando a criança escolhe "nariz", o céu da boca mole sobe e fecha a passagem
function uvula(g) {
  const j = jogo;
  if (j.uvula > 0) {
    g.globalAlpha = Math.min(1, j.uvula * 1.5);
    bloco(g, UVULA_X - 4, 32, PAREDE - UVULA_X + 4, 14, '#d0647c'); bloco(g, UVULA_X - 4, 44, PAREDE - UVULA_X + 4, 2, '#7c2a46'); bloco(g, UVULA_X - 4, 32, PAREDE - UVULA_X + 4, 2, '#ee90a5');
    g.globalAlpha = 1;
  }
  const y0 = palatoMole(UVULA_X) - 2, balanco = Math.sin(j.t * 1.8) * 2 + j.uvula * Math.sin(j.t * 18) * 5;
  for (let k = 0; k < 15; k++) {
    const larg = k < 10 ? 12 - k * 0.3 : 12 - (k - 9) * 1.8, x = UVULA_X - larg / 2 + balanco * (k / 15);
    bloco(g, x - 2, y0 + k * 2, larg + 4, 2, '#7c2a46');
    bloco(g, x, y0 + k * 2, larg, 2, k > 11 ? '#ee90a5' : '#d0647c');
    bloco(g, x, y0 + k * 2, 2, 2, '#ee90a5');
  }
}

// as papilas do gosto: cogumelinhos na língua; na parada do Sabor acendem na cor da resposta
function papilas(g) {
  const j = jogo;
  for (let x = 250; x <= 330; x += 14) {
    const y = piso(x) + 2;
    if (j.sabor && Math.floor(j.t * 6 + x) % 2 === 0) { g.globalAlpha = Math.min(0.6, j.sabor.t * 0.4); bloco(g, x - 10, y - 22, 20, 20, j.sabor.cor); g.globalAlpha = 1; }
    desenharSprite(g, spritePapila(j.sabor ? j.sabor.cor : '#f28aa0'), x, y);
  }
}

// a epiglote: tampinha em pé (o ar passa); na hora de engolir, deita e fecha a traqueia
function epiglote(g) {
  const ang = -1.3 * (1 - jogo.epi);
  g.save();
  g.translate(EPI_X, CHAO);
  g.rotate(ang);
  g.fillStyle = '#7c2a46'; g.fillRect(-2, -10, 54, 12);
  for (let k = 0; k < 48; k += 2) {
    const esp = k < 6 ? 6 : k > 40 ? 6 - (k - 40) * 0.6 : 8;
    g.fillStyle = k % 8 === 0 ? '#ee90a5' : '#d0647c';
    g.fillRect(k, -esp, 2, esp);
  }
  g.fillStyle = '#ffc4cf'; g.fillRect(4, -8, 36, 2);
  g.restore();
}

function desenharHeroi(g) {
  const j = jogo, h = j.heroi;
  if (j.transicao && j.transicao.t > 0.35 && j.transicao.t < 0.6) return;
  let y = piso(h.x), alfa = 1;
  // pulo: na garganta, para o nariz (alto); no intestino, a fibra afunda na vilosidade, não cabe e volta
  if (h.salto) y -= Math.sin(h.salto.t * Math.PI) * (j.cena === 'jejuno' ? -26 : 120);
  if (h.queda) { y += h.queda.t * h.queda.t * 160 + 10; alfa = Math.max(0, 1 - h.queda.t); }
  let tam = h.tam;
  if (h.mergulho) {
    const t = h.mergulho.t;
    if (t >= 0.3 && t < 0.45) { tam = 'mini'; alfa = 1 - (t - 0.3) / 0.15; y += (t - 0.3) * 60; }
    else if (t >= 0.45 && t < 0.85) return;
    else if (t >= 0.85) { tam = 'mini'; alfa = (t - 0.85) / 0.15; }
  }
  const boiando = j.cena === 'jejuno';
  const andando = !!j.mover;
  // boiando no intestino: sem passinho (desliza com o líquido) e sem sombra no chão
  const q = h.susto > 0 ? 'susto' : h.feliz > 0 ? 'feliz' : andando && !boiando && Math.floor(h.passo) % 2 ? 'b' : 'a';
  const pula = andando && !boiando ? Math.abs(Math.sin(h.passo * Math.PI / 2)) * 3 : 0;
  if (!h.queda && !h.salto && !boiando) { g.globalAlpha = 0.3; bloco(g, h.x - alturaHeroi() * 0.36, piso(h.x) - 2, alturaHeroi() * 0.72, 4, '#3a0c1a'); g.globalAlpha = 1; }
  // descendo pelo esôfago: só aparece dentro do tubo
  if (h.queda) { g.save(); g.beginPath(); g.rect(ESOF[0], 0, ESOF[1] - ESOF[0], ALT); g.rect(0, 0, ESOF[0], CHAO); g.rect(ESOF[1], 0, 400, CHAO); g.clip(); }
  const cor = h.cor || (h.quimo ? misturar(j.n.cor, '#efe2b4', 0.5) : j.n.cor);
  // depois do suco pancreático: aminoácidos (blocos coloridos de montar) e ácidos graxos (gotinhas deslizando) seguem atrás;
  // depois da bile, a gordura vira gotinhas em volta
  if (h.rastro === 'amino' && !h.vaso) ['#ef5350', '#ffca28', '#66bb6a'].forEach((c, k) => {
    const bx = h.x - 12 * (k + 1) - 4, by = y - 6 - (k % 2) * 6 + Math.sin(j.t * 5 + k) * 2;
    bloco(g, bx - 4, by - 4, 8, 8, '#2b1d2e'); bloco(g, bx - 2, by - 2, 6, 6, c); bloco(g, bx - 2, by - 2, 2, 2, '#fff8e7');
  });
  if ((h.rastro === 'graxos' && !h.vaso) || h.gotinhas) for (let k = 0; k < 3; k++) {
    const a = j.t * 2 + k * 2.1, bx = h.gotinhas ? h.x + Math.cos(a) * 18 : h.x - 14 - k * 9, by = h.gotinhas ? y - 14 + Math.sin(a) * 10 : y - 4 - (k % 2) * 4;
    bloco(g, bx - 3, by - 3, 6, 6, '#2b1d2e'); bloco(g, bx - 2, by - 2, 4, 4, cor); bloco(g, bx - 2, by - 2, 2, 2, '#fff8e7');
  }
  // a proteína quebrada pela pepsina: pedacinhos (peptídeos) seguindo atrás
  if (h.quebrado) for (let k = 1; k <= 2; k++) {
    const bx = h.x - 12 * k - 6, by = y - 8 - (k % 2) * 6 + Math.sin(j.t * 4 + k) * 2;
    bloco(g, bx - 4, by - 4, 8, 8, '#2b1d2e'); bloco(g, bx - 2, by - 2, 6, 6, cor); bloco(g, bx - 2, by - 2, 2, 2, '#fff8e7');
  }
  desenharSprite(g, spriteNutriente(h.forma || j.n.forma, cor, tam, q, h.molhado), R(h.x), R(y) + 2 - R(pula), { alfa });
  if (h.queda) g.restore();
}

// os nomes das partes: na margem ou num espaço vazio, com uma linhazinha até a parte (não cobrem a arte);
// os dos dentes só aparecem depois da pergunta, para não entregar a resposta
function etiqueta(g, x, y, t, ax, ay) {
  g.font = `600 9px ${FONTE}`;
  const w = Math.round(g.measureText(t).width + 8);
  if (ax !== undefined) { g.strokeStyle = 'rgba(255,248,236,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(ax, ay); g.stroke(); g.fillStyle = '#fff8ec'; g.fillRect(ax - 1.5, ay - 1.5, 3, 3); }
  g.fillStyle = 'rgba(255,248,236,.93)'; g.fillRect(Math.round(x - w / 2), y - 7, w, 12);
  g.fillStyle = '#5a1428'; g.textAlign = 'center'; g.fillText(t, x, y + 2);
}
function etiquetas(g) {
  const j = jogo, feito = (parada) => j.itens.findIndex((it) => it.parada === parada) < j.i;
  if (j.cena === 'frente') {
    etiqueta(g, 70, 74, 'Nariz', 14, 40);
    etiqueta(g, 186, 10, 'Céu da boca', 186, 26);
    etiqueta(g, 46, 214, 'Lábios', 16, 190);
    etiqueta(g, 360, 176, 'Língua');
    etiqueta(g, 250, 212, 'Mandíbula (osso)');
    if (feito('corte') || feito('triturar')) { etiqueta(g, 121, 100, 'Incisivos', 121, 82); etiqueta(g, 172, 118, 'Caninos', 168, 88); }
    if (feito('triturar')) etiqueta(g, 250, 96, 'Molares', 250, 74);
  } else if (j.cena === 'esofago') {
    etiqueta(g, 150, 40, 'Esôfago', 170, 74);
    etiqueta(g, 84, 196, 'Coração', 84, 166);
    etiqueta(g, 300, 204, 'Diafragma', 300, 172);
    etiqueta(g, 350, 120, 'Cárdia', 400, 160);
    etiqueta(g, 500, 200, 'Estômago');
  } else if (j.cena === 'estomago') {
    if (feito('saida')) etiqueta(g, 132, 20, 'Cárdia', 74, 46);
    etiqueta(g, 330, 10, 'Diafragma');
    etiqueta(g, 236, 76, 'Pregas com muco', 170, 54);
    etiqueta(g, 300, 200, 'Suco gástrico');
    if (feito('saida')) etiqueta(g, 470, 84, 'Piloro', 530, 112);
    etiqueta(g, 596, 196, 'Intestino delgado', 608, 136);
  } else if (j.cena === 'duodeno') {
    etiqueta(g, 120, 12, 'Fígado');
    if (feito('bile')) etiqueta(g, 210, 50, 'Vesícula biliar', 140, 56);
    etiqueta(g, 290, 92, 'Pâncreas');
    etiqueta(g, 70, 166, 'Duodeno', 64, 134);
  } else if (j.cena === 'jejuno') {
    etiqueta(g, 300, 12, 'Parede do intestino');
    if (feito('absorcao')) etiqueta(g, 220, 64, 'Vilosidades', 174, 86);
    etiqueta(g, 470, 164, 'Vaso linfático');
    etiqueta(g, 300, 214, 'Vaso sanguíneo');
  } else if (j.cena === 'grosso') {
    const fim = (p) => j.itens.findIndex((it) => it.tipo === 'grosso' && it.parada === p) < j.i;
    etiqueta(g, 70, 12, 'Ceco', 36, 46);
    etiqueta(g, 70, 210, 'Apêndice', 22, 200);
    etiqueta(g, 300, 12, 'Intestino grosso');
    if (fim('bacterias')) etiqueta(g, 420, 196, 'Bactérias boas', 404, 166);
    etiqueta(g, 620, 196, 'Reto', 620, 170);
    etiqueta(g, 700, 196, 'Ânus', 704, 168);
  } else {
    etiqueta(g, 128, 72, 'Glândulas salivares', 128, 44);
    etiqueta(g, 232, 64, 'Céu da boca mole', 232, 40);
    etiqueta(g, 290, piso(290) - 40, 'Papilas do gosto', 290, piso(290) - 16);
    etiqueta(g, UVULA_X + 6, 92, 'Úvula', UVULA_X, 70);
    etiqueta(g, 430, 14, 'Para o nariz');
    etiqueta(g, EPI_X - 34, CHAO - 66, 'Epiglote', EPI_X + 4, CHAO - 30);
    etiqueta(g, (TRAQ[0] + TRAQ[1]) / 2, 212, 'Traqueia');
    etiqueta(g, (ESOF[0] + ESOF[1]) / 2, 212, 'Esôfago');
    etiqueta(g, PAREDE + 40, 120, 'Coluna');
  }
}

// o tronco: cabeça, esôfago descendo, o diafragma, o estômago e os intestinos (que ainda vêm)
function miniTronco(g, j) {
  g.fillStyle = '#f2c28b';
  g.beginPath(); g.arc(30, 9, 6, 0, 7); g.fill();
  g.fillRect(27, 14, 6, 4);
  g.fillRect(15, 17, 30, 36);
  g.fillStyle = '#d99a6c'; g.fillRect(15, 30, 30, 1);
  g.fillStyle = '#8e2449'; g.fillRect(29, 15, 3, 17);
  g.fillStyle = '#c2185b'; g.beginPath(); g.ellipse(34, 37, 8, 5, 0.3, 0, 7); g.fill();
  g.fillStyle = '#d4a0aa'; g.fillRect(22, 44, 18, 7);
  const k = Math.max(0, Math.min(1, j.heroi.x / (SAIDA[j.cena] || FIM[j.cena])));
  const p = { esofago: [30.5, 17 + 14 * k], estomago: [28 + 14 * k, 36 + k * 2], duodeno: [42 - 4 * k, 40 + 5 * k], jejuno: [24 + 16 * k, 47.5], grosso: [22 + 18 * k, 45 + 6 * k] }[j.cena];
  const r = 3 + Math.sin(j.t * 6) * 0.8;
  g.fillStyle = '#ffd54f'; g.strokeStyle = '#5a1428'; g.lineWidth = 1.2;
  g.beginPath(); g.arc(p[0], p[1], r, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#5a1428'; g.font = `600 7px ${FONTE}`; g.textAlign = 'center'; g.fillText('você está aqui', 30, 60);
}

// mini-mapa no canto: a cabeça de lado e um pontinho "você está aqui" (a criança nunca se perde)
function miniMapa(g, W) {
  // no celular (tela estreita) fica menor, para não cobrir o cenário
  const j = jogo, esc = W < 330 ? 0.7 : 1, ox = 0, oy = 0;
  g.save();
  g.translate(Math.round(W - 66 * esc), 6);
  g.scale(esc, esc);
  g.fillStyle = 'rgba(255,250,240,.92)'; g.fillRect(ox, oy, 60, 62);
  g.strokeStyle = '#c8a879'; g.lineWidth = 1; g.strokeRect(ox + 0.5, oy + 0.5, 59, 61);
  // da boca em diante (esôfago, estômago, duodeno, intestino delgado e grosso), o mini-mapa mostra o tronco
  if (j.cena !== 'frente' && j.cena !== 'fundo') { miniTronco(g, j); g.restore(); return; }
  g.fillStyle = '#f2c28b';
  g.beginPath(); g.ellipse(ox + 36, oy + 22, 16, 16, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(ox + 22, oy + 14); g.lineTo(ox + 14, oy + 26); g.lineTo(ox + 22, oy + 28); g.fill();
  g.fillRect(ox + 20, oy + 28, 12, 8);
  g.fillRect(ox + 30, oy + 34, 14, 20);
  g.fillStyle = '#c2185b'; g.fillRect(ox + 18, oy + 29, 20, 4);
  g.fillStyle = '#9fb8d8'; g.fillRect(ox + 32, oy + 33, 3, 21);
  g.fillStyle = '#8e2449'; g.fillRect(ox + 38, oy + 31, 4, 23);
  const p = j.heroi.queda ? [40, 46] : j.cena === 'frente' ? [20 + Math.max(0, Math.min(1, j.heroi.x / SAIDA.frente)) * 12, 31] : [32 + Math.max(0, Math.min(1, j.heroi.x / EPI_X)) * 6, 31];
  const r = 3 + Math.sin(j.t * 6) * 0.8;
  g.fillStyle = '#ffd54f'; g.strokeStyle = '#5a1428'; g.lineWidth = 1.2;
  g.beginPath(); g.arc(ox + p[0], oy + p[1], r, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#5a1428'; g.font = `600 7px ${FONTE}`; g.textAlign = 'center'; g.fillText('você está aqui', ox + 30, oy + 60);
  g.restore();
}

// ---------- fim da fase ----------
function terminarDigestao() {
  if (!jogo) return;
  const { n, nId, pontos, melhorCombo, ali, l, comeco } = jogo;
  // começando no intestino grosso, quem anda o tempo todo é a Sobrinha (ou a própria fibra)
  const guiou = comeco === 'grosso' ? `${jogo.sobrinha ? 'a Sobrinha' : n.oNome} pelo intestino grosso` : `${n.oNome} ${DE_ONDE[comeco]} até o fim da viagem`;
  const d = lerDados();
  const novo = !(d.album || {})[nId];
  d.album = { ...(d.album || {}), [nId]: true };
  d.viagens = { ...(d.viagens || {}), [nId]: true };
  d.recordes = d.recordes || {};
  const novoRecorde = pontos > (d.recordes[nId] || 0);
  if (novoRecorde) d.recordes[nId] = pontos;
  gravarDados(d);
  const porTipo = Object.values(TIPOS_DIG).map((t) => {
    const rs = resultados.filter((r) => r.m.id === t.id);
    return rs.length ? `${t.titulo}: ${rs.filter((r) => !r.erros.length).length}/${rs.length}` : '';
  }).filter(Boolean);
  pararDigestao();
  const painel = painelDoCorpo(l);
  missao.resumo = [
    `Viagem ${DE_ONDE[comeco]} até o fim (intestino grosso). Nutriente guiado: ${n.nome} (${ali.de}). De primeira por habilidade: ${porTipo.join(' · ')}.`,
    `Melhor sequência sem errar: ${melhorCombo}.${novoRecorde ? ' Novo recorde!' : ''}`,
    `Painel do lanche (${l.nome}): ${painel.texto}`,
    `BNCC: ${[...new Set([...Object.values(TIPOS_DIG).filter((t) => resultados.some((r) => r.m.id === t.id)).map((t) => t.bncc), 'EF05CI08', 'EF05CI09'])].join(', ')}.`,
    `Pontos: ${pontos}`,
  ];
  fimDaMissao();
  const estrelas = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = novoRecorde ? 'Novo recorde! 🏆' : estrelas === 3 ? 'Digestão perfeita! 🏁' : 'Viagem completa! 🏁';
  $('fim-texto').textContent = `${aluno}, você guiou ${guiou} e fez ${pontos} pontos!`
    + (novo ? ` A figurinha "${n.nome}" entrou no seu Álbum dos Nutrientes!` : '')
    + (nId === 'fibra' ? ' As fibras ajudaram o intestino a funcionar e a formar as fezes.' : ' O nutriente foi entregue ao corpo, e o que sobrou saiu no banheiro.');
  $('fim-acoes').innerHTML = painel.html;
  $('fim-acoes').hidden = false;
}

// o Painel do Corpo: o que o lanche escolhido deu ao corpo, pelos nutrientes que ele tem. Informa, sem culpar ninguém.
const TEM = (a) => a.de.replace(/^do /, 'O ').replace(/^da /, 'A ').replace(/^dos /, 'Os ').replace(/^das /, 'As ');
function painelDoCorpo(l) {
  const todos = l.alimentos.flatMap((a) => a.nutrientes), conta = (ids) => todos.filter((id) => ids.includes(id)).length;
  const barras = [
    ['⚡ Energia', conta(['amido', 'acucar']), '#f5a000'],
    ['🧱 Construção', conta(['proteina']), '#e57373'],
    ['🛡️ Defesa e saúde', conta(['vitaminas', 'fibra', 'mono', 'poli']), '#43a047'],
    ['🟡 Só um pouco', conta(['acucar', 'sodio', 'saturada']), '#e0a800'],
    ['⛔ Evitar', conta(['trans']), '#c62828'],
  ];
  const deu = [barras[0][1] && 'energia', barras[1][1] && 'material para construir o corpo', barras[2][1] && 'defesa e saúde'].filter(Boolean);
  const frases = [];
  if (deu.length) frases.push(`${l.nome} deu ${deu.length > 1 ? `${deu.slice(0, -1).join(', ')} e ${deu[deu.length - 1]}` : deu[0]} ao corpo.`);
  l.alimentos.forEach((a) => {
    const pouco = a.nutrientes.filter((id) => NUTRIENTES[id].classe === 'pouco').map((id) => NUTRIENTES[id].nome.toLowerCase());
    const plural = /^As |^Os /.test(TEM(a));
    if (a.nutrientes.includes('trans')) frases.push(`${TEM(a)} ${plural ? 'têm' : 'tem'} gordura trans, que faz mal ao coração: o melhor é evitar.`);
    else if (pouco.length) frases.push(`${TEM(a)} ${plural ? 'têm' : 'tem'} ${pouco.length > 1 ? `${pouco.slice(0, -1).join(', ')} e ${pouco[pouco.length - 1]}` : pouco[0]}: um pouco, tudo bem.`);
  });
  if (!barras[2][1]) frases.push('Para ganhar mais defesa, dá para juntar uma fruta ou uma salada.');
  const texto = frases.join(' ');
  const html = `<div class="dig-painel"><h3>🫀 Painel do Corpo · ${l.icone} ${l.nome}</h3>
    ${barras.filter(([, n], k) => k < 3 || n > 0).map(([nome, n, cor]) => `<div class="dig-barra"><span>${nome}</span>
      <i role="img" aria-label="${nome}: ${n}"><b style="width:${Math.min(100, n * 34)}%;--c:${cor}"></b></i></div>`).join('')}
    <p>${texto}</p></div>`;
  return { html, texto };
}

// capa do cartão na lista de jogos: o estômago, com a mesma pixel art do jogo (a proteína boiando no suco gástrico).
// Pinta depois de a página abrir (o cenário do estômago leva um instante e fica guardado para o jogo).
function desenharCapa() {
  const arte = camadas('estomago'), W = 150, H = ALT_ARTE, x0 = 22, A = RAMPA.acido;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(arte.fundo, -x0, 0);
  const lagoY = (x) => Math.round(79 + Math.sin((x + x0) * 0.08) * 1.2);
  for (let x = 0; x < W; x++) {
    const ys = lagoY(x);
    [[A[4], 0, 1], [A[3], 1, 2], [A[2], 3, 7], [A[1], 10, 9], [A[0], 19, H]].forEach(([c, dy, h]) => { g.fillStyle = c; g.fillRect(x, ys + dy, 1, h); });
    if ((x * 7) % 17 === 0) { g.fillStyle = A[4]; g.fillRect(x, ys + 4, 2, 1); }
  }
  g.drawImage(arte.frente, -x0, 0);
  g.fillStyle = A[4];
  [[40, 70], [64, 58], [100, 72], [120, 62], [52, 44]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
  const spr = spriteNutriente('cadeia', '#e57373', 'm', 'feliz', true);
  g.drawImage(spr, Math.round(78 - spr.width / 2), lagoY(78) + 4 - spr.height);
  g.globalAlpha = 0.6;
  for (let x = 68; x <= 88; x++) { const ys = lagoY(x); g.fillStyle = A[4]; g.fillRect(x, ys, 1, 1); g.fillStyle = A[3]; g.fillRect(x, ys + 1, 1, 4); }
  g.globalAlpha = 1;
  $('dig-capa').appendChild(cv);
}
setTimeout(desenharCapa, 300);

$('btn-digestao').onclick = () => { SOM.clique(); escolherProfessorE('Missão Digestão', telaDigestaoMenu); };
$('dig-voltar').onclick = telaJogos;
$('dig-btn-album').onclick = () => { SOM.clique(); telaAlbum(); };
$('dig-album-voltar').onclick = telaDigestaoMenu;
$('dig-prato-voltar').onclick = telaDigestaoMenu;
$('dig-sair').onclick = () => (escolha ? telaPrato(escolha.lanche) : telaDigestaoMenu());

export { comecarDigestao, pararDigestao, telaDigestaoMenu };
