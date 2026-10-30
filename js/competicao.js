/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Competição: o professor cria para uma turma (jogo + hora de encerrar); o aluno entra com o código da turma e joga. */

import { $, seguro } from './util.js?v=151';
import { aluno, aoVoltarAoInicio } from './estado.js?v=151';
import { api, lerTokenAluno } from './api.js?v=151';
import { definirCompeticaoDaPartida } from './partidas.js?v=151';
import { SOM } from './som.js?v=151';
import { mostrar } from './telas.js?v=151';
import { definirEmailCompeticao, gravarComoProfessor, gravarNoScript, jogoDaMissao, JOGOS_DO_LINK, lerDoScript, listaEmails, parteProfessor, carregarEmails } from './professor.js?v=151';
import { depoisDoFim, URL_RELATORIO } from './relatorio.js?v=151';
import { comecarQuiz } from './quiz.js?v=151';
import { criarPopup, ligarBusca, ligarFiltro, listaSemItens, mostrarContagem, semAcento } from './popup.js?v=151';

// ---------- Competição ----------
// Cada competição é de uma turma. O aluno entra com o código da turma (js/entrada.js) e a aba Competição lista as
// competições da turma dele (as abertas e as que encerraram há pouco, só com o ranking): é só tocar em Jogar.
// No fim de cada partida, a pontuação vai para o ranking, onde vale a melhor partida do aluno; todas as partidas ficam
// no relatório do professor. Depois da hora de encerrar, ninguém mais joga (nada é apagado).
// A competição pode ser de um jogo ou de um questionário do professor (jogo "quiz:<id>").
const CHAVE_ATIVA = 'pleno-ortografia:competicao';   // a competição em que o aluno entrou (neste aparelho)
const ATUALIZAR_RANKING = 15000;
// os links de alguns jogos têm outro nome que o tipo do jogo no relatório
const TIPO_DO_JOGO = { forma: 'simbolos', reflexo2: 'reflexo' };
let ativa = (() => { try { return JSON.parse(sessionStorage.getItem(CHAVE_ATIVA)) || null; } catch (e) { return null; } })();
let rankingAberto = null;   // id da competição cujo ranking está na tela (para atualizar sozinho)
let relogioRanking = 0;

const horaTexto = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const diaTexto = (iso) => {
  const d = new Date(iso), hoje = new Date();
  return d.toDateString() === hoje.toDateString() ? 'hoje' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};
const pessoas = (n) => `${n} ${n === 1 ? 'participante' : 'participantes'}`;
const ERROS = {
  codigo: 'Código errado. Confira com o professor. 🔑',
  encerrada: 'Esta competição já encerrou: ninguém mais pode entrar. ⏰',
  competicao: 'Competição não encontrada.',
  nome: 'Digite o seu nome.',
  hora: 'Escolha uma hora de encerrar que ainda não passou.',
  jogo: 'Escolha o jogo da competição.',
  turma: 'Escolha a turma da competição (os alunos entram com o código dela).',
  senha: 'A planilha não aceitou a senha: confira se a SENHA_PLANILHA do servidor é a mesma SENHA_PROFESSOR do script do Google.',
  login: 'O seu login venceu. Toque em Sair e entre de novo.',
  acesso: 'A planilha desta escola não está liberada para "Qualquer pessoa" no Apps Script. Avise o professor.',
};
const mensagem = (err, padrao) => ERROS[String(err && err.message)] || padrao;

function guardarAtiva(c) {
  ativa = c;
  try { if (c) sessionStorage.setItem(CHAVE_ATIVA, JSON.stringify(c)); else sessionStorage.removeItem(CHAVE_ATIVA); } catch (e) { /* sem armazenamento */ }
  definirEmailCompeticao(c && c.email ? c.email : '');
}
if (ativa) definirEmailCompeticao(ativa.email || '');
// a planilha manda a hora de encerrar atualizada (o professor pode encerrar antes): corrige a cópia do aparelho
function conferirAtiva(c) {
  if (!ativa || ativa.id !== c.id || ativa.encerra === c.encerra) return;
  guardarAtiva({ ...ativa, encerra: c.encerra });
  desenharAtiva();
}

