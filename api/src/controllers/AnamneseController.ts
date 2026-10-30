import { Request, Response } from "express";
import { Op } from "sequelize";
import Aluno from "../models/Aluno";
import Escola from "../models/Escola";
import { Anamnese, AnamneseModelo } from "../models/Anamnese";
import { podeEditarAluno } from "../services/acessoAluno";
import { HORAS_DO_LINK, hashDoToken, novoToken, validarPerguntas, validarRespostas } from "../services/anamnese";

// Anamnese: os modelos (questionários) e a aplicação a um aluno, presencial ou por um link de 3 horas para a família.
// Quem cria modelos: coordenação, professores e o administrador dentro da escola. Quem aplica: quem pode mexer no aluno
// (coordenação da escola, professor das turmas dele). Quem vê: coordenação e professores da escola (AlunoController.show).

const paraApp = (m: AnamneseModelo, eu: string) => ({ id: m.id, titulo: m.titulo, perguntas: m.perguntas, ativo: m.ativo,
  autor_id: m.autor_id, meu: m.autor_id === eu, atualizado_em: m.updated_at });

class AnamneseController {
  // ---------- modelos ----------

  // os modelos da escola (o professor avulso vê os dele)
  async modelos(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const where = eu.perfil === "admin" ? (eu.escola_id ? { escola_id: eu.escola_id } : {})
      : eu.escola_id ? { escola_id: eu.escola_id } : { escola_id: null, autor_id: eu.id };
    const lista = await AnamneseModelo.findAll({ where, order: [["ativo", "DESC"], ["titulo", "ASC"]] });
    return res.json(lista.map((m) => paraApp(m, eu.id)));
  }

  async criarModelo(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    if (eu.perfil === "admin") return res.status(400).json({ message: "Entre na escola (🚪 Entrar na escola) para criar um modelo para ela." });
    const titulo = String(req.body.titulo || "").trim().slice(0, 120);
    if (!titulo) return res.status(400).json({ message: "Dê um nome ao questionário de anamnese." });
    const { perguntas, erro } = validarPerguntas(req.body.perguntas);
    if (erro) return res.status(400).json({ message: erro });
    const m = await AnamneseModelo.create({ escola_id: eu.escola_id, autor_id: eu.id, titulo, perguntas: perguntas! });
    return res.status(201).json(paraApp(m, eu.id));
  }

  // muda o modelo (quem criou ou a coordenação da escola); ativo: false tira da lista de aplicar (o histórico fica)
  async atualizarModelo(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const m = await AnamneseModelo.findByPk(req.params.id);
    const pode = m && (eu.perfil === "admin" || m.autor_id === eu.id || (eu.perfil === "coordenacao" && !!eu.escola_id && m.escola_id === eu.escola_id));
    if (!m || !pode) return res.status(404).json({ message: "Modelo não encontrado." });
    if (typeof req.body.titulo === "string" && req.body.titulo.trim()) m.titulo = req.body.titulo.trim().slice(0, 120);
    if (req.body.perguntas !== undefined) {
      const { perguntas, erro } = validarPerguntas(req.body.perguntas);
      if (erro) return res.status(400).json({ message: erro });
      m.perguntas = perguntas!;
    }
    if (typeof req.body.ativo === "boolean") m.ativo = req.body.ativo;
    await m.save();
    return res.json(paraApp(m, eu.id));
  }

  // ---------- aplicar a um aluno ----------

  // presencial: quem conversou com a família preenche e grava (precisa do consentimento do responsável)
  async aplicar(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const { aluno, modelo, erro } = await alunoEModelo(req);
    if (erro) return res.status(erro[0]).json({ message: erro[1] });
    if (!aluno!.consentimento_em && req.body.consentimento !== true) {
      return res.status(400).json({ message: "Confirme que o responsável autorizou o registro destas informações (LGPD).", codigo: "consentimento" });
    }
    const { respostas, erro: erroResp } = validarRespostas(modelo!.perguntas, req.body.respostas);
    if (erroResp) return res.status(400).json({ message: erroResp });
    if (!aluno!.consentimento_em) {
      aluno!.consentimento_em = new Date();
      aluno!.consentimento_por = `${eu.nome} (presencial)`.slice(0, 160);
      await aluno!.save();
    }
    const a = await Anamnese.create({ escola_id: aluno!.escola_id, aluno_id: aluno!.id, modelo_id: modelo!.id, titulo: modelo!.titulo,
      perguntas: modelo!.perguntas, respostas: respostas!, via: "presencial", status: "respondida", criada_por: eu.id,
      respondida_por_nome: String(req.body.respondida_por_nome || eu.nome).trim().slice(0, 120), token_hash: null, expira_em: null,
      respondida_em: new Date() });
    return res.status(201).json({ id: a.id });
  }

