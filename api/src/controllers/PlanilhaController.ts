import { Request, Response } from "express";

// Até a fase 4, e-mails, questionários e competições continuam na planilha do Google. As gravações do professor
// passam por aqui: a API confere o login e manda a SENHA_PROFESSOR do script, que fica só no servidor
// (antes ela ficava no código do app, à vista de qualquer um). A planilha é sempre a da escola do professor.
const CHAVE = "jogo-ortografia";   // a mesma CHAVE do script (ferramentas/relatorio-email.gs)
const ACOES = new Set(["adicionarEmail", "salvarQuestionario", "criarCompeticao", "competicoesProfessor", "encerrarCompeticao"]);

class PlanilhaController {
  async gravar(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const acao = String(req.body.acao || "");
    if (!ACOES.has(acao)) return res.status(400).json({ ok: false, erro: "acao" });
    const url = eu.escola?.script || process.env.URL_PLANILHA;
    if (!url) return res.status(503).json({ ok: false, erro: "planilha" });
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...req.body, acao, chave: CHAVE, senha: process.env.SENHA_PLANILHA || "" })
      });
      const texto = await r.text();
      try {
        return res.json(JSON.parse(texto));
      } catch {
        return res.status(502).json({ ok: false, erro: "acesso" });   // o Google mandou a página de login: script não liberado
      }
    } catch (error) {
      console.error("Erro ao falar com a planilha:", error);
      return res.status(502).json({ ok: false, erro: "acesso" });
    }
  }
}

export default new PlanilhaController();
