// Regras do painel e da ficha (as mesmas da API, api/src/services/painel.ts, e do app antigo, js/painel.js).
// "Acerto" = acertos de primeira ÷ respondidas. Semáforo: 80% ou mais é bom, 60 a 79% é atenção, abaixo de 60% é
// dificuldade. A cor nunca vai sozinha: o número (e o nome da faixa, na dica) vão junto.

export const PERIODOS = [
  { dias: 7, rotulo: '7 dias' },
  { dias: 30, rotulo: '30 dias' },
  { dias: 90, rotulo: '90 dias' },
  { dias: 365, rotulo: '12 meses' },
];

export type Faixa = 'bom' | 'atencao' | 'dificuldade' | 'sem';

export const faixaDoAcerto = (p: number | null): Faixa => (p == null ? 'sem' : p >= 80 ? 'bom' : p >= 60 ? 'atencao' : 'dificuldade');

// cores do tema (MUI) para cada faixa
export const COR_DA_FAIXA: Record<Faixa, string> = {
  bom: 'success.main', atencao: 'warning.main', dificuldade: 'error.main', sem: 'grey.400',
};
export const NOME_DA_FAIXA: Record<Faixa, string> = {
  bom: 'bom (80% ou mais)', atencao: 'atenção (60 a 79%)', dificuldade: 'dificuldade (abaixo de 60%)', sem: 'sem respostas',
};

export const porcento = (p: number | null | undefined) => (p == null ? '—' : `${p}%`);

// semana "2026-10-26" → "26/10"
export const diaMes = (iso: string) => { const [, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}`; };

export const CATEGORIAS_OBS: Record<string, string> = {
  evolucao: '📈 Evolução', aprendizagem: '📚 Aprendizagem', comportamento: '🙂 Comportamento', social: '🤝 Relacionamento',
  familia: '👪 Família', saude: '🩺 Saúde', outro: '📝 Outro',
};

const ESCALA = ['1 · Nunca', '2 · Raramente', '3 · Às vezes', '4 · Frequentemente', '5 · Sempre'];

// a resposta de uma pergunta da anamnese, em texto (como js/anamnese-form.js)
export function textoDaResposta(tipo: string, v: unknown) {
  if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return '—';
  if (Array.isArray(v)) return v.join(', ');
  if (tipo === 'simnao') return v === 'sim' ? 'Sim' : 'Não';
  if (tipo === 'escala') return ESCALA[Number(v) - 1] || String(v);
  return String(v);
}
