/* Jogos Educacionais — script do Google (Apps Script, gratuito), ligado a uma planilha do Google.
   A planilha guarda tudo, sem banco de dados:
   - aba "E-mails": a lista de professores que recebem relatórios (A nome, B e-mail); o aluno escolhe um antes de cada jogo.
     O professor cadastra e remove e-mails pela Área do professor (ou direto na aba);
   - abas "Q: <nome>": um questionário da aula em cada aba (A pergunta, B resposta certa, C a E respostas erradas);
   - aba "Relatórios": uma linha para cada relatório enviado.
   O jogo lê a lista de e-mails e os questionários (doGet) e manda relatórios e alterações do professor (doPost).
   Os relatórios só podem ir para e-mails que estão na aba "E-mails" (ninguém usa o script para mandar e-mail a outros).
   Os e-mails saem pelo Gmail da conta que publicou o script (até 100 por dia numa conta Gmail comum).
   Como publicar: veja "Relatório por e-mail" no README.md. */

const CHAVE = 'jogo-ortografia';      // a mesma CHAVE_RELATORIO do js/relatorio.js (só evita envios por engano)
const SENHA_PROFESSOR = 'app0707';    // a mesma senha da Área do professor: exigida para mudar e-mails e questionários
const MAX_ITENS = 120;
const PREFIXO_QUESTIONARIO = 'Q: ';   // abas criadas pelo jogo; à mão vale "Q:" com ou sem espaço
const ABA_QUESTIONARIO = /^Q:\s*/i;
const tituloDaAba = (a) => a.getName().replace(ABA_QUESTIONARIO, '').trim() || a.getName();
const TEXTOS = {
  ortografia: { assunto: 'Ortografia', unidade: 'palavra', revisar: 'Palavras para revisar', certo: 'Jeito certo', tentou: 'O aluno tentou', porRegra: 'Acertos por regra', niveis: 'Nível', nivelMax: 10 },
  matematica: { assunto: 'Matemática', unidade: 'conta', revisar: 'Contas para revisar', certo: 'Conta certa', tentou: 'O aluno respondeu', porRegra: 'Acertos por operação', niveis: 'Nível em cada conta', nivelMax: 10 },
  medidas: { assunto: 'Medidas de massa', unidade: 'objeto', revisar: 'Objetos para revisar', certo: 'Objeto e peso', tentou: 'Passou do ponto com', porRegra: 'Acertos por unidade', niveis: 'Nível', nivelMax: 3 },
  angulos: { assunto: 'Ângulos', unidade: 'ângulo', revisar: 'Ângulos para revisar', certo: 'Ângulo certo', tentou: 'O aluno escolheu', porRegra: 'Acertos por tipo de ângulo', niveis: 'Nível em cada míssil', nivelMax: 5 },
  atencao: { assunto: 'Atenção e memória', unidade: 'sequência', revisar: 'Sequências para revisar', certo: 'Sequência que piscou', tentou: 'O que o aluno fez', porRegra: 'Acertos por tamanho da sequência', niveis: 'Nível em cada rodada', nivelMax: 8 },
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

// ---------- leituras (GET): lista de e-mails e questionários ----------
function doGet(e) {
  try {
    const acao = (e && e.parameter && e.parameter.acao) || '';
    if (acao === 'emails') return resposta({ ok: true, emails: lerEmails() });
    if (acao === 'questionarios') return resposta({ ok: true, lista: listarQuestionarios() });
    if (acao === 'questionario') return resposta({ ok: true, questionario: lerQuestionario(e.parameter.id) });
    return resposta({ ok: true, versao: 3 });
  } catch (err) {
    return resposta({ ok: false, erro: String(err) });
  }
}

// ---------- envios (POST): relatório do aluno ou alteração do professor ----------
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.chave !== CHAVE) return resposta({ ok: false, erro: 'chave' });
    if (d.acao) {
      if (d.senha !== SENHA_PROFESSOR) return resposta({ ok: false, erro: 'senha' });
      if (d.acao === 'entrar') return resposta({ ok: true });
      if (d.acao === 'adicionarEmail') { adicionarEmail(d.nome, d.email); return resposta({ ok: true, emails: lerEmails() }); }
      if (d.acao === 'removerEmail') { removerEmail(d.email); return resposta({ ok: true, emails: lerEmails() }); }
      if (d.acao === 'salvarQuestionario') return resposta({ ok: true, id: salvarQuestionario(d.titulo, d.perguntas) });
      if (d.acao === 'excluirQuestionario') { excluirQuestionario(d.id); return resposta({ ok: true }); }
      return resposta({ ok: false, erro: 'acao' });
    }
    return enviarRelatorio(d);
  } catch (err) {
    return resposta({ ok: false, erro: err && err.message ? err.message : String(err) });
  }
}

