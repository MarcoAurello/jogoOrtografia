// Nova turma / editar turma. O professor só dá o nome (fica ligado a ela); a coordenação também escolhe os
// professores (uma turma pode ter vários) numa lista com busca e caixas de marcar.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import Popup from '../../components/Popup';
import ChaveConfig from '../../components/ChaveConfig';
import { api, mensagemDoErro } from '../../lib/api';
import { contem } from '../../lib/texto';
import type { Turma, UsuarioCadastro } from '../../types';

interface Props {
  aberto: boolean;
  turma: Turma | null;        // null = nova
  coordena: boolean;
  aoFechar: () => void;
  aoSalvar: (t: Turma, nova: boolean) => void;
}

export default function PopupTurma({ aberto, turma, coordena, aoFechar, aoSalvar }: Props) {
  const [nome, setNome] = useState('');
  const [salvarPartidas, setSalvarPartidas] = useState(true);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [professores, setProfessores] = useState<UsuarioCadastro[] | null>(null);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [erroNome, setErroNome] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const refNome = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aberto) return;
    setNome(turma?.nome || '');
    setSalvarPartidas(turma ? turma.salvar_partidas !== false : true);
    setMarcados(new Set(turma?.professores.map((p) => p.id) || []));
    setBusca('');
    setErro('');
    setErroNome(false);
    if (coordena) {
      api<UsuarioCadastro[]>('/usuarios')
        .then((us) => setProfessores(us.filter((u) => u.perfil === 'professor' && (u.ativo || turma?.professores.some((p) => p.id === u.id)))))
        .catch((e) => { setProfessores([]); setErro(mensagemDoErro(e)); });
    }
  }, [aberto, turma, coordena]);

  const visiveis = useMemo(() => (professores || []).filter((p) => !busca || contem(`${p.nome} ${p.email}`, busca)), [professores, busca]);
  const marcar = (id: string) => setMarcados((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const salvar = async () => {
    if (!nome.trim()) { setErro('Digite o nome da turma (ex.: 3º ano B).'); setErroNome(true); refNome.current?.focus(); return; }
    setSalvando(true);
    setErro('');
    setErroNome(false);
    const corpo = { nome: nome.trim(), ...(coordena ? { professores: [...marcados], salvar_partidas: salvarPartidas } : {}) };
    try {
      const salva = turma
        ? await api<Turma>(`/turmas/${turma.id}`, { metodo: 'PUT', corpo })
        : await api<Turma>('/turmas', { metodo: 'POST', corpo });
      aoSalvar(salva, !turma);
    } catch (e) { setErro(mensagemDoErro(e)); } finally { setSalvando(false); }
  };

  return (
    <Popup aberto={aberto} titulo={turma ? `Editar ${turma.nome}` : 'Nova turma'} aoFechar={aoFechar} aoSalvar={salvar}
      textoSalvar={turma ? 'Salvar' : 'Criar turma'} salvando={salvando} erro={erro}>
      <Stack spacing={2.5}>
        <TextField label="Nome da turma" required value={nome} onChange={(e) => setNome(e.target.value)} inputRef={refNome}
          error={erroNome} autoFocus placeholder="Ex.: 3º ano B · Manhã" inputProps={{ maxLength: 80 }}
          helperText={turma ? undefined : 'Ao criar, a turma ganha um código: os alunos entram com ele.'} />
        {coordena && (
          <Box>
            <Typography fontWeight={800}>Professores da turma</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Eles veem a turma, os alunos e o painel. {marcados.size ? `${marcados.size} marcado(s).` : ''}
            </Typography>
            {professores && professores.length > 6 && (
              <TextField fullWidth size="small" type="search" label="Buscar professor" value={busca} onChange={(e) => setBusca(e.target.value)} sx={{ mb: 1 }} />
            )}
            {professores && professores.length === 0 && <Alert severity="info">Nenhum professor cadastrado. Cadastre em Usuários.</Alert>}
            <Box sx={{ maxHeight: 280, overflowY: 'auto', border: professores?.length ? 1 : 0, borderColor: 'divider', borderRadius: 2 }}>
              {visiveis.map((p) => (
                <FormControlLabel key={p.id} sx={{ display: 'flex', m: 0, px: 1, minHeight: 48, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}
                  control={<Checkbox checked={marcados.has(p.id)} onChange={() => marcar(p.id)} />}
                  label={<Box><Typography>{p.nome}{!p.ativo && ' (desativado)'}</Typography><Typography variant="body2" color="text.secondary">{p.email}</Typography></Box>} />
              ))}
            </Box>
            {professores && professores.length > 0 && !marcados.size && (
              <Alert severity="warning" sx={{ mt: 1 }}>Sem professor marcado, só a coordenação vê esta turma.</Alert>
            )}
          </Box>
        )}
        {/* a turma nova sempre começa guardando; a chave aparece ao editar */}
        {coordena && turma && (
          <ChaveConfig titulo="Guardar as partidas desta turma" ligado={salvarPartidas} aoMudar={setSalvarPartidas}
            textoLigado="As partidas dos alunos que entram com o código ficam no painel da turma e na ficha de cada aluno."
            textoDesligado="Desligado: as partidas desta turma não são guardadas (o painel e as fichas não recebem dados novos). O ranking das competições continua." />
        )}
      </Stack>
    </Popup>
  );
}
