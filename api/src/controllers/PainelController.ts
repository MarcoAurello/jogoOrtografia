import { Request, Response } from "express";
import Aluno from "../models/Aluno";
import { turmaDoUsuario } from "../services/acessoTurma";
import { fichaDoAluno, painelDaTurma, periodo } from "../services/painel";

// painel do professor (fase 3): a turma inteira numa tela e a ficha de cada aluno
class PainelController {
  async turma(req: Request, res: Response): Promise<Response> {
    const turma = await turmaDoUsuario(req.usuarioLogado!, req.params.turmaId);
    if (!turma) return res.status(404).json({ message: "Turma não encontrada." });
    return res.json({ turma: { id: turma.id, nome: turma.nome, codigo: turma.codigo }, ...(await painelDaTurma(turma.id, periodo(req.query.dias))) });
  }

  async aluno(req: Request, res: Response): Promise<Response> {
    const aluno = await Aluno.findByPk(req.params.id);
    const turma = aluno ? await turmaDoUsuario(req.usuarioLogado!, aluno.turma_id) : null;
    if (!aluno || !turma) return res.status(404).json({ message: "Aluno não encontrado." });
    return res.json({
      aluno: { id: aluno.id, nome: aluno.nome, ativo: aluno.ativo },
      turma: { id: turma.id, nome: turma.nome },
      ...(await fichaDoAluno(aluno.id, periodo(req.query.dias)))
    });
  }
}

export default new PainelController();
