/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Questionário da aula (lado do aluno). */

import { $, embaralhar, seguro, sortear } from './util.js?v=134';
import { aluno, definirMissao, definirResultados, resultados } from './estado.js?v=134';
import { SOM } from './som.js?v=134';
import { mascote, mostrar, telaInicio } from './telas.js?v=134';
import { escolherProfessorE, gravarJSON, lerDoScript, lerJSON } from './professor.js?v=134';
import { fimDaMissao, ultimoRelatorio, URL_RELATORIO } from './relatorio.js?v=134';

// ---------- Questionário da aula (aluno) ----------
// Os questionários vêm da planilha do professor (pelo script). Uma pergunta por vez, as respostas
// sempre embaralhadas; no fim, o resultado e o relatório. Fica uma cópia no aparelho para jogar sem internet.
const CHAVE_QUIZ_LISTA = 'pleno-ortografia:questionarios';
// aberto por um link de questionário (?q=<id>): o aluno vai direto para ele, sem ver os outros jogos
const QUIZ_DO_LINK = new URLSearchParams(location.search).get('q');
const JOGO_DO_LINK = new URLSearchParams(location.search).get('jogo');
let quizDoLinkAberto = false;
const chaveQuiz = (id) => `pleno-ortografia:questionario:${id}`;
let quiz = null;   // o questionário em andamento

async function telaQuizMenu() {
  quiz = null;
  mascote('davi-quiz', 'oi');
  mostrar('tela-quiz-menu');
  $('quiz-voltar').hidden = !!QUIZ_DO_LINK;
  const desenhar = (todos, aviso, carregando = false) => {
    const lista = QUIZ_DO_LINK ? todos.filter((q) => String(q.id) === QUIZ_DO_LINK) : todos;
    if (QUIZ_DO_LINK && !lista.length && !aviso) aviso = 'Este link não abre nenhum questionário: ele pode ter sido excluído. Peça um novo link ao professor.';
    $('quiz-status').textContent = aviso || (lista.length ? '' : 'O professor ainda não criou nenhum questionário.');
    $('quiz-status').classList.toggle('carregando', carregando);
    $('lista-quiz').innerHTML = '';
    for (const q of lista) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'quiz-item';
      b.innerHTML = `<span class="quiz-item-nome">📝 ${seguro(q.titulo)}</span><span class="quiz-item-qtd">${q.perguntas} pergunta${q.perguntas === 1 ? '' : 's'}</span>`;
      b.onclick = () => { SOM.clique(); comecarQuiz(q.id); };
      $('lista-quiz').append(b);
    }
  };
  const copia = lerJSON(CHAVE_QUIZ_LISTA, []);
  desenhar(copia, URL_RELATORIO ? 'Buscando questionários…' : 'Os questionários ainda não foram ligados no jogo.', !!URL_RELATORIO);
  if (!URL_RELATORIO) return;
  try {
    const { lista } = await lerDoScript('questionarios');
    gravarJSON(CHAVE_QUIZ_LISTA, lista);
    if ($('tela-quiz-menu').classList.contains('ativa')) desenhar(lista);
    // pelo link, o questionário já abre sozinho na primeira vez
    if (QUIZ_DO_LINK && !quizDoLinkAberto && lista.some((q) => String(q.id) === QUIZ_DO_LINK)) { quizDoLinkAberto = true; comecarQuiz(QUIZ_DO_LINK); }
  } catch (e) {
    desenhar(copia, copia.length ? 'Sem internet: mostrando os questionários salvos neste aparelho.' : 'Sem internet: não deu para buscar os questionários.');
  }
}

async function comecarQuiz(id) {
  $('quiz-status').textContent = 'Abrindo…';
  $('quiz-status').classList.add('carregando');
  let q = null;
  try { q = (await lerDoScript('questionario', `&id=${encodeURIComponent(id)}`)).questionario; gravarJSON(chaveQuiz(id), q); }
  catch (e) { q = lerJSON(chaveQuiz(id), null); }
  $('quiz-status').classList.remove('carregando');
  if (!q || !q.perguntas.length) { $('quiz-status').textContent = 'Não deu para abrir este questionário agora (sem internet?).'; return; }
  const regra = { id: 'quiz-' + q.id, titulo: q.titulo.slice(0, 40), icone: '📝', cor: '#7b4fc9',
    regra: 'Reveja estas perguntas com a turma: compare a resposta certa com a que o aluno marcou.' };
  definirMissao({ id: 'quiz-' + q.id, quiz: true, quizId: q.id, icone: '📝', cor: '#7b4fc9', titulo: `Questionário: ${q.titulo}` });
  definirResultados([]);
  quiz = { q, regra, idx: 0, acertos: 0 };
  $('quiz-titulo').textContent = `📝 ${q.titulo}`;
  mostrar('tela-quiz');
  mostrarPerguntaQuiz();
}

function mostrarPerguntaQuiz() {
  const { q, idx } = quiz;
  const p = q.perguntas[idx];
  $('quiz-contador').textContent = `${idx + 1} de ${q.perguntas.length}`;
  $('quiz-texto').textContent = p.pergunta;
  $('quiz-feedback').textContent = '';
  $('quiz-feedback').className = 'peso-msg';
  $('btn-quiz-proxima').hidden = true;
  $('quiz-opcoes').innerHTML = '';
  for (const resposta of embaralhar([p.certa, ...p.erradas])) {   // as respostas sempre embaralhadas
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'quiz-opcao';
    b.textContent = resposta;
    b.onclick = () => responderQuiz(resposta, b);
    $('quiz-opcoes').append(b);
  }
}

function responderQuiz(resposta, botao) {
  const p = quiz.q.perguntas[quiz.idx];
  const botoes = [...document.querySelectorAll('#quiz-opcoes .quiz-opcao')];
  botoes.forEach((b) => { b.disabled = true; });
  const acertou = resposta === p.certa;
  if (acertou) {
    quiz.acertos++;
    botao.classList.add('certa');
    $('quiz-feedback').textContent = `✔ ${sortear(ELOGIOS)}`;
    $('quiz-feedback').className = 'peso-msg certo';
    SOM.certo();
  } else {
    botao.classList.add('errada');
    botoes.forEach((b) => { if (b.textContent === p.certa) b.classList.add('certa'); else if (b !== botao) b.classList.add('apagada'); });
    $('quiz-feedback').textContent = `✘ A resposta certa é: ${p.certa}`;
    $('quiz-feedback').className = 'peso-msg erro';
    SOM.errado();
  }
  resultados.push({ m: quiz.regra, certa: `${p.pergunta} → ${p.certa}`, erros: acertou ? [] : [resposta] });
  $('btn-quiz-proxima').textContent = quiz.idx === quiz.q.perguntas.length - 1 ? 'Ver resultado ⭐' : 'Próxima ➜';
  $('btn-quiz-proxima').hidden = false;
  $('btn-quiz-proxima').focus({ preventScroll: true });
}

$('btn-quiz-proxima').onclick = () => {
  quiz.idx++;
  if (quiz.idx < quiz.q.perguntas.length) { mostrarPerguntaQuiz(); return; }
  const { acertos } = quiz, total = quiz.q.perguntas.length;
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Mandou muito bem!' : 'Questionário concluído!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${total} perguntas de "${quiz.q.titulo}"!`;
};

$('quiz-voltar').onclick = telaInicio;
$('quiz-sair').onclick = telaQuizMenu;

export { CHAVE_QUIZ_LISTA, comecarQuiz, JOGO_DO_LINK, QUIZ_DO_LINK, telaQuizMenu };
