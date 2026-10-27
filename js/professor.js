/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Área do professor e planilha (Google Apps Script): e-mails do relatório, questionários, links dos jogos e leitura de CSV/XLSX. */

import { $, seguro } from './util.js?v=98';
import { SOM } from './som.js?v=98';
import { mostrar, telaInicio } from './telas.js?v=98';
import { telaMissoes } from './ortografia.js?v=98';
import { telaChuvaMenu } from './chuva.js?v=98';
import { telaMatMenu } from './matematica.js?v=98';
import { telaTiroMenu } from './tiro.js?v=98';
import { telaPesoMenu } from './peso.js?v=98';
import { CHAVE_QUIZ_LISTA, QUIZ_DO_LINK } from './quiz.js?v=98';
import { telaLuzesMenu } from './luzes.js?v=98';
import { telaRotinaMenu } from './rotina.js?v=98';
import { telaFichasMenu } from './fichas.js?v=98';
import { telaEscondidaMenu } from './escondida.js?v=98';
import { telaCopiaMenu } from './copia.js?v=98';
import { telaBarcosMenu } from './barcos.js?v=98';
import { telaGiroMenu } from './giro.js?v=98';
import { telaHoraMenu } from './hora.js?v=98';
import { telaSomandoMenu } from './somando.js?v=98';
import { telaCoresMenu } from './cores.js?v=98';
import { telaLadosMenu } from './lados.js?v=98';
import { telaSetasMenu } from './setas.js?v=98';
import { telaVistasMenu } from './vistas.js?v=98';
import { telaDinosMenu } from './dinos.js?v=98';
import { telaSimbolosMenu } from './simbolos.js?v=98';
import { telaTabuadaMenu } from './tabuada.js?v=98';
import { telaClassesMenu } from './classes.js?v=98';
import { telaGraficosMenu } from './graficos.js?v=98';
import { CHAVE_RELATORIO, URL_RELATORIO } from './relatorio.js?v=98';

// ---------- Para quem vai o relatório: lista da aba "E-mails" da planilha ----------
// O app não cadastra e-mails: a lista vem da planilha do Google (pelo script ferramentas/relatorio-email.gs)
// e o aluno escolhe, ao entrar, para qual professor vai o relatório. O aparelho guarda uma cópia da lista
// (para funcionar sem internet) e lembra a última escolha.
const SENHA_PROFESSOR = 'app0707';   // conferida aqui (para os alunos não mexerem) e de novo no script
const CHAVE_EMAILS = 'pleno-ortografia:emails';                    // cópia da aba "E-mails" [{ nome, email }]
const CHAVE_EMAIL_ESCOLHIDO = 'pleno-ortografia:email-escolhido';  // e-mail escolhido, ou 'nenhum'
let senhaProfessor = '';   // a senha digitada, mandada ao script para gravar questionários
const lerJSON = (chave, padrao) => { try { return JSON.parse(localStorage.getItem(chave)) || padrao; } catch (e) { return padrao; } };
const gravarJSON = (chave, valor) => { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ } };
const jogoDaMissao = (mis) => (mis.quiz ? 'questionario' : mis.somando ? 'somando' : mis.hora ? 'hora' : mis.giro ? 'giro' : mis.barcos ? 'barcos' : mis.copia ? 'copia' : mis.escondida ? 'escondida' : mis.setas ? 'setas' : mis.vistas ? 'vistas' : mis.dinos ? 'dinos' : mis.simbolos ? 'simbolos' : mis.tabuada ? 'tabuada' : mis.classes ? 'classes' : mis.graficos ? 'graficos' : mis.cores ? 'cores' : mis.lados ? 'lados' : mis.fichas ? 'fichas' : mis.rotina ? 'rotina' : mis.luzes ? 'reflexo' : mis.peso ? 'peso' : mis.tiro ? 'tiro' : mis.matematica ? 'matematica' : mis.chuva ? 'chuva' : 'ortografia');
let emailEscolhido = (() => { try { return localStorage.getItem(CHAVE_EMAIL_ESCOLHIDO) || ''; } catch (e) { return ''; } })();
const listaEmails = () => lerJSON(CHAVE_EMAILS, []);
// o e-mail para onde vai o relatório (só se estiver na lista da planilha)
const emailDoRelatorio = () => (listaEmails().some((x) => x.email === emailEscolhido) ? emailEscolhido : '');

