import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth';

interface TokenPayload {
  sub: string;
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
    const { sub } = jwt.verify(token, authConfig.secret) as TokenPayload;
    request.userId = sub;
    return next();
  } catch {
    return response.status(401).json({ message: 'Token inválido.' });
  }
}
