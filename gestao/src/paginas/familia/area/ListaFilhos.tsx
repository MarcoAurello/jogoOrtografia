// Os filhos ligados à conta do responsável: tocar no cartão abre o acompanhamento; "Trocar PIN" em cada um.
// "Jogar" abre o app dos jogos em "Quem vai jogar?" (a criança toca no nome e digita o PIN): jogarEmCasa.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, Card, CardActionArea, CardActions, CardContent, Stack, Typography } from '@mui/material';
import { useAuth } from '../../../lib/auth';
import { useCarregar } from '../../../lib/useCarregar';
import { iniciais } from '../../../lib/formato';
import { CarregandoLista, ErroLista, ListaVazia } from '../../../components/EstadoLista';
import PopupTrocarPin from './PopupTrocarPin';
import CodigoFamilia from './CodigoFamilia';
import { jogarEmCasa } from '../../../lib/familia';
import type { FilhoFamilia } from '../../../types';

export default function ListaFilhos() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const { dados: filhos, erro, carregando, recarregar } = useCarregar<FilhoFamilia[]>('/familia/filhos');
  const [trocandoPin, setTrocandoPin] = useState<FilhoFamilia | null>(null);

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" component="h1">Olá, {usuario?.nome.split(' ')[0]}!</Typography>
        <Typography color="text.secondary">Escolha um filho para acompanhar os jogos e o que a escola compartilha.</Typography>
      </Box>
      {!!filhos?.length && (
        <Button variant="contained" size="large" onClick={() => jogarEmCasa()} sx={{ minHeight: 56, fontSize: 18 }}>
          🎮 Jogar (Quem vai jogar?)
        </Button>
      )}

      {carregando && <CarregandoLista />}
      {erro && <ErroLista mensagem={erro} aoTentar={recarregar} />}
      {filhos && !filhos.length && (
        <ListaVazia icone="👨‍👩‍👧" titulo="Nenhum filho ligado à sua conta"
          texto="Os filhos aparecem aqui depois do cadastro pela página da escola ou do(a) profissional." />
      )}
      {filhos?.map((f) => (
        <Card key={f.id} variant="outlined" sx={{ borderRadius: 3 }}>
          <CardActionArea onClick={() => navegar(`/familia/${f.id}`)}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={f.escola?.logo || undefined} sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontWeight: 800 }}>
                {iniciais(f.nome)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" component="h2" noWrap>{f.nome}</Typography>
                {f.escola && <Typography variant="body2" color="text.secondary" noWrap>{f.escola.nome}</Typography>}
              </Box>
              <Typography aria-hidden color="text.secondary" fontSize={28}>›</Typography>
            </CardContent>
          </CardActionArea>
          <CardActions sx={{ px: 2, pb: 1.5, pt: 0 }}>
            <Button variant="contained" onClick={() => navegar(`/familia/${f.id}`)} sx={{ minHeight: 44 }}>Acompanhar</Button>
            <Button onClick={() => jogarEmCasa(f.id)} sx={{ minHeight: 44 }}>🎮 Jogar</Button>
            <Button onClick={() => setTrocandoPin(f)} sx={{ minHeight: 44 }}>🔢 Trocar PIN</Button>
          </CardActions>
        </Card>
      ))}

      {!!filhos?.length && <CodigoFamilia />}

      <PopupTrocarPin filho={trocandoPin} aoFechar={() => setTrocandoPin(null)} />
    </Stack>
  );
}
