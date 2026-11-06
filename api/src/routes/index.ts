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
import SessaoController from '../controllers/SessaoController';
import FamiliaController from '../controllers/FamiliaController';
import ensureAuthenticated from '../middlewares/ensureAuthenticated';
import carregarUsuarioLogado, { carregarContaLogada } from '../middlewares/carregarUsuarioLogado';
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
// sessões do plano (cronograma do plano de ação) e o prontuário de bordo
routes.get('/planos/:id/sessoes', ensureAuthenticated, carregarUsuarioLogado, SessaoController.index);
routes.post('/planos/:id/sessoes', ensureAuthenticated, carregarUsuarioLogado, SessaoController.store);
routes.put('/sessoes/:id', ensureAuthenticated, carregarUsuarioLogado, SessaoController.update);
routes.delete('/sessoes/:id', ensureAuthenticated, carregarUsuarioLogado, SessaoController.destroy);
// a página da família: pública, só com o token do link (vale 3 horas e uma resposta)
routes.get('/anamnese-publica/:token', AnamneseController.publicaVer);
routes.post('/anamnese-publica/:token', AnamneseController.publicaResponder);
routes.get('/alunos/:id/ficha', ensureAuthenticated, carregarUsuarioLogado, PainelController.aluno);

// família (docs/PLANO-FAMILIA.md): os responsáveis do aluno, recados para a família e o que a família vê
routes.get('/alunos/:id/responsaveis', ensureAuthenticated, carregarUsuarioLogado, FamiliaController.responsaveis);
routes.delete('/alunos/:id/responsaveis/:responsavelId', ensureAuthenticated, carregarUsuarioLogado, FamiliaController.desvincular);
// a equipe redefine a senha do responsável (provisória) e o PIN do aluno cadastrado
routes.put('/alunos/:id/responsaveis/:responsavelId/senha', ensureAuthenticated, carregarUsuarioLogado, FamiliaController.redefinirSenhaDoResponsavel);
routes.put('/alunos/:id/pin', ensureAuthenticated, carregarUsuarioLogado, FamiliaController.redefinirPin);
routes.get('/alunos/:id/recados', ensureAuthenticated, carregarUsuarioLogado, FamiliaController.recados);
routes.post('/alunos/:id/recados', ensureAuthenticated, carregarUsuarioLogado, FamiliaController.criarRecado);
routes.put('/recados/:id', ensureAuthenticated, carregarUsuarioLogado, FamiliaController.atualizarRecado);
routes.delete('/recados/:id', ensureAuthenticated, carregarUsuarioLogado, FamiliaController.apagarRecado);
routes.get('/visivel-familia', ensureAuthenticated, carregarUsuarioLogado, FamiliaController.verChaves);
routes.put('/visivel-familia', ensureAuthenticated, carregarUsuarioLogado, FamiliaController.mudarChaves);
routes.get('/alunos/:id/visivel-familia', ensureAuthenticated, carregarUsuarioLogado, FamiliaController.verChavesDoAluno);
routes.put('/alunos/:id/visivel-familia', ensureAuthenticated, carregarUsuarioLogado, FamiliaController.mudarChavesDoAluno);
// a página de cadastro da família (endereço fixo): /<escola>/cadastro e /cadastro/<apelido> do professor avulso;
// a chave "aceitar cadastros" e o endereço ficam com a coordenação (ou o professor avulso)
routes.get('/cadastro-familia/config', ensureAuthenticated, carregarUsuarioLogado, FamiliaController.verCadastro);
routes.put('/cadastro-familia/config', ensureAuthenticated, carregarUsuarioLogado, FamiliaController.mudarCadastro);
routes.get('/cadastro-familia/publico/:tipo/:chave', FamiliaController.paginaCadastro);
routes.post('/cadastro-familia/publico/:tipo/:chave', FamiliaController.cadastrar);
// a área do responsável: só os filhos dele e só o que a escola deixa a família ver
const responsavel = [ensureAuthenticated, carregarContaLogada, ensurePerfil('responsavel')];
routes.get('/familia/filhos', ...responsavel, FamiliaController.filhos);
routes.get('/familia/filhos/:id', ...responsavel, FamiliaController.filho);
routes.put('/familia/filhos/:id', ...responsavel, FamiliaController.atualizarFilho);
routes.put('/familia/filhos/:id/pin', ...responsavel, FamiliaController.trocarPin);
// jogar em casa: o filho digita o PIN no aparelho do responsável e recebe o token de aluno (local = casa)
routes.post('/familia/filhos/:id/entrar', ...responsavel, FamiliaController.entrarParaJogar);
// o código da família: o responsável vê e gera outro; o aparelho do filho usa as rotas públicas (com limite por IP)
routes.get('/familia/codigo', ...responsavel, FamiliaController.verCodigo);
routes.post('/familia/codigo/novo', ...responsavel, FamiliaController.novoCodigo);
routes.get('/familia-codigo/:codigo', FamiliaController.filhosPeloCodigo);
routes.post('/familia-codigo/:codigo/entrar', FamiliaController.entrarPeloCodigo);
routes.get('/familia/filhos/:id/jogos', ...responsavel, FamiliaController.jogos);
routes.get('/familia/filhos/:id/recados', ...responsavel, FamiliaController.recadosDoFilho);
routes.get('/familia/filhos/:id/planos', ...responsavel, FamiliaController.planosDoFilho);
routes.get('/familia/filhos/:id/anamneses', ...responsavel, FamiliaController.anamnesesDoFilho);

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
