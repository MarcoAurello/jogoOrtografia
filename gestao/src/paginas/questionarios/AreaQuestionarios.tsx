// As rotas dentro de /questionarios: a lista e o editor de um questionário novo (ou de uma cópia: ?de=<id>).
import { Route, Routes } from 'react-router-dom';
import Questionarios from './Questionarios';
import EditorQuestionario from './EditorQuestionario';

export default function AreaQuestionarios() {
  return (
    <Routes>
      <Route index element={<Questionarios />} />
      <Route path="novo" element={<EditorQuestionario />} />
    </Routes>
  );
}
