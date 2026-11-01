// Uma turma: cabeçalho com as ações (Painel em destaque), o código de entrada em evidência com o passo a passo do
// aluno, e duas abas: Alunos (busca, filtro, ficha, desativar) e Últimas partidas.
import { useMemo, useState } from 'react';
import { Link as LinkRouter, useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, Chip, Divider, List, ListItem, ListItemAvatar, ListItemText, Paper, Skeleton, Stack, Tab, Tabs, Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InsightsIcon from '@mui/icons-material/Insights';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import Migalhas from '../../components/Migalhas';
import BarraFiltros from '../../components/BarraFiltros';
import FiltroSelect from '../../components/FiltroSelect';
import MenuAcoes, { Acao } from '../../components/MenuAcoes';
import { ErroLista, ListaVazia } from '../../components/EstadoLista';
import { useAvisos } from '../../components/Avisos';
import { useConfirmar } from '../../components/Confirmar';
import { api, mensagemDoErro } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useCarregar } from '../../lib/useCarregar';
import { contem } from '../../lib/texto';
import { copiar, haQuanto, iniciais, plural } from '../../lib/formato';
import PopupTurma from './PopupTurma';
import PopupAlunos from './PopupAlunos';
import type { AlunoDaTurma, PartidaDaTurma, Turma } from '../../types';

type FiltroAluno = 'ativos' | 'sem-jogar' | 'desativados' | 'todos';
const FILTROS: { valor: FiltroAluno; rotulo: string; testa: (a: AlunoDaTurma) => boolean }[] = [
  { valor: 'ativos', rotulo: 'Na turma', testa: (a) => a.ativo },
  { valor: 'sem-jogar', rotulo: 'Ainda não jogaram', testa: (a) => a.ativo && !a.partidas },
  { valor: 'desativados', rotulo: 'Desativados', testa: (a) => !a.ativo },
  { valor: 'todos', rotulo: 'Todos', testa: () => true },
];

