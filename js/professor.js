/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Área do professor e planilha (Google Apps Script): e-mails do relatório, questionários, links dos jogos e leitura de CSV/XLSX. */

import { $, seguro } from './util.js?v=139';
import { SOM } from './som.js?v=139';
import { mostrar, telaInicio } from './telas.js?v=139';
import { telaMissoes } from './ortografia.js?v=139';
import { telaChuvaMenu } from './chuva.js?v=139';
import { telaMatMenu } from './matematica.js?v=139';
import { telaTiroMenu } from './tiro.js?v=139';
import { telaPesoMenu } from './peso.js?v=139';
import { CHAVE_QUIZ_LISTA, QUIZ_DO_LINK } from './quiz.js?v=139';
import { telaLuzesMenu } from './luzes.js?v=139';
import { telaRotinaMenu } from './rotina.js?v=139';
import { telaFichasMenu } from './fichas.js?v=139';
import { telaEscondidaMenu } from './escondida.js?v=139';
import { telaCopiaMenu } from './copia.js?v=139';
import { telaBarcosMenu } from './barcos.js?v=139';
import { telaGiroMenu } from './giro.js?v=139';
import { telaHoraMenu } from './hora.js?v=139';
import { telaSomandoMenu } from './somando.js?v=139';
import { telaDescobrirMenu } from './descobrir.js?v=139';
import { telaChavesMenu } from './chaves.js?v=139';
import { telaCaminhoMenu, telaTaxiMenu } from './caminho.js?v=139';
import { telaPoliciaMenu } from './policia.js?v=139';
import { telaPontosMenu } from './pontos.js?v=139';
import { telaPixelsMenu } from './pixels.js?v=139';
import { telaFracoesMenu } from './fracoes.js?v=139';
import { telaCoresMenu } from './cores.js?v=139';
import { telaLadosMenu } from './lados.js?v=139';
import { telaSetasMenu } from './setas.js?v=139';
import { telaVistasMenu } from './vistas.js?v=139';
import { telaDinosMenu } from './dinos.js?v=139';
import { telaSimbolosMenu } from './simbolos.js?v=139';
import { telaTabuadaMenu } from './tabuada.js?v=139';
import { telaClassesMenu } from './classes.js?v=139';
import { telaGraficosMenu } from './graficos.js?v=139';
import { CHAVE_RELATORIO, URL_RELATORIO } from './relatorio.js?v=139';
import { api, definirEscolaDoAdmin, escolaDoEndereco, guardarToken, lerToken, lerTokenTeste } from './api.js?v=139';

// ---------- Para quem vai o relatório: lista da aba "E-mails" da planilha ----------
// O app não cadastra e-mails: a lista vem da planilha do Google (pelo script ferramentas/relatorio-email.gs)
// e o aluno escolhe, ao entrar, para qual professor vai o relatório. O aparelho guarda uma cópia da lista
// (para funcionar sem internet) e lembra a última escolha.
const CHAVE_EMAILS = 'pleno-ortografia:emails';                    // cópia da aba "E-mails" [{ nome, email }]
const CHAVE_EMAIL_ESCOLHIDO = 'pleno-ortografia:email-escolhido';  // e-mail escolhido, ou 'nenhum'
let usuarioLogado = null;   // quem entrou na Área do professor (login pela API): { nome, email, perfil, escola }
const lerJSON = (chave, padrao) => { try { return JSON.parse(localStorage.getItem(chave)) || padrao; } catch (e) { return padrao; } };
const gravarJSON = (chave, valor) => { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ } };
const jogoDaMissao = (mis) => (mis.quiz ? 'questionario' : mis.fracoes ? 'fracoes' : mis.pixels ? 'pixels' : mis.pontoAPonto ? 'pontos' : mis.policia ? 'policia' : mis.caminho ? 'caminho' : mis.taxi ? 'taxi' : mis.chaves ? 'chaves' : mis.descobrir ? 'descobrir' : mis.somando ? 'somando' : mis.hora ? 'hora' : mis.giro ? 'giro' : mis.barcos ? 'barcos' : mis.copia ? 'copia' : mis.escondida ? 'escondida' : mis.setas ? 'setas' : mis.vistas ? 'vistas' : mis.dinos ? 'dinos' : mis.simbolos ? 'simbolos' : mis.tabuada ? 'tabuada' : mis.classes ? 'classes' : mis.graficos ? 'graficos' : mis.cores ? 'cores' : mis.lados ? 'lados' : mis.fichas ? 'fichas' : mis.rotina ? 'rotina' : mis.luzes ? 'reflexo' : mis.peso ? 'peso' : mis.tiro ? 'tiro' : mis.matematica ? 'matematica' : mis.chuva ? 'chuva' : 'ortografia');
let emailEscolhido = (() => { try { return localStorage.getItem(CHAVE_EMAIL_ESCOLHIDO) || ''; } catch (e) { return ''; } })();
const listaEmails = () => lerJSON(CHAVE_EMAILS, []);
// o e-mail para onde vai o relatório (só se estiver na lista da planilha)
// numa competição, o relatório vai para o professor que a criou
let emailCompeticao = '';
const definirEmailCompeticao = (email) => { emailCompeticao = email || ''; };
const emailDoRelatorio = () => (emailCompeticao && listaEmails().some((x) => x.email === emailCompeticao) ? emailCompeticao
  : listaEmails().some((x) => x.email === emailEscolhido) ? emailEscolhido : '');

