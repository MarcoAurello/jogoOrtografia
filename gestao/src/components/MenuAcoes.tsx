// Botão "⋮" com as ações secundárias de um cartão (as principais ficam à vista no cartão).
import { ReactNode, useState } from 'react';
import { Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export interface Acao {
  texto: string;
  icone?: ReactNode;
  aoClicar: () => void;
  perigo?: boolean;
  separarAntes?: boolean;
}

export default function MenuAcoes({ acoes, rotulo }: { acoes: Acao[]; rotulo: string }) {
  const [ancora, setAncora] = useState<HTMLElement | null>(null);
  if (!acoes.length) return null;
  return (
    <>
      <IconButton aria-label={rotulo} onClick={(e) => setAncora(e.currentTarget)}><MoreVertIcon /></IconButton>
      <Menu anchorEl={ancora} open={!!ancora} onClose={() => setAncora(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {acoes.flatMap((a) => [
          ...(a.separarAntes ? [<Divider key={`${a.texto}-sep`} />] : []),
          <MenuItem key={a.texto} sx={{ minHeight: 44, color: a.perigo ? 'error.main' : undefined }}
            onClick={() => { setAncora(null); a.aoClicar(); }}>
            {a.icone && <ListItemIcon sx={{ color: 'inherit' }}>{a.icone}</ListItemIcon>}
            <ListItemText>{a.texto}</ListItemText>
          </MenuItem>,
        ])}
      </Menu>
    </>
  );
}
