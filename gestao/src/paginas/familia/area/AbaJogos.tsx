// Jogos e desempenho do filho: os números do período, a evolução por semana, cada jogo, as habilidades, o que vale
// revisar em casa e as últimas partidas (na escola ou em casa). Os mesmos cálculos da ficha da equipe, sem anotações.
import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useCarregar } from '../../../lib/useCarregar';
import { haQuanto, plural } from '../../../lib/formato';
import { porcento } from '../../../lib/desempenho';
import { nomeHab } from '../../../lib/habilidades';
import { nomeDoJogo } from '../../../lib/dadosDoApp';
import { CarregandoLista, ErroLista, ListaVazia } from '../../../components/EstadoLista';
import Numeros from '../../../components/Numeros';
import Secao from '../../../components/Secao';
import SeletorPeriodo from '../../../components/SeletorPeriodo';
import PilulaAcerto from '../../../components/PilulaAcerto';
import GraficoSemanas from '../../../components/graficos/GraficoSemanas';
import BarrasAcerto from '../../../components/graficos/BarrasAcerto';
import type { JogosDoFilho } from '../../../types';

export default function AbaJogos({ idFilho }: { idFilho: string }) {
  const [dias, setDias] = useState(30);
  const { dados, erro, recarregar } = useCarregar<JogosDoFilho>(`/familia/filhos/${idFilho}/jogos?dias=${dias}`);

  return (
    <Stack spacing={2}>
      <SeletorPeriodo dias={dias} aoMudar={setDias} />
      {erro && <ErroLista mensagem={erro} aoTentar={recarregar} />}
      {!dados && !erro && <CarregandoLista />}
      {dados && !dados.resumo.partidas && (
        <ListaVazia icone="🎮" titulo="Nenhuma partida neste período" texto="Quando a criança jogar, o desempenho aparece aqui." />
      )}
      {dados && dados.resumo.partidas > 0 && (
        <>
          <Numeros itens={[
            { rotulo: 'Partidas', valor: dados.resumo.partidas },
            { rotulo: 'Acerto', valor: porcento(dados.resumo.acerto), detalhe: 'de primeira' },
            { rotulo: 'Tempo jogando', valor: `${dados.resumo.minutos} min` },
            { rotulo: 'Última vez', valor: <Box component="span" sx={{ fontSize: '0.7em' }}>{haQuanto(dados.resumo.ultima) || '—'}</Box> },
          ]} />

          {dados.semanas.length > 1 && (
            <Secao titulo="Evolução por semana" subtitulo="Acerto de primeira em cada semana">
              <GraficoSemanas semanas={dados.semanas} rotulo="Acerto por semana" />
            </Secao>
          )}

          <Secao titulo="Jogos" subtitulo="O acerto em cada jogo no período" semPadding>
            {dados.jogos.map((j) => (
              <Box key={j.jogo} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.25, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={700}>{j.titulo || nomeDoJogo(j.jogo)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {plural(j.partidas, 'partida', 'partidas')}{j.nivel ? ` · chegou ao nível ${j.nivel}` : ''}
                  </Typography>
                </Box>
                <PilulaAcerto acerto={j.acerto} />
              </Box>
            ))}
          </Secao>

          {dados.habilidades.length > 0 && (
            <Secao titulo="Habilidades" subtitulo="O que os jogos treinaram e como foi">
              <BarrasAcerto itens={dados.habilidades.map((h) => ({ chave: h.habilidade, rotulo: nomeHab(h.habilidade), acerto: h.acerto,
                detalhe: plural(h.respostas, 'resposta', 'respostas') }))} />
            </Secao>
          )}

          {dados.revisar.length > 0 && (
            <Secao titulo="Para revisar em casa" subtitulo="As respostas que mais deram trabalho">
              <Stack spacing={1}>
                {dados.revisar.slice(0, 8).map((r, i) => (
                  <Box key={i}>
                    <Typography><b>{r.certa}</b> <Typography component="span" variant="body2" color="text.secondary">({r.tipo || r.jogo})</Typography></Typography>
                    {r.respostas.length > 0 && (
                      <Typography variant="body2" color="text.secondary">Respondeu: {r.respostas.join(', ')} · {plural(r.vezes, 'vez', 'vezes')}</Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </Secao>
          )}

          <Secao titulo="Últimas partidas" semPadding>
            {dados.ultimas.slice(0, 15).map((p) => (
              <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1, borderTop: 1, borderColor: 'divider' }}>
                <Typography aria-label={p.local === 'casa' ? 'Em casa' : 'Na escola'} title={p.local === 'casa' ? 'Em casa' : 'Na escola'}>
                  {p.local === 'casa' ? '🏠' : '🏫'}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={700} noWrap>{p.titulo || nomeDoJogo(p.jogo)}</Typography>
                  <Typography variant="body2" color="text.secondary">{haQuanto(p.jogada_em)} · {p.acertos} de {p.total}</Typography>
                </Box>
                <PilulaAcerto acerto={p.total ? Math.round((p.acertos / p.total) * 100) : null} />
              </Box>
            ))}
          </Secao>
        </>
      )}
    </Stack>
  );
}
