// Depois de cadastrar (ou dar uma senha nova): mostra o e-mail e a senha provisória para passar à pessoa, com o botão
// de copiar a mensagem pronta. A senha só aparece aqui (a API não devolve).
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Popup from '../../components/Popup';
import { useAvisos } from '../../components/Avisos';
import { copiar } from '../../lib/formato';
import { textoDeAcesso } from './senha';

export interface Acesso { titulo: string; nome: string; email: string; senha: string }

export default function DadosDeAcesso({ acesso, aoFechar }: { acesso: Acesso | null; aoFechar: () => void }) {
  const avisar = useAvisos();
  const copiarTudo = async () => {
    if (acesso && (await copiar(textoDeAcesso(acesso.nome, acesso.email, acesso.senha)))) avisar('Mensagem copiada. Cole no WhatsApp ou no e-mail.');
  };

  return (
    <Popup aberto={!!acesso} titulo={acesso?.titulo || ''} aoFechar={aoFechar}>
      {acesso && (
        <Stack spacing={2}>
          <Typography>Passe estes dados para <b>{acesso.nome}</b>:</Typography>
          <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, columnGap: 2 }}>
            <Typography color="text.secondary">Endereço</Typography><Typography sx={{ wordBreak: 'break-all' }}>{location.origin}/gestao/</Typography>
            <Typography color="text.secondary">E-mail</Typography><Typography sx={{ wordBreak: 'break-all' }}>{acesso.email}</Typography>
            <Typography color="text.secondary">Senha</Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: 20, letterSpacing: 1 }}>{acesso.senha}</Typography>
          </Box>
          <Button variant="contained" size="large" startIcon={<ContentCopyIcon />} onClick={copiarTudo}>Copiar mensagem pronta</Button>
          <Alert severity="info">No primeiro acesso, a pessoa cria a própria senha. Esta senha provisória não aparece de novo.</Alert>
        </Stack>
      )}
    </Popup>
  );
}
