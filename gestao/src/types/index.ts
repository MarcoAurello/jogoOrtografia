// Tipos das respostas da API (api/src/controllers). Só os campos que a gestão usa.

export type Perfil = 'admin' | 'coordenacao' | 'professor' | 'responsavel';

// a marca da escola (Escola.marca() na API): o "id" aqui é o endereço (slug), não o id do banco
export interface MarcaEscola {
  id: string;
  nome: string;
  slogan: string;
  cor: string;
  destaque: string;
  logo: string;
  enviar_relatorios?: boolean;
  salvar_partidas?: boolean;
  bloqueada: boolean;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  primeiro_login: boolean;
  escola: MarcaEscola | null;
  adminNaEscola?: boolean;
}

// GET /escolas (só o administrador)
export interface Escola {
  id: string;
  slug: string;
  nome: string;
  slogan: string | null;
  cor: string;
  destaque: string;
  logo: string | null;
  script: string | null;
  enviar_relatorios: boolean;   // o relatório de cada partida vai por e-mail para o professor
  salvar_partidas: boolean;     // as partidas dos alunos ficam no banco (painel e ficha)
  ativa: boolean;
  plano: 'teste' | 'ativo';
  teste_ate: string | null;
  bloqueada: boolean;
  usuarios: number;
}

// GET /usuarios (admin: todos; coordenação: os da escola)
export interface UsuarioCadastro {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  escola_id: string | null;
  escola: { id: string; slug: string; nome: string } | null;
  ativo: boolean;
  primeiro_login: boolean;
  ultimo_acesso: string | null;
  created_at: string;
}

// GET /turmas: as turmas que a pessoa enxerga (professor: as dele; coordenação: as da escola)
export interface Turma {
  id: string;
  nome: string;
  codigo: string;
  escola_id: string | null;
  ano_letivo: number;
  ativa: boolean;
  salvar_partidas: boolean;
  professores: { id: string; nome: string }[];
  alunos: number;
}

// GET /turmas/:id/alunos
export interface AlunoDaTurma {
  id: string;
  nome: string;
  nome_completo: string | null;
  ativo: boolean;            // ativo na escola e nesta turma
  salvar_partidas: boolean;
  partidas: number;
  ultima_partida: string | null;
}

// GET /turmas/:id/partidas
export interface PartidaDaTurma {
  id: string;
  jogo: string;
  titulo: string;
  acertos: number;
  total: number;
  estrelas: number;
  jogada_em: string;
  resumo: { competicao?: string } | unknown[] | null;
  aluno: { id: string; nome: string } | null;
}

export interface Semana { semana: string; partidas: number; acerto: number | null; alunos?: number; minutos?: number }

// GET /turmas/:id/painel
export interface PainelTurma {
  turma: { id: string; nome: string; codigo: string };
  dias: number;
  resumo: { alunos: number; jogaram: number; partidas: number; acerto: number | null; minutos: number };
  alunos: { id: string; nome: string; partidas: number; acerto: number | null; minutos: number; ultima: string | null }[];
  habilidades: { habilidade: string; acerto: number | null; respostas: number; alunos: number; comDificuldade: number }[];
  dificuldades: { habilidade: string; acerto: number | null; respostas: number; alunos: number; comDificuldade: number }[];
  semanas: Semana[];
  semJogar: string[];
}

export interface PerguntaAnamnese { id: string; tipo: string; texto: string; opcoes?: string[]; obrigatoria?: boolean }

// GET /alunos (alunos da escola) e o "aluno" de GET /alunos/:id
export interface AlunoDaEscola {
  id: string;
  nome: string;
  ativo: boolean;
  nome_completo: string | null;
  data_nascimento: string | null;
  responsavel_nome: string | null;
  responsavel_contato: string | null;
  // em GET /alunos/:id é o texto livre do cadastro; em GET /alunos (a lista) a API usa o mesmo nome para a quantidade
  // de observações de evolução
  observacoes: string | number | null;
  consentimento_em: string | null;
  turmas: { id: string; nome: string }[];
  anamneses: number;
  ultima_anamnese: string | null;
  pode_editar?: boolean;
  plano_ativo?: boolean;
  salvar_partidas?: boolean;
  aguardando_turma?: boolean;   // cadastrado pela família no link da escola, ainda sem turma
  escola_id?: string | null;
  escola?: string;
}

export interface AnamneseDoAluno {
  id: string;
  titulo: string;
  via: 'presencial' | 'link';
  status: 'respondida' | 'pendente' | 'expirada' | 'cancelada';
  perguntas: PerguntaAnamnese[];
  respostas: Record<string, unknown> | null;
  respondida_por_nome: string | null;
  respondida_em: string | null;
  expira_em: string | null;
  criada_em: string;
}

export interface ModeloAnamnese {
  id: string;
  titulo: string;
  perguntas: PerguntaAnamnese[];
  ativo: boolean;
  autor_id: string;
  meu: boolean;
  atualizado_em: string;
}

export interface Objetivo {
  id?: string;
  area: string;
  descricao: string;
  habilidades: string[];
  jogos: string[];
  recursos: string;
  indicador: string;
  prazo: string;
  dias: string[];
}

