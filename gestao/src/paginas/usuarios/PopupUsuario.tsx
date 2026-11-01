// Novo usuário (nome, e-mail, perfil, escola e senha provisória) ou editar o nome de quem já existe.
// O administrador escolhe a escola; a coordenação cadastra só na própria escola (a API garante).
import { useEffect, useRef, useState } from 'react';
import { IconButton, InputAdornment, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import Popup from '../../components/Popup';
import { api, mensagemDoErro } from '../../lib/api';
import { NOME_DO_PERFIL } from '../../lib/menu';
import { SENHA_MINIMA, senhaAleatoria } from './senha';
import type { Escola, Perfil, UsuarioCadastro } from '../../types';

type Campo = 'nome' | 'email' | 'escola' | 'senha' | '';
const SEM_ESCOLA = '';

interface Props {
  aberto: boolean;
  usuario: UsuarioCadastro | null;   // null = novo
  souAdmin: boolean;                 // administrador fora de escola: escolhe escola e pode criar administrador
  escolas: Escola[];
  escolaSugerida: string;            // a do filtro da lista
  aoFechar: () => void;
  aoSalvar: (u: UsuarioCadastro, senha: string) => void;
}

const emailValido = (m: string) => /^[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}$/i.test(m);

export default function PopupUsuario({ aberto, usuario, souAdmin, escolas, escolaSugerida, aoFechar, aoSalvar }: Props) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState<Perfil>('professor');
  const [escolaId, setEscolaId] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [campoComErro, setCampoComErro] = useState<Campo>('');
  const [salvando, setSalvando] = useState(false);
  const refs = { nome: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null), escola: useRef<HTMLInputElement>(null), senha: useRef<HTMLInputElement>(null) };

  useEffect(() => {
    if (!aberto) return;
    setNome(usuario?.nome || '');
    setEmail(usuario?.email || '');
    setPerfil(usuario?.perfil || 'professor');
    setEscolaId(escolaSugerida);
    setSenha(senhaAleatoria());
    setErro('');
    setCampoComErro('');
  }, [aberto, usuario, escolaSugerida]);

  const falhar = (campo: Campo, mensagem: string) => {
    setErro(mensagem);
    setCampoComErro(campo);
    if (campo) setTimeout(() => refs[campo].current?.focus(), 50);
  };

  const mostrarEscola = souAdmin && !usuario && perfil !== 'admin';

  const salvar = async () => {
    if (!nome.trim()) return falhar('nome', 'Digite o nome.');
    if (usuario) {
      setSalvando(true);
      try { aoSalvar(await api<UsuarioCadastro>(`/usuarios/${usuario.id}`, { metodo: 'PUT', corpo: { nome: nome.trim() } }), ''); }
      catch (e) { falhar('nome', mensagemDoErro(e)); }
      finally { setSalvando(false); }
      return;
    }
    if (!emailValido(email.trim())) return falhar('email', 'Digite um e-mail válido, como nome@escola.com.');
    if (mostrarEscola && perfil === 'coordenacao' && escolaId === SEM_ESCOLA) return falhar('escola', 'A coordenação precisa de uma escola.');
    if (senha.length < SENHA_MINIMA) return falhar('senha', `A senha provisória precisa de ${SENHA_MINIMA} caracteres ou mais.`);
    setSalvando(true);
    setErro('');
    setCampoComErro('');
    try {
      const novo = await api<UsuarioCadastro>('/usuarios', { metodo: 'POST', corpo: {
        nome: nome.trim(), email: email.trim(), senha, perfil, escola_id: souAdmin ? (perfil === 'admin' ? null : escolaId || null) : undefined,
      } });
      aoSalvar(novo, senha);
    } catch (e) {
      const m = mensagemDoErro(e);
      falhar(/e-mail/i.test(m) ? 'email' : /senha/i.test(m) ? 'senha' : /escola/i.test(m) ? 'escola' : '', m);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Popup aberto={aberto} titulo={usuario ? `Editar ${usuario.nome}` : 'Novo usuário'} aoFechar={aoFechar} aoSalvar={salvar}
      textoSalvar={usuario ? 'Salvar' : 'Cadastrar'} salvando={salvando} erro={erro}>
      <Stack spacing={2.5}>
        <TextField label="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} inputRef={refs.nome}
          error={campoComErro === 'nome'} autoFocus autoComplete="off" />
        {usuario ? (
          <Typography color="text.secondary">{usuario.email} · {NOME_DO_PERFIL[usuario.perfil]}{usuario.escola ? ` · ${usuario.escola.nome}` : ''}</Typography>
        ) : (
          <>
            <TextField label="E-mail" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} inputRef={refs.email}
              error={campoComErro === 'email'} autoComplete="off" helperText="É o login da pessoa." />
            <TextField select label="Perfil" value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}
              helperText={perfil === 'coordenacao' ? 'Vê e cuida de tudo da escola, inclusive dos usuários.'
                : perfil === 'admin' ? 'Cuida de todas as escolas da plataforma.' : 'Cuida das turmas dele; vê os alunos da escola.'}>
              <MenuItem value="professor">Professor</MenuItem>
              <MenuItem value="coordenacao">Coordenação</MenuItem>
              {souAdmin && <MenuItem value="admin">Administrador (plataforma)</MenuItem>}
            </TextField>
            {mostrarEscola && (
              <TextField select label="Escola" value={escolaId} onChange={(e) => setEscolaId(e.target.value)} inputRef={refs.escola}
                error={campoComErro === 'escola'}>
                {escolas.map((e) => <MenuItem key={e.id} value={e.id}>{e.nome} (/{e.slug})</MenuItem>)}
                {perfil === 'professor' && <MenuItem value={SEM_ESCOLA}>Sem escola (professor avulso)</MenuItem>}
              </TextField>
            )}
            <TextField label="Senha provisória" value={senha} onChange={(e) => setSenha(e.target.value)} inputRef={refs.senha}
              error={campoComErro === 'senha'} autoComplete="off"
              helperText="A pessoa troca no primeiro acesso. Você vai poder copiar os dados depois de cadastrar."
              InputProps={{ sx: { fontFamily: 'monospace' }, endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Gerar outra senha"><IconButton aria-label="Gerar outra senha" onClick={() => setSenha(senhaAleatoria())}><CasinoIcon /></IconButton></Tooltip>
                </InputAdornment>
              ) }} />
          </>
        )}
      </Stack>
    </Popup>
  );
}
