// Gera perguntas de questionário (1 certa + 3 erradas) a partir da FOTO ou do PDF de um exercício, com IA GRATUITA:
// Google Gemini (plano grátis do AI Studio) como principal e Groq como reserva — a mesma solução do sistema de reuniões
// do Marco (gerenciadorReunioesIA, Code.gs), adaptada para Node: repete com pausas quando o Google está sobrecarregado
// (500/503), troca sozinha para outro modelo "flash" se o atual sumir/aposentar e traduz os erros em mensagens claras.
// As perguntas saem no MESMO formato da planilha do professor (A pergunta, B certa, C a E erradas), para cair no mesmo
// caminho de revisão da importação. O arquivo só passa pela memória: nada é gravado em disco nem no banco.
//
// Variáveis de ambiente: GEMINI_API_KEY e/ou GROQ_API_KEY (pelo menos uma); opcionais GEMINI_MODELO, GROQ_MODELO,
// GROQ_MODELO_VISAO, IA_PRINCIPAL ("groq" para usar o Groq primeiro) e IA_FALSA=1 (testes: perguntas fixas, sem IA).
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export interface PerguntaQuiz { pergunta: string; certa: string; erradas: string[] }
export type TipoArquivo = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
export interface Arquivo { dados: Buffer; tipo: TipoArquivo }
// as escolhas do professor (todas opcionais menos a quantidade) entram no pedido à IA
export interface PedidoGeracao { arquivos: Arquivo[]; quantidade: number; serie?: string; materia?: string; tema?: string; dificuldade?: string }
export interface Geracao { perguntas: PerguntaQuiz[]; provedor: string; modelo: string }

// erro com a resposta HTTP que o controller deve dar (a mensagem já vai pronta para o professor)
export class ErroIA extends Error {
  status: number;
  codigo: string;
  constructor(mensagem: string, status = 502, codigo = "ia_erro") {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
  }
}

// o 2.5 já dá 404 em chave nova e o flash mais novo (3.8, e o apelido gemini-flash-latest) vive sobrecarregado no plano
// grátis; o 3.5 respondeu rápido nos testes de nov/2026. Se ele for aposentado, a troca automática escolhe outro
const GEMINI_MODELO_PADRAO = "gemini-3.5-flash";
const GROQ_MODELO_PADRAO = "openai/gpt-oss-120b";
// o modelo de visão do Groq (lê foto) muda com frequência: este é o da documentação de nov/2026 (console.groq.com/docs/vision)
const GROQ_VISAO_PADRAO = "qwen/qwen3.8-27b";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta";
const GROQ_URL = "https://api.groq.com/openai/v1";
const PAUSAS_REPETICAO_MS = [2000, 5000];
const TEMPO_LIMITE_MS = 90_000;
const TEMPO_RESERVA_MS = 45_000;
// o Groq recusa imagem em base64 maior que ~4 MB e aceita poucas por pedido; a gestão já reduz as fotos (lado maior 1600 px)
const GROQ_MAX_IMAGEM = 4 * 1024 * 1024;
const GROQ_MAX_FOTOS = 3;
// texto do PDF mandado ao Groq: o bastante para algumas páginas de exercício, sem estourar a cota grátis de tokens
const GROQ_MAX_TEXTO = 24_000;
export const MAX_PERGUNTA = 300;
export const MAX_RESPOSTA = 160;

// o modelo que está valendo (troca sozinho se o configurado sumir); fica na memória até a API reiniciar
let modeloGemini = "";
let modeloGroq = "";
let modeloGroqVisao = "";

const sobrecarga = (codigo: number) => [500, 502, 503, 504].includes(codigo);
const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const iaFalsa = () => process.env.IA_FALSA === "1";

export function provedoresConfigurados(): string[] {
  if (iaFalsa()) return ["falsa"];
  const lista: string[] = [];
  if (process.env.GEMINI_API_KEY) lista.push("gemini");
  if (process.env.GROQ_API_KEY) lista.push("groq");
  if (String(process.env.IA_PRINCIPAL || "").toLowerCase() === "groq") lista.reverse();
  return lista;
}

