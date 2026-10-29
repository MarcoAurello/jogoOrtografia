/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Pizzaria das Frações. */

import { $, embaralhar, sortear } from './util.js?v=131';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=131';
import { SOM } from './som.js?v=131';
import { mascote, mostrar, telaJogos } from './telas.js?v=131';
import { escolherProfessorE } from './professor.js?v=131';
import { segundos } from './luzes.js?v=131';
import { fimDaMissao } from './relatorio.js?v=131';

// ---------- Pizzaria das Frações ----------
// Fração como parte de um todo, em 6 fases (o nível sobe quando acerta e desce quando erra):
// 1) maçãs saem da cesta: que fração foi retirada?  2) que fração sobrou?
// 3) fração ↔ pizza (ver a fração e achar a pizza, ou ver a pizza e achar a fração)
// 4) pintar a fração: tocar nas fatias da pizza  5) somar frações de mesmo denominador  6) subtrair.
// A fração é sempre a parte com recheio. As alternativas erradas imitam os erros comuns:
// contar o que ficou, inverter a fração, dividir pelo que sobrou, somar os denominadores…
const FRACOES = { RODADAS: 10, NIVEL_MAX: 6 };
const NIVEIS_FR = [
  { fase: 'tirou', titulo: 'Quanto foi tirado?' },
  { fase: 'sobrou', titulo: 'Quanto sobrou?' },
  { fase: 'desenho', titulo: 'Fração e pizza' },
  { fase: 'pintar', titulo: 'Pinte a fração' },
  { fase: 'soma', titulo: 'Somar frações' },
  { fase: 'subtracao', titulo: 'Subtrair frações' },
];
const TIPOS_FR = {
  tirou: { id: 'fr-tirou', titulo: 'Fração do que foi retirado', icone: '🍎', cor: '#e53935',
    regra: 'Em cima vai quantas partes saíram; embaixo, o total de partes (o todo).' },
  sobrou: { id: 'fr-sobrou', titulo: 'Fração do que sobrou', icone: '🧺', cor: '#8d6e63',
    regra: 'Em cima vai quantas partes ficaram; embaixo, o total. O que saiu mais o que ficou dá o inteiro.' },
  desenho: { id: 'fr-desenho', titulo: 'Fração e desenho', icone: '🍕', cor: '#f5a000',
    regra: 'O denominador (embaixo) é em quantas fatias a pizza foi cortada; o numerador (em cima), quantas têm recheio.' },
  pintar: { id: 'fr-pintar', titulo: 'Pintar a fração', icone: '🖌️', cor: '#2e9e5b',
    regra: 'A pizza já vem cortada no denominador: pinte tantas fatias quanto diz o numerador.' },
  soma: { id: 'fr-soma', titulo: 'Somar frações', icone: '➕', cor: '#1e88e5',
    regra: 'Com o mesmo denominador, soma só os numeradores: as fatias continuam do mesmo tamanho.' },
  subtracao: { id: 'fr-sub', titulo: 'Subtrair frações', icone: '➖', cor: '#8e44ad',
    regra: 'Com o mesmo denominador, subtrai só os numeradores e o denominador continua o mesmo.' },
};
let fr = null;   // a partida em andamento

