// Acerto por habilidade: uma barra deitada por item (0 a 100%), na cor do semáforo, com o número escrito ao lado
// (a cor nunca é a única pista). A dica (mouse ou toque) mostra o detalhe de cada barra.
import { ReactNode } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { COR_DA_FAIXA, faixaDoAcerto, NOME_DA_FAIXA, porcento } from '../../lib/desempenho';

export interface ItemBarra { chave: string; rotulo: string; acerto: number | null; detalhe?: ReactNode }

export default function BarrasAcerto({ itens }: { itens: ItemBarra[] }) {
  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.25 }}>
      {itens.map((i) => {
        const faixa = faixaDoAcerto(i.acerto);
        return (
          <Tooltip key={i.chave} placement="top" enterTouchDelay={0}
            title={<><b>{i.rotulo}</b><br />{porcento(i.acerto)} de acerto · {NOME_DA_FAIXA[faixa]}{i.detalhe && <><br />{i.detalhe}</>}</>}>
            <Box component="li" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 52px', sm: 'minmax(140px, 220px) 1fr 52px' }, alignItems: 'center',
              columnGap: 1.5, rowGap: 0.5, py: 0.25, cursor: 'default' }}>
              <Typography variant="body2" noWrap title={i.rotulo} sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}>{i.rotulo}</Typography>
              <Box sx={{ height: 12, borderRadius: 99, bgcolor: 'action.hover', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${Math.max(i.acerto ?? 0, 2)}%`, bgcolor: COR_DA_FAIXA[faixa], borderRadius: 99 }} />
              </Box>
              <Typography variant="body2" fontWeight={800} textAlign="right">{porcento(i.acerto)}</Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

// a legenda do semáforo (vai uma vez embaixo dos gráficos de barras)
const LEGENDA = [['bom', 'Bom: 80% ou mais'], ['atencao', 'Atenção: 60 a 79%'], ['dificuldade', 'Dificuldade: abaixo de 60%']] as const;
export function LegendaSemaforo() {
  return (
    <Box sx={{ display: 'flex', columnGap: 2, rowGap: 0.5, flexWrap: 'wrap', mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
      {LEGENDA.map(([f, texto]) => (
        <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: 99, bgcolor: COR_DA_FAIXA[f] }} />
          <Typography variant="caption" color="text.secondary">{texto}</Typography>
        </Box>
      ))}
    </Box>
  );
}
