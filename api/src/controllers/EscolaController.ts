import { Request, Response } from "express";
import { UniqueConstraintError } from "sequelize";
import Escola, { DIAS_DE_TESTE } from "../models/Escola";
import Usuario from "../models/Usuario";

// endereços que já são do app (pastas e páginas) não podem virar escola
export const RESERVADOS = new Set(["js", "assets", "icons", "audio", "vendor", "docs", "ferramentas", "manual", "privacidade",
  "index", "jogoortografia", "ortografia", "api", "health"]);
export const slugValido = (slug: string) => /^[A-Za-z0-9_-]{3,40}$/.test(slug) && !RESERVADOS.has(slug.toLowerCase());
const corValida = (c: unknown) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);
const LOGO_MAXIMO = 60000;   // data URL de até 240 px (o app já reduz a imagem antes de mandar)
const scriptValido = (s: string) => !s || /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(s);

// lê e confere os campos que o administrador manda (criar e editar)
function dadosDaEscola(body: Record<string, unknown>) {
  const nome = String(body.nome || "").trim().slice(0, 120);
  const slogan = String(body.slogan || "").trim().slice(0, 160);
  const logo = String(body.logo || "");
  const script = String(body.script || "").trim();
  if (!nome) return { erro: "Digite o nome da escola." };
  if (logo.length > LOGO_MAXIMO) return { erro: "O logo ficou grande demais. Use uma imagem mais simples." };
  if (!scriptValido(script)) return { erro: "O endereço da planilha precisa ser o link /exec de um Apps Script." };
  return {
    dados: {
      nome,
      slogan: slogan || null,
      cor: corValida(body.cor) ? String(body.cor) : "#1fa2b0",
      destaque: corValida(body.destaque) ? String(body.destaque) : "#f9c62b",
      logo: logo || null,
      script: script || null
    }
  };
}

class EscolaController {
  // a marca da escola (público): o app usa quando não recebeu a página já pronta
  async marca(req: Request, res: Response): Promise<Response> {
    const escola = await Escola.findOne({ where: { slug: req.params.slug } });
    if (!escola) return res.status(404).json({ message: "Escola não encontrada." });
    return res.json(escola.marca());
  }

  // painel do administrador: todas as escolas, com o número de usuários
  async index(_req: Request, res: Response): Promise<Response> {
    const escolas = await Escola.findAll({ order: [["nome", "ASC"]] });
    const contagem = await Usuario.count({ group: ["escola_id"] }) as unknown as { escola_id: string | null; count: number }[];
    const porEscola = new Map(contagem.map((c) => [c.escola_id, Number(c.count)]));
    return res.json(escolas.map((e) => ({ ...e.toJSON(), bloqueada: e.bloqueada, usuarios: porEscola.get(e.id) || 0 })));
  }

  // escola nova começa no teste grátis de 14 dias
  async store(req: Request, res: Response): Promise<Response> {
    const slug = String(req.body.slug || "").trim();
    if (!slugValido(slug)) return res.status(400).json({ message: "Endereço inválido: use de 3 a 40 letras, números ou hífen, sem espaço (ex.: colegioNovo)." });
    const { dados, erro } = dadosDaEscola(req.body);
    if (erro || !dados) return res.status(400).json({ message: erro });
    try {
      const teste_ate = new Date(Date.now() + DIAS_DE_TESTE * 24 * 60 * 60 * 1000);
      const escola = await Escola.create({ ...dados, slug, plano: "teste", teste_ate });
      return res.status(201).json({ ...escola.toJSON(), bloqueada: escola.bloqueada });
    } catch (error) {
      if (error instanceof UniqueConstraintError) return res.status(409).json({ message: `Já existe uma escola com o endereço /${slug}.` });
      console.error("Erro ao criar escola:", error);
      return res.status(500).json({ message: "Erro ao criar escola." });
    }
  }

  // edita a marca; o administrador também muda o plano (teste → ativo), estende o teste ou desativa
  async update(req: Request, res: Response): Promise<Response> {
    const escola = await Escola.findByPk(req.params.id);
    if (!escola) return res.status(404).json({ message: "Escola não encontrada." });
    const { dados, erro } = dadosDaEscola({ ...escola.toJSON(), ...req.body });
    if (erro || !dados) return res.status(400).json({ message: erro });
    Object.assign(escola, dados);
    if (req.body.plano === "teste" || req.body.plano === "ativo") escola.plano = req.body.plano;
    if (req.body.teste_ate) {
      const data = new Date(String(req.body.teste_ate));
      if (Number.isNaN(data.getTime())) return res.status(400).json({ message: "Data do teste inválida." });
      escola.teste_ate = data;
    }
    if (typeof req.body.ativa === "boolean") escola.ativa = req.body.ativa;
    await escola.save();
    return res.json({ ...escola.toJSON(), bloqueada: escola.bloqueada });
  }
}

export default new EscolaController();