const entre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const fracaoHTML = (n, d) => `<span class="fr-num"><b>${n}</b><i></i><b>${d}</b></span>`;
const fracaoTxt = (n, d) => `${n}/${d}`;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// pizza cortada em "d" fatias; as de "recheio" têm molho e calabresa (a fração), as outras são só massa
function pizzaSVG(d, recheio, classe = '') {
  const R = 44;
  const ponto = (ang, r) => [50 + r * Math.cos(ang), 50 + r * Math.sin(ang)].map((v) => v.toFixed(2));
  const fatias = [];
  for (let i = 0; i < d; i++) {
    const a0 = -Math.PI / 2 + (2 * Math.PI * i) / d;
    const a1 = a0 + (2 * Math.PI) / d;
    const meio = (a0 + a1) / 2;
    const [x0, y0] = ponto(a0, R);
    const [x1, y1] = ponto(a1, R);
    const tem = recheio.has(i);
    const caminho = d === 1 ? `<circle cx="50" cy="50" r="${R}"/>` : `<path d="M50 50 L${x0} ${y0} A${R} ${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1} Z"/>`;
    let enfeite = '';
    if (tem) {
      const rc = Math.min(7, R * Math.sin(Math.PI / d) * 0.42);
      const [cx, cy] = ponto(meio, R * 0.6);
      enfeite = `<circle class="calabresa" cx="${cx}" cy="${cy}" r="${rc.toFixed(2)}"/>`;
      if (d <= 6) { const [fx, fy] = ponto(meio + 0.12, R * 0.3); enfeite += `<circle class="folha" cx="${fx}" cy="${fy}" r="2.6"/>`; }
    }
    fatias.push(`<g class="fatia${tem ? ' recheio' : ''}" data-i="${i}">${caminho}${enfeite}</g>`);
  }
  return `<svg class="pizza ${classe}" viewBox="0 0 100 100" aria-hidden="true"><circle class="borda" cx="50" cy="50" r="${R + 3}"/>${fatias.join('')}</svg>`;
}
const fatiasSorteadas = (d, n) => new Set(embaralhar([...Array(d).keys()]).slice(0, n));
const maca = '<svg viewBox="0 0 40 40" aria-hidden="true"><path class="cabo" d="M20 11 Q21 5 25 3"/><path class="folha-m" d="M21 8 Q28 3 32 8 Q26 12 21 8Z"/><path class="fruta" d="M20 12 C10 6 2 14 5 25 C8 35 15 38 20 35 C25 38 32 35 35 25 C38 14 30 6 20 12Z"/></svg>';

// 3 alternativas erradas a partir de uma lista de [numerador, denominador, motivo]; sobra completa com "contou errado"
function montarOpcoes(n, d, erradas, total = d) {
  const lista = [{ n, d, certa: true }];
  const junta = (a, b, motivo) => {
    if (lista.length >= 4 || a < 1 || b < 1 || a > total * 2 || lista.some((o) => o.n * b === a * o.d && (o.n === a || o.certa))) return;
    if (lista.some((o) => o.n === a && o.d === b)) return;
    lista.push({ n: a, d: b, motivo });
  };
  erradas.forEach(([a, b, m]) => junta(a, b, m));
  for (const k of embaralhar([1, -1, 2, -2])) junta(n + k, d, 'contou errado as partes');
  return embaralhar(lista.slice(0, 4));
}

