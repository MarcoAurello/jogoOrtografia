/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Tiro Certo (ângulos). */

import { $, embaralhar, sortear } from './util.js?v=84';
import { aluno, definirMissao, definirResultados, resultados } from './estado.js?v=84';
import { SOM, tocar } from './som.js?v=84';
import { mascote, mostrar, telaJogos } from './telas.js?v=84';
import { escolherProfessorE } from './professor.js?v=84';
import { fimDaMissao } from './relatorio.js?v=84';

// ---------- Tiro Certo ----------
// O círculo é um transferidor: 0° à esquerda (onde fica o canhão), 90° em cima, 180° à direita e 270° embaixo.
// Um míssil entra pela borda numa marca de ângulo e voa em linha reta até o canhão. O aluno escolhe
// entre 4 ângulos; o canhão mira naquela marca do círculo e só o ângulo por onde o míssil entrou o derruba.
// Começa com 4 tiros, cada acerto vale +1 tiro. Acabou o tiro ou o míssil chegou ao canhão: fim de jogo.
const TIRO = { MISSEIS: 20, TIROS: 4, NIVEL_MAX: 5 };
const TIPOS_ANGULO = [
  { id: 'a90', passo: 90, titulo: 'Ângulos retos (90°)', icone: '📐', cor: '#1565c0',
    regra: 'Os ângulos retos dividem o círculo em 4 partes iguais: <b>90°</b> em cima, <b>180°</b> à direita e <b>270°</b> embaixo. O canhão fica no <b>0°</b>.' },
  { id: 'a45', passo: 45, titulo: 'Múltiplos de 45°', icone: '🍕', cor: '#e53935',
    regra: 'Metade de 90° é <b>45°</b>. Entre 0° e 90° fica o 45°; entre 90° e 180°, o <b>135°</b>; depois <b>225°</b> e <b>315°</b>: é só ir somando 45°.' },
  { id: 'a30', passo: 30, titulo: 'Múltiplos de 30°', icone: '🕐', cor: '#e0a100',
    regra: 'Cada ângulo reto tem 3 partes de <b>30°</b>: 30°, 60°, 90°. Use as marcas maiores do transferidor e conte de 30 em 30.' },
  { id: 'a15', passo: 15, titulo: 'Múltiplos de 15°', icone: '🧭', cor: '#2e7d32',
    regra: 'Entre duas marcas de 30° fica a de <b>15°</b>. Ache a marca de 30° mais perto do míssil e some ou tire 15°.' },
  { id: 'a10', passo: 10, titulo: 'De 10 em 10 graus', icone: '🎯', cor: '#0b3d91',
    regra: 'As marquinhas pequenas valem <b>10°</b>. Ache a marca de 30° mais perto do míssil e conte de 10 em 10.' },
];
const SPRITES = {};
for (const nome of ['canhao-cano', 'canhao-carreta', 'missil', 'bala', 'explosao', 'municao']) {
  SPRITES[nome] = new Image();
  SPRITES[nome].src = `assets/tiro/${nome}.png`;
}
let tiro = null;   // a partida em andamento

// ângulos que podem aparecer num nível (longe demais do canhão não vale: o míssil chegaria na hora)
const angulosDoNivel = (passo) => Array.from({ length: Math.floor(359 / passo) }, (_, i) => (i + 1) * passo).filter((a) => a >= 30 && a <= 330);

function opcoesDoAngulo(certo, passo) {
  const validos = angulosDoNivel(passo === 90 ? 45 : passo);
  const parecidos = embaralhar([certo + passo, certo - passo, certo + 2 * passo, certo - 2 * passo, certo + 90, certo - 90, certo + 180]);
  const erradas = [];
  for (const a of [360 - certo, ...parecidos, ...embaralhar(validos)]) {   // 360 - x: a troca de sentido mais comum
    if (a !== certo && validos.includes(a) && !erradas.includes(a) && erradas.length < 3) erradas.push(a);
  }
  return embaralhar([certo, ...erradas]);
}

function telaTiroMenu() {
  pararTiro();
  mascote('davi-tiro', 'oi');
  mostrar('tela-tiro-menu');
}

