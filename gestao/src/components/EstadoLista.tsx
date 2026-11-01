// O que aparece no lugar da lista: carregando (cartões cinza), erro (com "Tentar de novo"), vazia ou filtro sem resultado.
import { ReactNode } from 'react';
import { Alert, Box, Button, Paper, Skeleton, Typography } from '@mui/material';

export function GradeCartoes({ children }: { children: ReactNode }) {
  return <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, pb: { xs: 10, sm: 2 } }}>{children}</Box>;
}

export function CarregandoLista() {
  return (
    <GradeCartoes>
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={128} />)}
    </GradeCartoes>
  );
}

export function ErroLista({ mensagem, aoTentar }: { mensagem: string; aoTentar: () => void }) {
  return (
    <Alert severity="error" action={<Button color="inherit" onClick={aoTentar}>Tentar de novo</Button>}>{mensagem}</Alert>
  );
}

export function ListaVazia({ icone, titulo, texto, acao }: { icone: string; titulo: string; texto?: ReactNode; acao?: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
      <Box sx={{ fontSize: 48, mb: 1 }} aria-hidden>{icone}</Box>
      <Typography variant="h6">{titulo}</Typography>
      {texto && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{texto}</Typography>}
      {acao && <Box sx={{ mt: 2 }}>{acao}</Box>}
    </Paper>
  );
}
