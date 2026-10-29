/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Polícia e Ladrão. */

import { $, embaralhar, sortear } from './util.js?v=135';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=135';
import { SOM, tocar } from './som.js?v=135';
import { mascote, mostrar, telaJogos } from './telas.js?v=135';
import { escolherProfessorE } from './professor.js?v=135';
import { segundos } from './luzes.js?v=135';
import { fimDaMissao } from './relatorio.js?v=135';

// ---------- Polícia e Ladrão ----------
// Controle inibitório e orientação espacial. Uma cidade pequena vista de cima (a tela acompanha a viatura). A criança
// dirige a viatura para pegar o carro do ladrão, que foge pelas ruas. Os botões de direção estão em lugares TROCADOS
// para confundir: o botão de cima leva para baixo, e assim por diante; a criança precisa ler a seta e não ir pela posição.
// Cada toque numa seta vira o carro para aquela direção e anda um pouco (segurando, ele repete os passinhos).
// O tiro sai do lado do motorista, para a frente; cada tiro que acerta deixa o ladrão mais lento. Prende com 3 tiros
// ou encostando nele. Calçadas, casas e árvores bloqueiam o caminho.
// Setas: estão sempre fora do lugar e, a cada 20 segundos, mudam de lugar de novo (reflexo e atenção). O ladrão fica
// mais rápido a cada nível: 1º e 2º ladrão devagar, 3º e 4º médio, 5º rápido.
// São 5 ladrões, 60 segundos cada; se o tempo acabar, o ladrão foge.
const POLICIA = { LADROES: 5, SEGUNDOS: 60, NIVEL_MAX: 3 };
const TILE = 56, N = 15;                                     // a cidade: 15 × 15 quadradinhos de 56 px
const RUA = (i) => i % 3 === 1;                              // ruas nas linhas e colunas 1, 4, 7, 10 e 13
const VEL_POLICIA = 160, VEL_LADRAO = [0, 110, 122, 132];    // px por segundo (o ladrão, conforme o nível)
const GIRO = 9;                                              // quanto a viatura gira por segundo (radianos)
const PASSO = 40, REPETE = 230;                              // cada toque anda 40 px; segurando, repete a cada 230 ms
const TIROS_PARA_PRENDER = 3;
const DIRS = { cima: [0, -1], baixo: [0, 1], esq: [-1, 0], dir: [1, 0] };
const TROCA_SETAS = 20000;   // a cada 20 s as setas mudam de lugar
// a seta desenhada na tecla (um "V" branco apontando para a direção)
const GIRA = { cima: 0, dir: 90, baixo: 180, esq: 270 };
const setaSVG = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" style="transform: rotate(${GIRA[d]}deg)"><path d="M5 15.5 12 8.5l7 7" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const NIVEIS_POLICIA = [
  { titulo: 'Ladrão devagar' },
  { titulo: 'Ladrão mais rápido' },
  { titulo: 'Ladrão muito rápido' },
];
const REGRA_SETAS = 'As setas estão fora do lugar e mudam a cada 20 segundos: olhar a seta, não a posição da tecla (controle inibitório e reflexo).';
const TIPOS_POLICIA = [
  { id: 'pol1', titulo: 'Ladrão devagar', icone: '🚓', cor: '#1e88e5', regra: REGRA_SETAS },
  { id: 'pol2', titulo: 'Ladrão mais rápido', icone: '🔀', cor: '#e53935', regra: REGRA_SETAS },
  { id: 'pol3', titulo: 'Ladrão muito rápido', icone: '🎲', cor: '#8e24aa', regra: REGRA_SETAS },
];
let pol = null;   // a partida em andamento