// conversa com o script do Google: leituras por GET, gravações (com a senha) por POST
async function lerDoScript(acao, extra = '') {
  const r = await fetch(`${URL_RELATORIO}?acao=${acao}${extra}`);
  const j = await r.json();
  if (!j.ok) throw new Error(j.erro || 'erro');
  return j;
}
async function gravarNoScript(dados) {
  const r = await fetch(URL_RELATORIO, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ chave: CHAVE_RELATORIO, senha: senhaProfessor, ...dados }) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.erro || 'erro');
  return j;
}

// lista de professores da janela que aparece antes de cada jogo
function desenharEscolhaEmail() {
  const lista = listaEmails();
  if (lista.length === 1 && !emailEscolhido) emailEscolhido = lista[0].email;   // só um professor: já vem escolhido
  $('login-professor').innerHTML = '<option value="">Escolha o professor…</option>'
    + lista.map((x) => `<option value="${seguro(x.email)}">${seguro(x.nome)}</option>`).join('')
    + '<option value="nenhum">Não enviar relatório</option>';
  $('login-professor').value = emailEscolhido === 'nenhum' || lista.some((x) => x.email === emailEscolhido) ? emailEscolhido : '';
}

// traz a aba "E-mails" da planilha (ao abrir o jogo)
async function carregarEmails() {
  if (!URL_RELATORIO) return;
  try { const { emails } = await lerDoScript('emails'); gravarJSON(CHAVE_EMAILS, emails || []); } catch (e) { /* sem internet: usa a cópia */ }
}

// antes de abrir o jogo escolhido, o aluno escolhe para quem vai o relatório (a última escolha já vem marcada)
let depoisDaEscolha = null;
function escolherProfessorE(nomeDoJogo, abrirJogo) {
  if (!listaEmails().length) { abrirJogo(); return; }   // planilha sem e-mails: abre direto
  desenharEscolhaEmail();
  depoisDaEscolha = abrirJogo;
  $('escolha-prof-titulo').textContent = `📧 ${nomeDoJogo}: para quem vai o relatório?`;
  $('escolha-prof-cancelar').hidden = !!QUIZ_DO_LINK;
  $('erro-escolha-prof').textContent = '';
  $('escolha-prof').hidden = false;
  $('login-professor').focus();
}
$('form-escolha-prof').onsubmit = (e) => {
  e.preventDefault();
  if (!$('login-professor').value) { $('erro-escolha-prof').textContent = 'Escolha um professor. 📧'; SOM.errado(); return; }
  emailEscolhido = $('login-professor').value;
  try { localStorage.setItem(CHAVE_EMAIL_ESCOLHIDO, emailEscolhido); } catch (err) { /* sem armazenamento */ }
  $('escolha-prof').hidden = true;
  SOM.clique();
  const abrir = depoisDaEscolha;
  depoisDaEscolha = null;
  if (abrir) abrir();
};
$('escolha-prof-cancelar').onclick = () => { $('escolha-prof').hidden = true; depoisDaEscolha = null; };

