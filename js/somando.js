/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Somando Imagens. */

import { $, embaralhar, sortear } from './util.js?v=98';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=98';
import { SOM, tocar } from './som.js?v=98';
import { mascote, mostrar, telaJogos } from './telas.js?v=98';
import { escolherProfessorE } from './professor.js?v=98';
import { segundos } from './luzes.js?v=98';
import { fimDaMissao } from './relatorio.js?v=98';

// ---------- Somando Imagens ----------
// Visualização mental e raciocínio lógico. Aparece uma conta com quadrados 3 × 3 de casas coloridas:
// "+" junta todas as casas pintadas (cada uma com a sua cor) e "−" tira da primeira figura as casas pintadas na segunda.
// Um dos quadrados da conta é o "?": a criança imagina como ele fica e pinta o quadro grande com as cores certas.
// Nos níveis altos o "?" pode estar no meio da conta (A + ? = C) e a conta tem 3 figuras. Até 2 tentativas por conta;
// errou 2 contas seguidas: uma janelinha relembra como somar e subtrair figuras.
const SOMANDO = { RODADAS: 10, NIVEL_MAX: 6, TENTATIVAS: 2 };
const CORES_SOM = {
  T: { nome: 'verde-água', cor: '#3aa7a3' },
  M: { nome: 'amarelo', cor: '#f5cf12' },
  V: { nome: 'vermelho', cor: '#e0412b' },
  R: { nome: 'rosa', cor: '#e58fd0' },
};
// figuras: quantas, quais contas, onde fica o "?" (resultado ou qualquer lugar) e quantas cores
const NIVEIS_SOM = [
  { figuras: 2, ops: ['+'], falta: 'resultado', cores: 2, titulo: 'Somar figuras' },
  { figuras: 2, ops: ['−'], falta: 'resultado', cores: 2, titulo: 'Subtrair figuras' },
  { figuras: 2, ops: ['+', '−'], falta: 'resultado', cores: 4, titulo: 'Somar ou subtrair' },
  { figuras: 2, ops: ['+', '−'], falta: 'qualquer', cores: 4, titulo: 'Qual figura falta?' },
  { figuras: 3, ops: ['+', '−'], falta: 'resultado', cores: 4, titulo: 'Contas com 3 figuras' },
  { figuras: 3, ops: ['+', '−'], falta: 'qualquer', cores: 4, titulo: '3 figuras: qual falta?' },
];
const TIPOS_SOM = {
  soma: { id: 'som-soma', titulo: 'Somar figuras', icone: '➕', cor: '#3aa7a3',
    regra: 'Na soma, a figura final tem todas as casas pintadas das figuras somadas, cada uma com a sua cor.' },
  subtracao: { id: 'som-sub', titulo: 'Subtrair figuras', icone: '➖', cor: '#e0412b',
    regra: 'Na subtração, começa com a primeira figura e apaga as casas que estão pintadas na segunda.' },
  mista: { id: 'som-mista', titulo: 'Contas com soma e subtração', icone: '🔀', cor: '#f5a000',
    regra: 'Fazer a conta por partes, da esquerda para a direita, imaginando a figura de cada passo.' },
  falta: { id: 'som-falta', titulo: 'Descobrir a figura que falta', icone: '❓', cor: '#8e44ad',
    regra: 'Comparar o resultado com as outras figuras: o que o resultado tem a mais veio da soma; o que tem a menos foi subtraído.' },
};
let som = null;   // a partida em andamento

const vazia = () => Array(9).fill(null);
const pintadas = (g) => g.reduce((n, c) => n + (c ? 1 : 0), 0);
const iguais = (a, b) => a.every((c, i) => c === b[i]);
// sorteia n casas entre as livres (as que ainda não estão em "ocupadas")
function casasLivres(ocupadas, n) {
  return embaralhar([...Array(9).keys()].filter((i) => !ocupadas[i])).slice(0, n);
}
// faz a conta da esquerda para a direita; devolve null se a conta não vale
// (soma com a mesma casa em cores diferentes, ou subtração de casa que não está na figura)
function calcular(figs, ops) {
  let v = figs[0].slice();
  for (let k = 0; k < ops.length; k++) {
    const f = figs[k + 1];
    for (let i = 0; i < 9; i++) {
      if (!f[i]) continue;
      if (ops[k] === '+') { if (v[i] && v[i] !== f[i]) return null; v[i] = f[i]; }
      else { if (v[i] !== f[i]) return null; v[i] = null; }
    }
  }
  return v;
}

