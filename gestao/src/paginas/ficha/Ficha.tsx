// Ficha do aluno: quem é, os números do período e quatro abas: Desempenho (evolução, habilidades, antes × depois,
// jogos), Para revisar (o que mais errou), Anamnese e plano, e Observações. "Imprimir / PDF" põe todas as abas no
// papel (a anamnese é dado sensível de criança: o PDF é só para a equipe da escola).
import { ReactNode, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, Chip, Collapse, Divider, Paper, Skeleton, Stack, Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import Migalhas from '../../components/Migalhas';
import Numeros from '../../components/Numeros';
import Secao from '../../components/Secao';
import SeletorPeriodo from '../../components/SeletorPeriodo';
import PilulaAcerto from '../../components/PilulaAcerto';
import GraficoSemanas from '../../components/graficos/GraficoSemanas';
import BarrasAcerto, { LegendaSemaforo } from '../../components/graficos/BarrasAcerto';
import { ListaVazia } from '../../components/EstadoLista';
import { useCarregar } from '../../lib/useCarregar';
import { CATEGORIAS_OBS, PERIODOS, textoDaResposta } from '../../lib/desempenho';
import { nomeHab } from '../../lib/habilidades';
import { dataCurta, iniciais, plural } from '../../lib/formato';
import type { FichaAluno } from '../../types';

type Aba = 'desempenho' | 'revisar' | 'anamnese' | 'observacoes';

function idade(nascimento: string | null) {
  if (!nascimento) return '';
  const n = new Date(`${nascimento.slice(0, 10)}T12:00:00`), h = new Date();
  const anos = h.getFullYear() - n.getFullYear() - (h < new Date(h.getFullYear(), n.getMonth(), n.getDate()) ? 1 : 0);
  return anos >= 0 && anos < 30 ? `${anos} anos` : '';
}
const dataDaObs = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR');

// cada aba: na tela só a escolhida; no papel, todas, uma depois da outra
function Painel({ ativa, titulo, children }: { ativa: boolean; titulo: string; children: ReactNode }) {
  return (
    <Box role="tabpanel" sx={{ display: ativa ? 'block' : 'none', '@media print': { display: 'block', mt: 3 } }}>
      <Typography variant="h5" sx={{ display: 'none', '@media print': { display: 'block', mb: 1 } }}>{titulo}</Typography>
      {children}
    </Box>
  );
}

export default function Ficha() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const turmaDeOrigem = (useLocation().state as { turma?: string } | null)?.turma;
  const [dias, setDias] = useState(30);
  const [aba, setAba] = useState<Aba>('desempenho');
  const [verAnamnese, setVerAnamnese] = useState(false);
  const { dados: d, erro, recarregar } = useCarregar<FichaAluno>(`/alunos/${id}/ficha?dias=${dias}`);
  const periodo = PERIODOS.find((p) => p.dias === dias)!.rotulo;

  if (erro) {
    return <ListaVazia icone="🔒" titulo="Não deu para abrir a ficha" texto={erro}
      acao={<><Button onClick={() => navegar(-1)}>Voltar</Button><Button onClick={recarregar}>Tentar de novo</Button></>} />;
  }

  const migalhas = turmaDeOrigem && d?.turma
    ? [{ texto: 'Turmas', para: '/turmas' }, { texto: d.turma.nome.split(',')[0], para: `/turmas/${turmaDeOrigem}` }, { texto: d.aluno.nome }]
    : [{ texto: 'Turmas', para: '/turmas' }, { texto: d?.aluno.nome || '…' }];
  const comparaveis = d?.habilidades.filter((h) => h.antes != null && h.depois != null) || [];

  return (
    <>
      <Migalhas itens={migalhas} />

      {/* quem é */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2.5 }}>
        <Avatar sx={{ width: 64, height: 64, fontSize: 24, fontWeight: 800, bgcolor: 'primary.main' }}>{d ? iniciais(d.aluno.nome) : ''}</Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h4" component="h1">{d?.aluno.nome || <Skeleton width={200} />}</Typography>
          {d && (
            <Typography color="text.secondary">
              {[d.aluno.nome_completo !== d.aluno.nome && d.aluno.nome_completo, idade(d.aluno.data_nascimento), d.turma?.nome].filter(Boolean).join(' · ')}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ display: 'none', '@media print': { display: 'block' } }}>
            Ficha dos últimos {periodo} · gerada em {new Date().toLocaleDateString('pt-BR')} · uso exclusivo da equipe da escola
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, '@media print': { display: 'none' } }}>
          <SeletorPeriodo dias={dias} aoMudar={setDias} />
          {/* no celular só o ícone, para o período caber na mesma linha */}
          <Button variant="outlined" aria-label="Imprimir ou salvar em PDF" onClick={() => window.print()} disabled={!d} sx={{ minWidth: 48, whiteSpace: 'nowrap' }}>
            <PrintIcon fontSize="small" />
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 1 }}>Imprimir / PDF</Box>
          </Button>
        </Stack>
      </Box>

      {!d ? (
        <Box sx={{ display: 'grid', gap: 2 }}><Skeleton variant="rounded" height={110} /><Skeleton variant="rounded" height={320} /></Box>
      ) : (
        <>
          <Numeros itens={[
            { rotulo: 'Partidas', valor: d.resumo.partidas, detalhe: `nos últimos ${periodo}` },
            { rotulo: 'Acerto', valor: d.resumo.partidas ? <PilulaAcerto acerto={d.resumo.acerto} grande /> : '—' },
            { rotulo: 'Tempo jogando', valor: `${d.resumo.minutos} min` },
            { rotulo: 'Última partida', valor: dataCurta(d.resumo.ultima) || '—' },
          ]} />

          <Tabs value={aba} onChange={(_, v) => setAba(v)} variant="scrollable" allowScrollButtonsMobile
            sx={{ mt: 3, mb: 2, borderBottom: 1, borderColor: 'divider', '@media print': { display: 'none' }, '& .MuiTab-root': { minHeight: 48, fontWeight: 700 } }}>
            <Tab value="desempenho" label="Desempenho" />
            <Tab value="revisar" label={`Para revisar${d.revisar.length ? ` (${d.revisar.length})` : ''}`} />
            <Tab value="anamnese" label="Anamnese e plano" />
            <Tab value="observacoes" label={`Observações${d.observacoes.length ? ` (${d.observacoes.length})` : ''}`} />
          </Tabs>

          <Painel ativa={aba === 'desempenho'} titulo="Desempenho">
            {d.resumo.partidas === 0 ? (
              <ListaVazia icone="📊" titulo={`Nenhuma partida nos últimos ${periodo}`} texto="Tente um período maior." />
            ) : (
              <Box sx={{ display: 'grid', gap: 2.5, pb: 4 }}>
                <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
                  <Secao titulo="Evolução" subtitulo="Acerto por semana. A linha tracejada marca 60%.">
                    {d.semanas.length ? <GraficoSemanas semanas={d.semanas} rotulo={`Acerto de ${d.aluno.nome} por semana`} />
                      : <Typography color="text.secondary">Sem semanas com partidas.</Typography>}
                  </Secao>
                  <Secao titulo="Habilidades" subtitulo="As mais trabalhadas primeiro.">
                    <BarrasAcerto itens={d.habilidades.slice(0, 12).map((h) => ({
                      chave: h.habilidade, rotulo: nomeHab(h.habilidade), acerto: h.acerto, detalhe: `${h.respostas} respostas`,
                    }))} />
                    <LegendaSemaforo />
                  </Secao>
                </Box>

                {comparaveis.length > 0 && (
                  <Secao titulo="Antes × depois" subtitulo="Acerto na 1ª metade × na 2ª metade das partidas do período.">
                    <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                      {comparaveis.map((h) => {
                        const dif = h.depois! - h.antes!;
                        const Icone = dif > 0 ? ArrowUpwardIcon : dif < 0 ? ArrowDownwardIcon : RemoveIcon;
                        return (
                          <Box key={h.habilidade} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: 2, bgcolor: 'action.hover' }}>
                            <Typography sx={{ flex: 1, minWidth: 0 }} noWrap>{nomeHab(h.habilidade)}</Typography>
                            <Typography color="text.secondary">{h.antes}%</Typography>
                            <Typography aria-hidden color="text.secondary">→</Typography>
                            <Typography fontWeight={800}>{h.depois}%</Typography>
                            <Chip size="small" icon={<Icone sx={{ fontSize: 16 }} />} label={dif === 0 ? 'igual' : `${dif > 0 ? '+' : ''}${dif}`}
                              color={dif > 0 ? 'success' : dif < 0 ? 'error' : 'default'} variant="outlined" sx={{ minWidth: 68, fontWeight: 800 }} />
                          </Box>
                        );
                      })}
                    </Box>
                  </Secao>
                )}

                {d.jogos.length > 0 && (
                  <Secao titulo="Jogos que mais jogou" semPadding>
                    <Table size="small" aria-label="Jogos que mais jogou">
                      <TableHead><TableRow><TableCell>Jogo</TableCell><TableCell align="right">Partidas</TableCell>
                        <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Nível máx.</TableCell><TableCell align="right">Acerto</TableCell></TableRow></TableHead>
                      <TableBody>
                        {d.jogos.map((j) => (
                          <TableRow key={j.jogo} sx={{ '& td': { py: 1.25 } }}>
                            <TableCell>{j.titulo}</TableCell><TableCell align="right">{j.partidas}</TableCell>
                            <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{j.nivel ?? '—'}</TableCell>
                            <TableCell align="right"><PilulaAcerto acerto={j.acerto} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Secao>
                )}
              </Box>
            )}
          </Painel>

          <Painel ativa={aba === 'revisar'} titulo="Para revisar">
            {d.revisar.length === 0 ? (
              <ListaVazia icone="🌟" titulo="Nada para revisar no período" texto="O aluno não errou respostas nos jogos dos últimos dias escolhidos." />
            ) : (
              <>
                <Typography color="text.secondary" sx={{ mb: 1.5 }}>O que {d.aluno.nome} mais errou nos últimos {periodo}, juntando todas as partidas.</Typography>
                <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, pb: 4 }}>
                  {d.revisar.map((r) => (
                    <Paper key={`${r.tipo}|${r.certa}`} variant="outlined" sx={{ p: 2, borderRadius: 3, breakInside: 'avoid' }}>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                        <Typography sx={{ fontFamily: "'Fredoka', sans-serif", fontSize: 24, fontWeight: 600, flex: 1, wordBreak: 'break-word' }}>{r.certa}</Typography>
                        <Chip size="small" color="error" variant="outlined" label={`errou ${r.vezes}×`} />
                      </Box>
                      <Typography variant="body2" color="text.secondary">{r.tipo} · {r.jogo}</Typography>
                      {r.respostas.length > 0 && (
                        <Typography variant="body2" sx={{ mt: 1 }}>Respondeu: <b>{r.respostas.join(' · ')}</b></Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              </>
            )}
          </Painel>

          <Painel ativa={aba === 'anamnese'} titulo="Anamnese e plano">
            <Box sx={{ display: 'grid', gap: 2.5, pb: 4 }}>
              <Secao titulo="Plano de objetivos" subtitulo={d.plano ? [d.plano.ciclo, d.plano.profissional_nome].filter(Boolean).join(' · ') : undefined}>
                {d.plano ? (
                  <>
                    {d.plano.foco && <Typography sx={{ mb: 1 }}><b>Foco:</b> {d.plano.foco}</Typography>}
                    <Box component="ol" sx={{ m: 0, pl: 3, '& li': { mb: 0.75 } }}>
                      {d.plano.objetivos.map((o, i) => (
                        <li key={i}>{o.area && <b>{o.area}: </b>}{o.descricao}{o.prazo && <Typography component="span" color="text.secondary"> (até {o.prazo})</Typography>}</li>
                      ))}
                    </Box>
                  </>
                ) : <Typography color="text.secondary">Sem plano ativo. O plano é feito em Alunos e anamnese.</Typography>}
              </Secao>
              <Secao titulo="Anamnese"
                subtitulo={d.anamnese ? `${d.anamnese.titulo} · respondida em ${dataCurta(d.anamnese.respondida_em)}${d.anamnese.respondida_por_nome ? ` por ${d.anamnese.respondida_por_nome}` : ''}` : undefined}
                acao={d.anamnese && <Button onClick={() => setVerAnamnese((v) => !v)} sx={{ '@media print': { display: 'none' } }}>{verAnamnese ? 'Esconder' : 'Ver respostas'}</Button>}>
                {d.anamnese ? (
                  <>
                    <Alert severity="info" icon={false} sx={{ mb: verAnamnese ? 2 : 0, '@media print': { display: 'none' } }}>
                      Dado sensível da criança (LGPD): só para a equipe da escola. Não vai em e-mail de relatório.
                    </Alert>
                    <Collapse in={verAnamnese} sx={{ '@media print': { height: 'auto !important', visibility: 'visible !important' } }}>
                      <Box component="dl" sx={{ m: 0 }}>
                        {d.anamnese.perguntas.map((q, i) => (
                          <Box key={q.id} sx={{ py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider', breakInside: 'avoid' }}>
                            <Typography component="dt" color="text.secondary" variant="body2">{i + 1}. {q.texto}</Typography>
                            <Typography component="dd" sx={{ m: 0, fontWeight: 700, whiteSpace: 'pre-wrap' }}>{textoDaResposta(q.tipo, d.anamnese!.respostas?.[q.id])}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Collapse>
                  </>
                ) : <Typography color="text.secondary">Sem anamnese respondida. Ela é feita em Alunos e anamnese.</Typography>}
              </Secao>
            </Box>
          </Painel>

          <Painel ativa={aba === 'observacoes'} titulo="Observações de evolução">
            {d.observacoes.length === 0 ? (
              <ListaVazia icone="📝" titulo="Nenhuma observação ainda" texto="As observações de evolução são escritas em Alunos e anamnese." />
            ) : (
              <Paper variant="outlined" sx={{ borderRadius: 3, mb: 4 }}>
                {d.observacoes.map((o, i) => (
                  <Box key={i}>
                    {i > 0 && <Divider />}
                    <Box sx={{ p: 2, breakInside: 'avoid' }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                        <Typography fontWeight={800}>{dataDaObs(o.data)}</Typography>
                        <Chip size="small" variant="outlined" label={CATEGORIAS_OBS[o.categoria] || o.categoria} />
                        <Typography variant="body2" color="text.secondary">{o.autor_nome}</Typography>
                      </Stack>
                      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{o.texto}</Typography>
                    </Box>
                  </Box>
                ))}
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, pt: 0 }}>{plural(d.observacoes.length, 'observação', 'observações')} mais recentes.</Typography>
              </Paper>
            )}
          </Painel>
        </>
      )}
    </>
  );
}
