/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Jogo do Reflexo (níveis 1 e 2: luzes e copos com bolinhas). */

import { $, embaralhar, sortear } from './util.js?v=126';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=126';
import { SOM, tocar } from './som.js?v=126';
import { mascote, mostrar, telaJogos } from './telas.js?v=126';
import { escolherProfessorE } from './professor.js?v=126';
import { fimDaMissao } from './relatorio.js?v=126';

// ---------- Jogo do Reflexo ----------
// Atenção, memória e reflexo. No alto, 4 lâmpadas, cada uma com uma cor e um som; embaixo, 4 botões das mesmas
// cores, sempre em outra ordem. As lâmpadas piscam (ex.: a azul 2 vezes, depois a vermelha 1 vez) e o aluno repete
// tocando os botões das mesmas cores, na mesma ordem e quantas vezes cada uma piscou.
// Acertou: o próximo desafio fica mais difícil (mais cores, mais piscadas, mais rápido). Errou: fica mais fácil.
// Os pontos dependem da rapidez: quanto mais rápido responder, mais pontos.
// Nível 2: em vez de botões, copos e filas de bolinhas. A lâmpada pisca e o aluno arrasta a bolinha da mesma cor
// até o copo da mesma cor (quantas vezes piscou). Lâmpadas, copos e filas nunca têm a mesma cor um embaixo do outro.
const LUZ = { RODADAS: 15, NIVEL_MAX: 8, ESPERA: 15, ESPERA2: 25 };   // ESPERA: segundos para responder
const CORES_LUZ = [
  { id: 'vermelha', nome: 'Vermelha', copo: 'vermelho', cor: '#ff3b30', freq: 330 },
  { id: 'amarela', nome: 'Amarela', copo: 'amarelo', cor: '#ffd60a', freq: 523 },
  { id: 'verde', nome: 'Verde', copo: 'verde', cor: '#30d158', freq: 392 },
  { id: 'azul', nome: 'Azul', copo: 'azul', cor: '#1e88ff', freq: 262 },
];
// passos: quantas cores na sequência; max: até quantas piscadas por cor; ms: duração de cada piscada
const NIVEIS_LUZ = [
  { passos: 1, max: 2, ms: 760 }, { passos: 1, max: 3, ms: 700 },
  { passos: 2, max: 2, ms: 640 }, { passos: 2, max: 3, ms: 580 },
  { passos: 3, max: 2, ms: 540 }, { passos: 3, max: 3, ms: 490 },
  { passos: 4, max: 2, ms: 450 }, { passos: 4, max: 3, ms: 400 },
];
// Nível 2 começa mais leve: arrastar leva mais tempo que tocar
const NIVEIS_LUZ2 = [
  { passos: 1, max: 1, ms: 800 }, { passos: 1, max: 2, ms: 760 },
  { passos: 2, max: 1, ms: 700 }, { passos: 2, max: 2, ms: 640 },
  { passos: 3, max: 1, ms: 600 }, { passos: 3, max: 2, ms: 560 },
  { passos: 4, max: 1, ms: 520 }, { passos: 4, max: 2, ms: 480 },
];
let modoLuz = 1;   // 1 = botões; 2 = copos e bolinhas
const TEXTO_MENU_LUZ = {
  1: $('luz-menu-texto').innerHTML,
  2: `Lá em cima estão <b>4 lâmpadas</b>; no meio, <b>4 copos</b>; embaixo, <b>filas de bolinhas</b>. Quando uma lâmpada
      <b>piscar</b>, arraste a <b>bolinha da mesma cor</b> até o <b>copo da mesma cor</b>, uma bolinha para cada piscada.
      Cuidado: nada fica embaixo da mesma cor! Se preferir, toque na bolinha e depois no copo. ⚡`,
};
const TIPOS_LUZ = [1, 2, 3, 4].map((n) => ({
  id: `luz${n}`, titulo: n === 1 ? 'Sequência de 1 cor' : `Sequência de ${n} cores`, icone: '💡', cor: '#7b4fc9',
  regra: n === 1
    ? 'Uma lâmpada pisca algumas vezes: o aluno precisa contar as piscadas e tocar o botão da mesma cor o mesmo número de vezes.'
    : `${n} lâmpadas piscam, uma depois da outra: o aluno precisa guardar a ordem e quantas vezes cada cor piscou (memória de trabalho).`,
}));
let luz = null;   // a partida em andamento
const pausaLuz = (ms) => new Promise((ok) => setTimeout(ok, ms));
const corLuz = (id) => CORES_LUZ.find((c) => c.id === id);
const segundos = (s) => `${s.toFixed(1).replace('.', ',')} s`;