// os dados (e-mails, questionários, competições) vêm da API, com as mesmas ações e respostas do antigo script do Google:
// leituras por GET e as ações do aluno (competição) por POST, com a escola do endereço; as gravações do professor
// vão por gravarComoProfessor, com o login
// chama o script; com internet e sem resposta (o Google manda a página de login, que o navegador bloqueia),
// o script não está liberado para "Qualquer pessoa"
async function chamarScript(url, opcoes) {
  let r;
  try { r = await fetch(url, opcoes); } catch (e) { throw new Error(navigator.onLine ? 'acesso' : 'internet'); }
  const texto = await r.text();
  try { return JSON.parse(texto); } catch (e) { throw new Error('acesso'); }
}
async function lerDoScript(acao, extra = '') {
  const j = await chamarScript(`/api/dados?acao=${acao}&escola=${encodeURIComponent(escolaDoEndereco())}${extra}`);
  if (!j.ok) throw new Error(j.erro || 'erro');
  return j;
}
async function gravarNoScript(dados) {
  const j = await chamarScript('/api/dados', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ escola: escolaDoEndereco(), ...dados }) });
  if (!j.ok) throw new Error(j.erro || 'erro');
  return j;
}
async function gravarComoProfessor(dados) {
  let j;
  try { j = await api('/planilha', { metodo: 'POST', corpo: dados }); }
  catch (err) { throw new Error(err.codigo === 'internet' ? 'internet' : err.status === 401 ? 'login' : err.codigo || 'acesso'); }
  if (!j.ok) throw new Error(j.erro || 'erro');
  return j;
}

// janela que aparece antes de cada jogo: o aluno digita parte do nome do professor e escolhe na lista que aparece
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function desenharEscolhaEmail() {
  const lista = listaEmails();
  if (lista.length === 1 && !emailEscolhido) emailEscolhido = lista[0].email;   // só um professor: já vem escolhido
  const ultimo = lista.find((x) => x.email === emailEscolhido);
  $('escolha-prof-ultimo').hidden = !ultimo;
  $('escolha-prof-ultimo-nome').textContent = ultimo ? ultimo.nome : '';
  $('busca-prof').value = '';
  $('lista-prof').innerHTML = '';
}
// busca na lista da planilha: enquanto a lista atualiza, mostra o carregando (sem internet, usa a cópia do aparelho)
async function buscarProfessor() {
  const pedaco = semAcento($('busca-prof').value.trim());
  $('erro-escolha-prof').textContent = '';
  if (pedaco.length < 2) { $('lista-prof').innerHTML = ''; $('erro-escolha-prof').textContent = 'Digite pelo menos 2 letras do nome do professor. 🔍'; SOM.errado(); return; }
  $('lista-prof').innerHTML = '<p class="quiz-status carregando">Buscando os professores…</p>';
  await carregarEmails();
  if ($('escolha-prof').hidden) return;
  const achados = listaEmails().filter((x) => semAcento(x.nome).includes(pedaco));
  $('lista-prof').innerHTML = achados.length
    ? `<p class="lista-prof-titulo">Toque no professor:</p>${achados.map((x) => `<button class="quiz-item prof-achado" type="button" data-email="${seguro(x.email)}">📧 ${seguro(x.nome)}</button>`).join('')}`
    : `<p class="quiz-status">Nenhum professor com "${seguro($('busca-prof').value.trim())}". Confira o nome com o professor.</p>`;
  if (achados.length) SOM.clique(); else SOM.errado();
}

