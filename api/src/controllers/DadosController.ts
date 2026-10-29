import { Request, Response } from "express";
import * as dados from "../services/dados";

// Fase 4: o app pede aqui o que pedia ao script do Google (mesmas ações e mesmas respostas { ok, ... }).
// Leituras e as ações do aluno são públicas e vêm com o endereço da escola (?escola= / escola no corpo);
// as gravações do professor vão por /planilha (PlanilhaController), com login.
const resposta = (res: Response, f: () => Promise<Record<string, unknown>>) =>
  f().then((r) => res.json({ ok: true, ...r })).catch((e: Error) => res.json({ ok: false, erro: e.message }));

class DadosController {
  async ler(req: Request, res: Response): Promise<Response | void> {
    const { escopo } = await dados.escopoDoEndereco(req.query.escola);
    const acao = String(req.query.acao || "");
    if (acao === "emails") return resposta(res, async () => ({ emails: await dados.lerEmails(escopo) }));
    if (acao === "questionarios") return resposta(res, async () => ({ lista: await dados.listarQuestionarios(escopo) }));
    if (acao === "questionario") return resposta(res, async () => ({ questionario: await dados.lerQuestionario(escopo, req.query.id) }));
    if (acao === "competicoes") return resposta(res, async () => ({ lista: await dados.listarCompeticoes(escopo, false) }));
    if (acao === "ranking") return resposta(res, async () => ({ ...(await dados.rankingDaCompeticao(escopo, req.query.id)) }));
    return res.json({ ok: true, versao: "api" });
  }

  // competição do aluno: entrar com o código e mandar a pontuação (sem login, como antes)
  async gravar(req: Request, res: Response): Promise<Response | void> {
    const { escopo } = await dados.escopoDoEndereco(req.body.escola);
    if (req.body.acao === "entrarCompeticao") return resposta(res, async () => ({ competicao: await dados.entrarCompeticao(escopo, req.body.id, req.body.codigo) }));
    if (req.body.acao === "resultadoCompeticao") return resposta(res, async () => ({ ...(await dados.guardarResultado(escopo, req.body)) }));
    return res.json({ ok: false, erro: "acao" });
  }
}

export default new DadosController();