// geometria do transferidor no canvas (em pixels de CSS)
function medidasTiro() {
  const cv = $('tiro-canvas');
  const S = cv.clientWidth || 400;
  const dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(S * dpr)) { cv.width = Math.round(S * dpr); cv.height = Math.round(S * dpr); }
  const R = S * 0.36, cx = S * 0.52, cy = S * 0.5;
  const ponto = (graus, raio = R) => {
    const a = (graus * Math.PI) / 180;
    return { x: cx - Math.cos(a) * raio, y: cy - Math.sin(a) * raio };
  };
  return { cv, S, dpr, R, cx, cy, ponto, k: S / 210, canhao: ponto(0) };
}

function comecarTiro() {
  pararTiro();
  definirMissao({ id: 'tiro', tiro: true, icone: '🎯', cor: '#0a8fc2', titulo: 'Tiro Certo (ângulos)' });
  definirResultados([]);
  tiro = { nivel: 1, nivelMax: 1, tiros: TIRO.TIROS, pontos: 0, derrubados: 0, feitos: 0, t: 0, ultimo: 0,
    rodando: false, missil: null, bala: null, explosoes: [], textos: [], mira: 0, fim: null };
  mostrar('tela-tiro');
  $('tiro-opcoes').innerHTML = '';
  hudTiro();
  const rodada = tiro;
  let n = 3;
  const contar = () => {
    if (tiro !== rodada) return;
    if (n === 0) {
      $('tiro-contagem').textContent = '';
      rodada.rodando = true;
      rodada.ultimo = performance.now();
      novoMissil();
      requestAnimationFrame(quadroTiro);
      return;
    }
    $('tiro-contagem').textContent = n--;
    SOM.clique();
    setTimeout(contar, 700);
  };
  requestAnimationFrame(() => desenharTiro());
  contar();
}

function pararTiro() {
  if (tiro) tiro.rodando = false;
  tiro = null;
  $('tiro-contagem').textContent = '';
}

function hudTiro() {
  const tipo = TIPOS_ANGULO[tiro.nivel - 1];
  $('tiro-nivel').textContent = `🎯 Nível ${tiro.nivel} · ${tipo.passo}°`;
  $('tiro-pontos').textContent = tiro.pontos;
  $('tiro-contador').textContent = `Míssil ${Math.max(1, tiro.feitos)} de ${TIRO.MISSEIS}`;
  const total = Math.max(TIRO.TIROS, tiro.tiros);
  $('tiro-municao').innerHTML = Array.from({ length: total }, (_, i) =>
    `<img src="assets/tiro/municao.png" alt="" class="${i < tiro.tiros ? '' : 'gasta'}">`).join('');
  $('tiro-municao').setAttribute('aria-label', `${tiro.tiros} tiros`);
}

function novoMissil() {
  if (!tiro || !tiro.rodando) return;
  if (tiro.feitos >= TIRO.MISSEIS) { terminarTiro('vitoria'); return; }
  const tipo = TIPOS_ANGULO[tiro.nivel - 1];
  const ultimo = tiro.missil && tiro.missil.angulo;
  const angulos = angulosDoNivel(tipo.passo).filter((a) => a !== ultimo);
  const angulo = sortear(angulos);
  tiro.feitos++;
  tiro.missil = { angulo, tipo, nivel: tiro.nivel, nasceu: tiro.t, vida: 14 - tiro.nivel * 1.4, erros: [], primeira: true };
  tiro.mira = 0;   // o cano volta a apontar para o centro
  mostrarOpcoesTiro();
  hudTiro();
}

function mostrarOpcoesTiro() {
  const m = tiro.missil;
  $('tiro-opcoes').innerHTML = '';
  opcoesDoAngulo(m.angulo, m.tipo.passo).forEach((a, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mat-resposta';
    b.textContent = `${a}°`;
    b.dataset.tecla = i + 1;
    b.onclick = () => dispararTiro(a, b);
    $('tiro-opcoes').append(b);
  });
}