// traz a aba "E-mails" da planilha (ao abrir o jogo)
// (se já está buscando, espera a mesma busca em vez de começar outra)
let buscandoEmails = null;
function carregarEmails() {
  if (!URL_RELATORIO) return Promise.resolve();
  if (!buscandoEmails) {
    buscandoEmails = lerDoScript('emails')
      .then(({ emails }) => gravarJSON(CHAVE_EMAILS, emails || []))
      .catch(() => { /* sem internet: usa a cópia */ })
      .finally(() => { buscandoEmails = null; });
  }
  return buscandoEmails;
}

// antes de abrir o jogo escolhido, o aluno escolhe para quem vai o relatório (a última escolha já vem marcada)
let depoisDaEscolha = null;
function escolherProfessorE(nomeDoJogo, abrirJogo) {
  if (!listaEmails().length || lerTokenTeste()) { abrirJogo(); return; }   // planilha sem e-mails, ou teste grátis: abre direto
  desenharEscolhaEmail();
  depoisDaEscolha = abrirJogo;
  $('escolha-prof-titulo').textContent = `📧 ${nomeDoJogo}`;
  $('busca-prof-rotulo').textContent = `Para quem vai o relatório do ${nomeDoJogo === 'Questionário da aula' ? 'questionário' : 'jogo'}?`;
  $('escolha-prof-cancelar').hidden = !!QUIZ_DO_LINK;
  $('erro-escolha-prof').textContent = '';
  $('escolha-prof').hidden = false;
  setTimeout(() => $('busca-prof').focus(), 100);
}
// escolheu (um professor ou "nenhum"): guarda a escolha e abre o jogo
function escolherEmail(email) {
  emailEscolhido = email;
  try { localStorage.setItem(CHAVE_EMAIL_ESCOLHIDO, emailEscolhido); } catch (err) { /* sem armazenamento */ }
  $('escolha-prof').hidden = true;
  SOM.clique();
  const abrir = depoisDaEscolha;
  depoisDaEscolha = null;
  if (abrir) abrir();
}
$('form-escolha-prof').onsubmit = (e) => { e.preventDefault(); buscarProfessor(); };
$('lista-prof').onclick = (e) => { const b = e.target.closest('.prof-achado'); if (b) escolherEmail(b.dataset.email); };
$('btn-prof-ultimo').onclick = () => escolherEmail(emailEscolhido);
$('escolha-prof-sem').onclick = () => escolherEmail('nenhum');
$('escolha-prof-cancelar').onclick = () => { $('escolha-prof').hidden = true; depoisDaEscolha = null; };

