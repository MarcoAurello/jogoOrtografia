import { Request, Response } from "express";
import { fn, col, Op } from "sequelize";
import Turma, { TurmaProfessor } from "../models/Turma";
import Usuario from "../models/Usuario";
import Aluno from "../models/Aluno";
import Escola from "../models/Escola";
import { codigoNovo, turmaDoUsuario } from "../services/acessoTurma";

// professores que podem ser ligados à turma: os da mesma escola (e ativos)
async function professoresValidos(ids: unknown, escolaId: string | null): Promise<string[]> {
  if (!Array.isArray(ids) || !ids.length) return [];
  const lista = await Usuario.findAll({ where: { id: { [Op.in]: ids.map(String) }, escola_id: escolaId, ativo: true } });
  return lista.map((u) => u.id);
}

class TurmaController {
  // as turmas que a pessoa enxerga, com o número de alunos e os professores
  async index(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const where: Record<string, unknown> = {};
    if (eu.perfil === "coordenacao") where.escola_id = eu.escola_id;
    else if (eu.perfil === "professor") {
      const minhas = await TurmaProfessor.findAll({ where: { usuario_id: eu.id } }) as unknown as { turma_id: string }[];
      where.id = { [Op.in]: minhas.map((m) => m.turma_id) };
    } else if (req.query.escola) where.escola_id = String(req.query.escola);
    const turmas = await Turma.findAll({
      where,
      include: [{ model: Usuario, as: "professores", attributes: ["id", "nome"], through: { attributes: [] } }],
      order: [["ativa", "DESC"], ["nome", "ASC"]]
    });
    const contagem = await Aluno.findAll({
      attributes: ["turma_id", [fn("COUNT", col("id")), "qtd"]],
      where: { turma_id: { [Op.in]: turmas.map((t) => t.id) }, ativo: true },
      group: ["turma_id"], raw: true
    }) as unknown as { turma_id: string; qtd: number }[];
    const porTurma = new Map(contagem.map((c) => [c.turma_id, Number(c.qtd)]));
    return res.json(turmas.map((t) => ({ ...t.toJSON(), alunos: porTurma.get(t.id) || 0 })));
  }

  // turma nova: o professor fica ligado a ela; a coordenação escolhe os professores
  async store(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const nome = String(req.body.nome || "").trim().slice(0, 80);
    if (!nome) return res.status(400).json({ message: "Digite o nome da turma (ex.: 3º ano B)." });
    const escolaId = eu.perfil === "admin" ? (req.body.escola_id || null) : eu.escola_id;
    if (escolaId && !(await Escola.findByPk(escolaId))) return res.status(400).json({ message: "Escola não encontrada." });
    const turma = await Turma.create({
      nome, escola_id: escolaId, codigo: await codigoNovo(), ano_letivo: Number(req.body.ano_letivo) || new Date().getFullYear(),
      criada_por: eu.id
    });
    const professores = eu.perfil === "professor" ? [eu.id] : await professoresValidos(req.body.professores, escolaId);
    await TurmaProfessor.bulkCreate(professores.map((usuario_id) => ({ turma_id: turma.id, usuario_id })) as never[]);
    return res.status(201).json(turma);
  }

  // muda o nome, encerra/reabre a turma e (coordenação/admin) os professores ligados
  async update(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const turma = await turmaDoUsuario(eu, req.params.id);
    if (!turma) return res.status(404).json({ message: "Turma não encontrada." });
    if (typeof req.body.nome === "string" && req.body.nome.trim()) turma.nome = req.body.nome.trim().slice(0, 80);
    if (typeof req.body.ativa === "boolean") turma.ativa = req.body.ativa;
    await turma.save();
    if (Array.isArray(req.body.professores) && eu.perfil !== "professor") {
      const ids = await professoresValidos(req.body.professores, turma.escola_id);
      await TurmaProfessor.destroy({ where: { turma_id: turma.id } });
      await TurmaProfessor.bulkCreate(ids.map((usuario_id) => ({ turma_id: turma.id, usuario_id })) as never[]);
    }
    return res.json(turma);
  }

  // público: a tela de entrada do aluno ("toque no seu nome") — só os nomes, nada de senha
  async alunosPeloCodigo(req: Request, res: Response): Promise<Response> {
    const turma = await Turma.findOne({
      where: { codigo: String(req.params.codigo || "").trim().toUpperCase(), ativa: true },
      include: [{ model: Escola, as: "escola" }]
    });
    if (!turma) return res.status(404).json({ message: "Não achei essa turma. Confira o código com o professor." });
    if (turma.escola?.bloqueada) return res.status(403).json({ message: "O acesso desta escola está bloqueado.", codigo: "escola_bloqueada" });
    const alunos = await Aluno.findAll({ where: { turma_id: turma.id, ativo: true }, attributes: ["id", "nome"], order: [["nome", "ASC"]] });
    return res.json({ turma: { nome: turma.nome, codigo: turma.codigo }, escola: turma.escola ? turma.escola.marca() : null, alunos });
  }
}

export default new TurmaController();
