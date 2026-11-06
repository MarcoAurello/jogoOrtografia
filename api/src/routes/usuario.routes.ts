import { Router } from 'express';
import UsuarioController from '../controllers/UsuarioController';
import ensureAuthenticated from '../middlewares/ensureAuthenticated';
import carregarUsuarioLogado, { carregarContaLogada } from '../middlewares/carregarUsuarioLogado';
import ensurePerfil from '../middlewares/ensurePerfil';

const usuarioRoutes = Router();

// qualquer perfil troca a própria senha (o responsável também)
usuarioRoutes.put('/eu/senha', ensureAuthenticated, carregarContaLogada, UsuarioController.trocarSenha);

usuarioRoutes.use(ensureAuthenticated, carregarUsuarioLogado);

// cadastro de usuários: administrador (todas as escolas) e coordenação (a própria escola)
usuarioRoutes.get('/', ensurePerfil('admin', 'coordenacao'), UsuarioController.index);
usuarioRoutes.post('/', ensurePerfil('admin', 'coordenacao'), UsuarioController.store);
usuarioRoutes.put('/:id', ensurePerfil('admin', 'coordenacao'), UsuarioController.update);

export default usuarioRoutes;
