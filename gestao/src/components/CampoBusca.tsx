// Campo de busca das listas: avisa a busca 150 ms depois da última tecla (não refiltra a cada letra).
import { useEffect, useState } from 'react';
import { InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface Props {
  valor: string;
  aoMudar: (valor: string) => void;
  rotulo?: string;
  autoFocus?: boolean;
}

export default function CampoBusca({ valor, aoMudar, rotulo = 'Buscar', autoFocus }: Props) {
  const [texto, setTexto] = useState(valor);

  useEffect(() => { setTexto(valor); }, [valor]);
  useEffect(() => {
    if (texto === valor) return;
    const espera = setTimeout(() => aoMudar(texto), 150);
    return () => clearTimeout(espera);
  }, [texto, valor, aoMudar]);

  return (
    <TextField
      fullWidth
      type="search"
      label={rotulo}
      value={texto}
      autoFocus={autoFocus}
      onChange={(e) => setTexto(e.target.value)}
      InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
    />
  );
}
