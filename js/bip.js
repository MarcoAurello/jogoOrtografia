/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Robô Bip: programação com blocos em português (sequência, repetição e enquanto). */

import { $ } from './util.js?v=246';
import { aluno, definirMissao, definirResultados, estrelasTexto, lerEstrelas, missao, resultados } from './estado.js?v=246';
import { SOM, tocar } from './som.js?v=246';
import { mascote, mostrar, telaJogos } from './telas.js?v=246';
import { escolherProfessorE } from './professor.js?v=246';
import { fimDaMissao } from './relatorio.js?v=246';
import { BLOCOS, CONDICOES, MUNDOS_BIP } from './dados-bip.js?v=246';

// ---------- Robô Bip ----------
// A criança MONTA o programa (o roteiro) tocando nas peças e aperta ⚡ Executar: o Bip faz exatamente o que está
// escrito, um bloco por vez, com o bloco atual aceso no roteiro. Bateu ou não chegou: ele para e diz em qual bloco
// foi o problema; dá para corrigir e tentar de novo à vontade (sem vidas). A partir da 2ª falha, aparece a dica.
// Estrelas: 1 por resolver, +1 por usar até a meta de blocos, +1 por acertar de primeira.
// Tocar, não arrastar: a peça entra no encaixe (▸) do roteiro; tocar num bloco do roteiro move o encaixe para logo
// depois dele (ou para dentro, se for um repita/enquanto); o ✖ tira o bloco.
const BIP = { PASSO: 420, LIMITE: 250 };
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // cima, direita, baixo, esquerda (no tabuleiro)
let bip = null;
let ultimoMundo = 0;
let proxId = 1;

// ---------- Tabuleiro isométrico (desenhado em SVG) ----------
const TW = 64, TH = 32, BH = 22, TK = 10;   // largura e altura do losango, altura do cubo, espessura do chão
const CORES_CUBO = [['#9575cd', '#7e57c2', '#5e35b1'], ['#ffb74d', '#fb8c00', '#ef6c00'], ['#4dd0e1', '#00acc1', '#00838f'], ['#81c784', '#43a047', '#2e7d32']];
function geometria(nivel) {
  const L = nivel.grade.length, C = nivel.grade[0].length, pad = 16;
  const ox = L * TW / 2 + pad, oy = pad + BH + 34;
  return { L, C, ox, oy, W: (C + L) * TW / 2 + pad * 2, H: (C + L) * TH / 2 + TK + oy + pad };
}
const topo = (g, x, y) => [g.ox + (x - y) * TW / 2, g.oy + (x + y) * TH / 2];
const centroCasa = (g, x, y) => { const [px, py] = topo(g, x, y); return [px, py + TH / 2]; };
const losango = (px, py, dy = 0) => `${px},${py + dy} ${px + TW / 2},${py + TH / 2 + dy} ${px},${py + TH + dy} ${px - TW / 2},${py + TH / 2 + dy}`;

// o robozinho: de frente (dir baixo/direita) mostra o rosto; de costas, o painel; virado para a esquerda, espelhado
const ROBO = (frente) => `
  <ellipse cx="0" cy="2" rx="15" ry="5" fill="#000" opacity="0.22"/>
  <rect x="-11" y="-8" width="8" height="8" rx="2" fill="#546e7a"/><rect x="3" y="-8" width="8" height="8" rx="2" fill="#546e7a"/>
  <rect x="-13" y="-30" width="26" height="24" rx="7" fill="#e3f2fd" stroke="#78909c" stroke-width="1.5"/>
  <rect x="-17" y="-26" width="5" height="12" rx="2.5" fill="#90a4ae"/><rect x="12" y="-26" width="5" height="12" rx="2.5" fill="#90a4ae"/>
  ${frente ? '<circle cx="0" cy="-19" r="4" fill="#ffca28" stroke="#f57f17" stroke-width="1"/>' : '<rect x="-7" y="-25" width="14" height="10" rx="2" fill="#b0bec5"/>'}
  <rect x="-15" y="-52" width="30" height="22" rx="9" fill="#fff" stroke="#78909c" stroke-width="1.5"/>
  ${frente ? '<rect x="-11" y="-48" width="22" height="13" rx="6" fill="#263238"/><circle cx="-5" cy="-41.5" r="3" fill="#4fc3f7"/><circle cx="5" cy="-41.5" r="3" fill="#4fc3f7"/><path d="M-3 -37 Q0 -35 3 -37" stroke="#4fc3f7" stroke-width="1.3" fill="none"/>'
    : '<rect x="-9" y="-47" width="18" height="11" rx="4" fill="#cfd8dc"/>'}
  <line x1="0" y1="-52" x2="0" y2="-60" stroke="#78909c" stroke-width="2"/><circle cx="0" cy="-62" r="3.5" fill="#ff5252"/>`;

