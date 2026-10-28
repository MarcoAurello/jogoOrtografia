/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Relatório do fim do jogo: textos, gráficos, envio por e-mail (com fila offline), confete e PDF. */

import { $, seguro, semHTML, sortear } from './util.js?v=125';
import { aluno, estrelasTexto, missao, resultados, salvarEstrelas } from './estado.js?v=125';
import { frase, SOM } from './som.js?v=125';
import { mascote, mostrar } from './telas.js?v=125';
import { emailDoRelatorio, jogoDaMissao, listaEmails } from './professor.js?v=125';
import { comecarMissao, telaMissoes } from './ortografia.js?v=125';
import { comecarChuva, telaChuvaMenu } from './chuva.js?v=125';
import { comecarMat, MAT, telaMatMenu } from './matematica.js?v=125';
import { comecarTiro, telaTiroMenu, TIRO } from './tiro.js?v=125';
import { comecarPeso, telaPesoMenu } from './peso.js?v=125';
import { comecarQuiz, telaQuizMenu } from './quiz.js?v=125';
import { comecarLuz, LUZ, telaLuzesMenu } from './luzes.js?v=125';
import { comecarRotina, ROTINA, telaRotinaMenu } from './rotina.js?v=125';
import { comecarFichas, telaFichasMenu } from './fichas.js?v=125';
import { comecarEscondida, ESCONDIDA, telaEscondidaMenu } from './escondida.js?v=125';
import { comecarCopia, COPIA, telaCopiaMenu } from './copia.js?v=125';
import { BARCOS, comecarBarcos, telaBarcosMenu } from './barcos.js?v=125';
import { comecarGiro, GIRO, telaGiroMenu } from './giro.js?v=125';
import { comecarHora, HORA, telaHoraMenu } from './hora.js?v=125';
import { comecarSomando, SOMANDO, telaSomandoMenu } from './somando.js?v=125';
import { comecarDescobrir, DESCOBRIR, telaDescobrirMenu } from './descobrir.js?v=125';
import { CHAVES, comecarChaves, telaChavesMenu } from './chaves.js?v=125';
import { CAMINHO, comecarCaminho, comecarTaxi, telaCaminhoMenu, telaTaxiMenu } from './caminho.js?v=125';
import { comecarPolicia, POLICIA, telaPoliciaMenu } from './policia.js?v=125';
import { comecarPontos, PONTOS, telaPontosMenu } from './pontos.js?v=125';
import { comecarPixels, PIXELS, telaPixelsMenu } from './pixels.js?v=125';
import { comecarCores, telaCoresMenu } from './cores.js?v=125';
import { comecarLados, telaLadosMenu } from './lados.js?v=125';
import { comecarSetas, telaSetasMenu } from './setas.js?v=125';
import { comecarVistas, telaVistasMenu } from './vistas.js?v=125';
import { comecarDinos, telaDinosMenu } from './dinos.js?v=125';
import { comecarSimbolos, telaSimbolosMenu } from './simbolos.js?v=125';
import { comecarTabuada, telaTabuadaMenu } from './tabuada.js?v=125';
import { comecarClasses, telaClassesMenu } from './classes.js?v=125';
import { comecarGraficos, telaGraficosMenu } from './graficos.js?v=125';

// ---------- Relatório de dificuldades ----------
function montarRelatorio() {
  const respondidas = resultados.length;
  const dePrimeiraN = resultados.filter((r) => r.erros.length === 0).length;
  const comErro = resultados.filter((r) => r.erros.length > 0);
  // agrupa por regra (missão), da que teve mais erros para a que teve menos
  const grupos = [];
  for (const r of comErro) {
    let g = grupos.find((x) => x.m.id === r.m.id);
    if (!g) { g = { m: r.m, itens: [] }; grupos.push(g); }
    g.itens.push(r);
  }
  grupos.sort((a, b) => b.itens.length - a.itens.length);
  // todas as regras que apareceram, com quantas deram certo de primeira e quantas tiveram erro
  const porRegra = [];
  for (const r of resultados) {
    let x = porRegra.find((o) => o.m.id === r.m.id);
    if (!x) { x = { m: r.m, total: 0, erros: 0 }; porRegra.push(x); }
    x.total++;
    if (r.erros.length) x.erros++;
  }
  porRegra.sort((a, b) => b.erros - a.erros || b.total - a.total);
  const niveis = resultados.filter((r) => r.nivel).map((r) => ({ n: r.nivel, ok: !r.erros.length }));
  // tempo de resposta (só no Jogo do Reflexo): t em segundos, null quando não respondeu
  const tempos = resultados.filter((r) => 'tempo' in r).map((r) => ({ t: r.tempo == null ? null : Math.round(r.tempo * 10) / 10, ok: !r.erros.length }));
  return { respondidas, dePrimeiraN, comErro, grupos, porRegra, niveis, tempos };
}

