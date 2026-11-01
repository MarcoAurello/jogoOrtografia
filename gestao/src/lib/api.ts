// Conversa com a API (/api, o mesmo nginx). O token é o mesmo do app dos jogos (mesmo domínio): quem entrou num
// entra no outro. O administrador "dentro" de uma escola manda o cabeçalho X-Escola e a API o trata como a coordenação
// dela; isso fica só nesta aba (sessionStorage), como no app dos jogos (js/api.js).

const BASE = '/api';
const CHAVE_TOKEN = 'pleno-ortografia:token';
const CHAVE_ESCOLA_DO_ADMIN = 'pleno-ortografia:admin-na-escola';

function lerLocal(chave: string) { try { return localStorage.getItem(chave) || ''; } catch { return ''; } }
function lerSessao(chave: string) { try { return sessionStorage.getItem(chave) || ''; } catch { return ''; } }

export const lerToken = () => lerLocal(CHAVE_TOKEN);
export function guardarToken(token: string) {
  try { if (token) localStorage.setItem(CHAVE_TOKEN, token); else localStorage.removeItem(CHAVE_TOKEN); } catch { /* sem armazenamento */ }
}

export const lerEscolaDoAdmin = () => lerSessao(CHAVE_ESCOLA_DO_ADMIN);
export function definirEscolaDoAdmin(id: string) {
  try { if (id) sessionStorage.setItem(CHAVE_ESCOLA_DO_ADMIN, id); else sessionStorage.removeItem(CHAVE_ESCOLA_DO_ADMIN); } catch { /* sem armazenamento */ }
}

export class ErroApi extends Error {
  status: number;
  codigo: string;
  constructor(mensagem: string, status = 0, codigo = '') {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
  }
}

// avisado quando a API recusa o token (vencido ou usuário desativado): o contexto de login volta para a tela de entrar
export const EVENTO_SESSAO_EXPIRADA = 'gestao:sessao-expirada';

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function api<T = unknown>(caminho: string, { metodo = 'GET', corpo }: { metodo?: Metodo; corpo?: unknown } = {}): Promise<T> {
  const token = lerToken();
  const naEscola = lerEscolaDoAdmin();
  const cabecalhos: Record<string, string> = {};
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
  if (token) cabecalhos.Authorization = `Bearer ${token}`;
  if (token && naEscola) cabecalhos['X-Escola'] = naEscola;

  let r: Response;
  try {
    r = await fetch(`${BASE}${caminho}`, { method: metodo, headers: cabecalhos, body: corpo !== undefined ? JSON.stringify(corpo) : undefined });
  } catch {
    throw new ErroApi(navigator.onLine ? 'O servidor não respondeu. Tente de novo em instantes.' : 'Sem internet agora. Tente de novo quando a conexão voltar.');
  }

  let dados: { message?: string; codigo?: string; erro?: string } = {};
  try { dados = await r.json(); } catch { /* resposta sem JSON */ }

  if (!r.ok) {
    if (r.status === 401 && token) {
      guardarToken('');
      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
    }
    throw new ErroApi(dados.message || 'Não deu certo. Tente de novo.', r.status, dados.codigo || dados.erro || '');
  }
  return dados as T;
}

export const mensagemDoErro = (e: unknown) => (e instanceof Error ? e.message : 'Não deu certo. Tente de novo.');
