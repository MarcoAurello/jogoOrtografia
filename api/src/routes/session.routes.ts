import { Router } from 'express';
import SessionController from '../controllers/SessionController';
import ensureAuthenticated from '../middlewares/ensureAuthenticated';
import carregarUsuarioLogado from '../middlewares/carregarUsuarioLogado';

const sessionRoutes = Router();

sessionRoutes.post('/', SessionController.store);
sessionRoutes.get('/eu', ensureAuthenticated, carregarUsuarioLogado, SessionController.show);

export default sessionRoutes;
