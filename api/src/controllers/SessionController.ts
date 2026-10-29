import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario";
import Escola from "../models/Escola";
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
}

export default new SessionController();
