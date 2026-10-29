/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Ponto a Ponto. */

import { $ } from './util.js?v=134';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=134';
import { SOM, tocar } from './som.js?v=134';
import { mascote, mostrar, telaJogos } from './telas.js?v=134';
import { escolherProfessorE } from './professor.js?v=134';
import { segundos } from './luzes.js?v=134';
import { fimDaMissao } from './relatorio.js?v=134';

// ---------- Ponto a Ponto ----------
// Memória visual e percepção espacial. Uma moldura quadrada com 6 pontos em cada lado. Aparece um modelo com linhas
// ligando pontos da moldura (por 5 a 10 segundos: quanto mais linhas, mais tempo); ele some e a criança refaz o desenho
// na moldura vazia: toca em dois pontos para ligar; para tirar uma linha, toca nela e em "Apagar"; no fim, "Checar".
// Acertou, o próximo modelo tem mais linhas; errou, menos. Errando, o jogo mostra o que faltou (verde) e o que sobrou (vermelho).
const PONTOS = { RODADAS: 8, NIVEL_MAX: 8, MIN_SEG: 5, MAX_SEG: 10 };
const LADO = 5;   // 5 espaços por lado = 6 pontos por lado (20 pontos na moldura)
// os pontos da moldura (0 a 100), em volta: em cima, à direita, embaixo e à esquerda
const PTS = (() => {
  const p = [];
  for (let i = 0; i < LADO; i++) p.push([i * 20, 0]);
  for (let i = 0; i < LADO; i++) p.push([100, i * 20]);
  for (let i = 0; i < LADO; i++) p.push([100 - i * 20, 100]);
  for (let i = 0; i < LADO; i++) p.push([0, 100 - i * 20]);
  return p;
})();
// lados de cada ponto (um canto fica em dois lados): ligar dois pontos do mesmo lado seria desenhar em cima da moldura
const ladosDe = ([x, y]) => [y === 0 && 'cima', x === 100 && 'dir', y === 100 && 'baixo', x === 0 && 'esq'].filter(Boolean);
const mesmoLado = (a, b) => ladosDe(PTS[a]).some((l) => ladosDe(PTS[b]).includes(l));
const chave = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const TIPOS_PONTOS = {
  poucas: { id: 'pp-poucas', titulo: 'Modelos com poucas linhas (2 e 3)', icone: '✏️', cor: '#1e88e5',
    regra: 'Olhar onde cada linha começa e termina: contar os pontos a partir de um canto ajuda a achar o lugar certo.' },
  medias: { id: 'pp-medias', titulo: 'Modelos médios (4 a 6 linhas)', icone: '📐', cor: '#fb8c00',
    regra: 'Guardar o desenho por partes (as linhas que saem do mesmo ponto, as que são paralelas) antes de começar.' },
  muitas: { id: 'pp-muitas', titulo: 'Modelos com muitas linhas (7 ou mais)', icone: '🕸️', cor: '#8e24aa',
    regra: 'Muitas linhas: memorizar a forma geral e conferir linha por linha antes de checar.' },
};
const tipoDe = (n) => (n <= 3 ? TIPOS_PONTOS.poucas : n <= 6 ? TIPOS_PONTOS.medias : TIPOS_PONTOS.muitas);
let pp = null;   // a partida em andamento

// um modelo com n linhas diferentes (nenhuma em cima da moldura); às vezes várias saem do mesmo ponto, como nos modelos de papel
function novoModelo(n) {
  const linhas = new Set();
  while (linhas.size < n) {
    const a = Math.floor(Math.random() * PTS.length);
    // metade das vezes, a nova linha sai de um ponto que já tem linha (fica com cara de desenho, e não de rabiscos soltos)
    const usados = [...linhas].flatMap((k) => k.split('-').map(Number));
    const de = usados.length && Math.random() < 0.5 ? usados[Math.floor(Math.random() * usados.length)] : a;
    const para = Math.floor(Math.random() * PTS.length);
    if (de === para || mesmoLado(de, para)) continue;
    linhas.add(chave(de, para));
  }
  return [...linhas];
}

