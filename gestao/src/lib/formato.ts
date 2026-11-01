// Datas e textos curtos das listas.

export const dataCurta = (d: string | Date | null | undefined) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');

// "há 3 dias", "hoje", "ontem": mais fácil de ler numa lista do que a data
export function haQuanto(d: string | Date | null | undefined) {
  if (!d) return '';
  const dias = Math.floor((Date.now() - new Date(d).getTime()) / 864e5);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  return `em ${dataCurta(d)}`;
}

export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

// iniciais para o avatar: "Maria da Silva" → "MS"; "Prof. Marta (Aurora)" → "M" (sem título nem parênteses)
export function iniciais(nome: string) {
  const limpo = nome.replace(/\(.*?\)/g, ' ').replace(/\b(profa?|dra?|sra?)\.?(?=\s)/gi, ' ');
  const partes = limpo.split(/[^\p{L}]+/u).filter((p) => p.length > 2 || /^\p{Lu}/u.test(p));
  return ((partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?';
}

// copia para a área de transferência; sem permissão (ou http), mostra o texto para copiar à mão
export async function copiar(texto: string) {
  try { await navigator.clipboard.writeText(texto); return true; } catch { window.prompt('Copie:', texto); return false; }
}
