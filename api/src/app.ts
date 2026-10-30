import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes';

const app = express();

// A requisição chega por 2 proxies (Traefik do Dokploy → nginx do app). Sem confiar nesses saltos, req.ip seria o
// IP do nginx para todo mundo e o limite de tentativas de login viraria um contador único que travaria todos.
// Ajustável por TRUST_PROXY_HOPS.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 2));

// o app e a API ficam no mesmo endereço (o nginx manda /api para cá); FRONTEND_URL libera outros endereços (dev)
const origensPermitidas = (process.env.FRONTEND_URL || 'http://localhost:8080')
  .split(',')
  .map((origem) => origem.trim());

// sem a política de conteúdo do helmet: a página das escolas (/pagina) usa scripts e estilos no próprio HTML
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: origensPermitidas }));
app.use('/testes/relatorio', express.json({ limit: '2mb' }));   // o PDF do relatório (base64)
app.use(express.json({ limit: '500kb' }));   // o logo da escola (até ~60 KB) e as rodadas de uma partida

// Login é o alvo óbvio de força bruta: bloqueia só quem passar de 10 tentativas ERRADAS em 1 minuto
// (bloqueio também de 1 min). Login certo não consome o limite.
const limitadorLogin = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/aluno'),
  message: { message: 'Muitas tentativas de login. Aguarde 1 minuto e tente novamente.' },
});
// O aluno entra só com o código da turma e o nome (sem senha): o login quase sempre "dá certo", então o limite conta
// todas as entradas. Os alunos de uma escola saem pelo mesmo IP, por isso o limite é folgado (uma turma inteira entra
// junto); o SessionController ainda limita quantos alunos uma turma pode ter.
const limitadorAluno = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Espere 1 minuto e tente de novo.' },
});
app.use('/sessions/aluno', limitadorAluno);
// cadastro do teste grátis: poucos por IP (evita encher a lista com cadastros falsos)
app.use('/testes', rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  skip: (req) => req.method !== 'POST' || req.path !== '/', message: { message: 'Muitos cadastros deste endereço. Tente mais tarde.' } }));
// a página pública da anamnese (link da família): poucos pedidos por IP (o token já é impossível de adivinhar)
app.use('/anamnese-publica', rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Muitos pedidos. Espere 1 minuto e tente de novo.' } }));
app.use('/sessions', limitadorLogin);
app.use('/usuarios/eu/senha', limitadorLogin);

app.use(routes);

export default app;
