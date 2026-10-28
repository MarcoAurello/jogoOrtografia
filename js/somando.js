/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Somando Imagens. */

import { $, embaralhar, sortear } from './util.js?v=120';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=120';
import { SOM, tocar } from './som.js?v=120';
import { mascote, mostrar, telaJogos } from './telas.js?v=120';
import { escolherProfessorE } from './professor.js?v=120';
import { segundos } from './luzes.js?v=120';
import { fimDaMissao } from './relatorio.js?v=120';

// ---------- Somando Imagens ----------
// Visualização mental e raciocínio lógico. Aparece uma conta com quadrados 3 × 3 de casas coloridas:
// "+" junta todas as casas pintadas (cada uma com a sua cor) e "−" tira da primeira figura as casas pintadas na segunda.
// Um dos quadrados da conta é o "?": a criança imagina como ele fica e escolhe, entre 4 alternativas, a única certa.
// As erradas imitam os erros mais comuns: fez a outra conta (+ no lugar de −), esqueceu uma figura, faltou casa,
// casa a mais ou cor errada. Nos níveis altos o "?" pode estar no meio da conta (A + ? = C) e a conta tem 3 figuras.
// Errou 2 contas seguidas: uma janelinha relembra como somar e subtrair figuras.
const SOMANDO = { RODADAS: 10, NIVEL_MAX: 6 };
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
// a conta "de qualquer jeito": soma por cima e subtração que só apaga (para montar as alternativas erradas)
function calcularSolto(figs, ops) {
  const v = figs[0].slice();
  ops.forEach((op, k) => figs[k + 1].forEach((c, i) => { if (c) v[i] = op === '+' ? c : null; }));
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
    const opcoes = alternativas({ figs, ops, falta }, cores);
    if (opcoes) return { figs, ops, falta, opcoes };
  }
}

// 3 alternativas erradas: primeiro os erros de raciocínio (a outra conta, esquecer uma figura),
// depois os de atenção (faltou casa, casa a mais, cor errada). Nenhuma pode fazer a conta dar certo.
function alternativas(conta, cores) {
  const { figs, ops, falta } = conta;
  const certa = figs[falta];
  const n = figs.length;
  const ehResultado = falta === n - 1;
  const lista = [];
  const juntar = (g, motivo) => {
    if (!g || !pintadas(g) || [certa, ...lista.map((x) => x.g)].some((x) => iguais(x, g))) return;
    if (!ehResultado) {   // no "?" do meio, a alternativa não pode resolver a conta
      const f = figs.slice();
      f[falta] = g;
      const r = calcular(f.slice(0, -1), ops);
      if (r && iguais(r, figs[n - 1])) return;
    }
    lista.push({ g, motivo });
  };
  const raciocinio = [];
  if (ehResultado) {
    ops.forEach((op, k) => {   // trocou um dos sinais
      const outros = ops.slice();
      outros[k] = op === '+' ? '−' : '+';
      raciocinio.push([calcularSolto(figs.slice(0, -1), outros), op === '+' ? 'subtraiu em vez de somar' : 'somou em vez de subtrair']);
    });
    raciocinio.push([figs[0].slice(), 'esqueceu de fazer a conta']);
    if (n === 4) raciocinio.push([calcularSolto(figs.slice(0, 2), ops.slice(0, 1)), 'esqueceu a última figura']);
  } else {
    raciocinio.push([figs[n - 1].slice(), 'escolheu o resultado']);
    figs.slice(0, -1).forEach((g, k) => { if (k !== falta) raciocinio.push([g.slice(), 'repetiu outra figura da conta']); });
  }
  embaralhar(raciocinio).slice(0, 2).forEach(([g, m]) => juntar(g, m));
  // erros de atenção, a partir da figura certa
  const comCor = certa.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
  const semCor = certa.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  for (let tent = 0; tent < 40 && lista.length < 3; tent++) {
    const g = certa.slice();
    const tipo = sortear(['faltou casa', 'casa a mais', 'cor errada']);
    if (tipo === 'faltou casa' && comCor.length > 1) g[sortear(comCor)] = null;
    else if (tipo === 'casa a mais' && semCor.length) g[sortear(semCor)] = sortear(cores);
    else if (tipo === 'cor errada' && cores.length > 1) { const i = sortear(comCor); g[i] = sortear(cores.filter((c) => c !== g[i])); }
    else continue;
    juntar(g, tipo);
  }
  if (lista.length < 3) return null;
  return embaralhar([{ g: certa, certa: true }, ...lista.slice(0, 3)]);
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
  som = { nivel: 1, nivelMax: 1, pontos: 0, feitas: 0, acertos: 0, rodando: true, errosSeguidos: 0, ajudas: 0, erros: {} };
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
  Object.assign(s, { nv, conta, respondendo: true, t0: performance.now() });
  $('somando-nivel').textContent = `🧮 Nível ${s.nivel} de ${SOMANDO.NIVEL_MAX}`;
  $('somando-pontos').textContent = s.pontos;
  $('somando-contador').textContent = `Conta ${s.feitas} de ${SOMANDO.RODADAS} · ${nv.titulo}`;
  desenharConta();
  $('somando-opcoes').innerHTML = conta.opcoes.map((o, i) =>
    `<button class="somando-opcao" type="button" data-i="${i}" aria-label="Alternativa ${i + 1}">${gradeHTML(o.g)}</button>`).join('');
  msgSomando(conta.falta === conta.figs.length - 1 ? 'Imagine o resultado e toque na figura certa.' : 'Qual figura fica no lugar do <b>?</b>');
  clearInterval(s.relogio);
  s.relogio = setInterval(() => { if (som && som.respondendo) $('somando-tempo').textContent = `⏱ ${segundos((performance.now() - som.t0) / 1000)}`; }, 250);
}

