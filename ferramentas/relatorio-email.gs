/* Jogos Educacionais — envio do relatório por e-mail (Google Apps Script, gratuito).
   O jogo manda os dados do relatório para este script, que envia o e-mail pelo Gmail da conta
   que publicou o script (até 100 e-mails por dia numa conta Gmail comum).
   Se o script estiver ligado a uma planilha (Extensões → Apps Script), cada relatório também
   vira uma linha na aba "Relatórios".
   Como publicar: veja "Relatório por e-mail" no README.md. */

const CHAVE = 'jogo-ortografia';      // a mesma CHAVE_RELATORIO do jogo.js (só evita envios por engano)
const MAX_ITENS = 120;

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.chave !== CHAVE) return resposta({ ok: false, erro: 'chave' });
    const para = texto(d.para, 120).toLowerCase();
    if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}$/.test(para)) return resposta({ ok: false, erro: 'email' });
    if (MailApp.getRemainingDailyQuota() < 1) return resposta({ ok: false, erro: 'cota' });

    const aluno = texto(d.aluno, 40);
    const missao = texto(d.missao, 80);
    // matemática: pelo campo novo "tipo" ou, nas versões antigas do jogo, pelo nome da atividade
    const ehMatematica = d.tipo === 'matematica' || /matem/i.test(String(d.assunto || '')) || /matem/i.test(missao);
    const assunto = ehMatematica ? 'Matemática' : 'Ortografia';
    const data = texto(d.data, 20);
    const grupos = lista(d.grupos).map((g) => ({ titulo: texto(g.titulo, 60), qtd: Number(g.qtd) || 0, regra: texto(g.regra, 400) }));
    const palavras = lista(d.palavras).map((p) => ({ certa: texto(p.certa, 40), tentou: lista(p.tentou).map((t) => texto(t, 40)) }));
    const acertos = Number(d.acertos) || 0, total = Number(d.total) || 0, estrelas = Number(d.estrelas) || 0;
    const porRegra = lista(d.porRegra).slice(0, 12).map((x) => ({ titulo: texto(x.titulo, 40), total: numero(x.total, 200), erros: numero(x.erros, 200) }));
    const niveis = lista(d.niveis).slice(0, 40).map((x) => ({ n: numero(x.n, 10) || 1, ok: !!x.ok }));

    MailApp.sendEmail({
      to: para,
      name: 'Jogos Educacionais',
      subject: `Relatório de ${assunto}: ${aluno} (${missao})`,
      htmlBody: montarEmail({ assunto, aluno, missao, data, acertos, total, estrelas, grupos, palavras, porRegra, niveis }),
    });
    guardarNaPlanilha([new Date(), para, aluno, missao, acertos, total, estrelas,
      palavras.map((p) => `${p.certa} (${p.tentou.join(', ')})`).join('; ')]);
    return resposta({ ok: true });
  } catch (err) {
    return resposta({ ok: false, erro: String(err) });
  }
}

function montarEmail(r) {
  const h = esc;
  const dificuldades = r.grupos.length
    ? r.grupos.map((g) => `<p style="margin:10px 0 2px"><b>${h(g.titulo)}</b>: ${g.qtd} ${r.assunto === 'Matemática' ? 'conta' : 'palavra'}${g.qtd === 1 ? '' : 's'} com erro</p>`
      + `<p style="margin:0;color:#475569">${h(g.regra)}</p>`).join('')
    : '<p>Nenhuma dificuldade nesta atividade: todas as respostas certas de primeira! 🎉</p>';
  const linhas = r.palavras.map((p) => `<tr><td style="padding:6px 10px;color:#1e7846;font-weight:bold">${h(p.certa.toUpperCase())}</td>`
    + `<td style="padding:6px 10px;color:#c8323c;text-decoration:line-through">${h(p.tentou.join(', ').toUpperCase())}</td></tr>`).join('');
  const tabela = linhas
    ? `<h3 style="color:#1565c0">${r.assunto === 'Matemática' ? 'Contas' : 'Palavras'} para revisar</h3><table style="border-collapse:collapse;border:1px solid #dce9f8">`
      + `<tr style="background:#1565c0;color:#fff"><th style="padding:6px 10px;text-align:left">${r.assunto === 'Matemática' ? 'Conta certa' : 'Jeito certo'}</th><th style="padding:6px 10px;text-align:left">${r.assunto === 'Matemática' ? 'O aluno respondeu' : 'O aluno tentou'}</th></tr>${linhas}</table>`
    : '';
  return `<div style="font-family:Arial,sans-serif;color:#13294b;max-width:640px">`
    + `<h2 style="color:#1565c0;margin-bottom:4px">Relatório de ${r.assunto}</h2>`
    + `<p style="margin-top:0;color:#64748b">Jogos Educacionais: ${r.assunto === 'Matemática' ? 'Chuva de Matemática' : 'treinando palavras que mais erramos'}</p>`
    + `<p><b>Aluno:</b> ${h(r.aluno)}<br><b>Atividade:</b> ${h(r.missao)}<br><b>Data:</b> ${h(r.data)}<br>`
    + `<b>Acertos de primeira:</b> ${r.acertos} de ${r.total} · <b>Estrelas:</b> ${r.estrelas} de 3</p>`
    + graficosEmail(r)
    + `<h3 style="color:#1565c0">Principais dificuldades</h3>${dificuldades}${tabela}</div>`;
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
  let html = `<h3 style="color:#1565c0;margin-bottom:6px">Resultado: ${pct}% certo de primeira</h3>`
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
    html += `<h3 style="color:#1565c0;margin:18px 0 6px">Acertos por ${r.assunto === 'Matemática' ? 'operação' : 'regra'}</h3>`
      + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhas}</table>`
      + `<p style="font-size:12px;color:#64748b;margin:4px 0 0"><span style="color:${VERDE}">■</span> certo de primeira &nbsp; <span style="color:${VERMELHO}">■</span> com erro</p>`;
  }

  if (r.niveis.length) {
    const colunas = r.niveis.map((x, i) => `<td valign="bottom" align="center" style="padding:0 1px">`
      + `<div style="height:${x.n * 9}px;background:${x.ok ? VERDE : VERMELHO};border-radius:3px 3px 0 0"></div>`
      + `<div style="font-size:10px;color:#64748b">${i + 1}</div></td>`).join('');
    html += `<h3 style="color:#1565c0;margin:18px 0 6px">Nível em cada conta (1 a 10)</h3>`
      + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="height:110px"><tr>${colunas}</tr></table>`
      + `<p style="font-size:12px;color:#64748b;margin:4px 0 0">Altura = nível da conta. <span style="color:${VERDE}">■</span> acertou (o nível sobe) &nbsp; <span style="color:${VERMELHO}">■</span> errou (o nível desce)</p>`;
  }
  return html;
}

function guardarNaPlanilha(linha) {
  const planilha = SpreadsheetApp.getActiveSpreadsheet && SpreadsheetApp.getActiveSpreadsheet();
  if (!planilha) return;   // script avulso, sem planilha: só envia o e-mail
  const aba = planilha.getSheetByName('Relatórios') || planilha.insertSheet('Relatórios');
  if (aba.getLastRow() === 0) aba.appendRow(['Quando', 'E-mail', 'Aluno', 'Missão', 'Acertos de primeira', 'Respondidas', 'Estrelas', 'Palavras para revisar']);
  aba.appendRow(linha);
}

const texto = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const lista = (v) => (Array.isArray(v) ? v.slice(0, MAX_ITENS) : []);
const numero = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v)) || 0));
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const resposta = (obj) => ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
