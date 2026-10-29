import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { UniqueConstraintError } from "sequelize";
import Usuario, { Perfil } from "../models/Usuario";
import Escola from "../models/Escola";

const emailValido = (m: string) => /^[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}$/i.test(m);
const SENHA_MINIMA = 8;

// quem pode cadastrar quem: o administrador cadastra qualquer perfil em qualquer escola;
// a coordenação cadastra coordenação e professores só da própria escola
function podeGerenciar(quem: Usuario, perfil: Perfil, escolaId: string | null): boolean {
  if (quem.perfil === "admin") return true;
  if (quem.perfil === "coordenacao") return perfil !== "admin" && escolaId === quem.escola_id;
  return false;
}

class UsuarioController {
  // lista: o administrador vê todos (ou os de uma escola, ?escola=<id>); a coordenação, os da escola dela
  async index(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const where: Record<string, unknown> = {};
    if (eu.perfil === "coordenacao") where.escola_id = eu.escola_id;
    else if (req.query.escola) where.escola_id = String(req.query.escola);
    const usuarios = await Usuario.findAll({
      where,
      include: [{ model: Escola, as: "escola", attributes: ["id", "slug", "nome"] }],
      order: [["perfil", "ASC"], ["nome", "ASC"]]
    });
    return res.json(usuarios);
  }

  // cadastro com senha provisória: a pessoa troca no primeiro acesso
  async store(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const nome = String(req.body.nome || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const senha = String(req.body.senha || "");
    const perfil = (["admin", "coordenacao", "professor"].includes(req.body.perfil) ? req.body.perfil : "professor") as Perfil;
    const escolaId: string | null = perfil === "admin" ? null : eu.perfil === "admin" ? (req.body.escola_id || null) : eu.escola_id;

    if (!nome) return res.status(400).json({ message: "Digite o nome." });
    if (!emailValido(email)) return res.status(400).json({ message: "Digite um e-mail válido, como nome@escola.com." });
    if (senha.length < SENHA_MINIMA) return res.status(400).json({ message: `A senha provisória precisa de ${SENHA_MINIMA} caracteres ou mais.` });
    if (!podeGerenciar(eu, perfil, escolaId)) return res.status(403).json({ message: "Você não pode cadastrar este perfil." });
    if (escolaId && !(await Escola.findByPk(escolaId))) return res.status(400).json({ message: "Escola não encontrada." });

    try {
      const usuario = await Usuario.create({ nome, email, senha, perfil, escola_id: escolaId, ultimo_acesso: null });
      return res.status(201).json(usuario);
    } catch (error) {
      if (error instanceof UniqueConstraintError) return res.status(409).json({ message: "Este e-mail já tem cadastro." });
      console.error("Erro ao cadastrar usuário:", error);
      return res.status(500).json({ message: "Erro ao cadastrar usuário." });
    }
  }

  // muda nome, ativo ou dá uma senha provisória nova (esqueceu a senha)
  async update(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario || !podeGerenciar(eu, usuario.perfil, usuario.escola_id)) return res.status(404).json({ message: "Usuário não encontrado." });
    if (usuario.id === eu.id && req.body.ativo === false) return res.status(400).json({ message: "Você não pode desativar o próprio acesso." });

    if (typeof req.body.nome === "string" && req.body.nome.trim()) usuario.nome = req.body.nome.trim();
    if (typeof req.body.ativo === "boolean") usuario.ativo = req.body.ativo;
    if (req.body.senha !== undefined) {
      const senha = String(req.body.senha);
      if (senha.length < SENHA_MINIMA) return res.status(400).json({ message: `A senha provisória precisa de ${SENHA_MINIMA} caracteres ou mais.` });
      usuario.senha = senha;
      usuario.primeiro_login = true;
    }
    await usuario.save();
    return res.json(usuario);
  }

  // a própria pessoa troca a senha (obrigatório no primeiro acesso)
  async trocarSenha(req: Request, res: Response): Promise<Response> {
    // relido do banco: o administrador dentro de uma escola está com o perfil trocado só na memória
    const eu = (await Usuario.findByPk(req.usuarioLogado!.id))!;
    const atual = String(req.body.senhaAtual || "");
    const nova = String(req.body.novaSenha || "");
    if (!(await bcrypt.compare(atual, eu.senha))) return res.status(400).json({ message: "A senha atual não confere." });
    if (nova.length < SENHA_MINIMA) return res.status(400).json({ message: `A senha nova precisa de ${SENHA_MINIMA} caracteres ou mais.` });
    if (nova === atual) return res.status(400).json({ message: "A senha nova precisa ser diferente da atual." });
    eu.senha = nova;
    eu.primeiro_login = false;
    await eu.save();
    return res.json({ ok: true });
  }
}

export default new UsuarioController();