const dataHora = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function TurmaDetalhe() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const { usuario } = useAuth();
  const coordena = usuario?.perfil === 'coordenacao';
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const turmas = useCarregar<Turma[]>('/turmas');
  const alunosR = useCarregar<{ alunos: AlunoDaTurma[] }>(`/turmas/${id}/alunos`);
  const [aba, setAba] = useState<'alunos' | 'partidas'>('alunos');
  const partidas = useCarregar<PartidaDaTurma[]>(aba === 'partidas' ? `/turmas/${id}/partidas?limite=50` : null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroAluno>('ativos');
  const [editando, setEditando] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);

  const turma = turmas.dados?.find((t) => t.id === id);
  const alunos = alunosR.dados?.alunos || [];
  const daBusca = useMemo(() => alunos.filter((a) => !busca || contem(`${a.nome} ${a.nome_completo || ''}`, busca)), [alunos, busca]);
  const lista = daBusca.filter(FILTROS.find((f) => f.valor === filtro)!.testa);
  const filtrando = !!busca || filtro !== 'ativos';
  const limpar = () => { setBusca(''); setFiltro('ativos'); };

  if (turmas.erro) return <ErroLista mensagem={turmas.erro} aoTentar={turmas.recarregar} />;
  if (turmas.dados && !turma) {
    return <ListaVazia icone="🔍" titulo="Turma não encontrada" texto="Ela pode ter sido tirada de você."
      acao={<Button component={LinkRouter} to="/turmas">Ver as turmas</Button>} />;
  }
  if (!turma) return <><Skeleton height={60} width="50%" /><Skeleton variant="rounded" height={140} sx={{ my: 2 }} /><Skeleton variant="rounded" height={300} /></>;

  const mudarAluno = async (a: AlunoDaTurma, ativo: boolean) => {
    try {
      // vale só nesta turma: o aluno continua na escola e nas outras turmas dele
      await api(`/alunos/${a.id}`, { metodo: 'PUT', corpo: { ativo, turma: turma.id } });
      avisar(ativo ? `${a.nome} voltou para a turma.` : `${a.nome} saiu da lista da turma.`);
      alunosR.recarregar();
    } catch (e) { avisar(mensagemDoErro(e), 'error'); }
  };

  const desativarAluno = async (a: AlunoDaTurma) => {
    const ok = await confirmar({ titulo: `Tirar ${a.nome} da turma?`, botao: 'Tirar da turma', perigo: true,
      texto: 'O nome some da lista de entrada desta turma. As partidas ficam guardadas e dá para ativar de novo.' });
    if (ok) mudarAluno(a, false);
  };

  const encerrar = async () => {
    if (turma.ativa) {
      const ok = await confirmar({ titulo: `Encerrar ${turma.nome}?`, botao: 'Encerrar turma', perigo: true,
        texto: 'Os alunos não entram mais com o código. As partidas e o painel ficam guardados, e dá para reabrir quando quiser.' });
      if (!ok) return;
    }
    try {
      await api(`/turmas/${turma.id}`, { metodo: 'PUT', corpo: { ativa: !turma.ativa } });
      avisar(turma.ativa ? 'Turma encerrada.' : 'Turma reaberta: os alunos voltam a entrar.');
      turmas.recarregar();
    } catch (e) { avisar(mensagemDoErro(e), 'error'); }
  };

  const acoesDaTurma: Acao[] = [
    turma.ativa
      ? { texto: 'Encerrar turma', icone: <PauseCircleIcon fontSize="small" />, perigo: true, aoClicar: encerrar }
      : { texto: 'Reabrir turma', icone: <PlayCircleIcon fontSize="small" />, aoClicar: encerrar },
  ];

  return (
    <>
      <Migalhas itens={[{ texto: 'Turmas', para: '/turmas' }, { texto: turma.nome }]} />

      {/* cabeçalho: nome, professores e as ações */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start', mb: 2.5 }}>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h4" component="h1">{turma.nome}</Typography>
            {!turma.ativa && <Chip label="Encerrada" />}
            {turma.salvar_partidas === false && <Chip color="warning" variant="outlined" label="Não guarda partidas" />}
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {turma.professores.length ? `Professores: ${turma.professores.map((p) => p.nome).join(', ')}` : 'Sem professor: só a coordenação vê esta turma'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="contained" size="large" startIcon={<InsightsIcon />} component={LinkRouter} to={`/turmas/${turma.id}/painel`}>Painel</Button>
          {coordena && <Button size="large" startIcon={<EditIcon />} onClick={() => setEditando(true)}>Editar</Button>}
          <MenuAcoes rotulo="Mais ações da turma" acoes={acoesDaTurma} />
        </Stack>
      </Box>

      {/* guardar as partidas desligado (escola ou turma): o painel e as fichas param de receber dados */}
      {(usuario?.escola?.salvar_partidas === false || turma.salvar_partidas === false) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {usuario?.escola?.salvar_partidas === false
            ? 'O administrador desligou a gravação das partidas nesta escola: o painel e as fichas não recebem dados novos.'
            : <>A gravação das partidas está <b>desligada nesta turma</b>: o painel e as fichas não recebem dados novos.{coordena && ' Para ligar, toque em Editar.'}</>}
        </Alert>
      )}

      {/* o código de entrada: o que o professor mais passa para os alunos */}
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, mb: 3, borderRadius: 3, display: 'flex', gap: { xs: 2, sm: 4 }, flexWrap: 'wrap', alignItems: 'center',
        background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}14, transparent 60%)` }}>
        <Box>
          <Typography variant="body2" color="text.secondary">Código de entrada</Typography>
          <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: { xs: 36, sm: 44 }, letterSpacing: 4, lineHeight: 1.1 }}>{turma.codigo}</Typography>
          <Button size="small" startIcon={<ContentCopyIcon />} onClick={async () => { if (await copiar(turma.codigo)) avisar(`Código ${turma.codigo} copiado.`); }}>
            Copiar código
          </Button>
        </Box>
        <Box component="ol" sx={{ m: 0, pl: 2.5, flex: 1, minWidth: 240, color: 'text.secondary', '& li': { mb: 0.5 } }}>
          <li>No app dos jogos, o aluno toca em <b>🏫 Entrar com o código da turma</b>.</li>
          <li>Digita o código <b>{turma.codigo}</b>.</li>
          <li>Toca no nome dele (ou digita, se não estiver na lista). Sem senha.</li>
        </Box>
        {!turma.ativa && <Alert severity="warning" sx={{ width: '100%' }}>Turma encerrada: o código não funciona até você reabrir.</Alert>}
      </Paper>

      <Tabs value={aba} onChange={(_, v) => setAba(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="alunos" label={`Alunos (${alunos.filter((a) => a.ativo).length})`} sx={{ minHeight: 48, fontWeight: 700 }} />
        <Tab value="partidas" label="Últimas partidas" sx={{ minHeight: 48, fontWeight: 700 }} />
      </Tabs>

      {aba === 'alunos' && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
            <Button variant="outlined" startIcon={<PersonAddIcon />} onClick={() => setCadastrando(true)}>Cadastrar alunos</Button>
          </Box>
          {alunosR.erro && <ErroLista mensagem={alunosR.erro} aoTentar={alunosR.recarregar} />}
          {alunosR.carregando && <Skeleton variant="rounded" height={240} />}
          {alunosR.dados && (alunos.length === 0 ? (
            <ListaVazia icone="🧒" titulo="Nenhum aluno ainda"
              texto={<>Cadastre os nomes ou só passe o código <b>{turma.codigo}</b>: cada aluno digita o nome ao entrar e já aparece aqui.</>}
              acao={<Button variant="contained" onClick={() => setCadastrando(true)}>Cadastrar alunos</Button>} />
          ) : (
            <>
              <BarraFiltros busca={busca} aoBuscar={setBusca} rotuloBusca="Buscar aluno" qtdFiltros={1}
                mostrando={lista.length} total={alunos.length} nomeItens={['aluno', 'alunos']} filtrando={filtrando} aoLimpar={limpar}
                filtros={<FiltroSelect rotulo="Mostrar" valor={filtro} aoMudar={(v) => setFiltro(v as FiltroAluno)}
                  opcoes={FILTROS.map((f) => ({ valor: f.valor, rotulo: f.rotulo, qtd: daBusca.filter(f.testa).length }))} />} />
              {lista.length === 0 ? (
                <ListaVazia icone="🔍" titulo="Nenhum aluno com esse filtro" acao={<Button onClick={limpar}>Limpar filtros</Button>} />
              ) : (
                <Paper variant="outlined" sx={{ borderRadius: 3, mb: { xs: 10, sm: 2 } }}>
                  <List disablePadding>
                    {lista.map((a, i) => (
                      <Box key={a.id}>
                        {i > 0 && <Divider component="li" />}
                        <ListItem sx={{ py: 1.25, opacity: a.ativo ? 1 : 0.6, gap: 1 }}
                          secondaryAction={<MenuAcoes rotulo={`Ações de ${a.nome}`} acoes={[a.ativo
                            ? { texto: 'Tirar da turma', icone: <PersonOffIcon fontSize="small" />, perigo: true, aoClicar: () => desativarAluno(a) }
                            : { texto: 'Voltar para a turma', icone: <HowToRegIcon fontSize="small" />, aoClicar: () => mudarAluno(a, true) }]} />}>
                          <ListItemAvatar><Avatar sx={{ bgcolor: a.partidas ? 'primary.main' : 'grey.400', fontWeight: 800 }}>{iniciais(a.nome)}</Avatar></ListItemAvatar>
                          <ListItemText
                            primary={<>{a.nome}{!a.ativo && <Typography component="span" color="text.secondary"> · fora da turma</Typography>}
                              {a.salvar_partidas === false && <Chip size="small" color="warning" variant="outlined" label="não guarda partidas" sx={{ ml: 1 }} />}</>}
                            secondary={a.partidas ? `${plural(a.partidas, 'partida', 'partidas')} · última ${haQuanto(a.ultima_partida)}` : 'Ainda não jogou'} />
                          {/* no celular só o ícone (o texto do aluno precisa do espaço); no PC, "Ficha" escrito */}
                          <Button size="small" variant="outlined" aria-label={`Ficha de ${a.nome}`} onClick={() => navegar(`/ficha/${a.id}`, { state: { turma: turma.id } })}
                            sx={{ mr: 5, flexShrink: 0, minWidth: 44 }}>
                            <InsightsIcon fontSize="small" />
                            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 1 }}>Ficha</Box>
                          </Button>
                        </ListItem>
                      </Box>
                    ))}
                  </List>
                </Paper>
              )}
            </>
          ))}
        </>
      )}

      {aba === 'partidas' && (
        <>
          {partidas.erro && <ErroLista mensagem={partidas.erro} aoTentar={partidas.recarregar} />}
          {partidas.carregando && <Skeleton variant="rounded" height={240} />}
          {partidas.dados && (partidas.dados.length === 0 ? (
            <ListaVazia icone="🎮" titulo="Nenhuma partida ainda" texto="Quando os alunos jogarem entrando pelo código da turma, as partidas aparecem aqui." />
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 3 }}>
              <List disablePadding>
                {partidas.dados.map((p, i) => {
                  const competicao = p.resumo && !Array.isArray(p.resumo) && p.resumo.competicao;
                  return (
                    <Box key={p.id}>
                      {i > 0 && <Divider component="li" />}
                      <ListItem sx={{ py: 1.25, display: 'grid', gridTemplateColumns: { xs: '1fr auto', sm: '180px 1fr auto' }, columnGap: 2 }}>
                        <Typography fontWeight={800} noWrap>{p.aluno?.nome || '?'}</Typography>
                        <Typography color="text.secondary" noWrap sx={{ gridRow: { xs: 2, sm: 'auto' } }}>{competicao ? '🏆 ' : ''}{p.titulo}</Typography>
                        <Box sx={{ textAlign: 'right', gridRow: { xs: '1 / span 2', sm: 'auto' } }}>
                          <Typography fontWeight={800}>{p.acertos}/{p.total} <Box component="span" aria-label={`${p.estrelas} estrelas`}>{'⭐'.repeat(p.estrelas)}</Box></Typography>
                          <Typography variant="body2" color="text.secondary">{dataHora(p.jogada_em)}</Typography>
                        </Box>
                      </ListItem>
                    </Box>
                  );
                })}
              </List>
            </Paper>
          ))}
        </>
      )}

      <PopupTurma aberto={editando} turma={turma} coordena={coordena} aoFechar={() => setEditando(false)}
        aoSalvar={() => { setEditando(false); avisar('Turma salva.'); turmas.recarregar(); }} />
      <PopupAlunos aberto={cadastrando} turma={turma} jaNaTurma={alunos.map((a) => a.nome)} aoFechar={() => setCadastrando(false)}
        aoSalvar={(criados, repetidos) => {
          setCadastrando(false);
          avisar(`${plural(criados, 'aluno cadastrado', 'alunos cadastrados')}.${repetidos.length ? ` Já estavam na turma: ${repetidos.join(', ')}.` : ''}`);
          alunosR.recarregar();
        }} />
    </>
  );
}
