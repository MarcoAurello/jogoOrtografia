// Entrar na gestão (administrador, coordenação e professor) e na área da família (responsável): e-mail e senha.
// O responsável cai direto em /familia (o Layout da gestão manda para lá).
// Vindo da página de uma escola (Área do professor em /colegioAurora → /gestao/login?escola=colegioAurora), o login
// já aparece com o logo, o nome e as cores dela.
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, IconButton, InputAdornment, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { api, mensagemDoErro } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { criarTema } from '../../tema';
import type { MarcaEscola } from '../../types';

export default function Login() {
  const { usuario, entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const [parametros] = useSearchParams();
  const slug = parametros.get('escola') || '';
  const [marca, setMarca] = useState<MarcaEscola | null>(null);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [campoComErro, setCampoComErro] = useState<'' | 'email' | 'senha'>('');
  const [entrando, setEntrando] = useState(false);
  const refEmail = useRef<HTMLInputElement>(null);
  const refSenha = useRef<HTMLInputElement>(null);
  const tema = useMemo(() => criarTema(marca), [marca]);

  useEffect(() => {
    if (!slug) return;
    api<MarcaEscola>(`/escolas/${encodeURIComponent(slug)}/marca`).then(setMarca).catch(() => setMarca(null));
  }, [slug]);

  const destino = (local.state as { de?: string } | null)?.de || '/';
  if (usuario) return <Navigate to={destino} replace />;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setErro('Digite o seu e-mail.'); setCampoComErro('email'); refEmail.current?.focus(); return; }
    if (!senha) { setErro('Digite a sua senha.'); setCampoComErro('senha'); refSenha.current?.focus(); return; }
    setEntrando(true);
    setErro('');
    setCampoComErro('');
    try {
      await entrar(email.trim(), senha);
      navegar(destino, { replace: true });
    } catch (e) {
      setErro(mensagemDoErro(e));
      setCampoComErro('senha');
      refSenha.current?.select();
    } finally {
      setEntrando(false);
    }
  };

  return (
    <ThemeProvider theme={tema}>
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2,
        background: (t) => `linear-gradient(160deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)` }}>
        <Paper component="form" onSubmit={enviar} noValidate elevation={6} sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 420, borderRadius: 4 }}>
          <Stack spacing={2.5}>
            <Box sx={{ textAlign: 'center' }}>
              <Box component="img" src={marca?.logo || '/assets/logo-pg-168.png'} alt=""
                sx={{ width: 84, height: 84, objectFit: 'contain', mb: 1 }} />
              <Typography variant="h4" component="h1" color="primary">{marca?.nome || 'Games Pedagógicos'}</Typography>
              <Typography color="text.secondary">Entre com o seu e-mail e senha</Typography>
            </Box>
            <TextField label="E-mail" type="email" autoComplete="username" value={email} autoFocus inputMode="email"
              onChange={(e) => setEmail(e.target.value)} inputRef={refEmail} error={campoComErro === 'email'} />
            <TextField label="Senha" type={verSenha ? 'text' : 'password'} autoComplete="current-password" value={senha}
              onChange={(e) => setSenha(e.target.value)} inputRef={refSenha} error={campoComErro === 'senha'}
              InputProps={{ endAdornment: (
                <InputAdornment position="end">
                  <IconButton aria-label={verSenha ? 'Esconder a senha' : 'Mostrar a senha'} onClick={() => setVerSenha((v) => !v)} edge="end">
                    {verSenha ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ) }} />
            {erro && <Alert severity="error" role="alert">{erro}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={entrando}
              startIcon={entrando ? <CircularProgress size={18} color="inherit" /> : undefined}>
              {entrando ? 'Entrando…' : 'Entrar'}
            </Button>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Esqueceu a senha? Peça uma senha nova à coordenação da sua escola.
            </Typography>
            <Link href={slug ? `/${slug}` : '/'} textAlign="center" underline="hover">← Voltar para os jogos</Link>
          </Stack>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}
