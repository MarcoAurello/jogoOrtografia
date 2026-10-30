import { Request, Response } from "express";
import Partida, { PartidaHabilidade } from "../models/Partida";
import Aluno from "../models/Aluno";
import sequelize from "../config/connection";
import { turmaDoUsuario } from "../services/acessoTurma";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const inteiro = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v)) || 0));
const MAX_DETALHES = 200;   // rodadas guardadas por partida
const HABILIDADE = /^[a-zA-Z]{3,30}$/;

class PartidaController {
  // o fim de um jogo do aluno logado; o id vem do aparelho, então a mesma partida reenviada pela fila não duplica
  async store(req: Request, res: Response): Promise<Response> {
    const aluno = req.alunoLogado!;
    const turmaId = req.alunoTurmaId!;   // a turma por onde o aluno entrou
    const b = req.body || {};
    const id = String(b.id || "");
    const jogo = String(b.jogo || "").slice(0, 30);
    if (!UUID.test(id) || !jogo) return res.status(400).json({ message: "Partida inválida." });
    if (await Partida.findByPk(id)) return res.json({ ok: true, repetida: true });

    const jogadaEm = new Date(String(b.jogada_em || ""));
    const quando = Number.isNaN(jogadaEm.getTime()) || jogadaEm.getTime() > Date.now() + 5 * 60 * 1000 ? new Date() : jogadaEm;
    const total = inteiro(b.total, 10000);
    const acertos = Math.min(total, inteiro(b.acertos, 10000));
    const habilidades = [...new Set((Array.isArray(b.habilidades) ? b.habilidades : []).map(String).filter((h: string) => HABILIDADE.test(h)))].slice(0, 10) as string[];

    await sequelize.transaction(async (transaction) => {
      await Partida.create({
        id, jogo, aluno_id: aluno.id, turma_id: turmaId, escola_id: aluno.escola_id,
        titulo: String(b.titulo || jogo).slice(0, 160), acertos, total, estrelas: inteiro(b.estrelas, 3),
        nivel_max: b.nivel_max == null ? null : inteiro(b.nivel_max, 100), duracao_s: b.duracao_s == null ? null : inteiro(b.duracao_s, 86400),
        jogada_em: quando,
        detalhes: Array.isArray(b.detalhes) ? b.detalhes.slice(0, MAX_DETALHES) : null,
        resumo: { linhas: Array.isArray(b.resumo) ? b.resumo.slice(0, 20).map((l: unknown) => String(l).slice(0, 400)) : [],
          competicao: b.competicao ? String(b.competicao).slice(0, 60) : null }
      }, { transaction });
      if (total && habilidades.length) {
        await PartidaHabilidade.bulkCreate(habilidades.map((habilidade) => ({
          partida_id: id, aluno_id: aluno.id, turma_id: turmaId, habilidade, acertos, total, jogada_em: quando
        })) as never[], { transaction });
      }
    });
    return res.status(201).json({ ok: true });
  }

  // as últimas partidas da turma (o painel completo vem na fase 3)
  async daTurma(req: Request, res: Response): Promise<Response> {
    const turma = await turmaDoUsuario(req.usuarioLogado!, req.params.turmaId);
    if (!turma) return res.status(404).json({ message: "Turma não encontrada." });
    const partidas = await Partida.findAll({
      where: { turma_id: turma.id },
      attributes: ["id", "jogo", "titulo", "acertos", "total", "estrelas", "nivel_max", "jogada_em", "resumo"],
      include: [{ model: Aluno, as: "aluno", attributes: ["id", "nome"] }],
      order: [["jogada_em", "DESC"]],
      limit: Math.min(200, inteiro(req.query.limite, 200) || 30)
    });
    return res.json(partidas);
  }
}

export default new PartidaController();
