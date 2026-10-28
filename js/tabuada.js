/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Tetris da Tabuada. */

import { $, sortear } from './util.js?v=124';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=124';
import { SOM, tocar } from './som.js?v=124';
import { mascote, mostrar, telaJogos } from './telas.js?v=124';
import { escolherProfessorE } from './professor.js?v=124';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=124';

// ---------- Tetris da Tabuada ----------
// Tabuada (multiplicação de 1 a 9). Quadrados com resultados da tabuada caem em colunas e se empilham no pote, como no
// Tetris (sem rolar: ficam buracos). O aluno monta a conta no teclado (número, operação, número: 7 × 8) e toca no quadrado
// com o resultado (56), que estoura; os quadrados de cima caem no lugar. As outras operações do teclado também valem
// (12 = 9 + 3), mas os números grandes só saem pela tabuada. O jogo só acaba quando a pilha chega ao topo do pote.
// A cada 4 quadrados sobe um nível: a tabuada vai até números maiores (no fim, os que mais confundem:
// 56, 63, 72, 81...), os quadrados caem mais depressa e ficam MAIORES (2 x 2 e 3 x 3 casas), enchendo o pote mais rápido.
const TAB = { POR_NIVEL: 4, NIVEL_MAX: 6, PERIGO: 0.8 };   // PERIGO: segundos com a pilha encostada no topo até acabar
// os resultados que mais confundem na tabuada de 1 a 9
const DIFICEIS = [36, 42, 48, 49, 54, 56, 63, 64, 72, 81];
// fatores da tabuada (de/até), parte dos quadrados com os difíceis, intervalo entre quadrados (ms),
// velocidade máxima de queda (px por quadro a 60 fps) e tamanhos sorteados (casas)
const NIVEIS_TAB = [
  { ate: 5, dificeis: 0, intervalo: 3800, vmax: 1.0, tamanhos: [1] },
  { ate: 6, dificeis: 0, intervalo: 3700, vmax: 1.1, tamanhos: [1, 1, 2] },
  { ate: 7, dificeis: 0.2, intervalo: 3700, vmax: 1.15, tamanhos: [1, 2] },
  { ate: 8, dificeis: 0.3, intervalo: 3600, vmax: 1.25, tamanhos: [1, 2, 2] },
  { ate: 9, dificeis: 0.4, intervalo: 3600, vmax: 1.3, tamanhos: [1, 2, 2, 3] },
  { ate: 9, dificeis: 0.55, intervalo: 3400, vmax: 1.4, tamanhos: [1, 2, 3, 2] },
];
// no relatório, cada quadrado conta para a tabuada usada (o maior fator da conta); outras contas ficam à parte
const TIPOS_TAB = {};
const tipoDaConta = (a, op, b) => {
  const id = op === '×' ? `tab-x${Math.max(a, b)}` : 'tab-outras';
  if (!TIPOS_TAB[id]) {
    TIPOS_TAB[id] = op === '×'
      ? { id, titulo: `Tabuada do ${Math.max(a, b)}`, icone: '✖️', cor: '#8e44ad', regra: `Lembrar os resultados da tabuada do ${Math.max(a, b)} (até ${Math.max(a, b)} × 9).` }
      : { id, titulo: 'Outras contas (+ − ÷)', icone: '🔢', cor: '#1fa2b0', regra: 'Chegar ao número do quadrado com soma, subtração ou divisão.' };
  }
  return TIPOS_TAB[id];
};
const CORES_BLOCO = ['#e53935', '#1e64d2', '#2e9e5b', '#8e44ad', '#f57c00', '#1fa2b0'];
let tab = null;   // a partida em andamento

const entre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
// um resultado da tabuada do nível; nos níveis altos, boa parte vem dos que mais confundem
function valorDoBloco(nv) {
  if (Math.random() < nv.dificeis) return sortear(DIFICEIS.filter((v) => v <= nv.ate * 9));
  const a = entre(2, nv.ate), b = entre(Math.max(2, nv.ate - 4), nv.ate);
  return Math.random() < 0.5 ? a * b : entre(1, nv.ate) * entre(2, nv.ate);
}
// as formas de chegar a um número pela tabuada (3 × 4 e 4 × 3 são a mesma forma)
const formasDaTabuada = (v) => { const f = []; for (let a = 1; a <= 9; a++) for (let b = a; b <= 9; b++) if (a * b === v) f.push(`${a}×${b}`); return f; };
const formaDaConta = (a, op, b) => (op === '×' ? `${Math.min(a, b)}×${Math.max(a, b)}` : `${a}${op}${b}`);
const conta = (a, op, b) => (op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b);

