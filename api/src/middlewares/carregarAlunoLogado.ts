import { NextFunction, Request, Response } from "express";
import Aluno from "../models/Aluno";
import Escola from "../models/Escola";
import Turma from "../models/Turma";
import Usuario from "../models/Usuario";
import { AlunoTurma } from "../models/Aluno";
import { ResponsavelAluno } from "../models/Familia";

// a turma de agora do aluno que entrou em casa: a ligação ativa (de preferência a turma em que foi criado) com turma
// ativa. Pode não ter (paciente da psicopedagoga, aguardando turma, compra avulsa).
async function turmaDeAgora(aluno: Aluno): Promise<Turma | null> {
  const ligacoes = await AlunoTurma.findAll({ where: { aluno_id: aluno.id, ativo: true } });
  ligacoes.sort((a, b) => Number(b.turma_id === aluno.turma_id) - Number(a.turma_id === aluno.turma_id));
  for (const l of ligacoes) {
    const turma = await Turma.findByPk(l.turma_id);
    if (turma?.ativa) return turma;
  }
  return null;
}

// carrega o aluno do token e a turma por onde ele entrou; barra aluno desativado (na escola ou na turma), turma
// encerrada ou escola bloqueada. Token feito antes da última troca de PIN (sv velho) não vale mais.
// Em casa (entrou pela conta do responsável) não há turma de entrada: vale enquanto o responsável estiver ativo e
// ligado ao filho, e a turma é a de agora (se tiver).
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
    if (!aluno || !aluno.ativo) return response.status(401).json({ message: "Aluno ou turma desativados." });
    if ((aluno.sessao_versao || 0) !== (request.alunoSessaoVersao || 0)) {
      return response.status(401).json({ message: "O PIN foi trocado. Entre de novo com o PIN novo.", codigo: "sessao_trocada" });
    }

    if (request.alunoLocal === "casa") {
      const ligado = request.alunoResponsavelId
        ? await ResponsavelAluno.findOne({ where: { responsavel_id: request.alunoResponsavelId, aluno_id: aluno.id } }) : null;
      const responsavel = ligado ? await Usuario.findByPk(request.alunoResponsavelId!) : null;
      if (!responsavel?.ativo) return response.status(401).json({ message: "Este aluno não está mais ligado a esta conta." });
      if (request.alunoCodigoFamilia && responsavel.codigo_familia !== request.alunoCodigoFamilia) {
        return response.status(401).json({ message: "O código da família mudou. Peça o código novo a um adulto.", codigo: "familia_trocada" });
      }
      const turma = await turmaDeAgora(aluno);
      if (turma) aluno.turma = turma;
      request.alunoTurmaId = turma?.id;
    } else {
      // token antigo (sem a turma): vale a turma em que o aluno foi criado
      const turmaId = request.alunoTurmaId || aluno.turma_id || "";
      const ligacao = await AlunoTurma.findOne({ where: { aluno_id: aluno.id, turma_id: turmaId, ativo: true } });
      const turma = ligacao ? await Turma.findByPk(turmaId) : null;
      if (!turma?.ativa) return response.status(401).json({ message: "Aluno ou turma desativados." });
      aluno.turma = turma;
      request.alunoTurmaId = turma.id;
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
