import { Request, Response } from "express";
import { fn, col } from "sequelize";
import Aluno from "../models/Aluno";
import { PlanoObjetivos } from "../models/PlanoObjetivos";
import { PlanoSessao, STATUS_SESSAO, StatusSessao } from "../models/PlanoSessao";
import { podeEditarAluno, podeVerAluno } from "../services/acessoAluno";

// Sessões do plano de objetivos (o cronograma do plano de ação) e o prontuário de bordo de cada sessão.
// Quem vê: quem vê o aluno. Quem monta e registra: quem mexe no aluno (coordenação, professor das turmas dele, admin).
const MAX_SESSOES = 120;
const MAX_GERAR = 52;
const dataValida = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) && !Number.isNaN(new Date(`${v}T12:00:00Z`).getTime()) ? String(v) : null);
const nota = (v: unknown) => { const n = Math.round(Number(v)); return n >= 1 && n <= 5 ? n : null; };
const ids = (v: unknown, max: number) => [...new Set((Array.isArray(v) ? v : []).map(String).filter((x) => /^[a-zA-Z0-9_-]{2,40}$/.test(x)))].slice(0, max);

const paraApp = (s: PlanoSessao) => ({
  id: s.id, numero: s.numero, data: s.data, objetivos: s.objetivos, jogos: s.jogos, atividades: s.atividades, status: s.status,
  anotacao: s.anotacao, regulacao: s.regulacao, engajamento: s.engajamento, autor_nome: s.autor_nome, atualizada_em: s.updated_at
});

// o plano e o aluno, conferindo o acesso (editar: precisa poder mexer no aluno)
async function planoDoAluno(req: Request, planoId: string, editar: boolean) {
  const plano = await PlanoObjetivos.findByPk(planoId);
  const aluno = plano ? await Aluno.findByPk(plano.aluno_id) : null;
  if (!plano || !aluno) return null;
  const ok = editar ? await podeEditarAluno(req.usuarioLogado!, aluno) : await podeVerAluno(req.usuarioLogado!, aluno);
  return ok ? { plano, aluno } : null;
}

// os campos da sessão que vieram do app (só os objetivos que existem no plano)
function lerSessao(b: Record<string, unknown>, objetivosDoPlano: Set<string>) {
  const campos: Partial<PlanoSessao> = {};
  if (b.data !== undefined) campos.data = b.data ? dataValida(b.data) : null;
  if (b.objetivos !== undefined) campos.objetivos = ids(b.objetivos, 30).filter((x) => objetivosDoPlano.has(x));
  if (b.jogos !== undefined) campos.jogos = ids(b.jogos, 40);
  if (b.atividades !== undefined) campos.atividades = String(b.atividades ?? "").trim().slice(0, 4000) || null;
  if ((STATUS_SESSAO as readonly string[]).includes(String(b.status))) campos.status = b.status as StatusSessao;
  if (b.anotacao !== undefined) campos.anotacao = String(b.anotacao ?? "").trim().slice(0, 4000) || null;
  if (b.regulacao !== undefined) campos.regulacao = nota(b.regulacao);
  if (b.engajamento !== undefined) campos.engajamento = nota(b.engajamento);
  return campos;
}

class SessaoController {
  async index(req: Request, res: Response): Promise<Response> {
    const r = await planoDoAluno(req, req.params.id, false);
    if (!r) return res.status(404).json({ message: "Plano não encontrado." });
    const sessoes = await PlanoSessao.findAll({ where: { plano_id: r.plano.id }, order: [["numero", "ASC"]] });
    return res.json({ pode_editar: await podeEditarAluno(req.usuarioLogado!, r.aluno), sessoes: sessoes.map(paraApp) });
  }

