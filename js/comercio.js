/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Conexão Global: importação e exportação entre os países. */

import { $, embaralhar, sortear } from './util.js?v=255';
import { aluno, definirMissao, definirResultados, estrelasTexto, lerEstrelas, missao, resultados } from './estado.js?v=255';
import { SOM, tocar } from './som.js?v=255';
import { mascote, mostrar, telaJogos } from './telas.js?v=255';
import { escolherProfessorE } from './professor.js?v=255';
import { fimDaMissao } from './relatorio.js?v=255';
import { CATEGORIAS, MODOS_COMERCIO, PAISES, PERGUNTAS_COMERCIO, PRODUTOS } from './dados-comercio.js?v=255';
import { bandeira } from './bandeiras.js?v=255';
import { animarNavio, desenharMapa } from './mapa-comercio.js?v=255';

// ---------- Conexão Global ----------
// A criança é comandante de um navio cargueiro. Cinco modos, todos abertos desde o começo:
// Alfândega (a carta "país + produto" vai para o contêiner EXPORTA ou IMPORTA), Quem sou eu? (pistas do que o país
// vende → toca na bandeira certa), Rota comercial (um país precisa comprar um produto → escolhe quem vende; o navio
// faz a viagem no mapa), Por quê? (pergunta comentada) e Vai e volta (os produtos que o país compra E vende).
// Regras iguais às da Cronologia: +100 por acerto (+50 sem dica), combo x2 e x3, erro só zera o combo, dica no 2º
// erro e, no 3º, o jogo mostra a resposta (vale 0). Todo acerto abre o cartão-postal com o que aprender, e o
// Continuar segue o jogo. Acertar de primeira carimba o Passaporte do país (guardado só no aparelho).
const COMERCIO = { BASE: 100, SEM_DICA: 50, MAX_ERROS: 3 };
const PAIS = Object.fromEntries(PAISES.map((p) => [p.id, p]));
const MODO = Object.fromEntries(MODOS_COMERCIO.map((m) => [m.id, m]));
let cm = null;   // a partida em andamento
let ultimoModo = 0;   // para o Jogar de novo da tela de fim

// ---------- Passaporte (no aparelho, separado por aluno) ----------
const chavePassaporte = () => 'pleno-ortografia:comercio:' + (aluno || '').trim().toLowerCase();
function lerPassaporte() { try { return (JSON.parse(localStorage.getItem(chavePassaporte())) || {}).carimbos || []; } catch (e) { return []; } }
function carimbar(id) {
  const c = lerPassaporte();
  if (c.includes(id)) return false;
  c.push(id);
  try { localStorage.setItem(chavePassaporte(), JSON.stringify({ carimbos: c })); } catch (e) { /* sem armazenamento */ }
  return true;
}

// pedacinhos de HTML
const produtoIcone = (id) => {
  const p = PRODUTOS[id];
  return `<span class="cm-prod" style="--c:${CATEGORIAS[p.cat].cor}" aria-hidden="true">${p.imagem ? `<img src="${p.imagem}" alt="">` : p.icone}</span>`;
};
const produtoNome = (id) => PRODUTOS[id].nome;
const paisCurto = (id) => `${bandeira(id, PAIS[id].nome, 'bandeira mini')} <b>${PAIS[id].nome}</b>`;
const multiplicador = (combo) => (combo >= 3 ? 3 : combo >= 2 ? 2 : 1);
const tipoDoModo = (m) => ({ id: `comercio-${m.id}`, titulo: m.nome, icone: m.icone, cor: '#0277bd', regra: m.regra });
// lista de produtos em texto: "soja, café e carne"
const juntar = (lista) => (lista.length > 1 ? `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}` : lista[0] || '');

// ---------- Menu ----------
function telaComercioMenu() {
  pararComercio();
  mascote('davi-comercio', 'oi');
  desenharMapa($('comercio-mapa-menu'), { paises: PAISES, destaques: [], nomes: false });
  const estrelas = lerEstrelas();
  // os modos visíveis (os marcados como oculto não aparecem), numerados na ordem em que aparecem
  const visiveis = MODOS_COMERCIO.map((m, k) => ({ m, k })).filter(({ m }) => !m.oculto);
  $('comercio-modos').innerHTML = visiveis.map(({ m, k }, pos) => {
    const aberto = true;   // todos os modos abertos: o professor pode trabalhar qualquer um em aula
    return `<button class="missao${aberto ? '' : ' bloqueada'}" style="--c:#0277bd" data-modo="${k}" type="button"${aberto ? '' : ' disabled'}>
        <span class="missao-icone">${aberto ? m.icone : '🔒'}</span>
        <span class="missao-titulo">${m.id === 'vaievolta' ? '⭐ ' : `${pos + 1}. `}${m.nome}</span>
        <span class="missao-descricao">${m.descricao}</span>
        <span class="missao-estrelas">${aberto ? estrelasTexto(estrelas[`comercio-${m.id}`] || 0) : 'Termine o modo anterior'}</span>
      </button>`;
  }).join('');
  $('comercio-carimbos').textContent = `· ${lerPassaporte().length} de ${PAISES.length} carimbos`;
  mostrar('tela-comercio-menu');
}
$('comercio-modos').onclick = (e) => {
  const b = e.target.closest('[data-modo]');
  if (!b || b.disabled) return;
  SOM.clique();
  comecarComercio(Number(b.dataset.modo));
};

