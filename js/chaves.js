/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Chaves de Sobreposição. */

import { $, embaralhar, sortear } from './util.js?v=115';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=115';
import { SOM, tocar } from './som.js?v=115';
import { mascote, mostrar, telaJogos } from './telas.js?v=115';
import { escolherProfessorE } from './professor.js?v=115';
import { segundos } from './luzes.js?v=115';
import { fimDaMissao } from './relatorio.js?v=115';

// ---------- Chaves de Sobreposição ----------
// Percepção visual, atenção aos detalhes e raciocínio. Uma chave (como de campeonato) tem 4 figuras em cima; cada par
// se junta num quadrado do meio e os dois do meio se juntam no quadrado de baixo. "Juntar" é SOBREPOR: pôr uma figura em
// cima da outra, e tudo o que tem nas duas aparece junto. Os 3 quadrados em branco são perguntados um por vez, com 4
// alternativas e só uma certa; as erradas imitam os erros comuns (pegou só uma das figuras, faltou uma parte, sobrou uma
// parte, trocou a cor, trocou a marca por uma parecida). Respondeu, a figura certa entra no quadrado e vem o próximo.
// Cada chave completa sem erro deixa a próxima mais difícil (mais partes, cores e marcas); errando, fica mais fácil.
// Errou 2 seguidas: uma janelinha mostra um exemplo de sobreposição.
const CHAVES = { CHAVES: 6, NIVEL_MAX: 5 };
const CORES_CHAVE = { A: '#2b3fbf', M: '#f5b800', V: '#e0412b', G: '#4caf50' };
// marcas (desenhadas por cima das cores) e a marca "parecida" que confunde
const MARCAS = {
  cruz: { nome: 'cruz vermelha', parecida: 'xis' },
  xis: { nome: 'xis cinza', parecida: 'cruz' },
  ponto: { nome: 'ponto verde', parecida: 'anel' },
  anel: { nome: 'anel roxo', parecida: 'ponto' },
  diag: { nome: 'risco no canto', parecida: 'diag2' },
  diag2: { nome: 'risco no outro canto', parecida: 'diag' },
  hachura: { nome: 'listras à direita', parecida: 'pontos' },
  pontos: { nome: 'três pontinhos', parecida: 'hachura' },
  meia: { nome: 'meia-lua listrada', parecida: 'moldura' },
  moldura: { nome: 'moldura azul', parecida: 'meia' },
};
// nível: quantas partes tem a figura final (cores nos quadrantes + marcas) e quantas cores
const NIVEIS_CHAVE = [
  { partes: 3, cores: 2, titulo: 'Chaves fáceis' },
  { partes: 4, cores: 2, titulo: 'Mais partes' },
  { partes: 5, cores: 3, titulo: 'Cores e marcas' },
  { partes: 6, cores: 3, titulo: 'Muitas partes' },
  { partes: 7, cores: 4, titulo: 'Chaves difíceis' },
];
const TIPOS_CHAVE = {
  par: { id: 'chave-par', titulo: 'Juntar duas figuras de cima', icone: '🧩', cor: '#2b3fbf',
    regra: 'Sobrepor é pôr uma figura em cima da outra: a nova figura tem tudo o que tem nas duas (as cores e as marcas).' },
  final: { id: 'chave-final', titulo: 'Juntar as duas do meio', icone: '🏁', cor: '#e0412b',
    regra: 'A figura final junta as duas do meio, que já juntaram as quatro de cima: conferir parte por parte se nada ficou de fora.' },
};
let chv = null;   // a partida em andamento

// uma figura é uma lista de partes: "q0A" (quadrante 0 pintado de azul) ou "m:cruz" (marca)
const chaveDe = (fig) => [...fig].sort().join('|');
const juntar = (a, b) => [...new Set([...a, ...b])];
const iguais = (a, b) => chaveDe(a) === chaveDe(b);

