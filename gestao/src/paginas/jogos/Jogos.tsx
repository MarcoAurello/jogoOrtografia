// Aba Jogos (todos os perfis): o catálogo dos jogos com o descritivo, as habilidades que cada um trabalha e para quem é
// indicado, com filtro pelas dificuldades (indicações) e pelas habilidades. Os dados vêm de js/habilidades.js do app dos
// jogos (o mesmo arquivo da tela de jogos), então jogo novo no app aparece aqui sozinho.
import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import CabecalhoPagina from '../../components/CabecalhoPagina';
import BarraFiltros from '../../components/BarraFiltros';
import FiltroSelect from '../../components/FiltroSelect';
import { CarregandoLista, ErroLista, GradeCartoes, ListaVazia } from '../../components/EstadoLista';
import { carregarHabilidades, nomeDoJogo } from '../../lib/dadosDoApp';
import { contem } from '../../lib/texto';

type Habs = Awaited<ReturnType<typeof carregarHabilidades>>;
interface Jogo { cartao: string; nome: string; resumo: string; habilidades: string[]; indicacoes: string[] }

function montarJogos(m: Habs): Jogo[] {
  // o nome vem do id do link (o mesmo do plano e das competições); os jogos de fora têm o nome à parte
  const linkDoCartao = Object.fromEntries(Object.entries(m.CARTAO_DO_JOGO).map(([link, cartao]) => [cartao, link]));
  return Object.entries(m.JOGOS_HAB).map(([cartao, j]) => ({
    cartao,
    nome: linkDoCartao[cartao] ? nomeDoJogo(linkDoCartao[cartao]) : (m.NOME_DO_CARTAO_EXTERNO?.[cartao] || cartao),
    resumo: j.r,
    habilidades: j.h,
    indicacoes: m.INDICADO_PARA?.[cartao] || [],
  })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export default function Jogos() {
  const [habs, setHabs] = useState<Habs | null>(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [indicacao, setIndicacao] = useState('');
  const [habilidade, setHabilidade] = useState('');

  const carregar = () => {
    setErro('');
    carregarHabilidades().then(setHabs).catch(() => setErro('Não deu para carregar a lista de jogos. Confira a internet.'));
  };
  useEffect(carregar, []);

  const jogos = useMemo(() => (habs ? montarJogos(habs) : []), [habs]);
  const nomeInd = (k: string) => habs?.INDICACOES?.[k] || k;
  const nomeHab = (k: string) => habs?.NOME_HAB?.[k] || k;

  // cada filtro conta considerando a busca e o outro filtro (o número da opção é o que aparece se escolher)
  const passaBusca = (j: Jogo) => !busca || contem(j.nome, busca) || contem(j.resumo, busca)
    || j.habilidades.some((h) => contem(nomeHab(h), busca)) || j.indicacoes.some((i) => contem(nomeInd(i), busca));
  const passaInd = (j: Jogo) => !indicacao || j.indicacoes.includes(indicacao);
  const passaHab = (j: Jogo) => !habilidade || j.habilidades.includes(habilidade);
  const visiveis = jogos.filter((j) => passaBusca(j) && passaInd(j) && passaHab(j));

  const opcoesInd = [{ valor: '', rotulo: 'Todas as dificuldades' },
    ...Object.keys(habs?.INDICACOES || {}).map((k) => ({ valor: k, rotulo: nomeInd(k), qtd: jogos.filter((j) => passaBusca(j) && passaHab(j) && j.indicacoes.includes(k)).length }))];
  const usadas = [...new Set(jogos.flatMap((j) => j.habilidades))].sort((a, b) => nomeHab(a).localeCompare(nomeHab(b), 'pt-BR'));
  const opcoesHab = [{ valor: '', rotulo: 'Todas as habilidades' },
    ...usadas.map((k) => ({ valor: k, rotulo: nomeHab(k), qtd: jogos.filter((j) => passaBusca(j) && passaInd(j) && j.habilidades.includes(k)).length }))];

  const filtrando = !!(busca || indicacao || habilidade);
  const limpar = () => { setBusca(''); setIndicacao(''); setHabilidade(''); };

  return (
    <Box>
      <CabecalhoPagina titulo="Jogos" subtitulo="O que cada jogo trabalha e para quem é indicado." />
      <Alert severity="info" sx={{ mb: 2 }}>
        As indicações são sugestões pedagógicas para apoiar o trabalho com cada dificuldade. Não substituem a avaliação e o
        acompanhamento de um profissional.
      </Alert>
      {erro && <ErroLista mensagem={erro} aoTentar={carregar} />}
      {!erro && !habs && <CarregandoLista />}
      {habs && (
        <>
          <BarraFiltros busca={busca} aoBuscar={setBusca} rotuloBusca="Buscar jogo, habilidade ou dificuldade" qtdFiltros={2}
            filtros={<>
              <FiltroSelect rotulo="Indicado para" valor={indicacao} aoMudar={setIndicacao} opcoes={opcoesInd} />
              <FiltroSelect rotulo="Habilidade" valor={habilidade} aoMudar={setHabilidade} opcoes={opcoesHab} />
            </>}
            mostrando={visiveis.length} total={jogos.length} nomeItens={['jogo', 'jogos']} filtrando={filtrando} aoLimpar={limpar} />
          {visiveis.length === 0 ? (
            <ListaVazia icone="🎮" titulo="Nenhum jogo com esses filtros" texto="Tente outra dificuldade ou limpe os filtros." />
          ) : (
            <GradeCartoes>
              {visiveis.map((j) => (
                <Paper key={j.cartao} variant="outlined" component="article" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <Typography variant="h6" component="h2">{j.nome}</Typography>
                  <Typography color="text.secondary">{j.resumo}</Typography>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Habilidades que trabalha</Typography>
                    <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.75}>
                      {j.habilidades.map((h) => (
                        <Chip key={h} size="small" label={nomeHab(h)} color={h === habilidade ? 'primary' : 'default'} variant={h === habilidade ? 'filled' : 'outlined'} />
                      ))}
                    </Stack>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Indicado para</Typography>
                    {j.indicacoes.length ? (
                      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                        {j.indicacoes.map((i) => (
                          <Typography key={i} component="li" variant="body2" sx={{ fontWeight: i === indicacao ? 700 : 400, color: i === indicacao ? 'primary.main' : 'text.primary' }}>
                            {nomeInd(i)}
                          </Typography>
                        ))}
                      </Box>
                    ) : <Typography variant="body2" color="text.secondary">Todos os alunos.</Typography>}
                  </Box>
                </Paper>
              ))}
            </GradeCartoes>
          )}
        </>
      )}
    </Box>
  );
}
