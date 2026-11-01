// O % de acerto com a cor do semáforo e um ícone (a cor nunca vai sozinha: o número e o ícone dizem o mesmo).
import { Box, Tooltip } from '@mui/material';
import { COR_DA_FAIXA, faixaDoAcerto, NOME_DA_FAIXA, porcento } from '../lib/desempenho';

const ICONE = { bom: '●', atencao: '▲', dificuldade: '▼', sem: '–' };

export default function PilulaAcerto({ acerto, grande }: { acerto: number | null; grande?: boolean }) {
  const faixa = faixaDoAcerto(acerto);
  return (
    <Tooltip title={`Acerto ${NOME_DA_FAIXA[faixa]}`}>
      <Box component="span" sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.5, px: grande ? 1.5 : 1, py: grande ? 0.5 : 0.25, borderRadius: 99,
        border: 1.5, borderColor: COR_DA_FAIXA[faixa], color: 'text.primary', fontWeight: 800, fontSize: grande ? 18 : 14, whiteSpace: 'nowrap',
      }}>
        <Box component="span" aria-hidden sx={{ color: COR_DA_FAIXA[faixa], fontSize: grande ? 14 : 11 }}>{ICONE[faixa]}</Box>
        {porcento(acerto)}
      </Box>
    </Tooltip>
  );
}