function dispararTiro(angulo, botao) {
  if (!tiro || !tiro.rodando || tiro.bala || !tiro.missil || tiro.tiros <= 0) return;
  const md = medidasTiro();
  const acerta = angulo === tiro.missil.angulo;
  // tiro certo segue pela reta até encontrar o míssil (mesmo se ele ainda estiver fora do círculo);
  // tiro errado vai até a marca escolhida e cai ali
  const alvo = acerta ? posicaoMissil(md, tiro.missil).ini : md.ponto(angulo);
  tiro.tiros--;
  tiro.mira = Math.atan2(alvo.y - md.canhao.y, alvo.x - md.canhao.x);
  document.querySelectorAll('#tiro-opcoes .mat-resposta').forEach((b) => { b.disabled = true; });
  botao.classList.add(acerta ? 'certa' : 'errada');
  const boca = 40 * md.k;
  tiro.bala = { angulo, acerta, x: md.canhao.x + Math.cos(tiro.mira) * boca, y: md.canhao.y + Math.sin(tiro.mira) * boca,
    alvo, inicio: tiro.t, rastro: [] };
  tocar([[320, 0.06, 'square'], [140, 0.18, 'square']]);
  hudTiro();
}

function explodir(x, y, tamanho = 1) {
  tiro.explosoes.push({ x, y, inicio: tiro.t, tamanho });
  tocar([[110, 0.25, 'sawtooth'], [60, 0.3, 'sawtooth']]);
}

function textoTiro(x, y, texto, cor) {
  tiro.textos.push({ x, y, texto, cor, inicio: tiro.t });
}

// míssil resolvido: entra no relatório e o nível sobe (acertou de primeira) ou desce
function registrarMissil(m, derrubou) {
  resultados.push({ m: m.tipo, certa: `${m.angulo}°`, erros: m.erros.slice(), nivel: m.nivel });
  if (derrubou && m.primeira) tiro.nivel = Math.min(TIRO.NIVEL_MAX, tiro.nivel + 1);
  else if (!m.primeira) tiro.nivel = Math.max(1, tiro.nivel - 1);
  tiro.nivelMax = Math.max(tiro.nivelMax, tiro.nivel);
}

function quadroTiro(agora) {
  if (!tiro || !tiro.rodando) return;
  const dt = Math.min(0.05, (agora - tiro.ultimo) / 1000);   // aba escondida: o jogo espera
  tiro.ultimo = agora;
  tiro.t += dt;
  const md = medidasTiro();
  const m = tiro.missil;

  // bala voando até a marca escolhida
  if (tiro.bala) {
    const b = tiro.bala;
    const vel = md.R * 2.6;
    const dx = b.alvo.x - b.x, dy = b.alvo.y - b.y, dist = Math.hypot(dx, dy);
    b.rastro.push({ x: b.x, y: b.y });
    if (b.rastro.length > 8) b.rastro.shift();
    const passo = Math.min(dist, vel * dt);
    b.x += (dx / (dist || 1)) * passo;
    b.y += (dy / (dist || 1)) * passo;
    const pm = m && posicaoMissil(md, m);
    // no tiro certo, bala e míssil estão na mesma reta: acerta quando a bala chega à distância do míssil
    // (comparar distâncias evita a bala "atravessar" o míssil entre um quadro e outro)
    const longe = (p) => Math.hypot(p.x - md.canhao.x, p.y - md.canhao.y);
    if (b.acerta && pm && longe(b) >= longe(pm) - 4 * md.k) {
      // acertou: míssil derrubado, +1 tiro
      explodir(pm.x, pm.y, 1.3);
      const ganhou = 50 * m.nivel + Math.round(Math.max(0, 1 - (tiro.t - m.nasceu) / m.vida) * 30);
      tiro.pontos += ganhou;
      tiro.tiros++;
      tiro.derrubados++;
      textoTiro(pm.x, pm.y - 20, `+1 tiro! Era ${m.angulo}°`, '#7dffb0');
      textoTiro(pm.x, pm.y + 4, `+${ganhou}`, '#ffd23a');
      SOM.certo();
      registrarMissil(m, true);
      tiro.missil = null;
      tiro.bala = null;
      $('tiro-opcoes').innerHTML = '';
      hudTiro();
      setTimeout(() => { if (tiro && tiro.rodando) novoMissil(); }, 1100);
    } else if (dist < 2) {
      // errou: a bala cai na marca escolhida
      explodir(b.x, b.y, 0.6);
      if (m) {
        m.erros.push(`${b.angulo}°`);
        m.primeira = false;
        textoTiro(b.x, b.y - 16, 'Errou!', '#ff8a74');
        SOM.errado();
      }
      tiro.bala = null;
      if (tiro.tiros <= 0) { if (m) registrarMissil(m, false); terminarTiro('tiros'); return; }
      if (m) mostrarOpcoesTiro();
      hudTiro();
    }
  }

  // míssil chegou ao canhão
  if (tiro.missil && (tiro.t - tiro.missil.nasceu) >= tiro.missil.vida) {
    explodir(md.canhao.x, md.canhao.y, 1.8);
    tiro.missil.erros.push('atingiu o canhão');
    tiro.missil.primeira = false;
    registrarMissil(tiro.missil, false);
    tiro.missil = null;
    tiro.fim = tiro.t;
  }
  desenharTiro();
  if (tiro.fim !== null && tiro.t - tiro.fim > 1.2) { terminarTiro('canhao'); return; }
  requestAnimationFrame(quadroTiro);
}

