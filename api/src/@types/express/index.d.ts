import Usuario from "../../models/Usuario";
import Aluno from "../../models/Aluno";

declare global {
  namespace Express {
    export interface Request {
      userId?: string;
      tokenTipo?: "usuario" | "aluno";
      usuarioLogado?: Usuario;
      alunoLogado?: Aluno;
      alunoTurmaId?: string;   // a turma por onde o aluno entrou (vem no token); em casa, a turma de agora (se tiver)
      alunoLocal?: "escola" | "casa";   // casa: entrou pela conta do responsável (as partidas vão com local = casa)
      alunoResponsavelId?: string;   // casa: o responsável que abriu a entrada
      alunoSessaoVersao?: number;
      alunoCodigoFamilia?: string;   // casa: o código da família por onde o aluno entrou (no aparelho dele)   // a sessao_versao do aluno quando o token foi feito
      adminNaEscola?: boolean;   // o administrador entrou numa escola (X-Escola) e age como a coordenação dela
    }
  }
}

export {};