// ---------- Textos do relatório de cada jogo ----------
function textosRelatorio(mis) {
  if (mis.quiz) return { tipo: 'questionario', assunto: 'Questionário da aula', unidade: 'pergunta', revisar: 'Perguntas para revisar',
    certo: 'Pergunta e resposta certa', tentou: 'Você respondeu', tentouPdf: 'O aluno respondeu', porRegra: 'Acertos',
    niveis: 'Nível', atividade: 'Atividade', outras: '📝 Outro questionário' };
  if (mis.graficos) return { tipo: 'graficos', assunto: 'Leitura de gráficos', unidade: 'gráfico', revisar: 'Gráficos para revisar',
    certo: 'Dados certos', tentou: 'Gráfico errado que escolheu', tentouPdf: 'Gráfico errado que o aluno escolheu', porRegra: 'Acertos por tipo de gráfico',
    niveis: 'Nível', atividade: 'Atividade', outras: '📊 Jogo dos Gráficos' };
  if (mis.classes) return { tipo: 'classes', assunto: 'Classes de palavras', unidade: 'palavra', revisar: 'Palavras para revisar',
    certo: 'Palavra e frase', tentou: 'Classe que marcou', tentouPdf: 'Classe que o aluno marcou', porRegra: 'Acertos por classe de palavra',
    niveis: 'Etapa em cada palavra (1 fácil, 2 médio, 3 difícil)', atividade: 'Atividade', outras: '📖 Classes de Palavras' };
  if (mis.tabuada) return { tipo: 'tabuada', assunto: 'Cálculo mental (tabuada e as quatro operações)', unidade: 'quadrado', revisar: 'Quadrados com toque errado antes',
    certo: 'Conta que estourou o quadrado', tentou: 'Toques errados antes', tentouPdf: 'Toques errados antes', porRegra: 'Quadrados por tabuada',
    niveis: 'Nível em cada quadrado', atividade: 'Atividade', outras: '🔢 Tetris da Tabuada', tempos: 'Tempo para estourar cada quadrado' };
  if (mis.simbolos) return { tipo: 'simbolos', assunto: 'Atenção seletiva e discriminação visual (forma e cor)', unidade: 'carta', revisar: 'Cartas para revisar',
    certo: 'Figura', tentou: 'Toques errados', tentouPdf: 'Toques errados', porRegra: 'Cartas sem erro por tamanho da figura',
    niveis: 'Nível em cada carta', atividade: 'Atividade', outras: '🃏 Atenção à Forma', tempos: 'Tempo para completar cada carta' };
  if (mis.dinos) return { tipo: 'dinos', assunto: 'Memória visual de sequência (dinossauros)', unidade: 'sequência', revisar: 'Sequências para revisar',
    certo: 'Sequência que apareceu', tentou: 'Você escolheu', tentouPdf: 'O aluno escolheu', porRegra: 'Acertos por tamanho da sequência',
    niveis: 'Dinossauros em cada sequência', atividade: 'Atividade', outras: '🦕 Memória dos Dinossauros', tempos: 'Tempo para escolher cada sequência' };
  if (mis.vistas) return { tipo: 'vistas', assunto: 'Percepção espacial (vista de lado e de cima)', unidade: 'pirâmide', revisar: 'Pirâmides para revisar',
    certo: 'Pirâmide (de baixo para cima)', tentou: 'Você escolheu', tentouPdf: 'O aluno escolheu', porRegra: 'Acertos por tipo de vista',
    niveis: 'Nível em cada pirâmide', atividade: 'Atividade', outras: '👁️ De Lado e de Cima', tempos: 'Tempo para responder cada pirâmide' };
  if (mis.setas) return { tipo: 'setas', assunto: 'Atenção e flexibilidade (setas e cores)', unidade: 'sequência', revisar: 'Sequências para revisar',
    certo: 'Setas e cores certas', tentou: 'Você escolheu', tentouPdf: 'O aluno escolheu', porRegra: 'Acertos por número de setas',
    niveis: 'Nível em cada sequência', atividade: 'Atividade', outras: '🧭 Setas e Cores', tempos: 'Tempo para responder cada sequência' };
  if (mis.lados) return { tipo: 'lateralidade', assunto: 'Lateralidade e atenção (esquerda, direita, cima e baixo)', unidade: 'comando', revisar: 'Comandos para revisar',
    certo: 'Comando', tentou: 'O que aconteceu', tentouPdf: 'O que aconteceu', porRegra: 'Acertos por tipo de comando',
    niveis: 'Nível em cada comando', atividade: 'Atividade', outras: '↔️ Esquerda e Direita', tempos: 'Tempo de resposta em cada comando' };
  if (mis.cores) return { tipo: 'cores', assunto: 'Coordenadas e cálculo (tabela de cores)', unidade: 'conta', revisar: 'Contas para revisar',
    certo: 'Conta certa', tentou: 'Você respondeu', tentouPdf: 'O aluno respondeu', porRegra: 'Acertos por tipo de conta',
    niveis: 'Nível em cada conta', atividade: 'Atividade', outras: '🎨 Somando as Cores', tempos: 'Tempo para resolver cada conta' };
  if (mis.pixels) return { tipo: 'pixels', assunto: 'Partes e todo (quebra-cabeça de pixels)', unidade: 'desenho', revisar: 'Desenhos para revisar',
    certo: 'Desenho', tentou: 'O que aconteceu', tentouPdf: 'O que aconteceu', porRegra: 'Montagens por tamanho do desenho',
    niveis: 'Nível em cada desenho', atividade: 'Atividade', outras: '🧩 Quebra-Cabeça de Pixels', tempos: 'Tempo para montar cada desenho' };
  if (mis.pontoAPonto) return { tipo: 'pontos', assunto: 'Memória visual (ponto a ponto)', unidade: 'desenho', revisar: 'Desenhos para revisar',
    certo: 'Desenho', tentou: 'O que aconteceu', tentouPdf: 'O que aconteceu', porRegra: 'Acertos por tamanho do desenho',
    niveis: 'Nível em cada desenho', atividade: 'Atividade', outras: '✏️ Ponto a Ponto', tempos: 'Tempo para desenhar cada modelo' };
  if (mis.policia) return { tipo: 'policia', assunto: 'Controle inibitório e orientação (polícia e ladrão)', unidade: 'perseguição', revisar: 'Perseguições para revisar',
    certo: 'Perseguição', tentou: 'O que aconteceu', tentouPdf: 'O que aconteceu', porRegra: 'Ladrões presos por tipo de setas',
    niveis: 'Nível em cada perseguição', atividade: 'Atividade', outras: '🚓 Polícia e Ladrão', tempos: 'Tempo para prender cada ladrão' };
  if (mis.caminho) return { tipo: 'caminho', assunto: 'Memória de sequência e mapa (caminho da memória)', unidade: 'rodada', revisar: 'Caminhos para revisar',
    certo: 'Caminho', tentou: 'O que aconteceu', tentouPdf: 'O que aconteceu', porRegra: 'Acertos por tamanho do caminho',
    niveis: 'Nível em cada rodada', atividade: 'Atividade', outras: '🛣️ Caminho da Memória', tempos: 'Tempo para fazer cada caminho' };
  if (mis.taxi) return { tipo: 'taxi', assunto: 'Memória do trajeto (siga o táxi)', unidade: 'rodada', revisar: 'Caminhos para revisar',
    certo: 'Caminho', tentou: 'O que aconteceu', tentouPdf: 'O que aconteceu', porRegra: 'Acertos por tamanho do caminho',
    niveis: 'Nível em cada rodada', atividade: 'Atividade', outras: '🚕 Siga o Táxi', tempos: 'Tempo para fazer cada caminho' };
  if (mis.chaves) return { tipo: 'chaves', assunto: 'Sobreposição de figuras (percepção visual)', unidade: 'quadrado', revisar: 'Quadrados para revisar',
    certo: 'Quadrado da chave', tentou: 'O que escolheu', tentouPdf: 'O que o aluno escolheu', porRegra: 'Acertos por parte da chave',
    niveis: 'Nível em cada quadrado', atividade: 'Atividade', outras: '🧩 Chaves de Sobreposição', tempos: 'Tempo para responder cada quadrado' };
  if (mis.descobrir) return { tipo: 'descobrir', assunto: 'Descobrir o peso que falta (balança e incógnita)', unidade: 'rodada', revisar: 'Balanças para revisar',
    certo: 'Balança e peso certo', tentou: 'O que escolheu', tentouPdf: 'O que o aluno escolheu', porRegra: 'Acertos por tipo de balança',
    niveis: 'Nível em cada rodada', atividade: 'Atividade', outras: '⚖️ Descobrindo o Peso', tempos: 'Tempo para responder cada rodada' };
  if (mis.somando) return { tipo: 'somando', assunto: 'Soma e subtração de figuras (visualização mental)', unidade: 'conta', revisar: 'Contas para revisar',
    certo: 'Conta', tentou: 'O que escolheu', tentouPdf: 'O que o aluno escolheu', porRegra: 'Acertos por tipo de conta',
    niveis: 'Nível em cada conta', atividade: 'Atividade', outras: '🧮 Somando Imagens', tempos: 'Tempo para resolver cada conta' };
  if (mis.hora) return { tipo: 'hora', assunto: 'Horas: relógio de ponteiros e digital', unidade: 'rodada', revisar: 'Horas para revisar',
    certo: 'Hora certa', tentou: 'O que escolheu', tentouPdf: 'O que o aluno escolheu', porRegra: 'Acertos por tipo de leitura',
    niveis: 'Nível em cada rodada', atividade: 'Atividade', outras: '🕒 Jogo da Hora', tempos: 'Tempo para responder cada rodada' };
  if (mis.giro) return { tipo: 'giro', assunto: 'Rotação mental (giro imaginário)', unidade: 'giro', revisar: 'Giros para revisar',
    certo: 'Figura e giro', tentou: 'O que escolheu', tentouPdf: 'O que o aluno escolheu', porRegra: 'Acertos por tipo de giro',
    niveis: 'Nível em cada rodada', atividade: 'Atividade', outras: '🔄 Giro Imaginário', tempos: 'Tempo para responder cada giro' };
  if (mis.barcos) return { tipo: 'barcos', assunto: 'Lateralidade e contagem (esquerda e direita)', unidade: 'rodada', revisar: 'Rodadas para revisar',
    certo: 'Resposta certa', tentou: 'O que marcou', tentouPdf: 'O que o aluno marcou', porRegra: 'Acertos por quantidade de barcos',
    niveis: 'Nível em cada rodada', atividade: 'Atividade', outras: '⛵ Barquinhos', tempos: 'Tempo para responder cada rodada' };
  if (mis.copia) return { tipo: 'copia', assunto: 'Percepção visual e orientação espacial', unidade: 'modelo', revisar: 'Modelos para revisar',
    certo: 'Modelo', tentou: 'O que aconteceu', tentouPdf: 'O que aconteceu', porRegra: 'Acertos por tipo de modelo',
    niveis: 'Nível em cada modelo', atividade: 'Atividade', outras: '🧱 Copie Certo', tempos: 'Tempo para montar cada modelo' };
  if (mis.escondida) return { tipo: 'escondida', assunto: 'Atenção e leitura (palavra escondida)', unidade: 'palavra', revisar: 'Palavras para revisar',
    certo: 'Palavra escondida', tentou: 'O que marcou antes', tentouPdf: 'O que o aluno marcou antes', porRegra: 'Acertos por tipo de dica',
    niveis: 'Nível em cada palavra', atividade: 'Atividade', outras: '🔎 Palavra Escondida', tempos: 'Tempo para achar cada palavra (depois de entrar inteira)' };
  if (mis.fichas) return { tipo: 'fichas', assunto: 'Agrupar e trocar (valor das fichas)', unidade: 'jogada', revisar: 'Jogadas para revisar',
    certo: 'Jogada', tentou: 'O que aconteceu', tentouPdf: 'O que aconteceu', porRegra: 'Acertos por tipo',
    niveis: 'Nível', atividade: 'Atividade', outras: '🔴 Fichas Coloridas', tempos: 'Tempo para fazer as trocas em cada jogada' };
  if (mis.rotina) return { tipo: 'sequencia', assunto: 'Sequência e planejamento', unidade: 'rotina', revisar: 'Rotinas para revisar',
    certo: 'Rotina', tentou: 'O que aconteceu', tentouPdf: 'O que aconteceu', porRegra: 'Acertos por tamanho da rotina',
    niveis: 'Nível em cada rotina', atividade: 'Atividade', outras: '🧩 Rotina Certa', tempos: 'Tempo para ordenar cada rotina' };
  if (mis.luzes) return { tipo: 'atencao', assunto: 'Atenção e memória', unidade: 'sequência', revisar: 'Sequências para revisar',
    certo: 'Sequência que piscou', tentou: 'O que você fez', tentouPdf: 'O que o aluno fez', porRegra: 'Acertos por tamanho da sequência',
    niveis: 'Nível em cada rodada', atividade: 'Atividade', outras: mis.id === 'luzes2' ? '💡 Reflexo Nível 2' : '💡 Jogo do Reflexo', tempos: 'Tempo de resposta em cada rodada' };
  if (mis.peso) return { tipo: 'medidas', assunto: 'Medidas de massa', unidade: 'objeto', revisar: 'Objetos para revisar',
    certo: 'Objeto e peso', tentou: 'Passou do ponto com', tentouPdf: 'Passou do ponto com', porRegra: 'Acertos por unidade',
    niveis: 'Nível', atividade: 'Atividade', outras: '⚖️ Peso Certo' };
  if (mis.tiro) return { tipo: 'angulos', assunto: 'Ângulos', unidade: 'ângulo', revisar: 'Ângulos para revisar',
    certo: 'Ângulo certo', tentou: 'Você escolheu', tentouPdf: 'O aluno escolheu', porRegra: 'Acertos por tipo de ângulo',
    niveis: 'Nível em cada míssil', atividade: 'Atividade', outras: '🎯 Tiro Certo' };
  if (mis.matematica) return { tipo: 'matematica', assunto: 'Matemática', unidade: 'conta', revisar: 'Contas para revisar',
    certo: 'Conta certa', tentou: 'Você respondeu', tentouPdf: 'O aluno respondeu', porRegra: 'Acertos por operação',
    niveis: 'Nível em cada conta', atividade: 'Atividade', outras: '🔢 Outras contas' };
  return { tipo: 'ortografia', assunto: 'Ortografia', unidade: 'palavra', revisar: 'Palavras para revisar',
    certo: 'Jeito certo', tentou: 'Você tentou', tentouPdf: 'O aluno tentou', porRegra: 'Acertos por regra',
    niveis: 'Nível', atividade: 'Atividade', outras: mis.chuva ? '🌧️ Outra chuva' : 'Outro nível' };
}

