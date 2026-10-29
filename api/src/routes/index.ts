import { Router } from 'express';
import sessionRoutes from './session.routes';
import usuarioRoutes from './usuario.routes';
import escolaRoutes from './escola.routes';
import PlanilhaController from '../controllers/PlanilhaController';
import PaginaController from '../controllers/PaginaController';
import ensureAuthenticated from '../middlewares/ensureAuthenticated';
import carregarUsuarioLogado from '../middlewares/carregarUsuarioLogado';
import ensurePerfil from '../middlewares/ensurePerfil';

const routes = Router();

routes.get('/health', (_request, response) => {
  return response.json({ status: 'ok' });
});

routes.use('/sessions', sessionRoutes);
routes.use('/usuarios', usuarioRoutes);
routes.use('/escolas', escolaRoutes);

// gravações do professor na planilha do Google (até a fase 4), com a senha do script guardada no servidor
routes.post('/planilha', ensureAuthenticated, carregarUsuarioLogado, ensurePerfil('professor', 'coordenacao', 'admin'), PlanilhaController.gravar);

// a página de uma escola com a marca dela (o nginx manda /<escola> para cá)
routes.get('/pagina/:slug', PaginaController.show);

export default routes;
