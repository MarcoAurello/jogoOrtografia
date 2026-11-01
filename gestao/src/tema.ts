// Tema do MUI com as cores da escola (a marca vem no usuário logado); sem escola, as cores padrão do app.
import { createTheme } from '@mui/material/styles';
import type { MarcaEscola } from './types';

const COR_PADRAO = '#1565c0';
const DESTAQUE_PADRAO = '#f7df1c';
const corValida = (c: string | undefined) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : '');

export function criarTema(escola: MarcaEscola | null) {
  return createTheme({
    palette: {
      primary: { main: corValida(escola?.cor) || COR_PADRAO },
      secondary: { main: corValida(escola?.destaque) || DESTAQUE_PADRAO },
      background: { default: '#f4f7fb' },
      text: { primary: '#13294b' },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: "'Nunito', system-ui, sans-serif",
      h1: { fontFamily: "'Fredoka', 'Nunito', sans-serif", fontWeight: 600 },
      h2: { fontFamily: "'Fredoka', 'Nunito', sans-serif", fontWeight: 600 },
      h3: { fontFamily: "'Fredoka', 'Nunito', sans-serif", fontWeight: 600 },
      h4: { fontFamily: "'Fredoka', 'Nunito', sans-serif", fontWeight: 600 },
      h5: { fontFamily: "'Fredoka', 'Nunito', sans-serif", fontWeight: 600 },
      h6: { fontFamily: "'Fredoka', 'Nunito', sans-serif", fontWeight: 600 },
      button: { fontFamily: "'Fredoka', 'Nunito', sans-serif", fontWeight: 600, textTransform: 'none', fontSize: '1rem' },
    },
    components: {
      // 16px nos campos: o iPhone não dá zoom ao tocar
      MuiInputBase: { styleOverrides: { input: { fontSize: 16 } } },
      // toques de 44px ou mais
      MuiButton: { styleOverrides: { root: { minHeight: 44 } } },
      MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
      MuiListItemButton: { styleOverrides: { root: { minHeight: 48, borderRadius: 10 } } },
    },
  });
}
