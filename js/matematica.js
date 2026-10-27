/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Chuva de Matemática. */

import { $, embaralhar, sortear } from './util.js?v=112';
import { aluno, definirMissao, definirResultados, resultados } from './estado.js?v=112';
import { SOM } from './som.js?v=112';
import { mascote, mostrar, telaJogos } from './telas.js?v=112';
import { escolherProfessorE } from './professor.js?v=112';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=112';

// ---------- Chuva de Matemática ----------
// Uma conta cai de cada vez e o aluno escolhe a resposta entre 4 opções antes que ela chegue ao chão.
// Acertou: a próxima conta fica mais difícil (sobe um nível). Errou ou deixou cair: fica mais fácil.
const MAT = { CONTAS: 20, NIVEL_MAX: 10, PAUSA: 1300 };
const OPERACOES = {
  soma: { id: 'soma', titulo: 'Adição', icone: '➕', sinal: '+', cor: '#1565c0',
    regra: 'Na <b>adição</b> juntamos quantidades. Comece pelo número maior e conte para frente; com números grandes, some primeiro as <b>unidades</b> e depois as <b>dezenas</b>.' },
  sub: { id: 'sub', titulo: 'Subtração', icone: '➖', sinal: '−', cor: '#e53935',
    regra: 'Na <b>subtração</b> tiramos uma quantidade da outra. Conte para trás a partir do número maior, ou pense <b>quanto falta</b> do menor para chegar ao maior.' },
  mult: { id: 'mult', titulo: 'Multiplicação', icone: '✖️', sinal: '×', cor: '#e0a100',
    regra: 'Multiplicar é somar parcelas iguais: <b>3 × 4</b> é 4 + 4 + 4. Treine a <b>tabuada</b> e lembre que a ordem não muda o resultado (3 × 4 = 4 × 3).' },
  div: { id: 'div', titulo: 'Divisão', icone: '➗', sinal: '÷', cor: '#2e7d32',
    regra: 'Dividir é repartir em <b>partes iguais</b>. Para achar 12 ÷ 3, pense: que número <b>vezes 3</b> dá 12? A tabuada ajuda!' },
};
// tamanho dos números em cada nível (1 a 10)
const FAIXAS = [[1, 5], [1, 9], [2, 15], [5, 20], [10, 40], [10, 60], [20, 99], [50, 150], [100, 500], [100, 999]];
// fatores da multiplicação (e da divisão) em cada nível
const FATORES = [[[1, 2], [1, 5]], [[2, 5], [1, 5]], [[2, 5], [1, 10]], [[2, 6], [2, 10]], [[2, 9], [2, 10]],
  [[3, 10], [3, 10]], [[11, 20], [2, 5]], [[11, 30], [2, 9]], [[11, 20], [11, 15]], [[100, 300], [2, 9]]];
let matOps = new Set(['soma']);
let mat = null;   // a rodada em andamento
const entre = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

function gerarConta(op, nivel) {
  const [min, max] = FAIXAS[nivel - 1];
  const [f1, f2] = FATORES[nivel - 1];
  let a, b, res, perto;   // perto: um erro comum para usar entre as opções
  if (op === 'soma') { a = entre(min, max); b = entre(min, max); res = a + b; perto = Math.abs(a - b); }
  else if (op === 'sub') { const x = entre(min, max), y = entre(min, max); a = Math.max(x, y); b = Math.min(x, y); res = a - b; perto = a + b; }
  else if (op === 'mult') { a = entre(...f1); b = entre(...f2); if (Math.random() < 0.5) [a, b] = [b, a]; res = a * b; perto = a * (b + 1); }
  else { res = entre(...f1); b = Math.max(nivel > 1 ? 2 : 1, entre(...f2)); a = res * b; perto = res + b; }
  return { op: OPERACOES[op], a, b, res, perto, texto: `${a} ${OPERACOES[op].sinal} ${b}` };
}

