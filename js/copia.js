/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Copie Certo. */

import { $, sortear } from './util.js?v=102';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=102';
import { SOM, tocar } from './som.js?v=102';
import { mascote, mostrar, telaJogos } from './telas.js?v=102';
import { escolherProfessorE } from './professor.js?v=102';
import { segundos } from './luzes.js?v=102';
import { fimDaMissao } from './relatorio.js?v=102';

// ---------- Copie Certo ----------
// Percepção visual, orientação espacial e atenção aos detalhes. Ao lado do quadro grande (4 × 4) aparece um modelo
// pequeno feito com peças coloridas: quadrados e triângulos (meio quadradinho, em 4 direções). A criança escolhe a cor,
// arrasta a peça até o quadradinho certo (ou toca na peça e depois no quadradinho) e toca em "Conferir". O que está
// certo fica verde e preso; o resto ela refaz (até 3 tentativas). Nível 1: modelos de 1 cor; 2: de 2 cores;
// 3: mais peças e cores (com um pote de cor a mais, que não está no modelo). Quanto mais rápido, mais pontos.
const COPIA = { MODELOS: 6, NIVEL_MAX: 3, TENTATIVAS: 3 };
const CORES_COPIA = {
  A: { nome: 'azul', cor: '#2b4a9a' },
  V: { nome: 'vermelho', cor: '#e53935' },
  M: { nome: 'amarelo', cor: '#f9b800' },
  G: { nome: 'verde', cor: '#2e9e5b' },
};
// formas: Q quadrado; a, b, c, d = triângulo com a metade cheia em cima-esquerda, cima-direita, baixo-esquerda, baixo-direita
const FORMAS_COPIA = ['Q', 'a', 'b', 'c', 'd'];
const NOME_FORMA = { Q: 'quadrado', a: 'triângulo ◤', b: 'triângulo ◥', c: 'triângulo ◣', d: 'triângulo ◢' };
// modelos: 4 linhas, cada uma com 4 casas "forma+cor" (ex.: dA = triângulo ◢ azul) ou "." para vazio
const MODELOS_COPIA = {
  1: [
    { nome: 'Telhado', linhas: ['. . . .', '. dA cA .', '. QA QA .', '. . . .'] },
    { nome: 'Bandeira', linhas: ['QA aA . .', 'QA . . .', 'QA . . .', '. . . .'] },
    { nome: 'Losango', linhas: ['. . . .', '. dA cA .', '. bA aA .', '. . . .'] },
    { nome: 'Pirâmide', linhas: ['. . . .', '. . . .', '. dA cA .', 'dA QA QA cA'] },
    { nome: 'Escada', linhas: ['. . . .', '. . . dA', '. . dA QA', '. dA QA QA'] },
  ],
  2: [
    { nome: 'Sorvete', linhas: ['. dV cV .', '. QV QV .', '. bM aM .', '. . . .'] },
    { nome: 'Barco', linhas: ['. . dV .', '. . QV .', 'bA QA QA aA', '. . . .'] },
    { nome: 'Árvore', linhas: ['. dG cG .', 'dG QG QG cG', '. QM QM .', '. . . .'] },
    { nome: 'Sol na montanha', linhas: ['QM . . .', '. . . .', '. dG cG .', 'dG QG QG cG'] },
    { nome: 'Ampulheta', linhas: ['QA QA QA QA', '. bM aM .', '. dM cM .', 'QA QA QA QA'] },
  ],
  3: [
    { nome: 'Casa', linhas: ['. dV cV .', 'dV QV QV cV', 'QM QM QM QM', 'QM QA QA QM'] },
    { nome: 'Foguete', linhas: ['. dV cV .', '. QA QA .', '. QA QA .', 'dM QA QA cM'] },
    { nome: 'Coração', linhas: ['dV cV dV cV', 'QV QV QV QV', 'bV QM QM aV', '. bV aV .'] },
    { nome: 'Flor', linhas: ['. dV cV .', 'dV QM QM cV', '. bV aV .', '. QG QG .'] },
    { nome: 'Peixe', linhas: ['. . . .', 'dM cA dA cA', 'bM aA bA aA', '. . . .'] },
  ],
};
const TIPOS_COPIA = {
  1: { id: 'copia1', titulo: 'Modelos fáceis (1 cor)', icone: '🟦', cor: '#2b4a9a',
    regra: 'Copiar a forma e a direção de cada peça, casa por casa, comparando sempre o modelo com o quadro.' },
  2: { id: 'copia2', titulo: 'Modelos médios (2 cores)', icone: '🟥', cor: '#e53935',
    regra: 'Além da forma e da direção, prestar atenção à cor de cada peça do modelo.' },
  3: { id: 'copia3', titulo: 'Modelos difíceis (mais peças e cores)', icone: '🟨', cor: '#f9b800',
    regra: 'Modelos maiores, com mais cores: organizar a montagem por partes (ex.: telhado, paredes) e conferir linha por linha.' },
};
let copia = null;   // a partida em andamento