// monta uma conta: soma com casas novas, subtração com casas que já estão na figura
function novaConta(nv) {
  for (;;) {
    const cores = Object.keys(CORES_SOM).slice(0, nv.cores);
    const pinta = (casas) => { const g = vazia(); casas.forEach((i) => { g[i] = sortear(cores); }); return g; };
    const ops = Array.from({ length: nv.figuras - 1 }, () => sortear(nv.ops));
    const figs = [pinta(casasLivres(vazia(), 2 + Math.floor(Math.random() * 3)))];
    let v = figs[0].slice(), ok = true;
    for (const op of ops) {
      if (op === '+') {
        const livres = 9 - pintadas(v);
        if (livres < 2) { ok = false; break; }
        const f = pinta(casasLivres(v, 1 + Math.floor(Math.random() * Math.min(3, livres - 1))));
        figs.push(f);
        f.forEach((c, i) => { if (c) v[i] = c; });
      } else {
        const tem = v.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
        if (tem.length < 2) { ok = false; break; }
        const tirar = embaralhar(tem).slice(0, 1 + Math.floor(Math.random() * Math.min(3, tem.length - 1)));
        const f = vazia();
        tirar.forEach((i) => { f[i] = v[i]; v[i] = null; });
        figs.push(f);
      }
    }
    if (!ok || !pintadas(v)) continue;
    figs.push(v);
    const falta = nv.falta === 'resultado' ? figs.length - 1 : Math.floor(Math.random() * figs.length);
    return { figs, ops, falta };
  }
}

const gradeHTML = (g, classe = '') => `<div class="grade-som ${classe}">${g.map((c) =>
  `<span class="casa-som"${c ? ` style="--cor:${CORES_SOM[c].cor}"` : ''}></span>`).join('')}</div>`;

function telaSomandoMenu() {
  pararSomando();
  mascote('davi-somando', 'oi');
  mostrar('tela-somando-menu');
}

function comecarSomando() {
  pararSomando();
  definirMissao({ id: 'somando', somando: true, icone: '🧮', cor: '#3aa7a3', titulo: 'Somando Imagens (visualização mental)' });
  definirResultados([]);
  som = { nivel: 1, nivelMax: 1, pontos: 0, feitas: 0, acertosPrimeira: 0, rodando: true, errosSeguidos: 0, ajudas: 0,
    erros: { 'faltou pintar casa': 0, 'pintou casa a mais': 0, 'cor errada': 0 } };
  mostrar('tela-somando');
  novaRodadaSomando();
}

function pararSomando() {
  if (som) { som.rodando = false; clearInterval(som.relogio); clearTimeout(som.proxima); }
  som = null;
  $('somando-ajuda').hidden = true;
}
const msgSomando = (texto, tipo = '') => { $('somando-msg').innerHTML = texto; $('somando-msg').className = `somando-msg ${tipo}`; };

