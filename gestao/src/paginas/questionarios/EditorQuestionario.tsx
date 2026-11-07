// Novo questionário (página própria): o nome e as perguntas — cada uma com 1 resposta certa e até 3 erradas (no jogo
// elas aparecem embaralhadas). As perguntas entram uma a uma, de uma planilha (.xlsx ou .csv, como a planilha modelo)
// ou geradas pela IA a partir de fotos/PDF do exercício (GerarComIA) — as duas caem na mesma revisão antes de salvar.
// "Copiar de" (?de=<id>) abre com as perguntas de um questionário que já existe, para fazer uma versão nova.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, IconButton, Paper, Skeleton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Migalhas from '../../components/Migalhas';
import { useAvisos } from '../../components/Avisos';
import { useConfirmar } from '../../components/Confirmar';
import { mensagemDoErro } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { gravar, lerDados } from '../../lib/dadosEscola';
import { lerPlanilha, linhasParaPerguntas, PerguntaQuiz } from './planilha';
import GerarComIA from './GerarComIA';

const vazia = (): PerguntaQuiz => ({ pergunta: '', certa: '', erradas: ['', '', ''] });
const completa = (q: PerguntaQuiz) => !!(q.pergunta.trim() && q.certa.trim() && q.erradas.some((e) => e.trim()));
const emBranco = (q: PerguntaQuiz) => !q.pergunta.trim() && !q.certa.trim() && !q.erradas.some((e) => e.trim());

