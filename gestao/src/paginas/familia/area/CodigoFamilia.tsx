// O código da família (FAM-XXXXX): no aparelho do filho, "🏠 Jogar em casa" pede o código uma vez e guarda; daí a
// criança só toca no nome e digita o PIN, sem a conta do responsável. "Gerar outro" faz o antigo parar de valer e os
// aparelhos que entraram com ele pedirem o código novo (a API derruba os logins feitos com o código antigo).
import { useState } from 'react';
import { Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useAvisos } from '../../../components/Avisos';
import { useConfirmar } from '../../../components/Confirmar';
import { api, mensagemDoErro } from '../../../lib/api';
import { copiar } from '../../../lib/formato';
import { useCarregar } from '../../../lib/useCarregar';

export default function CodigoFamilia() {
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const { dados, erro, recarregar } = useCarregar<{ codigo: string }>('/familia/codigo');
  const [gerando, setGerando] = useState(false);
  const codigo = dados?.codigo || '';
  const site = window.location.origin;
  const mensagem = `Para jogar em casa: abra ${site}, toque em "Jogar em casa" e digite o código da família ${codigo}. Depois é só tocar no nome e digitar o PIN.`;

  const gerarOutro = async () => {
    if (!(await confirmar({ titulo: 'Gerar outro código?', botao: 'Gerar outro', perigo: true,
      texto: 'O código atual para de valer: os aparelhos que entraram com ele vão pedir o código novo.' }))) return;
    setGerando(true);
    try { await api('/familia/codigo/novo', { metodo: 'POST' }); avisar('Código novo gerado ✔'); recarregar(); }
    catch (e) { avisar(mensagemDoErro(e), 'error'); } finally { setGerando(false); }
  };

  if (erro) return null;   // sem o código, a área continua (o "Jogar" pela conta funciona igual)
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="h6" component="h2">📱 Jogar no aparelho do seu filho</Typography>
          <Typography variant="body2" color="text.secondary">
            No celular ou tablet dele, abra os jogos, toque em <b>Jogar em casa</b> e digite este código (só na primeira vez).
            Depois ele só toca no nome e digita o PIN.
          </Typography>
        </Box>
        {!codigo ? <Skeleton variant="rounded" height={56} /> : (
          <Typography component="p" aria-label="Código da família"
            sx={{ fontFamily: 'monospace', fontSize: 32, fontWeight: 800, letterSpacing: 4, textAlign: 'center', py: 1, bgcolor: 'action.hover', borderRadius: 2 }}>
            {codigo}
          </Typography>
        )}
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' } }}>
          <Button variant="contained" startIcon={<ContentCopyIcon />} disabled={!codigo} sx={{ minHeight: 44 }}
            onClick={async () => { if (await copiar(codigo)) avisar('Código copiado.'); }}>Copiar</Button>
          <Button variant="outlined" startIcon={<WhatsAppIcon />} disabled={!codigo} component="a" target="_blank" rel="noopener" sx={{ minHeight: 44 }}
            href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}>WhatsApp</Button>
          <Button color="error" onClick={gerarOutro} disabled={!codigo || gerando} sx={{ minHeight: 44, gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
            Gerar outro código
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
