// Página do aluno: quem é (com as ações) e cinco abas — Anamnese (preencher, link para a família e o histórico),
// Observações, Plano de objetivos, Família (responsáveis, recados e o que a família vê) e Cadastro. A aba fica no endereço (?aba=plano), para voltar direto a ela.
import { useState } from 'react';
import { Link as LinkRouter, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, Chip, Collapse, Divider, Paper, Skeleton, Stack, Tab, Tabs, Typography,
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import EditIcon from '@mui/icons-material/Edit';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SendIcon from '@mui/icons-material/Send';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import Migalhas from '../../components/Migalhas';
import MenuAcoes from '../../components/MenuAcoes';
import { ErroLista, ListaVazia } from '../../components/EstadoLista';
import { useAvisos } from '../../components/Avisos';
import { useConfirmar } from '../../components/Confirmar';
import { api, mensagemDoErro } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useCarregar } from '../../lib/useCarregar';
import { dataCurta, iniciais } from '../../lib/formato';
import PopupAluno from './PopupAluno';
import PopupAnamnese from './anamnese/PopupAnamnese';
import { LerRespostas } from './anamnese/Perguntas';
import AbaObservacoes from './AbaObservacoes';
import AbaPlano from './plano/AbaPlano';
import AbaFamilia from '../familia/AbaFamilia';
import type { AlunoDaEscola, AnamneseDoAluno } from '../../types';

type Aba = 'anamnese' | 'observacoes' | 'plano' | 'familia' | 'cadastro';
const ABAS: Aba[] = ['anamnese', 'observacoes', 'plano', 'familia', 'cadastro'];

const STATUS_ANAMNESE = {
  respondida: { rotulo: 'Respondida', cor: 'success' as const },
  pendente: { rotulo: 'Esperando a família', cor: 'warning' as const },
  expirada: { rotulo: 'Link expirou', cor: 'default' as const },
  cancelada: { rotulo: 'Link cancelado', cor: 'default' as const },
};

function idade(nascimento: string | null) {
  if (!nascimento) return '';
  const n = new Date(`${nascimento.slice(0, 10)}T12:00:00`), h = new Date();
  const anos = h.getFullYear() - n.getFullYear() - (h < new Date(h.getFullYear(), n.getMonth(), n.getDate()) ? 1 : 0);
  return anos >= 0 && anos < 30 ? `${anos} anos` : '';
}

