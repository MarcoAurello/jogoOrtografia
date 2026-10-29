import { fn, col, Op } from "sequelize";
import sequelize from "../config/connection";
import Escola from "../models/Escola";
import { Competicao, Destinatario, Participacao, Pergunta, Questionario } from "../models/Dados";

// Fase 4: as mesmas operações que o script do Google fazia na planilha (ferramentas/relatorio-email.gs), agora no banco,
// com as mesmas regras e as mesmas respostas (o app só trocou o endereço). Cada escola tem os seus dados (escopo);
// escopo nulo = a plataforma principal. Os erros usam os mesmos códigos do script ('email', 'codigo', 'encerrada'...).
export type Escopo = string | null;
const erro = (codigo: string) => new Error(codigo);
const texto = (v: unknown, max: number) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);
const numero = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v)) || 0));
const lista = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]).slice(0, 120) : []);
export const emailValido = (m: string) => /^[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}$/.test(m);
const doEscopo = (escopo: Escopo) => ({ escola_id: escopo });

// a escola pelo endereço (/escolaExemplo): o escopo dela; endereço vazio ou desconhecido = plataforma principal
export async function escopoDoEndereco(slug: unknown): Promise<{ escopo: Escopo; escola: Escola | null }> {
  const s = texto(slug, 40);
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(s)) return { escopo: null, escola: null };
  const escola = await Escola.findOne({ where: { slug: s } });
  return { escopo: escola ? escola.id : null, escola };
}

// ---------- e-mails que recebem os relatórios ----------
export async function lerEmails(escopo: Escopo) {
  const lista = await Destinatario.findAll({ where: doEscopo(escopo), order: [["created_at", "ASC"]] });
  return lista.map((d) => ({ nome: d.nome, email: d.email }));
}

export async function adicionarEmail(escopo: Escopo, nome: unknown, email: unknown) {
  const m = texto(email, 120).toLowerCase();
  if (!emailValido(m)) throw erro("email");
  if (await Destinatario.findOne({ where: { ...doEscopo(escopo), email: m } })) throw erro("repetido");
  await Destinatario.create({ escola_id: escopo, nome: texto(nome, 60) || m, email: m });
}

// ---------- questionários ----------
export async function listarQuestionarios(escopo: Escopo) {
  const qs = await Questionario.findAll({ where: doEscopo(escopo), order: [["created_at", "ASC"]] });
  const contagem = await Pergunta.findAll({
    attributes: ["questionario_id", [fn("COUNT", col("id")), "qtd"]],
    where: { questionario_id: { [Op.in]: qs.map((q) => q.id) } }, group: ["questionario_id"], raw: true
  }) as unknown as { questionario_id: string; qtd: number }[];
  const porQ = new Map(contagem.map((c) => [c.questionario_id, Number(c.qtd)]));
  return qs.map((q) => ({ id: q.id, titulo: q.titulo, perguntas: porQ.get(q.id) || 0 }));
}

// pelo id novo ou pelo id da planilha (links de questionário mandados antes da mudança continuam abrindo)
export async function lerQuestionario(escopo: Escopo, id: unknown) {
  const s = texto(id, 40);
  const q = await Questionario.findOne({
    where: { ...doEscopo(escopo), [Op.or]: [{ id: s }, { id_planilha: s }] },
    include: [{ model: Pergunta, as: "perguntas" }],
    order: [[{ model: Pergunta, as: "perguntas" }, "ordem", "ASC"]]
  });
  if (!q) throw new Error("Questionário não encontrado.");
  return { id: q.id, titulo: q.titulo, perguntas: (q.perguntas || []).map((p) => ({ pergunta: p.pergunta, certa: p.certa, erradas: p.erradas })) };
}

export async function salvarQuestionario(escopo: Escopo, autorId: string | null, titulo: unknown, perguntas: unknown, idPlanilha: string | null = null) {
  const linhas = lista<{ pergunta?: unknown; certa?: unknown; erradas?: unknown }>(perguntas)
    .map((q) => ({ pergunta: texto(q.pergunta, 300), certa: texto(q.certa, 160), erradas: lista<unknown>(q.erradas).slice(0, 3).map((x) => texto(x, 160)).filter(Boolean) }))
    .filter((q) => q.pergunta && q.certa && q.erradas.length);
  if (!linhas.length) throw new Error("O questionário precisa de pelo menos uma pergunta com resposta certa e errada.");
  return sequelize.transaction(async (transaction) => {
    const q = await Questionario.create({ escola_id: escopo, autor_id: autorId, titulo: texto(titulo, 80) || "Questionário", id_planilha: idPlanilha }, { transaction });
    await Pergunta.bulkCreate(linhas.map((l, ordem) => ({ questionario_id: q.id, ordem, ...l })), { transaction });
    return q.id;
  });
}

// ---------- competições ----------
const MINUTOS_DE_FOLGA = 15;
const LETRAS_DO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // sem 0/O e 1/I, que se confundem
// nome do aluno como chave: sem acentos, sem diferença de maiúsculas e de espaços
const chaveDoNome = (n: unknown) => texto(n, 40).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const paraApp = (c: Competicao, comCodigo: boolean) => ({
  id: c.id, nome: c.nome, jogo: c.jogo, jogoNome: c.jogo_nome, email: c.email || "",
  criada: c.created_at.toISOString(), encerra: c.encerra_em.toISOString(), aberta: Date.now() < c.encerra_em.getTime(),
  ...(comCodigo ? { codigo: c.codigo } : {})
});

