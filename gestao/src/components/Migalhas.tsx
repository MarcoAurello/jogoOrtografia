// Caminho até a tela ("Turmas › 3º ano B › Painel"): mostra onde a pessoa está e volta um nível com um toque.
import { Link as LinkRouter } from 'react-router-dom';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export default function Migalhas({ itens }: { itens: { texto: string; para?: string }[] }) {
  return (
    <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="Caminho" sx={{ mb: 1, '@media print': { display: 'none' } }}>
      {itens.map((i) => (i.para
        ? <Link key={i.texto} component={LinkRouter} to={i.para} underline="hover" color="inherit" sx={{ py: 1 }}>{i.texto}</Link>
        : <Typography key={i.texto} color="text.primary" noWrap sx={{ maxWidth: 220 }}>{i.texto}</Typography>))}
    </Breadcrumbs>
  );
}
