/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Universo dos Conjuntos. */

import { $, embaralhar, sortear } from './util.js?v=255';
import { aluno, definirMissao, definirResultados, estrelasTexto, lerEstrelas, missao, resultados } from './estado.js?v=255';
import { SOM } from './som.js?v=255';
import { mascote, mostrar, telaJogos } from './telas.js?v=255';
import { escolherProfessorE } from './professor.js?v=255';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=255';
import { CENARIOS } from './dados-conjuntos.js?v=255';

// ---------- Universo dos Conjuntos ----------
// Matemática (4º ao 6º ano): os objetos aparecem espalhados no cenário, sem categoria visível; cada conjunto tem um
// critério escrito. O objeto pertence ao conjunto quando atende ao critério (não por estar perto dele), e o mesmo objeto
// pode estar em vários conjuntos. A partida segue o fluxo do projeto: conhecer os grupos → classificar → ∈ e ∉
// (verdadeiro ou falso) → união → interseção → diferença → três conjuntos (com ∅). As respostas são calculadas pela
// tabela objeto × conjunto (js/dados-conjuntos.js) e os objetos mudam de lugar a cada missão.
// Errou a seleção: a primeira vez só marca os errados e diz quantos faltam (tenta de novo); a segunda mostra tudo, com as
// letras dos conjuntos de cada objeto, e explica. "De primeira" (relatório e estrelas) é só a primeira tentativa.
const CONJ = { PAUSA: 700 };
// as etapas da partida, em ordem (10 missões); pontos por acerto de primeira (metade na segunda tentativa)
const ETAPAS = ['classificar', 'pertence', 'naoPertence', 'pertinencia', 'uniao', 'uniao', 'intersecao', 'intersecao', 'diferenca', 'tres'];
const TIPOS_CONJ = {
  classificar: { id: 'conj-classificar', titulo: 'Classificação', icone: '🏷️', cor: '#00838f', pontos: 10,
    regra: 'Reconhecer o critério que define o conjunto e achar todos os objetos que o atendem.' },
  pertence: { id: 'conj-pertence', titulo: 'Pertinência (∈)', icone: '∈', cor: '#2e7d32', pontos: 10,
    regra: 'x ∈ A quer dizer "x pertence a A": o objeto atende ao critério do conjunto.' },
  naoPertence: { id: 'conj-nao-pertence', titulo: 'Não pertinência (∉)', icone: '∉', cor: '#e5484d', pontos: 10,
    regra: 'x ∉ A quer dizer "x não pertence a A": o objeto não atende ao critério do conjunto.' },
  uniao: { id: 'conj-uniao', titulo: 'União (∪)', icone: '∪', cor: '#1e64d2', pontos: 15,
    regra: 'A ∪ B: tudo que está em A OU em B (em pelo menos um dos dois), sem repetir.' },
  intersecao: { id: 'conj-intersecao', titulo: 'Interseção (∩)', icone: '∩', cor: '#7b4fc9', pontos: 15,
    regra: 'A ∩ B: só o que está em A E em B ao mesmo tempo. Se nada atende às duas regras, é o conjunto vazio ∅.' },
  diferenca: { id: 'conj-diferenca', titulo: 'Diferença (−)', icone: '−', cor: '#e5731f', pontos: 20,
    regra: 'A − B: o que está em A, mas NÃO está em B.' },
  tres: { id: 'conj-tres', titulo: 'Três conjuntos', icone: '🔺', cor: '#c2185b', pontos: 25,
    regra: 'Resolver primeiro o que está entre parênteses; na interseção de três, o objeto precisa atender às três regras.' },
};
const OPS = { u: '∪', i: '∩', d: '−' };
let conj = null;        // a partida em andamento
let cenarioId = 'praia';

