// Os números grandes do topo do painel e da ficha (o que se quer saber primeiro, sem precisar de gráfico).
import { ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';

export interface Numero { valor: ReactNode; rotulo: string; detalhe?: ReactNode }

export default function Numeros({ itens }: { itens: Numero[] }) {
  return (
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: `repeat(${itens.length}, 1fr)` } }}>
      {itens.map((n) => (
        <Paper key={n.rotulo} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary">{n.rotulo}</Typography>
          <Typography component="p" sx={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: { xs: 28, sm: 34 }, lineHeight: 1.2 }}>
            {n.valor}
          </Typography>
          {n.detalhe && <Typography variant="body2" color="text.secondary">{n.detalhe}</Typography>}
        </Paper>
      ))}
    </Box>
  );
}