function desenharTabuleiro() {
  const n = bip.nivel, g = bip.g;
  const partes = [];
  // pintor: de trás para frente (x + y crescente)
  for (let s = 0; s <= g.C + g.L - 2; s++) {
    for (let y = 0; y < g.L; y++) {
      const x = s - y;
      if (x < 0 || x >= g.C) continue;
      const ch = n.grade[y][x];
      const [px, py] = topo(g, x, y);
      const ultimoX = x === g.C - 1, ultimoY = y === g.L - 1;
      if (ch === '#') {
        const [ct, cl, cr] = CORES_CUBO[(x * 3 + y * 2) % CORES_CUBO.length];
        partes.push(`<polygon points="${px - TW / 2},${py + TH / 2 - BH} ${px},${py + TH - BH} ${px},${py + TH + TK} ${px - TW / 2},${py + TH / 2 + TK}" fill="${cl}"/>
          <polygon points="${px + TW / 2},${py + TH / 2 - BH} ${px},${py + TH - BH} ${px},${py + TH + TK} ${px + TW / 2},${py + TH / 2 + TK}" fill="${cr}"/>
          <polygon points="${losango(px, py, -BH)}" fill="${ct}" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>`);
        continue;
      }
      // chão: losango claro, xadrez suave; a espessura aparece só na beira da frente
      const claro = (x + y) % 2 ? '#a5e4bd' : '#93dbae';
      if (ultimoY) partes.push(`<polygon points="${px - TW / 2},${py + TH / 2} ${px},${py + TH} ${px},${py + TH + TK} ${px - TW / 2},${py + TH / 2 + TK}" fill="#5fae7d"/>`);
      if (ultimoX) partes.push(`<polygon points="${px + TW / 2},${py + TH / 2} ${px},${py + TH} ${px},${py + TH + TK} ${px + TW / 2},${py + TH / 2 + TK}" fill="#4c9a6a"/>`);
      partes.push(`<polygon points="${losango(px, py)}" fill="${claro}" stroke="#7fcf9c" stroke-width="1"/>`);
      const [cx, cy] = centroCasa(g, x, y);
      if (ch === 'F') partes.push(`<ellipse cx="${cx}" cy="${cy}" rx="20" ry="9" fill="#fff59d" opacity="0.7" class="bip-brilho"/>
        <text x="${cx}" y="${cy - 6}" font-size="34" text-anchor="middle" class="bip-estrela">⭐</text>`);
      if (ch === 'M') partes.push(`<g class="bip-moeda" id="bip-moeda-${x}-${y}"><ellipse cx="${cx}" cy="${cy + 2}" rx="9" ry="4" fill="#000" opacity="0.18"/>
        <g class="bip-moeda-gira"><circle cx="${cx}" cy="${cy - 12}" r="9" fill="#ffd54f" stroke="#f9a825" stroke-width="2"/><circle cx="${cx}" cy="${cy - 12}" r="4.5" fill="none" stroke="#fff8e1" stroke-width="1.5"/></g></g>`);
    }
  }
  $('bip-tabuleiro').innerHTML = `<svg class="bip-svg" viewBox="0 0 ${g.W} ${g.H}" role="img" aria-label="Tabuleiro do robô Bip">
    ${partes.join('')}
    <g id="bip-robo" class="bip-robo"><g id="bip-seta"></g><g id="bip-sprite"></g></g></svg>`;
  posicionarRobo(true);
}

