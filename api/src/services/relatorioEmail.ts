import { remetente, transporteSmtp } from "./email";

// O relatório de uma partida por e-mail, montado aqui na API (antes era o script do Google que montava e enviava pelo
// Gmail). Os textos de cada jogo e o HTML são os mesmos do ferramentas/relatorio-email.gs: ao criar um jogo novo, coloque
// os textos dele nos dois lugares. Com EMAIL_VIA=smtp o relatório sai daqui; com EMAIL_VIA=planilha continua saindo
// pelo script (o "carteiro").
const MAX_ITENS = 120;
const TEXTOS = {
  ortografia: { assunto: 'Ortografia', unidade: 'palavra', revisar: 'Palavras para revisar', certo: 'Jeito certo', tentou: 'O aluno tentou', porRegra: 'Acertos por regra', niveis: 'Nível', nivelMax: 10 },
  matematica: { assunto: 'Matemática', unidade: 'conta', revisar: 'Contas para revisar', certo: 'Conta certa', tentou: 'O aluno respondeu', porRegra: 'Acertos por operação', niveis: 'Nível em cada conta', nivelMax: 10 },
  medidas: { assunto: 'Medidas de massa', unidade: 'objeto', revisar: 'Objetos para revisar', certo: 'Objeto e peso', tentou: 'Passou do ponto com', porRegra: 'Acertos por unidade', niveis: 'Nível', nivelMax: 3 },
  angulos: { assunto: 'Ângulos', unidade: 'ângulo', revisar: 'Ângulos para revisar', certo: 'Ângulo certo', tentou: 'O aluno escolheu', porRegra: 'Acertos por tipo de ângulo', niveis: 'Nível em cada míssil', nivelMax: 5 },
  atencao: { assunto: 'Atenção e memória', unidade: 'sequência', revisar: 'Sequências para revisar', certo: 'Sequência que piscou', tentou: 'O que o aluno fez', porRegra: 'Acertos por tamanho da sequência', niveis: 'Nível em cada rodada', nivelMax: 8 },
  fracoes: { assunto: 'Frações (pizzaria das frações)', unidade: 'pedido', revisar: 'Frações para revisar', certo: 'Resposta certa', tentou: 'O que respondeu', porRegra: 'Acertos por tipo de pergunta', niveis: 'Nível em cada pedido', nivelMax: 6 },
  pixels: { assunto: 'Partes e todo (quebra-cabeça de pixels)', unidade: 'desenho', revisar: 'Desenhos para revisar', certo: 'Desenho', tentou: 'O que aconteceu', porRegra: 'Montagens por tamanho do desenho', niveis: 'Nível em cada desenho', nivelMax: 6 },
  pontos: { assunto: 'Memória visual (ponto a ponto)', unidade: 'desenho', revisar: 'Desenhos para revisar', certo: 'Desenho', tentou: 'O que aconteceu', porRegra: 'Acertos por tamanho do desenho', niveis: 'Nível em cada desenho', nivelMax: 8 },
  policia: { assunto: 'Controle inibitório e orientação (polícia e ladrão)', unidade: 'perseguição', revisar: 'Perseguições para revisar', certo: 'Perseguição', tentou: 'O que aconteceu', porRegra: 'Ladrões presos por tipo de setas', niveis: 'Nível em cada perseguição', nivelMax: 3 },
  caminho: { assunto: 'Memória de sequência e mapa (caminho da memória)', unidade: 'rodada', revisar: 'Caminhos para revisar', certo: 'Caminho', tentou: 'O que aconteceu', porRegra: 'Acertos por tamanho do caminho', niveis: 'Nível em cada rodada', nivelMax: 7 },
  taxi: { assunto: 'Memória do trajeto (siga o táxi)', unidade: 'rodada', revisar: 'Caminhos para revisar', certo: 'Caminho', tentou: 'O que aconteceu', porRegra: 'Acertos por tamanho do caminho', niveis: 'Nível em cada rodada', nivelMax: 7 },
  chaves: { assunto: 'Sobreposição de figuras (percepção visual)', unidade: 'quadrado', revisar: 'Quadrados para revisar', certo: 'Quadrado da chave', tentou: 'O que escolheu', porRegra: 'Acertos por parte da chave', niveis: 'Nível em cada quadrado', nivelMax: 5 },
  descobrir: { assunto: 'Descobrir o peso que falta (balança e incógnita)', unidade: 'rodada', revisar: 'Balanças para revisar', certo: 'Balança e peso certo', tentou: 'O que escolheu', porRegra: 'Acertos por tipo de balança', niveis: 'Nível em cada rodada', nivelMax: 6 },
  somando: { assunto: 'Soma e subtração de figuras (visualização mental)', unidade: 'conta', revisar: 'Contas para revisar', certo: 'Conta', tentou: 'O que escolheu', porRegra: 'Acertos por tipo de conta', niveis: 'Nível em cada conta', nivelMax: 6 },
  hora: { assunto: 'Horas: relógio de ponteiros e digital', unidade: 'rodada', revisar: 'Horas para revisar', certo: 'Hora certa', tentou: 'O que escolheu', porRegra: 'Acertos por tipo de leitura', niveis: 'Nível em cada rodada', nivelMax: 6 },
  giro: { assunto: 'Rotação mental (giro imaginário)', unidade: 'giro', revisar: 'Giros para revisar', certo: 'Figura e giro', tentou: 'O que escolheu', porRegra: 'Acertos por tipo de giro', niveis: 'Nível em cada rodada', nivelMax: 6 },
  barcos: { assunto: 'Lateralidade e contagem (esquerda e direita)', unidade: 'rodada', revisar: 'Rodadas para revisar', certo: 'Resposta certa', tentou: 'O que marcou', porRegra: 'Acertos por quantidade de barcos', niveis: 'Nível em cada rodada', nivelMax: 8 },
  copia: { assunto: 'Percepção visual e orientação espacial', unidade: 'modelo', revisar: 'Modelos para revisar', certo: 'Modelo', tentou: 'O que aconteceu', porRegra: 'Acertos por tipo de modelo', niveis: 'Nível em cada modelo', nivelMax: 3 },
  escondida: { assunto: 'Atenção e leitura (palavra escondida)', unidade: 'palavra', revisar: 'Palavras para revisar', certo: 'Palavra escondida', tentou: 'O que marcou antes', porRegra: 'Acertos por tipo de dica', niveis: 'Nível em cada palavra', nivelMax: 3 },
  fichas: { assunto: 'Agrupar e trocar (valor das fichas)', unidade: 'jogada', revisar: 'Jogadas para revisar', certo: 'Jogada', tentou: 'O que aconteceu', porRegra: 'Acertos por tipo', niveis: 'Nível', nivelMax: 3 },
  cores: { assunto: 'Coordenadas e cálculo (tabela de cores)', unidade: 'conta', revisar: 'Contas para revisar', certo: 'Conta certa', tentou: 'O aluno respondeu', porRegra: 'Acertos por tipo de conta', niveis: 'Nível em cada conta', nivelMax: 8 },
  lateralidade: { assunto: 'Lateralidade e atenção (esquerda, direita, cima e baixo)', unidade: 'comando', revisar: 'Comandos para revisar', certo: 'Comando', tentou: 'O que aconteceu', porRegra: 'Acertos por tipo de comando', niveis: 'Nível em cada comando', nivelMax: 8 },
  setas: { assunto: 'Atenção e flexibilidade (setas e cores)', unidade: 'sequência', revisar: 'Sequências para revisar', certo: 'Setas e cores certas', tentou: 'O aluno escolheu', porRegra: 'Acertos por número de setas', niveis: 'Nível em cada sequência', nivelMax: 7 },
  vistas: { assunto: 'Percepção espacial (vista de lado e de cima)', unidade: 'pirâmide', revisar: 'Pirâmides para revisar', certo: 'Pirâmide (de baixo para cima)', tentou: 'O aluno escolheu', porRegra: 'Acertos por tipo de vista', niveis: 'Nível em cada pirâmide', nivelMax: 6 },
  dinos: { assunto: 'Memória visual de sequência (dinossauros)', unidade: 'sequência', revisar: 'Sequências para revisar', certo: 'Sequência que apareceu', tentou: 'O aluno escolheu', porRegra: 'Acertos por tamanho da sequência', niveis: 'Dinossauros em cada sequência', nivelMax: 8 },
  simbolos: { assunto: 'Atenção seletiva e discriminação visual (forma e cor)', unidade: 'carta', revisar: 'Cartas para revisar', certo: 'Figura', tentou: 'Toques errados', porRegra: 'Cartas sem erro por tamanho da figura', niveis: 'Nível em cada carta', nivelMax: 6 },
  tabuada: { assunto: 'Cálculo mental (tabuada e as quatro operações)', unidade: 'quadrado', revisar: 'Quadrados com toque errado antes', certo: 'Conta que estourou o quadrado', tentou: 'Toques errados antes', porRegra: 'Quadrados por tabuada', niveis: 'Nível em cada quadrado', nivelMax: 6 },
  classes: { assunto: 'Classes de palavras', unidade: 'palavra', revisar: 'Palavras para revisar', certo: 'Palavra e frase', tentou: 'Classe que o aluno marcou', porRegra: 'Acertos por classe de palavra', niveis: 'Etapa em cada palavra', nivelMax: 3 },
  graficos: { assunto: 'Leitura de gráficos', unidade: 'gráfico', revisar: 'Gráficos para revisar', certo: 'Dados certos', tentou: 'Gráfico errado que o aluno escolheu', porRegra: 'Acertos por tipo de gráfico', niveis: 'Nível', nivelMax: 3 },
  sequencia: { assunto: 'Sequência e planejamento', unidade: 'rotina', revisar: 'Rotinas para revisar', certo: 'Rotina', tentou: 'O que aconteceu', porRegra: 'Acertos por tamanho da rotina', niveis: 'Nível em cada rotina', nivelMax: 4 },
  questionario: { assunto: 'Questionário da aula', unidade: 'pergunta', revisar: 'Perguntas para revisar', certo: 'Pergunta e resposta certa', tentou: 'O aluno respondeu', porRegra: 'Acertos', niveis: 'Nível', nivelMax: 10 },
};

