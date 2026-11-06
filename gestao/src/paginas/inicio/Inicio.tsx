// Tela inicial: atalhos para as áreas do perfil (no PC, em duas ou três colunas).
import { Link as LinkRouter } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material';
import { useAuth } from '../../lib/auth';
import { itensDoPerfil } from '../../lib/menu';

export default function Inicio() {
  const { usuario } = useAuth();
  if (!usuario) return null;
  const primeiroNome = usuario.nome.split(' ')[0];

  return (
    <>
      <Typography variant="h4" component="h1" sx={{ mb: 0.5 }}>Olá, {primeiroNome}!</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>O que você quer fazer hoje?</Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' } }}>
        {itensDoPerfil(usuario).map((i) => (
          <Card key={i.caminho} variant="outlined">
            <CardActionArea component={LinkRouter} to={i.caminho} sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ fontSize: 32 }} aria-hidden>{i.icone}</Box>
                <Typography variant="h6">{i.titulo}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </>
  );
}
