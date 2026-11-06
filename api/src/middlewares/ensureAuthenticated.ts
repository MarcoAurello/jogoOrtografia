import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth';

interface TokenPayload {
  sub: string;
  tipo?: 'aluno';
  turma?: string;   // aluno: a turma por onde ele entrou (as partidas e as competições são dessa turma)
  local?: 'casa';   // aluno que entrou em casa, pela conta do responsável (resp)
  resp?: string;
  sv?: number;      // aluno: a sessao_versao quando entrou (trocar o PIN derruba os tokens antigos)
  fc?: string;      // aluno em casa que entrou pelo código da família (gerar outro código derruba o token)
}

export default function ensureAuthenticated(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return response.status(401).json({ message: 'Token não informado.' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const { sub, tipo, turma, local, resp, sv, fc } = jwt.verify(token, authConfig.secret) as TokenPayload;
    request.userId = sub;
    request.alunoTurmaId = turma;
    request.alunoLocal = local === 'casa' ? 'casa' : 'escola';
    request.alunoResponsavelId = resp;
    request.alunoSessaoVersao = Number(sv) || 0;
    request.alunoCodigoFamilia = fc;
    // o token do aluno (código da turma + nome) é marcado: ele não abre as rotas do professor, e vice-versa
    request.tokenTipo = tipo === 'aluno' ? 'aluno' : 'usuario';
    return next();
  } catch {
    return response.status(401).json({ message: 'Token inválido.' });
  }
}
