// Criar / editar escola: endereço, nome, slogan, cores, logo e a planilha própria. Ao lado (no PC) ou em cima
// (no celular), a prévia da barra do app com a marca escolhida.
import { useEffect, useRef, useState } from 'react';
import { Box, Button, Collapse, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import Popup from '../../components/Popup';
import ChaveConfig from '../../components/ChaveConfig';
import { api, mensagemDoErro } from '../../lib/api';
import { linkDaEscola, reduzirLogo, slugValido, sugerirSlug } from './escola';
import type { Escola } from '../../types';

type Campo = 'slug' | 'nome' | 'script' | '';

interface Props {
  aberto: boolean;
  escola: Escola | null;            // null = nova
  aoFechar: () => void;
  aoSalvar: (escola: Escola, nova: boolean) => void;
}

const COR = '#1fa2b0';
const DESTAQUE = '#f9c62b';

export default function PopupEscola({ aberto, escola, aoFechar, aoSalvar }: Props) {
  const [slug, setSlug] = useState('');
  const [slugMexido, setSlugMexido] = useState(false);
  const [nome, setNome] = useState('');
  const [slogan, setSlogan] = useState('');
  const [cor, setCor] = useState(COR);
  const [destaque, setDestaque] = useState(DESTAQUE);
  const [logo, setLogo] = useState('');
  const [script, setScript] = useState('');
  const [enviarRelatorios, setEnviarRelatorios] = useState(true);
  const [salvarPartidas, setSalvarPartidas] = useState(true);
  const [verPlanilha, setVerPlanilha] = useState(false);
  const [erro, setErro] = useState('');
  const [campoComErro, setCampoComErro] = useState<Campo>('');
  const [salvando, setSalvando] = useState(false);
  const refs = { slug: useRef<HTMLInputElement>(null), nome: useRef<HTMLInputElement>(null), script: useRef<HTMLInputElement>(null) };
  const refArquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aberto) return;
    setSlug(escola?.slug || '');
    setSlugMexido(!!escola);
    setNome(escola?.nome || '');
    setSlogan(escola?.slogan || '');
    setCor(escola?.cor || COR);
    setDestaque(escola?.destaque || DESTAQUE);
    setLogo(escola?.logo || '');
    setScript(escola?.script || '');
    setEnviarRelatorios(escola ? escola.enviar_relatorios !== false : true);
    setSalvarPartidas(escola ? escola.salvar_partidas !== false : true);
    setVerPlanilha(!!escola?.script);
    setErro('');
    setCampoComErro('');
  }, [aberto, escola]);

  // na escola nova, o endereço acompanha o nome até a pessoa mexer nele
  const mudarNome = (v: string) => { setNome(v); if (!slugMexido) setSlug(sugerirSlug(v)); };

  const falhar = (campo: Campo, mensagem: string) => {
    setErro(mensagem);
    setCampoComErro(campo);
    if (campo === 'script') setVerPlanilha(true);
    if (campo) setTimeout(() => refs[campo].current?.focus(), 50);
  };

  const escolherLogo = async (arquivo?: File) => {
    if (!arquivo) return;
    try { setLogo(await reduzirLogo(arquivo)); } catch (e) { falhar('', mensagemDoErro(e)); }
  };

  const salvar = async () => {
    if (!nome.trim()) return falhar('nome', 'Digite o nome da escola.');
    if (!escola && !slugValido(slug)) return falhar('slug', 'Endereço inválido: use de 3 a 40 letras, números ou hífen, sem espaço (ex.: colegioNovo).');
    setSalvando(true);
    setErro('');
    setCampoComErro('');
    const dados = { nome: nome.trim(), slogan: slogan.trim(), cor, destaque, logo, script: script.trim(), enviar_relatorios: enviarRelatorios, salvar_partidas: salvarPartidas };
    try {
      const salva = escola
        ? await api<Escola>(`/escolas/${escola.id}`, { metodo: 'PUT', corpo: dados })
        : await api<Escola>('/escolas', { metodo: 'POST', corpo: { ...dados, slug } });
      aoSalvar(salva, !escola);
    } catch (e) {
      const m = mensagemDoErro(e);
      falhar(/endereço|escola com o endereço/i.test(m) ? 'slug' : /planilha|Apps Script/i.test(m) ? 'script' : /nome/i.test(m) ? 'nome' : '', m);
    } finally {
      setSalvando(false);
    }
  };

  const previa = (
    <Box aria-label="Prévia da barra do app" sx={{ borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
      <Box sx={{ bgcolor: cor, color: '#fff', p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box component="img" src={logo || '/assets/logo-pg-168.png'} alt=""
          sx={{ width: 44, height: 44, objectFit: 'contain', bgcolor: '#fff', borderRadius: 1.5, p: 0.25 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={800} noWrap>{nome.trim() || 'Nome da escola'}</Typography>
          <Typography variant="body2" noWrap sx={{ opacity: 0.9 }}>{slogan.trim() || 'Jogos com relatórios de desempenho'}</Typography>
        </Box>
      </Box>
      <Box sx={{ p: 1.5, bgcolor: '#fff' }}>
        <Box sx={{ bgcolor: destaque, borderRadius: 5, py: 1, textAlign: 'center', fontWeight: 800, color: '#13294b' }}>🎮 Jogar</Box>
      </Box>
    </Box>
  );

  return (
    <Popup aberto={aberto} titulo={escola ? `Editar ${escola.nome}` : 'Nova escola'} aoFechar={aoFechar} aoSalvar={salvar}
      textoSalvar={escola ? 'Salvar alterações' : 'Criar escola'} salvando={salvando} erro={erro} largo>
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 260px' } }}>
        <Stack spacing={2.5} sx={{ order: { xs: 2, md: 1 } }}>
          <TextField label="Nome da escola" required value={nome} onChange={(e) => mudarNome(e.target.value)}
            inputRef={refs.nome} error={campoComErro === 'nome'} autoFocus={!!escola} inputProps={{ maxLength: 120 }} />
          <TextField label="Endereço" required value={slug} disabled={!!escola}
            onChange={(e) => { setSlug(e.target.value.replace(/\s/g, '')); setSlugMexido(true); }}
            inputRef={refs.slug} error={campoComErro === 'slug'} autoFocus={!escola} inputProps={{ maxLength: 40 }}
            InputProps={{ startAdornment: <InputAdornment position="start">{location.host}/</InputAdornment> }}
            helperText={escola ? 'O endereço não muda: os links já foram mandados para as famílias.' : `Link da escola: ${linkDaEscola(slug || 'colegioNovo')}`} />
          <TextField label="Slogan (opcional)" value={slogan} onChange={(e) => setSlogan(e.target.value)} inputProps={{ maxLength: 160 }}
            placeholder="Jogos com relatórios de desempenho" />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="Cor principal" type="color" value={cor} onChange={(e) => setCor(e.target.value)} sx={{ '& input': { height: 32, p: 1, cursor: 'pointer' } }} />
            <TextField label="Cor de destaque" type="color" value={destaque} onChange={(e) => setDestaque(e.target.value)} sx={{ '& input': { height: 32, p: 1, cursor: 'pointer' } }} />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Logo (PNG ou JPG; o app reduz para 240 px)</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button variant="outlined" onClick={() => refArquivo.current?.click()}>{logo ? 'Trocar logo' : 'Escolher logo'}</Button>
              {logo && <Button color="error" onClick={() => setLogo('')}>Tirar logo</Button>}
              <input ref={refArquivo} type="file" accept="image/*" hidden onChange={(e) => { escolherLogo(e.target.files?.[0]); e.target.value = ''; }} />
            </Stack>
          </Box>
          {/* o administrador decide, por escola, o que o sistema faz com cada partida dos alunos */}
          <Box>
            <Typography fontWeight={800} sx={{ mb: 1 }}>Configurações</Typography>
            <Stack spacing={1}>
              <ChaveConfig titulo="Guardar as partidas dos alunos" ligado={salvarPartidas} aoMudar={setSalvarPartidas}
                textoLigado="As partidas de quem entra com o código da turma ficam no banco: painel da turma e ficha do aluno. A coordenação ainda pode desligar por turma ou por aluno."
                textoDesligado="Desligado: nenhuma partida desta escola é guardada (painel e ficha ficam sem dados novos). O ranking das competições continua." />
              <ChaveConfig titulo="Enviar o relatório dos jogos por e-mail" ligado={enviarRelatorios} aoMudar={setEnviarRelatorios}
                textoLigado="No fim de cada partida, o professor escolhido recebe o relatório (PDF) por e-mail."
                textoDesligado="Desligado: nenhum relatório vai por e-mail." />
            </Stack>
          </Box>
          <Box>
            {!verPlanilha && <Button onClick={() => setVerPlanilha(true)}>＋ Usar uma planilha própria (opcional)</Button>}
            <Collapse in={verPlanilha}>
              <TextField fullWidth label="Planilha própria (link /exec do Apps Script)" value={script} onChange={(e) => setScript(e.target.value)}
                inputRef={refs.script} error={campoComErro === 'script'} placeholder="https://script.google.com/macros/s/…/exec"
                helperText="Vazio = a escola usa a planilha principal da plataforma." />
            </Collapse>
          </Box>
        </Stack>
        <Box sx={{ order: { xs: 1, md: 2 } }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Como fica no app</Typography>
          {previa}
          {!escola && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>A escola nova começa com 14 dias de teste grátis.</Typography>}
        </Box>
      </Box>
    </Popup>
  );
}
