// As rotas dentro de /modelos-anamnese: a lista e o editor (novo ou um modelo).
import { Route, Routes } from 'react-router-dom';
import Modelos from './Modelos';
import EditorModelo from './EditorModelo';

export default function AreaModelos() {
  return (
    <Routes>
      <Route index element={<Modelos />} />
      <Route path=":id" element={<EditorModelo />} />
    </Routes>
  );
}