// ---------- lista de e-mails (aba "E-mails": A nome do professor, B e-mail) ----------
function planilha() {
  const p = SpreadsheetApp.getActiveSpreadsheet && SpreadsheetApp.getActiveSpreadsheet();
  if (!p) throw new Error('O script precisa estar ligado a uma planilha (Extensões → Apps Script).');
  return p;
}

function abaEmails() {
  const p = planilha();
  let aba = p.getSheetByName('E-mails');
  if (!aba) {   // primeira vez: cria a aba já com o cabeçalho, para o professor preencher
    aba = p.insertSheet('E-mails', 0);
    aba.getRange(1, 1, 1, 2).setValues([['Professor', 'E-mail']]);
    aba.getRange(1, 1, 1, 2).setFontWeight('bold');
  }
  return aba;
}

function lerEmails() {
  const aba = abaEmails();
  if (aba.getLastRow() < 1) return [];
  const linhas = aba.getRange(1, 1, aba.getLastRow(), 2).getDisplayValues();
  if (!emailValido(texto(linhas[0][1], 120).toLowerCase())) linhas.shift();   // a primeira linha pode ser o cabeçalho
  return linhas
    .map(([nome, email]) => ({ nome: texto(nome, 60), email: texto(email, 120).toLowerCase() }))
    .filter((x) => emailValido(x.email))
    .map((x) => ({ nome: x.nome || x.email, email: x.email }));
}

function adicionarEmail(nome, email) {
  const m = texto(email, 120).toLowerCase();
  if (!emailValido(m)) throw new Error('email');
  if (lerEmails().some((x) => x.email === m)) throw new Error('repetido');
  abaEmails().appendRow([texto(nome, 60) || m, m]);
}

function removerEmail(email) {
  const m = texto(email, 120).toLowerCase();
  const aba = abaEmails();
  const valores = aba.getRange(1, 1, Math.max(aba.getLastRow(), 1), 2).getDisplayValues();
  for (let i = valores.length - 1; i >= 0; i--) {   // de baixo para cima, para o número das linhas não mudar
    if (texto(valores[i][1], 120).toLowerCase() === m) aba.deleteRow(i + 1);
  }
}

// ---------- questionários (uma aba "Q: <nome>" para cada um) ----------
function abasDeQuestionario() {
  return planilha().getSheets().filter((a) => ABA_QUESTIONARIO.test(a.getName()));
}

function perguntasDaAba(aba) {
  if (aba.getLastRow() < 1) return [];
  const valores = aba.getRange(1, 1, aba.getLastRow(), 5).getDisplayValues();
  if (/pergunta/i.test(valores[0][0])) valores.shift();   // a primeira linha pode ser o cabeçalho
  return valores
    .map((l) => ({ pergunta: texto(l[0], 300), certa: texto(l[1], 160), erradas: l.slice(2, 5).map((x) => texto(x, 160)).filter(Boolean) }))
    .filter((q) => q.pergunta && q.certa && q.erradas.length && !ehCabecalho(q.pergunta, q.certa));
}

// linha de cabeçalho ("Pergunta | Resposta certa | ..."), mesmo repetida no meio da aba
const ehCabecalho = (a, b) => /^pergunta$/i.test(String(a).trim()) && /resposta|certa/i.test(String(b));

function listarQuestionarios() {
  return abasDeQuestionario().map((a) => ({ id: String(a.getSheetId()), titulo: tituloDaAba(a), perguntas: perguntasDaAba(a).length }));
}

function lerQuestionario(id) {
  const aba = abasDeQuestionario().find((a) => String(a.getSheetId()) === String(id));
  if (!aba) throw new Error('Questionário não encontrado.');
  return { id: String(aba.getSheetId()), titulo: tituloDaAba(aba), perguntas: perguntasDaAba(aba) };
}