// Área do professor: senha → menu com dois botões → a parte escolhida (e-mails ou questionários)
function parteProfessor(qual) {
  $('menu-professor').hidden = qual !== 'menu';
  $('painel-usuarios').hidden = qual !== 'usuarios';
  $('painel-turmas').hidden = qual !== 'turmas';
  $('painel-dados').hidden = qual !== 'dados';
  $('painel-testes').hidden = qual !== 'testes';
  $('form-trocar-senha').hidden = qual !== 'senha';
  $('prof-sessao').hidden = !usuarioLogado || qual === 'nenhuma';
  $('info-emails').hidden = qual !== 'emails';
  $('painel-questionarios').hidden = qual !== 'quiz';
  $('painel-links').hidden = qual !== 'links';
  $('painel-competicoes').hidden = qual !== 'comp';
  $('painel-escolas').hidden = qual !== 'escolas';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Área do professor: com o login guardado no aparelho, entra direto; senão, pede e-mail e senha
async function telaProfessor() {
  $('form-senha-professor').hidden = true;
  parteProfessor('nenhuma');
  $('erro-professor').textContent = '';
  mostrar('tela-professor');
  if (lerToken()) {
    try { entrarComo((await api('/sessions/eu')).usuario); return; } catch (err) { if (err.codigo === 'escola_bloqueada') $('erro-professor').textContent = `🔒 ${err.message}`; }
  }
  usuarioLogado = null;
  $('form-senha-professor').hidden = false;
  $('professor-senha').value = '';
  setTimeout(() => $('professor-email').focus(), 300);
}

// o menu de cada perfil: o administrador cuida das escolas e dos usuários; a coordenação tem tudo do professor
// e mais os usuários da escola; o professor, os e-mails, questionários, competições e links
const CARTOES_DO_PERFIL = {
  admin: ['btn-prof-escolas', 'btn-prof-usuarios', 'btn-prof-testes'],
  coordenacao: ['btn-prof-turmas', 'btn-prof-emails', 'btn-prof-quiz', 'btn-prof-comp', 'btn-prof-links', 'btn-prof-usuarios'],
  professor: ['btn-prof-turmas', 'btn-prof-emails', 'btn-prof-quiz', 'btn-prof-comp', 'btn-prof-links'],
};
const NOME_DO_PERFIL = { admin: 'Administrador', coordenacao: 'Coordenação', professor: 'Professor' };
function entrarComo(usuario) {
  usuarioLogado = usuario;
  $('form-senha-professor').hidden = true;
  $('prof-sessao-nome').textContent = usuario.adminNaEscola
    ? `👋 ${usuario.nome} · Administrador dentro da escola ${usuario.escola ? usuario.escola.nome : ''}`
    : `👋 ${usuario.nome} · ${NOME_DO_PERFIL[usuario.perfil]}${usuario.escola ? ` · ${usuario.escola.nome}` : ''}`;
  $('btn-prof-sair-escola').hidden = !usuario.adminNaEscola;
  document.querySelectorAll('#menu-professor .jogo-card').forEach((c) => { c.hidden = !CARTOES_DO_PERFIL[usuario.perfil].includes(c.id); });
  if (usuario.primeiro_login) { abrirTrocaDeSenha(true); return; }
  parteProfessor('menu');
  if (usuario.perfil !== 'admin') carregarEmails();   // já deixa a lista atualizada para quando abrir os e-mails
}
const usuarioAtual = () => usuarioLogado;

// troca de senha: obrigatória no primeiro acesso (a senha veio de quem cadastrou)
function abrirTrocaDeSenha(obrigatoria) {
  $('form-trocar-senha').reset();
  $('trocar-senha-aviso').textContent = obrigatoria ? 'Primeiro acesso: crie a sua senha (8 caracteres ou mais).' : '';
  $('btn-trocar-senha-voltar').hidden = obrigatoria;
  parteProfessor('senha');
  setTimeout(() => $('senha-atual').focus(), 300);
}
$('form-trocar-senha').onsubmit = async (e) => {
  e.preventDefault();
  if ($('senha-nova').value !== $('senha-nova2').value) { $('trocar-senha-aviso').textContent = 'As duas senhas novas não são iguais.'; SOM.errado(); return; }
  $('trocar-senha-aviso').textContent = 'Salvando…';
  try {
    await api('/usuarios/eu/senha', { metodo: 'PUT', corpo: { senhaAtual: $('senha-atual').value, novaSenha: $('senha-nova').value } });
    SOM.certo();
    usuarioLogado.primeiro_login = false;
    entrarComo(usuarioLogado);
  } catch (err) { $('trocar-senha-aviso').textContent = err.message; SOM.errado(); }
};
$('btn-trocar-senha-voltar').onclick = () => { SOM.clique(); parteProfessor('menu'); };
$('btn-prof-senha').onclick = () => { SOM.clique(); abrirTrocaDeSenha(false); };
$('btn-prof-sair').onclick = () => { SOM.clique(); guardarToken(''); definirEscolaDoAdmin(''); usuarioLogado = null; telaProfessor(); };
// o administrador sai da escola em que entrou e volta ao menu de administrador
$('btn-prof-sair-escola').onclick = () => { SOM.clique(); definirEscolaDoAdmin(''); telaProfessor(); };

// carregando: mostra o reloginho animado enquanto espera a planilha
function avisoEmail(texto, ok, carregando = false) {
  $('aviso-email').textContent = texto;
  $('aviso-email').classList.toggle('aviso-ok', !!ok);
  $('aviso-email').classList.toggle('carregando', carregando);
}
const mensagemDoErro = (err, padrao) => ({
  senha: 'A planilha não aceitou a senha: confira se a SENHA_PLANILHA do servidor é a mesma SENHA_PROFESSOR do script do Google.',
  login: 'O seu login venceu. Toque em Sair e entre de novo.',
  escola_bloqueada: 'O acesso desta escola está bloqueado (teste grátis encerrado).',
  email: 'Digite um e-mail válido, como nome@escola.com.',
  repetido: 'Este e-mail já está na lista.',
  internet: 'Sem internet agora. Tente de novo quando a conexão voltar.',
  acesso: 'A planilha desta escola não respondeu: ela pode não estar liberada. No Apps Script dela: Implantar → Gerenciar implantações → ✏️ → "Quem pode acessar: Qualquer pessoa" → Nova versão → Implantar.',
}[String(err && err.message)] || padrao);

// lista de professores: só os nomes (o e-mail dos colegas não aparece); excluir, só direto na planilha
function listarEmailsProfessor() {
  const lista = listaEmails();
  $('lista-emails-prof').innerHTML = lista.length ? '' : '<p class="quiz-status">Nenhum e-mail ainda: cadastre o primeiro aqui em cima.</p>';
  for (const x of lista) {
    const item = document.createElement('div');
    item.className = 'quiz-item';
    item.innerHTML = `<span class="quiz-item-nome">📧 ${seguro(x.nome)}</span>`;
    $('lista-emails-prof').append(item);
  }
}

$('form-novo-email').onsubmit = async (e) => {
  e.preventDefault();
  const nome = $('novo-email-nome').value.trim();
  const email = $('novo-email-email').value.trim().toLowerCase();
  avisoEmail('Salvando na planilha…', false, true);
  try {
    const { emails } = await gravarComoProfessor({ acao: 'adicionarEmail', nome, email });
    gravarJSON(CHAVE_EMAILS, emails || []);
    $('novo-email-nome').value = '';
    $('novo-email-email').value = '';
    listarEmailsProfessor();
    SOM.certo();
    avisoEmail(`${nome || email} entrou na lista! Os alunos já podem escolher. ✔`, true);
  } catch (err) { avisoEmail(mensagemDoErro(err, 'Não deu para salvar (sem internet ou script desatualizado).')); }
};

// login com e-mail e senha (a API confere; o app não guarda nenhuma senha)
$('form-senha-professor').onsubmit = async (e) => {
  e.preventDefault();
  $('erro-professor').textContent = 'Entrando…';
  try {
    const { token, usuario } = await api('/sessions', { metodo: 'POST', corpo: { email: $('professor-email').value.trim(), senha: $('professor-senha').value } });
    guardarToken(token);
    SOM.certo();
    $('erro-professor').textContent = '';
    entrarComo(usuario);
  } catch (err) {
    $('erro-professor').textContent = `${err.message} 🔒`;
    SOM.errado();
  }
};

$('btn-prof-emails').onclick = async () => {
  SOM.clique();
  avisoEmail('');
  $('novo-email-nome').value = '';
  $('novo-email-email').value = '';
  parteProfessor('emails');
  listarEmailsProfessor();
  await carregarEmails();
  listarEmailsProfessor();
};
$('btn-prof-quiz').onclick = () => {
  SOM.clique();
  avisoQuiz('');
  $('aviso-link').textContent = '';
  parteProfessor('quiz');
  listarQuestionariosProfessor();
};
document.querySelectorAll('.prof-voltar').forEach((b) => { b.onclick = () => parteProfessor('menu'); });

// ---------- Questionários da aula: cadastro pelo professor ----------
function avisoQuiz(texto, ok, carregando = false) {
  $('aviso-quiz').textContent = texto;
  $('aviso-quiz').classList.toggle('aviso-ok', !!ok);
  $('aviso-quiz').classList.toggle('carregando', carregando);
}

async function listarQuestionariosProfessor() {
  const caixa = $('lista-quiz-prof');
  caixa.innerHTML = '<p class="quiz-status carregando">Buscando questionários…</p>';
  try {
    const { lista } = await lerDoScript('questionarios');
    gravarJSON(CHAVE_QUIZ_LISTA, lista);
    caixa.innerHTML = lista.length ? '' : '<p class="quiz-status">Nenhum questionário ainda. Crie o primeiro em ➕ Novo questionário, aqui em cima!</p>';
    for (const q of lista) {
      const item = document.createElement('div');
      item.className = 'quiz-item';
      item.innerHTML = `<span class="quiz-item-nome">${seguro(q.titulo)}</span><span class="quiz-item-qtd">${q.perguntas} pergunta${q.perguntas === 1 ? '' : 's'}</span>`;
      const copiar = document.createElement('button');
      copiar.type = 'button';
      copiar.className = 'quiz-link';
      copiar.textContent = '🔗 Copiar link';
      copiar.onclick = () => copiarLinkQuestionario(q);
      item.append(copiar);   // excluir questionário, só direto na planilha (apagando a aba)
      caixa.append(item);
    }
  } catch (e) {
    caixa.innerHTML = '<p class="quiz-status">Não deu para buscar os questionários (sem internet ou script desatualizado).</p>';
  }
}

// link que abre direto um questionário (o aluno não vê os outros jogos): endereço do jogo + ?q=<id da aba>
// ---------- Links dos jogos: ?jogo=<id> abre direto naquele jogo (os de fora usam o próprio endereço) ----------
const JOGOS_DO_LINK = {
  ortografia: { nome: 'Jogo de Ortografia', abrir: () => telaMissoes() },
  chuva: { nome: 'Chuva de Erros', abrir: () => telaChuvaMenu() },
  matematica: { nome: 'Chuva de Matemática', abrir: () => telaMatMenu() },
  tiro: { nome: 'Tiro Certo', abrir: () => telaTiroMenu() },
  peso: { nome: 'Peso Certo', abrir: () => telaPesoMenu() },
  reflexo: { nome: 'Jogo do Reflexo', abrir: () => telaLuzesMenu(1) },
  reflexo2: { nome: 'Jogo do Reflexo Nível 2', abrir: () => telaLuzesMenu(2) },
  rotina: { nome: 'Rotina Certa', abrir: () => telaRotinaMenu() },
  fichas: { nome: 'Fichas Coloridas', abrir: () => telaFichasMenu() },
  escondida: { nome: 'Palavra Escondida', abrir: () => telaEscondidaMenu() },
  copia: { nome: 'Copie Certo', abrir: () => telaCopiaMenu() },
  barcos: { nome: 'Barquinhos', abrir: () => telaBarcosMenu() },
  giro: { nome: 'Giro Imaginário', abrir: () => telaGiroMenu() },
  hora: { nome: 'Jogo da Hora', abrir: () => telaHoraMenu() },
  somando: { nome: 'Somando Imagens', abrir: () => telaSomandoMenu() },
  descobrir: { nome: 'Descobrindo o Peso', abrir: () => telaDescobrirMenu() },
  chaves: { nome: 'Chaves de Sobreposição', abrir: () => telaChavesMenu() },
  caminho: { nome: 'Caminho da Memória', abrir: () => telaCaminhoMenu() },
  taxi: { nome: 'Siga o Táxi', abrir: () => telaTaxiMenu() },
  policia: { nome: 'Polícia e Ladrão', abrir: () => telaPoliciaMenu() },
  pontos: { nome: 'Ponto a Ponto', abrir: () => telaPontosMenu() },
  pixels: { nome: 'Quebra-Cabeça de Pixels', abrir: () => telaPixelsMenu() },
  fracoes: { nome: 'Pizzaria das Frações', abrir: () => telaFracoesMenu() },
  cores: { nome: 'Somando as Cores', abrir: () => telaCoresMenu() },
  lados: { nome: 'Esquerda e Direita', abrir: () => telaLadosMenu() },
  setas: { nome: 'Setas e Cores', abrir: () => telaSetasMenu() },
  vistas: { nome: 'De Lado e de Cima', abrir: () => telaVistasMenu() },
  dinos: { nome: 'Memória dos Dinossauros', abrir: () => telaDinosMenu() },
  forma: { nome: 'Atenção à Forma', abrir: () => telaSimbolosMenu() },
  tabuada: { nome: 'Tetris da Tabuada', abrir: () => telaTabuadaMenu() },
  classes: { nome: 'Classes de Palavras', abrir: () => telaClassesMenu() },
  graficos: { nome: 'Jogo dos Gráficos', abrir: () => telaGraficosMenu() },
};
const JOGOS_DE_FORA = [
  { nome: 'ABC da Tia Ana', link: 'https://abcdaana.vercel.app/' },
  { nome: 'Desafio da Rotina', link: 'https://routinesgame.vercel.app/' },
  { nome: 'Desafio das Peças', link: 'https://nagila.vercel.app/' },
  { nome: 'Hive', link: 'https://hive-alpha-smoky.vercel.app/' },
];
// os links dos jogos e dos questionários abrem com a marca da escola de quem está logado (mesmo que ele tenha aberto o
// app pela plataforma): /<escola>?jogo=...; sem escola (administrador, professor avulso), o endereço da plataforma.
// No GitHub Pages não há o nginx que entende /<escola>: lá vai ?escola=<escola>.
function linkDoApp(parametro) {
  const escola = usuarioLogado?.escola?.id || '';
  if (location.hostname.endsWith('github.io')) {
    const pasta = location.pathname.replace(/[^/]*$/, '');
    return `${location.origin}${pasta}?${escola ? `escola=${encodeURIComponent(escola)}&` : ''}${parametro}`;
  }
  return `${location.origin}/${escola ? encodeURIComponent(escola) : ''}?${parametro}`;
}
function listarLinksJogos() {
  $('aviso-link-jogo').textContent = '';
  const jogos = [
    ...Object.entries(JOGOS_DO_LINK).map(([id, j]) => ({ nome: j.nome, link: linkDoApp(`jogo=${id}`) })),
    ...JOGOS_DE_FORA.map((j) => ({ ...j, nome: `${j.nome} ↗` })),
  ];
  $('lista-links-jogos').innerHTML = '';
  for (const j of jogos) {
    const item = document.createElement('div');
    item.className = 'quiz-item';
    item.innerHTML = `<span class="quiz-item-nome">${seguro(j.nome)}</span>`;
    const copiar = document.createElement('button');
    copiar.type = 'button';
    copiar.className = 'quiz-link';
    copiar.textContent = '🔗 Copiar link';
    copiar.onclick = async () => {
      try {
        await navigator.clipboard.writeText(j.link);
        $('aviso-link-jogo').textContent = `Link de "${j.nome.replace(' ↗', '')}" copiado! Cole no WhatsApp, e-mail ou mural da turma: ${j.link}`;
        $('aviso-link-jogo').classList.add('aviso-ok');
      } catch (e) { window.prompt(`Copie o link de "${j.nome}":`, j.link); }
    };
    item.append(copiar);
    $('lista-links-jogos').append(item);
  }
}
$('btn-prof-links').onclick = () => { SOM.clique(); parteProfessor('links'); listarLinksJogos(); };

const linkDoQuestionario = (id) => linkDoApp(`q=${encodeURIComponent(id)}`);
async function copiarLinkQuestionario(q) {
  const link = linkDoQuestionario(q.id);
  try {
    await navigator.clipboard.writeText(link);
    // o aviso fica logo abaixo da lista (o de "Novo questionário" pode estar fechado)
    $('aviso-link').textContent = `Link de "${q.titulo}" copiado! Cole no WhatsApp, e-mail ou mural da turma: ${link}`;
    $('aviso-link').classList.add('aviso-ok');
  } catch (e) {
    window.prompt(`Copie o link de "${q.titulo}":`, link);
  }
}

// editor de perguntas: um bloco por pergunta (1 certa e até 3 erradas)
function blocoPergunta(q = { pergunta: '', certa: '', erradas: [] }) {
  const div = document.createElement('div');
  div.className = 'quiz-bloco';
  const n = $('quiz-editor').children.length + 1;
  div.innerHTML = `<div class="quiz-bloco-topo"><span>Pergunta ${n}</span><button class="quiz-tirar" type="button">✕ tirar</button></div>
      <input class="q-pergunta" maxlength="300" placeholder="Pergunta" value="${seguro(q.pergunta)}">
      <input class="q-certa certa" maxlength="160" placeholder="✔ Resposta certa" value="${seguro(q.certa)}">
      ${[0, 1, 2].map((i) => `<input class="q-errada errada" maxlength="160" placeholder="✘ Resposta errada ${i + 1}" value="${seguro(q.erradas[i] || '')}">`).join('')}`;
  div.querySelector('.quiz-tirar').onclick = () => { div.remove(); renumerarPerguntas(); };
  $('quiz-editor').append(div);
}
function renumerarPerguntas() {
  [...$('quiz-editor').children].forEach((b, i) => { b.querySelector('.quiz-bloco-topo span').textContent = `Pergunta ${i + 1}`; });
}
$('btn-quiz-mais').onclick = () => blocoPergunta();

// planilha enviada pelo professor: A pergunta, B certa, C a E erradas (a primeira linha pode ser cabeçalho)
function linhasParaPerguntas(linhas) {
  const limpas = linhas.map((l) => (l || []).map((c) => String(c == null ? '' : c).trim()));
  if (limpas.length && /pergunta/i.test(limpas[0][0] || '')) limpas.shift();
  return limpas.filter((l) => l[0] && l[1] && (l[2] || l[3] || l[4]))
    .filter((l) => !(/^pergunta$/i.test(l[0]) && /resposta|certa/i.test(l[1])))   // cabeçalho repetido
    .map((l) => ({ pergunta: l[0], certa: l[1], erradas: [l[2], l[3], l[4]].filter(Boolean) }));
}
function lerCSV(texto) {
  const sep = (texto.split('\n')[0].match(/;/g) || []).length > (texto.split('\n')[0].match(/,/g) || []).length ? ';' : texto.includes('\t') ? '\t' : ',';
  const linhas = [];
  let linha = [], campo = '', aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && texto[i + 1] === '\n') i++; linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}