// coloca o Bip na casa e na direção atuais (com animação, a não ser no começo)
function posicionarRobo(semAnimacao = false) {
  const g = bip.g, r = bip.robo;
  const [cx, cy] = centroCasa(g, r.x, r.y);
  const el = $('bip-robo');
  el.classList.toggle('sem-anima', semAnimacao);
  el.style.transform = `translate(${cx}px, ${cy}px)`;
  // de frente quando olha para baixo/direita da tela (dir 1 e 2), de costas para cima; espelhado à esquerda
  const frente = r.dir === 1 || r.dir === 2, esquerda = r.dir === 2 || r.dir === 3;
  $('bip-sprite').innerHTML = `<g transform="scale(${esquerda ? -1 : 1} 1)">${ROBO(frente)}</g>`;
  // a seta no chão aponta para onde ele vai andar
  const [dx, dy] = DIRS[r.dir];
  const vx = (dx - dy) * TW / 2, vy = (dx + dy) * TH / 2, n = Math.hypot(vx, vy);
  const ux = vx / n, uy = vy / n, px = -uy, py = ux;
  const ponta = [ux * 30, uy * 30], b1 = [ux * 16 + px * 9, uy * 16 + py * 9], b2 = [ux * 16 - px * 9, uy * 16 - py * 9];
  $('bip-seta').innerHTML = `<polygon points="${ponta.join(',')} ${b1.join(',')} ${b2.join(',')}" fill="#ff7043" stroke="#fff" stroke-width="1.5" opacity="0.95"/>`;
}

// ---------- Menu ----------
function telaBipMenu() {
  pararBip();
  mascote('davi-bip', 'oi');
  const estrelas = lerEstrelas();
  $('bip-mundos').innerHTML = MUNDOS_BIP.map((m, k) => `
    <button class="missao" style="--c:#7e57c2" data-mundo="${k}" type="button">
      <span class="missao-icone">${m.icone}</span>
      <span class="missao-titulo">Mundo ${k + 1}</span>
      <span class="missao-descricao">${m.nome} · ${m.conceito} · ${m.niveis.length} níveis</span>
      <span class="missao-estrelas">${estrelasTexto(estrelas[m.id] || 0)}</span>
    </button>`).join('');
  mostrar('tela-bip-menu');
}
$('bip-mundos').onclick = (e) => {
  const b = e.target.closest('[data-mundo]');
  if (!b) return;
  SOM.clique();
  comecarBip(Number(b.dataset.mundo));
};

// ---------- Mundo e níveis ----------
function comecarBip(k = 0) {
  pararBip();
  ultimoMundo = k;
  const mundo = MUNDOS_BIP[k];
  definirMissao({ id: mundo.id, bip: true, icone: '🤖', cor: '#7e57c2', titulo: `Robô Bip – ${mundo.nome}` });
  definirResultados([]);
  bip = { mundo, k, ni: -1, pontos: 0, estrelasTotal: 0, perfeitos: 0, moedasTotal: 0, rodando: false };
  mostrar('tela-bip');
  proximoNivel();
}
function pararBip() {
  if (bip) bip.rodando = false;
  bip = null;
  $('bip-vitoria').hidden = true;
}
const msgBip = (t, tipo = '') => { $('bip-msg').innerHTML = t; $('bip-msg').className = `bip-msg ${tipo}`; };