function novaQuestao(nv) {
  const q = { fase: nv.fase };
  if (nv.fase === 'tirou' || nv.fase === 'sobrou') {
    const total = entre(4, 10);
    let k;
    do { k = entre(1, total - 1); } while (k * 2 === total);
    const fica = total - k;
    Object.assign(q, { total, k, fica });
    q.opcoes = nv.fase === 'tirou'
      ? montarOpcoes(k, total, [[fica, total, 'contou as que ficaram'], [total, k, 'inverteu a fração'], [k, fica, 'dividiu pelo que sobrou']])
      : montarOpcoes(fica, total, [[k, total, 'contou as que saíram'], [total, fica, 'inverteu a fração'], [fica, k, 'dividiu pelo que saiu']]);
    q.n = nv.fase === 'tirou' ? k : fica;
    q.d = total;
    q.certaTxt = fracaoTxt(q.n, q.d);
    return q;
  }
  if (nv.fase === 'desenho' || nv.fase === 'pintar') {
    const d = sortear(nv.fase === 'desenho' ? [3, 4, 5, 6, 8] : [3, 4, 5, 6, 8, 10]);
    let n;
    do { n = entre(1, d - 1); } while (n * 2 === d);
    Object.assign(q, { n, d, certaTxt: fracaoTxt(n, d) });
    if (nv.fase === 'desenho') {
      q.sentido = sortear(['fracao', 'pizza']);   // ver a fração e achar a pizza, ou o contrário
      // a fração invertida não vira pizza (teria mais fatias com recheio que o todo)
      const erradas = [[d - n, d, 'trocou as partes com e sem recheio'], [n, d + sortear([1, 2]), 'contou errado as fatias']];
      if (q.sentido === 'pizza') erradas.push([d, n, 'inverteu a fração']);
      q.opcoes = montarOpcoes(n, d, erradas);
      if (q.opcoes.some((o) => o.n > o.d && q.sentido === 'fracao')) return novaQuestao(nv);
      q.opcoes.forEach((o) => { o.fatias = fatiasSorteadas(o.d, Math.min(o.n, o.d)); });
    } else q.pintadas = new Set();
    return q;
  }
  // soma e subtração com o mesmo denominador
  const d = sortear([4, 5, 6, 8, 10]);
  if (nv.fase === 'soma') {
    const a = entre(1, d - 2);
    const b = entre(1, d - 1 - a);
    Object.assign(q, { a, b, d, n: a + b, certaTxt: `${fracaoTxt(a, d)} + ${fracaoTxt(b, d)} = ${fracaoTxt(a + b, d)}` });
    q.opcoes = montarOpcoes(a + b, d, [[a + b, d * 2, 'somou também os denominadores'], [d - a - b, d, 'respondeu o que sobrou da pizza'], [a + b + 1, d, 'contou errado as partes']]);
  } else {
    const a = entre(2, d - 1);
    const b = entre(1, a - 1);
    Object.assign(q, { a, b, d, n: a - b, certaTxt: `${fracaoTxt(a, d)} − ${fracaoTxt(b, d)} = ${fracaoTxt(a - b, d)}` });
    q.opcoes = montarOpcoes(a - b, d, [[a + b, d, 'somou em vez de subtrair'], [b, d, 'respondeu o que foi comido'], [d - (a - b), d, 'contou as fatias sem recheio']]);
  }
  // a segunda pizza: na soma, fatias que a primeira não tem; na subtração, fatias tiradas da primeira
  const ordem = embaralhar([...Array(d).keys()]);
  q.fatiasA = new Set(ordem.slice(0, q.a));
  q.fatiasB = new Set(nv.fase === 'soma' ? ordem.slice(q.a, q.a + q.b) : ordem.slice(0, q.b));
  return q;
}

function telaFracoesMenu() {
  pararFracoes();
  mascote('davi-fracoes', 'oi');
  mostrar('tela-fracoes-menu');
}

function comecarFracoes() {
  pararFracoes();
  definirMissao({ id: 'fracoes', fracoes: true, icone: '🍕', cor: '#f5a000', titulo: 'Pizzaria das Frações (frações)' });
  definirResultados([]);
  fr = { nivel: 1, nivelMax: 1, pontos: 0, feitas: 0, acertos: 0, rodando: true, erros: {} };
  mostrar('tela-fracoes');
  novaRodadaFracoes();
}

function pararFracoes() {
  if (fr) { fr.rodando = false; clearInterval(fr.relogio); clearTimeout(fr.proxima); clearTimeout(fr.anima); }
  fr = null;
}
const msgFracoes = (texto, tipo = '') => { $('fracoes-msg').innerHTML = texto; $('fracoes-msg').className = `fracoes-msg ${tipo}`; };

