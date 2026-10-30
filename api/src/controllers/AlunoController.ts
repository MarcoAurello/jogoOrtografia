import { Request, Response } from "express";
import { fn, col, Op } from "sequelize";
import Aluno, { AlunoTurma, senhaAleatoria } from "../models/Aluno";
import Partida from "../models/Partida";
import Turma from "../models/Turma";
import { Anamnese } from "../models/Anamnese";
import { turmaDoUsuario } from "../services/acessoTurma";
import { alunosDaTurma, filtroDosAlunosVisiveis, podeEditarAluno, podeVerAluno, turmasDoAluno, turmasDoProfessor, vincular } from "../services/acessoAluno";

const MAX_ALUNOS_POR_VEZ = 60;
// nome de exibição: primeiro nome + inicial (ex.: "Ana S."), como o professor digitar, sem espaços sobrando
const limparNome = (nome: unknown) => String(nome || "").replace(/\s+/g, " ").trim().slice(0, 40);
const texto = (v: unknown, max: number) => { const s = String(v ?? "").trim().slice(0, max); return s || null; };
const dataValida = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : null);

// o aluno como a tela "Alunos e anamnese" precisa
const paraLista = (a: Aluno, turmas: { id: string; nome: string }[], anamneses: number, ultima: Date | null) => ({
  id: a.id, nome: a.nome, ativo: a.ativo, nome_completo: a.nome_completo, data_nascimento: a.data_nascimento,
  responsavel_nome: a.responsavel_nome, responsavel_contato: a.responsavel_contato, observacoes: a.observacoes,
  consentimento_em: a.consentimento_em, turmas, anamneses, ultima_anamnese: ultima
});

class AlunoController {
  // ---------- dentro de uma turma (tela Turmas e alunos) ----------

  // alunos da turma, com as partidas e o último jogo (nesta turma); ativo = ativo na escola e na turma
  async index(req: Request, res: Response): Promise<Response> {
    const turma = await turmaDoUsuario(req.usuarioLogado!, req.params.turmaId);
    if (!turma) return res.status(404).json({ message: "Turma não encontrada." });
    const ligacoes = await AlunoTurma.findAll({ where: { turma_id: turma.id } });
    const naTurma = new Map(ligacoes.map((l) => [l.aluno_id, l.ativo]));
    const alunos = await Aluno.findAll({
      where: { id: { [Op.in]: [...naTurma.keys()] } },
      attributes: ["id", "nome", "ativo", "ultimo_acesso", "nome_completo"],
      order: [["nome", "ASC"]]
    });
    const jogadas = await Partida.findAll({
      attributes: ["aluno_id", [fn("COUNT", col("id")), "qtd"], [fn("MAX", col("jogada_em")), "ultima"]],
      where: { turma_id: turma.id }, group: ["aluno_id"], raw: true
    }) as unknown as { aluno_id: string; qtd: number; ultima: Date }[];
    const porAluno = new Map(jogadas.map((j) => [j.aluno_id, j]));
    return res.json({
      turma,
      alunos: alunos.map((a) => ({ ...a.toJSON(), ativo: a.ativo && !!naTurma.get(a.id), partidas: Number(porAluno.get(a.id)?.qtd || 0),
        ultima_partida: porAluno.get(a.id)?.ultima || null }))
        .sort((x, y) => Number(y.ativo) - Number(x.ativo) || x.nome.localeCompare(y.nome))
    });
  }

  // cadastra vários de uma vez (um nome por linha) já ligados à turma
  async store(req: Request, res: Response): Promise<Response> {
    const turma = await turmaDoUsuario(req.usuarioLogado!, req.params.turmaId);
    if (!turma) return res.status(404).json({ message: "Turma não encontrada." });
    const nomes = (Array.isArray(req.body.nomes) ? req.body.nomes : []).map(limparNome).filter((n: string) => n.length >= 2);
    if (!nomes.length) return res.status(400).json({ message: "Digite pelo menos um nome (um por linha)." });
    if (nomes.length > MAX_ALUNOS_POR_VEZ) return res.status(400).json({ message: `Cadastre até ${MAX_ALUNOS_POR_VEZ} alunos por vez.` });
    // o mesmo nome não pode aparecer duas vezes na turma (o aluno se acha pelo nome na hora de entrar)
    const existentes = new Set((await alunosDaTurma(turma.id)).map((a) => a.nome.toLowerCase()));
    const novos: string[] = [];
    const repetidos: string[] = [];
    for (const nome of nomes) {
      if (existentes.has(nome.toLowerCase())) repetidos.push(nome);
      else { existentes.add(nome.toLowerCase()); novos.push(nome); }
    }
    const criados = await Aluno.bulkCreate(novos.map((nome) => ({
      nome, turma_id: turma.id, escola_id: turma.escola_id, senha_figuras: senhaAleatoria(), bloqueado_ate: null, ultimo_acesso: null
    })));
    for (const a of criados) await vincular(a.id, turma.id);
    return res.status(201).json({ criados: criados.map((a) => ({ id: a.id, nome: a.nome })), repetidos });
  }