// ---------- Montagem das rodadas de cada modo ----------
function montarAlfandega() {
  // 3 países, 2 cartas de cada (uma que ele vende e uma que ele compra); produto que ele compra E vende fica de fora
  const cartas = [];
  for (const p of embaralhar(PAISES).slice(0, 3)) {
    const soVende = p.exporta.filter((x) => !p.ambos.includes(x)), soCompra = p.importa.filter((x) => !p.ambos.includes(x));
    cartas.push({ pais: p.id, prod: sortear(soVende), tipo: 'exporta' }, { pais: p.id, prod: sortear(soCompra), tipo: 'importa' });
  }
  return embaralhar(cartas).map((c, i) => ({ ...c, i }));
}
function montarQuem(n) {
  return embaralhar(PAISES).slice(0, n).map((p) => {
    const [a, b] = embaralhar(p.exporta.filter((x) => !p.ambos.includes(x)));
    const compra = sortear(p.importa.filter((x) => !p.ambos.includes(x)));
    // as outras bandeiras não podem vender os produtos das pistas (senão teriam duas respostas)
    const outros = embaralhar(PAISES.filter((o) => o.id !== p.id && !o.exporta.includes(a) && !o.exporta.includes(b))).slice(0, 3);
    return { pais: p.id, pistas: [`Eu exporto ${produtoIcone(a)} <b>${produtoNome(a)}</b>.`,
      `Também vendo ${produtoIcone(b)} <b>${produtoNome(b)}</b> e compro ${produtoIcone(compra)} <b>${produtoNome(compra)}</b>.`, p.local],
      opcoes: embaralhar([p.id, ...outros.map((o) => o.id)]) };
  });
}
function montarRota(n) {
  const pedidos = [], usados = new Set();
  for (const comprador of embaralhar(PAISES)) {
    if (pedidos.length >= n) break;
    const precisa = embaralhar(comprador.importa.filter((x) => !comprador.exporta.includes(x) && !usados.has(x)));
    for (const prod of precisa) {
      const vendem = PAISES.filter((v) => v.id !== comprador.id && v.exporta.includes(prod));
      const naoVendem = PAISES.filter((v) => v.id !== comprador.id && !v.exporta.includes(prod));
      if (!vendem.length || naoVendem.length < 3) continue;
      const vendedor = sortear(vendem);
      usados.add(prod);
      pedidos.push({ comprador: comprador.id, prod, vendedor: vendedor.id,
        opcoes: embaralhar([vendedor.id, ...embaralhar(naoVendem).slice(0, 3).map((v) => v.id)]) });
      break;
    }
  }
  return pedidos;
}
function montarPorque(n) {
  return embaralhar(PERGUNTAS_COMERCIO).slice(0, n).map((q) => ({ ...q, ordem: embaralhar([0, 1, 2]) }));
}
function montarVaiEVolta(n) {
  return embaralhar(PAISES.filter((p) => p.ambos.length)).slice(0, n).map((p) => {
    const certos = embaralhar(p.ambos).slice(0, 2);
    const outros = embaralhar([...p.exporta, ...p.importa].filter((x) => !p.ambos.includes(x))).slice(0, 5 - certos.length);
    return { pais: p.id, certos, produtos: embaralhar([...certos, ...outros]), marcados: new Set() };
  });
}

