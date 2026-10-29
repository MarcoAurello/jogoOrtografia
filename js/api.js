/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Conversa com a API (pasta api/): login, usuários, escolas e as gravações do professor na planilha. */

// A API fica no mesmo endereço do app, em /api (o nginx repassa). O login guarda um token no aparelho,
// mandado em cada pedido (Authorization: Bearer, como no E-CGU).
const BASE = '/api';
const CHAVE_TOKEN = 'pleno-ortografia:token';

const lerToken = () => { try { return localStorage.getItem(CHAVE_TOKEN) || ''; } catch (e) { return ''; } };
function guardarToken(token) {
  try { if (token) localStorage.setItem(CHAVE_TOKEN, token); else localStorage.removeItem(CHAVE_TOKEN); } catch (e) { /* sem armazenamento */ }
}

// faz o pedido e devolve o JSON; erro vira Error com a mensagem da API (e .status / .codigo)
async function api(caminho, { metodo = 'GET', corpo } = {}) {
  const token = lerToken();
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
    if (r.status === 401 && token) guardarToken('');   // token vencido ou usuário desativado: pede o login de novo
    const erro = new Error(dados.message || 'Não deu certo. Tente de novo.');
    erro.status = r.status;
    erro.codigo = dados.codigo || dados.erro || '';
    throw erro;
  }
  return dados;
}

export { api, guardarToken, lerToken };
