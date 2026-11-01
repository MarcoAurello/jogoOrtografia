// Testes grátis (só o administrador): quem se cadastrou para receber os relatórios em PDF. Busca, filtros por perfil
// e por uso, e "Copiar e-mails" dos que estão na lista (para mandar uma mensagem a todos).
import { useMemo, useState } from 'react';
import { Avatar, Box, Button, Card, CardContent, Chip, Link, Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CabecalhoPagina from '../../components/CabecalhoPagina';
import BarraFiltros from '../../components/BarraFiltros';
import FiltroSelect from '../../components/FiltroSelect';
import { CarregandoLista, ErroLista, GradeCartoes, ListaVazia } from '../../components/EstadoLista';
import { useAvisos } from '../../components/Avisos';
import { useCarregar } from '../../lib/useCarregar';
import { contem } from '../../lib/texto';
import { copiar, dataCurta, haQuanto, iniciais, plural } from '../../lib/formato';
import type { TesteGratis } from '../../types';

const PERFIS: Record<string, string> = {
  professor: 'Professor(a)', psicopedagogo: 'Psicopedagogo(a)', coordenacao: 'Coordenação', responsavel: 'Responsável', outro: 'Outro',
};
const USOS = [
  { valor: 'usou', rotulo: 'Já recebeu relatório', testa: (t: TesteGratis) => t.relatorios > 0 },
  { valor: 'nao-usou', rotulo: 'Nunca recebeu relatório', testa: (t: TesteGratis) => t.relatorios === 0 },
  { valor: 'semana', rotulo: 'Cadastrados nos últimos 7 dias', testa: (t: TesteGratis) => Date.now() - new Date(t.created_at).getTime() < 7 * 864e5 },
];

export default function Testes() {
  const { dados: testes, erro, carregando, recarregar } = useCarregar<TesteGratis[]>('/testes');
  const avisar = useAvisos();
  const [busca, setBusca] = useState('');
  const [perfil, setPerfil] = useState('todos');
  const [uso, setUso] = useState('todos');

  const todos = testes || [];
  const base = useMemo(() => todos.filter((t) => !busca || contem(`${t.nome} ${t.email} ${t.escola_slug || ''}`, busca)), [todos, busca]);
  const testaUso = (t: TesteGratis, u: string) => u === 'todos' || USOS.find((x) => x.valor === u)!.testa(t);
  const doPerfil = perfil === 'todos' ? base : base.filter((t) => t.perfil === perfil);
  const doUso = base.filter((t) => testaUso(t, uso));
  const lista = doPerfil.filter((t) => testaUso(t, uso));
  const filtrando = !!busca || perfil !== 'todos' || uso !== 'todos';
  const limpar = () => { setBusca(''); setPerfil('todos'); setUso('todos'); };
  // os perfis que aparecem nos cadastros (inclusive algum que não está na lista acima)
  const perfisExistentes = [...new Set([...Object.keys(PERFIS), ...todos.map((t) => t.perfil)])];

  const copiarEmails = async () => {
    if (await copiar(lista.map((t) => t.email).join(', '))) avisar(`${plural(lista.length, 'e-mail copiado', 'e-mails copiados')}.`);
  };

  return (
    <>
      <CabecalhoPagina titulo="Testes grátis" subtitulo="Quem se cadastrou para receber os relatórios dos jogos em PDF, sem escola." />

      {carregando && <CarregandoLista />}
      {erro && <ErroLista mensagem={erro} aoTentar={recarregar} />}

      {testes && testes.length === 0 && <ListaVazia icone="🎁" titulo="Ninguém se cadastrou ainda" />}

      {testes && testes.length > 0 && (
        <>
          <BarraFiltros busca={busca} aoBuscar={setBusca} rotuloBusca="Buscar por nome, e-mail ou escola" qtdFiltros={2}
            mostrando={lista.length} total={todos.length} nomeItens={['cadastro', 'cadastros']} filtrando={filtrando} aoLimpar={limpar}
            acoes={<Button startIcon={<ContentCopyIcon />} onClick={copiarEmails} disabled={!lista.length}>
              Copiar {lista.length === todos.length ? 'todos os e-mails' : plural(lista.length, 'e-mail', 'e-mails')}
            </Button>}
            filtros={<>
              <FiltroSelect rotulo="Perfil" valor={perfil} aoMudar={setPerfil} opcoes={[
                { valor: 'todos', rotulo: 'Todos', qtd: doUso.length },
                ...perfisExistentes.map((p) => ({ valor: p, rotulo: PERFIS[p] || p, qtd: doUso.filter((t) => t.perfil === p).length })),
              ]} />
              <FiltroSelect rotulo="Uso" valor={uso} aoMudar={setUso} opcoes={[
                { valor: 'todos', rotulo: 'Todos', qtd: doPerfil.length },
                ...USOS.map((u) => ({ valor: u.valor, rotulo: u.rotulo, qtd: doPerfil.filter(u.testa).length })),
              ]} />
            </>} />

          {lista.length === 0 ? (
            <ListaVazia icone="🔍" titulo="Ninguém com esse filtro" acao={<Button onClick={limpar}>Limpar filtros</Button>} />
          ) : (
            <GradeCartoes>
              {lista.map((t) => (
                <Card key={t.id} variant="outlined">
                  <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', '&:last-child': { pb: 2 } }}>
                    <Avatar sx={{ bgcolor: t.relatorios ? 'success.main' : 'grey.400', width: 48, height: 48, fontWeight: 800 }}>{iniciais(t.nome)}</Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="h6" component="h2" sx={{ lineHeight: 1.25 }}>{t.nome}</Typography>
                      <Link href={`mailto:${t.email}`} variant="body2" sx={{ wordBreak: 'break-all' }}>{t.email}</Link>
                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
                        <Chip size="small" label={PERFIS[t.perfil] || t.perfil} />
                        <Chip size="small" variant="outlined" color={t.relatorios ? 'success' : 'default'} label={plural(t.relatorios, 'relatório', 'relatórios')} />
                        {t.escola_slug && <Chip size="small" variant="outlined" label={`/${t.escola_slug}`} />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Cadastro em {dataCurta(t.created_at)}{t.ultimo_relatorio ? ` · último relatório ${haQuanto(t.ultimo_relatorio)}` : ''}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </GradeCartoes>
          )}
        </>
      )}
    </>
  );
}