// ---------- aba Competição (aluno) ----------
function parteCompeticao(qual) {
  $('comp-lista').hidden = qual !== 'lista';
  $('comp-ranking').hidden = qual !== 'ranking';
  if (qual !== 'ranking') { rankingAberto = null; clearInterval(relogioRanking); }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function telaCompeticao() {
  mostrar('tela-competicao');
  parteCompeticao('lista');
  desenharAtiva();
  carregarCompeticoes();
}

// a competição em que o aluno já entrou: atalho para jogar de novo ou sair
function desenharAtiva() {
  $('comp-ativa').hidden = !ativa;
  if (!ativa) return;
  const aberta = new Date(ativa.encerra) > new Date();
  $('comp-ativa-texto').innerHTML = `Você está na competição <b>${seguro(ativa.nome)}</b> (${seguro(ativa.jogoNome)}) como <b>${seguro(ativa.aluno)}</b>.`
    + (aberta ? ` Encerra ${diaTexto(ativa.encerra)} às ${horaTexto(ativa.encerra)}.` : ' Ela já encerrou.');
  $('btn-comp-jogar').hidden = !aberta;
}

async function carregarCompeticoes() {
  const caixa = $('lista-comp');
  caixa.innerHTML = '';
  $('comp-erro').textContent = '';
  const logado = !!(lerTokenAluno() && aluno);
  $('btn-comp-turma').hidden = logado;
  if (!logado) {
    $('comp-status').classList.remove('carregando');
    $('comp-status').textContent = 'Para ver e jogar as competições, entre com o código da turma (o professor passa). 🏫';
    return;
  }
  $('comp-status').textContent = 'Buscando as competições da sua turma…';
  $('comp-status').classList.add('carregando');
  try {
    const { lista } = await api('/sessions/aluno/competicoes', { comoAluno: true });
    $('comp-status').classList.remove('carregando');
    $('comp-status').textContent = lista.length ? `Oi, ${aluno}! Toque em Jogar numa competição aberta.`
      : 'A sua turma ainda não tem competição. Quando o professor criar uma, ela aparece aqui. 🏆';
    lista.forEach(conferirAtiva);
    for (const c of lista) {
      const item = document.createElement('div');
      item.className = `quiz-item comp-item${c.aberta ? '' : ' encerrada'}`;
      item.innerHTML = `<span class="comp-item-texto"><span class="quiz-item-nome">${seguro(c.nome)}</span>
        <span class="quiz-item-qtd">🎮 ${seguro(c.jogoNome)} · ${pessoas(c.participantes)}</span>
        <span class="comp-item-hora">${c.aberta ? `⏰ Aberta até ${horaTexto(c.encerra)} (${diaTexto(c.encerra)})` : `🔒 Encerrou ${diaTexto(c.encerra)} às ${horaTexto(c.encerra)}`}</span></span>`;
      const botoes = document.createElement('span');
      botoes.className = 'comp-item-botoes';
      const ver = document.createElement('button');
      ver.type = 'button';
      ver.className = 'quiz-link';
      ver.textContent = '🏆 Ranking';
      ver.onclick = () => { SOM.clique(); abrirRanking(c.id); };
      botoes.append(ver);
      if (c.aberta) {
        const jogar = document.createElement('button');
        jogar.type = 'button';
        jogar.className = 'btn-grande btn-pequeno';
        jogar.textContent = 'Jogar ▶';
        jogar.onclick = () => { SOM.clique(); guardarAtiva({ ...c, aluno }); jogarCompeticao(); };
        botoes.append(jogar);
      }
      item.append(botoes);
      caixa.append(item);
    }
  } catch (e) {
    $('comp-status').classList.remove('carregando');
    $('comp-status').textContent = e.status === 401 ? 'O seu login saiu. Entre de novo com o código da turma. 🏫'
      : 'Sem internet: não deu para buscar as competições.';
    $('btn-comp-turma').hidden = e.status !== 401;
  }
}

function jogarCompeticao() {
  if (!ativa) return;
  if (ativa.jogo.startsWith('quiz:')) { comecarQuiz(ativa.jogo.slice(5)); return; }
  const jogo = JOGOS_DO_LINK[ativa.jogo];
  if (!jogo) { $('comp-erro').textContent = 'Este jogo não existe nesta versão do app. Atualize o app.'; return; }
  jogo.abrir();
}
$('btn-comp-jogar').onclick = () => { SOM.clique(); jogarCompeticao(); };
$('btn-comp-sair').onclick = () => { SOM.clique(); guardarAtiva(null); desenharAtiva(); };
// voltar à tela inicial tira o login da turma e a competição
aoVoltarAoInicio.push(() => { if (ativa) guardarAtiva(null); });

// ranking: posição, nome e pontos (a melhor partida de cada um), separado por configuração do jogo
// (as operações da Chuva de Matemática, o nível do Peso Certo...): o fácil não disputa com o difícil
const chaveNome = (n) => (n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function porConfig(lista) {
  const grupos = new Map();
  lista.forEach((r) => { if (!grupos.has(r.config)) grupos.set(r.config, []); grupos.get(r.config).push(r); });
  return [...grupos.entries()];
}
function desenharRanking(lista, alvo, meuNome, meuConfig) {
  if (!lista.length) { alvo.innerHTML = '<li class="quiz-status">Ninguém jogou ainda. Seja o primeiro! 🚀</li>'; return; }
  const meu = chaveNome(meuNome);
  const grupos = porConfig(lista);
  alvo.innerHTML = grupos.map(([config, rs]) => `${config ? `<li class="ranking-config">⚙️ ${seguro(config)}</li>` : ''}${rs.map((r, i) => {
    const eu = meu && chaveNome(r.nome) === meu && (meuConfig === undefined || r.config === meuConfig);
    const medalha = ['🥇', '🥈', '🥉'][i] || `${i + 1}º`;
    return `<li class="ranking-linha${i < 3 ? ` top${i + 1}` : ''}${eu ? ' eu' : ''}"><span class="ranking-pos">${medalha}</span><span class="ranking-nome">${seguro(r.nome)}</span>`
      + `<span class="ranking-info">${r.acertos}/${r.total} · ${r.partidas} ${r.partidas === 1 ? 'partida' : 'partidas'}</span><span class="ranking-pontos">${r.pontos} pts</span></li>`;
  }).join('')}`).join('');
}

async function abrirRanking(id) {
  if (!$('tela-competicao').classList.contains('ativa')) { mostrar('tela-competicao'); desenharAtiva(); }
  parteCompeticao('ranking');
  rankingAberto = id;
  $('comp-ranking-titulo').textContent = '🏆 Ranking';
  $('comp-ranking-info').textContent = 'Buscando o ranking…';
  $('comp-ranking-lista').innerHTML = '';
  await atualizarRanking();
  clearInterval(relogioRanking);
  relogioRanking = setInterval(() => {
    if (!rankingAberto || !$('tela-competicao').classList.contains('ativa')) { clearInterval(relogioRanking); return; }
    atualizarRanking();
  }, ATUALIZAR_RANKING);
}
async function atualizarRanking() {
  const id = rankingAberto;
  try {
    const { competicao: c, ranking } = await lerDoScript('ranking', `&id=${encodeURIComponent(id)}`);
    if (rankingAberto !== id) return;
    conferirAtiva(c);
    $('comp-ranking-titulo').textContent = `🏆 ${c.nome}`;
    $('comp-ranking-info').textContent = `🎮 ${c.jogoNome} · ${pessoas(new Set(ranking.map((r) => chaveNome(r.nome))).size)} · `
      + (c.aberta ? `aberta até ${horaTexto(c.encerra)} (atualiza sozinho)` : `encerrou ${diaTexto(c.encerra)} às ${horaTexto(c.encerra)}`);
    desenharRanking(ranking, $('comp-ranking-lista'), ativa && ativa.id === id ? ativa.aluno : '');
  } catch (e) {
    if (rankingAberto === id) $('comp-ranking-info').textContent = 'Sem internet: não deu para buscar o ranking.';
  }
}
$('comp-ranking-voltar').onclick = () => { SOM.clique(); parteCompeticao('lista'); carregarCompeticoes(); };

// ---------- fim de cada partida: manda a pontuação, se o jogo for o da competição ----------
// os pontos são os do placar do jogo; os jogos sem placar (e os questionários) contam 10 pontos por acerto de primeira
function pontosDaPartida(rel, mis) {
  const placar = document.querySelector('.tela.ativa [id$="-pontos"]');
  const doPlacar = placar ? Number(placar.textContent.replace(/\D/g, '')) : NaN;
  if (Number.isFinite(doPlacar) && placar.textContent.trim() !== '') return doPlacar;
  const doResumo = (mis.resumo || []).join(' ').match(/Pontos: (\d+)/);
  return doResumo ? Number(doResumo[1]) : rel.dePrimeiraN * 10;
}
const ehDaCompeticao = (mis) => !!ativa && (ativa.jogo.startsWith('quiz:') ? !!mis.quiz && `quiz:${mis.quizId}` === ativa.jogo
  : jogoDaMissao(mis) === (TIPO_DO_JOGO[ativa.jogo] || ativa.jogo));

depoisDoFim.push(async ({ rel, missao: mis }) => {
  const caixa = $('fim-competicao');
  caixa.hidden = true;
  if (!ehDaCompeticao(mis)) return;
  const c = ativa;
  const pontos = pontosDaPartida(rel, mis);
  caixa.hidden = false;
  $('fim-comp-titulo').textContent = `🏆 ${c.nome}`;
  $('fim-comp-texto').textContent = `Enviando seus ${pontos} pontos para o ranking…`;
  $('fim-comp-lista').innerHTML = '';
  try {
    // a configuração escolhida no jogo vai junto (o título da partida já diz: operações, nível, modo...)
    const config = mis.titulo;
    const { ranking } = await gravarNoScript({ acao: 'resultadoCompeticao', id: c.id, codigo: c.codigo, nome: c.aluno,
      pontos, acertos: rel.dePrimeiraN, total: rel.respondidas, config });
    const doMeuJeito = ranking.filter((r) => r.config === config);   // só quem jogou com a mesma configuração
    const pos = doMeuJeito.findIndex((r) => chaveNome(r.nome) === chaveNome(c.aluno));
    const melhor = pos >= 0 ? doMeuJeito[pos].pontos : pontos;
    $('fim-comp-texto').innerHTML = `Esta partida: <b>${pontos} pontos</b>. Sua melhor: <b>${melhor}</b>. `
      + (pos >= 0 ? `Você está em <b>${pos + 1}º lugar</b> de ${doMeuJeito.length} ${doMeuJeito.length === 1 ? 'aluno' : 'alunos'} que jogaram assim! ${pos === 0 ? '🥇' : ''}` : '');
    desenharRanking(doMeuJeito.slice(0, 10), $('fim-comp-lista'), c.aluno, config);
  } catch (err) {
    $('fim-comp-texto').textContent = String(err && err.message) === 'encerrada'
      ? 'A competição já encerrou: esta partida não entrou no ranking. ⏰'
      : 'Sem internet: esta partida não entrou no ranking. Jogue de novo quando a internet voltar.';
  }
});
$('btn-fim-ranking').onclick = () => { SOM.clique(); if (ativa) abrirRanking(ativa.id); };

// ---------- Área do professor: criar, ver o código, encerrar ----------
// avisos: os do formulário ficam no popup; os da lista (criada, código copiado, encerrada) ficam acima da lista
function avisoComp(texto, ok = false) {
  $('aviso-comp').textContent = texto;
  $('aviso-comp').classList.toggle('aviso-ok', ok);
}
function avisoCompLista(texto, ok = false) {
  $('aviso-comp-lista').textContent = texto;
  $('aviso-comp-lista').classList.toggle('aviso-ok', ok);
}
// questionários do professor, para a competição também poder ser de um questionário; turmas: as que o professor vê
let questionarios = [];
let turmas = [];
function prepararFormulario() {
  const turmaAntes = $('comp-novo-turma').value;
  const ativas = turmas.filter((x) => x.ativa);
  $('comp-novo-turma').innerHTML = ativas.length
    ? (ativas.length > 1 ? '<option value="">Escolha a turma…</option>' : '')
      + ativas.map((x) => `<option value="${seguro(x.id)}">${seguro(x.nome)} (código ${seguro(x.codigo)})</option>`).join('')
    : '<option value="">Crie uma turma primeiro (botão Turmas)</option>';
  if (turmaAntes && ativas.some((x) => x.id === turmaAntes)) $('comp-novo-turma').value = turmaAntes;
  const escolhido = $('comp-novo-jogo').value;
  $('comp-novo-jogo').innerHTML = '<option value="">Escolha o jogo ou o questionário…</option>'
    + `<optgroup label="🎮 Jogos">${Object.entries(JOGOS_DO_LINK).map(([id, j]) => `<option value="${id}">${seguro(j.nome)}</option>`).join('')}</optgroup>`
    + (questionarios.length ? `<optgroup label="📝 Questionários">${questionarios.map((q) => `<option value="quiz:${seguro(q.id)}">Questionário: ${seguro(q.titulo)}</option>`).join('')}</optgroup>` : '');
  $('comp-novo-jogo').value = escolhido;
  const emails = listaEmails();
  $('comp-novo-email').innerHTML = '<option value="">Não enviar relatório</option>'
    + emails.map((x) => `<option value="${seguro(x.email)}">${seguro(x.nome)}</option>`).join('');
  if (emails.length === 1) $('comp-novo-email').value = emails[0].email;
  $('comp-novo-hora').value = '23:59';
  avisoComp('');
}
$('btn-prof-comp').onclick = async () => {
  SOM.clique();
  parteProfessor('comp');
  avisoCompLista('');
  listarCompeticoesProfessor();
  // o que o formulário precisa já vem carregando, para o popup abrir pronto
  try { questionarios = (await lerDoScript('questionarios')).lista || []; } catch (e) { /* sem internet: só os jogos */ }
  try { turmas = await api('/turmas'); } catch (e) { turmas = []; }
  await carregarEmails();
};
// popup: nova competição (js/popup.js)
const popupComp = criarPopup('comp-modal', { fechar: ['btn-comp-fechar', 'btn-comp-cancelar'] });
$('btn-comp-nova').onclick = (ev) => {
  SOM.clique();
  $('comp-novo-nome').value = '';
  prepararFormulario();
  popupComp.abrir(ev.currentTarget, 'comp-novo-turma');
};

$('form-nova-comp').onsubmit = async (ev) => {
  ev.preventDefault();
  const jogo = $('comp-novo-jogo').value;
  const turma = $('comp-novo-turma').value;
  if (!turma) { avisoComp(ERROS.turma); return; }
  if (!jogo) { avisoComp(ERROS.jogo); return; }
  const jogoNome = $('comp-novo-jogo').selectedOptions[0].textContent;
  const [h, m] = $('comp-novo-hora').value.split(':').map(Number);
  const encerra = new Date();
  encerra.setHours(h, m, 59, 0);
  if (!(encerra > new Date())) { avisoComp(ERROS.hora); return; }
  avisoComp('Criando na planilha…');
  try {
    const { competicao: c } = await gravarComoProfessor({ acao: 'criarCompeticao', turma, nome: $('comp-novo-nome').value.trim(), jogo,
      jogoNome, encerra: encerra.toISOString(), email: $('comp-novo-email').value });
    SOM.certo();
    $('comp-novo-nome').value = '';
    popupComp.fechar();
    const daTurma = turmas.find((x) => x.id === turma);
    avisoCompLista(`Competição "${c.nome}" criada! Os alunos entram com o código da turma${daTurma ? ` ${daTurma.codigo}` : ''} e ela aparece na aba 🏆 Competição. ✔`, true);
    chipsComp.escolher('aberta');
    listarCompeticoesProfessor();
  } catch (err) { avisoComp(mensagem(err, 'Não deu para criar (sem internet ou script desatualizado). Tente de novo.')); }
};

// ---------- lista do professor: busca (nome, jogo, turma) e situação (abertas, encerradas) ----------
let competicoesProf = [];
const chipsComp = ligarFiltro('comp-chips', () => { SOM.clique(); desenharCompeticoesProfessor(); });
ligarBusca('comp-busca', () => desenharCompeticoesProfessor());
async function listarCompeticoesProfessor(dados) {
  const caixa = $('lista-comp-prof');
  if (!dados) { caixa.innerHTML = '<p class="quiz-status carregando">Buscando as competições…</p>'; $('comp-contagem').textContent = ''; }
  try {
    competicoesProf = (dados || await gravarComoProfessor({ acao: 'competicoesProfessor' })).lista;
    desenharCompeticoesProfessor();
  } catch (err) {
    caixa.innerHTML = `<p class="quiz-status">${seguro(mensagem(err, 'Não deu para buscar as competições (sem internet?).'))}</p>`;
  }
}
const situacaoComp = (c) => (c.aberta ? 'aberta' : 'encerrada');
function desenharCompeticoesProfessor() {
  const caixa = $('lista-comp-prof');
  const busca = semAcento($('comp-busca').value.trim());
  const daBusca = competicoesProf.filter((c) => !busca || [c.nome, c.jogoNome, c.turma, c.turmaCodigo].some((x) => semAcento(x).includes(busca)));
  chipsComp.contar((f) => (f === 'todos' ? daBusca.length : daBusca.filter((c) => situacaoComp(c) === f).length));
  const f = chipsComp.valor();
  const lista = f === 'todos' ? daBusca : daBusca.filter((c) => situacaoComp(c) === f);
  mostrarContagem('comp-contagem', lista.length, competicoesProf.length, !!busca || f !== 'aberta', ['competição', 'competições']);
  caixa.innerHTML = '';
  if (!lista.length) {
    listaSemItens(caixa, !competicoesProf.length, 'Nenhuma competição nos últimos 30 dias. Toque em <b>＋ Nova competição</b>.',
      () => { SOM.clique(); $('comp-busca').value = ''; chipsComp.escolher('todos'); desenharCompeticoesProfessor(); });
    return;
  }
  for (const c of lista) {
    const item = document.createElement('div');
    item.className = `quiz-item comp-item${c.aberta ? '' : ' encerrada'}`;
    item.innerHTML = `<span class="comp-item-texto"><span class="quiz-item-nome">${seguro(c.nome)}</span>
      ${c.turmaCodigo ? `<span class="comp-codigo" title="Código da turma (os alunos entram com ele)">${seguro(c.turmaCodigo)}</span>` : ''}
      <span class="quiz-item-qtd">🏫 ${seguro(c.turma || 'sem turma')} · 🎮 ${seguro(c.jogoNome)} · ${pessoas(c.participantes)}</span>
      <span class="comp-item-hora">${c.aberta ? `⏰ Aberta até ${horaTexto(c.encerra)} (${diaTexto(c.encerra)})` : `🔒 Encerrou ${diaTexto(c.encerra)} às ${horaTexto(c.encerra)}`}</span></span>`;
    const botoes = document.createElement('span');
    botoes.className = 'comp-item-botoes';
    const botao = (txt, classe, acao) => { const b = document.createElement('button'); b.type = 'button'; b.className = classe; b.textContent = txt; b.onclick = acao; botoes.append(b); };
    if (c.turmaCodigo) botao('📋 Copiar código da turma', 'quiz-link', async () => {
      const texto = `Competição "${c.nome}" (${c.jogoNome}) no app Jogos Psicopedagógicos: toque em "Entrar com o código da turma" e use o código ${c.turmaCodigo}.`;
      try { await navigator.clipboard.writeText(texto); avisoCompLista(`Código ${c.turmaCodigo} copiado! Cole no WhatsApp ou mural da turma.`, true); }
      catch (e) { window.prompt('Copie o código da turma:', c.turmaCodigo); }
    });
    botao('🏆 Ranking', 'quiz-link', () => { SOM.clique(); abrirRanking(c.id); });
    if (c.aberta) {
      botao('⏹ Encerrar agora', 'quiz-excluir', async () => {
        if (!window.confirm(`Encerrar "${c.nome}" agora? Ninguém mais poderá jogar (o ranking fica guardado).`)) return;
        try { listarCompeticoesProfessor(await gravarComoProfessor({ acao: 'encerrarCompeticao', id: c.id })); avisoCompLista(`"${c.nome}" foi encerrada.`, true); }
        catch (e) { avisoCompLista('Não deu para encerrar (sem internet?). Tente de novo.'); }
      });
    }
    item.append(botoes);
    caixa.append(item);
  }
}


// a partida guardada no banco leva a competição em que o aluno estava (js/partidas.js)
definirCompeticaoDaPartida((mis) => (ehDaCompeticao(mis) && ativa ? `${ativa.codigo} · ${ativa.nome}` : ''));

export { telaCompeticao };