// ---------- Partida ----------
function comecarComercio(k = 0) {
  pararComercio();
  const modo = MODOS_COMERCIO[k];
  ultimoModo = k;
  const fila = modo.id === 'alfandega' ? montarAlfandega() : modo.id === 'quem' ? montarQuem(modo.cartas)
    : modo.id === 'rota' ? montarRota(modo.cartas) : modo.id === 'porque' ? montarPorque(modo.cartas) : montarVaiEVolta(modo.cartas);
  definirMissao({ id: `comercio-${modo.id}`, comercio: true, icone: '🚢', cor: '#0277bd', titulo: `Conexão Global – ${modo.nome}` });
  definirResultados([]);
  // alfândega: todas as cartas na mão ao mesmo tempo (fila = a mão); os outros modos: uma rodada por vez (idx)
  cm = { modo, k, fila, idx: 0, total: fila.length, feitas: 0, sel: null, tent: 0, errosDe: {}, combo: 0, pontos: 0,
    dePrimeira: 0, dicas: 0, sozinhas: 0, carimbos: 0, rotas: [], pistas: 1, rodando: true, lendo: false };
  // o modo vai na tela: no celular, o mapa só aparece onde ele informa algo (a rota do navio e o país da Alfândega)
  $('tela-comercio').dataset.modo = modo.id;
  mostrar('tela-comercio');
  msgComercio(modo.id === 'alfandega' ? 'Toque numa carta e depois no contêiner certo (ou arraste a carta).' : '');
  desenharComercio();
}

function pararComercio() {
  if (cm) cm.rodando = false;
  cm = null;
  $('comercio-postal').hidden = true;
  soltarArrasto();
}
const msgComercio = (texto, tipo = '') => { $('comercio-msg').innerHTML = texto; $('comercio-msg').className = `comercio-msg ${tipo}`; };
const rodada = () => cm.fila[cm.idx];

function desenharComercio() {
  const c = cm;
  if (!c) return;
  $('comercio-titulo').textContent = `${c.modo.icone} ${c.modo.nome}`;
  $('comercio-pontos').textContent = c.pontos;
  $('comercio-progresso').textContent = `${c.modo.id === 'alfandega' ? 'Cartas' : 'Rodada'}: ${Math.min(c.feitas + (c.modo.id === 'alfandega' ? 0 : 1), c.total)} de ${c.total}`;
  const mult = multiplicador(c.combo);
  $('comercio-combo').textContent = mult > 1 ? `🔥 Combo x${mult}` : '';
  ({ alfandega: desenharAlfandega, quem: desenharQuem, rota: desenharRota, porque: desenharPorque, vaievolta: desenharVaiEVolta })[c.modo.id]();
}

// Alfândega: o país da carta escolhida aparece no mapa e no enunciado
function desenharAlfandega() {
  const c = cm;
  const carta = c.sel != null ? c.fila.find((x) => x.i === c.sel) : null;
  desenharMapa($('comercio-mapa'), { paises: PAISES, destaques: carta ? [carta.pais] : [...new Set(c.fila.map((x) => x.pais))], rotas: c.rotas });
  $('comercio-enunciado').innerHTML = carta
    ? `<p class="cm-pais-linha">${paisCurto(carta.pais)}</p><p>${PAIS[carta.pais].resumo}</p><p class="cm-pergunta">Esse país <b>vende</b> ou <b>compra</b> ${produtoNome(carta.prod).toLowerCase()}?</p>`
    : '<p class="cm-pergunta">O país <b>vende</b> (exporta) ou <b>compra</b> (importa) esse produto?</p>';
  $('comercio-area').innerHTML = `
    <div class="cm-conteineres${carta ? ' escolhendo' : ''}">
      <button class="cm-conteiner exporta" type="button" data-tipo="exporta"><span>📤</span><b>EXPORTA</b><small>vende para fora</small></button>
      <button class="cm-conteiner importa" type="button" data-tipo="importa"><span>📥</span><b>IMPORTA</b><small>compra de fora</small></button>
    </div>
    <div class="cm-mao">${c.fila.map((x) => `
      <div class="historia-carta-caixa">
        <button class="cm-carta${c.sel === x.i ? ' selecionada' : ''}" type="button" data-carta="${x.i}" style="--c:${CATEGORIAS[PRODUTOS[x.prod].cat].cor}">
          <span class="cm-carta-pais">${bandeira(x.pais, PAIS[x.pais].nome, 'bandeira mini')} ${PAIS[x.pais].nome}</span>
          ${produtoIcone(x.prod)}<span class="cm-carta-nome">${produtoNome(x.prod)}</span>
        </button>
        <button class="historia-info" type="button" data-info="${x.i}" aria-label="Mais detalhes: ${produtoNome(x.prod)}">+ detalhes</button>
      </div>`).join('')}</div>`;
}