type Texto = (typeof TEXTOS)[keyof typeof TEXTOS];
type Grupo = { titulo: string; qtd: number; regra: string };
type Palavra = { certa: string; tentou: string[] };
type PorRegra = { titulo: string; total: number; erros: number };
type Nivel = { n: number; ok: boolean };
type Tempo = { t: number | null; ok: boolean };
type Relatorio = {
  tx: Texto; extra: string; assunto: string; aluno: string; missao: string; data: string; acertos: number; total: number; estrelas: number;
  grupos: Grupo[]; palavras: Palavra[]; porRegra: PorRegra[]; niveis: Nivel[]; resumo: string[]; tempos: Tempo[];
};

// jogos em que as respostas são frases e perguntas (ficam como estão); nos outros, as palavras vão em caixa alta
const EM_CAIXA_ALTA = ['ortografia', 'matematica', 'medidas', 'angulos', 'escondida'];
// título do gráfico de tempo de cada jogo
const TITULO_TEMPO: Record<string, string> = {
  sequencia: 'Tempo para ordenar cada rotina', fichas: 'Tempo para fazer as trocas em cada jogada', escondida: 'Tempo para achar cada palavra',
  copia: 'Tempo para montar cada modelo', barcos: 'Tempo para responder cada rodada', giro: 'Tempo para responder cada giro',
  hora: 'Tempo para responder cada rodada', somando: 'Tempo para resolver cada conta', descobrir: 'Tempo para responder cada rodada',
  chaves: 'Tempo para responder cada quadrado', caminho: 'Tempo para fazer cada caminho', taxi: 'Tempo para fazer cada caminho',
  policia: 'Tempo para prender cada ladrão', pontos: 'Tempo para desenhar cada modelo', pixels: 'Tempo para montar cada desenho',
  fracoes: 'Tempo para responder cada pedido', cores: 'Tempo para resolver cada conta', lateralidade: 'Tempo de resposta em cada comando',
  setas: 'Tempo para responder cada sequência', vistas: 'Tempo para responder cada pirâmide', dinos: 'Tempo para escolher cada sequência',
  simbolos: 'Tempo para completar cada carta', tabuada: 'Tempo para estourar cada quadrado',
};

