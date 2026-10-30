/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Classes de Palavras. */

import { $, embaralhar } from './util.js?v=146';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=146';
import { SOM, tocar } from './som.js?v=146';
import { mascote, mostrar, telaJogos } from './telas.js?v=146';
import { escolherProfessorE } from './professor.js?v=146';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=146';
import { FRASES_CLASSES } from './dados-classes.js?v=146';

// ---------- Classes de Palavras ----------
// Morfologia, como o Jogo de Ortografia, mas para as classes de palavras. Aparece uma frase; o aluno toca numa palavra
// e depois na classe dela. Acertou: a palavra fica verde com o nome da classe. Errou: o jogo explica por que aquela classe
// não serve; no segundo erro mostra a classe certa. Começa fácil (frases curtas como "O carro é verde.", só artigo,
// substantivo, verbo e adjetivo) e vai aumentando: duas frases seguidas sem erro sobem uma etapa (médio: pronome, numeral
// e advérbio; difícil: preposição, conjunção e interjeição); uma frase com 3 erros ou mais desce uma. As palavras de
// classes que ainda não entraram aparecem já classificadas (em cinza), para o aluno ir conhecendo.
const CL = { FRASES: 12, SOBE: 2, DESCE: 3, PAUSA: 3200 };   // PAUSA: tempo para ler a explicação antes da próxima frase
const CLASSES = {
  ar: { nome: 'artigo', icone: '🔤', cor: '#1fa2b0', regra: 'Artigo vem antes do substantivo para defini-lo ou indefini-lo (o, a, os, as, um, uma).',
    porQueNao: 'Artigo vem logo antes de um substantivo, para defini-lo (o, a, os, as) ou indefini-lo (um, uma).' },
  su: { nome: 'substantivo', icone: '🏷️', cor: '#1e64d2', regra: 'Substantivo nomeia os seres, objetos, lugares, sentimentos e ideias (casa, Maria, alegria, cão).',
    porQueNao: 'Substantivo dá nome a alguma coisa: dá para colocar “o” ou “a” antes (o carro, a alegria).' },
  aj: { nome: 'adjetivo', icone: '🎨', cor: '#e53935', regra: 'Adjetivo caracteriza ou qualifica o substantivo (bonito, inteligente, azul).',
    porQueNao: 'Adjetivo dá uma característica a um substantivo (carro verde, menina feliz).' },
  pn: { nome: 'pronome', icone: '👤', cor: '#8e44ad', regra: 'Pronome substitui ou acompanha o substantivo, indicando as pessoas do discurso (eu, tu, ele, meu, este).',
    porQueNao: 'Pronome fica no lugar de um nome ou o acompanha indicando a pessoa (eu, ela, meu, este, ninguém).' },
  nu: { nome: 'numeral', icone: '🔢', cor: '#f57c00', regra: 'Numeral indica quantidade ou posição numa sequência (dois, primeiro, dobro).',
    porQueNao: 'Numeral indica quantidade ou posição: dois, três, primeiro, segundo, dobro.' },
  ve: { nome: 'verbo', icone: '🏃', cor: '#2e9e5b', regra: 'Verbo exprime ação, estado ou fenômeno da natureza (correr, estar, chover).',
    porQueNao: 'Verbo mostra ação, estado ou fenômeno: dá para dizer “eu ___” ou “ele ___” (corre, está, choveu).' },
  av: { nome: 'advérbio', icone: '⏱️', cor: '#c2185b', regra: 'Advérbio modifica o verbo, o adjetivo ou outro advérbio, indicando tempo, lugar, modo, intensidade ou negação (bem, hoje, aqui, muito, não).',
    porQueNao: 'Advérbio responde quando, onde, como ou quanto sobre o verbo ou o adjetivo (hoje, aqui, bem, muito, não).' },
  pr: { nome: 'preposição', icone: '🔗', cor: '#5d4037', regra: 'Preposição liga dois termos, subordinando um ao outro (a, de, em, para, por, com, sem, sobre, até).',
    porQueNao: 'Preposição liga duas palavras, uma dependendo da outra (bolo de chocolate, livro sobre a mesa).' },
  cj: { nome: 'conjunção', icone: '➕', cor: '#00897b', regra: 'Conjunção liga orações ou palavras de mesmo valor (e, mas, ou, porque, porém, se, quando, embora).',
    porQueNao: 'Conjunção liga duas orações ou duas palavras do mesmo tipo (Pedro e Ana; jogou, mas perdeu).' },
  ij: { nome: 'interjeição', icone: '😮', cor: '#ff8f00', regra: 'Interjeição exprime emoções ou reações súbitas (Ah!, Oba!, Uau!, Ai!).',
    porQueNao: 'Interjeição mostra uma emoção de repente, quase sempre sozinha e com exclamação (Oba!, Ai!, Uau!).' },
};
const ORDEM = ['ar', 'su', 'aj', 'pn', 'nu', 've', 'av', 'pr', 'cj', 'ij'];
// cada classe vira uma "regra" do relatório (grupos de erros e acertos por classe)
for (const [id, c] of Object.entries(CLASSES)) Object.assign(c, { id: `cl-${id}`, titulo: c.nome[0].toUpperCase() + c.nome.slice(1) });
// dicas para as trocas mais comuns (classe certa > classe marcada), mostradas quando a resposta é revelada
const CONFUSOES = {
  'ar>nu': 'Aqui “um/uma” só acompanha o substantivo; não está contando nada.',
  'nu>ar': 'Aqui a palavra indica quantidade ou ordem: por isso é numeral.',
  'pr>ar': 'Aqui “a” não acompanha um substantivo para defini-lo: ela liga duas palavras.',
  'ar>pr': 'Aqui a palavra vem logo antes de um substantivo e o define.',
  'av>aj': 'A palavra está ligada ao verbo (como? quanto? quando?), não a um substantivo.',
  'aj>av': 'A palavra dá característica a um substantivo.',
  've>su': 'Teste: “eu ___” ou “ele ___”. Se encaixa, é verbo.',
  'su>ve': 'Teste: dá para colocar “o” ou “a” antes? Então é substantivo.',
  'pn>ar': 'A palavra indica a pessoa (de quem é, qual é): é pronome.',
  'pn>su': 'A palavra está no lugar de um nome: é pronome.',
  'su>pn': 'A palavra é o próprio nome, não está no lugar dele.',
  'cj>pr': 'A palavra liga duas orações ou duas palavras do mesmo tipo.',
  'pr>cj': 'A palavra liga dois termos, um dependendo do outro.',
  'av>pn': 'A palavra fala do verbo (quanto, como, quando), não de uma pessoa.',
};
const ETAPAS = [
  { nome: 'Fácil', fonte: 'facil', classes: ['ar', 'su', 'aj', 've'] },
  { nome: 'Médio', fonte: 'medio', classes: ['ar', 'su', 'aj', 'pn', 'nu', 've', 'av'] },
  { nome: 'Difícil', fonte: 'dificil', classes: ORDEM },
];
let cl = null;   // a partida em andamento

