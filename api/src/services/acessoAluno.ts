import { Op } from "sequelize";
import Aluno, { AlunoTurma } from "../models/Aluno";
import { TurmaProfessor } from "../models/Turma";
import Usuario, { VisivelFamilia } from "../models/Usuario";
import Escola from "../models/Escola";
import { ResponsavelAluno } from "../models/Familia";

// O aluno é da escola e pode estar em várias turmas (aluno_turmas) ou em nenhuma (só mapeado para análise).
// Quem enxerga e quem mexe:
//   - administrador: tudo;
//   - coordenação: os alunos da escola dela (com ou sem turma);
//   - professor: VÊ os alunos da escola (e as anamneses deles); MEXE só nos alunos das turmas dele
//     (cadastro, aplicar anamnese, ficha dos jogos). Professor avulso (sem escola): só os alunos das turmas dele.
//   - responsável (família): só os filhos ligados a ele (responsavel_alunos), e só pelas rotas /familia: as rotas dos
//     profissionais barram o perfil logo na entrada (carregarUsuarioLogado). O que ele vê de cada filho passa por
//     familiaPodeVer; observações internas, nunca.

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

// o responsável está ligado a este aluno?
export async function ehResponsavelDe(usuarioId: string, alunoId: string): Promise<boolean> {
  return !!(await ResponsavelAluno.findOne({ where: { responsavel_id: usuarioId, aluno_id: alunoId } }));
}

// ver o aluno (cadastro e anamneses)
export async function podeVerAluno(usuario: Usuario, aluno: Aluno): Promise<boolean> {
  if (usuario.perfil === "admin") return true;
  if (usuario.perfil === "responsavel") return ehResponsavelDe(usuario.id, aluno.id);
  if (usuario.escola_id && aluno.escola_id === usuario.escola_id) return true;   // coordenação e professores da escola
  if (usuario.perfil === "professor" && aluno.professor_id === usuario.id) return true;   // paciente sem turma do avulso
  return usuario.perfil === "professor" && alunoEstaNasTurmasDoProfessor(usuario, aluno);   // professor avulso
}

// mexer no aluno (cadastro, turmas, aplicar anamnese, ficha dos jogos); o responsável mexe só nos dados cadastrais e
// na anamnese do próprio filho (rotas /familia)
export async function podeEditarAluno(usuario: Usuario, aluno: Aluno): Promise<boolean> {
  if (usuario.perfil === "admin") return true;
  if (usuario.perfil === "responsavel") return ehResponsavelDe(usuario.id, aluno.id);
  if (usuario.perfil === "coordenacao") return !!usuario.escola_id && aluno.escola_id === usuario.escola_id;
  if (aluno.professor_id === usuario.id) return true;   // paciente sem turma do professor avulso
  return alunoEstaNasTurmasDoProfessor(usuario, aluno);
}

// a equipe redefine o PIN do aluno cadastrado (a criança esqueceu ou ficou travada): quem mexe no aluno — coordenação,
// administrador, professor das turmas dele e o professor avulso dono do paciente. O responsável troca pela área dele.
export async function podeRedefinirPin(usuario: Usuario, aluno: Aluno): Promise<boolean> {
  return usuario.perfil !== "responsavel" && podeEditarAluno(usuario, aluno);
}

// decidir sobre a família do aluno (o que ela vê, tirar um responsável, dar senha provisória ao responsável):
// coordenação/administrador da escola e o professor avulso dono do aluno; o professor de uma escola, não
export async function podeDecidirFamilia(usuario: Usuario, aluno: Aluno): Promise<boolean> {
  if (usuario.perfil === "responsavel" || (usuario.perfil === "professor" && usuario.escola_id)) return false;
  return podeEditarAluno(usuario, aluno);
}

// os alunos que a pessoa vê na lista da escola (filtro do Sequelize)
export async function filtroDosAlunosVisiveis(usuario: Usuario): Promise<Record<string, unknown>> {
  if (usuario.perfil === "admin") return usuario.escola_id ? { escola_id: usuario.escola_id } : {};
  if (usuario.perfil === "responsavel") {
    const filhos = await ResponsavelAluno.findAll({ where: { responsavel_id: usuario.id } });
    return { id: { [Op.in]: filhos.map((f) => f.aluno_id) } };
  }
  if (usuario.escola_id) return { escola_id: usuario.escola_id };
  const minhas = await turmasDoProfessor(usuario.id);
  const ligacoes = minhas.length ? await AlunoTurma.findAll({ where: { turma_id: { [Op.in]: minhas } } }) : [];
  // professor avulso: os alunos das turmas dele e os pacientes sem turma (cadastrados pela família no link dele)
  return { [Op.or]: [{ id: { [Op.in]: ligacoes.map((l) => l.aluno_id) } }, { professor_id: usuario.id }] };
}