function proximoNivel() {
  const b = bip;
  b.ni++;
  if (b.ni >= b.mundo.niveis.length) { terminarBip(); return; }
  const n = b.mundo.niveis[b.ni];
  Object.assign(b, { nivel: n, g: geometria(n), prog: [], cursor: { pai: null, pos: 0 }, falhas: [], execucoes: 0, rodando: false, verCodigo: false });
  reiniciarTabuleiro();
  $('bip-titulo').textContent = `${b.mundo.icone} Nível ${b.ni + 1}/${b.mundo.niveis.length}: ${n.nome}`;
  $('bip-objetivo').innerHTML = `🎯 ${n.objetivo}`;
  msgBip(n.novo ? `✨ Peça nova: <b>${BLOCOS[n.novo].icone} ${BLOCOS[n.novo].nome}</b>. Toque nas peças para montar o roteiro e aperte ⚡ Executar.`
    : 'Toque nas peças para montar o roteiro e aperte ⚡ Executar.');
  desenharPaleta();
  desenharPrograma();
}
// o Bip volta para o começo e as moedas voltam para o lugar
function reiniciarTabuleiro() {
  const b = bip, n = b.nivel;
  let ini = { x: 0, y: 0 };
  const moedas = new Set();
  n.grade.forEach((linha, y) => [...linha].forEach((ch, x) => {
    if (ch === 'R') ini = { x, y };
    if (ch === 'M') moedas.add(`${x},${y}`);
  }));
  b.robo = { ...ini, dir: n.dir };
  b.moedas = moedas;
  b.moedasPegas = 0;
  b.sujo = false;
  desenharTabuleiro();
  $('bip-moedas').textContent = `🪙 0/${moedas.size}`;
}

// ---------- Peças (paleta) ----------
function desenharPaleta() {
  const b = bip, disp = b.mundo.blocos;
  const grupo = (titulo, ids) => {
    const tem = ids.filter((id) => disp.includes(id));
    return tem.length ? `<div class="bip-grupo"><h5>${titulo}</h5>${tem.map((id) => `
      <button class="bip-peca cat-${BLOCOS[id].cat}${b.nivel.novo === id ? ' novo' : ''}" type="button" data-peca="${id}">
        <span aria-hidden="true">${BLOCOS[id].icone}</span>${BLOCOS[id].nome}</button>`).join('')}</div>` : '';
  };
  $('bip-paleta').innerHTML = grupo('AÇÕES', ['andar', 'esq', 'dir']) + grupo('REPETIÇÃO', ['repita']) + grupo('CONDIÇÃO', ['enquanto']);
}
$('bip-paleta').onclick = (e) => {
  const p = e.target.closest('[data-peca]');
  if (!p || !bip || bip.rodando) return;
  tocar([[620, 0.05]]);
  inserir(p.dataset.peca);
};

// ---------- O roteiro (o programa) ----------
const listaDe = (pai) => (pai ? pai.corpo : bip.prog);
function acharPai(id, lista = bip.prog, pai = null) {
  for (const [i, no] of lista.entries()) {
    if (no.id === id) return { pai, i, no };
    if (no.corpo) { const r = acharPai(id, no.corpo, no); if (r) return r; }
  }
  return null;
}
function contarBlocos(lista = bip.prog) { return lista.reduce((s, no) => s + 1 + (no.corpo ? contarBlocos(no.corpo) : 0), 0); }
function limparSeSujo() { if (bip.sujo) reiniciarTabuleiro(); }

function inserir(tipo) {
  const b = bip;
  limparSeSujo();
  const no = { id: proxId++, tipo };
  if (tipo === 'repita') Object.assign(no, { n: 3, corpo: [] });
  if (tipo === 'enquanto') Object.assign(no, { cond: 'naoChegou', corpo: [] });
  listaDe(b.cursor.pai).splice(b.cursor.pos, 0, no);
  // repita/enquanto: o próximo bloco já entra DENTRO dele (é o que a criança quer quase sempre)
  b.cursor = BLOCOS[tipo].container ? { pai: no, pos: 0 } : { pai: b.cursor.pai, pos: b.cursor.pos + 1 };
  desenharPrograma();
}

