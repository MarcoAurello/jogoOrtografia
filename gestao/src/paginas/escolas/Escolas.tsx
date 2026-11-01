// Escolas (só o administrador): lista com busca e filtro pela situação do plano, criar/editar no popup, entrar na
// escola, copiar o link, ativar o plano, estender o teste e desativar.
import { useMemo, useState } from 'react';
import { Avatar, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VerifiedIcon from '@mui/icons-material/Verified';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CabecalhoPagina from '../../components/CabecalhoPagina';
import BarraFiltros from '../../components/BarraFiltros';
import FiltroSelect from '../../components/FiltroSelect';
import MenuAcoes, { Acao } from '../../components/MenuAcoes';
import { CarregandoLista, ErroLista, GradeCartoes, ListaVazia } from '../../components/EstadoLista';
import { useAvisos } from '../../components/Avisos';
import { useConfirmar } from '../../components/Confirmar';
import { api, mensagemDoErro } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useCarregar } from '../../lib/useCarregar';
import { contem } from '../../lib/texto';
import { copiar, plural } from '../../lib/formato';
import { linkDaEscola, SITUACOES, situacaoDe, textoSituacao } from './escola';
import PopupEscola from './PopupEscola';
import type { Escola } from '../../types';

const DIAS_A_MAIS = 14;

