// Cadastrar alunos na turma: um nome por linha (dá para colar a coluna de uma planilha). O contador mostra quantos
// nomes já tem e avisa os repetidos antes de mandar.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import Popup from '../../components/Popup';
import { api, mensagemDoErro } from '../../lib/api';
import { normalizar } from '../../lib/texto';
import { plural } from '../../lib/formato';

const MAXIMO = 100;

interface Props {
  aberto: boolean;
  turma: { id: string; nome: string };
  jaNaTurma: string[];
  aoFechar: () => void;
  aoSalvar: (criados: number, repetidos: string[]) => void;
}

export default function PopupAlunos({ aberto, turma, jaNaTurma, aoFechar, aoSalvar }: Props) {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (aberto) { setTexto(''); setErro(''); } }, [aberto]);

  const nomes = useMemo(() => texto.split('\n').map((n) => n.replace(/\s+/g, ' ').trim()).filter((n) => n.length >= 2), [texto]);
  const existentes = useMemo(() => new Set(jaNaTurma.map(normalizar)), [jaNaTurma]);
  const repetidos = nomes.filter((n) => existentes.has(normalizar(n)));

  const salvar = async () => {
    if (!nomes.length) { setErro('Digite pelo menos um nome (um por linha).'); ref.current?.focus(); return; }
    if (nomes.length > MAXIMO) { setErro(`Cadastre até ${MAXIMO} alunos por vez.`); ref.current?.focus(); return; }
    setSalvando(true);
    setErro('');
    try {
      const r = await api<{ criados: unknown[]; repetidos: string[] }>(`/turmas/${turma.id}/alunos`, { metodo: 'POST', corpo: { nomes } });
      aoSalvar(r.criados.length, r.repetidos);
    } catch (e) { setErro(mensagemDoErro(e)); } finally { setSalvando(false); }
  };

  return (
    <Popup aberto={aberto} titulo={`Cadastrar alunos · ${turma.nome}`} aoFechar={aoFechar} aoSalvar={salvar}
      textoSalvar={nomes.length ? `Cadastrar ${plural(nomes.length, 'aluno', 'alunos')}` : 'Cadastrar'} salvando={salvando} erro={erro}>
      <Stack spacing={2}>
        <Typography color="text.secondary">
          Um nome por linha, do jeito que o aluno vai procurar na hora de entrar (ex.: <b>Ana Clara</b>). Dá para colar a lista inteira de uma planilha.
        </Typography>
        <TextField multiline minRows={8} maxRows={16} label="Nomes dos alunos" value={texto} onChange={(e) => setTexto(e.target.value)}
          inputRef={ref} autoFocus error={!!erro && !nomes.length} placeholder={'Ana Clara\nBruno\nDavi Lucas'}
          helperText={nomes.length ? `${plural(nomes.length, 'nome', 'nomes')} na lista.` : ' '} />
        {repetidos.length > 0 && (
          <Alert severity="info">Já estão na turma e serão pulados: {repetidos.join(', ')}.</Alert>
        )}
        <Typography variant="body2" color="text.secondary">
          Não precisa cadastrar todos: o aluno que digitar um nome novo ao entrar com o código entra na lista sozinho.
        </Typography>
      </Stack>
    </Popup>
  );
}