// ---------- Gráficos do relatório ----------
// Desenhados num canvas no próprio aparelho; a mesma imagem aparece na tela e no PDF.
const COR_OK = '#2e9e5b', COR_ERRO = '#e53935', COR_TEXTO = '#13294b', COR_GRADE = '#dce9f8', COR_LINHA = '#1fa2b0';
const fonteGrafico = (tam, peso = 700) => `${peso} ${tam}px Nunito, Arial, sans-serif`;

function novoGrafico(w, h, titulo) {
  const c = document.createElement('canvas');
  c.width = w * 2; c.height = h * 2;   // dobro do tamanho: fica nítido na tela e no PDF
  const g = c.getContext('2d');
  g.scale(2, 2);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  g.textBaseline = 'middle';
  g.fillStyle = COR_TEXTO; g.font = fonteGrafico(16, 800); g.textAlign = 'left';
  g.fillText(titulo, 14, 20);
  return { c, g, w, h };
}

function legendaGrafico(g, w, y, itens, tam = 13) {
  g.font = fonteGrafico(tam);
  const larguras = itens.map(([, texto]) => 18 + g.measureText(texto).width);
  let x = (w - larguras.reduce((s, l) => s + l + 18, -18)) / 2;
  itens.forEach(([cor, texto], i) => {
    g.fillStyle = cor; g.beginPath(); g.arc(x + 6, y, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = COR_TEXTO; g.textAlign = 'left'; g.fillText(texto, x + 16, y);
    x += larguras[i] + 18;
  });
}

// rosca: quanto o aluno acertou de primeira
function graficoResultado(rel) {
  const { c, g, w } = novoGrafico(300, 240, 'Resultado');
  const ok = rel.dePrimeiraN, erro = rel.respondidas - ok, total = rel.respondidas || 1;
  const cx = w / 2, cy = 122, raio = 72;
  let inicio = -Math.PI / 2;
  for (const [v, cor] of [[ok, COR_OK], [erro, COR_ERRO]]) {
    if (!v) continue;
    const fim = inicio + (v / total) * Math.PI * 2;
    g.beginPath(); g.arc(cx, cy, raio, inicio, fim); g.arc(cx, cy, raio - 26, fim, inicio, true); g.closePath();
    g.fillStyle = cor; g.fill();
    inicio = fim;
  }
  g.fillStyle = COR_TEXTO; g.textAlign = 'center';
  g.font = fonteGrafico(28, 800); g.fillText(`${Math.round((ok / total) * 100)}%`, cx, cy - 6);
  g.font = fonteGrafico(12); g.fillText('de primeira', cx, cy + 18);
  legendaGrafico(g, w, 222, [[COR_OK, `${ok} ${ok === 1 ? 'acerto' : 'acertos'}`], [COR_ERRO, `${erro} com erro`]]);
  return c;
}

// barras: acertos e erros em cada regra (ou operação)
function graficoPorRegra(rel, titulo) {
  const linhas = rel.porRegra;
  const w = 440, h = 64 + linhas.length * 32 + 30;
  const { c, g } = novoGrafico(w, h, titulo);
  const x0 = 170, x1 = w - 56, maior = Math.max(...linhas.map((l) => l.total), 1);
  linhas.forEach((l, i) => {
    const y = 56 + i * 32;
    g.font = fonteGrafico(13); g.fillStyle = COR_TEXTO; g.textAlign = 'right';
    let rotulo = l.m.titulo;
    while (g.measureText(rotulo).width > x0 - 22 && rotulo.length > 4) rotulo = rotulo.slice(0, -2) + '…';
    g.fillText(rotulo, x0 - 10, y);
    const larg = (x1 - x0) / maior;
    const acertos = l.total - l.erros;
    g.fillStyle = COR_OK; g.fillRect(x0, y - 10, acertos * larg, 20);
    g.fillStyle = COR_ERRO; g.fillRect(x0 + acertos * larg, y - 10, l.erros * larg, 20);
    g.fillStyle = COR_TEXTO; g.textAlign = 'left'; g.font = fonteGrafico(12, 800);
    g.fillText(`${acertos}/${l.total}`, x0 + l.total * larg + 6, y);
  });
  legendaGrafico(g, w, h - 18, [[COR_OK, 'certo de primeira'], [COR_ERRO, 'com erro']]);
  return c;
}

// linha: o nível de cada conta da Chuva de Matemática
function graficoNiveis(rel, titulo, maximo) {
  const pts = rel.niveis, w = 640, h = 280;
  const { c, g } = novoGrafico(w, h, titulo);
  const x0 = 46, x1 = w - 20, yTopo = 46, yBase = 210;
  const yDe = (n) => yBase - ((n - 1) / (maximo - 1)) * (yBase - yTopo);
  const xDe = (i) => (pts.length === 1 ? (x0 + x1) / 2 : x0 + (i * (x1 - x0)) / (pts.length - 1));
  g.font = fonteGrafico(16); g.textAlign = 'right';
  for (const n of maximo > 5 ? [1, 4, 7, 10] : Array.from({ length: maximo }, (_, i) => i + 1)) {
    g.strokeStyle = COR_GRADE; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x0, yDe(n)); g.lineTo(x1, yDe(n)); g.stroke();
    g.fillStyle = COR_TEXTO; g.fillText(String(n), x0 - 10, yDe(n));
  }
  g.strokeStyle = COR_LINHA; g.lineWidth = 3; g.lineJoin = 'round';
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(xDe(i), yDe(p.n)) : g.moveTo(xDe(i), yDe(p.n))));
  g.stroke();
  g.textAlign = 'center';
  pts.forEach((p, i) => {
    g.fillStyle = p.ok ? COR_OK : COR_ERRO;
    g.beginPath(); g.arc(xDe(i), yDe(p.n), 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = COR_TEXTO; g.font = fonteGrafico(14); g.fillText(String(i + 1), xDe(i), yBase + 18);
  });
  legendaGrafico(g, w, h - 20, [[COR_OK, 'acertou (o nível sobe)'], [COR_ERRO, 'errou (o nível desce)']], 17);
  return c;
}