export default function EditorQuestionario() {
  const [parametros] = useSearchParams();
  const de = parametros.get('de');
  const navegar = useNavigate();
  const { usuario } = useAuth();
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const [titulo, setTitulo] = useState('');
  const [perguntas, setPerguntas] = useState<PerguntaQuiz[] | null>(de ? null : [vazia()]);
  const [erro, setErro] = useState('');
  const [destaque, setDestaque] = useState<number | 'titulo' | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [comIA, setComIA] = useState(false);
  const refArquivo = useRef<HTMLInputElement>(null);
  const refTitulo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!de) return;
    lerDados<{ questionario: { titulo: string; perguntas: PerguntaQuiz[] } }>('questionario', usuario?.escola?.id || '', { id: de })
      .then(({ questionario: q }) => {
        setTitulo(`${q.titulo} (cópia)`);
        setPerguntas(q.perguntas.map((p) => ({ ...p, erradas: [...p.erradas, '', '', ''].slice(0, 3) })));
      }).catch((e) => { setErro(mensagemDoErro(e)); setPerguntas([vazia()]); });
  }, [de, usuario?.escola?.id]);

  if (!perguntas) return <><Skeleton height={60} width="40%" /><Skeleton variant="rounded" height={400} /></>;

  const mudar = (i: number, m: Partial<PerguntaQuiz>) => { setPerguntas((ps) => ps!.map((q, k) => (k === i ? { ...q, ...m } : q))); if (destaque === i) setDestaque(null); };
  const mudarErrada = (i: number, k: number, v: string) => mudar(i, { erradas: perguntas[i].erradas.map((e, j) => (j === k ? v : e)) });
  const mudou = !!titulo.trim() || perguntas.some((q) => !emBranco(q));

  // as perguntas da planilha e as da IA entram do mesmo jeito: depois das que já estão escritas, para conferir e editar
  const acrescentar = (lidas: PerguntaQuiz[], nome: string) => {
    setPerguntas((ps) => [...ps!.filter((q) => !emBranco(q)), ...lidas.map((q) => ({ ...q, erradas: [...q.erradas, '', '', ''].slice(0, 3) }))]);
    if (!titulo.trim()) setTitulo(nome.slice(0, 80));
  };

  const importar = async (arquivo?: File) => {
    if (!arquivo) return;
    setLendo(true); setErro('');
    try {
      const lidas = await lerPlanilha(arquivo);
      if (!lidas.length) { setErro('Não achei perguntas na planilha. Use as colunas A pergunta, B certa, C a E erradas (como na planilha modelo).'); return; }
      acrescentar(lidas, arquivo.name.replace(/\.[^.]+$/, ''));
      avisar(`${lidas.length} pergunta(s) lida(s) da planilha. Confira antes de salvar.`);
    } catch (e) { setErro(mensagemDoErro(e)); } finally { setLendo(false); }
  };

  // a IA devolve no formato da planilha; passa pela mesma leitura das linhas (A pergunta, B certa, C a E erradas).
  // Vai com a linha de cabeçalho na frente: sem ela, uma 1ª pergunta com a palavra "pergunta" seria tomada por cabeçalho
  const receberDaIA = (geradas: PerguntaQuiz[], nome: string) => {
    const lidas = linhasParaPerguntas([['Pergunta', 'Resposta certa'], ...geradas.map((q) => [q.pergunta, q.certa, ...q.erradas])]);
    if (!lidas.length) { setErro('A IA não devolveu perguntas completas. Tente outra foto.'); return; }
    setErro('');
    acrescentar(lidas, nome);
    avisar(`${lidas.length} pergunta(s) criada(s) pela IA. Confira e ajuste antes de salvar.`);
  };

  const salvar = async () => {
    setErro(''); setDestaque(null);
    if (!titulo.trim()) { setErro('Dê um nome ao questionário (é o que os alunos veem).'); setDestaque('titulo'); refTitulo.current?.focus(); return; }
    const incompleta = perguntas.findIndex((q) => !emBranco(q) && !completa(q));
    if (incompleta >= 0) {
      setErro(`Pergunta ${incompleta + 1}: escreva a pergunta, a resposta certa e pelo menos uma errada.`);
      setDestaque(incompleta);
      document.getElementById(`quiz-${incompleta}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const prontas = perguntas.filter(completa).map((q) => ({ pergunta: q.pergunta.trim(), certa: q.certa.trim(), erradas: q.erradas.map((e) => e.trim()).filter(Boolean) }));
    if (!prontas.length) { setErro('Escreva pelo menos uma pergunta com a resposta certa e uma errada.'); setDestaque(0); return; }
    setSalvando(true);
    try {
      await gravar('salvarQuestionario', { titulo: titulo.trim(), perguntas: prontas });
      avisar(`Questionário "${titulo.trim()}" salvo. Os alunos já podem jogar.`);
      navegar('/questionarios');
    } catch (e) { setErro(mensagemDoErro(e)); } finally { setSalvando(false); }
  };

  const voltar = async () => {
    if (mudou && !(await confirmar({ titulo: 'Sair sem salvar?', botao: 'Sair sem salvar', perigo: true, texto: 'As perguntas escritas vão se perder.' }))) return;
    navegar('/questionarios');
  };

  return (
    <Box sx={{ pb: 12 }}>
      <Migalhas itens={[{ texto: 'Questionários', para: '/questionarios' }, { texto: de ? 'Cópia' : 'Novo questionário' }]} />
      <Typography variant="h4" component="h1" sx={{ mb: 2.5 }}>{de ? 'Nova versão do questionário' : 'Novo questionário'}</Typography>

      <TextField fullWidth label="Nome do questionário" required value={titulo} onChange={(e) => { setTitulo(e.target.value); if (destaque === 'titulo') setDestaque(null); }}
        inputRef={refTitulo} error={destaque === 'titulo'} autoFocus={!de} inputProps={{ maxLength: 80 }} placeholder="Ex.: Sistema solar · 5º ano" sx={{ mb: 2 }} />

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography fontWeight={800}>Tem as perguntas numa planilha?</Typography>
          <Typography variant="body2" color="text.secondary">Coluna A a pergunta, B a resposta certa, C a E as erradas. A planilha modelo já vem com exemplos.</Typography>
        </Box>
        <Button startIcon={<DownloadIcon />} href="/assets/modelo-questionario.xlsx" download>Planilha modelo</Button>
        <Button variant="outlined" startIcon={lendo ? <CircularProgress size={18} /> : <UploadFileIcon />} disabled={lendo} onClick={() => refArquivo.current?.click()}>
          Enviar planilha
        </Button>
        <input ref={refArquivo} type="file" hidden accept=".xlsx,.xls,.csv,.txt" onChange={(e) => { importar(e.target.files?.[0]); e.target.value = ''; }} />
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', borderColor: 'primary.light' }}>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography fontWeight={800}>Tem o exercício no papel ou em PDF?</Typography>
          <Typography variant="body2" color="text.secondary">Fotografe as páginas (ou mande o PDF) e a IA cria as perguntas para você conferir.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AutoAwesomeIcon />} onClick={() => setComIA(true)}>Gerar com IA (foto ou PDF)</Button>
      </Paper>
      <GerarComIA aberto={comIA} aoFechar={() => setComIA(false)} aoGerar={receberDaIA} />

      <Stack spacing={1.5}>
        {perguntas.map((q, i) => (
          <Paper key={i} id={`quiz-${i}`} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2.5, borderColor: destaque === i ? 'error.main' : 'divider', borderWidth: destaque === i ? 2 : 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography fontWeight={800} sx={{ flex: 1 }}>Pergunta {i + 1}</Typography>
              {perguntas.length > 1 && <Tooltip title="Tirar"><IconButton aria-label={`Tirar a pergunta ${i + 1}`} onClick={() => setPerguntas((ps) => ps!.filter((_, k) => k !== i))}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
            </Box>
            <TextField fullWidth multiline label="Pergunta" value={q.pergunta} onChange={(e) => mudar(i, { pergunta: e.target.value })} inputProps={{ maxLength: 300 }}
              error={destaque === i && !q.pergunta.trim()} sx={{ mb: 1.5 }} />
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <TextField label="Resposta certa" value={q.certa} onChange={(e) => mudar(i, { certa: e.target.value })} inputProps={{ maxLength: 160 }}
                error={destaque === i && !q.certa.trim()} color="success"
                InputProps={{ startAdornment: <CheckCircleIcon color="success" sx={{ mr: 1 }} fontSize="small" /> }} />
              {q.erradas.map((e, k) => (
                <TextField key={k} label={`Resposta errada ${k + 1}${k ? ' (opcional)' : ''}`} value={e} onChange={(ev) => mudarErrada(i, k, ev.target.value)}
                  inputProps={{ maxLength: 160 }} error={destaque === i && k === 0 && !q.erradas.some((x) => x.trim())}
                  InputProps={{ startAdornment: <CancelIcon color="error" sx={{ mr: 1, opacity: 0.7 }} fontSize="small" /> }} />
              ))}
            </Box>
          </Paper>
        ))}
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setPerguntas((ps) => [...ps!, vazia()])} sx={{ alignSelf: 'flex-start' }}>Mais uma pergunta</Button>
      </Stack>

      <Paper elevation={8} sx={{ position: 'fixed', left: { xs: 0, md: 264 }, right: 0, bottom: 0, zIndex: (t) => t.zIndex.appBar, px: { xs: 2, md: 3 }, py: 1.5,
        pb: 'calc(12px + env(safe-area-inset-bottom))', borderRadius: 0 }}>
        {erro && <Alert severity="error" role="alert" sx={{ mb: 1 }}>{erro}</Alert>}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{perguntas.filter(completa).length} de {perguntas.length} pergunta(s) prontas</Typography>
          <Button onClick={voltar} disabled={salvando}>Cancelar</Button>
          <Button variant="contained" size="large" onClick={salvar} disabled={salvando} startIcon={salvando ? <CircularProgress size={18} color="inherit" /> : undefined}>Salvar questionário</Button>
        </Box>
      </Paper>
    </Box>
  );
}