// "dA" → { forma: 'd', cor: 'A' }; "." → null
const lerModelo = (m) => m.linhas.flatMap((l) => l.split(' ').map((x) => (x === '.' ? null : { forma: x[0], cor: x[1] })));
const igual = (p, q) => !!p && !!q && p.forma === q.forma && p.cor === q.cor;
const pecaHTML = (p, extra = '') => (p ? `<span class="peca-copia forma-${p.forma}${extra}" style="--cor:${CORES_COPIA[p.cor].cor}"></span>` : '');

function telaCopiaMenu() {
  pararCopia();
  mascote('davi-copia', 'oi');
  mostrar('tela-copia-menu');
}

function comecarCopia() {
  pararCopia();
  definirMissao({ id: 'copia', copia: true, icone: '🧱', cor: '#2b4a9a', titulo: 'Copie Certo (percepção visual e espacial)' });
  definirResultados([]);
  copia = { nivel: 1, nivelMax: 1, pontos: 0, feitas: 0, acertosPrimeira: 0, usados: new Set(), rodando: true,
    erros: { 'direção errada': 0, 'forma errada': 0, 'cor errada': 0, 'faltou peça': 0, 'peça a mais': 0 } };
  mostrar('tela-copia');
  novoModelo();
}

function pararCopia() {
  if (copia) { copia.rodando = false; clearInterval(copia.relogio); clearTimeout(copia.proxima); }
  copia = null;
  soltarArrastoCopia();
}
const msgCopia = (texto, tipo = '') => { $('copia-msg').innerHTML = texto; $('copia-msg').className = `copia-msg ${tipo}`; };

function novoModelo() {
  const c = copia;
  if (!c || !c.rodando) return;
  if (c.feitas >= COPIA.MODELOS) { terminarCopia(); return; }
  c.feitas++;
  let opcoes = MODELOS_COPIA[c.nivel].filter((m) => !c.usados.has(m.nome));
  if (!opcoes.length) opcoes = MODELOS_COPIA[c.nivel];
  const modelo = sortear(opcoes);
  c.usados.add(modelo.nome);
  const alvo = lerModelo(modelo);
  const coresDoModelo = [...new Set(alvo.filter(Boolean).map((p) => p.cor))];
  // no nível 3 aparece uma cor a mais nos potes, para exigir mais atenção
  const extra = c.nivel >= 3 ? Object.keys(CORES_COPIA).filter((k) => !coresDoModelo.includes(k)).slice(0, 1) : [];
  Object.assign(c, { modelo, alvo, grade: Array(16).fill(null), presos: new Set(), cores: [...coresDoModelo, ...extra],
    cor: coresDoModelo[0], ferramenta: null, historico: [], tentativas: 0, primeiroErro: '', respondendo: true, t0: performance.now() });
  $('copia-nivel').textContent = `🧱 Nível ${c.nivel} de ${COPIA.NIVEL_MAX}`;
  $('copia-pontos').textContent = c.pontos;
  $('copia-contador').textContent = `Modelo ${c.feitas} de ${COPIA.MODELOS}: ${modelo.nome}`;
  $('copia-modelo').innerHTML = alvo.map((p) => `<span class="casa-modelo">${pecaHTML(p)}</span>`).join('');
  msgCopia(`${coresDoModelo.length > 1 ? 'Escolha a cor e arraste' : 'Arraste'} a peça até o quadradinho certo. Depois, <b>✔ Conferir</b>.`);
  $('btn-copia-conferir').disabled = false;
  desenharCores();
  desenharQuadro();
  clearInterval(c.relogio);
  c.relogio = setInterval(() => { if (copia && copia.respondendo) $('copia-tempo').textContent = `⏱ ${segundos((performance.now() - copia.t0) / 1000)}`; }, 250);
}

