import Escola from "../models/Escola";
import { Competicao, Destinatario, Questionario } from "../models/Dados";
import * as dados from "./dados";

// Importação da planilha do Google para o banco (fase 4). Usa as ações que os scripts JÁ têm (nada novo para implantar):
// emails, questionarios, questionario (GET); competicoesProfessor (POST com a SENHA_PROFESSOR); ranking (GET);
// escolasAdmin (POST com a SENHA_ADMIN, só na planilha principal). Pode rodar de novo: só cria o que ainda não existe.
const CHAVE = "jogo-ortografia";

async function ler(url: string, acao: string, extra = "") {
  const r = await fetch(`${url}?acao=${acao}${extra}`);
  const j = JSON.parse(await r.text());
  if (!j.ok) throw new Error(`${acao}: ${j.erro || "erro"}`);
  return j;
}
async function postar(url: string, corpo: Record<string, unknown>) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ chave: CHAVE, ...corpo }) });
  const j = JSON.parse(await r.text());
  if (!j.ok) throw new Error(`${corpo.acao}: ${j.erro || "erro"}`);
  return j;
}

export type Resumo = { origem: string; emails: number; questionarios: number; competicoes: number; participacoes: number; erros: string[] };

// os dados de uma planilha (e-mails, questionários, competições dos últimos 30 dias e o ranking delas) para um escopo
export async function importarDados(url: string, escopo: dados.Escopo, origem: string): Promise<Resumo> {
  const r: Resumo = { origem, emails: 0, questionarios: 0, competicoes: 0, participacoes: 0, erros: [] };
  const tentar = async (f: () => Promise<void>) => { try { await f(); } catch (e) { r.erros.push((e as Error).message); } };

  await tentar(async () => {
    for (const x of (await ler(url, "emails")).emails as { nome: string; email: string }[]) {
      if (await Destinatario.findOne({ where: { escola_id: escopo, email: x.email.toLowerCase() } })) continue;
      await dados.adicionarEmail(escopo, x.nome, x.email);
      r.emails++;
    }
  });

  await tentar(async () => {
    for (const q of (await ler(url, "questionarios")).lista as { id: string }[]) {
      if (await Questionario.findOne({ where: { escola_id: escopo, id_planilha: String(q.id) } })) continue;
      const { questionario } = await ler(url, "questionario", `&id=${encodeURIComponent(q.id)}`);
      await dados.salvarQuestionario(escopo, null, questionario.titulo, questionario.perguntas, String(q.id));
      r.questionarios++;
    }
  });

  await tentar(async () => {
    const { lista } = await postar(url, { acao: "competicoesProfessor", senha: process.env.SENHA_PLANILHA || "" });
    for (const c of lista as { id: string; codigo: string; nome: string; jogo: string; jogoNome: string; email: string; encerra: string }[]) {
      let comp = await Competicao.findOne({ where: { escola_id: escopo, id_planilha: String(c.id) } });
      if (comp) continue;
      // o mesmo código não pode valer para duas competições: se já existe outra com ele, ganha um novo
      const codigoLivre = !(await Competicao.findOne({ where: { codigo: c.codigo } }));
      comp = await Competicao.create({ escola_id: escopo, autor_id: null, codigo: codigoLivre ? c.codigo : `${c.codigo}${Math.floor(Math.random() * 90 + 10)}`,
        nome: c.nome, jogo: c.jogo, jogo_nome: c.jogoNome, email: c.email || null, encerra_em: new Date(c.encerra), id_planilha: String(c.id) });
      r.competicoes++;
      const { ranking } = await ler(url, "ranking", `&id=${encodeURIComponent(c.id)}`);
      for (const p of ranking as { nome: string; pontos: number; acertos: number; total: number; partidas: number; config: string }[]) {
        await dados.registrarParticipacao(comp.id, p.nome, p.pontos, p.acertos, p.total, p.config || "", p.partidas || 1, new Date(c.encerra));
        r.participacoes++;
      }
    }
  });
  return r;
}

// tudo: as escolas da planilha principal, os dados da principal (plataforma) e os de cada escola com planilha própria
export async function importarTudo() {
  const url = process.env.URL_PLANILHA;
  if (!url) throw new Error("URL_PLANILHA não configurada.");
  const escolasNovas: string[] = [];
  const erros: string[] = [];
  try {
    const { lista } = await postar(url, { acao: "escolasAdmin", senha: process.env.SENHA_ADMIN_PLANILHA || "" });
    for (const e of lista as { id: string; nome: string; slogan: string; cor: string; destaque: string; logo: string; script: string }[]) {
      if (await Escola.findOne({ where: { slug: e.id } })) continue;
      // escolas que já existiam na planilha são clientes: entram com o plano ativo (sem teste)
      await Escola.create({ slug: e.id, nome: e.nome, slogan: e.slogan || null, cor: e.cor || "#1fa2b0", destaque: e.destaque || "#f9c62b",
        logo: e.logo || null, script: e.script || null, plano: "ativo", teste_ate: null });
      escolasNovas.push(e.id);
    }
  } catch (e) { erros.push(`escolas: ${(e as Error).message}`); }

  const resumos = [await importarDados(url, null, "planilha principal (plataforma)")];
  for (const escola of await Escola.findAll()) {
    if (escola.script) resumos.push(await importarDados(escola.script, escola.id, `/${escola.slug}`));
  }
  return { escolasNovas, erros, resumos };
}
