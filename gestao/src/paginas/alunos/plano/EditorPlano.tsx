// Editor do plano de objetivos, em página própria (é longo para um popup). Partes: o plano (ciclo, responsável,
// situação, foco), os objetivos (cada um com habilidades-alvo, jogos sugeridos por elas, recursos, indicador, prazo e
// dias) e família e escola (orientações e adequações). A barra de salvar fica presa embaixo.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, IconButton, MenuItem, Paper, Skeleton, Stack,
  TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Migalhas from '../../../components/Migalhas';
import Secao from '../../../components/Secao';
import { ErroLista } from '../../../components/EstadoLista';
import { useAvisos } from '../../../components/Avisos';
import { useConfirmar } from '../../../components/Confirmar';
import { api, mensagemDoErro } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { carregarHabilidades, NOME_DO_JOGO, nomeDoJogo } from '../../../lib/dadosDoApp';
import { ADEQUACOES, AREAS, DIAS, MAX_OBJETIVOS, objetivoVazio, STATUS_PLANO } from './plano';
import type { AlunoDaEscola, Objetivo, Plano, StatusPlano } from '../../../types';

interface Forma {
  ciclo: string; profissional_nome: string; status: StatusPlano; foco: string;
  objetivos: Objetivo[]; orientacoes_familia: string; adequacoes_escola: string[]; adequacoes_texto: string;
}
type Habs = Awaited<ReturnType<typeof carregarHabilidades>>;

