// Competições: um jogo (ou questionário) para uma turma, aberto até um dia e hora. Os alunos entram com o código da
// turma e a competição aparece na aba 🏆 do app. Aqui: criar, ver o ranking, copiar o convite e encerrar antes da hora.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, ListSubheader, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import CabecalhoPagina from '../../components/CabecalhoPagina';
import BarraFiltros from '../../components/BarraFiltros';
import FiltroSelect from '../../components/FiltroSelect';
import MenuAcoes from '../../components/MenuAcoes';
import Popup from '../../components/Popup';
import { CarregandoLista, ErroLista, GradeCartoes, ListaVazia } from '../../components/EstadoLista';
import { useAvisos } from '../../components/Avisos';
import { useConfirmar } from '../../components/Confirmar';
import { api, mensagemDoErro } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { gravar, lerDados } from '../../lib/dadosEscola';
import { NOME_DO_JOGO } from '../../lib/dadosDoApp';
import { contem } from '../../lib/texto';
import { copiar, plural } from '../../lib/formato';
import type { Turma } from '../../types';

interface Competicao {
  id: string; nome: string; jogo: string; jogoNome: string; turma: string; turmaCodigo: string; turmaId: string;
  criada: string; encerra: string; aberta: boolean; participantes: number;
}

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
// o valor do campo de data e hora (fuso local): hoje às 23:59
function hojeAs2359() {
  const d = new Date(); d.setHours(23, 59, 0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function Competicoes() {
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const [lista, setLista] = useState<Competicao[] | null>(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('abertas');
  const [nova, setNova] = useState(false);
  const [ranking, setRanking] = useState<Competicao | null>(null);

  const carregar = useCallback(async () => {
    setErro('');
    try { setLista((await gravar<{ lista: Competicao[] }>('competicoesProfessor')).lista); } catch (e) { setErro(mensagemDoErro(e)); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const base = useMemo(() => (lista || []).filter((c) => !busca || contem(`${c.nome} ${c.jogoNome} ${c.turma} ${c.turmaCodigo}`, busca)), [lista, busca]);
  const testa = (c: Competicao, s: string) => s === 'todas' || (s === 'abertas' ? c.aberta : !c.aberta);
  const visiveis = base.filter((c) => testa(c, situacao));
  const filtrando = !!busca || situacao !== 'abertas';
  const limpar = () => { setBusca(''); setSituacao('abertas'); };

  const convite = async (c: Competicao) => {
    const texto = `Competição "${c.nome}" (${c.jogoNome}) no app dos jogos: toque em "Entrar com o código da turma" e use o código ${c.turmaCodigo}. Vale até ${quando(c.encerra)}.`;
    if (await copiar(texto)) avisar('Convite copiado. Cole no WhatsApp ou no mural da turma.');
  };
  const encerrar = async (c: Competicao) => {
    if (!(await confirmar({ titulo: `Encerrar "${c.nome}" agora?`, botao: 'Encerrar agora', perigo: true, texto: 'Ninguém mais poderá jogar. O ranking fica guardado.' }))) return;
    try { setLista((await gravar<{ lista: Competicao[] }>('encerrarCompeticao', { id: c.id })).lista); avisar(`"${c.nome}" foi encerrada.`); }
    catch (e) { avisar(mensagemDoErro(e), 'error'); }
  };

  return (
    <>
      <CabecalhoPagina titulo="Competições" subtitulo="Um jogo ou questionário valendo ranking para uma turma, até o dia e a hora que você escolher."
        textoNovo="Nova competição" aoNovo={() => setNova(true)} />
      {!lista && !erro && <CarregandoLista />}
      {erro && <ErroLista mensagem={erro} aoTentar={carregar} />}
      {lista && lista.length === 0 && (
        <ListaVazia icone="🏆" titulo="Nenhuma competição nos últimos 30 dias" texto="Crie uma: os alunos entram com o código da turma e disputam o ranking."
          acao={<Button variant="contained" onClick={() => setNova(true)}>＋ Nova competição</Button>} />
      )}
      {lista && lista.length > 0 && (
        <>
          <BarraFiltros busca={busca} aoBuscar={setBusca} rotuloBusca="Buscar por nome, jogo ou turma" qtdFiltros={1}
            mostrando={visiveis.length} total={lista.length} nomeItens={['competição', 'competições']} filtrando={filtrando} aoLimpar={limpar}
            filtros={<FiltroSelect rotulo="Situação" valor={situacao} aoMudar={setSituacao} opcoes={[
              { valor: 'abertas', rotulo: 'Abertas', qtd: base.filter((c) => c.aberta).length },
              { valor: 'encerradas', rotulo: 'Encerradas', qtd: base.filter((c) => !c.aberta).length },
              { valor: 'todas', rotulo: 'Todas', qtd: base.length },
            ]} />} />
          {visiveis.length === 0 ? <ListaVazia icone="🔍" titulo="Nenhuma competição com esse filtro" acao={<Button onClick={limpar}>Limpar filtros</Button>} /> : (
            <GradeCartoes>
              {visiveis.map((c) => (
                <Card key={c.id} variant="outlined" sx={{ display: 'flex', flexDirection: 'column', borderLeft: 6, borderLeftColor: c.aberta ? 'success.main' : 'grey.300' }}>
                  <CardContent sx={{ flex: 1, pb: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}>
                      <Typography variant="h6" component="h2" sx={{ lineHeight: 1.25 }}>{c.nome}</Typography>
                      <Chip size="small" color={c.aberta ? 'success' : 'default'} variant={c.aberta ? 'filled' : 'outlined'} label={c.aberta ? 'Aberta' : 'Encerrada'} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">🎮 {c.jogoNome} · 🎒 {c.turma || 'sem turma'}{c.turmaCodigo && ` (código ${c.turmaCodigo})`}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {c.aberta ? `⏰ Aberta até ${quando(c.encerra)}` : `🔒 Encerrou ${quando(c.encerra)}`} · {plural(c.participantes, 'aluno', 'alunos')}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 1.5, pt: 0 }}>
                    <Button variant="contained" startIcon={<EmojiEventsIcon />} onClick={() => setRanking(c)}>Ranking</Button>
                    {c.aberta && c.turmaCodigo && <Button startIcon={<ContentCopyIcon />} onClick={() => convite(c)}>Convite</Button>}
                    <Box sx={{ flex: 1 }} />
                    {c.aberta && <MenuAcoes rotulo={`Mais ações de ${c.nome}`} acoes={[{ texto: 'Encerrar agora', icone: <StopCircleIcon fontSize="small" />, perigo: true, aoClicar: () => encerrar(c) }]} />}
                  </CardActions>
                </Card>
              ))}
            </GradeCartoes>
          )}
        </>
      )}
      <PopupCompeticao aberto={nova} aoFechar={() => setNova(false)}
        aoSalvar={(c) => { setNova(false); setSituacao('abertas'); avisar(`Competição "${c.nome}" criada. Os alunos entram com o código da turma.`); carregar(); }} />
      <Ranking competicao={ranking} aoFechar={() => setRanking(null)} />
    </>
  );
}

function PopupCompeticao({ aberto, aoFechar, aoSalvar }: { aberto: boolean; aoFechar: () => void; aoSalvar: (c: Competicao) => void }) {
  const { usuario } = useAuth();
  const escola = usuario?.escola?.id || '';
  const [turmas, setTurmas] = useState<Turma[] | null>(null);
  const [quizzes, setQuizzes] = useState<{ id: string; titulo: string }[]>([]);
  const [emails, setEmails] = useState<{ nome: string; email: string }[]>([]);
  const [turma, setTurma] = useState('');
  const [jogo, setJogo] = useState('');
  const [nome, setNome] = useState('');
  const [encerra, setEncerra] = useState(hojeAs2359());
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [campo, setCampo] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setNome(''); setJogo(''); setEncerra(hojeAs2359()); setErro(''); setCampo('');
    api<Turma[]>('/turmas').then((ts) => { const ativas = ts.filter((t) => t.ativa); setTurmas(ativas); setTurma(ativas.length === 1 ? ativas[0].id : ''); }).catch(() => setTurmas([]));
    lerDados<{ lista: { id: string; titulo: string }[] }>('questionarios', escola).then((r) => setQuizzes(r.lista)).catch(() => setQuizzes([]));
    lerDados<{ emails: { nome: string; email: string }[] }>('emails', escola).then((r) => { setEmails(r.emails); setEmail(r.emails.length === 1 ? r.emails[0].email : ''); }).catch(() => setEmails([]));
  }, [aberto, escola]);

  const nomeDoJogo = (v: string) => (v.startsWith('quiz:') ? `Questionário: ${quizzes.find((q) => `quiz:${q.id}` === v)?.titulo || ''}` : NOME_DO_JOGO[v] || v);

  const salvar = async () => {
    setErro(''); setCampo('');
    if (!turma) { setErro('Escolha a turma da competição (os alunos entram com o código dela).'); setCampo('turma'); return; }
    if (!jogo) { setErro('Escolha o jogo ou o questionário da competição.'); setCampo('jogo'); return; }
    const fim = new Date(encerra);
    if (!encerra || Number.isNaN(fim.getTime()) || fim <= new Date()) { setErro('Escolha um dia e hora de encerrar que ainda não passaram.'); setCampo('encerra'); return; }
    setSalvando(true);
    try {
      const r = await gravar<{ competicao: Competicao }>('criarCompeticao', { turma, jogo, jogoNome: nomeDoJogo(jogo), nome: nome.trim(), encerra: fim.toISOString(), email });
      aoSalvar(r.competicao);
    } catch (e) { setErro(mensagemDoErro(e)); } finally { setSalvando(false); }
  };

  return (
    <Popup aberto={aberto} titulo="Nova competição" aoFechar={aoFechar} aoSalvar={salvar} textoSalvar="Criar competição" salvando={salvando} erro={erro}>
      {!turmas ? <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box> : (
        <Stack spacing={2.5}>
          <TextField select label="Turma" required value={turma} onChange={(e) => setTurma(e.target.value)} error={campo === 'turma'}
            helperText={turmas.length ? 'Os alunos entram com o código desta turma.' : 'Crie uma turma primeiro (em Turmas).'}>
            {turmas.map((t) => <MenuItem key={t.id} value={t.id}>{t.nome} (código {t.codigo})</MenuItem>)}
          </TextField>
          <TextField select label="Jogo ou questionário" required value={jogo} onChange={(e) => setJogo(e.target.value)} error={campo === 'jogo'}>
            <ListSubheader>🎮 Jogos</ListSubheader>
            {Object.entries(NOME_DO_JOGO).map(([id, n]) => <MenuItem key={id} value={id}>{n}</MenuItem>)}
            {quizzes.length > 0 && <ListSubheader>📝 Questionários</ListSubheader>}
            {quizzes.map((q) => <MenuItem key={q.id} value={`quiz:${q.id}`}>{q.titulo}</MenuItem>)}
          </TextField>
          <TextField label="Nome da competição (opcional)" value={nome} onChange={(e) => setNome(e.target.value)} inputProps={{ maxLength: 60 }}
            placeholder={jogo ? nomeDoJogo(jogo) : 'Ex.: Desafio da semana'} helperText="Vazio: usa o nome do jogo." />
          <TextField label="Encerra em" type="datetime-local" required value={encerra} onChange={(e) => setEncerra(e.target.value)} error={campo === 'encerra'}
            InputLabelProps={{ shrink: true }} />
          <TextField select label="Relatório da competição por e-mail" value={email} onChange={(e) => setEmail(e.target.value)}
            SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
            <MenuItem value="">Não enviar</MenuItem>
            {emails.map((x) => <MenuItem key={x.email} value={x.email}>{x.nome}</MenuItem>)}
          </TextField>
        </Stack>
      )}
    </Popup>
  );
}

const MEDALHA = ['🥇', '🥈', '🥉'];

function Ranking({ competicao, aoFechar }: { competicao: Competicao | null; aoFechar: () => void }) {
  const { usuario } = useAuth();
  const [linhas, setLinhas] = useState<{ nome: string; pontos: number; acertos: number; total: number; partidas: number }[] | null>(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    if (!competicao) return;
    setLinhas(null); setErro('');
    lerDados<{ ranking: NonNullable<typeof linhas> }>('ranking', usuario?.escola?.id || '', { id: competicao.id })
      .then((r) => setLinhas(r.ranking)).catch((e) => setErro(mensagemDoErro(e)));
  }, [competicao, usuario?.escola?.id]);

  return (
    <Popup aberto={!!competicao} titulo={`Ranking · ${competicao?.nome || ''}`} aoFechar={aoFechar} erro={erro}>
      {!linhas && !erro && <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>}
      {linhas && linhas.length === 0 && <Typography color="text.secondary" sx={{ py: 2 }}>Ninguém jogou ainda.</Typography>}
      {linhas && linhas.length > 0 && (
        <Table size="small" aria-label="Ranking">
          <TableHead><TableRow><TableCell>#</TableCell><TableCell>Aluno</TableCell><TableCell align="right">Pontos</TableCell><TableCell align="right">Acertos</TableCell></TableRow></TableHead>
          <TableBody>
            {linhas.map((l, i) => (
              <TableRow key={l.nome} sx={{ '& td': { py: 1.25, fontWeight: i < 3 ? 800 : 400 } }}>
                <TableCell>{MEDALHA[i] || i + 1}</TableCell>
                <TableCell>{l.nome}<Typography variant="body2" color="text.secondary">{plural(l.partidas, 'partida', 'partidas')}</Typography></TableCell>
                <TableCell align="right">{l.pontos}</TableCell>
                <TableCell align="right">{l.acertos}/{l.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Popup>
  );
}