function desenharCores() {
  const c = copia;
  $('copia-cores').innerHTML = c.cores.map((k) =>
    `<button class="pote-copia${k === c.cor ? ' ativo' : ''}" type="button" data-cor="${k}" style="--cor:${CORES_COPIA[k].cor}" aria-label="Cor ${CORES_COPIA[k].nome}"></button>`).join('');
  $('copia-cores').hidden = c.cores.length < 2;   // modelo de uma cor só: não precisa escolher
  $('copia-pecas').innerHTML = FORMAS_COPIA.map((f) =>
    `<button class="peca-btn${c.ferramenta === f ? ' escolhida' : ''}" type="button" data-forma="${f}" aria-label="${NOME_FORMA[f]} ${CORES_COPIA[c.cor].nome}">${pecaHTML({ forma: f, cor: c.cor })}</button>`).join('');
}

function desenharQuadro(marcas = {}) {
  const c = copia;
  $('copia-quadro').innerHTML = c.grade.map((p, i) =>
    `<button class="casa-copia${c.presos.has(i) ? ' presa' : ''}${marcas[i] ? ' ' + marcas[i] : ''}" type="button" data-i="${i}" aria-label="Casa ${Math.floor(i / 4) + 1}, ${i % 4 + 1}">${pecaHTML(p)}</button>`).join('');
}

$('copia-cores').onclick = (e) => {
  const b = e.target.closest('.pote-copia');
  if (!b || !copia || !copia.respondendo) return;
  copia.cor = b.dataset.cor;
  tocar([[587, 0.06]]);
  desenharCores();
};

// coloca (ou troca) a peça numa casa; as casas presas (já conferidas como certas) não mudam
function colocarPeca(i, forma) {
  const c = copia;
  if (c.presos.has(i)) return;
  c.grade[i] = { forma, cor: c.cor };
  c.historico.push(i);   // para o "Apagar" tirar uma peça por vez, da última para a primeira
  tocar([[523, 0.05], [659, 0.07]]);
  desenharQuadro();
  const casa = $('copia-quadro').querySelector(`[data-i="${i}"]`);
  if (casa) casa.classList.add('encaixou');
}

// arrastar: a peça segue o dedo e a casa embaixo dele brilha; só tocar: escolhe a peça e depois toca na casa
let arrastoCopia = null;
function soltarArrastoCopia() {
  if (!arrastoCopia) return;
  arrastoCopia.fantasma.remove();
  document.querySelectorAll('.casa-copia.alvo').forEach((x) => x.classList.remove('alvo'));
  arrastoCopia = null;
}
const casaNoPonto = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest('#copia-quadro .casa-copia'); };

$('copia-pecas').addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.peca-btn');
  if (!b || !copia || !copia.respondendo) return;
  e.preventDefault();
  soltarArrastoCopia();
  const r = b.getBoundingClientRect();
  const fantasma = document.createElement('div');
  fantasma.className = 'fantasma-copia';
  fantasma.style.cssText = `width:${r.width}px;height:${r.height}px`;
  fantasma.innerHTML = pecaHTML({ forma: b.dataset.forma, cor: copia.cor });
  document.body.append(fantasma);
  arrastoCopia = { forma: b.dataset.forma, fantasma, w: r.width / 2, h: r.height / 2, x0: e.clientX, y0: e.clientY, moveu: false };
  fantasma.style.transform = `translate(${e.clientX - arrastoCopia.w}px, ${e.clientY - arrastoCopia.h}px) scale(1.1)`;
});
document.addEventListener('pointermove', (e) => {
  if (!arrastoCopia) return;
  const a = arrastoCopia;
  if (Math.hypot(e.clientX - a.x0, e.clientY - a.y0) > 8) a.moveu = true;
  a.fantasma.style.transform = `translate(${e.clientX - a.w}px, ${e.clientY - a.h}px) scale(1.1)`;
  const casa = casaNoPonto(e.clientX, e.clientY);
  document.querySelectorAll('.casa-copia').forEach((x) => x.classList.toggle('alvo', x === casa));
});
document.addEventListener('pointerup', (e) => {
  if (!arrastoCopia || !copia) { soltarArrastoCopia(); return; }
  const { forma, moveu } = arrastoCopia;
  soltarArrastoCopia();
  if (!moveu) {   // só tocou: escolhe (ou desescolhe) a peça
    copia.ferramenta = copia.ferramenta === forma ? null : forma;
    SOM.clique();
    desenharCores();
    if (copia.ferramenta) msgCopia('Agora toque no quadradinho onde vai a peça.');
    return;
  }
  const casa = casaNoPonto(e.clientX, e.clientY);
  if (casa) colocarPeca(Number(casa.dataset.i), forma);
});
document.addEventListener('pointercancel', soltarArrastoCopia);

