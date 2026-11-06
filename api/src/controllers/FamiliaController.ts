import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Op, UniqueConstraintError } from "sequelize";
import sequelize from "../config/connection";
import authConfig from "../config/auth";
import Aluno, { senhaAleatoria } from "../models/Aluno";
import Escola from "../models/Escola";
import Usuario from "../models/Usuario";
import Partida from "../models/Partida";
import { Anamnese } from "../models/Anamnese";
import { PlanoObjetivos } from "../models/PlanoObjetivos";
import { RecadoFamilia, ResponsavelAluno } from "../models/Familia";
import {
  chavesFamilia, ehResponsavelDe, lerChavesFamilia, podeEditarAluno, podeVerAluno, RELATORIOS_FAMILIA, RelatorioFamilia,
  verificadorFamilia, PADRAO_FAMILIA, alunoTemDono, podeDecidirFamilia, podeRedefinirPin
} from "../services/acessoAluno";
import { fichaDoAluno, periodo } from "../services/painel";
import { conferirPinDoAluno, erroDoPin, gravarPinNovo, hashDoPin } from "../services/pin";
import { tokenDoAlunoEmCasa } from "../services/sessaoAluno";
import { gerarCodigoFamilia, normalizarCodigoFamilia } from "../services/codigoFamilia";
import { alunoParaApp, usuarioParaApp } from "./SessionController";
import { emailValido, SENHA_MINIMA } from "./UsuarioController";

// Família (docs/PLANO-FAMILIA.md): a página de cadastro da família (endereço fixo da escola ou do professor avulso:
// conta + consentimento LGPD + filhos), o que o responsável vê de cada filho, os recados para a família e as chaves do
// que a família pode ver.
// Tudo o que o responsável recebe passa por familiaPodeVer (services/acessoAluno.ts); observações internas, nunca.

const MAX_RECADO = 4000;
const linha = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// o profissional pode decidir sobre a família deste aluno? (regra em services/acessoAluno.ts)
const decideFamilia = podeDecidirFamilia;

const recadoParaApp = (r: RecadoFamilia, pode_editar?: boolean) => ({
  id: r.id, texto: r.texto, autor_nome: r.autor_nome, criado_em: r.created_at, atualizado_em: r.updated_at,
  ...(pode_editar === undefined ? {} : { pode_editar })
});

// a conta já logada que veio junto no aceite (Authorization), se houver; token inválido = sem conta
async function contaDoToken(req: Request): Promise<Usuario | null> {
  const [, token] = String(req.headers.authorization || "").split(" ");
  if (!token) return null;
  try {
    const { sub, tipo } = jwt.verify(token, authConfig.secret) as { sub: string; tipo?: string };
    return tipo === "aluno" ? null : Usuario.findByPk(sub, { include: [{ model: Escola, as: "escola" }] });
  } catch {
    return null;
  }
}

// a conta do responsável no cadastro: a que já está logada (Authorization), a que já existe com este e-mail (se a senha
// confere: quem volta para cadastrar outro filho não precisa entrar antes) ou os dados da conta nova, conferidos.
// Responde o erro e devolve null se algo não serve.
async function contaDoAceite(req: Request, res: Response): Promise<{ conta: Usuario | null; nova: { nome: string; email: string; senha: string } } | null> {
  const b = req.body || {};
  let conta = await contaDoToken(req);
  if (conta && (conta.perfil !== "responsavel" || !conta.ativo)) {
    res.status(400).json({ message: "Esta conta é da equipe da escola. Saia e entre com uma conta de responsável." });
    return null;
  }
  const nova = { nome: linha(b.nome, 120), email: String(b.email || "").trim().toLowerCase(), senha: String(b.senha || "") };
  if (!conta) {
    const erro = nova.nome.length < 3 ? "Digite o seu nome." : !emailValido(nova.email) ? "Digite um e-mail válido."
      : nova.senha.length < SENHA_MINIMA ? `A senha precisa de ${SENHA_MINIMA} caracteres ou mais.` : "";
    if (erro) { res.status(400).json({ message: erro }); return null; }
    const existente = await Usuario.findOne({ where: { email: nova.email } });
    if (existente) {
      const confere = existente.perfil === "responsavel" && existente.ativo && await bcrypt.compare(nova.senha, existente.senha);
      if (!confere) {
        res.status(409).json({ message: "Este e-mail já tem cadastro. Digite a senha da conta que você já tem (ou use outro e-mail).", codigo: "conta_existe" });
        return null;
      }
      conta = existente;
    }
  }
  return { conta, nova };
}