// ---------- a cidade ----------
function novaCidade() {
  for (;;) {
    const bloqueio = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => !(RUA(x) || RUA(y))));
    // árvores em alguns pedaços de rua (nunca nas esquinas)
    const pedacos = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!bloqueio[y][x] && !(RUA(x) && RUA(y))) pedacos.push([x, y]);
    const arvores = embaralhar(pedacos).slice(0, 7);
    arvores.forEach(([x, y]) => { bloqueio[y][x] = 'arvore'; });
    // todas as ruas continuam ligadas
    const livres = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!bloqueio[y][x]) livres.push([x, y]);
    const visto = new Set([`${livres[0][0]},${livres[0][1]}`]), fila = [livres[0]];
    while (fila.length) {
      const [x, y] = fila.shift();
      Object.values(DIRS).forEach(([dx, dy]) => {
        const a = x + dx, b = y + dy, k = `${a},${b}`;
        if (a >= 0 && b >= 0 && a < N && b < N && !bloqueio[b][a] && !visto.has(k)) { visto.add(k); fila.push([a, b]); }
      });
    }
    if (visto.size !== livres.length) continue;
    // enfeites dos quarteirões: casas (telhados coloridos) e árvores
    const enfeites = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (bloqueio[y][x] !== true) continue;
      enfeites.push(Math.random() < 0.6 ? { tipo: 'casa', cor: sortear(['#e57373', '#64b5f6', '#ffb74d', '#a1887f', '#81c784']), r: Math.random() < 0.5 }
        : { tipo: 'arvores' });
    }
    return { bloqueio, enfeites };
  }
}
const livre = (cid, px, py) => {
  const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
  return x >= 0 && y >= 0 && x < N && y < N && !cid.bloqueio[y][x];
};
// o carro (um círculo de raio 14) cabe ali?
const cabe = (cid, px, py, r = 14) => [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, -r * 0.7]]
  .every(([dx, dy]) => livre(cid, px + dx, py + dy));
const centro = (i) => i * TILE + TILE / 2;

function telaPoliciaMenu() { pararPolicia(); mascote('davi-policia', 'oi'); mostrar('tela-policia-menu'); }

function comecarPolicia() {
  pararPolicia();
  definirMissao({ id: 'policia', policia: true, icone: '🚓', cor: '#1e88e5', titulo: 'Polícia e Ladrão (setas trocadas)' });
  definirResultados([]);
  pol = { feitas: 0, presos: 0, pontos: 0, tiros: 0, acertos: 0, batidas: 0, nivelMax: 1, rodando: true, balas: [], timers: [] };
  mostrar('tela-policia');
  requestAnimationFrame(() => novaPerseguicao());
}

function pararPolicia() {
  if (pol) { pol.rodando = false; cancelAnimationFrame(pol.quadro); pol.timers.forEach(clearTimeout); }
  clearInterval(repetindo);
  pol = null;
}
const msgPolicia = (texto, tipo = '') => { $('policia-msg').innerHTML = texto; $('policia-msg').className = `policia-msg ${tipo}`; };

// as teclas em lugares trocados: nenhuma seta no seu lugar e todas num lugar diferente da arrumação anterior
let arrumacaoAnterior = [];
function arrumarBotoes() {
  const lugares = ['cima', 'esq', 'dir', 'baixo'];
  let s;
  do { s = embaralhar(lugares); } while (s.some((d, i) => d === lugares[i] || d === arrumacaoAnterior[i]));
  arrumacaoAnterior = s;
  const em = Object.fromEntries(lugares.map((l, i) => [l, s[i]]));   // em[lugar] = direção da tecla nesse lugar
  lugares.forEach((l) => {
    const b = $(`policia-${l}`);
    b.dataset.dir = em[l];
    b.innerHTML = setaSVG(em[l]);
    b.setAttribute('aria-label', `Ir para ${{ cima: 'cima', baixo: 'baixo', esq: 'a esquerda', dir: 'a direita' }[em[l]]}`);
  });
}

function novaPerseguicao() {
  const p = pol;
  if (!p || !p.rodando) return;
  if (p.feitas >= POLICIA.LADROES) { terminarPolicia(); return; }
  p.feitas++;
  p.nivel = p.feitas <= 2 ? 1 : p.feitas <= 4 ? 2 : 3;
  p.nivelMax = Math.max(p.nivelMax, p.nivel);
  p.cid = novaCidade();
  // viatura numa esquina, ladrão numa esquina longe
  const esquinas = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (RUA(x) && RUA(y)) esquinas.push([x, y]);
  const [vx, vy] = sortear(esquinas);
  const longe = esquinas.filter(([x, y]) => Math.abs(x - vx) + Math.abs(y - vy) >= 9);
  const [lx, ly] = sortear(longe.length ? longe : esquinas);
  Object.assign(p, {
    viatura: { x: centro(vx), y: centro(vy), ang: -Math.PI / 2 },
    ladrao: { x: centro(lx), y: centro(ly), alvo: null, ang: 0, preso: false, acertos: 0 },
    balas: [], dir: null, falta: 0, t0: performance.now(), ultimo: performance.now(), ativo: true, batendo: false,
    tirosRodada: 0, batidasRodada: 0, proximaTroca: performance.now() + TROCA_SETAS,
  });
  arrumarBotoes();
  $('policia-nivel').textContent = `🚓 Nível ${p.nivel} de ${POLICIA.NIVEL_MAX}`;
  $('policia-pontos').textContent = p.pontos;
  $('policia-contador').textContent = `Ladrão ${p.feitas} de ${POLICIA.LADROES} · ${NIVEIS_POLICIA[p.nivel - 1].titulo}`;
  msgPolicia('Pegue o ladrão! 🚨 As setas estão fora do lugar e mudam a cada 20 segundos.');
  cancelAnimationFrame(p.quadro);
  p.quadro = requestAnimationFrame(passo);
}

