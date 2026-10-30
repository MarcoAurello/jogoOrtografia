import { QueryTypes } from "sequelize";
import sequelize from "../config/connection";

// Contas do painel do professor (fase 3), direto no MySQL: por aluno, por habilidade, por semana e por jogo.
// "Acerto" é sempre acertos de primeira ÷ respondidas, como no relatório de cada partida.
export const PERIODOS = [7, 30, 90, 365];
export const periodo = (dias: unknown) => (PERIODOS.includes(Number(dias)) ? Number(dias) : 30);
const desdeDe = (dias: number) => new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
const pct = (acertos: number, total: number) => (total ? Math.round((Number(acertos) / Number(total)) * 100) : null);
// abaixo disto (em % de acerto), com pelo menos MIN_RESPOSTAS respondidas, a habilidade conta como dificuldade
export const LIMITE_DIFICULDADE = 60;
const MIN_RESPOSTAS = 5;

type Linha = Record<string, unknown>;
const consulta = (sql: string, replacements: Record<string, unknown>) => sequelize.query<Linha>(sql, { replacements, type: QueryTypes.SELECT });

// a turma no período: quem jogou, quanto, e as habilidades com mais dificuldade
export async function painelDaTurma(turmaId: string, dias: number) {
  const desde = desdeDe(dias);
  const r = { turma: turmaId, desde };
  const [alunos, habilidades, porAlunoHab, semanas] = await Promise.all([
    consulta(`SELECT a.id, a.nome, COUNT(p.id) AS partidas, COALESCE(SUM(p.acertos), 0) AS acertos, COALESCE(SUM(p.total), 0) AS total,
        COALESCE(SUM(p.duracao_s), 0) AS segundos, MAX(p.jogada_em) AS ultima
      FROM alunos a JOIN aluno_turmas at ON at.aluno_id = a.id AND at.turma_id = :turma AND at.ativo = 1
        LEFT JOIN partidas p ON p.aluno_id = a.id AND p.turma_id = :turma AND p.jogada_em >= :desde
      WHERE a.ativo = 1 GROUP BY a.id, a.nome ORDER BY a.nome`, r),
    consulta(`SELECT habilidade, SUM(acertos) AS acertos, SUM(total) AS total, COUNT(DISTINCT aluno_id) AS alunos
      FROM partida_habilidades WHERE turma_id = :turma AND jogada_em >= :desde GROUP BY habilidade`, r),
    consulta(`SELECT habilidade, aluno_id, SUM(acertos) AS acertos, SUM(total) AS total
      FROM partida_habilidades WHERE turma_id = :turma AND jogada_em >= :desde GROUP BY habilidade, aluno_id`, r),
    consulta(`SELECT DATE(DATE_SUB(jogada_em, INTERVAL WEEKDAY(jogada_em) DAY)) AS semana, COUNT(*) AS partidas,
        SUM(acertos) AS acertos, SUM(total) AS total, COUNT(DISTINCT aluno_id) AS alunos
      FROM partidas WHERE turma_id = :turma AND jogada_em >= :desde GROUP BY semana ORDER BY semana`, r),
  ]);

  // quantos alunos estão abaixo do limite em cada habilidade
  const comDificuldade = new Map<string, number>();
  for (const x of porAlunoHab) {
    const p = pct(Number(x.acertos), Number(x.total));
    if (Number(x.total) >= MIN_RESPOSTAS && p !== null && p < LIMITE_DIFICULDADE) {
      comDificuldade.set(String(x.habilidade), (comDificuldade.get(String(x.habilidade)) || 0) + 1);
    }
  }
  const listaAlunos = alunos.map((a) => ({
    id: a.id, nome: a.nome, partidas: Number(a.partidas), acerto: pct(Number(a.acertos), Number(a.total)),
    minutos: Math.round(Number(a.segundos) / 60), ultima: a.ultima
  }));
  const listaHab = habilidades.map((h) => ({
    habilidade: h.habilidade, acerto: pct(Number(h.acertos), Number(h.total)), respostas: Number(h.total),
    alunos: Number(h.alunos), comDificuldade: comDificuldade.get(String(h.habilidade)) || 0
  })).sort((a, b) => (a.acerto ?? 101) - (b.acerto ?? 101));
  const total = listaAlunos.reduce((s, a) => s + a.partidas, 0);
  const somaAcertos = alunos.reduce((s, a) => s + Number(a.acertos), 0);
  const somaTotal = alunos.reduce((s, a) => s + Number(a.total), 0);
  return {
    dias, desde,
    resumo: {
      alunos: listaAlunos.length, jogaram: listaAlunos.filter((a) => a.partidas).length, partidas: total,
      acerto: pct(somaAcertos, somaTotal), minutos: listaAlunos.reduce((s, a) => s + a.minutos, 0)
    },
    alunos: listaAlunos,
    habilidades: listaHab,
    // as 3 habilidades com menor acerto (com respostas suficientes para valer)
    dificuldades: listaHab.filter((h) => h.respostas >= MIN_RESPOSTAS && h.acerto !== null && h.acerto < 80).slice(0, 3),
    semanas: semanas.map((s) => ({ semana: s.semana, partidas: Number(s.partidas), alunos: Number(s.alunos), acerto: pct(Number(s.acertos), Number(s.total)) })),
    semJogar: listaAlunos.filter((a) => !a.partidas).map((a) => a.nome)
  };
}