// a página de cadastro pelo endereço: /<escola>/cadastro (tipo "escola", chave = endereço da escola) ou
// /cadastro/<apelido> (tipo "profissional"). aberta: a escola/o profissional liga "aceitar cadastros" (e está liberado)
async function paginaDeCadastro(tipo: unknown, chave: unknown): Promise<{ escola: Escola | null; professor: Usuario | null; aberta: boolean } | null> {
  const c = String(chave || "").slice(0, 60);
  if (tipo === "escola") {
    const escola = c ? await Escola.findOne({ where: { slug: c } }) : null;
    return escola ? { escola, professor: null, aberta: escola.aceita_cadastro_familia && !escola.bloqueada } : null;
  }
  if (tipo === "profissional") {
    const professor = c ? await Usuario.findOne({ where: { apelido: c.toLowerCase(), perfil: "professor", escola_id: null } }) : null;
    return professor ? { escola: null, professor, aberta: professor.aceita_cadastro_familia && professor.ativo } : null;
  }
  return null;
}

// de quem é a página de cadastro de quem está logado: a escola (coordenação, admin dentro dela) ou o professor avulso
async function donoDoCadastro(eu: Usuario): Promise<Escola | Usuario | null> {
  if ((eu.perfil === "coordenacao" || eu.perfil === "admin") && eu.escola_id) return Escola.findByPk(eu.escola_id);
  if (eu.perfil === "professor" && !eu.escola_id) {
    const professor = await Usuario.findByPk(eu.id);
    if (professor && !professor.apelido) { professor.apelido = await apelidoNovo(professor.nome); await professor.save({ hooks: false }); }
    return professor;
  }
  return null;
}

// o endereço do professor avulso a partir do nome (ana-souza, ana-souza-2...): sem acento, minúsculo, único
async function apelidoNovo(nome: string): Promise<string> {
  const base = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "profissional";
  for (let n = 1; ; n++) {
    const apelido = n === 1 ? (base.length >= 3 ? base : `${base}-1`) : `${base}-${n}`;
    if (!(await Usuario.findOne({ where: { apelido } }))) return apelido;
  }
}

// o endereço da página de cadastro (o mesmo domínio do app): /<escola>/cadastro ou /cadastro/<apelido>
const caminhoDoCadastro = (dono: Escola | Usuario) => (dono instanceof Escola ? `/${dono.slug}/cadastro` : `/cadastro/${dono.apelido}`);

// os filhos que o responsável cadastra: nome (como aparece na turma), nome completo, nascimento e o PIN de 4 números
// (digitado duas vezes; vira hash antes de gravar)
const MAX_FILHOS = 6;
function lerFilhos(entrada: unknown): { filhos?: { nome: string; nome_completo: string | null; data_nascimento: string | null; pin: string }[]; erro?: string } {
  const lista = Array.isArray(entrada) ? entrada : [];
  if (!lista.length) return { erro: "Cadastre pelo menos um filho." };
  if (lista.length > MAX_FILHOS) return { erro: `Dá para cadastrar até ${MAX_FILHOS} filhos de uma vez.` };
  const filhos = [];
  for (const [i, bruto] of lista.entries()) {
    const f = (bruto || {}) as Record<string, unknown>;
    const nome = linha(f.nome, 40);
    if (nome.length < 2) return { erro: `Filho ${i + 1}: digite o nome (como ele é chamado).` };
    const d = String(f.data_nascimento || "");
    if (d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(new Date(`${d}T12:00:00Z`).getTime()) || new Date(d) > new Date())) {
      return { erro: `Filho ${i + 1}: data de nascimento inválida.` };
    }
    const erroPin = erroDoPin(f.pin, f.pin_confirmacao);
    if (erroPin) return { erro: `Filho ${i + 1}: ${erroPin}` };
    filhos.push({ nome, nome_completo: linha(f.nome_completo, 120) || null, data_nascimento: d || null, pin: String(f.pin) });
  }
  return { filhos };
}

// o filho do responsável logado; 403 se não for filho dele (nunca mostra outro aluno)
async function filhoDoResponsavel(req: Request, res: Response): Promise<Aluno | null> {
  const aluno = await Aluno.findByPk(req.params.id, { include: [{ model: Escola, as: "escola" }] });
  if (!aluno || !(await ehResponsavelDe(req.usuarioLogado!.id, aluno.id))) {
    res.status(403).json({ message: "Este aluno não está ligado à sua conta." });
    return null;
  }
  return aluno;
}