// o míssil vem de fora do círculo pela reta que liga a sua marca ao canhão:
// cruza a borda exatamente na marca do ângulo e segue até o canhão
function posicaoMissil(md, m) {
  const p = Math.min(1, (tiro.t - m.nasceu) / m.vida);
  const marca = md.ponto(m.angulo), c = md.canhao;
  const dist = Math.hypot(marca.x - c.x, marca.y - c.y);
  const fora = 34 * md.k;
  const ini = { x: marca.x + ((marca.x - c.x) / dist) * fora, y: marca.y + ((marca.y - c.y) / dist) * fora };
  return { x: ini.x + (c.x - ini.x) * p, y: ini.y + (c.y - ini.y) * p, ini };
}

function sprite(g, img, sx, sy, sw, sh, x, y, k, ang = 0, px = sw / 2, py = sh / 2) {
  if (!img.complete || !img.naturalWidth) return;
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.drawImage(img, sx, sy, sw, sh, -px * k, -py * k, sw * k, sh * k);
  g.restore();
}

function desenharTiro() {
  if (!tiro) return;
  const md = medidasTiro();
  const { cv, S, R, cx, cy, k, ponto } = md;
  const g = cv.getContext('2d');
  g.setTransform(md.dpr, 0, 0, md.dpr, 0, 0);
  g.imageSmoothingEnabled = false;

  // fundo de radar
  const fundo = g.createRadialGradient(cx, cy, R * 0.1, cx, cy, S * 0.75);
  fundo.addColorStop(0, '#163b6e'); fundo.addColorStop(1, '#0a1530');
  g.fillStyle = fundo; g.fillRect(0, 0, S, S);
  g.strokeStyle = 'rgba(120, 190, 255, 0.12)'; g.lineWidth = 1;
  for (const f of [0.33, 0.66]) { g.beginPath(); g.arc(cx, cy, R * f, 0, Math.PI * 2); g.stroke(); }
  g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
  // varredura do radar
  const varre = (tiro.t * 0.9) % (Math.PI * 2);
  const grad = g.createLinearGradient(cx, cy, cx + Math.cos(varre) * R, cy + Math.sin(varre) * R);
  grad.addColorStop(0, 'rgba(90, 200, 255, 0)'); grad.addColorStop(1, 'rgba(90, 200, 255, 0.35)');
  g.strokeStyle = grad; g.lineWidth = 2;
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(varre) * R, cy + Math.sin(varre) * R); g.stroke();

  // transferidor: círculo, marcas de 10° e números de 30° em 30° (e dos múltiplos de 45°)
  g.strokeStyle = '#7cc4ff'; g.lineWidth = 3;
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
  for (let a = 0; a < 360; a += 5) {
    const grande = a % 30 === 0, medio = a % 45 === 0, pequeno = a % 10 === 0;
    if (!grande && !medio && !pequeno) continue;
    const dentro = ponto(a, R - (grande ? 11 : medio ? 9 : 6)), fora = ponto(a, R);
    g.strokeStyle = grande ? '#d9efff' : medio ? '#ffd23a' : 'rgba(180, 220, 255, 0.6)';
    g.lineWidth = grande || medio ? 2.5 : 1.5;
    g.beginPath(); g.moveTo(dentro.x, dentro.y); g.lineTo(fora.x, fora.y); g.stroke();
  }
  // míssil (aponta para onde voa) com fogo animado
  if (tiro.missil) {
    const pm = posicaoMissil(md, tiro.missil);
    const ang = Math.atan2(md.canhao.y - pm.ini.y, md.canhao.x - pm.ini.x) + Math.PI / 2;
    const quadro = Math.floor(tiro.t * 12) % 3;
    sprite(g, SPRITES.missil, quadro * 16, 0, 16, 42, pm.x, pm.y, k * 0.85, ang, 8, 18);
  }

  // números da escala por cima do míssil, para o aluno sempre conseguir ler
  g.textAlign = 'center'; g.textBaseline = 'middle';
  // só os números de referência (0°, 90°, 180° e 270°): os outros ângulos o aluno descobre contando as marcas
  g.font = `800 ${Math.round(18 * (S / 420))}px Nunito, Arial, sans-serif`;
  g.fillStyle = '#ffd23a';
  for (const a of [90, 180, 270]) {
    const p = ponto(a, R + 22 * (S / 420));
    g.fillText(`${a}°`, p.x, p.y);
  }
  g.fillText('0°', md.canhao.x - 4 * k, md.canhao.y + 34 * k);

  // canhão: carreta parada e cano girando para a mira
  const c = md.canhao;
  sprite(g, SPRITES['canhao-carreta'], 0, 0, 52, 40, c.x, c.y, k, 0, 25, 13);
  sprite(g, SPRITES['canhao-cano'], 0, 0, 46, 18, c.x, c.y, k, tiro.mira, 4, 9);

  // bala com rastro
  if (tiro.bala) {
    tiro.bala.rastro.forEach((r, i) => {
      g.fillStyle = `rgba(255, 210, 120, ${(i + 1) / 12})`;
      g.fillRect(r.x - 2, r.y - 2, 4, 4);
    });
    sprite(g, SPRITES.bala, 0, 0, 10, 10, tiro.bala.x, tiro.bala.y, k * 0.9);
  }

  // explosões (6 quadros) e textos que sobem
  tiro.explosoes = tiro.explosoes.filter((e) => tiro.t - e.inicio < 0.6);
  for (const e of tiro.explosoes) {
    const q = Math.min(5, Math.floor((tiro.t - e.inicio) * 10));
    sprite(g, SPRITES.explosao, q * 48, 0, 48, 48, e.x, e.y, k * e.tamanho);
  }
  tiro.textos = tiro.textos.filter((x) => tiro.t - x.inicio < 1.4);
  for (const x of tiro.textos) {
    const vida = (tiro.t - x.inicio) / 1.4;
    g.globalAlpha = 1 - vida;
    g.font = `800 ${Math.round(16 * (S / 420))}px Nunito, Arial, sans-serif`;
    g.lineWidth = 4; g.strokeStyle = '#0a1530'; g.fillStyle = x.cor;
    g.strokeText(x.texto, x.x, x.y - vida * 30); g.fillText(x.texto, x.x, x.y - vida * 30);
    g.globalAlpha = 1;
  }
}

