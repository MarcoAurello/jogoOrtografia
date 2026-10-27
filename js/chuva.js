/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Chuva de Erros. */

import { $, embaralhar } from './util.js?v=93';
import { aluno, definirMissao, definirResultados, resultados } from './estado.js?v=93';
import { SOM } from './som.js?v=93';
import { mascote, mostrar, telaJogos } from './telas.js?v=93';
import { escolherProfessorE } from './professor.js?v=93';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=93';

// ---------- Chuva de Erros ----------
// As palavras caem na arena e o aluno toca só nas certas (ou só nas erradas, se escolher).
// Cada palavra fica de 2 a 5 segundos na tela: quanto mais rápido o aluno pega, mais rápido elas caem;
// quando ele erra ou deixa passar, a chuva fica mais lenta.
const CHUVA = { PALAVRAS: 30, VIDA_MAX: 5, VIDA_MIN: 2, RODAPE: 34 };
const CHUVA_TODAS = { id: 'todas', titulo: 'Todas as palavras', icone: '🌟', cor: '#1fa2b0' };
let chuvaModo = 'certas', chuvaCat = 'todas';
let chuva = null;   // a rodada em andamento
const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

function telaChuvaMenu() {
  pararChuva();
  mascote('davi-chuva', 'oi');
  $('chuva-categorias').innerHTML = [CHUVA_TODAS, ...CHUVA_CATEGORIAS].map((c) =>
    `<button class="chuva-cat${c.id === chuvaCat ? ' ativo' : ''}" type="button" data-id="${c.id}" style="--c:${c.cor}">${c.icone} ${c.titulo}</button>`).join('');
  document.querySelectorAll('.chuva-modo').forEach((b) => b.classList.toggle('ativo', b.dataset.modo === chuvaModo));
  mostrar('tela-chuva-menu');
}

$('chuva-modos').onclick = (e) => {
  const b = e.target.closest('.chuva-modo'); if (!b) return;
  SOM.clique();
  chuvaModo = b.dataset.modo;
  document.querySelectorAll('.chuva-modo').forEach((x) => x.classList.toggle('ativo', x === b));
};
$('chuva-categorias').onclick = (e) => {
  const b = e.target.closest('.chuva-cat'); if (!b) return;
  SOM.clique();
  chuvaCat = b.dataset.id;
  document.querySelectorAll('.chuva-cat').forEach((x) => x.classList.toggle('ativo', x === b));
};

function comecarChuva() {
  pararChuva();
  const cat = chuvaCat === 'todas' ? CHUVA_TODAS : CHUVA_CATEGORIAS.find((c) => c.id === chuvaCat);
  const cats = chuvaCat === 'todas' ? CHUVA_CATEGORIAS : [cat];
  const pares = embaralhar(cats.flatMap((m) => m.pares.map(([certa, errada]) => ({ m, certa, errada }))));
  // metade cai do jeito certo e metade do jeito errado
  const filaChuva = embaralhar(pares.slice(0, CHUVA.PALAVRAS).map((p, i) => ({ ...p, mostraCerta: i % 2 === 0 })));
  const pegarCertas = chuvaModo === 'certas';
  definirMissao({ id: 'chuva-' + chuvaModo, chuva: true, icone: '🌧️', cor: '#e53935',
    titulo: `Chuva de Erros: pegar as ${pegarCertas ? 'certas' : 'erradas'} (${cat.titulo})` });
  definirResultados([]);
  chuva = { fila: filaChuva, idx: 0, gotas: [], vida: CHUVA.VIDA_MAX, proxima: 0, t: 0, ultimo: 0,
    pontos: 0, combo: 0, alvos: 0, pegos: 0, rodando: false, pegarCertas };
  $('chuva-alvo').textContent = pegarCertas ? '✅ Toque nas CERTAS' : '👾 Toque nas ERRADAS';
  hudChuva();
  mostrar('tela-chuva');
  // contagem 3, 2, 1 antes de começar
  const rodada = chuva;
  let n = 3;
  const contar = () => {
    if (chuva !== rodada) return;
    if (n === 0) {
      $('chuva-contagem').textContent = '';
      rodada.rodando = true;
      rodada.ultimo = performance.now();
      requestAnimationFrame(quadroChuva);
      return;
    }
    $('chuva-contagem').textContent = n--;
    SOM.clique();
    setTimeout(contar, 700);
  };
  contar();
}

function pararChuva() {
  if (chuva) chuva.rodando = false;
  chuva = null;
  $('chuva-contagem').textContent = '';
  $('chuva-arena').querySelectorAll('.gota, .ponto-voando').forEach((g) => g.remove());
}

function hudChuva() {
  const restam = chuva.fila.length - chuva.idx + chuva.gotas.length;
  $('chuva-pontos').textContent = chuva.pontos;
  $('chuva-combo').textContent = chuva.combo >= 3 ? ` 🔥x${chuva.combo}` : '';
  $('chuva-restam').textContent = `Palavras: ${restam}`;
  $('chuva-velocidade').textContent = `⚡ ${chuva.vida.toFixed(1).replace('.', ',')} s`;
}

