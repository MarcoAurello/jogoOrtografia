import { Router } from 'express';
import SessionController from '../controllers/SessionController';
import ensureAuthenticated from '../middlewares/ensureAuthenticated';
import carregarUsuarioLogado from '../middlewares/carregarUsuarioLogado';
import carregarAlunoLogado from '../middlewares/carregarAlunoLogado';

const sessionRoutes = Router();

sessionRoutes.post('/', SessionController.store);
sessionRoutes.get('/eu', ensureAuthenticated, carregarUsuarioLogado, SessionController.show);

// aluno: código da turma + nome + figuras
sessionRoutes.post('/aluno', SessionController.aluno);
sessionRoutes.get('/aluno', ensureAuthenticated, carregarAlunoLogado, SessionController.alunoEu);

export default sessionRoutes;
