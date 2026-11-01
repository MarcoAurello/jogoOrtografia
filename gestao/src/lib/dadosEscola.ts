// E-mails dos relatórios, questionários e competições: a API guarda no banco, mas os endereços continuam os do tempo
// da planilha (GET /dados?acao=…&escola=<endereço> para ler; POST /planilha {acao} para gravar). Eles respondem
// { ok: false, erro: "código" } com status 200: aqui isso vira um erro com a mensagem em português.
import { api, ErroApi } from './api';

const MENSAGENS: Record<string, string> = {
  email: 'Digite um e-mail válido (ou ele não está na lista).',
  repetido: 'Este e-mail já está na lista.',
  turma: 'Escolha uma turma ativa (os alunos entram com o código dela).',
  jogo: 'Escolha o jogo ou o questionário da competição.',
  hora: 'Escolha um dia e hora de encerrar que ainda não passaram.',
  competicao: 'Competição não encontrada.',
  permissao: 'Só a coordenação pode fazer isso.',
  acao: 'Ação desconhecida.',
};

type Resposta = { ok: boolean; erro?: string } & Record<string, unknown>;

function conferir<T>(r: Resposta): T {
  if (!r.ok) throw new ErroApi(MENSAGENS[r.erro || ''] || r.erro || 'Não deu certo. Tente de novo.', 200, r.erro || '');
  return r as unknown as T;
}

// ler: a escola vai pelo endereço (o slug); sem escola, a plataforma principal
export async function lerDados<T>(acao: string, escola: string, extra: Record<string, string> = {}) {
  const q = new URLSearchParams({ acao, escola, ...extra });
  return conferir<T>(await api<Resposta>(`/dados?${q}`));
}

// gravar: a escola é a de quem está logado
export async function gravar<T>(acao: string, corpo: Record<string, unknown> = {}) {
  try {
    return conferir<T>(await api<Resposta>('/planilha', { metodo: 'POST', corpo: { acao, ...corpo } }));
  } catch (e) {
    // o 403 da coordenação chega como erro da api(); a mensagem fica a da lista
    if (e instanceof ErroApi && e.status === 403) throw new ErroApi(MENSAGENS.permissao, 403, 'permissao');
    throw e;
  }
}

// o link do app com a marca da escola (/<escola>?jogo=… ou ?q=…); sem escola, o endereço da plataforma
export const linkDoApp = (escola: string, parametro: string) => `${location.origin}/${escola ? `${encodeURIComponent(escola)}` : ''}?${parametro}`;
