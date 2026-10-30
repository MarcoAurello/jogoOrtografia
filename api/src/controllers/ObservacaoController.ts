import { Request, Response } from "express";
import Aluno from "../models/Aluno";
import { CATEGORIAS, Categoria, Observacao } from "../models/Observacao";
import { podeEditarAluno, podeVerAluno } from "../services/acessoAluno";

// Observações de evolução do aluno. Quem vê: quem vê o aluno (coordenação e professores da escola). Quem escreve:
// quem mexe no aluno (coordenação, professor das turmas dele, administrador). Quem corrige ou apaga: quem escreveu
// ou a coordenação da escola (e o administrador).
const MAX_TEXTO = 4000;
const dataValida = (v: unknown) => {
  const s = String(v || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.getTime() > Date.now() + 86400000 ? null : s;   // não aceita data no futuro
};
const hoje = () => new Date().toISOString().slice(0, 10);
const paraApp = (o: Observacao, euId: string, possoMexer: boolean) => ({
  id: o.id, data: o.data, categoria: o.categoria, texto: o.texto, autor_nome: o.autor_nome,
  criada_em: o.created_at, atualizada_em: o.updated_at, pode_editar: possoMexer || o.autor_id === euId
});

class ObservacaoController {
  async index(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const aluno = await Aluno.findByPk(req.params.id);
    if (!aluno || !(await podeVerAluno(eu, aluno))) return res.status(404).json({ message: "Aluno não encontrado." });
    const coordena = eu.perfil !== "professor";
    const lista = await Observacao.findAll({ where: { aluno_id: aluno.id }, order: [["data", "DESC"], ["created_at", "DESC"]] });
    return res.json(lista.map((o) => paraApp(o, eu.id, coordena)));
  }

  async store(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const aluno = await Aluno.findByPk(req.params.id);
    if (!aluno || !(await podeEditarAluno(eu, aluno))) return res.status(404).json({ message: "Aluno não encontrado." });
    const texto = String(req.body.texto || "").trim().slice(0, MAX_TEXTO);
    if (texto.length < 3) return res.status(400).json({ message: "Escreva a observação." });
    const categoria = (CATEGORIAS as readonly string[]).includes(req.body.categoria) ? req.body.categoria as Categoria : "evolucao";
    const data = req.body.data ? dataValida(req.body.data) : hoje();
    if (!data) return res.status(400).json({ message: "Data inválida (não pode ser no futuro)." });
    const o = await Observacao.create({ escola_id: aluno.escola_id, aluno_id: aluno.id, autor_id: eu.id, autor_nome: eu.nome.slice(0, 120),
      data, categoria, texto });
    return res.status(201).json(paraApp(o, eu.id, true));
  }

  async update(req: Request, res: Response): Promise<Response> {
    const { o, erro } = await minha(req);
    if (!o) return res.status(erro![0]).json({ message: erro![1] });
    if (typeof req.body.texto === "string") {
      const texto = req.body.texto.trim().slice(0, MAX_TEXTO);
      if (texto.length < 3) return res.status(400).json({ message: "Escreva a observação." });
      o.texto = texto;
    }
    if ((CATEGORIAS as readonly string[]).includes(req.body.categoria)) o.categoria = req.body.categoria;
    if (req.body.data !== undefined) {
      const data = dataValida(req.body.data);
      if (!data) return res.status(400).json({ message: "Data inválida (não pode ser no futuro)." });
      o.data = data;
    }
    await o.save();
    return res.json(paraApp(o, req.usuarioLogado!.id, true));
  }

  async destroy(req: Request, res: Response): Promise<Response> {
    const { o, erro } = await minha(req);
    if (!o) return res.status(erro![0]).json({ message: erro![1] });
    await o.destroy();
    return res.json({ ok: true });
  }
}

// a observação que a pessoa pode corrigir ou apagar: quem escreveu, a coordenação da escola do aluno, o administrador
async function minha(req: Request): Promise<{ o?: Observacao; erro?: [number, string] }> {
  const eu = req.usuarioLogado!;
  const o = await Observacao.findByPk(req.params.id);
  const aluno = o ? await Aluno.findByPk(o.aluno_id) : null;
  if (!o || !aluno || !(await podeVerAluno(eu, aluno))) return { erro: [404, "Observação não encontrada."] };
  const pode = o.autor_id === eu.id || eu.perfil === "admin" || (eu.perfil === "coordenacao" && !!eu.escola_id && aluno.escola_id === eu.escola_id);
  if (!pode) return { erro: [403, "Só quem escreveu (ou a coordenação) pode mudar esta observação."] };
  return { o };
}

export default new ObservacaoController();