function novaRodadaFracoes() {
  const f = fr;
  if (!f || !f.rodando) return;
  if (f.feitas >= FRACOES.RODADAS) { terminarFracoes(); return; }
  f.feitas++;
  // no último nível, as contas alternam entre somar e subtrair
  const nv = f.nivel === FRACOES.NIVEL_MAX ? sortear(NIVEIS_FR.slice(-2)) : NIVEIS_FR[f.nivel - 1];
  const q = novaQuestao(nv);
  Object.assign(f, { nv, q, respondendo: false });
  $('fracoes-nivel').textContent = `🍕 Nível ${f.nivel} de ${FRACOES.NIVEL_MAX}`;
  $('fracoes-pontos').textContent = f.pontos;
  $('fracoes-contador').textContent = `Pedido ${f.feitas} de ${FRACOES.RODADAS} · ${nv.titulo}`;
  $('fracoes-tempo').textContent = '';
  msgFracoes('');
  $('fracoes-opcoes').innerHTML = '';
  $('fracoes-opcoes').className = 'fracoes-opcoes';
  desenharCena();
  // nas maçãs, as alternativas só aparecem depois que as maçãs saem da cesta
  const espera = nv.fase === 'tirou' || nv.fase === 'sobrou' ? 400 + 250 * q.k + 500 : 0;
  f.anima = setTimeout(() => {
    if (fr !== f) return;
    mostrarOpcoes();
    f.respondendo = true;
    f.t0 = performance.now();
    clearInterval(f.relogio);
    f.relogio = setInterval(() => { if (fr && fr.respondendo) $('fracoes-tempo').textContent = `⏱ ${segundos((performance.now() - fr.t0) / 1000)}`; }, 250);
  }, espera);
}

// a cena de cima e a pergunta
function desenharCena() {
  const { q } = fr;
  const cena = $('fracoes-cena');
  cena.className = `fracoes-cena cena-${q.fase}`;
  if (q.fase === 'tirou' || q.fase === 'sobrou') {
    const saem = new Set(embaralhar([...Array(q.total).keys()]).slice(0, q.k));
    cena.innerHTML = `<div class="fr-cesta">${[...Array(q.total).keys()].map((i) =>
      `<span class="fr-maca${saem.has(i) ? ' sai' : ''}">${maca}</span>`).join('')}</div>`;
    let ordem = 0;
    cena.querySelectorAll('.fr-maca.sai').forEach((m) => { m.style.transitionDelay = `${400 + 250 * ordem++}ms`; });
    requestAnimationFrame(() => requestAnimationFrame(() => cena.querySelector('.fr-cesta')?.classList.add('tirando')));
    $('fracoes-pergunta').innerHTML = q.fase === 'tirou'
      ? 'Algumas maçãs <b>saíram</b> da cesta. Que fração das maçãs <b>foi retirada</b>?'
      : 'Algumas maçãs <b>saíram</b> da cesta. Que fração das maçãs <b>sobrou</b> na cesta?';
  } else if (q.fase === 'desenho') {
    cena.innerHTML = q.sentido === 'fracao' ? `<div class="fr-grande">${fracaoHTML(q.n, q.d)}</div>` : pizzaSVG(q.d, fatiasSorteadas(q.d, q.n), 'pizza-cena');
    $('fracoes-pergunta').innerHTML = q.sentido === 'fracao' ? 'Qual pizza mostra esta fração? (a parte com recheio)' : 'Que fração da pizza tem recheio?';
  } else if (q.fase === 'pintar') {
    cena.innerHTML = `<div class="fr-pintar">${fracaoHTML(q.n, q.d)}<div class="fr-pintar-pizza">${pizzaSVG(q.d, q.pintadas, 'pizza-pintar')}</div></div>`;
    $('fracoes-pergunta').innerHTML = `Toque nas fatias para colocar recheio em <b>${q.n}/${q.d}</b> da pizza.`;
  } else {
    const op = q.fase === 'soma' ? '+' : '−';
    cena.innerHTML = `<div class="fr-conta">
      <div class="fr-termo">${pizzaSVG(q.d, q.fatiasA, 'pizza-conta')}${fracaoHTML(q.a, q.d)}</div><span class="fr-op">${op}</span>
      <div class="fr-termo">${pizzaSVG(q.d, q.fatiasB, 'pizza-conta')}${fracaoHTML(q.b, q.d)}</div><span class="fr-op">=</span>
      <div class="fr-termo fr-resp"><span class="fr-interroga">?</span></div></div>`;
    $('fracoes-pergunta').innerHTML = q.fase === 'soma'
      ? `Um cliente comeu <b>${q.a}/${q.d}</b> da pizza e outro comeu <b>${q.b}/${q.d}</b>. Quanto da pizza foi comido?`
      : `Sobrou <b>${q.a}/${q.d}</b> da pizza e um cliente comeu <b>${q.b}/${q.d}</b>. Quanto sobrou agora?`;
  }
}