function salvarQuestionario(titulo, perguntas) {
  const p = planilha();
  let nome = PREFIXO_QUESTIONARIO + (texto(titulo, 80).replace(/[\[\]\*\?\/\\]/g, '-') || 'Questionário');
  for (let n = 2; p.getSheetByName(nome); n++) nome = `${nome.replace(/ \(\d+\)$/, '')} (${n})`;
  const linhas = lista(perguntas)
    .map((q) => [texto(q.pergunta, 300), texto(q.certa, 160), ...lista(q.erradas).slice(0, 3).map((x) => texto(x, 160))])
    .filter((l) => l[0] && l[1] && l[2]);
  if (!linhas.length) throw new Error('O questionário precisa de pelo menos uma pergunta com resposta certa e errada.');
  const aba = p.insertSheet(nome);
  const tabela = [['Pergunta', 'Resposta certa', 'Errada 1', 'Errada 2', 'Errada 3'], ...linhas.map((l) => [...l, '', '', ''].slice(0, 5))];
  aba.getRange(1, 1, tabela.length, 5).setValues(tabela);
  aba.getRange(1, 1, 1, 5).setFontWeight('bold');
  return String(aba.getSheetId());
}

function excluirQuestionario(id) {
  const aba = abasDeQuestionario().find((a) => String(a.getSheetId()) === String(id));
  if (aba) planilha().deleteSheet(aba);
}

// ---------- relatório por e-mail ----------
function enviarRelatorio(d) {
  const missao = texto(d.missao, 80);
  // tipo do relatório: pelo campo "tipo" ou, nas versões antigas do jogo, pelo nome da atividade
  const tipo = d.tipo === 'questionario' ? 'questionario'
    : d.tipo === 'atencao' ? 'atencao'
    : d.tipo === 'sequencia' ? 'sequencia'
    : d.tipo === 'fichas' ? 'fichas'
    : d.tipo === 'escondida' ? 'escondida'
    : d.tipo === 'copia' ? 'copia'
    : d.tipo === 'barcos' ? 'barcos'
    : d.tipo === 'giro' ? 'giro'
    : d.tipo === 'cores' ? 'cores'
    : d.tipo === 'lateralidade' ? 'lateralidade'
    : d.tipo === 'setas' ? 'setas'
    : d.tipo === 'vistas' ? 'vistas'
    : d.tipo === 'dinos' ? 'dinos'
    : d.tipo === 'simbolos' ? 'simbolos'
    : d.tipo === 'tabuada' ? 'tabuada'
    : d.tipo === 'classes' ? 'classes'
    : d.tipo === 'graficos' ? 'graficos'
    : d.tipo === 'medidas' || /peso certo/i.test(missao) ? 'medidas'
    : d.tipo === 'angulos' || /tiro certo/i.test(missao) ? 'angulos'
    : d.tipo === 'matematica' || /matem/i.test(String(d.assunto || '')) || /matem/i.test(missao) ? 'matematica' : 'ortografia';
  // destinatário: o e-mail que o aluno escolheu, desde que esteja na aba "E-mails"
  const para = texto(d.para, 120).toLowerCase();
  if (!emailValido(para) || !lerEmails().some((x) => x.email === para)) return resposta({ ok: false, erro: 'email' });
  if (MailApp.getRemainingDailyQuota() < 1) return resposta({ ok: false, erro: 'cota' });

  const tx = TEXTOS[tipo];
  const assunto = tx.assunto;
  const aluno = texto(d.aluno, 40);
  const data = texto(d.data, 20);
  const grupos = lista(d.grupos).map((g) => ({ titulo: texto(g.titulo, 60), qtd: Number(g.qtd) || 0, regra: texto(g.regra, 400) }));
  const palavras = lista(d.palavras).map((p) => ({ certa: texto(p.certa, 300), tentou: lista(p.tentou).map((t) => texto(t, 160)) }));
  const extra = texto(d.extra, 120);
  const acertos = Number(d.acertos) || 0, total = Number(d.total) || 0, estrelas = Number(d.estrelas) || 0;
  const porRegra = lista(d.porRegra).slice(0, 12).map((x) => ({ titulo: texto(x.titulo, 40), total: numero(x.total, 200), erros: numero(x.erros, 200) }));
  const niveis = lista(d.niveis).slice(0, 40).map((x) => ({ n: numero(x.n, tx.nivelMax) || 1, ok: !!x.ok }));
  // Jogo do Reflexo: destaques em frases e o tempo de resposta de cada rodada (null = não respondeu)
  const resumo = lista(d.resumo).slice(0, 10).map((l) => texto(l, 200)).filter(Boolean);
  const tempos = lista(d.tempos).slice(0, 40).map((x) => ({ t: x.t == null ? null : Math.min(60, Math.max(0, Number(x.t) || 0)), ok: !!x.ok }));

  MailApp.sendEmail({
    to: para,
    name: 'Jogos Educacionais',
    subject: `Relatório de ${assunto}: ${aluno} (${missao})`,
    htmlBody: montarEmail({ tx, extra, assunto, aluno, missao, data, acertos, total, estrelas, grupos, palavras, porRegra, niveis, resumo, tempos }),
  });
  guardarNaPlanilha([new Date(), para, aluno, missao, acertos, total, estrelas,
    palavras.map((p) => `${p.certa} (${p.tentou.join(', ')})`).join('; ')]);
  return resposta({ ok: true });
}

