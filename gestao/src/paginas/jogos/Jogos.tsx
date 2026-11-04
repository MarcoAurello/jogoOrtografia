// Aba Jogos (todos os perfis): o catálogo dos jogos com o descritivo, as habilidades que cada um trabalha e para quem é
// indicado, com filtro pelas dificuldades (indicações) e pelas habilidades. Os dados vêm de js/habilidades.js do app dos
// jogos (o mesmo arquivo da tela de jogos), então jogo novo no app aparece aqui sozinho.
// Cada jogo tem os botões de compartilhar o link (copiar, WhatsApp, abrir). O link vai com a marca da escola de quem
// está na gestão (/<escola>?jogo=…, as cores e o logo dela); o administrador fora de uma escola escolhe para qual
// escola é o link (uma vez; dá para trocar). Os jogos parceiros abrem no próprio endereço deles.
import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CabecalhoPagina from '../../components/CabecalhoPagina';
import BarraFiltros from '../../components/BarraFiltros';
import FiltroSelect from '../../components/FiltroSelect';
import Popup from '../../components/Popup';
import { useAvisos } from '../../components/Avisos';
import { CarregandoLista, ErroLista, GradeCartoes, ListaVazia } from '../../components/EstadoLista';
import { useAuth } from '../../lib/auth';
import { useCarregar } from '../../lib/useCarregar';
import { carregarHabilidades, nomeDoJogo } from '../../lib/dadosDoApp';
import { linkDoApp } from '../../lib/dadosEscola';
import { copiar } from '../../lib/formato';
import { contem } from '../../lib/texto';
import type { Escola } from '../../types';

type Habs = Awaited<ReturnType<typeof carregarHabilidades>>;
interface Jogo { cartao: string; nome: string; resumo: string; habilidades: string[]; indicacoes: string[]; link: string | null; deFora: string | null }
type Acao = 'copiar' | 'whatsapp' | 'abrir';
// a escola dos links do administrador: slug '' = a plataforma, sem marca de escola
interface EscolaDoLink { slug: string; nome: string }

// os jogos parceiros (os mesmos da aba Links e de js/professor.js)
const LINK_DE_FORA: Record<string, string> = {
  'btn-abc': 'https://abcdaana.vercel.app/', 'btn-ingles': 'https://routinesgame.vercel.app/',
  'btn-psico': 'https://nagila.vercel.app/', 'btn-hive': 'https://hive-alpha-smoky.vercel.app/',
};