function mostrarOpcoes() {
  const { q } = fr;
  if (q.fase === 'pintar') {
    $('fracoes-opcoes').className = 'fracoes-opcoes so-botao';
    $('fracoes-opcoes').innerHTML = '<button class="btn-grande" id="btn-fracoes-pronto" type="button" disabled>✔ Pronto</button>';
    return;
  }
  const comPizza = q.fase === 'desenho' && q.sentido === 'fracao';
  $('fracoes-opcoes').innerHTML = q.opcoes.map((o, i) => `<button class="fracoes-opcao${comPizza ? ' com-pizza' : ''}" type="button" data-i="${i}">${
    comPizza ? pizzaSVG(o.d, o.fatias) : fracaoHTML(o.n, o.d)}</button>`).join('');
}

// tocar nas fatias da pizza para pintar (fase 4)
$('fracoes-cena').onclick = (e) => {
  const fatia = e.target.closest('.pizza-pintar .fatia');
  const f = fr;
  if (!fatia || !f || !f.respondendo || f.q.fase !== 'pintar') return;
  const i = Number(fatia.dataset.i);
  if (f.q.pintadas.has(i)) f.q.pintadas.delete(i); else f.q.pintadas.add(i);
  SOM.clique();
  $('fracoes-cena').querySelector('.fr-pintar-pizza').innerHTML = pizzaSVG(f.q.d, f.q.pintadas, 'pizza-pintar');
  $('btn-fracoes-pronto').disabled = !f.q.pintadas.size;
};

$('fracoes-opcoes').onclick = (e) => {
  const f = fr;
  if (!f || !f.respondendo) return;
  if (e.target.closest('#btn-fracoes-pronto')) {
    const n = f.q.pintadas.size;
    const motivo = n === f.q.n ? null : n === f.q.d - f.q.n ? 'pintou as fatias sem recheio' : n > f.q.n ? 'pintou fatias a mais' : 'pintou fatias a menos';
    e.target.closest('#btn-fracoes-pronto').disabled = true;
    responder(motivo, `${n}/${f.q.d}`);
    return;
  }
  const btn = e.target.closest('.fracoes-opcao');
  if (!btn) return;
  const o = f.q.opcoes[Number(btn.dataset.i)];
  document.querySelectorAll('.fracoes-opcao').forEach((b) => { b.disabled = true; if (f.q.opcoes[Number(b.dataset.i)].certa) b.classList.add('certa'); });
  if (!o.certa) btn.classList.add('errada');
  responder(o.certa ? null : o.motivo);
};

// a explicação da resposta certa, mostrada depois de responder
function explicacao(q) {
  if (q.fase === 'tirou') return `${q.k === 1 ? 'Saiu' : 'Saíram'} <b>${q.k}</b> de <b>${q.total}</b> maçãs: ${fracaoHTML(q.k, q.total)}`;
  if (q.fase === 'sobrou') return `${q.fica === 1 ? 'Ficou' : 'Ficaram'} <b>${q.fica}</b> de <b>${q.total}</b> maçãs: ${fracaoHTML(q.fica, q.total)}`;
  if (q.fase === 'desenho' || q.fase === 'pintar') return `<b>${plural(q.n, 'fatia', 'fatias')}</b> com recheio de <b>${q.d}</b>: ${fracaoHTML(q.n, q.d)}`;
  return `${fracaoHTML(q.a, q.d)} ${q.fase === 'soma' ? '+' : '−'} ${fracaoHTML(q.b, q.d)} = ${fracaoHTML(q.n, q.d)} <small>(o denominador continua ${q.d})</small>`;
}