const cenario = () => CENARIOS.find((c) => c.id === cenarioId) || CENARIOS[0];
const conjDe = (s) => conj.cen.conjuntos.find((c) => c.s === s);
const objDe = (id) => conj.cen.objetos.find((o) => o.id === id);
const nomeObj = (o) => o.nome[0].toUpperCase() + o.nome.slice(1);
const imgObj = (o) => (o.svg ? `<svg class="conj-svg" viewBox="0 0 64 64" aria-hidden="true">${o.svg}</svg>` : `<span class="conj-emoji" aria-hidden="true">${o.emoji}</span>`);
const letra = (s) => { const c = conjDe(s); return `<b class="conj-letra" style="--c:${c.cor}">${s}</b>`; };

// ---------- expressões: { s: 'A' } ou { op: 'u' | 'i' | 'd', a, b } ----------
function avaliar(e) {
  if (e.s) return new Set(conj.cen.objetos.filter((o) => o.em.includes(e.s)).map((o) => o.id));
  const a = avaliar(e.a), b = avaliar(e.b);
  if (e.op === 'u') return new Set([...a, ...b]);
  if (e.op === 'i') return new Set([...a].filter((x) => b.has(x)));
  return new Set([...a].filter((x) => !b.has(x)));
}
const letras = (e) => (e.s ? [e.s] : [...new Set([...letras(e.a), ...letras(e.b)])]);
// texto com símbolos (as letras coloridas em HTML, ou puro para o relatório)
function exprHTML(e, raiz = true) {
  if (e.s) return letra(e.s);
  const t = `${exprHTML(e.a, false)} <span class="conj-op">${OPS[e.op]}</span> ${exprHTML(e.b, false)}`;
  return raiz ? t : `(${t})`;
}
function exprTexto(e, raiz = true) {
  if (e.s) return e.s;
  const t = `${exprTexto(e.a, false)} ${OPS[e.op]} ${exprTexto(e.b, false)}`;
  return raiz ? t : `(${t})`;
}
// a mesma expressão em palavras, para quem ainda não lê os símbolos
function exprPalavras(e) {
  if (e.s) return `<b style="color:${conjDe(e.s).cor}">${conjDe(e.s).nome}</b>`;
  const liga = { u: ' <b>OU</b> ', i: ' <b>E</b> ', d: ', mas <b>NÃO</b> ' }[e.op];
  const lado = (x) => (x.s ? exprPalavras(x) : `(${exprPalavras(x)})`);
  return lado(e.a) + liga + lado(e.b);
}
const conjuntoTexto = (ids) => (ids.size ? `{${[...ids].map((id) => objDe(id).nome).join(', ')}}` : '∅');

// ---------- telas ----------
function telaConjuntosMenu() {
  pararConjuntos();
  mascote('davi-conjuntos', 'oi');
  const estrelas = lerEstrelas();
  $('conj-cenarios').innerHTML = CENARIOS.map((c) => `
    <button class="missao" style="--c:${c.cor}" data-cenario="${c.id}" type="button">
      <span class="missao-icone">${c.icone}</span>
      <span class="missao-titulo">${c.nome}</span>
      <span class="missao-descricao">${c.descricao}</span>
      <span class="missao-estrelas">${estrelasTexto(estrelas[`conjuntos-${c.id}`] || 0)}</span>
    </button>`).join('');
  $('conj-cenarios').querySelectorAll('[data-cenario]').forEach((b) => {
    b.onclick = () => { SOM.clique(); cenarioId = b.dataset.cenario; comecarConjuntos(); };
  });
  mostrar('tela-conjuntos-menu');
}

function comecarConjuntos() {
  pararConjuntos();
  const cen = cenario();
  definirMissao({ id: `conjuntos-${cen.id}`, conjuntos: true, icone: '🔵', cor: '#1e64d2', titulo: `Universo dos Conjuntos: ${cen.nome}` });
  definirResultados([]);
  conj = { cen, n: 0, pontos: 0, dePrimeira: 0, segunda: 0, usados: new Set(), m: null, timers: [] };
  $('tela-conjuntos').style.setProperty('--fundo-conj', cen.fundo);
  desenharLegenda();
  mostrar('tela-conjuntos');
  hudConj();
  abrirGrupos(true);
}