// a biblioteca de planilhas (.xlsx) só é baixada quando o professor envia uma
function carregarLeitorXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => ok(window.XLSX);
    s.onerror = falha;
    document.head.append(s);
  });
}
$('quiz-arquivo').onchange = async (e) => {
  const arquivo = e.target.files[0];
  if (!arquivo) return;
  avisoQuiz('Lendo a planilha…', false, true);
  try {
    let linhas;
    if (/\.(csv|txt)$/i.test(arquivo.name)) linhas = lerCSV(await arquivo.text());
    else {
      const XLSX = await carregarLeitorXLSX();
      const livro = XLSX.read(await arquivo.arrayBuffer(), { type: 'array' });
      linhas = XLSX.utils.sheet_to_json(livro.Sheets[livro.SheetNames[0]], { header: 1, defval: '' });
    }
    const perguntas = linhasParaPerguntas(linhas);
    if (!perguntas.length) { avisoQuiz('Não achei perguntas: confira as colunas (A pergunta, B certa, C a E erradas).'); return; }
    $('quiz-editor').innerHTML = '';
    perguntas.forEach((q) => blocoPergunta(q));
    if (!$('quiz-nome').value.trim()) $('quiz-nome').value = arquivo.name.replace(/\.[^.]+$/, '');
    avisoQuiz(`${perguntas.length} pergunta${perguntas.length === 1 ? '' : 's'} lida${perguntas.length === 1 ? '' : 's'}. Confira abaixo e toque em Salvar.`, true);
  } catch (err) {
    avisoQuiz('Não consegui ler o arquivo. Use .xlsx ou .csv (e internet para .xlsx).');
  }
  e.target.value = '';
};

