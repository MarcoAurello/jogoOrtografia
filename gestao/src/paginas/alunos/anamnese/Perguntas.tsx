// As perguntas da anamnese para responder (cada tipo com o controle certo) e as respostas para ler.
import { Box, Checkbox, FormControlLabel, Radio, RadioGroup, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { textoDaResposta } from '../../../lib/desempenho';
import type { PerguntaAnamnese } from '../../../types';

export type Respostas = Record<string, unknown>;

const ESCALA = ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre'];

// a primeira obrigatória sem resposta (para destacar e levar o foco até ela)
export function faltando(perguntas: PerguntaAnamnese[], r: Respostas) {
  return perguntas.find((q) => {
    if (!q.obrigatoria) return false;
    const v = r[q.id];
    return v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
  });
}

interface Props {
  perguntas: PerguntaAnamnese[];
  respostas: Respostas;
  aoMudar: (id: string, valor: unknown) => void;
  destaque?: string;   // id da pergunta com problema
}

export function ResponderPerguntas({ perguntas, respostas, aoMudar, destaque }: Props) {
  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      {perguntas.map((q, i) => {
        const v = respostas[q.id];
        const comErro = destaque === q.id;
        return (
          <Box key={q.id} id={`pergunta-${q.id}`} tabIndex={-1}
            sx={{ p: 2, borderRadius: 2, border: 1, borderColor: comErro ? 'error.main' : 'divider', bgcolor: comErro ? 'rgba(229, 57, 53, 0.06)' : 'background.paper', outline: 'none' }}>
            <Typography fontWeight={700} sx={{ mb: 1 }}>
              {i + 1}. {q.texto}{q.obrigatoria && <Typography component="span" color="error"> *</Typography>}
            </Typography>
            {(q.tipo === 'curta' || q.tipo === 'longa') && (
              <TextField fullWidth multiline={q.tipo === 'longa'} minRows={q.tipo === 'longa' ? 3 : undefined} value={String(v ?? '')}
                onChange={(e) => aoMudar(q.id, e.target.value)} inputProps={{ maxLength: q.tipo === 'longa' ? 4000 : 300, 'aria-label': q.texto }} />
            )}
            {(q.tipo === 'simnao' || q.tipo === 'multipla') && (
              <RadioGroup row={q.tipo === 'simnao'} value={String(v ?? '')} onChange={(e) => aoMudar(q.id, e.target.value)}>
                {(q.tipo === 'simnao' ? [['sim', 'Sim'], ['nao', 'Não']] : (q.opcoes || []).map((o) => [o, o])).map(([valor, rotulo]) => (
                  <FormControlLabel key={valor} value={valor} control={<Radio />} label={rotulo} sx={{ minHeight: 44 }} />
                ))}
              </RadioGroup>
            )}
            {q.tipo === 'varias' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                {(q.opcoes || []).map((o) => {
                  const marcadas = Array.isArray(v) ? (v as string[]) : [];
                  return (
                    <FormControlLabel key={o} label={o} sx={{ minHeight: 44 }} control={<Checkbox checked={marcadas.includes(o)}
                      onChange={() => aoMudar(q.id, marcadas.includes(o) ? marcadas.filter((x) => x !== o) : [...marcadas, o])} />} />
                  );
                })}
              </Box>
            )}
            {q.tipo === 'escala' && (
              <ToggleButtonGroup exclusive value={v ?? null} onChange={(_, n) => aoMudar(q.id, n)} aria-label={q.texto}
                sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', '& .MuiToggleButton-root': { minHeight: 52, flexDirection: 'column', textTransform: 'none', lineHeight: 1.2, px: 0.5 } }}>
                {ESCALA.map((rotulo, k) => (
                  <ToggleButton key={rotulo} value={k + 1}>
                    <Typography fontWeight={800}>{k + 1}</Typography>
                    <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>{rotulo}</Typography>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// as respostas, para ler (pergunta em cinza, resposta em destaque)
export function LerRespostas({ perguntas, respostas }: { perguntas: PerguntaAnamnese[]; respostas: Respostas | null }) {
  return (
    <Box component="dl" sx={{ m: 0 }}>
      {perguntas.map((q, i) => (
        <Box key={q.id} sx={{ py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider', breakInside: 'avoid' }}>
          <Typography component="dt" variant="body2" color="text.secondary">{i + 1}. {q.texto}</Typography>
          <Typography component="dd" sx={{ m: 0, fontWeight: 700, whiteSpace: 'pre-wrap' }}>{textoDaResposta(q.tipo, respostas?.[q.id])}</Typography>
        </Box>
      ))}
    </Box>
  );
}