// 'O/ar carro/su é/ve verde/aj .' -> [{ p: 'O', c: 'ar' }, ..., { p: '.', c: null }]
const lerFrase = (txt) => txt.split(' ').map((t) => { const i = t.lastIndexOf('/'); return i > 0 ? { p: t.slice(0, i), c: t.slice(i + 1) } : { p: t, c: null }; });
const textoDaFrase = (toks) => toks.map((t, i) => (i && t.c !== null ? ' ' : i && /^[¿¡(]/.test(t.p) ? ' ' : '') + t.p).join('');
const nomeDa = (c) => (c === 'pa' ? 'preposição + artigo' : CLASSES[c].nome);

// ----- o tipo de cada palavra e a explicação ligada à frase (para o feedback e a etiqueta) -----
const TIPOS_PALAVRA = {
  av: { 'de tempo': ['hoje', 'ontem', 'amanhã', 'cedo', 'tarde', 'sempre', 'nunca', 'ainda', 'logo', 'depois', 'antes', 'já'],
    'de lugar': ['aqui', 'ali', 'lá', 'longe', 'perto', 'atrás', 'dentro'],
    'de modo': ['bem', 'mal', 'devagar', 'depressa', 'rapidamente', 'alto', 'baixo'],
    'de intensidade': ['muito', 'mais', 'bastante', 'quase', 'pouco', 'tão', 'menos'],
    'de negação': ['não'], 'de afirmação': ['sim', 'também'] },
  pn: { 'pessoal': ['eu', 'tu', 'ele', 'ela', 'nós', 'eles', 'elas', 'mim', 'comigo'], 'de tratamento': ['você', 'vocês'],
    'possessivo': ['meu', 'minha', 'meus', 'minhas', 'seu', 'sua', 'nosso', 'nossa'],
    'demonstrativo': ['este', 'esta', 'esse', 'essa', 'isso', 'isto', 'aquele', 'aquela', 'aquilo'],
    'indefinido': ['ninguém', 'alguém', 'tudo', 'todos', 'nada'] },
  nu: { 'cardinal': ['um', 'dois', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'cem'],
    'ordinal': ['primeiro', 'primeira', 'segundo', 'segunda', 'terceiro', 'terceira', 'quarto', 'quinto'],
    'multiplicativo': ['dobro', 'triplo'], 'fracionário': ['metade', 'terço'] },
  ar: { 'definido': ['o', 'a', 'os', 'as'], 'indefinido': ['um', 'uma', 'uns', 'umas'] },
  cj: { 'aditiva': ['e', 'nem'], 'adversativa': ['mas', 'porém', 'contudo'], 'alternativa': ['ou'], 'explicativa': ['porque', 'pois'],
    'condicional': ['se'], 'temporal': ['quando'], 'concessiva': ['embora'] },
  ij: { 'de alegria': ['oba', 'eba', 'viva'], 'de dor': ['ai'], 'de espanto e admiração': ['uau', 'nossa'], 'de alívio': ['ufa'],
    'de pedido de silêncio': ['psiu'], 'de saudação e chamamento': ['oi', 'olá', 'ei'], 'de surpresa': ['opa', 'puxa'] },
  ve: { 'de sentimento e vontade': ['gosto', 'gosta', 'quero', 'quer', 'querem'], 'de posse': ['tenho', 'tem', 'têm'], 'de estado': ['é', 'és', 'são', 'está', 'estava', 'estivesse', 'ficou', 'ficaremos', 'foi'], 'de fenômeno da natureza': ['choveu', 'chover', 'chove'] },
};
const NOMES_PROPRIOS = ['Pedro', 'Ana', 'Lucas', 'Joana', 'Maria', 'Mariana', 'Carlos'];
const tipoDe = (classe, p) => {
  const lista = TIPOS_PALAVRA[classe];
  if (lista) for (const [tipo, palavras] of Object.entries(lista)) if (palavras.includes(p.toLowerCase())) return tipo;
  if (classe === 've') return 'de ação';
  if (classe === 'su') return NOMES_PROPRIOS.includes(p) ? 'próprio' : 'comum';
  return '';
};
// a palavra de uma classe mais perto da posição i (para dizer a quem a palavra se liga)
const vizinha = (toks, i, classes, lado = 0) => {
  for (let d = 1; d < toks.length; d++) {
    for (const j of lado < 0 ? [i - d] : lado > 0 ? [i + d] : [i + d, i - d]) if (toks[j] && classes.includes(toks[j].c)) return toks[j].p;
  }
  return null;
};
const aspas = (p) => `“${p}”`;
// o tipo e uma explicação completa da palavra nesta frase
function analisar(toks, i) {
  const { p, c } = toks[i];
  const tipo = tipoDe(c, p);
  const prox = toks[i + 1] && toks[i + 1].c ? toks[i + 1] : null;
  const sub = vizinha(toks, i, ['su'], 1) || vizinha(toks, i, ['su']);
  const verbo = vizinha(toks, i, ['ve']);
  let explica = '';
  if (c === 'ar') explica = `acompanha ${aspas(sub)}${tipo === 'definido' ? ' e mostra que é um ser ou objeto certo, já conhecido (definido)' : ' sem dizer qual é (indefinido)'}.`;
  else if (c === 'su') explica = tipo === 'próprio' ? 'é o nome de uma pessoa, escrito com letra maiúscula.' : 'dá nome a um ser, objeto, lugar ou sentimento de forma geral.';
  else if (c === 'aj') explica = `diz como é ${aspas(vizinha(toks, i, ['su'], -1) || sub || vizinha(toks, i, ['pn'], -1))}: dá uma característica a ele.`;
  else if (c === 'pn') {
    explica = tipo === 'possessivo' ? `mostra de quem é ${aspas(prox && prox.c === 'su' ? prox.p : sub)}.`
      : tipo === 'demonstrativo' ? (prox && prox.c === 'su' ? `aponta qual é ${aspas(prox.p)}.` : 'aponta algo da conversa (isso, este, aquele).')
        : tipo === 'pessoal' ? 'está no lugar do nome de uma pessoa (indica quem fala, com quem se fala ou de quem se fala).'
          : tipo === 'de tratamento' ? 'é a forma de tratar a pessoa com quem falamos.'
            : 'fala de alguém ou de algo de um jeito vago, sem dizer quem é.';
  } else if (c === 'nu') {
    explica = tipo === 'ordinal' ? 'indica a posição numa sequência (ordem).' : tipo === 'multiplicativo' ? 'indica multiplicação (duas vezes mais).'
      : tipo === 'fracionário' ? 'indica uma parte de um todo (fração).' : `indica a quantidade${prox && prox.c === 'su' ? ` de ${aspas(prox.p)}` : ''}.`;
  } else if (c === 've') {
    const quem = vizinha(toks, i, ['su', 'pn'], -1), carac = toks.slice(i + 1, i + 4).find((x) => x.c === 'aj');
    explica = tipo === 'de estado' ? (quem && carac ? `liga ${aspas(quem)} à característica ${aspas(carac.p)}: mostra como ele é ou está (verbo de ligação).` : 'mostra como alguém ou algo é ou está (estado), e não uma ação.')
      : tipo === 'de sentimento e vontade' ? 'mostra um sentimento ou uma vontade.' : tipo === 'de posse' ? 'mostra que alguém tem ou possui algo.'
      : tipo === 'de fenômeno da natureza' ? 'mostra um fenômeno da natureza.' : 'mostra uma ação, o que alguém faz ou o que acontece.';
  } else if (c === 'av') {
    const alvo = tipo === 'de intensidade' && prox && ['aj', 'av'].includes(prox.c) ? prox.p : verbo;
    const ideia = { 'de tempo': ['o tempo', 'quando'], 'de lugar': ['o lugar', 'onde'], 'de modo': ['o modo, o jeito', 'como'] }[tipo];
    explica = tipo === 'de negação' ? `nega o verbo ${aspas(verbo)}: diz que a ação não acontece.`
      : tipo === 'de intensidade' ? `mostra a intensidade de ${aspas(alvo)}: responde “quanto?”.`
        : tipo === 'de afirmação' ? 'confirma o que se diz.'
          : alvo ? `indica ${ideia[0]}: responde à pergunta “${alvo.toLowerCase()} ${ideia[1]}?”.` : `indica ${ideia[0]} (${ideia[1]}?).`;   // sem verbo: Tudo bem?
  } else if (c === 'pr') {
    const antes = vizinha(toks, i, ['su', 've', 'aj', 'pn', 'av'], -1), depois = vizinha(toks, i, ['su', 've', 'pn', 'nu'], 1);
    explica = `liga ${aspas(antes)} a ${aspas(depois)}, deixando uma palavra dependente da outra.`;
  } else if (c === 'cj') {
    const ideia = { aditiva: 'soma', adversativa: 'oposição (o contrário do esperado)', alternativa: 'escolha', explicativa: 'causa ou explicação',
      condicional: 'condição', temporal: 'tempo', concessiva: 'concessão (apesar de)' }[tipo] || 'ligação';
    explica = `liga duas partes da frase com ideia de ${ideia}.`;
  } else if (c === 'ij') {
    const emocao = { 'de alegria': 'alegria', 'de dor': 'dor', 'de espanto e admiração': 'espanto ou admiração', 'de alívio': 'alívio',
      'de pedido de silêncio': 'um pedido de silêncio', 'de saudação e chamamento': 'um cumprimento ou um chamado', 'de surpresa': 'surpresa' }[tipo] || 'uma emoção';
    explica = `expressa ${emocao} de repente; vem sozinha, com ponto de exclamação, e não depende das outras palavras.`;
  }
  const nome = `${CLASSES[c].nome}${tipo ? ` ${tipo}` : ''}`;
  return { tipo, nome, explica: `${aspas(p)} é <b>${nome}</b>: ${explica}` };
}
// dica para o primeiro erro: aponta o caminho sem dizer a classe
function dicaSemResposta(toks, i) {
  const { c } = toks[i];
  const sub = vizinha(toks, i, ['su'], 1) || vizinha(toks, i, ['su']), verbo = vizinha(toks, i, ['ve']);
  return {
    ar: `Repare: ela vem logo antes de ${aspas(sub)}.`, su: 'Repare: é o nome de alguém ou de alguma coisa.',
    aj: `Repare: ela conta como é ${aspas(vizinha(toks, i, ['su'], -1) || sub || vizinha(toks, i, ['pn'], -1))}.`, pn: 'Repare: ela está no lugar de um nome ou mostra de quem ou qual é.',
    nu: 'Repare: ela fala de quantidade ou de ordem.', ve: 'Repare: experimente dizer “eu ___” ou “ele ___”, ou veja se ela mostra o que acontece.',
    av: `Repare: ela diz quando, onde, como ou quanto${verbo ? ` sobre ${aspas(verbo)}` : ''}.`, pr: 'Repare: ela liga duas palavras, uma dependendo da outra.',
    cj: 'Repare: ela junta duas partes da frase.', ij: 'Repare: ela mostra uma emoção, sozinha, com exclamação.',
  }[c];
}

function telaClassesMenu() {
  pararClasses();
  mascote('davi-classes', 'oi');
  mostrar('tela-classes-menu');
}

function comecarClasses() {
  pararClasses();
  definirMissao({ id: 'classes', classes: true, icone: '📖', cor: '#1e64d2', titulo: 'Classes de Palavras' });
  definirResultados([]);
  cl = { etapa: 0, etapaMax: 0, feitas: 0, semErroSeguidas: 0, pontos: 0, usadas: new Set(), frase: null, timers: [], rodando: true };
  mostrar('tela-classes');
  proximaFrase();
}

function pararClasses() {
  if (cl) { cl.rodando = false; cl.timers.forEach(clearTimeout); }
  cl = null;
}
const depoisCl = (ms, fn) => { const c = cl; const t = setTimeout(() => { if (cl === c && c.rodando) fn(); }, ms); c.timers.push(t); };
const msgCl = (texto, tipo = '') => { $('classes-msg').innerHTML = texto; $('classes-msg').className = `cores-msg classes-msg ${tipo}`; };

function proximaFrase() {
  if (cl.feitas >= CL.FRASES) { terminarClasses(); return; }
  const et = ETAPAS[cl.etapa];
  // frase da etapa que ainda não saiu nesta partida
  let lista = FRASES_CLASSES[et.fonte].filter((f) => !cl.usadas.has(f));
  if (!lista.length) lista = FRASES_CLASSES[et.fonte];
  const txt = embaralhar(lista)[0];
  cl.usadas.add(txt);
  const toks = lerFrase(txt);
  cl.feitas++;
  cl.frase = { txt, toks, texto: textoDaFrase(toks), erros: 0, etapa: cl.etapa,
    pendentes: new Set(toks.map((t, i) => (t.c && t.c !== 'pa' && et.classes.includes(t.c) ? i : -1)).filter((i) => i >= 0)),
    tentativas: {}, escolhida: null };
  hudClasses();
  // a frase: palavras para classificar (sublinhadas) e as que já vêm prontas (em cinza, com a classe)
  const caixa = $('classes-frase');
  caixa.className = 'classes-frase chega';
  caixa.innerHTML = '';
  toks.forEach((t, i) => {
    if (!t.c) { const s = document.createElement('span'); s.className = 'classes-pont'; s.textContent = t.p; caixa.append(s); return; }
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.i = i;
    b.style.setProperty('--i', i);
    const pergunta = cl.frase.pendentes.has(i);
    b.className = `classes-palavra ${pergunta ? 'alvo' : 'pronta'}`;
    b.innerHTML = `<span class="classes-texto">${t.p}</span><small class="classes-tag">${pergunta ? '?' : nomeDa(t.c)}</small>`;
    if (!pergunta) { b.disabled = true; b.setAttribute('aria-label', `${t.p}: ${nomeDa(t.c)}`); }
    else b.onclick = () => escolherPalavra(i);
    caixa.append(b);
  });
  // os botões das classes da etapa
  $('classes-botoes').innerHTML = et.classes.map((c) =>
    `<button class="classes-botao" type="button" data-c="${c}" style="--cor:${CLASSES[c].cor}"><span>${CLASSES[c].icone}</span>${CLASSES[c].titulo}</button>`).join('');
  const novas = cl.feitas > 1 && et.classes.filter((c) => !ETAPAS[Math.max(0, cl.etapa - 1)].classes.includes(c));
  msgCl(cl.feitas === 1 ? 'Toque numa palavra sublinhada e depois na classe dela.'
    : cl.mudouEtapa ? `⬆️ Etapa ${et.nome}! Agora também: ${(novas || []).map((c) => CLASSES[c].nome).join(', ')}.` : '', cl.mudouEtapa ? 'ok' : '');
  cl.mudouEtapa = false;
  escolherPalavra(Math.min(...cl.frase.pendentes));   // já deixa a primeira palavra escolhida
}

function hudClasses() {
  $('classes-nivel').textContent = `📖 ${ETAPAS[cl.etapa].nome}`;
  $('classes-pontos').textContent = cl.pontos;
  $('classes-contador').textContent = `${cl.feitas}/${CL.FRASES}`;
}

function escolherPalavra(i) {
  const f = cl && cl.frase;
  if (!f || !f.pendentes.has(i)) return;
  f.escolhida = i;
  document.querySelectorAll('#classes-frase .classes-palavra').forEach((b) => b.classList.toggle('escolhida', Number(b.dataset.i) === i));
}

function responderClasse(c) {
  const f = cl && cl.frase;
  if (!f || f.terminou || !cl.rodando) return;
  if (f.escolhida == null) { msgCl('Primeiro toque numa palavra sublinhada.'); return; }
  const i = f.escolhida, tok = f.toks[i], certa = tok.c;
  const b = document.querySelector(`#classes-frase .classes-palavra[data-i="${i}"]`);
  const marcadas = (f.tentativas[i] = f.tentativas[i] || []);
  const an = analisar(f.toks, i);
  const resolver = (classe) => {
    f.pendentes.delete(i);
    b.classList.remove('escolhida', 'alvo');
    b.classList.add(classe);
    b.disabled = true;
    b.querySelector('.classes-tag').textContent = an.nome;   // ex.: advérbio de tempo
    b.style.setProperty('--cor', CLASSES[certa].cor);
    resultados.push({ m: CLASSES[certa], certa: `“${tok.p}” (${an.nome}) em: ${f.texto}`, erros: marcadas.map((x) => `marcou ${CLASSES[x].nome}`), nivel: f.etapa + 1 });
    f.escolhida = null;
    if (f.pendentes.size) {
      // passa para a próxima palavra à direita (ou volta para a primeira que faltou)
      const depois = [...f.pendentes].filter((j) => j > i);
      escolherPalavra(Math.min(...(depois.length ? depois : f.pendentes)));
    } else fimDaFrase();
  };
  if (c === certa) {
    cl.pontos += marcadas.length ? 4 : 10;
    tocar([[660, 0.06], [880, 0.08]]);
    msgCl(`✅ ${an.explica}`, 'ok');
    resolver('certa');
  } else {
    marcadas.push(c);
    f.erros++;
    b.classList.remove('treme'); void b.offsetWidth; b.classList.add('treme');
    SOM.errado();
    if (marcadas.length === 1) {
      msgCl(`❌ “${tok.p}” não é ${CLASSES[c].nome}. ${CLASSES[c].porQueNao}<br>💡 ${dicaSemResposta(f.toks, i)} Tente outra classe!`, 'erro');
    } else {
      const dica = CONFUSOES[`${certa}>${c}`] || CONFUSOES[`${certa}>${marcadas[0]}`] || '';
      msgCl(`📘 ${an.explica}<br>${CLASSES[certa].regra}${dica ? ` 💡 ${dica}` : ''}`, 'erro');
      resolver('revelada');
    }
  }
  hudClasses();
}

function fimDaFrase() {
  const f = cl.frase;
  f.terminou = true;
  $('classes-frase').classList.add(f.erros ? 'feita' : 'perfeita');
  if (!f.erros) {
    cl.semErroSeguidas++;
    cl.pontos += 10;
    SOM.certo();
    if (cl.semErroSeguidas >= CL.SOBE && cl.etapa < ETAPAS.length - 1) { cl.etapa++; cl.semErroSeguidas = 0; cl.mudouEtapa = true; }
    $('classes-msg').insertAdjacentHTML('beforeend', '<br>🌟 Frase perfeita!');   // mantém a explicação da última palavra
  } else {
    cl.semErroSeguidas = 0;
    if (f.erros >= CL.DESCE && cl.etapa > 0) cl.etapa--;
  }
  cl.etapaMax = Math.max(cl.etapaMax, cl.etapa);
  hudClasses();
  depoisCl(CL.PAUSA + (f.erros ? 1600 : 0), proximaFrase);
}

function terminarClasses() {
  const { feitas, pontos, etapaMax } = cl;
  pararClasses();
  // as classes que mais deram trabalho
  const porClasse = {};
  for (const r of resultados) { const x = (porClasse[r.m.nome] = porClasse[r.m.nome] || { total: 0, erros: 0 }); x.total++; if (r.erros.length) x.erros++; }
  const dificeis = Object.entries(porClasse).filter(([, x]) => x.erros).sort((a, b) => b[1].erros - a[1].erros).slice(0, 3);
  missao.resumo = [
    `Classificou palavras em ${feitas} frases e chegou à etapa ${ETAPAS[etapaMax].nome} (${ETAPAS[etapaMax].classes.length} classes).`,
    dificeis.length ? `Classes que mais deram trabalho: ${dificeis.map(([n, x]) => `${n} (${x.erros} de ${x.total})`).join(', ')}.` : 'Acertou todas as palavras de primeira!',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Craque das classes! 📖' : 'Fim das frases!';
}

$('classes-botoes').onclick = (e) => { const b = e.target.closest('.classes-botao'); if (b) responderClasse(b.dataset.c); };
$('btn-classes').onclick = () => { SOM.clique(); escolherProfessorE('Classes de Palavras', telaClassesMenu); };
$('classes-voltar').onclick = telaJogos;
$('btn-classes-comecar').onclick = () => { SOM.clique(); comecarClasses(); };
$('classes-sair').onclick = telaClassesMenu;

export { comecarClasses, pararClasses, telaClassesMenu };