  // link para a família: vale 3 horas e uma resposta só; o token aparece só agora (no banco fica o hash)
  async gerarLink(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const { aluno, modelo, erro } = await alunoEModelo(req);
    if (erro) return res.status(erro[0]).json({ message: erro[1] });
    const token = novoToken();
    const expira = new Date(Date.now() + HORAS_DO_LINK * 3600 * 1000);
    const a = await Anamnese.create({ escola_id: aluno!.escola_id, aluno_id: aluno!.id, modelo_id: modelo!.id, titulo: modelo!.titulo,
      perguntas: modelo!.perguntas, respostas: null, via: "link", status: "pendente", criada_por: eu.id, respondida_por_nome: null,
      token_hash: hashDoToken(token), expira_em: expira, respondida_em: null });
    return res.status(201).json({ id: a.id, token, expira_em: expira });
  }

  // cancela um link ainda não respondido
  async cancelar(req: Request, res: Response): Promise<Response> {
    const a = await Anamnese.findByPk(req.params.id);
    const aluno = a ? await Aluno.findByPk(a.aluno_id) : null;
    if (!a || !aluno || !(await podeEditarAluno(req.usuarioLogado!, aluno))) return res.status(404).json({ message: "Anamnese não encontrada." });
    if (a.status !== "pendente") return res.status(400).json({ message: "Só dá para cancelar um link que ainda não foi respondido." });
    a.status = "cancelada";
    a.token_hash = null;
    await a.save();
    return res.json({ ok: true });
  }

  // ---------- a página da família (pública, só com o token) ----------

  async publicaVer(req: Request, res: Response): Promise<Response> {
    const a = await pelaChave(req.params.token);
    if (!a) return res.status(410).json({ message: "Este link expirou ou já foi respondido. Peça um novo à escola.", codigo: "link" });
    const aluno = await Aluno.findByPk(a.aluno_id, { include: [{ model: Escola, as: "escola" }] });
    return res.json({
      titulo: a.titulo, perguntas: a.perguntas, expira_em: a.expira_em,
      aluno: (aluno?.nome_completo || aluno?.nome || "").split(" ")[0],   // só o primeiro nome
      escola: aluno?.escola ? aluno.escola.marca() : null,
      precisa_consentimento: !aluno?.consentimento_em
    });
  }

  async publicaResponder(req: Request, res: Response): Promise<Response> {
    const a = await pelaChave(req.params.token);
    if (!a) return res.status(410).json({ message: "Este link expirou ou já foi respondido. Peça um novo à escola.", codigo: "link" });
    const nome = String(req.body.respondida_por_nome || "").trim().slice(0, 120);
    if (nome.length < 3) return res.status(400).json({ message: "Digite o seu nome (de quem está respondendo)." });
    const aluno = await Aluno.findByPk(a.aluno_id);
    if (!aluno) return res.status(410).json({ message: "Este link não vale mais.", codigo: "link" });
    if (!aluno.consentimento_em && req.body.consentimento !== true) {
      return res.status(400).json({ message: "Marque a autorização para a escola guardar estas informações.", codigo: "consentimento" });
    }
    const { respostas, erro } = validarRespostas(a.perguntas, req.body.respostas);
    if (erro) return res.status(400).json({ message: erro });
    if (!aluno.consentimento_em) {
      aluno.consentimento_em = new Date();
      aluno.consentimento_por = `${nome} (responsável, pelo link)`.slice(0, 160);
      await aluno.save();
    }
    Object.assign(a, { respostas, status: "respondida", respondida_por_nome: nome, respondida_em: new Date(), token_hash: null });
    await a.save();
    return res.json({ ok: true });
  }
}

// o aluno (que a pessoa pode mexer) e o modelo (ativo, da escola do aluno)
async function alunoEModelo(req: Request): Promise<{ aluno?: Aluno; modelo?: AnamneseModelo; erro?: [number, string] }> {
  const aluno = await Aluno.findByPk(req.params.id);
  if (!aluno || !(await podeEditarAluno(req.usuarioLogado!, aluno))) return { erro: [404, "Aluno não encontrado."] };
  // o modelo é da escola do aluno (aluno de professor avulso: um modelo do próprio professor)
  const daEscola = aluno.escola_id ? { escola_id: aluno.escola_id } : { escola_id: { [Op.is]: null }, autor_id: req.usuarioLogado!.id };
  const modelo = await AnamneseModelo.findOne({ where: { id: String(req.body.modelo_id || ""), ativo: true, ...daEscola } });
  if (!modelo) return { erro: [400, "Escolha o questionário de anamnese."] };
  return { aluno, modelo };
}

// a anamnese pendente pelo token do link (dentro das 3 horas)
async function pelaChave(token: unknown): Promise<Anamnese | null> {
  const t = String(token || "");
  if (t.length < 20 || t.length > 64) return null;
  const a = await Anamnese.findOne({ where: { token_hash: hashDoToken(t), status: "pendente" } });
  if (!a || !a.expira_em || a.expira_em.getTime() < Date.now()) return null;
  return a;
}

export default new AnamneseController();
