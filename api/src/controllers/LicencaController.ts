import { Request, Response } from "express";
import { assinarPasse, diasDaLicenca, enderecosOficiais, licencaLigada } from "../services/licenca";

class LicencaController {
  // GET /licenca: entrega o passe dos jogos só para o próprio site oficial. O navegador manda Sec-Fetch-Site em todo
  // pedido: uma cópia aberta do computador (file://) ou em outro site chega como "cross-site" e fica sem passe.
  async show(req: Request, res: Response): Promise<Response> {
    res.set("Cache-Control", "no-store");
    const site = String(req.headers["sec-fetch-site"] || "");
    if (site && site !== "same-origin" && site !== "none") {
      return res.status(403).json({ message: "Os jogos só funcionam no site oficial." });
    }
    const dominio = req.hostname;
    if (!enderecosOficiais().includes(dominio)) {
      return res.status(403).json({ message: "Os jogos só funcionam no site oficial." });
    }
    if (!licencaLigada()) return res.json({ desligada: true, dias: diasDaLicenca() });
    return res.json(assinarPasse(dominio));
  }
}

export default new LicencaController();
