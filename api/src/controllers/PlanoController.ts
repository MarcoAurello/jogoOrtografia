import { Request, Response } from "express";
import { randomBytes } from "crypto";
import Aluno from "../models/Aluno";
import { Objetivo, PlanoObjetivos, STATUS_PLANO, StatusPlano } from "../models/PlanoObjetivos";
import { podeEditarAluno, podeVerAluno } from "../services/acessoAluno";
import { PlanoSessao } from "../models/PlanoSessao";
import { fn, col, Op } from "sequelize";

// Plano de Objetivos Psicopedagógicos do aluno. Quem vê: quem vê o aluno (equipe da escola). Quem cria e muda: quem
// mexe no aluno (coordenação, professor das turmas dele, administrador). Um aluno pode ter vários planos (um por ciclo).
const MAX_OBJETIVOS = 30;
const DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
const linha = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const bloco = (v: unknown, max: number) => { const s = String(v ?? "").trim().slice(0, max); return s || null; };
const lista = (v: unknown, max: number, tam: number) =>
  [...new Set((Array.isArray(v) ? v : []).map((x) => linha(x, tam)).filter(Boolean))].slice(0, max);

// confere e limpa o plano que veio do app; devolve os campos ou a mensagem de erro
function lerPlano(b: Record<string, unknown>, nomePadrao: string): { campos?: Record<string, unknown>; erro?: string } {
  const objetivos: Objetivo[] = [];
  const brutos = Array.isArray(b.objetivos) ? b.objetivos.slice(0, MAX_OBJETIVOS + 1) : [];
  if (brutos.length > MAX_OBJETIVOS) return { erro: `O plano pode ter até ${MAX_OBJETIVOS} objetivos.` };
  for (const [i, o] of brutos.entries()) {
    const x = (o || {}) as Record<string, unknown>;
    const descricao = String(x.descricao ?? "").trim().slice(0, 2000);
    const area = linha(x.area, 80);
    if (!descricao && !area) continue;   // bloco em branco: ignora
    if (!descricao) return { erro: `Objetivo ${i + 1}: escreva a descrição do objetivo.` };
    objetivos.push({
      id: /^[a-z0-9]{4,16}$/.test(String(x.id || "")) ? String(x.id) : randomBytes(4).toString("hex"),
      area, descricao, habilidades: lista(x.habilidades, 20, 30).filter((h) => /^[a-zA-Z]{3,30}$/.test(h)), jogos: lista(x.jogos, 40, 40), recursos: String(x.recursos ?? "").trim().slice(0, 1000),
      indicador: String(x.indicador ?? "").trim().slice(0, 1000), prazo: linha(x.prazo, 80),
      dias: lista(x.dias, 7, 3).filter((d) => DIAS.includes(d))
    });
  }
  const status = (STATUS_PLANO as readonly string[]).includes(String(b.status)) ? b.status as StatusPlano : "elaboracao";
  if (status !== "elaboracao" && !objetivos.length) return { erro: "Para ativar o plano, adicione pelo menos um objetivo." };
  return { campos: {
    profissional_nome: linha(b.profissional_nome, 120) || nomePadrao.slice(0, 120),
    ciclo: linha(b.ciclo, 80) || null, foco: bloco(b.foco, 2000), objetivos,
    orientacoes_familia: bloco(b.orientacoes_familia, 4000), adequacoes_escola: lista(b.adequacoes_escola, 20, 120),
    adequacoes_texto: bloco(b.adequacoes_texto, 4000), status
  } };
}

const paraApp = (p: PlanoObjetivos) => ({
  id: p.id, profissional_nome: p.profissional_nome, ciclo: p.ciclo, foco: p.foco, objetivos: p.objetivos,
  orientacoes_familia: p.orientacoes_familia, adequacoes_escola: p.adequacoes_escola || [], adequacoes_texto: p.adequacoes_texto,
  status: p.status, criado_em: p.created_at, atualizado_em: p.updated_at
});

class PlanoController {
  async index(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const aluno = await Aluno.findByPk(req.params.id);
    if (!aluno || !(await podeVerAluno(eu, aluno))) return res.status(404).json({ message: "Aluno não encontrado." });
    const planos = await PlanoObjetivos.findAll({ where: { aluno_id: aluno.id }, order: [["created_at", "DESC"]] });
    // quantas sessões cada plano tem e quantas já foram realizadas
    const contagem = planos.length ? await PlanoSessao.findAll({
      attributes: ["plano_id", "status", [fn("COUNT", col("id")), "qtd"]], where: { plano_id: { [Op.in]: planos.map((p) => p.id) } },
      group: ["plano_id", "status"], raw: true
    }) as unknown as { plano_id: string; status: string; qtd: number }[] : [];
    const sessoes = (id: string) => ({
      total: contagem.filter((c) => c.plano_id === id).reduce((n, c) => n + Number(c.qtd), 0),
      realizadas: contagem.filter((c) => c.plano_id === id && c.status === "realizada").reduce((n, c) => n + Number(c.qtd), 0)
    });
    return res.json({ pode_editar: await podeEditarAluno(eu, aluno), planos: planos.map((p) => ({ ...paraApp(p), sessoes: sessoes(p.id) })) });
  }

  async store(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const aluno = await Aluno.findByPk(req.params.id);
    if (!aluno || !(await podeEditarAluno(eu, aluno))) return res.status(404).json({ message: "Aluno não encontrado." });
    const { campos, erro } = lerPlano(req.body || {}, eu.nome);
    if (erro) return res.status(400).json({ message: erro });
    const p = await PlanoObjetivos.create({ escola_id: aluno.escola_id, aluno_id: aluno.id, autor_id: eu.id, ...campos } as never);
    if (p.status === "ativo") await soUmAtivo(p);
    return res.status(201).json(paraApp(p));
  }

  async update(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const p = await PlanoObjetivos.findByPk(req.params.id);
    const aluno = p ? await Aluno.findByPk(p.aluno_id) : null;
    if (!p || !aluno || !(await podeEditarAluno(eu, aluno))) return res.status(404).json({ message: "Plano não encontrado." });
    const { campos, erro } = lerPlano(req.body || {}, p.profissional_nome);
    if (erro) return res.status(400).json({ message: erro });
    Object.assign(p, campos);
    await p.save();
    if (p.status === "ativo") await soUmAtivo(p);
    return res.json(paraApp(p));
  }

  async destroy(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const p = await PlanoObjetivos.findByPk(req.params.id);
    const aluno = p ? await Aluno.findByPk(p.aluno_id) : null;
    if (!p || !aluno || !(await podeEditarAluno(eu, aluno))) return res.status(404).json({ message: "Plano não encontrado." });
    // o plano já em andamento ou concluído é histórico: só a coordenação (ou quem criou) apaga
    if (p.status !== "elaboracao" && p.autor_id !== eu.id && eu.perfil === "professor") {
      return res.status(403).json({ message: "Só quem criou (ou a coordenação) apaga um plano ativo ou concluído." });
    }
    await p.destroy();
    return res.json({ ok: true });
  }
}

// só um plano ativo por aluno: ao ativar um, o que estava ativo passa a concluído
async function soUmAtivo(p: PlanoObjetivos) {
  const outros = await PlanoObjetivos.findAll({ where: { aluno_id: p.aluno_id, status: "ativo" } });
  for (const o of outros) if (o.id !== p.id) { o.status = "concluido"; await o.save(); }
}

export default new PlanoController();
