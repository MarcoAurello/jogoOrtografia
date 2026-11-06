import jwt from "jsonwebtoken";
import authConfig from "../config/auth";
import Aluno from "../models/Aluno";

// O token do aluno. Duas entradas:
// - pela turma (código + nome, e o PIN se for cadastrado): vale 12 h, um dia de aula. O app do aluno cadastrado lembra
//   o login só até o fim do dia (tablet da escola é dividido); o avulso perde o login ao voltar ao início, como sempre.
// - em casa, pela conta do responsável ("Quem vai jogar?" + PIN): vale 30 dias, é o aparelho da família.
// sv (sessao_versao do aluno): trocar o PIN soma 1 no aluno e todo token antigo dele para de valer (carregarAlunoLogado).
export const PRAZO_TOKEN_TURMA = "12h";
export const PRAZO_TOKEN_CASA = "30d";

export function tokenDoAlunoNaTurma(aluno: Aluno, turmaId: string): string {
  return jwt.sign({ tipo: "aluno", turma: turmaId, sv: aluno.sessao_versao || 0 }, authConfig.secret,
    { subject: aluno.id, expiresIn: PRAZO_TOKEN_TURMA } as jwt.SignOptions);
}

// resp: o responsável que abriu a entrada; se a ligação dele com o filho sair, o token para de valer.
// fc: o código da família, quando o filho entrou por ele no aparelho dele; gerar um código novo derruba esse token.
export function tokenDoAlunoEmCasa(aluno: Aluno, responsavelId: string, codigoFamilia = ""): string {
  return jwt.sign({ tipo: "aluno", local: "casa", resp: responsavelId, sv: aluno.sessao_versao || 0, ...(codigoFamilia ? { fc: codigoFamilia } : {}) },
    authConfig.secret, { subject: aluno.id, expiresIn: PRAZO_TOKEN_CASA } as jwt.SignOptions);
}
