// Alunos e anamnese: todos os alunos da escola (com ou sem turma). Cada cartão mostra o que já tem (anamnese, plano,
// observações) e abre a página do aluno. O administrador fora de escola vê todos, com filtro por escola.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, Card, CardActionArea, Chip, Stack, Typography } from '@mui/material';
import CabecalhoPagina from '../../components/CabecalhoPagina';
import BarraFiltros from '../../components/BarraFiltros';
import FiltroSelect from '../../components/FiltroSelect';
import { CarregandoLista, ErroLista, GradeCartoes, ListaVazia } from '../../components/EstadoLista';
import { useAvisos } from '../../components/Avisos';
import { useAuth } from '../../lib/auth';
import { useCarregar } from '../../lib/useCarregar';
import { contem } from '../../lib/texto';
import { iniciais, plural } from '../../lib/formato';
import PopupAluno from './PopupAluno';
import type { AlunoDaEscola } from '../../types';

const SITUACOES: { valor: string; rotulo: string; testa: (a: AlunoDaEscola) => boolean }[] = [
  { valor: 'ativos', rotulo: 'Ativos', testa: (a) => a.ativo },
  { valor: 'sem-anamnese', rotulo: 'Sem anamnese', testa: (a) => a.ativo && !a.anamneses },
  { valor: 'com-anamnese', rotulo: 'Com anamnese', testa: (a) => a.ativo && a.anamneses > 0 },
  { valor: 'com-plano', rotulo: 'Com plano ativo', testa: (a) => a.ativo && !!a.plano_ativo },
  { valor: 'desativados', rotulo: 'Desativados', testa: (a) => !a.ativo },
  { valor: 'todos', rotulo: 'Todos', testa: () => true },
];
const SEM_TURMA = '__sem__';
const AGUARDANDO = '__aguardando__';   // cadastrados pela família no link da escola, ainda sem turma

