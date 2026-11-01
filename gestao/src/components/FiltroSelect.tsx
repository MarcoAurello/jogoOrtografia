// Filtro em select com a quantidade em cada opção ("Ativas (14)"). Opção com 0 fica apagada, mas pode ser escolhida
// (o número muda conforme a busca e os outros filtros).
import { MenuItem, TextField } from '@mui/material';

export interface OpcaoFiltro { valor: string; rotulo: string; qtd?: number }

interface Props {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  opcoes: OpcaoFiltro[];
}

const comQtd = (o: OpcaoFiltro) => (o.qtd === undefined ? o.rotulo : `${o.rotulo} (${o.qtd})`);

export default function FiltroSelect({ rotulo, valor, aoMudar, opcoes }: Props) {
  return (
    // displayEmpty + shrink: a opção "Todas" pode ter valor vazio e mesmo assim aparecer escrita no campo
    <TextField select fullWidth label={rotulo} value={valor} onChange={(e) => aoMudar(e.target.value)}
      SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
      {opcoes.map((o) => (
        <MenuItem key={o.valor} value={o.valor} sx={{ minHeight: 44, color: o.qtd === 0 ? 'text.disabled' : undefined }}>
          {comQtd(o)}
        </MenuItem>
      ))}
    </TextField>
  );
}
