import { Op } from "sequelize";
import Aluno, { AlunoTurma } from "../models/Aluno";
import { TurmaProfessor } from "../models/Turma";
import Usuario from "../models/Usuario";

// O aluno é da escola e pode estar em várias turmas (aluno_turmas) ou em nenhuma (só mapeado para análise).
// Quem enxerga e quem mexe:
//   - administrador: tudo;
//   - coordenação: os alunos da escola dela (com ou sem turma);
//   - professor: VÊ os alunos da escola (e as anamneses deles); MEXE só nos alunos das turmas dele
//     (cadastro, aplicar anamnese, ficha dos jogos). Professor avulso (sem escola): só os alunos das turmas dele.

export async function turmasDoProfessor(usuarioId: string): Promise<string[]> {
  const minhas = await TurmaProfessor.findAll({ where: { usuario_id: usuarioId } }) as unknown as { turma_id: string }[];
  return minhas.map((m) => m.turma_id);
}

// as turmas (ids) de um aluno; soAtivas: só onde ele não foi desativado
export async function turmasDoAluno(alunoId: string, soAtivas = false): Promise<string[]> {
  const ligacoes = await AlunoTurma.findAll({ where: { aluno_id: alunoId, ...(soAtivas ? { ativo: true } : {}) } });
  return ligacoes.map((l) => l.turma_id);
}

// os alunos de uma turma (ativos na escola e na turma, se soAtivos)
export async function alunosDaTurma(turmaId: string, soAtivos = true): Promise<Aluno[]> {
  const ligacoes = await AlunoTurma.findAll({ where: { turma_id: turmaId, ...(soAtivos ? { ativo: true } : {}) } });
  if (!ligacoes.length) return [];
  return Aluno.findAll({ where: { id: { [Op.in]: ligacoes.map((l) => l.aluno_id) }, ...(soAtivos ? { ativo: true } : {}) }, order: [["nome", "ASC"]] });
}

// liga o aluno à turma (ou reativa a ligação)
export async function vincular(alunoId: string, turmaId: string) {
  const [ligacao, criada] = await AlunoTurma.findOrCreate({ where: { aluno_id: alunoId, turma_id: turmaId }, defaults: { aluno_id: alunoId, turma_id: turmaId } });
  if (!criada && !ligacao.ativo) { ligacao.ativo = true; await ligacao.save(); }
}

async function alunoEstaNasTurmasDoProfessor(usuario: Usuario, aluno: Aluno): Promise<boolean> {
  const minhas = await turmasDoProfessor(usuario.id);
  if (!minhas.length) return false;
  return !!(await AlunoTurma.findOne({ where: { aluno_id: aluno.id, turma_id: { [Op.in]: minhas } } }));
}

// ver o aluno (cadastro e anamneses)
export async function podeVerAluno(usuario: Usuario, aluno: Aluno): Promise<boolean> {
  if (usuario.perfil === "admin") return true;
  if (usuario.escola_id && aluno.escola_id === usuario.escola_id) return true;   // coordenação e professores da escola
  return usuario.perfil === "professor" && alunoEstaNasTurmasDoProfessor(usuario, aluno);   // professor avulso
}

// mexer no aluno (cadastro, turmas, aplicar anamnese, ficha dos jogos)
export async function podeEditarAluno(usuario: Usuario, aluno: Aluno): Promise<boolean> {
  if (usuario.perfil === "admin") return true;
  if (usuario.perfil === "coordenacao") return !!usuario.escola_id && aluno.escola_id === usuario.escola_id;
  return alunoEstaNasTurmasDoProfessor(usuario, aluno);
}

// os alunos que a pessoa vê na lista da escola (filtro do Sequelize)
export async function filtroDosAlunosVisiveis(usuario: Usuario): Promise<Record<string, unknown>> {
  if (usuario.perfil === "admin") return usuario.escola_id ? { escola_id: usuario.escola_id } : {};
  if (usuario.escola_id) return { escola_id: usuario.escola_id };
  const minhas = await turmasDoProfessor(usuario.id);
  const ligacoes = minhas.length ? await AlunoTurma.findAll({ where: { turma_id: { [Op.in]: minhas } } }) : [];
  return { id: { [Op.in]: ligacoes.map((l) => l.aluno_id) } };
}
