import { Router } from 'express';
import EscolaController from '../controllers/EscolaController';
import ensureAuthenticated from '../middlewares/ensureAuthenticated';
import carregarUsuarioLogado from '../middlewares/carregarUsuarioLogado';
import ensurePerfil from '../middlewares/ensurePerfil';

const escolaRoutes = Router();

// público: a marca de uma escola
escolaRoutes.get('/:slug/marca', EscolaController.marca);

// só o administrador da plataforma cria e edita escolas
escolaRoutes.get('/', ensureAuthenticated, carregarUsuarioLogado, ensurePerfil('admin'), EscolaController.index);
escolaRoutes.post('/', ensureAuthenticated, carregarUsuarioLogado, ensurePerfil('admin'), EscolaController.store);
escolaRoutes.put('/:id', ensureAuthenticated, carregarUsuarioLogado, ensurePerfil('admin'), EscolaController.update);

export default escolaRoutes;