// a conta em cima: as figuras, os sinais e o "?" (depois da resposta, ele mostra a figura certa)
function desenharConta(revelar = false) {
  const { figs, ops, falta } = som.conta;
  const partes = [];
  figs.forEach((g, k) => {
    if (k > 0) partes.push(`<span class="op-som">${k === figs.length - 1 ? '=' : ops[k - 1]}</span>`);
    partes.push(k === falta ? gradeHTML(revelar ? g : vazia(), `pergunta${revelar ? ' revelada' : ''}`) : gradeHTML(g));
  });
  $('somando-conta').className = `somando-conta figuras-${figs.length - 1}`;
  $('somando-conta').innerHTML = partes.join('');
}

function tipoDaConta(conta) {
  if (conta.falta !== conta.figs.length - 1) return TIPOS_SOM.falta;
  if (conta.ops.every((o) => o === '+')) return TIPOS_SOM.soma;
  if (conta.ops.every((o) => o === '−')) return TIPOS_SOM.subtracao;
  return TIPOS_SOM.mista;
}
// a conta em texto para o relatório: cada figura pelo número de casas pintadas, ex.: "[4] + ? = [6]"
const contaTexto = (conta) => conta.figs.map((g, k) => `${k ? ` ${k === conta.figs.length - 1 ? '=' : conta.ops[k - 1]} ` : ''}${k === conta.falta ? '?' : `[${pintadas(g)}]`}`).join('');
const casas = (n) => `${n} ${n === 1 ? 'casa' : 'casas'}`;

$('somando-opcoes').onclick = (e) => {
  const btn = e.target.closest('.somando-opcao');
  const s = som;
  if (!btn || !s || !s.respondendo) return;
  s.respondendo = false;
  clearInterval(s.relogio);
  const o = s.conta.opcoes[Number(btn.dataset.i)];
  const tempo = (performance.now() - s.t0) / 1000;
  const tipo = tipoDaConta(s.conta);
  const texto = `${contaTexto(s.conta)} (o ? tem ${casas(pintadas(s.conta.figs[s.conta.falta]))})`;
  document.querySelectorAll('.somando-opcao').forEach((b) => { b.disabled = true; if (s.conta.opcoes[Number(b.dataset.i)].certa) b.classList.add('certa'); });
  desenharConta(true);
  if (o.certa) {
    const bom = 5 + 3 * (s.conta.figs.length - 3);
    const bonus = Math.max(0, Math.min(100, Math.round(100 * (1 - (tempo - bom) / (bom * 2)))));
    const ganho = 20 * s.nivel + bonus;
    s.pontos += ganho;
    s.acertos++;
    s.errosSeguidos = 0;
    resultados.push({ m: tipo, certa: texto, erros: [], nivel: s.nivel, tempo });
    SOM.certo();
    msgSomando(`✅ Isso! +${ganho} pontos em ${segundos(tempo)}`, 'ok');
    s.nivel = Math.min(SOMANDO.NIVEL_MAX, s.nivel + 1);
  } else {
    btn.classList.add('errada');
    s.erros[o.motivo] = (s.erros[o.motivo] || 0) + 1;
    s.errosSeguidos++;
    resultados.push({ m: tipo, certa: texto, erros: [o.motivo], nivel: s.nivel, tempo });
    SOM.errado();
    msgSomando(`Não foi essa (${o.motivo}). A certa está em verde e apareceu no lugar do <b>?</b>.`, 'erro');
    s.nivel = Math.max(1, s.nivel - 1);
  }
  s.nivelMax = Math.max(s.nivelMax, s.nivel);
  $('somando-pontos').textContent = s.pontos;
  if (s.errosSeguidos >= 2) { s.errosSeguidos = 0; s.proxima = setTimeout(mostrarAjudaSomando, 2800); return; }
  s.proxima = setTimeout(novaRodadaSomando, o.certa ? 1600 : 3200);
};

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
  const erros = Object.entries(s.erros);
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${s.pontos}. Chegou ao nível ${s.nivelMax} de ${SOMANDO.NIVEL_MAX} (${NIVEIS_SOM[s.nivelMax - 1].titulo}).`,
    `Acertou ${s.acertos} de ${s.feitas} contas.`,
    erros.length ? `Erros: ${erros.map(([t, n]) => `${t} (${n})`).join(', ')}.` : 'Nenhum erro: imaginou todas as figuras certinho!',
    ...(s.ajudas ? [`Precisou da explicação de soma e subtração de figuras ${s.ajudas} ${s.ajudas === 1 ? 'vez' : 'vezes'} (depois de 2 contas erradas seguidas).`] : []),
    ...(tempos.length ? [`Tempo médio para acertar: ${segundos(tempos.reduce((t, x) => t + x, 0) / tempos.length)}.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = s.acertos === s.feitas ? 'Mente de artista! 🎨' : 'Fim do Somando Imagens!';
  $('fim-texto').textContent = `${aluno}, você acertou ${s.acertos} de ${s.feitas} contas e fez ${s.pontos} pontos!`;
}

$('btn-somando').onclick = () => { SOM.clique(); escolherProfessorE('Somando Imagens', telaSomandoMenu); };
$('somando-voltar').onclick = telaJogos;
$('btn-somando-comecar').onclick = () => { SOM.clique(); comecarSomando(); };
$('somando-sair').onclick = telaSomandoMenu;

export { comecarSomando, pararSomando, SOMANDO, telaSomandoMenu };
