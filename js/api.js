/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Conversa com a API (pasta api/): login, usuários, escolas, turmas, partidas e as gravações do professor na planilha. */

// A API fica no mesmo endereço do app, em /api (o nginx repassa). O login guarda um token no aparelho,
// mandado em cada pedido (Authorization: Bearer, como no E-CGU). O aluno (login por figuras) tem um token próprio:
// no mesmo tablet, o professor pode entrar na Área do professor sem tirar o aluno.
const BASE = '/api';
const CHAVE_TOKEN = 'pleno-ortografia:token';
const CHAVE_TOKEN_ALUNO = 'pleno-ortografia:token-aluno';
const CHAVE_TOKEN_TESTE = 'pleno-ortografia:token-teste';   // teste grátis: os relatórios em PDF vão para o e-mail cadastrado

const ler = (chave) => { try { return localStorage.getItem(chave) || ''; } catch (e) { return ''; } };
function guardar(chave, token) {
  try { if (token) localStorage.setItem(chave, token); else localStorage.removeItem(chave); } catch (e) { /* sem armazenamento */ }
}
const lerToken = () => ler(CHAVE_TOKEN);
const guardarToken = (token) => guardar(CHAVE_TOKEN, token);
const lerTokenAluno = () => ler(CHAVE_TOKEN_ALUNO);
const guardarTokenAluno = (token) => guardar(CHAVE_TOKEN_ALUNO, token);
const lerTokenTeste = () => ler(CHAVE_TOKEN_TESTE);
const guardarTokenTeste = (token) => guardar(CHAVE_TOKEN_TESTE, token);

// faz o pedido e devolve o JSON; erro vira Error com a mensagem da API (e .status / .codigo)
async function api(caminho, { metodo = 'GET', corpo, comoAluno = false, comoTeste = false } = {}) {
  const chave = comoAluno ? CHAVE_TOKEN_ALUNO : comoTeste ? CHAVE_TOKEN_TESTE : CHAVE_TOKEN;
  const token = ler(chave);
  let r;
  try {
    r = await fetch(`${BASE}${caminho}`, {
      method: metodo,
      headers: { ...(corpo ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch (e) {
    const erro = new Error(navigator.onLine ? 'O servidor não respondeu. Tente de novo em instantes.' : 'Sem internet agora. Tente de novo quando a conexão voltar.');
    erro.codigo = navigator.onLine ? 'servidor' : 'internet';
    throw erro;
  }
  let dados = {};
  try { dados = await r.json(); } catch (e) { /* resposta sem JSON */ }
  if (!r.ok) {
    if (r.status === 401 && token) guardar(chave, '');   // token vencido ou desativado: pede o login de novo
    const erro = new Error(dados.message || 'Não deu certo. Tente de novo.');
    erro.status = r.status;
    erro.codigo = dados.codigo || dados.erro || '';
    throw erro;
  }
  return dados;
}

// a escola do endereço (/escolaExemplo ou ?escola=): os dados (e-mails, questionários, competições) são os dela
const escolaDoEndereco = () => window.ESCOLA_ATUAL_ID || window.ESCOLA_INICIAL?.id || '';

export { api, escolaDoEndereco, guardarToken, guardarTokenAluno, guardarTokenTeste, lerToken, lerTokenAluno, lerTokenTeste };