// 4 opções: a certa e três parecidas com ela
function opcoesDaConta(c) {
  const passo = c.res >= 30 ? 10 : 2;
  const parecidas = embaralhar([c.res + 1, c.res - 1, c.res + passo, c.res - passo, c.res + entre(3, 5), c.res - entre(3, 5)]);
  const erradas = [];
  for (const v of [c.perto, ...parecidas]) {
    if (v >= 0 && v !== c.res && !erradas.includes(v) && erradas.length < 3) erradas.push(v);
  }
  return embaralhar([c.res, ...erradas]);
}

function telaMatMenu() {
  pararMat();
  mascote('davi-mat', 'oi');
  $('mat-erro').textContent = '';
  $('mat-ops').innerHTML = Object.values(OPERACOES).map((o) =>
    `<button class="chuva-modo${matOps.has(o.id) ? ' ativo' : ''}" type="button" data-op="${o.id}" style="--c:${o.cor}">`
    + `<span class="mat-op-sinal">${o.sinal}</span>${o.titulo}</button>`).join('');
  mostrar('tela-mat-menu');
}

$('mat-ops').onclick = (e) => {
  const b = e.target.closest('.chuva-modo'); if (!b) return;
  SOM.clique();
  if (matOps.has(b.dataset.op)) matOps.delete(b.dataset.op); else matOps.add(b.dataset.op);
  b.classList.toggle('ativo', matOps.has(b.dataset.op));
  $('mat-erro').textContent = '';
};

function comecarMat() {
  if (!matOps.size) { $('mat-erro').textContent = 'Escolha pelo menos uma operação.'; SOM.errado(); return; }
  pararMat();
  const ops = Object.values(OPERACOES).filter((o) => matOps.has(o.id));
  definirMissao({ id: 'matematica', matematica: true, icone: '🔢', cor: '#0b3d91',
    titulo: `Chuva de Matemática (${ops.map((o) => o.titulo).join(', ')})` });
  definirResultados([]);
  mat = { ops: ops.map((o) => o.id), nivel: 1, nivelMax: 1, feitas: 0, pontos: 0, combo: 0, acertos: 0,
    conta: null, t: 0, ultimo: 0, rodando: false };
  $('mat-conta').hidden = true;
  $('mat-respostas').innerHTML = '';
  hudMat();
  mostrar('tela-mat');
  const rodada = mat;
  let n = 3;
  const contar = () => {
    if (mat !== rodada) return;
    if (n === 0) {
      $('mat-contagem').textContent = '';
      rodada.rodando = true;
      rodada.ultimo = performance.now();
      proximaConta();
      requestAnimationFrame(quadroMat);
      return;
    }
    $('mat-contagem').textContent = n--;
    SOM.clique();
    setTimeout(contar, 700);
  };
  contar();
}

function pararMat() {
  if (mat) mat.rodando = false;
  mat = null;
  $('mat-contagem').textContent = '';
}

function hudMat() {
  $('mat-nivel').textContent = `🧠 Nível ${mat.nivel}`;
  $('mat-pontos').textContent = mat.pontos;
  $('mat-combo').textContent = mat.combo >= 3 ? ` 🔥x${mat.combo}` : '';
  $('mat-restam').textContent = `Conta ${Math.min(mat.feitas, MAT.CONTAS)} de ${MAT.CONTAS}`;
  $('mat-tempo').textContent = mat.conta ? `⏱ ${mat.conta.vida.toFixed(0)} s` : '';
}

function proximaConta() {
  if (!mat || !mat.rodando) return;
  if (mat.feitas >= MAT.CONTAS) { terminarMat(); return; }
  const c = gerarConta(sortear(mat.ops), mat.nivel);
  c.vida = 6 + mat.nivel * 0.6;   // contas mais difíceis caem mais devagar
  c.nivel = mat.nivel;
  c.nasceu = mat.t;
  mat.conta = c;
  mat.feitas++;
  const el = $('mat-conta');
  el.className = 'conta-caindo';
  el.textContent = `${c.texto} = ?`;
  el.style.transform = 'translate(-50%, -100%)';
  el.hidden = false;
  $('mat-respostas').innerHTML = '';
  opcoesDaConta(c).forEach((v, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mat-resposta';
    b.textContent = v;
    b.dataset.tecla = i + 1;
    b.onclick = () => responderMat(v, b);
    $('mat-respostas').append(b);
  });
  hudMat();
}