function desenharPrograma() {
  const b = bip;
  let num = 0;
  const encaixe = '<div class="bip-encaixe" aria-hidden="true">▸ a próxima peça entra aqui</div>';
  const linhas = (lista, pai) => {
    let html = '';
    lista.forEach((no, i) => {
      if (b.cursor.pai === pai && b.cursor.pos === i) html += encaixe;
      num++;
      const bl = BLOCOS[no.tipo];
      if (!bl.container) {
        html += `<div class="bip-bloco cat-${bl.cat}" data-id="${no.id}"><b class="bip-num">${num}</b>
          <button class="bip-bloco-corpo" type="button" data-toque="${no.id}"><span aria-hidden="true">${bl.icone}</span>${bl.nome}</button>
          <button class="bip-tira" type="button" data-tira="${no.id}" aria-label="Tirar o bloco ${num}">✖</button></div>`;
        return;
      }
      const cabeca = no.tipo === 'repita'
        ? `<span class="bip-vezes" aria-label="${no.n} vezes"><button type="button" data-menos="${no.id}" aria-label="Menos">−</button><b>${no.n}</b><button type="button" data-mais="${no.id}" aria-label="Mais">+</button></span>`
        : `<button class="bip-cond" type="button" data-cond="${no.id}">${CONDICOES[no.cond].nome} ▾</button>`;
      html += `<div class="bip-caixa cat-${bl.cat}${b.cursor.pai === no ? ' aberta' : ''}" data-id="${no.id}">
        <div class="bip-bloco cabeca"><b class="bip-num">${num}</b>
          <button class="bip-bloco-corpo" type="button" data-dentro="${no.id}"><span aria-hidden="true">${bl.icone}</span>${no.tipo}</button>${cabeca}
          <button class="bip-tira" type="button" data-tira="${no.id}" aria-label="Tirar o bloco ${num}">✖</button></div>
        <div class="bip-dentro">${linhas(no.corpo, no)}${b.cursor.pai === no && b.cursor.pos === no.corpo.length ? encaixe : ''}
          ${!no.corpo.length && b.cursor.pai !== no ? '<button class="bip-vazio" type="button" data-dentro="' + no.id + '">toque aqui para pôr peças dentro</button>' : ''}</div>
        <button class="bip-fim" type="button" data-depois="${no.id}">fim do ${no.tipo}</button></div>`;
    });
    return html;
  };
  let html = linhas(b.prog, null);
  if (b.cursor.pai === null && b.cursor.pos === b.prog.length) html += encaixe;
  $('bip-programa').innerHTML = b.prog.length ? html : `${encaixe}<p class="bip-dica-vazio">O roteiro está vazio. Toque numa peça ➜</p>`;
  $('bip-blocos').textContent = `${contarBlocos()} blocos · meta ${b.nivel.meta}`;
  $('bip-texto').textContent = textoPortugol();
  $('bip-texto').hidden = !b.verCodigo;
  $('bip-programa').hidden = b.verCodigo;
  $('btn-bip-codigo').textContent = b.verCodigo ? '🧩 Ver blocos' : '👀 Ver código';
  $('btn-bip-executar').disabled = !b.prog.length;
}

$('bip-programa').onclick = (e) => {
  const b = bip;
  if (!b || b.rodando) return;
  const alvo = e.target.closest('[data-tira],[data-menos],[data-mais],[data-cond],[data-dentro],[data-depois],[data-toque]');
  if (!alvo) return;
  limparSeSujo();
  const d = alvo.dataset;
  if (d.tira) {
    const r = acharPai(Number(d.tira));
    listaDe(r.pai).splice(r.i, 1);
    // o encaixe não pode ficar dentro de um bloco que saiu (nem de um bloco que estava dentro dele): volta para o fim
    if (b.cursor.pai && !acharPai(b.cursor.pai.id)) b.cursor = { pai: null, pos: b.prog.length };
    else if (b.cursor.pai === r.pai && b.cursor.pos > r.i) b.cursor.pos--;
    tocar([[300, 0.06]]);
  } else if (d.menos || d.mais) {
    const no = acharPai(Number(d.menos || d.mais)).no;
    no.n = Math.min(9, Math.max(1, no.n + (d.mais ? 1 : -1)));
    tocar([[d.mais ? 700 : 500, 0.04]]);
  } else if (d.cond) {
    const no = acharPai(Number(d.cond)).no;
    const ops = Object.keys(CONDICOES);
    no.cond = ops[(ops.indexOf(no.cond) + 1) % ops.length];
    SOM.clique();
  } else if (d.dentro) {
    const no = acharPai(Number(d.dentro)).no;
    b.cursor = { pai: no, pos: no.corpo.length };
    SOM.clique();
  } else {
    const r = acharPai(Number(d.depois || d.toque));
    b.cursor = { pai: r.pai, pos: r.i + 1 };
    SOM.clique();
  }
  desenharPrograma();
};
$('btn-bip-limpar').onclick = () => {
  const b = bip;
  if (!b || b.rodando || !b.prog.length) return;
  SOM.clique();
  b.prog = [];
  b.cursor = { pai: null, pos: 0 };
  reiniciarTabuleiro();
  desenharPrograma();
  msgBip('Roteiro limpo. Monte de novo! 🧩');
};
$('btn-bip-codigo').onclick = () => { if (!bip) return; SOM.clique(); bip.verCodigo = !bip.verCodigo; desenharPrograma(); };

