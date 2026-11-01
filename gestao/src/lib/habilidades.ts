// Nomes das habilidades que os jogos trabalham (cópia de js/habilidades.js do app dos jogos: manter as duas iguais).
export const NOME_HAB: Record<string, string> = {
  memoria: 'Memória de trabalho',
  planejamento: 'Planejamento e organização',
  inibitorio: 'Controle inibitório',
  sustentada: 'Atenção sustentada',
  alternada: 'Atenção alternada',
  seletiva: 'Atenção seletiva',
  logico: 'Raciocínio lógico',
  percepcao: 'Percepção visual',
  espacial: 'Visão espacial',
  decisao: 'Tomada de decisão',
  velocidade: 'Velocidade de processamento',
  frustracao: 'Tolerância à frustração',
  flexibilidade: 'Flexibilidade cognitiva',
  colaboracao: 'Colaboração',
  autoeficacia: 'Autoeficácia',
  empatia: 'Empatia',
  teoriaMente: 'Teoria da mente',
  autocontrole: 'Autocontrole',
  motoraFina: 'Coordenação motora fina',
  motoraGrossa: 'Coordenação motora grossa',
  linguagem: 'Desenvolvimento da linguagem',
  fonologica: 'Consciência fonológica',
  matematica: 'Habilidades matemáticas',
  lateralidade: 'Lateralidade',
  // códigos antigos (partidas gravadas antes das habilidades de hoje) e da massa de teste
  atencao: 'Atenção',
  leitura: 'Leitura',
  portugues: 'Português',
};

// código desconhecido: pelo menos com a primeira letra maiúscula e espaços ("motoraFina" → "Motora fina")
export const nomeHab = (h: string) => NOME_HAB[h]
  || (h.charAt(0).toUpperCase() + h.slice(1).replace(/([a-z])([A-Z])/g, (_, a, b) => `${a} ${b.toLowerCase()}`));
