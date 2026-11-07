import { Request, Response } from "express";
import { Op } from "sequelize";
import UsoIa from "../models/UsoIa";
import { Arquivo, ErroIA, gerarQuestoes, provedoresConfigurados, TipoArquivo } from "../services/geradorQuestoes";

// Questões por IA a partir de fotos ou PDF de exercício (Questionários da gestão). As perguntas voltam para a tela, que
// as passa pela mesma revisão da planilha; o questionário só é gravado quando o professor salva (POST /planilha).
// Os arquivos chegam em base64 no JSON e ficam só na memória desta requisição: nada é gravado.

const QUANTIDADES = [5, 10, 15];
const MAX_ARQUIVOS = 6;
const MAX_ARQUIVO = 10 * 1024 * 1024;   // 10 MB cada
const MAX_TOTAL = 14 * 1024 * 1024;     // o Gemini aceita até ~20 MB por pedido (já em base64)
const DIFICULDADES = ["facil", "media", "dificil"];

const limiteDiario = () => Math.max(0, Number(process.env.IA_LIMITE_DIARIO ?? 20) || 0);

// o tipo pelo começo do arquivo (não pelo nome nem pelo que o navegador diz): só foto JPG/PNG/WEBP e PDF
function tipoReal(dados: Buffer): TipoArquivo | null {
  if (dados.length < 12) return null;
  if (dados[0] === 0xff && dados[1] === 0xd8 && dados[2] === 0xff) return "image/jpeg";
  if (dados.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (dados.toString("latin1", 0, 4) === "RIFF" && dados.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  if (dados.toString("latin1", 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

async function usadasHoje(usuarioId: string) {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  return UsoIa.count({ where: { usuario_id: usuarioId, created_at: { [Op.gte]: inicio } } });
}

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

class IaQuestoesController {
  // a tela pergunta antes de mostrar o botão: se a IA está configurada e quantas gerações ainda cabem hoje
  async status(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const provedores = provedoresConfigurados();
    const limite = limiteDiario();
    const usadas = await usadasHoje(eu.id);
    return res.json({ configurada: provedores.length > 0, falsa: provedores[0] === "falsa", limite, usadasHoje: usadas, restantes: Math.max(0, limite - usadas) });
  }

  async gerar(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const b = req.body || {};

    // ---------- validar no início ----------
    const lista: unknown[] = Array.isArray(b.arquivos) ? b.arquivos : [];
    if (!lista.length) return res.status(400).json({ message: "Envie pelo menos uma foto ou um PDF do exercício." });
    if (lista.length > MAX_ARQUIVOS) return res.status(400).json({ message: `Envie no máximo ${MAX_ARQUIVOS} arquivos por vez.` });
    const quantidade = b.quantidade == null || b.quantidade === "" ? 10 : Number(b.quantidade);
    if (!QUANTIDADES.includes(quantidade)) return res.status(400).json({ message: "Escolha 5, 10 ou 15 perguntas." });
    const dificuldade = texto(b.dificuldade, 10);
    if (dificuldade && !DIFICULDADES.includes(dificuldade)) return res.status(400).json({ message: "Dificuldade inválida." });

    const arquivos: Arquivo[] = [];
    let total = 0;
    for (const item of lista) {
      const base64 = typeof item === "string" ? item : typeof (item as { dados?: unknown })?.dados === "string" ? (item as { dados: string }).dados : "";
      const dados = Buffer.from(base64.replace(/^data:[^,]*,/, ""), "base64");
      const tipo = tipoReal(dados);
      if (!tipo) return res.status(400).json({ message: "Arquivo inválido: envie foto (JPG, PNG ou WEBP) ou PDF.", codigo: "arquivo_invalido" });
      if (dados.length > MAX_ARQUIVO) return res.status(413).json({ message: "Cada arquivo pode ter no máximo 10 MB.", codigo: "arquivo_grande" });
      total += dados.length;
      arquivos.push({ dados, tipo });
    }
    if (total > MAX_TOTAL) return res.status(413).json({ message: "Os arquivos juntos passam de 14 MB. Mande menos páginas por vez.", codigo: "arquivo_grande" });

    if (!provedoresConfigurados().length) {
      return res.status(503).json({ message: "A IA não está configurada neste servidor. Avise o administrador.", codigo: "ia_nao_configurada" });
    }
    const limite = limiteDiario();
    if ((await usadasHoje(eu.id)) >= limite) {
      return res.status(429).json({ message: `Você já usou as ${limite} gerações de hoje. Amanhã libera de novo (ou importe uma planilha).`, codigo: "limite_diario" });
    }

    try {
      const g = await gerarQuestoes({
        arquivos, quantidade, dificuldade: dificuldade || undefined,
        serie: texto(b.serie, 40) || undefined, materia: texto(b.materia, 40) || undefined, tema: texto(b.tema, 120) || undefined
      });
      await UsoIa.create({
        usuario_id: eu.id, escola_id: eu.escola_id || null, provedor: g.provedor, modelo: g.modelo,
        tipo_arquivo: arquivos.some((a) => a.tipo === "application/pdf") ? "pdf" : "foto", perguntas: g.perguntas.length
      });
      const usadas = await usadasHoje(eu.id);
      return res.json({ perguntas: g.perguntas, provedor: g.provedor, restantes: Math.max(0, limite - usadas) });
    } catch (e) {
      if (e instanceof ErroIA) return res.status(e.status).json({ message: e.message, codigo: e.codigo });
      console.error("Erro ao gerar questões por IA:", e);
      return res.status(500).json({ message: "Erro ao gerar as perguntas. Tente de novo." });
    }
  }
}

export default new IaQuestoesController();