function novaRodadaSomando() {
  const s = som;
  if (!s || !s.rodando) return;
  if (s.feitas >= SOMANDO.RODADAS) { terminarSomando(); return; }
  s.feitas++;
  const nv = NIVEIS_SOM[s.nivel - 1];
  const conta = novaConta(nv);
  const certa = conta.figs[conta.falta];
  const cores = [...new Set(conta.figs.flat().filter(Boolean))].sort();
  Object.assign(s, { nv, conta, certa, grade: vazia(), historico: [], cores, cor: cores[0], tentativas: 0, primeiroErro: '',
    respondendo: true, t0: performance.now() });
  $('somando-nivel').textContent = `🧮 Nível ${s.nivel} de ${SOMANDO.NIVEL_MAX}`;
  $('somando-pontos').textContent = s.pontos;
  $('somando-contador').textContent = `Conta ${s.feitas} de ${SOMANDO.RODADAS} · ${nv.titulo}`;
  $('btn-somando-conferir').disabled = false;
  desenharConta();
  desenharCoresSomando();
  desenharQuadroSomando();
  const ehResultado = conta.falta === conta.figs.length - 1;
  msgSomando(ehResultado ? 'Imagine o resultado e pinte o quadro. Depois, <b>✔ Conferir</b>.'
    : 'Qual figura fica no lugar do <b>?</b> Pinte o quadro e toque em <b>✔ Conferir</b>.');
  clearInterval(s.relogio);
  s.relogio = setInterval(() => { if (som && som.respondendo) $('somando-tempo').textContent = `⏱ ${segundos((performance.now() - som.t0) / 1000)}`; }, 250);
}

// a conta em cima: as figuras, os sinais e o "?" (que mostra, pequenininho, o que a criança já pintou)
function desenharConta(mostrarCerta = false) {
  const s = som;
  const { figs, ops, falta } = s.conta;
  const partes = [];
  figs.forEach((g, k) => {
    if (k > 0) partes.push(`<span class="op-som">${k === figs.length - 1 ? '=' : ops[k - 1]}</span>`);
    partes.push(k === falta ? gradeHTML(mostrarCerta ? g : s.grade, `pergunta${mostrarCerta || pintadas(s.grade) ? ' revelada' : ''}`) : gradeHTML(g));
  });
  $('somando-conta').className = `somando-conta figuras-${figs.length - 1}`;
  $('somando-conta').innerHTML = partes.join('');
}

function desenharCoresSomando() {
  const s = som;
  $('somando-cores').innerHTML = s.cores.map((k) =>
    `<button class="pote-copia${k === s.cor ? ' ativo' : ''}" type="button" data-cor="${k}" style="--cor:${CORES_SOM[k].cor}" aria-label="Cor ${CORES_SOM[k].nome}"></button>`).join('');
}

function desenharQuadroSomando(marcas = {}) {
  const s = som;
  $('somando-quadro').innerHTML = s.grade.map((c, i) =>
    `<button class="casa-somando${marcas[i] ? ' ' + marcas[i] : ''}" type="button" data-i="${i}"${c ? ` style="--cor:${CORES_SOM[c].cor}"` : ''}
      aria-label="Casa ${Math.floor(i / 3) + 1}, ${i % 3 + 1}${c ? ': ' + CORES_SOM[c].nome : ''}"></button>`).join('');
}

$('somando-cores').onclick = (e) => {
  const b = e.target.closest('.pote-copia');
  if (!b || !som || !som.respondendo) return;
  som.cor = b.dataset.cor;
  tocar([[587, 0.06]]);
  desenharCoresSomando();
};

// tocar numa casa: pinta com a cor escolhida; se já está com essa cor, apaga
$('somando-quadro').onclick = (e) => {
  const casa = e.target.closest('.casa-somando');
  const s = som;
  if (!casa || !s || !s.respondendo) return;
  const i = Number(casa.dataset.i);
  s.historico.push([i, s.grade[i]]);
  s.grade[i] = s.grade[i] === s.cor ? null : s.cor;
  tocar(s.grade[i] ? [[523, 0.05], [659, 0.07]] : [[330, 0.06]]);
  desenharQuadroSomando();
  desenharConta();
};

// desfaz o último toque, um por vez
$('btn-somando-apagar').onclick = () => {
  const s = som;
  if (!s || !s.respondendo) return;
  if (!s.historico.length) { msgSomando('Não há nada para apagar.'); return; }
  const [i, antes] = s.historico.pop();
  s.grade[i] = antes;
  tocar([[330, 0.06]]);
  desenharQuadroSomando();
  desenharConta();
};

// compara a pintura com a figura certa, casa por casa, para mostrar e para o relatório
function diferencas(grade, certa) {
  const lista = [];
  grade.forEach((c, i) => {
    if (c === certa[i]) return;
    lista.push({ i, tipo: !c ? 'faltou pintar casa' : !certa[i] ? 'pintou casa a mais' : 'cor errada' });
  });
  return lista;
}

