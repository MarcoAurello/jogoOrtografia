// Ler a planilha do professor (.xlsx ou .csv): A pergunta, B certa, C a E erradas; a primeira linha pode ser o
// cabeçalho e cabeçalhos repetidos são ignorados (o mesmo de js/professor.js, para a planilha modelo valer nos dois).

export interface PerguntaQuiz { pergunta: string; certa: string; erradas: string[] }

export function linhasParaPerguntas(linhas: unknown[][]): PerguntaQuiz[] {
  const limpas = linhas.map((l) => (l || []).map((c) => String(c == null ? '' : c).trim()));
  if (limpas.length && /pergunta/i.test(limpas[0][0] || '')) limpas.shift();
  return limpas.filter((l) => l[0] && l[1] && (l[2] || l[3] || l[4]))
    .filter((l) => !(/^pergunta$/i.test(l[0]) && /resposta|certa/i.test(l[1])))
    .map((l) => ({ pergunta: l[0], certa: l[1], erradas: [l[2], l[3], l[4]].filter(Boolean) }));
}

function lerCSV(texto: string) {
  const primeira = texto.split('\n')[0];
  const sep = (primeira.match(/;/g) || []).length > (primeira.match(/,/g) || []).length ? ';' : texto.includes('\t') ? '\t' : ',';
  const linhas: string[][] = [];
  let linha: string[] = [], campo = '', aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && texto[i + 1] === '\n') i++; linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

// a biblioteca de planilhas (.xlsx) só é baixada quando o professor envia uma (a mesma versão do app antigo)
type LeitorXLSX = { read: (d: ArrayBuffer, o: object) => { SheetNames: string[]; Sheets: Record<string, unknown> }; utils: { sheet_to_json: (s: unknown, o: object) => unknown[][] } };
function carregarLeitorXLSX(): Promise<LeitorXLSX> {
  const w = window as unknown as { XLSX?: LeitorXLSX };
  if (w.XLSX) return Promise.resolve(w.XLSX);
  return new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => ok(w.XLSX!);
    s.onerror = () => falha(new Error('Não deu para abrir o leitor de planilhas (precisa de internet).'));
    document.head.append(s);
  });
}

export async function lerPlanilha(arquivo: File): Promise<PerguntaQuiz[]> {
  if (/\.(csv|txt)$/i.test(arquivo.name)) return linhasParaPerguntas(lerCSV(await arquivo.text()));
  const XLSX = await carregarLeitorXLSX();
  const livro = XLSX.read(await arquivo.arrayBuffer(), { type: 'array' });
  return linhasParaPerguntas(XLSX.utils.sheet_to_json(livro.Sheets[livro.SheetNames[0]], { header: 1, defval: '' }));
}