function pararConjuntos() {
  if (conj) conj.timers.forEach(clearTimeout);
  conj = null;
  if ($('conj-grupos')) $('conj-grupos').hidden = true;
}

const msgConj = (texto, tipo = '') => { $('conj-msg').innerHTML = texto; $('conj-msg').className = `cores-msg conj-msg ${tipo}`; };
function hudConj() {
  $('conj-titulo').textContent = `${conj.cen.icone} Missão ${Math.max(1, conj.n)}/${ETAPAS.length}`;
  $('conj-pontos').textContent = conj.pontos;
}

// a legenda dos conjuntos: letra (cor) + ícone + nome; tocar mostra a regra
function desenharLegenda() {
  $('conj-legenda').innerHTML = conj.cen.conjuntos.map((c) => `
    <button class="conj-chip" type="button" data-s="${c.s}" style="--c:${c.cor}" aria-label="Conjunto ${c.s}: ${c.nome}. Toque para ver a regra.">
      <b class="conj-letra" style="--c:${c.cor}">${c.s}</b><span aria-hidden="true">${c.icone}</span><span class="conj-chip-nome">${c.nome}</span>
    </button>`).join('');
  $('conj-legenda').querySelectorAll('.conj-chip').forEach((b) => {
    b.onclick = () => { const c = conjDe(b.dataset.s); SOM.clique(); msgConj(`${letra(c.s)} <b>${c.nome}</b>: ${c.regra}`, 'aviso'); };
  });
}

// "Conhecer os grupos": o quadro com a regra de cada conjunto (no começo e no botão 📖)
function abrirGrupos(noComeco) {
  $('conj-grupos-lista').innerHTML = conj.cen.conjuntos.map((c) => `
    <li style="--c:${c.cor}"><b class="conj-letra" style="--c:${c.cor}">${c.s}</b><span class="conj-g-icone" aria-hidden="true">${c.icone}</span>
      <span><b>${c.nome}</b><br>${c.regra}</span></li>`).join('');
  $('conj-grupos-titulo').textContent = `${conj.cen.icone} Os conjuntos da ${conj.cen.nome.toLowerCase()}`;
  $('btn-conj-grupos-ok').textContent = noComeco ? 'Entendi, vamos lá ▶' : 'Voltar à missão ▶';
  $('btn-conj-grupos-ok').onclick = () => { SOM.clique(); $('conj-grupos').hidden = true; if (noComeco) novaMissao(); };
  $('conj-grupos').hidden = false;
  $('btn-conj-grupos-ok').focus();
}

// ---------- geração das missões ----------
const S = (s) => ({ s });
const tamanho = (e) => avaliar(e).size;
const chaveExpr = (e) => exprTexto(e);
// sorteia uma expressão que obedeça à condição (sem repetir a mesma da partida); desiste da condição depois de muitas tentativas
function sortearExpr(gerar, ok) {
  let melhor = null;
  for (let t = 0; t < 200; t++) {
    const e = gerar();
    if (conj.usados.has(chaveExpr(e))) continue;
    if (!melhor) melhor = e;
    if (ok(avaliar(e), e)) { melhor = e; break; }
  }
  conj.usados.add(chaveExpr(melhor));
  return melhor;
}
const letrasCen = () => conj.cen.conjuntos.map((c) => c.s);
const par = () => { const [a, b] = embaralhar(letrasCen()); return [S(a), S(b)]; };
const total = () => conj.cen.objetos.length;