function desenharQuem() {
  const c = cm, r = rodada();
  desenharMapa($('comercio-mapa'), { paises: PAISES, destaques: [], rotas: c.rotas });
  $('comercio-enunciado').innerHTML = `<p class="cm-pergunta">🕵️ Que país sou eu?</p>
    <ol class="cm-pistas">${r.pistas.slice(0, c.pistas).map((p) => `<li>${p}</li>`).join('')}</ol>
    ${c.pistas < 3 ? '<button class="btn-sec btn-pequeno cm-mais-pista" id="btn-cm-pista" type="button">🔎 Mais uma pista</button>' : ''}`;
  $('comercio-area').innerHTML = opcoesPaises(r.opcoes, r.errados);
}

function desenharRota() {
  const c = cm, r = rodada();
  desenharMapa($('comercio-mapa'), { paises: PAISES, destaques: [r.comprador], rotas: c.rotas });
  $('comercio-enunciado').innerHTML = `<p class="cm-pedido">📥 ${paisCurto(r.comprador)} precisa comprar ${produtoIcone(r.prod)} <b>${produtoNome(r.prod)}</b>.</p>
    <p class="cm-pergunta">Quem vende esse produto? Escolha o porto de onde o navio vai sair:</p>`;
  $('comercio-area').innerHTML = opcoesPaises(r.opcoes, r.errados);
}
const opcoesPaises = (ids, errados = []) => `<div class="cm-opcoes">${ids.map((id) => `
  <button class="cm-opcao${errados.includes(id) ? ' errada' : ''}" type="button" data-pais="${id}"${errados.includes(id) ? ' disabled' : ''}>
    ${bandeira(id, PAIS[id].nome)}<span>${PAIS[id].nome}</span></button>`).join('')}</div>`;

function desenharPorque() {
  const c = cm, r = rodada();
  desenharMapa($('comercio-mapa'), { paises: PAISES, destaques: [], rotas: c.rotas });
  $('comercio-enunciado').innerHTML = `<p class="cm-pergunta">🤔 ${r.pergunta}</p>`;
  $('comercio-area').innerHTML = `<div class="cm-respostas">${r.ordem.map((o) => `
    <button class="cm-resposta${(r.errados || []).includes(o) ? ' errada' : ''}" type="button" data-op="${o}"${(r.errados || []).includes(o) ? ' disabled' : ''}>${r.opcoes[o]}</button>`).join('')}</div>`;
}

function desenharVaiEVolta() {
  const c = cm, r = rodada();
  desenharMapa($('comercio-mapa'), { paises: PAISES, destaques: [r.pais], rotas: c.rotas });
  $('comercio-enunciado').innerHTML = `<p class="cm-pais-linha">${paisCurto(r.pais)}</p>
    <p class="cm-pergunta">🔁 Toque nos produtos que esse país <b>compra</b> e também <b>vende</b>. Depois toque em Conferir.</p>`;
  $('comercio-area').innerHTML = `<div class="cm-produtos">${r.produtos.map((id) => `
    <button class="cm-produto${r.marcados.has(id) ? ' marcado' : ''}" type="button" data-prod="${id}" aria-pressed="${r.marcados.has(id)}">
      ${produtoIcone(id)}<span>${produtoNome(id)}</span><i aria-hidden="true">${r.marcados.has(id) ? '🔁' : ''}</i></button>`).join('')}</div>
    <button class="btn-grande cm-conferir" id="btn-cm-conferir" type="button">Conferir ✔</button>`;
}