// o responsável ativo dono do código da família (com ou sem o "FAM-", em minúsculas)
async function responsavelDoCodigo(valor: unknown): Promise<Usuario | null> {
  const codigo = normalizarCodigoFamilia(valor);
  if (!codigo) return null;
  const usuario = await Usuario.findOne({ where: { codigo_familia: codigo, perfil: "responsavel", ativo: true } });
  return usuario || null;
}

// os filhos que podem jogar em casa: ativos, com PIN e com a escola liberada
async function filhosQueJogam(responsavelId: string): Promise<Aluno[]> {
  const vinculos = await ResponsavelAluno.findAll({ where: { responsavel_id: responsavelId },
    include: [{ model: Aluno, as: "aluno", include: [{ model: Escola, as: "escola" }] }] });
  return vinculos.map((v) => v.aluno!).filter((a) => a && a.ativo && a.pin_hash && !a.escola?.bloqueada)
    .sort((x, y) => x.nome.localeCompare(y.nome));
}

class FamiliaController {
  // ---------- responsáveis do aluno (profissionais) ----------

  // os responsáveis ligados ao aluno (para a ficha)
  async responsaveis(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const aluno = await Aluno.findByPk(req.params.id);
    if (!aluno || !(await podeEditarAluno(eu, aluno))) return res.status(404).json({ message: "Aluno não encontrado." });
    const vinculos = await ResponsavelAluno.findAll({ where: { aluno_id: aluno.id }, include: [{ model: Usuario, as: "responsavel" }], order: [["created_at", "ASC"]] });
    return res.json({
      responsaveis: vinculos.map((v) => ({ id: v.responsavel_id, nome: v.responsavel?.nome, email: v.responsavel?.email, parentesco: v.parentesco,
        origem: v.origem, consentimento_em: v.consentimento_em, desde: v.created_at })),
      pode_desvincular: await decideFamilia(eu, aluno),
      pode_redefinir_senha: await decideFamilia(eu, aluno),
      pode_redefinir_pin: !!aluno.pin_hash && await podeRedefinirPin(eu, aluno)
    });
  }

  // a equipe redefine o PIN do filho (a criança esqueceu ou ficou travada): digitado duas vezes; destrava o aluno
  async redefinirPin(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const aluno = await Aluno.findByPk(req.params.id);
    if (!aluno) return res.status(404).json({ message: "Aluno não encontrado." });
    if (!(await podeRedefinirPin(eu, aluno))) return res.status(403).json({ message: "Você não pode mudar o PIN deste aluno." });
    if (!aluno.pin_hash) return res.status(400).json({ message: "Este aluno não usa PIN (entra só com o código da turma e o nome)." });
    const erro = erroDoPin(req.body?.pin, req.body?.pin_confirmacao);
    if (erro) return res.status(400).json({ message: erro });
    await gravarPinNovo(aluno, String(req.body.pin));   // também derruba os logins lembrados do aluno
    return res.json({ ok: true });
  }

  // a equipe dá uma senha provisória ao responsável que esqueceu a dele (a senha atual nunca aparece). A tela gera a
  // provisória e mostra uma vez só; no próximo login o responsável é obrigado a criar a própria (primeiro_login).
  async redefinirSenhaDoResponsavel(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const senha = String(req.body?.senha || "");
    if (senha.length < SENHA_MINIMA) return res.status(400).json({ message: `A senha provisória precisa de ${SENHA_MINIMA} caracteres ou mais.` });
    const aluno = await Aluno.findByPk(req.params.id);
    if (!aluno) return res.status(404).json({ message: "Aluno não encontrado." });
    if (!(await decideFamilia(eu, aluno))) return res.status(403).json({ message: "Só a coordenação dá uma senha nova ao responsável." });
    const vinculo = await ResponsavelAluno.findOne({ where: { aluno_id: aluno.id, responsavel_id: req.params.responsavelId } });
    const conta = vinculo ? await Usuario.findByPk(vinculo.responsavel_id) : null;
    if (!conta || conta.perfil !== "responsavel") return res.status(404).json({ message: "Este responsável não está ligado ao aluno." });
    conta.senha = senha;
    conta.primeiro_login = true;
    await conta.save();
    return res.json({ ok: true, nome: conta.nome, email: conta.email });
  }