export default function AlunosEscola() {
  const { usuario } = useAuth();
  const adminFora = usuario?.perfil === 'admin';
  const navegar = useNavigate();
  const avisar = useAvisos();
  const { dados: alunos, erro, carregando, recarregar } = useCarregar<AlunoDaEscola[]>('/alunos');
  const [busca, setBusca] = useState('');
  const [turma, setTurma] = useState('');
  const [escola, setEscola] = useState('');
  const [situacao, setSituacao] = useState('ativos');
  const [novo, setNovo] = useState(false);

  const todos = alunos || [];
  const base = useMemo(() => todos.filter((a) => (!busca || contem(`${a.nome} ${a.nome_completo || ''} ${a.responsavel_nome || ''}`, busca))
    && (!turma || (turma === SEM_TURMA ? !a.turmas.length : turma === AGUARDANDO ? !!a.aguardando_turma : a.turmas.some((t) => t.id === turma)))
    && (!escola || a.escola === escola)), [todos, busca, turma, escola]);
  const testa = SITUACOES.find((s) => s.valor === situacao)!.testa;
  const lista = base.filter(testa);
  const filtrando = !!busca || !!turma || !!escola || situacao !== 'ativos';
  const limpar = () => { setBusca(''); setTurma(''); setEscola(''); setSituacao('ativos'); };

  const turmas = useMemo(() => {
    const m = new Map<string, string>();
    todos.forEach((a) => a.turmas.forEach((t) => m.set(t.id, t.nome)));
    return [...m].sort((a, b) => a[1].localeCompare(b[1]));
  }, [todos]);
  const escolas = useMemo(() => [...new Set(todos.map((a) => a.escola).filter(Boolean) as string[])].sort(), [todos]);

  return (
    <>
      <CabecalhoPagina titulo={adminFora ? 'Alunos' : 'Alunos e anamnese'}
        subtitulo="Cadastro, anamnese, observações e plano de objetivos de cada aluno."
        textoNovo="Novo aluno" aoNovo={() => setNovo(true)} />

      {carregando && <CarregandoLista />}
      {erro && <ErroLista mensagem={erro} aoTentar={recarregar} />}
      {alunos && alunos.length === 0 && (
        <ListaVazia icone="🧒" titulo="Nenhum aluno ainda" texto="Cadastre aqui ou numa turma. Os alunos que entram com o código da turma também aparecem aqui."
          acao={<Button variant="contained" onClick={() => setNovo(true)}>＋ Novo aluno</Button>} />
      )}

      {alunos && alunos.length > 0 && (
        <>
          <BarraFiltros busca={busca} aoBuscar={setBusca} rotuloBusca="Buscar por nome ou responsável" qtdFiltros={adminFora ? 3 : 2}
            mostrando={lista.length} total={todos.length} nomeItens={['aluno', 'alunos']} filtrando={filtrando} aoLimpar={limpar}
            filtros={<>
              {adminFora && (
                <FiltroSelect rotulo="Escola" valor={escola} aoMudar={setEscola} opcoes={[
                  { valor: '', rotulo: 'Todas as escolas' },
                  ...escolas.map((e) => ({ valor: e, rotulo: e, qtd: todos.filter((a) => a.escola === e && testa(a)).length })),
                ]} />
              )}
              <FiltroSelect rotulo="Turma" valor={turma} aoMudar={setTurma} opcoes={[
                { valor: '', rotulo: 'Todas as turmas' },
                ...turmas.map(([id, nome]) => ({ valor: id, rotulo: nome, qtd: todos.filter((a) => a.turmas.some((t) => t.id === id) && testa(a)).length })),
                { valor: SEM_TURMA, rotulo: 'Sem turma', qtd: todos.filter((a) => !a.turmas.length && testa(a)).length },
                { valor: AGUARDANDO, rotulo: 'Aguardando turma (cadastro da família)', qtd: todos.filter((a) => a.aguardando_turma && testa(a)).length },
              ]} />
              <FiltroSelect rotulo="Mostrar" valor={situacao} aoMudar={setSituacao}
                opcoes={SITUACOES.map((s) => ({ valor: s.valor, rotulo: s.rotulo, qtd: base.filter(s.testa).length }))} />
            </>} />

          {lista.length === 0 ? (
            <ListaVazia icone="🔍" titulo="Nenhum aluno com esse filtro" acao={<Button onClick={limpar}>Limpar filtros</Button>} />
          ) : (
            <GradeCartoes>
              {lista.map((a) => {
                const obs = typeof a.observacoes === 'number' ? a.observacoes : 0;
                return (
                  <Card key={a.id} variant="outlined" sx={{ opacity: a.ativo ? 1 : 0.65, '&:hover': { borderColor: 'primary.main' } }}>
                    <CardActionArea onClick={() => navegar(`/aluno/${a.id}`)} sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                      <Avatar sx={{ width: 48, height: 48, fontWeight: 800, bgcolor: a.ativo ? 'primary.main' : 'grey.400' }}>{iniciais(a.nome)}</Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="h6" component="h2" sx={{ lineHeight: 1.25 }}>{a.nome}</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {[a.nome_completo !== a.nome && a.nome_completo, a.turmas.map((t) => t.nome).join(', ') || 'Sem turma', a.escola].filter(Boolean).join(' · ')}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
                          {a.anamneses
                            ? <Chip size="small" color="success" variant="outlined" label={`✓ ${plural(a.anamneses, 'anamnese', 'anamneses')}`} />
                            : <Chip size="small" color="warning" variant="outlined" label="Sem anamnese" />}
                          {a.aguardando_turma && <Chip size="small" color="info" label="Aguardando turma" />}
                          {a.plano_ativo && <Chip size="small" color="primary" variant="outlined" label="Plano ativo" />}
                          {obs > 0 && <Chip size="small" variant="outlined" label={plural(obs, 'observação', 'observações')} />}
                          {!a.ativo && <Chip size="small" label="Desativado" />}
                        </Stack>
                      </Box>
                    </CardActionArea>
                  </Card>
                );
              })}
            </GradeCartoes>
          )}
        </>
      )}

      <PopupAluno aberto={novo} aluno={null} aoFechar={() => setNovo(false)}
        aoSalvar={(id) => { setNovo(false); avisar('Aluno cadastrado.'); navegar(`/aluno/${id}`); }} />
    </>
  );
}