// ---------- o pedido (igual para os dois provedores) ----------

const NIVEL: Record<string, string> = {
  facil: "fáceis (lembrar e reconhecer o que está no material)",
  media: "de dificuldade média (entender e aplicar o que está no material)",
  dificil: "mais difíceis (interpretar, comparar e tirar conclusões do material)"
};

function montarPrompt(p: PedidoGeracao, comTexto?: string) {
  return [
    `Você é professor(a) e vai montar um questionário de múltipla escolha para alunos${p.serie ? ` do ${p.serie}` : ""}.`,
    p.materia ? `Matéria: ${p.materia}.` : "",
    p.tema ? `Tema indicado pelo professor: ${p.tema} (use para focar, mas sempre dentro do material).` : "",
    comTexto ? "Use SOMENTE o conteúdo do material (texto tirado do PDF e, se houver, as fotos enviadas)." :
      "Use SOMENTE o conteúdo do material enviado (fotos ou PDF de exercício, texto ou páginas de livro; as páginas vêm em ordem).",
    `Crie ${p.quantidade} perguntas${NIVEL[p.dificuldade || ""] ? ` ${NIVEL[p.dificuldade!]}` : ""} em português do Brasil, cada uma com 1 resposta certa e 3 respostas erradas.`,
    "Regras:",
    "- distribua as perguntas por todas as páginas/partes do material;",
    `- pergunta com até ${MAX_PERGUNTA} caracteres; cada resposta com até ${MAX_RESPOSTA} caracteres;`,
    "- as erradas devem ser plausíveis, do mesmo tipo e de tamanho parecido com a certa, e diferentes entre si;",
    "- não invente fatos que não estão no material; se o material for um exercício, cubra o que ele pede ao aluno;",
    "- não use \"todas as anteriores\", \"nenhuma das anteriores\" nem pegadinhas; não repita perguntas;",
    "- não escreva nomes de pessoas ou dados pessoais que apareçam no material (como nome de aluno);",
    "- se o material não tiver conteúdo escolar legível, devolva a lista de perguntas vazia.",
    "Responda apenas com JSON no formato {\"perguntas\":[{\"pergunta\":\"...\",\"certa\":\"...\",\"erradas\":[\"...\",\"...\",\"...\"]}]}.",
    comTexto ? `\nMaterial:\n"""\n${comTexto}\n"""` : ""
  ].filter(Boolean).join("\n");
}

// JSON estrito no Gemini: o modelo só consegue devolver este formato
const ESQUEMA_RESPOSTA = {
  type: "OBJECT",
  properties: {
    perguntas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          pergunta: { type: "STRING" },
          certa: { type: "STRING" },
          erradas: { type: "ARRAY", items: { type: "STRING" }, minItems: 3, maxItems: 3 }
        },
        required: ["pergunta", "certa", "erradas"]
      }
    }
  },
  required: ["perguntas"]
};

// ---------- conferir o que a IA devolveu (nunca confiar no formato) ----------

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const limpar = (v: unknown, max: number) => (typeof v === "string" || typeof v === "number" ? String(v) : "").replace(/\s+/g, " ").trim().slice(0, max);

// descarta perguntas incompletas, respostas repetidas e perguntas duplicadas; no máximo `quantidade`
export function validarPerguntas(bruto: unknown, quantidade: number): PerguntaQuiz[] {
  const lista = Array.isArray(bruto) ? bruto : Array.isArray((bruto as { perguntas?: unknown })?.perguntas) ? (bruto as { perguntas: unknown[] }).perguntas : [];
  const vistas = new Set<string>();
  const saida: PerguntaQuiz[] = [];
  for (const item of lista) {
    if (saida.length >= quantidade) break;
    const q = (item || {}) as Record<string, unknown>;
    const pergunta = limpar(q.pergunta, MAX_PERGUNTA);
    const certa = limpar(q.certa, MAX_RESPOSTA);
    if (!pergunta || !certa) continue;
    const usadas = new Set([normalizar(certa)]);
    const erradas: string[] = [];
    for (const e of Array.isArray(q.erradas) ? q.erradas : []) {
      const errada = limpar(e, MAX_RESPOSTA);
      const chave = normalizar(errada);
      if (!errada || usadas.has(chave) || erradas.length >= 3) continue;
      usadas.add(chave);
      erradas.push(errada);
    }
    const chavePergunta = normalizar(pergunta);
    if (!erradas.length || vistas.has(chavePergunta)) continue;
    vistas.add(chavePergunta);
    saida.push({ pergunta, certa, erradas });
  }
  return saida;
}

