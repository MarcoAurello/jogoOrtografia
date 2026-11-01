// Uma configuração liga/desliga dentro de um popup: o título, e embaixo o que acontece agora (ligado ou desligado).
import { Box, FormControlLabel, Switch, Typography } from '@mui/material';

interface Props {
  titulo: string;
  ligado: boolean;
  aoMudar: (v: boolean) => void;
  textoLigado: string;
  textoDesligado: string;
  desabilitado?: boolean;
}

export default function ChaveConfig({ titulo, ligado, aoMudar, textoLigado, textoDesligado, desabilitado }: Props) {
  return (
    <Box sx={{ border: 1, borderColor: ligado ? 'divider' : 'warning.main', borderRadius: 2, p: 1.5, bgcolor: ligado ? undefined : 'rgba(237, 108, 2, 0.05)' }}>
      <FormControlLabel sx={{ m: 0, alignItems: 'flex-start' }} disabled={desabilitado}
        control={<Switch checked={ligado} onChange={(e) => aoMudar(e.target.checked)} sx={{ mt: -0.5 }} />}
        label={<Box>
          <Typography fontWeight={700}>{titulo}</Typography>
          <Typography variant="body2" color="text.secondary">{ligado ? textoLigado : textoDesligado}</Typography>
        </Box>} />
    </Box>
  );
}