// tempo de resposta em cada rodada (Jogo do Reflexo): barra verde = acertou, vermelha = errou, cinza = não respondeu
function graficoTempos(rel, titulo) {
  const pts = rel.tempos, w = 640, h = 280;
  const { c, g } = novoGrafico(w, h, titulo);
  const x0 = 50, x1 = w - 20, yTopo = 50, yBase = 210;
  const maior = Math.max(4, ...pts.map((p) => p.t || 0));
  const topo = Math.ceil(maior / 2) * 2;
  const yDe = (t) => yBase - (t / topo) * (yBase - yTopo);
  g.font = fonteGrafico(15); g.textAlign = 'right';
  for (let t = 0; t <= topo; t += topo / 4) {
    g.strokeStyle = COR_GRADE; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x0, yDe(t)); g.lineTo(x1, yDe(t)); g.stroke();
    g.fillStyle = COR_TEXTO; g.fillText(`${t} s`, x0 - 8, yDe(t));
  }
  const passo = (x1 - x0) / pts.length, larg = Math.min(30, passo * 0.7);
  g.textAlign = 'center';
  pts.forEach((p, i) => {
    const x = x0 + passo * (i + 0.5);
    const t = p.t == null ? topo : p.t;
    g.fillStyle = p.t == null ? '#b0bec5' : p.ok ? COR_OK : COR_ERRO;
    g.fillRect(x - larg / 2, yDe(t), larg, yBase - yDe(t));
    g.fillStyle = COR_TEXTO; g.font = fonteGrafico(13); g.fillText(String(i + 1), x, yBase + 16);
  });
  legendaGrafico(g, w, h - 20, [[COR_OK, 'acertou'], [COR_ERRO, 'errou'], ['#b0bec5', 'sem resposta']], 16);
  return c;
}