// ---------- Respostas ----------
// acerto: pontos (com combo), resultado do relatório, carimbo e o cartão-postal
function acertou({ certa, carimbar: idCarimbo, postal }) {
  const c = cm;
  const dePrimeira = !c.tent;
  c.combo++;
  const mult = multiplicador(c.combo);
  const base = c.modo.id === 'quem' ? [150, 100, 75][c.pistas - 1] : COMERCIO.BASE + (c.usouDica ? 0 : COMERCIO.SEM_DICA);
  const ganho = base * mult;
  c.pontos += ganho;
  resultados.push({ m: tipoDoModo(c.modo), certa, erros: c.errosAgora || [] });
  let extra = `✅ <b>+${ganho} pontos</b>${mult > 1 ? ` (combo x${mult})` : ''}`;
  if (dePrimeira) {
    c.dePrimeira++;
    if (idCarimbo && carimbar(idCarimbo)) { c.carimbos++; extra += ` <span class="historia-doc-novo">🛂 Carimbo de ${PAIS[idCarimbo].nome} no Passaporte!</span>`; }
  }
  SOM.certo();
  c.feitas++;
  desenharComercio();
  abrirPostal({ ...postal, extra });
}
// erro: o combo zera; no 2º erro vem a dica; no 3º, o jogo mostra a resposta
function errou(descricao, dica, mostrarResposta) {
  const c = cm;
  c.tent++;
  c.combo = 0;
  (c.errosAgora = c.errosAgora || []).push(descricao);
  SOM.errado();
  if (navigator.vibrate) navigator.vibrate(200);
  if (c.tent >= COMERCIO.MAX_ERROS) { mostrarResposta(); return; }
  if (c.tent === 2) { c.usouDica = true; c.dicas++; }
  msgComercio(c.tent === 2 ? `💡 <b>Dica:</b> ${dica}` : 'Ainda não! Tente de novo.', 'erro');
  desenharComercio();
}
// 3º erro: a resposta aparece no cartão-postal e vale 0
function respostaDoJogo(certa, postal) {
  const c = cm;
  c.sozinhas++;
  resultados.push({ m: tipoDoModo(c.modo), certa, erros: [...(c.errosAgora || []), 'o jogo mostrou a resposta'] });
  c.feitas++;
  desenharComercio();
  abrirPostal({ ...postal, extra: '📌 Depois de 3 tentativas, o jogo mostrou a resposta. Leia e continue!' });
}
// a próxima carta ou rodada começa zerada (tentativas, dica, erros)
function zerarTentativas() { Object.assign(cm, { tent: 0, usouDica: false, errosAgora: [], pistas: 1 }); }

// Alfândega
function colocarNoConteiner(i, tipo) {
  const c = cm;
  if (!c || !c.rodando || c.lendo) return;
  const carta = c.fila.find((x) => x.i === i);
  if (!carta) return;
  const p = PAIS[carta.pais], prod = PRODUTOS[carta.prod];
  const verbo = carta.tipo === 'exporta' ? 'EXPORTA' : 'IMPORTA';
  const postal = { pais: carta.pais, titulo: `${carta.tipo === 'exporta' ? '📤' : '📥'} ${p.nome} ${verbo} ${prod.nome.toLowerCase()}`,
    texto: `${prod.fato} ${p.resumo}` };
  const tirar = () => { c.fila = c.fila.filter((x) => x.i !== i); c.sel = null; };
  if (c.sel !== i) zerarTentativas();
  c.sel = i;
  if (tipo === carta.tipo) {
    tirar();
    acertou({ certa: `${p.nome}: ${prod.nome} (${verbo.toLowerCase()})`, carimbar: carta.pais, postal });
    return;
  }
  errou(`colocou em ${tipo}`, `${p.resumo}`, () => { tirar(); respostaDoJogo(`${p.nome}: ${prod.nome} (${verbo.toLowerCase()})`, postal); });
  const el = $('comercio-area').querySelector(`[data-carta="${i}"]`);
  if (el) el.classList.add('balanca');
}

// Quem sou eu? e Rota comercial: escolher um país
function escolherPais(id) {
  const c = cm;
  if (!c || !c.rodando || c.lendo) return;
  const r = rodada();
  if (c.modo.id === 'quem') {
    const p = PAIS[r.pais];
    const postal = { pais: p.id, titulo: `${p.nome}`, texto: `${p.resumo} ${p.curiosidade}` };
    if (id === r.pais) { acertou({ certa: `${p.nome} (com ${c.pistas} ${c.pistas === 1 ? 'pista' : 'pistas'})`, carimbar: p.id, postal }); return; }
    r.errados = [...(r.errados || []), id];
    c.pistas = Math.min(3, c.pistas + 1);   // errou: abre mais uma pista
    errou(`escolheu ${PAIS[id].nome}`, `Esse país fica na região: ${p.continente}.`, () => respostaDoJogo(`${p.nome}`, postal));
    return;
  }
  // rota comercial: o navio sai do vendedor e vai até o comprador
  const v = PAIS[r.vendedor], comp = PAIS[r.comprador], prod = PRODUTOS[r.prod];
  const outros = PAISES.filter((x) => x.id !== comp.id && x.exporta.includes(r.prod)).map((x) => x.nome);
  const postal = { pais: v.id, titulo: `🚢 ${v.nome} → ${comp.nome}: ${prod.nome.toLowerCase()}`,
    texto: `${prod.fato} ${comp.nome}: ${comp.resumo}${outros.length > 1 ? ` Outros países que também vendem ${prod.nome.toLowerCase()}: ${juntar(outros.filter((n) => n !== v.nome))}.` : ''}` };
  const viajar = async (depois) => {
    c.lendo = true;   // durante a viagem nada mais é tocado
    c.rotas.push({ de: v.pos, para: comp.pos });
    await animarNavio($('comercio-mapa'), v.pos, comp.pos);
    if (!cm) return;
    c.lendo = false;
    depois();
  };
  if (id === r.vendedor) {
    msgComercio(`🚢 O navio saiu de ${v.nome}...`, 'ok');
    viajar(() => acertou({ certa: `${comp.nome} compra ${prod.nome.toLowerCase()} de ${v.nome}`, carimbar: v.id, postal }));
    return;
  }
  r.errados = [...(r.errados || []), id];
  errou(`escolheu ${PAIS[id].nome}`, CATEGORIAS[prod.cat].dica,
    () => viajar(() => respostaDoJogo(`${comp.nome} compra ${prod.nome.toLowerCase()} de ${v.nome}`, postal)));
}

