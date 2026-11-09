// Apelido de quem joga uma competição criada sem login (pública: pode ter criança) e o nome dessa competição.
// Só apelido: nada de nome completo, telefone, e-mail ou site, e sem palavrão.
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

// palavrões e afins: comparados sem acento, sem espaço/pontuação e com o "leet" desfeito (p0rr4 → porra).
// PARTES valem em qualquer lugar do texto; INTEIRAS só como palavra sozinha (para não barrar "Cururu" ou "Paulo").
const PARTES = ["porra", "caralh", "buceta", "boceta", "bucet", "xoxota", "xereca", "piroca", "puta", "puto", "viado", "bosta",
  "merda", "foder", "fodase", "fodido", "cacete", "arrombad", "otario", "babaca", "punheta", "siririca", "vagabund", "safad",
  "corno", "cuzao", "cuzinho", "nazi", "hitler", "estupr", "pedof", "penis", "vagina", "sexo", "porn", "piranha", "rapariga",
  "desgraca", "imbecil", "retardad", "fuck", "shit", "bitch", "dick", "pussy"];
const INTEIRAS = ["cu", "pau", "rola", "foda", "fode", "fdp", "vsf", "pqp", "tnc", "vtnc", "krl", "prr", "pnc", "cuzin", "bct"];
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };
function temPalavrao(s: string) {
  const base = semAcento(s).toLowerCase().replace(/[0134579@$]/g, (x) => LEET[x] || x);
  const junto = base.replace(/[^a-z]/g, "");
  if (PARTES.some((p) => junto.includes(p))) return true;
  return base.split(/[^a-z]+/).some((p) => INTEIRAS.includes(p));
}

// devolve a mensagem do problema ou "" (aceito). maxDigitos barra telefone e documento.
function problemaDoTexto(s: string, oQue: "apelido" | "nome", min: number, max: number, maxDigitos: number) {
  const No = oQue === "apelido" ? "no apelido" : "no nome da competição";
  if (s.length < min) return `Digite ${oQue === "apelido" ? "um apelido" : "um nome"} com pelo menos ${min} letras.`;
  if (s.length > max) return `${oQue === "apelido" ? "O apelido" : "O nome"} pode ter até ${max} letras.`;
  if (!/^[\p{L}\p{N} ._!?º°ª-]+$/u.test(s)) return `Use só letras, números e espaço ${No}.`;
  if ((s.match(/\d/g) || []).length > maxDigitos) return `Não coloque telefone nem números grandes ${No}.`;
  if (/www|http|\.com/i.test(s)) return `Não coloque endereço de site ${No}.`;
  if (temPalavrao(s)) return `Escolha ${oQue === "apelido" ? "outro apelido" : "outro nome"}, sem palavrão. 🙂`;
  return "";
}
export const problemaDoApelido = (s: string) => problemaDoTexto(s, "apelido", 2, 16, 3);
export const problemaDoNome = (s: string) => problemaDoTexto(s, "nome", 3, 40, 6);