function telaLuzesMenu(modo = modoLuz) {
  pararLuz();
  modoLuz = modo;
  $('luz-menu-titulo').textContent = modo === 2 ? '💡 Jogo do Reflexo Nível 2' : '💡 Jogo do Reflexo';
  $('luz-menu-texto').innerHTML = TEXTO_MENU_LUZ[modo];
  mascote('davi-luzes', 'oi');
  mostrar('tela-luzes-menu');
}

function comecarLuz() {
  pararLuz();
  definirMissao(modoLuz === 2
    ? { id: 'luzes2', luzes: true, icone: '💡', cor: '#c2185b', titulo: 'Jogo do Reflexo Nível 2 (copos e bolinhas)' }
    : { id: 'luzes', luzes: true, icone: '💡', cor: '#7b4fc9', titulo: 'Jogo do Reflexo (atenção e memória)' });
  definirResultados([]);
  luz = { modo: modoLuz, nivel: 1, nivelMax: 1, pontos: 0, feitas: 0, acertos: 0, rodando: true, vez: 0, erros: {} };
  $('luz-botoes').hidden = luz.modo === 2;
  $('luz-copos').hidden = luz.modo !== 2;
  $('luz-bolas').hidden = luz.modo !== 2;
  $('luz-lampadas').innerHTML = CORES_LUZ.map((c) =>
    `<div class="lampada" data-cor="${c.id}" style="--cor:${c.cor}" role="img" aria-label="Lâmpada ${c.nome}"><span class="vidro"></span><span class="rosca"></span></div>`).join('');
  mostrar('tela-luzes');
  rodadaLuz();
}

function pararLuz() {
  if (luz) { luz.rodando = false; clearTimeout(luz.proxima); clearInterval(luz.relogio); }
  luz = null;
  soltarArrasto();
  document.querySelectorAll('.lampada.acesa').forEach((l) => l.classList.remove('acesa'));
}

function hudLuz() {
  $('luz-nivel').textContent = `💡 Nível ${luz.nivel} de ${LUZ.NIVEL_MAX}`;
  $('luz-pontos').textContent = luz.pontos;
  $('luz-rodada').textContent = `Rodada ${luz.feitas} de ${LUZ.RODADAS}`;
}
const msgLuz = (texto, tipo = '') => { $('luz-msg').textContent = texto; $('luz-msg').className = `luz-msg ${tipo}`; };

// os botões nunca ficam na mesma posição das lâmpadas
function montarBotoesLuz() {
  let ordem;
  do { ordem = embaralhar(CORES_LUZ); } while (ordem.some((c, i) => c === CORES_LUZ[i]));
  $('luz-botoes').innerHTML = ordem.map((c) =>
    `<button class="luz-botao" type="button" data-cor="${c.id}" style="--cor:${c.cor}" aria-label="Botão ${c.nome}"><span></span></button>`).join('');
}

// Nível 2: copos e filas de bolinhas; nenhuma cor fica embaixo da mesma cor (nem da lâmpada, nem do copo)
function montarCoposBolas() {
  let copos, bolas;
  do { copos = embaralhar(CORES_LUZ); } while (copos.some((c, i) => c === CORES_LUZ[i]));
  do { bolas = embaralhar(CORES_LUZ); } while (bolas.some((c, i) => c === CORES_LUZ[i] || c === copos[i]));
  $('luz-copos').innerHTML = copos.map((c) =>
    `<div class="copo" data-cor="${c.id}" style="--cor:${c.cor}" role="button" tabindex="0" aria-label="Copo ${c.nome}"><span class="copo-corpo"></span><span class="copo-bolas"></span></div>`).join('');
  $('luz-bolas').innerHTML = bolas.map((c) =>
    `<div class="fila-bolas" data-cor="${c.id}" style="--cor:${c.cor}"><button class="bola" type="button" data-cor="${c.id}" aria-label="Bolinha ${c.nome}"></button><span class="bola bola-espera"></span></div>`).join('');
}

const bloquearLuz = (sim) => $('luz-palco').classList.toggle('bloqueado', sim);

async function acenderLuz(id, ms) {
  const lampada = document.querySelector(`.lampada[data-cor="${id}"]`);
  tocar([[corLuz(id).freq, ms / 1000, 'sine']]);
  lampada.classList.add('acesa');
  await pausaLuz(ms);
  lampada.classList.remove('acesa');
}