// ---------- a cada quadro: move a viatura, o ladrão e os tiros; confere se prendeu ----------
function passo(agora) {
  const p = pol;
  if (!p || !p.rodando) return;
  const dt = Math.min(0.05, (agora - p.ultimo) / 1000);
  p.ultimo = agora;
  if (p.ativo) {
    moverViatura(p, dt);
    moverLadrao(p, dt);
    moverBalas(p, dt);
    // a cada 20 s as setas mudam de lugar (as teclas piscam para avisar)
    if (agora >= p.proximaTroca) {
      p.proximaTroca = agora + TROCA_SETAS;
      p.trocas = (p.trocas || 0) + 1;
      arrumarBotoes();
      const cruz = document.querySelector('.policia-cruz');
      cruz.classList.remove('trocou');
      void cruz.offsetWidth;
      cruz.classList.add('trocou');
      tocar([[660, 0.06], [880, 0.08]]);
      msgPolicia('🔀 As setas mudaram de lugar! Olhe bem antes de tocar.');
    }
    const resta = POLICIA.SEGUNDOS - (agora - p.t0) / 1000;
    $('policia-tempo').textContent = `⏱ ${Math.max(0, Math.ceil(resta))} s`;
    if (Math.hypot(p.viatura.x - p.ladrao.x, p.viatura.y - p.ladrao.y) < 28) prender('encostou');
    else if (resta <= 0) fugiu();
  }
  desenhar(p);
  p.quadro = requestAnimationFrame(passo);
}

function moverViatura(p, dt) {
  const v = p.viatura;
  // a direção do último toque: o carro gira até ela e anda o que falta do passinho
  if (!p.dir || p.falta <= 0) return;
  const [dx, dy] = DIRS[p.dir];
  const alvo = Math.atan2(dy, dx);
  let dif = alvo - v.ang;
  while (dif > Math.PI) dif -= 2 * Math.PI;
  while (dif < -Math.PI) dif += 2 * Math.PI;
  v.ang += Math.sign(dif) * Math.min(Math.abs(dif), GIRO * dt);
  const vel = Math.abs(dif) > 1.2 ? VEL_POLICIA * 0.35 : VEL_POLICIA;   // freia para fazer a curva
  const anda = Math.min(p.falta, vel * dt);
  p.falta -= anda;
  let nx = v.x + Math.cos(v.ang) * anda, ny = v.y + Math.sin(v.ang) * anda;
  // ajuda nas esquinas: o carro se alinha sozinho ao meio da rua da direção pedida (sem raspar no quarteirão)
  const meioDaRua = (c) => { const i = Math.floor(c / TILE); return centro([i - 1, i, i + 1].filter(RUA).reduce((a, b) => (Math.abs(centro(b) - c) < Math.abs(centro(a) - c) ? b : a))); };
  const ajuste = vel * dt * 0.9;
  if (dx === 0) nx += Math.max(-ajuste, Math.min(ajuste, meioDaRua(v.x) - v.x));
  else ny += Math.max(-ajuste, Math.min(ajuste, meioDaRua(v.y) - v.y));
  // bateu: tenta escorregar só num eixo
  if (cabe(p.cid, nx, ny)) { v.x = nx; v.y = ny; p.batendo = false; return; }
  if (cabe(p.cid, nx, v.y)) { v.x = nx; return; }
  if (cabe(p.cid, v.x, ny)) { v.y = ny; return; }
  p.falta = 0;
  if (!p.batendo) { p.batendo = true; p.batidas++; p.batidasRodada++; tocar([[150, 0.06]]); }
}
// um toque: vira para a seta e anda um passinho
function darPasso(dir) {
  const p = pol;
  if (!p || !p.ativo) return;
  p.dir = dir;
  p.falta = PASSO;
}

