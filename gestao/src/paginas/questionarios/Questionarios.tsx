// Questionários da aula: cada um tem um link que abre direto nele (o aluno não vê os outros jogos). Ver as perguntas,
// copiar o link (ou mandar pelo WhatsApp) e fazer uma versão nova a partir de um que já existe.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as LinkRouter, useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardActions, CardContent, CircularProgress, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CabecalhoPagina from '../../components/CabecalhoPagina';
import BarraFiltros from '../../components/BarraFiltros';
import MenuAcoes from '../../components/MenuAcoes';
import Popup from '../../components/Popup';
import { CarregandoLista, ErroLista, GradeCartoes, ListaVazia } from '../../components/EstadoLista';
import { useAvisos } from '../../components/Avisos';
import { mensagemDoErro } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { lerDados, linkDoApp } from '../../lib/dadosEscola';
import { contem } from '../../lib/texto';
import { copiar, plural } from '../../lib/formato';
import type { PerguntaQuiz } from './planilha';

interface Questionario { id: string; titulo: string; perguntas: number }

export default function Questionarios() {
  const { usuario } = useAuth();
  const escola = usuario?.escola?.id || '';
  const navegar = useNavigate();
  const avisar = useAvisos();
  const [lista, setLista] = useState<Questionario[] | null>(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [vendo, setVendo] = useState<Questionario | null>(null);

  const carregar = useCallback(async () => {
    setErro('');
    try { setLista((await lerDados<{ lista: Questionario[] }>('questionarios', escola)).lista); } catch (e) { setErro(mensagemDoErro(e)); }
  }, [escola]);
  useEffect(() => { carregar(); }, [carregar]);

  const visiveis = useMemo(() => [...(lista || [])].reverse().filter((q) => !busca || contem(q.titulo, busca)), [lista, busca]);
  const link = (q: Questionario) => linkDoApp(escola, `q=${encodeURIComponent(q.id)}`);
  const copiarLink = async (q: Questionario) => { if (await copiar(link(q))) avisar(`Link de "${q.titulo}" copiado. Cole no WhatsApp, e-mail ou mural da turma.`); };
  const whats = (q: Questionario) => `https://wa.me/?text=${encodeURIComponent(`Questionário "${q.titulo}": ${link(q)}`)}`;

  return (
    <>
      <CabecalhoPagina titulo="Questionários" subtitulo="Perguntas de múltipla escolha para a aula. Cada questionário tem um link que abre direto nele."
        textoNovo="Novo questionário" aoNovo={() => navegar('/questionarios/novo')} />
      {!lista && !erro && <CarregandoLista />}
      {erro && <ErroLista mensagem={erro} aoTentar={carregar} />}
      {lista && lista.length === 0 && (
        <ListaVazia icone="📝" titulo="Nenhum questionário ainda" texto="Escreva as perguntas aqui ou envie a planilha modelo preenchida."
          acao={<Button variant="contained" onClick={() => navegar('/questionarios/novo')}>＋ Novo questionário</Button>} />
      )}
      {lista && lista.length > 0 && (
        <>
          <BarraFiltros busca={busca} aoBuscar={setBusca} rotuloBusca="Buscar questionário"
            mostrando={visiveis.length} total={lista.length} nomeItens={['questionário', 'questionários']} filtrando={!!busca} aoLimpar={() => setBusca('')} />
          {visiveis.length === 0 ? <ListaVazia icone="🔍" titulo="Nenhum questionário com essa busca" acao={<Button onClick={() => setBusca('')}>Limpar busca</Button>} /> : (
            <GradeCartoes>
              {visiveis.map((q) => (
                <Card key={q.id} variant="outlined" sx={{ display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flex: 1, pb: 1 }}>
                    <Typography variant="h6" component="h2" sx={{ lineHeight: 1.25 }}>{q.titulo}</Typography>
                    <Typography variant="body2" color="text.secondary">{plural(q.perguntas, 'pergunta', 'perguntas')}</Typography>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 1.5, pt: 0, flexWrap: 'wrap' }}>
                    <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={() => copiarLink(q)}>Copiar link</Button>
                    <Button startIcon={<VisibilityIcon />} onClick={() => setVendo(q)}>Ver</Button>
                    <Box sx={{ flex: 1 }} />
                    <MenuAcoes rotulo={`Mais ações de ${q.titulo}`} acoes={[
                      { texto: 'Mandar o link pelo WhatsApp', icone: <WhatsAppIcon fontSize="small" />, aoClicar: () => window.open(whats(q), '_blank', 'noopener') },
                      { texto: 'Fazer uma versão nova (copiar)', icone: <FileCopyIcon fontSize="small" />, aoClicar: () => navegar(`/questionarios/novo?de=${q.id}`) },
                    ]} />
                  </CardActions>
                </Card>
              ))}
            </GradeCartoes>
          )}
        </>
      )}
      <VerQuestionario questionario={vendo} escola={escola} aoFechar={() => setVendo(null)} />
    </>
  );
}

// as perguntas de um questionário, com a certa em verde (só leitura)
function VerQuestionario({ questionario, escola, aoFechar }: { questionario: Questionario | null; escola: string; aoFechar: () => void }) {
  const [perguntas, setPerguntas] = useState<PerguntaQuiz[] | null>(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    if (!questionario) return;
    setPerguntas(null); setErro('');
    lerDados<{ questionario: { perguntas: PerguntaQuiz[] } }>('questionario', escola, { id: questionario.id })
      .then((r) => setPerguntas(r.questionario.perguntas)).catch((e) => setErro(mensagemDoErro(e)));
  }, [questionario, escola]);

  return (
    <Popup aberto={!!questionario} titulo={questionario?.titulo || ''} aoFechar={aoFechar} erro={erro} largo>
      {!perguntas && !erro && <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>}
      {perguntas?.map((p, i) => (
        <Box key={i} sx={{ py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
          <Typography fontWeight={800}>{i + 1}. {p.pergunta}</Typography>
          <Typography color="success.main" fontWeight={700}>✓ {p.certa}</Typography>
          {p.erradas.map((e) => <Typography key={e} color="text.secondary">✗ {e}</Typography>)}
        </Box>
      ))}
      {perguntas && <Button component={LinkRouter} to={`/questionarios/novo?de=${questionario?.id}`} startIcon={<FileCopyIcon />} sx={{ mt: 1 }}>Fazer uma versão nova</Button>}
    </Popup>
  );
}
