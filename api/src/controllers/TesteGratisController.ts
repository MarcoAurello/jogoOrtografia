import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import TesteGratis, { PERFIS_TESTE } from "../models/TesteGratis";
import authConfig from "../config/auth";
import { enviarRelatorioPDF } from "../services/email";

const emailValido = (m: string) => /^[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}$/i.test(m);
const MAX_PDF = 1.5 * 1024 * 1024;   // 1,5 MB
const MAX_POR_DIA = 30;
const limpar = (t: unknown, max: number) => String(t || "").replace(/\s+/g, " ").trim().slice(0, max);

// o teste grátis em andamento (token tipo "teste")
async function testeDoToken(req: Request): Promise<TesteGratis | null> {
  const [, token] = String(req.headers.authorization || "").split(" ");
  try {
    const { sub, tipo } = jwt.verify(token, authConfig.secret) as { sub: string; tipo?: string };
    return tipo === "teste" ? await TesteGratis.findByPk(sub) : null;
  } catch { return null; }
}

class TesteGratisController {
  // cadastro (ou recadastro com o mesmo e-mail): devolve o token que manda os relatórios para esse e-mail
  async store(req: Request, res: Response): Promise<Response> {
    const nome = limpar(req.body.nome, 120);
    const email = limpar(req.body.email, 255).toLowerCase();
    const perfil = PERFIS_TESTE.includes(req.body.perfil) ? req.body.perfil : "outro";
    if (nome.length < 2) return res.status(400).json({ message: "Digite o seu nome." });
    if (!emailValido(email)) return res.status(400).json({ message: "Digite um e-mail válido, como nome@escola.com." });
    if (req.body.aceite !== true) return res.status(400).json({ message: "Marque que aceita receber os relatórios por e-mail." });
    const slug = /^[A-Za-z0-9_-]{3,40}$/.test(String(req.body.escola || "")) ? String(req.body.escola) : null;
    const [teste] = await TesteGratis.findOrCreate({ where: { email }, defaults: { nome, email, perfil, escola_slug: slug, aceite_em: new Date(), ultimo_relatorio: null } });
    Object.assign(teste, { nome, perfil, aceite_em: new Date() });
    await teste.save();
    const token = jwt.sign({ tipo: "teste" }, authConfig.secret, { subject: teste.id, expiresIn: "30d" } as jwt.SignOptions);
    return res.status(201).json({ token, teste: { nome: teste.nome, email: teste.email } });
  }

  // o PDF do relatório de um jogo, gerado no aparelho, vai por e-mail para quem está testando
  async relatorio(req: Request, res: Response): Promise<Response> {
    const teste = await testeDoToken(req);
    if (!teste) return res.status(401).json({ message: "Cadastre o seu e-mail no Testar grátis de novo." });
    const pdf = Buffer.from(String(req.body.pdf || "").replace(/^data:application\/pdf;[^,]*,/, ""), "base64");
    if (pdf.length < 100 || pdf.length > MAX_PDF || pdf.subarray(0, 5).toString() !== "%PDF-") {
      return res.status(400).json({ message: "Relatório inválido." });
    }
    const enviadosHoje = teste.ultimo_relatorio && teste.ultimo_relatorio.toDateString() === new Date().toDateString() ? teste.enviados_hoje : 0;
    if (enviadosHoje >= MAX_POR_DIA) return res.status(429).json({ message: `Limite de ${MAX_POR_DIA} relatórios por dia no teste grátis.`, codigo: "limite" });

    const aluno = limpar(req.body.aluno, 60) || "aluno";
    const titulo = limpar(req.body.titulo, 160) || "Jogo";
    const arquivo = `${limpar(req.body.arquivo, 120).replace(/[^a-zA-Z0-9._-]/g, "-") || "relatorio"}.pdf`.replace(/\.pdf\.pdf$/, ".pdf");
    try {
      await enviarRelatorioPDF(teste.email, teste.nome, aluno, titulo, pdf, arquivo);
    } catch (error) {
      const codigo = (error as { codigo?: string }).codigo;
      if (codigo === "email_nao_configurado") return res.status(503).json({ message: "O envio de e-mail ainda não foi ligado no servidor.", codigo });
      console.error("Erro ao enviar o relatório do teste grátis:", error);
      return res.status(502).json({ message: "Não deu para enviar o e-mail agora. Tente de novo mais tarde.", codigo: "envio" });
    }
    teste.relatorios += 1;
    teste.enviados_hoje = enviadosHoje + 1;
    teste.ultimo_relatorio = new Date();
    await teste.save();
    return res.json({ ok: true, para: teste.email });
  }

  // para o administrador: quem se cadastrou no teste grátis (para entrar em contato)
  async index(_req: Request, res: Response): Promise<Response> {
    const lista = await TesteGratis.findAll({ order: [["created_at", "DESC"]], limit: 1000 });
    return res.json(lista);
  }
}

export default new TesteGratisController();
