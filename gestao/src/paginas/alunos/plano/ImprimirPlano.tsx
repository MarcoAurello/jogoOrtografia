// O plano como documento (A4) para imprimir ou "Salvar como PDF" pelo navegador: para a equipe e a família, com as
// linhas de assinatura. Na tela aparece numa folha branca, com os botões em cima (que não vão para o papel).
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { ErroLista } from '../../../components/EstadoLista';
import { api, mensagemDoErro } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { nomeHab } from '../../../lib/habilidades';
import { nomeDoJogo } from '../../../lib/dadosDoApp';
import { dataCurta } from '../../../lib/formato';
import { DIAS, STATUS_PLANO } from './plano';
import type { AlunoDaEscola, Plano } from '../../../types';

const nomeDia = Object.fromEntries(DIAS);

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  if (!children || (Array.isArray(children) && !children.length)) return null;
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="body2" sx={{ color: '#5b6b7f', fontWeight: 700 }}>{rotulo}</Typography>
      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{children}</Typography>
    </Box>
  );
}

export default function ImprimirPlano() {
  const { id = '', planoId = '' } = useParams();
  const navegar = useNavigate();
  const { usuario } = useAuth();
  const [dados, setDados] = useState<{ aluno: AlunoDaEscola; plano: Plano } | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([api<{ aluno: AlunoDaEscola }>(`/alunos/${id}`), api<{ planos: Plano[] }>(`/alunos/${id}/planos`)])
      .then(([a, r]) => {
        const plano = r.planos.find((p) => p.id === planoId);
        if (!plano) { setErro('Plano não encontrado.'); return; }
        setDados({ aluno: a.aluno, plano });
      }).catch((e) => setErro(mensagemDoErro(e)));
  }, [id, planoId]);

  // o nome do arquivo ao "Salvar como PDF" vem do título da página
  useEffect(() => {
    if (!dados) return;
    const antes = document.title;
    document.title = `Plano de objetivos - ${dados.aluno.nome}${dados.plano.ciclo ? ` - ${dados.plano.ciclo}` : ''}`;
    return () => { document.title = antes; };
  }, [dados]);

  if (erro) return <ErroLista mensagem={erro} aoTentar={() => navegar(0)} />;
  if (!dados) return <Skeleton variant="rounded" height={600} sx={{ maxWidth: 800, mx: 'auto' }} />;
  const { aluno, plano: p } = dados;

  return (
    <>
      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2, '@media print': { display: 'none' } }}>
        <Button onClick={() => navegar(`/aluno/${id}?aba=plano`)}>Voltar</Button>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>Imprimir / salvar PDF</Button>
      </Stack>

      <Box sx={{ maxWidth: 800, mx: 'auto', bgcolor: '#fff', color: '#22364a', p: { xs: 2.5, sm: 6 }, boxShadow: 3, borderRadius: 1,
        '@media print': { boxShadow: 'none', p: 0, maxWidth: 'none' } }}>
        <Box sx={{ borderBottom: 3, borderColor: 'primary.main', pb: 1.5, mb: 2.5 }}>
          <Typography variant="body2" sx={{ color: '#5b6b7f' }}>{usuario?.escola?.nome}</Typography>
          <Typography variant="h4" component="h1" sx={{ color: 'primary.main' }}>Plano de Objetivos Psicopedagógicos</Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 3, mb: 2 }}>
          <Campo rotulo="Aluno(a)">{aluno.nome_completo || aluno.nome}</Campo>
          <Campo rotulo="Nascimento">{aluno.data_nascimento ? dataCurta(`${aluno.data_nascimento.slice(0, 10)}T12:00:00`) : ''}</Campo>
          <Campo rotulo="Turma(s)">{aluno.turmas.map((t) => t.nome).join(', ')}</Campo>
          <Campo rotulo="Ciclo / período">{p.ciclo}</Campo>
          <Campo rotulo="Profissional responsável">{p.profissional_nome}</Campo>
          <Campo rotulo="Situação">{`${STATUS_PLANO[p.status].rotulo} · atualizado em ${dataCurta(p.atualizado_em)}`}</Campo>
        </Box>
        <Campo rotulo="Foco do plano">{p.foco}</Campo>

        <Typography variant="h6" sx={{ mt: 3, mb: 1, color: 'primary.main' }}>Objetivos</Typography>
        {p.objetivos.map((o, i) => (
          <Box key={o.id || i} sx={{ border: '1px solid #d5dde6', borderRadius: 1, p: 2, mb: 1.5, breakInside: 'avoid' }}>
            <Typography fontWeight={800} sx={{ mb: 1 }}>{i + 1}. {o.area ? `${o.area}: ` : ''}{o.descricao}</Typography>
            <Campo rotulo="Habilidades-alvo">{o.habilidades.map(nomeHab).join(', ')}</Campo>
            <Campo rotulo="Jogos do sistema">{o.jogos.map(nomeDoJogo).join(', ')}</Campo>
            <Campo rotulo="Outras estratégias e recursos">{o.recursos}</Campo>
            <Campo rotulo="Indicador de sucesso">{o.indicador}</Campo>
            <Campo rotulo="Prazo / frequência">{[o.prazo, o.dias.map((d) => nomeDia[d]).join(', ')].filter(Boolean).join(' · ')}</Campo>
          </Box>
        ))}

        {(p.orientacoes_familia || p.adequacoes_escola.length > 0 || p.adequacoes_texto) && (
          <Box sx={{ breakInside: 'avoid' }}>
            <Typography variant="h6" sx={{ mt: 3, mb: 1, color: 'primary.main' }}>Família e escola</Typography>
            <Campo rotulo="Orientações para a família">{p.orientacoes_familia}</Campo>
            {p.adequacoes_escola.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#5b6b7f', fontWeight: 700 }}>Adequações na escola</Typography>
                <Box component="ul" sx={{ m: 0, pl: 3 }}>{p.adequacoes_escola.map((a) => <li key={a}>{a}</li>)}</Box>
              </Box>
            )}
            <Campo rotulo="Outras adequações">{p.adequacoes_texto}</Campo>
          </Box>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, mt: 8, breakInside: 'avoid' }}>
          {['Profissional responsável', 'Responsável pelo aluno'].map((r) => (
            <Box key={r} sx={{ borderTop: '1px solid #22364a', pt: 0.5, textAlign: 'center' }}><Typography variant="body2">{r}</Typography></Box>
          ))}
        </Box>
        <Typography variant="caption" component="p" sx={{ mt: 4, color: '#5b6b7f', fontStyle: 'italic' }}>
          Documento de uso da equipe escolar e da família. Contém dados pessoais do aluno (LGPD).
        </Typography>
      </Box>
    </>
  );
}
