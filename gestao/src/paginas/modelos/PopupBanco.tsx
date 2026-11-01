// Banco de perguntas (js/dados-anamnese.js): busca, filtro por assunto e por modelo de origem, marcar uma a uma ou
// "marcar todas" de um assunto. As que já estão no modelo aparecem marcadas e apagadas (não repetem).
import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, Typography } from '@mui/material';
import Popup from '../../components/Popup';
import CampoBusca from '../../components/CampoBusca';
import FiltroSelect from '../../components/FiltroSelect';
import { carregarBanco, PerguntaDoBanco } from '../../lib/dadosDoApp';
import { contem, normalizar } from '../../lib/texto';

interface ItemBanco extends PerguntaDoBanco { secao: string; chave: string }

const TIPO: Record<string, string> = { curta: 'resposta curta', longa: 'resposta longa', simnao: 'sim ou não', multipla: 'uma opção', varias: 'várias opções', escala: 'escala 1 a 5' };

export default function PopupBanco({ aberto, jaNoModelo, aoFechar, aoIncluir }:
  { aberto: boolean; jaNoModelo: string[]; aoFechar: () => void; aoIncluir: (p: PerguntaDoBanco[]) => void }) {
  const [itens, setItens] = useState<ItemBanco[] | null>(null);
  const [secoes, setSecoes] = useState<string[]>([]);
  const [modelos, setModelos] = useState<Record<string, string>>({});
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [secao, setSecao] = useState('');
  const [modelo, setModelo] = useState('');
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!aberto) return;
    setBusca(''); setSecao(''); setModelo(''); setMarcadas(new Set());
    carregarBanco().then((b) => {
      setItens(b.BANCO_ANAMNESE.flatMap((s, i) => s.perguntas.map((q, k) => ({ ...q, secao: s.secao, chave: `${i}-${k}` }))));
      setSecoes(b.BANCO_ANAMNESE.map((s) => s.secao));
      setModelos(b.NOMES_MODELOS);
    }).catch(() => setErro('Não deu para abrir o banco de perguntas. Tente de novo.'));
  }, [aberto]);

  const ja = useMemo(() => new Set(jaNoModelo.map(normalizar)), [jaNoModelo]);
  const lista = useMemo(() => (itens || []).filter((q) => (!secao || q.secao === secao) && (!modelo || q.m.includes(Number(modelo)))
    && (!busca || contem(`${q.texto} ${q.opcoes.join(' ')}`, busca))), [itens, secao, modelo, busca]);
  const porSecao = useMemo(() => {
    const m = new Map<string, ItemBanco[]>();
    lista.forEach((q) => m.set(q.secao, [...(m.get(q.secao) || []), q]));
    return [...m];
  }, [lista]);

  const alternar = (chave: string) => setMarcadas((s) => { const n = new Set(s); if (n.has(chave)) n.delete(chave); else n.add(chave); return n; });
  const incluir = () => aoIncluir((itens || []).filter((q) => marcadas.has(q.chave)));

  return (
    <Popup aberto={aberto} titulo="Banco de perguntas" aoFechar={aoFechar} largo aoSalvar={incluir} erro={erro}
      textoSalvar={marcadas.size ? `Incluir ${marcadas.size} pergunta${marcadas.size === 1 ? '' : 's'}` : 'Incluir'}>
      {!itens && !erro && <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>}
      {itens && (
        <>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' }, mb: 1 }}>
            <CampoBusca valor={busca} aoMudar={setBusca} rotulo="Buscar pergunta" />
            <FiltroSelect rotulo="Assunto" valor={secao} aoMudar={setSecao} opcoes={[
              { valor: '', rotulo: 'Todos os assuntos' },
              ...secoes.map((s) => ({ valor: s, rotulo: s, qtd: itens.filter((q) => q.secao === s).length })),
            ]} />
            <FiltroSelect rotulo="Modelo de origem" valor={modelo} aoMudar={setModelo} opcoes={[
              { valor: '', rotulo: 'Todos os modelos' },
              ...Object.entries(modelos).map(([n, nome]) => ({ valor: n, rotulo: nome, qtd: itens.filter((q) => q.m.includes(Number(n))).length })),
            ]} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Mostrando {lista.length} de {itens.length} perguntas</Typography>
          {lista.length === 0 && <Alert severity="info">Nenhuma pergunta com esse filtro.</Alert>}
          {porSecao.map(([nome, qs]) => {
            const livres = qs.filter((q) => !ja.has(normalizar(q.texto)));
            const todas = livres.length > 0 && livres.every((q) => marcadas.has(q.chave));
            return (
              <Box key={nome} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', position: 'sticky', top: -16, bgcolor: 'background.paper', zIndex: 1, py: 0.5 }}>
                  <Typography fontWeight={800} sx={{ flex: 1 }}>{nome} <Typography component="span" color="text.secondary">({qs.length})</Typography></Typography>
                  {livres.length > 1 && (
                    <Button size="small" onClick={() => setMarcadas((s) => {
                      const n = new Set(s);
                      livres.forEach((q) => (todas ? n.delete(q.chave) : n.add(q.chave)));
                      return n;
                    })}>{todas ? 'Desmarcar todas' : 'Marcar todas'}</Button>
                  )}
                </Box>
                {qs.map((q) => {
                  const noModelo = ja.has(normalizar(q.texto));
                  return (
                    <FormControlLabel key={q.chave} disabled={noModelo} sx={{ display: 'flex', alignItems: 'flex-start', m: 0, py: 0.5 }}
                      control={<Checkbox checked={noModelo || marcadas.has(q.chave)} onChange={() => alternar(q.chave)} sx={{ pt: 0.5 }} />}
                      label={<Box><Typography>{q.texto}</Typography>
                        <Typography variant="body2" color="text.secondary">{TIPO[q.tipo]}{q.opcoes.length ? `: ${q.opcoes.join(' · ')}` : ''}{noModelo ? ' · já está no modelo' : ''}</Typography></Box>} />
                  );
                })}
              </Box>
            );
          })}
        </>
      )}
    </Popup>
  );
}

export { TIPO as NOME_DO_TIPO };
