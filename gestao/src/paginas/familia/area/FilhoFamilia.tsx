// O acompanhamento de um filho: abas só com o que a API libera (jogos e desempenho, recados, plano, anamnese).
// Relatório desligado some (sem "bloqueado"). Recados, planos e anamneses vêm já filtrados item a item pela API (a
// escola e a psicopedagoga decidem cada uma o que produziram; o que a família respondeu aparece sempre), então a aba
// aparece se a chave estiver ligada ou se houver algo liberado nela. Compra avulsa: a API não manda anamnese.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, Box, Button, Chip, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { api, mensagemDoErro } from '../../../lib/api';
import { iniciais, dataCurta } from '../../../lib/formato';
import { CarregandoLista, ErroLista, ListaVazia } from '../../../components/EstadoLista';
import Secao from '../../../components/Secao';
import { LerRespostas } from '../../alunos/anamnese/Perguntas';
import { DIAS, STATUS_PLANO } from '../../alunos/plano/plano';
import { nomeDoJogo } from '../../../lib/dadosDoApp';
import AbaJogos from './AbaJogos';
import PopupTrocarPin from './PopupTrocarPin';
import { jogarEmCasa } from '../../../lib/familia';
import type { AnamneseDaFamilia, FilhoFamilia as Filho, PlanoDaFamilia, RecadoFamilia, RelatorioFamilia } from '../../../types';

type Recado = Omit<RecadoFamilia, 'pode_editar'>;
interface Dados { filho: Filho; recados: Recado[]; planos: PlanoDaFamilia[]; anamneses: AnamneseDaFamilia[] }

const ABAS: { chave: RelatorioFamilia; titulo: string }[] = [
  { chave: 'jogos', titulo: '🎮 Jogos' },
  { chave: 'recados', titulo: '💬 Recados' },
  { chave: 'plano', titulo: '🎯 Plano' },
  { chave: 'anamnese', titulo: '📋 Anamnese' },
];
const nomeDia = Object.fromEntries(DIAS);

