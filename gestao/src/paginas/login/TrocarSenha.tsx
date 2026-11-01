// Troca de senha: obrigatória no primeiro acesso (sem botão de fechar) e opcional pelo menu do usuário.
import { useEffect, useRef, useState } from 'react';
import { Stack, TextField, Typography } from '@mui/material';
import Popup from '../../components/Popup';
import { api, mensagemDoErro } from '../../lib/api';
import { useAuth } from '../../lib/auth';

const MINIMO = 8;

export default function TrocarSenha({ aberto, obrigatoria, aoFechar }: { aberto: boolean; obrigatoria?: boolean; aoFechar: () => void }) {
  const { senhaTrocada } = useAuth();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [nova2, setNova2] = useState('');
  const [erro, setErro] = useState('');
  const [campoComErro, setCampoComErro] = useState<'' | 'atual' | 'nova' | 'nova2'>('');
  const [salvando, setSalvando] = useState(false);
  const refs = { atual: useRef<HTMLInputElement>(null), nova: useRef<HTMLInputElement>(null), nova2: useRef<HTMLInputElement>(null) };

  useEffect(() => { if (aberto) { setAtual(''); setNova(''); setNova2(''); setErro(''); setCampoComErro(''); } }, [aberto]);

  const falhar = (campo: 'atual' | 'nova' | 'nova2', mensagem: string) => {
    setErro(mensagem);
    setCampoComErro(campo);
    refs[campo].current?.focus();
  };

  const salvar = async () => {
    if (!atual) return falhar('atual', 'Digite a senha atual.');
    if (nova.length < MINIMO) return falhar('nova', `A senha nova precisa ter ${MINIMO} caracteres ou mais.`);
    if (nova !== nova2) return falhar('nova2', 'As duas senhas novas não são iguais.');
    setSalvando(true);
    setErro('');
    setCampoComErro('');
    try {
      await api('/usuarios/eu/senha', { metodo: 'PUT', corpo: { senhaAtual: atual, novaSenha: nova } });
      senhaTrocada();
      aoFechar();
    } catch (e) {
      falhar('atual', mensagemDoErro(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Popup aberto={aberto} titulo={obrigatoria ? 'Crie a sua senha' : 'Trocar senha'} aoFechar={aoFechar}
      aoSalvar={salvar} salvando={salvando} erro={erro} semFechar={obrigatoria}>
      <Stack spacing={2}>
        {obrigatoria && <Typography>Primeiro acesso: crie a sua senha ({MINIMO} caracteres ou mais).</Typography>}
        <TextField label={obrigatoria ? 'Senha que você recebeu' : 'Senha atual'} type="password" autoComplete="current-password"
          value={atual} onChange={(e) => setAtual(e.target.value)} inputRef={refs.atual} error={campoComErro === 'atual'} autoFocus />
        <TextField label="Senha nova" type="password" autoComplete="new-password"
          value={nova} onChange={(e) => setNova(e.target.value)} inputRef={refs.nova} error={campoComErro === 'nova'} />
        <TextField label="Repita a senha nova" type="password" autoComplete="new-password"
          value={nova2} onChange={(e) => setNova2(e.target.value)} inputRef={refs.nova2} error={campoComErro === 'nova2'} />
      </Stack>
    </Popup>
  );
}