// ---------- o que a família vê ----------

// A escola (e o professor avulso, para os pacientes dele) liga e desliga cada relatório para a família; a ficha do
// aluno pode ter uma exceção, que vale por cima. Cada um controla o que produziu: o recado, o plano e a anamnese seguem
// a regra de quem escreveu (a escola do autor, ou o próprio autor se for professor avulso); os jogos seguem a escola do
// aluno (ou o professor avulso das turmas dele). Sem escola nem profissional (compra avulsa): a família vê tudo, menos
// anamnese, que esse aluno não tem (se depois for ligado a uma psicopedagoga, valem as regras dela).
export const RELATORIOS_FAMILIA = ["jogos", "recados", "plano", "anamnese"] as const;
export type RelatorioFamilia = typeof RELATORIOS_FAMILIA[number];
export const PADRAO_FAMILIA: Record<RelatorioFamilia, boolean> = { jogos: true, recados: true, plano: false, anamnese: false };

// as chaves completas (o que não foi salvo fica no padrão)
export function chavesFamilia(salvo: VisivelFamilia | undefined): Record<RelatorioFamilia, boolean> {
  const chaves = { ...PADRAO_FAMILIA };
  for (const r of RELATORIOS_FAMILIA) if (typeof salvo?.[r] === "boolean") chaves[r] = salvo[r]!;
  return chaves;
}

// só as chaves conhecidas com true/false (e null, se permitirNulo: tira a exceção)
export function lerChavesFamilia(entrada: unknown, permitirNulo = false): Record<string, boolean | null> {
  const b = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;
  const lidas: Record<string, boolean | null> = {};
  for (const r of RELATORIOS_FAMILIA) {
    if (typeof b[r] === "boolean") lidas[r] = b[r] as boolean;
    else if (permitirNulo && b[r] === null) lidas[r] = null;
  }
  return lidas;
}

type Dono = { visivel_familia: VisivelFamilia | undefined } | null;

// quem manda no que a família vê de um conteúdo: a escola do autor, o autor professor avulso ou, sem autor (jogos),
// a escola do aluno ou o professor avulso das turmas dele
async function donoDoConteudo(aluno: Aluno, autorId: string | null | undefined): Promise<Dono> {
  if (autorId) {
    const autor = await Usuario.findByPk(autorId);
    if (autor?.escola_id) return Escola.findByPk(autor.escola_id);
    if (autor?.perfil === "professor") return autor;
  }
  if (aluno.escola_id) return Escola.findByPk(aluno.escola_id);
  if (aluno.professor_id) return Usuario.findByPk(aluno.professor_id);
  const turmas = await turmasDoAluno(aluno.id);
  const professor = turmas.length ? await TurmaProfessor.findOne({ where: { turma_id: { [Op.in]: turmas } } }) as unknown as { usuario_id: string } | null : null;
  return professor ? Usuario.findByPk(professor.usuario_id) : null;
}

// a família pode ver este relatório do aluno? (autorId: quem produziu o conteúdo; sem ele, vale a escola do aluno)
export async function familiaPodeVer(aluno: Aluno, relatorio: RelatorioFamilia, autorId?: string | null): Promise<boolean> {
  return verificadorFamilia(aluno)(relatorio, autorId);
}

// o mesmo, para conferir uma lista inteira (recados, planos) sem buscar o dono de novo a cada item;
// ignorarExcecao: a regra sem a exceção do aluno (a ficha mostra "seguir a escola: ligado/desligado")
export function verificadorFamilia(aluno: Aluno, ignorarExcecao = false) {
  const donos = new Map<string, Promise<Dono>>();
  return async (relatorio: RelatorioFamilia, autorId?: string | null): Promise<boolean> => {
    const chave = autorId || "";
    if (!donos.has(chave)) donos.set(chave, donoDoConteudo(aluno, autorId));
    const dono = await donos.get(chave)!;
    if (!dono) return relatorio !== "anamnese";   // compra avulsa: tudo, menos anamnese (nem a exceção liga)
    const excecao = ignorarExcecao ? undefined : aluno.visivel_familia?.[relatorio];
    if (typeof excecao === "boolean") return excecao;
    return chavesFamilia(dono.visivel_familia)[relatorio];
  };
}

// o aluno tem escola ou profissional (escola, professor avulso dono ou das turmas dele)? Sem nenhum = compra avulsa,
// que joga e tem relatórios, mas não tem anamnese
export async function alunoTemDono(aluno: Aluno): Promise<boolean> {
  return !!(await donoDoConteudo(aluno, null));
}
