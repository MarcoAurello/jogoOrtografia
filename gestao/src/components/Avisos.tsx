// Avisos rápidos de sucesso ("Escola criada ✔") embaixo da tela. Erro de formulário não vai aqui: fica perto dos
// botões do popup; erro de uma ação da lista (desativar, mudar plano) vai aqui como "error".
import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

type Tipo = 'success' | 'error' | 'info';
interface Aviso { id: number; texto: string; tipo: Tipo }

const Contexto = createContext<(texto: string, tipo?: Tipo) => void>(() => {});

export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const avisar = useCallback((texto: string, tipo: Tipo = 'success') => setAviso({ id: Date.now(), texto, tipo }), []);
  const fechar = (_?: unknown, motivo?: string) => { if (motivo !== 'clickaway') setAviso(null); };

  return (
    <Contexto.Provider value={avisar}>
      {children}
      <Snackbar key={aviso?.id} open={!!aviso} onClose={fechar} autoHideDuration={aviso?.tipo === 'error' ? 8000 : 5000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={fechar} severity={aviso?.tipo || 'success'} variant="filled" sx={{ width: '100%', maxWidth: 560 }}>
          {aviso?.texto}
        </Alert>
      </Snackbar>
    </Contexto.Provider>
  );
}

export const useAvisos = () => useContext(Contexto);