async function rodadaLuz() {
  if (!luz || !luz.rodando) return;
  if (luz.feitas >= LUZ.RODADAS) { terminarLuz(); return; }
  luz.feitas++;
  const vez = ++luz.vez;
  const ativa = () => luz && luz.rodando && luz.vez === vez;
  const nv = (luz.modo === 2 ? NIVEIS_LUZ2 : NIVEIS_LUZ)[luz.nivel - 1];
  // sequência: cada passo é uma cor (diferente da anterior) que pisca de 1 até "max" vezes
  const seq = [];
  for (let i = 0; i < nv.passos; i++) {
    let c;
    do { c = sortear(CORES_LUZ); } while (seq.length && seq[seq.length - 1].cor === c);
    seq.push({ cor: c, vezes: 1 + Math.floor(Math.random() * nv.max) });
  }
  Object.assign(luz, { seq, esperado: seq.flatMap((s) => Array(s.vezes).fill(s.cor.id)), tocadas: [], respondendo: false });
  // nos primeiros níveis os botões ficam no mesmo lugar; depois mudam de lugar a cada rodada
  if (luz.modo === 2) {
    if (luz.feitas === 1 || luz.nivel >= 2) montarCoposBolas();
    document.querySelectorAll('.copo-bolas').forEach((c) => { c.innerHTML = ''; });
    luz.bolaSelecionada = null;
  } else if (luz.feitas === 1 || luz.nivel >= 3) montarBotoesLuz();
  bloquearLuz(true);
  $('luz-tempo').textContent = '';
  hudLuz();
  msgLuz('👀 Olhe e escute…');
  await pausaLuz(800);
  for (const [i, s] of seq.entries()) {
    for (let k = 0; k < s.vezes; k++) {
      if (!ativa()) return;
      await acenderLuz(s.cor.id, nv.ms * 0.6);
      await pausaLuz(nv.ms * 0.45);
    }
    if (i < seq.length - 1) await pausaLuz(nv.ms * 0.7);
  }
  if (!ativa()) return;
  luz.respondendo = true;
  luz.t0 = performance.now();
  bloquearLuz(false);
  msgLuz(luz.modo === 2 ? '👆 Sua vez! Leve as bolinhas aos copos.' : '👆 Sua vez! Toque nos botões.');
  const limite = luz.modo === 2 ? LUZ.ESPERA2 : LUZ.ESPERA;
  luz.relogio = setInterval(() => {
    if (!ativa() || !luz.respondendo) return;
    const t = (performance.now() - luz.t0) / 1000;
    $('luz-tempo').textContent = `⏱ ${segundos(t)}`;
    if (t >= limite) respostaLuz(false, 'não respondeu a tempo', 'sem resposta');
  }, 100);
}

// tipo do erro, para o relatório: contou a mais, contou a menos, trocou a ordem ou tocou uma cor que não piscou
function tipoDoErroLuz(tocou) {
  const { esperado } = luz, i = luz.tocadas.length;
  const anterior = esperado[i - 1];
  const proxima = esperado.slice(i).find((c) => c !== esperado[i]);
  const verbo = luz.modo === 2 ? 'colocou' : 'tocou';
  if (tocou === anterior) return `${verbo} a mais`;
  if (tocou === proxima) return `${verbo} a menos`;
  if (esperado.includes(tocou)) return 'trocou a ordem';
  return 'cor que não piscou';
}

$('luz-botoes').onclick = (e) => {
  const b = e.target.closest('.luz-botao');
  if (!b || !luz || !luz.respondendo) return;
  const id = b.dataset.cor;
  b.classList.remove('apertado');
  void b.offsetWidth;   // reinicia a animação de apertar
  b.classList.add('apertado');
  const lampada = document.querySelector(`.lampada[data-cor="${id}"]`);
  lampada.classList.add('acesa');
  setTimeout(() => lampada.classList.remove('acesa'), 160);
  tocar([[corLuz(id).freq, 0.16, 'sine']]);
  jogadaLuz(id, 'tocou');
};

// confere a jogada (botão tocado ou bolinha colocada no copo certo) com a sequência que piscou
function jogadaLuz(id, verbo) {
  if (id !== luz.esperado[luz.tocadas.length]) {
    const tipo = tipoDoErroLuz(id);
    luz.tocadas.push(id);
    respostaLuz(false, `${verbo} ${luz.tocadas.map((c) => corLuz(c).nome).join(', ')} (${tipo})`, tipo);
    return;
  }
  luz.tocadas.push(id);
  if (luz.tocadas.length === luz.esperado.length) respostaLuz(true);
}

// ----- Nível 2: arrastar a bolinha até o copo (ou tocar na bolinha e depois no copo) -----
let arrasto = null;
function soltarArrasto() {
  if (!arrasto) return;
  arrasto.fantasma.remove();
  arrasto.bola.classList.remove('pega');
  document.querySelectorAll('.copo.alvo').forEach((c) => c.classList.remove('alvo'));
  arrasto = null;
}
const copoNoPonto = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest('#luz-copos .copo'); };