function montarMissao(etapa) {
  if (etapa === 'classificar') {
    const e = sortearExpr(() => S(sortear(letrasCen())), (r) => r.size >= 2 && r.size < total());
    return { etapa, tipo: TIPOS_CONJ.classificar, modo: 'selecao', expr: e };
  }
  if (etapa === 'pertence' || etapa === 'naoPertence' || etapa === 'pertinencia') {
    const nao = etapa === 'naoPertence' || (etapa === 'pertinencia' && Math.random() < 0.5);
    // metade verdadeira, metade falsa; os casos com nota (pé de pato e calçado, boia e brinquedo) aparecem com prioridade
    const notas = Object.keys(conj.cen.notas || {}).filter((k) => !conj.usados.has(k));
    let o, s;
    if (notas.length && Math.random() < 0.5) { const k = sortear(notas); [o, s] = k.split(':'); o = objDe(o); conj.usados.add(k); }
    else { o = sortear(conj.cen.objetos); s = sortear(letrasCen()); if (Math.random() < 0.5 && o.em) s = sortear([...o.em]); }
    const dentro = o.em.includes(s);
    return { etapa, tipo: nao ? TIPOS_CONJ.naoPertence : TIPOS_CONJ.pertence, modo: 'vf', obj: o, s, nao, verdade: nao ? !dentro : dentro };
  }
  if (etapa === 'uniao') {
    const e = sortearExpr(() => { const [a, b] = par(); return { op: 'u', a, b }; },
      (r, x) => r.size >= 3 && r.size < total() && tamanho(x.a) && tamanho(x.b));
    return { etapa, tipo: TIPOS_CONJ.uniao, modo: 'selecao', expr: e };
  }
  if (etapa === 'intersecao') {
    // a primeira interseção tem resposta; a segunda pode ser vazia (∅), como A ∩ B na praia
    const vazioOk = conj.m && conj.m.etapa === 'intersecao' && Math.random() < 0.4;
    const e = sortearExpr(() => { const [a, b] = par(); return { op: 'i', a, b }; }, (r) => (vazioOk ? r.size === 0 : r.size >= 1));
    return { etapa, tipo: TIPOS_CONJ.intersecao, modo: 'selecao', expr: e };
  }
  if (etapa === 'diferenca') {
    const e = sortearExpr(() => { const [a, b] = par(); return { op: 'd', a, b }; }, (r, x) => r.size >= 1 && r.size < tamanho(x.a));
    return { etapa, tipo: TIPOS_CONJ.diferenca, modo: 'selecao', expr: e };
  }
  // três conjuntos: (X ∪ Y) ∩ Z, (X ∩ Y) ∪ Z, X ∩ Y ∩ Z (pode dar ∅) ou (X ∪ Y) − Z
  const e = sortearExpr(() => {
    const [a, b, c] = embaralhar(letrasCen()).map(S);
    return sortear([{ op: 'i', a: { op: 'u', a, b }, b: c }, { op: 'u', a: { op: 'i', a, b }, b: c },
      { op: 'i', a: { op: 'i', a, b }, b: c }, { op: 'd', a: { op: 'u', a, b }, b: c }]);
  }, (r, x) => (x.op === 'i' && x.a.op === 'i' ? true : r.size >= 1 && r.size < total()));
  return { etapa, tipo: TIPOS_CONJ.tres, modo: 'selecao', expr: e };
}

// ---------- uma missão ----------
function novaMissao() {
  if (!conj) return;
  if (conj.n >= ETAPAS.length) { terminarConjuntos(); return; }
  const m = montarMissao(ETAPAS[conj.n]);
  conj.n++;
  m.t0 = performance.now();
  m.tentativa = 1;
  m.marcados = new Set();
  m.terminou = false;
  if (m.expr) m.resposta = avaliar(m.expr);
  conj.m = m;
  hudConj();
  // os conjuntos que a missão usa ficam em destaque na legenda
  const usa = m.expr ? letras(m.expr) : [m.s];
  $('conj-legenda').querySelectorAll('.conj-chip').forEach((b) => b.classList.toggle('apagado', !usa.includes(b.dataset.s)));
  desenharPergunta(m);
  desenharCena(m);
  desenharAcoes(m);
}