// ---------- Gemini ----------

async function chamarGemini(pedido: PedidoGeracao, rapido: boolean): Promise<Geracao> {
  const chave = process.env.GEMINI_API_KEY || "";
  let modelo = modeloGemini || process.env.GEMINI_MODELO || GEMINI_MODELO_PADRAO;
  const pausas = rapido ? PAUSAS_REPETICAO_MS.slice(0, 1) : PAUSAS_REPETICAO_MS;
  const corpo = JSON.stringify({
    contents: [{
      role: "user",
      parts: [
        ...pedido.arquivos.map((a) => ({ inline_data: { mime_type: a.tipo, data: a.dados.toString("base64") } })),
        { text: montarPrompt(pedido) }
      ]
    }],
    generationConfig: { temperature: 0.4, responseMimeType: "application/json", responseSchema: ESQUEMA_RESPOSTA }
  });

  let r = await geminiComRepeticao(chave, modelo, corpo, pausas);
  // modelo aposentado/inexistente: escolhe um "flash" disponível para a chave e passa a usar ele
  if (r.status === 404) {
    const alternativo = (await modelosGemini(chave, modelo, false))[0];
    if (alternativo) {
      console.warn(`IA: o modelo ${modelo} não existe mais no Gemini; usando ${alternativo} (ajuste GEMINI_MODELO).`);
      modeloGemini = modelo = alternativo;
      r = await geminiComRepeticao(chave, modelo, corpo, pausas);
    }
  }
  // sobrecarga que não passou: tenta outro modelo flash só nesta vez, mesmo com reserva — o Groq lê no máximo 3 fotos
  // e não lê PDF escaneado, então vale insistir no Google antes de passar para ele
  // (até 2 modelos, uma tentativa cada e com tempo menor, para a tela não ficar minutos esperando)
  if (sobrecarga(r.status)) {
    for (const reserva of (await modelosGemini(chave, modelo, true)).slice(0, 2)) {
      const r2 = await postar(`${GEMINI_URL}/models/${encodeURIComponent(reserva)}:generateContent`, { "x-goog-api-key": chave }, corpo, TEMPO_RESERVA_MS);
      if (r2.status === 200) { r = r2; modelo = reserva; break; }
    }
  }
  if (r.status !== 200) throw new ErroIA(mensagemErroGemini(r.status, r.texto, modelo));

  let json: unknown;
  try {
    const resposta = JSON.parse(r.texto);
    const partes = resposta.candidates?.[0]?.content?.parts || [];
    const saida = partes.map((p: { text?: string }) => p.text || "").join("");
    if (!saida && resposta.promptFeedback?.blockReason) throw new ErroIA("O Google recusou este arquivo. Tente outra foto ou outro PDF.", 422, "ia_recusou");
    json = JSON.parse(saida);
  } catch (e) {
    if (e instanceof ErroIA) throw e;
    throw new ErroIA("Não foi possível entender a resposta da IA. Tente de novo.");
  }
  return { perguntas: validarPerguntas(json, pedido.quantidade), provedor: "gemini", modelo };
}

async function postar(url: string, cabecalhos: Record<string, string>, corpo: string, tempo = TEMPO_LIMITE_MS) {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...cabecalhos }, body: corpo, signal: AbortSignal.timeout(tempo) });
    return { status: r.status, texto: await r.text() };
  } catch (e) {
    // sem resposta (tempo esgotado ou rede): tratado como sobrecarga, para repetir/cair na reserva
    console.warn("IA: sem resposta de", url.replace(/key=[^&]+/, "key=…"), (e as Error).message);
    return { status: 504, texto: "" };
  }
}

