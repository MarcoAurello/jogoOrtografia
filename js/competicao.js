/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Competição: o professor cria (jogo + hora de encerrar), a turma entra com o código e o ranking fica na planilha. */

import { $, seguro } from './util.js?v=117';
import { aluno } from './estado.js?v=117';
import { SOM } from './som.js?v=117';
import { mostrar } from './telas.js?v=117';
import { definirEmailCompeticao, gravarNoScript, jogoDaMissao, JOGOS_DO_LINK, lerDoScript, listaEmails, parteProfessor, carregarEmails } from './professor.js?v=117';
import { depoisDoFim, URL_RELATORIO } from './relatorio.js?v=117';
import { comecarQuiz } from './quiz.js?v=117';

// ---------- Competição ----------
// A aba Competição lista as competições abertas (e as que encerraram há pouco, só com o ranking). Para entrar, o aluno
// digita o nome e o código que o professor passou; daí o jogo abre e, no fim de cada partida, a pontuação vai para a
// planilha. Vale a melhor partida de cada aluno. Depois da hora de encerrar, ninguém mais entra (nada é apagado).
// A competição pode ser de um jogo ou de um questionário do professor (jogo "quiz:<id da aba>").
// Tudo fica no script do Google (ferramentas/relatorio-email.gs): abas "Competições" e "Ranking" da planilha.
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
  senha: 'A planilha não aceitou a senha: confira a SENHA_PROFESSOR no script do Google.',
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
  $('comp-entrar').hidden = qual !== 'entrar';
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
  if (!URL_RELATORIO) { $('comp-status').textContent = 'As competições ainda não foram ligadas no jogo.'; return; }
  $('comp-status').textContent = 'Buscando as competições…';
  $('comp-status').classList.add('carregando');
  try {
    const { lista } = await lerDoScript('competicoes');
    $('comp-status').classList.remove('carregando');
    $('comp-status').textContent = lista.length ? 'Toque numa competição aberta e digite o código que o professor passou.'
      : 'Nenhuma competição agora. Quando o professor criar uma, ela aparece aqui. 🏆';
    caixa.innerHTML = '';
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
        const entrar = document.createElement('button');
        entrar.type = 'button';
        entrar.className = 'btn-grande btn-pequeno';
        entrar.textContent = 'Entrar ▶';
        entrar.onclick = () => { SOM.clique(); pedirCodigo(c); };
        botoes.append(entrar);
      }
      item.append(botoes);
      caixa.append(item);
    }
  } catch (e) {
    $('comp-status').classList.remove('carregando');
    $('comp-status').textContent = 'Sem internet (ou o script da planilha está desatualizado): não deu para buscar as competições.';
  }
}

// entrar: nome + código (só tocar na competição não basta)
let escolhida = null;
function pedirCodigo(c) {
  escolhida = c;
  $('comp-entrar-titulo').textContent = `🏆 ${c.nome}`;
  $('comp-entrar-jogo').textContent = `Jogo: ${c.jogoNome} · aberta até ${horaTexto(c.encerra)}`;
  $('comp-nome').value = ativa && ativa.id === c.id ? ativa.aluno : (aluno || '');
  $('comp-codigo').value = '';
  $('comp-erro').textContent = '';
  parteCompeticao('entrar');
  setTimeout(() => $($('comp-nome').value ? 'comp-codigo' : 'comp-nome').focus(), 300);
}
$('form-comp-entrar').onsubmit = async (ev) => {
  ev.preventDefault();
  const nome = $('comp-nome').value.trim().replace(/\s+/g, ' ');
  const codigo = $('comp-codigo').value.trim().toUpperCase();
  if (!nome) { $('comp-erro').textContent = ERROS.nome; SOM.errado(); return; }
  if (!codigo) { $('comp-erro').textContent = 'Digite o código que o professor passou. 🔑'; SOM.errado(); return; }
  $('comp-erro').textContent = 'Conferindo o código…';
  try {
    const { competicao } = await gravarNoScript({ acao: 'entrarCompeticao', id: escolhida.id, codigo });
    guardarAtiva({ ...competicao, codigo, aluno: nome });
    SOM.certo();
    jogarCompeticao();
  } catch (err) {
    SOM.errado();
    $('comp-erro').textContent = mensagem(err, 'Sem internet: não deu para conferir o código. Tente de novo.');
  }
};
$('comp-entrar-voltar').onclick = () => { SOM.clique(); parteCompeticao('lista'); };
$('comp-codigo').oninput = () => { $('comp-codigo').value = $('comp-codigo').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };

