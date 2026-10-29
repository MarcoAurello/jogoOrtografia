/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Estado compartilhado: o aluno logado, as estrelas salvas no aparelho e a partida em andamento (missao e resultados). */

// ---------- Aluno (nome + senha da turma) ----------
// A senha é conferida no próprio aparelho: é uma "portinha" para as crianças, não uma proteção real.
const SENHA_TURMA = 'alunoPleno';
const PEDIR_SENHA = false;   // por enquanto só o nome; troque para true para voltar a pedir a senha
const CHAVE_ALUNO = 'pleno-ortografia:aluno';
// sempre pede nome e senha ao abrir o jogo; o último nome já vem preenchido para facilitar
let aluno = null;
let ultimoNome = '';
try { ultimoNome = localStorage.getItem(CHAVE_ALUNO) || ''; } catch (e) { ultimoNome = ''; }

// ---------- Estrelas salvas no aparelho (separadas por aluno) ----------
const chaveEstrelas = () => 'pleno-ortografia:estrelas:' + (aluno || '').trim().toLowerCase();
const lerEstrelas = () => { try { return JSON.parse(localStorage.getItem(chaveEstrelas())) || {}; } catch (e) { return {}; } };
const salvarEstrelas = (id, n) => {
  const e = lerEstrelas();
  e[id] = Math.max(e[id] || 0, n);
  try { localStorage.setItem(chaveEstrelas(), JSON.stringify(e)); } catch (err) { /* sem armazenamento */ }
};
const estrelasTexto = (n) => [1, 2, 3].map((i) => `<span class="${i <= n ? '' : 'apagada'}">⭐</span>`).join('');

// ---------- Partida em andamento (de qualquer jogo) ----------
// missao: o jogo/missão atual; resultados: o que aconteceu em cada pergunta (base do relatório)
let missao = null, resultados = [];

// os outros módulos não podem trocar estas variáveis direto (import é só leitura)
function definirAluno(valor) { aluno = valor; return valor; }
function definirUltimoNome(valor) { ultimoNome = valor; return valor; }
function definirMissao(valor) { missao = valor; return valor; }
function definirResultados(valor) { resultados = valor; return valor; }

// quem precisa saber que o aluno voltou à tela inicial (o login da turma e a competição saem): fica aqui, sem
// dependências, porque telas.js e competicao.js se importam um ao outro
const aoVoltarAoInicio = [];

export { aluno, aoVoltarAoInicio, CHAVE_ALUNO, definirAluno, definirMissao, definirResultados, definirUltimoNome, estrelasTexto, lerEstrelas, missao, PEDIR_SENHA, resultados, salvarEstrelas, SENHA_TURMA, ultimoNome };
