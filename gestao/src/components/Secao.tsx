// Bloco de conteúdo com título: organiza as telas de leitura (painel, ficha) em partes que se reconhecem de longe.
import { ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface Props {
  titulo: string;
  subtitulo?: ReactNode;
  acao?: ReactNode;
  children: ReactNode;
  semPadding?: boolean;   // tabelas e listas que encostam na borda
}

export default function Secao({ titulo, subtitulo, acao, children, semPadding }: Props) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', breakInside: 'avoid' }}>
      <Box sx={{ px: 2.5, pt: 2, pb: semPadding ? 1.5 : 0, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="h2">{titulo}</Typography>
          {subtitulo && <Typography variant="body2" color="text.secondary">{subtitulo}</Typography>}
        </Box>
        {acao}
      </Box>
      <Box sx={semPadding ? {} : { p: 2.5, pt: 1.5 }}>{children}</Box>
    </Paper>
  );
}