function graficosDoRelatorio(rel, mis) {
  if (!rel.respondidas) return [];
  const graficos = [{ c: graficoResultado(rel), alt: `Resultado: ${rel.dePrimeiraN} de ${rel.respondidas} certas de primeira` }];
  const tx = textosRelatorio(mis);
  if (rel.porRegra.length) graficos.push({ c: graficoPorRegra(rel, tx.porRegra), alt: tx.porRegra });
  if (rel.niveis.length) graficos.push({ c: graficoNiveis(rel, tx.niveis, mis.pixels ? PIXELS.NIVEL_MAX : mis.pontoAPonto ? PONTOS.NIVEL_MAX : mis.policia ? POLICIA.NIVEL_MAX : mis.caminho || mis.taxi ? CAMINHO.NIVEL_MAX : mis.chaves ? CHAVES.NIVEL_MAX : mis.descobrir ? DESCOBRIR.NIVEL_MAX : mis.somando ? SOMANDO.NIVEL_MAX : mis.hora ? HORA.NIVEL_MAX : mis.giro ? GIRO.NIVEL_MAX : mis.barcos ? BARCOS.NIVEL_MAX : mis.copia ? COPIA.NIVEL_MAX : mis.escondida ? ESCONDIDA.NIVEL_MAX : mis.rotina ? ROTINA.NIVEL_MAX : mis.luzes ? LUZ.NIVEL_MAX : mis.tiro ? TIRO.NIVEL_MAX : MAT.NIVEL_MAX), alt: tx.niveis, largo: true });
  if (rel.tempos.length && tx.tempos) graficos.push({ c: graficoTempos(rel, tx.tempos), alt: tx.tempos, largo: true });
  return graficos.map((x) => ({ url: x.c.toDataURL('image/png'), w: x.c.width, h: x.c.height, alt: x.alt, largo: !!x.largo }));
}