function terminarTiro(motivo) {
  const { derrubados, feitos, pontos, nivelMax } = tiro;
  pararTiro();
  fimDaMissao();
  $('fim-titulo').textContent = motivo === 'vitoria' ? 'Defesa perfeita!' : motivo === 'tiros' ? 'Acabaram os tiros!' : 'O míssil chegou ao canhão!';
  $('fim-texto').textContent = `${aluno}, você derrubou ${derrubados} de ${feitos} mísseis, chegou ao nível ${nivelMax} e fez ${pontos} pontos!`;
}

// teclas 1 a 4 também disparam no computador
document.addEventListener('keydown', (e) => {
  if (!tiro || !$('tela-tiro').classList.contains('ativa')) return;
  const b = document.querySelector(`#tiro-opcoes .mat-resposta[data-tecla="${e.key}"]`);
  if (b && !b.disabled) b.click();
});
window.addEventListener('resize', () => { if (tiro) desenharTiro(); });

$('btn-tiro').onclick = () => { SOM.clique(); escolherProfessorE('Tiro Certo', telaTiroMenu); };

$('tiro-voltar').onclick = telaJogos;
$('btn-tiro-comecar').onclick = () => { SOM.clique(); comecarTiro(); };
$('tiro-sair').onclick = telaTiroMenu;

export { comecarTiro, desenharTiro, pararTiro, telaTiroMenu, tiro, TIRO };