  // tira o responsável do aluno (a conta dele continua; só perde o acesso a este aluno)
  async desvincular(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const aluno = await Aluno.findByPk(req.params.id);
    if (!aluno || !(await podeEditarAluno(eu, aluno))) return res.status(404).json({ message: "Aluno não encontrado." });
    if (!(await decideFamilia(eu, aluno))) return res.status(403).json({ message: "Só a coordenação tira um responsável do aluno." });
    const apagados = await ResponsavelAluno.destroy({ where: { aluno_id: aluno.id, responsavel_id: req.params.responsavelId } });
    if (!apagados) return res.status(404).json({ message: "Este responsável não está ligado ao aluno." });
    return res.json({ ok: true });
  }

  // ---------- página de cadastro da família ----------

  // a chave "aceitar cadastros de famílias" e o endereço da página (coordenação, admin dentro da escola, professor avulso)
  async verCadastro(req: Request, res: Response): Promise<Response> {
    const dono = await donoDoCadastro(req.usuarioLogado!);
    if (!dono) return res.status(403).json({ message: "Só a coordenação cuida do cadastro das famílias." });
    return res.json({ aceita: dono.aceita_cadastro_familia, caminho: caminhoDoCadastro(dono) });
  }

  async mudarCadastro(req: Request, res: Response): Promise<Response> {
    if (typeof req.body?.aceita !== "boolean") return res.status(400).json({ message: "Informe aceita: true ou false." });
    const dono = await donoDoCadastro(req.usuarioLogado!);
    if (!dono) return res.status(403).json({ message: "Só a coordenação cuida do cadastro das famílias." });
    dono.aceita_cadastro_familia = req.body.aceita;
    await dono.save({ hooks: false });
    return res.json({ aceita: dono.aceita_cadastro_familia, caminho: caminhoDoCadastro(dono) });
  }

  // o que a página pública mostra: de quem é (a marca da escola ou o nome do profissional) e se está aberta
  async paginaCadastro(req: Request, res: Response): Promise<Response> {
    const pg = await paginaDeCadastro(req.params.tipo, req.params.chave);
    if (!pg) return res.status(404).json({ message: "Página de cadastro não encontrada. Confira o endereço com a escola.", codigo: "cadastro" });
    return res.json({ tipo: pg.escola ? "escola" : "profissional", aberta: pg.aberta, escola: pg.escola ? pg.escola.marca() : null,
      profissional: pg.professor ? pg.professor.nome : null });
  }