// a ficha de um aluno: evolução por semana, habilidades (antes × depois), jogos e o que revisar
export async function fichaDoAluno(alunoId: string, dias: number) {
  const desde = desdeDe(dias);
  // antes × depois: o meio do tempo em que o aluno jogou no período (da 1ª partida até hoje), não o meio do período;
  // assim, quem começou a jogar há pouco também tem a comparação
  const [inicio] = await consulta(`SELECT MIN(jogada_em) AS primeira FROM partidas WHERE aluno_id = :aluno AND jogada_em >= :desde`, { aluno: alunoId, desde });
  const primeira = inicio?.primeira ? new Date(String(inicio.primeira)).getTime() : desde.getTime();
  const meio = new Date((Math.max(primeira, desde.getTime()) + Date.now()) / 2);
  const r = { aluno: alunoId, desde, meio };
  const [resumo, semanas, habilidades, jogos, partidas] = await Promise.all([
    consulta(`SELECT COUNT(*) AS partidas, COALESCE(SUM(acertos), 0) AS acertos, COALESCE(SUM(total), 0) AS total,
        COALESCE(SUM(duracao_s), 0) AS segundos, MAX(jogada_em) AS ultima, MIN(jogada_em) AS primeira
      FROM partidas WHERE aluno_id = :aluno AND jogada_em >= :desde`, r),
    consulta(`SELECT DATE(DATE_SUB(jogada_em, INTERVAL WEEKDAY(jogada_em) DAY)) AS semana, COUNT(*) AS partidas,
        SUM(acertos) AS acertos, SUM(total) AS total, COALESCE(SUM(duracao_s), 0) AS segundos
      FROM partidas WHERE aluno_id = :aluno AND jogada_em >= :desde GROUP BY semana ORDER BY semana`, r),
    consulta(`SELECT habilidade, SUM(acertos) AS acertos, SUM(total) AS total,
        SUM(CASE WHEN jogada_em < :meio THEN acertos ELSE 0 END) AS acertos_antes, SUM(CASE WHEN jogada_em < :meio THEN total ELSE 0 END) AS total_antes,
        SUM(CASE WHEN jogada_em >= :meio THEN acertos ELSE 0 END) AS acertos_depois, SUM(CASE WHEN jogada_em >= :meio THEN total ELSE 0 END) AS total_depois
      FROM partida_habilidades WHERE aluno_id = :aluno AND jogada_em >= :desde GROUP BY habilidade`, r),
    consulta(`SELECT jogo, MAX(titulo) AS titulo, COUNT(*) AS partidas, SUM(acertos) AS acertos, SUM(total) AS total, MAX(nivel_max) AS nivel
      FROM partidas WHERE aluno_id = :aluno AND jogada_em >= :desde GROUP BY jogo ORDER BY partidas DESC`, r),
    consulta(`SELECT titulo, detalhes, jogada_em FROM partidas WHERE aluno_id = :aluno AND jogada_em >= :desde ORDER BY jogada_em DESC LIMIT 200`, r),
  ]);

  // o que revisar: as respostas que o aluno errou, juntando todas as partidas do período (as mais repetidas primeiro)
  const erros = new Map<string, { certa: string; tipo: string; jogo: string; vezes: number; respostas: Set<string> }>();
  for (const p of partidas) {
    const detalhes = (typeof p.detalhes === "string" ? JSON.parse(p.detalhes) : p.detalhes) as { certa?: string; titulo?: string; erros?: string[] }[] | null;
    for (const d of detalhes || []) {
      if (!d || !Array.isArray(d.erros) || !d.erros.length) continue;
      const chave = `${d.titulo}|${d.certa}`;
      const item = erros.get(chave) || { certa: String(d.certa ?? ""), tipo: String(d.titulo ?? ""), jogo: String(p.titulo), vezes: 0, respostas: new Set<string>() };
      item.vezes++;
      d.erros.slice(0, 3).forEach((e) => item.respostas.add(String(e)));
      erros.set(chave, item);
    }
  }
  const revisar = [...erros.values()].sort((a, b) => b.vezes - a.vezes).slice(0, 20)
    .map((e) => ({ certa: e.certa, tipo: e.tipo, jogo: e.jogo, vezes: e.vezes, respostas: [...e.respostas].slice(0, 3) }));

  const t = resumo[0] || {};
  return {
    dias, desde, meio,
    resumo: { partidas: Number(t.partidas || 0), acerto: pct(Number(t.acertos), Number(t.total)), minutos: Math.round(Number(t.segundos || 0) / 60),
      ultima: t.ultima || null, primeira: t.primeira || null },
    semanas: semanas.map((s) => ({ semana: s.semana, partidas: Number(s.partidas), acerto: pct(Number(s.acertos), Number(s.total)), minutos: Math.round(Number(s.segundos) / 60) })),
    habilidades: habilidades.map((h) => ({
      habilidade: h.habilidade, acerto: pct(Number(h.acertos), Number(h.total)), respostas: Number(h.total),
      antes: pct(Number(h.acertos_antes), Number(h.total_antes)), depois: pct(Number(h.acertos_depois), Number(h.total_depois))
    })).sort((a, b) => b.respostas - a.respostas),
    jogos: jogos.map((j) => ({ jogo: j.jogo, titulo: j.titulo, partidas: Number(j.partidas), acerto: pct(Number(j.acertos), Number(j.total)), nivel: j.nivel })),
    revisar
  };
}