const texto = (v: unknown, max: number) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const lista = (v: unknown): any[] => (Array.isArray(v) ? v.slice(0, MAX_ITENS) : []);
const numero = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v)) || 0));
const esc = (t: unknown) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// o tipo do relatório: pelo campo "tipo" ou, nas versões antigas do jogo, pelo nome da atividade
function tipoDoRelatorio(d: any, missao: string): keyof typeof TEXTOS {
  if (d.tipo && d.tipo in TEXTOS) return d.tipo;
  if (/peso certo/i.test(missao)) return 'medidas';
  if (/tiro certo/i.test(missao)) return 'angulos';
  if (/matem/i.test(String(d.assunto || '')) || /matem/i.test(missao)) return 'matematica';
  return 'ortografia';
}

// lê o relatório que o app mandou (os mesmos campos e limites do script do Google)
export function lerRelatorio(d: any) {
  const missao = texto(d.missao, 80);
  const tipo = tipoDoRelatorio(d, missao);
  const tx = TEXTOS[tipo];
  const r: Relatorio = {
    tx, assunto: tx.assunto, missao, aluno: texto(d.aluno, 40), data: texto(d.data, 20), extra: texto(d.extra, 120),
    acertos: Number(d.acertos) || 0, total: Number(d.total) || 0, estrelas: Number(d.estrelas) || 0,
    grupos: lista(d.grupos).map((g) => ({ titulo: texto(g.titulo, 60), qtd: Number(g.qtd) || 0, regra: texto(g.regra, 400) })),
    palavras: lista(d.palavras).map((p) => ({ certa: texto(p.certa, 300), tentou: lista(p.tentou).map((t) => texto(t, 160)) })),
    porRegra: lista(d.porRegra).slice(0, 12).map((x) => ({ titulo: texto(x.titulo, 40), total: numero(x.total, 200), erros: numero(x.erros, 200) })),
    niveis: lista(d.niveis).slice(0, 40).map((x) => ({ n: numero(x.n, tx.nivelMax) || 1, ok: !!x.ok })),
    resumo: lista(d.resumo).slice(0, 10).map((l) => texto(l, 200)).filter(Boolean),
    tempos: lista(d.tempos).slice(0, 40).map((x) => ({ t: x.t == null ? null : Math.min(60, Math.max(0, Number(x.t) || 0)), ok: !!x.ok })),
  };
  return { tipo, r };
}

