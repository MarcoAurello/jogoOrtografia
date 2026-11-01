// Observações de evolução do aluno: uma linha do tempo (a mais recente em cima), com filtro por categoria.
// Quem escreveu (ou a coordenação) corrige e apaga; quem mexe no aluno escreve.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Chip, Divider, IconButton, MenuItem, Paper, Skeleton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Popup from '../../components/Popup';
import FiltroSelect from '../../components/FiltroSelect';
import { ErroLista, ListaVazia } from '../../components/EstadoLista';
import { useAvisos } from '../../components/Avisos';
import { useConfirmar } from '../../components/Confirmar';
import { api, mensagemDoErro } from '../../lib/api';
import { useCarregar } from '../../lib/useCarregar';
import { CATEGORIAS_OBS } from '../../lib/desempenho';
import type { Observacao } from '../../types';

const hojeISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const dataBR = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export default function AbaObservacoes({ alunoId, nome, podeEscrever }: { alunoId: string; nome: string; podeEscrever: boolean }) {
  const { dados, erro, carregando, recarregar } = useCarregar<Observacao[]>(`/alunos/${alunoId}/observacoes`);
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const [categoria, setCategoria] = useState('');
  const [popup, setPopup] = useState<{ aberto: boolean; obs: Observacao | null }>({ aberto: false, obs: null });

  const lista = useMemo(() => (dados || []).filter((o) => !categoria || o.categoria === categoria), [dados, categoria]);

  const apagar = async (o: Observacao) => {
    const ok = await confirmar({ titulo: 'Apagar esta observação?', botao: 'Apagar', perigo: true, texto: 'Ela some do histórico do aluno. Não dá para desfazer.' });
    if (!ok) return;
    try { await api(`/observacoes/${o.id}`, { metodo: 'DELETE' }); avisar('Observação apagada.'); recarregar(); }
    catch (e) { avisar(mensagemDoErro(e), 'error'); }
  };

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        {dados && dados.length > 0 && (
          <Box sx={{ minWidth: 220, flex: { xs: 1, sm: 'none' } }}>
            <FiltroSelect rotulo="Categoria" valor={categoria} aoMudar={setCategoria} opcoes={[
              { valor: '', rotulo: 'Todas', qtd: dados.length },
              ...Object.entries(CATEGORIAS_OBS).map(([v, r]) => ({ valor: v, rotulo: r, qtd: dados.filter((o) => o.categoria === v).length })),
            ]} />
          </Box>
        )}
        <Box sx={{ flex: 1 }} />
        {podeEscrever && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setPopup({ aberto: true, obs: null })}>Nova observação</Button>}
      </Box>

      {carregando && <Skeleton variant="rounded" height={200} />}
      {erro && <ErroLista mensagem={erro} aoTentar={recarregar} />}
      {dados && dados.length === 0 && (
        <ListaVazia icone="📝" titulo="Nenhuma observação ainda"
          texto={`Registre como ${nome} está evoluindo: aprendizagem, comportamento, conversa com a família…`} />
      )}
      {lista.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 3 }}>
          {lista.map((o, i) => (
            <Box key={o.id}>
              {i > 0 && <Divider />}
              <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
                <Box sx={{ width: 4, borderRadius: 2, bgcolor: 'primary.main', opacity: 0.5, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5, mb: 0.5 }}>
                    <Typography fontWeight={800}>{dataBR(o.data)}</Typography>
                    <Chip size="small" variant="outlined" label={CATEGORIAS_OBS[o.categoria] || o.categoria} />
                    <Typography variant="body2" color="text.secondary">{o.autor_nome}</Typography>
                  </Stack>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>{o.texto}</Typography>
                </Box>
                {o.pode_editar && (
                  <Stack direction="row" sx={{ alignSelf: 'flex-start' }}>
                    <Tooltip title="Corrigir"><IconButton aria-label="Corrigir a observação" onClick={() => setPopup({ aberto: true, obs: o })}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Apagar"><IconButton aria-label="Apagar a observação" onClick={() => apagar(o)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </Stack>
                )}
              </Box>
            </Box>
          ))}
        </Paper>
      )}

      <PopupObservacao aberto={popup.aberto} obs={popup.obs} alunoId={alunoId} aoFechar={() => setPopup({ aberto: false, obs: null })}
        aoSalvar={(nova) => { setPopup({ aberto: false, obs: null }); avisar(nova ? 'Observação registrada.' : 'Observação corrigida.'); recarregar(); }} />
    </>
  );
}

function PopupObservacao({ aberto, obs, alunoId, aoFechar, aoSalvar }:
  { aberto: boolean; obs: Observacao | null; alunoId: string; aoFechar: () => void; aoSalvar: (nova: boolean) => void }) {
  const [data, setData] = useState(hojeISO());
  const [categoria, setCategoria] = useState('evolucao');
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [campo, setCampo] = useState<'' | 'data' | 'texto'>('');
  const [salvando, setSalvando] = useState(false);
  const refTexto = useRef<HTMLTextAreaElement>(null);
  const refData = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aberto) return;
    setData(obs?.data.slice(0, 10) || hojeISO()); setCategoria(obs?.categoria || 'evolucao'); setTexto(obs?.texto || ''); setErro(''); setCampo('');
  }, [aberto, obs]);

  const salvar = async () => {
    if (!data || data > hojeISO()) { setErro('A data não pode ser no futuro.'); setCampo('data'); refData.current?.focus(); return; }
    if (texto.trim().length < 3) { setErro('Escreva a observação.'); setCampo('texto'); refTexto.current?.focus(); return; }
    setSalvando(true); setErro(''); setCampo('');
    try {
      const corpo = { data, categoria, texto: texto.trim() };
      if (obs) await api(`/observacoes/${obs.id}`, { metodo: 'PUT', corpo });
      else await api(`/alunos/${alunoId}/observacoes`, { metodo: 'POST', corpo });
      aoSalvar(!obs);
    } catch (e) { setErro(mensagemDoErro(e)); } finally { setSalvando(false); }
  };

  return (
    <Popup aberto={aberto} titulo={obs ? 'Corrigir observação' : 'Nova observação'} aoFechar={aoFechar} aoSalvar={salvar}
      textoSalvar={obs ? 'Salvar' : 'Registrar'} salvando={salvando} erro={erro}>
      <Stack spacing={2.5}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} inputRef={refData} error={campo === 'data'}
            InputLabelProps={{ shrink: true }} inputProps={{ max: hojeISO() }} />
          <TextField select label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {Object.entries(CATEGORIAS_OBS).map(([v, r]) => <MenuItem key={v} value={v}>{r}</MenuItem>)}
          </TextField>
        </Box>
        <TextField label="Observação" multiline minRows={5} value={texto} onChange={(e) => setTexto(e.target.value)} inputRef={refTexto}
          error={campo === 'texto'} autoFocus inputProps={{ maxLength: 4000 }} helperText={`${texto.length}/4000`}
          placeholder="O que você observou? Ex.: leu a frase inteira sem ajuda pela primeira vez." />
      </Stack>
    </Popup>
  );
}
