// A área da família (/familia): a lista de filhos e a página de cada um (docs/PLANO-FAMILIA.md, fase 3).
import { Navigate, Route, Routes } from 'react-router-dom';
import ListaFilhos from './ListaFilhos';
import FilhoFamilia from './FilhoFamilia';

export default function AreaFamilia() {
  return (
    <Routes>
      <Route index element={<ListaFilhos />} />
      <Route path=":id" element={<FilhoFamilia />} />
      <Route path="*" element={<Navigate to="/familia" replace />} />
    </Routes>
  );
}
