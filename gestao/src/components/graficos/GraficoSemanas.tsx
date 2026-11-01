// Acerto por semana: uma linha só (eixo de 0 a 100%), com a faixa de 60% tracejada (abaixo dela é dificuldade).
// Passando o mouse (ou tocando), uma régua mostra a semana, o acerto e quantas partidas. "Ver em tabela" mostra os
// mesmos números em texto (leitores de tela, impressão e quem prefere ler).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { diaMes, porcento } from '../../lib/desempenho';
import { plural } from '../../lib/formato';
import type { Semana } from '../../types';

// desenhado na largura real da caixa (medida), para as letras ficarem sempre do mesmo tamanho
const A = 220;
const M = { esq: 40, dir: 16, cima: 12, baixo: 28 };

export default function GraficoSemanas({ semanas, rotulo }: { semanas: Semana[]; rotulo: string }) {
  const tema = useTheme();
  const [foco, setFoco] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);
  const caixa = useRef<SVGSVGElement>(null);
  const moldura = useRef<HTMLDivElement>(null);
  const [L, setL] = useState(640);

  useEffect(() => {
    const el = moldura.current;
    if (!el) return;
    const medir = () => setL(Math.max(280, Math.round(el.getBoundingClientRect().width)));
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [tabela]);

  const pontos = useMemo(() => {
    const larg = L - M.esq - M.dir, alt = A - M.cima - M.baixo;
    const passo = semanas.length > 1 ? larg / (semanas.length - 1) : 0;
    return semanas.map((s, i) => ({
      s, x: M.esq + (semanas.length > 1 ? i * passo : larg / 2),
      y: s.acerto == null ? null : M.cima + alt * (1 - s.acerto / 100),
    }));
  }, [semanas, L]);

  const yDe = (p: number) => M.cima + (A - M.cima - M.baixo) * (1 - p / 100);
  const linha = pontos.filter((p) => p.y != null).map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  const cor = tema.palette.primary.main;
  const tinta2 = tema.palette.text.secondary;
  const grade = tema.palette.divider;

  // o ponto mais perto do mouse/dedo (alvo bem maior que a bolinha)
  const mover = (clientX: number) => {
    const r = caixa.current?.getBoundingClientRect();
    if (!r || !pontos.length) return;
    const x = ((clientX - r.left) / r.width) * L;
    let melhor = 0;
    pontos.forEach((p, i) => { if (Math.abs(p.x - x) < Math.abs(pontos[melhor].x - x)) melhor = i; });
    setFoco(melhor);
  };
  const f = foco != null ? pontos[foco] : null;
  // rótulos do eixo de baixo: no máximo uns 8, para não encavalar
  const cadaQuantos = Math.max(1, Math.ceil(semanas.length / Math.max(3, Math.floor(L / 70))));

  return (
    <Box>
      {!tabela ? (
        <Box ref={moldura} sx={{ position: 'relative' }}>
          <svg ref={caixa} viewBox={`0 0 ${L} ${A}`} width="100%" role="img" aria-label={rotulo}
            style={{ display: 'block', touchAction: 'pan-y' }}
            onMouseMove={(e) => mover(e.clientX)} onMouseLeave={() => setFoco(null)}
            onTouchStart={(e) => mover(e.touches[0].clientX)} onTouchMove={(e) => mover(e.touches[0].clientX)}>
            {[0, 50, 100].map((p) => (
              <g key={p}>
                <line x1={M.esq} x2={L - M.dir} y1={yDe(p)} y2={yDe(p)} stroke={grade} strokeWidth={1} />
                <text x={M.esq - 8} y={yDe(p) + 4} textAnchor="end" fontSize={12} fill={tinta2}>{p}%</text>
              </g>
            ))}
            <line x1={M.esq} x2={L - M.dir} y1={yDe(60)} y2={yDe(60)} stroke={tema.palette.error.main} strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
            <text x={L - M.dir} y={yDe(60) - 4} textAnchor="end" fontSize={11} fill={tinta2}>60%</text>
            {pontos.map((p, i) => (i % cadaQuantos === 0 || i === pontos.length - 1) && (
              <text key={p.s.semana} x={p.x} y={A - 8} textAnchor="middle" fontSize={12} fill={tinta2}>{diaMes(p.s.semana)}</text>
            ))}
            {f && <line x1={f.x} x2={f.x} y1={M.cima} y2={A - M.baixo} stroke={tinta2} strokeWidth={1} opacity={0.5} />}
            <path d={linha} fill="none" stroke={cor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {pontos.map((p, i) => p.y != null && (
              <circle key={p.s.semana} cx={p.x} cy={p.y} r={foco === i ? 6 : 4} fill={cor}
                stroke={tema.palette.background.paper} strokeWidth={2} />
            ))}
          </svg>
          {f && (
            <Box role="status" sx={{
              position: 'absolute', top: 0, pointerEvents: 'none', bgcolor: 'background.paper', border: 1, borderColor: 'divider',
              borderRadius: 2, px: 1.5, py: 1, boxShadow: 2, minWidth: 140,
              left: `${(f.x / L) * 100}%`, transform: f.x > L * 0.6 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
            }}>
              <Typography variant="body2" color="text.secondary">Semana de {diaMes(f.s.semana)}</Typography>
              <Typography fontWeight={800}>{porcento(f.s.acerto)} de acerto</Typography>
              <Typography variant="body2" color="text.secondary">{plural(f.s.partidas, 'partida', 'partidas')}</Typography>
            </Box>
          )}
        </Box>
      ) : (
        <Table size="small" aria-label={rotulo}>
          <TableHead><TableRow><TableCell>Semana de</TableCell><TableCell align="right">Acerto</TableCell><TableCell align="right">Partidas</TableCell></TableRow></TableHead>
          <TableBody>
            {semanas.map((s) => (
              <TableRow key={s.semana}><TableCell>{diaMes(s.semana)}</TableCell><TableCell align="right">{porcento(s.acerto)}</TableCell>
                <TableCell align="right">{s.partidas}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Button size="small" onClick={() => setTabela((t) => !t)} sx={{ mt: 0.5, '@media print': { display: 'none' } }}>
        {tabela ? 'Ver o gráfico' : 'Ver em tabela'}
      </Button>
    </Box>
  );
}