function montarEmail(r) {
  const h = esc;
  const dificuldades = r.grupos.length
    ? r.grupos.map((g) => `<p style="margin:10px 0 2px"><b>${h(g.titulo)}</b>: ${g.qtd} ${r.tx.unidade}${g.qtd === 1 ? '' : 's'} com erro</p>`
      + `<p style="margin:0;color:#475569">${h(g.regra)}</p>`).join('')
    : '<p>Nenhuma dificuldade nesta atividade: todas as respostas certas de primeira! 🎉</p>';
  const caixa = (t) => ([TEXTOS.questionario, TEXTOS.atencao, TEXTOS.sequencia, TEXTOS.fichas, TEXTOS.copia, TEXTOS.barcos, TEXTOS.giro, TEXTOS.cores, TEXTOS.lateralidade, TEXTOS.setas, TEXTOS.vistas, TEXTOS.dinos, TEXTOS.simbolos, TEXTOS.tabuada, TEXTOS.classes, TEXTOS.graficos].includes(r.tx) ? t : t.toUpperCase());   // frases e perguntas como estão
  const linhas = r.palavras.map((p) => `<tr><td style="padding:6px 10px;color:#1e7846;font-weight:bold">${h(caixa(p.certa))}</td>`
    + `<td style="padding:6px 10px;color:#c8323c;text-decoration:line-through">${h(caixa(p.tentou.join(', ')))}</td></tr>`).join('');
  const tabela = linhas
    ? `<h3 style="color:#1fa2b0">${r.tx.revisar}</h3><table style="border-collapse:collapse;border:1px solid #dbeef1">`
      + `<tr style="background:#1fa2b0;color:#fff"><th style="padding:6px 10px;text-align:left">${r.tx.certo}</th><th style="padding:6px 10px;text-align:left">${r.tx.tentou}</th></tr>${linhas}</table>`
    : '';
  return `<div style="font-family:Arial,sans-serif;color:#13294b;max-width:640px">`
    + `<h2 style="color:#1fa2b0;margin-bottom:4px">Relatório de ${r.assunto}</h2>`
    + `<p style="margin-top:0;color:#64748b">Jogos Educacionais: o aluno joga, o professor analisa</p>`
    + `<p><b>Aluno:</b> ${h(r.aluno)}<br><b>Atividade:</b> ${h(r.missao)}<br><b>Data:</b> ${h(r.data)}<br>`
    + `<b>Acertos de primeira:</b> ${r.acertos} de ${r.total} · <b>Estrelas:</b> ${r.estrelas} de 3${r.extra ? `<br>${h(r.extra)}` : ''}</p>`
    + (r.resumo && r.resumo.length ? `<h3 style="color:#1fa2b0;margin-bottom:6px">Destaques</h3><ul style="margin-top:0;padding-left:20px">${r.resumo.map((l) => `<li style="margin-bottom:4px">${h(l)}</li>`).join('')}</ul>` : '')
    + graficosEmail(r)
    + `<h3 style="color:#1fa2b0">Principais dificuldades</h3>${dificuldades}${tabela}</div>`;
}