$('luz-bolas').addEventListener('pointerdown', (e) => {
  const bola = e.target.closest('button.bola');
  if (!bola || !luz || !luz.respondendo) return;
  e.preventDefault();
  soltarArrasto();
  const r = bola.getBoundingClientRect();
  const fantasma = document.createElement('span');
  fantasma.className = 'bola bola-fantasma';
  fantasma.style.cssText = `--cor:${corLuz(bola.dataset.cor).cor};width:${r.width}px;height:${r.height}px`;
  document.body.append(fantasma);
  arrasto = { bola, fantasma, dx: r.width / 2, dy: r.height / 2, x0: e.clientX, y0: e.clientY, moveu: false };
  fantasma.style.transform = `translate(${e.clientX - arrasto.dx}px, ${e.clientY - arrasto.dy}px) scale(1.15)`;
  bola.classList.add('pega');
});
document.addEventListener('pointermove', (e) => {
  if (!arrasto) return;
  if (Math.hypot(e.clientX - arrasto.x0, e.clientY - arrasto.y0) > 8) arrasto.moveu = true;
  arrasto.fantasma.style.transform = `translate(${e.clientX - arrasto.dx}px, ${e.clientY - arrasto.dy}px) scale(1.15)`;
  const copo = copoNoPonto(e.clientX, e.clientY);
  document.querySelectorAll('.copo').forEach((c) => c.classList.toggle('alvo', c === copo));
});
document.addEventListener('pointerup', (e) => {
  if (!arrasto) return;
  const { bola, moveu } = arrasto;
  soltarArrasto();
  if (!moveu) { selecionarBola(bola); return; }   // só tocou: escolhe a bolinha e depois toca no copo
  const copo = copoNoPonto(e.clientX, e.clientY);
  if (copo) soltarBola(bola.dataset.cor, copo);   // soltou fora de um copo: a bolinha volta para a fila
});
document.addEventListener('pointercancel', soltarArrasto);

function selecionarBola(bola) {
  const ja = bola.classList.contains('selecionada');
  document.querySelectorAll('.bola.selecionada').forEach((b) => b.classList.remove('selecionada'));
  luz.bolaSelecionada = ja ? null : bola.dataset.cor;
  if (!ja) { bola.classList.add('selecionada'); SOM.clique(); }
}
$('luz-copos').onclick = (e) => {
  const copo = e.target.closest('.copo');
  if (copo && luz && luz.respondendo && luz.bolaSelecionada) soltarBola(luz.bolaSelecionada, copo);
};

function soltarBola(corBola, copo) {
  if (!luz || !luz.respondendo) return;
  luz.bolaSelecionada = null;
  document.querySelectorAll('.bola.selecionada').forEach((b) => b.classList.remove('selecionada'));
  const corCopo = copo.dataset.cor;
  // a bolinha cai no copo (o copo dá um pulinho) e a fila anda: aparece outra bolinha
  const dentro = copo.querySelector('.copo-bolas');
  if (dentro.children.length < 4) dentro.insertAdjacentHTML('beforeend', `<i style="--cor:${corLuz(corBola).cor}"></i>`);
  copo.classList.remove('caiu');
  void copo.offsetWidth;
  copo.classList.add('caiu');
  const fila = document.querySelector(`.fila-bolas[data-cor="${corBola}"]`);
  fila.classList.remove('andou');
  void fila.offsetWidth;
  fila.classList.add('andou');
  tocar([[corLuz(corCopo).freq, 0.16, 'sine']]);
  if (corBola !== corCopo) {
    luz.tocadas.push(corBola);
    respostaLuz(false, `colocou a bolinha ${corLuz(corBola).nome.toLowerCase()} no copo ${corLuz(corCopo).copo} (copo de outra cor)`, 'copo de outra cor');
    return;
  }
  jogadaLuz(corBola, 'colocou');
}