function desenharRelatorio(rel, estrelas) {
  const data = new Date().toLocaleDateString('pt-BR');
  const tx = textosRelatorio(missao);
  const caixa = (s) => (missao.quiz || missao.pixels || missao.pontoAPonto || missao.policia || missao.caminho || missao.taxi || missao.chaves || missao.descobrir || missao.somando || missao.hora || missao.giro || missao.barcos || missao.copia || missao.rotina || missao.luzes || missao.fichas || missao.cores || missao.lados || missao.setas || missao.vistas || missao.dinos || missao.simbolos || missao.tabuada || missao.classes || missao.graficos ? s : s.toUpperCase());   // palavras em caixa alta; frases e perguntas como estão
  $('relatorio-info').innerHTML = `<b>Aluno:</b> ${seguro(aluno)} · <b>Data:</b> ${data} · <b>${tx.atividade}:</b> ${seguro(missao.titulo)}<br>`
    + `<b>Acertos de primeira:</b> ${rel.dePrimeiraN} de ${rel.respondidas} · <b>Estrelas:</b> ${estrelas} de 3`
    + (missao.extra ? `<br>${seguro(missao.extra)}` : '')
    + (missao.resumo ? `<ul class="relatorio-resumo">${missao.resumo.map((l) => `<li>${seguro(l)}</li>`).join('')}</ul>` : '');
  const graficos = graficosDoRelatorio(rel, missao);
  $('relatorio-graficos').innerHTML = graficos.map((x) =>
    `<img class="grafico${x.largo ? ' grafico-largo' : ''}" src="${x.url}" alt="${seguro(x.alt)}">`).join('');

  if (!rel.comErro.length) {
    $('relatorio-conteudo').innerHTML = '<p class="relatorio-ok">🎉 Nenhuma dificuldade nesta atividade! Você acertou tudo de primeira.</p>';
    return graficos;
  }
  const blocos = rel.grupos.map((g) => `
      <div class="dificuldade" style="--c:${g.m.cor}">
        <h4>${g.m.icone} ${g.m.titulo} <span class="qtd-erros">${g.itens.length} ${tx.unidade}${g.itens.length === 1 ? '' : 's'}</span></h4>
        <p class="dica-regra">${g.m.regra}</p>
      </div>`).join('');
  const linhas = rel.comErro.map((r) => `
      <tr><td class="certo">${seguro(caixa(r.certa))}</td><td class="escreveu">${r.erros.map((e) => seguro(caixa(String(e)))).join(', ')}</td></tr>`).join('');
  $('relatorio-conteudo').innerHTML = `
      <h4 class="relatorio-sub">Principais dificuldades</h4>
      ${blocos}
      <h4 class="relatorio-sub">${tx.revisar}</h4>
      <table class="tabela-revisar">
        <thead><tr><th>${tx.certo}</th><th>${tx.tentou}</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>`;
  return graficos;
}

// ---------- Relatório por e-mail (Google Apps Script: ferramentas/relatorio-email.gs) ----------
// Endereço do script publicado (veja "Relatório por e-mail" no README). Vazio: não envia.
// a planilha principal; uma escola com planilha própria (js/escola.js) troca o endereço de URL_RELATORIO
const URL_PRINCIPAL = 'https://script.google.com/macros/s/AKfycbzfaBB9wEG3wlP7PKRymBNOfvovZxViQ08vuC0IzTBZS63iYjqQW2GBskUEqM0DHj3i/exec';
let URL_RELATORIO = URL_PRINCIPAL;
// devolve true se mudou (para recarregar a lista de e-mails da planilha nova)
function definirUrlRelatorio(url) {
  if (!url || url === URL_RELATORIO) return false;
  URL_RELATORIO = url;
  return true;
}
const CHAVE_RELATORIO = 'jogo-ortografia';   // a mesma CHAVE do script
// relatórios que ainda não foram enviados ficam numa fila no aparelho (sem internet, vão depois)
const CHAVE_FILA = 'pleno-ortografia:fila-relatorios';
const lerFila = () => { try { return JSON.parse(localStorage.getItem(CHAVE_FILA)) || []; } catch (e) { return []; } };
const salvarFila = (f) => { try { localStorage.setItem(CHAVE_FILA, JSON.stringify(f.slice(-50))); } catch (e) { /* sem armazenamento */ } };
const resultadoEnvio = {};   // id do relatório -> 'ok' ou 'erro'
let enviando = false;

// devolve '' se enviou, ou o erro do script; sem internet, a promessa falha
async function postarRelatorio(dados) {
  const r = await fetch(URL_RELATORIO, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(dados) });
  const j = await r.json();
  return j.ok ? '' : (j.erro || 'erro');
}

// envia a fila, do mais antigo para o mais novo
async function enviarFila() {
  if (enviando || !URL_RELATORIO) return;
  enviando = true;
  try {
    for (let item = lerFila()[0]; item; item = lerFila()[0]) {
      let erro;
      try { erro = await postarRelatorio(item); } catch (e) { break; }   // sem internet: tenta depois
      if (erro === 'cota') break;                                         // passou do limite do dia: tenta depois
      salvarFila(lerFila().filter((r) => r.id !== item.id));
      resultadoEnvio[item.id] = erro ? 'erro' : 'ok';
    }
  } finally { enviando = false; }
}