  // o responsável cria a conta (ou usa a que já tem), autoriza (LGPD) e cadastra os filhos: na escola eles ficam sem turma
  // ("aguardando turma"); no professor avulso, como pacientes dele. A página fica valendo para as outras famílias.
  async cadastrar(req: Request, res: Response): Promise<Response> {
    const b = req.body || {};
    const pg = await paginaDeCadastro(req.params.tipo, req.params.chave);
    if (!pg) return res.status(404).json({ message: "Página de cadastro não encontrada. Confira o endereço com a escola.", codigo: "cadastro" });
    if (!pg.aberta) return res.status(403).json({ message: "O cadastro de famílias não está aberto agora. Fale com a escola.", codigo: "cadastro_fechado" });
    if (b.consentimento !== true) {
      return res.status(400).json({ message: "Marque a autorização para guardar e mostrar a você as informações dos seus filhos (LGPD).", codigo: "consentimento" });
    }
    const { filhos, erro } = lerFilhos(b.filhos);
    if (erro) return res.status(400).json({ message: erro });
    const lida = await contaDoAceite(req, res);
    if (!lida) return res;
    const { nome, email, senha } = lida.nova;
    const parentesco = linha(b.parentesco, 40) || null;
    const agora = new Date();

    let conta: Usuario;
    let criados: Aluno[];
    try {
      [conta, criados] = await sequelize.transaction(async (transaction) => {
        const quem = lida.conta || await Usuario.create({ nome, email, senha, perfil: "responsavel", escola_id: null, ultimo_acesso: agora,
          primeiro_login: false }, { transaction });
        const alunos: Aluno[] = [];
        for (const f of filhos!) {
          const { pin, ...dados } = f;
          const aluno = await Aluno.create({ ...dados, pin_hash: await hashDoPin(pin), senha_figuras: senhaAleatoria(), escola_id: pg.escola?.id ?? null, professor_id: pg.professor?.id ?? null, turma_id: null,
            cadastro_origem: "familia", responsavel_nome: quem.nome.slice(0, 120), responsavel_contato: quem.email.slice(0, 120),
            consentimento_em: agora, consentimento_por: `${quem.nome} (responsável, na página de cadastro)`.slice(0, 160),
            bloqueado_ate: null, ultimo_acesso: null }, { transaction });
          await ResponsavelAluno.create({ responsavel_id: quem.id, aluno_id: aluno.id, parentesco, origem: "pagina_cadastro", consentimento_em: agora }, { transaction });
          alunos.push(aluno);
        }
        return [quem, alunos] as [Usuario, Aluno[]];
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return res.status(409).json({ message: "Este e-mail já tem cadastro. Digite a senha da conta que você já tem.", codigo: "conta_existe" });
      }
      console.error("Erro no cadastro da família:", error);
      return res.status(500).json({ message: "Erro ao fazer o cadastro." });
    }
    const token = jwt.sign({}, authConfig.secret, { subject: conta.id, expiresIn: authConfig.expiresIn } as jwt.SignOptions);
    return res.status(201).json({ token, usuario: usuarioParaApp(conta), alunos: criados.map((a) => ({ id: a.id, nome: a.nome })) });
  }

  // ---------- área do responsável ----------

  async filhos(req: Request, res: Response): Promise<Response> {
    const vinculos = await ResponsavelAluno.findAll({ where: { responsavel_id: req.usuarioLogado!.id },
      include: [{ model: Aluno, as: "aluno", include: [{ model: Escola, as: "escola" }] }] });
    const ativos = vinculos.filter((v) => v.aluno?.ativo);
    return res.json(await Promise.all(ativos.map(async (v) => ({
      id: v.aluno!.id, nome: v.aluno!.nome, nome_completo: v.aluno!.nome_completo, parentesco: v.parentesco,
      escola: v.aluno!.escola ? { nome: v.aluno!.escola.nome, logo: v.aluno!.escola.logo || "" } : null,
      tem_pin: !!v.aluno!.pin_hash,
      relatorios: await relatoriosVisiveis(v.aluno!)
    }))));
  }

  // "Quem vai jogar?": o filho digita o PIN no aparelho do responsável e entra nos jogos sem código de turma. O token
  // do aluno vale 30 dias (o app lembra o login); o mesmo bloqueio do PIN da entrada pela turma (5 erros, 5 minutos).
  async entrarParaJogar(req: Request, res: Response): Promise<Response> {
    const aluno = await filhoDoResponsavel(req, res);
    if (!aluno) return res;
    if (!aluno.ativo) return res.status(403).json({ message: "Este aluno está desativado. Fale com a escola." });
    if (aluno.escola?.bloqueada) return res.status(403).json({ message: "O acesso desta escola está bloqueado.", codigo: "escola_bloqueada" });
    if (!aluno.pin_hash) return res.status(409).json({ message: "Crie o PIN deste filho na área da família (Trocar PIN) antes de jogar.", codigo: "sem_pin" });
    const erro = await conferirPinDoAluno(aluno, req.body?.pin);
    if (erro) return res.status(erro.status).json(erro.corpo);
    aluno.ultimo_acesso = new Date();
    await aluno.save();
    return res.json({ token: tokenDoAlunoEmCasa(aluno, req.usuarioLogado!.id), aluno: alunoParaApp(aluno, "casa") });
  }

  // ---------- código da família: o filho joga no aparelho dele, sem a conta do responsável ----------

  // o código da família do responsável (nasce no primeiro pedido)
  async verCodigo(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    return res.json({ codigo: eu.codigo_familia || await gerarCodigoFamilia(eu) });
  }

  // gera outro código: o antigo para de valer e os aparelhos que entraram com ele precisam do código novo
  async novoCodigo(req: Request, res: Response): Promise<Response> {
    return res.json({ codigo: await gerarCodigoFamilia(req.usuarioLogado!) });
  }

  // público (com limite por IP): os filhos da família do código. Só o apelido (o nome curto que a criança toca) e só
  // quem pode jogar (ativo, com PIN, escola liberada): nada de nome completo, escola ou relatórios.
  async filhosPeloCodigo(req: Request, res: Response): Promise<Response> {
    const responsavel = await responsavelDoCodigo(req.params.codigo);
    if (!responsavel) return res.status(404).json({ message: "Não achei esse código da família. Confira com um adulto." });
    return res.json({ filhos: (await filhosQueJogam(responsavel.id)).map((a) => ({ id: a.id, nome: a.nome })) });
  }

  // público: o filho toca no nome e digita o PIN no aparelho dele → token de aluno de 30 dias (local = casa)
  async entrarPeloCodigo(req: Request, res: Response): Promise<Response> {
    const responsavel = await responsavelDoCodigo(req.params.codigo);
    if (!responsavel) return res.status(404).json({ message: "Não achei esse código da família. Confira com um adulto." });
    const aluno = (await filhosQueJogam(responsavel.id)).find((a) => a.id === String(req.body?.aluno_id || ""));
    if (!aluno) return res.status(404).json({ message: "Não achei você nesta família." });
    const erro = await conferirPinDoAluno(aluno, req.body?.pin);
    if (erro) return res.status(erro.status).json(erro.corpo);
    aluno.ultimo_acesso = new Date();
    await aluno.save();
    return res.json({ token: tokenDoAlunoEmCasa(aluno, responsavel.id, responsavel.codigo_familia!), aluno: alunoParaApp(aluno, "casa") });
  }

  // os dados do filho (nunca as observações do cadastro, que são da equipe) e quais relatórios aparecem
  async filho(req: Request, res: Response): Promise<Response> {
    const aluno = await filhoDoResponsavel(req, res);
    if (!aluno) return res;
    const vinculo = await ResponsavelAluno.findOne({ where: { responsavel_id: req.usuarioLogado!.id, aluno_id: aluno.id } });
    return res.json({
      id: aluno.id, nome: aluno.nome, nome_completo: aluno.nome_completo, data_nascimento: aluno.data_nascimento,
      parentesco: vinculo?.parentesco || null, consentimento_em: vinculo?.consentimento_em || null,
      escola: aluno.escola ? { nome: aluno.escola.nome, logo: aluno.escola.logo || "" } : null,
      relatorios: await relatoriosVisiveis(aluno)
    });
  }

  // o responsável corrige os dados cadastrais do filho (só nome completo e data de nascimento)
  async atualizarFilho(req: Request, res: Response): Promise<Response> {
    const aluno = await filhoDoResponsavel(req, res);
    if (!aluno) return res;
    const b = req.body || {};
    if (typeof b.nome_completo === "string") aluno.nome_completo = linha(b.nome_completo, 120) || null;
    if (b.data_nascimento !== undefined) {
      const d = String(b.data_nascimento || "");
      if (d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(new Date(`${d}T12:00:00Z`).getTime()) || new Date(d) > new Date())) {
        return res.status(400).json({ message: "Data de nascimento inválida." });
      }
      aluno.data_nascimento = d || null;
    }
    await aluno.save();
    return res.json({ ok: true, nome_completo: aluno.nome_completo, data_nascimento: aluno.data_nascimento });
  }