function desenharPergunta(m) {
  const p = $('conj-pergunta');
  p.style.setProperty('--c', m.tipo.cor);
  if (m.modo === 'vf') {
    const sim = m.nao ? '∉' : '∈';
    p.innerHTML = `<span class="conj-etapa">${m.tipo.titulo}</span>
      <span class="conj-expr" aria-label="${nomeObj(m.obj)} ${m.nao ? 'não pertence' : 'pertence'} a ${m.s}">${nomeObj(m.obj)} <span class="conj-op">${sim}</span> ${letra(m.s)}</span>
      <span class="conj-palavras">Verdadeiro ou falso? “${nomeObj(m.obj)} ${m.nao ? '<b>não</b> pertence' : 'pertence'} a <b style="color:${conjDe(m.s).cor}">${conjDe(m.s).nome}</b>.”</span>`;
    msgConj(conj.n === 2 ? `<b>∈</b> quer dizer <b>pertence</b>. Olhe a regra do conjunto ${letra(m.s)}.` : m.nao ? '<b>∉</b> quer dizer <b>não pertence</b>.' : '');
    return;
  }
  const verbo = m.etapa === 'classificar' ? 'Toque em <b>todos</b> os objetos de' : 'Toque nos objetos de';
  p.innerHTML = `<span class="conj-etapa">${m.tipo.titulo}</span>
    <span class="conj-expr">${exprHTML(m.expr)}</span>
    <span class="conj-palavras">${verbo} ${exprPalavras(m.expr)}.</span>`;
  const dica = { uniao: '∪ = <b>OU</b>: pode estar em um, no outro ou nos dois.', intersecao: '∩ = <b>E</b>: só o que está nos dois ao mesmo tempo. Nenhum? Toque em <b>∅</b>.',
    diferenca: '− = <b>mas não</b>: do primeiro, tire o que está no segundo.', tres: 'Comece pelo que está entre parênteses. Nenhum? Toque em <b>∅</b>.' }[m.etapa];
  const primeiraVez = !conj.vistas?.has(m.etapa);
  (conj.vistas ||= new Set()).add(m.etapa);
  msgConj(primeiraVez && dica ? dica : 'Marque e toque em <b>Conferir</b>.');
}

// os objetos espalhados no cenário, em ordem sorteada e um pouco tortos
function desenharCena(m) {
  const cena = $('conj-cena');
  cena.innerHTML = '';
  cena.classList.toggle('modo-vf', m.modo === 'vf');
  embaralhar([...conj.cen.objetos]).forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'conj-obj';
    b.dataset.id = o.id;
    b.style.setProperty('--giro', `${Math.round(Math.random() * 14 - 7)}deg`);
    b.style.setProperty('--dy', `${Math.round(Math.random() * 10 - 5)}px`);
    b.style.animationDelay = `${i * 25}ms`;
    b.innerHTML = `${imgObj(o)}<span class="conj-obj-nome">${o.nome}</span><span class="conj-marca" aria-hidden="true"></span><span class="conj-insignias" aria-hidden="true"></span>`;
    if (m.modo === 'vf') {
      b.setAttribute('aria-label', o.nome);
      if (o.id === m.obj.id) b.classList.add('alvo'); else b.tabIndex = -1;
      b.onclick = () => { if (o.id !== m.obj.id) return; SOM.clique(); msgConj(`Regra de ${letra(m.s)} <b>${conjDe(m.s).nome}</b>: ${conjDe(m.s).regra}`, 'aviso'); };
    } else {
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', o.nome);
      b.onclick = () => marcar(o, b);
    }
    cena.append(b);
  });
}

