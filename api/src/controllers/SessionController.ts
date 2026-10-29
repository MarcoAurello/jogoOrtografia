import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario";
import Escola from "../models/Escola";
import Aluno from "../models/Aluno";
import Turma from "../models/Turma";
import authConfig from "../config/auth";

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
    return res.json({ usuario: usuarioParaApp(req.usuarioLogado!) });
  }

  // login do aluno: código da turma, o aluno que ele tocou na lista e as 3 figuras.
  // 5 erros seguidos travam aquele aluno por 1 minuto (a senha de figuras tem só 729 combinações).
  async aluno(req: Request, res: Response): Promise<Response> {
    try {
      const codigo = String(req.body.codigo || "").trim().toUpperCase();
      const figuras = Array.isArray(req.body.figuras) ? req.body.figuras.map((f: unknown) => Math.round(Number(f))) : [];
      const aluno = await Aluno.findOne({
        where: { id: String(req.body.aluno_id || ""), ativo: true },
        include: [{ model: Turma, as: "turma", where: { codigo, ativa: true } }, { model: Escola, as: "escola" }]
      });
      if (!aluno) return res.status(404).json({ message: "Não achei você nesta turma. Confira o código com o professor." });
      if (aluno.escola?.bloqueada) return res.status(403).json({ message: "O acesso desta escola está bloqueado.", codigo: "escola_bloqueada" });

      if (aluno.bloqueado_ate && aluno.bloqueado_ate.getTime() > Date.now()) {
        const segundos = Math.ceil((aluno.bloqueado_ate.getTime() - Date.now()) / 1000);
        return res.status(429).json({ message: `Muitas tentativas. Espere ${segundos} segundos e tente de novo.`, codigo: "aluno_travado", segundos });
      }

      if (figuras.join(",") !== aluno.senha_figuras) {
        aluno.tentativas += 1;
        if (aluno.tentativas >= 5) { aluno.tentativas = 0; aluno.bloqueado_ate = new Date(Date.now() + 60 * 1000); }
        await aluno.save();
        return res.status(401).json({ message: "Figuras erradas. Tente de novo! Se esqueceu, peça ao professor.", codigo: "figuras" });
      }

      aluno.tentativas = 0;
      aluno.bloqueado_ate = null;
      aluno.ultimo_acesso = new Date();
      await aluno.save();
      const token = jwt.sign({ tipo: "aluno" }, authConfig.secret, { subject: aluno.id, expiresIn: "60d" } as jwt.SignOptions);
      return res.json({ token, aluno: alunoParaApp(aluno) });
    } catch (error) {
      console.error("Erro no login do aluno:", error);
      return res.status(500).json({ message: "Erro ao entrar. Tente de novo." });
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
