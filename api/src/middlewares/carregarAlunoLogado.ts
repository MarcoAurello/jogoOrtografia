import { NextFunction, Request, Response } from "express";
import Aluno from "../models/Aluno";
import Escola from "../models/Escola";
import Turma from "../models/Turma";

// carrega o aluno do token (login por figuras) e barra aluno desativado, turma encerrada ou escola bloqueada
export default async function carregarAlunoLogado(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    if (!request.userId || request.tokenTipo !== "aluno") {
      return response.status(401).json({ message: "Não autenticado." });
    }

    const aluno = await Aluno.findByPk(request.userId, {
      include: [{ model: Escola, as: "escola" }, { model: Turma, as: "turma" }]
    });

    if (!aluno || !aluno.ativo || !aluno.turma?.ativa) {
      return response.status(401).json({ message: "Aluno ou turma desativados." });
    }

    if (aluno.escola?.bloqueada) {
      return response.status(403).json({ message: "O acesso desta escola está bloqueado.", codigo: "escola_bloqueada" });
    }

    request.alunoLogado = aluno;
    return next();
  } catch (error) {
    console.error("Erro ao carregar aluno logado:", error);
    return response.status(500).json({ message: "Erro ao carregar aluno logado." });
  }
}
