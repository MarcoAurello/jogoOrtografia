// Links dos jogos: cada jogo tem um link que abre direto nele, já com a marca da escola (/<escola>?jogo=…). Dá para
// mandar no WhatsApp, no e-mail ou pôr no mural da turma. Os jogos parceiros abrem no próprio endereço deles.
import { useMemo, useState } from 'react';
import { Box, Button, Divider, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CabecalhoPagina from '../../components/CabecalhoPagina';
import BarraFiltros from '../../components/BarraFiltros';
import { ListaVazia } from '../../components/EstadoLista';
import { useAvisos } from '../../components/Avisos';
import { useAuth } from '../../lib/auth';
import { linkDoApp } from '../../lib/dadosEscola';
import { NOME_DO_JOGO } from '../../lib/dadosDoApp';
import { contem } from '../../lib/texto';
import { copiar } from '../../lib/formato';

// os mesmos de js/professor.js (JOGOS_DE_FORA)
const PARCEIROS = [
  { nome: 'ABC da Tia Ana', link: 'https://abcdaana.vercel.app/' },
  { nome: 'Desafio da Rotina', link: 'https://routinesgame.vercel.app/' },
  { nome: 'Desafio das Peças', link: 'https://nagila.vercel.app/' },
  { nome: 'Hive', link: 'https://hive-alpha-smoky.vercel.app/' },
];

export default function Links() {
  const { usuario } = useAuth();
  const escola = usuario?.escola?.id || '';
  const avisar = useAvisos();
  const [busca, setBusca] = useState('');

  const jogos = useMemo(() => Object.entries(NOME_DO_JOGO).map(([id, nome]) => ({ nome, link: linkDoApp(escola, `jogo=${id}`) }))
    .sort((a, b) => a.nome.localeCompare(b.nome)), [escola]);
  const filtrar = <T extends { nome: string }>(l: T[]) => l.filter((j) => !busca || contem(j.nome, busca));
  const doApp = filtrar(jogos), deFora = filtrar(PARCEIROS);

  const grupo = (titulo: string, itens: { nome: string; link: string }[]) => itens.length > 0 && (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>{titulo}</Typography>
      <Paper variant="outlined" sx={{ borderRadius: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, overflow: 'hidden' }}>
        {itens.map((j, i) => (
          <Box key={j.link} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderTop: { xs: i ? 1 : 0, md: i > 1 ? 1 : 0 }, borderColor: 'divider',
            borderRight: { md: i % 2 === 0 ? 1 : 0 }, borderRightColor: { md: 'divider' } }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={700} noWrap>{j.nome}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>{j.link.replace(/^https?:\/\//, '')}</Typography>
            </Box>
            <Tooltip title="Copiar o link"><IconButton aria-label={`Copiar o link de ${j.nome}`} color="primary"
              onClick={async () => { if (await copiar(j.link)) avisar(`Link de "${j.nome}" copiado.`); }}><ContentCopyIcon /></IconButton></Tooltip>
            <Tooltip title="Mandar pelo WhatsApp"><IconButton aria-label={`Mandar ${j.nome} pelo WhatsApp`} href={`https://wa.me/?text=${encodeURIComponent(`${j.nome}: ${j.link}`)}`}
              target="_blank" rel="noopener"><WhatsAppIcon /></IconButton></Tooltip>
            <Tooltip title="Abrir"><IconButton aria-label={`Abrir ${j.nome}`} href={j.link} target="_blank" rel="noopener"><OpenInNewIcon /></IconButton></Tooltip>
          </Box>
        ))}
      </Paper>
    </Box>
  );

  return (
    <>
      <CabecalhoPagina titulo="Links dos jogos" subtitulo={escola
        ? <>Cada link abre direto no jogo, com a marca da escola. Os links dos questionários ficam em <b>Questionários</b>.</>
        : 'Cada link abre direto no jogo. Os links dos questionários ficam em Questionários.'} />
      <BarraFiltros busca={busca} aoBuscar={setBusca} rotuloBusca="Buscar jogo" mostrando={doApp.length + deFora.length}
        total={jogos.length + PARCEIROS.length} nomeItens={['jogo', 'jogos']} filtrando={!!busca} aoLimpar={() => setBusca('')} />
      {grupo('Jogos do app', doApp)}
      {deFora.length > 0 && doApp.length > 0 && <Divider sx={{ mb: 3 }} />}
      {grupo('Jogos parceiros', deFora)}
      {!doApp.length && !deFora.length && <ListaVazia icone="🔍" titulo="Nenhum jogo com essa busca" acao={<Button onClick={() => setBusca('')}>Limpar busca</Button>} />}
    </>
  );
}
