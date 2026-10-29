import Turma, { TurmaProfessor } from "../models/Turma";
import Usuario from "../models/Usuario";

// quem enxerga uma turma: o administrador, todas; a coordenação, as da escola dela; o professor, as que ele dá aula
export async function turmaDoUsuario(usuario: Usuario, turmaId: string): Promise<Turma | null> {
  const turma = await Turma.findByPk(turmaId);
  if (!turma) return null;
  if (usuario.perfil === "admin") return turma;
  if (usuario.perfil === "coordenacao") return turma.escola_id === usuario.escola_id ? turma : null;
  const vinculo = await TurmaProfessor.findOne({ where: { turma_id: turma.id, usuario_id: usuario.id } });
  return vinculo ? turma : null;
}

// letras do código da turma: sem 0/O e 1/I, que se confundem (as mesmas do código de competição)
const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export async function codigoNovo(): Promise<string> {
  for (;;) {
    const codigo = Array.from({ length: 5 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join("");
    if (!(await Turma.findOne({ where: { codigo } }))) return codigo;
  }
}
