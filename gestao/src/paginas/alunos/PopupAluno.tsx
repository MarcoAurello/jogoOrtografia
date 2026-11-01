// Aluno novo ou editar o cadastro: o nome (como aparece na turma), as turmas e, se quiser, os dados da família.
// O professor liga o aluno a pelo menos uma turma dele; a coordenação pode deixar sem turma; o administrador fora de
// escola escolhe a escola.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Checkbox, Collapse, Button, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import Popup from '../../components/Popup';
import ChaveConfig from '../../components/ChaveConfig';
import { api, mensagemDoErro } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { AlunoDaEscola, Escola, Turma } from '../../types';

type Campo = 'nome' | 'turmas' | 'escola' | 'nascimento' | '';

interface Props {
  aberto: boolean;
  aluno: AlunoDaEscola | null;     // null = novo
  aoFechar: () => void;
  aoSalvar: (id: string, novo: boolean) => void;
}

export default function PopupAluno({ aberto, aluno, aoFechar, aoSalvar }: Props) {
  const { usuario } = useAuth();
  const professor = usuario?.perfil === 'professor';
  const adminFora = usuario?.perfil === 'admin';
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [nome, setNome] = useState('');
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [escolaId, setEscolaId] = useState('');
  const [verMais, setVerMais] = useState(false);
  const [salvarPartidas, setSalvarPartidas] = useState(true);
  const [dados, setDados] = useState({ nome_completo: '', data_nascimento: '', responsavel_nome: '', responsavel_contato: '', observacoes: '' });
  const [erro, setErro] = useState('');
  const [campoComErro, setCampoComErro] = useState<Campo>('');
  const [salvando, setSalvando] = useState(false);
  const refs = { nome: useRef<HTMLInputElement>(null), turmas: useRef<HTMLDivElement>(null), escola: useRef<HTMLInputElement>(null), nascimento: useRef<HTMLInputElement>(null) };

  useEffect(() => {
    if (!aberto) return;
    setNome(aluno?.nome || '');
    setMarcadas(new Set(aluno?.turmas.map((t) => t.id) || []));
    setEscolaId(aluno?.escola_id || '');
    const texto = typeof aluno?.observacoes === 'string' ? aluno.observacoes : '';
    setDados({ nome_completo: aluno?.nome_completo || '', data_nascimento: aluno?.data_nascimento?.slice(0, 10) || '',
      responsavel_nome: aluno?.responsavel_nome || '', responsavel_contato: aluno?.responsavel_contato || '', observacoes: texto });
    setVerMais(!!(aluno?.nome_completo || aluno?.data_nascimento || aluno?.responsavel_nome));
    setSalvarPartidas(aluno ? aluno.salvar_partidas !== false : true);
    setErro('');
    setCampoComErro('');
    api<Turma[]>('/turmas').then((ts) => setTurmas(ts.filter((t) => t.ativa || aluno?.turmas.some((x) => x.id === t.id)))).catch(() => setTurmas([]));
    if (adminFora && !aluno) api<Escola[]>('/escolas').then(setEscolas).catch(() => setEscolas([]));
  }, [aberto, aluno, adminFora]);

  // o administrador vê as turmas de todas as escolas: mostra só as da escola escolhida
  const turmasVisiveis = useMemo(() => (adminFora && !aluno ? turmas.filter((t) => t.escola_id === escolaId) : turmas), [turmas, adminFora, aluno, escolaId]);
  const marcar = (id: string) => setMarcadas((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const mudar = (campo: keyof typeof dados) => (e: React.ChangeEvent<HTMLInputElement>) => setDados((d) => ({ ...d, [campo]: e.target.value }));

  const falhar = (campo: Campo, mensagem: string) => {
    setErro(mensagem);
    setCampoComErro(campo);
    if (campo === 'nascimento') setVerMais(true);
    setTimeout(() => (campo === 'turmas' ? refs.turmas.current?.scrollIntoView({ block: 'center' }) : campo && (refs[campo].current as HTMLInputElement | null)?.focus()), 60);
  };

  const salvar = async () => {
    if (nome.trim().length < 2) return falhar('nome', 'Digite o nome do aluno (como ele aparece na turma, ex.: Ana S.).');
    if (adminFora && !aluno && !escolaId) return falhar('escola', 'Escolha a escola do aluno.');
    if (professor && !marcadas.size) return falhar('turmas', 'Escolha pelo menos uma das suas turmas para o aluno.');
    if (dados.data_nascimento && new Date(dados.data_nascimento) > new Date()) return falhar('nascimento', 'A data de nascimento não pode ser no futuro.');
    setSalvando(true);
    setErro('');
    setCampoComErro('');
    try {
      if (aluno) {
        await api(`/alunos/${aluno.id}`, { metodo: 'PUT', corpo: { nome: nome.trim(), turmas: [...marcadas], cadastro: dados,
          ...(professor ? {} : { salvar_partidas: salvarPartidas }) } });
        aoSalvar(aluno.id, false);
      } else {
        const r = await api<{ id: string }>('/alunos', { metodo: 'POST', corpo: { nome: nome.trim(), turmas: [...marcadas], escola_id: escolaId || undefined, ...dados } });
        aoSalvar(r.id, true);
      }
    } catch (e) {
      const m = mensagemDoErro(e);
      falhar(/nome/i.test(m) ? 'nome' : /turma/i.test(m) ? 'turmas' : /escola/i.test(m) ? 'escola' : '', m);
    } finally { setSalvando(false); }
  };

  return (
    <Popup aberto={aberto} titulo={aluno ? `Editar ${aluno.nome}` : 'Novo aluno'} aoFechar={aoFechar} aoSalvar={salvar}
      textoSalvar={aluno ? 'Salvar' : 'Cadastrar aluno'} salvando={salvando} erro={erro}>
      <Stack spacing={2.5}>
        {adminFora && !aluno && (
          <TextField select label="Escola" required value={escolaId} onChange={(e) => { setEscolaId(e.target.value); setMarcadas(new Set()); }}
            inputRef={refs.escola} error={campoComErro === 'escola'}>
            {escolas.map((e) => <MenuItem key={e.id} value={e.id}>{e.nome}</MenuItem>)}
          </TextField>
        )}
        <TextField label="Nome na turma" required value={nome} onChange={(e) => setNome(e.target.value)} inputRef={refs.nome}
          error={campoComErro === 'nome'} autoFocus inputProps={{ maxLength: 40 }}
          helperText="Do jeito que o aluno procura na hora de entrar (ex.: Ana S.)." />

        <Box ref={refs.turmas}>
          <Typography fontWeight={800}>Turmas{professor && ' *'}</Typography>
          <Typography variant="body2" color={campoComErro === 'turmas' ? 'error' : 'text.secondary'} sx={{ mb: 0.5 }}>
            {professor ? 'Escolha pelo menos uma das suas turmas.' : 'Pode ficar sem turma (ex.: atendimento individual).'}
          </Typography>
          {turmasVisiveis.length === 0 ? (
            <Typography variant="body2" color="text.secondary">{adminFora && !escolaId ? 'Escolha a escola primeiro.' : 'Nenhuma turma.'}</Typography>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, border: 1, borderColor: campoComErro === 'turmas' ? 'error.main' : 'divider', borderRadius: 2, px: 1 }}>
              {turmasVisiveis.map((t) => (
                <FormControlLabel key={t.id} sx={{ minHeight: 44, m: 0 }} control={<Checkbox checked={marcadas.has(t.id)} onChange={() => marcar(t.id)} />}
                  label={`${t.nome}${t.ativa ? '' : ' (encerrada)'}`} />
              ))}
            </Box>
          )}
        </Box>

        {!verMais && <Button onClick={() => setVerMais(true)} sx={{ alignSelf: 'flex-start' }}>＋ Dados do aluno e da família (opcional)</Button>}
        <Collapse in={verMais}>
          <Stack spacing={2.5}>
            <TextField label="Nome completo" value={dados.nome_completo} onChange={mudar('nome_completo')} inputProps={{ maxLength: 120 }} />
            <TextField label="Data de nascimento" type="date" value={dados.data_nascimento} onChange={mudar('data_nascimento')}
              inputRef={refs.nascimento} error={campoComErro === 'nascimento'} InputLabelProps={{ shrink: true }} />
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <TextField label="Responsável" value={dados.responsavel_nome} onChange={mudar('responsavel_nome')} inputProps={{ maxLength: 120 }} />
              <TextField label="Contato do responsável" value={dados.responsavel_contato} onChange={mudar('responsavel_contato')}
                placeholder="Telefone ou e-mail" inputProps={{ maxLength: 120 }} />
            </Box>
            <TextField label="Observações do cadastro" multiline minRows={2} value={dados.observacoes} onChange={mudar('observacoes')} inputProps={{ maxLength: 2000 }} />
          </Stack>
        </Collapse>
        {/* só a coordenação muda (e só num aluno que já existe: o novo sempre começa guardando) */}
        {aluno && !professor && (
          <ChaveConfig titulo="Guardar as partidas deste aluno" ligado={salvarPartidas} aoMudar={setSalvarPartidas}
            textoLigado="As partidas que ele joga entrando com o código da turma ficam na ficha e no painel."
            textoDesligado="Desligado: as partidas deste aluno não são guardadas (a ficha e o painel não recebem dados novos dele). O ranking das competições continua." />
        )}
      </Stack>
    </Popup>
  );
}
