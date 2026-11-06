// Moldura da área da família: só a barra de cima (sem o menu da gestão), pensada para o celular.
// No menu da conta: o nome e o e-mail, alterar a senha e sair.
import { useState } from 'react';
import { Link as LinkRouter, Outlet } from 'react-router-dom';
import { AppBar, Box, Divider, IconButton, Menu, MenuItem, Toolbar, Typography } from '@mui/material';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { useAuth } from '../../../lib/auth';
import TrocarSenha from '../../login/TrocarSenha';

export default function LayoutFamilia() {
  const { usuario, sair } = useAuth();
  const [menuConta, setMenuConta] = useState<HTMLElement | null>(null);
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  if (!usuario) return null;

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar position="sticky">
        <Toolbar sx={{ gap: 1 }}>
          <Box component={LinkRouter} to="/familia" sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0, color: 'inherit', textDecoration: 'none' }}>
            <Box component="img" src="/assets/logo-pg-168.png" alt="" sx={{ height: 36, width: 36, objectFit: 'contain', borderRadius: 1, bgcolor: '#fff' }} />
            <Typography variant="h6" noWrap>Minha família</Typography>
          </Box>
          <IconButton color="inherit" aria-label="Minha conta" onClick={(e) => setMenuConta(e.currentTarget)} sx={{ width: 48, height: 48 }}>
            <AccountCircle fontSize="large" />
          </IconButton>
          <Menu anchorEl={menuConta} open={!!menuConta} onClose={() => setMenuConta(null)}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography fontWeight={800}>{usuario.nome}</Typography>
              <Typography variant="body2" color="text.secondary">{usuario.email}</Typography>
            </Box>
            <Divider />
            <MenuItem sx={{ minHeight: 48 }} onClick={() => { setMenuConta(null); setTrocandoSenha(true); }}>🔑 Alterar a minha senha</MenuItem>
            <MenuItem sx={{ minHeight: 48 }} onClick={() => { setMenuConta(null); sair(); }}>🚪 Sair</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ maxWidth: 760, mx: 'auto', p: 2, pb: 6 }}>
        <Outlet />
      </Box>

      <TrocarSenha aberto={trocandoSenha || usuario.primeiro_login} obrigatoria={usuario.primeiro_login}
        aoFechar={() => setTrocandoSenha(false)} />
    </Box>
  );
}