// Por quê?: 3 opções; errar tira a opção. Com 2 erros só sobra a certa: o jogo mostra a resposta
function responderPorque(o) {
  const c = cm;
  if (!c || !c.rodando || c.lendo) return;
  const r = rodada();
  const postal = { titulo: '🤔 Por quê?', texto: r.explica };
  if (o === 0) { acertou({ certa: r.pergunta, postal }); return; }
  r.errados = [...(r.errados || []), o];
  if (r.errados.length >= 2) { c.tent = COMERCIO.MAX_ERROS - 1; }
  errou(`respondeu: ${r.opcoes[o]}`, 'leia de novo a pergunta e pense no que o país tem (ou não tem) no seu território.',
    () => respostaDoJogo(r.pergunta, postal));
}

// Vai e volta: marcar e conferir
function conferirVaiEVolta() {
  const c = cm;
  if (!c || !c.rodando || c.lendo) return;
  const r = rodada(), p = PAIS[r.pais];
  const certos = new Set(r.certos);
  const ok = r.marcados.size === certos.size && [...r.marcados].every((x) => certos.has(x));
  const lista = juntar(r.certos.map((x) => produtoNome(x).toLowerCase()));
  const postal = { pais: p.id, titulo: `🔁 ${p.nome} compra e vende ${lista}`,
    texto: `${MODO.vaievolta.regra} ${p.resumo}` };
  if (ok) { acertou({ certa: `${p.nome}: ${lista}`, carimbar: p.id, postal }); return; }
  const marcouErrado = [...r.marcados].filter((x) => !certos.has(x)).length, faltou = [...certos].filter((x) => !r.marcados.has(x)).length;
  errou(`marcou ${marcouErrado} a mais e esqueceu ${faltou}`, `são ${certos.size} produtos. Procure os que aparecem nas duas listas do país.`,
    () => respostaDoJogo(`${p.nome}: ${lista}`, postal));
}

// ---------- Cartão-postal (a partida espera o Continuar) ----------
// modo 'acerto': segue o jogo no Continuar; 'detalhes': o + detalhes de uma carta (só fecha)
function abrirPostal({ pais, titulo, texto, extra = '' }, modo = 'acerto') {
  const c = cm;
  c.lendo = true;
  c.modoPostal = modo;
  $('comercio-postal-selo').innerHTML = pais ? bandeira(pais, PAIS[pais].nome) : '<span class="cm-selo-icone">🌎</span>';
  $('comercio-postal-titulo').textContent = titulo;
  $('comercio-postal-texto').textContent = texto;
  $('comercio-postal-extra').innerHTML = extra;
  $('comercio-postal').hidden = false;
  $('btn-comercio-continuar').focus();
}
$('btn-comercio-continuar').onclick = () => {
  const c = cm;
  $('comercio-postal').hidden = true;
  SOM.clique();
  if (!c) return;
  c.lendo = false;
  if (c.modoPostal !== 'acerto') return;
  zerarTentativas();
  if (c.modo.id === 'alfandega') {
    if (!c.fila.length) { terminarComercio(); return; }
    msgComercio('Escolha a próxima carta. 👇');
    desenharComercio();
    return;
  }
  c.idx++;
  if (c.idx >= c.fila.length) { terminarComercio(); return; }
  msgComercio('');
  desenharComercio();
};