function figuraSVG(fig, x = 0, y = 0, t = 100) {
  const s = t / 100;
  const cores = fig.filter((p) => p[0] === 'q').map((p) => {
    const q = Number(p[1]);
    return `<rect x="${(q % 2) * 50}" y="${Math.floor(q / 2) * 50}" width="50" height="50" fill="${CORES_CHAVE[p[2]]}"/>`;
  }).join('');
  const listras = (x0, x1, y0, y1) => Array.from({ length: Math.floor((y1 - y0) / 6) }, (_, i) => `<line x1="${x0}" y1="${y0 + 3 + i * 6}" x2="${x1}" y2="${y0 + 3 + i * 6}"/>`).join('');
  const desenho = {
    cruz: '<path d="M50 0V100M0 50H100" stroke="#e53935" stroke-width="4"/>',
    xis: '<path d="M8 8L92 92M92 8L8 92" stroke="#78909c" stroke-width="4"/>',
    ponto: '<circle cx="50" cy="50" r="10" fill="#43a047" stroke="#13294b" stroke-width="1.5"/>',
    anel: '<circle cx="50" cy="50" r="12" fill="none" stroke="#8e44ad" stroke-width="5"/>',
    diag: '<path d="M0 50L50 0" stroke="#13294b" stroke-width="4"/>',
    diag2: '<path d="M50 100L100 50" stroke="#13294b" stroke-width="4"/>',
    hachura: `<g stroke="#455a64" stroke-width="2">${listras(54, 98, 2, 98)}</g>`,
    pontos: '<g fill="#13294b"><circle cx="82" cy="22" r="5"/><circle cx="82" cy="50" r="5"/><circle cx="82" cy="78" r="5"/></g>',
    meia: `<clipPath id="meia-${x}-${y}"><path d="M50 14A36 36 0 0 0 50 86Z"/></clipPath><path d="M50 14A36 36 0 0 0 50 86Z" fill="#cfd8dc" stroke="#13294b" stroke-width="2.5"/><g stroke="#37474f" stroke-width="2" clip-path="url(#meia-${x}-${y})">${listras(10, 50, 12, 88)}</g>`,
    moldura: '<rect x="14" y="14" width="72" height="72" fill="none" stroke="#1e88e5" stroke-width="5"/>',
  };
  const marcas = fig.filter((p) => p.startsWith('m:')).sort().map((p) => desenho[p.slice(2)]).join('');
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect width="100" height="100" fill="#fff"/>${cores}${marcas}<rect width="100" height="100" fill="none" stroke="#13294b" stroke-width="3"/></g>`;
}
const figuraAvulsa = (fig, rotulo) => `<svg class="figura-chave" viewBox="-2 -2 104 104" role="img" aria-label="${rotulo}">${figuraSVG(fig)}</svg>`;

// sorteia a figura final e reparte as partes: dois grupos (os quadrados do meio) e, em cada grupo, duas figuras de cima
function novaChave(nv) {
  const cores = embaralhar(Object.keys(CORES_CHAVE)).slice(0, nv.cores);
  const nCores = Math.min(4, Math.max(1, Math.round(nv.partes / 2)));
  const quadrantes = embaralhar([0, 1, 2, 3]).slice(0, nCores);
  const partes = [...quadrantes.map((q) => `q${q}${sortear(cores)}`),
    ...embaralhar(Object.keys(MARCAS)).filter((m, i, l) => !l.slice(0, i).includes(MARCAS[m].parecida)).slice(0, nv.partes - nCores).map((m) => `m:${m}`)];
  // dois grupos que não ficam vazios; cada grupo vira duas figuras (que podem repetir uma parte, ou ser iguais)
  for (;;) {
    const mist = embaralhar(partes);
    const corte = 1 + Math.floor(Math.random() * (mist.length - 1));
    const g1 = mist.slice(0, corte), g2 = mist.slice(corte);
    const dividir = (g) => {
      if (g.length === 1) return [g, g];
      const a = [], b = [];
      embaralhar(g).forEach((p, i) => { (i % 2 ? a : b).push(p); if (Math.random() < 0.15) (i % 2 ? b : a).push(p); });
      return [a, b];
    };
    const [A, B] = dividir(g1), [C, D] = dividir(g2);
    if ([A, B, C, D].some((f) => !f.length)) continue;
    // uma figura não pode conter a outra (a resposta ficaria igual a uma delas), a não ser quando o grupo tem uma parte só
    const contem = (x, y) => y.every((p) => x.includes(p));
    if ((g1.length > 1 && (contem(A, B) || contem(B, A))) || (g2.length > 1 && (contem(C, D) || contem(D, C)))) continue;
    return { cima: [A, B, C, D], meio: [juntar(A, B), juntar(C, D)], final: juntar(juntar(A, B), juntar(C, D)), cores };
  }
}

// 3 erradas para o quadrado que junta X e Y (alvo): só uma das duas, faltou parte, sobrou parte, cor trocada, marca parecida
function alternativasChave(X, Y, alvo, cores) {
  const lista = [];
  const por = (fig, motivo) => {
    if (!fig.length || iguais(fig, alvo) || lista.some((x) => iguais(x.fig, fig))) return;
    lista.push({ fig, motivo });
  };
  const candidatas = [];
  candidatas.push([X, 'pegou só a figura da esquerda'], [Y, 'pegou só a figura da direita']);
  for (const p of embaralhar(alvo)) candidatas.push([alvo.filter((x) => x !== p), 'faltou uma parte']);
  const marcasFora = Object.keys(MARCAS).filter((m) => !alvo.includes(`m:${m}`));
  for (const m of embaralhar(marcasFora).slice(0, 2)) candidatas.push([[...alvo, `m:${m}`], 'tem uma parte a mais']);
  const livres = [0, 1, 2, 3].filter((q) => !alvo.some((p) => p.startsWith(`q${q}`)));
  for (const q of livres) candidatas.push([[...alvo, `q${q}${sortear(cores)}`], 'tem uma parte a mais']);
  for (const p of alvo.filter((x) => x[0] === 'q')) {
    for (const c of Object.keys(CORES_CHAVE).filter((c) => c !== p[2])) candidatas.push([alvo.map((x) => (x === p ? `q${p[1]}${c}` : x)), 'trocou a cor']);
  }
  for (const p of alvo.filter((x) => x.startsWith('m:'))) {
    const outra = MARCAS[p.slice(2)].parecida;
    if (!alvo.includes(`m:${outra}`)) candidatas.push([alvo.map((x) => (x === p ? `m:${outra}` : x)), 'trocou a marca por uma parecida']);
  }
  // as mais "pegadinhas" primeiro (só uma das figuras e faltou parte), depois um pouco de cada
  const primeiras = embaralhar(candidatas.slice(0, 2));
  por(...primeiras[0]);
  for (const c of embaralhar(candidatas.slice(1))) { if (lista.length >= 3) break; por(...c); }
  return embaralhar([{ fig: alvo, certa: true }, ...lista.slice(0, 3)]);
}

function telaChavesMenu() {
  pararChaves();
  mascote('davi-chaves', 'oi');
  mostrar('tela-chaves-menu');
}

function comecarChaves() {
  pararChaves();
  definirMissao({ id: 'chaves', chaves: true, icone: '🧩', cor: '#2b3fbf', titulo: 'Chaves de Sobreposição (percepção visual)' });
  definirResultados([]);
  chv = { nivel: 1, nivelMax: 1, pontos: 0, feitas: 0, respostas: 0, acertos: 0, rodando: true, erros: {}, errosSeguidos: 0, ajudas: 0 };
  mostrar('tela-chaves');
  novaChaveNaTela();
}

function pararChaves() {
  if (chv) { chv.rodando = false; clearInterval(chv.relogio); clearTimeout(chv.proxima); }
  chv = null;
  $('chaves-ajuda').hidden = true;
}
const msgChaves = (texto, tipo = '') => { $('chaves-msg').innerHTML = texto; $('chaves-msg').className = `chaves-msg ${tipo}`; };

function novaChaveNaTela() {
  const c = chv;
  if (!c || !c.rodando) return;
  if (c.feitas >= CHAVES.CHAVES) { terminarChaves(); return; }
  c.feitas++;
  const nv = NIVEIS_CHAVE[c.nivel - 1];
  Object.assign(c, { nv, chave: novaChave(nv), preenchidos: [null, null, null], vaga: 0, errosNaChave: 0 });
  $('chaves-nivel').textContent = `🧩 Nível ${c.nivel} de ${CHAVES.NIVEL_MAX}`;
  $('chaves-contador').textContent = `Chave ${c.feitas} de ${CHAVES.CHAVES} · ${nv.titulo}`;
  perguntarVaga();
}

// os 3 quadrados em branco: 0 e 1 (meio, juntam os pares de cima) e 2 (o de baixo, junta os do meio)
function perguntarVaga() {
  const c = chv, k = c.chave;
  const [X, Y] = c.vaga === 0 ? [k.cima[0], k.cima[1]] : c.vaga === 1 ? [k.cima[2], k.cima[3]] : k.meio;
  const alvo = c.vaga < 2 ? k.meio[c.vaga] : k.final;
  c.opcoes = alternativasChave(X, Y, alvo, k.cores);
  c.respondendo = true;
  c.t0 = performance.now();
  desenharChave();
  $('chaves-pontos').textContent = c.pontos;
  $('chaves-opcoes').innerHTML = c.opcoes.map((o, i) => `<button class="chaves-opcao" type="button" data-i="${i}">${figuraAvulsa(o.fig, `Alternativa ${i + 1}`)}</button>`).join('');
  msgChaves(c.vaga < 2 ? 'Junte as duas figuras de cima: qual fica no quadrado <b>?</b>' : 'Agora junte as duas do meio: qual é a figura final?');
  clearInterval(c.relogio);
  c.relogio = setInterval(() => { if (chv && chv.respondendo) $('chaves-tempo').textContent = `⏱ ${segundos((performance.now() - chv.t0) / 1000)}`; }, 250);
}

// a chave inteira num SVG só: 4 figuras em cima, 2 no meio e 1 embaixo, ligadas por linhas
function desenharChave() {
  const c = chv, k = c.chave, T = 64;
  const cima = [[8, 6], [86, 6], [226, 6], [304, 6]], meio = [[47, 118], [265, 118]], fim = [156, 228];
  const linha = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}V${(y1 + y2) / 2}H${x2}V${y2}" fill="none" stroke="#13294b" stroke-width="2"/>`;
  const ligar = (a, b, alvo) => linha(a[0] + T / 2, a[1] + T, alvo[0] + T / 2, alvo[1]) + linha(b[0] + T / 2, b[1] + T, alvo[0] + T / 2, alvo[1]);
  const vaga = (pos, i) => {
    const fig = c.preenchidos[i];
    if (fig) return figuraSVG(fig, pos[0], pos[1], T);
    const atual = i === c.vaga;
    return `<g class="${atual ? 'vaga-atual' : ''}"><rect x="${pos[0]}" y="${pos[1]}" width="${T}" height="${T}" fill="${atual ? '#fff8d6' : '#fff'}" stroke="${atual ? '#f5b800' : '#13294b'}" stroke-width="${atual ? 5 : 3}"/>
      ${atual ? `<text x="${pos[0] + T / 2}" y="${pos[1] + T / 2 + 12}" font-size="34" font-weight="800" text-anchor="middle" fill="#c28f00">?</text>` : ''}</g>`;
  };
  $('chaves-chave').innerHTML = `<svg class="chave-svg" viewBox="0 0 376 300" role="img" aria-label="Chave de sobreposição">
    ${ligar(cima[0], cima[1], meio[0])}${ligar(cima[2], cima[3], meio[1])}${ligar(meio[0], meio[1], fim)}
    ${k.cima.map((f, i) => figuraSVG(f, cima[i][0], cima[i][1], T)).join('')}
    ${vaga(meio[0], 0)}${vaga(meio[1], 1)}${vaga(fim, 2)}
  </svg>`;
}

