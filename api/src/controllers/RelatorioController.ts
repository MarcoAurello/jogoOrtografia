import { Request, Response } from "express";
import * as dados from "../services/dados";

// O relatório de uma partida por e-mail (o aluno escolheu o professor). A API confere se o e-mail está na lista da escola
// (no banco) e entrega ao script do Google, que só envia: o Apps Script ficou como "carteiro" (manda pelo Gmail da conta
// dele, por HTTPS, em qualquer rede). Escola com planilha própria envia pelo script dela.
const CHAVE = "jogo-ortografia";   // a mesma CHAVE do script (ferramentas/relatorio-email.gs)

class RelatorioController {
  async enviar(req: Request, res: Response): Promise<Response> {
    const { escopo, escola } = await dados.escopoDoEndereco(req.body.escola);
    const para = String(req.body.para || "").trim().toLowerCase();
    const lista = await dados.lerEmails(escopo);
    if (!dados.emailValido(para) || !lista.some((x) => x.email === para)) return res.json({ ok: false, erro: "email" });
    const url = escola?.script || process.env.URL_PLANILHA;
    if (!url) return res.json({ ok: false, erro: "planilha" });
    const { escola: _e, chave: _c, senha: _s, acao: _a, ...relatorio } = req.body;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        // com a senha, o script envia sem conferir a aba "E-mails" (a lista agora está no banco e já foi conferida aqui)
        body: JSON.stringify({ ...relatorio, para, chave: CHAVE, senha: process.env.SENHA_PLANILHA || "" })
      });
      const texto = await r.text();
      try { return res.json(JSON.parse(texto)); } catch { return res.json({ ok: false, erro: "acesso" }); }
    } catch (error) {
      console.error("Erro ao entregar o relatório ao script:", error);
      return res.status(502).json({ ok: false, erro: "acesso" });
    }
  }
}

export default new RelatorioController();
