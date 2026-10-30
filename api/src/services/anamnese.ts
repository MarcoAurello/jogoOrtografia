import { createHash, randomBytes } from "crypto";
import { PerguntaAnamnese, TipoPergunta } from "../models/Anamnese";

// Regras da anamnese: como um modelo (questionário) é montado e como as respostas são conferidas.
export const TIPOS: TipoPergunta[] = ["curta", "longa", "simnao", "multipla", "varias", "escala"];
export const HORAS_DO_LINK = 3;   // o link para a família vale 3 horas (e só uma resposta)
const MAX_PERGUNTAS = 150;   // um modelo completo do banco (dados-anamnese.js) passa de 80
const MAX_RESPOSTA = { curta: 300, longa: 4000 };

const limpo = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// confere as perguntas de um modelo; devolve a lista limpa ou a mensagem de erro
export function validarPerguntas(entrada: unknown): { perguntas?: PerguntaAnamnese[]; erro?: string } {
  const lista = Array.isArray(entrada) ? entrada.slice(0, MAX_PERGUNTAS + 1) : [];
  if (!lista.length) return { erro: "Adicione pelo menos uma pergunta." };
  if (lista.length > MAX_PERGUNTAS) return { erro: `O questionário pode ter até ${MAX_PERGUNTAS} perguntas.` };
  const perguntas: PerguntaAnamnese[] = [];
  const ids = new Set<string>();
  for (const [i, bruta] of lista.entries()) {
    const q = (bruta || {}) as Record<string, unknown>;
    const tipo = String(q.tipo || "") as TipoPergunta;
    const texto = limpo(q.texto, 300);
    if (!TIPOS.includes(tipo)) return { erro: `Pergunta ${i + 1}: escolha o tipo de resposta.` };
    if (!texto) return { erro: `Pergunta ${i + 1}: escreva a pergunta.` };
    const comOpcoes = tipo === "multipla" || tipo === "varias";
    const opcoes = comOpcoes
      ? [...new Set((Array.isArray(q.opcoes) ? q.opcoes : []).map((o) => limpo(o, 120)).filter(Boolean))].slice(0, 20)
      : [];
    if (comOpcoes && opcoes.length < 2) return { erro: `Pergunta ${i + 1}: a pergunta de opções precisa de pelo menos 2 opções.` };
    let id = /^[a-z0-9]{4,16}$/.test(String(q.id || "")) ? String(q.id) : randomBytes(4).toString("hex");
    while (ids.has(id)) id = randomBytes(4).toString("hex");
    ids.add(id);
    perguntas.push({ id, tipo, texto, opcoes, obrigatoria: q.obrigatoria === true });
  }
  return { perguntas };
}

// confere as respostas de uma anamnese (pelas perguntas copiadas no dia); devolve as respostas limpas ou o erro
export function validarRespostas(perguntas: PerguntaAnamnese[], entrada: unknown): { respostas?: Record<string, unknown>; erro?: string } {
  const r = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;
  const respostas: Record<string, unknown> = {};
  for (const [i, q] of perguntas.entries()) {
    const bruto = r[q.id];
    let valor: unknown = null;
    if (q.tipo === "curta" || q.tipo === "longa") {
      const s = String(bruto ?? "").trim().slice(0, MAX_RESPOSTA[q.tipo]);
      valor = s || null;
    } else if (q.tipo === "simnao") {
      valor = bruto === "sim" || bruto === "nao" ? bruto : null;
    } else if (q.tipo === "multipla") {
      valor = q.opcoes.includes(String(bruto ?? "")) ? String(bruto) : null;
    } else if (q.tipo === "varias") {
      const marcadas = (Array.isArray(bruto) ? bruto : []).map(String).filter((o) => q.opcoes.includes(o));
      valor = marcadas.length ? [...new Set(marcadas)] : null;
    } else if (q.tipo === "escala") {
      const n = Math.round(Number(bruto));
      valor = n >= 1 && n <= 5 ? n : null;
    }
    if (valor === null && q.obrigatoria) return { erro: `Responda a pergunta ${i + 1}: ${q.texto}` };
    if (valor !== null) respostas[q.id] = valor;
  }
  return { respostas };
}

// o link: um token aleatório que só a família recebe; no banco fica só o hash dele
export const novoToken = () => randomBytes(24).toString("base64url");
export const hashDoToken = (token: string) => createHash("sha256").update(token).digest("hex");