// Gráficos feitos só com tabelas e cores (o Gmail não mostra imagens nem SVG embutidos)
const VERDE = '#2e9e5b', VERMELHO = '#e53935';

function barra(partes, alturaPx) {
  const celulas = partes.filter(([pct]) => pct > 0)
    .map(([pct, cor, rotulo]) => `<td width="${pct}%" style="background:${cor};color:#fff;font-size:12px;font-weight:bold;text-align:center;height:${alturaPx}px;padding:0">${rotulo || ''}</td>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>${celulas || '<td></td>'}</tr></table>`;
}

function graficosEmail(r) {
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
        + barra([[Math.round((ok / x.total) * 100), VERDE, ok || ''], [Math.round((x.erros / x.total) * 100), VERMELHO, x.erros || '']], 18)
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

  if (r.tempos && r.tempos.length) {
    const maior = Math.max(4, ...r.tempos.map((x) => x.t || 0));
    const colunas = r.tempos.map((x, i) => `<td valign="bottom" align="center" style="padding:0 1px">`
      + `<div style="font-size:9px;color:#64748b">${x.t == null ? '–' : String(x.t).replace('.', ',')}</div>`
      + `<div style="height:${Math.max(4, Math.round(((x.t == null ? maior : x.t) * 90) / maior))}px;background:${x.t == null ? '#b0bec5' : x.ok ? VERDE : VERMELHO};border-radius:3px 3px 0 0"></div>`
      + `<div style="font-size:10px;color:#64748b">${i + 1}</div></td>`).join('');
    html += `<h3 style="color:#1fa2b0;margin:18px 0 6px">${r.tx === TEXTOS.sequencia ? 'Tempo para ordenar cada rotina' : r.tx === TEXTOS.fichas ? 'Tempo para fazer as trocas em cada jogada' : r.tx === TEXTOS.escondida ? 'Tempo para achar cada palavra' : r.tx === TEXTOS.copia ? 'Tempo para montar cada modelo' : r.tx === TEXTOS.barcos ? 'Tempo para responder cada rodada' : r.tx === TEXTOS.giro ? 'Tempo para responder cada giro' : r.tx === TEXTOS.cores ? 'Tempo para resolver cada conta' : r.tx === TEXTOS.lateralidade ? 'Tempo de resposta em cada comando' : r.tx === TEXTOS.setas ? 'Tempo para responder cada sequência' : r.tx === TEXTOS.vistas ? 'Tempo para responder cada pirâmide' : r.tx === TEXTOS.dinos ? 'Tempo para escolher cada sequência' : r.tx === TEXTOS.simbolos ? 'Tempo para completar cada carta' : r.tx === TEXTOS.tabuada ? 'Tempo para estourar cada quadrado' : 'Tempo de resposta em cada rodada'} (segundos)</h3>`
      + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="height:125px"><tr>${colunas}</tr></table>`
      + `<p style="font-size:12px;color:#64748b;margin:4px 0 0">Barra mais baixa = resposta mais rápida. <span style="color:${VERDE}">■</span> acertou &nbsp; <span style="color:${VERMELHO}">■</span> errou &nbsp; <span style="color:#b0bec5">■</span> não respondeu</p>`;
  }
  return html;
}

function guardarNaPlanilha(linha) {
  const p = SpreadsheetApp.getActiveSpreadsheet && SpreadsheetApp.getActiveSpreadsheet();
  if (!p) return;   // script avulso, sem planilha: só envia o e-mail
  const aba = p.getSheetByName('Relatórios') || p.insertSheet('Relatórios');
  if (aba.getLastRow() === 0) aba.appendRow(['Quando', 'E-mail', 'Aluno', 'Atividade', 'Acertos de primeira', 'Respondidas', 'Estrelas', 'Para revisar']);
  aba.appendRow(linha);
}

const texto = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const lista = (v) => (Array.isArray(v) ? v.slice(0, MAX_ITENS) : []);
const numero = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v)) || 0));
const emailValido = (m) => /^[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}$/.test(m);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const resposta = (obj) => ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