$('btn-somando-conferir').onclick = () => {
  const s = som;
  if (!s || !s.respondendo) return;
  s.tentativas++;
  // vale qualquer pintura que faça a conta dar certo (no "?" do meio pode haver mais de uma resposta)
  const figs = s.conta.figs.slice();
  figs[s.conta.falta] = s.grade;
  const resultado = calcular(figs.slice(0, -1), s.conta.ops);
  if (resultado && iguais(resultado, figs[figs.length - 1]) && pintadas(s.grade)) { fimDaRodadaSomando(true); return; }
  const difs = diferencas(s.grade, s.certa);
  difs.forEach((x) => { s.erros[x.tipo]++; });
  if (!s.primeiroErro) s.primeiroErro = [...new Set(difs.map((x) => x.tipo))].join(', ');
  SOM.errado();
  desenharQuadroSomando(Object.fromEntries(difs.map((x) => [x.i, 'errada'])));
  const q = $('somando-quadro');
  q.classList.remove('tremer');
  void q.offsetWidth;
  q.classList.add('tremer');
  if (s.tentativas >= SOMANDO.TENTATIVAS) { fimDaRodadaSomando(false); return; }
  msgSomando(`Ainda não. ${difs.length} ${difs.length === 1 ? 'casa está diferente' : 'casas estão diferentes'} (em vermelho). Confira de novo!`, 'erro');
  setTimeout(() => { if (som === s && s.respondendo) desenharQuadroSomando(); }, 1300);
};

function tipoDaConta(conta) {
  if (conta.falta !== conta.figs.length - 1) return TIPOS_SOM.falta;
  if (conta.ops.every((o) => o === '+')) return TIPOS_SOM.soma;
  if (conta.ops.every((o) => o === '−')) return TIPOS_SOM.subtracao;
  return TIPOS_SOM.mista;
}
// a conta em texto para o relatório: cada figura pelo número de casas pintadas, ex.: "[4] + ? = [6]"
const contaTexto = (conta) => conta.figs.map((g, k) => `${k ? ` ${k === conta.figs.length - 1 ? '=' : conta.ops[k - 1]} ` : ''}${k === conta.falta ? '?' : `[${pintadas(g)}]`}`).join('');
const casas = (n) => `${n} ${n === 1 ? 'casa' : 'casas'}`;

function fimDaRodadaSomando(acertou) {
  const s = som;
  s.respondendo = false;
  clearInterval(s.relogio);
  $('btn-somando-conferir').disabled = true;
  const tempo = (performance.now() - s.t0) / 1000;
  const tipo = tipoDaConta(s.conta);
  const texto = `${contaTexto(s.conta)} (o ? tem ${casas(pintadas(s.certa))})`;
  if (acertou) {
    const bom = 6 + 3 * (s.conta.figs.length - 2);
    const bonus = Math.max(0, Math.min(100, Math.round(100 * (1 - (tempo - bom) / (bom * 2)))));
    const ganho = Math.max(10, Math.round((20 * s.nivel + bonus) / s.tentativas));
    s.pontos += ganho;
    const primeira = s.tentativas === 1;
    if (primeira) s.acertosPrimeira++;
    s.errosSeguidos = 0;
    resultados.push({ m: tipo, certa: texto, erros: primeira ? [] : [`acertou na 2ª tentativa (${s.primeiroErro})`], nivel: s.nivel, tempo });
    SOM.certo();
    desenharQuadroSomando(Object.fromEntries(s.grade.map((c, i) => [i, c ? 'festa' : ''])));
    msgSomando(primeira ? `✅ Isso! +${ganho} pontos em ${segundos(tempo)}` : `✅ Agora sim! +${ganho} pontos`, 'ok');
    if (primeira) s.nivel = Math.min(SOMANDO.NIVEL_MAX, s.nivel + 1);
  } else {
    s.errosSeguidos++;
    resultados.push({ m: tipo, certa: texto, erros: [`errou nas ${SOMANDO.TENTATIVAS} tentativas (${s.primeiroErro})`], nivel: s.nivel, tempo });
    s.grade = s.certa.slice();
    desenharQuadroSomando();
    desenharConta(true);
    msgSomando(tipo === TIPOS_SOM.falta ? 'A figura certa está no quadro. Confira a conta com ela!' : 'O resultado certo está no quadro. Confira com a conta!', 'erro');
    s.nivel = Math.max(1, s.nivel - 1);
  }
  s.nivelMax = Math.max(s.nivelMax, s.nivel);
  $('somando-pontos').textContent = s.pontos;
  if (s.errosSeguidos >= 2) { s.errosSeguidos = 0; s.proxima = setTimeout(mostrarAjudaSomando, 3000); return; }
  s.proxima = setTimeout(novaRodadaSomando, acertou ? 1600 : 3400);
}