function montarJogos(m: Habs): Jogo[] {
  // o nome vem do id do link (o mesmo do plano e das competições); os jogos de fora têm o nome à parte
  const linkDoCartao = Object.fromEntries(Object.entries(m.CARTAO_DO_JOGO).map(([link, cartao]) => [cartao, link]));
  return Object.entries(m.JOGOS_HAB).map(([cartao, j]) => ({
    cartao,
    nome: linkDoCartao[cartao] ? nomeDoJogo(linkDoCartao[cartao]) : (m.NOME_DO_CARTAO_EXTERNO?.[cartao] || cartao),
    resumo: j.r,
    habilidades: j.h,
    indicacoes: m.INDICADO_PARA?.[cartao] || [],
    link: linkDoCartao[cartao] || null,
    deFora: LINK_DE_FORA[cartao] || null,
  })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export default function Jogos() {
  const { usuario } = useAuth();
  const avisar = useAvisos();
  // o administrador fora de uma escola precisa dizer para qual escola é o link; os outros usam a escola deles
  const adminFora = usuario?.perfil === 'admin' && !usuario?.escola;
  const { dados: escolas } = useCarregar<Escola[]>(adminFora ? '/escolas' : null);
  const [escolaLink, setEscolaLink] = useState<EscolaDoLink | null>(null);
  const [pedido, setPedido] = useState<{ jogo: Jogo; acao: Acao } | null>(null);
  const [escolhendo, setEscolhendo] = useState(false);
  const [escolhida, setEscolhida] = useState('');
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

  // o link do jogo: o parceiro no endereço dele; os do app com a marca da escola
  const slug = adminFora ? (escolaLink?.slug || '') : (usuario?.escola?.id || '');
  const linkDe = (j: Jogo) => j.deFora || linkDoApp(slug, `jogo=${j.link}`);
  const executar = async (j: Jogo, acao: Acao) => {
    const link = linkDe(j);
    if (acao === 'copiar') { if (await copiar(link)) avisar(`Link de "${j.nome}" copiado.`); }
    else if (acao === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(`${j.nome}: ${link}`)}`, '_blank', 'noopener');
    else window.open(link, '_blank', 'noopener');
  };
  // jogo do app pedido pelo administrador sem escola escolhida: pergunta antes
  const compartilhar = (j: Jogo, acao: Acao) => {
    if (adminFora && !escolaLink && !j.deFora) { setPedido({ jogo: j, acao }); setEscolhida(''); setEscolhendo(true); return; }
    executar(j, acao);
  };
  const confirmarEscola = () => {
    const e = escolas?.find((x) => x.slug === escolhida);
    const nova = { slug: escolhida, nome: e ? e.nome : 'Plataforma (sem escola)' };
    setEscolaLink(nova);
    setEscolhendo(false);
    if (pedido) {
      // o link já com a escola nova (o estado ainda não mudou aqui dentro)
      const link = pedido.jogo.deFora || linkDoApp(nova.slug, `jogo=${pedido.jogo.link}`);
      if (pedido.acao === 'copiar') copiar(link).then((ok) => ok && avisar(`Link de "${pedido.jogo.nome}" copiado (${nova.nome}).`));
      else if (pedido.acao === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(`${pedido.jogo.nome}: ${link}`)}`, '_blank', 'noopener');
      else window.open(link, '_blank', 'noopener');
    }
    setPedido(null);
  };

  return (
    <Box>
      <CabecalhoPagina titulo="Jogos" subtitulo="O que cada jogo trabalha e para quem é indicado." />
      <Alert severity="info" sx={{ mb: 2 }}>
        As indicações são sugestões pedagógicas para apoiar o trabalho com cada dificuldade. Não substituem a avaliação e o
        acompanhamento de um profissional.
      </Alert>
      {adminFora && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ flex: 1, minWidth: 200 }}>
            {escolaLink ? <>Os links vão com a marca de <b>{escolaLink.nome}</b>.</> : 'Ao compartilhar um jogo, você escolhe para qual escola é o link.'}
          </Typography>
          <Button onClick={() => { setPedido(null); setEscolhida(escolaLink?.slug || ''); setEscolhendo(true); }}>
            {escolaLink ? 'Trocar escola' : 'Escolher escola'}
          </Button>
        </Paper>
      )}
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
                  {(j.link || j.deFora) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 'auto', pt: 1, borderTop: 1, borderColor: 'divider' }}>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
                        {j.deFora ? 'Jogo parceiro (abre o site dele)' : (adminFora && !escolaLink ? 'Link do jogo' : linkDe(j).replace(/^https?:\/\//, ''))}
                      </Typography>
                      <Tooltip title="Copiar o link"><IconButton color="primary" aria-label={`Copiar o link de ${j.nome}`} onClick={() => compartilhar(j, 'copiar')}><ContentCopyIcon /></IconButton></Tooltip>
                      <Tooltip title="Mandar pelo WhatsApp"><IconButton aria-label={`Mandar ${j.nome} pelo WhatsApp`} onClick={() => compartilhar(j, 'whatsapp')}><WhatsAppIcon /></IconButton></Tooltip>
                      <Tooltip title="Abrir o jogo"><IconButton aria-label={`Abrir ${j.nome}`} onClick={() => compartilhar(j, 'abrir')}><OpenInNewIcon /></IconButton></Tooltip>
                    </Box>
                  )}
                </Paper>
              ))}
            </GradeCartoes>
          )}
        </>
      )}
      <Popup aberto={escolhendo} titulo="Para qual escola é o link?" aoFechar={() => { setEscolhendo(false); setPedido(null); }}
        aoSalvar={confirmarEscola} textoSalvar={pedido ? 'Usar esta escola' : 'Salvar'}>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          O link abre o jogo com as cores e a marca da escola escolhida. A escolha vale para os outros links desta tela.
        </Typography>
        <TextField select fullWidth label="Escola" value={escolhida} onChange={(e) => setEscolhida(e.target.value)}
          SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
          <MenuItem value="" sx={{ minHeight: 44 }}>Plataforma (sem escola)</MenuItem>
          {(escolas || []).filter((e) => e.ativa).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((e) => (
            <MenuItem key={e.slug} value={e.slug} sx={{ minHeight: 44 }}>{e.nome}</MenuItem>
          ))}
        </TextField>
      </Popup>
    </Box>
  );
}