async function enviarRelatorioPorEmail({ rel, estrelas, missao: mis, data }) {
  const aviso = $('envio-email');
  aviso.hidden = true;
  const para = emailDoRelatorio();
  if (!URL_RELATORIO || !para || !rel.respondidas) return;
  const id = `${data.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  salvarFila([...lerFila(), {
    id, chave: CHAVE_RELATORIO, para, jogo: jogoDaMissao(mis), aluno, tipo: textosRelatorio(mis).tipo, assunto: textosRelatorio(mis).assunto, missao: mis.titulo, data: data.toLocaleDateString('pt-BR'),
    acertos: rel.dePrimeiraN, total: rel.respondidas, estrelas,
    grupos: rel.grupos.map((g) => ({ titulo: g.m.titulo, qtd: g.itens.length, regra: semHTML(g.m.regra) })),
    palavras: rel.comErro.map((r) => ({ certa: r.certa, tentou: r.erros })),
    porRegra: rel.porRegra.map((x) => ({ titulo: x.m.titulo, total: x.total, erros: x.erros })),
    niveis: rel.niveis,
    extra: mis.extra || '',
    resumo: mis.resumo || [],
    tempos: rel.tempos,
  }]);
  aviso.className = 'envio-email carregando';
  aviso.textContent = '📧 Enviando o relatório para o professor…';
  aviso.hidden = false;
  await enviarFila();
  if (resultadoEnvio[id] === 'ok') {
    aviso.className = 'envio-email ok';
    aviso.textContent = `📧 Relatório enviado para ${(listaEmails().find((x) => x.email === para) || { nome: para }).nome}.`;
  } else if (resultadoEnvio[id] === 'erro') {
    aviso.className = 'envio-email erro';
    aviso.textContent = 'Não foi possível enviar o relatório. Peça ao professor para conferir o e-mail na Área do professor.';
  } else {
    aviso.className = 'envio-email';
    aviso.textContent = '📧 Sem internet agora: o relatório será enviado ao professor quando houver conexão.';
  }
}

let ultimoRelatorio = null;
// o que mais acontece no fim de cada partida (ex.: mandar a pontuação para a competição)
const depoisDoFim = [];

function fimDaMissao() {
  const rel = montarRelatorio();
  const taxa = rel.respondidas ? rel.dePrimeiraN / rel.respondidas : 0;
  const n = taxa >= 0.9 ? 3 : taxa >= 0.6 ? 2 : 1;
  if (rel.respondidas) salvarEstrelas(missao.id, n);
  ultimoRelatorio = { rel, estrelas: n, missao, data: new Date() };
  SOM.vitoria();
  $('fim-titulo').textContent = n === 3 ? 'Missão perfeita!' : 'Missão cumprida!';
  $('fim-estrelas').innerHTML = estrelasTexto(n);
  $('fim-texto').textContent = `${aluno}, você acertou ${rel.dePrimeiraN} de ${rel.respondidas} de primeira em "${missao.titulo}"!`;
  mascote('davi-fim', 'festa');
  $('btn-outras').textContent = textosRelatorio(missao).outras;
  ultimoRelatorio.graficos = desenharRelatorio(rel, n);
  enviarRelatorioPorEmail(ultimoRelatorio);
  depoisDoFim.forEach((f) => f({ rel, missao }));   // antes de trocar de tela: o placar do jogo ainda está visível
  mostrar('tela-fim');
  soltarConfete();
  frase(n === 3 ? 'missao-perfeita' : 'missao-cumprida', n === 3 ? `Parabéns, ${aluno}! Missão perfeita!` : `Parabéns, ${aluno}! Missão cumprida!`);
}

function soltarConfete() {
  const c = $('confete');
  c.innerHTML = '';
  const itens = ['⭐', '🎉', '✨', '❤️', '💛', '💙'];
  for (let i = 0; i < 36; i++) {
    const s = document.createElement('span');
    s.textContent = sortear(itens);
    s.style.left = Math.random() * 100 + '%';
    s.style.animationDuration = 2 + Math.random() * 2.5 + 's';
    s.style.animationDelay = Math.random() * 0.8 + 's';
    c.append(s);
  }
  setTimeout(() => { c.innerHTML = ''; }, 5500);
}

// ---------- PDF do relatório (gerado no próprio aparelho) ----------
// fontes padrão do PDF não têm emoji: tira tudo que não for letra latina
const paraPDF = (t) => semHTML(t).replace(/&amp;/g, '&').replace(/[^\u0000-ÿ]/g, '').replace(/\s+/g, ' ').trim();
const nomeArquivo = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

function imagemComoDataURL(src) {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      try { ok({ url: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight }); } catch (e) { falha(e); }
    };
    img.onerror = falha;
    img.src = src;
  });
}

async function baixarPDF() {
  if (!ultimoRelatorio) return;
  const lib = window.jspdf;
  if (!lib || !lib.jsPDF) { window.print(); return; }   // sem a biblioteca: usa "Salvar como PDF" do navegador
  const { rel, estrelas, missao: mis, data } = ultimoRelatorio;
  const tx = textosRelatorio(mis);
  const doc = new lib.jsPDF({ unit: 'mm', format: 'a4' });
  const AZUL = [19, 119, 132], TEXTO = [34, 54, 74], CINZA = [100, 116, 139];
  const L = 18, LARG = 210 - 2 * L;
  let y = 16;

  const novaPaginaSePrecisar = (altura) => { if (y + altura > 278) { doc.addPage(); y = 20; } };
  const paragrafo = (texto, tam = 11, estilo = 'normal', cor = TEXTO, recuo = 0) => {
    doc.setFont('helvetica', estilo); doc.setFontSize(tam); doc.setTextColor(...cor);
    const linhas = doc.splitTextToSize(paraPDF(texto), LARG - recuo);
    for (const l of linhas) { novaPaginaSePrecisar(tam * 0.5); doc.text(l, L + recuo, y); y += tam * 0.45; }
  };

  // cabeçalho com o logo
  try {
    const logo = await imagemComoDataURL('assets/logo-pg.png');
    doc.addImage(logo.url, 'PNG', L, y - 2, 28, 28 * logo.h / logo.w, undefined, 'FAST');
  } catch (e) { /* sem logo */ }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...AZUL);
  doc.text(`Relatório de ${tx.assunto}`, L + 34, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...CINZA);
  doc.text('Jogos Educacionais', L + 34, y + 14);
  y += 30;
  doc.setDrawColor(...AZUL); doc.setLineWidth(0.6); doc.line(L, y, L + LARG, y); y += 8;

  paragrafo(`Aluno: ${aluno}`, 12, 'bold');
  paragrafo(`Data: ${data.toLocaleDateString('pt-BR')}    ${tx.atividade}: ${mis.titulo}`, 11);
  paragrafo(`Acertos de primeira: ${rel.dePrimeiraN} de ${rel.respondidas}    Estrelas: ${estrelas} de 3`, 11);
  if (mis.extra) paragrafo(mis.extra, 11);
  for (const linha of mis.resumo || []) paragrafo(`• ${linha}`, 11);
  y += 4;

  // gráficos: os pequenos lado a lado, o de níveis na largura toda
  const graficos = ultimoRelatorio.graficos || [];
  const pequenos = graficos.filter((x) => !x.largo), largos = graficos.filter((x) => x.largo);
  if (pequenos.length) {
    const larguras = pequenos.length === 1 ? [70] : [62, LARG - 62 - 6];
    const alturas = pequenos.map((x, i) => (larguras[i] * x.h) / x.w);
    novaPaginaSePrecisar(Math.max(...alturas) + 4);
    let x = L;
    pequenos.forEach((g, i) => { doc.addImage(g.url, 'PNG', x, y, larguras[i], alturas[i], undefined, 'FAST'); x += larguras[i] + 6; });
    y += Math.max(...alturas) + 4;
  }
  for (const g of largos) {
    const alt = (LARG * g.h) / g.w;
    novaPaginaSePrecisar(alt + 4);
    doc.addImage(g.url, 'PNG', L, y, LARG, alt, undefined, 'FAST');
    y += alt + 4;
  }
  y += 2;

  if (!rel.comErro.length) {
    paragrafo('Parabéns! Nenhuma dificuldade nesta atividade: todas as respostas certas de primeira.', 13, 'bold', AZUL);
  } else {
    novaPaginaSePrecisar(14);
    paragrafo('Principais dificuldades', 15, 'bold', AZUL); y += 1;
    for (const g of rel.grupos) {
      novaPaginaSePrecisar(24);
      paragrafo(`${g.m.titulo} - ${g.itens.length} ${tx.unidade}${g.itens.length === 1 ? '' : 's'} com erro`, 12, 'bold');
      paragrafo(`Regra: ${g.m.regra}`, 10.5, 'normal', TEXTO, 4);
      paragrafo(`${tx.revisar.split(' ')[0]}: ${g.itens.map((r) => r.certa).join(', ')}`, 10.5, 'italic', CINZA, 4);
      y += 3;
    }

    // tabela: jeito certo x o que o aluno tentou
    y += 2; novaPaginaSePrecisar(20);
    paragrafo(tx.revisar, 15, 'bold', AZUL); y += 1;
    const col2 = L + 70;
    const cabecalho = () => {
      doc.setFillColor(...AZUL); doc.rect(L, y - 5, LARG, 8, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
      doc.text(tx.certo, L + 3, y); doc.text(tx.tentouPdf, col2 + 3, y);
      y += 7;
    };
    cabecalho();
    const caixa = (s) => (mis.quiz || mis.pixels || mis.pontoAPonto || mis.policia || mis.caminho || mis.taxi || mis.chaves || mis.descobrir || mis.somando || mis.hora || mis.giro || mis.barcos || mis.copia || mis.rotina || mis.luzes || mis.fichas || mis.cores || mis.lados || mis.setas || mis.vistas || mis.dinos || mis.simbolos || mis.tabuada || mis.classes || mis.graficos ? s : s.toUpperCase());
    rel.comErro.forEach((r, i) => {
      // textos longos (perguntas do questionário) quebram em várias linhas dentro da coluna
      doc.setFontSize(11);
      const esquerda = doc.splitTextToSize(paraPDF(caixa(r.certa)), col2 - L - 6);
      const direita = doc.splitTextToSize(paraPDF(r.erros.map((e) => caixa(String(e))).join(', ')), L + LARG - col2 - 6);
      const alt = Math.max(esquerda.length, direita.length) * 5 + 3;
      if (y + alt > 278) { doc.addPage(); y = 20; cabecalho(); }
      if (i % 2 === 0) { doc.setFillColor(232, 246, 248); doc.rect(L, y - 5, LARG, alt, 'F'); }
      doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 120, 70);
      doc.text(esquerda, L + 3, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 50, 60);
      doc.text(direita, col2 + 3, y);
      y += alt;
    });
  }

  // rodapé em todas as páginas
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...CINZA);
    doc.text('© Pedagogia Gamificada - Todos os direitos reservados', L, 290);
    doc.text(`${i}/${paginas}`, L + LARG, 290, { align: 'right' });
  }
  doc.save(`relatorio-${nomeArquivo(aluno)}-${nomeArquivo(mis.titulo)}.pdf`);
}

$('btn-repetir').onclick = () => (missao.quiz ? comecarQuiz(missao.quizId) : missao.pixels ? comecarPixels() : missao.pontoAPonto ? comecarPontos() : missao.policia ? comecarPolicia() : missao.caminho ? comecarCaminho() : missao.taxi ? comecarTaxi() : missao.chaves ? comecarChaves() : missao.descobrir ? comecarDescobrir() : missao.somando ? comecarSomando() : missao.hora ? comecarHora() : missao.giro ? comecarGiro() : missao.barcos ? comecarBarcos() : missao.copia ? comecarCopia() : missao.escondida ? comecarEscondida() : missao.setas ? comecarSetas() : missao.vistas ? comecarVistas() : missao.dinos ? comecarDinos() : missao.simbolos ? comecarSimbolos() : missao.tabuada ? comecarTabuada() : missao.classes ? comecarClasses() : missao.graficos ? comecarGraficos(missao.nivelGraficos) : missao.cores ? comecarCores() : missao.lados ? comecarLados() : missao.fichas ? comecarFichas() : missao.rotina ? comecarRotina() : missao.luzes ? comecarLuz() : missao.peso ? comecarPeso() : missao.tiro ? comecarTiro() : missao.matematica ? comecarMat() : missao.chuva ? comecarChuva() : comecarMissao());
$('btn-outras').onclick = () => (missao.quiz ? telaQuizMenu() : missao.pixels ? telaPixelsMenu() : missao.pontoAPonto ? telaPontosMenu() : missao.policia ? telaPoliciaMenu() : missao.caminho ? telaCaminhoMenu() : missao.taxi ? telaTaxiMenu() : missao.chaves ? telaChavesMenu() : missao.descobrir ? telaDescobrirMenu() : missao.somando ? telaSomandoMenu() : missao.hora ? telaHoraMenu() : missao.giro ? telaGiroMenu() : missao.barcos ? telaBarcosMenu() : missao.copia ? telaCopiaMenu() : missao.escondida ? telaEscondidaMenu() : missao.setas ? telaSetasMenu() : missao.vistas ? telaVistasMenu() : missao.dinos ? telaDinosMenu() : missao.simbolos ? telaSimbolosMenu() : missao.tabuada ? telaTabuadaMenu() : missao.classes ? telaClassesMenu() : missao.graficos ? telaGraficosMenu() : missao.cores ? telaCoresMenu() : missao.lados ? telaLadosMenu() : missao.fichas ? telaFichasMenu() : missao.rotina ? telaRotinaMenu() : missao.luzes ? telaLuzesMenu() : missao.peso ? telaPesoMenu() : missao.tiro ? telaTiroMenu() : missao.matematica ? telaMatMenu() : missao.chuva ? telaChuvaMenu() : telaMissoes());
$('btn-pdf').onclick = () => { baixarPDF().catch((e) => { console.error('PDF:', e); window.print(); }); };

export { CHAVE_RELATORIO, definirUrlRelatorio, depoisDoFim, enviarFila, fimDaMissao, ultimoRelatorio, URL_PRINCIPAL, URL_RELATORIO };
