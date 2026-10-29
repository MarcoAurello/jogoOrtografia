import { Router } from 'express';
import sessionRoutes from './session.routes';
import usuarioRoutes from './usuario.routes';
import escolaRoutes from './escola.routes';
import turmaRoutes from './turma.routes';
import PlanilhaController from '../controllers/PlanilhaController';
import PaginaController from '../controllers/PaginaController';
import AlunoController from '../controllers/AlunoController';
import PartidaController from '../controllers/PartidaController';
import PainelController from '../controllers/PainelController';
import TesteGratisController from '../controllers/TesteGratisController';
import ensureAuthenticated from '../middlewares/ensureAuthenticated';
import carregarUsuarioLogado from '../middlewares/carregarUsuarioLogado';
import carregarAlunoLogado from '../middlewares/carregarAlunoLogado';
import ensurePerfil from '../middlewares/ensurePerfil';

const routes = Router();

routes.get('/health', (_request, response) => {
  return response.json({ status: 'ok' });
});

routes.use('/sessions', sessionRoutes);
routes.use('/usuarios', usuarioRoutes);
routes.use('/escolas', escolaRoutes);
routes.use('/turmas', turmaRoutes);
routes.put('/alunos/:id', ensureAuthenticated, carregarUsuarioLogado, AlunoController.update);
routes.get('/alunos/:id/ficha', ensureAuthenticated, carregarUsuarioLogado, PainelController.aluno);

// teste grátis: cadastro do e-mail e o PDF de cada jogo por e-mail; a lista é só do administrador
routes.post('/testes', TesteGratisController.store);
routes.post('/testes/relatorio', TesteGratisController.relatorio);
routes.get('/testes', ensureAuthenticated, carregarUsuarioLogado, ensurePerfil('admin'), TesteGratisController.index);

// o fim de cada jogo do aluno logado
routes.post('/partidas', ensureAuthenticated, carregarAlunoLogado, PartidaController.store);

// gravações do professor na planilha do Google (até a fase 4), com a senha do script guardada no servidor
routes.post('/planilha', ensureAuthenticated, carregarUsuarioLogado, ensurePerfil('professor', 'coordenacao', 'admin'), PlanilhaController.gravar);

// a página de uma escola com a marca dela (o nginx manda /<escola> para cá)
routes.get('/pagina/:slug', PaginaController.show);

export default routes;
