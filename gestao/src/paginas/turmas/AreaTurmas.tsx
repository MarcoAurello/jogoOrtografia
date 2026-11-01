// As rotas dentro de /turmas: a lista, uma turma e o painel dela (o endereço muda, então o "voltar" do navegador
// e os links copiados funcionam).
import { Route, Routes } from 'react-router-dom';
import Turmas from './Turmas';
import TurmaDetalhe from './TurmaDetalhe';
import PainelTurma from './PainelTurma';

export default function AreaTurmas() {
  return (
    <Routes>
      <Route index element={<Turmas />} />
      <Route path=":id" element={<TurmaDetalhe />} />
      <Route path=":id/painel" element={<PainelTurma />} />
    </Routes>
  );
}