function telaTabuadaMenu() {
  pararTabuada();
  mascote('davi-tabuada', 'oi');
  mostrar('tela-tabuada-menu');
}

function comecarTabuada() {
  pararTabuada();
  definirMissao({ id: 'tabuada', tabuada: true, icone: '🔢', cor: '#1e64d2', titulo: 'Tetris da Tabuada' });
  definirResultados([]);
  tab = { nivel: 1, nivelMax: 1, estouradas: 0, pontos: 0, combo: 0, erros: 0, blocos: [], faiscas: [], expr: { a: null, op: null, b: null },
    errosDoBloco: [], usadas: new Map(), pedidasOutraForma: 0, outraFormaFeita: 0, ultimoAcerto: performance.now(), proxima: 0, ultimo: 0, raf: 0, rodando: true };
  mostrar('tela-tabuada');
  limparConta();
  hudTabuada();
  msgTab('Monte a conta no teclado e toque no quadrado com o resultado!');
  requestAnimationFrame(() => {   // espera a tela montar para medir o pote
    if (!tab) return;
    medirPote();
    const agora = performance.now();
    tab.ultimo = agora;
    tab.proxima = agora + 400;
    tab.raf = requestAnimationFrame(quadroTabuada);
  });
}

function pararTabuada() {
  if (tab) { tab.rodando = false; cancelAnimationFrame(tab.raf); }
  tab = null;
}
const msgTab = (texto, tipo = '') => { $('tab-msg').innerHTML = texto; $('tab-msg').className = `cores-msg ${tipo}`; };

function hudTabuada() {
  $('tab-nivel').textContent = `🔢 Nível ${tab.nivel} de ${TAB.NIVEL_MAX}`;
  $('tab-pontos').textContent = tab.pontos;
  $('tab-contador').textContent = `${tab.estouradas} ${tab.estouradas === 1 ? 'quadrado' : 'quadrados'}`;
}

// ----- o pote (canvas): uma grade de casas; cada quadrado ocupa s x s casas -----
function medirPote() {
  const cv = $('tab-canvas');
  const r = cv.parentElement.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(r.width * dpr);
  cv.height = Math.round(r.height * dpr);
  tab.w = r.width; tab.h = r.height; tab.dpr = dpr;
  tab.casa = Math.min(r.width / 7, r.height / 8);   // 7 colunas no celular (pelo menos 8 linhas de altura)
  tab.colunas = Math.max(4, Math.floor(r.width / tab.casa));
  tab.x0 = (r.width - tab.colunas * tab.casa) / 2;   // a grade fica centralizada no pote
  tab.perigo = 3;   // o topo do pote: um quadrado parado encostado aqui acaba o jogo
}

// nasce em cima do pote, numa coluna livre (sem outro quadrado ainda descendo pelo topo); sem lugar, devolve false
function novoBloco() {
  const nv = NIVEIS_TAB[tab.nivel - 1], c = tab.casa;
  const s = Math.min(sortear(nv.tamanhos), tab.colunas);
  const livres = [];
  for (let col = 0; col <= tab.colunas - s; col++) {
    if (!tab.blocos.some((o) => o.col < col + s && col < o.col + o.s && o.y < 2)) livres.push(col);
  }
  if (!livres.length) return false;
  tab.blocos.push({ col: sortear(livres), s, y: -s * c, vy: 0, valor: valorDoBloco(nv),
    cor: sortear(CORES_BLOCO), amassa: 0, acima: 0, nasce: performance.now() });
  return true;
}

