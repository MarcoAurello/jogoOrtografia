import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario";
import Escola from "../models/Escola";
import Aluno, { senhaAleatoria } from "../models/Aluno";
import Turma from "../models/Turma";
import authConfig from "../config/auth";
import { listarCompeticoes } from "../services/dados";

const limparNome = (nome: unknown) => String(nome || "").replace(/\s+/g, " ").trim().slice(0, 40);
const chaveDoNome = (n: string) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Hash fictício (não corresponde a nenhuma senha real) usado quando o e-mail não existe, para o bcrypt.compare
// sempre rodar e gastar o mesmo tempo do caminho "senha errada" (sem isso, dá para descobrir por tempo quais
// e-mails têm conta). Mesmo custo (8) do hash de verdade em Usuario.ts.
const HASH_FICTICIO = bcrypt.hashSync("nenhuma-conta-usa-esta-senha", 8);

// o usuário como o app precisa: dados, perfil e a marca da escola
export const usuarioParaApp = (usuario: Usuario) => ({
  id: usuario.id,
  nome: usuario.nome,
  email: usuario.email,
  perfil: usuario.perfil,
  primeiro_login: usuario.primeiro_login,
  escola: usuario.escola ? usuario.escola.marca() : null
});

class SessionController {
  // login de administrador, coordenação e professor (e-mail + senha)
  async store(req: Request, res: Response): Promise<Response> {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ message: "E-mail e senha são obrigatórios." });
      }

      const usuario = await Usuario.findOne({
        where: { email: String(email).trim().toLowerCase() },
        include: [{ model: Escola, as: "escola" }]
      });

      const senhaConfere = await bcrypt.compare(
        String(senha),
        usuario ? usuario.senha : HASH_FICTICIO
      );

      if (!usuario || !senhaConfere) {
        return res.status(401).json({ message: "E-mail ou senha inválidos." });
      }

      if (!usuario.ativo) {
        return res.status(403).json({ message: "Usuário desativado. Fale com a coordenação da escola." });
      }

      if (usuario.perfil !== "admin" && usuario.escola?.bloqueada) {
        return res.status(403).json({
          message: "O período de teste desta escola terminou (ou ela foi desativada). Fale com a Pedagogia Gamificada.",
          codigo: "escola_bloqueada"
        });
      }

      usuario.ultimo_acesso = new Date();
      await usuario.save({ hooks: false });

      const token = jwt.sign({}, authConfig.secret, {
        subject: usuario.id,
        expiresIn: authConfig.expiresIn
      } as jwt.SignOptions);

      return res.status(200).json({ token, usuario: usuarioParaApp(usuario) });
    } catch (error) {
      console.error("Erro ao autenticar usuário:", error);
      return res.status(500).json({ message: "Erro ao autenticar usuário." });
    }
  }

  // quem está logado (o app confere ao abrir a Área do professor)
  async show(req: Request, res: Response): Promise<Response> {
    return res.json({ usuario: { ...usuarioParaApp(req.usuarioLogado!), adminNaEscola: !!req.adminNaEscola } });
  }

  // login do aluno: só o código da turma e o nome (sem senha). O aluno toca no nome dele (se o professor cadastrou a
  // turma) ou digita o nome: um nome novo entra na turma na hora, para as partidas dele ficarem no relatório do professor.
  // O mesmo nome (sem diferença de acentos e maiúsculas) é sempre o mesmo aluno.
  async aluno(req: Request, res: Response): Promise<Response> {
    try {
      const codigo = String(req.body.codigo || "").trim().toUpperCase();
      const turma = await Turma.findOne({ where: { codigo, ativa: true }, include: [{ model: Escola, as: "escola" }] });
      if (!turma) return res.status(404).json({ message: "Não achei essa turma. Confira o código com o professor." });
      if (turma.escola?.bloqueada) return res.status(403).json({ message: "O acesso desta escola está bloqueado.", codigo: "escola_bloqueada" });

      let aluno: Aluno | null = null;
      if (req.body.aluno_id) aluno = await Aluno.findOne({ where: { id: String(req.body.aluno_id), turma_id: turma.id, ativo: true } });
      else {
        const nome = limparNome(req.body.nome);
        if (nome.length < 2) return res.status(400).json({ message: "Digite o seu nome." });
        const daTurma = await Aluno.findAll({ where: { turma_id: turma.id, ativo: true } });
        aluno = daTurma.find((a) => chaveDoNome(a.nome) === chaveDoNome(nome)) || null;
        if (!aluno) {
          aluno = await Aluno.create({ nome, turma_id: turma.id, escola_id: turma.escola_id, senha_figuras: senhaAleatoria(),
            bloqueado_ate: null, ultimo_acesso: null });
        }
      }
      if (!aluno) return res.status(404).json({ message: "Não achei você nesta turma. Confira o código com o professor." });

      aluno.ultimo_acesso = new Date();
      await aluno.save();
      aluno.turma = turma;
      aluno.escola = turma.escola || null;
      // o login do aluno vale até ele voltar à tela inicial (o app apaga); o prazo é só uma garantia
      const token = jwt.sign({ tipo: "aluno" }, authConfig.secret, { subject: aluno.id, expiresIn: "12h" } as jwt.SignOptions);
      return res.json({ token, aluno: alunoParaApp(aluno) });
    } catch (error) {
      console.error("Erro no login do aluno:", error);
      return res.status(500).json({ message: "Erro ao entrar. Tente de novo." });
    }
  }

  // as competições da turma do aluno logado (as abertas e as que encerraram há pouco, com o ranking)
  async alunoCompeticoes(req: Request, res: Response): Promise<Response> {
    try {
      const aluno = req.alunoLogado!;
      const lista = await listarCompeticoes(aluno.escola_id, false, [aluno.turma_id], true);
      return res.status(200).json({ ok: true, lista });
    } catch (error) {
      console.error("Erro ao listar as competições da turma:", error);
      return res.status(500).json({ message: "Erro ao buscar as competições." });
    }
  }

  // o aluno logado (o app confere ao abrir)
  async alunoEu(req: Request, res: Response): Promise<Response> {
    return res.json({ aluno: alunoParaApp(req.alunoLogado!) });
  }
}

const alunoParaApp = (aluno: Aluno) => ({
  id: aluno.id,
  nome: aluno.nome,
  turma: aluno.turma ? { nome: aluno.turma.nome, codigo: aluno.turma.codigo } : null,
  escola: aluno.escola ? aluno.escola.marca() : null
});

export default new SessionController();
