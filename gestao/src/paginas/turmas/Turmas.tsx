// Turmas: o professor vê as dele; a coordenação, as da escola (com filtro por professor). O cartão inteiro abre a
// turma; o código de entrada fica à vista (é o que mais se passa para os alunos), com o botão de copiar.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarGroup, Avatar, Box, Button, Card, CardActionArea, Chip, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CabecalhoPagina from '../../components/CabecalhoPagina';
import BarraFiltros from '../../components/BarraFiltros';
import FiltroSelect from '../../components/FiltroSelect';
import { CarregandoLista, ErroLista, GradeCartoes, ListaVazia } from '../../components/EstadoLista';
import { useAvisos } from '../../components/Avisos';
import { useAuth } from '../../lib/auth';
import { useCarregar } from '../../lib/useCarregar';
import { contem } from '../../lib/texto';
import { copiar, iniciais, plural } from '../../lib/formato';
import PopupTurma from './PopupTurma';
import type { Turma } from '../../types';

export default function Turmas() {
  const { usuario } = useAuth();
  const coordena = usuario?.perfil === 'coordenacao';
  const navegar = useNavigate();
  const avisar = useAvisos();
  const { dados: turmas, erro, carregando, recarregar } = useCarregar<Turma[]>('/turmas');
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('ativas');
  const [professor, setProfessor] = useState('');
  const [novaAberta, setNovaAberta] = useState(false);

  const todas = turmas || [];
  const base = useMemo(() => todas.filter((t) => (!busca || contem(`${t.nome} ${t.codigo} ${t.professores.map((p) => p.nome).join(' ')}`, busca))
    && (!professor || (professor === '__sem__' ? !t.professores.length : t.professores.some((p) => p.id === professor)))), [todas, busca, professor]);
  const daSituacao = (t: Turma, s: string) => s === 'todas' || (s === 'ativas' ? t.ativa : !t.ativa);
  const lista = base.filter((t) => daSituacao(t, situacao));
  const filtrando = !!busca || situacao !== 'ativas' || !!professor;
  const limpar = () => { setBusca(''); setSituacao('ativas'); setProfessor(''); };

  // os professores que aparecem nas turmas (para o filtro da coordenação)
  const professores = useMemo(() => {
    const m = new Map<string, string>();
    todas.forEach((t) => t.professores.forEach((p) => m.set(p.id, p.nome)));
    return [...m].sort((a, b) => a[1].localeCompare(b[1]));
  }, [todas]);

  const copiarCodigo = async (t: Turma) => { if (await copiar(t.codigo)) avisar(`Código ${t.codigo} copiado.`); };

  return (
    <>
      <CabecalhoPagina titulo="Turmas" subtitulo={coordena ? 'As turmas da escola. Toque numa turma para ver os alunos e o painel.' : 'As suas turmas. Toque numa turma para ver os alunos e o painel.'}
        textoNovo="Nova turma" aoNovo={() => setNovaAberta(true)} />

      {carregando && <CarregandoLista />}
      {erro && <ErroLista mensagem={erro} aoTentar={recarregar} />}

      {turmas && turmas.length === 0 && (
        <ListaVazia icone="🎒" titulo="Nenhuma turma ainda"
          texto="Crie a turma: ela ganha um código, e os alunos entram no app com esse código e o nome deles."
          acao={<Button variant="contained" onClick={() => setNovaAberta(true)}>＋ Nova turma</Button>} />
      )}

      {turmas && turmas.length > 0 && (
        <>
          <BarraFiltros busca={busca} aoBuscar={setBusca} rotuloBusca="Buscar por turma, código ou professor" qtdFiltros={coordena ? 2 : 1}
            mostrando={lista.length} total={todas.length} nomeItens={['turma', 'turmas']} filtrando={filtrando} aoLimpar={limpar}
            filtros={<>
              {coordena && (
                <FiltroSelect rotulo="Professor" valor={professor} aoMudar={setProfessor} opcoes={[
                  { valor: '', rotulo: 'Todos os professores' },
                  ...professores.map(([id, nome]) => ({ valor: id, rotulo: nome, qtd: todas.filter((t) => t.professores.some((p) => p.id === id)).length })),
                  { valor: '__sem__', rotulo: 'Sem professor', qtd: todas.filter((t) => !t.professores.length).length },
                ]} />
              )}
              <FiltroSelect rotulo="Situação" valor={situacao} aoMudar={setSituacao} opcoes={[
                { valor: 'ativas', rotulo: 'Ativas', qtd: base.filter((t) => t.ativa).length },
                { valor: 'encerradas', rotulo: 'Encerradas', qtd: base.filter((t) => !t.ativa).length },
                { valor: 'todas', rotulo: 'Todas', qtd: base.length },
              ]} />
            </>} />

          {lista.length === 0 ? (
            <ListaVazia icone="🔍" titulo="Nenhuma turma com esse filtro" acao={<Button onClick={limpar}>Limpar filtros</Button>} />
          ) : (
            <GradeCartoes>
              {lista.map((t) => (
                <Card key={t.id} variant="outlined" sx={{ position: 'relative', opacity: t.ativa ? 1 : 0.7, transition: 'box-shadow .2s, border-color .2s',
                  '&:hover': { borderColor: 'primary.main', boxShadow: 2 } }}>
                  <CardActionArea onClick={() => navegar(`/turmas/${t.id}`)} sx={{ p: 2, pr: 15, height: '100%', alignItems: 'flex-start' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="h6" component="h2" sx={{ lineHeight: 1.25 }}>{t.nome}</Typography>
                      {!t.ativa && <Chip size="small" label="Encerrada" />}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {plural(t.alunos, 'aluno', 'alunos')} · {t.ano_letivo}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, minHeight: 32 }}>
                      {t.professores.length ? (
                        <>
                          <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 12, fontWeight: 800 } }}>
                            {t.professores.map((p) => <Avatar key={p.id} alt={p.nome} sx={{ bgcolor: 'primary.light' }}>{iniciais(p.nome)}</Avatar>)}
                          </AvatarGroup>
                          <Typography variant="body2" color="text.secondary" noWrap>{t.professores.map((p) => p.nome).join(', ')}</Typography>
                        </>
                      ) : <Typography variant="body2" color="warning.dark">Sem professor (só a coordenação vê)</Typography>}
                    </Box>
                  </CardActionArea>
                  {/* o código fica fora da área de clique do cartão: copiar não abre a turma */}
                  <Box sx={{ position: 'absolute', top: 12, right: 12, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="block">Código</Typography>
                    <Tooltip title="Copiar o código">
                      <Button size="small" variant="outlined" onClick={() => copiarCodigo(t)} endIcon={<ContentCopyIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{ fontFamily: 'monospace', fontSize: 16, letterSpacing: 1, px: 1, minWidth: 0 }}>{t.codigo}</Button>
                    </Tooltip>
                  </Box>
                </Card>
              ))}
            </GradeCartoes>
          )}
        </>
      )}

      <PopupTurma aberto={novaAberta} turma={null} coordena={coordena} aoFechar={() => setNovaAberta(false)}
        aoSalvar={(t) => { setNovaAberta(false); avisar(`Turma ${t.nome} criada. Código: ${t.codigo}`); navegar(`/turmas/${t.id}`); }} />
    </>
  );
}
