// E-mails que recebem os relatórios: no fim de cada jogo, o aluno escolhe o professor desta lista e o relatório vai
// para o e-mail dele. Todos acrescentam; só a coordenação tira (e vê os e-mails — o professor vê só os nomes).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Avatar, Box, Divider, IconButton, Paper, Skeleton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CabecalhoPagina from '../../components/CabecalhoPagina';
import BarraFiltros from '../../components/BarraFiltros';
import Popup from '../../components/Popup';
import { ErroLista, ListaVazia } from '../../components/EstadoLista';
import { useAvisos } from '../../components/Avisos';
import { useConfirmar } from '../../components/Confirmar';
import { mensagemDoErro } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { gravar, lerDados } from '../../lib/dadosEscola';
import { contem } from '../../lib/texto';
import { iniciais } from '../../lib/formato';

interface Destinatario { nome: string; email: string }

export default function Emails() {
  const { usuario } = useAuth();
  const coordena = usuario?.perfil === 'coordenacao';
  const escola = usuario?.escola?.id || '';
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const [lista, setLista] = useState<Destinatario[] | null>(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [novo, setNovo] = useState(false);

  const carregar = useCallback(async () => {
    setErro('');
    try { setLista((await lerDados<{ emails: Destinatario[] }>('emails', escola)).emails); } catch (e) { setErro(mensagemDoErro(e)); }
  }, [escola]);
  useEffect(() => { carregar(); }, [carregar]);

  const visiveis = useMemo(() => (lista || []).filter((d) => !busca || contem(`${d.nome} ${coordena ? d.email : ''}`, busca)), [lista, busca, coordena]);

  const tirar = async (d: Destinatario) => {
    const ok = await confirmar({ titulo: `Tirar ${d.nome} da lista?`, botao: 'Tirar da lista', perigo: true,
      texto: 'Os alunos não vão mais poder escolher esta pessoa para receber o relatório. Dá para acrescentar de novo depois.' });
    if (!ok) return;
    try { setLista((await gravar<{ emails: Destinatario[] }>('removerEmail', { email: d.email })).emails); avisar(`${d.nome} saiu da lista.`); }
    catch (e) { avisar(mensagemDoErro(e), 'error'); }
  };

  return (
    <>
      <CabecalhoPagina titulo="E-mails dos relatórios"
        subtitulo="No fim de cada jogo, o aluno escolhe um professor desta lista e o relatório da partida vai para o e-mail dele."
        textoNovo="Novo e-mail" aoNovo={() => setNovo(true)} />
      {usuario?.escola?.enviar_relatorios === false && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          O envio do relatório por e-mail está <b>desligado</b> nesta escola (configuração do administrador). A lista fica guardada para quando ele ligar.
        </Alert>
      )}

      {!lista && !erro && <Skeleton variant="rounded" height={240} />}
      {erro && <ErroLista mensagem={erro} aoTentar={carregar} />}
      {lista && lista.length === 0 && (
        <ListaVazia icone="✉️" titulo="Nenhum e-mail na lista" texto="Acrescente o e-mail de quem recebe os relatórios dos alunos." />
      )}
      {lista && lista.length > 0 && (
        <>
          <BarraFiltros busca={busca} aoBuscar={setBusca} rotuloBusca={coordena ? 'Buscar por nome ou e-mail' : 'Buscar por nome'}
            mostrando={visiveis.length} total={lista.length} nomeItens={['pessoa', 'pessoas']} filtrando={!!busca} aoLimpar={() => setBusca('')} />
          <Paper variant="outlined" sx={{ borderRadius: 3, mb: { xs: 10, sm: 2 } }}>
            {visiveis.map((d, i) => (
              <Box key={d.email}>
                {i > 0 && <Divider />}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.25 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 800 }}>{iniciais(d.nome)}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700}>{d.nome}</Typography>
                    {coordena && <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>{d.email}</Typography>}
                  </Box>
                  {coordena && <Tooltip title="Tirar da lista"><IconButton aria-label={`Tirar ${d.nome} da lista`} onClick={() => tirar(d)}><DeleteIcon /></IconButton></Tooltip>}
                </Box>
              </Box>
            ))}
          </Paper>
          {!coordena && <Typography variant="body2" color="text.secondary">Por privacidade, os e-mails dos colegas não aparecem. Para tirar alguém da lista, fale com a coordenação.</Typography>}
        </>
      )}

      <PopupEmail aberto={novo} aoFechar={() => setNovo(false)}
        aoSalvar={(emails) => { setNovo(false); setLista(emails); avisar('E-mail acrescentado. Os alunos já podem escolher.'); }} />
    </>
  );
}

function PopupEmail({ aberto, aoFechar, aoSalvar }: { aberto: boolean; aoFechar: () => void; aoSalvar: (e: Destinatario[]) => void }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [campo, setCampo] = useState<'' | 'nome' | 'email'>('');
  const [salvando, setSalvando] = useState(false);
  const refNome = useRef<HTMLInputElement>(null);
  const refEmail = useRef<HTMLInputElement>(null);

  useEffect(() => { if (aberto) { setNome(''); setEmail(''); setErro(''); setCampo(''); } }, [aberto]);

  const salvar = async () => {
    if (!nome.trim()) { setErro('Digite o nome que os alunos vão ver.'); setCampo('nome'); refNome.current?.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) { setErro('Digite um e-mail válido, como nome@escola.com.'); setCampo('email'); refEmail.current?.focus(); return; }
    setSalvando(true); setErro(''); setCampo('');
    try { aoSalvar((await gravar<{ emails: Destinatario[] }>('adicionarEmail', { nome: nome.trim(), email: email.trim() })).emails); }
    catch (e) { setErro(mensagemDoErro(e)); setCampo('email'); refEmail.current?.focus(); }
    finally { setSalvando(false); }
  };

  return (
    <Popup aberto={aberto} titulo="Novo e-mail" aoFechar={aoFechar} aoSalvar={salvar} textoSalvar="Acrescentar" salvando={salvando} erro={erro}>
      <Stack spacing={2.5}>
        <TextField label="Nome que os alunos veem" required value={nome} onChange={(e) => setNome(e.target.value)} inputRef={refNome}
          error={campo === 'nome'} autoFocus inputProps={{ maxLength: 60 }} placeholder="Ex.: Prof.ª Marta" />
        <TextField label="E-mail" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} inputRef={refEmail}
          error={campo === 'email'} inputProps={{ maxLength: 120 }} helperText="Recebe o relatório (PDF) das partidas dos alunos que escolherem esta pessoa." />
      </Stack>
    </Popup>
  );
}
