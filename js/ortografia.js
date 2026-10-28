/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Jogo de Ortografia: níveis, missões e perguntas. */

import { $, embaralhar, sortear } from './util.js?v=119';
import { aluno, definirMissao, definirResultados, estrelasTexto, lerEstrelas, missao, resultados } from './estado.js?v=119';
import { falar, frase, SOM } from './som.js?v=119';
import { mascote, mostrar, telaJogos } from './telas.js?v=119';
import { escolherProfessorE } from './professor.js?v=119';
import { fimDaMissao } from './relatorio.js?v=119';

// missão especial com as palavras de todas as missões, misturadas
// ---------- Níveis do Jogo de Ortografia ----------
// O aluno escolhe só o nível; cada rodada mistura palavras de várias regras.
// Fácil: as palavras com figura das missões. Médio e Difícil: as palavras da Chuva de Erros
// (o jeito certo e o errado), em perguntas de escolher a certa e de achar o "monstro" escrito errado.
const PERGUNTAS_POR_RODADA = 20;
// as categorias da Chuva viram regras do Jogo de Ortografia (o mesmo id agrupa os dois tipos no relatório)
const regraDaChuva = (c, tipo) => ({ ...c, id: 'c-' + c.id, tipo });
const paresDaChuva = (filtro) => CHUVA_CATEGORIAS.flatMap((c) => c.pares.filter(([certa]) => filtro(c, certa)).map(([certa, errada]) => ({ c, certa, errada })));
const ehDificil = (c, certa) => c.id === 'escola' || c.id === 'dificeis' || certa.length >= 10;

// uma pergunta a partir de um par da Chuva: escolher a certa (2 opções) ou achar o monstro entre 3 palavras
function perguntaDoPar(par, todos, detetive) {
  if (!detetive) return { m: regraDaChuva(par.c, 'escolher'), p: { opcoes: [par.certa, par.errada], resp: par.certa, fig: '✍️' } };   // sem figura própria: ícone neutro
  // duas outras palavras certas, sem repetir (algumas aparecem em mais de uma regra, como "também")
  const outras = embaralhar([...new Set(todos.map((x) => x.certa))].filter((w) => w !== par.certa)).slice(0, 2);
  return { m: regraDaChuva(par.c, 'detetive'),
    p: { palavras: [par.errada, ...outras], errada: par.errada, certa: par.certa, dica: par.c.regra } };
}

const NIVEIS_ORTO = [
  { id: 'orto-facil', titulo: 'Fácil', icone: '🌱', cor: '#2e9e5b', mistura: true,
    descricao: 'Palavras curtas com figura',
    regra: 'Palavras curtas, com figura: <b>S ou SS, Ç ou C, R ou RR, M ou N, G ou J, X ou CH</b>, acentos e o <b>Detetive de Erros</b>. Olhe a figura, ouça a palavra e escolha!',
    fila: () => MISSOES.flatMap((m) => m.perguntas.map((p) => ({ m, p }))) },
  { id: 'orto-medio', titulo: 'Médio', icone: '🌿', cor: '#e0a100', mistura: true,
    descricao: 'Palavras do dia a dia',
    regra: 'Palavras do dia a dia que muita gente erra: <b>S, SS, C, Ç e Z</b>, <b>G e J</b>, <b>X e CH</b>, <b>R e RR</b>, <b>M antes de P e B</b>, <b>H inicial</b> e <b>acentos</b>. Escolha o jeito certo ou ache o monstro!',
    fila: () => { const pares = paresDaChuva((c, certa) => !ehDificil(c, certa)); return pares.map((par) => perguntaDoPar(par, pares, Math.random() < 0.3)); } },
  { id: 'orto-dificil', titulo: 'Difícil', icone: '🌳', cor: '#e53935', mistura: true,
    descricao: 'Palavras longas e difíceis',
    regra: 'Palavras longas e difíceis, da escola e do dia a dia: <b>exceção</b>, <b>conhecimento</b>, <b>helicóptero</b>... Leia letra por letra antes de escolher!',
    fila: () => { const pares = paresDaChuva(ehDificil); return pares.map((par) => perguntaDoPar(par, pares, Math.random() < 0.4)); } },
];