function soltarGota() {
  const item = chuva.fila[chuva.idx++];
  const arena = $('chuva-arena');
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'gota';
  el.textContent = item.mostraCerta ? item.certa : item.errada;
  arena.append(el);
  const w = el.offsetWidth, h = el.offsetHeight, W = arena.clientWidth;
  // procura um lugar que não fique em cima das palavras que acabaram de cair
  let x = 0;
  for (let tentativa = 0; tentativa < 8; tentativa++) {
    x = 8 + Math.random() * Math.max(0, W - w - 16);
    const livre = chuva.gotas.every((o) => (chuva.t - o.nasceu) / o.vida > 0.35 || x + w < o.x - 6 || x > o.x + o.w + 6);
    if (livre) break;
  }
  const g = { ...item, el, x, y: -h, w, h, nasceu: chuva.t, vida: chuva.vida, alvo: item.mostraCerta === chuva.pegarCertas };
  if (g.alvo) chuva.alvos++;
  el.style.transform = `translate(${x}px, ${-h}px)`;
  el.onpointerdown = (e) => { e.preventDefault(); tocarGota(g); };
  chuva.gotas.push(g);
  chuva.proxima = chuva.t + chuva.vida * (0.4 + Math.random() * 0.2);
}

function tirarGota(g, depois) {
  g.fim = true;
  chuva.gotas = chuva.gotas.filter((o) => o !== g);
  setTimeout(() => g.el.remove(), depois);
}

function pontoVoando(g, texto, cor) {
  const p = document.createElement('span');
  p.className = 'ponto-voando';
  p.textContent = texto;
  p.style.color = cor;
  p.style.left = `${g.x + g.w / 2 - 20}px`;
  p.style.top = `${g.y}px`;
  $('chuva-arena').append(p);
  setTimeout(() => p.remove(), 700);
}

function tocarGota(g) {
  if (g.fim || !chuva || !chuva.rodando) return;
  tirarGota(g, 400);
  if (g.alvo) {
    const reacao = chuva.t - g.nasceu;
    const ganhou = 10 + Math.round((1 - reacao / g.vida) * 10) + Math.min(chuva.combo, 10);
    chuva.pontos += ganhou;
    chuva.combo++;
    chuva.pegos++;
    // pegou rápido: as próximas palavras ficam menos tempo na tela
    chuva.vida = limitar(chuva.vida * 0.7 + limitar(reacao * 2.5, CHUVA.VIDA_MIN, CHUVA.VIDA_MAX) * 0.3, CHUVA.VIDA_MIN, CHUVA.VIDA_MAX);
    g.el.classList.add('pegou');
    pontoVoando(g, `+${ganhou}`, '#1d6b3d');
    resultados.push({ m: g.m, certa: g.certa, erros: [] });
    SOM.certo();
  } else {
    chuva.combo = 0;
    chuva.vida = limitar(chuva.vida + 0.25, CHUVA.VIDA_MIN, CHUVA.VIDA_MAX);
    g.el.classList.add('errou');
    pontoVoando(g, chuva.pegarCertas ? '✗ errada!' : '✗ está certa!', '#c62828');
    $('chuva-arena').classList.remove('tremer');
    void $('chuva-arena').offsetWidth;
    $('chuva-arena').classList.add('tremer');
    resultados.push({ m: g.m, certa: g.certa, erros: [chuva.pegarCertas ? g.errada : 'marcou como errada'] });
    SOM.errado();
  }
  hudChuva();
}

// a palavra chegou ao chão sem ser tocada
function gotaEscapou(g) {
  tirarGota(g, 0);
  if (!g.alvo) return;   // não era para pegar: o aluno acertou em deixar passar
  chuva.combo = 0;
  chuva.vida = limitar(chuva.vida + 0.3, CHUVA.VIDA_MIN, CHUVA.VIDA_MAX);
  resultados.push({ m: g.m, certa: g.certa, erros: [chuva.pegarCertas ? 'deixou passar' : `${g.errada} (deixou passar)`] });
  hudChuva();
}

function quadroChuva(agora) {
  if (!chuva || !chuva.rodando) return;
  chuva.t += Math.min(0.05, (agora - chuva.ultimo) / 1000);   // aba escondida: a chuva espera
  chuva.ultimo = agora;
  if (chuva.idx < chuva.fila.length && chuva.t >= chuva.proxima) { soltarGota(); hudChuva(); }
  const chao = $('chuva-arena').clientHeight - CHUVA.RODAPE;
  for (const g of [...chuva.gotas]) {
    const p = (chuva.t - g.nasceu) / g.vida;
    if (p >= 1) { gotaEscapou(g); continue; }
    g.y = -g.h + p * chao;
    g.el.style.transform = `translate(${g.x}px, ${g.y}px)`;
    g.el.style.opacity = p > 0.85 ? (1 - p) / 0.15 : 1;   // some aos poucos no fim
  }
  if (chuva.idx >= chuva.fila.length && !chuva.gotas.length) { terminarChuva(); return; }
  requestAnimationFrame(quadroChuva);
}

function terminarChuva() {
  const { pegos, alvos, pontos, pegarCertas } = chuva;
  pararChuva();
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Chuva perfeita!' : 'Fim da chuva!';
  $('fim-texto').textContent = `${aluno}, você pegou ${pegos} de ${alvos} palavras ${pegarCertas ? 'certas' : 'erradas'} e fez ${pontos} pontos!`;
}

$('btn-chuva').onclick = () => { SOM.clique(); escolherProfessorE('Chuva de Erros', telaChuvaMenu); };
$('chuva-voltar').onclick = telaJogos;
$('btn-chuva-comecar').onclick = () => { SOM.clique(); comecarChuva(); };
$('chuva-sair').onclick = telaChuvaMenu;

export { comecarChuva, pararChuva, telaChuvaMenu };
