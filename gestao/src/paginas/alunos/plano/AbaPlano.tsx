// Os planos de objetivos do aluno: o ativo em destaque em cima, os outros (em elaboração e concluídos) embaixo.
// Cada plano abre no editor (página própria) e tem o PDF para a equipe e a família.
import { Link as LinkRouter } from 'react-router-dom';
import { Box, Button, Card, CardActions, CardContent, Chip, Skeleton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuAcoes from '../../../components/MenuAcoes';
import { ErroLista, ListaVazia } from '../../../components/EstadoLista';
import { useAvisos } from '../../../components/Avisos';
import { useConfirmar } from '../../../components/Confirmar';
import { api, mensagemDoErro } from '../../../lib/api';
import { useCarregar } from '../../../lib/useCarregar';
import { dataCurta, plural } from '../../../lib/formato';
import { STATUS_PLANO } from './plano';
import type { Plano } from '../../../types';

export default function AbaPlano({ alunoId }: { alunoId: string }) {
  const { dados, erro, carregando, recarregar } = useCarregar<{ pode_editar: boolean; planos: Plano[] }>(`/alunos/${alunoId}/planos`);
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const pode = !!dados?.pode_editar;
  const planos = dados?.planos || [];
  const ordem = { ativo: 0, elaboracao: 1, concluido: 2 };
  const ordenados = [...planos].sort((a, b) => ordem[a.status] - ordem[b.status] || b.criado_em.localeCompare(a.criado_em));

  const apagar = async (p: Plano) => {
    const ok = await confirmar({ titulo: 'Apagar este plano?', botao: 'Apagar', perigo: true,
      texto: p.status === 'elaboracao' ? 'O rascunho some. Não dá para desfazer.' : 'O plano faz parte do histórico do aluno. Apagar não tem volta.' });
    if (!ok) return;
    try { await api(`/planos/${p.id}`, { metodo: 'DELETE' }); avisar('Plano apagado.'); recarregar(); }
    catch (e) { avisar(mensagemDoErro(e), 'error'); }
  };

  if (carregando) return <Skeleton variant="rounded" height={200} />;
  if (erro) return <ErroLista mensagem={erro} aoTentar={recarregar} />;

  const novo = pode && (
    <Button variant="contained" startIcon={<AddIcon />} component={LinkRouter} to={`/aluno/${alunoId}/plano/novo`}>Novo plano</Button>
  );

  if (!planos.length) {
    return <ListaVazia icone="🎯" titulo="Nenhum plano de objetivos ainda"
      texto="O plano reúne os objetivos do aluno, as habilidades-alvo, os jogos sugeridos, as orientações para a família e as adequações na escola."
      acao={novo || undefined} />;
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>{novo}</Box>
      <Stack spacing={1.5} sx={{ pb: 4 }}>
        {ordenados.map((p) => {
          const st = STATUS_PLANO[p.status];
          const ativo = p.status === 'ativo';
          return (
            <Card key={p.id} variant="outlined" sx={{ borderRadius: 3, borderColor: ativo ? 'primary.main' : undefined, borderWidth: ativo ? 2 : 1 }}>
              <CardContent sx={{ pb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}>
                  <Typography variant="h6" component="h3">{p.ciclo || 'Plano de objetivos'}</Typography>
                  <Chip size="small" color={st.cor} label={st.rotulo} variant={ativo ? 'filled' : 'outlined'} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {p.profissional_nome} · {plural(p.objetivos.length, 'objetivo', 'objetivos')} · atualizado em {dataCurta(p.atualizado_em)}
                </Typography>
                {p.foco && <Typography sx={{ mt: 1 }}><b>Foco:</b> {p.foco}</Typography>}
                {ativo && p.objetivos.length > 0 && (
                  <Box component="ol" sx={{ m: 0, mt: 1, pl: 3 }}>
                    {p.objetivos.slice(0, 4).map((o, i) => <li key={o.id || i}>{o.area && <b>{o.area}: </b>}{o.descricao}</li>)}
                    {p.objetivos.length > 4 && <Typography component="li" sx={{ listStyle: 'none' }} color="text.secondary">e mais {p.objetivos.length - 4}…</Typography>}
                  </Box>
                )}
              </CardContent>
              <CardActions sx={{ px: 2, pb: 1.5 }}>
                <Button startIcon={pode ? <EditIcon /> : <VisibilityIcon />} component={LinkRouter} to={`/aluno/${alunoId}/plano/${p.id}`}>
                  {pode ? 'Abrir e editar' : 'Ver'}
                </Button>
                <Button startIcon={<PrintIcon />} component={LinkRouter} to={`/aluno/${alunoId}/plano/${p.id}/imprimir`}>PDF</Button>
                <Box sx={{ flex: 1 }} />
                {pode && <MenuAcoes rotulo="Mais ações do plano" acoes={[{ texto: 'Apagar', icone: <DeleteIcon fontSize="small" />, perigo: true, aoClicar: () => apagar(p) }]} />}
              </CardActions>
            </Card>
          );
        })}
      </Stack>
    </>
  );
}