function desenharAcoes(m) {
  const a = $('conj-acoes');
  if (m.modo === 'vf') {
    a.innerHTML = `<button class="conj-btn conj-v" type="button" data-r="1">✔ Verdadeiro</button><button class="conj-btn conj-f" type="button" data-r="0">✘ Falso</button>`;
    a.querySelectorAll('button').forEach((b) => { b.onclick = () => responderVF(b.dataset.r === '1'); });
    return;
  }
  // o ∅ aparece em todas as missões a partir da união, para não entregar quando a resposta é vazia
  a.innerHTML = `${m.etapa === 'classificar' ? '' : '<button class="conj-btn conj-vazio" type="button" id="btn-conj-vazio" aria-label="Conjunto vazio: nenhum objeto">∅ Nenhum</button>'}
    <button class="conj-btn conj-conferir" type="button" id="btn-conj-conferir">Conferir ✔</button>`;
  $('btn-conj-conferir').onclick = () => conferir(false);
  if ($('btn-conj-vazio')) $('btn-conj-vazio').onclick = () => conferir(true);
}
function botaoProxima(texto = 'Próxima ▶') {
  $('conj-acoes').innerHTML = `<button class="conj-btn conj-conferir" type="button" id="btn-conj-proxima">${conj.n >= ETAPAS.length ? 'Ver resultado 🏁' : texto}</button>`;
  $('btn-conj-proxima').onclick = () => { SOM.clique(); novaMissao(); };
  $('btn-conj-proxima').focus({ preventScroll: true });
}

function marcar(o, b) {
  const m = conj && conj.m;
  if (!m || m.terminou) return;
  SOM.clique();
  if (m.marcados.has(o.id)) m.marcados.delete(o.id); else m.marcados.add(o.id);
  const sim = m.marcados.has(o.id);
  b.classList.toggle('marcado', sim);
  b.classList.remove('errado');
  b.setAttribute('aria-pressed', String(sim));
}

// ---------- explicações ----------
// "Toalha: é item de praia · não é de natação ou mergulho"
function porQue(o, sets) {
  return `<b>${nomeObj(o)}</b>: ${sets.map((s) => `${o.em.includes(s) ? '' : 'não '}${conjDe(s).ser} ${letra(s)}`).join(' · ')}`;
}
const notaDe = (o, sets) => sets.map((s) => conj.cen.notas?.[`${o.id}:${s}`]).filter(Boolean)[0] || '';
// depois de conferir: cada objeto mostra as letras dos conjuntos a que pertence (é o "porquê" de entrar ou não)
function mostrarInsignias() {
  document.querySelectorAll('#conj-cena .conj-obj').forEach((b) => {
    const o = objDe(b.dataset.id);
    b.querySelector('.conj-insignias').innerHTML = o.em ? [...o.em].map(letra).join('') : '<b class="conj-letra conj-nenhum">∅</b>';
  });
}
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// ---------- verdadeiro ou falso (∈ e ∉) ----------
function responderVF(disse) {
  const m = conj.m;
  if (m.terminou) return;
  m.terminou = true;
  const certo = disse === m.verdade;
  const o = m.obj, c = conjDe(m.s);
  const dentro = o.em.includes(m.s);
  const frase = `${nomeObj(o)} ${m.nao ? '∉' : '∈'} ${m.s}`;
  const fato = `<b>${nomeObj(o)}</b> ${dentro ? '' : 'não '}${c.ser}, então ${nomeObj(o)} <b>${dentro ? '∈' : '∉'}</b> ${letra(m.s)}.`;
  const nota = notaDe(o, [m.s]);
  registrar(m, certo, certo ? [] : [`respondeu ${disse ? 'verdadeiro' : 'falso'}`], `${frase}: ${m.verdade ? 'verdadeiro' : 'falso'}`);
  $('conj-acoes').querySelectorAll('button').forEach((b) => {
    b.disabled = true;
    if ((b.dataset.r === '1') === m.verdade) b.classList.add('certa');
    else if ((b.dataset.r === '1') === disse) b.classList.add('errada');
  });
  mostrarInsignias();
  if (certo) { SOM.certo(); msgConj(`✅ ${m.verdade ? 'Verdadeiro' : 'Falso'}! ${fato}${nota ? `<br><small>${nota}</small>` : ''}`, 'ok'); }
  else { SOM.errado(); msgConj(`É <b>${m.verdade ? 'verdadeiro' : 'falso'}</b>: ${fato}${nota ? `<br><small>${nota}</small>` : ''}`, 'erro'); }
  depois(CONJ.PAUSA, () => botaoProxima());
}

