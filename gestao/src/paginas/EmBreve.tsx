// Áreas que ainda não vieram para a gestão nova: continuam na Área do professor antiga, dentro do app dos jogos
// (/?area=professor abre direto nela; o login e a escola em que o admin entrou são os mesmos).
import { Button, Paper, Typography } from '@mui/material';

export default function EmBreve({ titulo }: { titulo: string }) {
  return (
    <>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>{titulo}</Typography>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 560 }}>
        <Typography sx={{ mb: 2 }}>
          Esta tela ainda está sendo trazida para a gestão nova. Por enquanto, ela fica na <b>Área do professor antiga</b>,
          com o mesmo login.
        </Typography>
        <Button variant="contained" href="/?area=professor">Abrir na Área do professor antiga</Button>
      </Paper>
    </>
  );
}