// Área do professor: senha → menu com dois botões → a parte escolhida (e-mails ou questionários)
function parteProfessor(qual) {
  $('menu-professor').hidden = qual !== 'menu';
  $('info-emails').hidden = qual !== 'emails';
  $('painel-questionarios').hidden = qual !== 'quiz';
  $('painel-links').hidden = qual !== 'links';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function telaProfessor() {
  $('form-senha-professor').hidden = false;
  parteProfessor('nenhuma');
  $('professor-senha').value = '';
  $('erro-professor').textContent = '';
  mostrar('tela-professor');
  setTimeout(() => $('professor-senha').focus(), 300);
}

// carregando: mostra o reloginho animado enquanto espera a planilha
function avisoEmail(texto, ok, carregando = false) {
  $('aviso-email').textContent = texto;
  $('aviso-email').classList.toggle('aviso-ok', !!ok);
  $('aviso-email').classList.toggle('carregando', carregando);
}
const mensagemDoErro = (err, padrao) => ({
  senha: 'A planilha não aceitou a senha: confira a SENHA_PROFESSOR no script do Google.',
  email: 'Digite um e-mail válido, como nome@escola.com.',
  repetido: 'Este e-mail já está na lista.',
}[String(err && err.message)] || padrao);

// lista de professores com o botão de remover (grava direto na aba "E-mails")
function listarEmailsProfessor() {
  const lista = listaEmails();
  $('lista-emails-prof').innerHTML = lista.length ? '' : '<p class="quiz-status">Nenhum e-mail ainda: cadastre o primeiro aqui em cima.</p>';
  for (const x of lista) {
    const item = document.createElement('div');
    item.className = 'quiz-item';
    item.innerHTML = `<span class="quiz-item-nome">${seguro(x.nome)}</span><span class="quiz-item-qtd">${seguro(x.email)}</span>`;
    const remover = document.createElement('button');
    remover.type = 'button';
    remover.className = 'quiz-excluir';
    remover.textContent = '🗑️ Remover';
    remover.onclick = async () => {
      if (!window.confirm(`Remover ${x.nome} (${x.email}) da lista? Os alunos não poderão mais mandar relatórios para este e-mail.`)) return;
      try {
        const { emails } = await gravarNoScript({ acao: 'removerEmail', email: x.email });
        gravarJSON(CHAVE_EMAILS, emails || []);
        listarEmailsProfessor();
        avisoEmail(`${x.nome} saiu da lista. ✔`, true);
      } catch (err) { avisoEmail(mensagemDoErro(err, 'Não deu para remover (sem internet ou script desatualizado).')); }
    };
    item.append(remover);
    $('lista-emails-prof').append(item);
  }
}

$('form-novo-email').onsubmit = async (e) => {
  e.preventDefault();
  const nome = $('novo-email-nome').value.trim();
  const email = $('novo-email-email').value.trim().toLowerCase();
  avisoEmail('Salvando na planilha…', false, true);
  try {
    const { emails } = await gravarNoScript({ acao: 'adicionarEmail', nome, email });
    gravarJSON(CHAVE_EMAILS, emails || []);
    $('novo-email-nome').value = '';
    $('novo-email-email').value = '';
    listarEmailsProfessor();
    SOM.certo();
    avisoEmail(`${nome || email} entrou na lista! Os alunos já podem escolher. ✔`, true);
  } catch (err) { avisoEmail(mensagemDoErro(err, 'Não deu para salvar (sem internet ou script desatualizado).')); }
};

$('form-senha-professor').onsubmit = async (e) => {
  e.preventDefault();
  if ($('professor-senha').value.trim() !== SENHA_PROFESSOR) {
    $('erro-professor').textContent = 'Senha incorreta. 🔒';
    SOM.errado();
    return;
  }
  SOM.certo();
  senhaProfessor = $('professor-senha').value.trim();
  $('form-senha-professor').hidden = true;
  parteProfessor('menu');
  carregarEmails();   // já deixa a lista atualizada para quando abrir os e-mails
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
      item.append(copiar);
      const apagar = document.createElement('button');
      apagar.type = 'button';
      apagar.className = 'quiz-excluir';
      apagar.textContent = '🗑️ Excluir';
      apagar.onclick = async () => {
        if (!window.confirm(`Excluir o questionário "${q.titulo}"? A aba dele será apagada da planilha.`)) return;
        try { await gravarNoScript({ acao: 'excluirQuestionario', id: q.id }); listarQuestionariosProfessor(); }
        catch (e) { avisoQuiz('Não deu para excluir (sem internet?). Tente de novo.'); }
      };
      item.append(apagar);
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
function listarLinksJogos() {
  $('aviso-link-jogo').textContent = '';
  const jogos = [
    ...Object.entries(JOGOS_DO_LINK).map(([id, j]) => ({ nome: j.nome, link: `${location.origin}${location.pathname}?jogo=${id}` })),
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

const linkDoQuestionario = (id) => `${location.origin}${location.pathname}?q=${encodeURIComponent(id)}`;
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
    await gravarNoScript({ acao: 'salvarQuestionario', titulo, perguntas });
    SOM.certo();
    avisoQuiz(`Questionário "${titulo}" salvo! Os alunos já podem jogar. ✔`, true);
    $('quiz-nome').value = '';
    $('quiz-editor').innerHTML = '';
    listarQuestionariosProfessor();
  } catch (err) {
    avisoQuiz(String(err.message) === 'senha' ? 'A planilha não aceitou a senha: confira a SENHA_PROFESSOR no script.' : 'Não deu para salvar (sem internet ou script desatualizado). Tente de novo.');
  }
};

$('btn-professor').onclick = () => { SOM.clique(); telaProfessor(); };
$('professor-voltar').onclick = telaInicio;

export { carregarEmails, emailDoRelatorio, escolherProfessorE, gravarJSON, jogoDaMissao, JOGOS_DO_LINK, lerDoScript, lerJSON, listaEmails, telaProfessor };
