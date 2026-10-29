import nodemailer from "nodemailer";

// Envio de e-mail por SMTP: serve o e-mail da Hostinger, o Gmail (senha de app), o Resend ou qualquer outro.
// Sem SMTP_HOST configurado, a API responde que o e-mail não está ligado (e o app oferece baixar o PDF).
const configurado = () => !!process.env.SMTP_HOST;

const transporte = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SEGURO === "true",   // true para a porta 465
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" } : undefined
});

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// o relatório de um jogo do teste grátis, com o PDF anexado
export async function enviarRelatorioPDF(para: string, nome: string, aluno: string, titulo: string, pdf: Buffer, arquivo: string) {
  if (!configurado()) throw Object.assign(new Error("email_nao_configurado"), { codigo: "email_nao_configurado" });
  await transporte().sendMail({
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