$('chaves-opcoes').onclick = (e) => {
  const btn = e.target.closest('.chaves-opcao');
  const c = chv;
  if (!btn || !c || !c.respondendo) return;
  c.respondendo = false;
  clearInterval(c.relogio);
  const o = c.opcoes[Number(btn.dataset.i)];
  const tempo = (performance.now() - c.t0) / 1000;
  const tipo = c.vaga < 2 ? TIPOS_CHAVE.par : TIPOS_CHAVE.final;
  const alvo = c.opcoes.find((x) => x.certa).fig;
  const texto = `Chave ${c.feitas}, ${['quadrado do meio (esquerda)', 'quadrado do meio (direita)', 'figura final'][c.vaga]}: ${alvo.length} ${alvo.length === 1 ? 'parte' : 'partes'}`;
  document.querySelectorAll('.chaves-opcao').forEach((b) => { b.disabled = true; if (c.opcoes[Number(b.dataset.i)].certa) b.classList.add('certa'); });
  c.respostas++;
  if (o.certa) {
    const bom = 4 + c.nivel;
    const bonus = Math.max(0, Math.min(60, Math.round(60 * (1 - (tempo - bom) / (bom * 2)))));
    const ganho = 15 * c.nivel + bonus;
    c.pontos += ganho;
    c.acertos++;
    c.errosSeguidos = 0;
    resultados.push({ m: tipo, certa: texto, erros: [], nivel: c.nivel, tempo });
    SOM.certo();
    msgChaves(`✅ Isso! +${ganho} pontos em ${segundos(tempo)}`, 'ok');
  } else {
    btn.classList.add('errada');
    c.erros[o.motivo] = (c.erros[o.motivo] || 0) + 1;
    c.errosSeguidos++;
    c.errosNaChave++;
    resultados.push({ m: tipo, certa: texto, erros: [o.motivo], nivel: c.nivel, tempo });
    SOM.errado();
    msgChaves(`Não foi essa (${o.motivo}). A certa está em verde: ela tem <b>tudo</b> o que tem nas duas figuras.`, 'erro');
  }
  // a figura certa entra no quadrado (acertando ou não) e a chave continua
  c.preenchidos[c.vaga] = alvo;
  desenharChave();
  $('chaves-pontos').textContent = c.pontos;
  const espera = o.certa ? 1300 : 3000;
  if (c.vaga < 2) {
    c.vaga++;
    if (c.errosSeguidos >= 2) { c.errosSeguidos = 0; c.proxima = setTimeout(mostrarAjudaChaves, espera); return; }
    c.proxima = setTimeout(perguntarVaga, espera);
    return;
  }
  // chave completa: sem erro sobe o nível; com 2 ou mais erros, desce
  if (!c.errosNaChave) c.nivel = Math.min(CHAVES.NIVEL_MAX, c.nivel + 1);
  else if (c.errosNaChave >= 2) c.nivel = Math.max(1, c.nivel - 1);
  c.nivelMax = Math.max(c.nivelMax, c.nivel);
  if (!c.errosNaChave) { tocar([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.16]]); msgChaves('🏆 Chave completa sem erros! A próxima vai ser mais difícil.', 'ok'); }
  if (c.errosSeguidos >= 2) { c.errosSeguidos = 0; c.proxima = setTimeout(mostrarAjudaChaves, espera + 600); c.depoisDaAjuda = novaChaveNaTela; return; }
  c.proxima = setTimeout(novaChaveNaTela, espera + 600);
};