  // o responsável troca o PIN do filho (digitado duas vezes); destrava o aluno se ele estava bloqueado por erros
  async trocarPin(req: Request, res: Response): Promise<Response> {
    const aluno = await filhoDoResponsavel(req, res);
    if (!aluno) return res;
    const erro = erroDoPin(req.body?.pin, req.body?.pin_confirmacao);
    if (erro) return res.status(400).json({ message: erro });
    await gravarPinNovo(aluno, String(req.body.pin));   // também derruba os logins lembrados do aluno
    return res.json({ ok: true });
  }

  // jogos e desempenho do filho (a mesma ficha da equipe, sem as anotações dela) e as últimas partidas
  async jogos(req: Request, res: Response): Promise<Response> {
    const aluno = await filhoDoResponsavel(req, res);
    if (!aluno) return res;
    if (!(await verificadorFamilia(aluno)("jogos"))) return res.status(403).json({ message: "Este relatório não está disponível.", codigo: "desligado" });
    const partidas = await Partida.findAll({ where: { aluno_id: aluno.id }, order: [["jogada_em", "DESC"]], limit: 30,
      attributes: ["id", "jogo", "titulo", "acertos", "total", "estrelas", "nivel_max", "duracao_s", "jogada_em", "local"] });
    return res.json({ ...(await fichaDoAluno(aluno.id, periodo(req.query.dias))), ultimas: partidas });
  }

  async recadosDoFilho(req: Request, res: Response): Promise<Response> {
    const aluno = await filhoDoResponsavel(req, res);
    if (!aluno) return res;
    const pode = verificadorFamilia(aluno);
    const lista = await RecadoFamilia.findAll({ where: { aluno_id: aluno.id }, order: [["created_at", "DESC"]] });
    const visiveis = [];
    for (const r of lista) if (await pode("recados", r.autor_id)) visiveis.push(recadoParaApp(r));
    return res.json(visiveis);
  }

