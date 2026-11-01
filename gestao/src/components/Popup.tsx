// Popup padrão dos cadastros: no celular ocupa a tela toda; no PC fica no centro (560px, ou 760px se "largo").
// O cabeçalho e os botões Cancelar / Salvar ficam presos e sempre visíveis; o erro aparece perto dos botões.
import { FormEvent, ReactNode } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

interface Props {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  aoSalvar?: () => void;      // sem ele, o popup só tem o botão Fechar
  textoSalvar?: string;
  salvando?: boolean;
  erro?: string;
  largo?: boolean;
  semFechar?: boolean;        // ex.: troca de senha obrigatória no primeiro acesso
}

export default function Popup({ aberto, titulo, aoFechar, children, aoSalvar, textoSalvar = 'Salvar', salvando, erro, largo, semFechar }: Props) {
  const tema = useTheme();
  const celular = useMediaQuery(tema.breakpoints.down('sm'));

  const enviar = (e: FormEvent) => { e.preventDefault(); if (!salvando) aoSalvar?.(); };
  const fechar = () => { if (!semFechar && !salvando) aoFechar(); };

  return (
    <Dialog
      open={aberto}
      onClose={fechar}
      fullScreen={celular}
      fullWidth
      maxWidth={false}
      PaperProps={{ component: 'form', onSubmit: enviar, noValidate: true, sx: celular ? {} : { maxWidth: largo ? 760 : 560 } } as object}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ flex: 1 }}>{titulo}</Box>
        {!semFechar && (
          <IconButton aria-label="Fechar" onClick={fechar}><CloseIcon /></IconButton>
        )}
      </DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>{children}</DialogContent>
      <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
        {erro && <Alert severity="error" role="alert" sx={{ mx: 2, mt: 1.5 }}>{erro}</Alert>}
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          {!semFechar && <Button onClick={fechar} disabled={salvando}>{aoSalvar ? 'Cancelar' : 'Fechar'}</Button>}
          {aoSalvar && (
            <Button type="submit" variant="contained" disabled={salvando} startIcon={salvando ? <CircularProgress size={18} color="inherit" /> : undefined}>
              {textoSalvar}
            </Button>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
}