// ---------- desenho ----------
const xy = (i) => PTS[i];
function desenhar({ linhas = [], faltaram = [], sobraram = [], escolhida = null, ponto = null, alvo = true }) {
  const linha = (k, classe) => { const [a, b] = k.split('-').map(Number); const [x1, y1] = xy(a), [x2, y2] = xy(b); return `<line class="${classe}" data-k="${k}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; };
  $('pontos-quadro').innerHTML = `<svg class="pontos-svg" viewBox="-9 -9 118 118" role="img" aria-label="Moldura com pontos">
    <rect x="0" y="0" width="100" height="100" fill="#fff" stroke="#13294b" stroke-width="1.6"/>
    ${faltaram.map((k) => linha(k, 'linha-faltou')).join('')}
    ${linhas.map((k) => linha(k, `linha-pp${k === escolhida ? ' escolhida' : ''}${sobraram.includes(k) ? ' sobrou' : ''}`)).join('')}
    ${alvo ? linhas.map((k) => linha(k, 'linha-alvo')).join('') : ''}
    ${PTS.map(([x, y], i) => `<g class="ponto-pp${i === ponto ? ' marcado' : ''}" data-i="${i}"><circle class="alvo-pp" cx="${x}" cy="${y}" r="6.5"/><circle cx="${x}" cy="${y}" r="2.6"/></g>`).join('')}
  </svg>`;
}

// ---------- telas ----------
function telaPontosMenu() { pararPontos(); mascote('davi-pontos', 'oi'); mostrar('tela-pontos-menu'); }

function comecarPontos() {
  pararPontos();
  definirMissao({ id: 'pontos', pontoAPonto: true, icone: '✏️', cor: '#1e88e5', titulo: 'Ponto a Ponto (memória visual)' });
  definirResultados([]);
  pp = { nivel: 1, nivelMax: 1, pontos: 0, feitas: 0, acertos: 0, rodando: true, faltaram: 0, sobraram: 0, timers: [] };
  mostrar('tela-pontos');
  novaRodada();
}
function pararPontos() {
  if (pp) { pp.rodando = false; pp.timers.forEach(clearTimeout); clearInterval(pp.relogio); }
  pp = null;
}
const depois = (ms, f) => { const p = pp; p.timers.push(setTimeout(() => { if (pp === p && p.rodando) f(); }, ms)); };
const msg = (texto, tipo = '') => { $('pontos-msg').innerHTML = texto; $('pontos-msg').className = `pontos-msg ${tipo}`; };

function novaRodada() {
  const p = pp;
  if (!p || !p.rodando) return;
  if (p.feitas >= PONTOS.RODADAS) { terminar(); return; }
  p.feitas++;
  const n = p.nivel + 1;   // de 2 a 9 linhas
  const seg = Math.min(PONTOS.MAX_SEG, Math.max(PONTOS.MIN_SEG, 3 + n));
  Object.assign(p, { n, modelo: novoModelo(n), feitasPelo: [], ponto: null, escolhida: null, fase: 'ver', seg });
  $('pontos-nivel').textContent = `✏️ Nível ${p.nivel} de ${PONTOS.NIVEL_MAX}`;
  $('pontos-pontos').textContent = p.pontos;
  $('pontos-contador').textContent = `Desenho ${p.feitas} de ${PONTOS.RODADAS} · ${n} linhas`;
  $('pontos-tempo').textContent = '';
  desenhar({ linhas: p.modelo, alvo: false });
  $('pontos-quadro').classList.add('modelo');
  const barra = $('pontos-barra');
  barra.hidden = false;
  barra.firstElementChild.style.animation = 'none';
  void barra.offsetWidth;
  barra.firstElementChild.style.animation = `caminho-tempo ${seg}s linear forwards`;
  msg(`Memorize o desenho! Você tem <b>${seg} segundos</b>. 👀`);
  $('btn-pontos-apagar').hidden = true;
  $('btn-pontos-checar').hidden = true;
  $('btn-pontos-pronto').hidden = false;
  p.fimVer = performance.now() + seg * 1000;
  depois(seg * 1000, vezDaCrianca);
}

function vezDaCrianca() {
  const p = pp;
  if (!p || p.fase !== 'ver') return;
  p.sobrouTempo = Math.max(0, (p.fimVer - performance.now()) / 1000);
  p.timers.forEach(clearTimeout);
  p.timers = [];
  p.fase = 'desenhar';
  p.t0 = performance.now();
  $('pontos-quadro').classList.remove('modelo');
  $('pontos-barra').hidden = true;
  $('btn-pontos-pronto').hidden = true;
  $('btn-pontos-apagar').hidden = false;
  $('btn-pontos-checar').hidden = false;
  atualizar();
  msg('Agora desenhe: toque em <b>dois pontos</b> para ligar. Para tirar, toque na linha e em <b>Apagar</b>.');
  clearInterval(p.relogio);
  p.relogio = setInterval(() => { if (pp && pp.fase === 'desenhar') $('pontos-tempo').textContent = `⏱ ${segundos((performance.now() - pp.t0) / 1000)}`; }, 250);
}
function atualizar() {
  const p = pp;
  desenhar({ linhas: p.feitasPelo, escolhida: p.escolhida, ponto: p.ponto });
  $('btn-pontos-apagar').disabled = !p.escolhida;
}

$('pontos-quadro').addEventListener('click', (e) => {
  const p = pp;
  if (!p || p.fase !== 'desenhar') return;
  const g = e.target.closest('.ponto-pp');
  if (g) {
    const i = Number(g.dataset.i);
    p.escolhida = null;
    if (p.ponto === null) { p.ponto = i; tocar([[523, 0.04]]); atualizar(); return; }
    if (p.ponto === i) { p.ponto = null; atualizar(); return; }   // tocou de novo no mesmo: desmarca
    if (mesmoLado(p.ponto, i)) { msg('Esses dois pontos estão no mesmo lado da moldura: escolha um ponto de outro lado. ✏️', 'erro'); tocar([[220, 0.08]]); p.ponto = i; atualizar(); return; }
    const k = chave(p.ponto, i);
    if (!p.feitasPelo.includes(k)) p.feitasPelo.push(k);
    p.ponto = null;
    tocar([[523, 0.04], [784, 0.06]]);
    msg(`${p.feitasPelo.length} ${p.feitasPelo.length === 1 ? 'linha' : 'linhas'} desenhada${p.feitasPelo.length === 1 ? '' : 's'}. Quando terminar, toque em <b>Checar</b>.`);
    atualizar();
    return;
  }
  const l = e.target.closest('.linha-alvo');
  if (l) { p.escolhida = p.escolhida === l.dataset.k ? null : l.dataset.k; p.ponto = null; SOM.clique(); atualizar(); }
});
$('btn-pontos-apagar').onclick = () => {
  const p = pp;
  if (!p || !p.escolhida) return;
  p.feitasPelo = p.feitasPelo.filter((k) => k !== p.escolhida);
  p.escolhida = null;
  tocar([[330, 0.06]]);
  atualizar();
};
$('btn-pontos-pronto').onclick = () => { SOM.clique(); vezDaCrianca(); };

$('btn-pontos-checar').onclick = () => {
  const p = pp;
  if (!p || p.fase !== 'desenhar') return;
  if (!p.feitasPelo.length) { msg('Desenhe as linhas antes de checar. ✏️', 'erro'); SOM.errado(); return; }
  p.fase = 'fim';
  clearInterval(p.relogio);
  const tempo = (performance.now() - p.t0) / 1000;
  const faltaram = p.modelo.filter((k) => !p.feitasPelo.includes(k));
  const sobraram = p.feitasPelo.filter((k) => !p.modelo.includes(k));
  const certo = !faltaram.length && !sobraram.length;
  const texto = `Desenho de ${p.n} linhas`;
  $('btn-pontos-apagar').hidden = true;
  $('btn-pontos-checar').hidden = true;
  if (certo) {
    const ganho = 15 * p.n + Math.round(p.sobrouTempo * 3) + Math.max(0, Math.round(40 - tempo * 2));
    p.pontos += ganho;
    p.acertos++;
    resultados.push({ m: tipoDe(p.n), certa: texto, erros: [], nivel: p.nivel, tempo });
    SOM.certo();
    desenhar({ linhas: p.feitasPelo, alvo: false });
    $('pontos-quadro').classList.add('certo');
    msg(`✅ Igualzinho! +${ganho} pontos em ${segundos(tempo)}`, 'ok');
    p.nivel = Math.min(PONTOS.NIVEL_MAX, p.nivel + 1);
  } else {
    p.faltaram += faltaram.length;
    p.sobraram += sobraram.length;
    const erros = [...(faltaram.length ? [faltaram.length === 1 ? 'faltou 1 linha' : `faltaram ${faltaram.length} linhas`] : []),
      ...(sobraram.length ? [`${sobraram.length} ${sobraram.length === 1 ? 'linha a mais' : 'linhas a mais'}`] : [])];
    resultados.push({ m: tipoDe(p.n), certa: texto, erros: [erros.join(' e ')], nivel: p.nivel, tempo });
    SOM.errado();
    desenhar({ linhas: p.feitasPelo, faltaram, sobraram, alvo: false });
    msg(`Quase! ${erros.join(' e ')}. Em <b style="color:#2e9e5b">verde</b>, o que faltou; em <b style="color:#e53935">vermelho</b>, o que sobrou.`, 'erro');
    p.nivel = Math.max(1, p.nivel - 1);
  }
  p.nivelMax = Math.max(p.nivelMax, p.nivel);
  $('pontos-pontos').textContent = p.pontos;
  depois(certo ? 1800 : 4000, () => { $('pontos-quadro').classList.remove('certo'); novaRodada(); });
};

function terminar() {
  const p = pp;
  pararPontos();
  const tempos = resultados.filter((x) => !x.erros.length).map((x) => x.tempo);
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${p.pontos}. Chegou ao nível ${p.nivelMax} de ${PONTOS.NIVEL_MAX} (desenhos de ${p.nivelMax + 1} linhas).`,
    `Acertou ${p.acertos} de ${p.feitas} desenhos.`,
    p.faltaram || p.sobraram ? `Nos erros: ${p.faltaram === 1 ? 'faltou 1 linha' : `faltaram ${p.faltaram} linhas`} e ${p.sobraram === 1 ? 'sobrou 1' : `sobraram ${p.sobraram}`}.` : 'Não errou nenhuma linha!',
    ...(tempos.length ? [`Tempo médio para desenhar certo: ${segundos(tempos.reduce((s, t) => s + t, 0) / tempos.length)}.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = p.acertos === p.feitas ? 'Memória fotográfica! 📸' : 'Fim do Ponto a Ponto!';
  $('fim-texto').textContent = `${aluno}, você acertou ${p.acertos} de ${p.feitas} desenhos e fez ${p.pontos} pontos!`;
}

$('btn-pontos').onclick = () => { SOM.clique(); escolherProfessorE('Ponto a Ponto', telaPontosMenu); };
$('pontos-voltar').onclick = telaJogos;
$('btn-pontos-comecar').onclick = () => { SOM.clique(); comecarPontos(); };
$('pontos-sair').onclick = telaPontosMenu;

export { comecarPontos, pararPontos, PONTOS, telaPontosMenu };
