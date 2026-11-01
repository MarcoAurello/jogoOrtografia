// Painel da turma: o período no topo, os 4 números que importam, o alerta das habilidades com mais dificuldade,
// a evolução por semana e as habilidades lado a lado, e a tabela de alunos (cada linha abre a ficha).
import { useState } from 'react';
import { Link as LinkRouter, useNavigate, useParams } from 'react-router-dom';
import {
  Alert, AlertTitle, Box, Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Typography,
} from '@mui/material';
import Migalhas from '../../components/Migalhas';
import Numeros from '../../components/Numeros';
import Secao from '../../components/Secao';
import SeletorPeriodo from '../../components/SeletorPeriodo';
import PilulaAcerto from '../../components/PilulaAcerto';
import GraficoSemanas from '../../components/graficos/GraficoSemanas';
import BarrasAcerto, { LegendaSemaforo } from '../../components/graficos/BarrasAcerto';
import { ErroLista, ListaVazia } from '../../components/EstadoLista';
import { useCarregar } from '../../lib/useCarregar';
import { PERIODOS, porcento } from '../../lib/desempenho';
import { nomeHab } from '../../lib/habilidades';
import { dataCurta, plural } from '../../lib/formato';
import type { PainelTurma as Painel } from '../../types';

type Ordem = 'nome' | 'acerto' | 'partidas' | 'ultima';