  // os planos (em andamento ou concluídos; o rascunho é da equipe), cada um pela regra de quem escreveu
  async planosDoFilho(req: Request, res: Response): Promise<Response> {
    const aluno = await filhoDoResponsavel(req, res);
    if (!aluno) return res;
    const pode = verificadorFamilia(aluno);
    const lista = await PlanoObjetivos.findAll({ where: { aluno_id: aluno.id, status: { [Op.ne]: "elaboracao" } }, order: [["created_at", "DESC"]] });
    const visiveis = [];
    for (const p of lista) {
      if (!(await pode("plano", p.autor_id))) continue;
      visiveis.push({ id: p.id, profissional_nome: p.profissional_nome, ciclo: p.ciclo, foco: p.foco, status: p.status,
        objetivos: p.objetivos.map((o) => ({ area: o.area, descricao: o.descricao, jogos: o.jogos, prazo: o.prazo, dias: o.dias })),
        orientacoes_familia: p.orientacoes_familia, criado_em: p.created_at, atualizado_em: p.updated_at });
    }
    return res.json(visiveis);
  }

  // as anamneses respondidas: as que a família preencheu (pelo link ou pela conta) aparecem sempre; as que a equipe
  // aplicou (pareceres) seguem a chave "anamnese" de quem aplicou
  async anamnesesDoFilho(req: Request, res: Response): Promise<Response> {
    const aluno = await filhoDoResponsavel(req, res);
    if (!aluno) return res;
    if (!(await alunoTemDono(aluno))) return res.json([]);   // compra avulsa: não tem anamnese
    const pode = verificadorFamilia(aluno);
    const lista = await Anamnese.findAll({ where: { aluno_id: aluno.id, status: "respondida" }, order: [["respondida_em", "DESC"]] });
    const visiveis = [];
    for (const a of lista) {
      const daFamilia = a.via === "link" || a.responsavel_id === req.usuarioLogado!.id;
      if (!daFamilia && !(await pode("anamnese", a.criada_por))) continue;
      visiveis.push({ id: a.id, titulo: a.titulo, perguntas: a.perguntas, respostas: a.respostas, via: a.via, da_familia: daFamilia,
        respondida_por_nome: a.respondida_por_nome, respondida_em: a.respondida_em });
    }
    return res.json(visiveis);
  }

  // ---------- recados para a família (profissionais) ----------

  async recados(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const aluno = await Aluno.findByPk(req.params.id);
    if (!aluno || !(await podeVerAluno(eu, aluno))) return res.status(404).json({ message: "Aluno não encontrado." });
    const lista = await RecadoFamilia.findAll({ where: { aluno_id: aluno.id }, order: [["created_at", "DESC"]] });
    const coordena = eu.perfil !== "professor" && (await podeEditarAluno(eu, aluno));
    return res.json(lista.map((r) => recadoParaApp(r, coordena || r.autor_id === eu.id)));
  }

  async criarRecado(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const aluno = await Aluno.findByPk(req.params.id);
    if (!aluno || !(await podeEditarAluno(eu, aluno))) return res.status(404).json({ message: "Aluno não encontrado." });
    const texto = String(req.body.texto || "").trim().slice(0, MAX_RECADO);
    if (texto.length < 3) return res.status(400).json({ message: "Escreva o recado." });
    const r = await RecadoFamilia.create({ escola_id: aluno.escola_id, aluno_id: aluno.id, autor_id: eu.id, autor_nome: eu.nome.slice(0, 120), texto });
    return res.status(201).json(recadoParaApp(r, true));
  }

  async atualizarRecado(req: Request, res: Response): Promise<Response> {
    const r = await recadoQuePossoMexer(req);
    if (!r) return res.status(404).json({ message: "Recado não encontrado." });
    const texto = String(req.body.texto || "").trim().slice(0, MAX_RECADO);
    if (texto.length < 3) return res.status(400).json({ message: "Escreva o recado." });
    r.texto = texto;
    await r.save();
    return res.json(recadoParaApp(r, true));
  }

  async apagarRecado(req: Request, res: Response): Promise<Response> {
    const r = await recadoQuePossoMexer(req);
    if (!r) return res.status(404).json({ message: "Recado não encontrado." });
    await r.destroy();
    return res.json({ ok: true });
  }

  // ---------- o que a família vê ----------

