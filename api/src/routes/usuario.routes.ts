import { Router } from 'express';
import UsuarioController from '../controllers/UsuarioController';
import ensureAuthenticated from '../middlewares/ensureAuthenticated';
import carregarUsuarioLogado from '../middlewares/carregarUsuarioLogado';
import ensurePerfil from '../middlewares/ensurePerfil';

const usuarioRoutes = Router();

usuarioRoutes.use(ensureAuthenticated, carregarUsuarioLogado);

// qualquer perfil troca a própria senha
usuarioRoutes.put('/eu/senha', UsuarioController.trocarSenha);

// cadastro de usuários: administrador (todas as escolas) e coordenação (a própria escola)
usuarioRoutes.get('/', ensurePerfil('admin', 'coordenacao'), UsuarioController.index);
usuarioRoutes.post('/', ensurePerfil('admin', 'coordenacao'), UsuarioController.store);
usuarioRoutes.put('/:id', ensurePerfil('admin', 'coordenacao'), UsuarioController.update);

export default usuarioRoutes;
