/* Jogos das Palavras — envio do relatório por e-mail (Google Apps Script, gratuito).
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
    const missao = texto(d.missao, 60);
    const data = texto(d.data, 20);
    const grupos = lista(d.grupos).map((g) => ({ titulo: texto(g.titulo, 60), qtd: Number(g.qtd) || 0, regra: texto(g.regra, 400) }));
    const palavras = lista(d.palavras).map((p) => ({ certa: texto(p.certa, 40), tentou: lista(p.tentou).map((t) => texto(t, 40)) }));
    const acertos = Number(d.acertos) || 0, total = Number(d.total) || 0, estrelas = Number(d.estrelas) || 0;

    MailApp.sendEmail({
      to: para,
      name: 'Jogos das Palavras',
      subject: `Relatório de Ortografia: ${aluno} (${missao})`,
      htmlBody: montarEmail({ aluno, missao, data, acertos, total, estrelas, grupos, palavras }),
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
    ? r.grupos.map((g) => `<p style="margin:10px 0 2px"><b>${h(g.titulo)}</b>: ${g.qtd} ${g.qtd === 1 ? 'palavra' : 'palavras'} com erro</p>`
      + `<p style="margin:0;color:#475569">${h(g.regra)}</p>`).join('')
    : '<p>Nenhuma dificuldade nesta missão: todas as palavras certas de primeira! 🎉</p>';
  const linhas = r.palavras.map((p) => `<tr><td style="padding:6px 10px;color:#1e7846;font-weight:bold">${h(p.certa.toUpperCase())}</td>`
    + `<td style="padding:6px 10px;color:#c8323c;text-decoration:line-through">${h(p.tentou.join(', ').toUpperCase())}</td></tr>`).join('');
  const tabela = linhas
    ? `<h3 style="color:#1565c0">Palavras para revisar</h3><table style="border-collapse:collapse;border:1px solid #dce9f8">`
      + `<tr style="background:#1565c0;color:#fff"><th style="padding:6px 10px;text-align:left">Jeito certo</th><th style="padding:6px 10px;text-align:left">O aluno tentou</th></tr>${linhas}</table>`
    : '';
  return `<div style="font-family:Arial,sans-serif;color:#13294b;max-width:640px">`
    + `<h2 style="color:#1565c0;margin-bottom:4px">Relatório de Ortografia</h2>`
    + `<p style="margin-top:0;color:#64748b">Jogos das Palavras: treinando palavras que mais erramos</p>`
    + `<p><b>Aluno:</b> ${h(r.aluno)}<br><b>Missão:</b> ${h(r.missao)}<br><b>Data:</b> ${h(r.data)}<br>`
    + `<b>Acertos de primeira:</b> ${r.acertos} de ${r.total} · <b>Estrelas:</b> ${r.estrelas} de 3</p>`
    + `<h3 style="color:#1565c0">Principais dificuldades</h3>${dificuldades}${tabela}</div>`;
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
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const resposta = (obj) => ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
