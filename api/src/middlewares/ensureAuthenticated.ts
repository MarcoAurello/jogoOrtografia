import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth';

interface TokenPayload {
  sub: string;
  tipo?: 'aluno';
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
    const { sub, tipo } = jwt.verify(token, authConfig.secret) as TokenPayload;
    request.userId = sub;
    // o token do aluno (login por figuras) é marcado: ele não abre as rotas do professor, e vice-versa
    request.tokenTipo = tipo === 'aluno' ? 'aluno' : 'usuario';
    return next();
  } catch {
    return response.status(401).json({ message: 'Token inválido.' });
  }
}