function telaMissoes() {
  const estrelas = lerEstrelas();
  $('grade-missoes').innerHTML = NIVEIS_ORTO.map((n) => `
      <button class="missao" style="--c:${n.cor}" data-id="${n.id}" type="button">
        <span class="missao-icone">${n.icone}</span>
        <span class="missao-titulo">${n.titulo}</span>
        <span class="missao-descricao">${n.descricao}</span>
        <span class="missao-estrelas">${estrelasTexto(estrelas[n.id] || 0)}</span>
      </button>`).join('');
  const total = NIVEIS_ORTO.reduce((s, n) => s + (estrelas[n.id] || 0), 0);
  $('total-estrelas').textContent = `${aluno}, você já ganhou ${total} de ${NIVEIS_ORTO.length * 3} estrelas ⭐`;
  mostrar('tela-missoes');
}

$('grade-missoes').onclick = (e) => {
  const b = e.target.closest('.missao'); if (!b) return;
  SOM.clique();
  const n = NIVEIS_ORTO.find((x) => x.id === b.dataset.id);
  telaRegra({ ...n, titulo: `Ortografia – nível ${n.titulo}` });
};

// ---------- Missão ----------
// fila: lista de { m: missão da palavra, p: pergunta }; resultados: o que aconteceu em cada uma
let fila = [], idx = 0, errosNaPergunta = [];

function telaRegra(m) {
  definirMissao(m);
  $('regra-icone').textContent = m.icone;
  $('regra-titulo').textContent = m.titulo;
  $('tela-regra').style.setProperty('--c', m.cor);
  $('regra-texto').innerHTML = m.regra;
  mascote('davi-regra', 'oi');
  frase('regra-' + m.id);   // o Davi lê o segredo da missão (se gravado)
  mostrar('tela-regra');
}

function comecarMissao() {
  fila = embaralhar(missao.fila()).slice(0, PERGUNTAS_POR_RODADA);
  idx = 0; definirResultados([]);
  $('barra-titulo').textContent = `${missao.icone} ${missao.titulo}`;
  $('tela-pergunta').style.setProperty('--c', missao.cor);
  $('btn-terminar').hidden = true;
  mostrar('tela-pergunta');
  mostrarPergunta();
}

// palavra certa de cada pergunta (para ouvir, mostrar e pôr no relatório)
function palavraCerta({ m, p }) {
  if (m.tipo === 'completar') return p.molde.replace('_', p.resp.toLowerCase());
  if (m.tipo === 'escolher') return p.resp;
  return p.certa;
}

function balao(html, estado) {
  const b = $('balao-jogo');
  b.innerHTML = html;
  b.className = 'balao balao-cima' + (estado ? ' ' + estado : '');
}

function desenharProgresso() {
  if (fila.length > 12) {
    const pct = Math.round((idx / fila.length) * 100);
    $('progresso').innerHTML = `<span class="progresso-barra"><b style="width:${pct}%"></b></span><span class="progresso-num">${idx + 1}/${fila.length}</span>`;
  } else {
    $('progresso').innerHTML = fila.map((_, i) => `<i class="${i < idx ? 'feita' : i === idx ? 'atual' : ''}"></i>`).join('');
  }
}

function botaoOpcao(texto, classe, cor, aoTocar) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'opcao' + (classe ? ' ' + classe : ''); b.textContent = texto;
  b.style.setProperty('--c', cor);
  b.onclick = aoTocar;
  $('opcoes').append(b);
}

function mostrarPergunta() {
  const { m, p } = fila[idx];
  errosNaPergunta = [];
  desenharProgresso();
  $('btn-proxima').hidden = true;
  $('opcoes').innerHTML = '';
  $('palavra').innerHTML = '';
  $('etiqueta-missao').hidden = !missao.mistura;
  $('etiqueta-missao').textContent = `${m.icone} ${m.titulo}`;
  $('etiqueta-missao').style.setProperty('--c', m.cor);
  mascote('davi-jogo', 'pensando');   // enquanto o aluno analisa a questão

  if (m.tipo === 'detetive') {
    $('figura').textContent = '🔍';
    $('btn-ouvir').hidden = true;
    $('enunciado').textContent = 'Qual palavra está escrita ERRADA?';
    balao('Uma dessas palavras é um <b>monstro da escrita</b>! Toque nela para capturar. 👾');
    for (const w of embaralhar(p.palavras)) botaoOpcao(w, 'palavra-op', m.cor, (e) => responder(e.currentTarget, w === p.errada, w));
    return;
  }

  if (p.img) $('figura').innerHTML = `<img src="${p.img}" alt="" width="240" height="240">`;
  else $('figura').textContent = p.fig;
  $('btn-ouvir').hidden = false;

  if (m.tipo === 'completar') {
    $('enunciado').textContent = 'Qual letra completa a palavra?';
    const [antes, depois] = p.molde.split('_');
    $('palavra').innerHTML = [...antes].map((l) => `<span class="letra">${l.toUpperCase()}</span>`).join('')
      + '<span class="letra lacuna" id="lacuna">?</span>'
      + [...depois].map((l) => `<span class="letra">${l.toUpperCase()}</span>`).join('');
    balao('Olhe a figura, ouça a palavra e escolha a letra que falta! 👀');
    for (const op of m.opcoes) botaoOpcao(op, '', m.cor, (e) => responder(e.currentTarget, op === p.resp, op));
  } else {
    $('enunciado').textContent = 'Qual é o jeito certo de escrever?';
    balao(m.id === 'acentos' || m.id === 'c-acentos' ? 'Olhe bem os <b>acentos</b> e o <b>til</b>! ✨' : 'Olhe bem <b>cada letra</b>! Qual está escrita certa? ✨');
    for (const op of embaralhar(p.opcoes)) botaoOpcao(op, 'palavra-op', m.cor, (e) => responder(e.currentTarget, op === p.resp, op));
  }
}