// ----- o e-mail (o mesmo HTML do script do Google; gráficos feitos com tabelas, que todo leitor de e-mail mostra) -----
const VERDE = '#2e9e5b', VERMELHO = '#e53935';

function barra(partes: [number, string, string | number][], alturaPx: number) {
  const celulas = partes.filter(([pct]) => pct > 0)
    .map(([pct, cor, rotulo]) => `<td width="${pct}%" style="background:${cor};color:#fff;font-size:12px;font-weight:bold;text-align:center;height:${alturaPx}px;padding:0">${rotulo || ''}</td>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>${celulas || '<td></td>'}</tr></table>`;
}

function graficosEmail(tipo: string, r: Relatorio) {
  if (!r.total) return '';
  const pct = Math.round((r.acertos / r.total) * 100);
  let html = `<h3 style="color:#1fa2b0;margin-bottom:6px">Resultado: ${pct}% certo de primeira</h3>`
    + barra([[pct, VERDE, `${r.acertos} ✔`], [100 - pct, VERMELHO, r.total - r.acertos ? `${r.total - r.acertos} ✘` : '']], 26);
  if (r.porRegra.length) {
    const maior = Math.max(...r.porRegra.map((x) => x.total), 1);
    const linhas = r.porRegra.map((x) => {
      const ok = x.total - x.erros;
      const largura = Math.round((x.total / maior) * 100);
      return `<tr><td style="padding:4px 8px 4px 0;font-size:13px;white-space:nowrap">${esc(x.titulo)}</td>`
        + `<td style="padding:4px 0;width:100%"><table role="presentation" width="${largura}%" cellpadding="0" cellspacing="0"><tr><td>`
        + barra([[Math.round((ok / (x.total || 1)) * 100), VERDE, ok || ''], [Math.round((x.erros / (x.total || 1)) * 100), VERMELHO, x.erros || '']], 18)
        + `</td></tr></table></td><td style="padding:4px 0 4px 8px;font-size:12px;white-space:nowrap">${ok}/${x.total}</td></tr>`;
    }).join('');
    html += `<h3 style="color:#1fa2b0;margin:18px 0 6px">${r.tx.porRegra}</h3>`
      + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhas}</table>`
      + `<p style="font-size:12px;color:#64748b;margin:4px 0 0"><span style="color:${VERDE}">■</span> certo de primeira &nbsp; <span style="color:${VERMELHO}">■</span> com erro</p>`;
  }
  if (r.niveis.length) {
    const colunas = r.niveis.map((x, i) => `<td valign="bottom" align="center" style="padding:0 1px">`
      + `<div style="height:${Math.round((x.n * 90) / r.tx.nivelMax)}px;background:${x.ok ? VERDE : VERMELHO};border-radius:3px 3px 0 0"></div>`
      + `<div style="font-size:10px;color:#64748b">${i + 1}</div></td>`).join('');
    html += `<h3 style="color:#1fa2b0;margin:18px 0 6px">${r.tx.niveis} (1 a ${r.tx.nivelMax})</h3>`
      + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="height:110px"><tr>${colunas}</tr></table>`
      + `<p style="font-size:12px;color:#64748b;margin:4px 0 0">Altura = nível. <span style="color:${VERDE}">■</span> acertou (o nível sobe) &nbsp; <span style="color:${VERMELHO}">■</span> errou (o nível desce)</p>`;
  }
  if (r.tempos.length) {
    const maior = Math.max(4, ...r.tempos.map((x) => x.t || 0));
    const colunas = r.tempos.map((x, i) => `<td valign="bottom" align="center" style="padding:0 1px">`
      + `<div style="font-size:9px;color:#64748b">${x.t == null ? '–' : String(x.t).replace('.', ',')}</div>`
      + `<div style="height:${Math.max(4, Math.round(((x.t == null ? maior : x.t) * 90) / maior))}px;background:${x.t == null ? '#b0bec5' : x.ok ? VERDE : VERMELHO};border-radius:3px 3px 0 0"></div>`
      + `<div style="font-size:10px;color:#64748b">${i + 1}</div></td>`).join('');
    html += `<h3 style="color:#1fa2b0;margin:18px 0 6px">${TITULO_TEMPO[tipo] || 'Tempo de resposta em cada rodada'} (segundos)</h3>`
      + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="height:125px"><tr>${colunas}</tr></table>`
      + `<p style="font-size:12px;color:#64748b;margin:4px 0 0">Barra mais baixa = resposta mais rápida. <span style="color:${VERDE}">■</span> acertou &nbsp; <span style="color:${VERMELHO}">■</span> errou &nbsp; <span style="color:#b0bec5">■</span> não respondeu</p>`;
  }
  return html;
}

export function montarEmail(tipo: string, r: Relatorio) {
  const dificuldades = r.grupos.length
    ? r.grupos.map((g) => `<p style="margin:10px 0 2px"><b>${esc(g.titulo)}</b>: ${g.qtd} ${r.tx.unidade}${g.qtd === 1 ? '' : 's'} com erro</p>`
      + `<p style="margin:0;color:#475569">${esc(g.regra)}</p>`).join('')
    : '<p>Nenhuma dificuldade nesta atividade: todas as respostas certas de primeira! 🎉</p>';
  const caixa = (t: string) => (EM_CAIXA_ALTA.includes(tipo) ? t.toUpperCase() : t);
  const linhas = r.palavras.map((p) => `<tr><td style="padding:6px 10px;color:#1e7846;font-weight:bold">${esc(caixa(p.certa))}</td>`
    + `<td style="padding:6px 10px;color:#c8323c;text-decoration:line-through">${esc(caixa(p.tentou.join(', ')))}</td></tr>`).join('');
  const tabela = linhas
    ? `<h3 style="color:#1fa2b0">${r.tx.revisar}</h3><table style="border-collapse:collapse;border:1px solid #dbeef1">`
      + `<tr style="background:#1fa2b0;color:#fff"><th style="padding:6px 10px;text-align:left">${r.tx.certo}</th><th style="padding:6px 10px;text-align:left">${r.tx.tentou}</th></tr>${linhas}</table>`
    : '';
  return `<div style="font-family:Arial,sans-serif;color:#13294b;max-width:640px">`
    + `<h2 style="color:#1fa2b0;margin-bottom:4px">Relatório de ${r.assunto}</h2>`
    + `<p style="margin-top:0;color:#64748b">Jogos Educacionais: o aluno joga, o professor analisa</p>`
    + `<p><b>Aluno:</b> ${esc(r.aluno)}<br><b>Atividade:</b> ${esc(r.missao)}<br><b>Data:</b> ${esc(r.data)}<br>`
    + `<b>Acertos de primeira:</b> ${r.acertos} de ${r.total} · <b>Estrelas:</b> ${r.estrelas} de 3${r.extra ? `<br>${esc(r.extra)}` : ''}</p>`
    + (r.resumo.length ? `<h3 style="color:#1fa2b0;margin-bottom:6px">Destaques</h3><ul style="margin-top:0;padding-left:20px">${r.resumo.map((l) => `<li style="margin-bottom:4px">${esc(l)}</li>`).join('')}</ul>` : '')
    + graficosEmail(tipo, r)
    + `<h3 style="color:#1fa2b0">Principais dificuldades</h3>${dificuldades}${tabela}</div>`;
}

// envia o relatório de uma partida por SMTP (o e-mail já foi conferido na lista da escola)
export async function enviarRelatorioSmtp(para: string, dados: any) {
  const { tipo, r } = lerRelatorio(dados);
  await transporteSmtp().sendMail({
    from: remetente(),
    to: para,
    subject: `Relatório Pedagogia Gamificada: ${r.aluno} (${r.missao})`,
    html: montarEmail(tipo, r),
  });
}