// o ladrão anda de esquina em esquina pelas ruas e, em cada uma, foge para o lado mais longe da viatura
function moverLadrao(p, dt) {
  const l = p.ladrao, v = p.viatura, cid = p.cid;
  if (!l.alvo) {
    const tx = Math.floor(l.x / TILE), ty = Math.floor(l.y / TILE);
    const opcoes = Object.values(DIRS).map(([dx, dy]) => [tx + dx, ty + dy])
      .filter(([x, y]) => x >= 0 && y >= 0 && x < N && y < N && !cid.bloqueio[y][x]);
    const nota = ([x, y]) => Math.hypot(centro(x) - v.x, centro(y) - v.y) + Math.random() * 60
      - (l.de && l.de[0] === x && l.de[1] === y ? 120 : 0);   // evita voltar por onde veio
    opcoes.sort((a, b) => nota(b) - nota(a));
    l.de = [tx, ty];
    l.alvo = opcoes[0];
  }
  const ax = centro(l.alvo[0]), ay = centro(l.alvo[1]);
  const d = Math.hypot(ax - l.x, ay - l.y), passoL = VEL_LADRAO[p.nivel] * (1 - 0.28 * l.acertos) * dt;   // cada tiro deixa mais lento
  l.ang = Math.atan2(ay - l.y, ax - l.x);
  if (d <= passoL) { l.x = ax; l.y = ay; l.alvo = null; } else { l.x += (ax - l.x) / d * passoL; l.y += (ay - l.y) / d * passoL; }
}

// tiro: sai do lado do motorista (à esquerda da viatura), para a frente
function atirar() {
  const p = pol;
  if (!p || !p.ativo || p.balas.length >= 3) return;
  const v = p.viatura, c = Math.cos(v.ang), s = Math.sin(v.ang);
  p.balas.push({ x: v.x + c * 16 + s * 7, y: v.y + s * 16 - c * 7, vx: c * 360, vy: s * 360, vida: 0.9 });
  p.tiros++;
  p.tirosRodada++;
  tocar([[880, 0.03], [660, 0.04]]);
}
function moverBalas(p, dt) {
  p.balas = p.balas.filter((b) => {
    b.x += b.vx * dt; b.y += b.vy * dt; b.vida -= dt;
    if (b.vida <= 0 || !livre(p.cid, b.x, b.y)) return false;
    if (Math.hypot(b.x - p.ladrao.x, b.y - p.ladrao.y) < 18) {
      p.acertos++;
      p.ladrao.acertos++;
      if (p.ladrao.acertos >= TIROS_PARA_PRENDER) prender('tiro');
      else { tocar([[330, 0.06], [262, 0.08]]); msgPolicia(`🎯 Acertou! O ladrão ficou mais lento (${p.ladrao.acertos} de ${TIROS_PARA_PRENDER} tiros).`, 'ok'); }
      return false;
    }
    return true;
  });
}

function prender(como) {
  const p = pol;
  p.ativo = false;
  p.falta = 0;
  clearInterval(repetindo);
  p.ladrao.preso = true;
  p.presos++;
  const tempo = (performance.now() - p.t0) / 1000;
  const ganho = 60 + 20 * p.nivel + Math.max(0, Math.round(80 - tempo * 1.5));
  p.pontos += ganho;
  resultados.push({ m: TIPOS_POLICIA[p.nivel - 1], certa: `Ladrão ${p.feitas} (${NIVEIS_POLICIA[p.nivel - 1].titulo.toLowerCase()})`,
    erros: p.batidasRodada >= 6 ? [`bateu ${p.batidasRodada} vezes`] : [], nivel: p.nivel, tempo });
  SOM.certo();
  msgPolicia(`🚨 Preso${como === 'tiro' ? ' com 3 tiros' : ''}! +${ganho} pontos em ${segundos(tempo)}`, 'ok');
  $('policia-pontos').textContent = p.pontos;
  p.timers.push(setTimeout(() => { if (pol === p && p.rodando) novaPerseguicao(); }, 2200));
}