function respostaLuz(acertou, motivo, tipoErro) {
  luz.respondendo = false;
  clearInterval(luz.relogio);
  bloquearLuz(true);
  soltarArrasto();
  const tempo = (performance.now() - luz.t0) / 1000;
  const texto = luz.seq.map((s) => `${s.cor.nome} ${s.vezes}x`).join(' → ');
  const tipo = TIPOS_LUZ[luz.seq.length - 1];
  if (acertou) {
    // pontos: base pelo nível + bônus de rapidez (o tempo "bom" cresce com o número de toques)
    const bom = luz.modo === 2 ? 1.5 + luz.esperado.length * 1.3 : 0.8 + luz.esperado.length * 0.6;
    const bonus = Math.max(0, Math.round(100 * (1 - (tempo - bom) / (bom * 2))));
    const ganho = 20 * luz.nivel + Math.min(100, bonus);
    luz.pontos += ganho;
    luz.acertos++;
    resultados.push({ m: tipo, certa: texto, erros: [], nivel: luz.nivel, tempo });
    SOM.certo();
    msgLuz(`✅ Muito bem! +${ganho} pontos em ${segundos(tempo)}`, 'ok');
    luz.nivel = Math.min(LUZ.NIVEL_MAX, luz.nivel + 1);
  } else {
    resultados.push({ m: tipo, certa: texto, erros: [motivo], nivel: luz.nivel, tempo: tipoErro === 'sem resposta' ? null : tempo });
    luz.erros[tipoErro] = (luz.erros[tipoErro] || 0) + 1;
    SOM.errado();
    const palco = $('luz-palco');
    palco.classList.remove('tremer');
    void palco.offsetWidth;
    palco.classList.add('tremer');
    msgLuz(`❌ Era: ${texto}`, 'erro');
    luz.nivel = Math.max(1, luz.nivel - 1);
  }
  luz.nivelMax = Math.max(luz.nivelMax, luz.nivel);
  hudLuz();
  $('luz-rodada').textContent = `Rodada ${luz.feitas} de ${LUZ.RODADAS}`;
  luz.proxima = setTimeout(rodadaLuz, acertou ? 1400 : 2400);
}

// destaques do relatório: rapidez, nível, tipos de erro e se o aluno ficou mais rápido durante a partida
function resumoLuz(l) {
  const tempos = resultados.filter((r) => !r.erros.length).map((r) => r.tempo);
  const linhas = [`Pontos: ${l.pontos}. Chegou ao nível ${l.nivelMax} de ${LUZ.NIVEL_MAX}.`];
  if (tempos.length) {
    const media = tempos.reduce((s, t) => s + t, 0) / tempos.length;
    linhas.push(`Tempo médio nos acertos: ${segundos(media)} (mais rápido: ${segundos(Math.min(...tempos))}; mais lento: ${segundos(Math.max(...tempos))}).`);
    const metade = Math.ceil(tempos.length / 2);
    if (tempos.length >= 4) {
      const m1 = tempos.slice(0, metade).reduce((s, t) => s + t, 0) / metade;
      const m2 = tempos.slice(metade).reduce((s, t) => s + t, 0) / (tempos.length - metade);
      linhas.push(m2 < m1 * 0.9 ? `Ficou mais rápido durante a partida (${segundos(m1)} → ${segundos(m2)}).`
        : m2 > m1 * 1.1 ? `Ficou mais lento no fim da partida (${segundos(m1)} → ${segundos(m2)}): pode ser cansaço ou desafios mais longos.`
          : `Manteve a rapidez durante a partida (cerca de ${segundos((m1 + m2) / 2)}).`);
    }
  }
  const erros = Object.entries(l.erros);
  linhas.push(erros.length ? `Erros: ${erros.map(([t, n]) => `${n} ${t}`).join(', ')}.` : 'Nenhum erro na partida!');
  const maior = resultados.filter((r) => !r.erros.length).reduce((m, r) => Math.max(m, r.certa.split('→').length), 0);
  if (maior) linhas.push(`Maior sequência que acertou: ${maior} ${maior === 1 ? 'cor' : 'cores'}.`);
  return linhas;
}

function terminarLuz() {
  const l = luz;
  pararLuz();
  missao.extra = '';
  missao.resumo = resumoLuz(l);
  fimDaMissao();
  $('fim-titulo').textContent = l.acertos === l.feitas ? 'Reflexo de campeão!' : 'Fim das luzes!';
  $('fim-texto').textContent = `${aluno}, você acertou ${l.acertos} de ${l.feitas} sequências e fez ${l.pontos} pontos!`;
}

$('btn-luzes').onclick = () => { SOM.clique(); escolherProfessorE('Jogo do Reflexo', () => telaLuzesMenu(1)); };
$('btn-luzes2').onclick = () => { SOM.clique(); escolherProfessorE('Jogo do Reflexo Nível 2', () => telaLuzesMenu(2)); };
$('luzes-voltar').onclick = telaJogos;
$('btn-luzes-comecar').onclick = () => { SOM.clique(); comecarLuz(); };
$('luzes-sair').onclick = telaLuzesMenu;

export { comecarLuz, LUZ, pararLuz, segundos, telaLuzesMenu };