async function geminiComRepeticao(chave: string, modelo: string, corpo: string, pausas: number[]) {
  const url = `${GEMINI_URL}/models/${encodeURIComponent(modelo)}:generateContent`;
  let r = await postar(url, { "x-goog-api-key": chave }, corpo);
  for (let i = 0; i < pausas.length && sobrecarga(r.status); i++) {
    await esperar(pausas[i]);
    r = await postar(url, { "x-goog-api-key": chave }, corpo);
  }
  return r;
}

async function listarModelosGemini(chave: string): Promise<string[] | null> {
  try {
    const r = await fetch(`${GEMINI_URL}/models?pageSize=200`, { headers: { "x-goog-api-key": chave }, signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return null;
    const corpo = await r.json() as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    return (corpo.models || []).filter((m) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m) => m.name.replace(/^models\//, ""));
  } catch { return null; }
}

// os "flash" estáveis disponíveis, do melhor para o pior (mais novo; nome mais simples). Na sobrecarga aceita o "lite"
async function modelosGemini(chave: string, atual: string, aceitaLite: boolean): Promise<string[]> {
  const nomes = await listarModelosGemini(chave);
  if (!nomes) return [];
  const especial = aceitaLite ? /(preview|exp|thinking|image|tts|audio|live|embedding|learnlm|omni)/i : /(lite|preview|exp|thinking|image|tts|audio|live|embedding|8b|learnlm|omni)/i;
  const versao = (n: string) => { const m = n.match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
  const candidatos = nomes.filter((n) => /flash/i.test(n) && n !== atual);
  const estaveis = candidatos.filter((n) => !especial.test(n));
  const lista = (estaveis.length || aceitaLite ? estaveis : candidatos).sort((a, b) => versao(b) - versao(a) || a.length - b.length);
  return lista;
}

function detalheDoErro(corpo: string) {
  try { return String(JSON.parse(corpo).error.message || ""); } catch { return ""; }
}

function mensagemErroGemini(codigo: number, corpo: string, modelo: string) {
  const detalhe = detalheDoErro(corpo);
  if (codigo === 429) return "Limite gratuito da IA do Google atingido. Tente de novo em alguns minutos.";
  if (sobrecarga(codigo)) return "A IA do Google está sobrecarregada agora (já tentamos de novo). Aguarde 1 ou 2 minutos e tente outra vez.";
  if (codigo === 400 && /api key/i.test(detalhe)) return "A chave da IA (GEMINI_API_KEY) é inválida. Avise o administrador.";
  if (codigo === 400) return "A IA do Google não conseguiu ler este arquivo. Tente uma foto mais nítida ou outro PDF.";
  if (codigo === 403) return "A chave da IA do Google não tem permissão. Avise o administrador.";
  if (codigo === 404) return `O modelo de IA "${modelo}" não está disponível. Avise o administrador (GEMINI_MODELO).`;
  return `A IA do Google respondeu com erro ${codigo}${detalhe ? `: ${detalhe}` : "."}`;
}

// ---------- Groq (API no formato da OpenAI) ----------

async function chamarGroq(pedido: PedidoGeracao): Promise<Geracao> {
  const chave = process.env.GROQ_API_KEY || "";
  const fotos = pedido.arquivos.filter((a) => a.tipo !== "application/pdf");
  const pdfs = pedido.arquivos.filter((a) => a.tipo === "application/pdf");
  const ehFoto = fotos.length > 0;
  if (fotos.length > GROQ_MAX_FOTOS) throw new ErroIA(`A IA reserva lê no máximo ${GROQ_MAX_FOTOS} fotos por vez. Tire algumas e tente de novo.`, 413, "ia_muitas_fotos");
  if (fotos.reduce((t, f) => t + f.dados.length, 0) > GROQ_MAX_IMAGEM) throw new ErroIA("As fotos são grandes demais para a IA reserva. Mande menos fotos.", 413, "ia_foto_grande");
  // o Groq não lê PDF: tira o texto aqui no servidor (PDF escaneado, só com imagem, não tem texto)
  let texto = "";
  for (const pdf of pdfs) texto += (texto ? "\n\n" : "") + await textoDoPdf(pdf.dados);
  if (pdfs.length && texto.length < 40 && !ehFoto) throw new ErroIA("Este PDF parece ser uma imagem escaneada, sem texto. Mande fotos das páginas ou um PDF com texto.", 422, "pdf_sem_texto");
  const prompt = montarPrompt(pedido, texto ? texto.slice(0, GROQ_MAX_TEXTO) : undefined);
  const conteudo: unknown = ehFoto
    ? [{ type: "text", text: prompt }, ...fotos.map((f) => ({ type: "image_url", image_url: { url: `data:${f.tipo};base64,${f.dados.toString("base64")}` } }))]
    : prompt;

  const configurado = ehFoto ? process.env.GROQ_MODELO_VISAO || GROQ_VISAO_PADRAO : process.env.GROQ_MODELO || GROQ_MODELO_PADRAO;
  let modelo = (ehFoto ? modeloGroqVisao : modeloGroq) || configurado;
  let r = await conversarGroq(chave, modelo, conteudo);
  // modelo desativado/inexistente: escolhe outro disponível na conta e passa a usar ele
  if (r.status === 404 || (r.status === 400 && /decommission|not found|does not exist|model_not_found/i.test(r.texto))) {
    const alternativo = await escolherModeloGroq(chave, modelo, ehFoto);
    if (!alternativo && ehFoto) throw new ErroIA("A IA reserva (Groq) não tem um modelo que lê fotos nesta conta. Tente de novo mais tarde ou mande um PDF.", 503, "groq_sem_visao");
    if (alternativo) {
      console.warn(`IA: o modelo ${modelo} não existe mais no Groq; usando ${alternativo} (ajuste ${ehFoto ? "GROQ_MODELO_VISAO" : "GROQ_MODELO"}).`);
      if (ehFoto) modeloGroqVisao = alternativo; else modeloGroq = alternativo;
      modelo = alternativo;
      r = await conversarGroq(chave, modelo, conteudo);
    }
  }
  if (sobrecarga(r.status)) {
    await esperar(PAUSAS_REPETICAO_MS[0]);
    r = await conversarGroq(chave, modelo, conteudo);
  }
  if (r.status !== 200) throw new ErroIA(mensagemErroGroq(r.status, r.texto, modelo));

  let json: unknown;
  try { json = JSON.parse(JSON.parse(r.texto).choices[0].message.content); } catch { throw new ErroIA("Não foi possível entender a resposta da IA reserva. Tente de novo."); }
  return { perguntas: validarPerguntas(json, pedido.quantidade), provedor: "groq", modelo };
}

function conversarGroq(chave: string, modelo: string, conteudo: unknown) {
  return postar(`${GROQ_URL}/chat/completions`, { Authorization: `Bearer ${chave}` }, JSON.stringify({
    model: modelo,
    temperature: 0.4,
    response_format: { type: "json_object" },   // o prompt menciona JSON (o Groq exige)
    messages: [{ role: "user", content: conteudo }]
  }));
}

async function escolherModeloGroq(chave: string, atual: string, visao: boolean): Promise<string | null> {
  let ids: string[] = [];
  try {
    const r = await fetch(`${GROQ_URL}/models`, { headers: { Authorization: `Bearer ${chave}` }, signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return null;
    const corpo = await r.json() as { data?: { id: string; active?: boolean }[] };
    ids = (corpo.data || []).filter((m) => m.active !== false).map((m) => String(m.id)).filter((id) => id !== atual);
  } catch { return null; }
  if (visao) {
    // só os que a documentação do Groq lista como de visão (lê imagem); a lista de modelos não diz isso
    return ids.find((id) => /(vision|llama-4-(scout|maverick)|qwen3\.\d+-\d+b|muse)/i.test(id)) || null;
  }
  const nota = (id: string) => (/(120b|70b|versatile)/i.test(id) ? 10 : 0) + (/(llama|gpt-oss|qwen|kimi|deepseek)/i.test(id) ? 2 : 0) - (/(instant|8b|mini|preview)/i.test(id) ? 5 : 0);
  return ids.filter((id) => !/(whisper|tts|guard|playai|orpheus|distil|embed|vision|speech|audio)/i.test(id))
    .sort((a, b) => nota(b) - nota(a) || a.length - b.length)[0] || null;
}

function mensagemErroGroq(codigo: number, corpo: string, modelo: string) {
  const detalhe = detalheDoErro(corpo);
  if (codigo === 401) return "A chave da IA reserva (GROQ_API_KEY) é inválida. Avise o administrador.";
  if (codigo === 413) return "O material é grande demais para a IA reserva. Mande menos páginas.";
  if (codigo === 429) return "Limite gratuito da IA reserva atingido. Tente de novo em alguns minutos.";
  if (sobrecarga(codigo)) return "A IA reserva está sobrecarregada agora. Tente de novo em instantes.";
  if (codigo === 404) return `O modelo "${modelo}" não está disponível no Groq. Avise o administrador.`;
  return `A IA reserva respondeu com erro ${codigo}${detalhe ? `: ${detalhe}` : "."}`;
}

async function textoDoPdf(dados: Buffer): Promise<string> {
  try {
    const r = await pdfParse(dados, { max: 20 });   // até 20 páginas
    return r.text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    throw new ErroIA("Não deu para abrir este PDF. Confira se ele não está protegido por senha.", 422, "pdf_invalido");
  }
}

// ---------- modo falso (IA_FALSA=1): os testes automáticos não chamam a IA de verdade ----------

function geracaoFalsa(quantidade: number): Geracao {
  const base = Array.from({ length: 16 }, (_, i) => ({
    pergunta: `Pergunta de teste ${i + 1}: quanto é ${i + 1} + ${i + 1}?`,
    certa: String((i + 1) * 2),
    erradas: [String((i + 1) * 2 + 1), String((i + 1) * 2 - 1), String((i + 1) * 2 + 2)]
  }));
  // o que uma IA de verdade às vezes devolve: duplicada, incompleta e com errada igual à certa — a validação descarta/limpa
  const bruto = [base[0], { ...base[0] }, { pergunta: "Incompleta?", certa: "", erradas: ["a"] }, { ...base[1], erradas: [base[1].certa, ...base[1].erradas] }, ...base.slice(2)];
  return { perguntas: validarPerguntas({ perguntas: bruto }, quantidade), provedor: "falsa", modelo: "falsa" };
}

// ---------- a entrada: principal e, se falhar, a reserva ----------

export async function gerarQuestoes(pedido: PedidoGeracao): Promise<Geracao> {
  const provedores = provedoresConfigurados();
  if (!provedores.length) throw new ErroIA("A IA não está configurada neste servidor (falta GEMINI_API_KEY ou GROQ_API_KEY).", 503, "ia_nao_configurada");
  if (provedores[0] === "falsa") return geracaoFalsa(pedido.quantidade);

  const temReserva = provedores.length > 1;
  const erros: ErroIA[] = [];
  for (const provedor of provedores) {
    try {
      // com reserva, o Gemini desiste mais rápido (menos espera na tela)
      const g = provedor === "gemini" ? await chamarGemini(pedido, temReserva) : await chamarGroq(pedido);
      if (!g.perguntas.length) throw new ErroIA("A IA não achou conteúdo de exercício neste arquivo. Tente uma foto mais nítida, bem de frente e com boa luz.", 422, "sem_perguntas");
      return g;
    } catch (e) {
      const erro = e instanceof ErroIA ? e : new ErroIA("Erro inesperado ao falar com a IA.");
      if (!(e instanceof ErroIA)) console.error(`IA (${provedor}):`, e);
      else console.warn(`IA (${provedor}): ${erro.message}`);
      erros.push(erro);
    }
  }
  // a mensagem do provedor principal costuma ser a mais útil; "sem perguntas" vale mais que erro de cota da reserva
  throw erros.find((e) => e.codigo === "sem_perguntas") || erros[0];
}
