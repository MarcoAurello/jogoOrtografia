import { Request, Response } from "express";
import * as dados from "../services/dados";
import { TurmaProfessor } from "../models/Turma";
import { turmaDoUsuario } from "../services/acessoTurma";
import Usuario from "../models/Usuario";

// As gravações do professor (antes iam para a planilha do Google; desde a fase 4, para o banco). O endereço continua
// /planilha para o app não mudar. Os dados são os da escola de quem está logado (sem escola = plataforma principal).
const resposta = (res: Response, f: () => Promise<Record<string, unknown>>) =>
  f().then((r) => res.json({ ok: true, ...r })).catch((e: Error) => res.json({ ok: false, erro: e.message }));

// as competições que a pessoa vê: o professor, as das turmas dele; a coordenação (e o administrador), todas as da escola
async function turmasDoProfessor(eu: Usuario): Promise<string[] | null> {
  if (eu.perfil !== "professor") return null;
  const minhas = await TurmaProfessor.findAll({ where: { usuario_id: eu.id } }) as unknown as { turma_id: string }[];
  return minhas.map((m) => m.turma_id);
}

class PlanilhaController {
  async gravar(req: Request, res: Response): Promise<Response | void> {
    const eu = req.usuarioLogado!;
    const escopo = eu.escola_id;
    const b = req.body || {};
    switch (String(b.acao || "")) {
      case "adicionarEmail":
        return resposta(res, async () => { await dados.adicionarEmail(escopo, b.nome, b.email); return { emails: await dados.lerEmails(escopo) }; });
      case "salvarQuestionario":
        return resposta(res, async () => ({ id: await dados.salvarQuestionario(escopo, eu.id, b.titulo, b.perguntas) }));
      case "criarCompeticao":
        return resposta(res, async () => {
          // a competição é de uma turma: os alunos entram com o código da turma e veem as competições dela
          const turma = b.turma ? await turmaDoUsuario(eu, String(b.turma)) : null;
          if (!turma || !turma.ativa) throw new Error("turma");
          return { competicao: await dados.criarCompeticao(escopo, eu.id, b, turma.id) };
        });
      case "competicoesProfessor":
        return resposta(res, async () => ({ lista: await dados.listarCompeticoes(escopo, true, await turmasDoProfessor(eu)) }));
      case "encerrarCompeticao":
        return resposta(res, async () => { await dados.encerrarCompeticao(escopo, b.id); return { lista: await dados.listarCompeticoes(escopo, true, await turmasDoProfessor(eu)) }; });
      default:
        return res.status(400).json({ ok: false, erro: "acao" });
    }
  }
}

export default new PlanilhaController();