function mostrarAjudaChaves() {
  const c = chv;
  if (!c || !c.rodando) return;
  c.ajudas++;
  $('chaves-ajuda').hidden = false;
  tocar([[523, 0.1], [659, 0.1], [784, 0.16]]);
  $('btn-chaves-entendi').focus();
}
$('btn-chaves-entendi').onclick = () => {
  $('chaves-ajuda').hidden = true;
  SOM.clique();
  const c = chv;
  if (!c || !c.rodando) return;
  const seguir = c.depoisDaAjuda || perguntarVaga;
  c.depoisDaAjuda = null;
  seguir();
};
// exemplo da janelinha: azul em dois cantos + amarelo nos outros dois (com um ponto) = a figura com tudo junto
{
  const a = ['q0A', 'q3A'], b = ['q1M', 'q2M', 'm:ponto'];
  $('chaves-ajuda-exemplo').innerHTML = `<div class="chaves-exemplo">${figuraAvulsa(a, 'Figura 1')}<span class="op-som">+</span>${figuraAvulsa(b, 'Figura 2')}<span class="op-som">=</span>${figuraAvulsa(juntar(a, b), 'As duas juntas')}</div>
    <p class="barcos-ajuda-dica"><b>Sobrepor</b> é colocar uma figura <b>em cima</b> da outra, como duas folhas transparentes:
      a figura nova tem <b>tudo</b> o que tem nas duas, as cores e as marcas. Confira parte por parte se nada ficou de fora e se não sobrou nada.</p>`;
}