export type StatusPlano = 'elaboracao' | 'ativo' | 'concluido';

export interface Plano {
  id: string;
  profissional_nome: string;
  ciclo: string | null;
  foco: string | null;
  objetivos: Objetivo[];
  orientacoes_familia: string | null;
  adequacoes_escola: string[];
  adequacoes_texto: string | null;
  status: StatusPlano;
  criado_em: string;
  atualizado_em: string;
}

export interface Observacao {
  id: string;
  data: string;
  categoria: string;
  texto: string;
  autor_nome: string;
  criada_em: string;
  atualizada_em: string;
  pode_editar: boolean;
}

// GET /alunos/:id/ficha
export interface FichaAluno {
  aluno: { id: string; nome: string; ativo: boolean; nome_completo: string | null; data_nascimento: string | null };
  turma: { id: string; nome: string } | null;
  anamnese: { id: string; titulo: string; perguntas: PerguntaAnamnese[]; respostas: Record<string, unknown>;
    respondida_em: string; respondida_por_nome: string | null; via: string } | null;
  plano: { ciclo: string | null; profissional_nome: string; foco: string | null; objetivos: { area?: string; descricao: string; prazo?: string }[] } | null;
  observacoes: { data: string; categoria: string; texto: string; autor_nome: string }[];
  dias: number;
  resumo: { partidas: number; acerto: number | null; minutos: number; ultima: string | null; primeira: string | null };
  semanas: Semana[];
  habilidades: { habilidade: string; acerto: number | null; respostas: number; antes: number | null; depois: number | null }[];
  jogos: { jogo: string; titulo: string; partidas: number; acerto: number | null; nivel: number | null }[];
  revisar: { certa: string; tipo: string; jogo: string; vezes: number; respostas: string[] }[];
}

// GET /testes (só o administrador): quem se cadastrou no teste grátis
export interface TesteGratis {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  escola_slug: string | null;
  relatorios: number;
  ultimo_relatorio: string | null;
  created_at: string;
}

// ---------- família (os responsáveis, recados e o que a família vê) ----------
export type RelatorioFamilia = 'jogos' | 'recados' | 'plano' | 'anamnese';
export type ChavesFamilia = Record<RelatorioFamilia, boolean>;

// GET /alunos/:id/responsaveis
export interface ResponsaveisDoAluno {
  responsaveis: { id: string; nome: string; email: string; parentesco: string | null; origem: string; consentimento_em: string | null; desde: string }[];
  pode_desvincular: boolean;
  pode_redefinir_senha: boolean;
  pode_redefinir_pin: boolean;   // só aluno cadastrado (com PIN) e quem mexe no aluno
}

// GET /alunos/:id/recados
export interface RecadoFamilia {
  id: string;
  texto: string;
  autor_nome: string;
  criado_em: string;
  atualizado_em: string;
  pode_editar: boolean;
}

// GET /alunos/:id/visivel-familia
export interface VisivelFamiliaAluno {
  excecao: Partial<ChavesFamilia>;
  regra: ChavesFamilia;
  efetivo: ChavesFamilia;
  pode_mudar: boolean;
}
// ---------- área da família (/familia: o responsável e os filhos dele) ----------

// GET /familia/filhos e /familia/filhos/:id: "relatorios" diz o que aparece (o que está desligado some da tela)
export interface FilhoFamilia {
  id: string;
  nome: string;
  nome_completo: string | null;
  data_nascimento?: string | null;
  parentesco: string | null;
  escola: { nome: string; logo: string } | null;
  tem_pin?: boolean;   // sem PIN o filho ainda não joga em casa ("Quem vai jogar?" no app)
  relatorios: ChavesFamilia;
}

// GET /familia/filhos/:id/jogos (a ficha do aluno, sem as anotações da equipe, e as últimas partidas)
export interface JogosDoFilho {
  dias: number;
  resumo: { partidas: number; acerto: number | null; minutos: number; ultima: string | null; primeira: string | null };
  semanas: Semana[];
  habilidades: { habilidade: string; acerto: number | null; respostas: number; antes: number | null; depois: number | null }[];
  jogos: { jogo: string; titulo: string; partidas: number; acerto: number | null; nivel: number | null }[];
  revisar: { certa: string; tipo: string; jogo: string; vezes: number; respostas: string[] }[];
  ultimas: { id: string; jogo: string; titulo: string; acertos: number; total: number; estrelas: number | null; jogada_em: string; local: 'escola' | 'casa' | null }[];
}

// GET /familia/filhos/:id/planos (sem rascunhos nem as adequações da escola)
export interface PlanoDaFamilia {
  id: string;
  profissional_nome: string;
  ciclo: string | null;
  foco: string | null;
  status: StatusPlano;
  objetivos: { area: string; descricao: string; jogos: string[]; prazo: string; dias: string[] }[];
  orientacoes_familia: string | null;
  criado_em: string;
}

// GET /familia/filhos/:id/anamneses (as que a família respondeu aparecem sempre)
export interface AnamneseDaFamilia {
  id: string;
  titulo: string;
  perguntas: PerguntaAnamnese[];
  respostas: Record<string, unknown>;
  da_familia: boolean;
  respondida_por_nome: string | null;
  respondida_em: string | null;
}
