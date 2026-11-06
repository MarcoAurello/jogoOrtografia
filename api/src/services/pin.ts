import bcrypt from "bcryptjs";
import Aluno from "../models/Aluno";

// O PIN do aluno cadastrado pela família: 4 números, que o responsável escolhe (e pode trocar). No banco fica só o hash
// (bcrypt, como as senhas). Na entrada, 5 erros seguidos travam o aluno por alguns minutos (alunos.tentativas e
// alunos.bloqueado_ate), para ninguém descobrir o PIN de outro chutando.
export const TAMANHO_PIN = 4;
export const MAX_TENTATIVAS_PIN = 5;
export const MINUTOS_BLOQUEIO_PIN = 5;

// PINs fáceis demais de adivinhar: tudo igual (0000) e sequências (1234, 4321)
function pinObvio(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true;
  const d = pin.split("").map(Number);
  const passo = d[1] - d[0];
  return Math.abs(passo) === 1 && d.every((n, i) => i === 0 || n - d[i - 1] === passo);
}

// confere o PIN digitado duas vezes; devolve a mensagem de erro ou "" se está bom
export function erroDoPin(pin: unknown, confirmacao: unknown): string {
  const p = String(pin ?? "");
  if (!new RegExp(`^\\d{${TAMANHO_PIN}}$`).test(p)) return `O PIN precisa ter ${TAMANHO_PIN} números.`;
  if (String(confirmacao ?? "") !== p) return "Os dois PINs não são iguais. Digite o mesmo PIN duas vezes.";
  if (pinObvio(p)) return "Esse PIN é fácil demais de adivinhar (como 0000 ou 1234). Escolha outro.";
  return "";
}

export const hashDoPin = (pin: string) => bcrypt.hash(pin, 8);
export const pinConfere = (pin: unknown, hash: string) => bcrypt.compare(String(pin ?? ""), hash);


// a resposta de erro da entrada com PIN (a API devolve status e corpo como estão)
export type ErroDoPin = { status: number; corpo: Record<string, unknown> };

// Confere o PIN na entrada do aluno (pela turma ou em casa, pela conta do responsável) e aplica o bloqueio: 5 erros
// seguidos travam por alguns minutos. Devolve o erro para responder ou null quando o PIN confere (e já zera as
// tentativas no objeto; quem chamou grava o aluno).
export async function conferirPinDoAluno(aluno: Aluno, pin: unknown): Promise<ErroDoPin | null> {
  const quem = { id: aluno.id, nome: aluno.nome };
  if (aluno.bloqueado_ate && aluno.bloqueado_ate.getTime() > Date.now()) {
    const min = Math.ceil((aluno.bloqueado_ate.getTime() - Date.now()) / 60000);
    return { status: 423, corpo: { message: `Muitas tentativas. Espere ${min} minuto${min > 1 ? "s" : ""} ou peça ajuda a um adulto.`, codigo: "pin_bloqueado", aluno: quem } };
  }
  if (!pin) return { status: 401, corpo: { message: "Digite o seu PIN.", codigo: "pin", aluno: quem } };
  if (!aluno.pin_hash || !(await pinConfere(pin, aluno.pin_hash))) {
    aluno.tentativas = (aluno.tentativas || 0) + 1;
    if (aluno.tentativas >= MAX_TENTATIVAS_PIN) {
      Object.assign(aluno, { tentativas: 0, bloqueado_ate: new Date(Date.now() + MINUTOS_BLOQUEIO_PIN * 60000) });
      await aluno.save();
      return { status: 423, corpo: { message: `PIN errado muitas vezes. Espere ${MINUTOS_BLOQUEIO_PIN} minutos ou peça ajuda a um adulto.`, codigo: "pin_bloqueado", aluno: quem } };
    }
    await aluno.save();
    return { status: 401, corpo: { message: "PIN errado. Tente de novo.", codigo: "pin_errado", aluno: quem, restantes: MAX_TENTATIVAS_PIN - aluno.tentativas } };
  }
  Object.assign(aluno, { tentativas: 0, bloqueado_ate: null });
  return null;
}

// PIN novo (pela família ou pela escola): destrava e derruba os logins lembrados (sessao_versao sobe 1)
export async function gravarPinNovo(aluno: Aluno, pin: string): Promise<void> {
  Object.assign(aluno, { pin_hash: await hashDoPin(pin), tentativas: 0, bloqueado_ate: null, sessao_versao: (aluno.sessao_versao || 0) + 1 });
  await aluno.save();
}
