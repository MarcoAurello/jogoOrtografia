// Usuários: o administrador vê todos (filtro por escola) e a coordenação, os da escola dela. Cadastrar com senha
// provisória, editar o nome, dar uma senha nova (esqueceu) e desativar / ativar.
import { useMemo, useState } from 'react';
import { Avatar, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import EditIcon from '@mui/icons-material/Edit';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import HowToRegIcon from '@mui/icons-material/HowToReg';
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
import { NOME_DO_PERFIL } from '../../lib/menu';
import { contem } from '../../lib/texto';
import { haQuanto, iniciais } from '../../lib/formato';
import PopupUsuario from './PopupUsuario';
import DadosDeAcesso, { Acesso } from './DadosDeAcesso';
import { senhaAleatoria } from './senha';
import type { Escola, Perfil, UsuarioCadastro } from '../../types';

const SEM_ESCOLA = '__sem__';
type Situacao = 'ativo' | 'novo' | 'desativado';
const situacaoDe = (u: UsuarioCadastro): Situacao => (!u.ativo ? 'desativado' : u.primeiro_login ? 'novo' : 'ativo');
const SITUACOES: { valor: Situacao; rotulo: string }[] = [
  { valor: 'ativo', rotulo: 'Ativos' },
  { valor: 'novo', rotulo: 'Ainda não entraram' },
  { valor: 'desativado', rotulo: 'Desativados' },
];
const COR_DO_PERFIL: Record<Perfil, 'secondary' | 'primary' | 'default'> = { admin: 'secondary', coordenacao: 'primary', professor: 'default', responsavel: 'default' };

export default function Usuarios() {
  const { usuario: eu } = useAuth();
  const souAdmin = eu?.perfil === 'admin';
  const { dados: usuarios, erro, carregando, recarregar } = useCarregar<UsuarioCadastro[]>('/usuarios');
  // só o administrador (fora de escola) precisa da lista de escolas: filtro e campo do cadastro
  const { dados: escolas } = useCarregar<Escola[]>(souAdmin ? '/escolas' : null);
  const avisar = useAvisos();
  const confirmar = useConfirmar();
  const [busca, setBusca] = useState('');
  const [escola, setEscola] = useState('');
  const [perfil, setPerfil] = useState('todos');
  const [situacao, setSituacao] = useState('todos');
  const [popup, setPopup] = useState<{ aberto: boolean; usuario: UsuarioCadastro | null }>({ aberto: false, usuario: null });
  const [acesso, setAcesso] = useState<Acesso | null>(null);

  const todos = usuarios || [];
  // cada filtro conta com a busca e os OUTROS filtros aplicados (o número diz o que aparece ao escolher a opção)
  const base = useMemo(() => todos.filter((u) => (!busca || contem(`${u.nome} ${u.email}`, busca))
    && (!escola || (escola === SEM_ESCOLA ? !u.escola_id : u.escola_id === escola))), [todos, busca, escola]);
  const doPerfil = perfil === 'todos' ? base : base.filter((u) => u.perfil === perfil);
  const daSituacao = situacao === 'todos' ? base : base.filter((u) => situacaoDe(u) === situacao);
  const lista = situacao === 'todos' ? doPerfil : doPerfil.filter((u) => situacaoDe(u) === situacao);
  const filtrando = !!busca || !!escola || perfil !== 'todos' || situacao !== 'todos';
  const limpar = () => { setBusca(''); setEscola(''); setPerfil('todos'); setSituacao('todos'); };

  const perfis: Perfil[] = souAdmin ? ['admin', 'coordenacao', 'professor'] : ['coordenacao', 'professor'];
  const escolaSugerida = escola === SEM_ESCOLA ? '' : escola || escolas?.[0]?.id || '';

  const alterar = async (u: UsuarioCadastro, dados: Record<string, unknown>, mensagem: string) => {
    try { await api(`/usuarios/${u.id}`, { metodo: 'PUT', corpo: dados }); avisar(mensagem); await recarregar(); return true; }
    catch (e) { avisar(mensagemDoErro(e), 'error'); return false; }
  };

  const senhaNova = async (u: UsuarioCadastro) => {
    const ok = await confirmar({
      titulo: `Senha nova para ${u.nome}?`,
      texto: 'A senha atual deixa de valer. Você vai receber uma senha provisória para passar à pessoa; ela cria a própria no próximo acesso.',
      botao: 'Gerar senha nova',
    });
    if (!ok) return;
    const senha = senhaAleatoria();
    if (await alterar(u, { senha }, `Senha de ${u.nome} trocada.`)) setAcesso({ titulo: 'Senha nova', nome: u.nome, email: u.email, senha });
  };

  const desativar = async (u: UsuarioCadastro) => {
    const ok = await confirmar({
      titulo: `Desativar ${u.nome}?`,
      texto: 'A pessoa não entra mais até você ativar de novo. Nada do que ela fez é apagado.',
      botao: 'Desativar', perigo: true,
    });
    if (ok) alterar(u, { ativo: false }, `${u.nome} não entra mais.`);
  };

  const acoesDe = (u: UsuarioCadastro): Acao[] => (u.id === eu?.id ? [] : [
    { texto: 'Editar nome', icone: <EditIcon fontSize="small" />, aoClicar: () => setPopup({ aberto: true, usuario: u }) },
    { texto: 'Senha nova (esqueceu)', icone: <KeyIcon fontSize="small" />, aoClicar: () => senhaNova(u) },
    u.ativo
      ? { texto: 'Desativar', icone: <PersonOffIcon fontSize="small" />, perigo: true, separarAntes: true, aoClicar: () => desativar(u) }
      : { texto: 'Ativar', icone: <HowToRegIcon fontSize="small" />, separarAntes: true, aoClicar: () => alterar(u, { ativo: true }, `${u.nome} pode entrar de novo.`) },
  ]);

  const filtrosEscola = souAdmin ? [
    <FiltroSelect key="escola" rotulo="Escola" valor={escola} aoMudar={setEscola} opcoes={[
      { valor: '', rotulo: 'Todas as escolas' },
      ...(escolas || []).map((e) => ({ valor: e.id, rotulo: e.nome, qtd: todos.filter((u) => u.escola_id === e.id).length })),
      { valor: SEM_ESCOLA, rotulo: 'Sem escola (admin. e avulsos)', qtd: todos.filter((u) => !u.escola_id).length },
    ]} />,
  ] : [];

  return (
    <>
      <CabecalhoPagina titulo="Usuários"
        subtitulo={souAdmin ? 'Administradores, coordenação e professores de todas as escolas.' : 'Coordenação e professores da escola.'}
        textoNovo="Novo usuário" aoNovo={() => setPopup({ aberto: true, usuario: null })} />

      {carregando && <CarregandoLista />}
      {erro && <ErroLista mensagem={erro} aoTentar={recarregar} />}

      {usuarios && (
        <>
          <BarraFiltros busca={busca} aoBuscar={setBusca} rotuloBusca="Buscar por nome ou e-mail" qtdFiltros={filtrosEscola.length + 2}
            mostrando={lista.length} total={todos.length} nomeItens={['usuário', 'usuários']} filtrando={filtrando} aoLimpar={limpar}
            filtros={<>
              {filtrosEscola}
              <FiltroSelect rotulo="Perfil" valor={perfil} aoMudar={setPerfil} opcoes={[
                { valor: 'todos', rotulo: 'Todos', qtd: daSituacao.length },
                ...perfis.map((p) => ({ valor: p, rotulo: NOME_DO_PERFIL[p], qtd: daSituacao.filter((u) => u.perfil === p).length })),
              ]} />
              <FiltroSelect rotulo="Situação" valor={situacao} aoMudar={setSituacao} opcoes={[
                { valor: 'todos', rotulo: 'Todas', qtd: doPerfil.length },
                ...SITUACOES.map((s) => ({ valor: s.valor, rotulo: s.rotulo, qtd: doPerfil.filter((u) => situacaoDe(u) === s.valor).length })),
              ]} />
            </>} />

          {lista.length === 0 ? (
            filtrando
              ? <ListaVazia icone="🔍" titulo="Ninguém com esse filtro" acao={<Button onClick={limpar}>Limpar filtros</Button>} />
              : <ListaVazia icone="👥" titulo="Ninguém cadastrado ainda" texto="Cadastre a coordenação e os professores."
                  acao={<Button variant="contained" onClick={() => setPopup({ aberto: true, usuario: null })}>＋ Novo usuário</Button>} />
          ) : (
            <GradeCartoes>
              {lista.map((u) => {
                const s = situacaoDe(u);
                return (
                  <Card key={u.id} variant="outlined" sx={{ opacity: u.ativo ? 1 : 0.65 }}>
                    <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', '&:last-child': { pb: 2 } }}>
                      <Avatar sx={{ bgcolor: u.ativo ? 'primary.main' : 'grey.400', width: 48, height: 48, fontWeight: 800 }}>{iniciais(u.nome)}</Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="h6" component="h2" sx={{ lineHeight: 1.25 }}>
                          {u.nome}{u.id === eu?.id && <Typography component="span" color="text.secondary"> (você)</Typography>}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>{u.email}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
                          <Chip size="small" color={COR_DO_PERFIL[u.perfil]} label={NOME_DO_PERFIL[u.perfil]} />
                          {souAdmin && (u.escola
                            ? <Chip size="small" variant="outlined" label={u.escola.nome} />
                            : u.perfil === 'professor' && <Chip size="small" variant="outlined" label="Avulso" />)}
                          {s === 'novo' && <Chip size="small" color="warning" variant="outlined" label="Ainda não entrou" />}
                          {s === 'desativado' && <Chip size="small" label="Desativado" />}
                        </Stack>
                        {s === 'ativo' && u.ultimo_acesso && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Último acesso {haQuanto(u.ultimo_acesso)}</Typography>
                        )}
                      </Box>
                      <MenuAcoes rotulo={`Ações de ${u.nome}`} acoes={acoesDe(u)} />
                    </CardContent>
                  </Card>
                );
              })}
            </GradeCartoes>
          )}
        </>
      )}

      <PopupUsuario aberto={popup.aberto} usuario={popup.usuario} souAdmin={souAdmin} escolas={escolas || []} escolaSugerida={escolaSugerida}
        aoFechar={() => setPopup({ aberto: false, usuario: null })}
        aoSalvar={(u, senha) => {
          const editando = !!popup.usuario;
          setPopup({ aberto: false, usuario: null });
          recarregar();
          if (editando) avisar('Nome salvo.');
          else setAcesso({ titulo: 'Cadastro feito', nome: u.nome, email: u.email, senha });
        }} />
      <DadosDeAcesso acesso={acesso} aoFechar={() => setAcesso(null)} />
    </>
  );
}