$('btn-quiz-salvar').onclick = async () => {
  const titulo = $('quiz-nome').value.trim();
  if (!titulo) { avisoQuiz('Dê um nome ao questionário.'); $('quiz-nome').focus(); return; }
  const perguntas = [...$('quiz-editor').children].map((b) => ({
    pergunta: b.querySelector('.q-pergunta').value.trim(),
    certa: b.querySelector('.q-certa').value.trim(),
    erradas: [...b.querySelectorAll('.q-errada')].map((i) => i.value.trim()).filter(Boolean),
  })).filter((q) => q.pergunta || q.certa);
  const incompleta = perguntas.findIndex((q) => !q.pergunta || !q.certa || !q.erradas.length);
  if (!perguntas.length) { avisoQuiz('Adicione pelo menos uma pergunta.'); return; }
  if (incompleta >= 0) { avisoQuiz(`A pergunta ${incompleta + 1} precisa do texto, da resposta certa e de pelo menos uma errada.`); return; }
  avisoQuiz('Salvando na planilha…', false, true);
  try {
    await gravarComoProfessor({ acao: 'salvarQuestionario', titulo, perguntas });
    SOM.certo();
    avisoQuiz(`Questionário "${titulo}" salvo! Os alunos já podem jogar. ✔`, true);
    $('quiz-nome').value = '';
    $('quiz-editor').innerHTML = '';
    listarQuestionariosProfessor();
  } catch (err) {
    avisoQuiz(mensagemDoErro(err, 'Não deu para salvar (sem internet ou script desatualizado). Tente de novo.'));
  }
};

$('btn-professor').onclick = () => { SOM.clique(); telaProfessor(); };
$('professor-voltar').onclick = telaInicio;

export { carregarEmails, definirEmailCompeticao, emailDoRelatorio, escolherProfessorE, gravarComoProfessor, gravarJSON, gravarNoScript, jogoDaMissao, JOGOS_DO_LINK, lerDoScript, lerJSON, listaEmails, parteProfessor, telaProfessor, usuarioAtual };