export default function AlunoPerfil() {
  const { id = '' } = useParams();
  const [parametros, setParametros] = useSearchParams();
  const aba = (ABAS.includes(parametros.get('aba') as Aba) ? parametros.get('aba') : 'anamnese') as Aba;
  const { usuario } = useAuth();
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const { dados, erro, recarregar } = useCarregar<{ aluno: AlunoDaEscola; pode_editar: boolean; anamneses: AnamneseDoAluno[] }>(`/alunos/${id}`);
  const [editando, setEditando] = useState(false);
  const [modo, setModo] = useState<'preencher' | 'link' | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);

  if (erro) return <ErroLista mensagem={erro} aoTentar={recarregar} />;
  if (!dados) return <><Skeleton height={80} width="60%" /><Skeleton variant="rounded" height={300} sx={{ mt: 2 }} /></>;
  const { aluno, pode_editar: pode, anamneses } = dados;
  const voltarPara = usuario?.perfil === 'admin' ? '/alunos' : '/anamnese';
  const respondidas = anamneses.filter((a) => a.status === 'respondida');

  const mudarAtivo = async (ativo: boolean) => {
    if (!ativo && !(await confirmar({ titulo: `Desativar ${aluno.nome}?`, botao: 'Desativar', perigo: true,
      texto: 'O aluno sai das listas de entrada das turmas. A anamnese, as observações e as partidas ficam guardadas.' }))) return;
    try { await api(`/alunos/${aluno.id}`, { metodo: 'PUT', corpo: { ativo } }); avisar(ativo ? 'Aluno ativado.' : 'Aluno desativado.'); recarregar(); }
    catch (e) { avisar(mensagemDoErro(e), 'error'); }
  };

  const cancelarLink = async (a: AnamneseDoAluno) => {
    if (!(await confirmar({ titulo: 'Cancelar este link?', botao: 'Cancelar o link', perigo: true, texto: 'A família não consegue mais responder por ele.' }))) return;
    try { await api(`/anamneses/${a.id}/cancelar`, { metodo: 'PUT', corpo: {} }); avisar('Link cancelado.'); recarregar(); }
    catch (e) { avisar(mensagemDoErro(e), 'error'); }
  };

  return (
    <>
      <Migalhas itens={[{ texto: usuario?.perfil === 'admin' ? 'Alunos' : 'Alunos e anamnese', para: voltarPara }, { texto: aluno.nome }]} />

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <Avatar sx={{ width: 64, height: 64, fontSize: 24, fontWeight: 800, bgcolor: aluno.ativo ? 'primary.main' : 'grey.400' }}>{iniciais(aluno.nome)}</Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h4" component="h1">{aluno.nome}</Typography>
            {!aluno.ativo && <Chip label="Desativado" />}
            {aluno.salvar_partidas === false && <Chip color="warning" variant="outlined" label="Não guarda partidas" />}
          </Stack>
          <Typography color="text.secondary">
            {[aluno.nome_completo !== aluno.nome && aluno.nome_completo, idade(aluno.data_nascimento), aluno.turmas.map((t) => t.nome).join(', ') || 'Sem turma'].filter(Boolean).join(' · ')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {pode && aluno.turmas.length > 0 && (
            <Button variant="outlined" startIcon={<InsightsIcon />} component={LinkRouter} to={`/ficha/${aluno.id}`}>Ficha</Button>
          )}
          {pode && <Button startIcon={<EditIcon />} onClick={() => setEditando(true)}>Editar</Button>}
          {pode && <MenuAcoes rotulo="Mais ações do aluno" acoes={[aluno.ativo
            ? { texto: 'Desativar aluno', icone: <PersonOffIcon fontSize="small" />, perigo: true, aoClicar: () => mudarAtivo(false) }
            : { texto: 'Ativar aluno', icone: <HowToRegIcon fontSize="small" />, aoClicar: () => mudarAtivo(true) }]} />}
        </Stack>
      </Box>
      {!pode && <Alert severity="info" sx={{ mb: 2 }}>Você vê este aluno, mas só edita os alunos das suas turmas.</Alert>}
      {aluno.aguardando_turma && (
        <Alert severity="info" sx={{ mb: 2 }} action={pode ? <Button color="inherit" onClick={() => setEditando(true)}>Escolher turma</Button> : undefined}>
          Cadastrado pela família no link da escola. Coloque o aluno numa turma para ele entrar pelo código da turma.
        </Alert>
      )}

      <Tabs value={aba} onChange={(_, v) => setParametros({ aba: v }, { replace: true })} variant="scrollable" allowScrollButtonsMobile
        sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 48, fontWeight: 700 } }}>
        <Tab value="anamnese" label={`Anamnese${respondidas.length ? ` (${respondidas.length})` : ''}`} />
        <Tab value="observacoes" label="Observações" />
        <Tab value="plano" label="Plano de objetivos" />
        <Tab value="familia" label="Família" />
        <Tab value="cadastro" label="Cadastro" />
      </Tabs>

      {aba === 'anamnese' && (
        <Box sx={{ pb: 4 }}>
          {pode && (
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, mb: 2.5 }}>
              <AcaoGrande icone={<EditNoteIcon />} titulo="Preencher agora" texto="Você conversa com a família e responde aqui." aoClicar={() => setModo('preencher')} />
              <AcaoGrande icone={<SendIcon />} titulo="Mandar link para a família" texto="A família responde no celular (o link vale 3 horas)." aoClicar={() => setModo('link')} />
            </Box>
          )}
          {aluno.consentimento_em
            ? <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>✓ Autorização do responsável registrada em {dataCurta(aluno.consentimento_em)} (LGPD).</Typography>
            : <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>A autorização do responsável (LGPD) é pedida na primeira anamnese.</Typography>}
          {anamneses.length === 0 ? (
            <ListaVazia icone="📋" titulo="Nenhuma anamnese ainda" texto="Preencha com a família ou mande o link para ela responder." />
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 3 }}>
              {anamneses.map((a, i) => {
                const st = STATUS_ANAMNESE[a.status];
                const aberto = aberta === a.id;
                return (
                  <Box key={a.id}>
                    {i > 0 && <Divider />}
                    <Box sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Box sx={{ flex: 1, minWidth: 200 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                          <Typography fontWeight={800}>{a.titulo}</Typography>
                          <Chip size="small" color={st.cor} variant="outlined" label={st.rotulo} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {a.status === 'respondida'
                            ? `${dataCurta(a.respondida_em)} · ${a.via === 'link' ? 'pela família, no link' : 'presencial'}${a.respondida_por_nome ? ` · ${a.respondida_por_nome}` : ''}`
                            : a.status === 'pendente' ? `Link criado em ${dataCurta(a.criada_em)} · vale até ${new Date(a.expira_em!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                              : `Criada em ${dataCurta(a.criada_em)}`}
                        </Typography>
                      </Box>
                      {a.status === 'respondida' && <Button onClick={() => setAberta(aberto ? null : a.id)}>{aberto ? 'Esconder' : 'Ver respostas'}</Button>}
                      {a.status === 'pendente' && pode && <Button color="error" onClick={() => cancelarLink(a)}>Cancelar link</Button>}
                    </Box>
                    <Collapse in={aberto} unmountOnExit>
                      <Box sx={{ px: 2, pb: 2 }}>
                        <Alert severity="info" icon={false} sx={{ mb: 1.5 }}>Dado sensível da criança (LGPD): só para a equipe da escola.</Alert>
                        <LerRespostas perguntas={a.perguntas} respostas={a.respostas} />
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Paper>
          )}
        </Box>
      )}

      {aba === 'observacoes' && <AbaObservacoes alunoId={aluno.id} nome={aluno.nome} podeEscrever={pode} />}
      {aba === 'plano' && <AbaPlano alunoId={aluno.id} />}
      {aba === 'familia' && <AbaFamilia alunoId={aluno.id} nome={aluno.nome} pode={pode} />}

      {aba === 'cadastro' && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 4 }}>
          <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '220px 1fr' }, rowGap: 1.5, columnGap: 2 }}>
            {([
              ['Nome na turma', aluno.nome], ['Nome completo', aluno.nome_completo],
              ['Nascimento', aluno.data_nascimento ? `${dataCurta(`${aluno.data_nascimento.slice(0, 10)}T12:00:00`)} (${idade(aluno.data_nascimento)})` : ''],
              ['Turmas', aluno.turmas.map((t) => t.nome).join(', ')], ['Responsável', aluno.responsavel_nome],
              ['Contato do responsável', aluno.responsavel_contato], ['Observações do cadastro', typeof aluno.observacoes === 'string' ? aluno.observacoes : ''],
              ['Autorização (LGPD)', aluno.consentimento_em ? `Registrada em ${dataCurta(aluno.consentimento_em)}` : 'Ainda não'],
              ['Guardar as partidas', aluno.salvar_partidas === false ? 'Desligado para este aluno' : 'Ligado'],
            ] as [string, string | null][]).map(([r, v]) => (
              <Box key={r} sx={{ display: 'contents' }}>
                <Typography component="dt" color="text.secondary">{r}</Typography>
                <Typography component="dd" sx={{ m: 0, fontWeight: 700, whiteSpace: 'pre-wrap' }}>{v || '—'}</Typography>
              </Box>
            ))}
          </Box>
          {pode && <Button startIcon={<EditIcon />} onClick={() => setEditando(true)} sx={{ mt: 2 }}>Editar cadastro</Button>}
        </Paper>
      )}

      <PopupAluno aberto={editando} aluno={aluno} aoFechar={() => setEditando(false)}
        aoSalvar={() => { setEditando(false); avisar('Cadastro salvo.'); recarregar(); }} />
      <PopupAnamnese modo={modo} aluno={aluno} aoFechar={() => setModo(null)} aoSalvar={recarregar} />
    </>
  );
}

// botão grande com ícone, título e explicação (as duas formas de aplicar a anamnese)
function AcaoGrande({ icone, titulo, texto, aoClicar }: { icone: React.ReactNode; titulo: string; texto: string; aoClicar: () => void }) {
  return (
    <Button variant="outlined" onClick={aoClicar} sx={{ justifyContent: 'flex-start', textAlign: 'left', p: 2, gap: 1.5, borderRadius: 3, alignItems: 'flex-start' }}>
      <Box sx={{ fontSize: 0, mt: 0.25, '& svg': { fontSize: 28 } }}>{icone}</Box>
      <Box>
        <Typography fontWeight={800} sx={{ fontFamily: "'Fredoka', sans-serif" }}>{titulo}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'none' }}>{texto}</Typography>
      </Box>
    </Button>
  );
}