function fugiu() {
  const p = pol;
  p.ativo = false;
  p.falta = 0;
  clearInterval(repetindo);
  resultados.push({ m: TIPOS_POLICIA[p.nivel - 1], certa: `Ladrão ${p.feitas} (${NIVEIS_POLICIA[p.nivel - 1].titulo.toLowerCase()})`,
    erros: [`o ladrão fugiu (bateu ${p.batidasRodada} ${p.batidasRodada === 1 ? 'vez' : 'vezes'})`], nivel: p.nivel, tempo: POLICIA.SEGUNDOS });
  SOM.errado();
  msgPolicia('⏰ O tempo acabou e o ladrão fugiu! Leia bem as setas no próximo.', 'erro');
  p.timers.push(setTimeout(() => { if (pol === p && p.rodando) novaPerseguicao(); }, 2600));
}

// ---------- desenho (canvas): a câmera segue a viatura ----------
function carroDesenho(g, x, y, ang, cor, policia, piscar) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(-15, -8, 32, 18);
  g.fillStyle = cor;
  g.strokeStyle = '#13294b';
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(-17, -10, 34, 20, 5);
  g.fill();
  g.stroke();
  g.fillStyle = policia ? '#ffffff' : '#ffcdd2';
  g.fillRect(-6, -8, 12, 16);   // teto
  g.fillStyle = '#90caf9';
  g.fillRect(6, -8, 5, 16);     // para-brisa (frente)
  g.fillRect(-12, -8, 4, 16);   // vidro de trás
  if (policia) {
    g.fillStyle = piscar ? '#e53935' : '#1e88e5';
    g.fillRect(-3, -8, 6, 7);
    g.fillStyle = piscar ? '#1e88e5' : '#e53935';
    g.fillRect(-3, 1, 6, 7);
  }
  g.fillStyle = '#fff59d';      // faróis
  g.fillRect(15, -8, 2, 4);
  g.fillRect(15, 4, 2, 4);
  g.restore();
}