// ---------- conferir a seleção ----------
function conferir(vazio) {
  const m = conj.m;
  if (m.terminou) return;
  if (!vazio && !m.marcados.size) { msgConj('Marque pelo menos um objeto. Se nenhum serve, toque em <b>∅ Nenhum</b>.', 'aviso'); return; }
  const marcados = vazio ? new Set() : m.marcados;
  const sobrando = [...marcados].filter((id) => !m.resposta.has(id));
  const faltando = [...m.resposta].filter((id) => !marcados.has(id));
  const certo = !sobrando.length && !faltando.length;
  const sets = letras(m.expr);
  if (m.tentativa === 1) {
    m.errosPrimeira = [...(vazio ? ['marcou ∅'] : []), ...sobrando.map((id) => `marcou ${objDe(id).nome}`), ...faltando.map((id) => `faltou ${objDe(id).nome}`)];
  }
  if (certo) {
    m.terminou = true;
    registrar(m, m.tentativa === 1, m.tentativa === 1 ? [] : m.errosPrimeira, `${exprTexto(m.expr)} = ${conjuntoTexto(m.resposta)}`, m.tentativa === 2);
    document.querySelectorAll('#conj-cena .conj-obj').forEach((b) => { b.disabled = true; if (m.resposta.has(b.dataset.id)) b.classList.add('certo'); });
    mostrarInsignias();
    SOM.certo();
    const ex = m.resposta.size ? `${exprHTML(m.expr)} = ${conjuntoTexto(m.resposta)}` : `${exprHTML(m.expr)} = <b>∅</b>: nenhum objeto atende ${sets.length > 2 ? 'a todas as regras' : 'às duas regras'} ao mesmo tempo.`;
    msgConj(`✅ ${m.tentativa === 1 ? 'Muito bem!' : 'Agora sim!'} ${ex}`, 'ok');
    depois(CONJ.PAUSA, () => botaoProxima());
    return;
  }
  SOM.errado();
  if (m.tentativa === 1) {
    // primeira vez: marca os que não entram e diz quantos faltam; o aluno corrige e confere de novo
    m.tentativa = 2;
    document.querySelectorAll('#conj-cena .conj-obj').forEach((b) => b.classList.toggle('errado', sobrando.includes(b.dataset.id)));
    const partes = [];
    if (vazio && m.resposta.size) partes.push(`não é vazio: ${plural(m.resposta.size, 'objeto entra', 'objetos entram')}`);
    if (sobrando.length) partes.push(`${plural(sobrando.length, 'marcado não entra', 'marcados não entram')} (❌)`);
    if (faltando.length && !vazio) partes.push(`${plural(faltando.length, 'objeto está faltando', 'objetos estão faltando')}`);
    const ex = sobrando.length ? `<br><small>${porQue(objDe(sobrando[0]), sets)}</small>` : '';
    msgConj(`Quase! ${partes.join(' e ')}. Confira a regra de cada conjunto e tente de novo.${ex}`, 'erro');
    return;
  }
  // segunda vez: mostra a resposta, com as letras de cada objeto, e explica um que faltou ou sobrou
  m.terminou = true;
  registrar(m, false, m.errosPrimeira, `${exprTexto(m.expr)} = ${conjuntoTexto(m.resposta)}`);
  document.querySelectorAll('#conj-cena .conj-obj').forEach((b) => {
    b.disabled = true;
    const id = b.dataset.id;
    b.classList.toggle('certo', m.resposta.has(id) && marcados.has(id));
    b.classList.toggle('faltou', m.resposta.has(id) && !marcados.has(id));
    b.classList.toggle('errado', !m.resposta.has(id) && marcados.has(id));
  });
  mostrarInsignias();
  const exemplo = faltando[0] || sobrando[0];
  const o = objDe(exemplo);
  const nota = notaDe(o, sets);
  msgConj(`A resposta é ${exprHTML(m.expr)} = ${conjuntoTexto(m.resposta)}.<br><small>${porQue(o, sets)} → ${m.resposta.has(o.id) ? 'entra' : 'não entra'}.${nota ? ` ${nota}` : ''}</small>`, 'erro');
  depois(CONJ.PAUSA, () => botaoProxima());
}

