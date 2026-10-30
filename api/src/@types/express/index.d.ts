import Usuario from "../../models/Usuario";
import Aluno from "../../models/Aluno";

declare global {
  namespace Express {
    export interface Request {
      userId?: string;
      tokenTipo?: "usuario" | "aluno";
      usuarioLogado?: Usuario;
      alunoLogado?: Aluno;
      alunoTurmaId?: string;   // a turma por onde o aluno entrou (vem no token)
      adminNaEscola?: boolean;   // o administrador entrou numa escola (X-Escola) e age como a coordenação dela
    }
  }
}

export {};
