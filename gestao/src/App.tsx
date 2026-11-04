// Rotas da gestão. Toda rota (menos /login) exige login; cada área só abre para os perfis do menu dela.
import { lazy, ReactNode, Suspense, useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Box, CircularProgress, CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { ProvedorAuth, useAuth } from './lib/auth';
import { ITENS_MENU } from './lib/menu';
import { criarTema } from './tema';
import Layout from './components/Layout';
import Login from './paginas/login/Login';
import Inicio from './paginas/inicio/Inicio';
import EmBreve from './paginas/EmBreve';
// cada área só é baixada quando abre (o login e o início ficam leves no celular)
const Escolas = lazy(() => import('./paginas/escolas/Escolas'));
const Usuarios = lazy(() => import('./paginas/usuarios/Usuarios'));
const Testes = lazy(() => import('./paginas/testes/Testes'));
const AreaTurmas = lazy(() => import('./paginas/turmas/AreaTurmas'));
const AlunosEscola = lazy(() => import('./paginas/alunos/AlunosEscola'));
const AlunoPerfil = lazy(() => import('./paginas/alunos/AlunoPerfil'));
const EditorPlano = lazy(() => import('./paginas/alunos/plano/EditorPlano'));
const ImprimirPlano = lazy(() => import('./paginas/alunos/plano/ImprimirPlano'));
const AreaModelos = lazy(() => import('./paginas/modelos/AreaModelos'));
const Emails = lazy(() => import('./paginas/emails/Emails'));
const AreaQuestionarios = lazy(() => import('./paginas/questionarios/AreaQuestionarios'));
const Competicoes = lazy(() => import('./paginas/competicoes/Competicoes'));
const Links = lazy(() => import('./paginas/links/Links'));
const Ficha = lazy(() => import('./paginas/ficha/Ficha'));
const Jogos = lazy(() => import('./paginas/jogos/Jogos'));
import { ProvedorAvisos } from './components/Avisos';
import { ProvedorConfirmar } from './components/Confirmar';
import { CarregandoLista } from './components/EstadoLista';
import type { Perfil } from './types';

// as áreas que já vieram para a gestão nova; as outras mostram o "Em breve" com o link para a Área do professor antiga
const TELAS: Record<string, JSX.Element> = {
  '/escolas': <Escolas />,
  '/usuarios': <Usuarios />,
  '/testes': <Testes />,
  '/turmas': <AreaTurmas />,
  '/anamnese': <AlunosEscola />,
  '/alunos': <AlunosEscola />,
  '/modelos-anamnese': <AreaModelos />,
  '/emails': <Emails />,
  '/questionarios': <AreaQuestionarios />,
  '/competicoes': <Competicoes />,
  '/links': <Links />,
  '/jogos': <Jogos />,
};

function Carregando() {
  return <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
}

function ExigeLogin({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth();
  const local = useLocation();
  if (carregando) return <Carregando />;
  if (!usuario) return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  return <>{children}</>;
}

// a tela só esconde; a API recusa de qualquer jeito o que o perfil não pode
function ExigePerfil({ perfis, children }: { perfis: Perfil[]; children: ReactNode }) {
  const { usuario } = useAuth();
  if (!usuario || !perfis.includes(usuario.perfil)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Rotas() {
  const { usuario } = useAuth();
  const tema = useMemo(() => criarTema(usuario?.escola || null), [usuario?.escola]);

  return (
    <ThemeProvider theme={tema}>
      <CssBaseline />
      <ProvedorAvisos>
        <ProvedorConfirmar>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ExigeLogin><Layout /></ExigeLogin>}>
              <Route index element={<Inicio />} />
              {ITENS_MENU.map((i) => (
                <Route key={i.caminho} path={`${i.caminho}/*`}
                  element={<ExigePerfil perfis={i.perfis}>
                    <Suspense fallback={<CarregandoLista />}>{TELAS[i.caminho] || <EmBreve titulo={i.titulo} />}</Suspense>
                  </ExigePerfil>} />
              ))}
              {/* a ficha abre a partir da turma e do painel (e, na fase 4, de Alunos e anamnese) */}
              {/* o aluno (página, editor do plano e o plano para imprimir): quem vê decide a API */}
              {[['/aluno/:id', <AlunoPerfil />], ['/aluno/:id/plano/:planoId', <EditorPlano />], ['/aluno/:id/plano/:planoId/imprimir', <ImprimirPlano />]].map(([caminho, tela]) => (
                <Route key={caminho as string} path={caminho as string} element={<Suspense fallback={<CarregandoLista />}>{tela}</Suspense>} />
              ))}
              <Route path="/ficha/:id" element={<ExigePerfil perfis={['coordenacao', 'professor', 'admin']}>
                <Suspense fallback={<CarregandoLista />}><Ficha /></Suspense>
              </ExigePerfil>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ProvedorConfirmar>
      </ProvedorAvisos>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/gestao">
      <ProvedorAuth>
        <Rotas />
      </ProvedorAuth>
    </BrowserRouter>
  );
}
