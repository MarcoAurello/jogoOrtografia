import { Request, Response } from "express";
import { fn, col, Op } from "sequelize";
import Aluno, { senhaAleatoria } from "../models/Aluno";
import Partida from "../models/Partida";
import { turmaDoUsuario } from "../services/acessoTurma";

const MAX_ALUNOS_POR_VEZ = 60;
// nome de exibição: primeiro nome + inicial (ex.: "Ana S."), como o professor digitar, sem espaços sobrando
const limparNome = (nome: unknown) => String(nome || "").replace(/\s+/g, " ").trim().slice(0, 40);

class AlunoController {
  // alunos da turma, com a senha de figuras (o professor mostra ao aluno), as partidas e o último jogo
  async index(req: Request, res: Response): Promise<Response> {
    const turma = await turmaDoUsuario(req.usuarioLogado!, req.params.turmaId);
    if (!turma) return res.status(404).json({ message: "Turma não encontrada." });
    const alunos = await Aluno.findAll({
      where: { turma_id: turma.id },
      attributes: ["id", "nome", "senha_figuras", "ativo", "ultimo_acesso", "bloqueado_ate"],
      order: [["ativo", "DESC"], ["nome", "ASC"]]
    });
    const jogadas = await Partida.findAll({
      attributes: ["aluno_id", [fn("COUNT", col("id")), "qtd"], [fn("MAX", col("jogada_em")), "ultima"]],
      where: { turma_id: turma.id }, group: ["aluno_id"], raw: true
    }) as unknown as { aluno_id: string; qtd: number; ultima: Date }[];
    const porAluno = new Map(jogadas.map((j) => [j.aluno_id, j]));
    return res.json({
      turma,
      alunos: alunos.map((a) => ({ ...a.toJSON(), partidas: Number(porAluno.get(a.id)?.qtd || 0), ultima_partida: porAluno.get(a.id)?.ultima || null }))
    });
  }

  // cadastra vários de uma vez (um nome por linha); cada um ganha uma senha de 3 figuras
  async store(req: Request, res: Response): Promise<Response> {
    const turma = await turmaDoUsuario(req.usuarioLogado!, req.params.turmaId);
    if (!turma) return res.status(404).json({ message: "Turma não encontrada." });
    const nomes = (Array.isArray(req.body.nomes) ? req.body.nomes : []).map(limparNome).filter((n: string) => n.length >= 2);
    if (!nomes.length) return res.status(400).json({ message: "Digite pelo menos um nome (um por linha)." });
    if (nomes.length > MAX_ALUNOS_POR_VEZ) return res.status(400).json({ message: `Cadastre até ${MAX_ALUNOS_POR_VEZ} alunos por vez.` });
    // o mesmo nome não pode aparecer duas vezes na turma (o aluno se acha pelo nome na hora de entrar)
    const existentes = new Set((await Aluno.findAll({ where: { turma_id: turma.id, ativo: true }, attributes: ["nome"] })).map((a) => a.nome.toLowerCase()));
    const novos: string[] = [];
    const repetidos: string[] = [];
    for (const nome of nomes) {
      if (existentes.has(nome.toLowerCase())) repetidos.push(nome);
      else { existentes.add(nome.toLowerCase()); novos.push(nome); }
    }
    const criados = await Aluno.bulkCreate(novos.map((nome) => ({
      nome, turma_id: turma.id, escola_id: turma.escola_id, senha_figuras: senhaAleatoria(), bloqueado_ate: null, ultimo_acesso: null
    })));
    return res.status(201).json({ criados: criados.map((a) => ({ id: a.id, nome: a.nome, senha_figuras: a.senha_figuras })), repetidos });
  }

  // muda o nome, desativa/reativa ou sorteia uma senha nova (esqueceu as figuras)
  async update(req: Request, res: Response): Promise<Response> {
    const aluno = await Aluno.findByPk(req.params.id);
    if (!aluno || !(await turmaDoUsuario(req.usuarioLogado!, aluno.turma_id))) return res.status(404).json({ message: "Aluno não encontrado." });
    const nome = limparNome(req.body.nome);
    if (nome.length >= 2 && nome.toLowerCase() !== aluno.nome.toLowerCase()) {
      const outro = await Aluno.findOne({ where: { turma_id: aluno.turma_id, ativo: true, id: { [Op.ne]: aluno.id }, nome } });
      if (outro) return res.status(409).json({ message: "Já existe um aluno com esse nome na turma." });
      aluno.nome = nome;
    }
    if (typeof req.body.ativo === "boolean") aluno.ativo = req.body.ativo;
    if (req.body.novaSenha === true) {
      aluno.senha_figuras = senhaAleatoria();
      aluno.tentativas = 0;
      aluno.bloqueado_ate = null;
    }
    await aluno.save();
    return res.json(aluno);
  }
}

export default new AlunoController();