function terminarChaves() {
  const c = chv;
  pararChaves();
  const tempos = resultados.filter((x) => !x.erros.length).map((x) => x.tempo);
  const erros = Object.entries(c.erros);
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${c.pontos}. Chegou ao nível ${c.nivelMax} de ${CHAVES.NIVEL_MAX} (${NIVEIS_CHAVE[c.nivelMax - 1].titulo.toLowerCase()}).`,
    `Acertou ${c.acertos} de ${c.respostas} quadrados em ${c.feitas} chaves.`,
    erros.length ? `Erros: ${erros.map(([t, n]) => `${t} (${n})`).join(', ')}.` : 'Nenhum erro: juntou todas as figuras certinho!',
    ...(c.ajudas ? [`Precisou da explicação de sobreposição ${c.ajudas} ${c.ajudas === 1 ? 'vez' : 'vezes'} (depois de 2 erros seguidos).`] : []),
    ...(tempos.length ? [`Tempo médio para acertar: ${segundos(tempos.reduce((s, t) => s + t, 0) / tempos.length)}.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = c.acertos === c.respostas ? 'Olho de águia! 🦅' : 'Fim das Chaves!';
  $('fim-texto').textContent = `${aluno}, você acertou ${c.acertos} de ${c.respostas} e fez ${c.pontos} pontos!`;
}

$('btn-chaves').onclick = () => { SOM.clique(); escolherProfessorE('Chaves de Sobreposição', telaChavesMenu); };
$('chaves-voltar').onclick = telaJogos;
$('btn-chaves-comecar').onclick = () => { SOM.clique(); comecarChaves(); };
$('chaves-sair').onclick = telaChavesMenu;

export { CHAVES, comecarChaves, pararChaves, telaChavesMenu };
