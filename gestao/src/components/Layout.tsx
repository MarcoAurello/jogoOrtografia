// Moldura das telas logadas: barra de cima (escola, usuário, entrar/sair da escola) e o menu do perfil.
// No PC o menu fica fixo à esquerda; no celular abre pelo botão ☰.
import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Alert, AppBar, Box, Button, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Menu, MenuItem, Toolbar, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { useAuth } from '../lib/auth';
import { itensDoPerfil, NOME_DO_PERFIL } from '../lib/menu';
import EntrarNaEscola from './EntrarNaEscola';
import TrocarSenha from '../paginas/login/TrocarSenha';

const LARGURA_MENU = 264;

export default function Layout() {
  const { usuario, sair, sairDaEscola } = useAuth();
  const tema = useTheme();
  const pc = useMediaQuery(tema.breakpoints.up('md'));
  const local = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const [menuUsuario, setMenuUsuario] = useState<HTMLElement | null>(null);
  const [escolhendoEscola, setEscolhendoEscola] = useState(false);
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [erroSairEscola, setErroSairEscola] = useState('');

  if (!usuario) return null;
  // o responsável tem a área dele (/familia), sem o menu da gestão
  if (usuario.perfil === 'responsavel') return <Navigate to="/familia" replace />;
  const adminNaEscola = !!usuario.adminNaEscola;
  const adminFora = usuario.perfil === 'admin';

  const sairDaEscolaAgora = async () => {
    setErroSairEscola('');
    try { await sairDaEscola(); } catch { setErroSairEscola('Não deu para sair da escola agora. Tente de novo.'); }
  };

  const menu = (
    <Box sx={{ p: 1 }}>
      <List>
        <ListItemButton component={NavLink} to="/" end onClick={() => setMenuAberto(false)} selected={local.pathname === '/'}>
          <ListItemIcon sx={{ minWidth: 36, fontSize: 20 }}>🏠</ListItemIcon>
          <ListItemText primary="Início" />
        </ListItemButton>
        {itensDoPerfil(usuario).map((i) => (
          <ListItemButton key={i.caminho} component={NavLink} to={i.caminho} onClick={() => setMenuAberto(false)}
            selected={local.pathname.startsWith(i.caminho)}>
            <ListItemIcon sx={{ minWidth: 36, fontSize: 20 }}>{i.icone}</ListItemIcon>
            <ListItemText primary={i.titulo} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ my: 1 }} />
      <List>
        <ListItemButton component="a" href={usuario.escola ? `/${usuario.escola.id}` : '/'}>
          <ListItemIcon sx={{ minWidth: 36, fontSize: 20 }}>🎮</ListItemIcon>
          <ListItemText primary="Ir para os jogos" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1, '@media print': { display: 'none' } }}>
        <Toolbar sx={{ gap: 1 }}>
          {!pc && <IconButton color="inherit" aria-label="Abrir o menu" edge="start" onClick={() => setMenuAberto(true)}><MenuIcon /></IconButton>}
          {usuario.escola?.logo && (
            <Box component="img" src={usuario.escola.logo} alt="" sx={{ height: 36, width: 36, objectFit: 'contain', borderRadius: 1, bgcolor: '#fff' }} />
          )}
          <Typography variant="h6" noWrap sx={{ flex: 1, minWidth: 0 }}>
            {usuario.escola?.nome || 'Gestão'}
          </Typography>
          {adminFora && (
            <Button color="inherit" variant="outlined" onClick={() => setEscolhendoEscola(true)}>
              {pc ? '🚪 Entrar numa escola' : '🚪 Escola'}
            </Button>
          )}
          <IconButton color="inherit" aria-label="Minha conta" onClick={(e) => setMenuUsuario(e.currentTarget)}><AccountCircle /></IconButton>
          <Menu anchorEl={menuUsuario} open={!!menuUsuario} onClose={() => setMenuUsuario(null)}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography fontWeight={800}>{usuario.nome}</Typography>
              <Typography variant="body2" color="text.secondary">
                {adminNaEscola ? 'Administrador (dentro da escola)' : NOME_DO_PERFIL[usuario.perfil]} · {usuario.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { setMenuUsuario(null); setTrocandoSenha(true); }}>🔑 Trocar senha</MenuItem>
            <MenuItem onClick={() => { setMenuUsuario(null); sair(); }}>🚪 Sair</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={pc ? 'permanent' : 'temporary'}
        open={pc || menuAberto}
        onClose={() => setMenuAberto(false)}
        sx={{ width: pc ? LARGURA_MENU : undefined, flexShrink: 0, '& .MuiDrawer-paper': { width: LARGURA_MENU, boxSizing: 'border-box' }, '@media print': { display: 'none' } }}
      >
        <Toolbar />
        {menu}
      </Drawer>

      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 }, '@media print': { p: 0 } }}>
        <Toolbar sx={{ '@media print': { display: 'none' } }} />
        {adminNaEscola && (
          <Alert severity="info" sx={{ mb: 2, alignItems: 'center', '@media print': { display: 'none' } }}
            action={<Button color="inherit" onClick={sairDaEscolaAgora}>Sair da escola</Button>}>
            Você está dentro de <b>{usuario.escola?.nome}</b> como coordenação.
          </Alert>
        )}
        {erroSairEscola && <Alert severity="error" sx={{ mb: 2 }}>{erroSairEscola}</Alert>}
        <Outlet />
      </Box>

      <EntrarNaEscola aberto={escolhendoEscola} aoFechar={() => setEscolhendoEscola(false)} />
      <TrocarSenha aberto={trocandoSenha || usuario.primeiro_login} obrigatoria={usuario.primeiro_login}
        aoFechar={() => setTrocandoSenha(false)} />
    </Box>
  );
}