export default function Escolas() {
  const { dados: escolas, erro, carregando, recarregar } = useCarregar<Escola[]>('/escolas');
  const { entrarNaEscola } = useAuth();
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('todas');
  const [popup, setPopup] = useState<{ aberto: boolean; escola: Escola | null }>({ aberto: false, escola: null });
  const [ocupada, setOcupada] = useState('');   // id da escola com uma ação em andamento
  const [importando, setImportando] = useState(false);

  const todas = escolas || [];
  const daBusca = useMemo(() => todas.filter((e) => !busca || contem(`${e.nome} ${e.slug}`, busca)), [todas, busca]);
  const lista = situacao === 'todas' ? daBusca : daBusca.filter((e) => situacaoDe(e) === situacao);
  const filtrando = !!busca || situacao !== 'todas';
  const limpar = () => { setBusca(''); setSituacao('todas'); };

  const mudar = async (e: Escola, dados: Record<string, unknown>, mensagem: string) => {
    setOcupada(e.id);
    try { await api(`/escolas/${e.id}`, { metodo: 'PUT', corpo: dados }); avisar(mensagem); await recarregar(); }
    catch (err) { avisar(mensagemDoErro(err), 'error'); }
    finally { setOcupada(''); }
  };

  const entrar = async (e: Escola) => {
    setOcupada(e.id);
    try { await entrarNaEscola(e.id); } catch (err) { avisar(mensagemDoErro(err), 'error'); setOcupada(''); }
  };

  const copiarLink = async (e: Escola) => { if (await copiar(linkDaEscola(e.slug))) avisar(`Link copiado: ${linkDaEscola(e.slug)}`); };

  const desativar = async (e: Escola) => {
    const ok = await confirmar({
      titulo: `Desativar ${e.nome}?`,
      texto: 'A escola, os professores e os alunos dela ficam sem acesso até você reativar. Nada é apagado.',
      botao: 'Desativar', perigo: true,
    });
    if (ok) mudar(e, { ativa: false }, `${e.nome} desativada.`);
  };

  const importar = async () => {
    const ok = await confirmar({
      titulo: 'Importar da planilha do Google?',
      texto: 'Traz para o banco as escolas, e-mails, questionários e competições que ainda não estão nele. Pode levar alguns minutos; nada que já está no banco é apagado.',
      botao: 'Importar',
    });
    if (!ok) return;
    setImportando(true);
    try {
      const r = await api<{ escolasNovas: string[]; resumos: { origem: string; emails: number; questionarios: number; competicoes: number }[] }>(
        '/admin/importar-planilha', { metodo: 'POST', corpo: {} });
      const resumo = r.resumos.map((x) => `${x.origem}: ${x.emails} e-mails, ${x.questionarios} questionários, ${x.competicoes} competições`).join(' · ');
      avisar(`Importação feita. ${r.escolasNovas.length ? `Escolas novas: ${r.escolasNovas.join(', ')}. ` : ''}${resumo}`);
      await recarregar();
    } catch (err) { avisar(mensagemDoErro(err), 'error'); }
    finally { setImportando(false); }
  };

  const acoesDe = (e: Escola): Acao[] => [
    { texto: 'Copiar link', icone: <LinkIcon fontSize="small" />, aoClicar: () => copiarLink(e) },
    { texto: 'Abrir a página da escola', icone: <OpenInNewIcon fontSize="small" />, aoClicar: () => window.open(linkDaEscola(e.slug), '_blank', 'noopener') },
    ...(e.plano === 'teste' ? [
      { texto: 'Ativar o plano', icone: <VerifiedIcon fontSize="small" />, separarAntes: true,
        aoClicar: () => mudar(e, { plano: 'ativo', ativa: true }, `${e.nome} com o plano ativo.`) },
      { texto: `Mais ${DIAS_A_MAIS} dias de teste`, icone: <MoreTimeIcon fontSize="small" />,
        aoClicar: () => mudar(e, { ativa: true, teste_ate: new Date(Math.max(Date.now(), new Date(e.teste_ate || 0).getTime()) + DIAS_A_MAIS * 864e5).toISOString() },
          `Teste de ${e.nome} estendido por mais ${DIAS_A_MAIS} dias.`) },
    ] : []),
    e.ativa
      ? { texto: 'Desativar', icone: <PauseCircleIcon fontSize="small" />, perigo: true, separarAntes: true, aoClicar: () => desativar(e) }
      : { texto: 'Reativar', icone: <PlayCircleIcon fontSize="small" />, separarAntes: true, aoClicar: () => mudar(e, { ativa: true }, `${e.nome} reativada.`) },
  ];

  return (
    <>
      <CabecalhoPagina titulo="Escolas" subtitulo="Cada escola tem o próprio endereço, marca e usuários."
        textoNovo="Nova escola" aoNovo={() => setPopup({ aberto: true, escola: null })}
        extras={<Button variant="outlined" onClick={importar} disabled={importando}
          startIcon={importando ? <CircularProgress size={18} /> : <CloudDownloadIcon />}>
          {importando ? 'Importando…' : 'Importar da planilha'}
        </Button>} />

      {carregando && <CarregandoLista />}
      {erro && <ErroLista mensagem={erro} aoTentar={recarregar} />}

      {escolas && escolas.length === 0 && (
        <ListaVazia icone="🏫" titulo="Nenhuma escola ainda" texto="Crie a primeira escola: ela começa com 14 dias de teste grátis."
          acao={<Button variant="contained" onClick={() => setPopup({ aberto: true, escola: null })}>＋ Nova escola</Button>} />
      )}

      {escolas && escolas.length > 0 && (
        <>
          <BarraFiltros busca={busca} aoBuscar={setBusca} rotuloBusca="Buscar por nome ou endereço" qtdFiltros={1}
            mostrando={lista.length} total={todas.length} nomeItens={['escola', 'escolas']} filtrando={filtrando} aoLimpar={limpar}
            filtros={<FiltroSelect rotulo="Situação" valor={situacao} aoMudar={setSituacao} opcoes={[
              { valor: 'todas', rotulo: 'Todas', qtd: daBusca.length },
              ...SITUACOES.map((s) => ({ valor: s.valor, rotulo: s.rotulo, qtd: daBusca.filter((e) => situacaoDe(e) === s.valor).length })),
            ]} />} />

          {lista.length === 0 ? (
            <ListaVazia icone="🔍" titulo="Nenhuma escola com esse filtro" acao={<Button onClick={limpar}>Limpar filtros</Button>} />
          ) : (
            <GradeCartoes>
              {lista.map((e) => {
                const s = SITUACOES.find((x) => x.valor === situacaoDe(e))!;
                return (
                  <Card key={e.id} variant="outlined" sx={{ borderLeft: 6, borderLeftColor: e.cor, opacity: e.ativa ? 1 : 0.7, display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', pb: 1, flex: 1 }}>
                      <Avatar variant="rounded" src={e.logo || '/assets/logo-pg-168.png'} alt="" sx={{ width: 56, height: 56, bgcolor: '#fff', border: 1, borderColor: 'divider', '& img': { objectFit: 'contain' } }} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="h6" component="h2" sx={{ lineHeight: 1.25 }}>{e.nome}</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>/{e.slug}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
                          <Chip size="small" color={s.cor} label={textoSituacao(e)} />
                          <Chip size="small" variant="outlined" label={plural(e.usuarios, 'usuário', 'usuários')} />
                          {e.script && <Chip size="small" variant="outlined" label="Planilha própria" />}
                          {e.salvar_partidas === false && <Chip size="small" color="warning" variant="outlined" label="Não guarda partidas" />}
                          {e.enviar_relatorios === false && <Chip size="small" variant="outlined" label="Relatório por e-mail desligado" />}
                        </Stack>
                      </Box>
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 1.5, pt: 0 }}>
                      <Button variant="contained" startIcon={ocupada === e.id ? <CircularProgress size={18} color="inherit" /> : <LoginIcon />}
                        onClick={() => entrar(e)} disabled={!!ocupada}>Entrar</Button>
                      <Button startIcon={<EditIcon />} onClick={() => setPopup({ aberto: true, escola: e })}>Editar</Button>
                      <Box sx={{ flex: 1 }} />
                      <MenuAcoes rotulo={`Mais ações de ${e.nome}`} acoes={acoesDe(e)} />
                    </CardActions>
                  </Card>
                );
              })}
            </GradeCartoes>
          )}
        </>
      )}

      <PopupEscola aberto={popup.aberto} escola={popup.escola} aoFechar={() => setPopup({ aberto: false, escola: null })}
        aoSalvar={(salva, nova) => {
          setPopup({ aberto: false, escola: null });
          avisar(nova ? `${salva.nome} criada, com 14 dias de teste grátis. Link: ${linkDaEscola(salva.slug)}` : 'Alterações salvas.');
          recarregar();
        }} />
    </>
  );
}