  // ---------- alunos da escola (tela Alunos e anamnese) ----------

  // a lista: coordenação e professores da escola veem todos (com ou sem turma); professor avulso, os das turmas dele
  async escola(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const alunos = await Aluno.findAll({ where: await filtroDosAlunosVisiveis(eu), order: [["nome", "ASC"]] });
    const ids = alunos.map((a) => a.id);
    const ligacoes = ids.length ? await AlunoTurma.findAll({ where: { aluno_id: { [Op.in]: ids }, ativo: true } }) : [];
    const turmas = new Map((await Turma.findAll({ where: { id: { [Op.in]: [...new Set(ligacoes.map((l) => l.turma_id))] } }, attributes: ["id", "nome", "ativa"] }))
      .map((t) => [t.id, t]));
    const contagem = ids.length ? await Anamnese.findAll({
      attributes: ["aluno_id", [fn("COUNT", col("id")), "qtd"], [fn("MAX", col("respondida_em")), "ultima"]],
      where: { aluno_id: { [Op.in]: ids }, status: "respondida" }, group: ["aluno_id"], raw: true
    }) as unknown as { aluno_id: string; qtd: number; ultima: Date }[] : [];
    const porAluno = new Map(contagem.map((x) => [x.aluno_id, x]));
    const minhas = new Set(eu.perfil === "professor" ? await turmasDoProfessor(eu.id) : []);
    return res.json(alunos.map((a) => {
      const dele = ligacoes.filter((l) => l.aluno_id === a.id).map((l) => turmas.get(l.turma_id)).filter(Boolean) as Turma[];
      return {
        ...paraLista(a, dele.map((t) => ({ id: t.id, nome: t.nome })), Number(porAluno.get(a.id)?.qtd || 0), porAluno.get(a.id)?.ultima || null),
        // o professor só mexe (cadastro, anamnese, ficha) nos alunos das turmas dele
        pode_editar: eu.perfil !== "professor" || dele.some((t) => minhas.has(t.id))
      };
    }));
  }

  // um aluno: cadastro, turmas e o histórico de anamneses (respondidas e links pendentes)
  async show(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const aluno = await Aluno.findByPk(req.params.id);
    if (!aluno || !(await podeVerAluno(eu, aluno))) return res.status(404).json({ message: "Aluno não encontrado." });
    const turmas = await Turma.findAll({ where: { id: { [Op.in]: await turmasDoAluno(aluno.id, true) } }, attributes: ["id", "nome"] });
    const anamneses = await Anamnese.findAll({ where: { aluno_id: aluno.id }, order: [["created_at", "DESC"]] });
    return res.json({
      aluno: paraLista(aluno, turmas.map((t) => ({ id: t.id, nome: t.nome })), anamneses.filter((x) => x.status === "respondida").length, null),
      pode_editar: await podeEditarAluno(eu, aluno),
      anamneses: anamneses.map((x) => ({
        id: x.id, titulo: x.titulo, via: x.via, status: x.status === "pendente" && x.expira_em && x.expira_em.getTime() < Date.now() ? "expirada" : x.status,
        perguntas: x.perguntas, respostas: x.respostas, respondida_por_nome: x.respondida_por_nome, respondida_em: x.respondida_em,
        expira_em: x.expira_em, criada_em: x.created_at
      }))
    });
  }

  // aluno novo pela escola, com cadastro; pode ficar sem turma (só a coordenação; o professor liga a uma turma dele)
  async criar(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const nome = limparNome(req.body.nome);
    if (nome.length < 2) return res.status(400).json({ message: "Digite o nome do aluno (como ele aparece na turma, ex.: Ana S.)." });
    const turmas = await turmasPermitidas(req, Array.isArray(req.body.turmas) ? req.body.turmas.map(String) : []);
    if (turmas === null) return res.status(403).json({ message: "Você só pode ligar o aluno às suas turmas." });
    if (eu.perfil === "professor" && !turmas.length) return res.status(400).json({ message: "Escolha pelo menos uma das suas turmas para o aluno." });
    if (eu.perfil === "admin" && !turmas.length) return res.status(400).json({ message: "Entre na escola (🚪 Entrar na escola) para cadastrar um aluno sem turma." });
    const escolaId = eu.perfil === "admin" ? turmas[0].escola_id : eu.escola_id;
    for (const t of turmas) {
      if ((await alunosDaTurma(t.id)).some((a) => a.nome.toLowerCase() === nome.toLowerCase())) {
        return res.status(409).json({ message: `Já existe um aluno chamado ${nome} na turma ${t.nome}.` });
      }
    }
    const aluno = await Aluno.create({ nome, turma_id: turmas[0]?.id ?? null, escola_id: escolaId, senha_figuras: senhaAleatoria(),
      bloqueado_ate: null, ultimo_acesso: null, ...cadastro(req.body) });
    for (const t of turmas) await vincular(aluno.id, t.id);
    return res.status(201).json({ id: aluno.id, nome: aluno.nome });
  }