export default function EditorPlano() {
  const { id = '', planoId = 'novo' } = useParams();
  const novo = planoId === 'novo';
  const navegar = useNavigate();
  const { usuario } = useAuth();
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const [aluno, setAluno] = useState<AlunoDaEscola | null>(null);
  const [pode, setPode] = useState(true);
  const [forma, setForma] = useState<Forma | null>(null);
  const inicial = useRef('');
  const [habs, setHabs] = useState<Habs | null>(null);
  const [erroCarregar, setErroCarregar] = useState('');
  const [erro, setErro] = useState('');
  const [destaque, setDestaque] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [novaAdequacao, setNovaAdequacao] = useState('');

  useEffect(() => {
    carregarHabilidades().then(setHabs).catch(() => setHabs(null));
    Promise.all([
      api<{ aluno: AlunoDaEscola; pode_editar: boolean }>(`/alunos/${id}`),
      api<{ pode_editar: boolean; planos: Plano[] }>(`/alunos/${id}/planos`),
    ]).then(([a, r]) => {
      setAluno(a.aluno);
      setPode(r.pode_editar);
      const p = r.planos.find((x) => x.id === planoId);
      if (!novo && !p) { setErroCarregar('Plano não encontrado.'); return; }
      const f: Forma = {
        ciclo: p?.ciclo || '', profissional_nome: p?.profissional_nome || usuario?.nome || '', status: p?.status || 'elaboracao', foco: p?.foco || '',
        objetivos: p?.objetivos.length ? p.objetivos.map((o) => ({ ...objetivoVazio(), ...o })) : [objetivoVazio()],
        orientacoes_familia: p?.orientacoes_familia || '', adequacoes_escola: p?.adequacoes_escola || [], adequacoes_texto: p?.adequacoes_texto || '',
      };
      inicial.current = JSON.stringify(f);
      setForma(f);
    }).catch((e) => setErroCarregar(mensagemDoErro(e)));
  }, [id, planoId, novo, usuario?.nome]);

  const mudou = !!forma && JSON.stringify(forma) !== inicial.current;
  // aviso do navegador ao fechar a aba com o plano sem salvar
  useEffect(() => {
    if (!mudou) return;
    const avisarSaida = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisarSaida);
    return () => window.removeEventListener('beforeunload', avisarSaida);
  }, [mudou]);

  const opcoesHab = useMemo(() => (habs ? habs.GRUPOS_HAB.flatMap((g) => Object.entries(g.itens).map(([v, nome]) => ({ v, nome, grupo: g.nome }))) : []), [habs]);

  if (erroCarregar) return <ErroLista mensagem={erroCarregar} aoTentar={() => navegar(0)} />;
  if (!forma || !aluno) return <><Skeleton height={60} width="50%" /><Skeleton variant="rounded" height={400} /></>;

  const set = <K extends keyof Forma>(k: K, v: Forma[K]) => setForma((f) => (f ? { ...f, [k]: v } : f));
  const setObj = (i: number, mud: Partial<Objetivo>) => setForma((f) => (f ? { ...f, objetivos: f.objetivos.map((o, k) => (k === i ? { ...o, ...mud } : o)) } : f));
  const mover = (i: number, d: -1 | 1) => setForma((f) => {
    if (!f) return f;
    const lista = [...f.objetivos];
    [lista[i], lista[i + d]] = [lista[i + d], lista[i]];
    return { ...f, objetivos: lista };
  });
  const tirar = async (i: number) => {
    const o = forma.objetivos[i];
    if (o.descricao.trim() && !(await confirmar({ titulo: `Tirar o objetivo ${i + 1}?`, botao: 'Tirar', perigo: true, texto: o.descricao }))) return;
    setForma((f) => (f ? { ...f, objetivos: f.objetivos.filter((_, k) => k !== i) } : f));
  };
  const sugerir = (i: number) => {
    const o = forma.objetivos[i];
    if (!habs || !o.habilidades.length) { avisar('Escolha primeiro as habilidades-alvo do objetivo.', 'info'); return; }
    const novos = habs.jogosParaHabilidades(o.habilidades).filter((j) => !o.jogos.includes(j) && NOME_DO_JOGO[j]).slice(0, 5);
    setObj(i, { jogos: [...o.jogos, ...novos] });
    avisar(novos.length ? `${novos.length} jogo(s) sugerido(s) adicionado(s). Tire o que não quiser.` : 'Os jogos sugeridos já estão no objetivo.', 'info');
  };

  const voltar = async () => {
    if (mudou && !(await confirmar({ titulo: 'Sair sem salvar?', botao: 'Sair sem salvar', perigo: true, texto: 'As mudanças neste plano vão se perder.' }))) return;
    navegar(`/aluno/${id}?aba=plano`);
  };

  const salvar = async () => {
    setErro(''); setDestaque(null);
    const preenchidos = forma.objetivos.filter((o) => o.descricao.trim() || o.area.trim());
    const semDescricao = forma.objetivos.findIndex((o) => o.area.trim() && !o.descricao.trim());
    if (semDescricao >= 0) {
      setErro(`Objetivo ${semDescricao + 1}: escreva a descrição do objetivo.`);
      setDestaque(semDescricao);
      document.getElementById(`objetivo-${semDescricao}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (forma.status !== 'elaboracao' && !preenchidos.length) { setErro('Para ativar o plano, escreva pelo menos um objetivo.'); return; }
    setSalvando(true);
    try {
      const corpo = { ...forma, objetivos: preenchidos };
      if (novo) await api(`/alunos/${id}/planos`, { metodo: 'POST', corpo });
      else await api(`/planos/${planoId}`, { metodo: 'PUT', corpo });
      inicial.current = JSON.stringify(forma);
      avisar(forma.status === 'ativo' ? 'Plano salvo e ativo (o ativo anterior, se havia, foi concluído).' : 'Plano salvo.');
      navegar(`/aluno/${id}?aba=plano`);
    } catch (e) { setErro(mensagemDoErro(e)); } finally { setSalvando(false); }
  };

  // a adequação escrita entra na lista já marcada
  const incluirAdequacao = () => {
    const v = novaAdequacao.trim();
    if (v && !forma.adequacoes_escola.includes(v)) set('adequacoes_escola', [...forma.adequacoes_escola, v]);
    setNovaAdequacao('');
  };

  const soLer = !pode;
  const todasAdequacoes = [...ADEQUACOES, ...forma.adequacoes_escola.filter((a) => !ADEQUACOES.includes(a))];

  return (
    <Box sx={{ pb: 12 }}>
      <Migalhas itens={[{ texto: 'Alunos', para: '/anamnese' }, { texto: aluno.nome, para: `/aluno/${id}?aba=plano` }, { texto: novo ? 'Novo plano' : 'Plano' }]} />
      <Typography variant="h4" component="h1">{novo ? 'Novo plano de objetivos' : forma.ciclo || 'Plano de objetivos'}</Typography>
      <Typography color="text.secondary" sx={{ mb: 2.5 }}>{aluno.nome_completo || aluno.nome}{soLer && ' · só leitura (o aluno não é das suas turmas)'}</Typography>

      <Stack spacing={2.5}>
        <Secao titulo="O plano">
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 220px' } }}>
            <TextField label="Ciclo / período" value={forma.ciclo} onChange={(e) => set('ciclo', e.target.value)} disabled={soLer}
              placeholder="Ex.: 1º semestre de 2026" inputProps={{ maxLength: 80 }} autoFocus={novo} />
            <TextField label="Profissional responsável" value={forma.profissional_nome} onChange={(e) => set('profissional_nome', e.target.value)} disabled={soLer} inputProps={{ maxLength: 120 }} />
            <TextField select label="Situação" value={forma.status} onChange={(e) => set('status', e.target.value as StatusPlano)} disabled={soLer}
              helperText={forma.status === 'ativo' ? 'Só um plano fica ativo por aluno.' : ' '}>
              {Object.entries(STATUS_PLANO).map(([v, s]) => <MenuItem key={v} value={v}>{s.rotulo}</MenuItem>)}
            </TextField>
          </Box>
          <TextField fullWidth multiline minRows={2} label="Foco do plano" value={forma.foco} onChange={(e) => set('foco', e.target.value)} disabled={soLer}
            sx={{ mt: 2 }} inputProps={{ maxLength: 2000 }} placeholder="Em poucas palavras, o que este plano quer alcançar." />
        </Secao>

        <Secao titulo={`Objetivos (${forma.objetivos.length})`} subtitulo="Para cada objetivo, as habilidades-alvo sugerem os jogos que as trabalham.">
          <Stack spacing={2}>
            {forma.objetivos.map((o, i) => (
              <Paper key={o.id || `novo-${i}`} id={`objetivo-${i}`} variant="outlined"
                sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2.5, borderColor: destaque === i ? 'error.main' : 'divider', borderWidth: destaque === i ? 2 : 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Typography fontWeight={800} sx={{ flex: 1 }}>Objetivo {i + 1}</Typography>
                  {!soLer && (
                    <>
                      <Tooltip title="Subir"><span><IconButton aria-label="Subir o objetivo" disabled={i === 0} onClick={() => mover(i, -1)}><ArrowUpwardIcon fontSize="small" /></IconButton></span></Tooltip>
                      <Tooltip title="Descer"><span><IconButton aria-label="Descer o objetivo" disabled={i === forma.objetivos.length - 1} onClick={() => mover(i, 1)}><ArrowDownwardIcon fontSize="small" /></IconButton></span></Tooltip>
                      <Tooltip title="Tirar"><IconButton aria-label="Tirar o objetivo" onClick={() => tirar(i)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </>
                  )}
                </Box>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '280px 1fr' } }}>
                  <Autocomplete freeSolo options={AREAS} value={o.area} disabled={soLer} onInputChange={(_, v) => setObj(i, { area: v.slice(0, 80) })}
                    renderInput={(p) => <TextField {...p} label="Área de desenvolvimento" placeholder="Escolha ou escreva" />} />
                  <TextField label="Descrição do objetivo" required multiline minRows={2} value={o.descricao} disabled={soLer}
                    onChange={(e) => { setObj(i, { descricao: e.target.value }); if (destaque === i) setDestaque(null); }} error={destaque === i}
                    placeholder="Ex.: Ler palavras com sílabas complexas com 80% de acerto" inputProps={{ maxLength: 2000 }} />
                  <Autocomplete multiple options={opcoesHab} groupBy={(x) => x.grupo} getOptionLabel={(x) => x.nome} disabled={soLer || !habs}
                    value={opcoesHab.filter((x) => o.habilidades.includes(x.v))} onChange={(_, v) => setObj(i, { habilidades: v.map((x) => x.v) })}
                    isOptionEqualToValue={(a, b) => a.v === b.v} sx={{ gridColumn: { md: '1 / -1' } }}
                    renderTags={(v, getProps) => v.map((x, k) => <Chip size="small" label={x.nome} {...getProps({ index: k })} key={x.v} />)}
                    renderInput={(p) => <TextField {...p} label="Habilidades-alvo" helperText="O que este objetivo quer desenvolver (o painel mede a evolução nelas)." />} />
                  <Box sx={{ gridColumn: { md: '1 / -1' }, display: 'flex', gap: 1, alignItems: 'flex-start', flexDirection: { xs: 'column', sm: 'row' } }}>
                    <JogosDoObjetivo objetivo={o} habs={habs} soLer={soLer} aoMudar={(jogos) => setObj(i, { jogos })} />
                    {!soLer && <Button startIcon={<AutoAwesomeIcon />} onClick={() => sugerir(i)} sx={{ flexShrink: 0, mt: { sm: 0.5 } }}>Sugerir jogos</Button>}
                  </Box>
                  <TextField label="Outras estratégias e recursos" multiline minRows={2} value={o.recursos} disabled={soLer}
                    onChange={(e) => setObj(i, { recursos: e.target.value })} placeholder="Materiais táteis, atividades fora da tela…" inputProps={{ maxLength: 1000 }} />
                  <TextField label="Indicador de sucesso" multiline minRows={2} value={o.indicador} disabled={soLer}
                    onChange={(e) => setObj(i, { indicador: e.target.value })} placeholder="Como você vai medir se foi alcançado?" inputProps={{ maxLength: 1000 }} />
                  <TextField label="Prazo / frequência" value={o.prazo} disabled={soLer} onChange={(e) => setObj(i, { prazo: e.target.value })}
                    placeholder="Ex.: 8 semanas, 2x por semana" inputProps={{ maxLength: 80 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Dias da semana</Typography>
                    <ToggleButtonGroup value={o.dias} onChange={(_, d) => setObj(i, { dias: d })} disabled={soLer} aria-label="Dias da semana"
                      sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', '& .MuiToggleButton-root': { minHeight: 44, px: 0, textTransform: 'none', fontWeight: 700 } }}>
                      {DIAS.map(([v, r]) => <ToggleButton key={v} value={v}>{r}</ToggleButton>)}
                    </ToggleButtonGroup>
                  </Box>
                </Box>
              </Paper>
            ))}
            {!soLer && forma.objetivos.length < MAX_OBJETIVOS && (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => set('objetivos', [...forma.objetivos, objetivoVazio()])} sx={{ alignSelf: 'flex-start' }}>
                Adicionar objetivo
              </Button>
            )}
          </Stack>
        </Secao>

        <Secao titulo="Família e escola">
          <TextField fullWidth multiline minRows={3} label="Orientações para a família" value={forma.orientacoes_familia} disabled={soLer}
            onChange={(e) => set('orientacoes_familia', e.target.value)} inputProps={{ maxLength: 4000 }} placeholder="O que a família pode fazer em casa." />
          <Typography fontWeight={800} sx={{ mt: 2.5 }}>Adequações na escola</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, mb: 1 }}>
            {todasAdequacoes.map((a) => (
              <FormControlLabel key={a} label={a} disabled={soLer} sx={{ minHeight: 44 }} control={<Checkbox checked={forma.adequacoes_escola.includes(a)}
                onChange={() => set('adequacoes_escola', forma.adequacoes_escola.includes(a) ? forma.adequacoes_escola.filter((x) => x !== a) : [...forma.adequacoes_escola, a])} />} />
            ))}
          </Box>
          {!soLer && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField size="small" fullWidth label="Outra adequação" value={novaAdequacao} onChange={(e) => setNovaAdequacao(e.target.value)} inputProps={{ maxLength: 120 }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); incluirAdequacao(); } }} />
              <Button variant="outlined" disabled={!novaAdequacao.trim()} onClick={incluirAdequacao}>Incluir</Button>
            </Box>
          )}
          <TextField fullWidth multiline minRows={2} label="Outras adequações (texto)" value={forma.adequacoes_texto} disabled={soLer}
            onChange={(e) => set('adequacoes_texto', e.target.value)} inputProps={{ maxLength: 4000 }} />
        </Secao>
      </Stack>

      {/* barra presa embaixo: salvar sempre à mão, com o erro logo acima dos botões */}
      <Paper elevation={8} sx={{ position: 'fixed', left: { xs: 0, md: 264 }, right: 0, bottom: 0, zIndex: (t) => t.zIndex.appBar, px: { xs: 2, md: 3 }, py: 1.5,
        pb: 'calc(12px + env(safe-area-inset-bottom))', borderRadius: 0, '@media print': { display: 'none' } }}>
        {erro && <Alert severity="error" role="alert" sx={{ mb: 1 }}>{erro}</Alert>}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          {mudou && <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>Mudanças não salvas</Typography>}
          <Button onClick={voltar} disabled={salvando}>{soLer ? 'Voltar' : 'Cancelar'}</Button>
          {!soLer && (
            <Button variant="contained" size="large" onClick={salvar} disabled={salvando} startIcon={salvando ? <CircularProgress size={18} color="inherit" /> : undefined}>
              Salvar plano
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

// os jogos do objetivo: os que trabalham as habilidades-alvo aparecem primeiro, no grupo "Sugeridos"
function JogosDoObjetivo({ objetivo, habs, soLer, aoMudar }: { objetivo: Objetivo; habs: Habs | null; soLer: boolean; aoMudar: (j: string[]) => void }) {
  const sugeridos = useMemo(() => new Set(habs && objetivo.habilidades.length ? habs.jogosParaHabilidades(objetivo.habilidades) : []), [habs, objetivo.habilidades]);
  const opcoes = useMemo(() => Object.keys(NOME_DO_JOGO).sort((a, b) => Number(sugeridos.has(b)) - Number(sugeridos.has(a)) || nomeDoJogo(a).localeCompare(nomeDoJogo(b))),
    [sugeridos]);
  return (
    <Autocomplete multiple fullWidth options={opcoes} value={objetivo.jogos} onChange={(_, v) => aoMudar(v)} disabled={soLer}
      getOptionLabel={nomeDoJogo} groupBy={(j) => (sugeridos.has(j) ? '⭐ Sugeridos pelas habilidades-alvo' : 'Outros jogos')}
      renderTags={(v, getProps) => v.map((j, k) => <Chip size="small" label={nomeDoJogo(j)} {...getProps({ index: k })} key={j} />)}
      renderInput={(p) => <TextField {...p} label="Jogos do sistema" />} />
  );
}