function jogarCompeticao() {
  if (!ativa) return;
  if (ativa.jogo.startsWith('quiz:')) { comecarQuiz(ativa.jogo.slice(5)); return; }
  const jogo = JOGOS_DO_LINK[ativa.jogo];
  if (!jogo) { $('comp-erro').textContent = 'Este jogo não existe nesta versão do app. Atualize o app.'; return; }
  jogo.abrir();
}
$('btn-inicio-comp').onclick = () => { SOM.clique(); telaCompeticao(); };
$('btn-comp-jogar').onclick = () => { SOM.clique(); jogarCompeticao(); };
$('btn-comp-sair').onclick = () => {
  if (!window.confirm('Sair da competição? Suas partidas já enviadas continuam no ranking.')) return;
  guardarAtiva(null);
  desenharAtiva();
};

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
function avisoComp(texto, ok = false) {
  $('aviso-comp').textContent = texto;
  $('aviso-comp').classList.toggle('aviso-ok', ok);
}
// questionários do professor, para a competição também poder ser de um questionário
let questionarios = [];
function prepararFormulario() {
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
  prepararFormulario();
  listarCompeticoesProfessor();
  try { questionarios = (await lerDoScript('questionarios')).lista || []; } catch (e) { /* sem internet: só os jogos */ }
  await carregarEmails();
  const antes = $('comp-novo-email').value;
  prepararFormulario();
  if (antes) $('comp-novo-email').value = antes;
};

$('form-nova-comp').onsubmit = async (ev) => {
  ev.preventDefault();
  const jogo = $('comp-novo-jogo').value;
  if (!jogo) { avisoComp(ERROS.jogo); return; }
  const jogoNome = $('comp-novo-jogo').selectedOptions[0].textContent;
  const [h, m] = $('comp-novo-hora').value.split(':').map(Number);
  const encerra = new Date();
  encerra.setHours(h, m, 59, 0);
  if (!(encerra > new Date())) { avisoComp(ERROS.hora); return; }
  avisoComp('Criando na planilha…');
  try {
    const { competicao: c } = await gravarNoScript({ acao: 'criarCompeticao', nome: $('comp-novo-nome').value.trim(), jogo,
      jogoNome, encerra: encerra.toISOString(), email: $('comp-novo-email').value });
    SOM.certo();
    $('comp-novo-nome').value = '';
    avisoComp(`Competição criada! Passe o código ${c.codigo} para a turma: eles entram pela aba 🏆 Competição. ✔`, true);
    listarCompeticoesProfessor();
  } catch (err) { avisoComp(mensagem(err, 'Não deu para criar (sem internet ou script desatualizado). Tente de novo.')); }
};

async function listarCompeticoesProfessor(dados) {
  const caixa = $('lista-comp-prof');
  if (!dados) caixa.innerHTML = '<p class="quiz-status carregando">Buscando as competições…</p>';
  try {
    const { lista } = dados || await gravarNoScript({ acao: 'competicoesProfessor' });
    caixa.innerHTML = lista.length ? '' : '<p class="quiz-status">Nenhuma competição nos últimos 30 dias.</p>';
    for (const c of lista) {
      const item = document.createElement('div');
      item.className = `quiz-item comp-item${c.aberta ? '' : ' encerrada'}`;
      item.innerHTML = `<span class="comp-item-texto"><span class="quiz-item-nome">${seguro(c.nome)}</span>
        <span class="comp-codigo" title="Código para entrar">${seguro(c.codigo)}</span>
        <span class="quiz-item-qtd">🎮 ${seguro(c.jogoNome)} · ${pessoas(c.participantes)}</span>
        <span class="comp-item-hora">${c.aberta ? `⏰ Aberta até ${horaTexto(c.encerra)} (${diaTexto(c.encerra)})` : `🔒 Encerrou ${diaTexto(c.encerra)} às ${horaTexto(c.encerra)}`}</span></span>`;
      const botoes = document.createElement('span');
      botoes.className = 'comp-item-botoes';
      const botao = (txt, classe, acao) => { const b = document.createElement('button'); b.type = 'button'; b.className = classe; b.textContent = txt; b.onclick = acao; botoes.append(b); };
      botao('📋 Copiar código', 'quiz-link', async () => {
        const texto = `Competição "${c.nome}" (${c.jogoNome}) no app Jogos Psicopedagógicos: abra a aba 🏆 Competição e use o código ${c.codigo}.`;
        try { await navigator.clipboard.writeText(texto); avisoComp(`Código ${c.codigo} copiado! Cole no WhatsApp ou mural da turma.`, true); }
        catch (e) { window.prompt('Copie o código:', c.codigo); }
      });
      botao('🏆 Ranking', 'quiz-link', () => { SOM.clique(); abrirRanking(c.id); });
      if (c.aberta) {
        botao('⏹ Encerrar agora', 'quiz-excluir', async () => {
          if (!window.confirm(`Encerrar "${c.nome}" agora? Ninguém mais poderá entrar (o ranking fica guardado).`)) return;
          try { listarCompeticoesProfessor(await gravarNoScript({ acao: 'encerrarCompeticao', id: c.id })); avisoComp(`"${c.nome}" foi encerrada.`, true); }
          catch (e) { avisoComp('Não deu para encerrar (sem internet?). Tente de novo.'); }
        });
      }
      item.append(botoes);
      caixa.append(item);
    }
  } catch (err) {
    caixa.innerHTML = `<p class="quiz-status">${seguro(mensagem(err, 'Não deu para buscar as competições (sem internet ou script desatualizado).'))}</p>`;
  }
}

export { telaCompeticao };
