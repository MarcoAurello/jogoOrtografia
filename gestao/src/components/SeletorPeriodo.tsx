// Período do painel e da ficha: 7 dias, 30 dias, 90 dias ou 12 meses (botões juntos, um escolhido).
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { PERIODOS } from '../lib/desempenho';

export default function SeletorPeriodo({ dias, aoMudar }: { dias: number; aoMudar: (d: number) => void }) {
  return (
    <ToggleButtonGroup exclusive size="small" value={dias} onChange={(_, d) => d && aoMudar(d)} aria-label="Período"
      sx={{ bgcolor: 'background.paper', flex: { xs: 1, sm: 'none' },
        '& .MuiToggleButton-root': { minHeight: 44, px: { xs: 1, sm: 1.75 }, flex: { xs: 1, sm: 'none' }, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' } }}>
      {PERIODOS.map((p) => <ToggleButton key={p.dias} value={p.dias}>{p.rotulo}</ToggleButton>)}
    </ToggleButtonGroup>
  );
}