  // as chaves da escola (coordenação, ou o administrador dentro da escola) ou do professor avulso (os pacientes dele)
  async verChaves(req: Request, res: Response): Promise<Response> {
    const dono = await donoDasChaves(req.usuarioLogado!);
    if (!dono) return res.status(403).json({ message: "Só a coordenação muda o que a família vê." });
    return res.json({ chaves: chavesFamilia(dono.visivel_familia), padrao: PADRAO_FAMILIA });
  }

  async mudarChaves(req: Request, res: Response): Promise<Response> {
    const dono = await donoDasChaves(req.usuarioLogado!);
    if (!dono) return res.status(403).json({ message: "Só a coordenação muda o que a família vê." });
    const lidas = lerChavesFamilia(req.body);
    if (!Object.keys(lidas).length) return res.status(400).json({ message: `Informe ligado ou desligado para: ${RELATORIOS_FAMILIA.join(", ")}.` });
    dono.visivel_familia = { ...chavesFamilia(dono.visivel_familia), ...lidas } as Record<RelatorioFamilia, boolean>;
    await dono.save({ hooks: false });
    return res.json({ chaves: chavesFamilia(dono.visivel_familia), padrao: PADRAO_FAMILIA });
  }

  // a exceção na ficha do aluno: true/false sobrepõe a regra; null volta a seguir a regra
  async verChavesDoAluno(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const aluno = await Aluno.findByPk(req.params.id);
    if (!aluno || !(await podeVerAluno(eu, aluno))) return res.status(404).json({ message: "Aluno não encontrado." });
    return res.json({ excecao: aluno.visivel_familia || {}, regra: await relatoriosVisiveis(aluno, true), efetivo: await relatoriosVisiveis(aluno),
      pode_mudar: await decideFamilia(eu, aluno) });
  }

  async mudarChavesDoAluno(req: Request, res: Response): Promise<Response> {
    const eu = req.usuarioLogado!;
    const aluno = await Aluno.findByPk(req.params.id);
    if (!aluno || !(await podeVerAluno(eu, aluno))) return res.status(404).json({ message: "Aluno não encontrado." });
    if (!(await decideFamilia(eu, aluno))) return res.status(403).json({ message: "Só a coordenação muda o que a família vê." });
    const lidas = lerChavesFamilia(req.body, true);
    if (!Object.keys(lidas).length) return res.status(400).json({ message: `Informe ligado, desligado ou null para: ${RELATORIOS_FAMILIA.join(", ")}.` });
    const excecao: Record<string, boolean> = { ...(aluno.visivel_familia || {}) } as Record<string, boolean>;
    for (const [r, v] of Object.entries(lidas)) { if (v === null) delete excecao[r]; else excecao[r] = v; }
    aluno.visivel_familia = Object.keys(excecao).length ? excecao : null;
    await aluno.save();
    return res.json({ excecao: aluno.visivel_familia || {}, regra: await relatoriosVisiveis(aluno, true), efetivo: await relatoriosVisiveis(aluno), pode_mudar: true });
  }
}

// o que aparece na tela da família para este aluno (pela regra da escola do aluno e a exceção dele); os recados, planos
// e anamneses de outro profissional (psicopedagoga) são conferidos item a item nas rotas de cada relatório
async function relatoriosVisiveis(aluno: Aluno, ignorarExcecao = false): Promise<Record<RelatorioFamilia, boolean>> {
  const pode = verificadorFamilia(aluno, ignorarExcecao);
  const r = {} as Record<RelatorioFamilia, boolean>;
  for (const rel of RELATORIOS_FAMILIA) r[rel] = await pode(rel);
  return r;
}

// quem guarda as chaves: a escola da coordenação (ou do administrador dentro dela) ou o professor avulso
async function donoDasChaves(eu: Usuario): Promise<Escola | Usuario | null> {
  if ((eu.perfil === "coordenacao" || eu.perfil === "admin") && eu.escola_id) return Escola.findByPk(eu.escola_id);
  if (eu.perfil === "professor" && !eu.escola_id) return Usuario.findByPk(eu.id);
  return null;
}

// o recado que a pessoa pode corrigir ou apagar: quem escreveu ou a coordenação/administrador (que mexem no aluno)
async function recadoQuePossoMexer(req: Request): Promise<RecadoFamilia | null> {
  const eu = req.usuarioLogado!;
  const r = await RecadoFamilia.findByPk(req.params.id);
  const aluno = r ? await Aluno.findByPk(r.aluno_id) : null;
  if (!r || !aluno || !(await podeEditarAluno(eu, aluno))) return null;
  return r.autor_id === eu.id || eu.perfil !== "professor" ? r : null;
}

export default new FamiliaController();