function responderMat(valor, botao) {
  const c = mat && mat.conta;
  if (!c || c.respondida || !mat.rodando) return;
  c.respondida = true;
  const botoes = [...document.querySelectorAll('#mat-respostas .mat-resposta')];
  botoes.forEach((b) => { b.disabled = true; });
  const certoEl = botoes.find((b) => Number(b.textContent) === c.res);
  const el = $('mat-conta');
  el.textContent = `${c.texto} = ${c.res}`;
  if (valor === c.res) {
    const rapidez = 1 - (mat.t - c.nasceu) / c.vida;
    const ganhou = 10 * mat.nivel + Math.round(rapidez * 10) + Math.min(mat.combo, 10);
    mat.pontos += ganhou;
    mat.combo++;
    mat.acertos++;
    mat.nivel = Math.min(MAT.NIVEL_MAX, mat.nivel + 1);
    mat.nivelMax = Math.max(mat.nivelMax, mat.nivel);
    botao.classList.add('certa');
    el.classList.add('acertou');
    resultados.push({ m: c.op, certa: `${c.texto} = ${c.res}`, erros: [], nivel: c.nivel });
    SOM.certo();
  } else {
    mat.combo = 0;
    mat.nivel = Math.max(1, mat.nivel - 1);
    if (botao) botao.classList.add('errada');
    if (certoEl) certoEl.classList.add('certa');
    botoes.forEach((b) => { if (b !== botao && b !== certoEl) b.classList.add('apagada'); });
    el.classList.add('errou');
    resultados.push({ m: c.op, certa: `${c.texto} = ${c.res}`, erros: [valor == null ? 'não respondeu a tempo' : `${c.texto} = ${valor}`], nivel: c.nivel });
    SOM.errado();
  }
  hudMat();
  const rodada = mat;
  setTimeout(() => { if (mat === rodada) proximaConta(); }, MAT.PAUSA);
}

function quadroMat(agora) {
  if (!mat || !mat.rodando) return;
  mat.t += Math.min(0.05, (agora - mat.ultimo) / 1000);   // aba escondida: a conta espera
  mat.ultimo = agora;
  const c = mat.conta;
  if (c && !c.respondida) {
    const p = (mat.t - c.nasceu) / c.vida;
    const el = $('mat-conta');
    if (p >= 1) responderMat(null, null);   // chegou ao chão
    else el.style.transform = `translate(-50%, ${p * ($('mat-arena').clientHeight - 34 - el.offsetHeight)}px)`;
  }
  requestAnimationFrame(quadroMat);
}

function terminarMat() {
  const { acertos, feitas, pontos, nivelMax } = mat;
  pararMat();
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Chuva perfeita!' : 'Fim da chuva!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitas} contas, chegou ao nível ${nivelMax} e fez ${pontos} pontos!`;
}

// teclas 1 a 4 escolhem a resposta no computador
document.addEventListener('keydown', (e) => {
  if (!mat || !$('tela-mat').classList.contains('ativa')) return;
  const b = document.querySelector(`#mat-respostas .mat-resposta[data-tecla="${e.key}"]`);
  if (b && !b.disabled) b.click();
});

$('btn-mat').onclick = () => { SOM.clique(); escolherProfessorE('Chuva de Matemática', telaMatMenu); };
$('mat-voltar').onclick = telaJogos;
$('btn-mat-comecar').onclick = () => { SOM.clique(); comecarMat(); };
$('mat-sair').onclick = telaMatMenu;

export { comecarMat, entre, MAT, pararMat, telaMatMenu };
