// Título da tela + a ação principal ("＋ Nova escola"). No celular a ação vira um botão redondo preso embaixo à
// direita (fica ao alcance do polegar e não some ao rolar a lista).
import { ReactNode } from 'react';
import { Box, Button, Fab, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';

interface Props {
  titulo: string;
  subtitulo?: ReactNode;
  textoNovo?: string;          // ex.: "Nova escola" (o "＋" vem do ícone)
  aoNovo?: () => void;
  extras?: ReactNode;          // ações secundárias (ex.: Importar da planilha)
}

export default function CabecalhoPagina({ titulo, subtitulo, textoNovo, aoNovo, extras }: Props) {
  const tema = useTheme();
  const celular = useMediaQuery(tema.breakpoints.down('sm'));

  return (
    <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Typography variant="h4" component="h1">{titulo}</Typography>
        {subtitulo && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{subtitulo}</Typography>}
      </Box>
      {extras}
      {aoNovo && textoNovo && (celular ? (
        <Fab color="primary" variant="extended" onClick={aoNovo}
          sx={{ position: 'fixed', right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom))', zIndex: (t) => t.zIndex.speedDial }}>
          <AddIcon sx={{ mr: 0.5 }} /> {textoNovo}
        </Fab>
      ) : (
        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={aoNovo}>{textoNovo}</Button>
      ))}
    </Box>
  );
}
