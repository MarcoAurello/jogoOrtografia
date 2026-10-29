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
app.use(express.json({ limit: '200kb' }));   // o logo da escola vem junto (até ~60 KB)

// Login é o alvo óbvio de força bruta: bloqueia só quem passar de 10 tentativas ERRADAS em 1 minuto
// (bloqueio também de 1 min). Login certo não consome o limite.
const limitadorLogin = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de login. Aguarde 1 minuto e tente novamente.' },
});
app.use('/sessions', limitadorLogin);
app.use('/usuarios/eu/senha', limitadorLogin);

app.use(routes);

export default app;