  // uma sessão nova (no fim do cronograma), ou várias de uma vez: { gerar: quantidade, inicio, a_cada_dias }
  async store(req: Request, res: Response): Promise<Response> {
    const r = await planoDoAluno(req, req.params.id, true);
    if (!r) return res.status(404).json({ message: "Plano não encontrado." });
    const b = req.body || {};
    const existentes = await PlanoSessao.count({ where: { plano_id: r.plano.id } });
    const ultimo = Number((await PlanoSessao.findOne({ where: { plano_id: r.plano.id }, attributes: [[fn("MAX", col("numero")), "n"]], raw: true }) as unknown as { n: number | null })?.n || 0);
    const objetivosDoPlano = new Set(r.plano.objetivos.map((o) => o.id));
    const base = { plano_id: r.plano.id, aluno_id: r.aluno.id, escola_id: r.aluno.escola_id, status: "planejada" as StatusSessao,
      anotacao: null, regulacao: null, engajamento: null, autor_nome: null };

    if (b.gerar !== undefined) {
      const qtd = Math.round(Number(b.gerar));
      const inicio = dataValida(b.inicio);
      const passo = Math.round(Number(b.a_cada_dias)) || 7;
      if (!(qtd >= 1 && qtd <= MAX_GERAR)) return res.status(400).json({ message: `Gere de 1 a ${MAX_GERAR} sessões por vez.` });
      if (!inicio) return res.status(400).json({ message: "Escolha a data da primeira sessão." });
      if (passo < 1 || passo > 60) return res.status(400).json({ message: "O intervalo entre as sessões vai de 1 a 60 dias." });
      if (existentes + qtd > MAX_SESSOES) return res.status(400).json({ message: `O plano pode ter até ${MAX_SESSOES} sessões.` });
      // as sessões já vêm com todos os objetivos e todos os jogos do plano (o profissional ajusta cada uma depois)
      const objetivos = [...objetivosDoPlano];
      const jogos = [...new Set(r.plano.objetivos.flatMap((o) => o.jogos || []))];
      const d0 = new Date(`${inicio}T12:00:00Z`);
      const novas = Array.from({ length: qtd }, (_, i) => {
        const d = new Date(d0.getTime() + i * passo * 86400000);
        return { ...base, numero: ultimo + i + 1, data: d.toISOString().slice(0, 10), objetivos, jogos, atividades: null };
      });
      const criadas = await PlanoSessao.bulkCreate(novas);
      return res.status(201).json(criadas.map(paraApp));
    }

    if (existentes >= MAX_SESSOES) return res.status(400).json({ message: `O plano pode ter até ${MAX_SESSOES} sessões.` });
    const campos = lerSessao(b, objetivosDoPlano);
    if (b.data && !campos.data) return res.status(400).json({ message: "Data inválida." });
    const s = await PlanoSessao.create({ ...base, numero: ultimo + 1, data: null, objetivos: [], jogos: [], atividades: null, ...campos } as never);
    if (s.status === "realizada" && !s.autor_nome) { s.autor_nome = req.usuarioLogado!.nome.slice(0, 120); await s.save(); }
    return res.status(201).json(paraApp(s));
  }

  async update(req: Request, res: Response): Promise<Response> {
    const s = await PlanoSessao.findByPk(req.params.id);
    const r = s ? await planoDoAluno(req, s.plano_id, true) : null;
    if (!s || !r) return res.status(404).json({ message: "Sessão não encontrada." });
    const campos = lerSessao(req.body || {}, new Set(r.plano.objetivos.map((o) => o.id)));
    if (req.body?.data && !campos.data) return res.status(400).json({ message: "Data inválida." });
    Object.assign(s, campos);
    // quem registrou o prontuário: a pessoa logada, quando a sessão é marcada como realizada ou ganha anotação
    if (campos.anotacao !== undefined || campos.regulacao !== undefined || campos.status === "realizada") s.autor_nome = req.usuarioLogado!.nome.slice(0, 120);
    await s.save();
    return res.json(paraApp(s));
  }

  async destroy(req: Request, res: Response): Promise<Response> {
    const s = await PlanoSessao.findByPk(req.params.id);
    const r = s ? await planoDoAluno(req, s.plano_id, true) : null;
    if (!s || !r) return res.status(404).json({ message: "Sessão não encontrada." });
    if (s.status === "realizada" && req.usuarioLogado!.perfil === "professor" && s.autor_nome !== req.usuarioLogado!.nome) {
      return res.status(403).json({ message: "Uma sessão realizada só pode ser apagada por quem registrou ou pela coordenação." });
    }
    await s.destroy();
    return res.json({ ok: true });
  }
}

export default new SessaoController();
