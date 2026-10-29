import { NextFunction, Request, Response } from "express";
import { Perfil } from "../models/Usuario";

const NOMES: Record<Perfil, string> = { admin: "Administrador", coordenacao: "Coordenação", professor: "Professor" };

// só deixa passar os perfis indicados (usar depois de carregarUsuarioLogado)
export default function ensurePerfil(...permitidos: Perfil[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    const perfil = request.usuarioLogado?.perfil;

    if (!perfil || !permitidos.includes(perfil)) {
      return response
        .status(403)
        .json({ message: `Acesso restrito a: ${permitidos.map((p) => NOMES[p]).join(", ")}.` });
    }

    return next();
  };
}
