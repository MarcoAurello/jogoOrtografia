// Confirmação das ações destrutivas (desativar, apagar): const ok = await confirmar({ ... }).
import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

interface Pedido {
  titulo: string;
  texto: ReactNode;
  botao: string;
  perigo?: boolean;   // botão vermelho
}

const Contexto = createContext<(p: Pedido) => Promise<boolean>>(async () => false);

export function ProvedorConfirmar({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const resposta = useRef<(ok: boolean) => void>();

  const confirmar = useCallback((p: Pedido) => new Promise<boolean>((resolver) => {
    resposta.current = resolver;
    setPedido(p);
  }), []);

  const responder = (ok: boolean) => { resposta.current?.(ok); setPedido(null); };

  return (
    <Contexto.Provider value={confirmar}>
      {children}
      <Dialog open={!!pedido} onClose={() => responder(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{pedido?.titulo}</DialogTitle>
        <DialogContent><DialogContentText component="div">{pedido?.texto}</DialogContentText></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => responder(false)}>Cancelar</Button>
          <Button variant="contained" color={pedido?.perigo ? 'error' : 'primary'} onClick={() => responder(true)} autoFocus>
            {pedido?.botao}
          </Button>
        </DialogActions>
      </Dialog>
    </Contexto.Provider>
  );
}

export const useConfirmar = () => useContext(Contexto);