function mostrarAjudaSomando() {
  const s = som;
  if (!s || !s.rodando) return;
  s.ajudas++;
  $('somando-ajuda').hidden = false;
  tocar([[523, 0.1], [659, 0.1], [784, 0.16]]);
  $('btn-somando-entendi').focus();
}
$('btn-somando-entendi').onclick = () => {
  $('somando-ajuda').hidden = true;
  SOM.clique();
  if (som && som.rodando) novaRodadaSomando();
};
// exemplos da janelinha: uma soma e uma subtração
{
  const g = (txt) => txt.split('').map((c) => (c === '.' ? null : c));
  const linha = (a, op, b, c) => `<div class="somando-exemplo">${gradeHTML(g(a))}<span class="op-som">${op}</span>${gradeHTML(g(b))}<span class="op-som">=</span>${gradeHTML(g(c))}</div>`;
  $('somando-ajuda-exemplos').innerHTML = linha('T..M.....', '+', '....V...R', 'T..MV...R')
    + '<p class="barcos-ajuda-dica"><b>+ soma:</b> junta todas as casas pintadas, cada uma com a sua cor.</p>'
    + linha('TM.MV..RT', '−', '.M..V....', 'T..M...RT')
    + '<p class="barcos-ajuda-dica"><b>− subtração:</b> começa com a primeira figura e apaga as casas pintadas na segunda.</p>';
}

function terminarSomando() {
  const s = som;
  pararSomando();
  const tempos = resultados.filter((x) => !x.erros.length).map((x) => x.tempo);
  const erros = Object.entries(s.erros).filter(([, n]) => n);
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${s.pontos}. Chegou ao nível ${s.nivelMax} de ${SOMANDO.NIVEL_MAX} (${NIVEIS_SOM[s.nivelMax - 1].titulo}).`,
    `Acertou de primeira ${s.acertosPrimeira} de ${s.feitas} contas.`,
    erros.length ? `Diferenças ao conferir: ${erros.map(([t, n]) => `${t} (${n})`).join(', ')}.` : 'Nenhuma diferença ao conferir: imaginou todas as figuras certinho!',
    ...(s.ajudas ? [`Precisou da explicação de soma e subtração de figuras ${s.ajudas} ${s.ajudas === 1 ? 'vez' : 'vezes'} (depois de 2 contas erradas seguidas).`] : []),
    ...(tempos.length ? [`Tempo médio para acertar de primeira: ${segundos(tempos.reduce((t, x) => t + x, 0) / tempos.length)}.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = s.acertosPrimeira === s.feitas ? 'Mente de artista! 🎨' : 'Fim do Somando Imagens!';
  $('fim-texto').textContent = `${aluno}, você acertou de primeira ${s.acertosPrimeira} de ${s.feitas} contas e fez ${s.pontos} pontos!`;
}

$('btn-somando').onclick = () => { SOM.clique(); escolherProfessorE('Somando Imagens', telaSomandoMenu); };
$('somando-voltar').onclick = telaJogos;
$('btn-somando-comecar').onclick = () => { SOM.clique(); comecarSomando(); };
$('somando-sair').onclick = telaSomandoMenu;

export { comecarSomando, pararSomando, SOMANDO, telaSomandoMenu };