// como ficaria a palavra com a escolha errada (para o relatório)
function comoEscreveu({ m, p }, escolha) {
  if (m.tipo === 'completar') return p.molde.replace('_', escolha.toLowerCase());
  return escolha;
}

function responder(botao, acertou, escolha) {
  const item = fila[idx], { m, p } = item;
  if (acertou) {
    SOM.certo();
    resultados.push({ m, p, certa: palavraCerta(item), erros: errosNaPergunta.slice() });
    document.querySelectorAll('#opcoes .opcao').forEach((b) => { b.disabled = true; });
    botao.classList.add(m.tipo === 'detetive' ? 'monstro' : 'certa');
    const certa = palavraCerta(item);
    if (m.tipo === 'completar') {
      $('lacuna').textContent = escolha;
      $('lacuna').classList.add('preenchida');
    }
    if (m.tipo === 'detetive') {
      $('palavra').innerHTML = [...certa].map((l) => `<span class="letra lacuna preenchida">${l.toUpperCase()}</span>`).join('');
      balao(`👾 Monstro capturado! O certo é <b>${certa.toUpperCase()}</b>.<br>${p.dica}`, 'certo');
    } else {
      balao(`${sortear(ELOGIOS)} 🎉 Escreve-se <b>${certa.toUpperCase()}</b>.`, 'certo');
    }
    mascote('davi-jogo', 'acertou');
    falar(certa);
    $('btn-proxima').textContent = idx === fila.length - 1 ? 'Ver resultado ⭐' : 'Próxima ➜';
    $('btn-proxima').hidden = false;
    $('btn-proxima').focus({ preventScroll: true });
  } else {
    SOM.errado();
    errosNaPergunta.push(comoEscreveu(item, escolha));
    botao.classList.add('errada');
    botao.disabled = true;
    mascote('davi-jogo', 'triste');
    // depois de um tempinho, volta a pensar junto com a criança
    const pergunta = idx;
    clearTimeout(mascote.timer);
    mascote.timer = setTimeout(() => {
      if (idx === pergunta && $('btn-proxima').hidden && $('tela-pergunta').classList.contains('ativa')) mascote('davi-jogo', 'pensando');
    }, 2600);
    frase('tente-de-novo');
    if (m.tipo === 'detetive') {
      balao(`Hmm… <b>${String(escolha).toUpperCase()}</b> está certinha! O monstro é outra. 🔍`, 'errado');
    } else {
      balao(`Quase! Tente de novo. 💡<br>${m.regra}`, 'errado');
    }
  }
}

function proxima() {
  idx++;
  if (idx < fila.length) mostrarPergunta();
  else fimDaMissao();
}

$('btn-jogar').onclick = () => { SOM.clique(); escolherProfessorE('Jogo de Ortografia', telaMissoes); };
$('voltar-inicio').onclick = telaJogos;
$('btn-comecar').onclick = () => { SOM.clique(); comecarMissao(); };
$('regra-voltar').onclick = telaMissoes;
$('sair-missao').onclick = telaMissoes;
$('btn-terminar').onclick = () => { if (resultados.length) fimDaMissao(); else telaMissoes(); };
$('btn-proxima').onclick = proxima;
$('btn-ouvir').onclick = () => falar(palavraCerta(fila[idx]));

export { comecarMissao, telaMissoes };
