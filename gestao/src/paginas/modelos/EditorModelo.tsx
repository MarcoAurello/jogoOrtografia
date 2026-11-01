// Editor do modelo de anamnese (página própria): o nome e as perguntas — cada uma com o tipo de resposta, as opções
// (quando tem) e se é obrigatória. As perguntas entram uma a uma ou do banco de perguntas. Barra de salvar presa embaixo.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, FormControlLabel, IconButton, MenuItem, Paper, Skeleton, Stack, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';
import Migalhas from '../../components/Migalhas';
import { ErroLista } from '../../components/EstadoLista';
import { useAvisos } from '../../components/Avisos';
import { useConfirmar } from '../../components/Confirmar';
import { api, mensagemDoErro } from '../../lib/api';
import PopupBanco, { NOME_DO_TIPO } from './PopupBanco';
import type { ModeloAnamnese, PerguntaAnamnese } from '../../types';

const MAX_PERGUNTAS = 150;
const comOpcoes = (tipo: string) => tipo === 'multipla' || tipo === 'varias';
const nova = (): PerguntaAnamnese => ({ id: '', tipo: 'curta', texto: '', opcoes: [], obrigatoria: false });

export default function EditorModelo() {
  const { id = 'novo' } = useParams();
  const novo = id === 'novo';
  const navegar = useNavigate();
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const [titulo, setTitulo] = useState('');
  const [perguntas, setPerguntas] = useState<PerguntaAnamnese[] | null>(null);
  const inicial = useRef('');
  const [erroCarregar, setErroCarregar] = useState('');
  const [erro, setErro] = useState('');
  const [destaque, setDestaque] = useState<number | 'titulo' | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [banco, setBanco] = useState(false);
  const refTitulo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (novo) { setTitulo(''); setPerguntas([]); inicial.current = JSON.stringify({ t: '', p: [] }); return; }
    api<ModeloAnamnese[]>('/anamneses/modelos').then((ms) => {
      const m = ms.find((x) => x.id === id);
      if (!m) { setErroCarregar('Modelo não encontrado.'); return; }
      setTitulo(m.titulo);
      setPerguntas(m.perguntas.map((q) => ({ ...q, opcoes: q.opcoes || [] })));
      inicial.current = JSON.stringify({ t: m.titulo, p: m.perguntas.map((q) => ({ ...q, opcoes: q.opcoes || [] })) });
    }).catch((e) => setErroCarregar(mensagemDoErro(e)));
  }, [id, novo]);

  const mudou = perguntas !== null && JSON.stringify({ t: titulo, p: perguntas }) !== inicial.current;
  useEffect(() => {
    if (!mudou) return;
    const avisarSaida = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisarSaida);
    return () => window.removeEventListener('beforeunload', avisarSaida);
  }, [mudou]);

  if (erroCarregar) return <ErroLista mensagem={erroCarregar} aoTentar={() => navegar(0)} />;
  if (!perguntas) return <><Skeleton height={60} width="40%" /><Skeleton variant="rounded" height={400} /></>;

  const mudar = (i: number, m: Partial<PerguntaAnamnese>) => { setPerguntas((ps) => ps!.map((q, k) => (k === i ? { ...q, ...m } : q))); if (destaque === i) setDestaque(null); };
  const mover = (i: number, d: -1 | 1) => setPerguntas((ps) => { const l = [...ps!]; [l[i], l[i + d]] = [l[i + d], l[i]]; return l; });
  const tirar = (i: number) => setPerguntas((ps) => ps!.filter((_, k) => k !== i));
  const adicionar = () => {
    setPerguntas((ps) => [...ps!, nova()]);
    setTimeout(() => document.getElementById(`pergunta-texto-${perguntas.length}`)?.focus(), 50);
  };

  const falhar = (onde: number | 'titulo', mensagem: string) => {
    setErro(mensagem);
    setDestaque(onde);
    if (onde === 'titulo') refTitulo.current?.focus();
    else { const el = document.getElementById(`pergunta-texto-${onde}`); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); el?.focus(); }
  };

  const salvar = async () => {
    setErro(''); setDestaque(null);
    if (!titulo.trim()) return falhar('titulo', 'Dê um nome ao questionário de anamnese.');
    if (!perguntas.length) return falhar('titulo', 'Adicione pelo menos uma pergunta (uma a uma ou do banco de perguntas).');
    const semTexto = perguntas.findIndex((q) => !q.texto.trim());
    if (semTexto >= 0) return falhar(semTexto, `Pergunta ${semTexto + 1}: escreva a pergunta.`);
    const semOpcoes = perguntas.findIndex((q) => comOpcoes(q.tipo) && (q.opcoes || []).length < 2);
    if (semOpcoes >= 0) return falhar(semOpcoes, `Pergunta ${semOpcoes + 1}: a pergunta de opções precisa de pelo menos 2 opções.`);
    setSalvando(true);
    try {
      const corpo = { titulo: titulo.trim(), perguntas: perguntas.map((q) => ({ ...q, opcoes: comOpcoes(q.tipo) ? q.opcoes : [] })) };
      if (novo) await api('/anamneses/modelos', { metodo: 'POST', corpo });
      else await api(`/anamneses/modelos/${id}`, { metodo: 'PUT', corpo });
      inicial.current = JSON.stringify({ t: titulo, p: perguntas });
      avisar('Modelo salvo.');
      navegar('/modelos-anamnese');
    } catch (e) {
      const m = mensagemDoErro(e);
      const n = Number(/Pergunta (\d+)/.exec(m)?.[1]);
      falhar(n ? n - 1 : 'titulo', m);
    } finally { setSalvando(false); }
  };

  const voltar = async () => {
    if (mudou && !(await confirmar({ titulo: 'Sair sem salvar?', botao: 'Sair sem salvar', perigo: true, texto: 'As mudanças neste modelo vão se perder.' }))) return;
    navegar('/modelos-anamnese');
  };

  return (
    <Box sx={{ pb: 12 }}>
      <Migalhas itens={[{ texto: 'Modelos de anamnese', para: '/modelos-anamnese' }, { texto: novo ? 'Novo modelo' : titulo || 'Modelo' }]} />
      <Typography variant="h4" component="h1" sx={{ mb: 2.5 }}>{novo ? 'Novo modelo de anamnese' : 'Editar modelo'}</Typography>

      <TextField fullWidth label="Nome do questionário" required value={titulo} onChange={(e) => { setTitulo(e.target.value); if (destaque === 'titulo') setDestaque(null); }}
        inputRef={refTitulo} error={destaque === 'titulo'} autoFocus={novo} inputProps={{ maxLength: 120 }} placeholder="Ex.: Anamnese inicial (Fundamental I)" sx={{ mb: 2.5 }} />

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>Perguntas ({perguntas.length})</Typography>
        <Button variant="outlined" startIcon={<LibraryBooksIcon />} onClick={() => setBanco(true)}>Do banco de perguntas</Button>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={adicionar} disabled={perguntas.length >= MAX_PERGUNTAS}>Pergunta</Button>
      </Box>

      {perguntas.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed' }}>
          <Typography variant="h6">Comece pelo banco de perguntas</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>São as perguntas dos 5 modelos de anamnese psicopedagógica, por assunto. Marque as que quiser.</Typography>
          <Button variant="contained" startIcon={<LibraryBooksIcon />} onClick={() => setBanco(true)}>Abrir o banco de perguntas</Button>
        </Paper>
      )}

      <Stack spacing={1.5}>
        {perguntas.map((q, i) => (
          <Paper key={q.id || `nova-${i}`} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2.5, borderColor: destaque === i ? 'error.main' : 'divider', borderWidth: destaque === i ? 2 : 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography fontWeight={800} sx={{ flex: 1 }}>{i + 1}.</Typography>
              <FormControlLabel control={<Switch checked={!!q.obrigatoria} onChange={(e) => mudar(i, { obrigatoria: e.target.checked })} />} label="Obrigatória" sx={{ mr: 1 }} />
              <Tooltip title="Subir"><span><IconButton aria-label="Subir a pergunta" disabled={i === 0} onClick={() => mover(i, -1)}><ArrowUpwardIcon fontSize="small" /></IconButton></span></Tooltip>
              <Tooltip title="Descer"><span><IconButton aria-label="Descer a pergunta" disabled={i === perguntas.length - 1} onClick={() => mover(i, 1)}><ArrowDownwardIcon fontSize="small" /></IconButton></span></Tooltip>
              <Tooltip title="Tirar"><IconButton aria-label="Tirar a pergunta" onClick={() => tirar(i)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
            </Box>
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 220px' } }}>
              <TextField id={`pergunta-texto-${i}`} label="Pergunta" multiline value={q.texto} onChange={(e) => mudar(i, { texto: e.target.value })}
                error={destaque === i && !q.texto.trim()} inputProps={{ maxLength: 300 }} />
              <TextField select label="Tipo de resposta" value={q.tipo} onChange={(e) => mudar(i, { tipo: e.target.value })}>
                {Object.entries(NOME_DO_TIPO).map(([v, r]) => <MenuItem key={v} value={v}>{r[0].toUpperCase() + r.slice(1)}</MenuItem>)}
              </TextField>
              {comOpcoes(q.tipo) && (
                <Autocomplete multiple freeSolo options={[]} value={q.opcoes || []} onChange={(_, v) => mudar(i, { opcoes: [...new Set(v.map((x) => String(x).trim()).filter(Boolean))].slice(0, 20) })}
                  sx={{ gridColumn: { md: '1 / -1' } }}
                  renderTags={(v, getProps) => v.map((o, k) => <Chip label={o} size="small" {...getProps({ index: k })} key={o} />)}
                  renderInput={(p) => <TextField {...p} label="Opções" error={destaque === i && (q.opcoes || []).length < 2}
                    helperText="Escreva cada opção e tecle Enter (pelo menos 2)." />} />
              )}
            </Box>
          </Paper>
        ))}
      </Stack>

      <Paper elevation={8} sx={{ position: 'fixed', left: { xs: 0, md: 264 }, right: 0, bottom: 0, zIndex: (t) => t.zIndex.appBar, px: { xs: 2, md: 3 }, py: 1.5,
        pb: 'calc(12px + env(safe-area-inset-bottom))', borderRadius: 0 }}>
        {erro && <Alert severity="error" role="alert" sx={{ mb: 1 }}>{erro}</Alert>}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          {mudou && <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>Mudanças não salvas</Typography>}
          <Button onClick={voltar} disabled={salvando}>Cancelar</Button>
          <Button variant="contained" size="large" onClick={salvar} disabled={salvando} startIcon={salvando ? <CircularProgress size={18} color="inherit" /> : undefined}>Salvar modelo</Button>
        </Box>
      </Paper>

      <PopupBanco aberto={banco} jaNoModelo={perguntas.map((q) => q.texto)} aoFechar={() => setBanco(false)}
        aoIncluir={(novas) => {
          setPerguntas((ps) => [...ps!, ...novas.map((q) => ({ id: '', tipo: q.tipo, texto: q.texto, opcoes: q.opcoes, obrigatoria: false }))].slice(0, MAX_PERGUNTAS));
          setBanco(false);
          if (novas.length) avisar(`${novas.length} pergunta(s) incluída(s) no fim do modelo.`);
        }} />
    </Box>
  );
}
