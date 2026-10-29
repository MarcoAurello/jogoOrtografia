import { Router } from 'express';
import TurmaController from '../controllers/TurmaController';
import AlunoController from '../controllers/AlunoController';
import PartidaController from '../controllers/PartidaController';
import ensureAuthenticated from '../middlewares/ensureAuthenticated';
import carregarUsuarioLogado from '../middlewares/carregarUsuarioLogado';

const turmaRoutes = Router();

// público: os nomes da turma para a tela de entrada do aluno
turmaRoutes.get('/codigo/:codigo/alunos', TurmaController.alunosPeloCodigo);

// professor, coordenação e administrador (cada um enxerga as turmas que pode)
turmaRoutes.use(ensureAuthenticated, carregarUsuarioLogado);
turmaRoutes.get('/', TurmaController.index);
turmaRoutes.post('/', TurmaController.store);
turmaRoutes.put('/:id', TurmaController.update);
turmaRoutes.get('/:turmaId/alunos', AlunoController.index);
turmaRoutes.post('/:turmaId/alunos', AlunoController.store);
turmaRoutes.get('/:turmaId/partidas', PartidaController.daTurma);

export default turmaRoutes;