  // muda o cadastro, as turmas, desativa na escola ou só numa turma ({ turma, ativo })
  async update(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const aluno = await Aluno.findByPk(req.params.id);
    if (!aluno || !(await podeEditarAluno(eu, aluno))) return res.status(404).json({ message: "Aluno não encontrado." });
    const b = req.body || {};

    // ativar/desativar só numa turma (tela da turma)
    if (b.turma && typeof b.ativo === "boolean") {
      const turma = await turmaDoUsuario(eu, String(b.turma));
      const ligacao = turma ? await AlunoTurma.findOne({ where: { aluno_id: aluno.id, turma_id: turma.id } }) : null;
      if (!ligacao) return res.status(404).json({ message: "O aluno não está nesta turma." });
      ligacao.ativo = b.ativo;
      await ligacao.save();
      return res.json({ ok: true });
    }

    const nome = limparNome(b.nome);
    if (nome.length >= 2 && nome.toLowerCase() !== aluno.nome.toLowerCase()) {
      for (const id of await turmasDoAluno(aluno.id, true)) {
        if ((await alunosDaTurma(id)).some((a) => a.id !== aluno.id && a.nome.toLowerCase() === nome.toLowerCase())) {
          return res.status(409).json({ message: "Já existe um aluno com esse nome numa das turmas dele." });
        }
      }
      aluno.nome = nome;
    }
    if (typeof b.ativo === "boolean") aluno.ativo = b.ativo;
    if (b.cadastro && typeof b.cadastro === "object") Object.assign(aluno, cadastro(b.cadastro));

    // turmas: a coordenação define todas (da escola); o professor só põe ou tira das turmas dele
    if (Array.isArray(b.turmas)) {
      const pedidas = await turmasPermitidas(req, b.turmas.map(String), true);
      if (pedidas === null) return res.status(403).json({ message: "Você só pode ligar o aluno às turmas da escola." });
      const editaveis = eu.perfil === "professor" ? new Set(await turmasDoProfessor(eu.id)) : null;
      for (const id of await turmasDoAluno(aluno.id, true)) {
        if (!pedidas.some((t) => t.id === id) && (!editaveis || editaveis.has(id))) {
          await AlunoTurma.update({ ativo: false }, { where: { aluno_id: aluno.id, turma_id: id } });
        }
      }
      for (const t of pedidas) {
        if (aluno.escola_id && t.escola_id !== aluno.escola_id) return res.status(400).json({ message: "A turma é de outra escola." });
        await vincular(aluno.id, t.id);
      }
    }
    await aluno.save();
    return res.json({ ok: true });
  }
}

// os campos do cadastro (tudo opcional)
function cadastro(b: Record<string, unknown>) {
  return {
    nome_completo: texto(b.nome_completo, 120), data_nascimento: dataValida(b.data_nascimento),
    responsavel_nome: texto(b.responsavel_nome, 120), responsavel_contato: texto(b.responsavel_contato, 120),
    observacoes: texto(b.observacoes, 2000)
  };
}

// as turmas pedidas, se a pessoa pode ligar alunos a elas (null = pediu uma que não enxerga); o professor só as dele
// (ignorarDeOutros: na edição, as turmas de outros professores ficam como estão, sem erro)
async function turmasPermitidas(req: Request, ids: string[], ignorarDeOutros = false): Promise<Turma[] | null> {
  const eu = req.usuarioLogado!;
  const minhas = eu.perfil === "professor" ? new Set(await turmasDoProfessor(eu.id)) : null;
  const turmas: Turma[] = [];
  for (const id of [...new Set(ids)].slice(0, 30)) {
    if (minhas && !minhas.has(id)) { if (ignorarDeOutros) continue; return null; }
    const t = await turmaDoUsuario(eu, id);
    if (!t) return null;
    turmas.push(t);
  }
  return turmas;
}

export default new AlunoController();
