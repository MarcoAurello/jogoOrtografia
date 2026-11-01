// Quem está logado na gestão. Ao abrir, confere o token com GET /sessions/eu (o mesmo token do app dos jogos).
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, definirEscolaDoAdmin, EVENTO_SESSAO_EXPIRADA, guardarToken, lerEscolaDoAdmin, lerToken } from './api';
import type { Usuario } from '../types';

interface ContextoAuth {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<Usuario>;
  sair: () => void;
  entrarNaEscola: (idEscola: string) => Promise<void>;
  sairDaEscola: () => Promise<void>;
  senhaTrocada: () => void;
}

const Contexto = createContext<ContextoAuth | null>(null);

async function buscarEu() {
  const { usuario } = await api<{ usuario: Usuario }>('/sessions/eu');
  return usuario;
}

export function ProvedorAuth({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!lerToken()) { setCarregando(false); return; }
    buscarEu()
      .then(setUsuario)
      .catch(async () => {
        // a escola em que o admin tinha entrado pode ter sumido (404): tenta de novo sem ela
        if (lerToken() && lerEscolaDoAdmin()) {
          definirEscolaDoAdmin('');
          try { setUsuario(await buscarEu()); } catch { setUsuario(null); }
        } else setUsuario(null);
      })
      .finally(() => setCarregando(false));

    const expirou = () => { definirEscolaDoAdmin(''); setUsuario(null); };
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const r = await api<{ token: string; usuario: Usuario }>('/sessions', { metodo: 'POST', corpo: { email, senha } });
    definirEscolaDoAdmin('');
    guardarToken(r.token);
    setUsuario(r.usuario);
    return r.usuario;
  }, []);

  const sair = useCallback(() => {
    guardarToken('');
    definirEscolaDoAdmin('');
    setUsuario(null);
  }, []);

  // o administrador "entra" numa escola: daí em diante a API o trata como a coordenação dela (cabeçalho X-Escola)
  const entrarNaEscola = useCallback(async (idEscola: string) => {
    definirEscolaDoAdmin(idEscola);
    try { setUsuario(await buscarEu()); } catch (e) { definirEscolaDoAdmin(''); throw e; }
  }, []);

  const sairDaEscola = useCallback(async () => {
    definirEscolaDoAdmin('');
    setUsuario(await buscarEu());
  }, []);

  const senhaTrocada = useCallback(() => setUsuario((u) => (u ? { ...u, primeiro_login: false } : u)), []);

  return (
    <Contexto.Provider value={{ usuario, carregando, entrar, sair, entrarNaEscola, sairDaEscola, senhaTrocada }}>
      {children}
    </Contexto.Provider>
  );
}

export function useAuth() {
  const c = useContext(Contexto);
  if (!c) throw new Error('useAuth fora do ProvedorAuth');
  return c;
}