export default function PainelTurma() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const [dias, setDias] = useState(30);
  const [ordem, setOrdem] = useState<{ campo: Ordem; desc: boolean }>({ campo: 'acerto', desc: false });
  const { dados: d, erro, recarregar } = useCarregar<Painel>(`/turmas/${id}/painel?dias=${dias}`);
  const periodo = PERIODOS.find((p) => p.dias === dias)!.rotulo;

  if (erro) return <ErroLista mensagem={erro} aoTentar={recarregar} />;

  // quem ainda não jogou vai para o fim em qualquer ordem
  const alunos = [...(d?.alunos || [])].sort((a, b) => {
    if (!a.partidas !== !b.partidas) return a.partidas ? -1 : 1;
    const s = ordem.desc ? -1 : 1;
    if (ordem.campo === 'nome') return s * a.nome.localeCompare(b.nome);
    if (ordem.campo === 'partidas') return s * (a.partidas - b.partidas);
    if (ordem.campo === 'ultima') return s * (new Date(a.ultima || 0).getTime() - new Date(b.ultima || 0).getTime());
    return s * ((a.acerto ?? 101) - (b.acerto ?? 101));
  });
  const ordenar = (campo: Ordem) => setOrdem((o) => ({ campo, desc: o.campo === campo ? !o.desc : campo !== 'nome' && campo !== 'acerto' }));
  const soNoPC = { display: { xs: 'none', sm: 'table-cell' } };
  const cabecalho = (campo: Ordem, texto: string, alinhar: 'left' | 'right' = 'right', esconderNoCelular = false) => (
    <TableCell align={alinhar} sortDirection={ordem.campo === campo ? (ordem.desc ? 'desc' : 'asc') : false} sx={esconderNoCelular ? soNoPC : undefined}>
      <TableSortLabel active={ordem.campo === campo} direction={ordem.desc ? 'desc' : 'asc'} onClick={() => ordenar(campo)}>{texto}</TableSortLabel>
    </TableCell>
  );

  return (
    <>
      <Migalhas itens={[{ texto: 'Turmas', para: '/turmas' }, { texto: d?.turma.nome || '…', para: `/turmas/${id}` }, { texto: 'Painel' }]} />
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2.5 }}>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h4" component="h1">Painel {d ? `· ${d.turma.nome}` : ''}</Typography>
          <Typography color="text.secondary">Como a turma está nos jogos nos últimos {periodo}.</Typography>
        </Box>
        <SeletorPeriodo dias={dias} aoMudar={setDias} />
      </Box>

      {!d ? (
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Skeleton variant="rounded" height={110} /><Skeleton variant="rounded" height={260} /><Skeleton variant="rounded" height={300} />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 2.5, pb: 4 }}>
          <Numeros itens={[
            { rotulo: 'Alunos que jogaram', valor: `${d.resumo.jogaram}/${d.resumo.alunos}` },
            { rotulo: 'Partidas', valor: d.resumo.partidas },
            { rotulo: 'Acerto da turma', valor: porcento(d.resumo.acerto) },
            { rotulo: 'Tempo jogando', valor: `${d.resumo.minutos} min` },
          ]} />

          {d.resumo.partidas === 0 ? (
            <ListaVazia icone="📊" titulo={`Nenhuma partida nos últimos ${periodo}`}
              texto="Quando os alunos jogarem entrando pelo código da turma, os gráficos aparecem aqui. Tente um período maior." />
          ) : (
            <>
              {d.dificuldades.length > 0 && (
                <Alert severity="warning" variant="outlined" sx={{ borderRadius: 3, bgcolor: 'background.paper' }}>
                  <AlertTitle sx={{ fontWeight: 800 }}>Onde a turma tem mais dificuldade</AlertTitle>
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {d.dificuldades.map((h) => (
                      <li key={h.habilidade}>
                        <b>{nomeHab(h.habilidade)}</b>: {porcento(h.acerto)} de acerto
                        {h.comDificuldade > 0 && ` · ${plural(h.comDificuldade, 'aluno', 'alunos')} abaixo de 60%`}
                      </li>
                    ))}
                  </Box>
                </Alert>
              )}

              <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
                <Secao titulo="Acerto por semana" subtitulo="A linha tracejada marca 60%: abaixo dela é dificuldade.">
                  {d.semanas.length ? <GraficoSemanas semanas={d.semanas} rotulo={`Acerto da turma ${d.turma.nome} por semana`} />
                    : <Typography color="text.secondary">Sem semanas com partidas.</Typography>}
                </Secao>
                <Secao titulo="Acerto por habilidade" subtitulo="Da menor para a maior.">
                  <BarrasAcerto itens={d.habilidades.map((h) => ({
                    chave: h.habilidade, rotulo: nomeHab(h.habilidade), acerto: h.acerto,
                    detalhe: `${plural(h.alunos, 'aluno jogou', 'alunos jogaram')} · ${h.respostas} respostas${h.comDificuldade ? ` · ${h.comDificuldade} abaixo de 60%` : ''}`,
                  }))} />
                  <LegendaSemaforo />
                </Secao>
              </Box>
            </>
          )}

          {d.semJogar.length > 0 && d.resumo.partidas > 0 && (
            <Alert severity="info" sx={{ borderRadius: 3 }}>
              <b>Não jogaram no período ({d.semJogar.length}):</b> {d.semJogar.join(', ')}
            </Alert>
          )}

          <Secao titulo="Alunos" subtitulo="Toque num aluno para abrir a ficha dele." semPadding>
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
              <Table size="medium" aria-label="Alunos da turma">
                <TableHead>
                  <TableRow>
                    {cabecalho('nome', 'Aluno', 'left')}
                    {cabecalho('acerto', 'Acerto')}
                    {cabecalho('partidas', 'Partidas')}
                    <TableCell align="right" sx={soNoPC}>Tempo</TableCell>
                    {cabecalho('ultima', 'Última', 'right', true)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alunos.map((a) => (
                    <TableRow key={a.id} hover onClick={() => navegar(`/ficha/${a.id}`, { state: { turma: id } })} sx={{ cursor: 'pointer', '& td': { py: 1.25 } }}>
                      <TableCell>
                        <Typography component={LinkRouter} to={`/ficha/${a.id}`} state={{ turma: id }} onClick={(e) => e.stopPropagation()}
                          sx={{ color: 'text.primary', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{a.nome}</Typography>
                      </TableCell>
                      <TableCell align="right">{a.partidas ? <PilulaAcerto acerto={a.acerto} /> : <Typography variant="body2" color="text.secondary">não jogou</Typography>}</TableCell>
                      <TableCell align="right">{a.partidas}</TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{a.minutos} min</TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{dataCurta(a.ultima) || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Secao>
        </Box>
      )}
    </>
  );
}
