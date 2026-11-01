// O administrador escolhe uma escola para "entrar" e trabalhar como a coordenação dela.
import { useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import Popup from './Popup';
import CampoBusca from './CampoBusca';
import { api, mensagemDoErro } from '../lib/api';
import { useAuth } from '../lib/auth';
import { contem } from '../lib/texto';
import type { Escola } from '../types';

export default function EntrarNaEscola({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { entrarNaEscola } = useAuth();
  const [escolas, setEscolas] = useState<Escola[] | null>(null);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState('');

  useEffect(() => {
    if (!aberto) return;
    setErro('');
    setBusca('');
    api<Escola[]>('/escolas').then(setEscolas).catch((e) => setErro(mensagemDoErro(e)));
  }, [aberto]);

  const visiveis = useMemo(
    () => (escolas || []).filter((e) => !busca || contem(`${e.nome} ${e.slug}`, busca)),
    [escolas, busca],
  );

  const entrar = async (escola: Escola) => {
    setEntrando(escola.id);
    setErro('');
    try { await entrarNaEscola(escola.id); aoFechar(); } catch (e) { setErro(mensagemDoErro(e)); } finally { setEntrando(''); }
  };

  return (
    <Popup aberto={aberto} titulo="Entrar numa escola" aoFechar={aoFechar} erro={erro}>
      <Typography sx={{ mb: 2 }} color="text.secondary">
        Dentro da escola você trabalha como a coordenação dela (turmas, professores, alunos…). Só nesta aba.
      </Typography>
      <CampoBusca valor={busca} aoMudar={setBusca} rotulo="Buscar escola" autoFocus />
      {!escolas && !erro && <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>}
      {escolas && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Mostrando {visiveis.length} de {escolas.length}</Typography>
          <List>
            {visiveis.map((e) => (
              <ListItemButton key={e.id} onClick={() => entrar(e)} disabled={!!entrando}>
                <ListItemText
                  primary={e.nome}
                  secondary={`/${e.slug} · ${e.usuarios} usuário(s)${e.bloqueada ? ' · bloqueada' : ''}`}
                />
                {entrando === e.id && <CircularProgress size={20} />}
              </ListItemButton>
            ))}
          </List>
          {visiveis.length === 0 && <Typography sx={{ py: 2 }}>Nenhuma escola encontrada.</Typography>}
        </>
      )}
    </Popup>
  );
}