// tocar numa casa: com uma peça escolhida, coloca; sem peça escolhida, tira a peça que está lá
$('copia-quadro').onclick = (e) => {
  const casa = e.target.closest('.casa-copia');
  if (!casa || !copia || !copia.respondendo) return;
  const i = Number(casa.dataset.i);
  if (copia.presos.has(i)) return;
  if (copia.ferramenta) { colocarPeca(i, copia.ferramenta); return; }
  if (copia.grade[i]) { copia.grade[i] = null; tocar([[330, 0.06]]); desenharQuadro(); }
};

// apaga uma peça por vez: a última colocada que ainda está no quadro (as presas, já conferidas, ficam)
$('btn-copia-limpar').onclick = () => {
  const c = copia;
  if (!c || !c.respondendo) return;
  while (c.historico.length) {
    const i = c.historico.pop();
    if (c.grade[i] && !c.presos.has(i)) {
      c.grade[i] = null;
      tocar([[330, 0.06]]);
      desenharQuadro();
      return;
    }
  }
  msgCopia('Não há peça para apagar.');
};

// tipo do erro em cada casa errada, para o relatório
function tipoDoErroCopia(colocada, certa) {
  if (!colocada) return 'faltou peça';
  if (!certa) return 'peça a mais';
  if (colocada.forma !== certa.forma) return colocada.forma !== 'Q' && certa.forma !== 'Q' ? 'direção errada' : 'forma errada';
  return 'cor errada';
}

$('btn-copia-conferir').onclick = () => {
  const c = copia;
  if (!c || !c.respondendo) return;
  c.tentativas++;
  const marcas = {}, errosAgora = [];
  c.alvo.forEach((certa, i) => {
    const colocada = c.grade[i];
    if (!certa && !colocada) return;
    if (igual(colocada, certa)) { if (certa) c.presos.add(i); return; }
    const tipo = tipoDoErroCopia(colocada, certa);
    errosAgora.push({ i, tipo, colocada, certa });
    marcas[i] = 'errada';
  });
  if (!errosAgora.length) { fimDoModelo(true); return; }
  errosAgora.forEach((x) => { c.erros[x.tipo]++; });
  if (!c.primeiroErro) {
    const x = errosAgora[0];
    c.primeiroErro = `${x.tipo} na linha ${Math.floor(x.i / 4) + 1}, coluna ${x.i % 4 + 1}`
      + (x.certa ? ` (era ${NOME_FORMA[x.certa.forma]} ${CORES_COPIA[x.certa.cor].nome})` : ' (era vazia)');
  }
  SOM.errado();
  desenharQuadro(marcas);
  const quadro = $('copia-quadro');
  quadro.classList.remove('tremer');
  void quadro.offsetWidth;
  quadro.classList.add('tremer');
  if (c.tentativas >= COPIA.TENTATIVAS) { fimDoModelo(false); return; }
  const tipos = [...new Set(errosAgora.map((x) => x.tipo))].join(', ');
  msgCopia(`${errosAgora.length} ${errosAgora.length === 1 ? 'casa diferente' : 'casas diferentes'} do modelo (${tipos}). As verdes já estão certas: compare de novo!`, 'erro');
  // depois de mostrar em vermelho, tira as peças erradas para a criança refazer
  setTimeout(() => {
    if (copia !== c || !c.respondendo) return;
    errosAgora.forEach((x) => { c.grade[x.i] = null; });
    desenharQuadro();
  }, 1300);
};

