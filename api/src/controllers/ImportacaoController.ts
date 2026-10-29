import { Request, Response } from "express";
import { importarTudo } from "../services/importarPlanilha";

// só o administrador: traz da planilha do Google para o banco o que ainda não está aqui (pode rodar mais de uma vez)
class ImportacaoController {
  async importar(_req: Request, res: Response): Promise<Response> {
    try {
      return res.json({ ok: true, ...(await importarTudo()) });
    } catch (error) {
      console.error("Erro na importação da planilha:", error);
      return res.status(500).json({ ok: false, message: (error as Error).message });
    }
  }
}

export default new ImportacaoController();
