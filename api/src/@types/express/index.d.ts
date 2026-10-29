import Usuario from "../../models/Usuario";
import Aluno from "../../models/Aluno";

declare global {
  namespace Express {
    export interface Request {
      userId?: string;
      tokenTipo?: "usuario" | "aluno";
      usuarioLogado?: Usuario;
      alunoLogado?: Aluno;
      adminNaEscola?: boolean;   // o administrador entrou numa escola (X-Escola) e age como a coordenação dela
    }
  }
}

export {};