function terminarComercio() {
  const c = cm;
  if (!c) return;
  const comErro = resultados.filter((r) => r.erros.length).map((r) => r.certa);
  pararComercio();
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${c.pontos}. Modo ${c.modo.nome}.`,
    `Acertou ${c.dePrimeira} de ${c.total} de primeira.`,
    comErro.length ? `Teve dificuldade em: ${comErro.join('; ')}.` : 'Nenhum erro!',
    ...(c.dicas ? [`Precisou de dica ${c.dicas} ${c.dicas === 1 ? 'vez' : 'vezes'}.`] : []),
    ...(c.sozinhas ? [`Em ${c.sozinhas} ${c.sozinhas === 1 ? 'rodada' : 'rodadas'}, o jogo mostrou a resposta depois de 3 erros.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = c.dePrimeira === c.total ? 'Comandante de primeira! 🚢' : 'Viagem concluída! 🚢';
  $('fim-texto').textContent = `${aluno}, você acertou ${c.dePrimeira} de ${c.total} de primeira e fez ${c.pontos} pontos!`
    + (c.carimbos ? ` Ganhou ${c.carimbos} ${c.carimbos === 1 ? 'carimbo novo' : 'carimbos novos'} no Passaporte.` : '');
  // logo abaixo das estrelas: o próximo modo, jogar de novo ou voltar aos modos, sem rolar a tela
  // o próximo modo visível (pula os ocultos)
  const kProximo = MODOS_COMERCIO.findIndex((m, k) => k > c.k && !m.oculto);
  const proximo = kProximo >= 0 ? MODOS_COMERCIO[kProximo] : null;
  $('fim-acoes').innerHTML = `
    ${proximo ? `<button class="btn-grande" type="button" data-fim="proxima">▶ Próximo: ${proximo.icone} ${proximo.nome}</button>` : ''}
    <button class="${proximo ? 'btn-sec' : 'btn-grande'}" type="button" data-fim="repetir">🔁 Jogar de novo</button>
    <button class="btn-sec" type="button" data-fim="sair">☰ Escolher outro modo</button>`;
  $('fim-acoes').onclick = (e) => {
    const b = e.target.closest('[data-fim]');
    if (!b) return;
    SOM.clique();
    if (b.dataset.fim === 'proxima') comecarComercio(kProximo);
    else if (b.dataset.fim === 'repetir') comecarComercio(c.k);
    else telaComercioMenu();
  };
  $('fim-acoes').hidden = false;
  $('fim-acoes').querySelector('.btn-grande').focus({ preventScroll: true });
}
const repetirComercio = () => comecarComercio(ultimoModo);

// ---------- Toques ----------
let ignorarCliqueAte = 0;
$('comercio-area').onclick = (e) => {
  const c = cm;
  if (!c || performance.now() < ignorarCliqueAte) return;
  const info = e.target.closest('.historia-info');
  if (info) {
    if (c.lendo) return;
    const x = c.fila.find((y) => y.i === Number(info.dataset.info));
    SOM.clique();
    abrirPostal({ pais: x.pais, titulo: `${PRODUTOS[x.prod].icone} ${produtoNome(x.prod)} · ${PAIS[x.pais].nome}`,
      texto: `${PRODUTOS[x.prod].fato} ${PAIS[x.pais].resumo}`, extra: '🔎 Agora decida: esse país vende ou compra este produto?' }, 'detalhes');
    return;
  }
  const carta = e.target.closest('.cm-carta');
  if (carta) {
    if (c.lendo) return;
    const i = Number(carta.dataset.carta);
    if (c.sel !== i) zerarTentativas();
    c.sel = c.sel === i ? null : i;
    SOM.clique();
    desenharComercio();
    return;
  }
  const cont = e.target.closest('.cm-conteiner');
  if (cont) { if (c.sel == null) { msgComercio('Primeiro toque numa carta lá embaixo. 👇'); return; } colocarNoConteiner(c.sel, cont.dataset.tipo); return; }
  const op = e.target.closest('.cm-opcao');
  if (op && !op.disabled) { escolherPais(op.dataset.pais); return; }
  const resp = e.target.closest('.cm-resposta');
  if (resp && !resp.disabled) { responderPorque(Number(resp.dataset.op)); return; }
  const prod = e.target.closest('.cm-produto');
  if (prod && !c.lendo) {
    const r = rodada();
    if (r.marcados.has(prod.dataset.prod)) r.marcados.delete(prod.dataset.prod); else r.marcados.add(prod.dataset.prod);
    SOM.clique();
    desenharComercio();
    return;
  }
  if (e.target.closest('#btn-cm-conferir')) conferirVaiEVolta();
};
$('comercio-enunciado').onclick = (e) => {
  const c = cm;
  if (!c || c.lendo || !e.target.closest('#btn-cm-pista')) return;
  c.pistas = Math.min(3, c.pistas + 1);
  tocar([[523, 0.08], [659, 0.1]]);
  desenharComercio();
};