function registrar(m, dePrimeira, erros, certa, naSegunda = false) {
  const pts = dePrimeira ? m.tipo.pontos : naSegunda ? Math.round(m.tipo.pontos / 2) : 0;
  conj.pontos += pts;
  if (dePrimeira) conj.dePrimeira++;
  else if (naSegunda) conj.segunda++;
  hudConj();
  resultados.push({ m: m.tipo, certa, erros, tempo: (performance.now() - m.t0) / 1000 });
}
const depois = (ms, fn) => { const c = conj; const t = setTimeout(() => { if (conj === c) fn(); }, ms); c.timers.push(t); };

function terminarConjuntos() {
  const { cen, pontos, dePrimeira, segunda } = conj;
  // acertos de primeira por habilidade, para o resumo do relatório
  const porTipo = Object.values(TIPOS_CONJ).map((t) => {
    const rs = resultados.filter((r) => r.m.id === t.id);
    return rs.length ? `${t.titulo}: ${rs.filter((r) => !r.erros.length).length}/${rs.length}` : '';
  }).filter(Boolean);
  pararConjuntos();
  missao.resumo = [
    `Cenário: ${cen.nome}. Acertou ${dePrimeira} de ${ETAPAS.length} missões de primeira${segunda ? ` e ${segunda} na segunda tentativa` : ''}.`,
    `De primeira por habilidade: ${porTipo.join(' · ')}.`,
    `Pontos: ${pontos}`,
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Mestre dos conjuntos! 🔵' : 'Fim das missões!';
  $('fim-texto').textContent = `${aluno}, você acertou ${dePrimeira} de ${ETAPAS.length} missões de primeira na ${cen.nome.toLowerCase()} e fez ${pontos} pontos!`;
}

// capa do cartão na lista de jogos: diagrama de Venn com objetos da praia
$('conjuntos-capa').innerHTML = `<svg viewBox="0 0 200 150" aria-hidden="true"><rect width="200" height="150" fill="#bfe9f7"/><rect y="104" width="200" height="46" fill="#f6dc9c"/>
  <circle cx="78" cy="72" r="50" fill="rgba(229,72,77,.25)" stroke="#e5484d" stroke-width="4"/><circle cx="122" cy="72" r="50" fill="rgba(30,100,210,.22)" stroke="#1e64d2" stroke-width="4"/>
  <text x="38" y="34" font-size="22" font-weight="700" fill="#e5484d" font-family="Fredoka, sans-serif">A</text><text x="150" y="34" font-size="22" font-weight="700" fill="#1e64d2" font-family="Fredoka, sans-serif">B</text>
  <text x="54" y="84" font-size="28">🏐</text><text x="88" y="84" font-size="28">🩴</text><text x="124" y="84" font-size="28">🤿</text>
  <text x="91" y="132" font-size="26" font-weight="700" fill="#13294b" font-family="Fredoka, sans-serif">∩ ∪</text></svg>`;

$('btn-conjuntos').onclick = () => { SOM.clique(); escolherProfessorE('Universo dos Conjuntos', telaConjuntosMenu); };
$('conjuntos-voltar').onclick = telaJogos;
$('conjuntos-sair').onclick = telaConjuntosMenu;
$('btn-conj-regras').onclick = () => { if (conj) { SOM.clique(); abrirGrupos(false); } };

export { comecarConjuntos, pararConjuntos, telaConjuntosMenu };
