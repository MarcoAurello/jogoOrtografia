import { Request, Response } from "express";
import Aluno from "../models/Aluno";
import { turmaDoUsuario } from "../services/acessoTurma";
import Turma from "../models/Turma";
import { podeEditarAluno, turmasDoAluno } from "../services/acessoAluno";
import { Anamnese } from "../models/Anamnese";
import { Observacao } from "../models/Observacao";
import { PlanoObjetivos } from "../models/PlanoObjetivos";
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
    if (!aluno || !(await podeEditarAluno(req.usuarioLogado!, aluno))) return res.status(404).json({ message: "Aluno não encontrado." });
    // as turmas do aluno que a pessoa enxerga (a primeira vai no cabeçalho da ficha)
    const turmas = [];
    for (const id of await turmasDoAluno(aluno.id)) { const t = await turmaDoUsuario(req.usuarioLogado!, id); if (t) turmas.push(t); }
    const turma = turmas[0] || (aluno.turma_id ? await Turma.findByPk(aluno.turma_id) : null);
    // a última anamnese respondida aparece na ficha, ao lado do desempenho nos jogos
    const anamnese = await Anamnese.findOne({ where: { aluno_id: aluno.id, status: "respondida" }, order: [["respondida_em", "DESC"]] });
    // as observações de evolução mais recentes (as 10 últimas) aparecem na ficha
    const plano = await PlanoObjetivos.findOne({ where: { aluno_id: aluno.id, status: "ativo" }, order: [["updated_at", "DESC"]] });
    const observacoes = await Observacao.findAll({ where: { aluno_id: aluno.id }, order: [["data", "DESC"], ["created_at", "DESC"]], limit: 10 });
    return res.json({
      aluno: { id: aluno.id, nome: aluno.nome, ativo: aluno.ativo, nome_completo: aluno.nome_completo, data_nascimento: aluno.data_nascimento },
      turma: turma ? { id: turma.id, nome: turmas.map((t) => t.nome).join(", ") || turma.nome } : null,
      anamnese: anamnese ? { id: anamnese.id, titulo: anamnese.titulo, perguntas: anamnese.perguntas, respostas: anamnese.respostas,
        respondida_em: anamnese.respondida_em, respondida_por_nome: anamnese.respondida_por_nome, via: anamnese.via } : null,
      plano: plano ? { ciclo: plano.ciclo, profissional_nome: plano.profissional_nome, foco: plano.foco, objetivos: plano.objetivos } : null,
      observacoes: observacoes.map((o) => ({ data: o.data, categoria: o.categoria, texto: o.texto, autor_nome: o.autor_nome })),
      ...(await fichaDoAluno(aluno.id, periodo(req.query.dias)))
    });
  }
}

export default new PainelController();