// Alfândega: arrastar a carta até o contêiner (a carta segue o dedo um pouco acima dele)
let arrasto = null;
$('comercio-area').addEventListener('pointerdown', (e) => {
  const carta = e.target.closest('.cm-carta');
  if (!carta || !cm || !cm.rodando || cm.lendo || e.button > 0) return;
  arrasto = { i: Number(carta.dataset.carta), x: e.clientX, y: e.clientY, carta, fantasma: null, mira: null };
});
window.addEventListener('pointermove', (e) => {
  if (!arrasto) return;
  if (!arrasto.fantasma) {
    if (Math.hypot(e.clientX - arrasto.x, e.clientY - arrasto.y) < 10) return;
    if (cm.sel !== arrasto.i) zerarTentativas();
    cm.sel = arrasto.i;
    const f = arrasto.carta.cloneNode(true);
    f.classList.add('historia-fantasma');
    f.style.width = `${arrasto.carta.offsetWidth}px`;
    document.body.append(f);
    arrasto.fantasma = f;
    arrasto.carta.classList.add('arrastando');
    document.querySelector('.cm-conteineres')?.classList.add('escolhendo');
  }
  e.preventDefault();
  const f = arrasto.fantasma;
  f.style.left = `${e.clientX - f.offsetWidth / 2}px`;
  f.style.top = `${e.clientY - f.offsetHeight - 40}px`;
  const sob = document.elementFromPoint(e.clientX, e.clientY);
  const mira = sob && sob.closest('.cm-conteiner');
  if (mira !== arrasto.mira) { arrasto.mira?.classList.remove('mira'); mira?.classList.add('mira'); arrasto.mira = mira; }
}, { passive: false });
window.addEventListener('pointerup', (e) => {
  if (!arrasto) return;
  const { i, fantasma } = arrasto;
  let tipo = null;
  if (fantasma) { const sob = document.elementFromPoint(e.clientX, e.clientY); tipo = sob && sob.closest('.cm-conteiner')?.dataset.tipo; }
  soltarArrasto();
  if (!fantasma) return;   // foi só um toque: o click escolhe a carta
  ignorarCliqueAte = performance.now() + 400;
  if (tipo) colocarNoConteiner(i, tipo); else desenharComercio();
});
window.addEventListener('pointercancel', soltarArrasto);
function soltarArrasto() {
  if (!arrasto) return;
  arrasto.fantasma?.remove();
  arrasto.mira?.classList.remove('mira');
  arrasto.carta.classList.remove('arrastando');
  arrasto = null;
}

// ---------- Passaporte ----------
function telaPassaporte() {
  const carimbos = lerPassaporte();
  $('comercio-passaporte-total').textContent = `${carimbos.length} de ${PAISES.length} carimbos`;
  const lista = (ids) => ids.map((id) => `<span class="cm-chip">${PRODUTOS[id].icone} ${produtoNome(id)}</span>`).join('');
  $('comercio-passaporte-lista').innerHTML = PAISES.map((p) => (carimbos.includes(p.id) ? `
    <article class="cm-pagina">
      <header>${bandeira(p.id, p.nome)}<div><b>${p.nome}</b><small>${p.continente}</small></div><span class="cm-carimbo" aria-hidden="true">✔ VISTO</span></header>
      <p>${p.resumo}</p>
      <h4>📤 Exporta</h4><div class="cm-chips">${lista(p.exporta)}</div>
      <h4>📥 Importa</h4><div class="cm-chips">${lista(p.importa)}</div>
      ${p.exp ? `<p class="cm-valores">Em 2024 (aproximado): vendeu <b>${p.exp}</b> e comprou <b>${p.imp}</b>.</p>` : ''}
      <p class="cm-curiosidade">💡 ${p.curiosidade}</p>
    </article>` : `
    <article class="cm-pagina trancada">
      <header>${bandeira(p.id, p.nome)}<div><b>${p.nome}</b><small>${p.continente}</small></div></header>
      <p>🔒 Acerte de primeira uma rodada com este país para ganhar o carimbo.</p>
    </article>`)).join('');
  mostrar('tela-comercio-passaporte');
}

$('btn-comercio').onclick = () => { SOM.clique(); escolherProfessorE('Conexão Global', telaComercioMenu); };
$('comercio-voltar').onclick = telaJogos;
$('btn-comercio-passaporte').onclick = () => { SOM.clique(); telaPassaporte(); };
$('comercio-passaporte-voltar').onclick = () => { SOM.clique(); telaComercioMenu(); };
$('comercio-sair').onclick = telaComercioMenu;

export { comecarComercio, COMERCIO, pararComercio, repetirComercio, telaComercioMenu };
