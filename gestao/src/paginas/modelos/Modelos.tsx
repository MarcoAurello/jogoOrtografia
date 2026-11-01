// Modelos de anamnese da escola: os questionários que a equipe aplica aos alunos. Criar, editar, tirar da lista de
// aplicar (desativar) e voltar a usar. O histórico das anamneses já respondidas não muda (cada uma guarda as perguntas).
import { useMemo, useState } from 'react';
import { Link as LinkRouter, useNavigate } from 'react-router-dom';
import { Button, Card, CardActionArea, CardActions, Chip, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import CabecalhoPagina from '../../components/CabecalhoPagina';
import BarraFiltros from '../../components/BarraFiltros';
import FiltroSelect from '../../components/FiltroSelect';
import MenuAcoes from '../../components/MenuAcoes';
import { CarregandoLista, ErroLista, GradeCartoes, ListaVazia } from '../../components/EstadoLista';
import { useAvisos } from '../../components/Avisos';
import { useConfirmar } from '../../components/Confirmar';
import { api, mensagemDoErro } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useCarregar } from '../../lib/useCarregar';
import { contem } from '../../lib/texto';
import { dataCurta, plural } from '../../lib/formato';
import type { ModeloAnamnese } from '../../types';

export default function Modelos() {
  const { usuario } = useAuth();
  const coordena = usuario?.perfil === 'coordenacao';
  const navegar = useNavigate();
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const { dados, erro, carregando, recarregar } = useCarregar<ModeloAnamnese[]>('/anamneses/modelos');
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('ativos');

  const todos = dados || [];
  const base = useMemo(() => todos.filter((m) => !busca || contem(m.titulo, busca)), [todos, busca]);
  const lista = base.filter((m) => situacao === 'todos' || (situacao === 'ativos' ? m.ativo : !m.ativo));
  const filtrando = !!busca || situacao !== 'ativos';
  const limpar = () => { setBusca(''); setSituacao('ativos'); };

  const mudarAtivo = async (m: ModeloAnamnese, ativo: boolean) => {
    if (!ativo && !(await confirmar({ titulo: `Tirar "${m.titulo}" da lista?`, botao: 'Tirar da lista', perigo: true,
      texto: 'O modelo deixa de aparecer na hora de aplicar a anamnese. As anamneses já respondidas continuam no histórico dos alunos.' }))) return;
    try { await api(`/anamneses/modelos/${m.id}`, { metodo: 'PUT', corpo: { ativo } }); avisar(ativo ? 'Modelo de volta à lista.' : 'Modelo tirado da lista.'); recarregar(); }
    catch (e) { avisar(mensagemDoErro(e), 'error'); }
  };

  const novo = () => navegar('/modelos-anamnese/novo');

  return (
    <>
      <CabecalhoPagina titulo="Modelos de anamnese" subtitulo="Os questionários que a equipe aplica aos alunos (na hora ou por link para a família)."
        textoNovo="Novo modelo" aoNovo={novo} />
      {carregando && <CarregandoLista />}
      {erro && <ErroLista mensagem={erro} aoTentar={recarregar} />}
      {dados && dados.length === 0 && (
        <ListaVazia icone="🗂️" titulo="Nenhum modelo ainda" texto="Monte o primeiro a partir do banco de perguntas (as dos 5 modelos de anamnese psicopedagógica)."
          acao={<Button variant="contained" onClick={novo}>＋ Novo modelo</Button>} />
      )}
      {dados && dados.length > 0 && (
        <>
          <BarraFiltros busca={busca} aoBuscar={setBusca} rotuloBusca="Buscar modelo" qtdFiltros={1}
            mostrando={lista.length} total={todos.length} nomeItens={['modelo', 'modelos']} filtrando={filtrando} aoLimpar={limpar}
            filtros={<FiltroSelect rotulo="Mostrar" valor={situacao} aoMudar={setSituacao} opcoes={[
              { valor: 'ativos', rotulo: 'Em uso', qtd: base.filter((m) => m.ativo).length },
              { valor: 'inativos', rotulo: 'Fora da lista', qtd: base.filter((m) => !m.ativo).length },
              { valor: 'todos', rotulo: 'Todos', qtd: base.length },
            ]} />} />
          {lista.length === 0 ? (
            <ListaVazia icone="🔍" titulo="Nenhum modelo com esse filtro" acao={<Button onClick={limpar}>Limpar filtros</Button>} />
          ) : (
            <GradeCartoes>
              {lista.map((m) => {
                const pode = m.meu || coordena;
                const obrigatorias = m.perguntas.filter((q) => q.obrigatoria).length;
                return (
                  <Card key={m.id} variant="outlined" sx={{ opacity: m.ativo ? 1 : 0.65, display: 'flex', flexDirection: 'column' }}>
                    <CardActionArea component={LinkRouter} to={pode ? `/modelos-anamnese/${m.id}` : '#'} disabled={!pode} sx={{ p: 2, flex: 1, alignItems: 'flex-start' }}>
                      <Typography variant="h6" component="h2" sx={{ lineHeight: 1.25 }}>{m.titulo}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {plural(m.perguntas.length, 'pergunta', 'perguntas')}{obrigatorias ? ` · ${obrigatorias} obrigatória(s)` : ''} · atualizado em {dataCurta(m.atualizado_em)}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        {m.meu && <Chip size="small" variant="outlined" label="Criado por você" />}
                        {!m.ativo && <Chip size="small" label="Fora da lista" />}
                      </Stack>
                    </CardActionArea>
                    {pode && (
                      <CardActions sx={{ px: 2, pb: 1.5, pt: 0 }}>
                        <Button startIcon={<EditIcon />} component={LinkRouter} to={`/modelos-anamnese/${m.id}`}>Editar</Button>
                        <Stack sx={{ flex: 1 }} />
                        <MenuAcoes rotulo={`Mais ações de ${m.titulo}`} acoes={[m.ativo
                          ? { texto: 'Tirar da lista de aplicar', icone: <PauseCircleIcon fontSize="small" />, perigo: true, aoClicar: () => mudarAtivo(m, false) }
                          : { texto: 'Voltar a usar', icone: <PlayCircleIcon fontSize="small" />, aoClicar: () => mudarAtivo(m, true) }]} />
                      </CardActions>
                    )}
                  </Card>
                );
              })}
            </GradeCartoes>
          )}
        </>
      )}
    </>
  );
}
