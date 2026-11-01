// Busca + filtros em select + "Mostrando X de Y" e "Limpar filtros". No PC fica tudo numa linha; no celular, um embaixo
// do outro (nada de chips com rolagem lateral).
import { ReactNode } from 'react';
import { Box, Button, Typography } from '@mui/material';
import CampoBusca from './CampoBusca';

interface Props {
  busca: string;
  aoBuscar: (v: string) => void;
  rotuloBusca: string;
  filtros?: ReactNode;          // os FiltroSelect
  qtdFiltros?: number;          // quantos selects (para dividir a linha no PC)
  mostrando: number;
  total: number;
  nomeItens: [string, string];  // ['escola', 'escolas']
  filtrando: boolean;
  aoLimpar: () => void;
  acoes?: ReactNode;            // ex.: "Copiar e-mails" (vale para o que está na lista)
}

export default function BarraFiltros({ busca, aoBuscar, rotuloBusca, filtros, qtdFiltros = 0, mostrando, total, nomeItens, filtrando, aoLimpar, acoes }: Props) {
  const nome = (n: number) => (n === 1 ? nomeItens[0] : nomeItens[1]);
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: `2fr ${'1fr '.repeat(qtdFiltros)}`.trim() } }}>
        <CampoBusca valor={busca} aoMudar={aoBuscar} rotulo={rotuloBusca} />
        {filtros}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, minHeight: 44, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" aria-live="polite" sx={{ flex: 1 }}>
          {filtrando ? `Mostrando ${mostrando} de ${total} ${nome(total)}` : `${total} ${nome(total)}`}
        </Typography>
        {acoes}
        {filtrando && <Button onClick={aoLimpar}>Limpar filtros</Button>}
      </Box>
    </Box>
  );
}
