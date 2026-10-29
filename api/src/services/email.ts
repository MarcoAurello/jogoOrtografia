import nodemailer from "nodemailer";

// O PDF do Testar grátis sai de um destes jeitos (EMAIL_VIA):
// - "planilha" (padrão): pelo Apps Script da planilha principal (acao relatorioPdf), como os relatórios de sempre. O e-mail
//   sai pelo Gmail da conta que publicou o script, por HTTPS: funciona em qualquer rede (sem porta de e-mail).
// - "smtp": por SMTP (e-mail da Hostinger, Gmail com senha de app, Resend...), com SMTP_HOST e companhia.
const via = () => (process.env.EMAIL_VIA === "smtp" ? "smtp" : "planilha");
const erro = (codigo: string) => Object.assign(new Error(codigo), { codigo });
const CHAVE_PLANILHA = "jogo-ortografia";   // a mesma CHAVE do script (ferramentas/relatorio-email.gs)

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function pelaPlanilha(para: string, nome: string, aluno: string, titulo: string, pdf: Buffer, arquivo: string) {
  const url = process.env.URL_PLANILHA;
  if (!url) throw erro("email_nao_configurado");
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ chave: CHAVE_PLANILHA, senha: process.env.SENHA_PLANILHA || "", acao: "relatorioPdf",
      para, nome, aluno, titulo, arquivo: arquivo.replace(/\.pdf$/, ""), pdf: pdf.toString("base64") })
  });
  let j: { ok?: boolean; erro?: string };
  try { j = JSON.parse(await r.text()); } catch { throw erro("planilha_acesso"); }
  // "acao": o script ainda é a versão antiga (sem relatorioPdf); "cota": passou do limite do Gmail no dia
  if (!j.ok) throw erro(j.erro === "acao" ? "script_antigo" : j.erro === "cota" ? "cota" : `planilha_${j.erro || "erro"}`);
}

async function porSmtp(para: string, nome: string, aluno: string, titulo: string, pdf: Buffer, arquivo: string) {
  if (!process.env.SMTP_HOST) throw erro("email_nao_configurado");
  await nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SEGURO === "true",   // true para a porta 465
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" } : undefined
  }).sendMail({
    from: process.env.EMAIL_REMETENTE || "Pedagogia Gamificada <nao-responda@pedagociagamificada.com.br>",
    to: para,
    subject: `Relatório de ${aluno}: ${titulo}`,
    text: `Olá, ${nome}!\n\nO relatório da partida de ${aluno} em "${titulo}" está em anexo (PDF).\n\n`
      + "Na versão completa, cada aluno entra com o código da turma e você acompanha a evolução no painel do professor.\n\n"
      + "Pedagogia Gamificada — jogos psicopedagógicos com relatórios de desempenho.\nInstagram: @pedagogiagamificada",
    html: `<div style="font-family:Arial,sans-serif;color:#13294b;max-width:560px">
      <h2 style="color:#137784;margin:0 0 8px">Relatório de ${esc(aluno)}</h2>
      <p>Olá, ${esc(nome)}! O relatório da partida de <b>${esc(aluno)}</b> em <b>${esc(titulo)}</b> está em anexo (PDF).</p>
      <p>Na versão completa, cada aluno entra com o código da turma e você acompanha a evolução de cada um no
      <b>painel do professor</b>, com gráficos por habilidade.</p>
      <p style="color:#64748b;font-size:13px">Pedagogia Gamificada — jogos psicopedagógicos com relatórios de desempenho · Instagram @pedagogiagamificada</p></div>`,
    attachments: [{ filename: arquivo, content: pdf, contentType: "application/pdf" }]
  });
}

// o relatório de um jogo do teste grátis, com o PDF anexado
export async function enviarRelatorioPDF(para: string, nome: string, aluno: string, titulo: string, pdf: Buffer, arquivo: string) {
  if (via() === "smtp") return porSmtp(para, nome, aluno, titulo, pdf, arquivo);
  return pelaPlanilha(para, nome, aluno, titulo, pdf, arquivo);
}