async function acharCompeticao(escopo: Escopo, id: unknown) {
  const s = texto(id, 40);
  const c = await Competicao.findOne({ where: { ...doEscopo(escopo), [Op.or]: [{ id: s }, { id_planilha: s }] } });
  if (!c) throw erro("competicao");
  return c;
}

export async function criarCompeticao(escopo: Escopo, autorId: string | null, d: Record<string, unknown>) {
  const nome = texto(d.nome, 60), jogo = texto(d.jogo, 30), jogoNome = texto(d.jogoNome, 60);
  const encerra = new Date(String(d.encerra));
  if (!jogo) throw erro("jogo");
  if (Number.isNaN(encerra.getTime()) || encerra.getTime() <= Date.now()) throw erro("hora");
  const email = texto(d.email, 120).toLowerCase();
  let codigo: string;
  do { codigo = Array.from({ length: 5 }, () => LETRAS_DO_CODIGO[Math.floor(Math.random() * LETRAS_DO_CODIGO.length)]).join(""); }
  while (await Competicao.findOne({ where: { codigo } }));
  const c = await Competicao.create({ escola_id: escopo, autor_id: autorId, codigo, nome: nome || jogoNome, jogo, jogo_nome: jogoNome,
    email: emailValido(email) ? email : null, encerra_em: encerra, id_planilha: null });
  return paraApp(c, true);
}

// para os alunos: as abertas e as que encerraram há menos de 3 dias (sem o código);
// para o professor: as dos últimos 30 dias, com o código
export async function listarCompeticoes(escopo: Escopo, doProfessor: boolean) {
  const limite = new Date(Date.now() - (doProfessor ? 30 : 3) * 24 * 3600 * 1000);
  const cs = await Competicao.findAll({ where: { ...doEscopo(escopo), encerra_em: { [Op.gte]: limite } } });
  const contagem = await Participacao.findAll({
    attributes: ["competicao_id", [fn("COUNT", fn("DISTINCT", col("chave_nome"))), "qtd"]],
    where: { competicao_id: { [Op.in]: cs.map((c) => c.id) } }, group: ["competicao_id"], raw: true
  }) as unknown as { competicao_id: string; qtd: number }[];
  const participantes = new Map(contagem.map((x) => [x.competicao_id, Number(x.qtd)]));
  return cs.map((c) => ({ ...paraApp(c, doProfessor), participantes: participantes.get(c.id) || 0 }))
    .sort((a, b) => (a.aberta !== b.aberta ? (a.aberta ? -1 : 1) : b.criada.localeCompare(a.criada)));
}

export async function encerrarCompeticao(escopo: Escopo, id: unknown) {
  const c = await acharCompeticao(escopo, id);
  c.encerra_em = new Date();
  await c.save();
}

async function conferirCodigo(escopo: Escopo, id: unknown, codigo: unknown) {
  const c = await acharCompeticao(escopo, id);
  if (c.codigo.toUpperCase() !== texto(codigo, 10).toUpperCase()) throw erro("codigo");
  return c;
}

export async function entrarCompeticao(escopo: Escopo, id: unknown, codigo: unknown) {
  const c = await conferirCodigo(escopo, id, codigo);
  const app = paraApp(c, false);
  if (!app.aberta) throw erro("encerrada");
  return app;
}

// guarda a partida: se for a melhor do aluno (naquela configuração), troca a pontuação; sempre conta mais uma partida
export async function guardarResultado(escopo: Escopo, d: Record<string, unknown>) {
  const c = await conferirCodigo(escopo, d.id, d.codigo);
  if (Date.now() > c.encerra_em.getTime() + MINUTOS_DE_FOLGA * 60 * 1000) throw erro("encerrada");
  const nome = texto(d.nome, 40);
  if (!nome) throw erro("nome");
  await registrarParticipacao(c.id, nome, numero(d.pontos, 1000000), numero(d.acertos, 10000), numero(d.total, 10000), texto(d.config, 120), 1, new Date());
  return rankingDaCompeticao(escopo, c.id);
}

// também usada pela importação da planilha (partidas = as que a planilha já tinha contado)
export async function registrarParticipacao(competicaoId: string, nome: string, pontos: number, acertos: number, total: number,
  config: string, partidas: number, quando: Date) {
  await sequelize.transaction(async (transaction) => {
    const chave = chaveDoNome(nome);
    const meu = await Participacao.findOne({ where: { competicao_id: competicaoId, chave_nome: chave, config }, transaction, lock: transaction.LOCK.UPDATE });
    if (!meu) {
      await Participacao.create({ competicao_id: competicaoId, chave_nome: chave, nome, config, pontos, acertos, total, partidas, melhor_em: quando }, { transaction });
      return;
    }
    const melhor = pontos > meu.pontos || (pontos === meu.pontos && acertos > meu.acertos);
    if (melhor) Object.assign(meu, { nome, pontos, acertos, total, melhor_em: quando });
    meu.partidas += partidas;
    await meu.save({ transaction });
  });
}

// ranking: mais pontos primeiro; no empate, mais acertos; depois, quem fez a melhor partida antes
export async function rankingDaCompeticao(escopo: Escopo, id: unknown) {
  const c = await acharCompeticao(escopo, id);
  const linhas = await Participacao.findAll({ where: { competicao_id: c.id } });
  const ranking = linhas
    .map((p) => ({ nome: p.nome, pontos: p.pontos, acertos: p.acertos, total: p.total, partidas: p.partidas, config: p.config, em: p.melhor_em.getTime() }))
    .sort((a, b) => b.pontos - a.pontos || b.acertos - a.acertos || a.em - b.em)
    .map(({ em, ...r }) => r);
  return { competicao: paraApp(c, false), ranking };
}
