import Usuario from "../../models/Usuario";

declare global {
  namespace Express {
    export interface Request {
      userId?: string;
      usuarioLogado?: Usuario;
    }
  }
}

export {};