function fimDoModelo(acertou) {
  const c = copia;
  c.respondendo = false;
  clearInterval(c.relogio);
  $('btn-copia-conferir').disabled = true;
  const tempo = (performance.now() - c.t0) / 1000;
  const pecas = c.alvo.filter(Boolean).length;
  const texto = `${c.modelo.nome} (${pecas} peças)`;
  const tipo = TIPOS_COPIA[c.nivel];
  if (acertou) {
    // pontos: base pelo nível + bônus de rapidez; cada tentativa a mais divide os pontos
    const bom = pecas * 3;
    const bonus = Math.max(0, Math.min(100, Math.round(100 * (1 - (tempo - bom) / (bom * 2)))));
    const ganho = Math.max(10, Math.round((30 * c.nivel + bonus) / c.tentativas));
    c.pontos += ganho;
    const primeira = c.tentativas === 1;
    if (primeira) c.acertosPrimeira++;
    resultados.push({ m: tipo, certa: texto, erros: primeira ? [] : [`acertou na ${c.tentativas}ª tentativa; ${c.primeiroErro}`], nivel: c.nivel, tempo });
    SOM.certo();
    desenharQuadro(Object.fromEntries(c.alvo.map((p, i) => [i, p ? 'festa' : ''])));
    msgCopia(primeira ? `✅ Igualzinho ao modelo! +${ganho} pontos em ${segundos(tempo)}` : `✅ Agora ficou igual! +${ganho} pontos`, 'ok');
    if (primeira) c.nivel = Math.min(COPIA.NIVEL_MAX, c.nivel + 1);
  } else {
    // depois de 3 tentativas mostra a montagem certa
    resultados.push({ m: tipo, certa: texto, erros: [`não conseguiu em ${COPIA.TENTATIVAS} tentativas; ${c.primeiroErro}`], nivel: c.nivel, tempo });
    c.grade = c.alvo.slice();
    c.alvo.forEach((p, i) => { if (p) c.presos.add(i); });
    desenharQuadro();
    msgCopia('Assim fica igual ao modelo. Vamos para o próximo!', 'erro');
    c.nivel = Math.max(1, c.nivel - 1);
  }
  c.nivelMax = Math.max(c.nivelMax, c.nivel);
  $('copia-pontos').textContent = c.pontos;
  c.proxima = setTimeout(novoModelo, acertou ? 1900 : 3200);
}

function terminarCopia() {
  const c = copia;
  pararCopia();
  const tempos = resultados.filter((x) => !x.erros.length).map((x) => x.tempo);
  const erros = Object.entries(c.erros).filter(([, n]) => n);
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${c.pontos}. Chegou ao nível ${c.nivelMax} de ${COPIA.NIVEL_MAX}.`,
    `Copiou igualzinho de primeira ${c.acertosPrimeira} de ${c.feitas} modelos.`,
    erros.length ? `Diferenças encontradas ao conferir: ${erros.map(([t, n]) => `${t} (${n})`).join(', ')}.` : 'Nenhuma diferença ao conferir: atenção total aos detalhes!',
    ...(tempos.length ? [`Tempo médio para montar (acertos de primeira): ${segundos(tempos.reduce((s, t) => s + t, 0) / tempos.length)}.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = c.acertosPrimeira === c.feitas ? 'Olho de artista! 🎨' : 'Modelos concluídos!';
  $('fim-texto').textContent = `${aluno}, você copiou ${c.feitas} modelos e fez ${c.pontos} pontos!`;
}

$('btn-copia').onclick = () => { SOM.clique(); escolherProfessorE('Copie Certo', telaCopiaMenu); };
$('copia-voltar').onclick = telaJogos;
$('btn-copia-comecar').onclick = () => { SOM.clique(); comecarCopia(); };
$('copia-sair').onclick = telaCopiaMenu;

export { comecarCopia, COPIA, pararCopia, telaCopiaMenu };
