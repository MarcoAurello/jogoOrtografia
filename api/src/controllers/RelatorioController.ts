import { Request, Response } from "express";
import * as dados from "../services/dados";
import { via } from "../services/email";
import { enviarRelatorioSmtp } from "../services/relatorioEmail";

// O relatório de uma partida por e-mail (o aluno escolheu o professor). A API confere se o e-mail está na lista da escola
// (no banco) e envia: com EMAIL_VIA=smtp, ela mesma monta e envia o e-mail (sem a planilha); com EMAIL_VIA=planilha,
// entrega ao script do Google, que só envia (o "carteiro", pelo Gmail da conta dele). Escola com planilha própria
// continua enviando pelo script dela.
const CHAVE = "jogo-ortografia";   // a mesma CHAVE do script (ferramentas/relatorio-email.gs)

class RelatorioController {
  async enviar(req: Request, res: Response): Promise<Response> {
    const { escopo, escola } = await dados.escopoDoEndereco(req.body.escola);
    const para = String(req.body.para || "").trim().toLowerCase();
    const lista = await dados.lerEmails(escopo);
    if (!dados.emailValido(para) || !lista.some((x) => x.email === para)) return res.json({ ok: false, erro: "email" });
    if (!escola?.script && via() === "smtp") {
      try {
        await enviarRelatorioSmtp(para, req.body);
        return res.json({ ok: true });
      } catch (error) {
        // falha passageira do servidor de e-mail: "cota" faz o app guardar o relatório na fila e tentar de novo depois
        console.error("Erro ao enviar o relatório por SMTP:", error);
        return res.json({ ok: false, erro: "cota" });
      }
    }
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