function desenhar(p) {
  const tela = $('policia-tela'), g = tela.getContext('2d');
  const W = tela.clientWidth, H = tela.clientHeight, dpr = window.devicePixelRatio || 1;
  if (tela.width !== Math.round(W * dpr) || tela.height !== Math.round(H * dpr)) { tela.width = Math.round(W * dpr); tela.height = Math.round(H * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const mundo = N * TILE;
  const cx = Math.max(0, Math.min(mundo - W, p.viatura.x - W / 2)), cy = Math.max(0, Math.min(mundo - H, p.viatura.y - H / 2));
  g.fillStyle = '#7cb342';
  g.fillRect(0, 0, W, H);
  g.save();
  g.translate(-cx, -cy);
  let e = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const px = x * TILE, py = y * TILE, b = p.cid.bloqueio[y][x];
    if (b === true) {
      const enf = p.cid.enfeites[e++];
      g.fillStyle = '#cfd8dc';                       // calçada
      g.fillRect(px, py, TILE, TILE);
      g.fillStyle = '#9ccc65';
      g.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
      if (enf.tipo === 'casa') {
        g.fillStyle = enf.cor;
        g.fillRect(px + 12, py + 10, TILE - 24, TILE - 20);
        g.strokeStyle = 'rgba(0,0,0,0.25)';
        g.beginPath();
        if (enf.r) { g.moveTo(px + 12, py + TILE / 2); g.lineTo(px + TILE - 12, py + TILE / 2); } else { g.moveTo(px + TILE / 2, py + 10); g.lineTo(px + TILE / 2, py + TILE - 10); }
        g.stroke();
      } else {
        g.fillStyle = '#2e7d32';
        [[18, 18], [38, 22], [26, 38]].forEach(([ax, ay]) => { g.beginPath(); g.arc(px + ax, py + ay, 9, 0, 7); g.fill(); });
      }
    } else {
      g.fillStyle = '#546e7a';                       // asfalto
      g.fillRect(px, py, TILE, TILE);
      g.strokeStyle = '#eceff1';
      g.setLineDash([8, 8]);
      g.lineWidth = 2;
      g.beginPath();
      if (RUA(y) && !RUA(x)) { g.moveTo(px, py + TILE / 2); g.lineTo(px + TILE, py + TILE / 2); }
      if (RUA(x) && !RUA(y)) { g.moveTo(px + TILE / 2, py); g.lineTo(px + TILE / 2, py + TILE); }
      g.stroke();
      g.setLineDash([]);
      if (b === 'arvore') {
        g.fillStyle = '#795548';
        g.fillRect(px + 8, py + 8, TILE - 16, TILE - 16);
        g.fillStyle = '#2e7d32';
        g.beginPath(); g.arc(px + TILE / 2, py + TILE / 2, 20, 0, 7); g.fill();
        g.fillStyle = '#43a047';
        g.beginPath(); g.arc(px + TILE / 2 - 5, py + TILE / 2 - 5, 11, 0, 7); g.fill();
      }
    }
  }
  const piscar = Math.floor(performance.now() / 250) % 2 === 0;
  p.balas.forEach((b) => { g.fillStyle = '#ffeb3b'; g.beginPath(); g.arc(b.x, b.y, 4, 0, 7); g.fill(); });
  carroDesenho(g, p.ladrao.x, p.ladrao.y, p.ladrao.ang, p.ladrao.preso ? '#9e9e9e' : '#e53935', false, false);
  carroDesenho(g, p.viatura.x, p.viatura.y, p.viatura.ang, '#263238', true, piscar);
  g.restore();
  // ladrão fora da tela: uma seta na borda aponta para ele
  const lx = p.ladrao.x - cx, ly = p.ladrao.y - cy;
  if (lx < 0 || ly < 0 || lx > W || ly > H) {
    const a = Math.atan2(ly - H / 2, lx - W / 2), rx = W / 2 - 22, ry = H / 2 - 22;
    const k = Math.min(rx / Math.abs(Math.cos(a) || 1e-6), ry / Math.abs(Math.sin(a) || 1e-6));
    g.save();
    g.translate(W / 2 + Math.cos(a) * k, H / 2 + Math.sin(a) * k);
    g.rotate(a);
    g.fillStyle = '#e53935';
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(14, 0); g.lineTo(-8, -10); g.lineTo(-8, 10); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
}

function terminarPolicia() {
  const p = pol;
  pararPolicia();
  const tempos = resultados.filter((x) => !x.erros.length).map((x) => x.tempo);
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${p.pontos}. Chegou ao nível ${p.nivelMax} de ${POLICIA.NIVEL_MAX} (${NIVEIS_POLICIA[p.nivelMax - 1].titulo.toLowerCase()}).`,
    `Prendeu ${p.presos} de ${p.feitas} ladrões; ${p.feitas - p.presos} ${p.feitas - p.presos === 1 ? 'fugiu' : 'fugiram'}.`,
    `Tiros: ${p.tiros}, acertou ${p.acertos}. Bateu em calçadas e árvores ${p.batidas} ${p.batidas === 1 ? 'vez' : 'vezes'} (muitas batidas mostram confusão com as setas trocadas).`,
    ...(tempos.length ? [`Tempo médio para prender: ${segundos(tempos.reduce((s, t) => s + t, 0) / tempos.length)}.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = p.presos === p.feitas ? 'Super policial! 🚓' : 'Fim da perseguição!';
  $('fim-texto').textContent = `${aluno}, você prendeu ${p.presos} de ${p.feitas} ladrões e fez ${p.pontos} pontos!`;
}

// ---------- controles: cada toque anda um pouco; segurando, repete; teclado também (setas de verdade) ----------
let repetindo = 0;
document.querySelectorAll('.policia-seta').forEach((b) => {
  const soltar = () => { clearInterval(repetindo); b.classList.remove('apertado'); };
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!pol || !pol.ativo) return;
    darPasso(b.dataset.dir);
    clearInterval(repetindo);
    repetindo = setInterval(() => darPasso(b.dataset.dir), REPETE);
    b.classList.add('apertado');
    try { b.setPointerCapture(e.pointerId); } catch (err) { /* sem captura */ }
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => b.addEventListener(ev, soltar));
  b.addEventListener('contextmenu', (e) => e.preventDefault());
});
$('policia-tiro').addEventListener('pointerdown', (e) => { e.preventDefault(); atirar(); });
const TECLA = { ArrowUp: 'cima', ArrowDown: 'baixo', ArrowLeft: 'esq', ArrowRight: 'dir' };
document.addEventListener('keydown', (e) => {
  if (!pol || !$('tela-policia').classList.contains('ativa')) return;
  if (TECLA[e.key]) { e.preventDefault(); darPasso(TECLA[e.key]); }
  if (e.key === ' ') { e.preventDefault(); atirar(); }
});

$('btn-policia').onclick = () => { SOM.clique(); escolherProfessorE('Polícia e Ladrão', telaPoliciaMenu); };
$('policia-voltar').onclick = telaJogos;
$('btn-policia-comecar').onclick = () => { SOM.clique(); comecarPolicia(); };
$('policia-sair').onclick = telaPoliciaMenu;

export { comecarPolicia, pararPolicia, POLICIA, telaPoliciaMenu };