function responder(motivo, respondeu) {
  const f = fr;
  f.respondendo = false;
  clearInterval(f.relogio);
  const tempo = (performance.now() - f.t0) / 1000;
  const q = f.q;
  const tipo = TIPOS_FR[q.fase];
  // na soma e na subtração, o "?" da conta mostra o resultado com a pizza
  if (q.fase === 'soma' || q.fase === 'subtracao') {
    const r = q.fase === 'soma' ? new Set([...q.fatiasA, ...q.fatiasB]) : new Set([...q.fatiasA].filter((i) => !q.fatiasB.has(i)));
    const resp = $('fracoes-cena').querySelector('.fr-resp');
    if (resp) resp.innerHTML = pizzaSVG(q.d, r, 'pizza-conta') + fracaoHTML(q.n, q.d);
  }
  if (q.fase === 'tirou' || q.fase === 'sobrou') $('fracoes-cena').querySelector('.fr-cesta')?.classList.add('contar', q.fase);
  if (q.fase === 'pintar') $('fracoes-cena').querySelector('.pizza-pintar')?.classList.add(motivo ? 'errada' : 'certa');
  if (!motivo) {
    const bonus = Math.max(0, Math.min(100, Math.round(100 * (1 - (tempo - 6) / 12))));
    const ganho = 20 * f.nivel + bonus;
    f.pontos += ganho;
    f.acertos++;
    resultados.push({ m: tipo, certa: q.certaTxt, erros: [], nivel: f.nivel, tempo });
    SOM.certo();
    msgFracoes(`✅ Isso! +${ganho} pontos · ${explicacao(q)}`, 'ok');
    f.nivel = Math.min(FRACOES.NIVEL_MAX, f.nivel + 1);
  } else {
    f.erros[motivo] = (f.erros[motivo] || 0) + 1;
    resultados.push({ m: tipo, certa: q.certaTxt, erros: [respondeu ? `${motivo} (${respondeu})` : motivo], nivel: f.nivel, tempo });
    SOM.errado();
    msgFracoes(`Não foi essa (${motivo}). ${explicacao(q)}`, 'erro');
    f.nivel = Math.max(1, f.nivel - 1);
  }
  f.nivelMax = Math.max(f.nivelMax, f.nivel);
  $('fracoes-pontos').textContent = f.pontos;
  f.proxima = setTimeout(novaRodadaFracoes, motivo ? 4200 : 2400);
}

function terminarFracoes() {
  const f = fr;
  pararFracoes();
  const tempos = resultados.filter((x) => !x.erros.length).map((x) => x.tempo);
  const erros = Object.entries(f.erros);
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${f.pontos}. Chegou ao nível ${f.nivelMax} de ${FRACOES.NIVEL_MAX} (${NIVEIS_FR[f.nivelMax - 1].titulo}).`,
    `Acertou ${f.acertos} de ${f.feitas} pedidos.`,
    erros.length ? `Erros: ${erros.map(([t, n]) => `${t} (${n})`).join(', ')}.` : 'Nenhum erro: entendeu as frações direitinho!',
    ...(tempos.length ? [`Tempo médio para acertar: ${segundos(tempos.reduce((t, x) => t + x, 0) / tempos.length)}.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = f.acertos === f.feitas ? 'Pizzaiolo das frações! 🍕' : 'Fim da Pizzaria das Frações!';
  $('fim-texto').textContent = `${aluno}, você acertou ${f.acertos} de ${f.feitas} pedidos e fez ${f.pontos} pontos!`;
}

$('btn-fracoes').onclick = () => { SOM.clique(); escolherProfessorE('Pizzaria das Frações', telaFracoesMenu); };
$('fracoes-voltar').onclick = telaJogos;
$('btn-fracoes-comecar').onclick = () => { SOM.clique(); comecarFracoes(); };
$('fracoes-sair').onclick = telaFracoesMenu;

export { comecarFracoes, FRACOES, pararFracoes, telaFracoesMenu };