export default function FilhoFamilia() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState('');
  const [aba, setAba] = useState<RelatorioFamilia | null>(null);
  const [trocandoPin, setTrocandoPin] = useState(false);

  const carregar = async () => {
    setErro('');
    try {
      const base = `/familia/filhos/${id}`;
      const [filho, recados, planos, anamneses] = await Promise.all([
        api<Filho>(base), api<Recado[]>(`${base}/recados`), api<PlanoDaFamilia[]>(`${base}/planos`), api<AnamneseDaFamilia[]>(`${base}/anamneses`),
      ]);
      setDados({ filho, recados, planos, anamneses });
    } catch (e) { setErro(mensagemDoErro(e)); }
  };
  useEffect(() => { setDados(null); setAba(null); carregar(); }, [id]);   // eslint-disable-line react-hooks/exhaustive-deps

  const visiveis = useMemo(() => {
    if (!dados) return [];
    const { filho: f, recados, planos, anamneses } = dados;
    const tem: Record<RelatorioFamilia, boolean> = {
      jogos: f.relatorios.jogos,
      recados: f.relatorios.recados || recados.length > 0,
      plano: f.relatorios.plano || planos.length > 0,
      anamnese: f.relatorios.anamnese || anamneses.length > 0,
    };
    return ABAS.filter((a) => tem[a.chave]);
  }, [dados]);
  const abaAtual = aba && visiveis.some((a) => a.chave === aba) ? aba : visiveis[0]?.chave || null;

  const voltar = <Button onClick={() => navegar('/familia')} sx={{ alignSelf: 'flex-start', minHeight: 44 }}>‹ Meus filhos</Button>;
  if (erro) return <Stack spacing={2}>{voltar}<ErroLista mensagem={erro} aoTentar={carregar} /></Stack>;
  if (!dados) return <CarregandoLista />;
  const { filho, recados, planos, anamneses } = dados;

  return (
    <Stack spacing={2}>
      {voltar}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Avatar src={filho.escola?.logo || undefined} sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontWeight: 800 }}>{iniciais(filho.nome)}</Avatar>
        <Box sx={{ flex: 1, minWidth: 160 }}>
          <Typography variant="h5" component="h1">{filho.nome}</Typography>
          {(filho.nome_completo || filho.escola) && (
            <Typography variant="body2" color="text.secondary">{[filho.nome_completo, filho.escola?.nome].filter(Boolean).join(' · ')}</Typography>
          )}
        </Box>
        <Button variant="contained" onClick={() => jogarEmCasa(filho.id)} sx={{ minHeight: 44 }}>🎮 Jogar</Button>
        <Button variant="outlined" onClick={() => setTrocandoPin(true)} sx={{ minHeight: 44 }}>🔢 Trocar PIN</Button>
      </Paper>

      {!visiveis.length && (
        <ListaVazia icone="🌱" titulo="Ainda não há nada para mostrar"
          texto="Quando a escola ou o(a) profissional compartilhar algo, aparece aqui." />
      )}

      {visiveis.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 3 }}>
          <Tabs value={abaAtual} onChange={(_, v) => setAba(v)} variant="fullWidth" aria-label="O que ver">
            {visiveis.map((a) => <Tab key={a.chave} value={a.chave} label={a.titulo} sx={{ minHeight: 52, px: 0.5, textTransform: 'none', fontWeight: 700, minWidth: 0 }} />)}
          </Tabs>
        </Paper>
      )}

      {abaAtual === 'jogos' && <AbaJogos idFilho={filho.id} />}
      {abaAtual === 'recados' && (recados.length ? recados.map((r) => (
        <Paper key={r.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{r.texto}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{r.autor_nome} · {dataCurta(r.criado_em)}</Typography>
        </Paper>
      )) : <ListaVazia icone="💬" titulo="Nenhum recado ainda" />)}
      {abaAtual === 'plano' && (planos.length ? planos.map((p) => (
        <Secao key={p.id} titulo={p.foco || 'Plano de objetivos'}
          subtitulo={[p.profissional_nome, p.ciclo, dataCurta(p.criado_em)].filter(Boolean).join(' · ')}
          acao={<Chip size="small" label={STATUS_PLANO[p.status]?.rotulo || p.status} color={STATUS_PLANO[p.status]?.cor || 'default'} />}>
          <Stack spacing={1.5}>
            {p.objetivos.map((o, i) => (
              <Box key={i} sx={{ borderLeft: 4, borderColor: 'primary.main', pl: 1.5 }}>
                {o.area && <Typography variant="body2" color="text.secondary">{o.area}</Typography>}
                <Typography fontWeight={700}>{o.descricao}</Typography>
                {o.jogos.length > 0 && <Typography variant="body2">🎮 {o.jogos.map(nomeDoJogo).join(', ')}</Typography>}
                {(o.prazo || o.dias.length > 0) && (
                  <Typography variant="body2" color="text.secondary">{[o.prazo, o.dias.map((d) => nomeDia[d] || d).join(', ')].filter(Boolean).join(' · ')}</Typography>
                )}
              </Box>
            ))}
            {p.orientacoes_familia && (
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography fontWeight={800}>🏠 Para fazer em casa</Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{p.orientacoes_familia}</Typography>
              </Paper>
            )}
          </Stack>
        </Secao>
      )) : <ListaVazia icone="🎯" titulo="Nenhum plano de objetivos ainda" />)}
      {abaAtual === 'anamnese' && (anamneses.length ? anamneses.map((a) => (
        <Secao key={a.id} titulo={a.titulo}
          subtitulo={[a.da_familia ? 'Respondida pela família' : 'Preenchida pela equipe', a.respondida_por_nome, dataCurta(a.respondida_em)].filter(Boolean).join(' · ')}>
          <LerRespostas perguntas={a.perguntas} respostas={a.respostas} />
        </Secao>
      )) : <ListaVazia icone="📋" titulo="Nenhuma anamnese ainda" />)}

      <PopupTrocarPin filho={trocandoPin ? filho : null} aoFechar={() => setTrocandoPin(false)} />
    </Stack>
  );
}
