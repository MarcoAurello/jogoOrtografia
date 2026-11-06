import { NextFunction, Request, Response } from "express";
import Usuario from "../models/Usuario";
import Escola from "../models/Escola";

// carrega o usuário do token (com a escola) e barra quem foi desativado ou cuja escola está bloqueada
// (teste grátis vencido ou escola desativada: tudo bloqueado, menos para o administrador).
// O administrador pode "entrar" numa escola (cabeçalho X-Escola com o id dela): daí faz tudo como a coordenação
// daquela escola (turmas, professores, competições...). Só nesta requisição: nada disso é gravado no usuário.
// O responsável (família) é barrado aqui: as rotas dos profissionais nem chegam a olhar o aluno. As rotas que a família
// usa (/familia, /sessions/eu, trocar a senha) usam carregarContaLogada, que deixa o responsável passar.
export default function carregarUsuarioLogado(request: Request, response: Response, next: NextFunction) {
  return carregar(request, response, next, false);
}

export function carregarContaLogada(request: Request, response: Response, next: NextFunction) {
  return carregar(request, response, next, true);
}

async function carregar(request: Request, response: Response, next: NextFunction, aceitaResponsavel: boolean) {
  try {
    if (!request.userId || request.tokenTipo !== "usuario") {
      return response.status(401).json({ message: "Não autenticado." });
    }

    const usuario = await Usuario.findByPk(request.userId, {
      include: [{ model: Escola, as: "escola" }]
    });

    if (!usuario || !usuario.ativo) {
      return response.status(401).json({ message: "Usuário inválido ou inativo." });
    }

    if (usuario.perfil === "responsavel" && !aceitaResponsavel) {
      return response.status(403).json({ message: "Esta área é da equipe da escola. A família acompanha pela área da família.", codigo: "area_da_familia" });
    }

    if (usuario.perfil !== "admin" && usuario.escola?.bloqueada) {
      return response.status(403).json({ message: "O acesso desta escola está bloqueado.", codigo: "escola_bloqueada" });
    }

    const naEscola = String(request.headers["x-escola"] || "");
    if (usuario.perfil === "admin" && naEscola) {
      const escola = await Escola.findByPk(naEscola);
      if (!escola) return response.status(404).json({ message: "Escola não encontrada." });
      usuario.perfil = "coordenacao";
      usuario.escola_id = escola.id;
      usuario.escola = escola;
      request.adminNaEscola = true;
    }

    request.usuarioLogado = usuario;
    return next();
  } catch (error) {
    console.error("Erro ao carregar usuário logado:", error);
    return response.status(500).json({ message: "Erro ao carregar usuário logado." });
  }
}