// o roteiro em texto, como se escreve nas aulas de programação (Portugol)
function textoPortugol() {
  const linhas = (lista, ind) => lista.flatMap((no) => {
    const bl = BLOCOS[no.tipo], esp = '   '.repeat(ind);
    if (!bl.container) return [`${esp}${bl.codigo}`];
    const cab = bl.codigo.replace('{n}', no.n).replace('{cond}', no.cond ? CONDICOES[no.cond].codigo : '');
    return [`${esp}${cab}`, ...linhas(no.corpo, ind + 1), `${esp}${bl.fim}`];
  });
  return ['algoritmo "bip"', 'inicio', ...linhas(bip.prog, 1), 'fimalgoritmo'].join('\n');
}

// ---------- Executar ----------
const dentro = (x, y) => y >= 0 && y < bip.g.L && x >= 0 && x < bip.g.C;
const livreEm = (x, y) => dentro(x, y) && bip.nivel.grade[y][x] !== '#';
const naEstrela = () => bip.nivel.grade[bip.robo.y][bip.robo.x] === 'F';
const venceu = () => naEstrela() && bip.moedas.size === 0;
function condicao(cond) {
  if (cond === 'naoChegou') return !naEstrela();
  const [dx, dy] = DIRS[bip.robo.dir];
  return livreEm(bip.robo.x + dx, bip.robo.y + dy);
}
// percorre o programa: cada passo é um bloco de ação (ou a conferência de um "enquanto")
function* passos(lista) {
  for (const no of lista) {
    if (no.tipo === 'repita') { for (let i = 0; i < no.n; i++) yield* passos(no.corpo); }
    else if (no.tipo === 'enquanto') {
      yield { no, confere: true };
      while (condicao(no.cond)) { yield* passos(no.corpo); yield { no, confere: true }; }
    } else yield { no };
  }
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const numeroDo = (id) => { let n = 0, achou = 0; const anda = (l) => l.forEach((no) => { n++; if (no.id === id) achou = n; if (no.corpo) anda(no.corpo); }); anda(bip.prog); return achou; };
function acender(id) {
  document.querySelectorAll('#bip-programa .rodando').forEach((el) => el.classList.remove('rodando'));
  const el = document.querySelector(`#bip-programa [data-id="${id}"]`);
  if (el) { (el.classList.contains('bip-caixa') ? el.querySelector('.cabeca') : el).classList.add('rodando'); el.scrollIntoView({ block: 'nearest' }); }
}

$('btn-bip-executar').onclick = async () => {
  const b = bip;
  if (!b) return;
  if (b.rodando) { b.parar = true; return; }   // o botão vira "Parar" enquanto roda
  if (!b.prog.length) return;
  SOM.clique();
  if (b.verCodigo) { b.verCodigo = false; desenharPrograma(); }
  reiniciarTabuleiro();
  b.rodando = true; b.parar = false; b.sujo = true; b.execucoes++;
  $('btn-bip-executar').innerHTML = '⏹ PARAR';
  $('tela-bip').classList.add('rodando');
  msgBip('▶ Executando o roteiro...');
  const meu = b;
  let resultado = null, contador = 0;
  // laço sem fim: se, na conferência de um "enquanto", o Bip está na MESMA situação (lugar, direção, moedas) pela
  // 3ª vez, ele está preso girando; avisa logo, em vez de esperar o limite de passos
  const vistos = new Map();
  for (const passo of passos(b.prog)) {
    if (bip !== meu || meu.parar) { resultado = { tipo: 'parou' }; break; }
    if (++contador > BIP.LIMITE) { resultado = { tipo: 'infinito', no: passo.no }; break; }
    acender(passo.no.id);
    if (passo.confere) {
      const chave = `${passo.no.id}:${b.robo.x},${b.robo.y},${b.robo.dir},${b.moedas.size}`;
      vistos.set(chave, (vistos.get(chave) || 0) + 1);
      if (vistos.get(chave) >= 3) { resultado = { tipo: 'infinito', no: passo.no }; break; }
      await espera(160);
      continue;
    }
    const r = b.robo;
    if (passo.no.tipo === 'andar') {
      const [dx, dy] = DIRS[r.dir], nx = r.x + dx, ny = r.y + dy;
      if (!livreEm(nx, ny)) { resultado = { tipo: 'bateu', no: passo.no, fora: !dentro(nx, ny) }; break; }
      r.x = nx; r.y = ny;
      posicionarRobo();
      tocar([[520 + (contador % 3) * 60, 0.05]]);
      if (b.moedas.delete(`${nx},${ny}`)) {
        b.moedasPegas++;
        const m = $(`bip-moeda-${nx}-${ny}`);
        if (m) m.classList.add('pega');
        $('bip-moedas').textContent = `🪙 ${b.moedasPegas}/${b.moedasPegas + b.moedas.size}`;
        tocar([[988, 0.06], [1319, 0.12]]);
      }
    } else {
      r.dir = (r.dir + (passo.no.tipo === 'dir' ? 1 : 3)) % 4;
      posicionarRobo();
      tocar([[440, 0.05]]);
    }
    await espera(BIP.PASSO);
    if (venceu()) { resultado = { tipo: 'venceu' }; break; }
  }
  if (bip !== meu) return;
  if (!resultado) resultado = { tipo: venceu() ? 'venceu' : 'acabou' };
  b.rodando = false;
  $('btn-bip-executar').innerHTML = '⚡ EXECUTAR';
  $('tela-bip').classList.remove('rodando');
  terminouExecucao(resultado);
};

function terminouExecucao(res) {
  const b = bip;
  if (res.tipo === 'venceu') { venceuNivel(); return; }
  if (res.tipo === 'parou') { msgBip('⏹ Parado. Ajuste o roteiro e execute de novo.'); return; }
  const num = res.no ? numeroDo(res.no.id) : 0;
  if (res.no) acender(res.no.id);
  const texto = res.tipo === 'bateu' ? `🤖 Ops! ${res.fora ? 'Quase caí do tabuleiro' : 'Bati num obstáculo'}! O bloco <b>${num}</b> mandou andar, mas o caminho à frente não estava livre.`
    : res.tipo === 'infinito' ? `🌀 Fiquei repetindo sem parar no bloco <b>${num}</b>! Confira a condição e o que está dentro dele.`
      : b.moedas.size && naEstrela() ? `🪙 Cheguei na estrela, mas faltou pegar ${b.moedas.size === 1 ? 'uma moeda' : `${b.moedas.size} moedas`}!`
        : '🤔 O roteiro acabou, mas eu não cheguei na estrela. Faltou alguma coisa?';
  b.falhas.push(res.tipo === 'bateu' ? `bateu no bloco ${num}` : res.tipo === 'infinito' ? 'repetiu sem parar' : 'não chegou à estrela');
  if (res.tipo === 'bateu') { $('bip-robo').classList.add('bate'); setTimeout(() => $('bip-robo')?.classList.remove('bate'), 500); }
  SOM.errado();
  msgBip(`${texto}${b.falhas.length >= 2 ? `<span class="bip-dica">💡 ${b.nivel.dica}</span>` : ''}`, 'erro');
}

// ---------- Nível completo ----------
function venceuNivel() {
  const b = bip, n = b.nivel;
  const blocos = contarBlocos(), naMeta = blocos <= n.meta, dePrimeira = !b.falhas.length;
  const estrelas = 1 + (naMeta ? 1 : 0) + (dePrimeira ? 1 : 0);
  const ganho = estrelas * 100;
  b.pontos += ganho;
  b.estrelasTotal += estrelas;
  if (estrelas === 3) b.perfeitos++;
  resultados.push({ m: { id: b.mundo.id, titulo: `${b.mundo.conceito}`, icone: b.mundo.icone, cor: '#7e57c2', regra: b.mundo.ensina },
    certa: `Nível ${b.ni + 1}: ${n.nome} (${blocos} blocos, meta ${n.meta})`, erros: b.falhas });
  $('bip-robo').classList.add('pula');
  SOM.vitoria();
  msgBip('🎉 Cheguei na estrela!', 'ok');
  $('bip-v-titulo').textContent = estrelas === 3 ? '🌟 Perfeito!' : '🎉 Nível completo!';
  $('bip-v-estrelas').innerHTML = estrelasTexto(estrelas);
  $('bip-v-texto').innerHTML = `
    <span>${naMeta ? '✅' : '➖'} Usou <b>${blocos}</b> ${blocos === 1 ? 'bloco' : 'blocos'} (meta: ${n.meta})</span>
    <span>${dePrimeira ? '✅ Acertou de primeira!' : `➖ Precisou de ${b.execucoes} tentativas`}</span>
    <span class="bip-v-ensina">💡 ${b.mundo.ensina}</span>`;
  $('bip-v-pontos').textContent = `+${ganho} pontos`;
  $('btn-bip-proximo').textContent = b.ni + 1 < b.mundo.niveis.length ? 'Próximo nível ▶' : 'Ver o resultado ▶';
  setTimeout(() => { if (bip === b) { $('bip-vitoria').hidden = false; $('btn-bip-proximo').focus(); } }, 700);
}
$('btn-bip-proximo').onclick = () => { $('bip-vitoria').hidden = true; SOM.clique(); if (bip) proximoNivel(); };
$('btn-bip-repetir-nivel').onclick = () => {
  $('bip-vitoria').hidden = true;
  SOM.clique();
  if (!bip) return;
  bip.ni--;   // o mesmo nível de novo (para tentar as 3 estrelas)
  resultados.pop();
  proximoNivel();
};

function terminarBip() {
  const b = bip;
  const total = b.mundo.niveis.length;
  pararBip();
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${b.pontos}. Mundo ${b.k + 1}: ${b.mundo.nome} (${b.mundo.conceito}).`,
    `Ganhou ${b.estrelasTotal} de ${total * 3} estrelas; ${b.perfeitos} ${b.perfeitos === 1 ? 'nível perfeito' : 'níveis perfeitos'}.`,
    ...resultados.filter((r) => r.erros.length).map((r) => `${r.certa}: ${r.erros.join(', ')}.`),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = b.perfeitos === total ? 'Programador de primeira! 🤖' : 'Mundo concluído! 🤖';
  $('fim-texto').textContent = `${aluno}, você completou o mundo "${b.mundo.nome}" com ${b.estrelasTotal} de ${total * 3} estrelas e fez ${b.pontos} pontos!`;
  const proximo = MUNDOS_BIP[b.k + 1];
  $('fim-acoes').innerHTML = `
    ${proximo ? `<button class="btn-grande" type="button" data-fim="proxima">▶ Próximo: ${proximo.nome}</button>` : ''}
    <button class="${proximo ? 'btn-sec' : 'btn-grande'}" type="button" data-fim="repetir">🔁 Jogar de novo</button>
    <button class="btn-sec" type="button" data-fim="sair">☰ Escolher outro mundo</button>`;
  $('fim-acoes').onclick = (e) => {
    const bt = e.target.closest('[data-fim]');
    if (!bt) return;
    SOM.clique();
    if (bt.dataset.fim === 'proxima') comecarBip(b.k + 1);
    else if (bt.dataset.fim === 'repetir') comecarBip(b.k);
    else telaBipMenu();
  };
  $('fim-acoes').hidden = false;
  $('fim-acoes').querySelector('.btn-grande').focus({ preventScroll: true });
}
const repetirBip = () => comecarBip(ultimoMundo);

$('btn-bip').onclick = () => { SOM.clique(); escolherProfessorE('Robô Bip', telaBipMenu); };
$('bip-voltar').onclick = telaJogos;
$('bip-sair').onclick = telaBipMenu;

export { comecarBip, pararBip, repetirBip, telaBipMenu };
