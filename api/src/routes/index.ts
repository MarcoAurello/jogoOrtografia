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
import DadosController from '../controllers/DadosController';
import RelatorioController from '../controllers/RelatorioController';
import ImportacaoController from '../controllers/ImportacaoController';
import AnamneseController from '../controllers/AnamneseController';
import ObservacaoController from '../controllers/ObservacaoController';
import PlanoController from '../controllers/PlanoController';
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
// alunos da escola (com ou sem turma), o cadastro e as anamneses (tela Alunos e anamnese)
routes.get('/alunos', ensureAuthenticated, carregarUsuarioLogado, AlunoController.escola);
routes.post('/alunos', ensureAuthenticated, carregarUsuarioLogado, AlunoController.criar);
routes.get('/alunos/:id', ensureAuthenticated, carregarUsuarioLogado, AlunoController.show);
routes.put('/alunos/:id', ensureAuthenticated, carregarUsuarioLogado, AlunoController.update);
routes.post('/alunos/:id/anamneses', ensureAuthenticated, carregarUsuarioLogado, AnamneseController.aplicar);
routes.post('/alunos/:id/anamneses/link', ensureAuthenticated, carregarUsuarioLogado, AnamneseController.gerarLink);
routes.get('/anamneses/modelos', ensureAuthenticated, carregarUsuarioLogado, AnamneseController.modelos);
routes.post('/anamneses/modelos', ensureAuthenticated, carregarUsuarioLogado, AnamneseController.criarModelo);
routes.put('/anamneses/modelos/:id', ensureAuthenticated, carregarUsuarioLogado, AnamneseController.atualizarModelo);
routes.put('/anamneses/:id/cancelar', ensureAuthenticated, carregarUsuarioLogado, AnamneseController.cancelar);
// observações de evolução do aluno (coordenação e professor)
routes.get('/alunos/:id/observacoes', ensureAuthenticated, carregarUsuarioLogado, ObservacaoController.index);
routes.post('/alunos/:id/observacoes', ensureAuthenticated, carregarUsuarioLogado, ObservacaoController.store);
routes.put('/observacoes/:id', ensureAuthenticated, carregarUsuarioLogado, ObservacaoController.update);
routes.delete('/observacoes/:id', ensureAuthenticated, carregarUsuarioLogado, ObservacaoController.destroy);
// plano de objetivos psicopedagógicos do aluno
routes.get('/alunos/:id/planos', ensureAuthenticated, carregarUsuarioLogado, PlanoController.index);
routes.post('/alunos/:id/planos', ensureAuthenticated, carregarUsuarioLogado, PlanoController.store);
routes.put('/planos/:id', ensureAuthenticated, carregarUsuarioLogado, PlanoController.update);
routes.delete('/planos/:id', ensureAuthenticated, carregarUsuarioLogado, PlanoController.destroy);
// a página da família: pública, só com o token do link (vale 3 horas e uma resposta)
routes.get('/anamnese-publica/:token', AnamneseController.publicaVer);
routes.post('/anamnese-publica/:token', AnamneseController.publicaResponder);
routes.get('/alunos/:id/ficha', ensureAuthenticated, carregarUsuarioLogado, PainelController.aluno);

// teste grátis: cadastro do e-mail e o PDF de cada jogo por e-mail; a lista é só do administrador
routes.post('/testes', TesteGratisController.store);
routes.post('/testes/relatorio', TesteGratisController.relatorio);
routes.get('/testes', ensureAuthenticated, carregarUsuarioLogado, ensurePerfil('admin'), TesteGratisController.index);

// o fim de cada jogo do aluno logado
routes.post('/partidas', ensureAuthenticated, carregarAlunoLogado, PartidaController.store);

// e-mails dos relatórios, questionários e competições (o que antes vinha da planilha do Google; mesmas ações e respostas)
routes.get('/dados', DadosController.ler);
routes.post('/dados', DadosController.gravar);
// o relatório de uma partida por e-mail: a API confere o destinatário e o script do Google só envia (carteiro)
routes.post('/relatorios', RelatorioController.enviar);
// administrador: traz para o banco o que está na planilha do Google (escolas, e-mails, questionários, competições)
routes.post('/admin/importar-planilha', ensureAuthenticated, carregarUsuarioLogado, ensurePerfil('admin'), ImportacaoController.importar);

// gravações do professor (e-mails, questionários, competições), no banco; o nome /planilha ficou do tempo da planilha
routes.post('/planilha', ensureAuthenticated, carregarUsuarioLogado, ensurePerfil('professor', 'coordenacao', 'admin'), PlanilhaController.gravar);

// a página de uma escola com a marca dela (o nginx manda /<escola> para cá)
routes.get('/pagina/:slug', PaginaController.show);

export default routes;
