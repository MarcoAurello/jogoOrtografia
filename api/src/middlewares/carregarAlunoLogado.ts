import { NextFunction, Request, Response } from "express";
import Aluno from "../models/Aluno";
import Escola from "../models/Escola";
import Turma from "../models/Turma";
import { AlunoTurma } from "../models/Aluno";

// carrega o aluno do token e a turma por onde ele entrou; barra aluno desativado (na escola ou na turma), turma
// encerrada ou escola bloqueada
export default async function carregarAlunoLogado(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    if (!request.userId || request.tokenTipo !== "aluno") {
      return response.status(401).json({ message: "Não autenticado." });
    }

    const aluno = await Aluno.findByPk(request.userId, { include: [{ model: Escola, as: "escola" }] });
    // token antigo (sem a turma): vale a turma em que o aluno foi criado
    const turmaId = request.alunoTurmaId || aluno?.turma_id || "";
    const ligacao = aluno ? await AlunoTurma.findOne({ where: { aluno_id: aluno.id, turma_id: turmaId, ativo: true } }) : null;
    const turma = ligacao ? await Turma.findByPk(turmaId) : null;

    if (!aluno || !aluno.ativo || !turma?.ativa) {
      return response.status(401).json({ message: "Aluno ou turma desativados." });
    }
    aluno.turma = turma;
    request.alunoTurmaId = turma.id;

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