// cada quadrado cai na sua coluna até encostar no chão ou no quadrado de baixo (os de baixo são resolvidos primeiro)
function fisica(dt) {
  const nv = NIVEIS_TAB[tab.nivel - 1], c = tab.casa;
  const ordem = [...tab.blocos].sort((a, b) => (b.y + b.s * c) - (a.y + a.s * c));
  const prontos = [];
  for (const b of ordem) {
    b.vy = Math.min(b.vy + 0.12 * dt, nv.vmax);
    let chao = tab.h;
    for (const o of prontos) {
      const cruza = o.col < b.col + b.s && b.col < o.col + o.s;
      if (cruza && o.y >= b.y + b.s * c - 1) chao = Math.min(chao, o.y);
    }
    const alvo = b.y + b.vy * dt, limite = chao - b.s * c;
    if (alvo >= limite) {
      if (b.vy > 0.6 && b.y < limite - 0.5) b.amassa = Math.min(1, b.vy / 1.6);   // bateu: amassa (squash)
      b.y = limite; b.vy = 0;
    } else b.y = alvo;
    prontos.push(b);
  }
}

function caixa(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

function desenhar(agora) {
  const cv = $('tab-canvas'), g = cv.getContext('2d'), { w, h, dpr, casa: c, x0 } = tab;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  // grade bem clarinha: mostra as colunas onde os quadrados caem
  g.save(); g.strokeStyle = 'rgba(19, 41, 75, 0.06)'; g.lineWidth = 1;
  for (let i = 1; i < tab.colunas; i++) { g.beginPath(); g.moveTo(x0 + i * c, 0); g.lineTo(x0 + i * c, h); g.stroke(); }
  g.restore();
  // aviso: com a pilha a menos de 2 casas do topo, a borda de cima pisca em vermelho (mais depressa quando encosta)
  const parados = tab.blocos.filter((b) => b.vy === 0 && agora - b.nasce > 600);
  const topo = parados.length ? Math.min(...parados.map((b) => b.y)) : h;
  if (topo < c * 2) {
    const ritmo = tab.blocos.some((b) => b.acima > 0) ? 120 : 300;
    g.save(); g.globalAlpha = Math.floor(agora / ritmo) % 2 ? 0.85 : 0.35;
    const grad = g.createLinearGradient(0, 0, 0, c * 0.7);
    grad.addColorStop(0, '#e53935'); grad.addColorStop(1, 'rgba(229, 57, 53, 0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, c * 0.7); g.restore();
  }
  for (const b of tab.blocos) {
    const lado = b.s * c, x = x0 + b.col * c;
    // comprime ao bater (squash) e estica um pouco quando cai rápido (stretch); a base fica no lugar
    b.amassa *= 0.86;
    const estica = Math.min(0.1, b.vy * 0.04);
    const sx = 1 + b.amassa * 0.16 - estica * 0.5, sy = 1 - b.amassa * 0.16 + estica;
    const nascendo = Math.min(1, (agora - b.nasce) / 220);
    g.save();
    g.translate(x + lado / 2, b.y + lado);
    g.scale(sx * nascendo, sy * nascendo);
    const m = 2;   // folga entre quadrados vizinhos
    const grad = g.createLinearGradient(0, -lado, 0, 0);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.18, b.cor); grad.addColorStop(1, b.cor);
    caixa(g, -lado / 2 + m, -lado + m, lado - 2 * m, lado - 2 * m, Math.min(12, lado * 0.18));
    g.fillStyle = grad; g.fill();
    g.lineWidth = 3; g.strokeStyle = '#13294b'; g.stroke();
    // brilho e sombra internos (volume de bloco)
    g.globalAlpha = 0.18; g.fillStyle = '#000';
    g.fillRect(-lado / 2 + m + 3, -m - lado * 0.12, lado - 2 * m - 6, lado * 0.1);
    g.globalAlpha = 1;
    g.font = `700 ${Math.round(lado * (b.valor >= 10 ? 0.4 : 0.48))}px Fredoka, Nunito, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = Math.max(3, lado * 0.07); g.strokeStyle = '#13294b'; g.strokeText(b.valor, 0, -lado / 2 + 2);
    g.fillStyle = '#fff'; g.fillText(b.valor, 0, -lado / 2 + 2);
    g.restore();
  }
  // estouro: um quadrado de contorno que abre e faíscas
  for (const f of tab.faiscas) {
    const t = (agora - f.t0) / 450;
    g.save(); g.globalAlpha = Math.max(0, 1 - t);
    if (f.anel) {
      const l = f.lado * (1 + t * 0.8);
      g.lineWidth = 4; g.strokeStyle = f.cor; caixa(g, f.x - l / 2, f.y - l / 2, l, l, 10); g.stroke();
    } else {
      g.fillStyle = f.cor;
      const tam = 6 * (1 - t) + 2;
      g.fillRect(f.x + f.vx * t * 45 - tam / 2, f.y + f.vy * t * 45 + t * t * 25 - tam / 2, tam, tam);
    }
    g.restore();
  }
  tab.faiscas = tab.faiscas.filter((f) => agora - f.t0 < 450);
}

function quadroTabuada(agora) {
  if (!tab || !tab.rodando) return;
  const dt = Math.min(3, (agora - tab.ultimo) / 16.67);
  tab.ultimo = agora;
  const nv = NIVEIS_TAB[tab.nivel - 1];
  if (agora >= tab.proxima) {
    if (!novoBloco()) tab.proxima = agora + 300;   // sem coluna livre no topo: tenta de novo daqui a pouco
    else {
      // começo: os três primeiros chegam mais juntos para o pote não ficar vazio; depois de um quadrado grande, o próximo demora mais
      const s = tab.blocos[tab.blocos.length - 1].s;
      tab.proxima = agora + (tab.blocos.length < 3 && tab.estouradas === 0 ? 1200 : nv.intervalo * (0.7 + 0.3 * s));
    }
  }
  fisica(dt);
  // fim: um quadrado parado (apoiado) acima da linha vermelha por um tempinho
  let perdeu = false;
  for (const b of tab.blocos) {
    b.acima = b.vy === 0 && agora - b.nasce > 600 && b.y <= tab.perigo ? b.acima + dt / 60 : 0;
    if (b.acima > TAB.PERIGO) perdeu = true;
  }
  desenhar(agora);
  if (perdeu) { terminarTabuada(false); return; }
  tab.raf = requestAnimationFrame(quadroTabuada);
}

// ----- a conta no teclado -----
function limparConta() {
  if (tab) tab.expr = { a: null, op: null, b: null };
  mostrarConta();
}
function resultadoDaConta() {
  const { a, op, b } = tab.expr;
  return a != null && op && b != null ? conta(a, op, b) : null;
}
function mostrarConta() {
  const e = tab ? tab.expr : { a: null, op: null, b: null };
  $('tab-n1').textContent = e.a ?? '?';
  $('tab-op').textContent = e.op ?? '?';
  $('tab-n2').textContent = e.b ?? '?';
  const r = tab ? resultadoDaConta() : null;
  $('tab-res').textContent = '?';   // o resultado não aparece: a criança é quem precisa saber quanto dá
  $('tab-conta').classList.toggle('pronta', r != null);
  // teclas acesas: o número da vez (o 1º antes da operação, o 2º depois) e a operação escolhida
  document.querySelectorAll('#tab-teclado .tab-tecla').forEach((k) => {
    const n = Number(k.dataset.n);
    const acesa = k.dataset.op ? k.dataset.op === e.op : (e.op == null ? n === e.a : n === e.a || n === e.b);
    k.classList.toggle('escolhida', acesa);
  });
}
function teclaNumero(n) {
  if (!tab || !tab.rodando) return;
  tocar([[520, 0.04]]);
  const e = tab.expr;
  if (e.op == null) e.a = n;          // ainda sem operação: troca o primeiro número
  else e.b = n;                        // com operação: o segundo (tocar de novo troca)
  mostrarConta();
}
function teclaOperacao(op) {
  if (!tab || !tab.rodando) return;
  if (tab.expr.a == null) { msgTab('Primeiro escolha um número, depois a operação.', 'erro'); return; }
  tocar([[620, 0.04]]);
  tab.expr.op = op;
  mostrarConta();
}

// toque no pote: acha o quadrado tocado e confere com a conta
function tocarPote(e) {
  if (!tab || !tab.rodando) return;
  const rect = $('tab-canvas').getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top, c = tab.casa;
  const alvo = tab.blocos.find((b) => x >= tab.x0 + b.col * c && x <= tab.x0 + (b.col + b.s) * c && y >= b.y && y <= b.y + b.s * c);
  if (!alvo) return;
  const r = resultadoDaConta();
  if (r == null) {
    msgTab(`Monte primeiro a conta que dá <b>${alvo.valor}</b>!`);
    alvo.amassa = 0.6;
    return;
  }
  const { a, op, b } = tab.expr;
  const texto = `${a} ${op} ${b} = ${Number.isInteger(r) ? r : r.toFixed(1).replace('.', ',')}`;
  if (r === alvo.valor) {
    // já estourou este número com esta mesma conta e a tabuada tem outra forma: pede a outra (não é erro)
    const usadas = tab.usadas.get(alvo.valor) || new Set();
    const forma = formaDaConta(a, op, b);
    if (usadas.has(forma) && formasDaTabuada(alvo.valor).some((f) => !usadas.has(f))) {
      tab.pedidasOutraForma++;
      alvo.amassa = 0.6;
      tocar([[440, 0.06], [660, 0.08]]);
      msgTab(`Você já fez o <b>${alvo.valor}</b> com ${a} ${op} ${b}. Tem outra forma na tabuada: tente outra conta!`, 'aviso');
      return;
    }
    if (usadas.size && !usadas.has(forma)) tab.outraFormaFeita++;
    usadas.add(forma);
    tab.usadas.set(alvo.valor, usadas);
    estourar(alvo, texto, op);
  }
  else {
    tab.erros++;
    tab.combo = 0;
    tab.errosDoBloco.push(`tocou no quadrado ${alvo.valor} com ${texto}`);
    alvo.amassa = 0.8;
    const bar = $('tab-conta');
    bar.classList.remove('errou'); void bar.offsetWidth; bar.classList.add('errou');
    msgTab(Number.isInteger(r) ? `${a} ${op} ${b} não dá <b>${alvo.valor}</b>. Pense de novo na tabuada!` : 'Essa divisão não é exata. Tente outra conta!', 'erro');
    SOM.errado();
  }
}

function estourar(bloco, texto, op) {
  const agora = performance.now(), c = tab.casa, lado = bloco.s * c;
  const cx = tab.x0 + bloco.col * c + lado / 2, cy = bloco.y + lado / 2;
  tab.blocos = tab.blocos.filter((b) => b !== bloco);   // os de cima caem sozinhos no próximo quadro
  tab.faiscas.push({ anel: true, x: cx, y: cy, lado, cor: bloco.cor, t0: agora });
  for (let i = 0; i < 14; i++) { const ang = (i / 14) * Math.PI * 2; tab.faiscas.push({ x: cx, y: cy, vx: Math.cos(ang), vy: Math.sin(ang), cor: i % 2 ? bloco.cor : '#f7c600', t0: agora }); }
  tab.combo++;
  tab.estouradas++;
  tab.pontos += 10 * tab.nivel * bloco.s + (tab.combo > 1 ? 5 * (tab.combo - 1) : 0);   // quadrado grande vale mais
  resultados.push({ m: tipoDaConta(tab.expr.a, op, tab.expr.b), certa: texto, erros: tab.errosDoBloco, nivel: tab.nivel, tempo: (agora - tab.ultimoAcerto) / 1000 });
  tab.errosDoBloco = [];
  tab.ultimoAcerto = agora;
  tocar([[523, 0.05], [784, 0.07], [1047, 0.09]]);
  limparConta();
  if (tab.estouradas % TAB.POR_NIVEL === 0 && tab.nivel < TAB.NIVEL_MAX) {
    tab.nivel++;
    tab.nivelMax = tab.nivel;
    const ant = NIVEIS_TAB[tab.nivel - 2], nv = NIVEIS_TAB[tab.nivel - 1];
    const maior = Math.max(...nv.tamanhos) > Math.max(...ant.tamanhos) ? ` Cuidado: quadrados de ${Math.max(...nv.tamanhos)} x ${Math.max(...nv.tamanhos)}!` : '';
    msgTab(`⬆️ Nível ${tab.nivel}!${nv.ate > ant.ate ? ` Agora a tabuada vai até o ${nv.ate}.` : ' Mais números difíceis e mais depressa!'}${maior}`, 'ok');
    SOM.certo();
  } else msgTab(tab.combo > 2 ? `🔥 ${tab.combo} seguidos!` : `✅ ${texto}`, 'ok');
  hudTabuada();
}

function terminarTabuada() {
  const { estouradas, pontos, nivelMax, erros, pedidasOutraForma, outraFormaFeita } = tab;
  const porTabuada = Object.values(TIPOS_TAB).map((t) => [t.titulo, resultados.filter((r) => r.m === t).length]).filter(([, n]) => n)
    .sort((x, y) => x[0].localeCompare(y[0], 'pt-BR', { numeric: true }));
  pararTabuada();
  missao.resumo = [
    `Estourou ${estouradas} ${estouradas === 1 ? 'quadrado' : 'quadrados'} antes de a pilha chegar ao topo e chegou ao nível ${nivelMax} de ${TAB.NIVEL_MAX}.`,
    porTabuada.length ? `Quadrados por tabuada: ${porTabuada.map(([n, q]) => `${n}: ${q}`).join('; ')}.` : 'Não chegou a estourar nenhum quadrado.',
    erros ? `Tocou ${erros} ${erros === 1 ? 'vez' : 'vezes'} num quadrado que não era o resultado da conta.` : 'Não tocou em nenhum quadrado errado.',
    pedidasOutraForma || outraFormaFeita ? `Repetiu a mesma conta para um número que tem outra forma ${pedidasOutraForma} ${pedidasOutraForma === 1 ? 'vez' : 'vezes'}; usou outra forma da tabuada ${outraFormaFeita} ${outraFormaFeita === 1 ? 'vez' : 'vezes'}.` : '',
  ].filter(Boolean);
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = estouradas >= 30 ? 'Mestre da tabuada! 🏆' : 'A pilha chegou ao topo!';
  $('fim-texto').textContent = `${aluno}, você estourou ${estouradas} ${estouradas === 1 ? 'quadrado' : 'quadrados'} e fez ${pontos} pontos!`;
}

// teclado na tela (e no computador: números, + - * x /, Backspace ou Esc limpa)
$('tab-teclado').onclick = (e) => {
  const k = e.target.closest('.tab-tecla');
  if (!k) return;
  if (k.dataset.n) teclaNumero(Number(k.dataset.n)); else teclaOperacao(k.dataset.op);
};
$('tab-limpar').onclick = () => { tocar([[400, 0.04]]); limparConta(); };
$('tab-canvas').addEventListener('pointerdown', tocarPote);
document.addEventListener('keydown', (e) => {
  if (!tab || !$('tela-tabuada').classList.contains('ativa')) return;
  if (/^[1-9]$/.test(e.key)) teclaNumero(Number(e.key));
  else if (e.key === '+') teclaOperacao('+');
  else if (e.key === '-') teclaOperacao('−');
  else if (e.key === '*' || e.key.toLowerCase() === 'x') teclaOperacao('×');
  else if (e.key === '/') { e.preventDefault(); teclaOperacao('÷'); }
  else if (e.key === 'Backspace' || e.key === 'Escape') limparConta();
});
// o pote muda de tamanho (tela se ajustando, girar o aparelho): mede de novo e mantém a pilha no chão
new ResizeObserver(() => {
  if (!tab || !tab.w || $('tab-pote').clientWidth < 10) return;   // escondido: não mede
  const h0 = tab.h, c0 = tab.casa;
  medirPote();
  if (Math.abs(tab.h - h0) < 1 && Math.abs(tab.casa - c0) < 0.5) return;
  for (const b of tab.blocos) {
    b.col = Math.min(b.col, Math.max(0, tab.colunas - b.s));
    b.y = tab.h - (h0 - b.y) * (tab.casa / c0);
  }
}).observe($('tab-pote'));

$('btn-tabuada').onclick = () => { SOM.clique(); escolherProfessorE('Tetris da Tabuada', telaTabuadaMenu); };
$('tabuada-voltar').onclick = telaJogos;
$('btn-tabuada-comecar').onclick = () => { SOM.clique(); comecarTabuada(); };
$('tabuada-sair').onclick = telaTabuadaMenu;

export { comecarTabuada, pararTabuada, telaTabuadaMenu };
